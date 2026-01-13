/**
 * Announcement Repository
 * Handles system announcements and read tracking
 */

import { BaseRepository } from "./base";
import { announcements, announcementReads, type Announcement, type InsertAnnouncement } from "@shared/schema";
import { eq, desc, sql, and } from "drizzle-orm";

export interface IAnnouncementRepository {
  getAnnouncements(userId: string): Promise<(Announcement & { readAt?: Date | null })[]>;
  getUnreadAnnouncementCount(userId: string): Promise<number>;
  getAllAnnouncements(): Promise<Announcement[]>;
  createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement>;
  updateAnnouncement(id: string, updates: Partial<Announcement>): Promise<Announcement | undefined>;
  deactivateAnnouncement(id: string): Promise<Announcement | undefined>;
  deleteAnnouncement(id: string): Promise<void>;
  markAnnouncementAsRead(userId: string, announcementId: string): Promise<void>;
  markAllAnnouncementsAsRead(userId: string): Promise<void>;
}

export class AnnouncementRepository extends BaseRepository implements IAnnouncementRepository {
  async getAnnouncements(userId: string): Promise<(Announcement & { readAt?: Date | null })[]> {
    const allAnnouncements = await this.db
      .select()
      .from(announcements)
      .where(eq(announcements.isActive, true))
      .orderBy(desc(announcements.createdAt));

    const readRecords = await this.db
      .select()
      .from(announcementReads)
      .where(eq(announcementReads.userId, userId));

    const readMap = new Map(readRecords.map(r => [r.announcementId, r.readAt]));

    return allAnnouncements.map(announcement => ({
      ...announcement,
      readAt: readMap.get(announcement.id) || null,
    }));
  }

  async getUnreadAnnouncementCount(userId: string): Promise<number> {
    const result = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(announcements)
      .leftJoin(
        announcementReads,
        and(
          eq(announcementReads.announcementId, announcements.id),
          eq(announcementReads.userId, userId)
        )
      )
      .where(
        and(
          eq(announcements.isActive, true),
          sql`${announcementReads.id} IS NULL`
        )
      );
    return result[0]?.count || 0;
  }

  async getAllAnnouncements(): Promise<Announcement[]> {
    return await this.db
      .select()
      .from(announcements)
      .orderBy(sql`${announcements.createdAt} DESC`);
  }

  async createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement> {
    const [created] = await this.db
      .insert(announcements)
      .values(announcement)
      .returning();
    return created;
  }

  async updateAnnouncement(id: string, updates: Partial<Announcement>): Promise<Announcement | undefined> {
    const [updated] = await this.db
      .update(announcements)
      .set(updates)
      .where(eq(announcements.id, id))
      .returning();
    return updated;
  }

  async deactivateAnnouncement(id: string): Promise<Announcement | undefined> {
    return await this.updateAnnouncement(id, { isActive: false });
  }

  async deleteAnnouncement(id: string): Promise<void> {
    await this.db
      .delete(announcements)
      .where(eq(announcements.id, id));
  }

  async markAnnouncementAsRead(userId: string, announcementId: string): Promise<void> {
    await this.db
      .insert(announcementReads)
      .values({ userId, announcementId })
      .onConflictDoNothing();
  }

  async markAllAnnouncementsAsRead(userId: string): Promise<void> {
    const activeAnnouncements = await this.db
      .select({ id: announcements.id })
      .from(announcements)
      .where(eq(announcements.isActive, true));

    if (activeAnnouncements.length > 0) {
      const values = activeAnnouncements.map(a => ({ userId, announcementId: a.id }));
      await this.db.insert(announcementReads).values(values).onConflictDoNothing();
    }
  }
}

