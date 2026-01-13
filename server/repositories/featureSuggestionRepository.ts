/**
 * Feature Suggestion Repository
 * Handles feature suggestions and voting
 */

import { BaseRepository } from "./base";
import { featureSuggestions, featureVotes, users, type FeatureSuggestion, type InsertFeatureSuggestion } from "@shared/schema";
import { eq, desc, sql, and } from "drizzle-orm";

export interface IFeatureSuggestionRepository {
  getFeatureSuggestions(userId?: string, status?: string): Promise<(FeatureSuggestion & { userName: string; userHasVoted: boolean })[]>;
  getFeatureSuggestion(id: string): Promise<FeatureSuggestion | undefined>;
  createFeatureSuggestion(suggestion: InsertFeatureSuggestion): Promise<FeatureSuggestion>;
  updateFeatureSuggestionStatus(id: string, status: string): Promise<FeatureSuggestion | undefined>;
  deleteFeatureSuggestion(id: string): Promise<boolean>;
  voteForSuggestion(suggestionId: string, userId: string): Promise<boolean>;
  unvoteForSuggestion(suggestionId: string, userId: string): Promise<boolean>;
  hasUserVoted(suggestionId: string, userId: string): Promise<boolean>;
}

export class FeatureSuggestionRepository extends BaseRepository implements IFeatureSuggestionRepository {
  async getFeatureSuggestions(userId?: string, status?: string): Promise<(FeatureSuggestion & { userName: string; userHasVoted: boolean })[]> {
    let query = this.db
      .select({
        id: featureSuggestions.id,
        userId: featureSuggestions.userId,
        title: featureSuggestions.title,
        description: featureSuggestions.description,
        status: featureSuggestions.status,
        voteCount: featureSuggestions.voteCount,
        createdAt: featureSuggestions.createdAt,
        updatedAt: featureSuggestions.updatedAt,
        userName: users.name,
      })
      .from(featureSuggestions)
      .leftJoin(users, eq(featureSuggestions.userId, users.id));

    if (status) {
      query = query.where(eq(featureSuggestions.status, status)) as any;
    }

    const suggestions = await query.orderBy(desc(featureSuggestions.voteCount), desc(featureSuggestions.createdAt));

    // Check if current user has voted for each suggestion
    if (userId) {
      const userVotes = await this.db
        .select({ suggestionId: featureVotes.suggestionId })
        .from(featureVotes)
        .where(eq(featureVotes.userId, userId));
      
      const votedSuggestionIds = new Set(userVotes.map(v => v.suggestionId));
      
      return suggestions.map(s => ({
        ...s,
        userName: s.userName || 'Unknown User',
        userHasVoted: votedSuggestionIds.has(s.id),
      }));
    }

    return suggestions.map(s => ({
      ...s,
      userName: s.userName || 'Unknown User',
      userHasVoted: false,
    }));
  }

  async getFeatureSuggestion(id: string): Promise<FeatureSuggestion | undefined> {
    const [suggestion] = await this.db
      .select()
      .from(featureSuggestions)
      .where(eq(featureSuggestions.id, id))
      .limit(1);
    return suggestion;
  }

  async createFeatureSuggestion(suggestion: InsertFeatureSuggestion): Promise<FeatureSuggestion> {
    const [created] = await this.db
      .insert(featureSuggestions)
      .values(suggestion)
      .returning();
    return created;
  }

  async updateFeatureSuggestionStatus(id: string, status: string): Promise<FeatureSuggestion | undefined> {
    const [updated] = await this.db
      .update(featureSuggestions)
      .set({ status, updatedAt: sql`now()` })
      .where(eq(featureSuggestions.id, id))
      .returning();
    return updated;
  }

  async deleteFeatureSuggestion(id: string): Promise<boolean> {
    const result = await this.db
      .delete(featureSuggestions)
      .where(eq(featureSuggestions.id, id));
    return (result.rowCount || 0) > 0;
  }

  async voteForSuggestion(suggestionId: string, userId: string): Promise<boolean> {
    try {
      // Insert vote
      await this.db.insert(featureVotes).values({ suggestionId, userId });
      
      // Increment vote count
      await this.db
        .update(featureSuggestions)
        .set({ 
          voteCount: sql`${featureSuggestions.voteCount} + 1`,
          updatedAt: sql`now()`
        })
        .where(eq(featureSuggestions.id, suggestionId));
      
      return true;
    } catch (error) {
      // Vote already exists (unique constraint violation)
      return false;
    }
  }

  async unvoteForSuggestion(suggestionId: string, userId: string): Promise<boolean> {
    const result = await this.db
      .delete(featureVotes)
      .where(
        and(
          eq(featureVotes.suggestionId, suggestionId),
          eq(featureVotes.userId, userId)
        )
      );

    if (result.rowCount && result.rowCount > 0) {
      // Decrement vote count
      await this.db
        .update(featureSuggestions)
        .set({ 
          voteCount: sql`${featureSuggestions.voteCount} - 1`,
          updatedAt: sql`now()`
        })
        .where(eq(featureSuggestions.id, suggestionId));
      
      return true;
    }

    return false;
  }

  async hasUserVoted(suggestionId: string, userId: string): Promise<boolean> {
    const [vote] = await this.db
      .select()
      .from(featureVotes)
      .where(
        and(
          eq(featureVotes.suggestionId, suggestionId),
          eq(featureVotes.userId, userId)
        )
      );
    return !!vote;
  }
}

