/**
 * BullMQ Queue Definitions
 * Defines all job queues used in the application
 */

import { Queue } from "bullmq";
import { getRedisConnection } from "./connection";
import { createLogger } from "../logger";

const log = createLogger("queue:queues");

// Queue names
export const QUEUE_NAMES = {
  PRICE_UPDATE: "price-update",
  CANDLESTICK_DATA: "candlestick-data",
  HOLDINGS_PRICE_HISTORY: "holdings-price-history",
  TELEGRAM_FETCH: "telegram-fetch",
  OPENINSIDER_FETCH: "openinsider-fetch",
  RECOMMENDATION_CLEANUP: "recommendation-cleanup",
  SIMULATED_RULE_EXECUTION: "simulated-rule-execution",
  AI_ANALYSIS: "ai-analysis",
  ANALYSIS_RECONCILIATION: "analysis-reconciliation",
  DAILY_BRIEF: "daily-brief",
  UNVERIFIED_USER_CLEANUP: "unverified-user-cleanup",
  CLEANUP_STALE_STOCKS: "cleanup-stale-stocks",
  TICKER_DAILY_BRIEF: "ticker-daily-brief",
} as const;

// Queue instances cache
const queues = new Map<string, Queue>();

/**
 * Get or create a queue instance
 */
export function getQueue(name: string): Queue {
  if (queues.has(name)) {
    return queues.get(name)!;
  }

  const connection = getRedisConnection();
  const queue = new Queue(name, {
    connection,
    defaultJobOptions: {
      removeOnComplete: {
        age: 24 * 3600, // Keep completed jobs for 24 hours
        count: 1000, // Keep last 1000 completed jobs
      },
      removeOnFail: {
        age: 7 * 24 * 3600, // Keep failed jobs for 7 days
      },
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
    },
  });

  queues.set(name, queue);
  log.info(`Created queue: ${name}`);
  
  return queue;
}

/**
 * Get all queue instances
 */
export function getAllQueues(): Queue[] {
  return Array.from(queues.values());
}

/**
 * Close all queues gracefully
 */
export async function closeAllQueues(): Promise<void> {
  log.info("Closing all queues...");
  await Promise.all(Array.from(queues.values()).map(queue => queue.close()));
  queues.clear();
}

