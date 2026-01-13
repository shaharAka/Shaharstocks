/**
 * Opportunity Repository
 * Handles global opportunities (unified for all users) and user rejections
 */

import { BaseRepository } from "./base";
import { opportunities, opportunityBatches, userOpportunityRejections, followedStocks, type Opportunity, type InsertOpportunity, type OpportunityBatch, type InsertOpportunityBatch, type UserOpportunityRejection, type InsertUserOpportunityRejection } from "@shared/schema";
import { eq, desc, sql, and } from "drizzle-orm";

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
  }): Promise<Opportunity[]> {
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
    
    // If userId provided, filter out rejected opportunities and followed tickers
    if (options?.userId) {
      const [rejections, followedStocksList] = await Promise.all([
        this.getUserRejections(options.userId),
        // Note: getUserFollowedStocks is in FollowedStockRepository - this will need to be injected
        // For now, we'll query directly to avoid circular dependency
        this.db
          .select()
          .from(followedStocks)
          .where(eq(followedStocks.userId, options.userId))
      ]);
      const rejectedIds = new Set(rejections.map(r => r.opportunityId));
      const followedTickers = new Set(followedStocksList.map(f => f.ticker.toUpperCase()));
      this.log(`[OpportunityRepository.getOpportunities] Rejections:`, rejectedIds.size, 'Followed tickers:', Array.from(followedTickers));
      
      const filtered = results.filter(opp => 
        !rejectedIds.has(opp.id) && 
        !followedTickers.has(opp.ticker.toUpperCase())
      );
      this.log(`[OpportunityRepository.getOpportunities] After filtering:`, filtered.length);
      return filtered;
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
}

