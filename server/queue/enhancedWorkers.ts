/**
 * Enhanced Workers Configuration
 * Provides event-driven processing and configurable concurrency
 */

import { Worker, Job } from "bullmq";
import { getRedisConnection } from "./connection";
import { createLogger } from "../logger";
import type { IStorage } from "../storage";
import { jobProcessors } from "./jobProcessors";
import { QUEUE_NAMES } from "./queues";
import { eventDispatcher } from "../eventDispatcher";

const log = createLogger("queue:enhanced-workers");

// Worker concurrency configuration (can be overridden via env vars)
const WORKER_CONCURRENCY: Record<string, number> = {
  [QUEUE_NAMES.PRICE_UPDATE]: parseInt(process.env.WORKER_PRICE_UPDATE_CONCURRENCY || "2", 10),
  [QUEUE_NAMES.CANDLESTICK_DATA]: parseInt(process.env.WORKER_CANDLESTICK_CONCURRENCY || "1", 10),
  [QUEUE_NAMES.HOLDINGS_PRICE_HISTORY]: parseInt(process.env.WORKER_HOLDINGS_CONCURRENCY || "2", 10),
  [QUEUE_NAMES.TELEGRAM_FETCH]: parseInt(process.env.WORKER_TELEGRAM_CONCURRENCY || "1", 10),
  [QUEUE_NAMES.OPENINSIDER_FETCH]: parseInt(process.env.WORKER_OPENINSIDER_CONCURRENCY || "1", 10),
  [QUEUE_NAMES.CLEANUP_STALE_STOCKS]: parseInt(process.env.WORKER_CLEANUP_CONCURRENCY || "1", 10),
  [QUEUE_NAMES.RECOMMENDATION_CLEANUP]: parseInt(process.env.WORKER_RECOMMENDATION_CLEANUP_CONCURRENCY || "1", 10),
  [QUEUE_NAMES.SIMULATED_RULE_EXECUTION]: parseInt(process.env.WORKER_SIMULATED_RULE_CONCURRENCY || "2", 10),
  [QUEUE_NAMES.AI_ANALYSIS]: parseInt(process.env.WORKER_AI_ANALYSIS_CONCURRENCY || "3", 10), // Increased for AI jobs
  [QUEUE_NAMES.ANALYSIS_RECONCILIATION]: parseInt(process.env.WORKER_ANALYSIS_RECONCILIATION_CONCURRENCY || "1", 10),
  [QUEUE_NAMES.DAILY_BRIEF]: parseInt(process.env.WORKER_DAILY_BRIEF_CONCURRENCY || "2", 10),
  [QUEUE_NAMES.UNVERIFIED_USER_CLEANUP]: parseInt(process.env.WORKER_UNVERIFIED_CLEANUP_CONCURRENCY || "1", 10),
  [QUEUE_NAMES.TICKER_DAILY_BRIEF]: parseInt(process.env.WORKER_TICKER_DAILY_BRIEF_CONCURRENCY || "2", 10),
};

// Worker configuration for retries and backoff
const WORKER_CONFIG: Record<string, {
  attempts?: number;
  backoff?: {
    type: "exponential" | "fixed";
    delay: number;
  };
}> = {
  [QUEUE_NAMES.AI_ANALYSIS]: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000, // Start with 5 seconds, exponential backoff
    },
  },
  [QUEUE_NAMES.PRICE_UPDATE]: {
    attempts: 3,
    backoff: {
      type: "fixed",
      delay: 2000, // 2 second delay between retries
    },
  },
  // Add more configurations as needed
};

const workers: Map<QUEUE_NAMES, Worker> = new Map();

/**
 * Create an enhanced worker with event-driven processing and configured concurrency
 */
