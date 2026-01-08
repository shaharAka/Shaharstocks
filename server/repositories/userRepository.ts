/**
 * User Repository
 * Handles user management, authentication, and onboarding
 */

import { BaseRepository } from "./base";
import { users, type User, type InsertUser } from "@shared/schema";
import { eq, lt, and, or } from "drizzle-orm";

export interface IUserRepository {
  // Basic CRUD
  getUsers(options?: { includeArchived?: boolean }): Promise<User[]>;
  getSuperAdminUsers(): Promise<User[]>;
  getAllUserIds(): Promise<string[]>;
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByGoogleSub(googleSub: string): Promise<User | undefined>;
  getUserByVerificationToken(token: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createGoogleUser(user: {
    name: string;
    email: string;
    googleSub: string;
    googlePicture?: string;
    avatarColor: string;
    authProvider: string;
    emailVerified: boolean;
    subscriptionStatus: string;
    trialEndsAt: Date;
  }): Promise<User>;
  linkGoogleAccount(userId: string, googleSub: string, googlePicture?: string): Promise<User | undefined>;
  updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  
  // Email verification
  verifyUserEmail(userId: string): Promise<User | undefined>;
  updateVerificationToken(userId: string, token: string, expiry: Date): Promise<User | undefined>;
  purgeUnverifiedUsers(olderThanHours: number): Promise<number>;
  
  // Onboarding and tutorials
  markUserInitialDataFetched(userId: string): Promise<void>;
  markUserHasSeenOnboarding(userId: string): Promise<void>;
  completeUserOnboarding(userId: string): Promise<void>;
  getUserProgress(userId: string): Promise<{ onboardingCompletedAt: Date | null; tutorialCompletions: Record<string, boolean> }>;
  completeTutorial(userId: string, tutorialId: string): Promise<void>;
}

export class UserRepository extends BaseRepository implements IUserRepository {
  async getUsers(options?: { includeArchived?: boolean }): Promise<User[]> {
    if (options?.includeArchived) {
      return await this.db.select().from(users);
    }
    return await this.db.select().from(users).where(eq(users.archived, false));
  }

  async getSuperAdminUsers(): Promise<User[]> {
    return await this.db.select().from(users).where(eq(users.isSuperAdmin, true));
  }

  async getAllUserIds(): Promise<string[]> {
    const result = await this.db.select({ id: users.id }).from(users).where(eq(users.archived, false));
    return result.map(r => r.id);
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByGoogleSub(googleSub: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.googleSub, googleSub));
    return user;
  }

