/**
 * Stock Candlestick Repository
 * Handles shared OHLCV candlestick data (one record per ticker, reused across users)
 */

import { BaseRepository } from "./base";
import { stockCandlesticks, stocks, type StockCandlesticks, type InsertStockCandlesticks } from "@shared/schema";
import { eq, sql, inArray } from "drizzle-orm";

export interface IStockCandlestickRepository {
  getCandlesticksByTicker(ticker: string): Promise<StockCandlesticks | undefined>;
  upsertCandlesticks(ticker: string, candlestickData: { date: string; open: number; high: number; low: number; close: number; volume: number }[]): Promise<StockCandlesticks>;
  getAllTickersNeedingCandlestickData(): Promise<string[]>;
}

export class StockCandlestickRepository extends BaseRepository implements IStockCandlestickRepository {
  async getCandlesticksByTicker(ticker: string): Promise<StockCandlesticks | undefined> {
    const [candlesticks] = await this.db
      .select()
      .from(stockCandlesticks)
      .where(eq(stockCandlesticks.ticker, ticker));
    return candlesticks;
  }

  async upsertCandlesticks(ticker: string, candlestickData: { date: string; open: number; high: number; low: number; close: number; volume: number }[]): Promise<StockCandlesticks> {
    const existing = await this.getCandlesticksByTicker(ticker);
    
    if (existing) {
      const [updated] = await this.db
        .update(stockCandlesticks)
        .set({ 
          candlestickData, 
          lastUpdated: new Date() 
        })
        .where(eq(stockCandlesticks.ticker, ticker))
        .returning();
      return updated;
    } else {
      const [created] = await this.db
        .insert(stockCandlesticks)
        .values({ 
          ticker, 
          candlestickData, 
          lastUpdated: new Date() 
        })
        .returning();
      return created;
    }
  }

  async getAllTickersNeedingCandlestickData(): Promise<string[]> {
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    // Get all unique tickers from stocks
    const allTickers = await this.db
      .selectDistinct({ ticker: stocks.ticker })
      .from(stocks);

    // Get tickers that have recent candlestick data
    const tickersWithRecentData = await this.db
      .select({ ticker: stockCandlesticks.ticker })
      .from(stockCandlesticks)
      .where(sql`${stockCandlesticks.lastUpdated} >= ${oneDayAgo}`);

    const recentTickerSet = new Set(tickersWithRecentData.map(t => t.ticker));
    
    // Return tickers that don't have recent data
    return allTickers
      .map(t => t.ticker)
      .filter(ticker => !recentTickerSet.has(ticker));
  }
}

