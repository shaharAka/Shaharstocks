/**
 * Background job to reconcile incomplete AI analyses every hour
 * Finds stocks with missing analysis flags and re-queues them
 */

import type { IStorage } from '../storage';
import { createLogger } from '../logger';
const log = createLogger('jobs');

const ONE_HOUR = 60 * 60 * 1000;

let isRunning = false; // Reentrancy guard

export async function runAnalysisReconciliation(storage: IStorage): Promise<void> {
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

/**
 * Start the analysis reconciliation job scheduler
 * Runs immediately on startup, then every hour
 */
export function startAnalysisReconciliationJob(storage: IStorage): void {
  // Run immediately on startup
  runAnalysisReconciliation(storage).catch(err => {
    console.error("[Reconciliation] Initial reconciliation failed:", err);
  });

  // Then run every hour
  setInterval(() => {
    runAnalysisReconciliation(storage);
  }, ONE_HOUR);
  
  log("[Reconciliation] Background job started - reconciling incomplete analyses every hour");
}