export function createEnhancedWorker(
  queueName: QUEUE_NAMES,
  storage: IStorage,
  customConcurrency?: number
): Worker {
  if (workers.has(queueName)) {
    log.warn(`Worker for queue '${queueName}' already exists, returning existing worker`);
    return workers.get(queueName)!;
  }

  const connection = getRedisConnection();
  const concurrency = customConcurrency ?? WORKER_CONCURRENCY[queueName] ?? 1;
  const config = WORKER_CONFIG[queueName] || {};

  const processor = jobProcessors[queueName as keyof typeof jobProcessors];
  if (!processor) {
    throw new Error(`No processor found for queue: ${queueName}`);
  }

  const worker = new Worker(
    queueName,
    async (job: Job) => {
      const jobStartTime = Date.now();
      const jobId = job.id;
      const jobName = job.name;

      log.info(`[${queueName}] Starting job '${jobName}' (ID: ${jobId})`, {
        queue: queueName,
        jobId,
        jobName,
        data: job.data,
      });

      // Emit job started event
      eventDispatcher.emit("job:started", {
        queue: queueName,
        jobId: String(jobId),
        jobName,
        data: job.data,
      });

      try {
        // Execute the job processor
        const result = await processor(job, storage);

        const duration = Date.now() - jobStartTime;

        log.info(`[${queueName}] Job '${jobName}' (ID: ${jobId}) completed successfully in ${duration}ms`, {
          queue: queueName,
          jobId,
          jobName,
          duration,
        });

        // Emit job completed event
        eventDispatcher.emit("job:completed", {
          queue: queueName,
          jobId: String(jobId),
          jobName,
          duration,
          result,
        });

        return result;
      } catch (error) {
        const duration = Date.now() - jobStartTime;
        const errorMessage = error instanceof Error ? error.message : String(error);

        log.error(`[${queueName}] Job '${jobName}' (ID: ${jobId}) failed after ${duration}ms: ${errorMessage}`, error, {
          queue: queueName,
          jobId,
          jobName,
          duration,
          attempt: job.attemptsMade,
          maxAttempts: job.opts.attempts,
        });

        // Emit job failed event
        eventDispatcher.emit("job:failed", {
          queue: queueName,
          jobId: String(jobId),
          jobName,
          duration,
          error: errorMessage,
          attempt: job.attemptsMade,
          maxAttempts: job.opts.attempts,
          willRetry: (job.opts.attempts || 1) > (job.attemptsMade || 0),
        });

        // Re-throw to let BullMQ handle retries
        throw error;
      }
    },
    {
      connection,
      concurrency,
      removeOnComplete: {
        age: 24 * 3600, // Keep completed jobs for 24 hours
        count: 1000, // Keep last 1000 completed jobs
      },
      removeOnFail: {
        age: 7 * 24 * 3600, // Keep failed jobs for 7 days
      },
      ...config,
    }
  );

  // Worker event handlers
  worker.on("completed", (job) => {
    log.debug(`[${queueName}] Worker event: job completed`, {
      queue: queueName,
      jobId: job.id,
      jobName: job.name,
    });
  });

  worker.on("failed", (job, err) => {
    // Error already logged in processor try/catch, but log worker event
    log.debug(`[${queueName}] Worker event: job failed`, {
      queue: queueName,
      jobId: job?.id,
      jobName: job?.name,
      error: err.message,
    });
  });

  worker.on("error", (err) => {
    log.error(`[${queueName}] Worker error: ${err.message}`, err, {
      queue: queueName,
    });
  });

  worker.on("stalled", (jobId) => {
    log.warn(`[${queueName}] Job stalled: ${jobId}`, {
      queue: queueName,
      jobId: String(jobId),
    });
    
    eventDispatcher.emit("job:stalled", {
      queue: queueName,
      jobId: String(jobId),
    });
  });

  worker.on("drained", () => {
    log.info(`[${queueName}] Worker drained (all jobs processed)`, {
      queue: queueName,
    });
  });

  workers.set(queueName, worker);
  log.info(`Enhanced worker for queue '${queueName}' created with concurrency ${concurrency}`, {
    queue: queueName,
    concurrency,
    config: config.attempts ? { attempts: config.attempts, backoff: config.backoff } : undefined,
  });

  return worker;
}

/**
 * Get all active workers
 */
export function getWorkers(): Map<QUEUE_NAMES, Worker> {
  return workers;
}

/**
 * Close all enhanced workers
 */
export async function closeAllEnhancedWorkers(): Promise<void> {
  log.info("Closing all enhanced workers...", {
    workerCount: workers.size,
  });

  await Promise.all(
    Array.from(workers.entries()).map(async ([queueName, worker]) => {
      try {
        await worker.close();
        log.info(`Enhanced worker closed: ${queueName}`, {
          queue: queueName,
        });
      } catch (error) {
        log.error(`Error closing enhanced worker ${queueName}`, error, {
          queue: queueName,
        });
      }
    })
  );

  workers.clear();
  log.info("All enhanced workers closed");
}

/**
 * Get worker metrics
 */
export async function getWorkerMetrics(): Promise<Record<string, {
  queue: string;
  concurrency: number;
  isRunning: boolean;
  active: number;
  waiting: number;
}>> {
  const metrics: Record<string, any> = {};

  for (const [queueName, worker] of workers.entries()) {
    const isRunning = await worker.isRunning();
    const activeJobs = await worker.getActiveJobs();
    const waitingJobs = await worker.getWaitingJobs();

    metrics[queueName] = {
      queue: queueName,
      concurrency: worker.opts.concurrency || 1,
      isRunning,
      active: activeJobs.length,
      waiting: waitingJobs.length,
    };
  }

  return metrics;
}

