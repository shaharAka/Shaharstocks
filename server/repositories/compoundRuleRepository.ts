/**
 * Compound Rule Repository
 * Handles multi-condition trading rules with condition groups and actions
 */

import { BaseRepository } from "./base";
import { 
  tradingRules, 
  ruleConditionGroups, 
  ruleConditions, 
  ruleActions,
  type CompoundRule, 
  type InsertCompoundRule,
  type RuleConditionGroup,
  type RuleCondition,
  type RuleAction
} from "@shared/schema";
import { eq, sql } from "drizzle-orm";

export interface ICompoundRuleRepository {
  getCompoundRules(): Promise<CompoundRule[]>;
  getCompoundRule(id: string): Promise<CompoundRule | undefined>;
  createCompoundRule(ruleData: InsertCompoundRule): Promise<CompoundRule>;
  updateCompoundRule(id: string, ruleData: Partial<InsertCompoundRule>): Promise<CompoundRule | undefined>;
  deleteCompoundRule(id: string): Promise<boolean>;
}

export class CompoundRuleRepository extends BaseRepository implements ICompoundRuleRepository {
  async getCompoundRules(): Promise<CompoundRule[]> {
    const allRules = await this.db.select().from(tradingRules).orderBy(tradingRules.priority);
    
    const compoundRules: CompoundRule[] = [];
    for (const rule of allRules) {
      const groups = await this.db
        .select()
        .from(ruleConditionGroups)
        .where(eq(ruleConditionGroups.ruleId, rule.id))
        .orderBy(ruleConditionGroups.groupOrder);
      
      const groupsWithConditions = await Promise.all(
        groups.map(async (group) => {
          const conditions = await this.db
            .select()
            .from(ruleConditions)
            .where(eq(ruleConditions.groupId, group.id));
          
          return { ...group, conditions };
        })
      );
      
      const actions = await this.db
        .select()
        .from(ruleActions)
        .where(eq(ruleActions.ruleId, rule.id))
        .orderBy(ruleActions.actionOrder);
      
      compoundRules.push({
        ...rule,
        groups: groupsWithConditions,
        actions
      });
    }
    
    return compoundRules;
  }

  async getCompoundRule(id: string): Promise<CompoundRule | undefined> {
    const [rule] = await this.db.select().from(tradingRules).where(eq(tradingRules.id, id));
    if (!rule) return undefined;
    
    const groups = await this.db
      .select()
      .from(ruleConditionGroups)
      .where(eq(ruleConditionGroups.ruleId, id))
      .orderBy(ruleConditionGroups.groupOrder);
    
    const groupsWithConditions = await Promise.all(
      groups.map(async (group) => {
        const conditions = await this.db
          .select()
          .from(ruleConditions)
          .where(eq(ruleConditions.groupId, group.id));
        
        return { ...group, conditions };
      })
    );
    
    const actions = await this.db
      .select()
      .from(ruleActions)
      .where(eq(ruleActions.ruleId, id))
      .orderBy(ruleActions.actionOrder);
    
    return {
      ...rule,
      groups: groupsWithConditions,
      actions
    };
  }

