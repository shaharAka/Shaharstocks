/**
 * Background job to automatically analyze new stock recommendations with AI
 * Runs every 10 minutes to analyze pending stocks that don't have analysis yet
 */

import type { IStorage } from '../storage';
import { stockService } from '../stockService';
import { secEdgarService } from '../secEdgarService';
import { aiAnalysisService } from '../aiAnalysisService';
import { createLogger } from '../logger';
const log = createLogger('jobs');

const TEN_MINUTES = 10 * 60 * 1000;

let isRunning = false; // Reentrancy guard

export async function runAIAnalysis(storage: IStorage): Promise<void> {
  // Prevent overlapping runs
  if (isRunning) {
    log.info("[AIAnalysis] Skipping - previous job still running");
    return;
  }
  
  isRunning = true;
  try {
    log.info("[AIAnalysis] Checking for stocks needing AI analysis...");
    
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
      log.info("[AIAnalysis] No pending stocks to analyze");
      return;
    }
    
    const buyCount = pendingStocks.filter(s => s.recommendation === 'buy').length;
    const sellCount = pendingStocks.filter(s => s.recommendation === 'sell').length;
    log.info(`[AIAnalysis] Found ${pendingStocks.length} pending stocks (${buyCount} buys, ${sellCount} sells), checking for missing analyses...`);
    
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
        log.info(`[AIAnalysis] Running multi-signal analysis for ${stock.ticker}...`);
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
        log.info(`[AIAnalysis] Fetching SEC filings and comprehensive fundamentals for ${stock.ticker}...`);
        
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
        log.info(`[AIAnalysis] Successfully analyzed ${stock.ticker} (Score: ${analysis.financialHealth.score}/100, Rating: ${analysis.overallRating})`);
        
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
    
    log.info(`[AIAnalysis] Job complete: analyzed ${analyzedCount}, skipped ${skippedCount}, errors ${errorCount}`);
  } catch (error) {
    console.error("[AIAnalysis] Error in AI analysis job:", error);
  } finally {
    isRunning = false; // Release lock
  }
}

/**
 * Start the AI analysis job scheduler
 * Runs immediately on startup, then every 10 minutes
 */
export function startAIAnalysisJob(storage: IStorage): void {
  // Run immediately on startup
  runAIAnalysis(storage).catch(err => {
    console.error("[AIAnalysis] Initial analysis failed:", err);
  });

  // Then run every 10 minutes
  setInterval(() => {
    runAIAnalysis(storage);
  }, TEN_MINUTES);
  
  log.info("[AIAnalysis] Background job started - analyzing new stocks every 10 minutes");
}
