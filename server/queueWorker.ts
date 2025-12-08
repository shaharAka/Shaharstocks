/**
 * AI Analysis Job Queue Worker
 * 
 * Background worker that continuously processes queued AI analysis jobs.
 * Features:
 * - Atomic job dequeuing with FOR UPDATE SKIP LOCKED
 * - Priority-based processing (high > normal > low)
 * - Retry logic with exponential backoff
 * - Graceful error handling
 * - Rate limiting awareness
 */

import { storage } from "./storage";
import { stockService } from "./stockService";
import { secEdgarService } from "./secEdgarService";
import { aiAnalysisService } from "./aiAnalysisService";
import { geminiAgentService, isFallbackEvaluation, type StockContext, type AIAgentEvaluation } from "./geminiAgentService";
import type { AiAnalysisJob } from "@shared/schema";
import {
  extractTechnicalsFromCandlesticks,
  determineSmaAlignment,
  determineMacdCondition,
  determineRsiCondition,
  determineVolumeCondition,
  determineInsiderRoleCondition,
  determineSentimentCondition,
  determineProfitMarginTrend,
  normalizeInsiderRoles,
  normalizeSentimentTrend,
} from "./scoring/scorecardDataExtractor";
import { generateScorecard as generateRuleBasedScorecard } from "./scoring/metricCalculators";

/**
 * Parse market cap string (e.g., "1.2B", "500M", "1,234,567") to number
 */
function parseMarketCapToNumber(marketCap: string | null | undefined): number | undefined {
  if (!marketCap) return undefined;
  
  const cleaned = marketCap.replace(/[$,\s]/g, '').toUpperCase();
  
  // Handle T (trillion), B (billion), M (million), K (thousand) suffixes
  const match = cleaned.match(/^([\d.]+)([TBMK])?$/);
  if (!match) return undefined;
  
  const value = parseFloat(match[1]);
  if (isNaN(value)) return undefined;
  
  const multiplier = match[2];
  switch (multiplier) {
    case 'T': return value * 1_000_000_000_000;
    case 'B': return value * 1_000_000_000;
    case 'M': return value * 1_000_000;
    case 'K': return value * 1_000;
    default: return value;
  }
}

/**
 * Parse shares count string - handles plain numbers, comma-separated, and scientific notation
 * Examples: "1234567890", "1,234,567,890", "1.23E+08", "1.23e8"
 */
function parseSharesCount(sharesStr: string | null | undefined): number | undefined {
  if (!sharesStr) return undefined;
  
  // Remove only commas and whitespace (preserve 'e', 'E', '+', '-' for scientific notation)
  const cleaned = sharesStr.replace(/[,\s]/g, '');
  
  // Use Number() which handles scientific notation properly
  const value = Number(cleaned);
  
  if (isNaN(value) || value <= 0) return undefined;
  return value;
}

/**
 * Calculate transaction size vs float (or market cap as fallback)
 * Returns percentage value (e.g., 0.5 = 0.5% of float)
 * 
 * @param insiderQuantity - Number of shares in the transaction
 * @param sharesFloat - Total tradeable shares (from Alpha Vantage OVERVIEW)
 * @param sharesOutstanding - Total shares outstanding (fallback)
 * @param marketCap - Market cap string (last resort fallback, uses price to estimate shares)
 * @param insiderPrice - Price per share (needed for market cap fallback)
 */
function calculateTransactionSizeVsFloat(
  insiderQuantity: number | null | undefined,
  sharesFloat: string | null | undefined,
  sharesOutstanding: string | null | undefined,
  marketCap: string | null | undefined,
  insiderPrice: string | null | undefined
): number | undefined {
  if (!insiderQuantity || insiderQuantity <= 0) return undefined;
  
  // Try sharesFloat first (most accurate for tradeable shares)
  const floatValue = parseSharesCount(sharesFloat);
  if (floatValue) {
    const ratio = (insiderQuantity / floatValue) * 100;
    return ratio;
  }
  
  // Fallback to sharesOutstanding
  const outstandingValue = parseSharesCount(sharesOutstanding);
  if (outstandingValue) {
    const ratio = (insiderQuantity / outstandingValue) * 100;
    return ratio;
  }
  
  // Last resort: estimate shares from market cap / price
  if (marketCap && insiderPrice) {
    const price = parseFloat(insiderPrice);
    if (!isNaN(price) && price > 0) {
      const marketCapValue = parseMarketCapToNumber(marketCap);
      if (marketCapValue && marketCapValue > 0) {
        const estimatedShares = marketCapValue / price;
        const ratio = (insiderQuantity / estimatedShares) * 100;
        return ratio;
      }
    }
  }
  
  return undefined;
}

class QueueWorker {
  private running = false;
  private pollInterval = 2000; // Poll every 2 seconds when queue is active
  private idleInterval = 10000; // Poll every 10 seconds when queue is empty
  private processingCount = 0;
  private maxConcurrent = 1; // Process one job at a time for now
  private stuckJobTimeoutMs = 30 * 60 * 1000; // 30 minutes timeout for stuck jobs
  private lastStuckJobCleanup = 0;
  private stuckJobCleanupInterval = 5 * 60 * 1000; // Check for stuck jobs every 5 minutes

  /**
   * Update job progress with current step and details
   */
  private async updateProgress(
    jobId: string,
    ticker: string,
    currentStep: string,
    stepDetails: {
      phase?: string;
      substep?: string;
      progress?: string;
    }
  ) {
    try {
      await storage.updateJobProgress(jobId, currentStep, {
        ...stepDetails,
        timestamp: new Date().toISOString(),
      });
      console.log(`[QueueWorker] 📍 ${ticker} - ${currentStep}: ${stepDetails.substep || stepDetails.phase}`);
    } catch (error) {
      console.warn(`[QueueWorker] Failed to update progress for job ${jobId}:`, error);
    }
  }

