/**
 * Followed Stock Repository
 * Handles user-followed stocks with position tracking and P&L calculations
 * Note: This repository emits events for WebSocket cache invalidation
 */

import { BaseRepository } from "./base";
import { followedStocks, stocks, aiAnalysisJobs, stockAnalyses, dailyBriefs, type FollowedStock, type InsertFollowedStock } from "@shared/schema";
import { eq, desc, sql, and } from "drizzle-orm";
import { eventDispatcher } from "../eventDispatcher";

export interface IFollowedStockRepository {
  getUserFollowedStocks(userId: string): Promise<FollowedStock[]>;
  followStock(follow: InsertFollowedStock): Promise<FollowedStock>;
  unfollowStock(ticker: string, userId: string): Promise<boolean>;
  toggleStockPosition(ticker: string, userId: string, hasEnteredPosition: boolean, entryPrice?: number): Promise<boolean>;
  closePosition(ticker: string, userId: string, sellPrice: number, quantity: number): Promise<{ pnl: string; sellPrice: string; sellDate: Date }>;
  getTotalPnL(userId: string): Promise<number>;
  getFollowedStocksWithPrices(userId: string): Promise<Array<FollowedStock & { currentPrice: string; priceChange: string; priceChangePercent: string }>>;
  getFollowedStocksWithStatus(userId: string): Promise<Array<FollowedStock & { 
    currentPrice: string; 
    priceChange: string; 
    priceChangePercent: string;
    jobStatus?: 'pending' | 'processing' | 'completed' | 'failed' | null;
    insiderAction?: 'BUY' | 'SELL' | null;
    aiStance?: 'BUY' | 'SELL' | 'HOLD' | null;
    aiScore?: number | null;
    integratedScore?: number | null;
    stanceAlignment?: 'act' | 'hold' | null;
  }>>;
  getFollowerCountForTicker(ticker: string): Promise<number>;
  getFollowerUserIdsForTicker(ticker: string): Promise<string[]>;
  hasAnyUserPositionInTicker(ticker: string): Promise<boolean>;
}

export class FollowedStockRepository extends BaseRepository implements IFollowedStockRepository {
  async getUserFollowedStocks(userId: string): Promise<FollowedStock[]> {
    return await this.db
      .select()
      .from(followedStocks)
      .where(eq(followedStocks.userId, userId))
      .orderBy(desc(followedStocks.followedAt));
  }

  async followStock(follow: InsertFollowedStock): Promise<FollowedStock> {
    const [newFollow] = await this.db.insert(followedStocks).values(follow).returning();
    
    // Emit event for WebSocket cache invalidation
    eventDispatcher.emit("FOLLOWED_STOCK_UPDATED", {
      type: "FOLLOWED_STOCK_UPDATED",
      userId: follow.userId,
      ticker: follow.ticker,
      data: { action: "follow" }
    });
    
    return newFollow;
  }

  async unfollowStock(ticker: string, userId: string): Promise<boolean> {
    await this.db
      .delete(followedStocks)
      .where(
        and(
          eq(followedStocks.ticker, ticker),
          eq(followedStocks.userId, userId)
        )
      );
    
    // Emit event for WebSocket cache invalidation
    eventDispatcher.emit("FOLLOWED_STOCK_UPDATED", {
      type: "FOLLOWED_STOCK_UPDATED",
      userId,
      ticker,
      data: { action: "unfollow" }
    });
    
    return true;
  }

  async toggleStockPosition(ticker: string, userId: string, hasEnteredPosition: boolean, entryPrice?: number): Promise<boolean> {
    const updateData: { hasEnteredPosition: boolean; entryPrice?: string | null } = {
      hasEnteredPosition,
    };
    
    if (hasEnteredPosition && entryPrice !== undefined) {
      updateData.entryPrice = entryPrice.toString();
    } else if (!hasEnteredPosition) {
      updateData.entryPrice = null;
    }
    
    const result = await this.db
      .update(followedStocks)
      .set(updateData)
      .where(
        and(
          eq(followedStocks.ticker, ticker),
          eq(followedStocks.userId, userId)
        )
      )
      .returning();
    
    if (result.length === 0) {
      throw new Error("Stock is not being followed");
    }
    
    // Emit event for WebSocket cache invalidation
    eventDispatcher.emit("FOLLOWED_STOCK_UPDATED", {
      type: "FOLLOWED_STOCK_UPDATED",
      userId,
      ticker,
      data: { action: "position_toggle", hasEnteredPosition, entryPrice: updateData.entryPrice }
    });
    
    return true;
  }

