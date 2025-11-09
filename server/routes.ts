import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertStockSchema, insertTradeSchema, insertTradingRuleSchema, insertCompoundRuleSchema, insertBacktestSchema, insertTelegramConfigSchema, insertIbkrConfigSchema, insertOpeninsiderConfigSchema, insertStockCommentSchema, insertStockInterestSchema } from "@shared/schema";
import { z } from "zod";
import { telegramService } from "./telegram";
import { stockService } from "./stockService";
import { secEdgarService } from "./secEdgarService";
import { getIbkrService } from "./ibkrService";
import { telegramNotificationService } from "./telegramNotificationService";
import { backtestService } from "./backtestService";
import { finnhubService } from "./finnhubService";
import { openinsiderService } from "./openinsiderService";

/**
 * Check if US stock market is currently open
 * Market hours: 9:30 AM - 4:00 PM ET, Monday-Friday
 */
function isMarketOpen(): boolean {
  const now = new Date();
  
  // Convert to Eastern Time
  const etTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  
  // Check if weekend
  const day = etTime.getDay();
  if (day === 0 || day === 6) {
    return false; // Sunday or Saturday
  }
  
  // Check market hours (9:30 AM - 4:00 PM ET)
  const hours = etTime.getHours();
  const minutes = etTime.getMinutes();
  const timeInMinutes = hours * 60 + minutes;
  
  const marketOpen = 9 * 60 + 30;  // 9:30 AM
  const marketClose = 16 * 60;     // 4:00 PM
  
  return timeInMinutes >= marketOpen && timeInMinutes < marketClose;
}

