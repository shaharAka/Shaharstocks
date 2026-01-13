/**
 * Cached Storage Wrapper
 * Wraps IStorage interface to add caching layer
 */

import type { IStorage } from "../storage";
import * as cache from "./cache";

/**
 * Create a cached version of storage that wraps the original storage
 * and adds caching for expensive operations
 */
export class CachedStorage implements IStorage {
  private storage: IStorage;

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  // Cache user lookups
  async getUser(userId: string): Promise<any> {
    return cache.getOrSet(
      cache.generateKey(cache.CACHE_PREFIXES.USER, userId),
      () => this.storage.getUser(userId),
      cache.DEFAULT_TTL.USER
    );
  }

  async getUserByEmail(email: string): Promise<any> {
    // Don't cache by email (could change, and we'd need reverse lookup)
    return this.storage.getUserByEmail(email);
  }

  async getUserByFirebaseUid(firebaseUid: string): Promise<any> {
    // Cache Firebase UID lookups (stable identifier)
    return this.cache.getOrSet(
      `user:firebase:${firebaseUid}`,
      () => this.storage.getUserByFirebaseUid(firebaseUid),
      cache.DEFAULT_TTL.USER
    );
  }

  // Cache stocks (most expensive query)
  async getStocks(userId: string): Promise<any[]> {
    return cache.getOrSet(
      cache.generateKey(cache.CACHE_PREFIXES.STOCKS, userId, "all"),
      () => this.storage.getStocks(userId),
      cache.DEFAULT_TTL.STOCKS
    );
  }

  async getStocksByUserStatus(userId: string, status: string): Promise<any[]> {
    return cache.getOrSet(
      cache.generateKey(cache.CACHE_PREFIXES.STOCKS, userId, status),
      () => this.storage.getStocksByUserStatus(userId, status),
      cache.DEFAULT_TTL.STOCKS
    );
  }

  // Cache opportunities
  async getOpportunities(options?: { cadence?: string }): Promise<any[]> {
    const cadence = options?.cadence || "all";
    return cache.getOrSet(
      cache.generateKey(cache.CACHE_PREFIXES.OPPORTUNITIES, cadence),
      () => this.storage.getOpportunities(options),
      cache.DEFAULT_TTL.OPPORTUNITIES
    );
  }

  // Cache followed stocks
  async getFollowedStocks(userId: string): Promise<any[]> {
    return cache.getOrSet(
      cache.generateKey(cache.CACHE_PREFIXES.FOLLOWED_STOCKS, userId),
      () => this.storage.getFollowedStocks(userId),
      cache.DEFAULT_TTL.FOLLOWED_STOCKS
    );
  }

  // Cache portfolio
  async getPortfolio(userId: string): Promise<any> {
    return cache.getOrSet(
      cache.generateKey(cache.CACHE_PREFIXES.PORTFOLIO, userId),
      () => this.storage.getPortfolio(userId),
      cache.DEFAULT_TTL.PORTFOLIO
    );
  }

  // Cache trades
  async getTrades(userId: string, isSimulated?: boolean): Promise<any[]> {
    return cache.getOrSet(
      cache.generateKey(cache.CACHE_PREFIXES.TRADES, userId, isSimulated ? "simulated" : "real"),
      () => this.storage.getTrades(userId, isSimulated),
      cache.DEFAULT_TTL.TRADES
    );
  }

  // For write operations, invalidate relevant caches
  async updateUser(userId: string, data: any): Promise<any> {
    const result = await this.storage.updateUser(userId, data);
    await cache.invalidateUserCache(userId);
    return result;
  }

  async createStock(userId: string, data: any): Promise<any> {
    const result = await this.storage.createStock(userId, data);
    await cache.invalidateStocksCache(userId);
    return result;
  }

  async updateStock(userId: string, ticker: string, data: any): Promise<any> {
    const result = await this.storage.updateStock(userId, ticker, data);
    await cache.invalidateStocksCache(userId);
    return result;
  }

  async deleteStock(userId: string, ticker: string): Promise<void> {
    await this.storage.deleteStock(userId, ticker);
    await cache.invalidateStocksCache(userId);
  }

  async followStock(userId: string, ticker: string): Promise<any> {
    const result = await this.storage.followStock(userId, ticker);
    await cache.invalidateFollowedStocksCache(userId);
    await cache.invalidateStocksCache(userId);
    return result;
  }

  async unfollowStock(userId: string, ticker: string): Promise<void> {
    await this.storage.unfollowStock(userId, ticker);
    await cache.invalidateFollowedStocksCache(userId);
  }

  async createTrade(userId: string, data: any): Promise<any> {
    const result = await this.storage.createTrade(data);
    await cache.invalidateTradesCache(userId);
    await cache.invalidatePortfolioCache(userId);
    return result;
  }

  async updateTrade(userId: string, tradeId: string, data: any): Promise<any> {
    const result = await this.storage.updateTrade(tradeId, userId, data);
    await cache.invalidateTradesCache(userId);
    await cache.invalidatePortfolioCache(userId);
    return result;
  }

  async deleteTrade(userId: string, tradeId: string): Promise<void> {
    await this.storage.deleteTrade(tradeId, userId);
    await cache.invalidateTradesCache(userId);
    await cache.invalidatePortfolioCache(userId);
  }

  // Delegate all other methods to original storage (no caching needed or too complex)
  // This is a simplified version - in practice, you'd want to delegate all methods
  // For now, we'll use a Proxy to automatically delegate unknown methods
  
  // Note: TypeScript doesn't support perfect proxy typing, so we'll need to explicitly
  // implement the methods we want to cache, and use a fallback for others

  // For methods we don't cache, delegate directly
  // Since IStorage has many methods, we'll use a Proxy pattern at the storage level
  // instead of manually implementing everything here
}

/**
 * Helper to generate cache keys (exported for use in cache.ts)
 */
export function generateKey(prefix: string, ...parts: (string | number | undefined)[]): string {
  const validParts = parts.filter(p => p !== undefined && p !== null).map(String);
  return `${prefix}:${validParts.join(":")}`;
}

