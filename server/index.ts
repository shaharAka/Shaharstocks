import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";
import { telegramService } from "./telegram";
import { finnhubService } from "./finnhubService";
import { telegramNotificationService } from "./telegramNotificationService";
import { openinsiderService } from "./openinsiderService";
import { aiAnalysisService } from "./aiAnalysisService";
import { startCleanupScheduler } from "./jobs/cleanupStaleStocks";
import { stockService } from "./stockService";
import { secEdgarService } from "./secEdgarService";
import { sessionMiddleware } from "./session";
import { queueWorker } from "./queueWorker";
import { websocketManager } from "./websocketServer";

// Feature flags
const ENABLE_TELEGRAM = process.env.ENABLE_TELEGRAM === "true";

const app = express();

// Trust proxy for correct protocol/host detection behind Replit's reverse proxy
app.set('trust proxy', 1);

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

// Add session middleware
app.use(sessionMiddleware);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Initialize default configuration
  await storage.initializeDefaults();
  log("Server starting with session-based admin authentication...");
  
  // Initialize AI provider configuration from database
  try {
    const settings = await storage.getSystemSettings();
    if (settings?.aiProvider) {
      const { setMacroProviderConfig } = await import("./macroAgentService");
      const { setBacktestProviderConfig } = await import("./backtestService");
      const { clearProviderCache } = await import("./aiProvider");
      
      const config = { 
        provider: settings.aiProvider as "openai" | "gemini", 
        model: settings.aiModel || undefined 
      };
      
      aiAnalysisService.setProviderConfig(config);
      setMacroProviderConfig(config);
      setBacktestProviderConfig(config);
      clearProviderCache();
      
      log(`AI provider initialized: ${settings.aiProvider}${settings.aiModel ? ` (model: ${settings.aiModel})` : ""}`);
    } else {
      log("AI provider using default: OpenAI");
    }
  } catch (err) {
    log(`AI provider initialization skipped: ${(err as Error).message}`);
  }
  
  // Initialize Telegram services only if feature flag is enabled
  if (ENABLE_TELEGRAM) {
    // Initialize Telegram client if configured
    await telegramService.initialize().catch(err => {
      log(`Telegram service initialization skipped: ${err.message}`);
    });

    // Initialize Telegram notification bot if configured
    await telegramNotificationService.initialize().catch(err => {
      log(`Telegram notification service initialization skipped: ${err.message}`);
    });
  } else {
    log("Telegram integration disabled via feature flag");
  }
  
  const server = await registerRoutes(app);

  // Initialize WebSocket server for real-time updates
  websocketManager.initialize(server);
  log("[WebSocket] Real-time update server initialized");

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    // Add middleware to bypass Vite for API routes
    app.use('/api/*', (req, res, next) => {
      // If we get here, it means no API route matched - return 404
      if (!res.headersSent) {
        res.status(404).json({ error: "API endpoint not found" });
      } else {
        next();
      }
    });
    
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });

  // Start automatic stock price updates every 5 minutes
  startPriceUpdateJob();
  
  // Start daily cleanup of stale pending stocks (> 10 days old)
  startCleanupScheduler(storage);
  
  // Start automatic candlestick data fetching for purchase candidates (once a day)
  startCandlestickDataJob();
  
  // Start automatic holdings price history updates every 5 minutes
  startHoldingsPriceHistoryJob();
  
  // Start automatic Telegram message fetching every hour (only if enabled)
  if (ENABLE_TELEGRAM) {
    startTelegramFetchJob();
  }
  
  // Start automatic OpenInsider data fetching every hour
  startOpeninsiderFetchJob();
  
  // Start automatic cleanup of old recommendations (older than 2 weeks)
  startRecommendationCleanupJob();
  
  // Start automatic trading rule evaluation for simulated holdings only
  startSimulatedRuleExecutionJob();
  
  // Start automatic AI analysis for new purchase candidates
  startAIAnalysisJob();
  
  // Start the AI analysis queue worker
  queueWorker.start();
  log("[QueueWorker] AI Analysis queue worker started");
  
  // Start hourly reconciliation job to re-queue incomplete analyses
  startAnalysisReconciliationJob();
  
  // Start daily brief generation job for followed stocks
  startDailyBriefJob();
  
  // Start automatic cleanup of unverified users after 48 hours
  startUnverifiedUserCleanupJob();
})();

/**
 * Background job to update stock prices every 5 minutes
 * Only updates stocks with pending "Buy" recommendations
 */
function startPriceUpdateJob() {
  const FIVE_MINUTES = 5 * 60 * 1000;

  async function updateStockPrices() {
    try {
      // Skip if market is closed
      if (!isMarketOpen()) {
        log("[PriceUpdate] Market is closed, skipping stock price update");
        return;
      }
      
      log("[PriceUpdate] Starting stock price update job...");
      
      // Get unique pending tickers across all users (per-user isolation)
      const tickers = await storage.getAllUniquePendingTickers();

      if (tickers.length === 0) {
        log("[PriceUpdate] No pending stocks to update");
        return;
      }

      log(`[PriceUpdate] Updating prices for ${tickers.length} unique pending tickers across all users`);

      // Fetch quotes, market cap, company info, and news for all pending stocks
      const stockData = await finnhubService.getBatchStockData(tickers);

      // Update each ticker globally (across all users) with shared market data
      let successCount = 0;
      for (const ticker of tickers) {
        const data = stockData.get(ticker);
        if (data) {
          // Update all instances of this ticker (across all users) with the same market data
          const updatedCount = await storage.updateStocksByTickerGlobally(ticker, {
            currentPrice: data.quote.currentPrice.toString(),
            previousClose: data.quote.previousClose.toString(),
            marketCap: data.marketCap ? `$${Math.round(data.marketCap)}M` : null,
            description: data.companyInfo?.description || null,
            industry: data.companyInfo?.industry || null,
            country: data.companyInfo?.country || null,
            webUrl: data.companyInfo?.webUrl || null,
            ipo: data.companyInfo?.ipo || null,
            news: data.news || [],
            insiderSentimentMspr: data.insiderSentiment?.mspr.toString() || null,
            insiderSentimentChange: data.insiderSentiment?.change.toString() || null,
          });
          if (updatedCount > 0) {
            successCount++;
            log(`[PriceUpdate] Updated ${ticker}: ${updatedCount} instances across users`);
          }
        }
      }

      log(`[PriceUpdate] Successfully updated ${successCount}/${tickers.length} tickers`);
    } catch (error) {
      console.error("[PriceUpdate] Error updating stock prices:", error);
    }
  }

  // Run immediately on startup
  updateStockPrices().catch(err => {
    console.error("[PriceUpdate] Initial update failed:", err);
  });

  // Then run every 5 minutes
  setInterval(updateStockPrices, FIVE_MINUTES);
  log("[PriceUpdate] Background job started - updating every 5 minutes");
}

/**
 * Background job to fetch 2 weeks of candlestick data for all pending purchase recommendations
 * Runs once a day (after market close)
 */
