/**
 * Stock Repository
 * Handles user-specific stocks with complex cleanup operations
 * Note: updateStock depends on PortfolioHoldingRepository for updating holdings
 */

import { BaseRepository } from "./base";
import { 
  stocks, 
  aiAnalysisJobs, 
  stockAnalyses, 
  stockViews, 
  userStockStatuses, 
  stockComments,
  portfolioHoldings,
  trades,
  followedStocks,
  type Stock, 
  type InsertStock 
} from "@shared/schema";
import { eq, desc, sql, and, inArray, lt, or } from "drizzle-orm";
import { IPortfolioHoldingRepository } from "./portfolioHoldingRepository";

export interface IStockRepository {
  // Basic CRUD (per-user tenant isolation)
  getStocks(userId: string): Promise<Stock[]>;
  getStocksByUserStatus(userId: string, status: string): Promise<Stock[]>;
  getStock(userId: string, ticker: string): Promise<Stock | undefined>;
  getAnyStockForTicker(ticker: string): Promise<Stock | undefined>; // Global: Get ANY stock record for ticker
  getUserStocksForTicker(userId: string, ticker: string): Promise<Stock[]>; // Per-user: Get specific user's stocks for a ticker
  getAllStocksForTickerGlobal(ticker: string): Promise<Stock[]>; // Global: Get ALL users' stocks for a ticker
  getTransactionByCompositeKey(userId: string, ticker: string, insiderTradeDate: string, insiderName: string, recommendation: string): Promise<Stock | undefined>;
  createStock(stock: InsertStock): Promise<Stock>;
  updateStock(userId: string, ticker: string, updates: Partial<Stock>, portfolioHoldingRepository: IPortfolioHoldingRepository): Promise<Stock | undefined>;
  deleteStock(userId: string, ticker: string): Promise<boolean>;
  unrejectStock(userId: string, ticker: string): Promise<Stock | undefined>;
  
  // Cleanup operations (complex transaction-based deletions)
  deleteExpiredPendingStocks(ageInDays: number): Promise<{ count: number; tickers: string[] }>;
  deleteExpiredRejectedStocks(ageInDays: number): Promise<{ count: number; tickers: string[] }>;
  deleteStocksOlderThan(ageInDays: number): Promise<{ count: number; tickers: string[] }>;
  
  // Global helpers for background jobs (update shared market data across all users' stocks)
  getAllUniquePendingTickers(): Promise<string[]>;
  getAllUniqueTickersNeedingData(): Promise<string[]>;
  updateStocksByTickerGlobally(ticker: string, updates: Partial<Stock>): Promise<number>;
}

export class StockRepository extends BaseRepository implements IStockRepository {
  async getStocks(userId: string): Promise<Stock[]> {
    // Include active analysis job data for progress UI
    const results = await this.db
      .select({
        stock: stocks,
        analysisJob: aiAnalysisJobs,
      })
      .from(stocks)
      .leftJoin(
        aiAnalysisJobs,
        and(
          eq(stocks.ticker, aiAnalysisJobs.ticker),
          sql`${aiAnalysisJobs.status} IN ('pending', 'processing')`
        )
      )
      .where(eq(stocks.userId, userId));
    
    // Map results to include analysisJob data
    return results.map((row) => ({
      ...row.stock,
      analysisJob: row.analysisJob || undefined,
    } as any));
  }

  async getStocksByUserStatus(userId: string, status: string): Promise<Stock[]> {
    const results = await this.db
      .select({
        stock: stocks,
      })
      .from(stocks)
      .leftJoin(
        userStockStatuses,
        and(
          eq(stocks.ticker, userStockStatuses.ticker),
          eq(userStockStatuses.userId, userId)
        )
      )
      .where(
        and(
          eq(stocks.userId, userId), // CRITICAL: Filter stocks by userId for tenant isolation
          eq(userStockStatuses.status, status)
        )
      );
    
    return results.map(row => row.stock);
  }

  async getStock(userId: string, ticker: string): Promise<Stock | undefined> {
    // Handle multiple transactions per ticker by getting the most recent one
    const [stock] = await this.db
      .select()
      .from(stocks)
      .where(and(
        eq(stocks.userId, userId),
        eq(stocks.ticker, ticker)
      ))
      .orderBy(desc(stocks.lastUpdated))
      .limit(1);
    return stock;
  }

