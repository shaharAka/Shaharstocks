import type { Express } from "express";
import { storage } from "../storage";

export function registerNotificationsRoutes(app: Express) {
  app.get("/api/notifications", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const notifications = await storage.getNotifications(req.session.userId);
      res.json(notifications);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  app.get("/api/notifications/unread-count", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const count = await storage.getUnreadNotificationCount(req.session.userId);
      res.json({ count });
    } catch (error) {
      console.error("Failed to fetch unread count:", error);
      res.status(500).json({ error: "Failed to fetch unread count" });
    }
  });

  app.patch("/api/notifications/:id/read", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const updated = await storage.markNotificationAsRead(req.params.id, req.session.userId);
      if (!updated) {
        return res.status(404).json({ error: "Notification not found or access denied" });
      }

      res.json(updated);
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  });

  app.patch("/api/notifications/read-all", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const count = await storage.markAllNotificationsAsRead(req.session.userId);
      res.json({ count });
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
      res.status(500).json({ error: "Failed to mark all notifications as read" });
    }
  });

  app.delete("/api/notifications/clear-all", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const count = await storage.clearAllNotifications(req.session.userId);
      res.json({ success: true, count });
    } catch (error) {
      console.error("Failed to clear all notifications:", error);
      res.status(500).json({ error: "Failed to clear all notifications" });
    }
  });
}

