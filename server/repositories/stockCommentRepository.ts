/**
 * Stock Comment Repository
 * Handles stock comments and comment counts
 */

import { BaseRepository } from "./base";
import { stockComments, users, type StockComment, type InsertStockComment, type StockCommentWithUser } from "@shared/schema";
import { eq, desc, sql } from "drizzle-orm";

export interface IStockCommentRepository {
  getStockComments(ticker: string): Promise<StockCommentWithUser[]>;
  getStockCommentCounts(): Promise<{ ticker: string; count: number }[]>;
  createStockComment(comment: InsertStockComment): Promise<StockComment>;
}

export class StockCommentRepository extends BaseRepository implements IStockCommentRepository {
  async getStockComments(ticker: string): Promise<StockCommentWithUser[]> {
    const comments = await this.db
      .select({
        comment: stockComments,
        user: users,
      })
      .from(stockComments)
      .leftJoin(users, eq(stockComments.userId, users.id))
      .where(eq(stockComments.ticker, ticker))
      .orderBy(desc(stockComments.createdAt));

    return comments.map((row) => ({
      ...row.comment,
      user: row.user!,
    }));
  }

  async getStockCommentCounts(): Promise<{ ticker: string; count: number }[]> {
    const results = await this.db
      .select({
        ticker: stockComments.ticker,
        count: sql<number>`count(*)::int`,
      })
      .from(stockComments)
      .groupBy(stockComments.ticker);
    
    return results;
  }

  async createStockComment(comment: InsertStockComment): Promise<StockComment> {
    const [created] = await this.db
      .insert(stockComments)
      .values(comment)
      .returning();
    return created;
  }
}

