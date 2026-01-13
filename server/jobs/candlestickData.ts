/**
 * Background job to fetch 2 weeks of candlestick data for all pending purchase recommendations
 * Runs once a day (after market close)
 */

import type { IStorage } from '../storage';
import { stockService } from '../stockService';
import { createLogger } from '../logger';
const log = createLogger('jobs');

const ONE_DAY = 24 * 60 * 60 * 1000;

export async function runCandlestickDataFetch(storage: IStorage): Promise<void> {
  try {
    log("[CandlestickData] Starting candlestick data fetch job...");
    
    // Get unique tickers that need candlestick data (shared table - one record per ticker)
    const tickers = await storage.getAllTickersNeedingCandlestickData();

    if (tickers.length === 0) {
      log("[CandlestickData] No stocks need candlestick data");
      return;
    }

    log(`[CandlestickData] Fetching candlestick data for ${tickers.length} unique tickers (shared storage)`);

    // Fetch candlestick data for each ticker (with rate limiting handled by stockService)
    let successCount = 0;
    let errorCount = 0;
    const errors: { ticker: string; error: string }[] = [];
    
    for (const ticker of tickers) {
      try {
        log(`[CandlestickData] Fetching data for ${ticker}...`);
        const candlesticks = await stockService.getCandlestickData(ticker);
        
        if (candlesticks && candlesticks.length > 0) {
          // Upsert into shared stockCandlesticks table (one record per ticker, reused across all users)
          await storage.upsertCandlesticks(ticker, candlesticks.map(c => ({
            date: c.date,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
            volume: c.volume
          })));
          log(`[CandlestickData] ✓ ${ticker} - fetched ${candlesticks.length} days, stored in shared table`);
          successCount++;
        } else {
          log(`[CandlestickData] ⚠️ ${ticker} - no candlestick data returned`);
          errorCount++;
          errors.push({ ticker, error: "No data returned from API" });
        }
      } catch (error: any) {
        errorCount++;
        const errorMsg = error.message || String(error);
        errors.push({ ticker, error: errorMsg });
        console.error(`[CandlestickData] ✗ ${ticker} - Error: ${errorMsg}`);
      }
    }

    log(`[CandlestickData] Successfully updated ${successCount}/${tickers.length} tickers`);
    
    if (errorCount > 0) {
      log(`[CandlestickData] Failed to fetch data for ${errorCount} stocks:`);
      errors.forEach(({ ticker, error }) => {
        log(`  - ${ticker}: ${error}`);
      });
    }
  } catch (error) {
    console.error("[CandlestickData] Error in candlestick data job:", error);
  }
}

/**
 * Start the candlestick data fetch job scheduler
 * Runs immediately on startup, then once a day
 */
export function startCandlestickDataJob(storage: IStorage): void {
  // Run immediately on startup
  runCandlestickDataFetch(storage).catch(err => {
    console.error("[CandlestickData] Initial fetch failed:", err);
  });

  // Then run once a day
  setInterval(() => {
    runCandlestickDataFetch(storage);
  }, ONE_DAY);
  
  log("[CandlestickData] Background job started - fetching once a day");
}
