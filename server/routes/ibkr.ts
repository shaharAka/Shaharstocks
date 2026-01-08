import type { Express } from "express";
import { storage } from "../storage";
import { getIbkrService } from "../ibkrService";

export function registerIbkrRoutes(app: Express) {
  app.get("/api/ibkr/config", async (req, res) => {
    try {
      let config = await storage.getIbkrConfig();
      if (!config) {
        // Create default config if doesn't exist
        config = await storage.createOrUpdateIbkrConfig({
          gatewayUrl: 'https://localhost:5000',
          isPaperTrading: true
        });
      }
      res.json(config);
    } catch (error) {
      console.error("IBKR config fetch error:", error);
      res.status(500).json({ error: "Failed to fetch IBKR configuration" });
    }
  });

  app.post("/api/ibkr/config", async (req, res) => {
    try {
      const config = await storage.createOrUpdateIbkrConfig(req.body);
      res.json(config);
    } catch (error) {
      console.error("IBKR config update error:", error);
      res.status(400).json({ error: "Failed to update IBKR configuration" });
    }
  });

  app.get("/api/ibkr/status", async (req, res) => {
    try {
      const config = await storage.getIbkrConfig();
      if (!config) {
        return res.json({ connected: false, error: "IBKR not configured" });
      }

      const ibkr = getIbkrService(config.gatewayUrl);
      const authStatus = await ibkr.checkAuthStatus();
      
      // Update connection status in database
      await storage.updateIbkrConnectionStatus(authStatus.authenticated && authStatus.connected);

      res.json({
        connected: authStatus.authenticated && authStatus.connected,
        authenticated: authStatus.authenticated,
        competing: authStatus.competing,
        accountId: config.accountId,
        isPaperTrading: config.isPaperTrading,
        gatewayUrl: config.gatewayUrl
      });
    } catch (error: any) {
      console.error("IBKR status check error:", error);
      await storage.updateIbkrConnectionStatus(false, undefined, error.message);
      res.json({ 
        connected: false, 
        error: "Gateway not reachable. Make sure IBKR Client Portal Gateway is running." 
      });
    }
  });

  app.get("/api/ibkr/accounts", async (req, res) => {
    try {
      const config = await storage.getIbkrConfig();
      if (!config) {
        return res.status(400).json({ error: "IBKR not configured" });
      }

      const ibkr = getIbkrService(config.gatewayUrl);
      const accounts = await ibkr.getAccounts();
      
      // Store the first account ID if we don't have one
      if (accounts.length > 0 && !config.accountId) {
        await storage.createOrUpdateIbkrConfig({ accountId: accounts[0].id });
      }

      res.json(accounts);
    } catch (error: any) {
      console.error("IBKR accounts fetch error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/ibkr/positions", async (req, res) => {
    try {
      const config = await storage.getIbkrConfig();
      if (!config || !config.accountId) {
        return res.status(400).json({ error: "IBKR account not configured" });
      }

      const ibkr = getIbkrService(config.gatewayUrl);
      const positions = await ibkr.getPositions(config.accountId);
      res.json(positions);
    } catch (error: any) {
      console.error("IBKR positions fetch error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ibkr/trade", async (req, res) => {
    try {
      const { ticker, action, quantity } = req.body;
      
      if (!ticker || !action || !quantity) {
        return res.status(400).json({ error: "Missing required fields: ticker, action, quantity" });
      }

      const config = await storage.getIbkrConfig();
      if (!config || !config.accountId) {
        return res.status(400).json({ error: "IBKR account not configured" });
      }

      if (!config.isConnected) {
        return res.status(400).json({ error: "IBKR gateway is not connected" });
      }

      const ibkr = getIbkrService(config.gatewayUrl);
      
      let orderResult;
      if (action === 'buy') {
        orderResult = await ibkr.buyStock(config.accountId, ticker, quantity);
      } else if (action === 'sell') {
        orderResult = await ibkr.sellStock(config.accountId, ticker, quantity);
      } else {
        return res.status(400).json({ error: "Invalid action. Must be 'buy' or 'sell'" });
      }

      // Record the trade in our database
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Get current stock price to record in trades table
      const stock = await storage.getStock(req.session.userId, ticker);
      const price = stock ? parseFloat(stock.currentPrice) : 0;
      await storage.createTrade({
        userId: req.session.userId,
        ticker,
        type: action,
        quantity,
        price: price.toFixed(2),
        total: (price * quantity).toFixed(2),
        status: 'completed',
        broker: 'ibkr',
        ibkrOrderId: orderResult.orderId
      });

      res.json({
        success: true,
        orderId: orderResult.orderId,
        message: `${action.toUpperCase()} order placed for ${quantity} shares of ${ticker}`
      });
    } catch (error: any) {
      console.error("IBKR trade error:", error);
      res.status(500).json({ error: error.message || "Failed to execute trade" });
    }
  });
}

