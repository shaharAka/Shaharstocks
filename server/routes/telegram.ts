import type { Express } from "express";
import { storage } from "../storage";
import { insertTelegramConfigSchema } from "@shared/schema";
import { telegramService } from "../telegram";
import { telegramNotificationService } from "../telegramNotificationService";

export function registerTelegramRoutes(app: Express) {
  // Telegram Configuration routes
  app.get("/api/telegram/config", async (req, res) => {
    try {
      const config = await storage.getTelegramConfig();
      if (!config) {
        return res.status(404).json({ error: "Telegram configuration not found" });
      }
      // Don't send session string to frontend
      const { sessionString, ...configWithoutSession } = config;
      res.json(configWithoutSession);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch Telegram configuration" });
    }
  });

  app.post("/api/telegram/config", async (req, res) => {
    try {
      const validatedData = insertTelegramConfigSchema.parse(req.body);
      const config = await storage.createOrUpdateTelegramConfig(validatedData);
      
      // Reinitialize Telegram client with new config
      await telegramService.initialize();
      
      // Don't send session string to frontend
      const { sessionString, ...configWithoutSession } = config;
      res.status(201).json(configWithoutSession);
    } catch (error) {
      console.error("Telegram config error:", error);
      res.status(400).json({ error: "Invalid Telegram configuration data" });
    }
  });

  // Manual trigger endpoint to fetch Telegram messages
  app.post("/api/telegram/fetch", async (req, res) => {
    try {
      const config = await storage.getTelegramConfig();
      if (!config || !config.enabled) {
        return res.status(400).json({ error: "Telegram is not configured or disabled" });
      }

      // Get limit from request body, default to 10
      const limit = req.body.limit || 10;
      
      const messages = await telegramService.fetchRecentMessages(
        config.channelUsername,
        limit
      );

      res.json({ 
        success: true, 
        messagesFetched: messages.length,
        messages: messages.map(msg => ({
          id: msg.id,
          date: msg.date,
          text: msg.text,
          preview: msg.text?.substring(0, 100) || "(no text)",
          views: msg.views,
          entities: msg.entities,
        })),
        message: `Fetched ${messages.length} messages from @${config.channelUsername}. Check server logs for detailed structure.`
      });
    } catch (error) {
      console.error("Telegram fetch error:", error);
      res.status(500).json({ error: "Failed to fetch Telegram messages" });
    }
  });

  // Telegram connection status endpoint
  app.get("/api/telegram/status", async (req, res) => {
    try {
      const status = telegramService.getConnectionStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: "Failed to get connection status" });
    }
  });

  // Telegram authentication endpoints
  app.post("/api/telegram/auth/send-code", async (req, res) => {
    try {
      const { phoneNumber } = req.body;
      if (!phoneNumber) {
        return res.status(400).json({ error: "Phone number is required" });
      }

      const result = await telegramService.startAuthentication(phoneNumber);
      res.json(result);
    } catch (error: any) {
      console.error("Send code error:", error);
      res.status(500).json({ error: error.message || "Failed to send verification code" });
    }
  });

  app.post("/api/telegram/auth/sign-in", async (req, res) => {
    try {
      const { phoneNumber, phoneCode, phoneCodeHash } = req.body;
      if (!phoneNumber || !phoneCode || !phoneCodeHash) {
        return res.status(400).json({ error: "Phone number, code, and code hash are required" });
      }

      const result = await telegramService.completeAuthentication(phoneNumber, phoneCode, phoneCodeHash);
      res.json(result);
    } catch (error: any) {
      console.error("Sign in error:", error);
      res.status(500).json({ error: error.message || "Failed to complete authentication" });
    }
  });

  // Test notification endpoint
  app.post("/api/telegram/test-notification", async (req, res) => {
    try {
      if (!telegramNotificationService.isReady()) {
        return res.status(503).json({ 
          error: "Telegram notification service not initialized",
          details: "Make sure TELEGRAM_BOT_TOKEN and TELEGRAM_NOTIFICATION_CHAT_ID are configured"
        });
      }

      const success = await telegramNotificationService.sendStockAlert({
        ticker: "TEST",
        companyName: "Test Company Inc.",
        recommendation: "buy",
        currentPrice: "123.45",
        insiderPrice: "120.00",
        insiderQuantity: 50000,
        confidenceScore: 85,
      });

      if (success) {
        res.json({ success: true, message: "Test notification sent successfully" });
      } else {
        res.status(500).json({ error: "Failed to send test notification" });
      }
    } catch (error) {
      console.error("Test notification error:", error);
      res.status(500).json({ error: "Failed to send test notification" });
    }
  });
}

