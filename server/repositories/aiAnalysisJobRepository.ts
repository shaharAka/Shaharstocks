/**
 * AI Analysis Job Queue Repository
 * Handles the queue of AI analysis jobs for stock tickers
 */

import { BaseRepository } from "./base";
import { aiAnalysisJobs, stocks, stockAnalyses, type AiAnalysisJob, type InsertAiAnalysisJob } from "@shared/schema";
import { eq, desc, sql, and, inArray } from "drizzle-orm";

export interface IAiAnalysisJobRepository {
  enqueueAnalysisJob(ticker: string, source: string, priority?: string, force?: boolean): Promise<AiAnalysisJob>;
  cancelAnalysisJobsForTicker(ticker: string): Promise<void>;
  dequeueNextJob(): Promise<AiAnalysisJob | undefined>;
  getJobById(jobId: string): Promise<AiAnalysisJob | undefined>;
  getJobsByTicker(ticker: string): Promise<AiAnalysisJob[]>;
  updateJobStatus(jobId: string, status: string, updates?: Partial<AiAnalysisJob>): Promise<void>;
  updateJobProgress(jobId: string, currentStep: string, stepDetails: any): Promise<void>;
  resetStockAnalysisPhaseFlags(ticker: string): Promise<void>;
  markStockAnalysisPhaseComplete(ticker: string, phase: 'micro' | 'macro' | 'combined'): Promise<void>;
  getStocksWithIncompleteAnalysis(): Promise<any[]>;
  getQueueStats(): Promise<{ pending: number; processing: number; completed: number; failed: number }>;
  resetStuckProcessingJobs(timeoutMs: number): Promise<number>;
}

export class AiAnalysisJobRepository extends BaseRepository implements IAiAnalysisJobRepository {
  async enqueueAnalysisJob(ticker: string, source: string, priority: string = "normal", force: boolean = false): Promise<AiAnalysisJob> {
    // If force=true (for re-analysis), cancel any existing pending/processing jobs
    if (force) {
      await this.db
        .update(aiAnalysisJobs)
        .set({ status: "cancelled", completedAt: new Date() })
        .where(
          and(
            eq(aiAnalysisJobs.ticker, ticker),
            sql`${aiAnalysisJobs.status} IN ('pending', 'processing')`
          )
        );
      this.log(`Cancelled existing jobs for ${ticker} (force re-analysis)`);
    } else {
      // Check if there's already a pending or processing job for this ticker
      const [existingJob] = await this.db
        .select()
        .from(aiAnalysisJobs)
        .where(
          and(
            eq(aiAnalysisJobs.ticker, ticker),
            sql`${aiAnalysisJobs.status} IN ('pending', 'processing')`
          )
        )
        .limit(1);

      if (existingJob) {
        this.log(`Job already exists for ${ticker} with status ${existingJob.status}`);
        return existingJob;
      }
    }

    // Create new job (race condition protected by unique index)
    try {
      const [job] = await this.db
        .insert(aiAnalysisJobs)
        .values({
          ticker,
          source,
          priority,
          status: "pending",
          retryCount: 0,
          maxRetries: 3,
          scheduledAt: new Date(),
        })
        .returning();

      // Create or update analysis record with "analyzing" status
      // This ensures the frontend can show the analyzing state immediately
      const existingAnalysis = await this.db
        .select()
        .from(stockAnalyses)
        .where(eq(stockAnalyses.ticker, ticker))
        .limit(1);
      
      if (existingAnalysis.length > 0) {
        const analysis = existingAnalysis[0];
        // If force=true, ALWAYS reset to analyzing (user wants fresh analysis)
        // Otherwise, only update if not completed with integrated score
        if (force || analysis.status !== "completed" || !analysis.integratedScore) {
          // Delete old analysis when forcing a refresh to ensure fresh data
          if (force) {
            await this.db.delete(stockAnalyses).where(eq(stockAnalyses.ticker, ticker));
            await this.db.insert(stockAnalyses).values({
              ticker,
              status: "analyzing",
            });
            this.log(`Deleted old analysis for ${ticker} (forced refresh)`);
          } else {
            await this.db
              .update(stockAnalyses)
              .set({ status: "analyzing", errorMessage: null })
              .where(eq(stockAnalyses.ticker, ticker));
          }
        }
      } else {
        await this.db.insert(stockAnalyses).values({
          ticker,
          status: "analyzing",
        });
      }

      this.log(`Enqueued analysis job for ${ticker} (priority: ${priority}, source: ${source})`);
      return job;
    } catch (error: any) {
      // Handle race condition: unique constraint violation means another job was created simultaneously
      if (error.code === '23505' || error.message?.includes('unique')) {
        this.log(`Race condition detected for ${ticker}, fetching existing job`);
        const [existingJob] = await this.db
          .select()
          .from(aiAnalysisJobs)
          .where(
            and(
              eq(aiAnalysisJobs.ticker, ticker),
              sql`${aiAnalysisJobs.status} IN ('pending', 'processing')`
            )
          )
          .limit(1);
        
        if (existingJob) {
          return existingJob;
        }
      }
      // Re-throw unexpected errors
      throw error;
    }
  }

  async cancelAnalysisJobsForTicker(ticker: string): Promise<void> {
    await this.db
      .update(aiAnalysisJobs)
      .set({ status: "cancelled", completedAt: new Date() })
      .where(
        and(
          eq(aiAnalysisJobs.ticker, ticker),
          sql`${aiAnalysisJobs.status} IN ('pending', 'processing')`
        )
      );
    this.log(`Cancelled any active jobs for ${ticker}`);
  }

