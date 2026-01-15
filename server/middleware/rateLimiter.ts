/**
 * Rate limiting middleware with Redis store
 * Provides global and route-specific rate limiting
 */

import { Request, Response, NextFunction } from "express";
import { RateLimiterRedis, RateLimiterMemory } from "rate-limiter-flexible";
import { getRedisConnection, isRedisConnected } from "../queue/connection";
import { createLogger } from "../logger";

const log = createLogger("rateLimiter");

// Rate limiter instances cache
const limiters = new Map<string, RateLimiterRedis | RateLimiterMemory>();

/**
 * Get or create a rate limiter
 * Falls back to in-memory limiter if Redis is unavailable
 */
function getRateLimiter(
  keyPrefix: string,
  options: {
    points: number; // Number of requests
    duration: number; // Per duration in seconds
    blockDuration?: number; // Block duration in seconds after limit exceeded
  }
): RateLimiterRedis | RateLimiterMemory {
  const cacheKey = `${keyPrefix}:${options.points}:${options.duration}`;
  
  if (limiters.has(cacheKey)) {
    return limiters.get(cacheKey)!;
  }

  let limiter: RateLimiterRedis | RateLimiterMemory;

  if (isRedisConnected()) {
    try {
      const redisClient = getRedisConnection();
      limiter = new RateLimiterRedis({
        storeClient: redisClient,
        keyPrefix,
        points: options.points,
        duration: options.duration,
        blockDuration: options.blockDuration || options.duration,
      });
      log.info(`Created Redis-backed rate limiter: ${keyPrefix} (${options.points} requests per ${options.duration}s)`);
    } catch (error) {
      log.warn(`Failed to create Redis rate limiter, falling back to memory: ${keyPrefix}`, error);
      limiter = new RateLimiterMemory({
        keyPrefix,
        points: options.points,
        duration: options.duration,
        blockDuration: options.blockDuration || options.duration,
      });
    }
  } else {
    log.warn(`Redis not available, using in-memory rate limiter: ${keyPrefix}`);
    limiter = new RateLimiterMemory({
      keyPrefix,
      points: options.points,
      duration: options.duration,
      blockDuration: options.blockDuration || options.duration,
    });
  }

  limiters.set(cacheKey, limiter);
  return limiter;
}

/**
 * Create rate limiting middleware
 */
export function createRateLimiter(options: {
  points: number;
  duration: number;
  blockDuration?: number;
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  message?: string;
}) {
  const limiter = getRateLimiter("rl", {
    points: options.points,
    duration: options.duration,
    blockDuration: options.blockDuration,
  });

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Generate key (default: IP address, or custom keyGenerator)
      const key = options.keyGenerator 
        ? options.keyGenerator(req)
        : req.ip || req.socket.remoteAddress || "unknown";

      // Consume a point
      await limiter.consume(key);

      // If we get here, request is allowed
      next();
    } catch (rateLimiterRes: any) {
      // Rate limit exceeded
      const retryAfter = Math.round(rateLimiterRes.msBeforeNext / 1000) || 1;
      
      // Set Retry-After header BEFORE sending response
      res.setHeader("Retry-After", retryAfter);
      
      res.status(429).json({
        error: options.message || "Too many requests, please try again later",
        retryAfter,
        limit: options.points,
        window: options.duration,
      });
    }
  };
}

/**
 * Global API rate limiter
 * Applies to all /api/* routes
 * In development: 1000 requests per 15 minutes per IP
 * In production: 100 requests per 15 minutes per IP
 */
export const globalApiRateLimiter = createRateLimiter({
  points: process.env.NODE_ENV === "production" ? 100 : 1000, // Very lenient in development
  duration: 15 * 60, // 15 minutes
  blockDuration: process.env.NODE_ENV === "production" ? 15 * 60 : 10, // Very short block in development (10 seconds)
  message: "API rate limit exceeded. Please try again later.",
});

/**
 * Strict rate limiter for authentication endpoints
 * In development: 1000 requests per 15 minutes per IP (very lenient for development)
 * In production: 5 requests per 15 minutes per IP
 */
export const authRateLimiter = createRateLimiter({
  points: process.env.NODE_ENV === "production" ? 5 : 1000, // Very lenient in development
  duration: 15 * 60, // 15 minutes
  blockDuration: process.env.NODE_ENV === "production" ? 30 * 60 : 10, // Very short block in development (10 seconds)
  message: "Too many authentication attempts. Please try again later.",
});

/**
 * Rate limiter for password reset endpoints
 * 3 requests per hour per IP
 */
export const passwordResetRateLimiter = createRateLimiter({
  points: 3,
  duration: 60 * 60, // 1 hour
  blockDuration: 60 * 60, // Block for 1 hour
  message: "Too many password reset attempts. Please try again later.",
});

/**
 * Rate limiter for email verification
 * 5 requests per hour per IP
 */
export const emailVerificationRateLimiter = createRateLimiter({
  points: 5,
  duration: 60 * 60, // 1 hour
  blockDuration: 60 * 60, // Block for 1 hour
  message: "Too many email verification requests. Please try again later.",
});

/**
 * Rate limiter for user registration
 * 3 requests per hour per IP
 */
export const registrationRateLimiter = createRateLimiter({
  points: 3,
  duration: 60 * 60, // 1 hour
  blockDuration: 60 * 60, // Block for 1 hour
  message: "Too many registration attempts. Please try again later.",
});

/**
 * Rate limiter for admin endpoints
 * 200 requests per 15 minutes per IP
 */
export const adminRateLimiter = createRateLimiter({
  points: 200,
  duration: 15 * 60, // 15 minutes
  blockDuration: 15 * 60, // Block for 15 minutes
  message: "Admin API rate limit exceeded. Please try again later.",
});

/**
 * Rate limiter for webhook endpoints
 * 1000 requests per minute per IP (webhooks can be high volume)
 */
export const webhookRateLimiter = createRateLimiter({
  points: 1000,
  duration: 60, // 1 minute
  blockDuration: 60, // Block for 1 minute
  message: "Webhook rate limit exceeded.",
});

/**
 * Rate limiter for stock data refresh endpoints
 * 10 requests per minute per user
 */
export const stockDataRateLimiter = createRateLimiter({
  points: 10,
  duration: 60, // 1 minute
  blockDuration: 60, // Block for 1 minute
  keyGenerator: (req) => {
    // Use userId if authenticated, otherwise IP
    return req.session?.userId 
      ? `user:${req.session.userId}`
      : req.ip || req.socket.remoteAddress || "unknown";
  },
  message: "Too many stock data refresh requests. Please wait before trying again.",
});
