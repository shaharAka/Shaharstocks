import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import fs from "fs";
import path from "path";
import { registerRoutes } from "./routes/index";
import { log } from "./logger";
// Note: setupVite and serveStatic are dynamically imported to avoid vite dependency in production
import { initSentry, sentryErrorHandler, sentryTracingHandler, sentryRequestHandler, captureError } from "./sentry";
import * as Sentry from "@sentry/node";
import { storage } from "./storage";
import { telegramService } from "./telegram";
import { finnhubService } from "./finnhubService";
import { telegramNotificationService } from "./telegramNotificationService";
import { openinsiderService } from "./openinsiderService";
import { aiAnalysisService } from "./aiAnalysisService";
import { startCleanupScheduler } from "./jobs/cleanupStaleStocks";
import { startTickerDailyBriefScheduler, runTickerDailyBriefGeneration } from "./jobs/generateTickerDailyBriefs";
import { startPriceUpdateJob } from "./jobs/priceUpdate";
import { startCandlestickDataJob } from "./jobs/candlestickData";
import { startHoldingsPriceHistoryJob } from "./jobs/holdingsPriceHistory";
import { startTelegramFetchJob } from "./jobs/telegramFetch";
import { startOpeninsiderFetchJob } from "./jobs/openinsiderFetch";
import { startRecommendationCleanupJob } from "./jobs/recommendationCleanup";
import { startSimulatedRuleExecutionJob } from "./jobs/simulatedRuleExecution";
import { startAIAnalysisJob } from "./jobs/aiAnalysis";
import { startAnalysisReconciliationJob } from "./jobs/analysisReconciliation";
import { startDailyBriefJob } from "./jobs/dailyBrief";
import { startUnverifiedUserCleanupJob } from "./jobs/unverifiedUserCleanup";
import { stockService } from "./stockService";
import { secEdgarService } from "./secEdgarService";
import cron from "node-cron";
// Session middleware removed - using Firebase JWT tokens instead
import { queueWorker } from "./queueWorker";
import { websocketManager } from "./websocketServer";
import { initializeQueueSystem } from "./queue";
import { initializeFirebaseAdmin } from "./firebaseAdmin";
import { secPoller } from "./services/sec/SecPoller";
import { secClient } from "./services/sec/SecClient";
import { tickerMapper } from "./services/sec/TickerMapper";
import { secParser } from "./services/sec/SecParser";
import { applyOpenInsiderFiltersToSecTransaction } from "./services/sec/secFilters";

// Feature flags
const ENABLE_TELEGRAM = process.env.ENABLE_TELEGRAM === "true";

// Initialize Sentry before setting up middleware
initSentry();

const app = express();

// Trust proxy for correct protocol/host detection behind Cloud Run's load balancer
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

// Session middleware removed - using Firebase JWT tokens for stateless authentication

// Add Sentry tracing handler (after session middleware)
app.use(sentryTracingHandler());

// Add global API rate limiting (after session middleware to access req.session)
import { globalApiRateLimiter } from "./middleware/rateLimiter";
app.use("/api", globalApiRateLimiter);

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

      log.info(logLine, "api");
    }
  });

  next();
});

