/**
 * Background job to clean up old stock recommendations
 * - Rejects pending stocks with insider trade dates older than 2 weeks
 * - Deletes rejected stocks that were rejected more than 2 weeks ago
 */

import type { IStorage } from '../storage';
import { createLogger } from '../logger';
const log = createLogger('jobs');

const ONE_HOUR = 60 * 60 * 1000;
const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;

export async function runRecommendationCleanup(storage: IStorage): Promise<void> {
  try {
    log("[Cleanup] Starting recommendation cleanup job...");
    
    // Get all users to process their stocks
    const users = await storage.getUsers();
    const now = new Date();
    let rejectedCount = 0;
    let deletedCount = 0;
    let totalStocksChecked = 0;

    for (const user of users) {
      const stocks = await storage.getStocks(user.id);
      totalStocksChecked += stocks.length;

      // 1. Reject old pending recommendations (older than 2 weeks by insider trade date, both buy and sell)
      const pendingStocks = stocks.filter(
        stock => stock.recommendationStatus === "pending" && 
                 stock.insiderTradeDate
      );

      for (const stock of pendingStocks) {
        try {
          // Parse date in DD.MM.YYYY format
          const dateParts = stock.insiderTradeDate!.split(' ')[0].split('.');
          if (dateParts.length >= 3) {
            const day = parseInt(dateParts[0], 10);
            const month = parseInt(dateParts[1], 10) - 1; // JS months are 0-indexed
            const year = parseInt(dateParts[2], 10);
            
            const tradeDate = new Date(year, month, day);
            const ageMs = now.getTime() - tradeDate.getTime();

            // If trade is older than 2 weeks, reject the recommendation
            if (ageMs > TWO_WEEKS_MS) {
              await storage.updateStock(user.id, stock.ticker, {
                recommendationStatus: "rejected",
                rejectedAt: new Date()
              });
              rejectedCount++;
              log(`[Cleanup] Rejected ${stock.ticker} for user ${user.id} - trade date ${stock.insiderTradeDate} is older than 2 weeks`);
            }
          }
        } catch (parseError) {
          console.error(`[Cleanup] Error parsing date for ${stock.ticker}:`, parseError);
        }
      }

      // 2. Delete rejected stocks that were rejected more than 2 weeks ago
      const rejectedStocks = stocks.filter(
        stock => stock.recommendationStatus === "rejected" && stock.rejectedAt
      );

      for (const stock of rejectedStocks) {
        try {
          const rejectedDate = new Date(stock.rejectedAt!);
          const ageMs = now.getTime() - rejectedDate.getTime();

          // If rejected more than 2 weeks ago, delete it
          if (ageMs > TWO_WEEKS_MS) {
            await storage.deleteStock(user.id, stock.ticker);
            deletedCount++;
            log(`[Cleanup] Deleted ${stock.ticker} for user ${user.id} - was rejected on ${stock.rejectedAt}`);
          }
        } catch (deleteError) {
          console.error(`[Cleanup] Error deleting rejected stock ${stock.ticker}:`, deleteError);
        }
      }
    }

    log(`[Cleanup] Rejected ${rejectedCount} old recommendations, deleted ${deletedCount} old rejected stocks (checked ${totalStocksChecked} total stocks across ${users.length} users)`);
  } catch (error) {
    console.error("[Cleanup] Error in cleanup job:", error);
  }
}

/**
 * Start the recommendation cleanup job scheduler
 * Runs immediately on startup, then every hour
 */
export function startRecommendationCleanupJob(storage: IStorage): void {
  // Run immediately on startup
  runRecommendationCleanup(storage).catch(err => {
    console.error("[Cleanup] Initial cleanup failed:", err);
  });

  // Then run every hour
  setInterval(() => {
    runRecommendationCleanup(storage);
  }, ONE_HOUR);
  
  log("[Cleanup] Background job started - cleaning up old recommendations every hour");
}
