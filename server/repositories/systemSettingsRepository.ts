/**
 * System Settings Repository
 * Handles all system-wide configuration settings
 */

import { BaseRepository } from "./base";
import { systemSettings, type SystemSettings, type InsertSystemSettings } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface ISystemSettingsRepository {
  getSystemSettings(): Promise<SystemSettings | undefined>;
  updateSystemSettings(updates: Partial<InsertSystemSettings>): Promise<SystemSettings>;
}

export class SystemSettingsRepository extends BaseRepository implements ISystemSettingsRepository {
  async getSystemSettings(): Promise<SystemSettings | undefined> {
    const [settings] = await this.db.select().from(systemSettings).limit(1);
    return settings;
  }

  async updateSystemSettings(updates: Partial<InsertSystemSettings>): Promise<SystemSettings> {
    const existing = await this.getSystemSettings();
    
    if (existing) {
      const [updated] = await this.db
        .update(systemSettings)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(systemSettings.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await this.db
        .insert(systemSettings)
        .values({ ...updates, updatedAt: new Date() })
        .returning();
      return created;
    }
  }
}