  async getUserByVerificationToken(token: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.emailVerificationToken, token));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await this.db.insert(users).values(user).returning();
    return newUser;
  }

  async createGoogleUser(user: {
    name: string;
    email: string;
    googleSub: string;
    googlePicture?: string;
    avatarColor: string;
    authProvider: string;
    emailVerified: boolean;
    subscriptionStatus: string;
    trialEndsAt: Date;
  }): Promise<User> {
    const [newUser] = await this.db.insert(users).values({
      name: user.name,
      email: user.email,
      googleSub: user.googleSub,
      googlePicture: user.googlePicture,
      avatarColor: user.avatarColor,
      authProvider: user.authProvider,
      emailVerified: user.emailVerified,
      subscriptionStatus: user.subscriptionStatus,
      trialEndsAt: user.trialEndsAt,
    }).returning();
    return newUser;
  }

  async linkGoogleAccount(userId: string, googleSub: string, googlePicture?: string): Promise<User | undefined> {
    const [updatedUser] = await this.db
      .update(users)
      .set({ 
        googleSub,
        googlePicture: googlePicture || undefined,
        authProvider: "google",
      })
      .where(eq(users.id, userId))
      .returning();
    return updatedUser;
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined> {
    const [updatedUser] = await this.db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await this.db.delete(users).where(eq(users.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async verifyUserEmail(userId: string): Promise<User | undefined> {
    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
    
    const [updatedUser] = await this.db
      .update(users)
      .set({
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpiry: null,
        subscriptionStatus: "trial",
        subscriptionStartDate: now,
        trialEndsAt,
      })
      .where(eq(users.id, userId))
      .returning();
    return updatedUser;
  }

  async updateVerificationToken(userId: string, token: string, expiry: Date): Promise<User | undefined> {
    const [updatedUser] = await this.db
      .update(users)
      .set({
        emailVerificationToken: token,
        emailVerificationExpiry: expiry,
      })
      .where(eq(users.id, userId))
      .returning();
    return updatedUser;
  }

  async purgeUnverifiedUsers(olderThanHours: number): Promise<number> {
    const cutoffDate = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    
    // Only delete users who:
    // 1. Have not verified their email
    // 2. Are in "pending_verification" status (not trial, active, or any paid status)
    // 3. Were created more than N hours ago
    // 4. Have no admin privileges (safety check)
    const result = await this.db
      .delete(users)
      .where(
        and(
          eq(users.emailVerified, false),
          eq(users.subscriptionStatus, "pending_verification"),
          eq(users.isAdmin, false), // Never delete admin users
          eq(users.isSuperAdmin, false), // Never delete super admin users
          lt(users.createdAt, cutoffDate)
        )
      );
    return result.rowCount || 0;
  }

  async markUserInitialDataFetched(userId: string): Promise<void> {
    await this.db
      .update(users)
      .set({ initialDataFetched: true })
      .where(eq(users.id, userId));
  }

  async markUserHasSeenOnboarding(userId: string): Promise<void> {
    await this.db
      .update(users)
      .set({ hasSeenOnboarding: true })
      .where(eq(users.id, userId));
  }

  async completeUserOnboarding(userId: string): Promise<void> {
    await this.db
      .update(users)
      .set({ 
        onboardingCompletedAt: new Date(),
        hasSeenOnboarding: true
      })
      .where(eq(users.id, userId));
  }

  async getUserProgress(userId: string): Promise<{ onboardingCompletedAt: Date | null; tutorialCompletions: Record<string, boolean> }> {
    const [user] = await this.db
      .select({
        onboardingCompletedAt: users.onboardingCompletedAt,
        tutorialCompletions: users.tutorialCompletions,
      })
      .from(users)
      .where(eq(users.id, userId));
    
    if (!user) {
      return { onboardingCompletedAt: null, tutorialCompletions: {} };
    }

    return {
      onboardingCompletedAt: user.onboardingCompletedAt,
      tutorialCompletions: (user.tutorialCompletions as Record<string, boolean>) || {},
    };
  }

  async completeTutorial(userId: string, tutorialId: string): Promise<void> {
    const [user] = await this.db
      .select({ tutorialCompletions: users.tutorialCompletions })
      .from(users)
      .where(eq(users.id, userId));
    
    if (!user) return;

    const completions = (user.tutorialCompletions as Record<string, boolean>) || {};
    completions[tutorialId] = true;

    await this.db
      .update(users)
      .set({ tutorialCompletions: completions })
      .where(eq(users.id, userId));
  }

  async archiveUser(userId: string, archivedBy: string) {
    const [archivedUser] = await this.db
      .update(users)
      .set({
        archived: true,
        archivedAt: new Date(),
        archivedBy,
      })
      .where(eq(users.id, userId))
      .returning();
    return archivedUser;
  }

  async unarchiveUser(userId: string) {
    const [unarchivedUser] = await this.db
      .update(users)
      .set({
        archived: false,
        archivedAt: null,
        archivedBy: null,
      })
      .where(eq(users.id, userId))
      .returning();
    return unarchivedUser;
  }

  async updateUserSubscriptionStatus(userId: string, status: string, endDate?: Date) {
    const updates: Partial<User> = { subscriptionStatus: status };
    if (endDate) {
      updates.subscriptionEndDate = endDate;
    }
    const [updatedUser] = await this.db
      .update(users)
      .set(updates)
      .where(eq(users.id, userId))
      .returning();
    return updatedUser;
  }

  async updateUserLastDataRefresh(userId: string) {
    const [updatedUser] = await this.db
      .update(users)
      .set({ lastDataRefresh: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return updatedUser;
  }

  canUserReceiveDataRefresh(user: User): boolean {
    const ONE_HOUR = 60 * 60 * 1000;
    const ONE_DAY = 24 * 60 * 60 * 1000;
    const now = new Date().getTime();

    // Active (paid) subscribers: can refresh every hour
    if (user.subscriptionStatus === "active") {
      if (!user.lastDataRefresh) return true;
      const timeSinceLastRefresh = now - new Date(user.lastDataRefresh).getTime();
      return timeSinceLastRefresh >= ONE_HOUR;
    }

    // Trial users: can only refresh once per day
    if (user.subscriptionStatus === "trial") {
      if (!user.lastDataRefresh) return true;
      const timeSinceLastRefresh = now - new Date(user.lastDataRefresh).getTime();
      return timeSinceLastRefresh >= ONE_DAY;
    }

    // Other statuses (pending, expired, cancelled): no refresh
    return false;
  }

  async getUsersEligibleForDataRefresh() {
    const { or } = await import("drizzle-orm");
    // Get all active users (not archived, valid subscription)
    const allUsers = await this.db
      .select()
      .from(users)
      .where(
        and(
          eq(users.archived, false),
          or(
            eq(users.subscriptionStatus, "active"),
            eq(users.subscriptionStatus, "trial")
          )
        )
      );
    
    // Filter users who are eligible for refresh based on subscription type
    return allUsers.filter(user => this.canUserReceiveDataRefresh(user));
  }
}