(async () => {
  // Start server listening FIRST to avoid Cloud Run timeout
  // Then initialize services in the background
  log.info("Server starting...", "server");
  
  const server = await registerRoutes(app);

  // Sentry error handler (must be before other error handlers)
  app.use(sentryErrorHandler());

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    // Capture error in Sentry before handling
    captureError(err, {
      request: {
        method: _req.method,
        url: _req.url,
        headers: _req.headers,
      },
    });

    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    log.error("Unhandled error", err, "express");
    res.status(status).json({ message });
  });

  // In development, frontend runs separately on port 5173 via Vite
  // API requests are proxied from Vite to this server on port 5002
  // Add CORS middleware for development to allow Vite dev server to access API
  if (app.get("env") === "development") {
    app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', 'http://localhost:5173');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.header('Access-Control-Allow-Credentials', 'true');
      if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
      }
      next();
    });
  } else {
    // Serve static files in production (no vite dependency)
    // Inlined here to avoid needing to bundle vite-prod.ts
    // Use process.cwd() to get the app root, then resolve to dist/public
    // In Docker/Cloud Run, this will be /app, so dist/public will be /app/dist/public
    const distPath = path.resolve(process.cwd(), "dist", "public");
    
    if (!fs.existsSync(distPath)) {
      log.error(`Could not find the build directory: ${distPath}`, undefined, "server");
      throw new Error(
        `Could not find the build directory: ${distPath}, make sure to build the client first`,
      );
    }
    
    log.info(`Serving static files from: ${distPath}`, "server");
    
    // Serve static files with proper caching headers for Cloud Run
    app.use(express.static(distPath, {
      maxAge: '1y', // Cache static assets for 1 year
      etag: true, // Enable ETag for better caching
      lastModified: true, // Enable Last-Modified headers
    }));
    
    // Fall through to index.html for client-side routing (SPA)
    // But only for non-API routes
    app.get("*", (req, res, next) => {
      // Skip API routes
      if (req.path.startsWith("/api")) {
        return next();
      }
      // Don't cache index.html - always serve fresh for client updates
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen(port, "0.0.0.0", () => {
    log.info(`serving on port ${port}`, "server");
  });

  // Initialize services in the background (non-blocking)
  // This allows the server to start quickly and avoid Cloud Run timeout
  (async () => {
    try {
      // Initialize default configuration
      await storage.initializeDefaults();
      log.info("Default configuration initialized", "server");
      
      // Start SEC Poller (it will check the feature toggle internally)
      // The poller will only run if insiderDataSource is set to "sec_direct"
      secPoller.start(5 * 60 * 1000); // 5 minutes interval
      log.info("SEC Poller initialized (will start if feature toggle is enabled)", "server");

      // Initialize AI provider configuration from database
    try {
      const settings = await storage.getSystemSettings();
      if (settings?.aiProvider) {
        // ... existing AI setup ...
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
          
          log.info(`AI provider initialized: ${settings.aiProvider}${settings.aiModel ? ` (model: ${settings.aiModel})` : ""}`, "server");
        } else {
          log.info("AI provider using default: OpenAI", "server");
        }
      } catch (err) {
        log.error(`AI provider initialization skipped: ${(err as Error).message}`, err, "server");
      }
      
      // Initialize Telegram services only if feature flag is enabled
      if (ENABLE_TELEGRAM) {
        // Initialize Telegram client if configured
        await telegramService.initialize().catch(err => {
          log.warn(`Telegram service initialization skipped: ${err.message}`, "server");
        });

        // Initialize Telegram notification bot if configured
        await telegramNotificationService.initialize().catch(err => {
          log.warn(`Telegram notification service initialization skipped: ${err.message}`, "server");
        });
      } else {
        log.info("Telegram integration disabled via feature flag", "server");
      }

      // Initialize WebSocket server for real-time updates
      await websocketManager.initialize(server);

      // Initialize BullMQ job queue system (replaces setInterval jobs)
      let useQueueSystem = false;
      try {
        await initializeQueueSystem(storage);
        log.info("Job queue system initialized", "server");
        useQueueSystem = true;
      } catch (error) {
        log.error("Failed to initialize job queue system, falling back to setInterval", error, "server");
        // Fall back to old setInterval jobs if Redis is not available
        log.warn("Using legacy setInterval job scheduling", "server");
      }

      // Only start setInterval jobs if queue system is not available
      if (!useQueueSystem) {
        log.info("Starting legacy setInterval jobs", "server");
        
        // Start automatic stock price updates every 5 minutes
        startPriceUpdateJob(storage);
      
        // Start daily cleanup of stale pending stocks (> 10 days old)
        startCleanupScheduler(storage);
        
        // Start daily ticker brief generation for global opportunities (score evolution tracking)
        startTickerDailyBriefScheduler(storage);
        
        // Start automatic candlestick data fetching for purchase candidates (once a day)
        startCandlestickDataJob(storage);
        
        // Start automatic holdings price history updates every 5 minutes
        startHoldingsPriceHistoryJob(storage);
        
        // Start automatic Telegram message fetching every hour (only if enabled)
        if (ENABLE_TELEGRAM) {
          startTelegramFetchJob(storage);
        }
        
        // Start automatic OpenInsider data fetching every hour (legacy per-user system)
        startOpeninsiderFetchJob(storage);
        
        // Start unified global opportunities fetch (new system)
        // TODO: Extract unifiedOpportunities job - currently still inline
        startUnifiedOpportunitiesFetchJob();
        
        // Start automatic cleanup of old recommendations (older than 2 weeks)
        startRecommendationCleanupJob(storage);
        
        // Start automatic trading rule evaluation for simulated holdings only
        startSimulatedRuleExecutionJob(storage);
        
        // Start automatic AI analysis for new purchase candidates
        startAIAnalysisJob(storage);
        
        // Start hourly reconciliation job to re-queue incomplete analyses
        startAnalysisReconciliationJob(storage);
        
        // Start daily brief generation job for followed stocks
        startDailyBriefJob(storage);
        
        // Start automatic cleanup of unverified users after 48 hours
        startUnverifiedUserCleanupJob(storage);
      } else {
        log.info("Queue system active - setInterval jobs skipped", "server");
      }

      // Start the AI analysis queue worker (with delay to ensure DB is ready)
      // Wait a bit for database connection to be fully established
      setTimeout(async () => {
        try {
          await queueWorker.start();
          log.info("[QueueWorker] AI Analysis queue worker started", "server");
        } catch (error) {
          log.error("[QueueWorker] Failed to start queue worker", error, "server");
        }
      }, 2000); // 2 second delay
    } catch (error) {
      log.error("Error during background initialization", error, "server");
    }
  })();
})();

/**
 * Background job to fetch unified global opportunities
 * - Daily cadence: Runs at 00:00 UTC, visible to ALL users (free tier)
 * - Hourly cadence: Runs every hour, visible to PRO users only
 * 
 * Unlike the old per-user stock system, this creates global opportunities
 * that are shared across all users, with per-user rejection filtering.
 * 
 * TODO: Extract this to server/jobs/unifiedOpportunities.ts
 */
let fetchUnifiedOpportunitiesFn: ((cadence: 'daily' | 'hourly', options?: { forceOpenInsider?: boolean }) => Promise<{ transactionsFetched: number; opportunitiesCreated: number } | undefined>) | null = null;

function startUnifiedOpportunitiesFetchJob() {
  const ONE_HOUR = 60 * 60 * 1000;
  
  let isJobRunning = false;

  async function fetchUnifiedOpportunities(
    cadence: 'daily' | 'hourly',
    options?: { forceOpenInsider?: boolean }
  ): Promise<{ transactionsFetched: number; opportunitiesCreated: number } | undefined> {
    if (isJobRunning) {
      log.info(`[UnifiedOpportunities] Job already running, skipping ${cadence} execution`);
      return;
    }
    isJobRunning = true;

    try {
      log.info(`[UnifiedOpportunities] Starting ${cadence} opportunities fetch...`);

      const settings = await storage.getSystemSettings();
      // Skip OpenInsider when SEC direct is on, unless explicitly requested (fallback)
      if (!options?.forceOpenInsider && settings?.insiderDataSource === "sec_direct") {
        log.info("[UnifiedOpportunities] SEC Direct is enabled, skipping OpenInsider fetch (SEC poller handles real-time data)");
        return;
      }

      const config = await storage.getOpeninsiderConfig();
      if (!config || !config.enabled) {
        log.info("[UnifiedOpportunities] OpenInsider is not configured or disabled, skipping");
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

      const optionsDealThreshold = config.optionsDealThresholdPercent ?? 15;
      const minMarketCap = config.minMarketCap ?? 500;

      // Calculate fetch limits: different ratios for purchases vs sales
      // Hourly: 250 purchases + 50 sales (5:1 ratio)
      // Daily: use base limit with duplicate factor
      let purchaseLimit: number;
      let salesLimit: number;
      
      if (cadence === 'hourly') {
        purchaseLimit = 250;
        salesLimit = 50;
        log.info(`[UnifiedOpportunities] Fetching ${purchaseLimit} purchases + ${salesLimit} sales for hourly cadence...`);
      } else {
        const baseLimit = config.fetchLimit || 50;
        const duplicateFactor = 2; // 2x for daily
        purchaseLimit = baseLimit * duplicateFactor;
        salesLimit = baseLimit * duplicateFactor;
        log.info(`[UnifiedOpportunities] Fetching ${purchaseLimit} purchases + ${salesLimit} sales (${baseLimit} base × ${duplicateFactor} for daily cadence)...`);
      }

      // Fetch BOTH purchase and sale transactions
      const [purchasesResponse, salesResponse] = await Promise.all([
        openinsiderService.fetchInsiderPurchases(
          purchaseLimit,
          Object.keys(filters).length > 0 ? filters : undefined,
          "P"
        ),
        openinsiderService.fetchInsiderSales(
          salesLimit,
          Object.keys(filters).length > 0 ? filters : undefined
        )
      ]);
      
      const transactions = [...purchasesResponse.transactions, ...salesResponse.transactions];
      
      log.info(`[UnifiedOpportunities] Fetched ${transactions.length} transactions for ${cadence} cadence`);
      
      if (transactions.length === 0) {
        log.info("[UnifiedOpportunities] No insider transactions found");
        await storage.updateOpeninsiderSyncStatus();
        return { transactionsFetched: 0, opportunitiesCreated: 0 };
      }

      // Create a batch record for this fetch
      const batch = await storage.createOpportunityBatch({
        cadence,
        count: transactions.length
      });
      
      log.info(`[UnifiedOpportunities] Created batch ${batch.id} for ${cadence} cadence`);

      let createdCount = 0;
      let duplicatesSkipped = 0;
      let filteredMarketCap = 0;
      let filteredNoQuote = 0;

      // Rate limiting helper - Alpha Vantage Pro is 75 requests/minute
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
      const RATE_LIMIT_DELAY = 850; // ~70 requests/minute to stay under limit
      
      // Per-ticker cache to avoid duplicate API calls for same ticker
      const tickerDataCache = new Map<string, { quote: any; data: any } | null>();
      
      // Get unique tickers to pre-fetch data efficiently
      const uniqueTickers = Array.from(new Set(transactions.map(t => t.ticker)));
      log.info(`[UnifiedOpportunities] Pre-fetching data for ${uniqueTickers.length} unique tickers...`);
      
      // Pre-fetch quote and company data for all unique tickers
      for (const ticker of uniqueTickers) {
        try {
          await delay(RATE_LIMIT_DELAY);
          // Get quote first
          const quote = await finnhubService.getQuote(ticker);
          
          if (!quote || !quote.currentPrice) {
            tickerDataCache.set(ticker, null); // Mark as invalid
            filteredNoQuote++;
            continue;
          }
          
          // Get company profile (for market cap check)
          await delay(RATE_LIMIT_DELAY);
          const companyInfo = await finnhubService.getCompanyProfile(ticker);
          
          // Check market cap before fetching news (saves API calls)
          if (!companyInfo?.marketCap || companyInfo.marketCap < minMarketCap) {
            tickerDataCache.set(ticker, null); // Filtered by market cap
            filteredMarketCap++;
            continue;
          }
          
          // Get news (only if market cap is valid)
          await delay(RATE_LIMIT_DELAY);
          const news = await finnhubService.getCompanyNews(ticker);
          
          // Store all data
          tickerDataCache.set(ticker, { 
            quote, 
            data: {
              quote,
              marketCap: companyInfo.marketCap,
              companyInfo,
              news,
              insiderSentiment: undefined
            }
          });
        } catch (error) {
          console.error(`[UnifiedOpportunities] Error pre-fetching ${ticker}:`, error);
          tickerDataCache.set(ticker, null);
        }
      }
      
      log.info(`[UnifiedOpportunities] Pre-fetched ${tickerDataCache.size} tickers, ${Array.from(tickerDataCache.values()).filter(v => v !== null).length} valid`);
      
      for (const transaction of transactions) {
        try {
          // Check if this opportunity already exists within this cadence
          // This allows same transaction to exist in both daily and hourly batches
          const existing = await storage.getOpportunityByTransaction(
            transaction.ticker,
            transaction.tradeDate,
            transaction.insiderName,
            transaction.recommendation,
            cadence // Pass cadence to allow same transaction in different cadences
          );
          
          if (existing) {
            duplicatesSkipped++;
            continue;
          }

          // Use cached data (no API calls here)
          const cachedData = tickerDataCache.get(transaction.ticker);
          if (!cachedData) {
            // Either failed to fetch or filtered by market cap (already counted in prefetch)
            continue;
          }
          
          const { quote, data } = cachedData;

          // Create the global opportunity (pending signal score check)
          const opportunity = await storage.createOpportunity({
            ticker: transaction.ticker,
            companyName: data.companyInfo?.name || transaction.companyName || transaction.ticker,
            recommendation: transaction.recommendation,
            cadence,
            batchId: batch.id,
            currentPrice: quote.currentPrice.toString(),
            insiderName: transaction.insiderName,
            insiderTitle: transaction.insiderTitle || null,
            insiderTradeDate: transaction.tradeDate,
            insiderQuantity: transaction.quantity,
            insiderPrice: transaction.price?.toString() || null,
            marketCap: data.marketCap?.toString() || null,
            country: data.companyInfo?.country || null,
            industry: data.companyInfo?.industry || null,
            source: "openinsider",
            confidenceScore: Math.round(transaction.confidence * 100),
          });
          
          // Queue AI analysis job and check if existing analysis has high enough score
          try {
            // Check for existing completed analysis
            const existingAnalysis = await storage.getStockAnalysis(transaction.ticker);
            
            if (existingAnalysis && existingAnalysis.status === 'completed') {
              const signalScore = existingAnalysis.integratedScore ?? existingAnalysis.confidenceScore ?? 0;
              
              if (signalScore < 70) {
                // Low signal - remove from global opportunities board
                // (Users who followed this stock still have it on their personal followed board)
                log.info(`[UnifiedOpportunities] ${transaction.ticker} signal score ${signalScore} < 70, removing from global opportunities`);
                await storage.deleteOpportunity(opportunity.id);
                continue; // Don't count as created
              }
              
              log.info(`[UnifiedOpportunities] ${transaction.ticker} signal score ${signalScore} >= 70, keeping opportunity`);
              
              // Generate Day-0 ticker daily brief with existing analysis
              const today = new Date().toISOString().split('T')[0];
              await storage.createTickerDailyBrief({
                ticker: transaction.ticker.toUpperCase(),
                briefDate: today,
                priceSnapshot: quote.currentPrice.toString(),
                priceChange: null,
                priceChangePercent: null,
                priceSinceInsider: null,
                previousSignalScore: null,
                newSignalScore: signalScore,
                scoreChange: null,
                scoreChangeReason: 'Initial Day-0 analysis',
                stance: signalScore >= 70 ? 'ENTER' : signalScore >= 50 ? 'WATCH' : 'AVOID',
                stanceChanged: false,
                briefText: `Day-0 analysis: Signal score ${signalScore}/100. ${existingAnalysis.recommendation?.substring(0, 200) || ''}`,
                keyUpdates: [],
                newInsiderTransactions: true,
                newsImpact: null,
                priceActionAssessment: null,
                stopLossHit: false,
                profitTargetHit: false,
              });
            } else {
              // No completed analysis yet - queue one for processing
              log.info(`[UnifiedOpportunities] Queuing AI analysis for ${transaction.ticker}...`);
              await storage.enqueueAnalysisJob(transaction.ticker, "opportunity_batch", "normal");
            }
          } catch (aiError) {
            // If AI analysis check fails, still keep the opportunity but log the error
            console.error(`[UnifiedOpportunities] AI analysis check failed for ${transaction.ticker}:`, aiError);
          }
          
          createdCount++;
        } catch (error) {
          console.error(`[UnifiedOpportunities] Error processing ${transaction.ticker}:`, error);
        }
      }

      log.info(`[UnifiedOpportunities] ${cadence.toUpperCase()} batch complete:`);
      log.info(`  • Fetched: ${transactions.length} transactions from OpenInsider`);
      log.info(`  • Created: ${createdCount} new opportunities`);
      log.info(`  • Duplicates skipped: ${duplicatesSkipped} (${((duplicatesSkipped / transactions.length) * 100).toFixed(1)}% duplicate rate)`);
      log.info(`  • Filtered (market cap): ${filteredMarketCap}`);
      log.info(`  • Filtered (no quote): ${filteredNoQuote}`);
      
      // Warn if duplicate rate is very high - might need to fetch more
      const duplicateRate = transactions.length > 0 ? (duplicatesSkipped / transactions.length) : 0;
      const expectedMinCreated = cadence === 'hourly' ? 50 : (config.fetchLimit || 50);
      if (duplicateRate > 0.8 && createdCount < expectedMinCreated) {
        log.warn(`[UnifiedOpportunities] High duplicate rate (${(duplicateRate * 100).toFixed(1)}%) - consider increasing fetch limit or checking for missed transactions`);
      }
      
      // Store batch stats for the popup to display
      await storage.updateOpportunityBatchStats(batch.id, {
        added: createdCount,
        rejected: filteredMarketCap + filteredNoQuote,
        duplicates: duplicatesSkipped
      });
      
      await storage.updateOpeninsiderSyncStatus();
      return { transactionsFetched: transactions.length, opportunitiesCreated: createdCount };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[UnifiedOpportunities] Error in ${cadence} fetch:`, error);
      await storage.updateOpeninsiderSyncStatus(errorMessage);
    } finally {
      isJobRunning = false;
    }
  }

  async function runSecHourlyPromotion(): Promise<{ promoted: number } | null> {
    try {
      const settings = await storage.getSystemSettings();
      if (settings?.insiderDataSource !== "sec_direct") return null;
      const result = await storage.promoteSecRealtimeToHourly();
      if (result) {
        log.info(`[SecHourly] Promoted ${result.promoted} SEC realtime opportunities to hourly batch`);
      }
      return result;
    } catch (err) {
      log.error("[SecHourly] Promotion failed", err);
      return null;
    }
  }

  // Schedule hourly job at top of every hour using cron
  function scheduleHourlyJob() {
    // Cron pattern: "0 * * * *" = at minute 0 of every hour (00:00, 01:00, 02:00, etc.)
    cron.schedule('0 * * * *', async () => {
      try {
        const settings = await storage.getSystemSettings();
        if (settings?.insiderDataSource === 'sec_direct') {
          // SEC primary: promote realtime->hourly; if 0, OpenInsider fallback
          const promo = await runSecHourlyPromotion().catch(() => null);
          if (promo === null || promo.promoted === 0) {
            log.info("[UnifiedOpportunities] SEC hourly had 0 opportunities, running OpenInsider fallback");
            await fetchUnifiedOpportunities('hourly', { forceOpenInsider: true }).catch(err => {
              log.error("[UnifiedOpportunities] Fallback OpenInsider hourly fetch failed:", err);
            });
          }
        } else {
          // OpenInsider primary: fetch; if 0, SEC fallback (promote accumulated realtime)
          const result = await fetchUnifiedOpportunities('hourly').catch(() => undefined);
          if (!result || result.opportunitiesCreated === 0) {
            log.info("[UnifiedOpportunities] OpenInsider hourly produced 0, adding SEC accumulated");
            const secPromo = await storage.promoteSecRealtimeToHourly();
            if (secPromo) {
              log.info(`[SecHourly] SEC fallback promoted ${secPromo.promoted} to hourly`);
            }
          }
        }
      } catch (err) {
        console.error("[UnifiedOpportunities] Hourly job error:", err);
      }
    }, {
      timezone: 'UTC'
    });

    log.info(`[UnifiedOpportunities] Hourly job scheduled with cron pattern "0 * * * *" (top of every hour UTC)`);
  }

  // Track if daily fetch ran today to prevent duplicates
  let lastDailyFetchDate: string | null = null;

  function hasDailyRunToday(): boolean {
    const today = new Date().toISOString().split('T')[0];
    return lastDailyFetchDate === today;
  }

  function markDailyRun() {
    lastDailyFetchDate = new Date().toISOString().split('T')[0];
  }

  /**
   * EDGAR daily: parse SEC Form 4 daily index, fetch XML, create opportunities (cadence: daily, source: sec).
   * Applies OpenInsider-style filters via applyOpenInsiderFiltersToSecTransaction.
   */
  async function runEdgarDailyFetch(): Promise<{ opportunitiesCreated: number }> {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - 1);
    const targetDate = d.toISOString().slice(0, 10).replace(/-/g, "");
    await tickerMapper.initialize();
    const oiConfig = await storage.getOpeninsiderConfig();

    let entries: Awaited<ReturnType<typeof secClient.getDailyForm4Index>>;
    try {
      entries = await secClient.getDailyForm4Index(targetDate);
    } catch (e) {
      log.warn("[EdgarDaily] getDailyForm4Index failed, falling back to OpenInsider", e);
      return { opportunitiesCreated: 0 };
    }

    if (entries.length === 0) {
      return { opportunitiesCreated: 0 };
    }

    const batch = await storage.createOpportunityBatch({
      cadence: "daily",
      source: "sec",
      count: 0,
    });
    const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
    let createdCount = 0;
    let duplicatesSkipped = 0;
    let filteredNoQuote = 0;
    let filteredBySecFilters = 0;

    for (const entry of entries) {
      try {
        const ticker = tickerMapper.getTicker(entry.cik);
        if (!ticker) continue;

        let xmlContent: string | null = null;
        try {
          const index = await secClient.getFilingIndex(entry.cik, entry.accessionNumber);
          const items = index?.directory?.item || [];
          for (const item of items) {
            const name = item?.name || item;
            if (typeof name === "string" && name.endsWith(".xml") && !name.includes("index") && !name.includes("xslF345X05")) {
              const content = await secClient.getFilingDocument(entry.cik, entry.accessionNumber, name);
              if (content?.trim().startsWith("<?xml") || content?.includes("<ownershipDocument")) {
                xmlContent = content;
                break;
              }
            }
          }
        } catch {
          // try fallback
        }
        if (!xmlContent) {
          const noDashes = entry.accessionNumber.replace(/-/g, "");
          for (const p of [`${noDashes}.xml`, `${noDashes}-form4.xml`]) {
            try {
              const c = await secClient.getFilingDocument(entry.cik, entry.accessionNumber, p);
              if (c?.trim().startsWith("<?xml") || c?.includes("<ownershipDocument")) {
                xmlContent = c;
                break;
              }
            } catch {
              continue;
            }
          }
        }
        if (!xmlContent) continue;

        const transactions = secParser.parseForm4(xmlContent);
        for (const t of transactions) {
          const existing = await storage.getOpportunityByTransaction(
            ticker,
            t.transactionDate,
            t.ownerName,
            t.transactionCode === "P" ? "buy" : "sell",
            "daily"
          );
          if (existing) {
            duplicatesSkipped++;
            continue;
          }

          const quote = await finnhubService.getQuote(ticker);
          await delay(850);
          if (!quote?.currentPrice) {
            filteredNoQuote++;
            continue;
          }
          const companyInfo = await finnhubService.getCompanyProfile(ticker);
          await delay(850);
          if (!applyOpenInsiderFiltersToSecTransaction({ tx: t, quote: { currentPrice: quote.currentPrice }, companyInfo, config: oiConfig || {}, refDate: new Date() })) {
            filteredBySecFilters++;
            continue;
          }

          await storage.createOpportunity({
            ticker,
            companyName: companyInfo?.name || entry.companyName || ticker,
            recommendation: t.transactionCode === "P" ? "buy" : "sell",
            cadence: "daily",
            batchId: batch.id,
            currentPrice: String(quote.currentPrice),
            insiderName: t.ownerName,
            insiderTitle: t.officerTitle || (t.isDirector ? "Director" : t.isOfficer ? "Officer" : "Owner"),
            insiderTradeDate: t.transactionDate,
            insiderQuantity: t.transactionShares,
            insiderPrice: String(t.transactionPrice),
            marketCap: String(companyInfo!.marketCap),
            country: companyInfo?.country ?? null,
            industry: companyInfo?.industry ?? null,
            source: "sec",
            confidenceScore: 80,
          });
          createdCount++;
          try {
            const existingAnalysis = await storage.getStockAnalysis(ticker);
            if (!existingAnalysis || existingAnalysis.status !== "completed") {
              await storage.enqueueAnalysisJob(ticker, "opportunity_batch", "normal");
            }
          } catch {
            // keep opportunity
          }
        }
      } catch (err) {
        log.warn("[EdgarDaily] Error processing entry", { cik: entry.cik, err });
      }
    }

    await storage.updateOpportunityBatchStats(batch.id, {
      added: createdCount,
      rejected: filteredNoQuote + filteredBySecFilters,
      duplicates: duplicatesSkipped,
    });
    log.info(`[EdgarDaily] Created ${createdCount} daily opportunities from ${entries.length} Form 4 entries (duplicates: ${duplicatesSkipped}, filtered: noQuote ${filteredNoQuote}, secFilters ${filteredBySecFilters})`);
    return { opportunitiesCreated: createdCount };
  }

  // Modified daily fetch: EDGAR daily primary, OpenInsider fallback
  async function runDailyFetch() {
    if (hasDailyRunToday()) {
      log.info("[UnifiedOpportunities] Daily fetch already ran today, skipping");
      return;
    }

    const edgar = await runEdgarDailyFetch();
    if (edgar.opportunitiesCreated === 0) {
      log.info("[UnifiedOpportunities] EDGAR daily produced 0, running OpenInsider fallback");
      await fetchUnifiedOpportunities("daily", { forceOpenInsider: true });
    }
    markDailyRun();

    log.info("[UnifiedOpportunities] Starting ticker daily brief generation after daily fetch...");
    try {
      await runTickerDailyBriefGeneration(storage);
      log.info("[UnifiedOpportunities] Ticker daily brief generation completed");
    } catch (error) {
      log.error("[UnifiedOpportunities] Ticker daily brief generation failed", error);
    }
  }

  // Schedule daily job at midnight UTC using cron
  function scheduleDailyJob() {
    // Cron pattern: "0 0 * * *" = at minute 0 of hour 0 (midnight UTC)
    cron.schedule('0 0 * * *', async () => {
      await runDailyFetch().catch(err => {
        console.error("[UnifiedOpportunities] Daily fetch failed:", err);
      });
    }, {
      timezone: 'UTC'
    });
    
    log.info(`[UnifiedOpportunities] Daily job scheduled with cron pattern "0 0 * * *" (midnight UTC)`);
  }
  
  // Schedule the daily job at next midnight UTC
  scheduleDailyJob();
  
  // Run initial daily fetch on startup to populate data (won't run again at midnight due to tracking)
  runDailyFetch().catch(err => {
    console.error("[UnifiedOpportunities] Initial daily fetch failed:", err);
  });
  
  // Schedule hourly job at top of every hour (00:00, 01:00, 02:00, etc.)
  scheduleHourlyJob();
  log.info("[UnifiedOpportunities] Background job started - hourly at top of each hour for pro, daily at midnight UTC for all");
  
  // Export function for manual triggering
  fetchUnifiedOpportunitiesFn = fetchUnifiedOpportunities;
}

// Export function to manually trigger opportunities fetch
export async function triggerOpportunitiesFetch(cadence: 'daily' | 'hourly'): Promise<void> {
  if (fetchUnifiedOpportunitiesFn) {
    await fetchUnifiedOpportunitiesFn(cadence);
  } else {
    throw new Error("Opportunities fetch job not initialized");
  }
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
      let repairedCount = 0;
      
      for (const stock of incompleteStocks) {
        try {
          // First check if this ticker already has a completed analysis in stock_analyses
          const existingAnalysis = await storage.getStockAnalysis(stock.ticker);
          
          if (existingAnalysis && existingAnalysis.status === 'completed') {
            // Analysis already exists - just repair the per-user flags without re-queuing
            await storage.markStockAnalysisPhaseComplete(stock.ticker, 'micro');
            await storage.markStockAnalysisPhaseComplete(stock.ticker, 'macro');
            await storage.markStockAnalysisPhaseComplete(stock.ticker, 'combined');
            repairedCount++;
            log(`[Reconciliation] Repaired flags for ${stock.ticker} (analysis already completed)`);
          } else {
            // No completed analysis - queue for analysis
            await storage.enqueueAnalysisJob(stock.ticker, "reconciliation", "low");
            requeuedCount++;
            log(`[Reconciliation] Re-queued ${stock.ticker} (micro: ${stock.microAnalysisCompleted}, macro: ${stock.macroAnalysisCompleted}, combined: ${stock.combinedAnalysisCompleted})`);
          }
        } catch (error) {
          skippedCount++;
          console.error(`[Reconciliation] Error processing ${stock.ticker}:`, error);
        }
      }
      
      log(`[Reconciliation] Job complete: repaired ${repairedCount}, re-queued ${requeuedCount}, skipped ${skippedCount}`);
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
