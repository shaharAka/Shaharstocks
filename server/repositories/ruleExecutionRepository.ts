/**
 * Rule Execution Repository
 * Handles audit log for rule executions
 */

import { BaseRepository } from "./base";
import { ruleExecutions, type RuleExecution, type InsertRuleExecution } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

export interface IRuleExecutionRepository {
  getRuleExecutions(ruleId?: string, ticker?: string): Promise<RuleExecution[]>;
  createRuleExecution(execution: InsertRuleExecution): Promise<RuleExecution>;
}

export class RuleExecutionRepository extends BaseRepository implements IRuleExecutionRepository {
  async getRuleExecutions(ruleId?: string, ticker?: string): Promise<RuleExecution[]> {
    let query = this.db.select().from(ruleExecutions).orderBy(desc(ruleExecutions.triggeredAt));
    
    if (ruleId && ticker) {
      return await query.where(and(eq(ruleExecutions.ruleId, ruleId), eq(ruleExecutions.ticker, ticker)));
    } else if (ruleId) {
      return await query.where(eq(ruleExecutions.ruleId, ruleId));
    } else if (ticker) {
      return await query.where(eq(ruleExecutions.ticker, ticker));
    }
    
    return await query;
  }

  async createRuleExecution(execution: InsertRuleExecution): Promise<RuleExecution> {
    const [newExecution] = await this.db.insert(ruleExecutions).values(execution).returning();
    return newExecution;
  }
}

