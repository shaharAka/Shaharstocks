/**
 * Redis caching layer
 * Provides TTL-based caching for expensive queries
 */

import { getRedisConnection, isRedisConnected } from "../queue/connection";
import { createLogger } from "../logger";

const log = createLogger("cache");

// Cache key prefixes for different data types
export const CACHE_PREFIXES = {
  USER: "user",
  STOCKS: "stocks",
  OPPORTUNITIES: "opportunities",
  ANALYSIS: "analysis",
  QUOTE: "quote",
  NEWS: "news",
  FOLLOWED_STOCKS: "followed",
  PORTFOLIO: "portfolio",
  TRADES: "trades",
} as const;

// Default TTL values (in seconds)
export const DEFAULT_TTL = {
  USER: 5 * 60, // 5 minutes
  STOCKS: 2 * 60, // 2 minutes
  OPPORTUNITIES: 1 * 60, // 1 minute
  ANALYSIS: 10 * 60, // 10 minutes (analyses change less frequently)
  QUOTE: 30, // 30 seconds (price data changes frequently)
  NEWS: 5 * 60, // 5 minutes
  FOLLOWED_STOCKS: 2 * 60, // 2 minutes
  PORTFOLIO: 1 * 60, // 1 minute
  TRADES: 30, // 30 seconds
} as const;

/**
 * Generate cache key
 */
function generateKey(prefix: string, ...parts: (string | number | undefined)[]): string {
  const validParts = parts.filter(p => p !== undefined && p !== null).map(String);
  return `${prefix}:${validParts.join(":")}`;
}

/**
 * Get value from cache
 */
export async function get<T>(key: string): Promise<T | null> {
  if (!isRedisConnected()) {
    return null;
  }

  try {
    const redis = getRedisConnection();
    const value = await redis.get(key);
    
    if (!value) {
      return null;
    }

    return JSON.parse(value) as T;
  } catch (error) {
    log.error(`Cache get error for key ${key}`, error);
    return null; // Return null on error to allow fallback to database
  }
}

/**
 * Set value in cache with TTL
 */
export async function set(key: string, value: any, ttlSeconds: number = 300): Promise<boolean> {
  if (!isRedisConnected()) {
    return false;
  }

  try {
    const redis = getRedisConnection();
    const serialized = JSON.stringify(value);
    await redis.setex(key, ttlSeconds, serialized);
    return true;
  } catch (error) {
    log.error(`Cache set error for key ${key}`, error);
    return false; // Return false on error, but don't throw
  }
}

/**
 * Delete value from cache
 */
export async function del(key: string): Promise<boolean> {
  if (!isRedisConnected()) {
    return false;
  }

  try {
    const redis = getRedisConnection();
    await redis.del(key);
    return true;
  } catch (error) {
    log.error(`Cache delete error for key ${key}`, error);
    return false;
  }
}

/**
 * Delete all keys matching a pattern
 */
export async function delPattern(pattern: string): Promise<number> {
  if (!isRedisConnected()) {
    return 0;
  }

  try {
    const redis = getRedisConnection();
    const keys = await redis.keys(pattern);
    
    if (keys.length === 0) {
      return 0;
    }

    await redis.del(...keys);
    return keys.length;
  } catch (error) {
    log.error(`Cache delete pattern error for pattern ${pattern}`, error);
    return 0;
  }
}

/**
 * Get or set pattern (cache-aside)
 */
export async function getOrSet<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = 300
): Promise<T> {
  // Try to get from cache
  const cached = await get<T>(key);
  if (cached !== null) {
    log.debug(`Cache hit: ${key}`);
    return cached;
  }

  // Cache miss - fetch from source
  log.debug(`Cache miss: ${key}`);
  const value = await fetcher();
  
  // Set in cache (fire and forget)
  set(key, value, ttlSeconds).catch(err => {
    log.warn(`Failed to set cache for ${key}`, err);
  });

  return value;
}

/**
 * Cache user data
 */
export async function getUserCache(userId: string): Promise<any | null> {
  const key = generateKey(CACHE_PREFIXES.USER, userId);
  return get(key);
}

export async function setUserCache(userId: string, user: any, ttl: number = DEFAULT_TTL.USER): Promise<boolean> {
  const key = generateKey(CACHE_PREFIXES.USER, userId);
  return set(key, user, ttl);
}

export async function invalidateUserCache(userId: string): Promise<void> {
  const key = generateKey(CACHE_PREFIXES.USER, userId);
  await del(key);
}

/**
 * Cache stocks data
 */
export async function getStocksCache(userId: string, status?: string): Promise<any | null> {
  const key = generateKey(CACHE_PREFIXES.STOCKS, userId, status);
  return get(key);
}

export async function setStocksCache(userId: string, stocks: any[], status?: string, ttl: number = DEFAULT_TTL.STOCKS): Promise<boolean> {
  const key = generateKey(CACHE_PREFIXES.STOCKS, userId, status);
  return set(key, stocks, ttl);
}

export async function invalidateStocksCache(userId: string): Promise<void> {
  const pattern = generateKey(CACHE_PREFIXES.STOCKS, userId, "*");
  await delPattern(pattern);
}

/**
 * Cache opportunities data
 */
export async function getOpportunitiesCache(cadence?: string): Promise<any | null> {
  const key = generateKey(CACHE_PREFIXES.OPPORTUNITIES, cadence || "all");
  return get(key);
}

