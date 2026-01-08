/**
 * Password Reset Repository
 * Handles password reset tokens
 */

import { BaseRepository } from "./base";
import { passwordResetTokens, type PasswordResetToken, type InsertPasswordResetToken } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

export interface IPasswordResetRepository {
  createPasswordResetToken(token: InsertPasswordResetToken): Promise<PasswordResetToken>;
  getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined>;
  markPasswordResetTokenUsed(tokenId: string): Promise<boolean>;
  purgeExpiredPasswordResetTokens(): Promise<number>;
}

export class PasswordResetRepository extends BaseRepository implements IPasswordResetRepository {
  async createPasswordResetToken(token: InsertPasswordResetToken): Promise<PasswordResetToken> {
    const [created] = await this.db
      .insert(passwordResetTokens)
      .values(token)
      .returning();
    return created;
  }

  async getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
    const [tokenRecord] = await this.db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token));
    return tokenRecord;
  }

  async markPasswordResetTokenUsed(tokenId: string): Promise<boolean> {
    const result = await this.db
      .update(passwordResetTokens)
      .set({ used: true })
      .where(eq(passwordResetTokens.id, tokenId));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async purgeExpiredPasswordResetTokens(): Promise<number> {
    const now = new Date();
    const result = await this.db
      .delete(passwordResetTokens)
      .where(
        sql`${passwordResetTokens.expiresAt} < ${now} OR ${passwordResetTokens.used} = true`
      );
    return result.rowCount || 0;
  }
}