  async closePosition(ticker: string, userId: string, sellPrice: number, quantity: number): Promise<{ pnl: string; sellPrice: string; sellDate: Date }> {
    const followedStockResult = await this.db
      .select()
      .from(followedStocks)
      .where(
        and(
          eq(followedStocks.ticker, ticker),
          eq(followedStocks.userId, userId)
        )
      )
      .limit(1);
    
    if (followedStockResult.length === 0) {
      throw new Error("Stock is not being followed");
    }
    
    const stock = followedStockResult[0];
    
    if (!stock.hasEnteredPosition || !stock.entryPrice) {
      throw new Error("No open position to close");
    }
    
    // Calculate P&L: (sellPrice - entryPrice) * quantity
    const entryPriceNum = parseFloat(stock.entryPrice);
    const pnl = (sellPrice - entryPriceNum) * quantity;
    const sellDate = new Date();
    
    // Update the followed stock with sell information
    await this.db
      .update(followedStocks)
      .set({
        sellPrice: sellPrice.toString(),
        sellDate,
        pnl: pnl.toFixed(2),
        hasEnteredPosition: false,
      })
      .where(
        and(
          eq(followedStocks.ticker, ticker),
          eq(followedStocks.userId, userId)
        )
      );
    
    // Emit event for WebSocket cache invalidation
    eventDispatcher.emit("FOLLOWED_STOCK_UPDATED", {
      type: "FOLLOWED_STOCK_UPDATED",
      userId,
      ticker,
      data: { action: "close_position", sellPrice, pnl, sellDate }
    });
    
    return {
      pnl: pnl.toFixed(2),
      sellPrice: sellPrice.toString(),
      sellDate
    };
  }

  async getTotalPnL(userId: string): Promise<number> {
    const result = await this.db
      .select({ 
        totalPnl: sql<number>`COALESCE(SUM(CAST(${followedStocks.pnl} AS DECIMAL)), 0)` 
      })
      .from(followedStocks)
      .where(eq(followedStocks.userId, userId));
    
    return result[0]?.totalPnl || 0;
  }

  async getFollowerCountForTicker(ticker: string): Promise<number> {
    const result = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(followedStocks)
      .where(eq(followedStocks.ticker, ticker));
    return result[0]?.count || 0;
  }

  async getFollowerUserIdsForTicker(ticker: string): Promise<string[]> {
    const result = await this.db
      .select({ userId: followedStocks.userId })
      .from(followedStocks)
      .where(eq(followedStocks.ticker, ticker));
    return result.map(r => r.userId);
  }

  async hasAnyUserPositionInTicker(ticker: string): Promise<boolean> {
    const result = await this.db
      .select({ id: followedStocks.id })
      .from(followedStocks)
      .where(
        and(
          eq(followedStocks.ticker, ticker),
          eq(followedStocks.hasEnteredPosition, true)
        )
      )
      .limit(1);
    return result.length > 0;
  }

  async getFollowedStocksWithPrices(userId: string): Promise<Array<FollowedStock & { currentPrice: string; priceChange: string; priceChangePercent: string }>> {
    const followedStocksList = await this.getUserFollowedStocks(userId);
    
    const results: Array<FollowedStock & { currentPrice: string; priceChange: string; priceChangePercent: string }> = [];
    
    for (const followed of followedStocksList) {
      const stockData = await this.db
        .select()
        .from(stocks)
        .where(eq(stocks.ticker, followed.ticker))
        .orderBy(desc(stocks.lastUpdated))
        .limit(1);
      
      if (stockData.length > 0) {
        const stock = stockData[0];
        const currentPrice = parseFloat(stock.currentPrice);
        const previousPrice = stock.previousClose ? parseFloat(stock.previousClose) : currentPrice;
        const priceChange = currentPrice - previousPrice;
        const priceChangePercent = previousPrice !== 0 ? (priceChange / previousPrice) * 100 : 0;
        
        results.push({
          ...followed,
          currentPrice: stock.currentPrice,
          priceChange: priceChange.toFixed(2),
          priceChangePercent: priceChangePercent.toFixed(2),
        });
      } else {
        results.push({
          ...followed,
          currentPrice: "0.00",
          priceChange: "0.00",
          priceChangePercent: "0.00",
        });
      }
    }
    
    return results;
  }

