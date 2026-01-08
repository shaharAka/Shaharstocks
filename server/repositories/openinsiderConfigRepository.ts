/**
 * OpenInsider Configuration Repository
 * Handles OpenInsider integration configuration
 */

import { BaseRepository } from "./base";
import { openinsiderConfig, type OpeninsiderConfig, type InsertOpeninsiderConfig } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

export interface IOpeninsiderConfigRepository {
  getOpeninsiderConfig(): Promise<OpeninsiderConfig | undefined>;
  createOrUpdateOpeninsiderConfig(config: Partial<InsertOpeninsiderConfig>): Promise<OpeninsiderConfig>;
  updateOpeninsiderSyncStatus(error?: string): Promise<void>;
}

export class OpeninsiderConfigRepository extends BaseRepository implements IOpeninsiderConfigRepository {
  async getOpeninsiderConfig(): Promise<OpeninsiderConfig | undefined> {
    const [config] = await this.db.select().from(openinsiderConfig).limit(1);
    return config;
  }

  async createOrUpdateOpeninsiderConfig(config: Partial<InsertOpeninsiderConfig>): Promise<OpeninsiderConfig> {
    const existing = await this.getOpeninsiderConfig();
    
    if (existing) {
      const [updated] = await this.db
        .update(openinsiderConfig)
        .set(config)
        .where(eq(openinsiderConfig.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await this.db
        .insert(openinsiderConfig)
        .values({
          enabled: config.enabled !== undefined ? config.enabled : false,
          fetchLimit: config.fetchLimit || 50,
        })
        .returning();
      return created;
    }
  }

  async updateOpeninsiderSyncStatus(error?: string): Promise<void> {
    const existing = await this.getOpeninsiderConfig();
    if (existing) {
      await this.db
        .update(openinsiderConfig)
        .set({ 
          lastSync: sql`now()`,
          ...(error !== undefined && { lastError: error })
        })
        .where(eq(openinsiderConfig.id, existing.id));
    }
  }
}

