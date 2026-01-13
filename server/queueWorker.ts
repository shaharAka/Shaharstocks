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
import type { AiAnalysisJob } from "@shared/schema";

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

    // Verify database connection before starting
    try {
      const { db } = await import("./db");
      const { sql } = await import("drizzle-orm");
      // Test query to verify table exists
      await db.execute(sql`SELECT 1 FROM ai_analysis_jobs LIMIT 1`);
      console.log("[QueueWorker] Database connection verified");
    } catch (error: any) {
      if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
        console.warn("[QueueWorker] ⚠️  ai_analysis_jobs table not ready, will retry in process loop");
      } else {
        console.error("[QueueWorker] Database connection check failed:", error);
        // Don't throw - let the process loop handle retries
      }
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
    } catch (error: any) {
      // Handle database errors gracefully - don't spam logs for missing tables
      if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
        console.warn("[QueueWorker] ⚠️  Database table not ready for cleanup, skipping...");
      } else {
        console.error("[QueueWorker] Error cleaning up stuck jobs:", error);
      }
      return 0;
    }
  }

  private async processLoop() {
    console.log("[QueueWorker] ✅ Process loop started");
    
    while (this.running) {
      try {
        // Periodically clean up stuck processing jobs
        await this.cleanupStuckJobs();
        
        // Check if we can process more jobs
        if (this.processingCount < this.maxConcurrent) {
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
            // Queue is empty, wait longer before checking again
            await this.sleep(this.idleInterval);
          }
        } else {
          // Max concurrent jobs reached, wait a bit
          await this.sleep(this.pollInterval);
        }
      } catch (error: any) {
        // Handle database connection errors gracefully
        if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
          console.warn("[QueueWorker] ⚠️  Database table not ready, waiting...", error.message);
          // Wait longer if table doesn't exist (might be a migration issue)
          await this.sleep(5000);
        } else {
          console.error("[QueueWorker] ❌ Error in process loop:", error);
          await this.sleep(this.pollInterval);
        }
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

      // Get stock info for context (no macro analysis)
      const stock = await storage.getAnyStockForTicker(job.ticker);

      // PHASE 2: Calculate Signal Score
      await this.updateProgress(job.id, job.ticker, "calculating_score", {
        phase: "calculating_score",
        substep: "Calculating signal score"
      });

      // Run AI analysis - produces signal score (1-100) + playbook directly
      console.log(`[QueueWorker] Running AI analysis for ${job.ticker}...`);
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
      });
      
      // Use AI's confidence score directly as the signal score (1-100)
      // The AI already considers all factors including macro context
      const integratedScore = Math.max(1, Math.min(100, Math.round(analysis.confidenceScore)));
      console.log(`[QueueWorker] ✅ Signal score calculated: ${integratedScore}/100`);

      // PHASE 3: Generate Playbook Report
      await this.updateProgress(job.id, job.ticker, "generating_playbook", {
        phase: "integration",
        substep: "Generating playbook report"
      });
      console.log(`[QueueWorker] 📝 Generating playbook report for ${job.ticker}...`);

      // Save analysis to database with playbook
      console.log(`[QueueWorker] 💾 Saving analysis with playbook to database...`);
      await storage.saveStockAnalysis({
        ticker: analysis.ticker,
        status: "completed",
        overallRating: analysis.overallRating,
        confidenceScore: analysis.confidenceScore,
        summary: analysis.summary,
        financialHealthScore: analysis.financialHealth?.score,
        strengths: analysis.financialHealth?.strengths,
        weaknesses: analysis.financialHealth?.weaknesses,
        redFlags: analysis.financialHealth?.redFlags,
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
        recommendation: analysis.playbook || analysis.recommendation, // Store playbook in recommendation field
        analyzedAt: new Date(analysis.analyzedAt),
        secFilingUrl: secFilingData?.filingUrl,
        secFilingType: secFilingData?.formType,
        secFilingDate: secFilingData?.filingDate,
        secCik: secFilingData?.cik,
        managementDiscussion: secFilingData?.managementDiscussion,
        riskFactors: secFilingData?.riskFactors,
        businessOverview: secFilingData?.businessOverview,
        fundamentalData: comprehensiveFundamentals,
        integratedScore: integratedScore, // AI signal score directly
        // Entry Timing Assessment
        entryTimingStatus: analysis.entryTiming?.status,
        entryTimingPriceMove: analysis.entryTiming?.priceMoveSinceInsider,
        entryTimingDaysOld: analysis.entryTiming?.daysOld,
        entryTimingAssessment: analysis.entryTiming?.assessment,
        // Sector Analysis
        sectorName: analysis.sectorAnalysis?.sector,
        sectorOutlook: analysis.sectorAnalysis?.sectorOutlook,
        sectorNote: analysis.sectorAnalysis?.sectorNote,
        // Trade Parameters (Stop Loss & Profit Target) - validate as numbers before saving
        stopLoss: typeof analysis.tradeParameters?.stopLoss === 'number' && isFinite(analysis.tradeParameters.stopLoss) 
          ? String(analysis.tradeParameters.stopLoss) : undefined,
        profitTarget: typeof analysis.tradeParameters?.profitTarget === 'number' && isFinite(analysis.tradeParameters.profitTarget)
          ? String(analysis.tradeParameters.profitTarget) : undefined,
        stopLossPercent: typeof analysis.tradeParameters?.stopLossPercent === 'number' && isFinite(analysis.tradeParameters.stopLossPercent)
          ? String(analysis.tradeParameters.stopLossPercent) : undefined,
        profitTargetPercent: typeof analysis.tradeParameters?.profitTargetPercent === 'number' && isFinite(analysis.tradeParameters.profitTargetPercent)
          ? String(analysis.tradeParameters.profitTargetPercent) : undefined,
      });

      // Mark all phases complete (for backward compatibility with UI)
      await storage.markStockAnalysisPhaseComplete(job.ticker, 'macro');
      await storage.markStockAnalysisPhaseComplete(job.ticker, 'micro');
      await storage.markStockAnalysisPhaseComplete(job.ticker, 'combined');
      console.log(`[QueueWorker] ✅ Analysis complete for ${job.ticker}`);

      // Create notifications for high-value opportunities (high confidence signals)
      // High score BUY: score >= 80 with BUY rating (only the best opportunities)
      // High score SELL: score >= 80 with SELL/AVOID rating (only the strongest sell signals)
      const isBuyOpportunity = (analysis.overallRating === 'buy' || analysis.overallRating === 'strong_buy') && integratedScore >= 80;
      const isSellOpportunity = (analysis.overallRating === 'sell' || analysis.overallRating === 'avoid' || analysis.overallRating === 'strong_avoid') && integratedScore >= 80;
      
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

      // Determine if we should retry
      if (job.retryCount < job.maxRetries) {
        // Calculate exponential backoff: 1min, 5min, 30min
        const backoffMinutes = Math.pow(5, job.retryCount); // 1, 5, 25 minutes
        const scheduledAt = new Date(Date.now() + backoffMinutes * 60 * 1000);
        
        await storage.updateJobStatus(job.id, "pending", {
          retryCount: job.retryCount + 1,
          scheduledAt,
          errorMessage,
          lastError: errorMessage, // Set lastError for frontend visibility
        });
        
        console.log(`[QueueWorker] Job ${job.id} will retry in ${backoffMinutes} minutes (attempt ${job.retryCount + 2}/${job.maxRetries + 1})`);
      } else {
        // Max retries exceeded, mark as failed
        await storage.updateJobStatus(job.id, "failed", {
          errorMessage,
          lastError: errorMessage, // Set lastError for frontend visibility
        });
        
        console.log(`[QueueWorker] Job ${job.id} failed permanently after ${job.maxRetries + 1} attempts`);
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
