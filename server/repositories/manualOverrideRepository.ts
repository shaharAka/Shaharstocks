/**
 * Manual Override Repository
 * Handles manual subscription overrides
 */

import { BaseRepository } from "./base";
import { manualOverrides, type ManualOverride, type InsertManualOverride } from "@shared/schema";
import { eq, and, isNull, sql, desc } from "drizzle-orm";

export interface IManualOverrideRepository {
  createManualOverride(override: InsertManualOverride): Promise<ManualOverride>;
  getUserManualOverrides(userId: string): Promise<ManualOverride[]>;
  getActiveManualOverride(userId: string): Promise<ManualOverride | undefined>;
}

export class ManualOverrideRepository extends BaseRepository implements IManualOverrideRepository {
  async createManualOverride(override: InsertManualOverride): Promise<ManualOverride> {
    const [created] = await this.db
      .insert(manualOverrides)
      .values(override)
      .returning();
    return created;
  }

  async getUserManualOverrides(userId: string): Promise<ManualOverride[]> {
    return await this.db
      .select()
      .from(manualOverrides)
      .where(eq(manualOverrides.userId, userId))
      .orderBy(desc(manualOverrides.createdAt));
  }

  async getActiveManualOverride(userId: string): Promise<ManualOverride | undefined> {
    const now = new Date();
    const [override] = await this.db
      .select()
      .from(manualOverrides)
      .where(
        and(
          eq(manualOverrides.userId, userId),
          sql`${manualOverrides.startDate} <= ${now}`,
          sql`${manualOverrides.endDate} > ${now}`
        )
      )
      .orderBy(desc(manualOverrides.endDate))
      .limit(1);
    return override;
  }
}

