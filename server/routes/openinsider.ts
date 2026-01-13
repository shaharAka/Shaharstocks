import type { Express } from "express";
import { storage } from "../storage";
import { insertOpeninsiderConfigSchema } from "@shared/schema";
import { openinsiderService } from "../openinsiderService";

export function registerOpeninsiderRoutes(app: Express) {
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
      // Per-user tenant isolation: Each user can fetch their own opportunity list with custom filters
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      // Get OpenInsider config (currently global, but users can customize via UI)
      const config = await storage.getOpeninsiderConfig();
      if (!config || !config.enabled) {
        return res.status(400).json({ error: "OpenInsider is not configured or disabled" });
      }

      // Check if this is an onboarding fetch (first-time user)
      const user = await storage.getUser(req.session.userId);
      const isOnboarding = !user?.initialDataFetched;

      // Fetch insider trades
      console.log(`[OpenInsider Fetch] Starting fetch for user ${req.session.userId} (onboarding: ${isOnboarding})...`);
      
      // Fetch purchases (limit based on config)
      const purchasesResponse = await openinsiderService.fetchInsiderPurchases(
        config.fetchLimit || 500,
        undefined,
        "P"
      );
      
      // Fetch sales (limit based on config)
      const salesResponse = await openinsiderService.fetchInsiderSales(
        config.fetchLimit || 500,
        undefined
      );

      // Merge transactions from both sources
      const transactions = [...purchasesResponse.transactions, ...salesResponse.transactions];
      
      console.log(`[OpenInsider Fetch] Fetched ${purchasesResponse.transactions.length} purchases + ${salesResponse.transactions.length} sales = ${transactions.length} total`);

      // Process transactions and create stocks (similar to initial data fetch logic)
      let createdCount = 0;
      let filteredCount = 0;

      for (const transaction of transactions) {
        try {
          // Check if this exact transaction already exists using composite key
          const existingTransaction = await storage.getTransactionByCompositeKey(
            req.session.userId,
            transaction.ticker,
            transaction.filingDate,
            transaction.insiderName,
            transaction.recommendation
          );
          
          if (existingTransaction) {
            filteredCount++;
            continue;
          }

          // Get current market price from Finnhub
          const { finnhubService } = await import("../finnhubService");
          const quote = await finnhubService.getQuote(transaction.ticker);
          if (!quote || !quote.currentPrice) {
            filteredCount++;
            continue;
          }

          // Fetch company profile, market cap, and news
          const stockData = await finnhubService.getBatchStockData([transaction.ticker]);
          const data = stockData.get(transaction.ticker);
          
          // Apply market cap filter (must be > $500M)
          const marketCapValue = data?.marketCap ? data.marketCap * 1_000_000 : 0;
          if (marketCapValue < 500_000_000) {
            filteredCount++;
            continue;
          }
          
          // Apply options deal filter ONLY to BUY transactions
          if (transaction.recommendation === "buy") {
            const insiderPriceNum = transaction.price;
            if (insiderPriceNum < quote.currentPrice * 0.15) {
              filteredCount++;
              continue;
            }
          }

          // Create stock recommendation
          await storage.createStock({
            userId: req.session.userId,
            ticker: transaction.ticker,
            companyName: transaction.companyName || transaction.ticker,
            currentPrice: quote.currentPrice.toString(),
            previousClose: quote.previousClose?.toString() || quote.currentPrice.toString(),
            insiderPrice: transaction.price.toString(),
            insiderQuantity: transaction.quantity,
            insiderTradeDate: transaction.filingDate,
            insiderName: transaction.insiderName,
            insiderTitle: transaction.insiderTitle,
            recommendation: transaction.recommendation,
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
          console.error(`[OpenInsider Fetch] Error processing ${transaction.ticker}:`, err);
          filteredCount++;
        }
      }

      console.log(`[OpenInsider Fetch] Created ${createdCount} new stocks, filtered ${filteredCount} duplicates/invalid`);

      res.json({
        success: true,
        transactionsFetched: transactions.length,
        stocksCreated: createdCount,
        filtered: filteredCount,
        message: `Fetched ${transactions.length} transactions, created ${createdCount} new stock recommendations`
      });
    } catch (error: any) {
      console.error("OpenInsider fetch error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch OpenInsider data" });
    }
  });

  // Get insider trading history by name
  app.get("/api/insider/history/:insiderName", async (req, res) => {
    try {
      // Require authentication
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Decode and validate insider name
      const insiderName = decodeURIComponent(req.params.insiderName).trim();
      if (!insiderName) {
        return res.status(400).json({ error: "Insider name is required" });
      }

      // Get optional ticker parameter (for filtering to specific stock)
      const ticker = (req.query.ticker as string)?.trim().toUpperCase();

      // Parse and validate limit parameter (default: 50 when ticker provided, 20 otherwise)
      const limitParam = req.query.limit as string | undefined;
      let limit = ticker ? 50 : 20; // Higher limit when filtering by ticker (faster)
      if (limitParam) {
        const parsed = parseInt(limitParam, 10);
        if (isNaN(parsed) || parsed < 1) {
          return res.status(400).json({ error: "Invalid limit parameter" });
        }
        limit = Math.min(parsed, ticker ? 200 : 100); // Higher cap when filtering by ticker
      }

      // Sanitize name for logging
      const sanitizedName = insiderName.replace(/[\n\r]/g, ' ').substring(0, 100);
      const tickerInfo = ticker ? ` for ${ticker}` : '';
      console.log(`[InsiderHistory] Fetching history for "${sanitizedName}"${tickerInfo} (limit: ${limit})`);

      // Fetch insider trading history
      const scraperResponse = await openinsiderService.fetchInsiderPurchases(
        limit,
        { insider_name: insiderName, ticker }
      );
      const trades = scraperResponse.transactions;

      console.log(`[InsiderHistory] Found ${trades.length} trades for "${sanitizedName}"`);
      console.log(`[InsiderHistory] Stage 1 Filter Stats:`, scraperResponse.stats);

      // Handle empty results gracefully
      if (!trades || trades.length === 0) {
        return res.json({
          insiderName,
          count: 0,
          trades: [],
          score: null
        });
      }

      // Calculate trade scores (2-week P&L performance)
      const scoredTrades = await openinsiderService.calculateTradeScores(trades);
      
      // Calculate aggregate insider score
      const insiderScore = openinsiderService.calculateInsiderScore(scoredTrades);

      // Return structured response with scores
      res.json({
        insiderName,
        count: scoredTrades.length,
        trades: scoredTrades,
        score: insiderScore
      });
    } catch (error: any) {
      console.error("[InsiderHistory] ERROR occurred:");
      console.error("[InsiderHistory] Error message:", error.message);
      console.error("[InsiderHistory] Error stack:", error.stack);
      if (error.stdout) console.error("[InsiderHistory] stdout:", error.stdout);
      if (error.stderr) console.error("[InsiderHistory] stderr:", error.stderr);
      
      // Map errors to appropriate HTTP status codes
      if (error.message?.includes("timeout") || error.message?.includes("network")) {
        return res.status(502).json({ 
          error: "Failed to fetch insider data from OpenInsider",
          details: "The service may be temporarily unavailable"
        });
      }
      
      res.status(500).json({ 
        error: "Failed to fetch insider trading history",
        details: error.message || "Unknown error"
      });
    }
  });
}

