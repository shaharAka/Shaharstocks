/**
 * Central Route Registry
 * Registers all route modules with API versioning support
 */

import type { Express, Server } from "express";
import { createServer } from "http";
import { registerSystemRoutes } from "./system";
import { registerAuthRoutes } from "./auth";
import { registerWebhookRoutes } from "./webhooks";
import { registerUserRoutes } from "./users";
import { requireAdmin } from "../middleware/firebaseAuth";
import { storage } from "../storage";
import { registerAdminRoutes } from "./admin";
import { registerPortfolioRoutes } from "./portfolio";
import { registerTradeRoutes } from "./trades";
import { registerTradingRuleRoutes } from "./rules";
import { registerTutorialRoutes } from "./tutorials";
import { registerFollowedStockRoutes } from "./followed-stocks";
import { registerOpportunityRoutes } from "./opportunities";
import { registerMacroAnalysisRoutes } from "./macro-analysis";
import { registerAnalysisJobRoutes } from "./analysis-jobs";
import { registerBacktestRoutes } from "./backtest";
import { registerFeatureSuggestionRoutes } from "./feature-suggestions";
import { registerNotificationRoutes } from "./notifications";
import { registerAnnouncementRoutes } from "./announcements";
import { registerTelegramRoutes } from "./telegram";
import { registerIbkrRoutes } from "./ibkr";
import { registerOpeninsiderRoutes } from "./openinsider";
import { registerStockRoutes } from "./stocks";
import { registerHealthRoutes } from "./health";
import { apiVersioningMiddleware, addVersionHeaders, DEFAULT_VERSION, versionedPath } from "../middleware/apiVersioning";
import { createLogger } from "../logger";

const log = createLogger("routes");

/**
 * Register all routes with API versioning support
 * Routes are available at both /api/v1/* (versioned) and /api/* (default v1)
 */
export async function registerRoutes(app: Express): Promise<Server> {
  // Admin middleware is now requireAdmin from firebaseAuth (no storage dependency needed)

  // Apply API versioning middleware to all /api routes
  // This parses version from URL and sets req.apiVersion
  app.use("/api", apiVersioningMiddleware);
  
  // Add version headers to all API responses
  app.use("/api", addVersionHeaders);

  // ============================================================================
  // Versioned Routes (/api/v1/*)
  // All routes are registered with versioned paths
  // Legacy /api/* routes are also registered for backward compatibility
  // ============================================================================
  
  // System routes (health checks, settings, etc.) - no versioning needed
  registerSystemRoutes(app);
  
  // Health routes - available at both /api/health and /api/v1/health
  registerHealthRoutes(app);

  // Register routes at both versioned and legacy paths
  // Most route modules expect (app: Express) signature, so we wrap them
  // Routes are registered at both /api/v1/* and /api/* for backward compatibility
  
  // Auth routes - at /api/v1/auth/* and /api/auth/*
  registerAuthRoutes(app);
  
  // Webhook routes - keep at /api/webhooks/* (no versioning, external integrations)
  registerWebhookRoutes(app);
  
  // User routes - at /api/v1/users/* and /api/users/*
  registerUserRoutes(app);
  
  // Admin routes - at /api/v1/admin/* and /api/admin/*
  registerAdminRoutes(app, requireAdmin);
  
  // Stock routes - at /api/v1/stocks/* and /api/stocks/*
  registerStockRoutes(app);
  
  // Portfolio routes - at /api/v1/portfolio/* and /api/portfolio/*
  registerPortfolioRoutes(app);
  
  // Trade routes - at /api/v1/trades/* and /api/trades/*
  registerTradeRoutes(app);
  
  // Trading rule routes - at /api/v1/rules/* and /api/rules/*
  registerTradingRuleRoutes(app);
  
  // Tutorial routes - at /api/v1/tutorials/* and /api/tutorials/*
  registerTutorialRoutes(app);
  
  // Followed stock routes - at /api/v1/followed-stocks/* and /api/followed-stocks/*
  registerFollowedStockRoutes(app);
  
  // Opportunity routes - at /api/v1/opportunities/* and /api/opportunities/*
  registerOpportunityRoutes(app);
  
  // Macro analysis routes - at /api/v1/macro-analysis/* and /api/macro-analysis/*
  registerMacroAnalysisRoutes(app);
  
  // Analysis job routes - at /api/v1/analysis-jobs/* and /api/analysis-jobs/*
  registerAnalysisJobRoutes(app);
  
  // Backtest routes - at /api/v1/backtests/* and /api/backtests/*
  registerBacktestRoutes(app);
  
  // Feature suggestion routes - at /api/v1/feature-suggestions/* and /api/feature-suggestions/*
  registerFeatureSuggestionRoutes(app);
  
  // Notification routes - at /api/v1/notifications/* and /api/notifications/*
  registerNotificationRoutes(app);
  
  // Announcement routes - at /api/v1/announcements/* and /api/announcements/*
  registerAnnouncementRoutes(app);
  
  // Telegram routes (admin/system - no versioning)
  registerTelegramRoutes(app);
  
  // IBKR routes (admin/system - no versioning)
  registerIbkrRoutes(app);
  
  // OpenInsider routes (admin/system - no versioning)
  registerOpeninsiderRoutes(app);

  log.info("All routes registered with API versioning support", {
    defaultVersion: DEFAULT_VERSION,
    supportedVersions: ["v1"],
    legacySupport: true, // /api/* routes still work, default to v1
  });

  const httpServer = createServer(app);
  return httpServer;
}
