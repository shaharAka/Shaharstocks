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
      // Fetch all required data for analysis
      console.log(`[QueueWorker] Fetching data for ${job.ticker}...`);
      
      const [companyOverview, balanceSheet, incomeStatement, cashFlow, dailyPrices] = await Promise.all([
        stockService.getCompanyOverview(job.ticker),
        stockService.getBalanceSheet(job.ticker),
        stockService.getIncomeStatement(job.ticker),
        stockService.getCashFlow(job.ticker),
        stockService.getDailyPrices(job.ticker, 60),
      ]);

      // Fetch technical indicators and news
      const [technicalIndicators, newsSentiment] = await Promise.all([
        stockService.getTechnicalIndicators(job.ticker, dailyPrices),
        stockService.getNewsSentiment(job.ticker),
      ]);

      console.log(`[QueueWorker] 📊 Analyzing price-news correlation for ${job.ticker}...`);
      const priceNewsCorrelation = stockService.analyzePriceNewsCorrelation(dailyPrices, newsSentiment);
      console.log(`[QueueWorker] ✅ Price-news correlation complete`);

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

      // Calculate integrated score (micro score × macro factor), clamped to 0-100
      const macroFactor = macroAnalysis.macroFactor ? parseFloat(macroAnalysis.macroFactor) : 1.0;
      const rawIntegratedScore = analysis.confidenceScore * macroFactor;
      const integratedScore = Math.max(0, Math.min(100, Math.round(rawIntegratedScore)));
      console.log(`[QueueWorker] Score integration: Micro ${analysis.confidenceScore} × Macro ${macroFactor} = ${rawIntegratedScore.toFixed(1)} → Clamped to ${integratedScore}/100`);

      // Save analysis to database with macro integration
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

      // Mark job as completed
      await storage.updateJobStatus(job.id, "completed");
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`[QueueWorker] ✅ Job ${job.id} completed successfully in ${duration}s (${job.ticker}: ${analysis.overallRating}, score: ${analysis.confidenceScore})`);

    } catch (error) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[QueueWorker] ❌ Job ${job.id} failed after ${duration}s:`, errorMessage);

      // Determine if we should retry
      if (job.retryCount < job.maxRetries) {
        // Calculate exponential backoff: 1min, 5min, 30min
        const backoffMinutes = Math.pow(5, job.retryCount); // 1, 5, 25 minutes
        const scheduledAt = new Date(Date.now() + backoffMinutes * 60 * 1000);
        
        await storage.updateJobStatus(job.id, "pending", {
          retryCount: job.retryCount + 1,
          scheduledAt,
          errorMessage,
        });
        
        console.log(`[QueueWorker] Job ${job.id} will retry in ${backoffMinutes} minutes (attempt ${job.retryCount + 2}/${job.maxRetries + 1})`);
      } else {
        // Max retries exceeded, mark as failed
        await storage.updateJobStatus(job.id, "failed", {
          errorMessage,
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
