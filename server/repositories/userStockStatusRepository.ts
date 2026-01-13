/**
 * User Stock Status Repository
 * Handles user-specific stock status tracking (approved, rejected, dismissed)
 */

import { BaseRepository } from "./base";
import { userStockStatuses, stocks, type UserStockStatus, type InsertUserStockStatus } from "@shared/schema";
import { eq, and } from "drizzle-orm";

export interface IUserStockStatusRepository {
  getUserStockStatus(userId: string, ticker: string): Promise<UserStockStatus | undefined>;
  getUserStockStatuses(userId: string, status?: string): Promise<UserStockStatus[]>;
  createUserStockStatus(status: InsertUserStockStatus): Promise<UserStockStatus>;
  updateUserStockStatus(userId: string, ticker: string, updates: Partial<UserStockStatus>): Promise<UserStockStatus | undefined>;
  ensureUserStockStatus(userId: string, ticker: string): Promise<UserStockStatus>;
  rejectTickerForUser(userId: string, ticker: string): Promise<{ userStatus: UserStockStatus; stocksUpdated: number }>;
}

export class UserStockStatusRepository extends BaseRepository implements IUserStockStatusRepository {
  async getUserStockStatus(userId: string, ticker: string): Promise<UserStockStatus | undefined> {
    const [status] = await this.db
      .select()
      .from(userStockStatuses)
      .where(
        and(
          eq(userStockStatuses.userId, userId),
          eq(userStockStatuses.ticker, ticker.toUpperCase())
        )
      )
      .limit(1);
    return status;
  }

  async getUserStockStatuses(userId: string, status?: string): Promise<UserStockStatus[]> {
    const conditions: any[] = [eq(userStockStatuses.userId, userId)];
    if (status) {
      conditions.push(eq(userStockStatuses.status, status));
    }
    
    return await this.db
      .select()
      .from(userStockStatuses)
      .where(conditions.length > 1 ? and(...conditions) : conditions[0]);
  }

  async createUserStockStatus(statusData: InsertUserStockStatus): Promise<UserStockStatus> {
    const [created] = await this.db
      .insert(userStockStatuses)
      .values({
        ...statusData,
        ticker: statusData.ticker.toUpperCase(),
      })
      .returning();
    return created;
  }

  async updateUserStockStatus(userId: string, ticker: string, updates: Partial<UserStockStatus>): Promise<UserStockStatus | undefined> {
    const [updated] = await this.db
      .update(userStockStatuses)
      .set(updates)
      .where(
        and(
          eq(userStockStatuses.userId, userId),
          eq(userStockStatuses.ticker, ticker.toUpperCase())
        )
      )
      .returning();
    return updated;
  }

  async ensureUserStockStatus(userId: string, ticker: string): Promise<UserStockStatus> {
    const existing = await this.getUserStockStatus(userId, ticker);
    if (existing) {
      return existing;
    }
    
    return await this.createUserStockStatus({
      userId,
      ticker: ticker.toUpperCase(),
      status: "pending",
    });
  }

  async rejectTickerForUser(userId: string, ticker: string): Promise<{ userStatus: UserStockStatus; stocksUpdated: number }> {
    // Ensure user stock status exists
    await this.ensureUserStockStatus(userId, ticker);
    
    // Update status to rejected
    const updatedStatus = await this.updateUserStockStatus(userId, ticker, {
      status: "rejected",
      rejectedAt: new Date(),
    });
    
    if (!updatedStatus) {
      throw new Error("Failed to update user stock status");
    }
    
    // Update all stocks for this user and ticker to rejected
    const result = await this.db
      .update(stocks)
      .set({ recommendationStatus: "rejected" })
      .where(
        and(
          eq(stocks.userId, userId),
          eq(stocks.ticker, ticker.toUpperCase())
        )
      );
    
    const stocksUpdated = result.rowCount || 0;
    
    return {
      userStatus: updatedStatus,
      stocksUpdated,
    };
  }
}

