/**
 * Queue System Entry Point
 * Initializes the BullMQ job queue system
 */

import { getRedisConnection, isRedisConnected, closeRedisConnection } from "./connection";
import { initializeScheduledJobs } from "./schedulers";
import { createWorker, closeAllWorkers } from "./workers";
import { createEnhancedWorker, closeAllEnhancedWorkers } from "./enhancedWorkers";
import { jobProcessors } from "./jobProcessors";
import { QUEUE_NAMES, closeAllQueues } from "./queues";
import type { IStorage } from "../storage";
import { createLogger } from "../logger";

const log = createLogger("queue");

// Use enhanced workers if enabled (default: true)
const USE_ENHANCED_WORKERS = process.env.USE_ENHANCED_WORKERS !== "false";

/**
 * Initialize the queue system
 * Sets up Redis connection, schedules jobs, and starts workers
 */
export async function initializeQueueSystem(storage: IStorage): Promise<void> {
  log.info("Initializing queue system...");

  // Check Redis connection
  try {
    const connection = getRedisConnection();
    await connection.ping();
    log.info("Redis connection verified");
  } catch (error) {
    log.error("Failed to connect to Redis", error);
    throw new Error("Redis connection failed. Queue system requires Redis.");
  }

  // Initialize scheduled jobs
  await initializeScheduledJobs();

  if (USE_ENHANCED_WORKERS) {
    // Use enhanced workers with event-driven processing and configurable concurrency
    log.info("Using enhanced workers with event-driven processing");
    for (const queueName of Object.keys(jobProcessors) as QUEUE_NAMES[]) {
      createEnhancedWorker(queueName, storage);
    }
  } else {
    // Use basic workers (backward compatibility)
    log.info("Using basic workers (legacy mode)");
    for (const [queueName, processor] of Object.entries(jobProcessors)) {
      createWorker(queueName, processor, storage, {
        concurrency: 1, // Process one job at a time per queue
      });
    }
  }

  log.info("Queue system initialized successfully", {
    enhancedWorkers: USE_ENHANCED_WORKERS,
    queueCount: Object.keys(jobProcessors).length,
  });
}

/**
 * Shutdown the queue system gracefully
 */
export async function shutdownQueueSystem(): Promise<void> {
  log.info("Shutting down queue system...");
  
  if (USE_ENHANCED_WORKERS) {
    await closeAllEnhancedWorkers();
  } else {
    await closeAllWorkers();
  }
  
  await closeAllQueues();
  await closeRedisConnection();
  
  log.info("Queue system shut down");
}

/**
 * Check if queue system is healthy
 */
export async function checkQueueHealth(): Promise<{
  redis: boolean;
  queues: number;
  workers: number;
  metrics?: Record<string, any>;
}> {
  const redisHealthy = isRedisConnected();
  const queues = Object.keys(QUEUE_NAMES).length;
  
  if (USE_ENHANCED_WORKERS) {
    const { getWorkers, getWorkerMetrics } = await import("./enhancedWorkers");
    const workers = getWorkers();
    const metrics = await getWorkerMetrics();
    
    return {
      redis: redisHealthy,
      queues,
      workers: workers.size,
      metrics,
    };
  } else {
    return {
      redis: redisHealthy,
      queues,
      workers: Object.keys(jobProcessors).length, // Estimate
    };
  }
}

