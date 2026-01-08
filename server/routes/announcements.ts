import type { Express } from "express";
import { storage } from "../storage";
import { insertAnnouncementSchema } from "@shared/schema";

export function registerAnnouncementsRoutes(app: Express) {
  // Announcements routes
  app.get("/api/announcements/all", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      // Admins see ALL announcements (drafts + published)
      const announcements = await storage.getAllAnnouncements();
      
      res.json(announcements);
    } catch (error) {
      console.error("Failed to fetch all announcements:", error);
      res.status(500).json({ error: "Failed to fetch all announcements" });
    }
  });

  app.get("/api/announcements", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const announcements = await storage.getAnnouncements(req.session.userId);
      res.json(announcements);
    } catch (error) {
      console.error("Failed to fetch announcements:", error);
      res.status(500).json({ error: "Failed to fetch announcements" });
    }
  });

  app.get("/api/announcements/unread-count", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const count = await storage.getUnreadAnnouncementCount(req.session.userId);
      res.json({ count });
    } catch (error) {
      console.error("Failed to fetch unread announcement count:", error);
      res.status(500).json({ error: "Failed to fetch unread announcement count" });
    }
  });

  app.post("/api/announcements/mark-read", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { announcementId } = req.body;
      if (!announcementId) {
        return res.status(400).json({ error: "announcementId is required" });
      }

      await storage.markAnnouncementAsRead(req.session.userId, announcementId);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to mark announcement as read:", error);
      res.status(500).json({ error: "Failed to mark announcement as read" });
    }
  });

  app.post("/api/announcements/mark-all-read", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      await storage.markAllAnnouncementsAsRead(req.session.userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to mark all announcements as read:", error);
      res.status(500).json({ error: "Failed to mark all announcements as read" });
    }
  });

  app.post("/api/announcements", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const validatedData = insertAnnouncementSchema.parse({
        ...req.body,
        createdBy: req.session.userId,
      });

      const announcement = await storage.createAnnouncement(validatedData);
      res.json(announcement);
    } catch (error) {
      console.error("Failed to create announcement:", error);
      res.status(500).json({ error: "Failed to create announcement" });
    }
  });

  app.patch("/api/announcements/:id", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const updated = await storage.updateAnnouncement(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ error: "Announcement not found" });
      }

      res.json(updated);
    } catch (error) {
      console.error("Failed to update announcement:", error);
      res.status(500).json({ error: "Failed to update announcement" });
    }
  });

  app.patch("/api/announcements/:id/deactivate", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const updated = await storage.deactivateAnnouncement(req.params.id);
      if (!updated) {
        return res.status(404).json({ error: "Announcement not found" });
      }

      res.json(updated);
    } catch (error) {
      console.error("Failed to deactivate announcement:", error);
      res.status(500).json({ error: "Failed to deactivate announcement" });
    }
  });

  app.delete("/api/announcements/:id", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user?.isSuperAdmin) {
        return res.status(403).json({ error: "Super admin access required" });
      }

      const success = await storage.deleteAnnouncement(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Announcement not found" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete announcement:", error);
      res.status(500).json({ error: "Failed to delete announcement" });
    }
  });
}

