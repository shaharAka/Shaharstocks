/**
 * Background job to clean up expired stock recommendations
 * Runs daily to delete:
 * - Pending stocks older than 10 days
 * - Rejected stocks older than 10 days
 */

import type { IStorage } from '../storage';

export async function runStaleStockCleanup(storage: IStorage): Promise<void> {
  try {
    console.log('[CLEANUP JOB] Starting daily stale stock cleanup...');
    
    // Delete pending stocks older than 10 days
    const pendingResult = await storage.deleteExpiredPendingStocks(10);
    
    if (pendingResult.count > 0) {
      console.log(`[CLEANUP JOB] ✅ Successfully deleted ${pendingResult.count} expired pending stocks`);
      console.log(`[CLEANUP JOB] Deleted pending tickers: ${pendingResult.tickers.join(', ')}`);
    } else {
      console.log('[CLEANUP JOB] ✅ No expired pending stocks to delete');
    }

    // Delete rejected stocks older than 10 days
    const rejectedResult = await storage.deleteExpiredRejectedStocks(10);
    
    if (rejectedResult.count > 0) {
      console.log(`[CLEANUP JOB] ✅ Successfully deleted ${rejectedResult.count} expired rejected stocks`);
      console.log(`[CLEANUP JOB] Deleted rejected tickers: ${rejectedResult.tickers.join(', ')}`);
    } else {
      console.log('[CLEANUP JOB] ✅ No expired rejected stocks to delete');
    }
  } catch (error) {
    console.error('[CLEANUP JOB] ❌ Cleanup failed:', error);
    // Don't throw - let the job continue running on schedule
  }
}

/**
 * Start the cleanup job scheduler
 * Runs immediately on startup, then every 24 hours
 */
export function startCleanupScheduler(storage: IStorage): void {
  // Run immediately on startup
  runStaleStockCleanup(storage);
  
  // Then run every 24 hours (86400000 ms)
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  setInterval(() => {
    runStaleStockCleanup(storage);
  }, TWENTY_FOUR_HOURS);
  
  console.log('[CLEANUP SCHEDULER] ✅ Started daily cleanup scheduler (runs every 24 hours)');
}
