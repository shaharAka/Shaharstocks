/**
 * Trade Repository
 * Handles user trades with automatic portfolio holding updates
 * Note: createTrade depends on PortfolioHoldingRepository for portfolio updates
 */

import { BaseRepository } from "./base";
import { trades, type Trade, type InsertTrade } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { IPortfolioHoldingRepository } from "./portfolioHoldingRepository";

export interface ITradeRepository {
  getTrades(userId: string, isSimulated?: boolean): Promise<Trade[]>;
  getTrade(id: string, userId?: string): Promise<Trade | undefined>;
  createTrade(trade: InsertTrade, portfolioHoldingRepository: IPortfolioHoldingRepository): Promise<Trade>;
  updateTrade(id: string, updates: Partial<Trade>): Promise<Trade | undefined>;
  deleteSimulatedTradesByTicker(userId: string, ticker: string): Promise<number>;
}

export class TradeRepository extends BaseRepository implements ITradeRepository {
  async getTrades(userId: string, isSimulated?: boolean): Promise<Trade[]> {
    let whereConditions = [eq(trades.userId, userId)];
    
    if (isSimulated !== undefined) {
      whereConditions.push(eq(trades.isSimulated, isSimulated));
    }
    
    return await this.db.select().from(trades).where(and(...whereConditions)).orderBy(desc(trades.executedAt));
  }

  async getTrade(id: string, userId?: string): Promise<Trade | undefined> {
    // CRITICAL SECURITY: If userId provided, verify ownership for tenant isolation
    const whereClause = userId
      ? and(eq(trades.id, id), eq(trades.userId, userId))
      : eq(trades.id, id);
    
    const [trade] = await this.db.select().from(trades).where(whereClause);
    return trade;
  }

  async createTrade(trade: InsertTrade, portfolioHoldingRepository: IPortfolioHoldingRepository): Promise<Trade> {
    // Update portfolio holdings first - ensure simulated and real holdings are kept separate
    const isSimulated = trade.isSimulated ?? undefined;
    
    // userId is required for portfolio operations
    if (!trade.userId) {
      throw new Error("userId is required to create a trade");
    }
    
    const existingHolding = await portfolioHoldingRepository.getPortfolioHoldingByTicker(trade.userId, trade.ticker, isSimulated);

    // Validate sell trades
    if (trade.type === "sell") {
      if (!existingHolding) {
        throw new Error(`Cannot sell ${trade.ticker}: no holding found`);
      }
      if (trade.quantity > existingHolding.quantity) {
        throw new Error(
          `Cannot sell ${trade.quantity} shares of ${trade.ticker}: only ${existingHolding.quantity} shares available`
        );
      }
    }

    let realizedProfitLoss: string | undefined;
    let realizedProfitLossPercent: string | undefined;

    if (trade.type === "buy") {
      if (existingHolding) {
        // Update existing holding
        const totalQuantity = existingHolding.quantity + trade.quantity;
        const totalCost =
          parseFloat(existingHolding.averagePurchasePrice) * existingHolding.quantity +
          parseFloat(trade.price) * trade.quantity;
        const newAvgPrice = totalCost / totalQuantity;

        await portfolioHoldingRepository.updatePortfolioHolding(existingHolding.id, {
          quantity: totalQuantity,
          averagePurchasePrice: newAvgPrice.toFixed(2),
        });
        
        // Update holding values (current price, P&L, etc.)
        const updatedHolding = await portfolioHoldingRepository.getPortfolioHolding(existingHolding.id);
        if (updatedHolding) {
          await portfolioHoldingRepository.updateHoldingValues(updatedHolding);
        }
      } else {
        // Create new holding
        const newHolding = await portfolioHoldingRepository.createPortfolioHolding({
          userId: trade.userId,
          ticker: trade.ticker,
          quantity: trade.quantity,
          averagePurchasePrice: trade.price,
          isSimulated: isSimulated !== undefined ? isSimulated : false,
        });
        
        // Update holding values for new holding
        await portfolioHoldingRepository.updateHoldingValues(newHolding);
      }
    } else if (trade.type === "sell" && existingHolding) {
      // Calculate realized P&L for this sell
      const sellPrice = parseFloat(trade.price);
      const avgPurchasePrice = parseFloat(existingHolding.averagePurchasePrice);
      const profitLoss = (sellPrice - avgPurchasePrice) * trade.quantity;
      const profitLossPercent = ((sellPrice - avgPurchasePrice) / avgPurchasePrice) * 100;
      
      realizedProfitLoss = profitLoss.toFixed(2);
      realizedProfitLossPercent = profitLossPercent.toFixed(2);

      // Reduce holding quantity
      const newQuantity = existingHolding.quantity - trade.quantity;
      if (newQuantity <= 0) {
        // Completely sold - delete holding
        await portfolioHoldingRepository.deletePortfolioHolding(existingHolding.id);
      } else {
        // Partial sell - update quantity and recalculate values
        await portfolioHoldingRepository.updatePortfolioHolding(existingHolding.id, {
          quantity: newQuantity,
        });
        
        // Update holding values (current price, P&L, etc.) for remaining shares
        const updatedHolding = await portfolioHoldingRepository.getPortfolioHolding(existingHolding.id);
        if (updatedHolding) {
          await portfolioHoldingRepository.updateHoldingValues(updatedHolding);
        }
      }
    }

    // Create trade record with realized P&L for sells
    const tradeData = {
      ...trade,
      ...(realizedProfitLoss && { profitLoss: realizedProfitLoss }),
      ...(realizedProfitLossPercent && { profitLossPercent: realizedProfitLossPercent }),
    };
    
    const [newTrade] = await this.db.insert(trades).values(tradeData).returning();
    return newTrade;
  }

  async updateTrade(id: string, updates: Partial<Trade>): Promise<Trade | undefined> {
    const [updatedTrade] = await this.db
      .update(trades)
      .set(updates)
      .where(eq(trades.id, id))
      .returning();
    return updatedTrade;
  }

  async deleteSimulatedTradesByTicker(userId: string, ticker: string): Promise<number> {
    const result = await this.db
      .delete(trades)
      .where(and(
        eq(trades.userId, userId),
        eq(trades.ticker, ticker),
        eq(trades.isSimulated, true)
      ))
      .returning();
    return result.length;
  }
}

