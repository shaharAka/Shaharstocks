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
  private lastProcessedId: string | null = null;
  private currentBatchId: string | null = null;
  private batchCreatedAt: number = 0;
  private readonly BATCH_TTL_MS = 60 * 60 * 1000; // 1 hour - reuse batch for 1 hour

  constructor() {
    //
  }

  async start(intervalMs: number = 300000) {
    if (this.isPolling) {
      console.log("[SecPoller] Already polling.");
      return;
    }

    // Initialize ticker mapper first
    await tickerMapper.initialize();

    this.pollIntervalMs = intervalMs;
    this.isPolling = true;
    console.log(`[SecPoller] Starting polling loop (interval: ${this.pollIntervalMs}ms)`);

    // Immediate first run
    this.poll();

    // Schedule subsequent runs
    this.timer = setInterval(() => this.poll(), this.pollIntervalMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isPolling = false;
    console.log("[SecPoller] Stopped polling.");
  }

  private async poll() {
    try {
      // SEC poller runs regardless of insiderDataSource so realtime SEC accumulates
      // for OpenInsider->SEC fallback when OpenInsider primary yields 0 at :00
      console.log("[SecPoller] Checking for new SEC filings...");
      const oiConfig = await storage.getOpeninsiderConfig();

      // 2. Fetch RSS Feed
      const rssContent = await secClient.getLatestFilingsRss();
      const entries = secParser.parseRssFeed(rssContent);

      if (entries.length === 0) {
        console.log("[SecPoller] No recent filings found in RSS.");
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

        const ticker = tickerMapper.getTicker(cik);
        if (!ticker) {
          // Skip companies not in our mapped list (e.g. funds without standard tickers)
          continue;
        }

        // Fetch and Parse the actual XML document
        try {
          // Strategy 1: Use index.json to find the actual XML file (recommended by SEC)
          // The index.json lists all files in the filing directory
          let xmlContent: string | null = null;
          
          try {
            const index = await secClient.getFilingIndex(cik, accessionNumber);
            
            // The index has a 'directory' object with 'item' array containing file info
            const items = index?.directory?.item || [];
            
            // Find the XML file (look for .xml extension, exclude XSLT/HTML files)
            for (const item of items) {
              const fileName = item.name || item;
              if (typeof fileName === 'string' && 
                  fileName.endsWith('.xml') && 
                  !fileName.includes('xslF345X05') && 
                  !fileName.includes('index')) {
                try {
                  const content = await secClient.getFilingDocument(cik, accessionNumber, fileName);
                  // Verify it's actually XML with ownershipDocument
                  if (content.trim().startsWith('<?xml') || content.includes('<ownershipDocument')) {
                    xmlContent = content;
                    break;
                  }
                } catch {
                  // Try next file
                  continue;
                }
              }
            }
          } catch (indexError) {
            // Index fetch failed, try fallback strategies
            console.log(`[SecPoller] Could not fetch index.json for ${accessionNumber}, trying fallback`);
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
          
          const transactions = secParser.parseForm4(xmlContent);

          for (const t of transactions) {
            await this.processTransaction(ticker, t, accessionNumber, oiConfig ?? undefined);
          }
          processedCount++;

        } catch (err) {
          console.error(`[SecPoller] Failed to process filing for ${ticker}:`, err);
        }

        this.lastProcessedId = accessionNumber;
      }

      console.log(`[SecPoller] Polling cycle complete. Processed ${processedCount} filings.`);

    } catch (error) {
      console.error("[SecPoller] Error in polling loop:", error);
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
