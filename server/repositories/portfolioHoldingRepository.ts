/**
 * Portfolio Holding Repository
 * Handles user portfolio holdings with automatic value updates
 * Note: updateHoldingValues requires stocks data, so this repository depends on stocks table
 */

import { BaseRepository } from "./base";
import { portfolioHoldings, stocks, type PortfolioHolding, type InsertPortfolioHolding } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";

export interface IPortfolioHoldingRepository {
  getPortfolioHoldings(userId: string, isSimulated?: boolean): Promise<PortfolioHolding[]>;
  getPortfolioHolding(id: string, userId?: string): Promise<PortfolioHolding | undefined>;
  getPortfolioHoldingByTicker(userId: string, ticker: string, isSimulated?: boolean): Promise<PortfolioHolding | undefined>;
  createPortfolioHolding(holding: InsertPortfolioHolding): Promise<PortfolioHolding>;
  updatePortfolioHolding(id: string, updates: Partial<PortfolioHolding>): Promise<PortfolioHolding | undefined>;
  deletePortfolioHolding(id: string): Promise<boolean>;
  deleteSimulatedHoldingsByTicker(userId: string, ticker: string): Promise<number>;
  updateHoldingValues(holding: PortfolioHolding): Promise<void>;
}

export class PortfolioHoldingRepository extends BaseRepository implements IPortfolioHoldingRepository {
  /**
   * Update holding values based on current stock price
   * This is a helper method used internally by other methods
   */
  async updateHoldingValues(holding: PortfolioHolding): Promise<void> {
    // CRITICAL: Filter by userId to ensure tenant isolation
    const [stock] = await this.db.select().from(stocks).where(and(
      eq(stocks.ticker, holding.ticker),
      eq(stocks.userId, holding.userId)
    ));
    if (!stock) return;

    const currentPrice = parseFloat(stock.currentPrice);
    const avgPrice = parseFloat(holding.averagePurchasePrice);
    const currentValue = currentPrice * holding.quantity;
    const totalCost = avgPrice * holding.quantity;
    const profitLoss = currentValue - totalCost;
    const profitLossPercent = (profitLoss / totalCost) * 100;

    await this.db
      .update(portfolioHoldings)
      .set({
        currentValue: currentValue.toFixed(2),
        profitLoss: profitLoss.toFixed(2),
        profitLossPercent: profitLossPercent.toFixed(2),
        lastUpdated: sql`now()`,
      })
      .where(eq(portfolioHoldings.id, holding.id));
  }

  async getPortfolioHoldings(userId: string, isSimulated?: boolean): Promise<PortfolioHolding[]> {
    let whereConditions = [eq(portfolioHoldings.userId, userId)];
    
    if (isSimulated !== undefined) {
      whereConditions.push(eq(portfolioHoldings.isSimulated, isSimulated));
    }
    
    const holdings = await this.db.select().from(portfolioHoldings).where(and(...whereConditions));
    
    // Update values before returning
    for (const holding of holdings) {
      await this.updateHoldingValues(holding);
    }
    
    // Re-fetch with same filter after updates
    return await this.db.select().from(portfolioHoldings).where(and(...whereConditions));
  }

  async getPortfolioHolding(id: string, userId?: string): Promise<PortfolioHolding | undefined> {
    // CRITICAL SECURITY: If userId provided, verify ownership for tenant isolation
    const whereClause = userId 
      ? and(eq(portfolioHoldings.id, id), eq(portfolioHoldings.userId, userId))
      : eq(portfolioHoldings.id, id);
    
    const [holding] = await this.db.select().from(portfolioHoldings).where(whereClause);
    if (holding) {
      await this.updateHoldingValues(holding);
      const [updated] = await this.db.select().from(portfolioHoldings).where(whereClause);
      return updated;
    }
    return undefined;
  }

  async getPortfolioHoldingByTicker(userId: string, ticker: string, isSimulated?: boolean): Promise<PortfolioHolding | undefined> {
    let whereConditions = [eq(portfolioHoldings.userId, userId), eq(portfolioHoldings.ticker, ticker)];
    
    if (isSimulated !== undefined) {
      whereConditions.push(eq(portfolioHoldings.isSimulated, isSimulated));
    }
    
    const [holding] = await this.db
      .select()
      .from(portfolioHoldings)
      .where(and(...whereConditions));
    
    if (holding) {
      await this.updateHoldingValues(holding);
      const [updated] = await this.db
        .select()
        .from(portfolioHoldings)
        .where(and(...whereConditions));
      return updated;
    }
    return undefined;
  }

  async createPortfolioHolding(holding: InsertPortfolioHolding): Promise<PortfolioHolding> {
    const [newHolding] = await this.db.insert(portfolioHoldings).values(holding).returning();
    await this.updateHoldingValues(newHolding);
    const [updated] = await this.db.select().from(portfolioHoldings).where(eq(portfolioHoldings.id, newHolding.id));
    return updated!;
  }

  async updatePortfolioHolding(id: string, updates: Partial<PortfolioHolding>): Promise<PortfolioHolding | undefined> {
    const [updatedHolding] = await this.db
      .update(portfolioHoldings)
      .set({ ...updates, lastUpdated: sql`now()` })
      .where(eq(portfolioHoldings.id, id))
      .returning();

    if (updatedHolding) {
      await this.updateHoldingValues(updatedHolding);
      const [updated] = await this.db.select().from(portfolioHoldings).where(eq(portfolioHoldings.id, id));
      return updated;
    }
    return undefined;
  }

  async deletePortfolioHolding(id: string): Promise<boolean> {
    const result = await this.db.delete(portfolioHoldings).where(eq(portfolioHoldings.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async deleteSimulatedHoldingsByTicker(userId: string, ticker: string): Promise<number> {
    const result = await this.db
      .delete(portfolioHoldings)
      .where(and(
        eq(portfolioHoldings.userId, userId),
        eq(portfolioHoldings.ticker, ticker),
        eq(portfolioHoldings.isSimulated, true)
      ))
      .returning();
    return result.length;
  }
}

