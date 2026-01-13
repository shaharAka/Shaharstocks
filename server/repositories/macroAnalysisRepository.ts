/**
 * Macro Analysis Repository
 * Handles macro economic analysis records
 */

import { BaseRepository } from "./base";
import { macroAnalyses, type MacroAnalysis, type InsertMacroAnalysis } from "@shared/schema";
import { eq, desc, sql, and, isNull } from "drizzle-orm";

export interface IMacroAnalysisRepository {
  getLatestMacroAnalysis(industry?: string | null): Promise<MacroAnalysis | undefined>;
  getMacroAnalysis(id: string): Promise<MacroAnalysis | undefined>;
  createMacroAnalysis(analysis: InsertMacroAnalysis): Promise<MacroAnalysis>;
  updateMacroAnalysisStatus(id: string, status: string, errorMessage?: string): Promise<void>;
}

export class MacroAnalysisRepository extends BaseRepository implements IMacroAnalysisRepository {
  async getLatestMacroAnalysis(industry?: string | null): Promise<MacroAnalysis | undefined> {
    // Get macro analysis for specific industry or general market (null industry)
    // Filter for analyses less than 7 days old AND that are complete (have actual data)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const [analysis] = await this.db
      .select()
      .from(macroAnalyses)
      .where(
        and(
          industry 
            ? eq(macroAnalyses.industry, industry)
            : sql`${macroAnalyses.industry} IS NULL`,
          sql`${macroAnalyses.createdAt} >= ${sevenDaysAgo}`,
          eq(macroAnalyses.status, "completed"),
          sql`${macroAnalyses.macroFactor} IS NOT NULL`
        )
      )
      .orderBy(desc(macroAnalyses.createdAt))
      .limit(1);
    return analysis;
  }

  async getMacroAnalysis(id: string): Promise<MacroAnalysis | undefined> {
    const [analysis] = await this.db
      .select()
      .from(macroAnalyses)
      .where(eq(macroAnalyses.id, id))
      .limit(1);
    return analysis;
  }

  async createMacroAnalysis(analysis: InsertMacroAnalysis): Promise<MacroAnalysis> {
    const [created] = await this.db
      .insert(macroAnalyses)
      .values(analysis)
      .returning();
    return created;
  }

  async updateMacroAnalysisStatus(id: string, status: string, errorMessage?: string): Promise<void> {
    await this.db
      .update(macroAnalyses)
      .set({ status, errorMessage: errorMessage || null })
      .where(eq(macroAnalyses.id, id));
  }
}

