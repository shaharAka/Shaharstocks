/**
 * Background job to clean up expired pending stock recommendations
 * Runs daily to delete pending stocks older than 10 days
 */

import type { IStorage } from '../storage';

export async function runStaleStockCleanup(storage: IStorage): Promise<void> {
  try {
    console.log('[CLEANUP JOB] Starting daily stale stock cleanup...');
    
    // Delete pending stocks older than 10 days
    const result = await storage.deleteExpiredPendingStocks(10);
    
    if (result.count > 0) {
      console.log(`[CLEANUP JOB] ✅ Successfully deleted ${result.count} expired pending stocks`);
      console.log(`[CLEANUP JOB] Deleted tickers: ${result.tickers.join(', ')}`);
    } else {
      console.log('[CLEANUP JOB] ✅ No expired pending stocks to delete');
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