  async start() {
    if (this.running) {
      console.log("[QueueWorker] Already running");
      return;
    }

    this.running = true;
    console.log("[QueueWorker] Starting AI analysis queue worker...");
    console.log("[QueueWorker] Initializing process loop...");
    
    // Start the processing loop in the background with error handling
    // DO NOT await - it's an infinite loop!
    this.processLoop().catch(error => {
      console.error("[QueueWorker] FATAL: Process loop crashed:", error);
      console.error("[QueueWorker] Stack trace:", error instanceof Error ? error.stack : "N/A");
      this.running = false;
    });
    
    console.log("[QueueWorker] Background process loop initiated");
  }

  async stop() {
    console.log("[QueueWorker] Stopping queue worker...");
    this.running = false;
  }

  /**
   * Reset jobs that have been stuck in 'processing' state for too long
   * This handles cases where the worker crashed or timed out during processing
   */
  private async cleanupStuckJobs(): Promise<number> {
    const now = Date.now();
    
    // Only run cleanup every 5 minutes to avoid excessive queries
    if (now - this.lastStuckJobCleanup < this.stuckJobCleanupInterval) {
      return 0;
    }
    
    this.lastStuckJobCleanup = now;
    
    try {
      const resetCount = await storage.resetStuckProcessingJobs(this.stuckJobTimeoutMs);
      if (resetCount > 0) {
        console.log(`[QueueWorker] 🔄 Reset ${resetCount} stuck processing job(s)`);
      }
      return resetCount;
    } catch (error) {
      console.error("[QueueWorker] Error cleaning up stuck jobs:", error);
      return 0;
    }
  }

  private async processLoop() {
    console.log("[QueueWorker] ✅ Process loop started, running =", this.running);
    
    let iterationCount = 0;
    while (this.running) {
      iterationCount++;
      console.log(`[QueueWorker] 🔄 Loop iteration ${iterationCount}, processingCount = ${this.processingCount}`);
      
      try {
        // Periodically clean up stuck processing jobs
        await this.cleanupStuckJobs();
        
        // Check if we can process more jobs
        if (this.processingCount < this.maxConcurrent) {
          console.log("[QueueWorker] 📥 Polling for jobs...");
          const job = await storage.dequeueNextJob();
          
          if (job) {
            console.log(`[QueueWorker] ✅ Dequeued job ${job.id} for ${job.ticker}`);
            // Process job without waiting (allows concurrent processing)
            this.processJob(job).catch(error => {
              console.error(`[QueueWorker] ❌ Unhandled error processing job ${job.id}:`, error);
            });
            
            // If we got a job, check for more immediately
            await this.sleep(100);
          } else {
            console.log(`[QueueWorker] 💤 No pending jobs, sleeping for ${this.idleInterval}ms`);
            // Queue is empty, wait longer before checking again
            await this.sleep(this.idleInterval);
          }
        } else {
          console.log(`[QueueWorker] ⏸️  Max concurrent jobs (${this.maxConcurrent}) reached, waiting...`);
          // Max concurrent jobs reached, wait a bit
          await this.sleep(this.pollInterval);
        }
      } catch (error) {
        console.error("[QueueWorker] ❌ Error in process loop:", error);
        console.error("[QueueWorker] Stack trace:", error instanceof Error ? error.stack : "N/A");
        await this.sleep(this.pollInterval);
      }
    }
    console.log("[QueueWorker] 🛑 Process loop ended");
  }

