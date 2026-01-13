/**
 * Trading Rule Repository
 * Handles simple trading rules (single-condition rules)
 */

import { BaseRepository } from "./base";
import { tradingRules, type TradingRule, type InsertTradingRule } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

export interface ITradingRuleRepository {
  getTradingRules(userId: string): Promise<TradingRule[]>;
  getTradingRule(id: string): Promise<TradingRule | undefined>;
  createTradingRule(rule: InsertTradingRule): Promise<TradingRule>;
  updateTradingRule(id: string, updates: Partial<TradingRule>): Promise<TradingRule | undefined>;
  deleteTradingRule(id: string): Promise<boolean>;
}

export class TradingRuleRepository extends BaseRepository implements ITradingRuleRepository {
  async getTradingRules(userId: string): Promise<TradingRule[]> {
    return await this.db.select().from(tradingRules).where(eq(tradingRules.userId, userId));
  }

  async getTradingRule(id: string): Promise<TradingRule | undefined> {
    const [rule] = await this.db.select().from(tradingRules).where(eq(tradingRules.id, id));
    return rule;
  }

  async createTradingRule(rule: InsertTradingRule): Promise<TradingRule> {
    const [newRule] = await this.db.insert(tradingRules).values(rule).returning();
    return newRule;
  }

  async updateTradingRule(id: string, updates: Partial<TradingRule>): Promise<TradingRule | undefined> {
    const [updatedRule] = await this.db
      .update(tradingRules)
      .set({ ...updates, updatedAt: sql`now()` })
      .where(eq(tradingRules.id, id))
      .returning();
    return updatedRule;
  }

  async deleteTradingRule(id: string): Promise<boolean> {
    const result = await this.db.delete(tradingRules).where(eq(tradingRules.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }
}

