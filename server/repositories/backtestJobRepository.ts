/**
 * Backtest Job Repository
 * Handles "What-If" backtest jobs, price data, and scenarios
 */

import { BaseRepository } from "./base";
import { 
  backtestJobs, 
  backtestPriceData, 
  backtestScenarios,
  type BacktestJob, 
  type InsertBacktestJob,
  type BacktestPriceData,
  type InsertBacktestPriceData,
  type BacktestScenario,
  type InsertBacktestScenario
} from "@shared/schema";
import { eq, and } from "drizzle-orm";

export interface IBacktestJobRepository {
  // Backtest Jobs
  getBacktestJobs(userId: string): Promise<BacktestJob[]>;
  getBacktestJob(id: string): Promise<BacktestJob | undefined>;
  createBacktestJob(job: InsertBacktestJob): Promise<BacktestJob>;
  updateBacktestJob(id: string, updates: Partial<BacktestJob>): Promise<BacktestJob | undefined>;
  deleteBacktestJob(id: string): Promise<boolean>;
  
  // Backtest Price Data
  getBacktestPriceData(jobId: string): Promise<BacktestPriceData[]>;
  getCachedPriceData(ticker: string, insiderBuyDate: string): Promise<BacktestPriceData | undefined>;
  createBacktestPriceData(data: InsertBacktestPriceData): Promise<BacktestPriceData>;
  
  // Backtest Scenarios
  getBacktestScenarios(jobId: string): Promise<BacktestScenario[]>;
  createBacktestScenario(scenario: InsertBacktestScenario): Promise<BacktestScenario>;
}

export class BacktestJobRepository extends BaseRepository implements IBacktestJobRepository {
  // Backtest Jobs
  async getBacktestJobs(userId: string): Promise<BacktestJob[]> {
    return await this.db
      .select()
      .from(backtestJobs)
      .where(eq(backtestJobs.userId, userId))
      .orderBy(backtestJobs.createdAt);
  }

  async getBacktestJob(id: string): Promise<BacktestJob | undefined> {
    const [job] = await this.db.select().from(backtestJobs).where(eq(backtestJobs.id, id));
    return job;
  }

  async createBacktestJob(job: InsertBacktestJob): Promise<BacktestJob> {
    const [newJob] = await this.db.insert(backtestJobs).values(job).returning();
    return newJob;
  }

  async updateBacktestJob(id: string, updates: Partial<BacktestJob>): Promise<BacktestJob | undefined> {
    const [updated] = await this.db
      .update(backtestJobs)
      .set(updates)
      .where(eq(backtestJobs.id, id))
      .returning();
    return updated;
  }

  async deleteBacktestJob(id: string): Promise<boolean> {
    // Delete related price data and scenarios first
    await this.db.delete(backtestPriceData).where(eq(backtestPriceData.jobId, id));
    await this.db.delete(backtestScenarios).where(eq(backtestScenarios.jobId, id));
    
    // Delete the job itself
    await this.db.delete(backtestJobs).where(eq(backtestJobs.id, id));
    return true;
  }

  // Backtest Price Data
  async getBacktestPriceData(jobId: string): Promise<BacktestPriceData[]> {
    const allData = await this.db
      .select()
      .from(backtestPriceData)
      .where(eq(backtestPriceData.jobId, jobId));
    
    // Deduplicate by ticker, keeping the most recent
    const uniqueByTicker = new Map<string, BacktestPriceData>();
    allData.forEach(data => {
      if (!uniqueByTicker.has(data.ticker) || 
          (data.createdAt && uniqueByTicker.get(data.ticker)!.createdAt && 
           data.createdAt > uniqueByTicker.get(data.ticker)!.createdAt!)) {
        uniqueByTicker.set(data.ticker, data);
      }
    });
    
    return Array.from(uniqueByTicker.values());
  }

  async getCachedPriceData(ticker: string, insiderBuyDate: string): Promise<BacktestPriceData | undefined> {
    const results = await this.db
      .select()
      .from(backtestPriceData)
      .where(
        and(
          eq(backtestPriceData.ticker, ticker),
          eq(backtestPriceData.insiderBuyDate, insiderBuyDate)
        )
      )
      .limit(1);
    return results[0];
  }

  async createBacktestPriceData(data: InsertBacktestPriceData): Promise<BacktestPriceData> {
    const [newData] = await this.db.insert(backtestPriceData).values(data).returning();
    return newData;
  }

  // Backtest Scenarios (returns only top 10 sorted by P&L)
  async getBacktestScenarios(jobId: string): Promise<BacktestScenario[]> {
    return await this.db
      .select()
      .from(backtestScenarios)
      .where(eq(backtestScenarios.jobId, jobId))
      .orderBy(backtestScenarios.totalProfitLoss)
      .limit(10);
  }

  async createBacktestScenario(scenario: InsertBacktestScenario): Promise<BacktestScenario> {
    const [newScenario] = await this.db.insert(backtestScenarios).values(scenario).returning();
    return newScenario;
  }
}

