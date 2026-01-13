/**
 * Stock View Repository
 * Handles stock view tracking
 */

import { BaseRepository } from "./base";
import { stockViews, type StockView, type InsertStockView } from "@shared/schema";
import { eq, inArray } from "drizzle-orm";

export interface IStockViewRepository {
  markStockAsViewed(ticker: string, userId: string): Promise<StockView>;
  markStocksAsViewed(tickers: string[], userId: string): Promise<void>;
  getUserStockViews(userId: string): Promise<string[]>;
}

export class StockViewRepository extends BaseRepository implements IStockViewRepository {
  async markStockAsViewed(ticker: string, userId: string): Promise<StockView> {
    const [view] = await this.db
      .insert(stockViews)
      .values({
        ticker: ticker.toUpperCase(),
        userId,
        viewedAt: new Date(),
      })
      .onConflictDoNothing()
      .returning();
    
    if (view) {
      return view;
    }
    
    // If conflict, return existing view
    const [existing] = await this.db
      .select()
      .from(stockViews)
      .where(eq(stockViews.userId, userId), eq(stockViews.ticker, ticker.toUpperCase()))
      .limit(1);
    
    return existing!;
  }

  async markStocksAsViewed(tickers: string[], userId: string): Promise<void> {
    const upperTickers = tickers.map(t => t.toUpperCase());
    
    // Insert all views (conflicts will be ignored)
    await this.db
      .insert(stockViews)
      .values(
        upperTickers.map(ticker => ({
          ticker,
          userId,
          viewedAt: new Date(),
        }))
      )
      .onConflictDoNothing();
  }

  async getUserStockViews(userId: string): Promise<string[]> {
    const views = await this.db
      .select({ ticker: stockViews.ticker })
      .from(stockViews)
      .where(eq(stockViews.userId, userId));
    
    return views.map(v => v.ticker);
  }
}

