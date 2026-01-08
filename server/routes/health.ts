/**
 * Health check endpoints
 * Provides system health status for monitoring and load balancers
 */

import { Express } from "express";
import { db, pool, checkDatabaseHealth } from "../db";
import { getRedisConnection, isRedisConnected } from "../queue/connection";
import { checkQueueHealth } from "../queue";
import { createLogger } from "../logger";

const log = createLogger("health");

/**
 * Check database connectivity
 */
async function checkDatabase(): Promise<{ healthy: boolean; latency?: number; error?: string }> {
  try {
    const start = Date.now();
    await db.execute("SELECT 1");
    const latency = Date.now() - start;
    return { healthy: true, latency };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log.error("Database health check failed", error);
    return { healthy: false, error: errorMsg };
  }
}

/**
 * Check Redis connectivity
 */
async function checkRedis(): Promise<{ healthy: boolean; latency?: number; error?: string }> {
  try {
    const connection = getRedisConnection();
    const start = Date.now();
    await connection.ping();
    const latency = Date.now() - start;
    return { healthy: true, latency };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log.error("Redis health check failed", error);
    return { healthy: false, error: errorMsg };
  }
}

/**
 * Register health check routes
 */
export function registerHealthRoutes(app: Express): void {
  // Basic health check (for load balancers)
  app.get("/api/health", async (_req, res) => {
    try {
      const dbHealth = await checkDatabase();
      const redisHealth = await checkRedis();
      const queueHealth = await checkQueueHealth();

      const overallHealthy = dbHealth.healthy && redisHealth.healthy;

      const status = overallHealthy ? 200 : 503;
      const response = {
        status: overallHealthy ? "healthy" : "unhealthy",
        timestamp: new Date().toISOString(),
        services: {
          database: {
            status: dbHealth.healthy ? "up" : "down",
            ...(dbHealth.latency && { latency: `${dbHealth.latency}ms` }),
            ...(dbHealth.error && { error: dbHealth.error }),
          },
          redis: {
            status: redisHealth.healthy ? "up" : "down",
            ...(redisHealth.latency && { latency: `${redisHealth.latency}ms` }),
            ...(redisHealth.error && { error: redisHealth.error }),
          },
          queues: {
            status: queueHealth.redis ? "up" : "down",
            queues: queueHealth.queues,
            workers: queueHealth.workers,
          },
        },
      };

      res.status(status).json(response);
    } catch (error) {
      log.error("Health check endpoint error", error);
      res.status(503).json({
        status: "error",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Detailed health check (for monitoring systems)
  app.get("/api/health/detailed", async (_req, res) => {
    try {
      const dbHealth = await checkDatabase();
      const redisHealth = await checkRedis();
      const queueHealth = await checkQueueHealth();

      const overallHealthy = dbHealth.healthy && redisHealth.healthy;

      const response = {
        status: overallHealthy ? "healthy" : "unhealthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          unit: "MB",
        },
        services: {
          database: {
            status: dbHealth.healthy ? "up" : "down",
            ...(dbHealth.latency && { latency: `${dbHealth.latency}ms` }),
            ...(dbHealth.error && { error: dbHealth.error }),
          },
          redis: {
            status: redisHealth.healthy ? "up" : "down",
            connected: isRedisConnected(),
            ...(redisHealth.latency && { latency: `${redisHealth.latency}ms` }),
            ...(redisHealth.error && { error: redisHealth.error }),
          },
          queues: {
            status: queueHealth.redis ? "up" : "down",
            queues: queueHealth.queues,
            workers: queueHealth.workers,
          },
        },
        environment: {
          nodeEnv: process.env.NODE_ENV || "development",
          port: process.env.PORT || "5000",
        },
      };

      const status = overallHealthy ? 200 : 503;
      res.status(status).json(response);
    } catch (error) {
      log.error("Detailed health check endpoint error", error);
      res.status(503).json({
        status: "error",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Readiness check (for Kubernetes readiness probe)
  app.get("/api/health/ready", async (_req, res) => {
    try {
      const dbHealth = await checkDatabase();
      const redisHealth = await checkRedis();

      // Ready if both critical services are up
      const ready = dbHealth.healthy && redisHealth.healthy;

      if (ready) {
        res.status(200).json({
          status: "ready",
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(503).json({
          status: "not_ready",
          timestamp: new Date().toISOString(),
          services: {
            database: dbHealth.healthy ? "up" : "down",
            redis: redisHealth.healthy ? "up" : "down",
          },
        });
      }
    } catch (error) {
      log.error("Readiness check endpoint error", error);
      res.status(503).json({
        status: "not_ready",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Liveness check (for Kubernetes liveness probe)
  app.get("/api/health/live", (_req, res) => {
    // Liveness is just checking if the process is running
    res.status(200).json({
      status: "alive",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });
}

