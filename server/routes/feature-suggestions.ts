import type { Express } from "express";
import { storage } from "../storage";
import { insertFeatureSuggestionSchema } from "@shared/schema";
import { z } from "zod";

export function registerFeatureSuggestionsRoutes(app: Express, requireAdmin: ReturnType<typeof import("../session").createRequireAdmin>) {
  // Feature Suggestions Routes
  app.get("/api/feature-suggestions", async (req, res) => {
    try {
      const userId = req.query.userId as string | undefined;
      const status = req.query.status as string | undefined;
      const suggestions = await storage.getFeatureSuggestions(userId, status);
      res.json(suggestions);
    } catch (error) {
      console.error("Failed to get feature suggestions:", error);
      res.status(500).json({ error: "Failed to get feature suggestions" });
    }
  });

  app.post("/api/feature-suggestions", async (req, res) => {
    try {
      const data = insertFeatureSuggestionSchema.parse(req.body);
      const suggestion = await storage.createFeatureSuggestion(data);
      res.status(201).json(suggestion);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Failed to create feature suggestion:", error);
      res.status(500).json({ error: "Failed to create feature suggestion" });
    }
  });

  app.post("/api/feature-suggestions/:id/vote", async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }

      const success = await storage.voteForSuggestion(req.params.id, userId);
      if (!success) {
        return res.status(409).json({ error: "Already voted" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Failed to vote for suggestion:", error);
      res.status(500).json({ error: "Failed to vote for suggestion" });
    }
  });

  app.delete("/api/feature-suggestions/:id/vote", async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }

      const success = await storage.unvoteForSuggestion(req.params.id, userId);
      if (!success) {
        return res.status(404).json({ error: "Vote not found" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Failed to unvote for suggestion:", error);
      res.status(500).json({ error: "Failed to unvote for suggestion" });
    }
  });

  app.patch("/api/feature-suggestions/:id/status", requireAdmin, async (req, res) => {
    try {
      const { status } = req.body;
      if (!status) {
        return res.status(400).json({ error: "status is required" });
      }

      const updated = await storage.updateFeatureSuggestionStatus(req.params.id, status);
      if (!updated) {
        return res.status(404).json({ error: "Suggestion not found" });
      }

      res.json(updated);
    } catch (error) {
      console.error("Failed to update suggestion status:", error);
      res.status(500).json({ error: "Failed to update suggestion status" });
    }
  });

  app.delete("/api/feature-suggestions/:id", requireAdmin, async (req, res) => {
    try {
      const success = await storage.deleteFeatureSuggestion(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Suggestion not found" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete suggestion:", error);
      res.status(500).json({ error: "Failed to delete suggestion" });
    }
  });
}