  async getAnyStockForTicker(ticker: string): Promise<Stock | undefined> {
    // Global: Returns ANY stock record for a ticker (for extracting shared metadata like industry)
    const [stock] = await this.db.select().from(stocks).where(eq(stocks.ticker, ticker)).limit(1);
    return stock;
  }

  async getUserStocksForTicker(userId: string, ticker: string): Promise<Stock[]> {
    // Per-user: Returns only this user's stocks for a ticker
    return await this.db.select().from(stocks).where(and(
      eq(stocks.userId, userId),
      eq(stocks.ticker, ticker)
    ));
  }

  async getAllStocksForTickerGlobal(ticker: string): Promise<Stock[]> {
    // Global: Returns ALL users' stocks for a ticker (used by AI worker for aggregation)
    return await this.db.select().from(stocks).where(eq(stocks.ticker, ticker));
  }

  async getTransactionByCompositeKey(
    userId: string,
    ticker: string,
    insiderTradeDate: string,
    insiderName: string,
    recommendation: string
  ): Promise<Stock | undefined> {
    const [stock] = await this.db
      .select()
      .from(stocks)
      .where(
        and(
          eq(stocks.userId, userId),
          eq(stocks.ticker, ticker),
          eq(stocks.insiderTradeDate, insiderTradeDate),
          eq(stocks.insiderName, insiderName),
          eq(stocks.recommendation, recommendation)
        )
      );
    return stock;
  }

  async createStock(stock: InsertStock): Promise<Stock> {
    const [newStock] = await this.db.insert(stocks).values(stock).returning();
    return newStock;
  }

  async updateStock(userId: string, ticker: string, updates: Partial<Stock>, portfolioHoldingRepository: IPortfolioHoldingRepository): Promise<Stock | undefined> {
    const [updatedStock] = await this.db
      .update(stocks)
      .set({ ...updates, lastUpdated: sql`now()` })
      .where(and(
        eq(stocks.userId, userId),
        eq(stocks.ticker, ticker)
      ))
      .returning();

    if (updatedStock) {
      // Update all holdings for this stock
      const holdings = await this.db
        .select()
        .from(portfolioHoldings)
        .where(and(
          eq(portfolioHoldings.userId, userId),
          eq(portfolioHoldings.ticker, ticker)
        ));
      
      for (const holding of holdings) {
        await portfolioHoldingRepository.updateHoldingValues(holding);
      }
    }

    return updatedStock;
  }

