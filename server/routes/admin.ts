import type { Express } from "express";
import { storage } from "../storage";
import { adminRateLimiter } from "../middleware/rateLimiter";
import { cancelPayPalSubscription } from "../paypalService";
import { runTickerDailyBriefGeneration } from "../jobs/generateTickerDailyBriefs";
import { stockService } from "../stockService";
import { aiAnalysisService } from "../aiAnalysisService";
import { fetchInitialDataForUser } from "./utils";

export function registerAdminRoutes(app: Express, requireAdmin: ReturnType<typeof import("../session").createRequireAdmin>) {
  // Admin: Update app version
  app.post("/api/admin/version", requireAdmin, async (req, res) => {
    try {
      const { appVersion, releaseNotes } = req.body;
      
      if (!appVersion || typeof appVersion !== "string") {
        return res.status(400).json({ error: "Version is required" });
      }
      
      const settings = await storage.updateSystemSettings({
        appVersion: appVersion.trim(),
        releaseNotes: releaseNotes?.trim() || null,
        lastUpdatedBy: req.session.userId,
      });
      
      res.json({
        success: true,
        version: settings.appVersion,
        releaseNotes: settings.releaseNotes,
        updatedAt: settings.updatedAt,
      });
    } catch (error) {
      console.error("Error updating version:", error);
      res.status(500).json({ error: "Failed to update version" });
    }
  });

  // Admin: Get AI provider configuration
  app.get("/api/admin/ai-provider", requireAdmin, async (req, res) => {
    try {
      const settings = await storage.getSystemSettings();
      const { getAvailableProviders } = await import("../aiProvider");
      
      res.json({
        provider: settings?.aiProvider || "openai",
        model: settings?.aiModel || null,
        availableProviders: getAvailableProviders(),
      });
    } catch (error) {
      console.error("Error getting AI provider:", error);
      res.status(500).json({ error: "Failed to get AI provider configuration" });
    }
  });

  // Admin: Update AI provider configuration
  app.post("/api/admin/ai-provider", requireAdmin, async (req, res) => {
    try {
      const { provider, model } = req.body;
      
      if (!provider || !["openai", "gemini"].includes(provider)) {
        return res.status(400).json({ error: "Invalid provider. Must be 'openai' or 'gemini'" });
      }
      
      // Check if the selected provider is available
      const { isOpenAIAvailable, isGeminiAvailable, clearProviderCache } = await import("../aiProvider");
      
      if (provider === "openai" && !isOpenAIAvailable()) {
        return res.status(400).json({ error: "OpenAI API key is not configured" });
      }
      
      if (provider === "gemini" && !isGeminiAvailable()) {
        return res.status(400).json({ error: "Gemini API key is not configured. Please add GEMINI_API_KEY to secrets." });
      }
      
      // Update settings
      const settings = await storage.updateSystemSettings({
        aiProvider: provider,
        aiModel: model || null,
        lastUpdatedBy: req.session.userId,
      });
      
      // Clear the provider cache so the new provider is used
      clearProviderCache();
      
      // Update all services that use AI
      const { aiAnalysisService } = await import("../aiAnalysisService");
      const { setMacroProviderConfig } = await import("../macroAgentService");
      const { setBacktestProviderConfig } = await import("../backtestService");
      
      const config = { provider: settings.aiProvider as "openai" | "gemini", model: settings.aiModel || undefined };
      aiAnalysisService.setProviderConfig(config);
      setMacroProviderConfig(config);
      setBacktestProviderConfig(config);
      
      console.log(`[Admin] AI provider updated to: ${provider}${model ? ` (model: ${model})` : ""}`);
      
      res.json({
        success: true,
        provider: settings.aiProvider,
        model: settings.aiModel,
      });
    } catch (error) {
      console.error("Error updating AI provider:", error);
      res.status(500).json({ error: "Failed to update AI provider configuration" });
    }
  });

  // Admin: Fetch available models from provider APIs dynamically
  app.get("/api/admin/ai-provider/models", requireAdmin, async (req, res) => {
    try {
      const provider = req.query.provider as string;
      
      if (!provider || !["openai", "gemini"].includes(provider)) {
        return res.status(400).json({ error: "Invalid provider. Must be 'openai' or 'gemini'" });
      }
      
      const { fetchAvailableModels } = await import("../aiProvider");
      const models = await fetchAvailableModels(provider as "openai" | "gemini");
      
      res.json({
        provider,
        models,
      });
    } catch (error) {
      console.error("Error fetching AI models:", error);
      res.status(500).json({ error: "Failed to fetch AI models" });
    }
  });

  // Admin: Manually trigger daily brief generation
  app.post("/api/admin/generate-daily-briefs", requireAdmin, async (req, res) => {
    try {
      console.log("[Admin] Manually triggering daily brief generation...");
      await runTickerDailyBriefGeneration(storage);
      
      // Get count of briefs generated today
      const today = new Date().toISOString().split('T')[0];
      const opportunities = await storage.getOpportunities({ cadence: 'all' });
      const tickerSet = new Set(opportunities.map(o => o.ticker.toUpperCase()));
      const tickers = Array.from(tickerSet);
      
      let generatedCount = 0;
      for (const ticker of tickers.slice(0, 20)) {
        const brief = await storage.getLatestTickerBrief(ticker);
        if (brief && brief.briefDate === today) {
          generatedCount++;
        }
      }
      
      res.json({ 
        success: true, 
        message: `Daily brief generation completed`,
        briefsGenerated: generatedCount,
        totalTickers: tickers.length
      });
    } catch (error) {
      console.error("Error generating daily briefs:", error);
      res.status(500).json({ error: "Failed to generate daily briefs" });
    }
  });

  // ADMIN ONLY: Manual subscription activation for testing
  app.post("/api/admin/activate-subscription", requireAdmin, async (req, res) => {
    try {
      const { email, paypalSubscriptionId } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const updatedUser = await storage.updateUser(user.id, {
        subscriptionStatus: "active",
        paypalSubscriptionId: paypalSubscriptionId || "manual_activation",
        subscriptionStartDate: new Date(),
      });

      // Trigger initial data fetch in background if not done yet
      if (!user.initialDataFetched) {
        console.log(`[SubscriptionActivation] Triggering initial data fetch for user ${user.id}...`);
        fetchInitialDataForUser(user.id).catch(err => {
          console.error(`[SubscriptionActivation] Background initial data fetch failed for user ${user.id}:`, err);
        });
      }

      res.json({ 
        success: true,
        user: {
          ...updatedUser,
          passwordHash: undefined,
        }
      });
    } catch (error) {
      console.error("Subscription activation error:", error);
      res.status(500).json({ error: "Failed to activate subscription" });
    }
  });

  // ADMIN ONLY: Create or promote user to super admin
  app.post("/api/admin/create-super-admin", requireAdmin, async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const updatedUser = await storage.updateUser(user.id, {
        isAdmin: true,
        subscriptionStatus: "active",
        subscriptionStartDate: new Date(),
      });

      res.json({ 
        success: true,
        message: "User promoted to super admin",
        user: {
          ...updatedUser,
          passwordHash: undefined,
        }
      });
    } catch (error) {
      console.error("Super admin creation error:", error);
      res.status(500).json({ error: "Failed to create super admin" });
    }
  });

  // ADMIN ONLY: Deactivate user subscription
  app.post("/api/admin/deactivate-subscription", requireAdmin, async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const updatedUser = await storage.updateUserSubscriptionStatus(
        user.id,
        "inactive",
        new Date()
      );

      res.json({
        success: true,
        message: "Subscription deactivated",
        user: {
          ...updatedUser,
          passwordHash: undefined,
        }
      });
    } catch (error) {
      console.error("Deactivate subscription error:", error);
      res.status(500).json({ error: "Failed to deactivate subscription" });
    }
  });

  // SUPER ADMIN ONLY: Manually verify user email (for testing purposes)
  app.post("/api/admin/verify-email", requireAdmin, async (req, res) => {
    try {
      // Require super admin access
      const adminUser = await storage.getUser(req.session.userId!);
      if (!adminUser?.isSuperAdmin) {
        return res.status(403).json({ error: "Super admin access required" });
      }

      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (user.emailVerified) {
        return res.status(400).json({ error: "Email is already verified" });
      }

      // Verify email and start trial if pending verification
      const updatedUser = await storage.verifyUserEmail(user.id);

      res.json({
        success: true,
        message: "Email verified successfully",
        user: {
          ...updatedUser,
          passwordHash: undefined,
        }
      });
    } catch (error) {
      console.error("Verify email error:", error);
      res.status(500).json({ error: "Failed to verify email" });
    }
  });

  // ADMIN ONLY: Reset user password (generate secure token)
  app.post("/api/admin/reset-password", requireAdmin, async (req, res) => {
    try {
      const { email, newPassword } = req.body;
      if (!email || !newPassword) {
        return res.status(400).json({ error: "Email and new password are required" });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const bcrypt = await import("bcryptjs");
      const passwordHash = await bcrypt.hash(newPassword, 10);

      await storage.updateUser(user.id, {
        passwordHash,
      });

      res.json({
        success: true,
        message: "Password reset successfully",
      });
    } catch (error) {
      console.error("Password reset error:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  // ADMIN ONLY: Archive user (soft delete)
  app.post("/api/admin/archive-user", requireAdmin, async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Cancel PayPal subscription if exists
      let subscriptionCancelled = false;
      if (user.paypalSubscriptionId) {
        const cancelResult = await cancelPayPalSubscription(
          user.paypalSubscriptionId, 
          'Account archived by administrator'
        );
        subscriptionCancelled = cancelResult.success;
        if (!cancelResult.success) {
          console.warn(`[Archive User] Failed to cancel PayPal subscription for ${email}: ${cancelResult.error}`);
        }
      }

      const archivedUser = await storage.archiveUser(user.id, req.session.userId!);

      // Update subscription status to cancelled
      if (user.paypalSubscriptionId) {
        await storage.updateUser(user.id, { subscriptionStatus: 'cancelled' });
      }

      res.json({
        success: true,
        message: "User archived",
        subscriptionCancelled,
        user: {
          ...archivedUser,
          passwordHash: undefined,
        }
      });
    } catch (error) {
      console.error("Archive user error:", error);
      res.status(500).json({ error: "Failed to archive user" });
    }
  });

  // ADMIN ONLY: Unarchive user
  app.post("/api/admin/unarchive-user", requireAdmin, async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const unarchivedUser = await storage.unarchiveUser(user.id);

      res.json({
        success: true,
        message: "User unarchived",
        user: {
          ...unarchivedUser,
          passwordHash: undefined,
        }
      });
    } catch (error) {
      console.error("Unarchive user error:", error);
      res.status(500).json({ error: "Failed to unarchive user" });
    }
  });

  // ADMIN ONLY: Hard delete user
  app.delete("/api/admin/delete-user", requireAdmin, async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Cancel PayPal subscription if exists
      let subscriptionCancelled = false;
      if (user.paypalSubscriptionId) {
        const cancelResult = await cancelPayPalSubscription(
          user.paypalSubscriptionId, 
          'Account permanently deleted by administrator'
        );
        subscriptionCancelled = cancelResult.success;
        if (!cancelResult.success) {
          console.warn(`[Delete User] Failed to cancel PayPal subscription for ${email}: ${cancelResult.error}`);
        }
      }

      const deleted = await storage.deleteUser(user.id);

      res.json({
        success: deleted,
        message: deleted ? "User permanently deleted" : "Failed to delete user",
        subscriptionCancelled,
      });
    } catch (error) {
      console.error("Delete user error:", error);
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  // ADMIN ONLY: Manually extend subscription for N months
  app.post("/api/admin/extend-subscription", requireAdmin, async (req, res) => {
    try {
      const { email, months, reason } = req.body;
      if (!email || !months) {
        return res.status(400).json({ error: "Email and months are required" });
      }

      if (typeof months !== "number" || months <= 0 || months > 120) {
        return res.status(400).json({ error: "Months must be between 1 and 120" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + months);

      const override = await storage.createManualOverride({
        userId: user.id,
        startDate,
        endDate,
        monthsExtended: months,
        reason: reason || `Admin extended subscription by ${months} month(s)`,
        createdBy: req.session.userId!,
      });

      const updatedUser = await storage.updateUserSubscriptionStatus(
        user.id,
        "active",
        endDate
      );

      res.json({
        success: true,
        message: `Subscription extended by ${months} month(s)`,
        override,
        user: {
          ...updatedUser,
          passwordHash: undefined,
        }
      });
    } catch (error) {
      console.error("Extend subscription error:", error);
      res.status(500).json({ error: "Failed to extend subscription" });
    }
  });

  // ADMIN ONLY: Get user payment history and stats
  app.get("/api/admin/user-payments/:userId", requireAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const [payments, stats, overrides] = await Promise.all([
        storage.getUserPayments(userId),
        storage.getPaymentStats(userId),
        storage.getUserManualOverrides(userId),
      ]);

      res.json({
        user: {
          ...user,
          passwordHash: undefined,
        },
        payments,
        stats,
        overrides,
      });
    } catch (error) {
      console.error("Get user payments error:", error);
      res.status(500).json({ error: "Failed to get user payments" });
    }
  });

  // ADMIN ONLY: Create manual payment record
  app.post("/api/admin/create-payment", requireAdmin, async (req, res) => {
    try {
      const { email, amount, paymentMethod, notes } = req.body;
      if (!email || !amount) {
        return res.status(400).json({ error: "Email and amount are required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const payment = await storage.createPayment({
        userId: user.id,
        amount: amount.toString(),
        paymentDate: new Date(),
        paymentMethod: paymentMethod || "manual",
        status: "completed",
        transactionId: `manual_${Date.now()}`,
        notes: notes || "Manual payment entry by admin",
        createdBy: req.session.userId!,
      });

      res.json({
        success: true,
        message: "Payment record created",
        payment,
      });
    } catch (error) {
      console.error("Create payment error:", error);
      res.status(500).json({ error: "Failed to create payment" });
    }
  });

  // Admin notifications
  app.get("/api/admin/notifications", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user?.isSuperAdmin) {
        return res.status(403).json({ error: "Super admin access required" });
      }

      const notifications = await storage.getAdminNotifications();
      res.json(notifications);
    } catch (error) {
      console.error("Failed to fetch admin notifications:", error);
      res.status(500).json({ error: "Failed to fetch admin notifications" });
    }
  });

  app.get("/api/admin/notifications/unread-count", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user?.isSuperAdmin) {
        return res.status(403).json({ error: "Super admin access required" });
      }

      const count = await storage.getUnreadAdminNotificationCount();
      res.json({ count });
    } catch (error) {
      console.error("Failed to fetch unread admin notification count:", error);
      res.status(500).json({ error: "Failed to fetch unread count" });
    }
  });

  app.post("/api/admin/notifications/:id/read", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user?.isSuperAdmin) {
        return res.status(403).json({ error: "Super admin access required" });
      }

      const notification = await storage.markAdminNotificationAsRead(req.params.id);
      if (!notification) {
        return res.status(404).json({ error: "Notification not found" });
      }

      res.json(notification);
    } catch (error) {
      console.error("Failed to mark admin notification as read:", error);
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  });

  app.post("/api/admin/notifications/mark-all-read", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user?.isSuperAdmin) {
        return res.status(403).json({ error: "Super admin access required" });
      }

      await storage.markAllAdminNotificationsAsRead();
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to mark all admin notifications as read:", error);
      res.status(500).json({ error: "Failed to mark all notifications as read" });
    }
  });

  // Admin endpoint to regenerate daily briefs for all followed stocks
  app.post("/api/admin/regenerate-briefs", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const today = new Date().toISOString().split('T')[0];
      
      // Get all followed tickers for this user
      const followedStocks = await storage.getUserFollowedStocks(req.session.userId);
      const followedTickers = followedStocks.map(f => f.ticker);
      
      let generatedCount = 0;
      let skippedCount = 0;
      let errorCount = 0;
      
      for (const ticker of followedTickers) {
        try {
          // Get current price
          const quote = await stockService.getQuote(ticker);
          if (!quote || quote.price === 0 || quote.previousClose === 0) {
            console.log(`[AdminRegenerate] Skipping ${ticker} - invalid price data`);
            skippedCount++;
            continue;
          }
          
          // Get stock data for context and opportunity type
          const stock = await storage.getStock(req.session.userId, ticker);
          const stockData = stock as any;
          const opportunityType = stockData?.recommendation?.toLowerCase().includes("sell") ? "sell" : "buy";
          const previousAnalysis = stockData?.overallRating ? {
            overallRating: stockData.overallRating,
            summary: stockData.summary || "No previous analysis available",
            technicalAnalysis: stockData.technicalAnalysis ? {
              trend: stockData.technicalAnalysis.trend,
              momentum: stockData.technicalAnalysis.momentum,
              score: stockData.technicalAnalysis.score,
              signals: stockData.technicalAnalysis.signals
            } : undefined
          } : undefined;
          
          // Check if user owns this stock (real holdings only, not simulated)
          const holding = await storage.getPortfolioHoldingByTicker(req.session.userId, ticker, false);
          const userOwnsPosition = holding !== undefined && holding.quantity > 0;
          
          // Get recent news
          const now = Date.now() / 1000;
          const oneDayAgo = now - (24 * 60 * 60);
          const recentNews = stockData?.news
            ?.filter((article: any) => article.datetime && article.datetime >= oneDayAgo)
            ?.slice(0, 3)
            ?.map((article: any) => ({
              title: article.headline || "Untitled",
              sentiment: 0,
              source: article.source || "Unknown"
            }));
          
          // Generate DUAL-SCENARIO brief (both watching and owning)
          const brief = await aiAnalysisService.generateDailyBrief({
            ticker,
            currentPrice: quote.price,
            previousPrice: quote.previousClose,
            opportunityType,
            recentNews: recentNews && recentNews.length > 0 ? recentNews : undefined,
            previousAnalysis
          });
          
          // Create or update brief with BOTH scenarios
          await storage.createDailyBrief({
            userId: req.session.userId,
            ticker,
            briefDate: today,
            priceSnapshot: quote.price.toString(),
            priceChange: quote.change.toString(),
            priceChangePercent: quote.changePercent.toString(),
            
            // Watching scenario
            watchingStance: brief.watching.recommendedStance,
            watchingConfidence: brief.watching.confidence,
            watchingText: brief.watching.briefText,
            watchingHighlights: brief.watching.keyHighlights,
            
            // Owning scenario
            owningStance: brief.owning.recommendedStance,
            owningConfidence: brief.owning.confidence,
            owningText: brief.owning.briefText,
            owningHighlights: brief.owning.keyHighlights,
            
            // Legacy fields for backwards compat (use user's actual position)
            recommendedStance: userOwnsPosition ? brief.owning.recommendedStance : brief.watching.recommendedStance,
            confidence: userOwnsPosition ? brief.owning.confidence : brief.watching.confidence,
            briefText: userOwnsPosition ? brief.owning.briefText : brief.watching.briefText,
            keyHighlights: userOwnsPosition ? brief.owning.keyHighlights : brief.watching.keyHighlights,
            userOwnsPosition
          });
          
          generatedCount++;
          console.log(`[AdminRegenerate] Generated dual-scenario brief for ${ticker}: Watching=${brief.watching.recommendedStance}(${brief.watching.confidence}), Owning=${brief.owning.recommendedStance}(${brief.owning.confidence})`);
        } catch (error) {
          errorCount++;
          console.error(`[AdminRegenerate] Error generating brief for ${ticker}:`, error);
        }
      }
      
      res.json({ 
        success: true, 
        generated: generatedCount, 
        skipped: skippedCount, 
        errors: errorCount 
      });
    } catch (error) {
      console.error("Failed to regenerate briefs:", error);
      res.status(500).json({ error: "Failed to regenerate briefs" });
    }
  });
}