  async getFollowedStocksWithStatus(userId: string): Promise<Array<FollowedStock & { 
    currentPrice: string; 
    priceChange: string; 
    priceChangePercent: string;
    jobStatus?: 'pending' | 'processing' | 'completed' | 'failed' | null;
    insiderAction?: 'BUY' | 'SELL' | null;
    aiStance?: 'BUY' | 'SELL' | 'HOLD' | null;
    aiScore?: number | null;
    integratedScore?: number | null;
    stanceAlignment?: 'act' | 'hold' | null;
  }>> {
    const followedWithPrices = await this.getFollowedStocksWithPrices(userId);
    
    const results: Array<FollowedStock & { 
      currentPrice: string; 
      priceChange: string; 
      priceChangePercent: string;
      jobStatus?: 'pending' | 'processing' | 'completed' | 'failed' | null;
      insiderAction?: 'BUY' | 'SELL' | null;
      aiStance?: 'BUY' | 'SELL' | 'HOLD' | null;
      aiScore?: number | null;
      integratedScore?: number | null;
      stanceAlignment?: 'act' | 'hold' | null;
    }> = [];
    
    for (const followed of followedWithPrices) {
      // Get stock data for insider action (recommendation)
      const stockData = await this.db
        .select()
        .from(stocks)
        .where(eq(stocks.ticker, followed.ticker))
        .orderBy(desc(stocks.lastUpdated))
        .limit(1);
      
      const stock = stockData[0];
      const insiderAction = stock?.recommendation?.toUpperCase() as 'BUY' | 'SELL' | null || null;
      
      // Get latest analysis job status
      const jobs = await this.db
        .select()
        .from(aiAnalysisJobs)
        .where(eq(aiAnalysisJobs.ticker, followed.ticker))
        .orderBy(desc(aiAnalysisJobs.createdAt))
        .limit(1);
      
      const latestJob = jobs[0];
      const jobStatus = latestJob?.status as 'pending' | 'processing' | 'completed' | 'failed' | null || null;
      
      // Get latest daily brief for AI stance and score (user-specific)
      const briefs = await this.db
        .select()
        .from(dailyBriefs)
        .where(
          and(
            eq(dailyBriefs.ticker, followed.ticker),
            eq(dailyBriefs.userId, userId)
          )
        )
        .orderBy(desc(dailyBriefs.briefDate))
        .limit(1);
      
      const latestBrief = briefs[0];
      
      // Helper to normalize stance values
      const normalizeStance = (rawStance: string | null | undefined): 'buy' | 'sell' | 'hold' | null => {
        if (!rawStance) return null;
        const stance = rawStance.toLowerCase().trim();
        if (stance === 'enter') return 'buy';
        if (stance === 'wait') return 'hold';
        if (stance === 'buy' || stance === 'sell' || stance === 'hold') return stance;
        this.log(`Unknown stance value: "${rawStance}", defaulting to "hold"`, 'warn');
        return 'hold';
      };
      
      const watchingStance = normalizeStance(latestBrief?.watchingStance);
      const owningStance = normalizeStance(latestBrief?.owningStance);
      const aiScore = latestBrief?.watchingConfidence ?? null;
      
      // Get integrated score from stock analysis
      const analyses = await this.db
        .select()
        .from(stockAnalyses)
        .where(eq(stockAnalyses.ticker, followed.ticker))
        .limit(1);
      
      const analysis = analyses[0];
      const integratedScore = analysis?.integratedScore ?? null;
      
      // Calculate stance alignment
      let stanceAlignment: 'act' | 'hold' | null = null;
      if (watchingStance || owningStance) {
        if (watchingStance === 'buy' || watchingStance === 'sell' || owningStance === 'buy' || owningStance === 'sell') {
          stanceAlignment = 'act';
        } else {
          stanceAlignment = 'hold';
        }
      }
      
      results.push({
        ...followed,
        jobStatus,
        insiderAction,
        aiStance: watchingStance || owningStance,
        aiScore,
        integratedScore,
        stanceAlignment,
      });
    }
    
    return results;
  }
}

