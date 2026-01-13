/**
 * Notification Repository
 * Handles user notifications
 */

import { BaseRepository } from "./base";
import { notifications, type Notification, type InsertNotification } from "@shared/schema";
import { eq, desc, sql, and } from "drizzle-orm";

export interface INotificationRepository {
  getNotifications(userId: string): Promise<Notification[]>;
  getUnreadNotificationCount(userId: string): Promise<number>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: string, userId: string): Promise<Notification | undefined>;
  markAllNotificationsAsRead(userId: string): Promise<number>;
  clearAllNotifications(userId: string): Promise<number>;
}

export class NotificationRepository extends BaseRepository implements INotificationRepository {
  async getNotifications(userId: string): Promise<Notification[]> {
    return await this.db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const result = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false)
        )
      );
    return result[0]?.count || 0;
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [created] = await this.db
      .insert(notifications)
      .values(notification)
      .returning();
    return created;
  }

  async markNotificationAsRead(id: string, userId: string): Promise<Notification | undefined> {
    const [updated] = await this.db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(
          eq(notifications.id, id),
          eq(notifications.userId, userId)
        )
      )
      .returning();
    return updated;
  }

  async markAllNotificationsAsRead(userId: string): Promise<number> {
    const result = await this.db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false)
        )
      );
    return result.rowCount || 0;
  }

  async clearAllNotifications(userId: string): Promise<number> {
    const result = await this.db
      .delete(notifications)
      .where(eq(notifications.userId, userId));
    return result.rowCount || 0;
  }
}

