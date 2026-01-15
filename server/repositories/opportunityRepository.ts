/**
 * Opportunity Repository
 * Handles global opportunities (unified for all users) and user rejections
 */

import { BaseRepository } from "./base";
import { opportunities, opportunityBatches, userOpportunityRejections, followedStocks, tickerDailyBriefs, type Opportunity, type InsertOpportunity, type OpportunityBatch, type InsertOpportunityBatch, type UserOpportunityRejection, type InsertUserOpportunityRejection, type TickerDailyBrief } from "@shared/schema";
import { eq, desc, sql, and, or, inArray } from "drizzle-orm";

export interface IOpportunityRepository {
  // Opportunities (global, unified for all users)
  getOpportunities(options?: { 
    cadence?: 'daily' | 'hourly' | 'all';
    userId?: string; // If provided, filters out rejected opportunities for this user
    ticker?: string;
  }): Promise<Opportunity[]>;
  getOpportunity(id: string): Promise<Opportunity | undefined>;
  getOpportunityByTransaction(ticker: string, insiderTradeDate: string, insiderName: string, recommendation: string, cadence?: string): Promise<Opportunity | undefined>;
  createOpportunity(opportunity: InsertOpportunity): Promise<Opportunity>;
  updateOpportunity(id: string, updates: Partial<Opportunity>): Promise<Opportunity | undefined>;
  deleteOpportunity(id: string): Promise<boolean>;
  
  // Opportunity Batches (track fetch runs)
  createOpportunityBatch(batch: InsertOpportunityBatch): Promise<OpportunityBatch>;
  updateOpportunityBatchStats(batchId: string, stats: { added: number; rejected: number; duplicates: number }): Promise<void>;
  getLatestBatch(cadence: 'daily' | 'hourly'): Promise<OpportunityBatch | undefined>;
  getLatestBatchWithStats(): Promise<OpportunityBatch | undefined>;
  countOpportunitiesByBatchWithScore(batchId: string, minScore: number): Promise<number>;
  
  // User Opportunity Rejections
  rejectOpportunity(userId: string, opportunityId: string): Promise<UserOpportunityRejection>;
  unrejectOpportunity(userId: string, opportunityId: string): Promise<boolean>;
  getUserRejections(userId: string): Promise<UserOpportunityRejection[]>;
  isOpportunityRejected(userId: string, opportunityId: string): Promise<boolean>;
}

export class OpportunityRepository extends BaseRepository implements IOpportunityRepository {
  async getOpportunities(options?: { 
    cadence?: 'daily' | 'hourly' | 'all';
    userId?: string;
    ticker?: string;
    includeBriefs?: boolean;
  }): Promise<(Opportunity & { latestBrief?: any })[]> {
    this.log(`[OpportunityRepository.getOpportunities] Called with options:`, options);
    const conditions: any[] = [];
    
    // Filter by cadence
    if (options?.cadence === 'daily') {
      conditions.push(eq(opportunities.cadence, 'daily'));
    } else if (options?.cadence === 'hourly') {
      conditions.push(eq(opportunities.cadence, 'hourly'));
    }
    // 'all' or undefined: no cadence filter
    
    // Filter by ticker
    if (options?.ticker) {
      conditions.push(eq(opportunities.ticker, options.ticker.toUpperCase()));
    }
    
    // Filter out opportunities older than 12 days based on insider trade date
    const twelveDaysAgo = new Date();
    twelveDaysAgo.setDate(twelveDaysAgo.getDate() - 12);
    const cutoffDateStr = twelveDaysAgo.toISOString().split('T')[0]; // YYYY-MM-DD
    this.log(`[OpportunityRepository.getOpportunities] 12-day cutoff:`, cutoffDateStr);
    conditions.push(sql`${opportunities.insiderTradeDate} >= ${cutoffDateStr}`);
    
    let query = this.db
      .select()
      .from(opportunities);
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    const results = await query.orderBy(desc(opportunities.createdAt));
    this.log(`[OpportunityRepository.getOpportunities] Raw results count:`, results.length);
    
    // Debug: Count by cadence
    const dailyCount = results.filter(r => r.cadence === 'daily').length;
    const hourlyCount = results.filter(r => r.cadence === 'hourly').length;
    this.log(`[OpportunityRepository.getOpportunities] Cadence breakdown - Daily: ${dailyCount}, Hourly: ${hourlyCount}, Total: ${results.length}`);
    
    // If userId provided, filter out rejected opportunities only
    // NOTE: We do NOT filter out followed tickers - they should appear on both opportunities and following pages
    if (options?.userId) {
      const rejections = await this.getUserRejections(options.userId);
      const rejectedIds = new Set(rejections.map(r => r.opportunityId));
      this.log(`[OpportunityRepository.getOpportunities] Rejections:`, rejectedIds.size);
      
      const filtered = results.filter(opp => !rejectedIds.has(opp.id));
      this.log(`[OpportunityRepository.getOpportunities] After filtering (rejections only):`, filtered.length);
      
      // If includeBriefs is true, attach latest ticker daily briefs
      if (options?.includeBriefs) {
        return await this.attachLatestBriefs(filtered);
      }
      
      return filtered;
    }
    
    // If includeBriefs is true, attach latest ticker daily briefs
    if (options?.includeBriefs) {
      return await this.attachLatestBriefs(results);
    }
    
    return results;
  }

