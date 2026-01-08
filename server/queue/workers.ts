/**
 * BullMQ Worker Definitions
 * Defines workers that process jobs from queues
 */

import { Worker, Job } from "bullmq";
import { getRedisConnection } from "./connection";
import { QUEUE_NAMES, getQueue } from "./queues";
import { createLogger } from "../logger";
import type { IStorage } from "../storage";

const log = createLogger("queue:workers");

// Worker instances cache
const workers = new Map<string, Worker>();

/**
 * Create a worker for a queue
 */
export function createWorker(
  queueName: string,
  processor: (job: Job, storage: IStorage) => Promise<void>,
  storage: IStorage,
  options?: {
    concurrency?: number;
    limiter?: {
      max: number;
      duration: number;
    };
  }
): Worker {
  if (workers.has(queueName)) {
    log.warn(`Worker for ${queueName} already exists, returning existing worker`);
    return workers.get(queueName)!;
  }

  const connection = getRedisConnection();
  const worker = new Worker(
    queueName,
    async (job: Job) => {
      log.info(`Processing job ${job.id} from queue ${queueName}`);
      try {
        await processor(job, storage);
        log.info(`Job ${job.id} completed successfully`);
      } catch (error) {
        log.error(`Job ${job.id} failed`, error);
        throw error; // Re-throw to mark job as failed
      }
    },
    {
      connection,
      concurrency: options?.concurrency || 1,
      limiter: options?.limiter,
      removeOnComplete: {
        age: 24 * 3600,
        count: 1000,
      },
      removeOnFail: {
        age: 7 * 24 * 3600,
      },
    }
  );

  worker.on("completed", (job) => {
    log.info(`Job ${job.id} completed in queue ${queueName}`);
  });

  worker.on("failed", (job, err) => {
    log.error(`Job ${job?.id} failed in queue ${queueName}`, err);
  });

  worker.on("error", (err) => {
    log.error(`Worker error in queue ${queueName}`, err);
  });

  workers.set(queueName, worker);
  log.info(`Created worker for queue: ${queueName}`);
  
  return worker;
}

/**
 * Get all worker instances
 */
export function getAllWorkers(): Worker[] {
  return Array.from(workers.values());
}

/**
 * Close all workers gracefully
 */
export async function closeAllWorkers(): Promise<void> {
  log.info("Closing all workers...");
  await Promise.all(Array.from(workers.values()).map(worker => worker.close()));
  workers.clear();
}