export async function setOpportunitiesCache(opportunities: any[], cadence?: string, ttl: number = DEFAULT_TTL.OPPORTUNITIES): Promise<boolean> {
  const key = generateKey(CACHE_PREFIXES.OPPORTUNITIES, cadence || "all");
  return set(key, opportunities, ttl);
}

export async function invalidateOpportunitiesCache(): Promise<void> {
  const pattern = generateKey(CACHE_PREFIXES.OPPORTUNITIES, "*");
  await delPattern(pattern);
}

/**
 * Cache analysis data
 */
export async function getAnalysisCache(ticker: string): Promise<any | null> {
  const key = generateKey(CACHE_PREFIXES.ANALYSIS, ticker);
  return get(key);
}

export async function setAnalysisCache(ticker: string, analysis: any, ttl: number = DEFAULT_TTL.ANALYSIS): Promise<boolean> {
  const key = generateKey(CACHE_PREFIXES.ANALYSIS, ticker);
  return set(key, analysis, ttl);
}

export async function invalidateAnalysisCache(ticker: string): Promise<void> {
  const key = generateKey(CACHE_PREFIXES.ANALYSIS, ticker);
  await del(key);
}

/**
 * Cache quote data
 */
export async function getQuoteCache(ticker: string): Promise<any | null> {
  const key = generateKey(CACHE_PREFIXES.QUOTE, ticker);
  return get(key);
}

export async function setQuoteCache(ticker: string, quote: any, ttl: number = DEFAULT_TTL.QUOTE): Promise<boolean> {
  const key = generateKey(CACHE_PREFIXES.QUOTE, ticker);
  return set(key, quote, ttl);
}

export async function invalidateQuoteCache(ticker: string): Promise<void> {
  const key = generateKey(CACHE_PREFIXES.QUOTE, ticker);
  await del(key);
}

/**
 * Cache news data
 */
export async function getNewsCache(ticker: string): Promise<any | null> {
  const key = generateKey(CACHE_PREFIXES.NEWS, ticker);
  return get(key);
}

export async function setNewsCache(ticker: string, news: any[], ttl: number = DEFAULT_TTL.NEWS): Promise<boolean> {
  const key = generateKey(CACHE_PREFIXES.NEWS, ticker);
  return set(key, news, ttl);
}

export async function invalidateNewsCache(ticker: string): Promise<void> {
  const key = generateKey(CACHE_PREFIXES.NEWS, ticker);
  await del(key);
}

/**
 * Cache followed stocks data
 */
export async function getFollowedStocksCache(userId: string): Promise<any | null> {
  const key = generateKey(CACHE_PREFIXES.FOLLOWED_STOCKS, userId);
  return get(key);
}

export async function setFollowedStocksCache(userId: string, stocks: any[], ttl: number = DEFAULT_TTL.FOLLOWED_STOCKS): Promise<boolean> {
  const key = generateKey(CACHE_PREFIXES.FOLLOWED_STOCKS, userId);
  return set(key, stocks, ttl);
}

export async function invalidateFollowedStocksCache(userId: string): Promise<void> {
  const key = generateKey(CACHE_PREFIXES.FOLLOWED_STOCKS, userId);
  await del(key);
}

/**
 * Cache portfolio data
 */
export async function getPortfolioCache(userId: string): Promise<any | null> {
  const key = generateKey(CACHE_PREFIXES.PORTFOLIO, userId);
  return get(key);
}

export async function setPortfolioCache(userId: string, portfolio: any, ttl: number = DEFAULT_TTL.PORTFOLIO): Promise<boolean> {
  const key = generateKey(CACHE_PREFIXES.PORTFOLIO, userId);
  return set(key, portfolio, ttl);
}

export async function invalidatePortfolioCache(userId: string): Promise<void> {
  const key = generateKey(CACHE_PREFIXES.PORTFOLIO, userId);
  await del(key);
}

/**
 * Cache trades data
 */
export async function getTradesCache(userId: string, isSimulated?: boolean): Promise<any | null> {
  const key = generateKey(CACHE_PREFIXES.TRADES, userId, isSimulated ? "simulated" : "real");
  return get(key);
}

export async function setTradesCache(userId: string, trades: any[], isSimulated?: boolean, ttl: number = DEFAULT_TTL.TRADES): Promise<boolean> {
  const key = generateKey(CACHE_PREFIXES.TRADES, userId, isSimulated ? "simulated" : "real");
  return set(key, trades, ttl);
}

export async function invalidateTradesCache(userId: string): Promise<void> {
  const pattern = generateKey(CACHE_PREFIXES.TRADES, userId, "*");
  await delPattern(pattern);
}

/**
 * Clear all cache (use with caution!)
 */
export async function clearAllCache(): Promise<number> {
  if (!isRedisConnected()) {
    return 0;
  }

  try {
    const redis = getRedisConnection();
    const keys = await redis.keys(`${Object.values(CACHE_PREFIXES).join("|")}:*`);
    
    if (keys.length === 0) {
      return 0;
    }

    await redis.del(...keys);
    log.warn(`Cleared ${keys.length} cache keys`);
    return keys.length;
  } catch (error) {
    log.error("Cache clear all error", error);
    return 0;
  }
}

