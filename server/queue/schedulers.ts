/**
 * BullMQ Queue Schedulers
 * Schedules recurring jobs using BullMQ's repeatable jobs feature
 */

import { getQueue, QUEUE_NAMES } from "./queues";
import { createLogger } from "../logger";

const log = createLogger("queue:schedulers");

/**
 * Schedule a recurring job
 */
export async function scheduleRecurringJob(
  queueName: string,
  jobName: string,
  pattern: string | number, // Cron pattern or interval in ms
  jobData?: any
): Promise<void> {
  const queue = getQueue(queueName);
  
  // Remove existing repeatable job if it exists
  const repeatableJobs = await queue.getRepeatableJobs();
  const existing = repeatableJobs.find(job => job.name === jobName);
  if (existing) {
    await queue.removeRepeatableByKey(existing.key);
    log.info(`Removed existing repeatable job: ${jobName}`);
  }

  // Add new repeatable job
  await queue.add(
    jobName,
    jobData || {},
    {
      repeat: {
        pattern: typeof pattern === "string" ? pattern : undefined,
        every: typeof pattern === "number" ? pattern : undefined,
      },
    }
  );

  log.info(`Scheduled recurring job: ${jobName} in queue ${queueName} with pattern: ${pattern}`);
}

/**
 * Remove a recurring job
 */
export async function removeRecurringJob(queueName: string, jobName: string): Promise<void> {
  const queue = getQueue(queueName);
  const repeatableJobs = await queue.getRepeatableJobs();
  const existing = repeatableJobs.find(job => job.name === jobName);
  
  if (existing) {
    await queue.removeRepeatableByKey(existing.key);
    log.info(`Removed recurring job: ${jobName} from queue ${queueName}`);
  } else {
    log.warn(`Recurring job ${jobName} not found in queue ${queueName}`);
  }
}

/**
 * Initialize all scheduled jobs
 * This should be called on server startup
 */
export async function initializeScheduledJobs(): Promise<void> {
  log.info("Initializing scheduled jobs...");

  // Price update - every 5 minutes
  await scheduleRecurringJob(
    QUEUE_NAMES.PRICE_UPDATE,
    "update-prices",
    5 * 60 * 1000 // 5 minutes
  );

  // Candlestick data - once a day (at 4:30 PM ET, after market close)
  await scheduleRecurringJob(
    QUEUE_NAMES.CANDLESTICK_DATA,
    "fetch-candlestick-data",
    "30 16 * * 1-5" // 4:30 PM ET, Monday-Friday
  );

  // Holdings price history - every 5 minutes
  await scheduleRecurringJob(
    QUEUE_NAMES.HOLDINGS_PRICE_HISTORY,
    "update-holdings-price-history",
    5 * 60 * 1000 // 5 minutes
  );

  // Telegram fetch - every hour
  await scheduleRecurringJob(
    QUEUE_NAMES.TELEGRAM_FETCH,
    "fetch-telegram-messages",
    60 * 60 * 1000 // 1 hour
  );

  // OpenInsider fetch - every hour (or daily for trial users, handled in job)
  await scheduleRecurringJob(
    QUEUE_NAMES.OPENINSIDER_FETCH,
    "fetch-openinsider-data",
    60 * 60 * 1000 // 1 hour
  );

  // Recommendation cleanup - once a day (at 2 AM)
  await scheduleRecurringJob(
    QUEUE_NAMES.RECOMMENDATION_CLEANUP,
    "cleanup-old-recommendations",
    "0 2 * * *" // 2 AM daily
  );

  // Simulated rule execution - every 5 minutes (during market hours, handled in job)
  await scheduleRecurringJob(
    QUEUE_NAMES.SIMULATED_RULE_EXECUTION,
    "execute-simulated-rules",
    5 * 60 * 1000 // 5 minutes
  );

  // AI analysis - every 10 minutes
  await scheduleRecurringJob(
    QUEUE_NAMES.AI_ANALYSIS,
    "analyze-new-stocks",
    10 * 60 * 1000 // 10 minutes
  );

  // Analysis reconciliation - every hour
  await scheduleRecurringJob(
    QUEUE_NAMES.ANALYSIS_RECONCILIATION,
    "reconcile-incomplete-analyses",
    60 * 60 * 1000 // 1 hour
  );

  // Daily brief - once a day (at 6 AM)
  await scheduleRecurringJob(
    QUEUE_NAMES.DAILY_BRIEF,
    "generate-daily-briefs",
    "0 6 * * *" // 6 AM daily
  );

  // Unverified user cleanup - every 6 hours
  await scheduleRecurringJob(
    QUEUE_NAMES.UNVERIFIED_USER_CLEANUP,
    "cleanup-unverified-users",
    6 * 60 * 60 * 1000 // 6 hours
  );

  // Cleanup stale stocks - once a day (at 3 AM)
  await scheduleRecurringJob(
    QUEUE_NAMES.CLEANUP_STALE_STOCKS,
    "cleanup-stale-stocks",
    "0 3 * * *" // 3 AM daily
  );

  // Ticker daily brief - once a day (at 5 AM)
  await scheduleRecurringJob(
    QUEUE_NAMES.TICKER_DAILY_BRIEF,
    "generate-ticker-daily-briefs",
    "0 5 * * *" // 5 AM daily
  );

  log.info("All scheduled jobs initialized");
}

