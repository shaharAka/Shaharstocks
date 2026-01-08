/**
 * IBKR (Interactive Brokers) Configuration Repository
 * Handles IBKR integration configuration
 */

import { BaseRepository } from "./base";
import { ibkrConfig, type IbkrConfig, type InsertIbkrConfig } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

export interface IIbkrConfigRepository {
  getIbkrConfig(): Promise<IbkrConfig | undefined>;
  createOrUpdateIbkrConfig(config: Partial<InsertIbkrConfig>): Promise<IbkrConfig>;
  updateIbkrConnectionStatus(isConnected: boolean, accountId?: string, error?: string): Promise<void>;
}

export class IbkrConfigRepository extends BaseRepository implements IIbkrConfigRepository {
  async getIbkrConfig(): Promise<IbkrConfig | undefined> {
    const [config] = await this.db.select().from(ibkrConfig).limit(1);
    return config;
  }

  async createOrUpdateIbkrConfig(config: Partial<InsertIbkrConfig>): Promise<IbkrConfig> {
    const existing = await this.getIbkrConfig();
    
    if (existing) {
      const [updated] = await this.db
        .update(ibkrConfig)
        .set(config)
        .where(eq(ibkrConfig.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await this.db
        .insert(ibkrConfig)
        .values({
          gatewayUrl: config.gatewayUrl || 'https://localhost:5000',
          isPaperTrading: config.isPaperTrading !== undefined ? config.isPaperTrading : true,
        })
        .returning();
      return created;
    }
  }

  async updateIbkrConnectionStatus(isConnected: boolean, accountId?: string, error?: string): Promise<void> {
    const existing = await this.getIbkrConfig();
    if (existing) {
      await this.db
        .update(ibkrConfig)
        .set({ 
          isConnected, 
          lastConnectionCheck: sql`now()`,
          ...(accountId && { accountId }),
          ...(error !== undefined && { lastError: error })
        })
        .where(eq(ibkrConfig.id, existing.id));
    }
  }
}

