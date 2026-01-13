/**
 * Admin Notification Repository
 * Handles admin-only notifications
 */

import { BaseRepository } from "./base";
import { adminNotifications, type AdminNotification, type InsertAdminNotification } from "@shared/schema";
import { eq, desc, sql } from "drizzle-orm";

export interface IAdminNotificationRepository {
  getAdminNotifications(): Promise<AdminNotification[]>;
  getUnreadAdminNotificationCount(): Promise<number>;
  createAdminNotification(notification: InsertAdminNotification): Promise<AdminNotification>;
  markAdminNotificationAsRead(id: string): Promise<AdminNotification | undefined>;
  markAllAdminNotificationsAsRead(): Promise<void>;
}

export class AdminNotificationRepository extends BaseRepository implements IAdminNotificationRepository {
  async getAdminNotifications(): Promise<AdminNotification[]> {
    return await this.db
      .select()
      .from(adminNotifications)
      .orderBy(desc(adminNotifications.createdAt));
  }

  async getUnreadAdminNotificationCount(): Promise<number> {
    const [result] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(adminNotifications)
      .where(eq(adminNotifications.isRead, false));
    
    return result?.count || 0;
  }

  async createAdminNotification(notification: InsertAdminNotification): Promise<AdminNotification> {
    const [created] = await this.db
      .insert(adminNotifications)
      .values(notification)
      .returning();
    return created;
  }

  async markAdminNotificationAsRead(id: string): Promise<AdminNotification | undefined> {
    const [updated] = await this.db
      .update(adminNotifications)
      .set({ isRead: true, readAt: new Date() })
      .where(eq(adminNotifications.id, id))
      .returning();
    return updated;
  }

  async markAllAdminNotificationsAsRead(): Promise<void> {
    await this.db
      .update(adminNotifications)
      .set({ isRead: true, readAt: new Date() })
      .where(eq(adminNotifications.isRead, false));
  }
}

