// Temporary script to queue AI analysis jobs for sell stocks without jobs
const { DatabaseStorage } = require('./dist/server/storage.js');
const storage = new DatabaseStorage();

(async () => {
  try {
    const { db } = require('./dist/server/db.js');
    const { stocks, aiAnalysisJobs } = require('./dist/shared/schema.js');
    const { eq, and, sql } = require('drizzle-orm');
    
    console.log('[QueueSells] Finding sell stocks without AI jobs...');
    
    const sellStocksWithoutJobs = await db
      .select({ ticker: stocks.ticker })
      .from(stocks)
      .where(
        and(
          eq(stocks.recommendation, 'sell'),
          sql`NOT EXISTS (
            SELECT 1 FROM ai_analysis_jobs
            WHERE ai_analysis_jobs.ticker = ${stocks.ticker}
            AND ai_analysis_jobs.status IN ('pending', 'processing', 'completed')
          )`
        )
      );

    console.log(`[QueueSells] Found ${sellStocksWithoutJobs.length} sell stocks without jobs`);

    const queuedJobs = [];
    for (const stock of sellStocksWithoutJobs) {
      try {
        const job = await storage.enqueueAnalysisJob(stock.ticker, 'manual_queue', 'normal');
        queuedJobs.push(stock.ticker);
        console.log(`[QueueSells] ✓ Queued job for ${stock.ticker}`);
      } catch (error) {
        console.error(`[QueueSells] ✗ Failed to queue ${stock.ticker}:`, error.message);
      }
    }

    console.log(`[QueueSells] Successfully queued ${queuedJobs.length} jobs`);
    console.log(`[QueueSells] Tickers:`, queuedJobs.join(', '));
    process.exit(0);
  } catch (error) {
    console.error('[QueueSells] Fatal error:', error);
    process.exit(1);
  }
})();
