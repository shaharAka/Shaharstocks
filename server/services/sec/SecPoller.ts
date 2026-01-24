import { secClient } from "./SecClient";
import { secParser } from "./SecParser";
import { tickerMapper } from "./TickerMapper";
import { storage } from "../../storage";
import { finnhubService } from "../../finnhubService";
import { applyOpenInsiderFiltersToSecTransaction } from "./secFilters";

export class SecPoller {
  private isPolling: boolean = false;
  private pollIntervalMs: number = 5 * 60 * 1000; // 5 minutes default
  private timer: NodeJS.Timeout | null = null;
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private lastProcessedId: string | null = null;
  private currentBatchId: string | null = null;
  private batchCreatedAt: number = 0;
  private readonly BATCH_TTL_MS = 60 * 60 * 1000; // 1 hour - reuse batch for 1 hour
  private lastPollTime: number = 0;
  private startAttempts: number = 0;
  private readonly MAX_START_ATTEMPTS = 5;
  private readonly HEALTH_CHECK_INTERVAL_MS = 2 * 60 * 1000; // Check every 2 minutes
  private readonly MAX_TIME_SINCE_LAST_POLL_MS = 10 * 60 * 1000; // 10 minutes - if no poll in 10 min, restart

  constructor() {
    //
  }

  async start(intervalMs: number = 300000, retryCount: number = 0): Promise<void> {
    if (this.isPolling) {
      console.log("[SecPoller] Already polling.");
      return;
    }

    const startTime = new Date().toISOString();
    console.log(`[SecPoller] [${startTime}] Starting SecPoller (attempt ${retryCount + 1}/${this.MAX_START_ATTEMPTS})...`);

    try {
      // Initialize ticker mapper first with retry logic
      console.log(`[SecPoller] [${startTime}] Initializing ticker mapper...`);
      await this.initializeTickerMapperWithRetry();
      console.log(`[SecPoller] [${startTime}] Ticker mapper initialized successfully.`);

      // Set polling state BEFORE setting timer to ensure state is consistent
      this.pollIntervalMs = intervalMs;
      this.isPolling = true;
      this.startAttempts = 0; // Reset on successful start
      this.lastPollTime = Date.now();

      console.log(`[SecPoller] [${startTime}] Starting polling loop (interval: ${this.pollIntervalMs}ms = ${this.pollIntervalMs / 1000 / 60} minutes)`);

      // Immediate first run
      console.log(`[SecPoller] [${startTime}] Running initial poll...`);
      this.poll().catch(err => {
        console.error(`[SecPoller] [${new Date().toISOString()}] Initial poll failed:`, err);
      });

      // Schedule subsequent runs
      this.timer = setInterval(() => {
        const scheduledTime = new Date().toISOString();
        console.log(`[SecPoller] [${scheduledTime}] Timer triggered - running scheduled poll...`);
        this.lastPollTime = Date.now();
        this.poll().catch(err => {
          console.error(`[SecPoller] [${new Date().toISOString()}] Scheduled poll failed:`, err);
        });
      }, this.pollIntervalMs);
      
      // Start health check timer
      this.startHealthCheck();
      
      console.log(`[SecPoller] [${startTime}] ✅ SecPoller started successfully. Timer scheduled. Next poll in ${this.pollIntervalMs / 1000 / 60} minutes.`);
    } catch (error) {
      const errorTime = new Date().toISOString();
      console.error(`[SecPoller] [${errorTime}] ❌ Failed to start SecPoller:`, error);
      if (error instanceof Error) {
        console.error(`[SecPoller] [${errorTime}] Error stack:`, error.stack);
      }

      // Retry with exponential backoff
      if (retryCount < this.MAX_START_ATTEMPTS - 1) {
        const backoffMs = Math.min(1000 * Math.pow(2, retryCount), 30000); // Max 30 seconds
        const nextRetryTime = new Date(Date.now() + backoffMs).toISOString();
        console.log(`[SecPoller] [${errorTime}] Retrying in ${backoffMs}ms (attempt ${retryCount + 2}/${this.MAX_START_ATTEMPTS})...`);
        
        setTimeout(() => {
          this.start(intervalMs, retryCount + 1).catch(err => {
            console.error(`[SecPoller] Retry failed:`, err);
          });
        }, backoffMs);
      } else {
        console.error(`[SecPoller] [${errorTime}] ❌ Max start attempts (${this.MAX_START_ATTEMPTS}) reached. SecPoller failed to start.`);
        this.isPolling = false;
        // Schedule a retry after a longer delay (5 minutes)
        setTimeout(() => {
          console.log(`[SecPoller] [${new Date().toISOString()}] Attempting to restart after max attempts failure...`);
          this.start(intervalMs, 0).catch(err => {
            console.error(`[SecPoller] Post-max-attempts restart failed:`, err);
          });
        }, 5 * 60 * 1000);
      }
      throw error; // Re-throw so caller knows it failed
    }
  }

