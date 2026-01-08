/**
 * Stock Analysis Repository
 * Handles AI-generated stock analysis records (global, one per ticker)
 */

import { BaseRepository } from "./base";
import { stockAnalyses, type StockAnalysis, type InsertStockAnalysis } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export interface IStockAnalysisRepository {
  getStockAnalysis(ticker: string): Promise<StockAnalysis | undefined>;
  getAllStockAnalyses(): Promise<StockAnalysis[]>;
  saveStockAnalysis(analysis: InsertStockAnalysis): Promise<StockAnalysis>;
  updateStockAnalysis(ticker: string, updates: Partial<StockAnalysis>): Promise<void>;
  updateStockAnalysisStatus(ticker: string, status: string, errorMessage?: string): Promise<void>;
}

export class StockAnalysisRepository extends BaseRepository implements IStockAnalysisRepository {
  async getStockAnalysis(ticker: string): Promise<StockAnalysis | undefined> {
    const [analysis] = await this.db
      .select()
      .from(stockAnalyses)
      .where(eq(stockAnalyses.ticker, ticker.toUpperCase()))
      .limit(1);
    return analysis;
  }

  async getAllStockAnalyses(): Promise<StockAnalysis[]> {
    return await this.db
      .select()
      .from(stockAnalyses)
      .orderBy(desc(stockAnalyses.updatedAt));
  }

  async saveStockAnalysis(analysis: InsertStockAnalysis): Promise<StockAnalysis> {
    // Check if analysis already exists for this ticker
    const existing = await this.getStockAnalysis(analysis.ticker);
    
    if (existing) {
      // Update existing analysis
      await this.updateStockAnalysis(analysis.ticker, analysis);
      const updated = await this.getStockAnalysis(analysis.ticker);
      return updated!;
    } else {
      // Insert new analysis
      const [created] = await this.db
        .insert(stockAnalyses)
        .values({
          ...analysis,
          ticker: analysis.ticker.toUpperCase(),
        })
        .returning();
      return created;
    }
  }

  async updateStockAnalysis(ticker: string, updates: Partial<StockAnalysis>): Promise<void> {
    await this.db
      .update(stockAnalyses)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(stockAnalyses.ticker, ticker.toUpperCase()));
  }

  async updateStockAnalysisStatus(ticker: string, status: string, errorMessage?: string): Promise<void> {
    await this.db
      .update(stockAnalyses)
      .set({
        status,
        errorMessage: errorMessage || null,
        updatedAt: new Date(),
      })
      .where(eq(stockAnalyses.ticker, ticker.toUpperCase()));
  }
}

