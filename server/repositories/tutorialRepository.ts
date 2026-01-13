/**
 * Tutorial Repository
 * Handles user tutorial progress
 */

import { BaseRepository } from "./base";
import { userTutorials, type UserTutorial, type InsertUserTutorial } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface ITutorialRepository {
  hasCompletedTutorial(userId: string, tutorialId: string): Promise<boolean>;
  markTutorialAsCompleted(userId: string, tutorialId: string): Promise<UserTutorial>;
  getUserTutorials(userId: string): Promise<UserTutorial[]>;
}

export class TutorialRepository extends BaseRepository implements ITutorialRepository {
  async hasCompletedTutorial(userId: string, tutorialId: string): Promise<boolean> {
    const [tutorial] = await this.db
      .select()
      .from(userTutorials)
      .where(eq(userTutorials.userId, userId), eq(userTutorials.tutorialId, tutorialId))
      .limit(1);
    
    return !!tutorial;
  }

  async markTutorialAsCompleted(userId: string, tutorialId: string): Promise<UserTutorial> {
    const [tutorial] = await this.db
      .insert(userTutorials)
      .values({
        userId,
        tutorialId,
        completedAt: new Date(),
      })
      .onConflictDoNothing()
      .returning();
    
    if (tutorial) {
      return tutorial;
    }
    
    // If conflict, return existing tutorial
    const [existing] = await this.db
      .select()
      .from(userTutorials)
      .where(eq(userTutorials.userId, userId), eq(userTutorials.tutorialId, tutorialId))
      .limit(1);
    
    return existing!;
  }

  async getUserTutorials(userId: string): Promise<UserTutorial[]> {
    return await this.db
      .select()
      .from(userTutorials)
      .where(eq(userTutorials.userId, userId));
  }
}

