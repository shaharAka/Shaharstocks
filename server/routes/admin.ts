import type { Express } from "express";
import { storage } from "../storage";
import { adminRateLimiter } from "../middleware/rateLimiter";
import { cancelPayPalSubscription } from "../paypalService";
import { runTickerDailyBriefGeneration } from "../jobs/generateTickerDailyBriefs";
import { stockService } from "../stockService";
import { aiAnalysisService } from "../aiAnalysisService";
import { fetchInitialDataForUser } from "./utils";
import { verifyFirebaseToken } from "../middleware/firebaseAuth";
import { triggerOpportunitiesFetch } from "../index";
import { secPoller } from "../services/sec/SecPoller";
import { opportunityScheduler } from "../services/OpportunityScheduler";

export function registerAdminRoutes(app: Express, requireAdmin: typeof import("../middleware/firebaseAuth").requireAdmin) {
  // Admin: Update app version
  app.post("/api/admin/version", verifyFirebaseToken, requireAdmin, async (req, res) => {
    try {
      const { appVersion, releaseNotes } = req.body;
      
      if (!appVersion || typeof appVersion !== "string") {
        return res.status(400).json({ error: "Version is required" });
      }
      
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const settings = await storage.updateSystemSettings({
        appVersion: appVersion.trim(),
        releaseNotes: releaseNotes?.trim() || null,
        lastUpdatedBy: req.user.userId,
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
  app.get("/api/admin/ai-provider", verifyFirebaseToken, requireAdmin, async (req, res) => {
    try {
      const settings = await storage.getSystemSettings();
      const { getAvailableProviders } = await import("../aiProvider");
      
      res.json({
        provider: settings?.aiProvider || "openai",
        model: settings?.aiModel || null,
        insiderDataSource: settings?.insiderDataSource || "openinsider",
        availableProviders: getAvailableProviders(),
      });
    } catch (error) {
      console.error("Error getting AI provider:", error);
      res.status(500).json({ error: "Failed to get AI provider configuration" });
    }
  });

  // Admin: Update AI provider configuration
  app.post("/api/admin/ai-provider", verifyFirebaseToken, requireAdmin, async (req, res) => {
    try {
      const { provider, model, insiderDataSource } = req.body;
      
      // Valid provider is only "openai" or "gemini". Anything else (undefined, "", "openinsider", etc.)
      // is treated as insider-only: no provider selection is required; AI uses a fixed fallback chain.
      const wantsProviderUpdate = provider === "openai" || provider === "gemini";

      if (!wantsProviderUpdate) {
        // Insider-only update: update insiderDataSource when provided; no provider required
        const updateData: any = { lastUpdatedBy: req.user?.userId };
        if (insiderDataSource !== undefined && insiderDataSource !== null && insiderDataSource !== "") {
          updateData.insiderDataSource = insiderDataSource;
        }
        const settings = await storage.updateSystemSettings(updateData);
        console.log("[Admin] Insider data source updated to:", settings.insiderDataSource);
        return res.json({ success: true, insiderDataSource: settings.insiderDataSource });
      }
      
      // Legacy: explicit provider+model update (UI no longer sends provider; kept for API callers)
      
      const { isOpenAIAvailable, isGeminiAvailable, clearProviderCache } = await import("../aiProvider");
      
      if (provider === "openai" && !isOpenAIAvailable()) {
        return res.status(400).json({ error: "OpenAI API key is not configured" });
      }
      
      if (provider === "gemini" && !isGeminiAvailable()) {
        return res.status(400).json({ error: "Gemini API key is not configured. Please add GEMINI_API_KEY to secrets." });
      }
      
      const updateData: any = {
        aiProvider: provider,
        aiModel: model || null,
        lastUpdatedBy: req.user?.userId,
      };
      
      if (insiderDataSource !== undefined && insiderDataSource !== null && insiderDataSource !== "") {
        updateData.insiderDataSource = insiderDataSource;
      }
      
      const settings = await storage.updateSystemSettings(updateData);
      
      clearProviderCache();
      
      const { aiAnalysisService } = await import("../aiAnalysisService");
      const { setMacroProviderConfig } = await import("../macroAgentService");
      const { setBacktestProviderConfig } = await import("../backtestService");
      
      const config = { provider: settings.aiProvider as "openai" | "gemini", model: settings.aiModel || undefined };
      aiAnalysisService.setProviderConfig(config);
      setMacroProviderConfig(config);
      setBacktestProviderConfig(config);
      
      console.log("[Admin] AI provider updated to:", provider, model ? `(model: ${model})` : "");
      
      res.json({
        success: true,
        provider: settings.aiProvider,
        model: settings.aiModel,
      });
    } catch (error: any) {
      console.error("Error updating AI provider:", error);
      console.error("Error stack:", error?.stack);
      console.error("Error message:", error?.message);
      res.status(500).json({ 
        error: "Failed to update AI provider configuration",
        details: error?.message || String(error)
      });
    }
  });

  // Admin: Fetch available models from provider APIs dynamically
  app.get("/api/admin/ai-provider/models", verifyFirebaseToken, requireAdmin, async (req, res) => {
    try {
      const provider = req.query.provider as string;
      
      if (!provider || !["openai", "gemini"].includes(provider)) {
        return res.status(400).json({ error: "Invalid provider. Must be 'openai' or 'gemini'" });
      }
      
      const { fetchAvailableModels } = await import("../aiProvider");
      
      // Hardcoded fallback models (always available)
      const fallbackModels = provider === "openai" 
        ? ["gpt-5.2", "gpt-5"]
        : ["gemini-3-pro-preview", "gemini-3-flash-preview"];
      
      try {
        const models = await fetchAvailableModels(provider as "openai" | "gemini");
        
        // Use fetched models if valid, otherwise use fallback
        const finalModels = (models && Array.isArray(models) && models.length > 0) 
          ? models 
          : fallbackModels;
        
        console.log(`[Admin] Returning ${finalModels.length} models for ${provider}:`, finalModels);
        
        res.json({
          provider,
          models: finalModels,
        });
      } catch (fetchError: any) {
        console.error(`[Admin] Error fetching models for ${provider}:`, fetchError?.message || fetchError);
        // Always return fallback models on error
        console.log(`[Admin] Using fallback models:`, fallbackModels);
        
        res.json({
          provider,
          models: fallbackModels,
        });
      }
    } catch (error: any) {
      console.error("[Admin] Error in models endpoint:", error?.message || error);
      // Last resort: return empty array with error
      res.status(500).json({ 
        error: "Failed to fetch AI models",
        provider: req.query.provider,
        models: []
      });
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

  // ADMIN ONLY: Update user subscription status
  app.post("/api/admin/update-subscription-status", verifyFirebaseToken, requireAdmin, async (req, res) => {
    try {
      const { email, subscriptionStatus } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }
      if (!subscriptionStatus) {
        return res.status(400).json({ error: "Subscription status is required" });
      }

      // Validate subscription status
      // Valid statuses: trial/basic (free tier), pro (pro tier)
      // Admin is determined by isAdmin/isSuperAdmin flags, not subscription status
      const validStatuses = ["trial", "basic", "pro", "pending_verification", "inactive", "cancelled", "expired"];
      if (!validStatuses.includes(subscriptionStatus)) {
        return res.status(400).json({ error: `Invalid subscription status. Must be one of: ${validStatuses.join(", ")}` });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const updateData: any = {
        subscriptionStatus,
      };

      // Set trial end date if setting to trial
      if (subscriptionStatus === "trial") {
        const now = new Date();
        const trialEndsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
        updateData.trialEndsAt = trialEndsAt;
        updateData.subscriptionStartDate = now;
      } else if (subscriptionStatus === "pro") {
        // Set subscription start date for pro
        if (!user.subscriptionStartDate) {
          updateData.subscriptionStartDate = new Date();
        }
        // Clear trial end date if moving from trial
        if (user.subscriptionStatus === "trial") {
          updateData.trialEndsAt = null;
        }
      } else if (subscriptionStatus === "expired" || subscriptionStatus === "cancelled") {
        // Set subscription end date
        updateData.subscriptionEndDate = new Date();
      }

      const updatedUser = await storage.updateUser(user.id, updateData);
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({
        success: true,
        message: `Subscription status updated to ${subscriptionStatus}`,
        user: {
          ...updatedUser,
          passwordHash: undefined,
        }
      });
    } catch (error) {
      console.error("Update subscription status error:", error);
      res.status(500).json({ error: "Failed to update subscription status" });
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
  app.post("/api/admin/verify-email", verifyFirebaseToken, requireAdmin, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      // Require super admin access
      const adminUser = await storage.getUser(req.user.userId);
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

      const archivedUser = await storage.archiveUser(user.id, req.user!.userId);

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
  app.post("/api/admin/extend-subscription", verifyFirebaseToken, requireAdmin, async (req, res) => {
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
        createdBy: req.user!.userId,
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
        createdBy: req.user!.userId,
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
  app.get("/api/admin/notifications", verifyFirebaseToken, requireAdmin, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(req.user.userId);
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

  app.get("/api/admin/notifications/unread-count", verifyFirebaseToken, requireAdmin, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(req.user.userId);
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

  app.post("/api/admin/notifications/:id/read", verifyFirebaseToken, requireAdmin, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(req.user.userId);
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

  app.post("/api/admin/notifications/mark-all-read", verifyFirebaseToken, requireAdmin, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(req.user.userId);
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
  app.post("/api/admin/regenerate-briefs", verifyFirebaseToken, requireAdmin, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(req.user.userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const today = new Date().toISOString().split('T')[0];
      
      // Get all followed tickers for this user
      const followedStocks = await storage.getUserFollowedStocks(req.user.userId);
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
          const stock = await storage.getStock(req.user.userId, ticker);
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
          const holding = await storage.getPortfolioHoldingByTicker(req.user.userId, ticker, false);
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
            userId: req.user.userId,
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

  // Admin endpoint to manually trigger opportunities fetch
  app.post("/api/admin/trigger-opportunities-fetch", verifyFirebaseToken, requireAdmin, async (req, res) => {
    try {
      const { cadence } = req.body;
      
      if (!cadence || (cadence !== 'daily' && cadence !== 'hourly')) {
        return res.status(400).json({ error: "cadence must be 'daily' or 'hourly'" });
      }

      // Trigger the fetch in the background
      triggerOpportunitiesFetch(cadence as 'daily' | 'hourly').catch(error => {
        console.error(`[Admin] Failed to trigger ${cadence} opportunities fetch:`, error);
      });

      res.json({ 
        success: true, 
        message: `${cadence} opportunities fetch triggered`,
        cadence 
      });
    } catch (error) {
      console.error("Trigger opportunities fetch error:", error);
      res.status(500).json({ error: "Failed to trigger opportunities fetch" });
    }
  });

  // Admin endpoint to check SecPoller status
  app.get("/api/admin/sec-poller/status", verifyFirebaseToken, requireAdmin, async (req, res) => {
    try {
      const status = secPoller.getStatus();
      const now = Date.now();
      
      // Add recommendations based on status
      const recommendations: string[] = [];
      if (!status.isPolling) {
        recommendations.push("Poller is not running. Use /api/admin/sec-poller/restart to start it.");
      } else if (status.healthStatus === 'unhealthy') {
        recommendations.push("Poller appears unhealthy. Consider restarting with /api/admin/sec-poller/restart");
      } else if (!status.hasTimer) {
        recommendations.push("Timer is not set. Poller may have failed to initialize properly.");
      }
      
      res.json({ 
        success: true, 
        status,
        recommendations,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Get SecPoller status error:", error);
      res.status(500).json({ error: "Failed to get SecPoller status" });
    }
  });

  // Admin endpoint to manually trigger SecPoller
  app.post("/api/admin/sec-poller/trigger", verifyFirebaseToken, requireAdmin, async (req, res) => {
    try {
      await secPoller.triggerPoll();
      res.json({ 
        success: true, 
        message: "SecPoller poll triggered successfully",
        status: secPoller.getStatus()
      });
    } catch (error: any) {
      console.error("Trigger SecPoller error:", error);
      res.status(500).json({ 
        error: "Failed to trigger SecPoller", 
        message: error.message,
        status: secPoller.getStatus()
      });
    }
  });

  // Admin endpoint to restart SecPoller
  app.post("/api/admin/sec-poller/restart", verifyFirebaseToken, requireAdmin, async (req, res) => {
    try {
      console.log(`[Admin] [${new Date().toISOString()}] Manual SecPoller restart requested`);
      await secPoller.restart();
      res.json({ 
        success: true, 
        message: "SecPoller restarted successfully",
        status: secPoller.getStatus()
      });
    } catch (error: any) {
      console.error("Restart SecPoller error:", error);
      res.status(500).json({ 
        error: "Failed to restart SecPoller", 
        message: error.message,
        status: secPoller.getStatus()
      });
    }
  });

  // Admin endpoint to check Opportunity Scheduler status
  app.get("/api/admin/opportunity-scheduler/status", verifyFirebaseToken, requireAdmin, async (req, res) => {
    try {
      const status = opportunityScheduler.getStatus();
      const recommendations: string[] = [];
      
      if (status.hourly.healthStatus === 'unhealthy') {
        recommendations.push("Hourly job appears unhealthy. Check logs for errors.");
      }
      if (status.daily.healthStatus === 'unhealthy') {
        recommendations.push("Daily job appears unhealthy. Check logs for errors.");
      }
      if (!status.hourly.isScheduled) {
        recommendations.push("Hourly job is not scheduled. Server may need restart.");
      }
      if (!status.daily.isScheduled) {
        recommendations.push("Daily job is not scheduled. Server may need restart.");
      }
      
      res.json({ 
        success: true, 
        status,
        recommendations,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Get Opportunity Scheduler status error:", error);
      res.status(500).json({ error: "Failed to get scheduler status" });
    }
  });

  // Admin endpoint to manually trigger hourly job
  app.post("/api/admin/opportunity-scheduler/trigger-hourly", verifyFirebaseToken, requireAdmin, async (req, res) => {
    try {
      console.log(`[Admin] [${new Date().toISOString()}] Manual hourly job trigger requested`);
      await triggerOpportunitiesFetch('hourly');
      res.json({ 
        success: true, 
        message: "Hourly job triggered successfully",
        status: opportunityScheduler.getStatus()
      });
    } catch (error: any) {
      console.error("Trigger hourly job error:", error);
      res.status(500).json({ 
        error: "Failed to trigger hourly job", 
        message: error.message,
        status: opportunityScheduler.getStatus()
      });
    }
  });

  // Admin endpoint to manually trigger daily job
  app.post("/api/admin/opportunity-scheduler/trigger-daily", verifyFirebaseToken, requireAdmin, async (req, res) => {
    try {
      console.log(`[Admin] [${new Date().toISOString()}] Manual daily job trigger requested`);
      await triggerOpportunitiesFetch('daily');
      res.json({ 
        success: true, 
        message: "Daily job triggered successfully",
        status: opportunityScheduler.getStatus()
      });
    } catch (error: any) {
      console.error("Trigger daily job error:", error);
      res.status(500).json({ 
        error: "Failed to trigger daily job", 
        message: error.message,
        status: opportunityScheduler.getStatus()
      });
    }
  });
}

