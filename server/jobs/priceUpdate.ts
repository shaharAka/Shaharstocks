/**
 * Background job to update stock prices every 5 minutes
 * Only updates stocks with pending "Buy" recommendations
 */

import type { IStorage } from '../storage';
import { finnhubService } from '../finnhubService';
import { isMarketOpen } from './utils';
import { createLogger } from '../logger';

const log = createLogger('jobs:priceUpdate');

const FIVE_MINUTES = 5 * 60 * 1000;

export async function runPriceUpdate(storage: IStorage): Promise<void> {
  try {
    // Skip if market is closed
    if (!isMarketOpen()) {
      log("[PriceUpdate] Market is closed, skipping stock price update");
      return;
    }
    
    log("[PriceUpdate] Starting stock price update job...");
    
    // Get unique pending tickers across all users (per-user isolation)
    const tickers = await storage.getAllUniquePendingTickers();

    if (tickers.length === 0) {
      log("[PriceUpdate] No pending stocks to update");
      return;
    }

    log(`[PriceUpdate] Updating prices for ${tickers.length} unique pending tickers across all users`);

    // Fetch quotes, market cap, company info, and news for all pending stocks
    const stockData = await finnhubService.getBatchStockData(tickers);

    // Update each ticker globally (across all users) with shared market data
    let successCount = 0;
    for (const ticker of tickers) {
      const data = stockData.get(ticker);
      if (data) {
        // Update all instances of this ticker (across all users) with the same market data
        const updatedCount = await storage.updateStocksByTickerGlobally(ticker, {
          currentPrice: data.quote.currentPrice.toString(),
          previousClose: data.quote.previousClose.toString(),
          marketCap: data.marketCap ? `$${Math.round(data.marketCap)}M` : null,
          description: data.companyInfo?.description || null,
          industry: data.companyInfo?.industry || null,
          country: data.companyInfo?.country || null,
          webUrl: data.companyInfo?.webUrl || null,
          ipo: data.companyInfo?.ipo || null,
          news: data.news || [],
          insiderSentimentMspr: data.insiderSentiment?.mspr.toString() || null,
          insiderSentimentChange: data.insiderSentiment?.change.toString() || null,
        });
        if (updatedCount > 0) {
          successCount++;
          log(`[PriceUpdate] Updated ${ticker}: ${updatedCount} instances across users`);
        }
      }
    }

    log(`[PriceUpdate] Successfully updated ${successCount}/${tickers.length} tickers`);
  } catch (error) {
    console.error("[PriceUpdate] Error updating stock prices:", error);
  }
}

/**
 * Start the price update job scheduler
 * Runs immediately on startup, then every 5 minutes
 */
export function startPriceUpdateJob(storage: IStorage): void {
  // Run immediately on startup
  runPriceUpdate(storage).catch(err => {
    console.error("[PriceUpdate] Initial update failed:", err);
  });

  // Then run every 5 minutes
  setInterval(() => {
    runPriceUpdate(storage);
  }, FIVE_MINUTES);
  
  log("[PriceUpdate] Background job started - updating every 5 minutes");
}
