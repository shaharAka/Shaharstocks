/**
 * Opportunity Repository
 * Handles global opportunities (unified for all users) and user rejections
 */

import { BaseRepository } from "./base";
import { opportunities, opportunityBatches, userOpportunityRejections, followedStocks, tickerDailyBriefs, type Opportunity, type InsertOpportunity, type OpportunityBatch, type InsertOpportunityBatch, type UserOpportunityRejection, type InsertUserOpportunityRejection, type TickerDailyBrief } from "@shared/schema";
import { eq, desc, sql, and, or, inArray, gte } from "drizzle-orm";

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
  getLatestBatch(cadence: 'daily' | 'hourly' | 'realtime'): Promise<OpportunityBatch | undefined>;
  getLatestBatchWithStats(): Promise<OpportunityBatch | undefined>;
  promoteSecRealtimeToHourly(): Promise<{ promoted: number } | null>;
  countOpportunitiesByBatchWithScore(batchId: string, minScore: number): Promise<number>;
  countOpportunitiesByBatchInQueue(batchId: string): Promise<number>;
  countOpportunitiesByBatchPending(batchId: string): Promise<number>;
  countOpportunitiesByBatchAnalyzing(batchId: string): Promise<number>;
  
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
    } else if (options?.cadence === 'realtime') {
      conditions.push(eq(opportunities.cadence, 'realtime'));
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

  async getLatestBatch(cadence: 'daily' | 'hourly' | 'realtime'): Promise<OpportunityBatch | undefined> {
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

  async promoteSecRealtimeToHourly(): Promise<{ promoted: number } | null> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const rows = await this.db
      .select({ id: opportunities.id })
      .from(opportunities)
      .where(
        and(
          eq(opportunities.cadence, "realtime"),
          eq(opportunities.source, "sec"),
          gte(opportunities.createdAt, oneHourAgo)
        )
      );

    if (rows.length === 0) return null;

    const roundHour = new Date();
    roundHour.setUTCMinutes(0, 0, 0);
    roundHour.setUTCSeconds(0, 0);

    const batch = await this.createOpportunityBatch({
      cadence: "hourly",
      source: "sec",
      count: rows.length,
      fetchedAt: roundHour,
    });

    await this.db
      .update(opportunities)
      .set({ cadence: "hourly", batchId: batch.id })
      .where(inArray(opportunities.id, rows.map((r) => r.id)));

    return { promoted: rows.length };
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
   * Uses brief scores (preferred) or analysis scores (fallback) to match frontend display logic
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
    
    // Get latest briefs for these tickers (preferred source, matches frontend)
    const briefsMap = new Map<string, TickerDailyBrief>();
    
    for (const ticker of uniqueTickers) {
      const [latestBrief] = await this.db
        .select()
        .from(tickerDailyBriefs)
        .where(eq(tickerDailyBriefs.ticker, ticker))
        .orderBy(desc(tickerDailyBriefs.briefDate))
        .limit(1);
      
      if (latestBrief) {
        briefsMap.set(ticker, latestBrief);
      }
    }
    
    // Get analyses as fallback (for opportunities without briefs yet)
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
    
    // Count opportunities with score >= minScore
    // Match frontend logic: prefer brief score, fall back to analysis score
    let count = 0;
    for (const opp of batchOpportunities) {
      const ticker = opp.ticker.toUpperCase();
      const brief = briefsMap.get(ticker);
      const analysis = analyses.find(a => a.ticker.toUpperCase() === ticker);
      
      // Use same logic as frontend: brief score preferred, then analysis score
      const score = brief?.newSignalScore ?? analysis?.integratedScore ?? analysis?.confidenceScore ?? 0;
      
      if (score >= minScore) {
        count++;
      }
    }
    
    return count;
  }

  /**
   * Count opportunities from a batch that are in the analysis queue (pending or processing)
   */
  async countOpportunitiesByBatchInQueue(batchId: string): Promise<number> {
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
    
    // Check which tickers have pending or processing analysis jobs
    const { aiAnalysisJobs } = await import('@shared/schema');
    const upperTickers = uniqueTickers.map(t => t.toUpperCase());
    const jobsInQueue = await this.db
      .select({ ticker: aiAnalysisJobs.ticker })
      .from(aiAnalysisJobs)
      .where(
        and(
          sql`UPPER(${aiAnalysisJobs.ticker}) IN (${sql.join(upperTickers.map(t => sql`${t}`), sql`, `)})`,
          sql`${aiAnalysisJobs.status} IN ('pending', 'processing')`
        )
      );
    
    const tickersInQueue = new Set(jobsInQueue.map(j => j.ticker.toUpperCase()));
    
    // Count opportunities for tickers that are in the queue
    let count = 0;
    for (const opp of batchOpportunities) {
      if (tickersInQueue.has(opp.ticker.toUpperCase())) {
        count++;
      }
    }
    
    return count;
  }

  /**
   * Count opportunities from a batch that are pending analysis (status = 'pending', not processing)
   */
  async countOpportunitiesByBatchPending(batchId: string): Promise<number> {
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
    
    // Get tickers that have processing jobs (to exclude them from pending count)
    const { aiAnalysisJobs } = await import('@shared/schema');
    const upperTickers = uniqueTickers.map(t => t.toUpperCase());
    const processingJobs = await this.db
      .select({ ticker: aiAnalysisJobs.ticker })
      .from(aiAnalysisJobs)
      .where(
        and(
          sql`UPPER(${aiAnalysisJobs.ticker}) IN (${sql.join(upperTickers.map(t => sql`${t}`), sql`, `)})`,
          eq(aiAnalysisJobs.status, 'processing')
        )
      );
    
    const tickersProcessing = new Set(processingJobs.map(j => j.ticker.toUpperCase()));
    
    // Get tickers that have pending jobs (but not processing)
    const pendingJobs = await this.db
      .select({ ticker: aiAnalysisJobs.ticker })
      .from(aiAnalysisJobs)
      .where(
        and(
          sql`UPPER(${aiAnalysisJobs.ticker}) IN (${sql.join(upperTickers.map(t => sql`${t}`), sql`, `)})`,
          eq(aiAnalysisJobs.status, 'pending')
        )
      );
    
    const tickersPending = new Set(pendingJobs.map(j => j.ticker.toUpperCase()));
    
    // Count opportunities for tickers that are pending (and not currently processing)
    let count = 0;
    for (const opp of batchOpportunities) {
      const ticker = opp.ticker.toUpperCase();
      if (tickersPending.has(ticker) && !tickersProcessing.has(ticker)) {
        count++;
      }
    }
    
    return count;
  }

  /**
   * Count opportunities from a batch that are currently being analyzed (status = 'processing')
   */
  async countOpportunitiesByBatchAnalyzing(batchId: string): Promise<number> {
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
    
    // Check which tickers have processing analysis jobs (not pending, only actively processing)
    const { aiAnalysisJobs } = await import('@shared/schema');
    const upperTickers = uniqueTickers.map(t => t.toUpperCase());
    const processingJobs = await this.db
      .select({ ticker: aiAnalysisJobs.ticker })
      .from(aiAnalysisJobs)
      .where(
        and(
          sql`UPPER(${aiAnalysisJobs.ticker}) IN (${sql.join(upperTickers.map(t => sql`${t}`), sql`, `)})`,
          eq(aiAnalysisJobs.status, 'processing')
        )
      );
    
    const tickersProcessing = new Set(processingJobs.map(j => j.ticker.toUpperCase()));
    
    // Count opportunities for tickers that are currently being processed
    let count = 0;
    for (const opp of batchOpportunities) {
      if (tickersProcessing.has(opp.ticker.toUpperCase())) {
        count++;
      }
    }
    
    return count;
  }

  /**
   * Count opportunities from a batch that have score < threshold (rejected by score)
   * Uses brief scores (preferred) or analysis scores (fallback)
   */
  async countOpportunitiesByBatchRejectedByScore(batchId: string, maxScore: number): Promise<number> {
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
    
    // Get latest briefs for these tickers (preferred source)
    const briefsMap = new Map<string, TickerDailyBrief>();
    for (const ticker of uniqueTickers) {
      const [latestBrief] = await this.db
        .select()
        .from(tickerDailyBriefs)
        .where(eq(tickerDailyBriefs.ticker, ticker))
        .orderBy(desc(tickerDailyBriefs.briefDate))
        .limit(1);
      
      if (latestBrief) {
        briefsMap.set(ticker, latestBrief);
      }
    }
    
    // Get analyses as fallback (for opportunities without briefs yet)
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
    
    // Count opportunities with score < maxScore
    // Match frontend logic: prefer brief score, fall back to analysis score
    let count = 0;
    for (const opp of batchOpportunities) {
      const ticker = opp.ticker.toUpperCase();
      const brief = briefsMap.get(ticker);
      const analysis = analyses.find(a => a.ticker.toUpperCase() === ticker);
      
      // Use same logic as frontend: brief score preferred, then analysis score
      const score = brief?.newSignalScore ?? analysis?.integratedScore ?? analysis?.confidenceScore ?? 0;
      
      // Only count if score is < maxScore AND analysis is completed (not in queue)
      // If no analysis/brief exists, don't count as rejected (it's still in queue)
      if ((brief || analysis) && score < maxScore) {
        count++;
      }
    }
    
    return count;
  }
}

