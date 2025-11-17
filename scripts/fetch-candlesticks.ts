import { storage } from "../server/storage";
import { stockService } from "../server/stockService";

async function fetchCandlestickData() {
  try {
    console.log("[CandlestickData] Starting manual candlestick data fetch...");

    // Get unique tickers that need candlestick data (shared table - one record per ticker)
    const tickers = await storage.getAllTickersNeedingCandlestickData();

    if (tickers.length === 0) {
      console.log("[CandlestickData] No stocks need candlestick data");
      return;
    }

    console.log(`[CandlestickData] Fetching candlestick data for ${tickers.length} unique tickers (shared storage)`);

    let successCount = 0;
    let errorCount = 0;
    const errors: Array<{ ticker: string; error: string }> = [];

    // Fetch candlestick data for each ticker (with rate limiting handled by stockService)
    for (const ticker of tickers) {
      try {
        console.log(`[CandlestickData] Fetching data for ${ticker}...`);
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
          console.log(`[CandlestickData] ✓ ${ticker} - fetched ${candlesticks.length} days, stored in shared table`);
          successCount++;
        } else {
          console.log(`[CandlestickData] ⚠️ ${ticker} - no candlestick data returned`);
        }
      } catch (error) {
        errorCount++;
        const errorMsg = error instanceof Error ? error.message : String(error);
        errors.push({ ticker, error: errorMsg });
        console.error(`[CandlestickData] ✗ ${ticker} - Error: ${errorMsg}`);
      }
    }

    console.log(`[CandlestickData] Successfully updated ${successCount}/${tickers.length} tickers`);

    if (errorCount > 0) {
      console.log(`[CandlestickData] Failed to fetch data for ${errorCount} stocks:`);
      errors.forEach(({ ticker, error }) => {
        console.log(`  - ${ticker}: ${error}`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error("[CandlestickData] Error in candlestick data job:", error);
    process.exit(1);
  }
}

fetchCandlestickData();
