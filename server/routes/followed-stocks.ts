import type { Express } from "express";
import { storage } from "../storage";
import { insertFollowedStockSchema } from "@shared/schema";

export function registerFollowedStocksRoutes(app: Express) {
  // Get followed stocks with current prices
  app.get("/api/followed-stocks-with-prices", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const followedStocks = await storage.getFollowedStocksWithPrices(req.session.userId);
      res.json(followedStocks);
    } catch (error) {
      console.error("Get followed stocks with prices error:", error);
      res.status(500).json({ error: "Failed to fetch followed stocks" });
    }
  });

  // Get followed stocks with status (includes job status, stance, alignment)
  app.get("/api/followed-stocks-with-status", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const followedStocks = await storage.getFollowedStocksWithStatus(req.session.userId);
      res.json(followedStocks);
    } catch (error) {
      console.error("Get followed stocks with status error:", error);
      res.status(500).json({ error: "Failed to fetch followed stocks with status" });
    }
  });

  // Get followed stocks count for sidebar badge (excludes stocks with active positions)
  app.get("/api/followed-stocks/count", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const followedStocks = await storage.getUserFollowedStocks(req.session.userId);
      const holdings = await storage.getPortfolioHoldings(req.session.userId, false);
      const positionTickers = new Set(holdings.filter(h => h.quantity > 0).map(h => h.ticker));
      // Count only stocks that are NOT in position
      const watchingCount = followedStocks.filter(s => !positionTickers.has(s.ticker)).length;
      res.json(watchingCount);
    } catch (error) {
      console.error("Get followed stocks count error:", error);
      res.status(500).json({ error: "Failed to fetch count" });
    }
  });

  // Get user's followed stocks list
  app.get("/api/users/me/followed", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const followedStocks = await storage.getUserFollowedStocks(req.session.userId);
      res.json(followedStocks);
    } catch (error) {
      console.error("Get followed stocks error:", error);
      res.status(500).json({ error: "Failed to fetch followed stocks" });
    }
  });

  // Follow a stock
  app.post("/api/stocks/:ticker/follow", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const ticker = req.params.ticker.toUpperCase();
      
      // Check if already following
      const existingFollows = await storage.getUserFollowedStocks(req.session.userId);
      const alreadyFollowing = existingFollows.some(f => f.ticker === ticker);
      
      if (alreadyFollowing) {
        return res.status(409).json({ error: "You are already following this stock" });
      }
      
      const validatedData = insertFollowedStockSchema.parse({
        ticker,
        userId: req.session.userId,
      });
      const follow = await storage.followStock(validatedData);
      
      res.status(201).json(follow);
    } catch (error) {
      console.error("Follow stock error:", error);
      res.status(500).json({ error: "Failed to follow stock" });
    }
  });

  // Unfollow a stock
  app.delete("/api/stocks/:ticker/follow", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      await storage.unfollowStock(req.params.ticker.toUpperCase(), req.session.userId);
      res.status(204).send();
    } catch (error) {
      console.error("Unfollow stock error:", error);
      res.status(500).json({ error: "Failed to unfollow stock" });
    }
  });
}