  async dequeueNextJob(): Promise<AiAnalysisJob | undefined> {
    // Use FOR UPDATE SKIP LOCKED to get next available job atomically
    // Priority order: high > normal > low, then oldest first
    const result = await this.db.execute(sql`
      UPDATE ai_analysis_jobs
      SET status = 'processing',
          started_at = NOW()
      WHERE id = (
        SELECT id
        FROM ai_analysis_jobs
        WHERE status = 'pending'
          AND scheduled_at <= NOW()
        ORDER BY
          CASE priority
            WHEN 'high' THEN 1
            WHEN 'normal' THEN 2
            WHEN 'low' THEN 3
            ELSE 4
          END,
          scheduled_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      RETURNING *
    `);

    // db.execute returns an object with rows property
    const jobs = result.rows as any[];
    return jobs.length > 0 ? jobs[0] as AiAnalysisJob : undefined;
  }

  async getJobById(jobId: string): Promise<AiAnalysisJob | undefined> {
    const [job] = await this.db
      .select()
      .from(aiAnalysisJobs)
      .where(eq(aiAnalysisJobs.id, jobId));
    return job;
  }

  async getJobsByTicker(ticker: string): Promise<AiAnalysisJob[]> {
    return await this.db
      .select()
      .from(aiAnalysisJobs)
      .where(eq(aiAnalysisJobs.ticker, ticker))
      .orderBy(desc(aiAnalysisJobs.createdAt));
  }

  async updateJobStatus(jobId: string, status: string, updates?: Partial<AiAnalysisJob>): Promise<void> {
    const updateData: Partial<AiAnalysisJob> = {
      status,
      ...updates,
    };

    // Set completion timestamp for completed/failed jobs
    if (status === "completed" || status === "failed") {
      updateData.completedAt = new Date();
    }

    await this.db
      .update(aiAnalysisJobs)
      .set(updateData)
      .where(eq(aiAnalysisJobs.id, jobId));

    this.log(`Updated job ${jobId} to status: ${status}`);
  }

  async updateJobProgress(jobId: string, currentStep: string, stepDetails: any): Promise<void> {
    await this.db
      .update(aiAnalysisJobs)
      .set({
        currentStep,
        stepDetails,
        lastError: null, // Clear error on successful progress update
      })
      .where(eq(aiAnalysisJobs.id, jobId));
  }

  async resetStockAnalysisPhaseFlags(ticker: string): Promise<void> {
    // Reset ALL phase completion flags for ALL stocks with this ticker
    // This ensures fresh progress tracking when a new analysis starts
    const result = await this.db.execute(sql`
      WITH lock AS (SELECT pg_advisory_xact_lock(hashtext(${ticker})))
      UPDATE ${stocks}
      SET 
        micro_analysis_completed = false,
        macro_analysis_completed = false,
        combined_analysis_completed = false
      WHERE ticker = ${ticker}
    `);

    this.log(`Reset phase flags for ${ticker} (updated ${result.rowCount || 0} rows)`);
  }

  async markStockAnalysisPhaseComplete(ticker: string, phase: 'micro' | 'macro' | 'combined'): Promise<void> {
    // Update ALL stocks with this ticker (handles multiple transactions per ticker)
    // Use advisory lock to prevent race conditions without subquery issues
    const fieldMap = {
      'micro': 'micro_analysis_completed',
      'macro': 'macro_analysis_completed',
      'combined': 'combined_analysis_completed',
    };

    const fieldName = fieldMap[phase];

    // Use advisory lock with PostgreSQL's hashtext() to prevent concurrent updates
    const result = await this.db.execute(sql`
      WITH lock AS (SELECT pg_advisory_xact_lock(hashtext(${ticker})))
      UPDATE ${stocks}
      SET ${sql.raw(fieldName)} = true
      WHERE ticker = ${ticker}
    `);

    this.log(`Marked ${phase} analysis complete for ${ticker} (updated ${result.rowCount || 0} rows)`);
  }

  async getStocksWithIncompleteAnalysis(): Promise<any[]> {
    // Get stocks where at least one analysis phase is incomplete AND there's no active job running
    const incompleteStocks = await this.db
      .select()
      .from(stocks)
      .where(
        and(
          eq(stocks.recommendationStatus, 'pending'),
          sql`(
            ${stocks.microAnalysisCompleted} = false
            OR ${stocks.macroAnalysisCompleted} = false
            OR ${stocks.combinedAnalysisCompleted} = false
          )`,
          sql`NOT EXISTS (
            SELECT 1 FROM ${aiAnalysisJobs}
            WHERE ${aiAnalysisJobs.ticker} = ${stocks.ticker}
            AND ${aiAnalysisJobs.status} IN ('pending', 'processing')
          )`
        )
      );

    return incompleteStocks;
  }

  async getQueueStats(): Promise<{ pending: number; processing: number; completed: number; failed: number }> {
    const stats = await this.db
      .select({
        status: aiAnalysisJobs.status,
        count: sql<number>`count(*)::int`,
      })
      .from(aiAnalysisJobs)
      .groupBy(aiAnalysisJobs.status);

    const result = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
    };

    for (const stat of stats) {
      if (stat.status in result) {
        result[stat.status as keyof typeof result] = stat.count;
      }
    }

    return result;
  }

  async resetStuckProcessingJobs(timeoutMs: number): Promise<number> {
    // Reset jobs that have been stuck in 'processing' state for longer than the timeout
    const timeoutInterval = `${Math.floor(timeoutMs / 1000)} seconds`;
    
    const result = await this.db.execute(sql`
      UPDATE ai_analysis_jobs
      SET status = 'pending',
          started_at = NULL,
          retry_count = retry_count + 1
      WHERE status = 'processing'
        AND started_at < NOW() - INTERVAL '${sql.raw(timeoutInterval)}'
    `);
    
    return (result as any).rowCount || 0;
  }
}