  async createCompoundRule(ruleData: InsertCompoundRule): Promise<CompoundRule> {
    // Use a transaction to create all related records
    const result = await this.db.transaction(async (tx) => {
      // Create the rule header
      const [rule] = await tx.insert(tradingRules).values({
        name: ruleData.name,
        enabled: ruleData.enabled,
        scope: ruleData.scope,
        ticker: ruleData.ticker,
        priority: ruleData.priority,
      }).returning();
      
      // Create condition groups and their conditions
      const groupsWithConditions: (RuleConditionGroup & { conditions: RuleCondition[] })[] = [];
      for (const groupData of ruleData.groups) {
        const [group] = await tx.insert(ruleConditionGroups).values({
          ruleId: rule.id,
          groupOrder: groupData.groupOrder,
          junctionOperator: groupData.junctionOperator,
          description: groupData.description,
        }).returning();
        
        const conditions: RuleCondition[] = [];
        for (const conditionData of groupData.conditions) {
          const [condition] = await tx.insert(ruleConditions).values({
            groupId: group.id,
            metric: conditionData.metric,
            comparator: conditionData.comparator,
            threshold: conditionData.threshold,
            timeframeValue: conditionData.timeframeValue,
            timeframeUnit: conditionData.timeframeUnit,
            metadata: conditionData.metadata,
          }).returning();
          
          conditions.push(condition);
        }
        
        groupsWithConditions.push({ ...group, conditions });
      }
      
      // Create actions
      const actions: RuleAction[] = [];
      for (const actionData of ruleData.actions) {
        const [action] = await tx.insert(ruleActions).values({
          ruleId: rule.id,
          actionOrder: actionData.actionOrder,
          actionType: actionData.actionType,
          quantity: actionData.quantity,
          percentage: actionData.percentage,
          allowRepeat: actionData.allowRepeat,
          cooldownMinutes: actionData.cooldownMinutes,
        }).returning();
        
        actions.push(action);
      }
      
      return {
        ...rule,
        groups: groupsWithConditions,
        actions
      };
    });
    
    return result;
  }

  async updateCompoundRule(id: string, ruleData: Partial<InsertCompoundRule>): Promise<CompoundRule | undefined> {
    const existing = await this.getCompoundRule(id);
    if (!existing) return undefined;
    
    // Use a transaction to update all related records
    await this.db.transaction(async (tx) => {
      // Update rule header
      await tx
        .update(tradingRules)
        .set({
          name: ruleData.name ?? existing.name,
          enabled: ruleData.enabled ?? existing.enabled,
          scope: ruleData.scope ?? existing.scope,
          ticker: ruleData.ticker ?? existing.ticker,
          priority: ruleData.priority ?? existing.priority,
          updatedAt: sql`now()`,
        })
        .where(eq(tradingRules.id, id));
      
      // If groups or actions are provided, delete old ones and create new ones
      if (ruleData.groups) {
        // Delete old groups (cascade will delete conditions)
        await tx.delete(ruleConditionGroups).where(eq(ruleConditionGroups.ruleId, id));
        
        // Create new groups and conditions
        for (const groupData of ruleData.groups) {
          const [group] = await tx.insert(ruleConditionGroups).values({
            ruleId: id,
            groupOrder: groupData.groupOrder,
            junctionOperator: groupData.junctionOperator,
            description: groupData.description,
          }).returning();
          
          for (const conditionData of groupData.conditions) {
            await tx.insert(ruleConditions).values({
              groupId: group.id,
              metric: conditionData.metric,
              comparator: conditionData.comparator,
              threshold: conditionData.threshold,
              timeframeValue: conditionData.timeframeValue,
              timeframeUnit: conditionData.timeframeUnit,
              metadata: conditionData.metadata,
            });
          }
        }
      }
      
      if (ruleData.actions) {
        // Delete old actions
        await tx.delete(ruleActions).where(eq(ruleActions.ruleId, id));
        
        // Create new actions
        for (const actionData of ruleData.actions) {
          await tx.insert(ruleActions).values({
            ruleId: id,
            actionOrder: actionData.actionOrder,
            actionType: actionData.actionType,
            quantity: actionData.quantity,
            percentage: actionData.percentage,
            allowRepeat: actionData.allowRepeat,
            cooldownMinutes: actionData.cooldownMinutes,
          });
        }
      }
    });
    
    // Fetch the complete updated rule
    return await this.getCompoundRule(id);
  }

  async deleteCompoundRule(id: string): Promise<boolean> {
    // Cascade delete will handle groups, conditions, and actions
    const result = await this.db.delete(tradingRules).where(eq(tradingRules.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }
}