  async deleteStock(userId: string, ticker: string): Promise<boolean> {
    const result = await this.db.delete(stocks).where(and(
      eq(stocks.userId, userId),
      eq(stocks.ticker, ticker)
    ));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async unrejectStock(userId: string, ticker: string): Promise<Stock | undefined> {
    const [updatedStock] = await this.db
      .update(stocks)
      .set({ 
        recommendationStatus: "pending",
        rejectedAt: null,
        lastUpdated: sql`now()` 
      })
      .where(and(
        eq(stocks.userId, userId),
        eq(stocks.ticker, ticker)
      ))
      .returning();
    return updatedStock;
  }

  async deleteExpiredPendingStocks(ageInDays: number): Promise<{ count: number; tickers: string[] }> {
    const startTime = Date.now();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - ageInDays);
    
    this.log(`[CLEANUP] Starting cleanup: deleting pending stocks older than ${ageInDays} days (before ${cutoffDate.toISOString()})`);
    
    // Use transaction to ensure atomicity
    const result = await this.db.transaction(async (tx) => {
      // 1. Find candidate stocks (pending + older than cutoff)
      const candidates = await tx
        .select({ ticker: stocks.ticker })
        .from(stocks)
        .where(and(
          lt(stocks.lastUpdated, cutoffDate),
          eq(stocks.recommendationStatus, 'pending')
        ))
        .for('update'); // Lock rows for deletion
      
      if (candidates.length === 0) {
        this.log('[CLEANUP] No expired pending stocks found');
        return { count: 0, tickers: [] };
      }
      
      const candidateTickers = candidates.map(c => c.ticker);
      this.log(`[CLEANUP] Found ${candidateTickers.length} candidates: ${candidateTickers.join(', ')}`);
      
      // 2. Safety check: verify no portfolio holdings or trades exist for these tickers
      const holdingsCheck = await tx
        .select({ ticker: portfolioHoldings.ticker })
        .from(portfolioHoldings)
        .where(inArray(portfolioHoldings.ticker, candidateTickers));
      
      const tradesCheck = await tx
        .select({ ticker: trades.ticker })
        .from(trades)
        .where(inArray(trades.ticker, candidateTickers));
      
      if (holdingsCheck.length > 0 || tradesCheck.length > 0) {
        const conflictTickers = Array.from(new Set([
          ...holdingsCheck.map(h => h.ticker),
          ...tradesCheck.map(t => t.ticker)
        ]));
        this.log.error(`[CLEANUP] ABORT: Found portfolio/trade data for tickers: ${conflictTickers.join(', ')}`);
        throw new Error(`Cannot delete stocks with existing holdings/trades: ${conflictTickers.join(', ')}`);
      }
      
      // 3. Delete child records in safe order (ticker-based foreign keys)
      const deleteCounts = {
        aiJobs: 0,
        analyses: 0,
        views: 0,
        userStatuses: 0,
        comments: 0,
      };
      
      // Delete AI analysis jobs
      const deletedJobs = await tx.delete(aiAnalysisJobs)
        .where(inArray(aiAnalysisJobs.ticker, candidateTickers))
        .returning({ ticker: aiAnalysisJobs.ticker });
      deleteCounts.aiJobs = deletedJobs.length;
      
      // Delete stock analyses
      const deletedAnalyses = await tx.delete(stockAnalyses)
        .where(inArray(stockAnalyses.ticker, candidateTickers))
        .returning({ ticker: stockAnalyses.ticker });
      deleteCounts.analyses = deletedAnalyses.length;
      
      // Delete stock views
      const deletedViews = await tx.delete(stockViews)
        .where(inArray(stockViews.ticker, candidateTickers))
        .returning({ ticker: stockViews.ticker });
      deleteCounts.views = deletedViews.length;
      
      // Delete user stock statuses
      const deletedStatuses = await tx.delete(userStockStatuses)
        .where(inArray(userStockStatuses.ticker, candidateTickers))
        .returning({ ticker: userStockStatuses.ticker });
      deleteCounts.userStatuses = deletedStatuses.length;
      
      // Delete stock comments
      const deletedComments = await tx.delete(stockComments)
        .where(inArray(stockComments.ticker, candidateTickers))
        .returning({ ticker: stockComments.ticker });
      deleteCounts.comments = deletedComments.length;
      
      // 4. Finally, delete the stocks themselves
      const deletedStocks = await tx.delete(stocks)
        .where(inArray(stocks.ticker, candidateTickers))
        .returning({ ticker: stocks.ticker });
      
      this.log(`[CLEANUP] Deleted child records:`, deleteCounts);
      this.log(`[CLEANUP] Deleted ${deletedStocks.length} stocks: ${deletedStocks.map(s => s.ticker).join(', ')}`);
      
      return { count: deletedStocks.length, tickers: deletedStocks.map(s => s.ticker) };
    });
    
    const elapsedMs = Date.now() - startTime;
    this.log(`[CLEANUP] Cleanup completed in ${elapsedMs}ms - Deleted ${result.count} stocks`);
    
    return result;
  }

  async deleteExpiredRejectedStocks(ageInDays: number): Promise<{ count: number; tickers: string[] }> {
    const startTime = Date.now();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - ageInDays);
    
    this.log(`[CLEANUP] Starting cleanup: deleting rejected stocks older than ${ageInDays} days (before ${cutoffDate.toISOString()})`);
    