function startCandlestickDataJob() {
  const ONE_DAY = 24 * 60 * 60 * 1000;

  async function fetchCandlestickData() {
    try {
      log("[CandlestickData] Starting candlestick data fetch job...");
      
      // Get unique tickers that need candlestick data (shared table - one record per ticker)
      const tickers = await storage.getAllTickersNeedingCandlestickData();

      if (tickers.length === 0) {
        log("[CandlestickData] No stocks need candlestick data");
        return;
      }

      log(`[CandlestickData] Fetching candlestick data for ${tickers.length} unique tickers (shared storage)`);

      // Import stockService here to avoid circular dependencies
      const { stockService } = await import('./stockService.js');

      // Fetch candlestick data for each ticker (with rate limiting handled by stockService)
      let successCount = 0;
      let errorCount = 0;
      const errors: { ticker: string; error: string }[] = [];
      
      for (const ticker of tickers) {
        try {
          log(`[CandlestickData] Fetching data for ${ticker}...`);
          const candlesticks = await stockService.getCandlestickData(ticker);
          
          if (candlesticks && candlesticks.length > 0) {
            // Upsert into shared stockCandlesticks table (one record per ticker, reused across all users)
            await storage.upsertCandlesticks(ticker, candlesticks.map(c => ({
              date: c.date,
              open: c.open,
              high: c.high,
              low: c.low,
              close: c.close,
              volume: c.volume
            })));
            log(`[CandlestickData] ✓ ${ticker} - fetched ${candlesticks.length} days, stored in shared table`);
            successCount++;
          } else {
            log(`[CandlestickData] ⚠️ ${ticker} - no candlestick data returned`);
            errorCount++;
            errors.push({ ticker, error: "No data returned from API" });
          }
        } catch (error: any) {
          errorCount++;
          const errorMsg = error.message || String(error);
          errors.push({ ticker, error: errorMsg });
          console.error(`[CandlestickData] ✗ ${ticker} - Error: ${errorMsg}`);
        }
      }

      log(`[CandlestickData] Successfully updated ${successCount}/${tickers.length} tickers`);
      
      if (errorCount > 0) {
        log(`[CandlestickData] Failed to fetch data for ${errorCount} stocks:`);
        errors.forEach(({ ticker, error }) => {
          log(`  - ${ticker}: ${error}`);
        });
      }
    } catch (error) {
      console.error("[CandlestickData] Error in candlestick data job:", error);
    }
  }

  // Run immediately on startup
  fetchCandlestickData().catch(err => {
    console.error("[CandlestickData] Initial fetch failed:", err);
  });

  // Then run once a day
  setInterval(fetchCandlestickData, ONE_DAY);
  log("[CandlestickData] Background job started - fetching once a day");
}

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

/**
 * Background job to update price history for all holdings (simulated and real)
 * Runs every 5 minutes to add new price points to the chart
 */
function startHoldingsPriceHistoryJob() {
  const FIVE_MINUTES = 5 * 60 * 1000;

  async function updateHoldingsPriceHistory() {
    try {
      // Skip if market is closed
      if (!isMarketOpen()) {
        log("[HoldingsHistory] Market is closed, skipping price update");
        return;
      }
      
      log("[HoldingsHistory] Starting holdings price history update...");
      
      // Get all users and their holdings
      const users = await storage.getUsers();
      const allHoldings = [];
      for (const user of users) {
        const userHoldings = await storage.getPortfolioHoldings(user.id);
        allHoldings.push(...userHoldings);
      }
      const holdings = allHoldings;
      
      if (holdings.length === 0) {
        log("[HoldingsHistory] No holdings to update");
        return;
      }

      // Get unique tickers from holdings
      const tickerSet = new Set(holdings.map(h => h.ticker));
      const tickers = Array.from(tickerSet);
      log(`[HoldingsHistory] Updating price history for ${tickers.length} tickers`);

      // Fetch current prices for all tickers
      const quotes = await finnhubService.getBatchQuotes(tickers);
      
      // Current timestamp
      const now = new Date().toISOString();
      
      let successCount = 0;
      
      // Update price history for each ticker (iterate users once, update their stocks)
      for (const ticker of tickers) {
        const quote = quotes.get(ticker);
        if (!quote || !quote.currentPrice) {
          continue;
        }

        // Update each user's stock with this ticker
        for (const user of users) {
          const userStocks = await storage.getStocks(user.id);
          const stock = userStocks.find(s => s.ticker === ticker);
          if (!stock) continue;

          // Get existing price history
          const priceHistory = stock.priceHistory || [];
          
          // Always add a new price point with current timestamp
          priceHistory.push({
            date: now,
            price: quote.currentPrice,
          });
          
          // Update this user's stock with new price history
          await storage.updateStock(user.id, ticker, {
            priceHistory,
            currentPrice: quote.currentPrice.toString(),
          });
        }
        
        successCount++;
      }

      log(`[HoldingsHistory] Successfully updated ${successCount}/${tickers.length} stocks with new price points`);
    } catch (error) {
      console.error("[HoldingsHistory] Error updating holdings price history:", error);
    }
  }

  // Run immediately on startup
  updateHoldingsPriceHistory().catch(err => {
    console.error("[HoldingsHistory] Initial update failed:", err);
  });

  // Then run every 5 minutes
  setInterval(updateHoldingsPriceHistory, FIVE_MINUTES);
  log("[HoldingsHistory] Background job started - updating price history every 5 minutes");
}

/**
 * Background job to fetch new Telegram messages every hour
 */
function startTelegramFetchJob() {
  const ONE_HOUR = 60 * 60 * 1000;

  async function fetchTelegramMessages() {
    try {
      log("[TelegramFetch] Starting Telegram message fetch job...");
      
      // Get Telegram config
      const config = await storage.getTelegramConfig();
      if (!config || !config.enabled) {
        log("[TelegramFetch] Telegram is not configured or disabled, skipping");
        return;
      }

      // Fetch recent messages (last 20)
      const messages = await telegramService.fetchRecentMessages(config.channelUsername, 20);
      log(`[TelegramFetch] Successfully fetched and processed ${messages.length} messages`);
    } catch (error) {
      console.error("[TelegramFetch] Error fetching Telegram messages:", error);
    }
  }

  // Run immediately on startup
  fetchTelegramMessages().catch(err => {
    console.error("[TelegramFetch] Initial fetch failed:", err);
  });

  // Then run every hour
  setInterval(fetchTelegramMessages, ONE_HOUR);
  log("[TelegramFetch] Background job started - fetching every hour");
}

/**
 * Background job to fetch new OpenInsider data (hourly or daily based on config)
 * Trial users: daily refresh only, Paid subscribers: hourly refresh
 */
