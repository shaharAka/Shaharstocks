import type { Express } from "express";
import { storage } from "../storage";
import { db } from "../db";
import { glossaryTerms } from "@shared/schema";
import { isMarketOpen } from "./utils";

export function registerSystemRoutes(app: Express) {
  // Feature flags endpoint
  app.get("/api/feature-flags", async (req, res) => {
    res.json({
      enableTelegram: process.env.ENABLE_TELEGRAM === "true",
    });
  });

  // Version endpoint - returns version from database if set, otherwise from package.json
  app.get("/api/version", async (req, res) => {
    try {
      const settings = await storage.getSystemSettings();
      const packageJson = await import("../../package.json", { assert: { type: "json" } });
      
      res.json({
        version: settings?.appVersion || packageJson.default.version,
        name: packageJson.default.name,
        releaseNotes: settings?.releaseNotes || null,
        updatedAt: settings?.updatedAt || null,
      });
    } catch (error) {
      const packageJson = await import("../../package.json", { assert: { type: "json" } });
      res.json({
        version: packageJson.default.version,
        name: packageJson.default.name,
      });
    }
  });

  // Market status
  app.get("/api/market/status", async (req, res) => {
    try {
      const now = new Date();
      const etTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
      
      res.json({
        isOpen: isMarketOpen(),
        currentTime: now.toISOString(),
        marketTime: etTime.toLocaleString("en-US", { 
          timeZone: "America/New_York",
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        }),
        timezone: "America/New_York"
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get market status" });
    }
  });

  // Glossary
  app.get("/api/glossary", async (req, res) => {
    try {
      const terms = await db.select().from(glossaryTerms).orderBy(glossaryTerms.term);
      res.json(terms);
    } catch (error) {
      console.error("Failed to fetch glossary terms:", error);
      res.status(500).json({ error: "Failed to fetch glossary terms" });
    }
  });
}

