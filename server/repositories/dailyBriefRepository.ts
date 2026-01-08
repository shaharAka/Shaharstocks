/**
 * Daily Brief Repository
 * Handles user-specific daily briefs and global ticker daily briefs
 */

import { BaseRepository } from "./base";
import { dailyBriefs, tickerDailyBriefs, type DailyBrief, type InsertDailyBrief, type TickerDailyBrief, type InsertTickerDailyBrief } from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";

export interface IDailyBriefRepository {
  // User-specific daily briefs
  getDailyBriefsForTicker(ticker: string, userId: string): Promise<DailyBrief[]>;
  getDailyBriefForUser(userId: string, ticker: string, briefDate: string): Promise<DailyBrief | undefined>;
  createDailyBrief(brief: InsertDailyBrief): Promise<DailyBrief>;
  
  // Global ticker daily briefs (not per-user)
  getTickerDailyBriefs(ticker: string, limit?: number): Promise<TickerDailyBrief[]>;
  createTickerDailyBrief(brief: InsertTickerDailyBrief): Promise<TickerDailyBrief>;
  getLatestTickerBrief(ticker: string): Promise<TickerDailyBrief | undefined>;
}

export class DailyBriefRepository extends BaseRepository implements IDailyBriefRepository {
  // User-specific daily briefs
  async getDailyBriefsForTicker(ticker: string, userId: string): Promise<DailyBrief[]> {
    // Limit to last 7 days to keep response lightweight
    // CRITICAL: Filter by userId to prevent cross-user data leakage
    return await this.db
      .select()
      .from(dailyBriefs)
      .where(
        and(
          eq(dailyBriefs.ticker, ticker),
          eq(dailyBriefs.userId, userId)
        )
      )
      .orderBy(desc(dailyBriefs.briefDate))
      .limit(7);
  }

  async getDailyBriefForUser(userId: string, ticker: string, briefDate: string): Promise<DailyBrief | undefined> {
    const [brief] = await this.db
      .select()
      .from(dailyBriefs)
      .where(
        and(
          eq(dailyBriefs.userId, userId),
          eq(dailyBriefs.ticker, ticker),
          eq(dailyBriefs.briefDate, briefDate)
        )
      )
      .limit(1);
    return brief;
  }

  async createDailyBrief(brief: InsertDailyBrief): Promise<DailyBrief> {
    // Check if brief already exists for this user+ticker+date
    const [existing] = await this.db
      .select()
      .from(dailyBriefs)
      .where(
        and(
          eq(dailyBriefs.userId, brief.userId),
          eq(dailyBriefs.ticker, brief.ticker),
          eq(dailyBriefs.briefDate, brief.briefDate)
        )
      )
      .limit(1);

    if (existing) {
      // Update existing brief
      const [updated] = await this.db
        .update(dailyBriefs)
        .set(brief)
        .where(eq(dailyBriefs.id, existing.id))
        .returning();
      return updated;
    }

    // Create new brief
    const [created] = await this.db
      .insert(dailyBriefs)
      .values(brief)
      .returning();
    return created;
  }

  // Global ticker daily briefs (not per-user)
  async getTickerDailyBriefs(ticker: string, limit: number = 7): Promise<TickerDailyBrief[]> {
    return await this.db
      .select()
      .from(tickerDailyBriefs)
      .where(eq(tickerDailyBriefs.ticker, ticker.toUpperCase()))
      .orderBy(desc(tickerDailyBriefs.briefDate))
      .limit(limit);
  }

  async createTickerDailyBrief(brief: InsertTickerDailyBrief): Promise<TickerDailyBrief> {
    // Check if brief already exists for this ticker+date
    const [existing] = await this.db
      .select()
      .from(tickerDailyBriefs)
      .where(
        and(
          eq(tickerDailyBriefs.ticker, brief.ticker.toUpperCase()),
          eq(tickerDailyBriefs.briefDate, brief.briefDate)
        )
      )
      .limit(1);

    if (existing) {
      // Update existing brief
      const [updated] = await this.db
        .update(tickerDailyBriefs)
        .set({ ...brief, ticker: brief.ticker.toUpperCase() })
        .where(eq(tickerDailyBriefs.id, existing.id))
        .returning();
      return updated;
    }

    // Create new brief
    const [created] = await this.db
      .insert(tickerDailyBriefs)
      .values({ ...brief, ticker: brief.ticker.toUpperCase() })
      .returning();
    return created;
  }

  async getLatestTickerBrief(ticker: string): Promise<TickerDailyBrief | undefined> {
    const [brief] = await this.db
      .select()
      .from(tickerDailyBriefs)
      .where(eq(tickerDailyBriefs.ticker, ticker.toUpperCase()))
      .orderBy(desc(tickerDailyBriefs.briefDate))
      .limit(1);
    return brief;
  }
}

