import type { Express } from "express";
import { storage } from "../storage";
import { verifyFirebaseToken } from "../middleware/firebaseAuth";

export function registerPortfolioRoutes(app: Express) {
  // Get positions count
  app.get("/api/positions/count", verifyFirebaseToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const holdings = await storage.getPortfolioHoldings(req.user.userId, false);
      const activePositions = holdings.filter(h => h.quantity > 0);
      res.json(activePositions.length);
    } catch (error) {
      console.error("Get positions count error:", error);
      res.status(500).json({ error: "Failed to fetch count" });
    }
  });

  // Get total P&L for user's portfolio
  app.get("/api/portfolio/total-pnl", verifyFirebaseToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const totalPnl = await storage.getTotalPnL(req.user.userId);
      res.json({ totalPnl });
    } catch (error) {
      console.error("Get total P&L error:", error);
      res.status(500).json({ error: "Failed to fetch total P&L" });
    }
  });

  // Portfolio routes
  app.get("/api/portfolio/holdings", verifyFirebaseToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const isSimulated = req.query.simulated === "true";
      const holdings = await storage.getPortfolioHoldings(req.user.userId, isSimulated ? true : false);
      res.json(holdings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch portfolio holdings" });
    }
  });

  app.post("/api/portfolio/holdings", verifyFirebaseToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const { ticker, quantity, averagePurchasePrice, isSimulated } = req.body;
      
      if (!ticker || quantity === undefined || !averagePurchasePrice) {
        return res.status(400).json({ error: "Missing required fields: ticker, quantity, averagePurchasePrice" });
      }
      
      const holding = await storage.createPortfolioHolding({
        userId: req.user.userId,
        ticker: ticker.toUpperCase(),
        quantity,
        averagePurchasePrice,
        isSimulated: isSimulated ?? false,
      });
      
      res.status(201).json(holding);
    } catch (error) {
      console.error("Create portfolio holding error:", error);
      res.status(500).json({ error: "Failed to create portfolio holding" });
    }
  });

  app.get("/api/portfolio/holdings/:id", verifyFirebaseToken, async (req, res) => {
    try {
      // CRITICAL SECURITY: Verify authentication and ownership
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const holding = await storage.getPortfolioHolding(req.params.id, req.user.userId);
      if (!holding) {
        return res.status(404).json({ error: "Holding not found" });
      }
      res.json(holding);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch holding" });
    }
  });

  app.delete("/api/portfolio/holdings/:id", verifyFirebaseToken, async (req, res) => {
    try {
      // CRITICAL SECURITY: Verify authentication and ownership before deletion
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      // Verify ownership before deleting
      const holding = await storage.getPortfolioHolding(req.params.id, req.user.userId);
      if (!holding) {
        return res.status(404).json({ error: "Holding not found" });
      }
      
      const success = await storage.deletePortfolioHolding(req.params.id);
      if (!success) {
        return res.status(500).json({ error: "Failed to delete holding" });
      }
      res.json({ message: "Holding deleted successfully" });
    } catch (error) {
      console.error("Delete holding error:", error);
      res.status(500).json({ error: "Failed to delete holding" });
    }
  });
}

