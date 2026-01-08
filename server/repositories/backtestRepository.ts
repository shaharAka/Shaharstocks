/**
 * Backtest Repository
 * Handles simple backtests (historical backtest results)
 */

import { BaseRepository } from "./base";
import { backtests, type Backtest, type InsertBacktest } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export interface IBacktestRepository {
  getBacktests(): Promise<Backtest[]>;
  getBacktest(id: string): Promise<Backtest | undefined>;
  createBacktest(backtest: InsertBacktest): Promise<Backtest>;
}

export class BacktestRepository extends BaseRepository implements IBacktestRepository {
  async getBacktests(): Promise<Backtest[]> {
    return await this.db.select().from(backtests).orderBy(desc(backtests.createdAt));
  }

  async getBacktest(id: string): Promise<Backtest | undefined> {
    const [backtest] = await this.db.select().from(backtests).where(eq(backtests.id, id));
    return backtest;
  }

  async createBacktest(backtest: InsertBacktest): Promise<Backtest> {
    const [newBacktest] = await this.db.insert(backtests).values(backtest).returning();
    return newBacktest;
  }
}