  async getOpportunity(id: string): Promise<Opportunity | undefined> {
    const [opportunity] = await this.db
      .select()
      .from(opportunities)
      .where(eq(opportunities.id, id))
      .limit(1);
    return opportunity;
  }

  async getOpportunityByTransaction(ticker: string, insiderTradeDate: string, insiderName: string, recommendation: string, cadence?: string): Promise<Opportunity | undefined> {
    const conditions: any[] = [
      eq(opportunities.ticker, ticker),
      eq(opportunities.insiderTradeDate, insiderTradeDate),
      eq(opportunities.insiderName, insiderName),
      eq(opportunities.recommendation, recommendation),
    ];
    
    if (cadence) {
      conditions.push(eq(opportunities.cadence, cadence));
    }
    
    const [opportunity] = await this.db
      .select()
      .from(opportunities)
      .where(and(...conditions))
      .limit(1);
    return opportunity;
  }

  async createOpportunity(opportunity: InsertOpportunity): Promise<Opportunity> {
    const [created] = await this.db
      .insert(opportunities)
      .values(opportunity)
      .returning();
    return created;
  }

  async updateOpportunity(id: string, updates: Partial<Opportunity>): Promise<Opportunity | undefined> {
    const [updated] = await this.db
      .update(opportunities)
      .set({ ...updates, lastUpdated: sql`now()` })
      .where(eq(opportunities.id, id))
      .returning();
    return updated;
  }

  async deleteOpportunity(id: string): Promise<boolean> {
    const result = await this.db
      .delete(opportunities)
      .where(eq(opportunities.id, id))
      .returning();
    return result.length > 0;
  }

  // Opportunity Batches
  async createOpportunityBatch(batch: InsertOpportunityBatch): Promise<OpportunityBatch> {
    const [created] = await this.db
      .insert(opportunityBatches)
      .values(batch)
      .returning();
    return created;
  }

  async updateOpportunityBatchStats(batchId: string, stats: { added: number; rejected: number; duplicates: number }): Promise<void> {
    const statsJson = JSON.stringify({ stats });
    await this.db.execute(sql`
      UPDATE opportunity_batches 
      SET count = ${stats.added},
          metadata = COALESCE(metadata, '{}'::jsonb) || ${statsJson}::jsonb
      WHERE id = ${batchId}
    `);
  }

  async getLatestBatch(cadence: 'daily' | 'hourly'): Promise<OpportunityBatch | undefined> {
    const [batch] = await this.db
      .select()
      .from(opportunityBatches)
      .where(eq(opportunityBatches.cadence, cadence))
      .orderBy(desc(opportunityBatches.fetchedAt))
      .limit(1);
    return batch;
  }

  async getLatestBatchWithStats(): Promise<OpportunityBatch | undefined> {
    const [batch] = await this.db
      .select()
      .from(opportunityBatches)
      .orderBy(desc(opportunityBatches.fetchedAt))
      .limit(1);
    return batch;
  }

  // User Opportunity Rejections
  async rejectOpportunity(userId: string, opportunityId: string): Promise<UserOpportunityRejection> {
    const [rejection] = await this.db
      .insert(userOpportunityRejections)
      .values({ userId, opportunityId })
      .onConflictDoNothing()
      .returning();
    
    // If conflict (already rejected), fetch existing
    if (!rejection) {
      const [existing] = await this.db
        .select()
        .from(userOpportunityRejections)
        .where(
          and(
            eq(userOpportunityRejections.userId, userId),
            eq(userOpportunityRejections.opportunityId, opportunityId)
          )
        );
      return existing!;
    }
    return rejection;
  }

  async unrejectOpportunity(userId: string, opportunityId: string): Promise<boolean> {
    const result = await this.db
      .delete(userOpportunityRejections)
      .where(
        and(
          eq(userOpportunityRejections.userId, userId),
          eq(userOpportunityRejections.opportunityId, opportunityId)
        )
      )
      .returning();
    return result.length > 0;
  }

