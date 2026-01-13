/**
 * Background job to update price history for all holdings (simulated and real)
 * Runs every 5 minutes to add new price points to the chart
 */

import type { IStorage } from '../storage';
import { finnhubService } from '../finnhubService';
import { isMarketOpen } from './utils';
import { createLogger } from '../logger';
const log = createLogger('jobs');

const FIVE_MINUTES = 5 * 60 * 1000;

export async function runHoldingsPriceHistoryUpdate(storage: IStorage): Promise<void> {
  try {
    // Skip if market is closed
    if (!isMarketOpen()) {
      log.info("[HoldingsHistory] Market is closed, skipping price update");
      return;
    }
    
    log.info("[HoldingsHistory] Starting holdings price history update...");
    
    // Get all users and their holdings
    const users = await storage.getUsers();
    const allHoldings = [];
    for (const user of users) {
      const userHoldings = await storage.getPortfolioHoldings(user.id);
      allHoldings.push(...userHoldings);
    }
    const holdings = allHoldings;
    
    if (holdings.length === 0) {
      log.info("[HoldingsHistory] No holdings to update");
      return;
    }

    // Get unique tickers from holdings
    const tickerSet = new Set(holdings.map(h => h.ticker));
    const tickers = Array.from(tickerSet);
    log.info(`[HoldingsHistory] Updating price history for ${tickers.length} tickers`);

    // Fetch current prices for all tickers
    const quotes = await finnhubService.getBatchQuotes(tickers);
    
    // Current timestamp
    const now = new Date().toISOString();
    
    let successCount = 0;
    
    // Update price history for each ticker (iterate users once, update their stocks)
    for (const ticker of tickers) {
      const quote = quotes.get(ticker);
      if (!quote || !quote.currentPrice) {
        continue;
      }

      // Update each user's stock with this ticker
      for (const user of users) {
        const userStocks = await storage.getStocks(user.id);
        const stock = userStocks.find(s => s.ticker === ticker);
        if (!stock) continue;

        // Get existing price history
        const priceHistory = stock.priceHistory || [];
        
        // Always add a new price point with current timestamp
        priceHistory.push({
          date: now,
          price: quote.currentPrice,
        });
        
        // Update this user's stock with new price history
        await storage.updateStock(user.id, ticker, {
          priceHistory,
          currentPrice: quote.currentPrice.toString(),
        });
      }
      
      successCount++;
    }

    log.info(`[HoldingsHistory] Successfully updated ${successCount}/${tickers.length} stocks with new price points`);
  } catch (error) {
    console.error("[HoldingsHistory] Error updating holdings price history:", error);
  }
}

/**
 * Start the holdings price history update job scheduler
 * Runs immediately on startup, then every 5 minutes
 */
export function startHoldingsPriceHistoryJob(storage: IStorage): void {
  // Run immediately on startup
  runHoldingsPriceHistoryUpdate(storage).catch(err => {
    console.error("[HoldingsHistory] Initial update failed:", err);
  });

  // Then run every 5 minutes
  setInterval(() => {
    runHoldingsPriceHistoryUpdate(storage);
  }, FIVE_MINUTES);
  
  log.info("[HoldingsHistory] Background job started - updating price history every 5 minutes");
}
