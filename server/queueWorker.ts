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

  private async processLoop() {
    console.log("[QueueWorker] ✅ Process loop started, running =", this.running);
    
    let iterationCount = 0;
    while (this.running) {
      iterationCount++;
      console.log(`[QueueWorker] 🔄 Loop iteration ${iterationCount}, processingCount = ${this.processingCount}`);
      
      try {
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

      // Check for insider trading data
      console.log(`[QueueWorker] 🔍 Checking for insider trading data for ${job.ticker}...`);
      const insiderTradingStrength = await (async () => {
        try {
          const stock = await storage.getStock(job.ticker);
          console.log(`[QueueWorker] Stock data retrieved: ${stock ? 'found' : 'not found'}`);
          if (stock && stock.recommendation === "buy") {
            return {
              recentPurchases: 1,
              totalValue: stock.currentPrice ? `$${parseFloat(stock.currentPrice).toFixed(2)}` : "N/A",
              confidence: stock.confidenceScore?.toString() || "Medium"
            };
          }
          return undefined;
        } catch (error) {
          console.error(`[QueueWorker] Error getting insider trading data:`, error);
          return undefined;
        }
      })();
      console.log(`[QueueWorker] ✅ Insider trading check complete`);
      
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
      // Prefer: 1) Stock record from DB, 2) Alpha Vantage industry, 3) Alpha Vantage sector, 4) undefined
      const stock = await storage.getStock(job.ticker);
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

      // Mark macro phase complete after obtaining/creating macro analysis
      await storage.markStockAnalysisPhaseComplete(job.ticker, 'macro');
      console.log(`[QueueWorker] ✅ Macro analysis phase complete for ${job.ticker}`);

      // PHASE 3: Micro AI Analysis (analyze company fundamentals)
      await this.updateProgress(job.id, job.ticker, "micro_analysis", {
        phase: "micro",
        substep: "Running fundamental analysis with AI"
      });

      // Run micro AI analysis
      console.log(`[QueueWorker] Running micro AI analysis for ${job.ticker}...`);
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
      console.log(`[QueueWorker] ✅ Micro analysis complete (score: ${analysis.confidenceScore}/100)`);
      
      // Mark micro phase complete after AI analysis finishes
      await storage.markStockAnalysisPhaseComplete(job.ticker, 'micro');
      console.log(`[QueueWorker] ✅ Micro analysis phase complete for ${job.ticker}`);

      // PHASE 4: Score Integration
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
        integratedScore: integratedScore,
      });

      // Set combined flag after integrated score is saved
      await storage.markStockAnalysisPhaseComplete(job.ticker, 'combined');
      console.log(`[QueueWorker] ✅ All analysis phases complete for ${job.ticker}`);

      // Create notifications for high-value opportunities
      // Buy opportunities: score > 70
      // Sell opportunities: score < 30
      const isBuyOpportunity = analysis.recommendation === 'buy' && integratedScore > 70;
      const isSellOpportunity = analysis.recommendation === 'sell' && integratedScore < 30;
      
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