    // Use transaction to ensure atomicity
    const result = await this.db.transaction(async (tx) => {
      // 1. Find candidate stocks (rejected + older than cutoff)
      const candidates = await tx
        .select({ ticker: stocks.ticker })
        .from(stocks)
        .where(and(
          lt(stocks.rejectedAt, cutoffDate),
          sql`${stocks.rejectedAt} IS NOT NULL`,
          eq(stocks.recommendationStatus, 'rejected')
        ))
        .for('update'); // Lock rows for deletion
      
      if (candidates.length === 0) {
        this.log('[CLEANUP] No expired rejected stocks found');
        return { count: 0, tickers: [] };
      }
      
      const candidateTickers = candidates.map(c => c.ticker);
      this.log(`[CLEANUP] Found ${candidateTickers.length} rejected candidates: ${candidateTickers.join(', ')}`);
      
      // 2. Safety check: verify no portfolio holdings or trades exist for these tickers
      const holdingsCheck = await tx
        .select({ ticker: portfolioHoldings.ticker })
        .from(portfolioHoldings)
        .where(inArray(portfolioHoldings.ticker, candidateTickers));
      
      const tradesCheck = await tx
        .select({ ticker: trades.ticker })
        .from(trades)
        .where(inArray(trades.ticker, candidateTickers));
      
      if (holdingsCheck.length > 0 || tradesCheck.length > 0) {
        const conflictTickers = Array.from(new Set([
          ...holdingsCheck.map(h => h.ticker),
          ...tradesCheck.map(t => t.ticker)
        ]));
        this.log.error(`[CLEANUP] ABORT: Found portfolio/trade data for tickers: ${conflictTickers.join(', ')}`);
        throw new Error(`Cannot delete stocks with existing holdings/trades: ${conflictTickers.join(', ')}`);
      }
      
      // 3. Delete child records in safe order (ticker-based foreign keys)
      const deleteCounts = {
        aiJobs: 0,
        analyses: 0,
        views: 0,
        userStatuses: 0,
        comments: 0,
      };
      
      // Delete AI analysis jobs
      const deletedJobs = await tx.delete(aiAnalysisJobs)
        .where(inArray(aiAnalysisJobs.ticker, candidateTickers))
        .returning({ ticker: aiAnalysisJobs.ticker });
      deleteCounts.aiJobs = deletedJobs.length;
      
      // Delete stock analyses
      const deletedAnalyses = await tx.delete(stockAnalyses)
        .where(inArray(stockAnalyses.ticker, candidateTickers))
        .returning({ ticker: stockAnalyses.ticker });
      deleteCounts.analyses = deletedAnalyses.length;
      
      // Delete stock views
      const deletedViews = await tx.delete(stockViews)
        .where(inArray(stockViews.ticker, candidateTickers))
        .returning({ ticker: stockViews.ticker });
      deleteCounts.views = deletedViews.length;
      
      // Delete user stock statuses
      const deletedStatuses = await tx.delete(userStockStatuses)
        .where(inArray(userStockStatuses.ticker, candidateTickers))
        .returning({ ticker: userStockStatuses.ticker });
      deleteCounts.userStatuses = deletedStatuses.length;
      
      // Delete stock comments
      const deletedComments = await tx.delete(stockComments)
        .where(inArray(stockComments.ticker, candidateTickers))
        .returning({ ticker: stockComments.ticker });
      deleteCounts.comments = deletedComments.length;
      
      // 4. Finally, delete the stocks themselves
      const deletedStocks = await tx.delete(stocks)
        .where(inArray(stocks.ticker, candidateTickers))
        .returning({ ticker: stocks.ticker });
      
      this.log(`[CLEANUP] Deleted child records:`, deleteCounts);
      this.log(`[CLEANUP] Deleted ${deletedStocks.length} rejected stocks: ${deletedStocks.map(s => s.ticker).join(', ')}`);
      
      return { count: deletedStocks.length, tickers: deletedStocks.map(s => s.ticker) };
    });
    
    const elapsedMs = Date.now() - startTime;
    this.log(`[CLEANUP] Rejected stocks cleanup completed in ${elapsedMs}ms - Deleted ${result.count} stocks`);
    
