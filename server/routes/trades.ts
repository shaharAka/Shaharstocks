import type { Express } from "express";
import { storage } from "../storage";
import { insertTradeSchema } from "@shared/schema";
import { verifyFirebaseToken } from "../middleware/firebaseAuth";

export function registerTradesRoutes(app: Express) {
  // Trade routes
  app.get("/api/trades", verifyFirebaseToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const isSimulated = req.query.simulated === "true";
      const trades = await storage.getTrades(req.user.userId, isSimulated ? true : false);
      res.json(trades);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch trades" });
    }
  });

  app.get("/api/trades/:id", verifyFirebaseToken, async (req, res) => {
    try {
      // CRITICAL SECURITY: Verify authentication and ownership
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const trade = await storage.getTrade(req.params.id, req.user.userId);
      if (!trade) {
        return res.status(404).json({ error: "Trade not found" });
      }
      res.json(trade);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch trade" });
    }
  });

  app.post("/api/trades", verifyFirebaseToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const validatedData = insertTradeSchema.parse({ ...req.body, userId: req.user.userId });
      const trade = await storage.createTrade(validatedData);
      res.status(201).json(trade);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(400).json({ error: "Invalid trade data" });
      }
    }
  });
}

