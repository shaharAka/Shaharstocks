/**
 * Telegram Configuration Repository
 * Handles Telegram integration configuration
 */

import { BaseRepository } from "./base";
import { telegramConfig, type TelegramConfig, type InsertTelegramConfig } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

export interface ITelegramConfigRepository {
  getTelegramConfig(): Promise<TelegramConfig | undefined>;
  createOrUpdateTelegramConfig(config: InsertTelegramConfig): Promise<TelegramConfig>;
  updateTelegramSyncStatus(lastMessageId: number): Promise<void>;
  updateTelegramSession(sessionString: string): Promise<void>;
}

export class TelegramConfigRepository extends BaseRepository implements ITelegramConfigRepository {
  async getTelegramConfig(): Promise<TelegramConfig | undefined> {
    const [config] = await this.db.select().from(telegramConfig).limit(1);
    return config;
  }

  async createOrUpdateTelegramConfig(config: InsertTelegramConfig): Promise<TelegramConfig> {
    const existing = await this.getTelegramConfig();
    
    if (existing) {
      const [updated] = await this.db
        .update(telegramConfig)
        .set({ ...config, lastSync: sql`now()` })
        .where(eq(telegramConfig.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await this.db
        .insert(telegramConfig)
        .values(config)
        .returning();
      return created;
    }
  }

  async updateTelegramSyncStatus(lastMessageId: number): Promise<void> {
    const existing = await this.getTelegramConfig();
    if (existing) {
      await this.db
        .update(telegramConfig)
        .set({ lastSync: sql`now()`, lastMessageId })
        .where(eq(telegramConfig.id, existing.id));
    }
  }

  async updateTelegramSession(sessionString: string): Promise<void> {
    const existing = await this.getTelegramConfig();
    if (existing) {
      await this.db
        .update(telegramConfig)
        .set({ sessionString })
        .where(eq(telegramConfig.id, existing.id));
    }
  }
}