  private async initializeTickerMapperWithRetry(maxRetries: number = 3): Promise<void> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        await tickerMapper.initialize();
        return; // Success
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        const backoffMs = Math.min(1000 * Math.pow(2, attempt), 10000); // Max 10 seconds
        
        if (attempt < maxRetries - 1) {
          console.warn(`[SecPoller] Ticker mapper initialization failed (attempt ${attempt + 1}/${maxRetries}), retrying in ${backoffMs}ms...`, lastError.message);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
        }
      }
    }
    
    // All retries failed
    const error = new Error(`Failed to initialize ticker mapper after ${maxRetries} attempts: ${lastError?.message}`);
    if (lastError) {
      error.stack = lastError.stack;
    }
    throw error;
  }

  private startHealthCheck(): void {
    // Clear existing health check if any
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    this.healthCheckTimer = setInterval(() => {
      const now = Date.now();
      const timeSinceLastPoll = now - this.lastPollTime;

      // Check if poller is supposed to be running but hasn't polled recently
      if (this.isPolling && timeSinceLastPoll > this.MAX_TIME_SINCE_LAST_POLL_MS) {
        const healthCheckTime = new Date().toISOString();
        console.error(`[SecPoller] [${healthCheckTime}] ⚠️  HEALTH CHECK FAILED: No poll in ${Math.floor(timeSinceLastPoll / 1000 / 60)} minutes (max: ${this.MAX_TIME_SINCE_LAST_POLL_MS / 1000 / 60} min)`);
        console.error(`[SecPoller] [${healthCheckTime}] Poller state: isPolling=${this.isPolling}, hasTimer=${this.timer !== null}`);
        
        // Attempt to restart
        console.log(`[SecPoller] [${healthCheckTime}] Attempting to restart poller...`);
        this.restart().catch(err => {
          console.error(`[SecPoller] [${new Date().toISOString()}] Health check restart failed:`, err);
        });
      } else if (this.isPolling) {
        // Health check passed
        const timeSince = Math.floor(timeSinceLastPoll / 1000 / 60);
        console.log(`[SecPoller] [${new Date().toISOString()}] ✅ Health check passed: Last poll ${timeSince} minutes ago`);
      }
    }, this.HEALTH_CHECK_INTERVAL_MS);

    console.log(`[SecPoller] [${new Date().toISOString()}] Health check started (checks every ${this.HEALTH_CHECK_INTERVAL_MS / 1000 / 60} minutes)`);
  }

  async restart(): Promise<void> {
    const restartTime = new Date().toISOString();
    console.log(`[SecPoller] [${restartTime}] Restarting SecPoller...`);
    
    // Stop current instance
    this.stop();
    
    // Wait a moment before restarting
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Restart
    await this.start(this.pollIntervalMs, 0);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
    this.isPolling = false;
    console.log(`[SecPoller] [${new Date().toISOString()}] Stopped polling.`);
  }

  getStatus() {
    const now = Date.now();
    const timeSinceLastPoll = this.lastPollTime > 0 ? now - this.lastPollTime : null;
    
    return {
      isPolling: this.isPolling,
      pollIntervalMs: this.pollIntervalMs,
      pollIntervalMinutes: this.pollIntervalMs / 1000 / 60,
      hasTimer: this.timer !== null,
      hasHealthCheck: this.healthCheckTimer !== null,
      lastProcessedId: this.lastProcessedId,
      currentBatchId: this.currentBatchId,
      lastPollTime: this.lastPollTime > 0 ? new Date(this.lastPollTime).toISOString() : null,
      timeSinceLastPollMs: timeSinceLastPoll,
      timeSinceLastPollMinutes: timeSinceLastPoll ? Math.floor(timeSinceLastPoll / 1000 / 60) : null,
      startAttempts: this.startAttempts,
      healthStatus: this.isPolling && timeSinceLastPoll && timeSinceLastPoll < this.MAX_TIME_SINCE_LAST_POLL_MS ? 'healthy' : 
                    this.isPolling ? 'unhealthy' : 'stopped',
    };
  }

  async triggerPoll() {
    if (!this.isPolling) {
      console.warn(`[SecPoller] [${new Date().toISOString()}] ⚠️  Poller not running. Attempting to start...`);
      try {
        await this.start(this.pollIntervalMs || 5 * 60 * 1000, 0);
      } catch (err) {
        throw new Error(`SecPoller failed to start: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    console.log(`[SecPoller] [${new Date().toISOString()}] Manual poll triggered`);
    this.lastPollTime = Date.now();
    await this.poll();
  }

  private async poll() {
    const pollStartTime = new Date().toISOString();
    try {
      // SEC poller runs regardless of insiderDataSource so realtime SEC accumulates
      // for OpenInsider->SEC fallback when OpenInsider primary yields 0 at :00
      console.log(`[SecPoller] [${pollStartTime}] Starting polling cycle...`);
      const oiConfig = await storage.getOpeninsiderConfig();

      // 2. Fetch RSS Feed
      console.log(`[SecPoller] [${pollStartTime}] Fetching RSS feed...`);
      const rssContent = await secClient.getLatestFilingsRss();
      console.log(`[SecPoller] [${pollStartTime}] RSS feed fetched (${rssContent.length} bytes)`);
      const entries = secParser.parseRssFeed(rssContent);
      console.log(`[SecPoller] [${pollStartTime}] Parsed ${entries.length} entries from RSS feed`);

      if (entries.length === 0) {
        console.log(`[SecPoller] [${pollStartTime}] No recent filings found in RSS.`);
        return;
      }

      // 3. Process New Entries
      // We process from oldest to newest to maintain order, but RSS is usually newest first.
      // So we reverse the array.
      const newEntries = entries.reverse();
      let processedCount = 0;

      for (const entry of newEntries) {
        const { cik, accessionNumber, link } = entry;

        // Skip if we've seen this before (simple deduplication for this session)
        // In a real robust system, we'd check DB for existence of this accessionNumber
        if (this.lastProcessedId === accessionNumber) {
          continue; // Already processed up to here
        }

        // FIRST: Try to get ticker from RSS CIK (might be individual or company)
        let ticker = tickerMapper.getTicker(cik);
        let companyCIK = cik; // Default to RSS CIK

        // Fetch XML once - we'll use it to extract issuer CIK if needed, and parse transactions
        let xmlContent: string | null = null;
        
        try {
          // Strategy 1: Use index.json to find the actual XML file (recommended by SEC)
          try {
            const index = await secClient.getFilingIndex(cik, accessionNumber);
            const items = index?.directory?.item || [];
            
            for (const item of items) {
              const fileName = item.name || item;
              if (typeof fileName === 'string' && 
                  fileName.endsWith('.xml') && 
                  !fileName.includes('xslF345X05') && 
                  !fileName.includes('index')) {
                try {
                  const content = await secClient.getFilingDocument(cik, accessionNumber, fileName);
                  if (content.trim().startsWith('<?xml') || content.includes('<ownershipDocument')) {
                    xmlContent = content;
                    break;
                  }
                } catch {
                  continue;
                }
              }
            }
          } catch (indexError) {
            // Index fetch failed, try fallback
          }

          // Strategy 2: Fallback to common XML filename patterns if index.json didn't work
          if (!xmlContent) {
            const accessionNoDashes = accessionNumber.replace(/-/g, "");
            const xmlPatterns = [
              `${accessionNoDashes}.xml`,
              `${accessionNoDashes}-form4.xml`,
            ];

            for (const pattern of xmlPatterns) {
              try {
                const content = await secClient.getFilingDocument(cik, accessionNumber, pattern);
                if (content.trim().startsWith('<?xml') || content.includes('<ownershipDocument')) {
                  xmlContent = content;
                  break;
                }
              } catch {
                continue;
              }
            }
          }

          if (!xmlContent) {
            console.log(`[SecPoller] Could not fetch raw XML for ${accessionNumber}`);
            continue;
          }

          // If no ticker found from RSS CIK, extract issuer (company) CIK from XML
          // The RSS CIK might be an individual filer, but the XML contains the company CIK
          if (!ticker && xmlContent) {
            const extractedIssuerCIK = secParser.extractIssuerCIK(xmlContent);
            if (extractedIssuerCIK && extractedIssuerCIK !== cik) {
              companyCIK = extractedIssuerCIK;
              ticker = tickerMapper.getTicker(extractedIssuerCIK);
              if (ticker) {
                console.log(`[SecPoller] Found issuer CIK ${extractedIssuerCIK} (ticker: ${ticker}) for RSS CIK ${cik}`);
              }
            }
          }

          // If still no ticker, skip this entry
          if (!ticker) {
            if (processedCount === 0) {
              // Only log first few to avoid spam
              console.log(`[SecPoller] Skipping entry - no ticker found for CIK ${cik} or issuer (accession: ${accessionNumber})`);
            }
            continue;
          }

          // Parse transactions from XML
          const transactions = secParser.parseForm4(xmlContent);

          for (const t of transactions) {
            await this.processTransaction(ticker, t, accessionNumber, oiConfig ?? undefined);
          }
          processedCount++;

        } catch (err) {
          console.error(`[SecPoller] Failed to process filing for ${accessionNumber}:`, err);
        }

        this.lastProcessedId = accessionNumber;
      }

      const pollEndTime = new Date().toISOString();
      this.lastPollTime = Date.now(); // Update last poll time on successful completion
      console.log(`[SecPoller] [${pollEndTime}] Polling cycle complete. Processed ${processedCount} filings out of ${entries.length} total entries.`);
      if (processedCount < entries.length) {
        const skipped = entries.length - processedCount;
        console.log(`[SecPoller] [${pollEndTime}] Skipped ${skipped} entries (no ticker mapping or other issues)`);
      }

    } catch (error) {
      const errorTime = new Date().toISOString();
      console.error(`[SecPoller] [${errorTime}] Error in polling loop:`, error);
      if (error instanceof Error) {
        console.error(`[SecPoller] [${errorTime}] Error stack:`, error.stack);
      }
    }
  }

  private async processTransaction(ticker: string, t: any, accessionNumber: string, oiConfig?: { insiderTitles?: string[] | null; minTransactionValue?: number | null; fetchPreviousDayOnly?: boolean; minMarketCap?: number; optionsDealThresholdPercent?: number } | null) {
    try {
      // 1. Check duplicates
      const existing = await storage.getOpportunityByTransaction(
        ticker,
        t.transactionDate,
        t.ownerName,
        t.transactionCode === 'P' ? 'buy' : 'sell',
        'realtime'
      );
      if (existing) return;

      // 2. Enrich with Market Data (needed for market cap & current price)
      const quote = await finnhubService.getQuote(ticker);
      if (!quote || !quote.currentPrice) {
        console.log(`[SecPoller] Could not get quote for ${ticker}, skipping`);
        return;
      }
      
      // CRITICAL: Validate AlphaVantage supports this ticker (required for analysis)
      // Check if AlphaVantage has quote data (same validation as analysis will use)
      try {
        const { stockService } = await import("../../stockService");
        const avQuote = await stockService.getQuote(ticker);
        if (!avQuote || !avQuote.price) {
          console.log(`[SecPoller] ${ticker} not supported by AlphaVantage, skipping (will fail analysis)`);
          return;
        }
      } catch (avError: any) {
        if (avError.message?.includes("No quote data found")) {
          console.log(`[SecPoller] ${ticker} not supported by AlphaVantage, skipping (will fail analysis)`);
          return;
        }
        throw avError; // Re-throw if it's a different error
      }
      
      const companyInfo = await finnhubService.getCompanyProfile(ticker);

      // 3. Apply OpenInsider-style filters
      if (!applyOpenInsiderFiltersToSecTransaction({ tx: t, quote: { currentPrice: quote.currentPrice }, companyInfo, config: oiConfig || {} })) {
        return;
      }
      const marketCap = companyInfo?.marketCap;

      // 4. Create or reuse batch (reuse for 1 hour to avoid creating too many batches)
      let batchId: string;
      const now = Date.now();
      
      if (this.currentBatchId && (now - this.batchCreatedAt) < this.BATCH_TTL_MS) {
        // Reuse existing batch
        batchId = this.currentBatchId;
      } else {
        // Create new batch
        const batch = await storage.createOpportunityBatch({
          cadence: 'realtime',
          source: 'sec',
          count: 1
        });
        batchId = batch.id;
        this.currentBatchId = batchId;
        this.batchCreatedAt = now;
      }

      const opportunity = await storage.createOpportunity({
        ticker: ticker,
        companyName: companyInfo?.name || ticker,
        recommendation: t.transactionCode === 'P' ? 'buy' : 'sell',
        cadence: 'realtime',
        batchId: batchId,
        currentPrice: quote.currentPrice.toString(),
        insiderName: t.ownerName,
        insiderTitle: t.officerTitle || (t.isDirector ? "Director" : (t.isOfficer ? "Officer" : "Owner")),
        insiderTradeDate: t.transactionDate,
        insiderQuantity: t.transactionShares,
        insiderPrice: t.transactionPrice.toString(),
        marketCap: marketCap?.toString() || null,
        country: companyInfo?.country || null,
        industry: companyInfo?.industry || null,
        source: "sec",
        confidenceScore: 80, // Default high confidence for direct SEC data
      });

      console.log(`[SecPoller] Created Opportunity: ${ticker} ${t.transactionCode} ${t.transactionShares}@${t.transactionPrice} by ${t.ownerName}`);

      // 5. Trigger AI Analysis
      // Check if analysis exists
      const existingAnalysis = await storage.getStockAnalysis(ticker);
      if (!existingAnalysis || existingAnalysis.status !== 'completed') {
        console.log(`[SecPoller] Queuing AI analysis for ${ticker}...`);
        await storage.enqueueAnalysisJob(ticker, "opportunity_stream", "high");
      }

    } catch (err) {
      console.error(`[SecPoller] Error processing transaction for ${ticker}:`, err);
    }
  }
}

export const secPoller = new SecPoller();