// Helper function to fetch initial OpenInsider data for new users
async function fetchInitialDataForUser(userId: string): Promise<void> {
  try {
    console.log(`[InitialDataFetch] Starting initial data fetch for user ${userId}...`);
    
    // Fetch 500 transactions without any filters
    const transactions = await openinsiderService.fetchInsiderPurchases(500);
    
    if (transactions.length === 0) {
      console.log(`[InitialDataFetch] No transactions found for user ${userId}`);
      await storage.markUserInitialDataFetched(userId);
      return;
    }

    console.log(`[InitialDataFetch] Processing ${transactions.length} transactions for user ${userId}...`);
    
    // Convert transactions to stock recommendations
    let createdCount = 0;
    let filteredCount = 0;
    for (const transaction of transactions) {
      try {
        // Check if stock already exists
        const existingStock = await storage.getStock(transaction.ticker);
        
        if (existingStock) {
          continue;
        }

        // Get current market price from Finnhub
        const quote = await finnhubService.getQuote(transaction.ticker);
        if (!quote || !quote.currentPrice) {
          continue;
        }

        // Fetch company profile, market cap, and news
        const stockData = await finnhubService.getBatchStockData([transaction.ticker]);
        const data = stockData.get(transaction.ticker);
        
        // Apply market cap filter (must be > $500M)
        const marketCapValue = data?.marketCap ? data.marketCap * 1_000_000 : 0;
        if (marketCapValue < 500_000_000) {
          filteredCount++;
          console.log(`[InitialDataFetch] ${transaction.ticker} market cap too low: $${(marketCapValue / 1_000_000).toFixed(1)}M, skipping`);
          continue;
        }
        
        // Apply options deal filter (insider price should be >= 15% of current price)
        const insiderPriceNum = transaction.price;
        if (insiderPriceNum < quote.currentPrice * 0.15) {
          filteredCount++;
          console.log(`[InitialDataFetch] ${transaction.ticker} likely options deal (insider: $${insiderPriceNum} vs market: $${quote.currentPrice}), skipping`);
          continue;
        }

        // Create stock recommendation with complete information
        await storage.createStock({
          ticker: transaction.ticker,
          companyName: transaction.companyName || transaction.ticker,
          currentPrice: quote.currentPrice.toString(),
          previousClose: quote.previousClose?.toString() || quote.currentPrice.toString(),
          insiderPrice: transaction.price.toString(),
          insiderQuantity: transaction.quantity,
          insiderTradeDate: transaction.filingDate,
          insiderName: transaction.insiderName,
          insiderTitle: transaction.insiderTitle,
          recommendation: "buy",
          source: "openinsider",
          confidenceScore: transaction.confidence || 75,
          peRatio: null,
          marketCap: data?.marketCap ? `$${Math.round(data.marketCap)}M` : null,
          description: data?.companyInfo?.description || null,
          industry: data?.companyInfo?.industry || null,
          country: data?.companyInfo?.country || null,
          webUrl: data?.companyInfo?.webUrl || null,
          ipo: data?.companyInfo?.ipo || null,
          news: data?.news || [],
          insiderSentimentMspr: data?.insiderSentiment?.mspr.toString() || null,
          insiderSentimentChange: data?.insiderSentiment?.change.toString() || null,
          priceHistory: [],
        });

        createdCount++;
      } catch (err) {
        console.error(`[InitialDataFetch] Error processing ${transaction.ticker}:`, err);
      }
    }

    console.log(`[InitialDataFetch] Processed ${transactions.length} transactions for user ${userId}: created ${createdCount}, filtered ${filteredCount}`);
    
    // Mark user as having initial data fetched
    await storage.markUserInitialDataFetched(userId);
    
  } catch (error) {
    console.error(`[InitialDataFetch] Error fetching initial data for user ${userId}:`, error);
    // Don't throw - this is a background operation
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Feature flags endpoint
  app.get("/api/feature-flags", async (req, res) => {
    res.json({
      enableTelegram: process.env.ENABLE_TELEGRAM === "true",
    });
  });

  // User authentication routes
  app.get("/api/auth/current-user", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.json({ user: null });
      }
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        req.session.userId = undefined;
        return res.json({ user: null });
      }
      res.json({ user });
    } catch (error) {
      res.status(500).json({ error: "Failed to get current user" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // Verify password
      const bcrypt = await import("bcryptjs");
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // Check subscription status
      if (user.subscriptionStatus !== "active") {
        return res.status(403).json({ 
          error: "Subscription required",
          subscriptionStatus: user.subscriptionStatus 
        });
      }

      req.session.userId = user.id;
      
      // Explicitly save session before sending response to ensure cookie is set
      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ error: "Failed to save session" });
        }
        
        res.json({ 
          user: {
            ...user,
            passwordHash: undefined, // Don't send password hash to client
          },
          subscriptionStatus: user.subscriptionStatus
        });
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Failed to login" });
    }
  });

  app.post("/api/auth/signup", async (req, res) => {
    try {
      const { name, email, password } = req.body;
      if (!name || !email || !password) {
        return res.status(400).json({ error: "Name, email, and password are required" });
      }

      if (password.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters" });
      }

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "Email already in use" });
      }

      // Hash password
      const bcrypt = await import("bcryptjs");
      const passwordHash = await bcrypt.hash(password, 10);

      const avatarColors = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];
      const avatarColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];

      const newUser = await storage.createUser({
        name,
        email,
        passwordHash,
        avatarColor,
        subscriptionStatus: "inactive", // Default to inactive until PayPal subscription is confirmed
      });

      res.json({ 
        user: {
          ...newUser,
          passwordHash: undefined, // Don't send password hash to client
        }
      });
    } catch (error) {
      console.error("Signup error:", error);
      res.status(500).json({ error: "Failed to create account" });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    try {
      req.session.destroy((err) => {
        if (err) {
          return res.status(500).json({ error: "Failed to logout" });
        }
        res.json({ success: true });
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to logout" });
    }
  });

  // PayPal Webhook Handler - DISABLED FOR SECURITY
  // This endpoint is DISABLED because it lacks PayPal signature verification
  // DO NOT ENABLE until you implement proper PayPal webhook verification
  // See PAYPAL_INTEGRATION.md for implementation requirements
  app.post("/api/webhooks/paypal", async (req, res) => {
    // SECURITY: Reject all webhook calls until signature verification is implemented
    console.error("[PayPal Webhook] Rejected - Signature verification not implemented");
    return res.status(501).json({ 
      error: "PayPal webhook verification not implemented. Use admin activation endpoint for testing." 
    });

    // TODO: Implement this after adding PayPal signature verification
    // Example verification flow:
    // 1. Get webhook signature from headers
    // 2. Verify signature using PayPal SDK or manual verification
    // 3. Only if valid, process the event
    // 4. Audit log all webhook attempts
    
    /*
    try {
      // Step 1: Verify PayPal signature
      const webhookId = process.env.PAYPAL_WEBHOOK_ID;
      const signature = req.headers['paypal-transmission-sig'];
      const certUrl = req.headers['paypal-cert-url'];
      const transmissionId = req.headers['paypal-transmission-id'];
      const transmissionTime = req.headers['paypal-transmission-time'];
      
      // Verify using PayPal SDK
      const isValid = await verifyPayPalWebhook({
        webhookId,
        signature,
        certUrl,
        transmissionId,
        transmissionTime,
        body: req.body
      });
      
      if (!isValid) {
        console.error("[PayPal Webhook] Invalid signature");
        return res.status(401).json({ error: "Invalid webhook signature" });
      }

      const { event_type, resource } = req.body;
      
      // Step 2: Process verified events
      if (event_type === "BILLING.SUBSCRIPTION.ACTIVATED") {
        const { custom_id } = resource;
        const subscriptionId = resource.id;

        const user = await storage.getUserByEmail(custom_id);
        if (user) {
          await storage.updateUser(user.id, {
            subscriptionStatus: "active",
            paypalSubscriptionId: subscriptionId,
            subscriptionStartDate: new Date(),
          });

          if (!user.initialDataFetched) {
            fetchInitialDataForUser(user.id).catch(err => {
              console.error(`[SubscriptionActivation] Failed for user ${user.id}:`, err);
            });
          }
          
          console.log(`[PayPal Webhook] Activated subscription for ${custom_id}`);
        }
      }

      if (event_type === "BILLING.SUBSCRIPTION.CANCELLED") {
        const { custom_id } = resource;
        const user = await storage.getUserByEmail(custom_id);
        if (user) {
          await storage.updateUser(user.id, {
            subscriptionStatus: "cancelled",
            subscriptionEndDate: new Date(),
          });
          console.log(`[PayPal Webhook] Cancelled subscription for ${custom_id}`);
        }
      }

      res.json({ received: true });
    } catch (error) {
      console.error("PayPal webhook error:", error);
      res.status(500).json({ error: "Webhook processing failed" });
    }
    */
  });

  // ADMIN ONLY: Manual subscription activation for testing
  // WARNING: This endpoint should be removed or protected with admin authentication in production
  app.post("/api/admin/activate-subscription", async (req, res) => {
    try {
      // In production, add admin authentication here
      const adminSecret = req.headers["x-admin-secret"];
      if (adminSecret !== process.env.ADMIN_SECRET) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const { email, paypalSubscriptionId } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const updatedUser = await storage.updateUser(user.id, {
        subscriptionStatus: "active",
        paypalSubscriptionId: paypalSubscriptionId || "manual_activation",
        subscriptionStartDate: new Date(),
      });

      // Trigger initial data fetch in background if not done yet
      if (!user.initialDataFetched) {
        console.log(`[SubscriptionActivation] Triggering initial data fetch for user ${user.id}...`);
        fetchInitialDataForUser(user.id).catch(err => {
          console.error(`[SubscriptionActivation] Background initial data fetch failed for user ${user.id}:`, err);
        });
      }

      res.json({ 
        success: true,
        user: {
          ...updatedUser,
          passwordHash: undefined,
        }
      });
    } catch (error) {
      console.error("Subscription activation error:", error);
      res.status(500).json({ error: "Failed to activate subscription" });
    }
  });

  // ADMIN ONLY: Create or promote user to super admin
  // WARNING: This endpoint should be protected in production
  app.post("/api/admin/create-super-admin", async (req, res) => {
    try {
      const adminSecret = req.headers["x-admin-secret"];
      if (adminSecret !== process.env.ADMIN_SECRET) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const updatedUser = await storage.updateUser(user.id, {
        isAdmin: true,
        subscriptionStatus: "active",
        subscriptionStartDate: new Date(),
      });

      res.json({ 
        success: true,
        message: "User promoted to super admin",
        user: {
          ...updatedUser,
          passwordHash: undefined,
        }
      });
    } catch (error) {
      console.error("Super admin creation error:", error);
      res.status(500).json({ error: "Failed to create super admin" });
    }
  });

  app.get("/api/users", async (req, res) => {
    try {
      // Only admin users can access the full user list
      if (!req.session.userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const currentUser = await storage.getUser(req.session.userId);
      if (!currentUser?.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      // Only return user info, not password hashes
      const users = await storage.getUsers();
      const sanitizedUsers = users.map(user => ({
        ...user,
        passwordHash: undefined,
      }));
      res.json(sanitizedUsers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.patch("/api/users/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { name, email } = req.body;

      if (!req.session.userId || req.session.userId !== id) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      if (!name || !email) {
        return res.status(400).json({ error: "Name and email are required" });
      }

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser && existingUser.id !== id) {
        return res.status(400).json({ error: "Email already in use" });
      }

      const updatedUser = await storage.updateUser(id, { name, email });
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({ user: updatedUser });
    } catch (error) {
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  app.delete("/api/users/:id", async (req, res) => {
    try {
      const { id } = req.params;

      if (!req.session.userId || req.session.userId !== id) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      await storage.deleteUser(id);
      req.session.destroy((err) => {
        if (err) {
          console.error("Failed to destroy session:", err);
        }
      });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  // Market status
  app.get("/api/market/status", async (req, res) => {
    try {
      const now = new Date();
      const etTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
      
      res.json({
        isOpen: isMarketOpen(),
        currentTime: now.toISOString(),
        marketTime: etTime.toLocaleString("en-US", { 
          timeZone: "America/New_York",
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        }),
        timezone: "America/New_York"
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get market status" });
    }
  });

  // Stock routes
  app.get("/api/stocks", async (req, res) => {
    try {
      const stocks = await storage.getStocks();
      res.json(stocks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch stocks" });
    }
  });

  // Get stocks with user-specific statuses for Purchase page
  app.get("/api/stocks/with-user-status", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const stocks = await storage.getStocks();
      const userStatuses = await storage.getUserStockStatuses(req.session.userId);
      
      // Create a map of ticker -> status
      const statusMap = new Map(userStatuses.map(s => [s.ticker, s]));
      
      // Merge stocks with user statuses
      const stocksWithStatus = stocks.map(stock => ({
        ...stock,
        userStatus: statusMap.get(stock.ticker)?.status || "pending",
        userApprovedAt: statusMap.get(stock.ticker)?.approvedAt,
        userRejectedAt: statusMap.get(stock.ticker)?.rejectedAt,
      }));
      
      res.json(stocksWithStatus);
    } catch (error) {
      console.error("Failed to fetch stocks with user status:", error);
      res.status(500).json({ error: "Failed to fetch stocks with user status" });
    }
  });

  app.get("/api/stocks/:ticker", async (req, res) => {
    try {
      const stock = await storage.getStock(req.params.ticker);
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
      const stock = await storage.updateStock(req.params.ticker, req.body);
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
      const deleted = await storage.deleteStock(req.params.ticker);
      if (!deleted) {
        return res.status(404).json({ error: "Stock not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete stock" });
    }
  });

  // Refresh stock data with real-time market prices
  app.post("/api/stocks/:ticker/refresh", async (req, res) => {
    try {
      const ticker = req.params.ticker;
      const stock = await storage.getStock(ticker);
      if (!stock) {
        return res.status(404).json({ error: "Stock not found" });
      }

      console.log(`[StockAPI] Refreshing market data for ${ticker}...`);
      const marketData = await stockService.getComprehensiveData(ticker);

      const updatedStock = await storage.updateStock(ticker, {
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
      const stocks = await storage.getStocks();
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
          await storage.updateStock(stock.ticker, {
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
      const stock = await storage.getStock(req.params.ticker);
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
        await storage.updateStock(stock.ticker, {
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
      const stock = await storage.getStock(req.params.ticker);
      if (!stock) {
        return res.status(404).json({ error: "Stock not found" });
      }

      // Update user-specific stock status
      await storage.ensureUserStockStatus(req.session.userId, req.params.ticker);
      await storage.updateUserStockStatus(req.session.userId, req.params.ticker, {
        status: "rejected",
        rejectedAt: new Date()
      });

      res.json({ status: "rejected", stock });
    } catch (error) {
      res.status(500).json({ error: "Failed to reject recommendation" });
    }
  });

  app.post("/api/stocks/:ticker/simulate", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const stock = await storage.getStock(req.params.ticker);
      if (!stock) {
        return res.status(404).json({ error: "Stock not found" });
      }

      const simulationCapital = 1000;
      const currentPrice = parseFloat(stock.currentPrice);
      const quantity = Math.floor(simulationCapital / currentPrice);
      const total = currentPrice * quantity;

      // Add initial price point to history for the simulation start
      const now = new Date();
      const initialPricePoint = {
        date: now.toISOString().split('T')[0],
        price: currentPrice,
      };

      // Get existing price history or initialize empty array
      const priceHistory = stock.priceHistory || [];
      
      // Only add if this date doesn't already exist in history
      const dateExists = priceHistory.some(p => p.date === initialPricePoint.date);
      if (!dateExists) {
        priceHistory.push(initialPricePoint);
        
        // Update stock with new price history
        await storage.updateStock(stock.ticker, {
          priceHistory,
        });
      }

      // Check if simulated holding already exists
      const existingHolding = await storage.getPortfolioHoldingByTicker(req.session.userId, stock.ticker, true);
      if (existingHolding) {
        return res.status(400).json({ error: "Simulated holding already exists for this stock" });
      }

      // Create simulated trade (this automatically creates the portfolio holding)
      const trade = {
        userId: req.session.userId,
        ticker: stock.ticker,
        type: "buy" as const,
        quantity,
        price: currentPrice.toFixed(2),
        total: total.toFixed(2),
        status: "completed" as const,
        broker: "simulation",
        isSimulated: true,
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
        message: `Simulation created: ${quantity} shares at $${currentPrice.toFixed(2)} = $${total.toFixed(2)}`
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
          const stock = await storage.getStock(ticker);
          if (!stock) {
            errors.push(`${ticker}: not found`);
            continue;
          }

          // Use current price and default quantity of 10
          const purchasePrice = parseFloat(stock.currentPrice);
          const purchaseQuantity = 10;

          await storage.updateStock(ticker, {
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
          const stock = await storage.getStock(ticker);
          if (!stock) {
            console.log(`[BULK REJECT] Stock ${ticker} not found`);
            errors.push(`${ticker}: not found`);
            continue;
          }

          console.log(`[BULK REJECT] Ensuring user stock status for user ${req.session.userId}, ticker ${ticker}`);
          await storage.ensureUserStockStatus(req.session.userId, ticker);
          
          console.log(`[BULK REJECT] Updating user stock status to rejected`);
          const updated = await storage.updateUserStockStatus(req.session.userId, ticker, {
            status: "rejected",
            rejectedAt: new Date()
          });
          console.log(`[BULK REJECT] Update result for ${ticker}:`, updated);

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
      const validationResult = bulkTickersSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: "Invalid request", details: validationResult.error.errors });
      }
      const { tickers } = validationResult.data;

      let success = 0;
      const errors: string[] = [];

      for (const ticker of tickers) {
        try {
          const stock = await storage.getStock(ticker);
          if (!stock) {
            errors.push(`${ticker}: not found`);
            continue;
          }

          // Fetch latest quote
          await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit: 1 req/sec
          const quote = await finnhubService.getQuote(ticker);
          if (quote && quote.currentPrice) {
            await storage.updateStock(ticker, {
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
      const validationResult = bulkTickersSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: "Invalid request", details: validationResult.error.errors });
      }
      const { tickers } = validationResult.data;

      // Queue selected stocks for analysis (force re-analysis)
      let queuedCount = 0;
      for (const ticker of tickers) {
        try {
          const stock = await storage.getStock(ticker);
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

  // Get all stock analyses
  app.get("/api/stock-analyses", async (req, res) => {
    try {
      const analyses = await storage.getAllStockAnalyses();
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

  // Bulk analyze all pending stocks
  app.post("/api/stocks/analyze-all", async (req, res) => {
    try {
      console.log("[Bulk AI Analysis] Starting bulk analysis of all pending stocks...");
      
      // Get all pending purchase recommendations
      const stocks = await storage.getStocks();
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
      
      console.log(`[Bulk AI Analysis] Found ${pendingStocks.length} pending stocks`);
      
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
  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

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
      const validatedData = insertStockCommentSchema.parse({
        ...req.body,
        ticker: req.params.ticker,
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

  // Stock interest routes
  app.get("/api/stocks/:ticker/interests", async (req, res) => {
    try {
      const interests = await storage.getStockInterests(req.params.ticker);
      res.json(interests);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch interests" });
    }
  });

  app.get("/api/stock-interests", async (req, res) => {
    try {
      const interests = await storage.getAllStockInterests();
      res.json(interests);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch all interests" });
    }
  });

  app.post("/api/stocks/:ticker/interests", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const validatedData = insertStockInterestSchema.parse({
        ticker: req.params.ticker,
        userId: req.session.userId,
      });
      const interest = await storage.createStockInterest(validatedData);
      res.status(201).json(interest);
    } catch (error) {
      console.error("Create interest error:", error);
      res.status(400).json({ error: "Invalid interest data" });
    }
  });

  app.delete("/api/stocks/:ticker/interests", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      await storage.deleteStockInterest(req.params.ticker, req.session.userId);
      res.status(204).send();
    } catch (error) {
      console.error("Delete interest error:", error);
      res.status(500).json({ error: "Failed to delete interest" });
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

  app.get("/api/stock-views/:userId", async (req, res) => {
    try {
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

  app.get("/api/portfolio/holdings/:id", async (req, res) => {
    try {
      const holding = await storage.getPortfolioHolding(req.params.id);
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
      const success = await storage.deletePortfolioHolding(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Holding not found" });
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
      const trade = await storage.getTrade(req.params.id);
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
          const stock = await storage.getStock(ticker);
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
          const currentPrice = parseFloat(stock.currentPrice);
          const quantity = Math.floor(simulationCapital / currentPrice);
          const total = currentPrice * quantity;

          // Create simulated trade (purchase)
          const trade = await storage.createTrade({
            userId: req.session.userId,
            ticker,
            type: "buy",
            quantity,
            price: stock.currentPrice,
            total: total.toString(),
            isSimulated: true,
          });

          // Create simulated portfolio holding
          const holding = await storage.createPortfolioHolding({
            userId: req.session.userId,
            ticker,
            quantity,
            averagePurchasePrice: stock.currentPrice,
            isSimulated: true,
          });

          createdHoldings.push({ ticker, holdingId: holding.id, tradeId: trade.id });
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

  // Telegram Configuration routes
  app.get("/api/telegram/config", async (req, res) => {
    try {
      const config = await storage.getTelegramConfig();
      if (!config) {
        return res.status(404).json({ error: "Telegram configuration not found" });
      }
      // Don't send session string to frontend
      const { sessionString, ...configWithoutSession } = config;
      res.json(configWithoutSession);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch Telegram configuration" });
    }
  });

  app.post("/api/telegram/config", async (req, res) => {
    try {
      const validatedData = insertTelegramConfigSchema.parse(req.body);
      const config = await storage.createOrUpdateTelegramConfig(validatedData);
      
      // Reinitialize Telegram client with new config
      await telegramService.initialize();
      
      // Don't send session string to frontend
      const { sessionString, ...configWithoutSession } = config;
      res.status(201).json(configWithoutSession);
    } catch (error) {
      console.error("Telegram config error:", error);
      res.status(400).json({ error: "Invalid Telegram configuration data" });
    }
  });

  // Manual trigger endpoint to fetch Telegram messages
  app.post("/api/telegram/fetch", async (req, res) => {
    try {
      const config = await storage.getTelegramConfig();
      if (!config || !config.enabled) {
        return res.status(400).json({ error: "Telegram is not configured or disabled" });
      }

      // Get limit from request body, default to 10
      const limit = req.body.limit || 10;
      
      const messages = await telegramService.fetchRecentMessages(
        config.channelUsername,
        limit
      );

      res.json({ 
        success: true, 
        messagesFetched: messages.length,
        messages: messages.map(msg => ({
          id: msg.id,
          date: msg.date,
          text: msg.text,
          preview: msg.text?.substring(0, 100) || "(no text)",
          views: msg.views,
          entities: msg.entities,
        })),
        message: `Fetched ${messages.length} messages from @${config.channelUsername}. Check server logs for detailed structure.`
      });
    } catch (error) {
      console.error("Telegram fetch error:", error);
      res.status(500).json({ error: "Failed to fetch Telegram messages" });
    }
  });

  // Telegram connection status endpoint
  app.get("/api/telegram/status", async (req, res) => {
    try {
      const status = telegramService.getConnectionStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: "Failed to get connection status" });
    }
  });

  // Telegram authentication endpoints
  app.post("/api/telegram/auth/send-code", async (req, res) => {
    try {
      const { phoneNumber } = req.body;
      if (!phoneNumber) {
        return res.status(400).json({ error: "Phone number is required" });
      }

      const result = await telegramService.startAuthentication(phoneNumber);
      res.json(result);
    } catch (error: any) {
      console.error("Send code error:", error);
      res.status(500).json({ error: error.message || "Failed to send verification code" });
    }
  });

  app.post("/api/telegram/auth/sign-in", async (req, res) => {
    try {
      const { phoneNumber, phoneCode, phoneCodeHash } = req.body;
      if (!phoneNumber || !phoneCode || !phoneCodeHash) {
        return res.status(400).json({ error: "Phone number, code, and code hash are required" });
      }

      const result = await telegramService.completeAuthentication(phoneNumber, phoneCode, phoneCodeHash);
      res.json(result);
    } catch (error: any) {
      console.error("Sign in error:", error);
      res.status(500).json({ error: error.message || "Failed to complete authentication" });
    }
  });

  // Test notification endpoint
  app.post("/api/telegram/test-notification", async (req, res) => {
    try {
      if (!telegramNotificationService.isReady()) {
        return res.status(503).json({ 
          error: "Telegram notification service not initialized",
          details: "Make sure TELEGRAM_BOT_TOKEN and TELEGRAM_NOTIFICATION_CHAT_ID are configured"
        });
      }

      const success = await telegramNotificationService.sendStockAlert({
        ticker: "TEST",
        companyName: "Test Company Inc.",
        recommendation: "buy",
        currentPrice: "123.45",
        insiderPrice: "120.00",
        insiderQuantity: 50000,
        confidenceScore: 85,
      });

      if (success) {
        res.json({ success: true, message: "Test notification sent successfully!" });
      } else {
        res.status(500).json({ success: false, error: "Failed to send notification" });
      }
    } catch (error: any) {
      console.error("Test notification error:", error);
      res.status(500).json({ error: error.message || "Failed to send test notification" });
    }
  });

  // OpenInsider Configuration routes
  app.get("/api/openinsider/config", async (req, res) => {
    try {
      let config = await storage.getOpeninsiderConfig();
      if (!config) {
        // Create default config if it doesn't exist
        config = await storage.createOrUpdateOpeninsiderConfig({
          enabled: false,
          fetchLimit: 50,
        });
      }
      res.json(config);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch OpenInsider configuration" });
    }
  });

  app.post("/api/openinsider/config", async (req, res) => {
    try {
      const validatedData = insertOpeninsiderConfigSchema.parse(req.body);
      const config = await storage.createOrUpdateOpeninsiderConfig(validatedData);
      res.status(201).json(config);
    } catch (error) {
      console.error("OpenInsider config error:", error);
      res.status(400).json({ error: "Invalid OpenInsider configuration data" });
    }
  });

  app.post("/api/openinsider/fetch", async (req, res) => {
    try {
      // Get OpenInsider config
      const config = await storage.getOpeninsiderConfig();
      if (!config || !config.enabled) {
        return res.status(400).json({ error: "OpenInsider is not configured or disabled" });
      }

      // Build filters from config
      const filters: {
        insiderTitles?: string[];
        minTransactionValue?: number;
        previousDayOnly?: boolean;
      } = {};
      
      if (config.insiderTitles && config.insiderTitles.length > 0) {
        filters.insiderTitles = config.insiderTitles;
      }
      if (config.minTransactionValue) {
        filters.minTransactionValue = config.minTransactionValue;
      }
      if (config.fetchPreviousDayOnly) {
        filters.previousDayOnly = true;
      }

      // Fetch insider transactions with filters
      const transactions = await openinsiderService.fetchInsiderPurchases(
        config.fetchLimit || 50,
        Object.keys(filters).length > 0 ? filters : undefined
      );
      
      if (transactions.length === 0) {
        await storage.updateOpeninsiderSyncStatus();
        return res.json({ success: true, message: "No new insider transactions found", created: 0 });
      }

      // Convert transactions to stock recommendations
      let createdCount = 0;
      for (const transaction of transactions) {
        try {
          // Check if stock already exists
          const existingStock = await storage.getStock(transaction.ticker);
          
          if (existingStock) {
            continue;
          }

          // Get current market price from Finnhub
          const quote = await finnhubService.getQuote(transaction.ticker);
          if (!quote || !quote.currentPrice) {
            continue;
          }

          // Fetch company profile, market cap, and news
          const stockData = await finnhubService.getBatchStockData([transaction.ticker]);
          const data = stockData.get(transaction.ticker);

          // Create stock recommendation with complete information
          const newStock = await storage.createStock({
            ticker: transaction.ticker,
            companyName: transaction.companyName || transaction.ticker,
            currentPrice: quote.currentPrice.toString(),
            previousClose: quote.previousClose?.toString() || quote.currentPrice.toString(),
            insiderPrice: transaction.price.toString(),
            insiderQuantity: transaction.quantity,
            insiderTradeDate: transaction.filingDate,
            insiderName: transaction.insiderName,
            insiderTitle: transaction.insiderTitle,
            recommendation: "buy",
            source: "openinsider",
            confidenceScore: transaction.confidence || 75,
            peRatio: null,
            marketCap: data?.marketCap ? `$${Math.round(data.marketCap)}M` : null,
            description: data?.companyInfo?.description || null,
            industry: data?.companyInfo?.industry || null,
            country: data?.companyInfo?.country || null,
            webUrl: data?.companyInfo?.webUrl || null,
            ipo: data?.companyInfo?.ipo || null,
            news: data?.news || [],
            insiderSentimentMspr: data?.insiderSentiment?.mspr.toString() || null,
            insiderSentimentChange: data?.insiderSentiment?.change.toString() || null,
            priceHistory: [],
          });

          createdCount++;

          // Send Telegram notification
          if (telegramNotificationService.isReady()) {
            try {
              const notificationSent = await telegramNotificationService.sendStockAlert({
                ticker: newStock.ticker,
                companyName: newStock.companyName,
                recommendation: newStock.recommendation || 'buy',
                currentPrice: newStock.currentPrice,
                insiderPrice: newStock.insiderPrice || undefined,
                insiderQuantity: newStock.insiderQuantity || undefined,
                confidenceScore: newStock.confidenceScore || undefined,
              });
              if (!notificationSent) {
                console.log(`[OpeninsiderFetch] Failed to send Telegram notification for ${transaction.ticker}`);
              }
            } catch (err) {
              console.error(`[OpeninsiderFetch] Error sending Telegram notification for ${transaction.ticker}:`, err);
            }
          }
        } catch (err) {
          console.error(`[OpeninsiderFetch] Error processing ${transaction.ticker}:`, err);
        }
      }

      await storage.updateOpeninsiderSyncStatus();
      res.json({ 
        success: true, 
        message: `Successfully created ${createdCount} new stock recommendations from ${transactions.length} transactions`,
        created: createdCount,
        total: transactions.length
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("[OpeninsiderFetch] Error:", error);
      await storage.updateOpeninsiderSyncStatus(errorMessage);
      res.status(500).json({ error: "Failed to fetch OpenInsider data" });
    }
  });

  // Interactive Brokers (IBKR) routes
  app.get("/api/ibkr/config", async (req, res) => {
    try {
      let config = await storage.getIbkrConfig();
      if (!config) {
        // Create default config if doesn't exist
        config = await storage.createOrUpdateIbkrConfig({
          gatewayUrl: 'https://localhost:5000',
          isPaperTrading: true
        });
      }
      res.json(config);
    } catch (error) {
      console.error("IBKR config fetch error:", error);
      res.status(500).json({ error: "Failed to fetch IBKR configuration" });
    }
  });

  app.post("/api/ibkr/config", async (req, res) => {
    try {
      const config = await storage.createOrUpdateIbkrConfig(req.body);
      res.json(config);
    } catch (error) {
      console.error("IBKR config update error:", error);
      res.status(400).json({ error: "Failed to update IBKR configuration" });
    }
  });

  app.get("/api/ibkr/status", async (req, res) => {
    try {
      const config = await storage.getIbkrConfig();
      if (!config) {
        return res.json({ connected: false, error: "IBKR not configured" });
      }

      const ibkr = getIbkrService(config.gatewayUrl);
      const authStatus = await ibkr.checkAuthStatus();
      
      // Update connection status in database
      await storage.updateIbkrConnectionStatus(authStatus.authenticated && authStatus.connected);

      res.json({
        connected: authStatus.authenticated && authStatus.connected,
        authenticated: authStatus.authenticated,
        competing: authStatus.competing,
        accountId: config.accountId,
        isPaperTrading: config.isPaperTrading,
        gatewayUrl: config.gatewayUrl
      });
    } catch (error: any) {
      console.error("IBKR status check error:", error);
      await storage.updateIbkrConnectionStatus(false, undefined, error.message);
      res.json({ 
        connected: false, 
        error: "Gateway not reachable. Make sure IBKR Client Portal Gateway is running." 
      });
    }
  });

  app.get("/api/ibkr/accounts", async (req, res) => {
    try {
      const config = await storage.getIbkrConfig();
      if (!config) {
        return res.status(400).json({ error: "IBKR not configured" });
      }

      const ibkr = getIbkrService(config.gatewayUrl);
      const accounts = await ibkr.getAccounts();
      
      // Store the first account ID if we don't have one
      if (accounts.length > 0 && !config.accountId) {
        await storage.createOrUpdateIbkrConfig({ accountId: accounts[0].id });
      }

      res.json(accounts);
    } catch (error: any) {
      console.error("IBKR accounts fetch error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/ibkr/positions", async (req, res) => {
    try {
      const config = await storage.getIbkrConfig();
      if (!config || !config.accountId) {
        return res.status(400).json({ error: "IBKR account not configured" });
      }

      const ibkr = getIbkrService(config.gatewayUrl);
      const positions = await ibkr.getPositions(config.accountId);
      res.json(positions);
    } catch (error: any) {
      console.error("IBKR positions fetch error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ibkr/trade", async (req, res) => {
    try {
      const { ticker, action, quantity } = req.body;
      
      if (!ticker || !action || !quantity) {
        return res.status(400).json({ error: "Missing required fields: ticker, action, quantity" });
      }

      const config = await storage.getIbkrConfig();
      if (!config || !config.accountId) {
        return res.status(400).json({ error: "IBKR account not configured" });
      }

      if (!config.isConnected) {
        return res.status(400).json({ error: "IBKR gateway is not connected" });
      }

      const ibkr = getIbkrService(config.gatewayUrl);
      
      let orderResult;
      if (action === 'buy') {
        orderResult = await ibkr.buyStock(config.accountId, ticker, quantity);
      } else if (action === 'sell') {
        orderResult = await ibkr.sellStock(config.accountId, ticker, quantity);
      } else {
        return res.status(400).json({ error: "Invalid action. Must be 'buy' or 'sell'" });
      }

      // Get current stock price to record in trades table
      const stock = await storage.getStock(ticker);
      const price = stock ? parseFloat(stock.currentPrice) : 0;

      // Record the trade in our database
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      await storage.createTrade({
        userId: req.session.userId,
        ticker,
        type: action,
        quantity,
        price: price.toFixed(2),
        total: (price * quantity).toFixed(2),
        status: 'completed',
        broker: 'ibkr',
        ibkrOrderId: orderResult.orderId
      });

      res.json({
        success: true,
        orderId: orderResult.orderId,
        status: orderResult.orderStatus,
        message: `${action.toUpperCase()} order for ${quantity} shares of ${ticker} placed successfully`
      });
    } catch (error: any) {
      console.error("IBKR trade execution error:", error);
      res.status(500).json({ error: error.message || "Failed to execute trade" });
    }
  });

  // What-If Backtest Job routes
  app.get("/api/backtest/jobs", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const jobs = await storage.getBacktestJobs(req.session.userId);
      res.json(jobs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch backtest jobs" });
    }
  });

  app.get("/api/backtest/jobs/:id", async (req, res) => {
    try {
      const job = await storage.getBacktestJob(req.params.id);
      if (!job) {
        return res.status(404).json({ error: "Backtest job not found" });
      }
      res.json(job);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch backtest job" });
    }
  });

  app.get("/api/backtest/jobs/:id/scenarios", async (req, res) => {
    try {
      const scenarios = await storage.getBacktestScenarios(req.params.id);
      res.json(scenarios);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch scenarios" });
    }
  });

  app.get("/api/backtest/jobs/:id/price-data", async (req, res) => {
    try {
      const priceData = await storage.getBacktestPriceData(req.params.id);
      res.json(priceData);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch price data" });
    }
  });

  app.post("/api/backtest/scenarios/:scenarioId/import", async (req, res) => {
    try {
      const { scenarioId } = req.params;
      const { scope = "all_holdings", ticker } = req.body;

      // Fetch all scenarios to find the one we need
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const allJobs = await storage.getBacktestJobs(req.session.userId);
      let scenario = null;
      
      for (const job of allJobs) {
        const scenarios = await storage.getBacktestScenarios(job.id);
        scenario = scenarios.find(s => s.id === scenarioId);
        if (scenario) break;
      }

      if (!scenario) {
        return res.status(404).json({ error: "Scenario not found" });
      }

      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      // Convert scenario to trading rule
      const tradingRule = await storage.createTradingRule({
        userId: req.session.userId,
        name: scenario.name || "Imported Scenario",
        enabled: false, // Start disabled for safety
        scope: scope,
        ticker: scope === "specific_stock" ? ticker : null,
        conditions: scenario.sellConditions || [],
        action: scenario.sellAction?.type === "sell_percentage" ? "sell" : "sell_all",
        actionParams: scenario.sellAction?.percentage 
          ? { percentage: scenario.sellAction.percentage }
          : undefined,
      });

      res.json(tradingRule);
    } catch (error) {
      console.error("Failed to import scenario:", error);
      res.status(500).json({ error: "Failed to import scenario as trading rule" });
    }
  });

  app.post("/api/backtest/jobs", async (req, res) => {
    try {
      const { messageCount, dataSource } = req.body;

      if (!messageCount || messageCount < 1 || messageCount > 2000) {
        return res.status(400).json({ error: "Message count must be between 1 and 2000" });
      }

      const validDataSources = ["telegram", "openinsider"];
      const selectedDataSource = dataSource || "telegram";
      
      if (!validDataSources.includes(selectedDataSource)) {
        return res.status(400).json({ error: `Data source must be one of: ${validDataSources.join(", ")}` });
      }

      const sourceName = selectedDataSource === "telegram" ? "Telegram messages" : "OpenInsider trades";
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const job = await storage.createBacktestJob({
        userId: req.session.userId,
        name: `Backtest ${messageCount} ${sourceName}`,
        dataSource: selectedDataSource,
        messageCount,
      });

      // Start background processing of the job (don't await - run async)
      backtestService.processBacktestJob(job.id).catch(error => {
        console.error(`[BacktestJob ${job.id}] Background processing failed:`, error);
      });

      res.json(job);
    } catch (error) {
      console.error("Failed to create backtest job:", error);
      res.status(500).json({ error: "Failed to create backtest job" });
    }
  });

  app.patch("/api/backtest/jobs/:id/cancel", async (req, res) => {
    try {
      const job = await storage.getBacktestJob(req.params.id);
      
      if (!job) {
        return res.status(404).json({ error: "Backtest job not found" });
      }

      if (["completed", "failed", "cancelled"].includes(job.status)) {
        return res.status(400).json({ error: "Cannot cancel a job that is already finished" });
      }

      await storage.updateBacktestJob(req.params.id, { 
        status: "cancelled",
        errorMessage: "Cancelled by user"
      });

      const updatedJob = await storage.getBacktestJob(req.params.id);
      res.json(updatedJob);
    } catch (error) {
      console.error("Failed to cancel backtest job:", error);
      res.status(500).json({ error: "Failed to cancel backtest job" });
    }
  });

  app.delete("/api/backtest/jobs/:id", async (req, res) => {
    try {
      const job = await storage.getBacktestJob(req.params.id);
      
      if (!job) {
        return res.status(404).json({ error: "Backtest job not found" });
      }

      await storage.deleteBacktestJob(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete backtest job:", error);
      res.status(500).json({ error: "Failed to delete backtest job" });
    }
  });

  // Temporary endpoint to manually trigger backtest job processing
  app.post("/api/backtest/jobs/:id/trigger", async (req, res) => {
    try {
      const job = await storage.getBacktestJob(req.params.id);
      
      if (!job) {
        return res.status(404).json({ error: "Backtest job not found" });
      }

      // Start background processing of the job
      backtestService.processBacktestJob(req.params.id).catch(error => {
        console.error(`[BacktestJob ${req.params.id}] Background processing failed:`, error);
      });

      res.json({ success: true, message: "Job processing triggered" });
    } catch (error) {
      console.error("Failed to trigger backtest job:", error);
      res.status(500).json({ error: "Failed to trigger backtest job" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