  private async processJob(job: AiAnalysisJob): Promise<void> {
    this.processingCount++;
    const startTime = Date.now();
    
    console.log(`[QueueWorker] Processing job ${job.id} for ${job.ticker} (priority: ${job.priority}, attempt: ${job.retryCount + 1}/${job.maxRetries + 1})`);

    try {
      // Reset phase completion flags for fresh analysis
      console.log(`[QueueWorker] Resetting phase completion flags for ${job.ticker}...`);
      await storage.resetStockAnalysisPhaseFlags(job.ticker);
      
      // PHASE 1: Fetch all required data for analysis
      await this.updateProgress(job.id, job.ticker, "fetching_data", {
        phase: "data_fetch",
        substep: "Fetching fundamentals and price data",
        progress: "0/3"
      });
      console.log(`[QueueWorker] Fetching data for ${job.ticker}...`);
      
      const [companyOverview, balanceSheet, incomeStatement, cashFlow, dailyPrices] = await Promise.all([
        stockService.getCompanyOverview(job.ticker),
        stockService.getBalanceSheet(job.ticker),
        stockService.getIncomeStatement(job.ticker),
        stockService.getCashFlow(job.ticker),
        stockService.getDailyPrices(job.ticker, 60),
      ]);

      await this.updateProgress(job.id, job.ticker, "fetching_data", {
        phase: "data_fetch",
        substep: "Fetching technical indicators and news",
        progress: "1/3"
      });

      const [technicalIndicators, newsSentiment] = await Promise.all([
        stockService.getTechnicalIndicators(job.ticker, dailyPrices),
        stockService.getNewsSentiment(job.ticker),
      ]);

      console.log(`[QueueWorker] 📊 Analyzing price-news correlation for ${job.ticker}...`);
      const priceNewsCorrelation = stockService.analyzePriceNewsCorrelation(dailyPrices, newsSentiment);
      console.log(`[QueueWorker] ✅ Price-news correlation complete`);

      await this.updateProgress(job.id, job.ticker, "fetching_data", {
        phase: "data_fetch",
        substep: "Fetching SEC filings and fundamentals",
        progress: "2/3"
      });

      // Fetch SEC filings and comprehensive fundamentals (optional, non-blocking)
      let secFilingData = null;
      let comprehensiveFundamentals = null;
      
      console.log(`[QueueWorker] 📁 Fetching SEC filings for ${job.ticker}...`);
      try {
        secFilingData = await secEdgarService.getCompanyFilingData(job.ticker);
        console.log(`[QueueWorker] ✅ SEC filings fetched successfully`);
      } catch (error) {
        console.warn(`[QueueWorker] ⚠️  Could not fetch SEC filings for ${job.ticker}:`, error instanceof Error ? error.message : error);
      }
      
      console.log(`[QueueWorker] 📊 Fetching comprehensive fundamentals for ${job.ticker}...`);
      try {
        comprehensiveFundamentals = await stockService.getComprehensiveFundamentals(job.ticker);
        console.log(`[QueueWorker] ✅ Fundamentals fetched successfully`);
      } catch (error) {
        console.warn(`[QueueWorker] ⚠️  Could not fetch fundamentals for ${job.ticker}:`, error instanceof Error ? error.message : error);
      }

      console.log(`[QueueWorker] 🔧 Preparing SEC filings data...`);
      const secFilings = secFilingData ? {
        formType: secFilingData.formType,
        filingDate: secFilingData.filingDate,
        managementDiscussion: secFilingData.managementDiscussion,
        riskFactors: secFilingData.riskFactors,
        businessOverview: secFilingData.businessOverview,
      } : undefined;
      console.log(`[QueueWorker] ✅ SEC data prepared`);

      // Check for insider trading data - get ALL transactions for this ticker across ALL users
      console.log(`[QueueWorker] 🔍 Checking for insider trading data for ${job.ticker}...`);
      const insiderTradingStrength = await (async () => {
        try {
          const allStocks = await storage.getAllStocksForTickerGlobal(job.ticker);
          console.log(`[QueueWorker] Found ${allStocks.length} transaction(s) across all users for ${job.ticker}`);
          
          if (allStocks.length === 0) {
            return undefined;
          }
          
          // Aggregate all transactions - separate buys and sells
          const buyTransactions = allStocks.filter(s => s.recommendation?.toLowerCase() === "buy");
          const sellTransactions = allStocks.filter(s => s.recommendation?.toLowerCase() === "sell");
          
          console.log(`[QueueWorker] Transaction breakdown: ${buyTransactions.length} BUY, ${sellTransactions.length} SELL`);
          
          // Determine overall signal based on transaction mix
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
            // Mixed signals - determine which signal is more recent and use that as direction
            const sortedByDate = allStocks.sort((a, b) => 
              new Date(b.lastUpdated || 0).getTime() - new Date(a.lastUpdated || 0).getTime()
            );
            
            // Find most recent BUY or SELL (skip any with missing recommendation)
            const mostRecentSignal = sortedByDate.find(s => 
              s.recommendation?.toLowerCase() === "buy" || s.recommendation?.toLowerCase() === "sell"
            );
            
            if (mostRecentSignal) {
              direction = mostRecentSignal.recommendation?.toLowerCase() || "mixed";
              transactionType = direction === "buy" ? "purchase" : (direction === "sell" ? "sale" : "mixed");
              dominantSignal = `MIXED SIGNALS - ${buyTransactions.length} BUY, ${sellTransactions.length} SELL (most recent: ${direction.toUpperCase()})`;
            } else {
              // Fallback: if no clear BUY/SELL found, use counts to determine
              direction = buyTransactions.length >= sellTransactions.length ? "buy" : "sell";
              transactionType = direction === "buy" ? "purchase" : "sale";
              dominantSignal = `MIXED SIGNALS - ${buyTransactions.length} BUY, ${sellTransactions.length} SELL (using ${direction.toUpperCase()} as dominant)`;
            }
          } else {
            // No clear transactions - this shouldn't happen but handle gracefully
            direction = "unknown";
            transactionType = "transaction";
            dominantSignal = "Unknown signal - no clear insider transactions";
          }
          
          // Use most recent transaction for price/quantity details
          const primaryStock = allStocks.sort((a, b) => 
            new Date(b.lastUpdated || 0).getTime() - new Date(a.lastUpdated || 0).getTime()
          )[0];
          
          return {
            direction: direction,
            transactionType: transactionType,
            dominantSignal: dominantSignal,
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
            rawInsiderQuantity: primaryStock.insiderQuantity,
            rawInsiderPrice: primaryStock.insiderPrice,
            rawMarketCap: primaryStock.marketCap,
            // Include all transactions for full context
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
          console.error(`[QueueWorker] Error getting insider trading data:`, error);
          return undefined;
        }
      })();
      console.log(`[QueueWorker] ✅ Insider trading check complete:`, insiderTradingStrength ? `${insiderTradingStrength.dominantSignal}` : 'No insider data');
      
      await this.updateProgress(job.id, job.ticker, "fetching_data", {
        phase: "data_fetch",
        substep: "Data fetch complete",
        progress: "3/3"
      });

      // PHASE 2: Macro Analysis (happens first - get industry context)
      await this.updateProgress(job.id, job.ticker, "macro_analysis", {
        phase: "macro",
        substep: "Analyzing industry/sector conditions"
      });

      // Get or create industry-specific macro analysis
      // Prefer: 1) Stock record from DB (any user), 2) Alpha Vantage industry, 3) Alpha Vantage sector, 4) undefined
      const stock = await storage.getAnyStockForTicker(job.ticker);
      const rawIndustry = stock?.industry || companyOverview?.industry || companyOverview?.sector || undefined;
      // Coerce "N/A" sentinel value to undefined to avoid creating useless industry buckets
      const stockIndustry = (rawIndustry && rawIndustry !== "N/A") ? rawIndustry : undefined;
      console.log(`[QueueWorker] Getting macro economic analysis for industry: ${stockIndustry || "General Market"}...`);
      let macroAnalysis = await storage.getLatestMacroAnalysis(stockIndustry);
      
      // If no recent macro analysis exists for this industry, create one
      if (!macroAnalysis) {
        console.log(`[QueueWorker] No macro analysis found for ${stockIndustry || "General Market"}, creating new one...`);
        const { runMacroAnalysis } = await import("./macroAgentService");
        const macroData = await runMacroAnalysis(stockIndustry);
        macroAnalysis = await storage.createMacroAnalysis(macroData);
        console.log(`[QueueWorker] Created macro analysis for ${stockIndustry || "General Market"} with factor ${macroAnalysis.macroFactor}`);
      } else {
        const createdDate = macroAnalysis.createdAt ? macroAnalysis.createdAt.toISOString() : "unknown";
        console.log(`[QueueWorker] Using existing macro analysis for ${stockIndustry || "General Market"} from ${createdDate}`);
        console.log(`[QueueWorker] Macro factor: ${macroAnalysis.macroFactor}, Macro score: ${macroAnalysis.macroScore}/100`);
      }

      // Mark data collection phase complete (macro is part of data collection now)
      await storage.markStockAnalysisPhaseComplete(job.ticker, 'macro');
      console.log(`[QueueWorker] ✅ Data collection phase complete for ${job.ticker}`);

      // PHASE 2: Calculate Scorecard (including Gemini AI agent evaluation)
      // This MUST happen before AI report generation so the report can reference the scores
      await this.updateProgress(job.id, job.ticker, "calculating_score", {
        phase: "scoring",
        substep: "Calculating scorecard with AI evaluation"
      });

      // SCORECARD GENERATION BLOCK (moved from PHASE 3.5 to PHASE 2)
      let scorecard: any = null;
      let scorecardInputForLogging: any = null; // For error logging
      try {
        console.log(`[QueueWorker] 📊 Generating rule-based scorecard for ${job.ticker}...`);
        
        // Fetch candlestick data for enhanced technical metrics
        const candlestickRecord = await storage.getCandlesticksByTicker(job.ticker);
        const candlestickData = candlestickRecord?.candlestickData || [];
        
        // Extract additional technicals from candlestick data (5/10-day SMAs, volume)
        const extractedTechnicals = extractTechnicalsFromCandlesticks(candlestickData);
        
        // Determine RSI direction from signal
        const rsiDirection: 'rising' | 'falling' | 'flat' = 
          technicalIndicators?.rsi?.signal === 'oversold' ? 'rising' : 
          technicalIndicators?.rsi?.signal === 'overbought' ? 'falling' : 'flat';
        
        // Get fallback current price from stock record if not available from candlesticks
        const fallbackCurrentPrice = stock?.currentPrice ? parseFloat(stock.currentPrice) : undefined;
        const currentPriceValue = extractedTechnicals?.currentPrice || fallbackCurrentPrice;
        
        // Safely determine SMA alignment (guards for undefined values)
        const safeCurrentPrice = currentPriceValue;
        const safeSma5 = extractedTechnicals?.sma5;
        const safeSma10 = extractedTechnicals?.sma10;
        const safeSma20 = extractedTechnicals?.sma20 || technicalIndicators?.sma20;
        
        // Only calculate SMA alignment if we have current price and at least one SMA
        const canCalculateSmaAlignment = safeCurrentPrice !== undefined && (safeSma5 !== undefined || safeSma10 !== undefined || safeSma20 !== undefined);
        
        // Determine price direction for volume condition (only when both values exist)
        const priceDirection: 'up' | 'down' | undefined = 
          (safeCurrentPrice !== undefined && safeSma5 !== undefined) 
            ? (safeCurrentPrice > safeSma5 ? 'up' : 'down') 
            : undefined;
        
        // Build comprehensive scorecard input with all available data
        scorecardInputForLogging = {
          ticker: job.ticker,
          fundamentals: comprehensiveFundamentals ? {
            revenueGrowthYoY: comprehensiveFundamentals.revenueGrowthYoY,
            epsGrowthYoY: comprehensiveFundamentals.epsGrowthYoY,
            profitMarginTrend: determineProfitMarginTrend(comprehensiveFundamentals.profitMargin),
            freeCashFlow: comprehensiveFundamentals.freeCashFlow 
              ? parseFloat(comprehensiveFundamentals.freeCashFlow.replace(/[^0-9.-]/g, '')) 
              : undefined,
            totalDebt: comprehensiveFundamentals.totalDebt,
            debtToEquity: comprehensiveFundamentals.debtToEquity,
          } : undefined,
          technicals: {
            currentPrice: currentPriceValue,
            sma5: safeSma5,
            sma10: safeSma10,
            sma20: safeSma20,
            smaAlignment: canCalculateSmaAlignment 
              ? determineSmaAlignment(safeCurrentPrice!, safeSma5, safeSma10, safeSma20) 
              : undefined,
            rsi: technicalIndicators?.rsi?.value,
            rsiCondition: determineRsiCondition(technicalIndicators?.rsi?.value, rsiDirection),
            macdLine: technicalIndicators?.macd?.value,
            macdSignal: technicalIndicators?.macd?.signal,
            macdHistogram: technicalIndicators?.macd?.histogram,
            macdCondition: determineMacdCondition(
              technicalIndicators?.macd?.value,
              technicalIndicators?.macd?.signal,
              technicalIndicators?.macd?.histogram
            ),
            volumeVsAvg: extractedTechnicals?.volumeVsAvg,
            volumeCondition: (extractedTechnicals?.volumeVsAvg !== undefined && priceDirection !== undefined)
              ? determineVolumeCondition(extractedTechnicals.volumeVsAvg, priceDirection)
              : undefined,
          },
          insiderActivity: insiderTradingStrength ? {
            netBuyRatio30d: insiderTradingStrength.buyCount > 0 || insiderTradingStrength.sellCount > 0
              ? ((insiderTradingStrength.buyCount - insiderTradingStrength.sellCount) / 
                 (insiderTradingStrength.buyCount + insiderTradingStrength.sellCount)) * 100
              : undefined,
            daysSinceLastTransaction: insiderTradingStrength.tradeDate 
              ? Math.floor((Date.now() - new Date(insiderTradingStrength.tradeDate).getTime()) / (1000 * 60 * 60 * 24))
              : undefined,
            transactionSizeVsFloat: calculateTransactionSizeVsFloat(
              insiderTradingStrength.rawInsiderQuantity,
              companyOverview?.sharesFloat,
              companyOverview?.sharesOutstanding,
              insiderTradingStrength.rawMarketCap || stock?.marketCap || companyOverview?.marketCap,
              insiderTradingStrength.rawInsiderPrice
            ),
            insiderRoles: normalizeInsiderRoles(insiderTradingStrength.insiderTitle),
          } : undefined,
          newsSentiment: newsSentiment ? {
            avgSentiment: newsSentiment.aggregateSentiment,
            sentimentTrend: normalizeSentimentTrend(newsSentiment.sentimentTrend),
            newsCount7d: newsSentiment.newsVolume,
            upcomingCatalyst: undefined, // Would need catalyst detection
          } : undefined,
          macroSector: macroAnalysis ? {
            sectorVsSpy10d: (() => {
              // Use industry sector analysis weekRelativeStrength (10-day sector vs SPY)
              const sectorAnalysis = macroAnalysis.industrySectorAnalysis as {
                weekRelativeStrength?: number;
                relativeStrength?: number;
              } | null | undefined;
              
              // Prefer weekRelativeStrength (10-day relative) if available
              if (sectorAnalysis?.weekRelativeStrength !== undefined && sectorAnalysis?.weekRelativeStrength !== null) {
                return sectorAnalysis.weekRelativeStrength;
              }
              
              // Fallback to 1-day relative strength extrapolated
              if (sectorAnalysis?.relativeStrength !== undefined && sectorAnalysis?.relativeStrength !== null) {
                return sectorAnalysis.relativeStrength * 2; // Approximate 10-day from 1-day
              }
              
              return undefined;
            })(),
            macroRiskEnvironment: macroAnalysis.macroScore !== null && macroAnalysis.macroScore !== undefined
              ? (macroAnalysis.macroScore > 70 ? 'favorable_tailwinds' as const :
                 macroAnalysis.macroScore > 50 ? 'low_risk' as const :
                 macroAnalysis.macroScore > 30 ? 'neutral' as const : 'some_headwinds' as const)
              : undefined,
          } : undefined,
        };
        
        // Log data availability for debugging
        const availableMetrics = {
          fundamentals: !!scorecardInputForLogging.fundamentals,
          technicals: !!scorecardInputForLogging.technicals?.currentPrice,
          smas: !!(scorecardInputForLogging.technicals?.sma5 && scorecardInputForLogging.technicals?.sma10),
          volume: !!scorecardInputForLogging.technicals?.volumeVsAvg,
          insider: !!scorecardInputForLogging.insiderActivity,
          news: !!scorecardInputForLogging.newsSentiment,
          macro: !!scorecardInputForLogging.macroSector,
        };
        console.log(`[QueueWorker] Scorecard data availability:`, availableMetrics);
        
        // Log transaction size vs float calculation details
        if (scorecardInputForLogging.insiderActivity) {
          console.log(`[QueueWorker] 📊 Transaction Size vs Float:`, {
            insiderQuantity: insiderTradingStrength?.rawInsiderQuantity,
            sharesFloat: companyOverview?.sharesFloat,
            sharesOutstanding: companyOverview?.sharesOutstanding,
            marketCap: companyOverview?.marketCap,
            calculatedRatio: scorecardInputForLogging.insiderActivity.transactionSizeVsFloat,
          });
        }
        
        // Log sector vs SPY calculation details
        if (scorecardInputForLogging.macroSector?.sectorVsSpy10d !== undefined) {
          const sectorAnalysis = macroAnalysis.industrySectorAnalysis as {
            etfSymbol?: string;
            weekRelativeStrength?: number;
            relativeStrength?: number;
          } | null | undefined;
          console.log(`[QueueWorker] 📈 Sector vs SPY (10d):`, {
            etfSymbol: sectorAnalysis?.etfSymbol,
            weekRelativeStrength: sectorAnalysis?.weekRelativeStrength,
            relativeStrength1d: sectorAnalysis?.relativeStrength,
            calculatedSectorVsSpy10d: scorecardInputForLogging.macroSector.sectorVsSpy10d,
          });
        }
        
        // PHASE 3.5: AI Agent Evaluation (REQUIRED for scorecard)
        // The aiAgent section is mandatory - must call Gemini to populate it
        console.log(`[QueueWorker] 🤖 Calling Gemini AI Agent for ${job.ticker} evaluation...`);
        
        // Use already-computed values from scorecardInputForLogging
        const technicalsData = scorecardInputForLogging.technicals;
        const fundamentalsData = scorecardInputForLogging.fundamentals;
        const insiderData = scorecardInputForLogging.insiderActivity;
        const newsData = scorecardInputForLogging.newsSentiment;
        const macroData = scorecardInputForLogging.macroSector;
        
        // VALIDATION: Current price is REQUIRED for AI evaluation
        const validatedCurrentPrice = technicalsData?.currentPrice;
        if (!validatedCurrentPrice || validatedCurrentPrice <= 0) {
          throw new Error(`Missing or invalid current price for ${job.ticker}: ${validatedCurrentPrice}. Cannot proceed with AI evaluation.`);
        }
        
        // Only calculate priceChangePercent when both values are present and valid
        let priceChangePercent: number | undefined = undefined;
        if (validatedCurrentPrice && technicalsData?.sma5 && technicalsData.sma5 > 0) {
          priceChangePercent = ((validatedCurrentPrice - technicalsData.sma5) / technicalsData.sma5) * 100;
        }
        
        const stockContext: StockContext = {
          ticker: job.ticker,
          companyName: stock?.companyName || job.ticker,
          currentPrice: validatedCurrentPrice,
          opportunityType: (job.opportunityType === 'SELL' ? 'SELL' : 'BUY') as 'BUY' | 'SELL',
          
          // Technical data (from already-computed scorecardInputForLogging)
          sma5: technicalsData?.sma5,
          sma10: technicalsData?.sma10,
          sma20: technicalsData?.sma20,
          rsi: technicalsData?.rsi,
          macdHistogram: technicalsData?.macdHistogram,
          priceChangePercent,
          
          // Fundamental data (from already-computed scorecardInputForLogging)
          revenueGrowthYoY: fundamentalsData?.revenueGrowthYoY,
          epsGrowthYoY: fundamentalsData?.epsGrowthYoY,
          debtToEquity: fundamentalsData?.debtToEquity,
          
          // Insider context (from already-computed scorecardInputForLogging)
          daysSinceInsiderTrade: insiderData?.daysSinceLastTransaction,
          insiderPrice: stock?.insiderPrice ? parseFloat(stock.insiderPrice) : undefined,
          
          // News/Sentiment (from already-computed scorecardInputForLogging)
          avgSentiment: newsData?.avgSentiment,
          newsCount: newsData?.newsCount7d,
          
          // Sector context (from already-computed scorecardInputForLogging)
          sectorVsSpy10d: macroData?.sectorVsSpy10d,
          
          // Rule-based scores (from previous phase if available)
          fundamentalsScore: undefined, // Will be calculated by scorecard
          technicalsScore: undefined,
          insiderScore: undefined,
          newsScore: undefined,
          macroScore: macroAnalysis.macroScore ?? undefined,
        };
        
        const aiAgentEvaluation = await geminiAgentService.evaluateStock(stockContext);
        
        // Use centralized fallback detection helper from geminiAgentService
        // This catches: default triple, stub rationale patterns, empty/short rationale
        const fallbackCheck = isFallbackEvaluation(aiAgentEvaluation);
        
        if (fallbackCheck.isFallback) {
          // CRITICAL: Treat fallback/stub as a failure - job should retry
          console.error(`[QueueWorker] ❌ CRITICAL: Gemini returned fallback for ${job.ticker}`);
          console.error(`[QueueWorker] Fallback reason: ${fallbackCheck.reason}`);
          console.error(`[QueueWorker] Evaluation:`, JSON.stringify(aiAgentEvaluation, null, 2));
          console.error(`[QueueWorker] Context sent to Gemini:`, JSON.stringify(stockContext, null, 2));
          throw new Error(`Gemini AI evaluation failed for ${job.ticker}: ${fallbackCheck.reason}`);
        }
        
        console.log(`[QueueWorker] ✅ AI Agent Evaluation complete:`, {
          riskAssessment: aiAgentEvaluation.riskAssessment,
          entryTiming: aiAgentEvaluation.entryTiming,
          conviction: aiAgentEvaluation.conviction,
        });
        
        // Add AI evaluation to scorecard input
        scorecardInputForLogging.aiAgentEvaluation = aiAgentEvaluation;
        
        // ASSERTION: Verify aiAgentEvaluation is attached before scorecard generation
        if (!scorecardInputForLogging.aiAgentEvaluation) {
          throw new Error(`aiAgentEvaluation not attached to scorecardInputForLogging for ${job.ticker} - this should not happen`);
        }
        console.log(`[QueueWorker] ✅ aiAgentEvaluation attached - proceeding with scorecard generation`);
        
        // Use pure rule-based scorecard generation (no LLM dependency, deterministic)
        // CRITICAL: Pass opportunityType to drive BUY vs SELL inversion logic
        const oppType = (job.opportunityType === 'SELL' ? 'SELL' : 'BUY') as 'BUY' | 'SELL';
        scorecard = generateRuleBasedScorecard(scorecardInputForLogging, oppType);
        console.log(`[QueueWorker] ✅ Scorecard complete (${job.opportunityType}): ${scorecard.globalScore}/100 (${scorecard.confidence} confidence)`);
      } catch (scorecardError) {
        // CRITICAL: Scorecard generation is REQUIRED - fail the job so it gets retried
        console.error(`[QueueWorker] ❌ CRITICAL: Scorecard generation FAILED for ${job.ticker}:`, scorecardError);
        console.error(`[QueueWorker] Error stack:`, scorecardError instanceof Error ? scorecardError.stack : 'No stack trace');
        console.error(`[QueueWorker] Scorecard input data:`, JSON.stringify(scorecardInputForLogging, null, 2));
        
        // Re-throw to fail the job - analysis without scorecard is incomplete
        throw new Error(`Scorecard generation failed for ${job.ticker}: ${scorecardError instanceof Error ? scorecardError.message : 'Unknown error'}`);
      }
      
      // VALIDATION: Ensure scorecard was generated successfully with all 6 sections
      if (!scorecard) {
        console.error(`[QueueWorker] ❌ CRITICAL: Scorecard is null after generation for ${job.ticker}`);
        throw new Error(`Scorecard is null after generation for ${job.ticker} - this should not happen`);
      }
      
      // Validate all 6 required sections are present in the scorecard
      // Section names match those in metricCalculators.ts generateScorecard()
      const requiredSections = ['fundamentals', 'technicals', 'insiderActivity', 'newsSentiment', 'macroSector', 'aiAgent'] as const;
      const missingSections = requiredSections.filter(section => !scorecard.sections[section]);
      if (missingSections.length > 0) {
        console.error(`[QueueWorker] ❌ CRITICAL: Scorecard missing sections for ${job.ticker}: ${missingSections.join(', ')}`);
        console.error(`[QueueWorker] Scorecard sections present:`, Object.keys(scorecard.sections));
        throw new Error(`Scorecard incomplete for ${job.ticker}: missing sections [${missingSections.join(', ')}]`);
      }
      
      // Additional validation: Ensure aiAgent section has valid data (not all missing)
      const aiAgentSection = scorecard.sections.aiAgent;
      if (aiAgentSection) {
        const aiMetrics = aiAgentSection.metrics;
        const allMissing = aiMetrics.every((m: { bucket: string }) => m.bucket === 'missing');
        if (allMissing) {
          console.error(`[QueueWorker] ❌ CRITICAL: aiAgent section has all metrics missing for ${job.ticker}`);
          console.error(`[QueueWorker] aiAgentEvaluation was:`, JSON.stringify(scorecardInputForLogging.aiAgentEvaluation, null, 2));
          throw new Error(`aiAgent section has all metrics missing for ${job.ticker} - AI evaluation data not properly integrated`);
        }
      }
      
      console.log(`[QueueWorker] ✅ Scorecard validation passed - all 6 sections present with valid data for ${job.ticker}`);

      // Mark scorecard phase complete (reusing 'micro' flag for backward compatibility)
      await storage.markStockAnalysisPhaseComplete(job.ticker, 'micro');
      console.log(`[QueueWorker] ✅ Scorecard phase complete for ${job.ticker}`);

      // PHASE 3: Generate AI Report (using scorecard for grounding)
      // The AI now has access to the completed scorecard and can reference its scores in recommendations
      await this.updateProgress(job.id, job.ticker, "generating_report", {
        phase: "report",
        substep: "Generating AI investment report"
      });

      console.log(`[QueueWorker] 📝 Generating AI report for ${job.ticker} (grounded by scorecard)...`);
      const analysis = await aiAnalysisService.analyzeStock({
        ticker: job.ticker,
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
        scorecard, // Pass the completed scorecard for grounding
      });
      console.log(`[QueueWorker] ✅ AI report complete (rating: ${analysis.overallRating}, confidence: ${analysis.confidenceScore}/100)`);

      // PHASE 4: Score Integration & Save
      await this.updateProgress(job.id, job.ticker, "calculating_score", {
        phase: "integration",
        substep: "Calculating integrated score (micro × macro)"
      });

      // Calculate integrated score (micro score × macro factor), clamped to 0-100
      const macroFactor = macroAnalysis.macroFactor ? parseFloat(macroAnalysis.macroFactor) : 1.0;
      const rawIntegratedScore = analysis.confidenceScore * macroFactor;
      const integratedScore = Math.max(0, Math.min(100, Math.round(rawIntegratedScore)));
      console.log(`[QueueWorker] Score integration: Micro ${analysis.confidenceScore} × Macro ${macroFactor} = ${rawIntegratedScore.toFixed(1)} → Clamped to ${integratedScore}/100`);

      // Save analysis to database with macro integration
      console.log(`[QueueWorker] 💾 Saving integrated analysis to database...`);
      await storage.saveStockAnalysis({
        ticker: analysis.ticker,
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
        secFilingUrl: secFilingData?.filingUrl,
        secFilingType: secFilingData?.formType,
        secFilingDate: secFilingData?.filingDate,
        secCik: secFilingData?.cik,
        managementDiscussion: secFilingData?.managementDiscussion,
        riskFactors: secFilingData?.riskFactors,
        businessOverview: secFilingData?.businessOverview,
        fundamentalData: comprehensiveFundamentals,
        macroAnalysisId: macroAnalysis.id,
        integratedScore: scorecard ? scorecard.globalScore : integratedScore, // Use scorecard global score if available
        scorecard: scorecard || undefined,
        scorecardVersion: scorecard ? scorecard.version : undefined,
      });

      // Set combined flag after integrated score is saved
      await storage.markStockAnalysisPhaseComplete(job.ticker, 'combined');
      console.log(`[QueueWorker] ✅ All analysis phases complete for ${job.ticker}`);

      // Create notifications for high-value opportunities (high confidence signals)
      // High score BUY: score > 70 with BUY recommendation (highest buy scores)
      // High score SELL: score > 70 with SELL recommendation (highest sell scores)
      const isBuyOpportunity = analysis.recommendation === 'buy' && integratedScore > 70;
      const isSellOpportunity = analysis.recommendation === 'sell' && integratedScore > 70;
      
      if (isBuyOpportunity || isSellOpportunity) {
        const notificationType = isBuyOpportunity ? 'high_score_buy' : 'high_score_sell';
        
        // Calculate price change from insider transaction or previous close (if stock data is available)
        let currentPrice: number | undefined;
        let insiderPrice: number | undefined;
        let previousClose: number | undefined;
        let priceChange: number | undefined;
        let priceChangePercent: number | undefined;
        
        if (stock) {
          currentPrice = parseFloat(stock.currentPrice);
          insiderPrice = stock.insiderPrice ? parseFloat(stock.insiderPrice) : undefined;
          previousClose = stock.previousClose ? parseFloat(stock.previousClose) : undefined;
          
          // Only calculate price changes if we have valid comparison price
          const comparisonPrice = insiderPrice || previousClose;
          if (comparisonPrice && isFinite(comparisonPrice) && comparisonPrice > 0 && isFinite(currentPrice)) {
            priceChange = currentPrice - comparisonPrice;
            priceChangePercent = ((priceChange / comparisonPrice) * 100);
          }
        }
        
        // Create actionable message based on price movement
        let opportunityText = '';
        if (isBuyOpportunity) {
          if (priceChangePercent !== undefined && priceChangePercent > 5) {
            opportunityText = `STRONG BUY - Price up ${priceChangePercent.toFixed(1)}% since insider bought. Consider entry.`;
          } else if (priceChangePercent !== undefined && priceChangePercent < -3) {
            opportunityText = `BUY OPPORTUNITY - Price down ${Math.abs(priceChangePercent).toFixed(1)}% since insider bought. Better entry point!`;
          } else {
            opportunityText = `Strong BUY signal (${integratedScore}/100). Insider confidence confirmed.`;
          }
        } else {
          if (priceChangePercent !== undefined && priceChangePercent < -5) {
            opportunityText = `SELL NOW - Price dropped ${Math.abs(priceChangePercent).toFixed(1)}% since insider sold. Exit position!`;
          } else if (priceChangePercent !== undefined && priceChangePercent > 3) {
            opportunityText = `SELL SIGNAL - Price up ${priceChangePercent.toFixed(1)}% despite insider selling. Take profits!`;
          } else {
            opportunityText = `Strong SELL signal (${integratedScore}/100). Insider caution confirmed.`;
          }
        }
        
        console.log(`[QueueWorker] 🔔 ${notificationType} detected for ${job.ticker} (${integratedScore}/100), creating notifications...`);
        
        const allUsers = await storage.getUsers();
        const activeUsers = allUsers.filter(u => u.subscriptionStatus === 'active' && !u.archived);
        
        for (const user of activeUsers) {
          try {
            await storage.createNotification({
              userId: user.id,
              ticker: job.ticker,
              type: notificationType,
              score: integratedScore,
              message: `${job.ticker}: ${opportunityText}`,
              metadata: {
                currentPrice,
                priceChange,
                priceChangePercent,
                insiderPrice,
              },
              isRead: false,
            });
          } catch (error) {
            // Ignore duplicate notification errors (constraint violation)
            if (error instanceof Error && !error.message.includes('unique constraint')) {
              console.error(`[QueueWorker] Failed to create notification for user ${user.id}:`, error);
            }
          }
        }
        console.log(`[QueueWorker] ✅ Created ${activeUsers.length} ${notificationType} notifications for ${job.ticker}`);
      }

      // Final progress update
      await this.updateProgress(job.id, job.ticker, "completed", {
        phase: "complete",
        substep: "Analysis complete",
        progress: "100%"
      });

      // Mark job as completed
      await storage.updateJobStatus(job.id, "completed");
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`[QueueWorker] ✅ Job ${job.id} completed successfully in ${duration}s (${job.ticker}: ${analysis.overallRating}, integrated score: ${integratedScore}/100)`);

    } catch (error) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error(`[QueueWorker] ❌ Job ${job.id} failed after ${duration}s:`, errorMessage);
      console.error(`[QueueWorker] Error stack:`, errorStack);

      // Use atomic update to sync job and analysis status together
      // This ensures consistent state between job queue and analysis records
      const shouldRetry = job.retryCount < job.maxRetries;
      await storage.failJobAndAnalysisAtomic(
        job.id,
        job.ticker,
        errorMessage,
        shouldRetry,
        job.retryCount,
        job.maxRetries
      );
      
      if (shouldRetry) {
        const backoffMinutes = Math.pow(5, job.retryCount);
        console.log(`[QueueWorker] Job ${job.id} and analysis ${job.ticker} will retry in ${backoffMinutes} minutes (attempt ${job.retryCount + 2}/${job.maxRetries + 1})`);
      } else {
        console.log(`[QueueWorker] Job ${job.id} and analysis ${job.ticker} failed permanently after ${job.maxRetries + 1} attempts`);
      }
    } finally {
      this.processingCount--;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async getStatus() {
    return {
      running: this.running,
      processingCount: this.processingCount,
      maxConcurrent: this.maxConcurrent,
    };
  }
}

export const queueWorker = new QueueWorker();

// Export class for testing
export { QueueWorker };