function startOpeninsiderFetchJob() {
  const ONE_HOUR = 60 * 60 * 1000;
  const ONE_DAY = 24 * 60 * 60 * 1000;
  
  // Mutex to prevent concurrent job executions
  let isJobRunning = false;

  async function fetchOpeninsiderData() {
    // Prevent concurrent executions
    if (isJobRunning) {
      log("[OpeninsiderFetch] Job already running, skipping this execution");
      return;
    }
    isJobRunning = true;
    
    try {
      log("[OpeninsiderFetch] Starting OpenInsider data fetch job...");
      
      // Get OpenInsider config
      const config = await storage.getOpeninsiderConfig();
      if (!config || !config.enabled) {
        log("[OpeninsiderFetch] OpenInsider is not configured or disabled, skipping");
        return;
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

      // Get configurable backend filters
      const optionsDealThreshold = config.optionsDealThresholdPercent ?? 15;
      const minMarketCap = config.minMarketCap ?? 500;

      // Fetch BOTH purchase and sale transactions
      log(`[OpeninsiderFetch] Fetching both purchases AND sales...`);
      const [purchasesResponse, salesResponse] = await Promise.all([
        openinsiderService.fetchInsiderPurchases(
          config.fetchLimit || 50,
          Object.keys(filters).length > 0 ? filters : undefined,
          "P"
        ),
        openinsiderService.fetchInsiderSales(
          config.fetchLimit || 50,
          Object.keys(filters).length > 0 ? filters : undefined
        )
      ]);
      
      // Merge transactions from both sources
      const transactions = [...purchasesResponse.transactions, ...salesResponse.transactions];
      
      // Merge stats
      const stage1Stats = {
        total_rows_scraped: purchasesResponse.stats.total_rows_scraped + salesResponse.stats.total_rows_scraped,
        filtered_not_purchase: purchasesResponse.stats.filtered_not_purchase + salesResponse.stats.filtered_not_purchase,
        filtered_invalid_data: purchasesResponse.stats.filtered_invalid_data + salesResponse.stats.filtered_invalid_data,
        filtered_by_date: purchasesResponse.stats.filtered_by_date + salesResponse.stats.filtered_by_date,
        filtered_by_title: purchasesResponse.stats.filtered_by_title + salesResponse.stats.filtered_by_title,
        filtered_by_transaction_value: purchasesResponse.stats.filtered_by_transaction_value + salesResponse.stats.filtered_by_transaction_value,
        filtered_by_insider_name: purchasesResponse.stats.filtered_by_insider_name + salesResponse.stats.filtered_by_insider_name,
      };
      
      log(`[OpeninsiderFetch] Fetched ${purchasesResponse.transactions.length} purchases + ${salesResponse.transactions.length} sales = ${transactions.length} total`);
      
      if (transactions.length === 0) {
        log("[OpeninsiderFetch] No insider transactions found");
        await storage.updateOpeninsiderSyncStatus();
        return;
      }

      const totalStage1Filtered = stage1Stats.filtered_by_title + stage1Stats.filtered_by_transaction_value + 
                                   stage1Stats.filtered_by_date + stage1Stats.filtered_not_purchase + 
                                   stage1Stats.filtered_invalid_data;

      log(`[OpeninsiderFetch] ======= STAGE 1: Python Scraper Filters =======`);
      log(`[OpeninsiderFetch] Total rows scraped: ${stage1Stats.total_rows_scraped}`);
      log(`[OpeninsiderFetch]   • Not a purchase / Invalid: ${stage1Stats.filtered_not_purchase + stage1Stats.filtered_invalid_data}`);
      log(`[OpeninsiderFetch]   • Filtered by date: ${stage1Stats.filtered_by_date}`);
      log(`[OpeninsiderFetch]   • Filtered by title: ${stage1Stats.filtered_by_title}`);
      log(`[OpeninsiderFetch]   • Filtered by transaction value: ${stage1Stats.filtered_by_transaction_value}`);
      log(`[OpeninsiderFetch] → Total Stage 1 filtered: ${totalStage1Filtered}`);
      log(`[OpeninsiderFetch] → Returned ${transactions.length} matching transactions`);
      log(`[OpeninsiderFetch] ===============================================`);

      // Convert transactions to stock recommendations
      let createdCount = 0;
      let filteredMarketCap = 0;
      let filteredOptionsDeals = 0;
      let filteredNoQuote = 0;
      let filteredDuplicates = 0;
      const createdTickers = new Set<string>(); // Track unique tickers for AI analysis
      
      // Get only users who are eligible for data refresh based on subscription type
      // Trial users: daily refresh only, Paid subscribers: hourly refresh
      const users = await storage.getUsersEligibleForDataRefresh();
      log(`[OpeninsiderFetch] ${users.length} users eligible for data refresh (trial: daily, paid: hourly)`);
      
      // IMMEDIATELY update lastDataRefresh for eligible users to prevent duplicate refreshes
      // This happens BEFORE processing transactions to ensure eligibility is updated even if no stocks are created
      if (users.length > 0) {
        for (const user of users) {
          await storage.updateUserLastDataRefresh(user.id);
        }
        log(`[OpeninsiderFetch] Updated lastDataRefresh for ${users.length} users at START of job`);
      }
      
      for (const transaction of transactions) {
        try {
          // Get current market price from Finnhub (once per transaction)
          const quote = await finnhubService.getQuote(transaction.ticker);
          if (!quote || !quote.currentPrice) {
            filteredNoQuote++;
            log(`[OpeninsiderFetch] Could not get quote for ${transaction.ticker}, skipping`);
            continue;
          }

          // Fetch company profile, market cap, and news
          const stockData = await finnhubService.getBatchStockData([transaction.ticker]);
          const data = stockData.get(transaction.ticker);
          
          // Apply market cap filter
          if (!data?.marketCap || data.marketCap < minMarketCap) {
            filteredMarketCap++;
            log(`[OpeninsiderFetch] ${transaction.ticker} market cap too low: $${data?.marketCap || 0}M (need >$${minMarketCap}M), skipping`);
            continue;
          }

          // Apply options deal filter ONLY to BUY transactions
          if (transaction.recommendation === "buy") {
            const insiderPriceNum = transaction.price;
            const thresholdPercent = optionsDealThreshold / 100;
            if (optionsDealThreshold > 0 && insiderPriceNum < quote.currentPrice * thresholdPercent) {
              filteredOptionsDeals++;
              log(`[OpeninsiderFetch] ${transaction.ticker} likely options deal: insider price $${insiderPriceNum.toFixed(2)} < ${optionsDealThreshold}% of market $${quote.currentPrice.toFixed(2)}, skipping`);
              continue;
            }
          }

          // Create stock for ALL users (shared market data)
          for (const user of users) {
            // Check if transaction already exists for this user
            const existingTransaction = await storage.getTransactionByCompositeKey(
              user.id,
              transaction.ticker,
              transaction.filingDate,
              transaction.insiderName,
              transaction.recommendation
            );
            
            if (existingTransaction) {
              filteredDuplicates++;
              continue;
            }

            // Create stock recommendation for this user
            await storage.createStock({
              userId: user.id,
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
              opportunityType: transaction.recommendation.toLowerCase() === "sell" ? "SELL" : "BUY",
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
          }

          createdCount++;
          createdTickers.add(transaction.ticker);
          log(`[OpeninsiderFetch] Created stock recommendation for ${transaction.ticker}`)

          // Send Telegram notification using transaction data
          if (ENABLE_TELEGRAM && telegramNotificationService.isReady()) {
            try {
              const notificationSent = await telegramNotificationService.sendStockAlert({
                ticker: transaction.ticker,
                companyName: transaction.companyName || transaction.ticker,
                recommendation: transaction.recommendation || 'buy',
                currentPrice: quote.currentPrice.toString(),
                insiderPrice: transaction.price.toString(),
                insiderQuantity: transaction.quantity,
                confidenceScore: transaction.confidence || 75,
              });
              if (notificationSent) {
                log(`[OpeninsiderFetch] Sent Telegram notification for ${transaction.ticker}`);
              } else {
                log(`[OpeninsiderFetch] Failed to send Telegram notification for ${transaction.ticker}`);
              }
            } catch (err) {
              console.error(`[OpeninsiderFetch] Error sending Telegram notification for ${transaction.ticker}:`, err);
            }
          }
        } catch (err) {
          console.error(`[OpeninsiderFetch] Error processing ${transaction.ticker}:`, err);
        }
      }

      // Queue ONE AI analysis job per unique ticker (not per transaction)
      if (createdTickers.size > 0) {
        const uniqueTickersArray = Array.from(createdTickers);
        log(`[OpeninsiderFetch] Queuing AI analysis for ${uniqueTickersArray.length} unique tickers...`);
        for (const ticker of uniqueTickersArray) {
          try {
            await storage.enqueueAnalysisJob(ticker, "openinsider_fetch", "normal");
            log(`[OpeninsiderFetch] ✓ Queued AI analysis for ${ticker}`);
          } catch (error) {
            console.error(`[OpeninsiderFetch] Failed to queue AI analysis for ${ticker}:`, error);
          }
        }
      }

      log(`\n[OpeninsiderFetch] ======= STAGE 2: Backend Post-Processing =======`);
      log(`[OpeninsiderFetch] Starting with: ${transactions.length} transactions`);
      log(`[OpeninsiderFetch]   ⊗ Duplicates: ${filteredDuplicates}`);
      log(`[OpeninsiderFetch]   ⊗ Market cap < $${minMarketCap}M: ${filteredMarketCap}`);
      log(`[OpeninsiderFetch]   ⊗ Options deals (< ${optionsDealThreshold}%): ${filteredOptionsDeals}`);
      log(`[OpeninsiderFetch]   ⊗ No quote: ${filteredNoQuote}`);
      log(`[OpeninsiderFetch] → Total Stage 2 filtered: ${filteredDuplicates + filteredMarketCap + filteredOptionsDeals + filteredNoQuote}`);
      log(`[OpeninsiderFetch] ===============================================`);
      log(`\n[OpeninsiderFetch] ✓ Successfully created ${createdCount} new recommendations (${createdTickers.size} unique tickers)\n`);
      
      await storage.updateOpeninsiderSyncStatus();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("[OpeninsiderFetch] Error fetching OpenInsider data:", error);
      await storage.updateOpeninsiderSyncStatus(errorMessage);
    } finally {
      // Release mutex
      isJobRunning = false;
    }
  }

  // Run immediately on startup
  fetchOpeninsiderData().catch(err => {
    console.error("[OpeninsiderFetch] Initial fetch failed:", err);
  });

  // Determine interval based on config
  async function getInterval() {
    const config = await storage.getOpeninsiderConfig();
    return config?.fetchInterval === "daily" ? ONE_DAY : ONE_HOUR;
  }

  // Set up interval job
  getInterval().then(interval => {
    setInterval(fetchOpeninsiderData, interval);
    const intervalName = interval === ONE_DAY ? "daily" : "hourly";
    log(`[OpeninsiderFetch] Background job started - fetching ${intervalName}`);
  });
}

/**
 * Background job to clean up old stock recommendations
 * - Rejects pending stocks with insider trade dates older than 2 weeks
 * - Deletes rejected stocks that were rejected more than 2 weeks ago
 */
function startRecommendationCleanupJob() {
  const ONE_HOUR = 60 * 60 * 1000;
  const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;

  async function cleanupOldRecommendations() {
    try {
      log("[Cleanup] Starting recommendation cleanup job...");
      
      // Get all users to process their stocks
      const users = await storage.getUsers();
      const now = new Date();
      let rejectedCount = 0;
      let deletedCount = 0;
      let totalStocksChecked = 0;

      for (const user of users) {
        const stocks = await storage.getStocks(user.id);
        totalStocksChecked += stocks.length;

        // 1. Reject old pending recommendations (older than 2 weeks by insider trade date, both buy and sell)
        const pendingStocks = stocks.filter(
          stock => stock.recommendationStatus === "pending" && 
                   stock.insiderTradeDate
        );

        for (const stock of pendingStocks) {
          try {
            // Parse date in DD.MM.YYYY format
            const dateParts = stock.insiderTradeDate!.split(' ')[0].split('.');
            if (dateParts.length >= 3) {
              const day = parseInt(dateParts[0], 10);
              const month = parseInt(dateParts[1], 10) - 1; // JS months are 0-indexed
              const year = parseInt(dateParts[2], 10);
              
              const tradeDate = new Date(year, month, day);
              const ageMs = now.getTime() - tradeDate.getTime();

              // If trade is older than 2 weeks, reject the recommendation
              if (ageMs > TWO_WEEKS_MS) {
                await storage.updateStock(user.id, stock.ticker, {
                  recommendationStatus: "rejected",
                  rejectedAt: new Date()
                });
                rejectedCount++;
                log(`[Cleanup] Rejected ${stock.ticker} for user ${user.id} - trade date ${stock.insiderTradeDate} is older than 2 weeks`);
              }
            }
          } catch (parseError) {
            console.error(`[Cleanup] Error parsing date for ${stock.ticker}:`, parseError);
          }
        }

        // 2. Delete rejected stocks that were rejected more than 2 weeks ago
        const rejectedStocks = stocks.filter(
          stock => stock.recommendationStatus === "rejected" && stock.rejectedAt
        );

        for (const stock of rejectedStocks) {
          try {
            const rejectedDate = new Date(stock.rejectedAt!);
            const ageMs = now.getTime() - rejectedDate.getTime();

            // If rejected more than 2 weeks ago, delete it
            if (ageMs > TWO_WEEKS_MS) {
              await storage.deleteStock(user.id, stock.ticker);
              deletedCount++;
              log(`[Cleanup] Deleted ${stock.ticker} for user ${user.id} - was rejected on ${stock.rejectedAt}`);
            }
          } catch (deleteError) {
            console.error(`[Cleanup] Error deleting rejected stock ${stock.ticker}:`, deleteError);
          }
        }
      }

      log(`[Cleanup] Rejected ${rejectedCount} old recommendations, deleted ${deletedCount} old rejected stocks (checked ${totalStocksChecked} total stocks across ${users.length} users)`);
    } catch (error) {
      console.error("[Cleanup] Error in cleanup job:", error);
    }
  }

  // Run immediately on startup
  cleanupOldRecommendations().catch(err => {
    console.error("[Cleanup] Initial cleanup failed:", err);
  });

  // Then run every hour
  setInterval(cleanupOldRecommendations, ONE_HOUR);
  log("[Cleanup] Background job started - cleaning up old recommendations every hour");
}

/**
 * Background job to evaluate trading rules and execute trades for SIMULATED holdings only
 * Runs every 5 minutes during market hours
 */
function startSimulatedRuleExecutionJob() {
  const FIVE_MINUTES = 5 * 60 * 1000;

  async function evaluateAndExecuteRules() {
    try {
      // Skip if market is closed
      if (!isMarketOpen()) {
        log("[SimRuleExec] Market is closed, skipping rule evaluation");
        return;
      }
      
      log("[SimRuleExec] Evaluating trading rules for simulated holdings...");
      
      // Get all users and their trading rules
      const users = await storage.getUsers();
      const allRulesArray = [];
      const allHoldingsArray = [];
      for (const user of users) {
        const userRules = await storage.getTradingRules(user.id);
        const userHoldings = await storage.getPortfolioHoldings(user.id, true);
        allRulesArray.push(...userRules);
        allHoldingsArray.push(...userHoldings);
      }
      
      const enabledRules = allRulesArray.filter(rule => rule.enabled);
      
      if (enabledRules.length === 0) {
        log("[SimRuleExec] No enabled rules to evaluate");
        return;
      }
      
      // Get all SIMULATED holdings only
      const holdings = allHoldingsArray;
      
      if (holdings.length === 0) {
        log("[SimRuleExec] No simulated holdings to evaluate");
        return;
      }
      
      // Build a map of all stocks across all users for price lookup
      const stockMap = new Map();
      for (const user of users) {
        const userStocks = await storage.getStocks(user.id);
        for (const stock of userStocks) {
          // Store by ticker - we just need current prices which are the same for all users
          if (!stockMap.has(stock.ticker)) {
            stockMap.set(stock.ticker, stock);
          }
        }
      }
      
      let executedCount = 0;
      
      // Evaluate each holding against applicable rules
      for (const holding of holdings) {
        const stock = stockMap.get(holding.ticker);
        if (!stock) continue;
        
        const currentPrice = parseFloat(stock.currentPrice);
        const purchasePrice = parseFloat(holding.averagePurchasePrice);
        const previousClose = parseFloat(stock.previousClose || stock.currentPrice);
        
        // Find applicable sell rules for this holding
        const applicableRules = enabledRules.filter(
          rule =>
            (rule.action === "sell" || rule.action === "sell_all") &&
            (rule.scope === "all_holdings" || 
             (rule.scope === "specific_stock" && rule.ticker === holding.ticker))
        );
        
        for (const rule of applicableRules) {
          if (!rule.conditions || rule.conditions.length === 0) continue;
          
          const condition = rule.conditions[0];
          let targetPrice = 0;
          let isTriggered = false;
          
          // Calculate target price based on condition metric
          if (condition.metric === "price_change_percent") {
            targetPrice = purchasePrice * (1 + condition.value / 100);
            if (condition.operator === "<" || condition.operator === "<=") {
              isTriggered = currentPrice <= targetPrice;
            } else if (condition.operator === ">" || condition.operator === ">=") {
              isTriggered = currentPrice >= targetPrice;
            }
          } else if (condition.metric === "price_change_from_close_percent") {
            targetPrice = previousClose * (1 + condition.value / 100);
            if (condition.operator === "<" || condition.operator === "<=") {
              isTriggered = currentPrice <= targetPrice;
            } else if (condition.operator === ">" || condition.operator === ">=") {
              isTriggered = currentPrice >= targetPrice;
            }
          } else if (condition.metric === "price_absolute") {
            targetPrice = condition.value;
            if (condition.operator === "<" || condition.operator === "<=") {
              isTriggered = currentPrice <= targetPrice;
            } else if (condition.operator === ">" || condition.operator === ">=") {
              isTriggered = currentPrice >= targetPrice;
            }
          }
          
          if (isTriggered) {
            // Determine quantity to sell
            let quantityToSell = 0;
            if (rule.action === "sell_all") {
              quantityToSell = holding.quantity;
            } else if (rule.actionParams) {
              if ('quantity' in rule.actionParams && rule.actionParams.quantity) {
                quantityToSell = Math.min(rule.actionParams.quantity, holding.quantity);
              } else if ('percentage' in rule.actionParams && rule.actionParams.percentage) {
                quantityToSell = Math.floor(holding.quantity * (rule.actionParams.percentage / 100));
              }
            }
            
            if (quantityToSell > 0) {
              // Create a simulated sell trade
              const total = currentPrice * quantityToSell;
              await storage.createTrade({
                userId: holding.userId,
                ticker: holding.ticker,
                type: "sell",
                quantity: quantityToSell,
                price: currentPrice.toFixed(2),
                total: total.toFixed(2),
                status: "completed",
                broker: "simulation",
                isSimulated: true,
              });
              
              executedCount++;
              log(`[SimRuleExec] Executed rule "${rule.name}" for ${holding.ticker}: Sold ${quantityToSell} shares at $${currentPrice.toFixed(2)} (triggered by ${condition.metric})`);
              
              // Send Telegram notification if available (only if feature enabled)
              if (ENABLE_TELEGRAM && telegramNotificationService) {
                const profitLoss = (currentPrice - purchasePrice) * quantityToSell;
                const profitLossPercent = ((currentPrice - purchasePrice) / purchasePrice) * 100;
                const message = `🤖 SIMULATION: Auto-sell triggered\n\n` +
                  `Rule: ${rule.name}\n` +
                  `Stock: ${holding.ticker}\n` +
                  `Sold: ${quantityToSell} shares @ $${currentPrice.toFixed(2)}\n` +
                  `Purchase Price: $${purchasePrice.toFixed(2)}\n` +
                  `P&L: ${profitLoss >= 0 ? '+' : ''}$${profitLoss.toFixed(2)} (${profitLossPercent >= 0 ? '+' : ''}${profitLossPercent.toFixed(2)}%)\n` +
                  `Total: $${total.toFixed(2)}`;
                
                await telegramNotificationService.sendMessage(message).catch((err: Error) => {
                  log(`[SimRuleExec] Failed to send Telegram notification: ${err.message}`);
                });
              }
            }
          }
        }
      }
      
      if (executedCount > 0) {
        log(`[SimRuleExec] Executed ${executedCount} simulated trades based on trading rules`);
      } else {
        log("[SimRuleExec] No rule conditions met");
      }
    } catch (error) {
      console.error("[SimRuleExec] Error evaluating rules:", error);
    }
  }

  // Run immediately on startup
  evaluateAndExecuteRules().catch(err => {
    console.error("[SimRuleExec] Initial evaluation failed:", err);
  });

  // Then run every 5 minutes
  setInterval(evaluateAndExecuteRules, FIVE_MINUTES);
  log("[SimRuleExec] Background job started - evaluating rules for simulated holdings every 5 minutes");
}

/**
 * Background job to automatically analyze new stock recommendations with AI
 * Runs every 10 minutes to analyze pending stocks that don't have analysis yet
 */
function startAIAnalysisJob() {
  const TEN_MINUTES = 10 * 60 * 1000;
  let isRunning = false; // Reentrancy guard

  async function analyzeNewStocks() {
    // Prevent overlapping runs
    if (isRunning) {
      log("[AIAnalysis] Skipping - previous job still running");
      return;
    }
    
    isRunning = true;
    try {
      log("[AIAnalysis] Checking for stocks needing AI analysis...");
      
      // Get all users and their pending recommendations
      const users = await storage.getUsers();
      const allStocks = [];
      for (const user of users) {
        const userStocks = await storage.getStocks(user.id);
        allStocks.push(...userStocks);
      }
      
      // Get unique pending stocks (only analyze each ticker once across all users)
      const uniqueTickersSet = new Set();
      const pendingStocks = allStocks.filter(stock => {
        if (stock.recommendationStatus === "pending" && !uniqueTickersSet.has(stock.ticker)) {
          uniqueTickersSet.add(stock.ticker);
          return true;
        }
        return false;
      });
      
      if (pendingStocks.length === 0) {
        log("[AIAnalysis] No pending stocks to analyze");
        return;
      }
      
      const buyCount = pendingStocks.filter(s => s.recommendation === 'buy').length;
      const sellCount = pendingStocks.filter(s => s.recommendation === 'sell').length;
      log(`[AIAnalysis] Found ${pendingStocks.length} pending stocks (${buyCount} buys, ${sellCount} sells), checking for missing analyses...`);
      
      let analyzedCount = 0;
      let skippedCount = 0;
      let errorCount = 0;
      
      for (const stock of pendingStocks) {
        try {
          // Check if analysis already exists
          const existingAnalysis = await storage.getStockAnalysis(stock.ticker);
          if (existingAnalysis) {
            // Skip if already completed or analyzing
            if (existingAnalysis.status === "completed" || existingAnalysis.status === "analyzing") {
              skippedCount++;
              continue;
            }
            // If pending or failed, we'll re-analyze
          } else {
            // Create a pending analysis record
            await storage.saveStockAnalysis({
              ticker: stock.ticker,
              status: "pending",
            });
          }
          
          // Update status to analyzing
          await storage.updateStockAnalysisStatus(stock.ticker, "analyzing");
          
          // Fetch fundamental data from Alpha Vantage
          log(`[AIAnalysis] Running multi-signal analysis for ${stock.ticker}...`);
          const [companyOverview, balanceSheet, incomeStatement, cashFlow, dailyPrices] = await Promise.all([
            stockService.getCompanyOverview(stock.ticker),
            stockService.getBalanceSheet(stock.ticker),
            stockService.getIncomeStatement(stock.ticker),
            stockService.getCashFlow(stock.ticker),
            stockService.getDailyPrices(stock.ticker, 60),
          ]);
          
          // Fetch technical indicators and news sentiment
          const [technicalIndicators, newsSentiment] = await Promise.all([
            stockService.getTechnicalIndicators(stock.ticker, dailyPrices),
            stockService.getNewsSentiment(stock.ticker),
          ]);
          
          const priceNewsCorrelation = stockService.analyzePriceNewsCorrelation(dailyPrices, newsSentiment);
          
          // Fetch SEC EDGAR filing data and comprehensive fundamentals (with error handling for graceful degradation)
          log(`[AIAnalysis] Fetching SEC filings and comprehensive fundamentals for ${stock.ticker}...`);
          
          let secFilingData = null;
          let comprehensiveFundamentals = null;
          
          // Try to fetch SEC filing data (non-blocking if it fails)
          try {
            secFilingData = await secEdgarService.getCompanyFilingData(stock.ticker);
          } catch (error) {
            console.warn(`[AIAnalysis] Could not fetch SEC filings for ${stock.ticker}, continuing without:`, error instanceof Error ? error.message : error);
          }
          
          // Try to fetch comprehensive fundamentals (non-blocking if it fails)
          try {
            comprehensiveFundamentals = await stockService.getComprehensiveFundamentals(stock.ticker);
          } catch (error) {
            console.warn(`[AIAnalysis] Could not fetch comprehensive fundamentals for ${stock.ticker}, continuing without:`, error instanceof Error ? error.message : error);
          }
          
          // Prepare SEC filings for analysis
          const secFilings = secFilingData ? {
            formType: secFilingData.formType,
            filingDate: secFilingData.filingDate,
            managementDiscussion: secFilingData.managementDiscussion,
            riskFactors: secFilingData.riskFactors,
            businessOverview: secFilingData.businessOverview,
          } : undefined;
          
          // Insider trading strength - fetch from all transactions for this ticker for this user
          const insiderTradingStrength = await (async () => {
            try {
              const allStocks = await storage.getUserStocksForTicker(stock.userId, stock.ticker);
              
              if (allStocks.length === 0) {
                return undefined;
              }
              
              const buyTransactions = allStocks.filter(s => s.recommendation?.toLowerCase().includes("buy"));
              const sellTransactions = allStocks.filter(s => s.recommendation?.toLowerCase().includes("sell"));
              
              let direction: string;
              let transactionType: string;
              let dominantSignal: string;
              
              if (buyTransactions.length > 0 && sellTransactions.length === 0) {
                direction = "buy";
                transactionType = "purchase";
                dominantSignal = "BULLISH - Only insider BUYING detected";
              } else if (sellTransactions.length > 0 && buyTransactions.length === 0) {
                direction = "sell";
                transactionType = "sale";
                dominantSignal = "BEARISH - Only insider SELLING detected";
              } else if (buyTransactions.length > 0 && sellTransactions.length > 0) {
                const sortedByDate = allStocks.sort((a, b) => 
                  new Date(b.lastUpdated || 0).getTime() - new Date(a.lastUpdated || 0).getTime()
                );
                const mostRecentSignal = sortedByDate.find(s => 
                  s.recommendation?.toLowerCase().includes("buy") || s.recommendation?.toLowerCase().includes("sell")
                );
                direction = mostRecentSignal?.recommendation?.toLowerCase().includes("buy") ? "buy" : "sell";
                transactionType = direction === "buy" ? "purchase" : "sale";
                dominantSignal = `MIXED SIGNALS - ${buyTransactions.length} BUY, ${sellTransactions.length} SELL (most recent: ${direction.toUpperCase()})`;
              } else {
                direction = "unknown";
                transactionType = "transaction";
                dominantSignal = "Unknown signal - no clear insider transactions";
              }
              
              const primaryStock = allStocks.sort((a, b) => 
                new Date(b.lastUpdated || 0).getTime() - new Date(a.lastUpdated || 0).getTime()
              )[0];
              
              return {
                direction,
                transactionType,
                dominantSignal,
                buyCount: buyTransactions.length,
                sellCount: sellTransactions.length,
                totalTransactions: allStocks.length,
                quantityStr: primaryStock.insiderQuantity ? `${primaryStock.insiderQuantity.toLocaleString()} shares` : "Unknown",
                insiderPrice: primaryStock.insiderPrice ? `$${parseFloat(primaryStock.insiderPrice).toFixed(2)}` : "Unknown",
                currentPrice: primaryStock.currentPrice ? `$${parseFloat(primaryStock.currentPrice).toFixed(2)}` : "Unknown",
                insiderName: primaryStock.insiderName || "Unknown",
                insiderTitle: primaryStock.insiderTitle || "Unknown",
                tradeDate: primaryStock.insiderTradeDate || "Unknown",
                totalValue: primaryStock.insiderPrice && primaryStock.insiderQuantity 
                  ? `$${(parseFloat(primaryStock.insiderPrice) * primaryStock.insiderQuantity).toFixed(2)}` 
                  : "Unknown",
                confidence: primaryStock.confidenceScore?.toString() || "Medium",
                allTransactions: allStocks.map(s => ({
                  direction: s.recommendation?.toLowerCase() || "unknown",
                  insiderName: s.insiderName || "Unknown",
                  insiderTitle: s.insiderTitle || "Unknown",
                  quantityStr: s.insiderQuantity ? `${s.insiderQuantity.toLocaleString()} shares` : "Unknown",
                  price: s.insiderPrice ? `$${parseFloat(s.insiderPrice).toFixed(2)}` : "Unknown",
                  date: s.insiderTradeDate || "Unknown",
                  value: s.insiderPrice && s.insiderQuantity 
                    ? `$${(parseFloat(s.insiderPrice) * s.insiderQuantity).toFixed(2)}` 
                    : "Unknown"
                }))
              };
            } catch (error) {
              console.error(`[Reconciliation] Error getting insider trading data for ${stock.ticker}:`, error);
              return undefined;
            }
          })();
          
          // Run comprehensive AI analysis with all signals including SEC filings
          const analysis = await aiAnalysisService.analyzeStock({
            ticker: stock.ticker,
            companyOverview,
            balanceSheet,
            incomeStatement,
            cashFlow,
            technicalIndicators,
            newsSentiment,
            priceNewsCorrelation,
            insiderTradingStrength,
            secFilings,
            comprehensiveFundamentals,
          });
          
          // Update the existing record with completed multi-signal analysis data
          await storage.updateStockAnalysis(stock.ticker, {
            status: "completed",
            overallRating: analysis.overallRating,
            confidenceScore: analysis.confidenceScore,
            summary: analysis.summary,
            financialHealthScore: analysis.financialHealth.score,
            strengths: analysis.financialHealth.strengths,
            weaknesses: analysis.financialHealth.weaknesses,
            redFlags: analysis.financialHealth.redFlags,
            technicalAnalysisScore: analysis.technicalAnalysis?.score,
            technicalAnalysisTrend: analysis.technicalAnalysis?.trend,
            technicalAnalysisMomentum: analysis.technicalAnalysis?.momentum,
            technicalAnalysisSignals: analysis.technicalAnalysis?.signals,
            sentimentAnalysisScore: analysis.sentimentAnalysis?.score,
            sentimentAnalysisTrend: analysis.sentimentAnalysis?.trend,
            sentimentAnalysisNewsVolume: analysis.sentimentAnalysis?.newsVolume,
            sentimentAnalysisKeyThemes: analysis.sentimentAnalysis?.key_themes,
            keyMetrics: analysis.keyMetrics,
            risks: analysis.risks,
            opportunities: analysis.opportunities,
            recommendation: analysis.recommendation,
            analyzedAt: new Date(analysis.analyzedAt),
            errorMessage: null, // Clear any previous errors
          });
          
          analyzedCount++;
          log(`[AIAnalysis] Successfully analyzed ${stock.ticker} (Score: ${analysis.financialHealth.score}/100, Rating: ${analysis.overallRating})`);
          
          // Add a small delay to avoid overwhelming the API
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          errorCount++;
          console.error(`[AIAnalysis] Error analyzing ${stock.ticker}:`, error);
          // Mark analysis as failed
          await storage.updateStockAnalysisStatus(stock.ticker, "failed", 
            error instanceof Error ? error.message : "Unknown error");
        }
      }
      
      log(`[AIAnalysis] Job complete: analyzed ${analyzedCount}, skipped ${skippedCount}, errors ${errorCount}`);
    } catch (error) {
      console.error("[AIAnalysis] Error in AI analysis job:", error);
    } finally {
      isRunning = false; // Release lock
    }
  }

  // Run immediately on startup
  analyzeNewStocks().catch(err => {
    console.error("[AIAnalysis] Initial analysis failed:", err);
  });

  // Then run every 10 minutes
  setInterval(analyzeNewStocks, TEN_MINUTES);
  log("[AIAnalysis] Background job started - analyzing new stocks every 10 minutes");
}

/**
 * Background job to reconcile incomplete AI analyses every hour
 * Finds stocks with missing analysis flags and re-queues them
 */
function startAnalysisReconciliationJob() {
  const ONE_HOUR = 60 * 60 * 1000;
  let isRunning = false; // Reentrancy guard

  async function reconcileIncompleteAnalyses() {
    // Prevent overlapping runs
    if (isRunning) {
      log("[Reconciliation] Skipping - previous job still running");
      return;
    }
    
    isRunning = true;
    try {
      log("[Reconciliation] Checking for incomplete AI analyses...");
      
      // Get stocks with incomplete analysis (missing flags)
      const incompleteStocks = await storage.getStocksWithIncompleteAnalysis();
      
      if (incompleteStocks.length === 0) {
        log("[Reconciliation] No incomplete analyses found");
        return;
      }
      
      log(`[Reconciliation] Found ${incompleteStocks.length} stocks with incomplete analyses`);
      
      let requeuedCount = 0;
      let skippedCount = 0;
      
      for (const stock of incompleteStocks) {
        try {
          // enqueueAnalysisJob already checks for existing pending/processing jobs
          // It will skip if there's already an active job for this ticker
          await storage.enqueueAnalysisJob(stock.ticker, "reconciliation", "low");
          requeuedCount++;
          log(`[Reconciliation] Re-queued ${stock.ticker} (micro: ${stock.microAnalysisCompleted}, macro: ${stock.macroAnalysisCompleted}, combined: ${stock.combinedAnalysisCompleted})`);
        } catch (error) {
          skippedCount++;
          console.error(`[Reconciliation] Error re-queuing ${stock.ticker}:`, error);
        }
      }
      
      log(`[Reconciliation] Job complete: re-queued ${requeuedCount}, skipped ${skippedCount}`);
    } catch (error) {
      console.error("[Reconciliation] Error in reconciliation job:", error);
    } finally {
      isRunning = false; // Release lock
    }
  }

  // Run immediately on startup
  reconcileIncompleteAnalyses().catch(err => {
    console.error("[Reconciliation] Initial reconciliation failed:", err);
  });

  // Then run every hour
  setInterval(reconcileIncompleteAnalyses, ONE_HOUR);
  log("[Reconciliation] Background job started - reconciling incomplete analyses every hour");
}

function startDailyBriefJob() {
  const ONE_DAY = 24 * 60 * 60 * 1000;

  async function generateDailyBriefs() {
    try {
      log("[DailyBrief] Starting daily brief generation job...");
      
      // Get all users
      const users = await storage.getUsers();
      
      if (users.length === 0) {
        log("[DailyBrief] No users found");
        return;
      }
      
      log(`[DailyBrief] Processing ${users.length} users...`);
      
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      let generatedCount = 0;
      let skippedCount = 0;
      let errorCount = 0;
      
      // Process each user individually
      for (const user of users) {
        let userGeneratedCount = 0;
        let userSkippedCount = 0;
        let userErrorCount = 0;
        
        try {
          // Get user's followed stocks
          const followedStocks = await storage.getUserFollowedStocks(user.id);
          
          if (followedStocks.length === 0) {
            log(`[DailyBrief] User ${user.name} has no followed stocks, skipping`);
            continue;
          }
          
          log(`[DailyBrief] Processing ${followedStocks.length} followed stocks for user ${user.name}...`);
          
          // Generate brief for each followed stock
          for (const followedStock of followedStocks) {
            const ticker = followedStock.ticker.toUpperCase();
            
            try {
              // Check if brief already exists for this user+ticker+date
              const todayBrief = await storage.getDailyBriefForUser(user.id, ticker, today);
              
              if (todayBrief) {
                log(`[DailyBrief] Skipping ${ticker} for ${user.name} - brief already exists for today`);
                skippedCount++;
                userSkippedCount++;
                continue;
              }
              
              // Fetch current price from Alpha Vantage with validation
              let quote;
              try {
                quote = await stockService.getQuote(ticker);
                
                // Validate quote data - must have valid current and previous close
                if (!quote || quote.price === 0 || quote.previousClose === 0) {
                  log(`[DailyBrief] Skipping ${ticker} - invalid or missing price data from Alpha Vantage`);
                  skippedCount++;
                  userSkippedCount++;
                  continue;
                }
                
                // Guard against division by zero
                if (quote.previousClose === 0) {
                  log(`[DailyBrief] Skipping ${ticker} - previous close is zero, cannot calculate change`);
                  skippedCount++;
                  userSkippedCount++;
                  continue;
                }
              } catch (quoteError) {
                log(`[DailyBrief] Skipping ${ticker} - failed to fetch quote: ${quoteError instanceof Error ? quoteError.message : 'Unknown error'}`);
                errorCount++;
                userErrorCount++;
                continue;
              }
              
              // Check if user owns this stock
              const holding = await storage.getPortfolioHoldingByTicker(user.id, ticker);
              const userOwnsPosition = holding !== null;
              
              // Get LATEST AI analysis from stock_analyses table (primary source of truth)
              const latestAnalysis = await storage.getStockAnalysis(ticker);
              
              if (latestAnalysis?.status === 'completed') {
                log(`[DailyBrief] Using enriched AI playbook for ${ticker}: score=${latestAnalysis.integratedScore || latestAnalysis.confidenceScore || 'N/A'}, rating=${latestAnalysis.overallRating || 'N/A'}`);
              } else {
                log(`[DailyBrief] No completed AI analysis for ${ticker}, using fallback stock data`);
              }
              
              // Fallback to stock record data if no analysis available
              const stock = await storage.getStock(user.id, ticker);
              const stockData = stock as any;
              
              // Build enriched analysis context from latest AI playbook
              // Helper to safely convert analyzedAt (could be Date or string from DB)
              const getAnalyzedAtString = (val: Date | string | null | undefined): string | undefined => {
                if (!val) return undefined;
                if (val instanceof Date) return val.toISOString();
                if (typeof val === 'string') return val;
                return undefined;
              };
              
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
              
              // Get opportunity type from latest analysis or stock recommendation
              const opportunityType = (latestAnalysis?.recommendation?.toLowerCase().includes("sell") || 
                                       latestAnalysis?.recommendation?.toLowerCase().includes("avoid") ||
                                       stockData?.recommendation?.toLowerCase().includes("sell")) ? "sell" : "buy";
              
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
                  log(`[DailyBrief] Fetched ${recentNews.length} fresh news articles for ${ticker} (overall sentiment: ${freshNewsSentiment.aggregateSentiment?.toFixed(2) || 'N/A'})`);
                }
              } catch (newsError) {
                log(`[DailyBrief] Fresh news fetch failed for ${ticker}, using cached: ${newsError instanceof Error ? newsError.message : 'Unknown'}`);
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
              
              // Generate DUAL-SCENARIO brief (both watching and owning)
              log(`[DailyBrief] Generating dual-scenario brief for ${ticker} - user ${user.name} (${userOwnsPosition ? 'owns' : 'watching'}, ${opportunityType} opportunity)...`);
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
                userId: user.id,
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
              
              // Check for stance change notification (hold→sell on OWNING scenario)
              if (userOwnsPosition && brief.owning.recommendedStance === 'sell') {
                try {
                  // Get yesterday's brief to check for stance change
                  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                  const yesterdayBrief = await storage.getDailyBriefForUser(user.id, ticker, yesterday);
                  
                  if (yesterdayBrief && yesterdayBrief.recommendedStance === 'hold') {
                    // Stance changed from hold to sell on owned position - notify!
                    log(`[DailyBrief] Stance change detected for ${ticker} (${user.name}): hold→sell on owned position`);
                    await storage.createNotification({
                      userId: user.id,
                      ticker,
                      type: 'stance_change',
                      message: `${ticker}: Stance changed from HOLD to SELL on your position`,
                      metadata: {
                        previousStance: 'hold',
                        newStance: 'sell'
                      },
                      isRead: false,
                    });
                    log(`[DailyBrief] Created stance_change notification for ${ticker} (${user.name})`);
                  }
                } catch (notifError) {
                  // Ignore duplicate notification errors
                  if (notifError instanceof Error && !notifError.message.includes('unique constraint')) {
                    log(`[DailyBrief] Failed to create stance change notification for ${ticker} (${user.name}): ${notifError.message}`);
                  }
                }
              }
              
              generatedCount++;
              userGeneratedCount++;
              log(`[DailyBrief] Generated dual-scenario brief for ${ticker} (${user.name}): Watching=${brief.watching.recommendedStance}(${brief.watching.confidence}), Owning=${brief.owning.recommendedStance}(${brief.owning.confidence})`);
              
            } catch (error) {
              errorCount++;
              userErrorCount++;
              const errorMsg = error instanceof Error ? error.message : 'Unknown error';
              log(`[DailyBrief] Error generating brief for ${ticker} (${user.name}): ${errorMsg}`);
            }
          }
          
          // Log per-user summary for operational visibility
          log(`[DailyBrief] User ${user.name} complete: generated ${userGeneratedCount}, skipped ${userSkippedCount}, errors ${userErrorCount}`);
          
        } catch (error) {
          errorCount++;
          userErrorCount++;
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          log(`[DailyBrief] Error processing user ${user.name}: ${errorMsg}`);
        }
      }
      
      log(`[DailyBrief] Job complete: generated ${generatedCount}, skipped ${skippedCount}, errors ${errorCount}`);
    } catch (error) {
      console.error("[DailyBrief] Error in daily brief job:", error);
    }
  }

  // Run immediately on startup (after a 10 second delay to let other services initialize)
  setTimeout(() => {
    generateDailyBriefs().catch(err => {
      console.error("[DailyBrief] Initial generation failed:", err);
    });
  }, 10000);

  // Then run once a day
  setInterval(generateDailyBriefs, ONE_DAY);
  log("[DailyBrief] Background job started - generating briefs once a day");
}

/**
 * Background job to cleanup unverified users older than 48 hours
 * Runs every 6 hours
 */
function startUnverifiedUserCleanupJob() {
  const SIX_HOURS = 6 * 60 * 60 * 1000;
  const CLEANUP_THRESHOLD_HOURS = 48;

  async function cleanupUnverifiedUsers() {
    try {
      log("[UnverifiedCleanup] Starting cleanup of unverified users...");
      
      const deletedCount = await storage.purgeUnverifiedUsers(CLEANUP_THRESHOLD_HOURS);
      
      if (deletedCount > 0) {
        log(`[UnverifiedCleanup] Deleted ${deletedCount} unverified user(s) older than ${CLEANUP_THRESHOLD_HOURS} hours`);
      } else {
        log("[UnverifiedCleanup] No unverified users to clean up");
      }
    } catch (error) {
      console.error("[UnverifiedCleanup] Error cleaning up unverified users:", error);
    }
  }

  // Run immediately on startup (after a 30 second delay)
  setTimeout(() => {
    cleanupUnverifiedUsers().catch(err => {
      console.error("[UnverifiedCleanup] Initial cleanup failed:", err);
    });
  }, 30000);

  // Then run every 6 hours
  setInterval(cleanupUnverifiedUsers, SIX_HOURS);
  log("[UnverifiedCleanup] Background job started - cleaning up every 6 hours");
}