  async getUserRejections(userId: string): Promise<UserOpportunityRejection[]> {
    return await this.db
      .select()
      .from(userOpportunityRejections)
      .where(eq(userOpportunityRejections.userId, userId));
  }

  async isOpportunityRejected(userId: string, opportunityId: string): Promise<boolean> {
    const [rejection] = await this.db
      .select()
      .from(userOpportunityRejections)
      .where(
        and(
          eq(userOpportunityRejections.userId, userId),
          eq(userOpportunityRejections.opportunityId, opportunityId)
        )
      )
      .limit(1);
    return !!rejection;
  }

  /**
   * Attach latest ticker daily brief to each opportunity
   * Groups opportunities by ticker and fetches latest brief for each unique ticker
   */
  private async attachLatestBriefs(opportunities: Opportunity[]): Promise<(Opportunity & { latestBrief?: any })[]> {
    // Get unique tickers
    const uniqueTickers = Array.from(new Set(opportunities.map(opp => opp.ticker.toUpperCase())));
    
    if (uniqueTickers.length === 0) {
      return opportunities;
    }

    this.log(`[attachLatestBriefs] Attaching briefs for ${uniqueTickers.length} unique tickers`);

    // Fetch latest brief for each ticker
    const briefsMap = new Map<string, TickerDailyBrief>();
    
    // Use a subquery to get the latest brief for each ticker
    for (const ticker of uniqueTickers) {
      const [latestBrief] = await this.db
        .select()
        .from(tickerDailyBriefs)
        .where(eq(tickerDailyBriefs.ticker, ticker))
        .orderBy(desc(tickerDailyBriefs.briefDate))
        .limit(1);
      
      if (latestBrief) {
        briefsMap.set(ticker, latestBrief);
        this.log(`[attachLatestBriefs] Found brief for ${ticker}: score=${latestBrief.newSignalScore}, date=${latestBrief.briefDate}`);
      } else {
        this.log(`[attachLatestBriefs] No brief found for ${ticker}`);
      }
    }

    this.log(`[attachLatestBriefs] Found ${briefsMap.size} briefs out of ${uniqueTickers.length} tickers`);

    // Attach brief data to opportunities
    const result = opportunities.map(opp => {
      const brief = briefsMap.get(opp.ticker.toUpperCase());
      if (brief) {
        // Attach brief data to opportunity object
        return {
          ...opp,
          latestBrief: {
            newSignalScore: brief.newSignalScore,
            scoreChange: brief.scoreChange,
            briefText: brief.briefText,
            stance: brief.stance,
            briefDate: brief.briefDate,
            priceChangePercent: brief.priceChangePercent,
            keyUpdates: brief.keyUpdates,
          }
        };
      }
      return opp;
    });

    const withBriefs = result.filter(r => r.latestBrief);
    this.log(`[attachLatestBriefs] Attached briefs to ${withBriefs.length} out of ${result.length} opportunities`);
    
    return result;
  }

  /**
   * Count opportunities from a batch that have score >= threshold (added to board)
   */
  async countOpportunitiesByBatchWithScore(batchId: string, minScore: number): Promise<number> {
    // Get all opportunities from this batch
    const batchOpportunities = await this.db
      .select({ ticker: opportunities.ticker })
      .from(opportunities)
      .where(eq(opportunities.batchId, batchId));
    
    if (batchOpportunities.length === 0) {
      return 0;
    }

    // Get unique tickers
    const uniqueTickers = Array.from(new Set(batchOpportunities.map(opp => opp.ticker.toUpperCase())));
    
    // Get analyses for these tickers
    const { stockAnalyses } = await import('@shared/schema');
    const upperTickers = uniqueTickers.map(t => t.toUpperCase());
    const analyses = await this.db
      .select()
      .from(stockAnalyses)
      .where(
        and(
          sql`UPPER(${stockAnalyses.ticker}) IN (${sql.join(upperTickers.map(t => sql`${t}`), sql`, `)})`,
          eq(stockAnalyses.status, 'completed')
        )
      );
    
    // Count tickers with score >= minScore
    let count = 0;
    for (const analysis of analyses) {
      const score = analysis.integratedScore ?? analysis.confidenceScore ?? 0;
      if (score >= minScore) {
        // Count all opportunities for this ticker from this batch
        const tickerOpps = batchOpportunities.filter(opp => opp.ticker.toUpperCase() === analysis.ticker.toUpperCase());
        count += tickerOpps.length;
      }
    }
    
    return count;
  }
}

