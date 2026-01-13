/**
 * Redis connection for BullMQ
 * Provides a shared Redis connection for all job queues
 */

import Redis from "ioredis";
import { createLogger } from "../logger";

const log = createLogger("queue:connection");

let redisClient: Redis | null = null;

/**
 * Get or create Redis connection
 * Uses REDIS_URL environment variable or defaults to localhost
 */
export function getRedisConnection(): Redis {
  if (redisClient) {
    return redisClient;
  }

  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
  
  log.info(`Connecting to Redis at ${redisUrl.replace(/:[^:@]+@/, ":****@")}`);

  redisClient = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      log.warn(`Redis connection retry attempt ${times}, waiting ${delay}ms`);
      return delay;
    },
    reconnectOnError: (err) => {
      const targetError = "READONLY";
      if (err.message.includes(targetError)) {
        log.error("Redis is in readonly mode, reconnecting...");
        return true;
      }
      return false;
    },
  });

  redisClient.on("connect", () => {
    log.info("Redis connection established");
  });

  redisClient.on("ready", () => {
    log.info("Redis connection ready");
  });

  redisClient.on("error", (err) => {
    log.error("Redis connection error", err);
  });

  redisClient.on("close", () => {
    log.warn("Redis connection closed");
  });

  redisClient.on("reconnecting", () => {
    log.info("Redis reconnecting...");
  });

  return redisClient;
}

/**
 * Close Redis connection gracefully
 */
export async function closeRedisConnection(): Promise<void> {
  if (redisClient) {
    log.info("Closing Redis connection...");
    await redisClient.quit();
    redisClient = null;
  }
}

/**
 * Check if Redis is connected
 */
export function isRedisConnected(): boolean {
  return redisClient?.status === "ready";
}

