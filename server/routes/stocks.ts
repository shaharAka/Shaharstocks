import type { Express } from "express";
import { storage } from "../storage";
import { stockDataRateLimiter } from "../middleware/rateLimiter";
import { db } from "../db";
import { insertStockSchema, insertStockCommentSchema, insertFollowedStockSchema, aiAnalysisJobs } from "@shared/schema";
import { z } from "zod";
import { eq, or } from "drizzle-orm";
import { stockService } from "../stockService";
import { getIbkrService } from "../ibkrService";
import { backtestService } from "../backtestService";
import { finnhubService } from "../finnhubService";
import { aiAnalysisService } from "../aiAnalysisService";
import { verifyFirebaseToken } from "../middleware/firebaseAuth";

export function registerStockRoutes(app: Express) {
  // Stock routes - Per-user tenant isolation: all stocks are user-specific
  app.get("/api/stocks", verifyFirebaseToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const { status } = req.query;
      
      // For user-specific statuses like "rejected"
      if (status === "rejected") {
        const stocks = await storage.getStocksByUserStatus(req.user.userId, status as string);
        return res.json(stocks);
      }
      
      // All stocks are user-specific now
      const stocks = await storage.getStocks(req.user.userId);
      res.json(stocks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch stocks" });
    }
  });

  // Get stocks with user-specific statuses and AI analysis job progress
  app.get("/api/stocks/with-user-status", async (req, res) => {
    try {
      if (!req.session.userId) {
        console.log("[with-user-status] No userId in session");
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      console.log(`[with-user-status] Fetching stocks for user ${req.session.userId}`);
      
      // Get user to determine stock limit (500 during onboarding, otherwise user preference)
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Use 500 stocks during onboarding, otherwise use user's preference (default 100)
      const stockLimit = !user.hasSeenOnboarding ? 500 : (user.stockLimit || 100);
      console.log(`[with-user-status] User onboarding status: ${user.hasSeenOnboarding}, limit: ${stockLimit}`);
      
      // Use the new storage method that includes user status and latest active job
      const stocksWithStatus = await storage.getStocksWithUserStatus(req.session.userId, stockLimit);
      
      console.log(`[with-user-status] Found ${stocksWithStatus.length} stocks`);
      console.log(`[with-user-status] Pending stocks: ${stocksWithStatus.filter(s => s.userStatus === 'pending').length}`);
      console.log(`[with-user-status] Rejected stocks: ${stocksWithStatus.filter(s => s.userStatus === 'rejected').length}`);
      
      res.json(stocksWithStatus);
    } catch (error: any) {
      console.error("[with-user-status] ERROR:");
      console.error("Message:", error?.message);
      console.error("Stack:", error?.stack);
      console.error("Full error:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
      res.status(500).json({ 
        error: "Failed to fetch stocks with user status",
        details: error?.message || "Unknown error"
      });
    }
  });

  // Get top signal opportunities (high integrated score stocks)
  app.get("/api/stocks/top-signals", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      // Get user's followed stocks to filter them out
      const followedStocks = await storage.getUserFollowedStocks(req.session.userId);
      const followedTickers = new Set(followedStocks.map(fs => fs.ticker.toUpperCase()));
      
      // Get stocks with user status (includes analysis data)
      const stocksWithStatus = await storage.getStocksWithUserStatus(req.session.userId, 100);
      
      // Filter for high signals (score >= 70) and not already followed
      const highSignals = stocksWithStatus
        .filter(stock => {
          const hasHighScore = (stock.integratedScore ?? 0) >= 70;
          const notFollowed = !followedTickers.has(stock.ticker.toUpperCase());
          const hasCompletedAnalysis = stock.jobStatus === 'completed';
          return hasHighScore && notFollowed && hasCompletedAnalysis;
        })
        .slice(0, 12) // Limit to top 12
        .map(stock => ({
          ticker: stock.ticker,
          companyName: stock.companyName,
          currentPrice: stock.currentPrice,
          priceChange: stock.priceChange,
          priceChangePercent: stock.priceChangePercent,
          insiderAction: stock.recommendation, // BUY or SELL
          aiStance: stock.aiStance,
          integratedScore: stock.integratedScore,
          isFollowing: false,
        }));
      
      res.json(highSignals);
    } catch (error) {
      console.error("Get top signals error:", error);
      res.status(500).json({ error: "Failed to fetch top signals" });
    }
  });

  app.get("/api/stocks/:ticker", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const stock = await storage.getStock(req.session.userId, req.params.ticker);
      if (!stock) {
        return res.status(404).json({ error: "Stock not found" });
      }
      res.json(stock);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch stock" });
    }
  });

  app.post("/api/stocks", async (req, res) => {
    try {
      const validatedData = insertStockSchema.parse(req.body);
      const stock = await storage.createStock(validatedData);
      res.status(201).json(stock);
    } catch (error) {
      res.status(400).json({ error: "Invalid stock data" });
    }
  });

  app.patch("/api/stocks/:ticker", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const stock = await storage.updateStock(req.session.userId, req.params.ticker, req.body);
      if (!stock) {
        return res.status(404).json({ error: "Stock not found" });
      }
      res.json(stock);
    } catch (error) {
      res.status(500).json({ error: "Failed to update stock" });
    }
  });

  app.delete("/api/stocks/:ticker", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const deleted = await storage.deleteStock(req.session.userId, req.params.ticker);
      if (!deleted) {
        return res.status(404).json({ error: "Stock not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete stock" });
    }
  });

  // Diagnostic endpoint: Check candlestick data status (now in separate table)
  app.get("/api/stocks/diagnostics/candlesticks", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const stocks = await storage.getStocks(req.session.userId);
      const pendingStocks = stocks.filter(s => s.recommendationStatus === "pending");
      
      // Note: Candlesticks are now in a separate shared table (stockCandlesticks)
      // This endpoint now shows stock counts only
      const diagnostics = {
        totalStocks: stocks.length,
        pendingStocks: pendingStocks.length,
        note: "Candlesticks are now stored in shared stockCandlesticks table, accessible via /api/stocks/:ticker/candlesticks",
      };
      
      res.json(diagnostics);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch diagnostics", details: error.message });
    }
  });

  // Refresh stock data with real-time market prices
  app.post("/api/stocks/:ticker/refresh", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const ticker = req.params.ticker;
      const stock = await storage.getStock(req.session.userId, ticker);
      if (!stock) {
        return res.status(404).json({ error: "Stock not found" });
      }

      console.log(`[StockAPI] Refreshing market data for ${ticker}...`);
      const marketData = await stockService.getComprehensiveData(ticker);

      const updatedStock = await storage.updateStock(req.session.userId, ticker, {
        currentPrice: marketData.currentPrice,
        previousClose: marketData.previousClose,
        marketCap: marketData.marketCap,
        peRatio: marketData.peRatio,
        priceHistory: marketData.priceHistory,
        companyName: marketData.companyName,
      });

      console.log(`[StockAPI] ✅ Refreshed ${ticker}: $${marketData.currentPrice} (${marketData.marketCap} market cap)`);
      res.json(updatedStock);
    } catch (error: any) {
      console.error(`[StockAPI] Error refreshing stock data:`, error.message);
      res.status(500).json({ error: error.message || "Failed to refresh stock data" });
    }
  });

  // Refresh all pending stocks with market data
  app.post("/api/stocks/refresh-all", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const stocks = await storage.getStocks(req.session.userId);
      const pendingStocks = stocks.filter(s => s.recommendationStatus === "pending");

      console.log(`[StockAPI] Refreshing ${pendingStocks.length} pending stocks...`);
      console.log(`[StockAPI] Note: Each stock takes ~36 seconds (3 API calls with 12-second delays)`);
      console.log(`[StockAPI] Estimated total time: ${Math.ceil(pendingStocks.length * 36 / 60)} minutes`);
      
      const results = {
        success: [] as string[],
        failed: [] as { ticker: string; error: string }[],
      };

      // Refresh stocks sequentially - getComprehensiveData already handles rate limiting
      for (const stock of pendingStocks) {
        try {
          const marketData = await stockService.getComprehensiveData(stock.ticker);
          await storage.updateStock(req.session.userId, stock.ticker, {
            currentPrice: marketData.currentPrice,
            previousClose: marketData.previousClose,
            marketCap: marketData.marketCap,
            peRatio: marketData.peRatio,
            priceHistory: marketData.priceHistory,
            companyName: marketData.companyName,
          });
          results.success.push(stock.ticker);
          console.log(`[StockAPI] ✅ ${stock.ticker}: $${marketData.currentPrice} | Progress: ${results.success.length}/${pendingStocks.length}`);
        } catch (error: any) {
          results.failed.push({ ticker: stock.ticker, error: error.message });
          console.error(`[StockAPI] ❌ ${stock.ticker}: ${error.message}`);
        }
      }

      res.json({
        total: pendingStocks.length,
        success: results.success.length,
        failed: results.failed.length,
        results,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to refresh stocks" });
    }
  });

  // Recommendation approval routes
  app.post("/api/stocks/:ticker/approve", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const stock = await storage.getStock(req.session.userId, req.params.ticker);
      if (!stock) {
        return res.status(404).json({ error: "Stock not found" });
      }

      // Get price and quantity from request body
      const { price, quantity } = req.body;
      
      // Validate inputs with proper numeric coercion
      const purchasePrice = Number(price);
      const purchaseQuantity = Number(quantity);
      
      if (!isFinite(purchasePrice) || purchasePrice <= 0) {
        return res.status(400).json({ error: "Invalid purchase price - must be a positive number" });
      }
      
      if (!isFinite(purchaseQuantity) || purchaseQuantity <= 0 || !Number.isInteger(purchaseQuantity)) {
        return res.status(400).json({ error: "Invalid quantity - must be a positive whole number" });
      }
      
      // Update user-specific stock status
      await storage.ensureUserStockStatus(req.session.userId, req.params.ticker);
      await storage.updateUserStockStatus(req.session.userId, req.params.ticker, {
        status: "approved",
        approvedAt: new Date()
      });

      // Check if IBKR is configured and connected
      const ibkrConfig = await storage.getIbkrConfig();
      let ibkrOrderId: string | undefined;
      let broker = "manual";

      if (ibkrConfig && ibkrConfig.isConnected && ibkrConfig.accountId) {
        try {
          // Execute real trade via IBKR
          console.log(`[IBKR] Executing BUY order for ${purchaseQuantity} shares of ${stock.ticker}`);
          const ibkr = getIbkrService(ibkrConfig.gatewayUrl);
          const orderResult = await ibkr.buyStock(ibkrConfig.accountId, stock.ticker, purchaseQuantity);
          
          ibkrOrderId = orderResult.orderId;
          broker = "ibkr";
          console.log(`[IBKR] ✅ Order placed successfully: ${orderResult.orderId}`);
        } catch (ibkrError: any) {
          console.error("[IBKR] Trade execution failed:", ibkrError.message);
          // Fall back to manual trade if IBKR fails
          console.log("[IBKR] Falling back to manual trade recording");
        }
      }

      // Add initial price point to history when purchasing
      const now = new Date();
      const initialPricePoint = {
        date: now.toISOString().split('T')[0],
        price: purchasePrice,
      };

      // Get existing price history or initialize empty array
      const priceHistory = stock.priceHistory || [];
      
      // Only add if this date doesn't already exist in history
      const dateExists = priceHistory.some(p => p.date === initialPricePoint.date);
      if (!dateExists) {
        priceHistory.push(initialPricePoint);
        
        // Update stock with new price history
        await storage.updateStock(req.session.userId, stock.ticker, {
          priceHistory,
        });
      }

      const trade = {
        userId: req.session.userId,
        ticker: stock.ticker,
        type: "buy" as const,
        quantity: purchaseQuantity,
        price: purchasePrice.toFixed(2),
        total: (purchasePrice * purchaseQuantity).toFixed(2),
        status: "completed" as const,
        broker,
        ibkrOrderId,
      };
      await storage.createTrade(trade);

      res.json({ 
        status: "approved", 
        stock, 
        trade,
        broker,
        message: broker === "ibkr" ? "Trade executed via IBKR" : "Trade recorded manually"
      });
    } catch (error) {
      console.error("Approve recommendation error:", error);
      res.status(500).json({ error: "Failed to approve recommendation" });
    }
  });

  app.post("/api/stocks/:ticker/reject", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const ticker = req.params.ticker.toUpperCase();
      
      // Cancel any active analysis jobs for this ticker
      await storage.cancelAnalysisJobsForTicker(ticker);
      console.log(`[Reject] Cancelled any active analysis jobs for ${ticker}`);

      // Reject ALL transactions for this ticker (handles multiple transactions per ticker)
      const result = await storage.rejectTickerForUser(req.session.userId, ticker);
      
      console.log(`[Reject] Rejected ticker ${ticker} - updated ${result.stocksUpdated} stock entries`);

      res.json({ 
        status: "rejected", 
        ticker,
        stocksUpdated: result.stocksUpdated,
        message: `Rejected ${result.stocksUpdated} transaction(s) for ${ticker}`
      });
    } catch (error) {
      console.error(`[Reject] Error rejecting ${req.params.ticker}:`, error);
      res.status(500).json({ error: "Failed to reject recommendation" });
    }
  });

  app.patch("/api/stocks/:ticker/unreject", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      console.log(`[Unreject] Starting unreject for ${req.params.ticker} by user ${req.session.userId}`);

      // Only update user-specific status (not global stock status)
      await storage.ensureUserStockStatus(req.session.userId, req.params.ticker);
      const updatedUserStatus = await storage.updateUserStockStatus(req.session.userId, req.params.ticker, {
        status: "pending",
        rejectedAt: null
      });

      console.log(`[Unreject] Successfully restored ${req.params.ticker} to pending status for user ${req.session.userId}`);
      res.json({ status: "pending", userStatus: updatedUserStatus });
    } catch (error) {
      console.error("Unreject stock error:", error);
      res.status(500).json({ error: "Failed to unreject stock" });
    }
  });

  app.post("/api/stocks/:ticker/simulate", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const stock = await storage.getStock(req.session.userId, req.params.ticker);
      if (!stock) {
        return res.status(404).json({ error: "Stock not found" });
      }

      const simulationCapital = 1000;
      
      // Use insider trade date if available, otherwise use today
      const purchaseDate = stock.insiderTradeDate 
        ? new Date(stock.insiderTradeDate)
        : new Date();
      const purchaseDateStr = purchaseDate.toISOString().split('T')[0];
      
      // Ensure price history is available - fetch if needed
      let priceHistory = stock.priceHistory || [];
      
      if (priceHistory.length === 0 && stock.insiderTradeDate) {
        // Fall back to fetching if no candlesticks available
        console.log(`[Simulation] Fetching price history for ${stock.ticker} from ${stock.insiderTradeDate} to today`);
        try {
          const fetchedPrices = await backtestService.fetchHistoricalPrices(
            stock.ticker,
            new Date(stock.insiderTradeDate),
            new Date()
          );
          
          if (fetchedPrices.length > 0) {
            priceHistory = fetchedPrices.map(p => ({
              date: p.date,
              price: p.close
            }));
            
            await storage.updateStock(req.session.userId, stock.ticker, { priceHistory });
            console.log(`[Simulation] Fetched ${priceHistory.length} price points for ${stock.ticker}`);
          }
        } catch (error) {
          console.error(`[Simulation] Failed to fetch price history for ${stock.ticker}:`, error);
        }
      }
      
      // Try to find historical price for the purchase date
      const historicalPricePoint = priceHistory.find(p => p.date === purchaseDateStr);
      
      // Use historical price if available, otherwise current price
      const purchasePrice = historicalPricePoint 
        ? historicalPricePoint.price 
        : parseFloat(stock.currentPrice);
      
      const quantity = Math.floor(simulationCapital / purchasePrice);
      const total = purchasePrice * quantity;

      console.log(`[Simulation] Creating simulation for ${stock.ticker}:`);
      console.log(`[Simulation] - Purchase date: ${purchaseDateStr} (${stock.insiderTradeDate ? 'insider trade date' : 'today'})`);
      console.log(`[Simulation] - Purchase price: $${purchasePrice.toFixed(2)} (${historicalPricePoint ? 'historical' : 'current'})`);
      console.log(`[Simulation] - Quantity: ${quantity} shares`);

      // Add initial price point to history if it doesn't exist
      if (!historicalPricePoint) {
        priceHistory.push({
          date: purchaseDateStr,
          price: purchasePrice,
        });
        
        // Update stock with new price history
        await storage.updateStock(req.session.userId, stock.ticker, {
          priceHistory,
        });
      }

      // Check if simulated holding already exists
      const existingHolding = await storage.getPortfolioHoldingByTicker(req.session.userId, stock.ticker, true);
      if (existingHolding) {
        return res.status(400).json({ error: "Simulated holding already exists for this stock" });
      }

      // Create simulated trade with the purchase date
      const trade = {
        userId: req.session.userId,
        ticker: stock.ticker,
        type: "buy" as const,
        quantity,
        price: purchasePrice.toFixed(2),
        total: total.toFixed(2),
        status: "completed" as const,
        broker: "simulation",
        isSimulated: true,
        executedAt: purchaseDate, // Set execution date to purchase date
      };
      const createdTrade = await storage.createTrade(trade);

      // Get the created holding
      const holding = await storage.getPortfolioHoldingByTicker(req.session.userId, stock.ticker, true);

      // Update user-specific stock status to approved (simulated)
      await storage.ensureUserStockStatus(req.session.userId, req.params.ticker);
      await storage.updateUserStockStatus(req.session.userId, req.params.ticker, {
        status: "approved",
        approvedAt: new Date()
      });

      res.json({ 
        status: "simulated", 
        stock, 
        trade: createdTrade,
        holding,
        message: stock.insiderTradeDate
          ? `Simulation created: ${quantity} shares purchased on ${purchaseDateStr} at $${purchasePrice.toFixed(2)} = $${total.toFixed(2)}`
          : `Simulation created: ${quantity} shares at $${purchasePrice.toFixed(2)} = $${total.toFixed(2)}`
      });
    } catch (error) {
      console.error("Simulate recommendation error:", error);
      res.status(500).json({ error: "Failed to create simulation" });
    }
  });

  app.delete("/api/stocks/:ticker/simulate", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const { ticker } = req.params;
      const deletedHoldings = await storage.deleteSimulatedHoldingsByTicker(req.session.userId, ticker);
      const deletedTrades = await storage.deleteSimulatedTradesByTicker(req.session.userId, ticker);
      
      res.json({ 
        message: `Removed simulated position for ${ticker} (${deletedHoldings} holding(s), ${deletedTrades} trade(s))`,
        deletedHoldings,
        deletedTrades
      });
    } catch (error) {
      console.error("Delete simulation error:", error);
      res.status(500).json({ error: "Failed to delete simulation" });
    }
  });

  // Bulk operation endpoints
  const bulkTickersSchema = z.object({
    tickers: z.array(z.string()).min(1, "At least one ticker is required").max(100, "Maximum 100 tickers allowed")
  });

  app.post("/api/stocks/bulk-approve", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const validationResult = bulkTickersSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: "Invalid request", details: validationResult.error.errors });
      }
      const { tickers } = validationResult.data;

      let success = 0;
      const errors: string[] = [];

      for (const ticker of tickers) {
        try {
          const stock = await storage.getStock(req.session.userId, ticker);
          if (!stock) {
            errors.push(`${ticker}: not found`);
            continue;
          }

          // Use current price and default quantity of 10
          const purchasePrice = parseFloat(stock.currentPrice);
          const purchaseQuantity = 10;

          await storage.updateStock(req.session.userId, ticker, {
            recommendationStatus: "approved"
          });

          // Create holding
          const existingHolding = await storage.getPortfolioHoldingByTicker(req.session.userId, ticker, false);
          if (existingHolding) {
            const currentAvg = parseFloat(existingHolding.averagePurchasePrice);
            const newAvg = ((currentAvg * existingHolding.quantity + purchasePrice * purchaseQuantity) / (existingHolding.quantity + purchaseQuantity)).toFixed(2);
            await storage.updatePortfolioHolding(existingHolding.id, {
              quantity: existingHolding.quantity + purchaseQuantity,
              averagePurchasePrice: newAvg
            });
          } else {
            await storage.createPortfolioHolding({
              userId: req.session.userId,
              ticker,
              quantity: purchaseQuantity,
              averagePurchasePrice: purchasePrice.toFixed(2),
            });
          }

          // Create trade
          await storage.createTrade({
            userId: req.session.userId,
            ticker,
            type: "buy",
            quantity: purchaseQuantity,
            price: purchasePrice.toFixed(2),
            total: (purchasePrice * purchaseQuantity).toFixed(2),
            status: "completed",
            broker: "manual",
          });

          success++;
        } catch (err) {
          errors.push(`${ticker}: ${err instanceof Error ? err.message : 'unknown error'}`);
        }
      }

      res.json({ 
        success, 
        failed: errors.length,
        errors: errors.length > 0 ? errors : undefined,
        message: `Approved ${success}/${tickers.length} stocks`
      });
    } catch (error) {
      console.error("Bulk approve error:", error);
      res.status(500).json({ error: "Failed to bulk approve" });
    }
  });

  app.post("/api/stocks/bulk-reject", async (req, res) => {
    try {
      console.log("[BULK REJECT] Endpoint called. Session userId:", req.session.userId);
      console.log("[BULK REJECT] Request body:", JSON.stringify(req.body));
      
      if (!req.session.userId) {
        console.log("[BULK REJECT] No userId in session - returning 401");
        return res.status(401).json({ error: "Not authenticated" });
      }

      const validationResult = bulkTickersSchema.safeParse(req.body);
      if (!validationResult.success) {
        console.log("[BULK REJECT] Validation failed:", validationResult.error.errors);
        return res.status(400).json({ error: "Invalid request", details: validationResult.error.errors });
      }
      const { tickers } = validationResult.data;
      console.log("[BULK REJECT] Processing tickers:", tickers);

      let success = 0;
      const errors: string[] = [];

      for (const ticker of tickers) {
        try {
          console.log(`[BULK REJECT] Processing ticker: ${ticker}`);
          
          // Cancel any active analysis jobs for this ticker
          await storage.cancelAnalysisJobsForTicker(ticker);
          
          // Reject ALL transactions for this ticker (handles multiple transactions per ticker)
          const result = await storage.rejectTickerForUser(req.session.userId, ticker);
          console.log(`[BULK REJECT] Rejected ${ticker} - updated ${result.stocksUpdated} stock entries`);

          success++;
        } catch (err) {
          console.log(`[BULK REJECT] Error processing ${ticker}:`, err);
          errors.push(`${ticker}: ${err instanceof Error ? err.message : 'unknown error'}`);
        }
      }

      console.log(`[BULK REJECT] Complete. Success: ${success}, Failed: ${errors.length}`);
      res.json({ 
        success, 
        failed: errors.length,
        errors: errors.length > 0 ? errors : undefined,
        message: `Rejected ${success}/${tickers.length} recommendations`
      });
    } catch (error) {
      console.error("[BULK REJECT] Fatal error:", error);
      res.status(500).json({ error: "Failed to bulk reject" });
    }
  });

  app.post("/api/stocks/bulk-refresh", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const validationResult = bulkTickersSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: "Invalid request", details: validationResult.error.errors });
      }
      const { tickers } = validationResult.data;

      let success = 0;
      const errors: string[] = [];

      for (const ticker of tickers) {
        try {
          const stock = await storage.getStock(req.session.userId, ticker);
          if (!stock) {
            errors.push(`${ticker}: not found`);
            continue;
          }

          // Fetch latest quote
          await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit: 1 req/sec
          const quote = await finnhubService.getQuote(ticker);
          if (quote && quote.currentPrice) {
            await storage.updateStock(req.session.userId, ticker, {
              currentPrice: quote.currentPrice.toFixed(2),
              previousClose: quote.previousClose?.toFixed(2) || stock.previousClose,
            });
            success++;
          } else {
            errors.push(`${ticker}: no quote data`);
          }
        } catch (err) {
          errors.push(`${ticker}: ${err instanceof Error ? err.message : 'unknown error'}`);
        }
      }

      res.json({ 
        success, 
        failed: errors.length,
        errors: errors.length > 0 ? errors : undefined,
        message: `Refreshed ${success}/${tickers.length} stocks`
      });
    } catch (error) {
      console.error("Bulk refresh error:", error);
      res.status(500).json({ error: "Failed to bulk refresh" });
    }
  });

  app.post("/api/stocks/bulk-analyze", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const validationResult = bulkTickersSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: "Invalid request", details: validationResult.error.errors });
      }
      const { tickers } = validationResult.data;

      // Queue selected stocks for analysis (force re-analysis)
      let queuedCount = 0;
      for (const ticker of tickers) {
        try {
          const stock = await storage.getStock(req.session.userId, ticker);
          if (stock && stock.recommendationStatus === "pending") {
            await storage.enqueueAnalysisJob(ticker, "manual", "high", true);
            queuedCount++;
          }
        } catch (error) {
          console.error(`Failed to queue ${ticker}:`, error);
        }
      }

      res.json({ 
        total: tickers.length,
        queued: queuedCount,
        message: `Queued ${queuedCount} stocks for AI analysis`
      });
    } catch (error) {
      console.error("Bulk analyze error:", error);
      res.status(500).json({ error: "Failed to bulk analyze" });
    }
  });

  // AI Analysis endpoint
  app.post("/api/stocks/:ticker/analyze", async (req, res) => {
    try {
      const ticker = req.params.ticker.toUpperCase();
      const { force } = req.body;
      
      // Check if we have a cached analysis (less than 7 days old) unless force is true
      if (!force) {
        const existingAnalysis = await storage.getStockAnalysis(ticker);
        if (existingAnalysis && existingAnalysis.analyzedAt) {
          const cacheAge = Date.now() - new Date(existingAnalysis.analyzedAt).getTime();
          const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
          
          if (cacheAge < sevenDaysInMs) {
            console.log(`[AI Analysis] Using cached analysis for ${ticker} (${Math.floor(cacheAge / (24 * 60 * 60 * 1000))} days old)`);
            return res.json(existingAnalysis);
          }
        }
      }

      // Enqueue the analysis job with macro integration (force flag to cancel existing jobs)
      console.log(`[AI Analysis] Enqueueing analysis job for ${ticker} with macro integration${force ? ' (forced)' : ''}...`);
      const job = await storage.enqueueAnalysisJob(ticker, "user_manual", "high", force);
      
      // Return a pending analysis response
      const pendingAnalysis = {
        id: job.id,
        ticker,
        status: "analyzing",
        overallRating: null,
        confidenceScore: null,
        summary: "Analysis in progress...",
        analyzedAt: new Date().toISOString(),
      };
      
      res.json(pendingAnalysis);
    } catch (error) {
      console.error("[AI Analysis] Error:", error);
      res.status(500).json({ error: "Failed to analyze stock: " + (error instanceof Error ? error.message : "Unknown error") });
    }
  });

  // Get stock analysis
  app.get("/api/stocks/:ticker/analysis", async (req, res) => {
    try {
      const ticker = req.params.ticker.toUpperCase();
      const analysis = await storage.getStockAnalysis(ticker);
      
      if (!analysis) {
        return res.status(404).json({ error: "No analysis found for this stock" });
      }
      
      res.json(analysis);
    } catch (error) {
      console.error("[AI Analysis] Error fetching analysis:", error);
      res.status(500).json({ error: "Failed to fetch analysis" });
    }
  });

  // Get candlestick data for a ticker (shared OHLCV data - one record per ticker, reused across users)
  app.get("/api/stocks/:ticker/candlesticks", async (req, res) => {
    try {
      const ticker = req.params.ticker.toUpperCase();
      const candlesticks = await storage.getCandlesticksByTicker(ticker);
      
      if (!candlesticks) {
        return res.status(404).json({ error: "No candlestick data found for this stock" });
      }
      
      res.json(candlesticks);
    } catch (error) {
      console.error("[Candlesticks] Error fetching candlestick data:", error);
      res.status(500).json({ error: "Failed to fetch candlestick data" });
    }
  });

  // Get sparkline data (lightweight - just last 7 close prices for mini charts)
  app.get("/api/stocks/:ticker/sparkline", async (req, res) => {
    try {
      const ticker = req.params.ticker.toUpperCase();
      const candlesticks = await storage.getCandlesticksByTicker(ticker);
      
      if (!candlesticks || !candlesticks.candlestickData || candlesticks.candlestickData.length === 0) {
        // Return empty array if no data available
        return res.json([]);
      }
      
      // Get last 7 data points (or all if less than 7)
      const dataPoints = candlesticks.candlestickData.slice(-7);
      
      // Return just the close prices for the sparkline
      const sparklineData = dataPoints.map(d => ({
        date: d.date,
        price: d.close
      }));
      
      res.json(sparklineData);
    } catch (error) {
      console.error("[Sparkline] Error fetching sparkline data:", error);
      res.status(500).json({ error: "Failed to fetch sparkline data" });
    }
  });

  // Get all stock analyses (returns null scores for stocks with active jobs to show them as "processing")
  // Use ?all=true to get all analyses (for opportunities page), otherwise returns only user's followed stocks
  app.get("/api/stock-analyses", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      // Get all analyses
      const allAnalyses = await storage.getAllStockAnalyses();
      
      // Check if requesting all analyses (for opportunities page) or just user's stocks
      const includeAll = req.query.all === 'true';
      
      let filteredAnalyses = allAnalyses;
      
      if (!includeAll) {
        // Get current user's stocks to filter analyses
        const userStocks = await storage.getStocks(req.session.userId);
        const userTickers = new Set(userStocks.map(s => s.ticker));
        // Filter to only user's tickers
        filteredAnalyses = allAnalyses.filter(a => userTickers.has(a.ticker));
      }
      
      // Get tickers with active jobs (pending or processing)
      const activeJobs = await db
        .selectDistinct({ ticker: aiAnalysisJobs.ticker })
        .from(aiAnalysisJobs)
        .where(or(
          eq(aiAnalysisJobs.status, 'pending'),
          eq(aiAnalysisJobs.status, 'processing')
        ));
      
      const activeJobTickers = new Set(activeJobs.map(j => j.ticker));
      
      // Return analyses with null scores for tickers with active jobs
      // This makes those stocks show as "processing" in the UI while preserving the ticker
      const analyses = filteredAnalyses.map(a => {
        if (activeJobTickers.has(a.ticker)) {
          // Return clean processing object with only ticker and status
          return {
            ticker: a.ticker,
            status: 'processing' as const,
            integratedScore: null,
            aiScore: null,
            confidenceScore: null,
            overallRating: null,
            summary: null,
            recommendation: null,
            analyzedAt: null,
          };
        }
        return a;
      });
      
      res.json(analyses);
    } catch (error) {
      console.error("[AI Analysis] Error fetching analyses:", error);
      res.status(500).json({ error: "Failed to fetch analyses" });
    }
  });

  // Macro Analysis API Endpoints

  // Run macro economic analysis
  app.post("/api/macro-analysis/run", async (req, res) => {
    try {
      console.log("[Macro API] Running macro economic analysis...");
      const { runMacroAnalysis } = await import("./macroAgentService");
      const analysisData = await runMacroAnalysis();
      const savedAnalysis = await storage.createMacroAnalysis(analysisData);
      console.log("[Macro API] Macro analysis complete. ID:", savedAnalysis.id);
      res.json(savedAnalysis);
    } catch (error) {
      console.error("[Macro API] Error running macro analysis:", error);
      res.status(500).json({ error: "Failed to run macro analysis: " + (error instanceof Error ? error.message : "Unknown error") });
    }
  });

  // Get latest macro analysis
  app.get("/api/macro-analysis/latest", async (req, res) => {
    try {
      const analysis = await storage.getLatestMacroAnalysis();
      if (!analysis) {
        return res.status(404).json({ error: "No macro analysis found" });
      }
      res.json(analysis);
    } catch (error) {
      console.error("[Macro API] Error fetching latest macro analysis:", error);
      res.status(500).json({ error: "Failed to fetch macro analysis" });
    }
  });

  // Get specific macro analysis by ID
  app.get("/api/macro-analysis/:id", async (req, res) => {
    try {
      const analysis = await storage.getMacroAnalysis(req.params.id);
      if (!analysis) {
        return res.status(404).json({ error: "Macro analysis not found" });
      }
      res.json(analysis);
    } catch (error) {
      console.error("[Macro API] Error fetching macro analysis:", error);
      res.status(500).json({ error: "Failed to fetch macro analysis" });
    }
  });

  // AI Analysis Job Queue API Endpoints

  // Enqueue a new analysis job
  app.post("/api/analysis-jobs", async (req, res) => {
    try {
      const { ticker, source = "user_manual", priority = "high" } = req.body;
      
      if (!ticker) {
        return res.status(400).json({ error: "Ticker is required" });
      }

      const job = await storage.enqueueAnalysisJob(
        ticker.toUpperCase(),
        source,
        priority
      );

      res.json(job);
    } catch (error) {
      console.error("[Queue API] Error enqueueing job:", error);
      res.status(500).json({ error: "Failed to enqueue analysis job" });
    }
  });

  // Get queue statistics (MUST be before /:id route to avoid matching "stats" as an ID)
  app.get("/api/analysis-jobs/stats", async (req, res) => {
    try {
      const stats = await storage.getQueueStats();
      res.json(stats);
    } catch (error) {
      console.error("[Queue API] Error fetching queue stats:", error);
      res.status(500).json({ error: "Failed to fetch queue stats" });
    }
  });

  // Get jobs (optionally filtered by ticker)
  app.get("/api/analysis-jobs", async (req, res) => {
    try {
      const { ticker } = req.query;
      
      if (ticker) {
        const jobs = await storage.getJobsByTicker((ticker as string).toUpperCase());
        res.json(jobs);
      } else {
        // For now, return queue stats instead of all jobs
        const stats = await storage.getQueueStats();
        res.json(stats);
      }
    } catch (error) {
      console.error("[Queue API] Error fetching jobs:", error);
      res.status(500).json({ error: "Failed to fetch jobs" });
    }
  });

  // Get job status by ID (MUST be after /stats route)
  app.get("/api/analysis-jobs/:id", async (req, res) => {
    try {
      const job = await storage.getJobById(req.params.id);
      
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }

      // If job is completed, include the analysis result
      if (job.status === "completed") {
        const analysis = await storage.getStockAnalysis(job.ticker);
        res.json({ ...job, analysis });
      } else {
        res.json(job);
      }
    } catch (error) {
      console.error("[Queue API] Error fetching job:", error);
      res.status(500).json({ error: "Failed to fetch job" });
    }
  });

  // Reset/cancel stuck analysis jobs for a ticker
  app.post("/api/analysis-jobs/reset/:ticker", async (req, res) => {
    try {
      const ticker = req.params.ticker.toUpperCase();
      
      console.log(`[Queue API] Resetting stuck jobs for ticker: ${ticker}`);
      
      // Cancel any pending/processing jobs for this ticker
      await storage.cancelAnalysisJobsForTicker(ticker);
      
      // Reset the analysis phase flags on the stock
      await storage.resetStockAnalysisPhaseFlags(ticker);
      
      res.json({ 
        success: true, 
        message: `Reset analysis jobs for ${ticker}. You can now trigger a new analysis.` 
      });
    } catch (error) {
      console.error("[Queue API] Error resetting jobs:", error);
      res.status(500).json({ error: "Failed to reset analysis jobs" });
    }
  });

  // Bulk analyze all pending stocks for current user
  app.post("/api/stocks/analyze-all", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      console.log(`[Bulk AI Analysis] Starting bulk analysis for user ${req.session.userId}...`);
      
      // Get user's pending purchase recommendations
      const stocks = await storage.getStocks(req.session.userId);
      const pendingStocks = stocks.filter(
        stock => stock.recommendation?.toLowerCase() === "buy" && 
                 stock.recommendationStatus === "pending"
      );
      
      if (pendingStocks.length === 0) {
        return res.json({ 
          message: "No pending stocks to analyze", 
          queued: 0, 
          total: 0 
        });
      }
      
      console.log(`[Bulk AI Analysis] Found ${pendingStocks.length} pending stocks for user ${req.session.userId}`);
      
      // Queue all stocks for analysis (force re-analysis of existing jobs)
      let queuedCount = 0;
      for (const stock of pendingStocks) {
        try {
          await storage.enqueueAnalysisJob(stock.ticker, "manual", "high", true);
          queuedCount++;
        } catch (error) {
          console.error(`[Bulk AI Analysis] Failed to queue ${stock.ticker}:`, error);
        }
      }
      
      res.json({ 
        message: `Queued ${queuedCount} stocks for AI analysis. Background worker will process them soon.`,
        queued: queuedCount,
        total: pendingStocks.length 
      });
    } catch (error) {
      console.error("[Bulk AI Analysis] Error:", error);
      res.status(500).json({ error: "Failed to start bulk analysis" });
    }
  });

  // User routes
  // Stock comment routes
  app.get("/api/stocks/:ticker/comments", async (req, res) => {
    try {
      const comments = await storage.getStockComments(req.params.ticker);
      res.json(comments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  });

  app.post("/api/stocks/:ticker/comments", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const validatedData = insertStockCommentSchema.parse({
        ...req.body,
        ticker: req.params.ticker,
        userId: req.session.userId,
      });
      const comment = await storage.createStockComment(validatedData);
      res.status(201).json(comment);
    } catch (error) {
      console.error("Create comment error:", error);
      res.status(400).json({ error: "Invalid comment data" });
    }
  });

  app.get("/api/stock-comment-counts", async (req, res) => {
    try {
      const counts = await storage.getStockCommentCounts();
      res.json(counts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch comment counts" });
    }
  });

  // Stock follow routes
  app.get("/api/users/me/followed", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const followed = await storage.getUserFollowedStocks(req.session.userId);
      res.json(followed);
    } catch (error) {
      console.error("Get user followed stocks error:", error);
      res.status(500).json({ error: "Failed to fetch followed stocks" });
    }
  });

  app.post("/api/stocks/:ticker/follow", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const ticker = req.params.ticker.toUpperCase();
      
      // Check if already following
      const existingFollows = await storage.getUserFollowedStocks(req.session.userId);
      const alreadyFollowing = existingFollows.some(f => f.ticker === ticker);
      
      if (alreadyFollowing) {
        return res.status(409).json({ error: "You are already following this stock" });
      }
      
      const validatedData = insertFollowedStockSchema.parse({
        ticker,
        userId: req.session.userId,
      });
      const follow = await storage.followStock(validatedData);
      
      // Fetch candlestick data immediately if not present (async, fire-and-forget)
      void (async () => {
        try {
          const existingCandlesticks = await storage.getCandlesticksByTicker(ticker);
          if (!existingCandlesticks || !existingCandlesticks.candlestickData || existingCandlesticks.candlestickData.length === 0) {
            console.log(`[Follow] Fetching candlestick data for newly followed stock ${ticker}...`);
            const candlesticks = await stockService.getCandlestickData(ticker);
            if (candlesticks && candlesticks.length > 0) {
              await storage.upsertCandlesticks(ticker, candlesticks.map(c => ({
                date: c.date,
                open: c.open,
                high: c.high,
                low: c.low,
                close: c.close,
                volume: c.volume
              })));
              console.log(`[Follow] ✓ Candlestick data fetched for ${ticker}`);
            }
          }
        } catch (err: any) {
          console.error(`[Follow] ✗ Failed to fetch candlesticks for ${ticker}:`, err.message);
        }
      })();
      
      // Check if stock became popular (>10 followers) and notify all followers
      try {
        const followerCount = await storage.getFollowerCountForTicker(ticker);
        
        if (followerCount > 10) {
          console.log(`[Follow] Stock ${ticker} is popular with ${followerCount} followers, creating notifications...`);
          
          // Get stock data for the notification (use current user's userId - stock data same across users in per-user model)
          const stock = await storage.getStock(req.session.userId, ticker);
          const stockData = stock as any;
          
          // Notify all followers (including the one who just followed)
          const followerUserIds = await storage.getFollowerUserIdsForTicker(ticker);
          for (const followerUserId of followerUserIds) {
            try {
              await storage.createNotification({
                userId: followerUserId,
                ticker,
                type: 'popular_stock',
                message: `${ticker} is trending! ${followerCount} traders are now following this stock`,
                metadata: { followerCount },
                isRead: false,
              });
            } catch (notifError) {
              // Ignore duplicate notification errors
              if (notifError instanceof Error && !notifError.message.includes('unique constraint')) {
                console.error(`[Follow] Failed to create popular stock notification for user ${followerUserId}:`, notifError);
              }
            }
          }
          console.log(`[Follow] Created ${followerUserIds.length} popular_stock notifications for ${ticker}`);
        }
      } catch (popularError) {
        console.error(`[Follow] Failed to check/create popular stock notifications:`, popularError);
        // Don't fail the follow request
      }
      
      // Trigger immediate "day 0" analysis for this stock ONLY if not already completed
      try {
        const existingAnalysis = await storage.getStockAnalysis(ticker);
        const needsAnalysis = !existingAnalysis || existingAnalysis.status !== 'completed';
        
        if (needsAnalysis) {
          console.log(`[Follow] Triggering day 0 analysis for ${ticker} (status: ${existingAnalysis?.status || 'none'})`);
          await storage.enqueueAnalysisJob(ticker, "follow_day_0", "high");
        } else {
          console.log(`[Follow] Skipping analysis for ${ticker} - already completed`);
        }
      } catch (analysisError) {
        console.error(`[Follow] Failed to enqueue analysis for ${ticker}:`, analysisError);
        // Don't fail the follow request if analysis enqueue fails
      }
      
      // Generate day-0 daily brief immediately with retry logic
      const userId = req.session.userId; // Capture for use in async function
      const generateDay0Brief = async (retryCount: number = 0): Promise<void> => {
        const maxRetries = 2;
        const retryDelayMs = 3000; // 3 seconds between retries
        
        try {
          const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
          
          // Check if brief already exists for today
          const existingBriefs = await storage.getDailyBriefsForTicker(ticker, userId);
          const briefExistsToday = existingBriefs.some((b: any) => b.briefDate === today);
          
          if (briefExistsToday) {
            console.log(`[Follow] Daily brief already exists for ${ticker} today, skipping`);
            return;
          }
          
          console.log(`[Follow] Generating day-0 daily brief for ${ticker}${retryCount > 0 ? ` (retry ${retryCount}/${maxRetries})` : ''}...`);
          
          // Get current price data (matching daily job implementation)
          const quote = await stockService.getQuote(ticker);
          if (!quote || quote.price === 0 || quote.previousClose === 0) {
            throw new Error("Unable to fetch valid price data");
          }
          
          // Get LATEST AI analysis from stock_analyses table (primary source of truth)
          const latestAnalysis = await storage.getStockAnalysis(ticker);
          const stock = await storage.getStock(userId, ticker);
          const stockData = stock as any;
          
          // Helper to safely convert analyzedAt (could be Date or string from DB)
          const getAnalyzedAtString = (val: Date | string | null | undefined): string | undefined => {
            if (!val) return undefined;
            if (val instanceof Date) return val.toISOString();
            if (typeof val === 'string') return val;
            return undefined;
          };
          
          // Build enriched analysis context from latest AI playbook (same as daily job)
          const previousAnalysis = latestAnalysis?.status === 'completed' ? {
            overallRating: latestAnalysis.overallRating || 'hold',
            summary: latestAnalysis.summary || "No summary available",
            recommendation: latestAnalysis.recommendation || undefined,
            integratedScore: latestAnalysis.integratedScore ?? undefined,
            confidenceScore: latestAnalysis.confidenceScore ?? undefined,
            technicalAnalysis: {
              trend: latestAnalysis.technicalAnalysisTrend || 'neutral',
              momentum: latestAnalysis.technicalAnalysisMomentum || 'weak',
              score: latestAnalysis.technicalAnalysisScore ?? 50,
              signals: latestAnalysis.technicalAnalysisSignals || []
            },
            sentimentAnalysis: {
              trend: latestAnalysis.sentimentAnalysisTrend || 'neutral',
              newsVolume: latestAnalysis.sentimentAnalysisNewsVolume || 'low',
              score: latestAnalysis.sentimentAnalysisScore ?? 50,
              keyThemes: latestAnalysis.sentimentAnalysisKeyThemes || []
            },
            risks: latestAnalysis.risks || [],
            opportunities: latestAnalysis.opportunities || [],
            analyzedAt: getAnalyzedAtString(latestAnalysis.analyzedAt),
            scorecard: latestAnalysis.scorecard ? {
              globalScore: latestAnalysis.scorecard.globalScore,
              confidence: latestAnalysis.scorecard.confidence,
              sections: latestAnalysis.scorecard.sections ? {
                fundamentals: latestAnalysis.scorecard.sections.fundamentals ? {
                  score: latestAnalysis.scorecard.sections.fundamentals.score,
                  weight: latestAnalysis.scorecard.sections.fundamentals.weight
                } : undefined,
                technicals: latestAnalysis.scorecard.sections.technicals ? {
                  score: latestAnalysis.scorecard.sections.technicals.score,
                  weight: latestAnalysis.scorecard.sections.technicals.weight
                } : undefined,
                insiderActivity: latestAnalysis.scorecard.sections.insiderActivity ? {
                  score: latestAnalysis.scorecard.sections.insiderActivity.score,
                  weight: latestAnalysis.scorecard.sections.insiderActivity.weight
                } : undefined,
                newsSentiment: latestAnalysis.scorecard.sections.newsSentiment ? {
                  score: latestAnalysis.scorecard.sections.newsSentiment.score,
                  weight: latestAnalysis.scorecard.sections.newsSentiment.weight
                } : undefined,
                macroSector: latestAnalysis.scorecard.sections.macroSector ? {
                  score: latestAnalysis.scorecard.sections.macroSector.score,
                  weight: latestAnalysis.scorecard.sections.macroSector.weight
                } : undefined
              } : undefined,
              summary: latestAnalysis.scorecard.summary
            } : undefined
          } : stockData?.overallRating ? {
            overallRating: stockData.overallRating,
            summary: stockData.summary || "No previous analysis available",
            technicalAnalysis: stockData.technicalAnalysis ? {
              trend: stockData.technicalAnalysis.trend,
              momentum: stockData.technicalAnalysis.momentum,
              score: stockData.technicalAnalysis.score,
              signals: stockData.technicalAnalysis.signals
            } : undefined
          } : undefined;
          
          if (latestAnalysis?.status === 'completed') {
            console.log(`[Follow] Using enriched AI playbook for ${ticker}: score=${latestAnalysis.integratedScore || latestAnalysis.confidenceScore || 'N/A'}, rating=${latestAnalysis.overallRating || 'N/A'}`);
          } else {
            console.log(`[Follow] No completed AI analysis for ${ticker}, using fallback stock data`);
          }
          
          // Get opportunity type from latest analysis or stock recommendation (safe handling)
          const latestRec = latestAnalysis?.recommendation?.toLowerCase() || '';
          const stockRec = stockData?.recommendation?.toLowerCase() || '';
          const opportunityType = (latestRec.includes("sell") || latestRec.includes("avoid") || stockRec.includes("sell")) ? "sell" : "buy";
          
          // Check if user owns this stock (real holdings only, not simulated)
          const holding = await storage.getPortfolioHoldingByTicker(userId, ticker, false);
          const userOwnsPosition = holding !== undefined && holding.quantity > 0;
          
          // Fetch FRESH news sentiment from Alpha Vantage (with fallback to cached)
          let recentNews: { title: string; sentiment: number; source: string }[] | undefined;
          try {
            const freshNewsSentiment = await stockService.getNewsSentiment(ticker);
            if (freshNewsSentiment?.articles && freshNewsSentiment.articles.length > 0) {
              recentNews = freshNewsSentiment.articles.slice(0, 5).map(article => ({
                title: article.title || "Untitled",
                sentiment: typeof article.sentiment === 'number' ? article.sentiment : 0,
                source: article.source || "Unknown"
              }));
              console.log(`[Follow] Fetched ${recentNews.length} fresh news articles for ${ticker}`);
            }
          } catch (newsError) {
            console.log(`[Follow] Fresh news fetch failed for ${ticker}, using cached`);
          }
          
          // Fallback to cached news if fresh fetch failed
          if (!recentNews || recentNews.length === 0) {
            const now = Date.now() / 1000;
            const oneDayAgo = now - (24 * 60 * 60);
            recentNews = stockData?.news
              ?.filter((article: any) => article.datetime && article.datetime >= oneDayAgo)
              ?.slice(0, 3)
              ?.map((article: any) => ({
                title: article.headline || "Untitled",
                sentiment: 0,
                source: article.source || "Unknown"
              }));
          }
          
          // Generate the DUAL-SCENARIO brief (both watching and owning)
          const brief = await aiAnalysisService.generateDailyBrief({
            ticker,
            currentPrice: quote.price,
            previousPrice: quote.previousClose,
            opportunityType,
            recentNews: recentNews && recentNews.length > 0 ? recentNews : undefined,
            previousAnalysis
          });
          
          // Store in database with BOTH scenarios
          await storage.createDailyBrief({
            userId,
            ticker,
            briefDate: today,
            priceSnapshot: quote.price.toString(),
            priceChange: quote.change.toString(),
            priceChangePercent: quote.changePercent.toString(),
            
            // Watching scenario
            watchingStance: brief.watching.recommendedStance,
            watchingConfidence: brief.watching.confidence,
            watchingText: brief.watching.briefText,
            watchingHighlights: brief.watching.keyHighlights,
            
            // Owning scenario
            owningStance: brief.owning.recommendedStance,
            owningConfidence: brief.owning.confidence,
            owningText: brief.owning.briefText,
            owningHighlights: brief.owning.keyHighlights,
            
            // Legacy fields for backwards compat (use user's actual position)
            recommendedStance: userOwnsPosition ? brief.owning.recommendedStance : brief.watching.recommendedStance,
            confidence: userOwnsPosition ? brief.owning.confidence : brief.watching.confidence,
            briefText: userOwnsPosition ? brief.owning.briefText : brief.watching.briefText,
            keyHighlights: userOwnsPosition ? brief.owning.keyHighlights : brief.watching.keyHighlights,
            userOwnsPosition
          });
          
          console.log(`[Follow] Generated day-0 dual-scenario brief for ${ticker}: Watching=${brief.watching.recommendedStance}(${brief.watching.confidence}), Owning=${brief.owning.recommendedStance}(${brief.owning.confidence})`);
        } catch (briefError) {
          const errorDetails = briefError instanceof Error ? briefError.message : JSON.stringify(briefError);
          console.error(`[Follow] Failed to generate day-0 brief for ${ticker} (attempt ${retryCount + 1}/${maxRetries + 1}):`, errorDetails);
          
          // Retry if we haven't exhausted retries
          if (retryCount < maxRetries) {
            console.log(`[Follow] Retrying day-0 brief for ${ticker} in ${retryDelayMs / 1000}s...`);
            await new Promise(resolve => setTimeout(resolve, retryDelayMs));
            return generateDay0Brief(retryCount + 1);
          } else {
            console.error(`[Follow] Day-0 brief generation failed permanently for ${ticker} after ${maxRetries + 1} attempts`);
          }
        }
      };
      
      // Run brief generation (don't await to not block the response, but do run with retries)
      generateDay0Brief().catch(err => {
        console.error(`[Follow] Unhandled error in day-0 brief generation for ${ticker}:`, err);
      });
      
      res.status(201).json(follow);
    } catch (error) {
      console.error("Follow stock error:", error);
      res.status(400).json({ error: "Failed to follow stock" });
    }
  });

  app.delete("/api/stocks/:ticker/follow", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      await storage.unfollowStock(req.params.ticker.toUpperCase(), req.session.userId);
      res.status(204).send();
    } catch (error) {
      console.error("Unfollow stock error:", error);
      res.status(500).json({ error: "Failed to unfollow stock" });
    }
  });

  app.patch("/api/stocks/:ticker/position", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const ticker = req.params.ticker.toUpperCase();
      const { hasEnteredPosition, entryPrice } = req.body;
      
      if (typeof hasEnteredPosition !== 'boolean') {
        return res.status(400).json({ error: "hasEnteredPosition must be a boolean" });
      }
      
      // Validate entryPrice if provided
      if (entryPrice !== undefined && (typeof entryPrice !== 'number' || entryPrice <= 0)) {
        return res.status(400).json({ error: "entryPrice must be a positive number" });
      }
      
      // Update the followed stock's position flag
      await storage.toggleStockPosition(ticker, req.session.userId, hasEnteredPosition, entryPrice);
      
      // Also manage portfolio holdings to sync with In Position page
      if (hasEnteredPosition) {
        // Check if a holding already exists for this ticker
        const existingHoldings = await storage.getPortfolioHoldings(req.session.userId, false);
        const existingHolding = existingHoldings.find(h => h.ticker === ticker && h.quantity > 0);
        
        if (!existingHolding) {
          // Create a new portfolio holding, use entryPrice or default to 0
          const priceToUse = (entryPrice && entryPrice > 0) ? entryPrice : 0;
          await storage.createPortfolioHolding({
            userId: req.session.userId,
            ticker,
            quantity: 1,
            averagePurchasePrice: priceToUse.toString(),
            isSimulated: false,
          });
        }
      } else if (!hasEnteredPosition) {
        // When exiting position, find and close/delete any existing holdings
        const existingHoldings = await storage.getPortfolioHoldings(req.session.userId, false);
        const existingHolding = existingHoldings.find(h => h.ticker === ticker && h.quantity > 0);
        
        if (existingHolding) {
          // Delete the holding (user can use close-position for P&L tracking)
          await storage.deletePortfolioHolding(existingHolding.id);
        }
      }
      
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Toggle position error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      if (errorMessage.includes("not being followed")) {
        return res.status(404).json({ error: "Stock is not being followed" });
      }
      
      res.status(500).json({ error: "Failed to toggle position status" });
    }
  });

  app.post("/api/stocks/:ticker/close-position", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const ticker = req.params.ticker.toUpperCase();
      const { sellPrice, quantity } = req.body;
      
      // Convert to numbers and validate
      const sellPriceNum = Number(sellPrice);
      if (!Number.isFinite(sellPriceNum) || sellPriceNum <= 0) {
        return res.status(400).json({ error: "sellPrice must be a positive number" });
      }
      
      // Validate quantity - must be finite positive integer, default to 1
      let validQuantity = 1;
      if (quantity !== undefined && quantity !== null) {
        const quantityNum = Number(quantity);
        if (!Number.isFinite(quantityNum) || quantityNum < 1) {
          return res.status(400).json({ error: "quantity must be a positive integer" });
        }
        validQuantity = Math.floor(quantityNum);
      }
      
      const result = await storage.closePosition(ticker, req.session.userId, sellPriceNum, validQuantity);
      res.status(200).json(result);
    } catch (error) {
      console.error("Close position error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      if (errorMessage.includes("not being followed")) {
        return res.status(404).json({ error: "Stock is not being followed" });
      }
      
      if (errorMessage.includes("No open position")) {
        return res.status(400).json({ error: "No open position to close" });
      }
      
      res.status(500).json({ error: "Failed to close position" });
    }
  });

  app.post("/api/stocks/bulk-follow", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const validationResult = bulkTickersSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: "Invalid request", details: validationResult.error.errors });
      }
      const { tickers } = validationResult.data;
      
      let followedCount = 0;
      for (const ticker of tickers) {
        try {
          const upperTicker = ticker.toUpperCase();
          await storage.followStock({
            ticker: upperTicker,
            userId: req.session.userId,
          });
          followedCount++;
          
          // Fetch candlestick data immediately if not present (async, fire-and-forget)
          void (async () => {
            try {
              const existingCandlesticks = await storage.getCandlesticksByTicker(upperTicker);
              if (!existingCandlesticks || !existingCandlesticks.candlestickData || existingCandlesticks.candlestickData.length === 0) {
                console.log(`[BulkFollow] Fetching candlestick data for ${upperTicker}...`);
                const candlesticks = await stockService.getCandlestickData(upperTicker);
                if (candlesticks && candlesticks.length > 0) {
                  await storage.upsertCandlesticks(upperTicker, candlesticks.map(c => ({
                    date: c.date,
                    open: c.open,
                    high: c.high,
                    low: c.low,
                    close: c.close,
                    volume: c.volume
                  })));
                  console.log(`[BulkFollow] ✓ Candlestick data fetched for ${upperTicker}`);
                }
              }
            } catch (err: any) {
              console.error(`[BulkFollow] ✗ Failed to fetch candlesticks for ${upperTicker}:`, err.message);
            }
          })();
          
          // Trigger immediate "day 0" analysis for each followed stock ONLY if not already completed
          try {
            const existingAnalysis = await storage.getStockAnalysis(upperTicker);
            const needsAnalysis = !existingAnalysis || existingAnalysis.status !== 'completed';
            
            if (needsAnalysis) {
              console.log(`[BulkFollow] Triggering day 0 analysis for ${upperTicker} (status: ${existingAnalysis?.status || 'none'})`);
              await storage.enqueueAnalysisJob(upperTicker, "follow_day_0", "high");
            } else {
              console.log(`[BulkFollow] Skipping analysis for ${upperTicker} - already completed`);
            }
          } catch (analysisError) {
            console.error(`[BulkFollow] Failed to enqueue analysis for ${upperTicker}:`, analysisError);
            // Don't fail the bulk follow if analysis enqueue fails
          }
        } catch (error) {
          console.error(`Failed to follow ${ticker}:`, error);
        }
      }

      res.json({ 
        total: tickers.length,
        followed: followedCount,
        message: `Followed ${followedCount} stocks`
      });
    } catch (error) {
      console.error("Bulk follow error:", error);
      res.status(500).json({ error: "Failed to bulk follow" });
    }
  });

  // Get followed stocks with current prices
  app.get("/api/followed-stocks-with-prices", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const followedStocks = await storage.getFollowedStocksWithPrices(req.session.userId);
      res.json(followedStocks);
    } catch (error) {
      console.error("Get followed stocks with prices error:", error);
      res.status(500).json({ error: "Failed to fetch followed stocks" });
    }
  });

  // Get followed stocks with status (includes job status, stance, alignment)
  app.get("/api/followed-stocks-with-status", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const followedStocks = await storage.getFollowedStocksWithStatus(req.session.userId);
      res.json(followedStocks);
    } catch (error) {
      console.error("Get followed stocks with status error:", error);
      res.status(500).json({ error: "Failed to fetch followed stocks with status" });
    }
  });

  // Get followed stocks count for sidebar badge (excludes stocks with active positions)
  app.get("/api/followed-stocks/count", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const followedStocks = await storage.getUserFollowedStocks(req.session.userId);
      const holdings = await storage.getPortfolioHoldings(req.session.userId, false);
      const positionTickers = new Set(holdings.filter(h => h.quantity > 0).map(h => h.ticker));
      // Count only stocks that are NOT in position
      const watchingCount = followedStocks.filter(s => !positionTickers.has(s.ticker)).length;
      res.json(watchingCount);
    } catch (error) {
      console.error("Get followed stocks count error:", error);
      res.status(500).json({ error: "Failed to fetch count" });
    }
  });

  // Get active positions count for sidebar badge
  app.get("/api/positions/count", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const holdings = await storage.getPortfolioHoldings(req.session.userId, false);
      const activePositions = holdings.filter(h => h.quantity > 0);
      res.json(activePositions.length);
    } catch (error) {
      console.error("Get positions count error:", error);
      res.status(500).json({ error: "Failed to fetch count" });
    }
  });

  // Get total P&L for user's portfolio
  app.get("/api/portfolio/total-pnl", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const totalPnl = await storage.getTotalPnL(req.session.userId);
      res.json({ totalPnl });
    } catch (error) {
      console.error("Get total P&L error:", error);
      res.status(500).json({ error: "Failed to fetch total P&L" });
    }
  });

  // Get daily briefs for a stock (lightweight daily reports for followed stocks)
  app.get("/api/stocks/:ticker/daily-briefs", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      // Validate ticker parameter
      const tickerParam = req.params.ticker?.trim()?.toUpperCase();
      if (!tickerParam || tickerParam.length > 10 || !/^[A-Z]+$/.test(tickerParam)) {
        return res.status(400).json({ error: "Invalid ticker format" });
      }
      
      // Check if user follows this stock (normalize case on both sides)
      const followedStocks = await storage.getUserFollowedStocks(req.session.userId);
      const isFollowing = followedStocks.some(fs => fs.ticker.toUpperCase() === tickerParam);
      
      if (!isFollowing) {
        return res.status(403).json({ error: "You must follow this stock to view daily briefs" });
      }
      
      // Pass userId to ensure only user-specific briefs are returned
      const briefs = await storage.getDailyBriefsForTicker(tickerParam, req.session.userId);
      res.json(briefs);
    } catch (error) {
      console.error("Get daily briefs error:", error);
      res.status(500).json({ error: "Failed to fetch daily briefs" });
    }
  });

  // Get global ticker daily briefs (score evolution - shared across all users)
  app.get("/api/stocks/:ticker/ticker-daily-briefs", async (req, res) => {
    try {
      // Validate ticker parameter
      const tickerParam = req.params.ticker?.trim()?.toUpperCase();
      if (!tickerParam || tickerParam.length > 10 || !/^[A-Z]+$/.test(tickerParam)) {
        return res.status(400).json({ error: "Invalid ticker format" });
      }
      
      // Get limit from query params, default to 7 (one week)
      const limit = Math.min(parseInt(req.query.limit as string) || 7, 30);
      
      // Fetch global ticker daily briefs (not user-specific)
      const briefs = await storage.getTickerDailyBriefs(tickerParam, limit);
      res.json(briefs);
    } catch (error) {
      console.error("Get ticker daily briefs error:", error);
      res.status(500).json({ error: "Failed to fetch ticker daily briefs" });
    }
  });

  // Stock views routes
  app.post("/api/stocks/:ticker/view", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const view = await storage.markStockAsViewed(req.params.ticker, req.session.userId);
      res.status(201).json(view);
    } catch (error) {
      console.error("Mark stock as viewed error:", error);
      res.status(500).json({ error: "Failed to mark stock as viewed" });
    }
  });

  app.post("/api/stocks/bulk-view", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const { tickers } = req.body;
      if (!Array.isArray(tickers)) {
        return res.status(400).json({ error: "tickers must be an array" });
      }
      await storage.markStocksAsViewed(tickers, req.session.userId);
      res.status(201).json({ success: true, count: tickers.length });
    } catch (error) {
      console.error("Bulk mark stocks as viewed error:", error);
      res.status(500).json({ error: "Failed to bulk mark stocks as viewed" });
    }
  });

  app.get("/api/stock-views/:userId", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      // Ensure users can only access their own viewed stocks
      if (req.params.userId !== req.session.userId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      const viewedTickers = await storage.getUserStockViews(req.params.userId);
      res.json(viewedTickers);
    } catch (error) {
      console.error("Get stock views error:", error);
      res.status(500).json({ error: "Failed to fetch stock views" });
    }
  });

  // Tutorial routes
  app.get("/api/tutorials/:tutorialId/status", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const completed = await storage.hasCompletedTutorial(req.session.userId, req.params.tutorialId);
      res.json({ completed });
    } catch (error) {
      console.error("Check tutorial status error:", error);
      res.status(500).json({ error: "Failed to check tutorial status" });
    }
  });

  app.post("/api/tutorials/:tutorialId/complete", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      await storage.markTutorialAsCompleted(req.session.userId, req.params.tutorialId);
      res.status(201).json({ success: true });
    } catch (error) {
      console.error("Mark tutorial complete error:", error);
      res.status(500).json({ error: "Failed to mark tutorial as completed" });
    }
  });

  app.get("/api/tutorials/user", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const tutorials = await storage.getUserTutorials(req.session.userId);
      res.json(tutorials);
    } catch (error) {
      console.error("Get user tutorials error:", error);
      res.status(500).json({ error: "Failed to fetch user tutorials" });
    }
  });

  // Portfolio routes
  app.get("/api/portfolio/holdings", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const isSimulated = req.query.simulated === "true";
      const holdings = await storage.getPortfolioHoldings(req.session.userId, isSimulated ? true : false);
      res.json(holdings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch portfolio holdings" });
    }
  });

  app.post("/api/portfolio/holdings", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const { ticker, quantity, averagePurchasePrice, isSimulated } = req.body;
      
      if (!ticker || quantity === undefined || !averagePurchasePrice) {
        return res.status(400).json({ error: "Missing required fields: ticker, quantity, averagePurchasePrice" });
      }
      
      const holding = await storage.createPortfolioHolding({
        userId: req.session.userId,
        ticker: ticker.toUpperCase(),
        quantity,
        averagePurchasePrice,
        isSimulated: isSimulated ?? false,
      });
      
      res.status(201).json(holding);
    } catch (error) {
      console.error("Create portfolio holding error:", error);
      res.status(500).json({ error: "Failed to create portfolio holding" });
    }
  });

  app.get("/api/portfolio/holdings/:id", async (req, res) => {
    try {
      // CRITICAL SECURITY: Verify authentication and ownership
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const holding = await storage.getPortfolioHolding(req.params.id, req.session.userId);
      if (!holding) {
        return res.status(404).json({ error: "Holding not found" });
      }
      res.json(holding);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch holding" });
    }
  });

  app.delete("/api/portfolio/holdings/:id", async (req, res) => {
    try {
      // CRITICAL SECURITY: Verify authentication and ownership before deletion
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      // Verify ownership before deleting
      const holding = await storage.getPortfolioHolding(req.params.id, req.session.userId);
      if (!holding) {
        return res.status(404).json({ error: "Holding not found" });
      }
      
      const success = await storage.deletePortfolioHolding(req.params.id);
      if (!success) {
        return res.status(500).json({ error: "Failed to delete holding" });
      }
      res.json({ message: "Holding deleted successfully" });
    } catch (error) {
      console.error("Delete holding error:", error);
      res.status(500).json({ error: "Failed to delete holding" });
    }
  });

  // Trade routes
  app.get("/api/trades", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const isSimulated = req.query.simulated === "true";
      const trades = await storage.getTrades(req.session.userId, isSimulated ? true : false);
      res.json(trades);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch trades" });
    }
  });

  app.get("/api/trades/:id", async (req, res) => {
    try {
      // CRITICAL SECURITY: Verify authentication and ownership
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const trade = await storage.getTrade(req.params.id, req.session.userId);
      if (!trade) {
        return res.status(404).json({ error: "Trade not found" });
      }
      res.json(trade);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch trade" });
    }
  });

  app.post("/api/trades", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const validatedData = insertTradeSchema.parse({ ...req.body, userId: req.session.userId });
      const trade = await storage.createTrade(validatedData);
      res.status(201).json(trade);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(400).json({ error: "Invalid trade data" });
      }
    }
  });

  // Trading Rules routes
  app.get("/api/rules", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const rules = await storage.getTradingRules(req.session.userId);
      res.json(rules);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch trading rules" });
    }
  });

  app.get("/api/rules/:id", async (req, res) => {
    try {
      const rule = await storage.getTradingRule(req.params.id);
      if (!rule) {
        return res.status(404).json({ error: "Trading rule not found" });
      }
      res.json(rule);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch trading rule" });
    }
  });

  app.post("/api/rules", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const validatedData = insertTradingRuleSchema.parse({ ...req.body, userId: req.session.userId });
      const rule = await storage.createTradingRule(validatedData);
      res.status(201).json(rule);
    } catch (error) {
      res.status(400).json({ error: "Invalid trading rule data" });
    }
  });

  app.patch("/api/rules/:id", async (req, res) => {
    try {
      const rule = await storage.updateTradingRule(req.params.id, req.body);
      if (!rule) {
        return res.status(404).json({ error: "Trading rule not found" });
      }
      res.json(rule);
    } catch (error) {
      res.status(500).json({ error: "Failed to update trading rule" });
    }
  });

  app.delete("/api/rules/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteTradingRule(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Trading rule not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete trading rule" });
    }
  });

  // Compound Rules (multi-condition rules)
  app.get("/api/compound-rules", async (req, res) => {
    try {
      const rules = await storage.getCompoundRules();
      res.json(rules);
    } catch (error) {
      console.error("Error fetching compound rules:", error);
      res.status(500).json({ error: "Failed to fetch compound rules" });
    }
  });

  app.get("/api/compound-rules/:id", async (req, res) => {
    try {
      const rule = await storage.getCompoundRule(req.params.id);
      if (!rule) {
        return res.status(404).json({ error: "Compound rule not found" });
      }
      res.json(rule);
    } catch (error) {
      console.error("Error fetching compound rule:", error);
      res.status(500).json({ error: "Failed to fetch compound rule" });
    }
  });

  app.post("/api/compound-rules", async (req, res) => {
    try {
      const validatedData = insertCompoundRuleSchema.parse(req.body);
      const rule = await storage.createCompoundRule(validatedData);
      res.status(201).json(rule);
    } catch (error) {
      console.error("Error creating compound rule:", error);
      res.status(400).json({ 
        error: "Invalid compound rule data", 
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.put("/api/compound-rules/:id", async (req, res) => {
    try {
      const partialData = insertCompoundRuleSchema.partial().parse(req.body);
      const rule = await storage.updateCompoundRule(req.params.id, partialData);
      if (!rule) {
        return res.status(404).json({ error: "Compound rule not found" });
      }
      res.json(rule);
    } catch (error) {
      console.error("Error updating compound rule:", error);
      res.status(400).json({ 
        error: "Invalid compound rule data",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.delete("/api/compound-rules/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteCompoundRule(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Compound rule not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting compound rule:", error);
      res.status(500).json({ error: "Failed to delete compound rule" });
    }
  });

  // Rule Executions (audit log)
  app.get("/api/rule-executions", async (req, res) => {
    try {
      const ruleId = req.query.ruleId as string | undefined;
      const ticker = req.query.ticker as string | undefined;
      const executions = await storage.getRuleExecutions(ruleId, ticker);
      res.json(executions);
    } catch (error) {
      console.error("Error fetching rule executions:", error);
      res.status(500).json({ error: "Failed to fetch rule executions" });
    }
  });

  // Backtesting routes
  app.get("/api/backtests", async (req, res) => {
    try {
      const backtests = await storage.getBacktests();
      res.json(backtests);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch backtests" });
    }
  });

  app.get("/api/backtests/:id", async (req, res) => {
    try {
      const backtest = await storage.getBacktest(req.params.id);
      if (!backtest) {
        return res.status(404).json({ error: "Backtest not found" });
      }
      res.json(backtest);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch backtest" });
    }
  });

  app.post("/api/backtests", async (req, res) => {
    try {
      const { name, ruleId, startDate, endDate, initialCapital } = req.body;

      // Get the trading rule
      const rule = ruleId ? await storage.getTradingRule(ruleId) : null;
      if (ruleId && !rule) {
        return res.status(404).json({ error: "Trading rule not found" });
      }

      // Mock backtest simulation
      // In a real implementation, this would simulate trades based on historical data
      const capital = parseFloat(initialCapital);
      const numberOfTrades = Math.floor(Math.random() * 20) + 10;
      const winRate = 50 + Math.random() * 30; // 50-80% win rate
      
      // Simulate random returns
      const returnPercent = (Math.random() * 40) - 10; // -10% to +30%
      const totalReturn = capital * (returnPercent / 100);
      const finalValue = capital + totalReturn;

      // Generate mock equity curve
      const days = 30;
      const equityCurve = [];
      let currentValue = capital;
      for (let i = 0; i <= days; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        const dailyChange = (totalReturn / days) * (0.8 + Math.random() * 0.4);
        currentValue += dailyChange;
        equityCurve.push({
          date: date.toISOString(),
          value: Math.max(capital * 0.7, currentValue),
        });
      }

      // Generate mock trade log
      const tradeLog = [];
      const ticker = rule?.ticker || "AAPL";
      for (let i = 0; i < numberOfTrades; i++) {
        const tradeDate = new Date(startDate);
        tradeDate.setDate(tradeDate.getDate() + Math.floor((i / numberOfTrades) * days));
        
        tradeLog.push({
          date: tradeDate.toISOString(),
          type: i % 2 === 0 ? "buy" : "sell",
          ticker,
          quantity: Math.floor(Math.random() * 10) + 1,
          price: 150 + Math.random() * 50,
          total: (150 + Math.random() * 50) * (Math.floor(Math.random() * 10) + 1),
        });
      }

      const backtest = await storage.createBacktest({
        name,
        ruleId: ruleId || null,
        startDate,
        endDate,
        initialCapital,
        finalValue: finalValue.toFixed(2),
        totalReturn: totalReturn.toFixed(2),
        totalReturnPercent: returnPercent.toFixed(2),
        numberOfTrades,
        winRate: winRate.toFixed(2),
        bestTrade: (Math.random() * 500 + 100).toFixed(2),
        worstTrade: (-(Math.random() * 300 + 50)).toFixed(2),
        tradeLog,
        equityCurve,
      });

      res.status(201).json(backtest);
    } catch (error) {
      console.error("Backtest error:", error);
      res.status(400).json({ error: "Invalid backtest data" });
    }
  });

  // Bulk simulate (create simulated holdings) endpoint
  app.post("/api/stocks/bulk-simulate", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const { tickers } = req.body;
      
      if (!Array.isArray(tickers) || tickers.length === 0) {
        return res.status(400).json({ error: "Tickers array is required" });
      }

      const createdHoldings = [];
      const errors = [];

      // Create a simulated holding for each ticker
      for (const ticker of tickers) {
        try {
          const stock = await storage.getStock(req.session.userId, ticker);
          if (!stock) {
            errors.push({ ticker, error: "Stock not found" });
            continue;
          }

          // Check if simulated holding already exists
          const existingHolding = await storage.getPortfolioHoldingByTicker(req.session.userId, ticker, true);
          if (existingHolding) {
            errors.push({ ticker, error: "Simulated holding already exists" });
            continue;
          }

          const simulationCapital = 1000;
          
          // Use insider trade date if available, otherwise use today
          const purchaseDate = stock.insiderTradeDate 
            ? new Date(stock.insiderTradeDate)
            : new Date();
          const purchaseDateStr = purchaseDate.toISOString().split('T')[0];
          
          // Ensure price history is available - fetch if needed
          let priceHistory = stock.priceHistory || [];
          
          if (priceHistory.length === 0 && stock.insiderTradeDate) {
            // Fall back to fetching if no candlesticks available
            console.log(`[BulkSimulation] Fetching price history for ${stock.ticker} from ${stock.insiderTradeDate} to today`);
            try {
              const fetchedPrices = await backtestService.fetchHistoricalPrices(
                stock.ticker,
                new Date(stock.insiderTradeDate),
                new Date()
              );
              
              if (fetchedPrices.length > 0) {
                priceHistory = fetchedPrices.map(p => ({
                  date: p.date,
                  price: p.close
                }));
                
                await storage.updateStock(req.session.userId, stock.ticker, { priceHistory });
                console.log(`[BulkSimulation] Fetched ${priceHistory.length} price points for ${stock.ticker}`);
              }
            } catch (error) {
              console.error(`[BulkSimulation] Failed to fetch price history for ${stock.ticker}:`, error);
            }
          }
          
          // Try to find historical price for the purchase date
          const historicalPricePoint = priceHistory.find(p => p.date === purchaseDateStr);
          
          // Use historical price if available, otherwise current price
          const purchasePrice = historicalPricePoint 
            ? historicalPricePoint.price 
            : parseFloat(stock.currentPrice);
          
          const quantity = Math.floor(simulationCapital / purchasePrice);
          const total = purchasePrice * quantity;

          // Create simulated trade with the purchase date
          const trade = await storage.createTrade({
            userId: req.session.userId,
            ticker,
            type: "buy",
            quantity,
            price: purchasePrice.toFixed(2),
            total: total.toFixed(2),
            status: "completed",
            broker: "simulation",
            isSimulated: true,
            executedAt: purchaseDate,
          });

          // Get the created holding (automatically created by trade)
          const holding = await storage.getPortfolioHoldingByTicker(req.session.userId, ticker, true);

          // Update user-specific stock status to approved (simulated)
          await storage.ensureUserStockStatus(req.session.userId, ticker);
          await storage.updateUserStockStatus(req.session.userId, ticker, {
            status: "approved",
            approvedAt: new Date()
          });

          createdHoldings.push({ ticker, holdingId: holding?.id, tradeId: trade.id });
        } catch (error) {
          errors.push({ ticker, error: error instanceof Error ? error.message : "Unknown error" });
        }
      }

      res.json({
        success: true,
        total: tickers.length,
        created: createdHoldings.length,
        failed: errors.length,
        holdings: createdHoldings,
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (error) {
      console.error("Bulk simulate error:", error);
      res.status(500).json({ error: "Failed to create simulations" });
    }
  });
}