    return result;
  }

  async deleteStocksOlderThan(ageInDays: number): Promise<{ count: number; tickers: string[] }> {
    const startTime = Date.now();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - ageInDays);
    const cutoffDateString = cutoffDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
    
    this.log(`[CLEANUP] Starting 2-week horizon cleanup: deleting stocks older than ${ageInDays} days (before ${cutoffDateString}), excluding followed stocks`);
    
    // Use transaction to ensure atomicity
    const result = await this.db.transaction(async (tx) => {
      // 1. Find candidate stocks (older than cutoff + NOT followed by any user)
      // insiderTradeDate is stored as text (YYYY-MM-DD), so compare with string
      const candidates = await tx
        .select({ ticker: stocks.ticker })
        .from(stocks)
        .leftJoin(followedStocks, eq(stocks.ticker, followedStocks.ticker))
        .where(and(
          lt(stocks.insiderTradeDate, cutoffDateString),
          sql`${followedStocks.ticker} IS NULL` // Not followed by anyone
        ));
      
      if (candidates.length === 0) {
        this.log('[CLEANUP] No old non-followed stocks found');
        return { count: 0, tickers: [] };
      }
      
      const candidateTickers = candidates.map(c => c.ticker);
      this.log(`[CLEANUP] Found ${candidateTickers.length} old non-followed stocks: ${candidateTickers.join(', ')}`);
      
      // 2. Safety check: verify no portfolio holdings or trades exist for these tickers
      const holdingsCheck = await tx
        .select({ ticker: portfolioHoldings.ticker })
        .from(portfolioHoldings)
        .where(inArray(portfolioHoldings.ticker, candidateTickers))
        .limit(1);
      
      if (holdingsCheck.length > 0) {
        this.log.warn(`[CLEANUP] WARNING: Found portfolio holdings for stocks marked for deletion. Skipping cleanup for safety.`);
        return { count: 0, tickers: [] };
      }
      
      const tradesCheck = await tx
        .select({ ticker: trades.ticker })
        .from(trades)
        .where(inArray(trades.ticker, candidateTickers))
        .limit(1);
      
      if (tradesCheck.length > 0) {
        this.log.warn(`[CLEANUP] WARNING: Found trades for stocks marked for deletion. Skipping cleanup for safety.`);
        return { count: 0, tickers: [] };
      }
      
      // 3. Delete all related child records first
      const deleteCounts = {
        aiJobs: 0,
        analyses: 0,
        views: 0,
        userStatuses: 0,
        comments: 0,
      };
      
      // Delete AI analysis jobs
      const deletedJobs = await tx.delete(aiAnalysisJobs)
        .where(inArray(aiAnalysisJobs.ticker, candidateTickers))
        .returning({ ticker: aiAnalysisJobs.ticker });
      deleteCounts.aiJobs = deletedJobs.length;
      
      // Delete stock analyses
      const deletedAnalyses = await tx.delete(stockAnalyses)
        .where(inArray(stockAnalyses.ticker, candidateTickers))
        .returning({ ticker: stockAnalyses.ticker });
      deleteCounts.analyses = deletedAnalyses.length;
      
      // Delete stock views
      const deletedViews = await tx.delete(stockViews)
        .where(inArray(stockViews.ticker, candidateTickers))
        .returning({ ticker: stockViews.ticker });
      deleteCounts.views = deletedViews.length;
      
      // Delete user stock statuses
      const deletedStatuses = await tx.delete(userStockStatuses)
        .where(inArray(userStockStatuses.ticker, candidateTickers))
        .returning({ ticker: userStockStatuses.ticker });
      deleteCounts.userStatuses = deletedStatuses.length;
      
      // Delete stock comments
      const deletedComments = await tx.delete(stockComments)
        .where(inArray(stockComments.ticker, candidateTickers))
        .returning({ ticker: stockComments.ticker });
      deleteCounts.comments = deletedComments.length;
      
      // 4. Finally, delete the stocks themselves
      const deletedStocks = await tx.delete(stocks)
        .where(inArray(stocks.ticker, candidateTickers))
        .returning({ ticker: stocks.ticker });
      
      this.log(`[CLEANUP] Deleted child records:`, deleteCounts);
      this.log(`[CLEANUP] Deleted ${deletedStocks.length} old stocks: ${deletedStocks.map(s => s.ticker).join(', ')}`);
      
      return { count: deletedStocks.length, tickers: deletedStocks.map(s => s.ticker) };
    });
    
    const elapsedMs = Date.now() - startTime;
    this.log(`[CLEANUP] 2-week horizon cleanup completed in ${elapsedMs}ms - Deleted ${result.count} stocks`);
    
    return result;
  }

  // Global helpers for background jobs (efficiently update market data across all users)
  async getAllUniquePendingTickers(): Promise<string[]> {
    const result = await this.db
      .selectDistinct({ ticker: stocks.ticker })
      .from(stocks)
      .where(eq(stocks.recommendationStatus, 'pending'));
    return result.map(r => r.ticker);
  }

  async getAllUniqueTickersNeedingData(): Promise<string[]> {
    const result = await this.db
      .selectDistinct({ ticker: stocks.ticker })
      .from(stocks)
      .where(
        or(
          eq(stocks.recommendationStatus, 'pending'),
          sql`${stocks.candlesticks} IS NULL`,
          sql`jsonb_array_length(${stocks.candlesticks}) = 0`
        )
      );
    return result.map(r => r.ticker);
  }

  async updateStocksByTickerGlobally(ticker: string, updates: Partial<Stock>): Promise<number> {
    const result = await this.db
      .update(stocks)
      .set({ ...updates, lastUpdated: sql`now()` })
      .where(eq(stocks.ticker, ticker));
    return result.rowCount || 0;
  }
}

