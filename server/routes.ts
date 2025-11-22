import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { insertStockSchema, insertTradeSchema, insertTradingRuleSchema, insertCompoundRuleSchema, insertBacktestSchema, insertTelegramConfigSchema, insertIbkrConfigSchema, insertOpeninsiderConfigSchema, insertStockCommentSchema, insertFeatureSuggestionSchema, insertAnnouncementSchema, insertFollowedStockSchema, aiAnalysisJobs, glossaryTerms } from "@shared/schema";
import { z } from "zod";
import { eq, or, inArray, ilike } from "drizzle-orm";
import { telegramService } from "./telegram";
import { stockService } from "./stockService";
import { secEdgarService } from "./secEdgarService";
import { getIbkrService } from "./ibkrService";
import { telegramNotificationService } from "./telegramNotificationService";
import { backtestService } from "./backtestService";
import { finnhubService } from "./finnhubService";
import { openinsiderService } from "./openinsiderService";
import { createRequireAdmin } from "./session";
import { verifyPayPalWebhook } from "./paypalWebhookVerifier";
import { aiAnalysisService } from "./aiAnalysisService";

/**
 * Check if US stock market is currently open
 * Market hours: 9:30 AM - 4:00 PM ET, Monday-Friday
 */
function isMarketOpen(): boolean {
  const now = new Date();
  
  // Convert to Eastern Time
  const etTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  
  // Check if weekend
  const day = etTime.getDay();
  if (day === 0 || day === 6) {
    return false; // Sunday or Saturday
  }
  
  // Check market hours (9:30 AM - 4:00 PM ET)
  const hours = etTime.getHours();
  const minutes = etTime.getMinutes();
  const timeInMinutes = hours * 60 + minutes;
  
  const marketOpen = 9 * 60 + 30;  // 9:30 AM
  const marketClose = 16 * 60;     // 4:00 PM
  
  return timeInMinutes >= marketOpen && timeInMinutes < marketClose;
}

// Helper function to fetch initial OpenInsider data for new users
async function fetchInitialDataForUser(userId: string): Promise<void> {
  try {
    console.log(`[InitialDataFetch] Starting initial data fetch for user ${userId}...`);
    
    // Fetch BOTH purchases and sales (500 each) for comprehensive initial dataset
    const [purchasesResponse, salesResponse] = await Promise.all([
      openinsiderService.fetchInsiderPurchases(500, undefined, "P"),
      openinsiderService.fetchInsiderSales(500, undefined)
    ]);
    
    // Merge transactions from both sources
    const transactions = [...purchasesResponse.transactions, ...salesResponse.transactions];
    
    // Merge stats for logging
    const scraperResponse = {
      transactions,
      stats: {
        total_rows_scraped: purchasesResponse.stats.total_rows_scraped + salesResponse.stats.total_rows_scraped,
        filtered_not_purchase: purchasesResponse.stats.filtered_not_purchase + salesResponse.stats.filtered_not_purchase,
        filtered_invalid_data: purchasesResponse.stats.filtered_invalid_data + salesResponse.stats.filtered_invalid_data,
        filtered_by_date: purchasesResponse.stats.filtered_by_date + salesResponse.stats.filtered_by_date,
        filtered_by_title: purchasesResponse.stats.filtered_by_title + salesResponse.stats.filtered_by_title,
        filtered_by_transaction_value: purchasesResponse.stats.filtered_by_transaction_value + salesResponse.stats.filtered_by_transaction_value,
        filtered_by_insider_name: purchasesResponse.stats.filtered_by_insider_name + salesResponse.stats.filtered_by_insider_name,
      }
    };
    
    console.log(`[InitialDataFetch] Fetched ${purchasesResponse.transactions.length} purchases + ${salesResponse.transactions.length} sales = ${transactions.length} total`);
    
    if (transactions.length === 0) {
      console.log(`[InitialDataFetch] No transactions found for user ${userId}`);
      await storage.markUserInitialDataFetched(userId);
      return;
    }

    const totalStage1Filtered = scraperResponse.stats.filtered_by_title + scraperResponse.stats.filtered_by_transaction_value + 
                                 scraperResponse.stats.filtered_by_date + scraperResponse.stats.filtered_not_purchase + 
                                 scraperResponse.stats.filtered_invalid_data;
    
    console.log(`[InitialDataFetch] ======= STAGE 1: Python Scraper Filters =======`);
    console.log(`[InitialDataFetch] Total rows scraped: ${scraperResponse.stats.total_rows_scraped}`);
    console.log(`[InitialDataFetch]   • Not a purchase / Invalid: ${scraperResponse.stats.filtered_not_purchase + scraperResponse.stats.filtered_invalid_data}`);
    console.log(`[InitialDataFetch]   • Filtered by date: ${scraperResponse.stats.filtered_by_date}`);
    console.log(`[InitialDataFetch]   • Filtered by title: ${scraperResponse.stats.filtered_by_title}`);
    console.log(`[InitialDataFetch]   • Filtered by transaction value: ${scraperResponse.stats.filtered_by_transaction_value}`);
    console.log(`[InitialDataFetch] → Total Stage 1 filtered: ${totalStage1Filtered}`);
    console.log(`[InitialDataFetch] → Returned ${transactions.length} matching transactions`);
    console.log(`[InitialDataFetch] ===================================================`);
    
    // Convert transactions to stock recommendations
    let createdCount = 0;
    let filteredMarketCap = 0;
    let filteredOptionsDeals = 0;
    let filteredAlreadyExists = 0;
    let filteredNoQuote = 0;
    
    for (const transaction of transactions) {
      try {
        // Check if this exact transaction already exists using composite key
        const existingTransaction = await storage.getTransactionByCompositeKey(
          userId, // Per-user tenant isolation
          transaction.ticker,
          transaction.filingDate,
          transaction.insiderName,
          transaction.recommendation // Use actual recommendation (buy or sell)
        );
        
        if (existingTransaction) {
          filteredAlreadyExists++;
          continue;
        }

        // Get current market price from Finnhub
        const quote = await finnhubService.getQuote(transaction.ticker);
        if (!quote || !quote.currentPrice) {
          filteredNoQuote++;
          console.log(`[InitialDataFetch] ${transaction.ticker} no quote available, skipping`);
          continue;
        }

        // Fetch company profile, market cap, and news
        const stockData = await finnhubService.getBatchStockData([transaction.ticker]);
        const data = stockData.get(transaction.ticker);
        
        // Apply market cap filter (must be > $500M)
        const marketCapValue = data?.marketCap ? data.marketCap * 1_000_000 : 0;
        if (marketCapValue < 500_000_000) {
          filteredMarketCap++;
          console.log(`[InitialDataFetch] ${transaction.ticker} market cap too low: $${(marketCapValue / 1_000_000).toFixed(1)}M, skipping`);
          continue;
        }
        
        // Apply options deal filter ONLY to BUY transactions (insider price should be >= 15% of current price)
        if (transaction.recommendation === "buy") {
          const insiderPriceNum = transaction.price;
          if (insiderPriceNum < quote.currentPrice * 0.15) {
            filteredOptionsDeals++;
            console.log(`[InitialDataFetch] ${transaction.ticker} likely options deal (insider: $${insiderPriceNum.toFixed(2)} < 15% of market: $${quote.currentPrice.toFixed(2)}), skipping`);
            continue;
          }
        }

        // Create stock recommendation with complete information (per-user tenant isolation)
        await storage.createStock({
          userId, // Per-user tenant isolation - this stock belongs to this user only
          ticker: transaction.ticker,
          companyName: transaction.companyName || transaction.ticker,
          currentPrice: quote.currentPrice.toString(),
          previousClose: quote.previousClose?.toString() || quote.currentPrice.toString(),
          insiderPrice: transaction.price.toString(),
          insiderQuantity: transaction.quantity,
          insiderTradeDate: transaction.filingDate,
          insiderName: transaction.insiderName,
          insiderTitle: transaction.insiderTitle,
          recommendation: transaction.recommendation, // Use actual recommendation (buy or sell)
          source: "openinsider",
          confidenceScore: transaction.confidence || 75,
          peRatio: null,
          marketCap: data?.marketCap ? `$${Math.round(data.marketCap)}M` : null,
          description: data?.companyInfo?.description || null,
          industry: data?.companyInfo?.industry || null,
          country: data?.companyInfo?.country || null,
          webUrl: data?.companyInfo?.webUrl || null,
          ipo: data?.companyInfo?.ipo || null,
          news: data?.news || [],
          insiderSentimentMspr: data?.insiderSentiment?.mspr.toString() || null,
          insiderSentimentChange: data?.insiderSentiment?.change.toString() || null,
          priceHistory: [],
        });

        createdCount++;
      } catch (err) {
        console.error(`[InitialDataFetch] Error processing ${transaction.ticker}:`, err);
      }
    }

    console.log(`\n[InitialDataFetch] ======= STAGE 2: Backend Post-Processing =======`);
    console.log(`[InitialDataFetch] Starting with: ${transactions.length} transactions`);
    console.log(`[InitialDataFetch]   ⊗ Already exists: ${filteredAlreadyExists}`);
    console.log(`[InitialDataFetch]   ⊗ Market cap < $500M: ${filteredMarketCap}`);
    console.log(`[InitialDataFetch]   ⊗ Options deals (< 15%): ${filteredOptionsDeals}`);
    console.log(`[InitialDataFetch]   ⊗ No quote: ${filteredNoQuote}`);
    console.log(`[InitialDataFetch] → Total Stage 2 filtered: ${filteredAlreadyExists + filteredMarketCap + filteredOptionsDeals + filteredNoQuote}`);
    console.log(`[InitialDataFetch] ===================================================`);
    console.log(`\n[InitialDataFetch] ✓ Successfully created ${createdCount} new recommendations for user ${userId}\n`);
    
    // Mark user as having initial data fetched
    await storage.markUserInitialDataFetched(userId);
    
  } catch (error) {
    console.error(`[InitialDataFetch] Error fetching initial data for user ${userId}:`, error);
    // Don't throw - this is a background operation
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Create admin middleware with storage dependency
  const requireAdmin = createRequireAdmin(storage);
  
  // Feature flags endpoint
  app.get("/api/feature-flags", async (req, res) => {
    res.json({
      enableTelegram: process.env.ENABLE_TELEGRAM === "true",
    });
  });

  // Version endpoint
  app.get("/api/version", async (req, res) => {
    const packageJson = await import("../package.json", { assert: { type: "json" } });
    res.json({
      version: packageJson.default.version,
      name: packageJson.default.name,
    });
  });

  // User authentication routes
  app.get("/api/auth/current-user", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.json({ user: null });
      }
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        req.session.userId = undefined;
        return res.json({ user: null });
      }
      res.json({ user });
    } catch (error) {
      res.status(500).json({ error: "Failed to get current user" });
    }
  });

  // Trial status endpoint
  app.get("/api/auth/trial-status", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (user.subscriptionStatus !== "trial") {
        return res.json({
          status: user.subscriptionStatus,
          isTrialActive: false,
          daysRemaining: 0,
          showPaymentReminder: false,
        });
      }

      const now = new Date();
      const trialEnd = user.trialEndsAt ? new Date(user.trialEndsAt) : null;
      
      if (!trialEnd) {
        return res.json({
          status: "trial",
          isTrialActive: true,
          daysRemaining: 0,
          showPaymentReminder: true,
        });
      }

      const msRemaining = trialEnd.getTime() - now.getTime();
      const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));
      const isTrialActive = msRemaining > 0; // Active if any time remains
      const showPaymentReminder = daysRemaining <= 16 && isTrialActive; // Show reminder at day 14 (16 days remaining) but only if still active

      res.json({
        status: "trial",
        isTrialActive,
        daysRemaining,
        trialEndsAt: trialEnd.toISOString(),
        showPaymentReminder,
        isExpired: !isTrialActive && daysRemaining === 0,
      });
    } catch (error) {
      console.error("Trial status error:", error);
      res.status(500).json({ error: "Failed to get trial status" });
    }
  });

  app.get("/api/user/progress", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const progress = await storage.getUserProgress(req.session.userId);
      res.json(progress);
    } catch (error) {
      console.error("Get user progress error:", error);
      res.status(500).json({ error: "Failed to get user progress" });
    }
  });

  app.post("/api/user/complete-onboarding", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      await storage.completeUserOnboarding(req.session.userId);
      res.json({ message: "Onboarding completed successfully" });
    } catch (error) {
      console.error("Complete onboarding error:", error);
      res.status(500).json({ error: "Failed to complete onboarding" });
    }
  });

  app.post("/api/user/tutorial/:id/complete", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const tutorialId = req.params.id;
      await storage.completeTutorial(req.session.userId, tutorialId);
      res.json({ message: "Tutorial marked as completed" });
    } catch (error) {
      console.error("Complete tutorial error:", error);
      res.status(500).json({ error: "Failed to complete tutorial" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // Verify password
      const bcrypt = await import("bcryptjs");
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // Check subscription status - allow trial and active users
      if (user.subscriptionStatus === "trial") {
        // Only check trial expiration for users with a trialEndsAt date
        if (user.trialEndsAt) {
          const now = new Date();
          const trialEnd = new Date(user.trialEndsAt);
          
          if (now > trialEnd) {
            // Trial expired - update status and block login
            await storage.updateUser(user.id, { subscriptionStatus: "expired" });
            return res.status(403).json({ 
              error: "Your free trial has expired. Please subscribe to continue.",
              subscriptionStatus: "expired",
              trialExpired: true
            });
          }
        }
        // Trial still active or no expiration date - allow login
      } else if (user.subscriptionStatus === "active") {
        // Active subscription - allow login
      } else {
        // Inactive, cancelled, or expired - block login
        return res.status(403).json({ 
          error: user.subscriptionStatus === "expired" 
            ? "Your free trial has expired. Please subscribe to continue."
            : "Subscription required",
          subscriptionStatus: user.subscriptionStatus,
          trialExpired: user.subscriptionStatus === "expired"
        });
      }

      req.session.userId = user.id;
      
      // Explicitly save session before sending response to ensure cookie is set
      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ error: "Failed to save session" });
        }
        
        res.json({ 
          user: {
            ...user,
            passwordHash: undefined, // Don't send password hash to client
          },
          subscriptionStatus: user.subscriptionStatus
        });
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Failed to login" });
    }
  });

  app.post("/api/auth/signup", async (req, res) => {
    try {
      const { name, email, password } = req.body;
      if (!name || !email || !password) {
        return res.status(400).json({ error: "Name, email, and password are required" });
      }

      if (password.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters" });
      }

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "Email already in use" });
      }

      // Hash password
      const bcrypt = await import("bcryptjs");
      const passwordHash = await bcrypt.hash(password, 10);

      const avatarColors = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];
      const avatarColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];

      // Set up 30-day trial
      const now = new Date();
      const trialEndsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

      const newUser = await storage.createUser({
        name,
        email,
        passwordHash,
        avatarColor,
        subscriptionStatus: "trial", // Start with trial
        subscriptionStartDate: now,
        trialEndsAt,
      });

      // Create admin notification for super admins
      try {
        await storage.createAdminNotification({
          type: "user_signup",
          title: "New User Signup",
          message: `${name} (${email}) has signed up for a 30-day trial`,
          metadata: {
            userId: newUser.id,
            userName: name,
            userEmail: email,
          },
          isRead: false,
        });
      } catch (notifError) {
        // Don't fail signup if notification creation fails
        console.error("Failed to create admin notification for new signup:", notifError);
      }

      // Log them in immediately
      req.session.userId = newUser.id;
      
      // Explicitly save session before sending response
      req.session.save((err) => {
        if (err) {
          console.error("Session save error during signup:", err);
          return res.status(500).json({ error: "Failed to save session" });
        }
        
        res.json({ 
          user: {
            ...newUser,
            passwordHash: undefined, // Don't send password hash to client
          }
        });
      });
    } catch (error) {
      console.error("Signup error:", error);
      res.status(500).json({ error: "Failed to create account" });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    try {
      req.session.destroy((err) => {
        if (err) {
          return res.status(500).json({ error: "Failed to logout" });
        }
        res.json({ success: true });
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to logout" });
    }
  });

  app.post("/api/auth/mark-onboarding-complete", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      await storage.markUserHasSeenOnboarding(req.session.userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Mark onboarding complete error:", error);
      res.status(500).json({ error: "Failed to mark onboarding as complete" });
    }
  });

  // PayPal Webhook Handler - PRODUCTION READY
  app.post("/api/webhooks/paypal", async (req, res) => {
    try {
      const webhookId = process.env.PAYPAL_WEBHOOK_ID;
      
      if (!webhookId) {
        console.error("[PayPal Webhook] PAYPAL_WEBHOOK_ID not configured");
        return res.status(500).json({ error: "Webhook not configured" });
      }

      // Step 1: Verify PayPal signature
      const isValid = await verifyPayPalWebhook({
        webhookId,
        headers: {
          'paypal-transmission-sig': req.headers['paypal-transmission-sig'] as string,
          'paypal-cert-url': req.headers['paypal-cert-url'] as string,
          'paypal-transmission-id': req.headers['paypal-transmission-id'] as string,
          'paypal-transmission-time': req.headers['paypal-transmission-time'] as string,
          'paypal-auth-algo': req.headers['paypal-auth-algo'] as string,
        },
        body: req.body,
      });
      
      if (!isValid) {
        console.error("[PayPal Webhook] Invalid signature - potential security threat");
        return res.status(401).json({ error: "Invalid webhook signature" });
      }

      const { event_type, resource } = req.body;
      console.log(`[PayPal Webhook] Verified event: ${event_type}`);
      
      // Step 2: Process verified events
      if (event_type === "BILLING.SUBSCRIPTION.ACTIVATED") {
        const { custom_id } = resource;
        const subscriptionId = resource.id;

        const user = await storage.getUserByEmail(custom_id);
        if (user) {
          // Transition from trial to active subscription
          const now = new Date();
          
          // Calculate bonus extension if user was on trial
          let bonusDays = 0;
          if (user.subscriptionStatus === "trial" && user.trialEndsAt) {
            const trialEnd = new Date(user.trialEndsAt);
            const daysRemaining = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
            // Give remaining trial days + 14 bonus days
            bonusDays = daysRemaining + 14;
            console.log(`[PayPal Webhook] User had ${daysRemaining} trial days left, granting ${bonusDays} bonus days`);
          }

          // Set up ongoing paid subscription (PayPal billing handles renewal)
          // subscriptionEndDate is just for the initial bonus period, actual billing continues via PayPal
          const subscriptionEndDate = bonusDays > 0 
            ? new Date(now.getTime() + bonusDays * 24 * 60 * 60 * 1000)
            : undefined;

          const updateData: any = {
            subscriptionStatus: "active",
            paypalSubscriptionId: subscriptionId,
            subscriptionStartDate: now,
            subscriptionEndDate: subscriptionEndDate || null,
            trialEndsAt: null, // Clear trial end date - this is now a paid subscription
          };

          await storage.updateUser(user.id, updateData);
          console.log(`[PayPal Webhook] ✅ Activated paid subscription for ${custom_id}${bonusDays > 0 ? ` with ${bonusDays} bonus days` : ''}`);

          if (!user.initialDataFetched) {
            fetchInitialDataForUser(user.id).catch(err => {
              console.error(`[SubscriptionActivation] Failed for user ${user.id}:`, err);
            });
          }
          
          console.log(`[PayPal Webhook] ✅ Activated subscription for ${custom_id}`);
        } else {
          console.warn(`[PayPal Webhook] User not found for email: ${custom_id}`);
        }
      }

      if (event_type === "BILLING.SUBSCRIPTION.CANCELLED") {
        const { custom_id } = resource;
        const user = await storage.getUserByEmail(custom_id);
        if (user) {
          await storage.updateUser(user.id, {
            subscriptionStatus: "cancelled",
            subscriptionEndDate: new Date(),
          });
          console.log(`[PayPal Webhook] ❌ Cancelled subscription for ${custom_id}`);
        }
      }

      res.json({ received: true });
    } catch (error) {
      console.error("[PayPal Webhook] Processing error:", error);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  });

  // ADMIN ONLY: Manual subscription activation for testing
  // WARNING: This endpoint should be removed or protected with admin authentication in production
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
  // WARNING: This endpoint should be protected in production
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

      const updatedUser = await storage.updateUser(user.id, {
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

      const archivedUser = await storage.archiveUser(user.id, req.session.userId!);

      res.json({
        success: true,
        message: "User archived",
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

      const deleted = await storage.deleteUser(user.id);

      res.json({
        success: deleted,
        message: deleted ? "User permanently deleted" : "Failed to delete user",
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

  app.get("/api/users", async (req, res) => {
    try {
      // Only admin users can access the full user list
      if (!req.session.userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const currentUser = await storage.getUser(req.session.userId);
      if (!currentUser?.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      // Support includeArchived query parameter
      const includeArchived = req.query.includeArchived === "true";

      // Only return user info, not password hashes
      const users = await storage.getUsers({ includeArchived });
      const sanitizedUsers = users.map(user => ({
        ...user,
        passwordHash: undefined,
      }));
      res.json(sanitizedUsers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.patch("/api/users/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { name, email, showAllOpportunities } = req.body;

      if (!req.session.userId || req.session.userId !== id) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      // Build update object - only include provided fields
      const updateData: any = {};
      
      if (name !== undefined) {
        if (!name) {
          return res.status(400).json({ error: "Name cannot be empty" });
        }
        updateData.name = name;
      }
      
      if (email !== undefined) {
        if (!email) {
          return res.status(400).json({ error: "Email cannot be empty" });
        }
        
        const existingUser = await storage.getUserByEmail(email);
        if (existingUser && existingUser.id !== id) {
          return res.status(400).json({ error: "Email already in use" });
        }
        updateData.email = email;
      }
      
      if (showAllOpportunities !== undefined) {
        updateData.showAllOpportunities = Boolean(showAllOpportunities);
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: "No fields to update" });
      }

      const updatedUser = await storage.updateUser(id, updateData);
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({ user: updatedUser });
    } catch (error) {
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  app.delete("/api/users/:id", async (req, res) => {
    try {
      const { id } = req.params;

      if (!req.session.userId || req.session.userId !== id) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      await storage.deleteUser(id);
      req.session.destroy((err) => {
        if (err) {
          console.error("Failed to destroy session:", err);
        }
      });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete user" });
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

  // Stock routes - Per-user tenant isolation: all stocks are user-specific
  app.get("/api/stocks", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const { status } = req.query;
      
      // For user-specific statuses like "rejected"
      if (status === "rejected") {
        const stocks = await storage.getStocksByUserStatus(req.session.userId, status as string);
        return res.json(stocks);
      }
      
      // All stocks are user-specific now
      const stocks = await storage.getStocks(req.session.userId);
      res.json(stocks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch stocks" });
    }
  });

  // Get stocks with user-specific statuses and AI analysis job progress
  app.get("/api/stocks/with-user-status", async (req, res) => {
    try {
      if (!req.session.userId) {
        console.log("[with-user-status] No userId in session");
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      console.log(`[with-user-status] Fetching stocks for user ${req.session.userId}`);
      
      // Get user to determine stock limit (500 during onboarding, otherwise user preference)
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Use 500 stocks during onboarding, otherwise use user's preference (default 100)
      const stockLimit = !user.hasSeenOnboarding ? 500 : (user.stockLimit || 100);
      console.log(`[with-user-status] User onboarding status: ${user.hasSeenOnboarding}, limit: ${stockLimit}`);
      
      // Use the new storage method that includes user status and latest active job
      const stocksWithStatus = await storage.getStocksWithUserStatus(req.session.userId, stockLimit);
      
      console.log(`[with-user-status] Found ${stocksWithStatus.length} stocks`);
      console.log(`[with-user-status] Pending stocks: ${stocksWithStatus.filter(s => s.userStatus === 'pending').length}`);
      console.log(`[with-user-status] Rejected stocks: ${stocksWithStatus.filter(s => s.userStatus === 'rejected').length}`);
      
      res.json(stocksWithStatus);
    } catch (error: any) {
      console.error("[with-user-status] ERROR:");
      console.error("Message:", error?.message);
      console.error("Stack:", error?.stack);
      console.error("Full error:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
      res.status(500).json({ 
        error: "Failed to fetch stocks with user status",
        details: error?.message || "Unknown error"
      });
    }
  });

  // Get top signal opportunities (high integrated score stocks)
  app.get("/api/stocks/top-signals", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      // Get user's followed stocks to filter them out
      const followedStocks = await storage.getUserFollowedStocks(req.session.userId);
      const followedTickers = new Set(followedStocks.map(fs => fs.ticker.toUpperCase()));
      
      // Get stocks with user status (includes analysis data)
      const stocksWithStatus = await storage.getStocksWithUserStatus(req.session.userId, 100);
      
      // Filter for high signals (score >= 70) and not already followed
      const highSignals = stocksWithStatus
        .filter(stock => {
          const hasHighScore = (stock.integratedScore ?? 0) >= 70;
          const notFollowed = !followedTickers.has(stock.ticker.toUpperCase());
          const hasCompletedAnalysis = stock.jobStatus === 'completed';
          return hasHighScore && notFollowed && hasCompletedAnalysis;
        })
        .slice(0, 12) // Limit to top 12
        .map(stock => ({
          ticker: stock.ticker,
          companyName: stock.companyName,
          currentPrice: stock.currentPrice,
          priceChange: stock.priceChange,
          priceChangePercent: stock.priceChangePercent,
          insiderAction: stock.recommendation, // BUY or SELL
          aiStance: stock.aiStance,
          integratedScore: stock.integratedScore,
          isFollowing: false,
        }));
      
      res.json(highSignals);
    } catch (error) {
      console.error("Get top signals error:", error);
      res.status(500).json({ error: "Failed to fetch top signals" });
    }
  });

  app.get("/api/stocks/:ticker", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const stock = await storage.getStock(req.session.userId, req.params.ticker);
      if (!stock) {
        return res.status(404).json({ error: "Stock not found" });
      }
      res.json(stock);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch stock" });
    }
  });

  app.post("/api/stocks", async (req, res) => {
    try {
      const validatedData = insertStockSchema.parse(req.body);
      const stock = await storage.createStock(validatedData);
      res.status(201).json(stock);
    } catch (error) {
      res.status(400).json({ error: "Invalid stock data" });
    }
  });

  app.patch("/api/stocks/:ticker", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const stock = await storage.updateStock(req.session.userId, req.params.ticker, req.body);
      if (!stock) {
        return res.status(404).json({ error: "Stock not found" });
      }
      res.json(stock);
    } catch (error) {
      res.status(500).json({ error: "Failed to update stock" });
    }
  });

  app.delete("/api/stocks/:ticker", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const deleted = await storage.deleteStock(req.session.userId, req.params.ticker);
      if (!deleted) {
        return res.status(404).json({ error: "Stock not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete stock" });
    }
  });

  // Diagnostic endpoint: Check candlestick data status (now in separate table)
  app.get("/api/stocks/diagnostics/candlesticks", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const stocks = await storage.getStocks(req.session.userId);
      const pendingStocks = stocks.filter(s => s.recommendationStatus === "pending");
      
      // Note: Candlesticks are now in a separate shared table (stockCandlesticks)
      // This endpoint now shows stock counts only
      const diagnostics = {
        totalStocks: stocks.length,
        pendingStocks: pendingStocks.length,
        note: "Candlesticks are now stored in shared stockCandlesticks table, accessible via /api/stocks/:ticker/candlesticks",
      };
      
      res.json(diagnostics);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch diagnostics", details: error.message });
    }
  });

  // Refresh stock data with real-time market prices
  app.post("/api/stocks/:ticker/refresh", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const ticker = req.params.ticker;
      const stock = await storage.getStock(req.session.userId, ticker);
      if (!stock) {
        return res.status(404).json({ error: "Stock not found" });
      }

      console.log(`[StockAPI] Refreshing market data for ${ticker}...`);
      const marketData = await stockService.getComprehensiveData(ticker);

      const updatedStock = await storage.updateStock(req.session.userId, ticker, {
        currentPrice: marketData.currentPrice,
        previousClose: marketData.previousClose,
        marketCap: marketData.marketCap,
        peRatio: marketData.peRatio,
        priceHistory: marketData.priceHistory,
        companyName: marketData.companyName,
      });

      console.log(`[StockAPI] ✅ Refreshed ${ticker}: $${marketData.currentPrice} (${marketData.marketCap} market cap)`);
      res.json(updatedStock);
    } catch (error: any) {
      console.error(`[StockAPI] Error refreshing stock data:`, error.message);
      res.status(500).json({ error: error.message || "Failed to refresh stock data" });
    }
  });

  // Refresh all pending stocks with market data
  app.post("/api/stocks/refresh-all", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const stocks = await storage.getStocks(req.session.userId);
      const pendingStocks = stocks.filter(s => s.recommendationStatus === "pending");

      console.log(`[StockAPI] Refreshing ${pendingStocks.length} pending stocks...`);
      console.log(`[StockAPI] Note: Each stock takes ~36 seconds (3 API calls with 12-second delays)`);
      console.log(`[StockAPI] Estimated total time: ${Math.ceil(pendingStocks.length * 36 / 60)} minutes`);
      
      const results = {
        success: [] as string[],
        failed: [] as { ticker: string; error: string }[],
      };

      // Refresh stocks sequentially - getComprehensiveData already handles rate limiting
      for (const stock of pendingStocks) {
        try {
          const marketData = await stockService.getComprehensiveData(stock.ticker);
          await storage.updateStock(req.session.userId, stock.ticker, {
            currentPrice: marketData.currentPrice,
            previousClose: marketData.previousClose,
            marketCap: marketData.marketCap,
            peRatio: marketData.peRatio,
            priceHistory: marketData.priceHistory,
            companyName: marketData.companyName,
          });
          results.success.push(stock.ticker);
          console.log(`[StockAPI] ✅ ${stock.ticker}: $${marketData.currentPrice} | Progress: ${results.success.length}/${pendingStocks.length}`);
        } catch (error: any) {
          results.failed.push({ ticker: stock.ticker, error: error.message });
          console.error(`[StockAPI] ❌ ${stock.ticker}: ${error.message}`);
        }
      }

      res.json({
        total: pendingStocks.length,
        success: results.success.length,
        failed: results.failed.length,
        results,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to refresh stocks" });
    }
  });

  // Recommendation approval routes
  app.post("/api/stocks/:ticker/approve", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const stock = await storage.getStock(req.session.userId, req.params.ticker);
      if (!stock) {
        return res.status(404).json({ error: "Stock not found" });
      }

      // Get price and quantity from request body
      const { price, quantity } = req.body;
      
      // Validate inputs with proper numeric coercion
      const purchasePrice = Number(price);
      const purchaseQuantity = Number(quantity);
      
      if (!isFinite(purchasePrice) || purchasePrice <= 0) {
        return res.status(400).json({ error: "Invalid purchase price - must be a positive number" });
      }
      
      if (!isFinite(purchaseQuantity) || purchaseQuantity <= 0 || !Number.isInteger(purchaseQuantity)) {
        return res.status(400).json({ error: "Invalid quantity - must be a positive whole number" });
      }
      
      // Update user-specific stock status
      await storage.ensureUserStockStatus(req.session.userId, req.params.ticker);
      await storage.updateUserStockStatus(req.session.userId, req.params.ticker, {
        status: "approved",
        approvedAt: new Date()
      });

      // Check if IBKR is configured and connected
      const ibkrConfig = await storage.getIbkrConfig();
      let ibkrOrderId: string | undefined;
      let broker = "manual";

      if (ibkrConfig && ibkrConfig.isConnected && ibkrConfig.accountId) {
        try {
          // Execute real trade via IBKR
          console.log(`[IBKR] Executing BUY order for ${purchaseQuantity} shares of ${stock.ticker}`);
          const ibkr = getIbkrService(ibkrConfig.gatewayUrl);
          const orderResult = await ibkr.buyStock(ibkrConfig.accountId, stock.ticker, purchaseQuantity);
          
          ibkrOrderId = orderResult.orderId;
          broker = "ibkr";
          console.log(`[IBKR] ✅ Order placed successfully: ${orderResult.orderId}`);
        } catch (ibkrError: any) {
          console.error("[IBKR] Trade execution failed:", ibkrError.message);
          // Fall back to manual trade if IBKR fails
          console.log("[IBKR] Falling back to manual trade recording");
        }
      }

      // Add initial price point to history when purchasing
      const now = new Date();
      const initialPricePoint = {
        date: now.toISOString().split('T')[0],
        price: purchasePrice,
      };

      // Get existing price history or initialize empty array
      const priceHistory = stock.priceHistory || [];
      
      // Only add if this date doesn't already exist in history
      const dateExists = priceHistory.some(p => p.date === initialPricePoint.date);
      if (!dateExists) {
        priceHistory.push(initialPricePoint);
        
        // Update stock with new price history
        await storage.updateStock(req.session.userId, stock.ticker, {
          priceHistory,
        });
      }

      const trade = {
        userId: req.session.userId,
        ticker: stock.ticker,
        type: "buy" as const,
        quantity: purchaseQuantity,
        price: purchasePrice.toFixed(2),
        total: (purchasePrice * purchaseQuantity).toFixed(2),
        status: "completed" as const,
        broker,
        ibkrOrderId,
      };
      await storage.createTrade(trade);

      res.json({ 
        status: "approved", 
        stock, 
        trade,
        broker,
        message: broker === "ibkr" ? "Trade executed via IBKR" : "Trade recorded manually"
      });
    } catch (error) {
      console.error("Approve recommendation error:", error);
      res.status(500).json({ error: "Failed to approve recommendation" });
    }
  });

  app.post("/api/stocks/:ticker/reject", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const ticker = req.params.ticker.toUpperCase();
      
      // Cancel any active analysis jobs for this ticker
      await storage.cancelAnalysisJobsForTicker(ticker);
      console.log(`[Reject] Cancelled any active analysis jobs for ${ticker}`);

      // Reject ALL transactions for this ticker (handles multiple transactions per ticker)
      const result = await storage.rejectTickerForUser(req.session.userId, ticker);
      
      console.log(`[Reject] Rejected ticker ${ticker} - updated ${result.stocksUpdated} stock entries`);

      res.json({ 
        status: "rejected", 
        ticker,
        stocksUpdated: result.stocksUpdated,
        message: `Rejected ${result.stocksUpdated} transaction(s) for ${ticker}`
      });
    } catch (error) {
      console.error(`[Reject] Error rejecting ${req.params.ticker}:`, error);
      res.status(500).json({ error: "Failed to reject recommendation" });
    }
  });

  app.patch("/api/stocks/:ticker/unreject", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      console.log(`[Unreject] Starting unreject for ${req.params.ticker} by user ${req.session.userId}`);

      // Only update user-specific status (not global stock status)
      await storage.ensureUserStockStatus(req.session.userId, req.params.ticker);
      const updatedUserStatus = await storage.updateUserStockStatus(req.session.userId, req.params.ticker, {
        status: "pending",
        rejectedAt: null
      });

      console.log(`[Unreject] Successfully restored ${req.params.ticker} to pending status for user ${req.session.userId}`);
      res.json({ status: "pending", userStatus: updatedUserStatus });
    } catch (error) {
      console.error("Unreject stock error:", error);
      res.status(500).json({ error: "Failed to unreject stock" });
    }
  });

  app.post("/api/stocks/:ticker/simulate", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const stock = await storage.getStock(req.session.userId, req.params.ticker);
      if (!stock) {
        return res.status(404).json({ error: "Stock not found" });
      }

      const simulationCapital = 1000;
      
      // Use insider trade date if available, otherwise use today
      const purchaseDate = stock.insiderTradeDate 
        ? new Date(stock.insiderTradeDate)
        : new Date();
      const purchaseDateStr = purchaseDate.toISOString().split('T')[0];
      
      // Ensure price history is available - fetch if needed
      let priceHistory = stock.priceHistory || [];
      
      if (priceHistory.length === 0 && stock.insiderTradeDate) {
        // Fall back to fetching if no candlesticks available
        console.log(`[Simulation] Fetching price history for ${stock.ticker} from ${stock.insiderTradeDate} to today`);
        try {
          const fetchedPrices = await backtestService.fetchHistoricalPrices(
            stock.ticker,
            new Date(stock.insiderTradeDate),
            new Date()
          );
          
          if (fetchedPrices.length > 0) {
            priceHistory = fetchedPrices.map(p => ({
              date: p.date,
              price: p.close
            }));
            
            await storage.updateStock(req.session.userId, stock.ticker, { priceHistory });
            console.log(`[Simulation] Fetched ${priceHistory.length} price points for ${stock.ticker}`);
          }
        } catch (error) {
          console.error(`[Simulation] Failed to fetch price history for ${stock.ticker}:`, error);
        }
      }
      
      // Try to find historical price for the purchase date
      const historicalPricePoint = priceHistory.find(p => p.date === purchaseDateStr);
      
      // Use historical price if available, otherwise current price
      const purchasePrice = historicalPricePoint 
        ? historicalPricePoint.price 
        : parseFloat(stock.currentPrice);
      
      const quantity = Math.floor(simulationCapital / purchasePrice);
      const total = purchasePrice * quantity;

      console.log(`[Simulation] Creating simulation for ${stock.ticker}:`);
      console.log(`[Simulation] - Purchase date: ${purchaseDateStr} (${stock.insiderTradeDate ? 'insider trade date' : 'today'})`);
      console.log(`[Simulation] - Purchase price: $${purchasePrice.toFixed(2)} (${historicalPricePoint ? 'historical' : 'current'})`);
      console.log(`[Simulation] - Quantity: ${quantity} shares`);

      // Add initial price point to history if it doesn't exist
      if (!historicalPricePoint) {
        priceHistory.push({
          date: purchaseDateStr,
          price: purchasePrice,
        });
        
        // Update stock with new price history
        await storage.updateStock(req.session.userId, stock.ticker, {
          priceHistory,
        });
      }

      // Check if simulated holding already exists
      const existingHolding = await storage.getPortfolioHoldingByTicker(req.session.userId, stock.ticker, true);
      if (existingHolding) {
        return res.status(400).json({ error: "Simulated holding already exists for this stock" });
      }

      // Create simulated trade with the purchase date
      const trade = {
        userId: req.session.userId,
        ticker: stock.ticker,
        type: "buy" as const,
        quantity,
        price: purchasePrice.toFixed(2),
        total: total.toFixed(2),
        status: "completed" as const,
        broker: "simulation",
        isSimulated: true,
        executedAt: purchaseDate, // Set execution date to purchase date
      };
      const createdTrade = await storage.createTrade(trade);

      // Get the created holding
      const holding = await storage.getPortfolioHoldingByTicker(req.session.userId, stock.ticker, true);

      // Update user-specific stock status to approved (simulated)
      await storage.ensureUserStockStatus(req.session.userId, req.params.ticker);
      await storage.updateUserStockStatus(req.session.userId, req.params.ticker, {
        status: "approved",
        approvedAt: new Date()
      });

      res.json({ 
        status: "simulated", 
        stock, 
        trade: createdTrade,
        holding,
        message: stock.insiderTradeDate
          ? `Simulation created: ${quantity} shares purchased on ${purchaseDateStr} at $${purchasePrice.toFixed(2)} = $${total.toFixed(2)}`
          : `Simulation created: ${quantity} shares at $${purchasePrice.toFixed(2)} = $${total.toFixed(2)}`
      });
    } catch (error) {
      console.error("Simulate recommendation error:", error);
      res.status(500).json({ error: "Failed to create simulation" });
    }
  });

  app.delete("/api/stocks/:ticker/simulate", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const { ticker } = req.params;
      const deletedHoldings = await storage.deleteSimulatedHoldingsByTicker(req.session.userId, ticker);
      const deletedTrades = await storage.deleteSimulatedTradesByTicker(req.session.userId, ticker);
      
      res.json({ 
        message: `Removed simulated position for ${ticker} (${deletedHoldings} holding(s), ${deletedTrades} trade(s))`,
        deletedHoldings,
        deletedTrades
      });
    } catch (error) {
      console.error("Delete simulation error:", error);
      res.status(500).json({ error: "Failed to delete simulation" });
    }
  });

  // Bulk operation endpoints
  const bulkTickersSchema = z.object({
    tickers: z.array(z.string()).min(1, "At least one ticker is required").max(100, "Maximum 100 tickers allowed")
  });

  app.post("/api/stocks/bulk-approve", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const validationResult = bulkTickersSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: "Invalid request", details: validationResult.error.errors });
      }
      const { tickers } = validationResult.data;

      let success = 0;
      const errors: string[] = [];

      for (const ticker of tickers) {
        try {
          const stock = await storage.getStock(req.session.userId, ticker);
          if (!stock) {
            errors.push(`${ticker}: not found`);
            continue;
          }

          // Use current price and default quantity of 10
          const purchasePrice = parseFloat(stock.currentPrice);
          const purchaseQuantity = 10;

          await storage.updateStock(req.session.userId, ticker, {
            recommendationStatus: "approved"
          });

          // Create holding
          const existingHolding = await storage.getPortfolioHoldingByTicker(req.session.userId, ticker, false);
          if (existingHolding) {
            const currentAvg = parseFloat(existingHolding.averagePurchasePrice);
            const newAvg = ((currentAvg * existingHolding.quantity + purchasePrice * purchaseQuantity) / (existingHolding.quantity + purchaseQuantity)).toFixed(2);
            await storage.updatePortfolioHolding(existingHolding.id, {
              quantity: existingHolding.quantity + purchaseQuantity,
              averagePurchasePrice: newAvg
            });
          } else {
            await storage.createPortfolioHolding({
              userId: req.session.userId,
              ticker,
              quantity: purchaseQuantity,
              averagePurchasePrice: purchasePrice.toFixed(2),
            });
          }

          // Create trade
          await storage.createTrade({
            userId: req.session.userId,
            ticker,
            type: "buy",
            quantity: purchaseQuantity,
            price: purchasePrice.toFixed(2),
            total: (purchasePrice * purchaseQuantity).toFixed(2),
            status: "completed",
            broker: "manual",
          });

          success++;
        } catch (err) {
          errors.push(`${ticker}: ${err instanceof Error ? err.message : 'unknown error'}`);
        }
      }

      res.json({ 
        success, 
        failed: errors.length,
        errors: errors.length > 0 ? errors : undefined,
        message: `Approved ${success}/${tickers.length} stocks`
      });
    } catch (error) {
      console.error("Bulk approve error:", error);
      res.status(500).json({ error: "Failed to bulk approve" });
    }
  });

  app.post("/api/stocks/bulk-reject", async (req, res) => {
    try {
      console.log("[BULK REJECT] Endpoint called. Session userId:", req.session.userId);
      console.log("[BULK REJECT] Request body:", JSON.stringify(req.body));
      
      if (!req.session.userId) {
        console.log("[BULK REJECT] No userId in session - returning 401");
        return res.status(401).json({ error: "Not authenticated" });
      }

      const validationResult = bulkTickersSchema.safeParse(req.body);
      if (!validationResult.success) {
        console.log("[BULK REJECT] Validation failed:", validationResult.error.errors);
        return res.status(400).json({ error: "Invalid request", details: validationResult.error.errors });
      }
      const { tickers } = validationResult.data;
      console.log("[BULK REJECT] Processing tickers:", tickers);

      let success = 0;
      const errors: string[] = [];

      for (const ticker of tickers) {
        try {
          console.log(`[BULK REJECT] Processing ticker: ${ticker}`);
          
          // Cancel any active analysis jobs for this ticker
          await storage.cancelAnalysisJobsForTicker(ticker);
          
          // Reject ALL transactions for this ticker (handles multiple transactions per ticker)
          const result = await storage.rejectTickerForUser(req.session.userId, ticker);
          console.log(`[BULK REJECT] Rejected ${ticker} - updated ${result.stocksUpdated} stock entries`);

          success++;
        } catch (err) {
          console.log(`[BULK REJECT] Error processing ${ticker}:`, err);
          errors.push(`${ticker}: ${err instanceof Error ? err.message : 'unknown error'}`);
        }
      }

      console.log(`[BULK REJECT] Complete. Success: ${success}, Failed: ${errors.length}`);
      res.json({ 
        success, 
        failed: errors.length,
        errors: errors.length > 0 ? errors : undefined,
        message: `Rejected ${success}/${tickers.length} recommendations`
      });
    } catch (error) {
      console.error("[BULK REJECT] Fatal error:", error);
      res.status(500).json({ error: "Failed to bulk reject" });
    }
  });

  app.post("/api/stocks/bulk-refresh", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const validationResult = bulkTickersSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: "Invalid request", details: validationResult.error.errors });
      }
      const { tickers } = validationResult.data;

      let success = 0;
      const errors: string[] = [];

      for (const ticker of tickers) {
        try {
          const stock = await storage.getStock(req.session.userId, ticker);
          if (!stock) {
            errors.push(`${ticker}: not found`);
            continue;
          }

          // Fetch latest quote
          await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit: 1 req/sec
          const quote = await finnhubService.getQuote(ticker);
          if (quote && quote.currentPrice) {
            await storage.updateStock(req.session.userId, ticker, {
              currentPrice: quote.currentPrice.toFixed(2),
              previousClose: quote.previousClose?.toFixed(2) || stock.previousClose,
            });
            success++;
          } else {
            errors.push(`${ticker}: no quote data`);
          }
        } catch (err) {
          errors.push(`${ticker}: ${err instanceof Error ? err.message : 'unknown error'}`);
        }
      }

      res.json({ 
        success, 
        failed: errors.length,
        errors: errors.length > 0 ? errors : undefined,
        message: `Refreshed ${success}/${tickers.length} stocks`
      });
    } catch (error) {
      console.error("Bulk refresh error:", error);
      res.status(500).json({ error: "Failed to bulk refresh" });
    }
  });

  app.post("/api/stocks/bulk-analyze", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const validationResult = bulkTickersSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: "Invalid request", details: validationResult.error.errors });
      }
      const { tickers } = validationResult.data;

      // Queue selected stocks for analysis (force re-analysis)
      let queuedCount = 0;
      for (const ticker of tickers) {
        try {
          const stock = await storage.getStock(req.session.userId, ticker);
          if (stock && stock.recommendationStatus === "pending") {
            await storage.enqueueAnalysisJob(ticker, "manual", "high", true);
            queuedCount++;
          }
        } catch (error) {
          console.error(`Failed to queue ${ticker}:`, error);
        }
      }

      res.json({ 
        total: tickers.length,
        queued: queuedCount,
        message: `Queued ${queuedCount} stocks for AI analysis`
      });
    } catch (error) {
      console.error("Bulk analyze error:", error);
      res.status(500).json({ error: "Failed to bulk analyze" });
    }
  });

  // AI Analysis endpoint
  app.post("/api/stocks/:ticker/analyze", async (req, res) => {
    try {
      const ticker = req.params.ticker.toUpperCase();
      const { force } = req.body;
      
      // Check if we have a cached analysis (less than 7 days old) unless force is true
      if (!force) {
        const existingAnalysis = await storage.getStockAnalysis(ticker);
        if (existingAnalysis && existingAnalysis.analyzedAt) {
          const cacheAge = Date.now() - new Date(existingAnalysis.analyzedAt).getTime();
          const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
          
          if (cacheAge < sevenDaysInMs) {
            console.log(`[AI Analysis] Using cached analysis for ${ticker} (${Math.floor(cacheAge / (24 * 60 * 60 * 1000))} days old)`);
            return res.json(existingAnalysis);
          }
        }
      }

      // Enqueue the analysis job with macro integration (force flag to cancel existing jobs)
      console.log(`[AI Analysis] Enqueueing analysis job for ${ticker} with macro integration${force ? ' (forced)' : ''}...`);
      const job = await storage.enqueueAnalysisJob(ticker, "user_manual", "high", force);
      
      // Return a pending analysis response
      const pendingAnalysis = {
        id: job.id,
        ticker,
        status: "analyzing",
        overallRating: null,
        confidenceScore: null,
        summary: "Analysis in progress...",
        analyzedAt: new Date().toISOString(),
      };
      
      res.json(pendingAnalysis);
    } catch (error) {
      console.error("[AI Analysis] Error:", error);
      res.status(500).json({ error: "Failed to analyze stock: " + (error instanceof Error ? error.message : "Unknown error") });
    }
  });

  // Get stock analysis
  app.get("/api/stocks/:ticker/analysis", async (req, res) => {
    try {
      const ticker = req.params.ticker.toUpperCase();
      const analysis = await storage.getStockAnalysis(ticker);
      
      if (!analysis) {
        return res.status(404).json({ error: "No analysis found for this stock" });
      }
      
      res.json(analysis);
    } catch (error) {
      console.error("[AI Analysis] Error fetching analysis:", error);
      res.status(500).json({ error: "Failed to fetch analysis" });
    }
  });

  // Get candlestick data for a ticker (shared OHLCV data - one record per ticker, reused across users)
  app.get("/api/stocks/:ticker/candlesticks", async (req, res) => {
    try {
      const ticker = req.params.ticker.toUpperCase();
      const candlesticks = await storage.getCandlesticksByTicker(ticker);
      
      if (!candlesticks) {
        return res.status(404).json({ error: "No candlestick data found for this stock" });
      }
      
      res.json(candlesticks);
    } catch (error) {
      console.error("[Candlesticks] Error fetching candlestick data:", error);
      res.status(500).json({ error: "Failed to fetch candlestick data" });
    }
  });

  // Get all stock analyses (returns null scores for stocks with active jobs to show them as "processing")
  app.get("/api/stock-analyses", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      // Get current user's stocks to filter analyses
      const userStocks = await storage.getStocks(req.session.userId);
      const userTickers = new Set(userStocks.map(s => s.ticker));
      
      // Get all analyses
      const allAnalyses = await storage.getAllStockAnalyses();
      
      // Filter to only user's tickers
      const userAnalyses = allAnalyses.filter(a => userTickers.has(a.ticker));
      
      // Get tickers with active jobs (pending or processing)
      const activeJobs = await db
        .selectDistinct({ ticker: aiAnalysisJobs.ticker })
        .from(aiAnalysisJobs)
        .where(or(
          eq(aiAnalysisJobs.status, 'pending'),
          eq(aiAnalysisJobs.status, 'processing')
        ));
      
      const activeJobTickers = new Set(activeJobs.map(j => j.ticker));
      
      // Return analyses with null scores for tickers with active jobs
      // This makes those stocks show as "processing" in the UI while preserving the ticker
      const analyses = userAnalyses.map(a => {
        if (activeJobTickers.has(a.ticker)) {
          // Return clean processing object with only ticker and status
          return {
            ticker: a.ticker,
            status: 'processing' as const,
            integratedScore: null,
            aiScore: null,
            confidenceScore: null,
            overallRating: null,
            summary: null,
            recommendation: null,
            analyzedAt: null,
          };
        }
        return a;
      });
      
      res.json(analyses);
    } catch (error) {
      console.error("[AI Analysis] Error fetching analyses:", error);
      res.status(500).json({ error: "Failed to fetch analyses" });
    }
  });

  // Macro Analysis API Endpoints

  // Run macro economic analysis
  app.post("/api/macro-analysis/run", async (req, res) => {
    try {
      console.log("[Macro API] Running macro economic analysis...");
      const { runMacroAnalysis } = await import("./macroAgentService");
      const analysisData = await runMacroAnalysis();
      const savedAnalysis = await storage.createMacroAnalysis(analysisData);
      console.log("[Macro API] Macro analysis complete. ID:", savedAnalysis.id);
      res.json(savedAnalysis);
    } catch (error) {
      console.error("[Macro API] Error running macro analysis:", error);
      res.status(500).json({ error: "Failed to run macro analysis: " + (error instanceof Error ? error.message : "Unknown error") });
    }
  });

  // Get latest macro analysis
  app.get("/api/macro-analysis/latest", async (req, res) => {
    try {
      const analysis = await storage.getLatestMacroAnalysis();
      if (!analysis) {
        return res.status(404).json({ error: "No macro analysis found" });
      }
      res.json(analysis);
    } catch (error) {
      console.error("[Macro API] Error fetching latest macro analysis:", error);
      res.status(500).json({ error: "Failed to fetch macro analysis" });
    }
  });

  // Get specific macro analysis by ID
  app.get("/api/macro-analysis/:id", async (req, res) => {
    try {
      const analysis = await storage.getMacroAnalysis(req.params.id);
      if (!analysis) {
        return res.status(404).json({ error: "Macro analysis not found" });
      }
      res.json(analysis);
    } catch (error) {
      console.error("[Macro API] Error fetching macro analysis:", error);
      res.status(500).json({ error: "Failed to fetch macro analysis" });
    }
  });

  // AI Analysis Job Queue API Endpoints

  // Enqueue a new analysis job
  app.post("/api/analysis-jobs", async (req, res) => {
    try {
      const { ticker, source = "user_manual", priority = "high" } = req.body;
      
      if (!ticker) {
        return res.status(400).json({ error: "Ticker is required" });
      }

      const job = await storage.enqueueAnalysisJob(
        ticker.toUpperCase(),
        source,
        priority
      );

      res.json(job);
    } catch (error) {
      console.error("[Queue API] Error enqueueing job:", error);
      res.status(500).json({ error: "Failed to enqueue analysis job" });
    }
  });

  // Get queue statistics (MUST be before /:id route to avoid matching "stats" as an ID)
  app.get("/api/analysis-jobs/stats", async (req, res) => {
    try {
      const stats = await storage.getQueueStats();
      res.json(stats);
    } catch (error) {
      console.error("[Queue API] Error fetching queue stats:", error);
      res.status(500).json({ error: "Failed to fetch queue stats" });
    }
  });

  // Get jobs (optionally filtered by ticker)
  app.get("/api/analysis-jobs", async (req, res) => {
    try {
      const { ticker } = req.query;
      
      if (ticker) {
        const jobs = await storage.getJobsByTicker((ticker as string).toUpperCase());
        res.json(jobs);
      } else {
        // For now, return queue stats instead of all jobs
        const stats = await storage.getQueueStats();
        res.json(stats);
      }
    } catch (error) {
      console.error("[Queue API] Error fetching jobs:", error);
      res.status(500).json({ error: "Failed to fetch jobs" });
    }
  });

  // Get job status by ID (MUST be after /stats route)
  app.get("/api/analysis-jobs/:id", async (req, res) => {
    try {
      const job = await storage.getJobById(req.params.id);
      
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }

      // If job is completed, include the analysis result
      if (job.status === "completed") {
        const analysis = await storage.getStockAnalysis(job.ticker);
        res.json({ ...job, analysis });
      } else {
        res.json(job);
      }
    } catch (error) {
      console.error("[Queue API] Error fetching job:", error);
      res.status(500).json({ error: "Failed to fetch job" });
    }
  });

  // Bulk analyze all pending stocks for current user
  app.post("/api/stocks/analyze-all", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      console.log(`[Bulk AI Analysis] Starting bulk analysis for user ${req.session.userId}...`);
      
      // Get user's pending purchase recommendations
      const stocks = await storage.getStocks(req.session.userId);
      const pendingStocks = stocks.filter(
        stock => stock.recommendation?.toLowerCase() === "buy" && 
                 stock.recommendationStatus === "pending"
      );
      
      if (pendingStocks.length === 0) {
        return res.json({ 
          message: "No pending stocks to analyze", 
          queued: 0, 
          total: 0 
        });
      }
      
      console.log(`[Bulk AI Analysis] Found ${pendingStocks.length} pending stocks for user ${req.session.userId}`);
      
      // Queue all stocks for analysis (force re-analysis of existing jobs)
      let queuedCount = 0;
      for (const stock of pendingStocks) {
        try {
          await storage.enqueueAnalysisJob(stock.ticker, "manual", "high", true);
          queuedCount++;
        } catch (error) {
          console.error(`[Bulk AI Analysis] Failed to queue ${stock.ticker}:`, error);
        }
      }
      
      res.json({ 
        message: `Queued ${queuedCount} stocks for AI analysis. Background worker will process them soon.`,
        queued: queuedCount,
        total: pendingStocks.length 
      });
    } catch (error) {
      console.error("[Bulk AI Analysis] Error:", error);
      res.status(500).json({ error: "Failed to start bulk analysis" });
    }
  });

  // User routes
  // Stock comment routes
  app.get("/api/stocks/:ticker/comments", async (req, res) => {
    try {
      const comments = await storage.getStockComments(req.params.ticker);
      res.json(comments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  });

  app.post("/api/stocks/:ticker/comments", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const validatedData = insertStockCommentSchema.parse({
        ...req.body,
        ticker: req.params.ticker,
        userId: req.session.userId,
      });
      const comment = await storage.createStockComment(validatedData);
      res.status(201).json(comment);
    } catch (error) {
      console.error("Create comment error:", error);
      res.status(400).json({ error: "Invalid comment data" });
    }
  });

  app.get("/api/stock-comment-counts", async (req, res) => {
    try {
      const counts = await storage.getStockCommentCounts();
      res.json(counts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch comment counts" });
    }
  });

  // Stock follow routes
  app.get("/api/users/me/followed", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const followed = await storage.getUserFollowedStocks(req.session.userId);
      res.json(followed);
    } catch (error) {
      console.error("Get user followed stocks error:", error);
      res.status(500).json({ error: "Failed to fetch followed stocks" });
    }
  });

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
      
      // Fetch candlestick data immediately if not present (async, fire-and-forget)
      void (async () => {
        try {
          const existingCandlesticks = await storage.getCandlesticksByTicker(ticker);
          if (!existingCandlesticks || !existingCandlesticks.candlestickData || existingCandlesticks.candlestickData.length === 0) {
            console.log(`[Follow] Fetching candlestick data for newly followed stock ${ticker}...`);
            const candlesticks = await stockService.getCandlestickData(ticker);
            if (candlesticks && candlesticks.length > 0) {
              await storage.upsertCandlesticks(ticker, candlesticks.map(c => ({
                date: c.date,
                open: c.open,
                high: c.high,
                low: c.low,
                close: c.close,
                volume: c.volume
              })));
              console.log(`[Follow] ✓ Candlestick data fetched for ${ticker}`);
            }
          }
        } catch (err: any) {
          console.error(`[Follow] ✗ Failed to fetch candlesticks for ${ticker}:`, err.message);
        }
      })();
      
      // Check if stock became popular (>10 followers) and notify all followers
      try {
        const followerCount = await storage.getFollowerCountForTicker(ticker);
        
        if (followerCount > 10) {
          console.log(`[Follow] Stock ${ticker} is popular with ${followerCount} followers, creating notifications...`);
          
          // Get stock data for the notification (use current user's userId - stock data same across users in per-user model)
          const stock = await storage.getStock(req.session.userId, ticker);
          const stockData = stock as any;
          
          // Notify all followers (including the one who just followed)
          const followerUserIds = await storage.getFollowerUserIdsForTicker(ticker);
          for (const followerUserId of followerUserIds) {
            try {
              await storage.createNotification({
                userId: followerUserId,
                ticker,
                type: 'popular_stock',
                message: `${ticker} is trending! ${followerCount} traders are now following this stock`,
                metadata: { followerCount },
                isRead: false,
              });
            } catch (notifError) {
              // Ignore duplicate notification errors
              if (notifError instanceof Error && !notifError.message.includes('unique constraint')) {
                console.error(`[Follow] Failed to create popular stock notification for user ${followerUserId}:`, notifError);
              }
            }
          }
          console.log(`[Follow] Created ${followerUserIds.length} popular_stock notifications for ${ticker}`);
        }
      } catch (popularError) {
        console.error(`[Follow] Failed to check/create popular stock notifications:`, popularError);
        // Don't fail the follow request
      }
      
      // Trigger immediate "day 0" analysis for this stock ONLY if not already completed
      try {
        const existingAnalysis = await storage.getStockAnalysis(ticker);
        const needsAnalysis = !existingAnalysis || existingAnalysis.status !== 'completed';
        
        if (needsAnalysis) {
          console.log(`[Follow] Triggering day 0 analysis for ${ticker} (status: ${existingAnalysis?.status || 'none'})`);
          await storage.enqueueAnalysisJob(ticker, "follow_day_0", "high");
        } else {
          console.log(`[Follow] Skipping analysis for ${ticker} - already completed`);
        }
      } catch (analysisError) {
        console.error(`[Follow] Failed to enqueue analysis for ${ticker}:`, analysisError);
        // Don't fail the follow request if analysis enqueue fails
      }
      
      // Generate day-0 daily brief immediately
      try {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        
        // Check if brief already exists for today
        const existingBriefs = await storage.getDailyBriefsForTicker(ticker, req.session.userId);
        const briefExistsToday = existingBriefs.some((b: any) => b.briefDate === today);
        
        if (!briefExistsToday) {
          console.log(`[Follow] Generating day-0 daily brief for ${ticker}...`);
          
          // Get current price data (matching daily job implementation)
          const quote = await stockService.getQuote(ticker);
          if (!quote || quote.price === 0 || quote.previousClose === 0) {
            throw new Error("Unable to fetch valid price data");
          }
          
          // Get previous analysis for context (if available)
          const stock = await storage.getStock(req.session.userId, ticker);
          const stockData = stock as any;
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
          
          // Get opportunity type from stock recommendation (case-insensitive check)
          const opportunityType = stockData?.recommendation?.toLowerCase().includes("sell") ? "sell" : "buy";
          
          // Check if user owns this stock (real holdings only, not simulated)
          const holding = await storage.getPortfolioHoldingByTicker(req.session.userId, ticker, false);
          const userOwnsPosition = holding !== undefined && holding.quantity > 0;
          
          // Get recent news (last 24h only, if available)
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
          
          // Generate the DUAL-SCENARIO brief (both watching and owning)
          const brief = await aiAnalysisService.generateDailyBrief({
            ticker,
            currentPrice: quote.price,
            previousPrice: quote.previousClose,
            opportunityType,
            recentNews: recentNews && recentNews.length > 0 ? recentNews : undefined,
            previousAnalysis
          });
          
          // Store in database with BOTH scenarios
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
          
          console.log(`[Follow] Generated day-0 dual-scenario brief for ${ticker}: Watching=${brief.watching.recommendedStance}(${brief.watching.confidence}), Owning=${brief.owning.recommendedStance}(${brief.owning.confidence})`);
        } else {
          console.log(`[Follow] Daily brief already exists for ${ticker} today, skipping`);
        }
      } catch (briefError) {
        const errorDetails = briefError instanceof Error ? 
          `${briefError.message}\n${briefError.stack}` : 
          JSON.stringify(briefError);
        console.error(`[Follow] Failed to generate day-0 brief for ${ticker}:`, errorDetails);
        // Don't fail the follow request if brief generation fails
      }
      
      res.status(201).json(follow);
    } catch (error) {
      console.error("Follow stock error:", error);
      res.status(400).json({ error: "Failed to follow stock" });
    }
  });

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

  app.patch("/api/stocks/:ticker/position", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const ticker = req.params.ticker.toUpperCase();
      const { hasEnteredPosition, entryPrice } = req.body;
      
      if (typeof hasEnteredPosition !== 'boolean') {
        return res.status(400).json({ error: "hasEnteredPosition must be a boolean" });
      }
      
      // Validate entryPrice if provided
      if (entryPrice !== undefined && (typeof entryPrice !== 'number' || entryPrice <= 0)) {
        return res.status(400).json({ error: "entryPrice must be a positive number" });
      }
      
      await storage.toggleStockPosition(ticker, req.session.userId, hasEnteredPosition, entryPrice);
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Toggle position error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      if (errorMessage.includes("not being followed")) {
        return res.status(404).json({ error: "Stock is not being followed" });
      }
      
      res.status(500).json({ error: "Failed to toggle position status" });
    }
  });

  app.post("/api/stocks/bulk-follow", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const validationResult = bulkTickersSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: "Invalid request", details: validationResult.error.errors });
      }
      const { tickers } = validationResult.data;
      
      let followedCount = 0;
      for (const ticker of tickers) {
        try {
          const upperTicker = ticker.toUpperCase();
          await storage.followStock({
            ticker: upperTicker,
            userId: req.session.userId,
          });
          followedCount++;
          
          // Fetch candlestick data immediately if not present (async, fire-and-forget)
          void (async () => {
            try {
              const existingCandlesticks = await storage.getCandlesticksByTicker(upperTicker);
              if (!existingCandlesticks || !existingCandlesticks.candlestickData || existingCandlesticks.candlestickData.length === 0) {
                console.log(`[BulkFollow] Fetching candlestick data for ${upperTicker}...`);
                const candlesticks = await stockService.getCandlestickData(upperTicker);
                if (candlesticks && candlesticks.length > 0) {
                  await storage.upsertCandlesticks(upperTicker, candlesticks.map(c => ({
                    date: c.date,
                    open: c.open,
                    high: c.high,
                    low: c.low,
                    close: c.close,
                    volume: c.volume
                  })));
                  console.log(`[BulkFollow] ✓ Candlestick data fetched for ${upperTicker}`);
                }
              }
            } catch (err: any) {
              console.error(`[BulkFollow] ✗ Failed to fetch candlesticks for ${upperTicker}:`, err.message);
            }
          })();
          
          // Trigger immediate "day 0" analysis for each followed stock ONLY if not already completed
          try {
            const existingAnalysis = await storage.getStockAnalysis(upperTicker);
            const needsAnalysis = !existingAnalysis || existingAnalysis.status !== 'completed';
            
            if (needsAnalysis) {
              console.log(`[BulkFollow] Triggering day 0 analysis for ${upperTicker} (status: ${existingAnalysis?.status || 'none'})`);
              await storage.enqueueAnalysisJob(upperTicker, "follow_day_0", "high");
            } else {
              console.log(`[BulkFollow] Skipping analysis for ${upperTicker} - already completed`);
            }
          } catch (analysisError) {
            console.error(`[BulkFollow] Failed to enqueue analysis for ${upperTicker}:`, analysisError);
            // Don't fail the bulk follow if analysis enqueue fails
          }
        } catch (error) {
          console.error(`Failed to follow ${ticker}:`, error);
        }
      }

      res.json({ 
        total: tickers.length,
        followed: followedCount,
        message: `Followed ${followedCount} stocks`
      });
    } catch (error) {
      console.error("Bulk follow error:", error);
      res.status(500).json({ error: "Failed to bulk follow" });
    }
  });

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

  // Get daily briefs for a stock (lightweight daily reports for followed stocks)
  app.get("/api/stocks/:ticker/daily-briefs", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      // Validate ticker parameter
      const tickerParam = req.params.ticker?.trim()?.toUpperCase();
      if (!tickerParam || tickerParam.length > 10 || !/^[A-Z]+$/.test(tickerParam)) {
        return res.status(400).json({ error: "Invalid ticker format" });
      }
      
      // Check if user follows this stock (normalize case on both sides)
      const followedStocks = await storage.getUserFollowedStocks(req.session.userId);
      const isFollowing = followedStocks.some(fs => fs.ticker.toUpperCase() === tickerParam);
      
      if (!isFollowing) {
        return res.status(403).json({ error: "You must follow this stock to view daily briefs" });
      }
      
      // Pass userId to ensure only user-specific briefs are returned
      const briefs = await storage.getDailyBriefsForTicker(tickerParam, req.session.userId);
      res.json(briefs);
    } catch (error) {
      console.error("Get daily briefs error:", error);
      res.status(500).json({ error: "Failed to fetch daily briefs" });
    }
  });

  // Stock views routes
  app.post("/api/stocks/:ticker/view", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const view = await storage.markStockAsViewed(req.params.ticker, req.session.userId);
      res.status(201).json(view);
    } catch (error) {
      console.error("Mark stock as viewed error:", error);
      res.status(500).json({ error: "Failed to mark stock as viewed" });
    }
  });

  app.post("/api/stocks/bulk-view", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const { tickers } = req.body;
      if (!Array.isArray(tickers)) {
        return res.status(400).json({ error: "tickers must be an array" });
      }
      await storage.markStocksAsViewed(tickers, req.session.userId);
      res.status(201).json({ success: true, count: tickers.length });
    } catch (error) {
      console.error("Bulk mark stocks as viewed error:", error);
      res.status(500).json({ error: "Failed to bulk mark stocks as viewed" });
    }
  });

  app.get("/api/stock-views/:userId", async (req, res) => {
    try {
      const viewedTickers = await storage.getUserStockViews(req.params.userId);
      res.json(viewedTickers);
    } catch (error) {
      console.error("Get stock views error:", error);
      res.status(500).json({ error: "Failed to fetch stock views" });
    }
  });

  // Tutorial routes
  app.get("/api/tutorials/:tutorialId/status", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const completed = await storage.hasCompletedTutorial(req.session.userId, req.params.tutorialId);
      res.json({ completed });
    } catch (error) {
      console.error("Check tutorial status error:", error);
      res.status(500).json({ error: "Failed to check tutorial status" });
    }
  });

  app.post("/api/tutorials/:tutorialId/complete", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      await storage.markTutorialAsCompleted(req.session.userId, req.params.tutorialId);
      res.status(201).json({ success: true });
    } catch (error) {
      console.error("Mark tutorial complete error:", error);
      res.status(500).json({ error: "Failed to mark tutorial as completed" });
    }
  });

  app.get("/api/tutorials/user", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const tutorials = await storage.getUserTutorials(req.session.userId);
      res.json(tutorials);
    } catch (error) {
      console.error("Get user tutorials error:", error);
      res.status(500).json({ error: "Failed to fetch user tutorials" });
    }
  });

  // Portfolio routes
  app.get("/api/portfolio/holdings", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const isSimulated = req.query.simulated === "true";
      const holdings = await storage.getPortfolioHoldings(req.session.userId, isSimulated ? true : false);
      res.json(holdings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch portfolio holdings" });
    }
  });

  app.get("/api/portfolio/holdings/:id", async (req, res) => {
    try {
      // CRITICAL SECURITY: Verify authentication and ownership
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const holding = await storage.getPortfolioHolding(req.params.id, req.session.userId);
      if (!holding) {
        return res.status(404).json({ error: "Holding not found" });
      }
      res.json(holding);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch holding" });
    }
  });

  app.delete("/api/portfolio/holdings/:id", async (req, res) => {
    try {
      // CRITICAL SECURITY: Verify authentication and ownership before deletion
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      // Verify ownership before deleting
      const holding = await storage.getPortfolioHolding(req.params.id, req.session.userId);
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

  // Trade routes
  app.get("/api/trades", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const isSimulated = req.query.simulated === "true";
      const trades = await storage.getTrades(req.session.userId, isSimulated ? true : false);
      res.json(trades);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch trades" });
    }
  });

  app.get("/api/trades/:id", async (req, res) => {
    try {
      // CRITICAL SECURITY: Verify authentication and ownership
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const trade = await storage.getTrade(req.params.id, req.session.userId);
      if (!trade) {
        return res.status(404).json({ error: "Trade not found" });
      }
      res.json(trade);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch trade" });
    }
  });

  app.post("/api/trades", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const validatedData = insertTradeSchema.parse({ ...req.body, userId: req.session.userId });
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

  // Trading Rules routes
  app.get("/api/rules", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const rules = await storage.getTradingRules(req.session.userId);
      res.json(rules);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch trading rules" });
    }
  });

  app.get("/api/rules/:id", async (req, res) => {
    try {
      const rule = await storage.getTradingRule(req.params.id);
      if (!rule) {
        return res.status(404).json({ error: "Trading rule not found" });
      }
      res.json(rule);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch trading rule" });
    }
  });

  app.post("/api/rules", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const validatedData = insertTradingRuleSchema.parse({ ...req.body, userId: req.session.userId });
      const rule = await storage.createTradingRule(validatedData);
      res.status(201).json(rule);
    } catch (error) {
      res.status(400).json({ error: "Invalid trading rule data" });
    }
  });

  app.patch("/api/rules/:id", async (req, res) => {
    try {
      const rule = await storage.updateTradingRule(req.params.id, req.body);
      if (!rule) {
        return res.status(404).json({ error: "Trading rule not found" });
      }
      res.json(rule);
    } catch (error) {
      res.status(500).json({ error: "Failed to update trading rule" });
    }
  });

  app.delete("/api/rules/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteTradingRule(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Trading rule not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete trading rule" });
    }
  });

  // Compound Rules (multi-condition rules)
  app.get("/api/compound-rules", async (req, res) => {
    try {
      const rules = await storage.getCompoundRules();
      res.json(rules);
    } catch (error) {
      console.error("Error fetching compound rules:", error);
      res.status(500).json({ error: "Failed to fetch compound rules" });
    }
  });

  app.get("/api/compound-rules/:id", async (req, res) => {
    try {
      const rule = await storage.getCompoundRule(req.params.id);
      if (!rule) {
        return res.status(404).json({ error: "Compound rule not found" });
      }
      res.json(rule);
    } catch (error) {
      console.error("Error fetching compound rule:", error);
      res.status(500).json({ error: "Failed to fetch compound rule" });
    }
  });

  app.post("/api/compound-rules", async (req, res) => {
    try {
      const validatedData = insertCompoundRuleSchema.parse(req.body);
      const rule = await storage.createCompoundRule(validatedData);
      res.status(201).json(rule);
    } catch (error) {
      console.error("Error creating compound rule:", error);
      res.status(400).json({ 
        error: "Invalid compound rule data", 
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.put("/api/compound-rules/:id", async (req, res) => {
    try {
      const partialData = insertCompoundRuleSchema.partial().parse(req.body);
      const rule = await storage.updateCompoundRule(req.params.id, partialData);
      if (!rule) {
        return res.status(404).json({ error: "Compound rule not found" });
      }
      res.json(rule);
    } catch (error) {
      console.error("Error updating compound rule:", error);
      res.status(400).json({ 
        error: "Invalid compound rule data",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.delete("/api/compound-rules/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteCompoundRule(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Compound rule not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting compound rule:", error);
      res.status(500).json({ error: "Failed to delete compound rule" });
    }
  });

  // Rule Executions (audit log)
  app.get("/api/rule-executions", async (req, res) => {
    try {
      const ruleId = req.query.ruleId as string | undefined;
      const ticker = req.query.ticker as string | undefined;
      const executions = await storage.getRuleExecutions(ruleId, ticker);
      res.json(executions);
    } catch (error) {
      console.error("Error fetching rule executions:", error);
      res.status(500).json({ error: "Failed to fetch rule executions" });
    }
  });

  // Backtesting routes
  app.get("/api/backtests", async (req, res) => {
    try {
      const backtests = await storage.getBacktests();
      res.json(backtests);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch backtests" });
    }
  });

  app.get("/api/backtests/:id", async (req, res) => {
    try {
      const backtest = await storage.getBacktest(req.params.id);
      if (!backtest) {
        return res.status(404).json({ error: "Backtest not found" });
      }
      res.json(backtest);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch backtest" });
    }
  });

  app.post("/api/backtests", async (req, res) => {
    try {
      const { name, ruleId, startDate, endDate, initialCapital } = req.body;

      // Get the trading rule
      const rule = ruleId ? await storage.getTradingRule(ruleId) : null;
      if (ruleId && !rule) {
        return res.status(404).json({ error: "Trading rule not found" });
      }

      // Mock backtest simulation
      // In a real implementation, this would simulate trades based on historical data
      const capital = parseFloat(initialCapital);
      const numberOfTrades = Math.floor(Math.random() * 20) + 10;
      const winRate = 50 + Math.random() * 30; // 50-80% win rate
      
      // Simulate random returns
      const returnPercent = (Math.random() * 40) - 10; // -10% to +30%
      const totalReturn = capital * (returnPercent / 100);
      const finalValue = capital + totalReturn;

      // Generate mock equity curve
      const days = 30;
      const equityCurve = [];
      let currentValue = capital;
      for (let i = 0; i <= days; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        const dailyChange = (totalReturn / days) * (0.8 + Math.random() * 0.4);
        currentValue += dailyChange;
        equityCurve.push({
          date: date.toISOString(),
          value: Math.max(capital * 0.7, currentValue),
        });
      }

      // Generate mock trade log
      const tradeLog = [];
      const ticker = rule?.ticker || "AAPL";
      for (let i = 0; i < numberOfTrades; i++) {
        const tradeDate = new Date(startDate);
        tradeDate.setDate(tradeDate.getDate() + Math.floor((i / numberOfTrades) * days));
        
        tradeLog.push({
          date: tradeDate.toISOString(),
          type: i % 2 === 0 ? "buy" : "sell",
          ticker,
          quantity: Math.floor(Math.random() * 10) + 1,
          price: 150 + Math.random() * 50,
          total: (150 + Math.random() * 50) * (Math.floor(Math.random() * 10) + 1),
        });
      }

      const backtest = await storage.createBacktest({
        name,
        ruleId: ruleId || null,
        startDate,
        endDate,
        initialCapital,
        finalValue: finalValue.toFixed(2),
        totalReturn: totalReturn.toFixed(2),
        totalReturnPercent: returnPercent.toFixed(2),
        numberOfTrades,
        winRate: winRate.toFixed(2),
        bestTrade: (Math.random() * 500 + 100).toFixed(2),
        worstTrade: (-(Math.random() * 300 + 50)).toFixed(2),
        tradeLog,
        equityCurve,
      });

      res.status(201).json(backtest);
    } catch (error) {
      console.error("Backtest error:", error);
      res.status(400).json({ error: "Invalid backtest data" });
    }
  });

  // Bulk simulate (create simulated holdings) endpoint
  app.post("/api/stocks/bulk-simulate", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const { tickers } = req.body;
      
      if (!Array.isArray(tickers) || tickers.length === 0) {
        return res.status(400).json({ error: "Tickers array is required" });
      }

      const createdHoldings = [];
      const errors = [];

      // Create a simulated holding for each ticker
      for (const ticker of tickers) {
        try {
          const stock = await storage.getStock(req.session.userId, ticker);
          if (!stock) {
            errors.push({ ticker, error: "Stock not found" });
            continue;
          }

          // Check if simulated holding already exists
          const existingHolding = await storage.getPortfolioHoldingByTicker(req.session.userId, ticker, true);
          if (existingHolding) {
            errors.push({ ticker, error: "Simulated holding already exists" });
            continue;
          }

          const simulationCapital = 1000;
          
          // Use insider trade date if available, otherwise use today
          const purchaseDate = stock.insiderTradeDate 
            ? new Date(stock.insiderTradeDate)
            : new Date();
          const purchaseDateStr = purchaseDate.toISOString().split('T')[0];
          
          // Ensure price history is available - fetch if needed
          let priceHistory = stock.priceHistory || [];
          
          if (priceHistory.length === 0 && stock.insiderTradeDate) {
            // Fall back to fetching if no candlesticks available
            console.log(`[BulkSimulation] Fetching price history for ${stock.ticker} from ${stock.insiderTradeDate} to today`);
            try {
              const fetchedPrices = await backtestService.fetchHistoricalPrices(
                stock.ticker,
                new Date(stock.insiderTradeDate),
                new Date()
              );
              
              if (fetchedPrices.length > 0) {
                priceHistory = fetchedPrices.map(p => ({
                  date: p.date,
                  price: p.close
                }));
                
                await storage.updateStock(req.session.userId, stock.ticker, { priceHistory });
                console.log(`[BulkSimulation] Fetched ${priceHistory.length} price points for ${stock.ticker}`);
              }
            } catch (error) {
              console.error(`[BulkSimulation] Failed to fetch price history for ${stock.ticker}:`, error);
            }
          }
          
          // Try to find historical price for the purchase date
          const historicalPricePoint = priceHistory.find(p => p.date === purchaseDateStr);
          
          // Use historical price if available, otherwise current price
          const purchasePrice = historicalPricePoint 
            ? historicalPricePoint.price 
            : parseFloat(stock.currentPrice);
          
          const quantity = Math.floor(simulationCapital / purchasePrice);
          const total = purchasePrice * quantity;

          // Create simulated trade with the purchase date
          const trade = await storage.createTrade({
            userId: req.session.userId,
            ticker,
            type: "buy",
            quantity,
            price: purchasePrice.toFixed(2),
            total: total.toFixed(2),
            status: "completed",
            broker: "simulation",
            isSimulated: true,
            executedAt: purchaseDate,
          });

          // Get the created holding (automatically created by trade)
          const holding = await storage.getPortfolioHoldingByTicker(req.session.userId, ticker, true);

          // Update user-specific stock status to approved (simulated)
          await storage.ensureUserStockStatus(req.session.userId, ticker);
          await storage.updateUserStockStatus(req.session.userId, ticker, {
            status: "approved",
            approvedAt: new Date()
          });

          createdHoldings.push({ ticker, holdingId: holding?.id, tradeId: trade.id });
        } catch (error) {
          errors.push({ ticker, error: error instanceof Error ? error.message : "Unknown error" });
        }
      }

      res.json({
        success: true,
        total: tickers.length,
        created: createdHoldings.length,
        failed: errors.length,
        holdings: createdHoldings,
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (error) {
      console.error("Bulk simulate error:", error);
      res.status(500).json({ error: "Failed to create simulations" });
    }
  });

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
        res.json({ success: true, message: "Test notification sent successfully!" });
      } else {
        res.status(500).json({ success: false, error: "Failed to send notification" });
      }
    } catch (error: any) {
      console.error("Test notification error:", error);
      res.status(500).json({ error: error.message || "Failed to send test notification" });
    }
  });

  // OpenInsider Configuration routes
  app.get("/api/openinsider/config", async (req, res) => {
    try {
      let config = await storage.getOpeninsiderConfig();
      if (!config) {
        // Create default config if it doesn't exist
        config = await storage.createOrUpdateOpeninsiderConfig({
          enabled: false,
          fetchLimit: 50,
        });
      }
      res.json(config);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch OpenInsider configuration" });
    }
  });

  app.post("/api/openinsider/config", async (req, res) => {
    try {
      const validatedData = insertOpeninsiderConfigSchema.parse(req.body);
      const config = await storage.createOrUpdateOpeninsiderConfig(validatedData);
      res.status(201).json(config);
    } catch (error) {
      console.error("OpenInsider config error:", error);
      res.status(400).json({ error: "Invalid OpenInsider configuration data" });
    }
  });

  // Get insider trading history by name
  app.get("/api/insider/history/:insiderName", async (req, res) => {
    try {
      // Require authentication
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Decode and validate insider name
      const insiderName = decodeURIComponent(req.params.insiderName).trim();
      if (!insiderName) {
        return res.status(400).json({ error: "Insider name is required" });
      }

      // Get optional ticker parameter (for filtering to specific stock)
      const ticker = (req.query.ticker as string)?.trim().toUpperCase();

      // Parse and validate limit parameter (default: 50 when ticker provided, 20 otherwise)
      const limitParam = req.query.limit as string | undefined;
      let limit = ticker ? 50 : 20; // Higher limit when filtering by ticker (faster)
      if (limitParam) {
        const parsed = parseInt(limitParam, 10);
        if (isNaN(parsed) || parsed < 1) {
          return res.status(400).json({ error: "Invalid limit parameter" });
        }
        limit = Math.min(parsed, ticker ? 200 : 100); // Higher cap when filtering by ticker
      }

      // Sanitize name for logging
      const sanitizedName = insiderName.replace(/[\n\r]/g, ' ').substring(0, 100);
      const tickerInfo = ticker ? ` for ${ticker}` : '';
      console.log(`[InsiderHistory] Fetching history for "${sanitizedName}"${tickerInfo} (limit: ${limit})`);

      // Fetch insider trading history
      const scraperResponse = await openinsiderService.fetchInsiderPurchases(
        limit,
        { insider_name: insiderName, ticker }
      );
      const trades = scraperResponse.transactions;

      console.log(`[InsiderHistory] Found ${trades.length} trades for "${sanitizedName}"`);
      console.log(`[InsiderHistory] Stage 1 Filter Stats:`, scraperResponse.stats);

      // Handle empty results gracefully
      if (!trades || trades.length === 0) {
        return res.json({
          insiderName,
          count: 0,
          trades: [],
          score: null
        });
      }

      // Calculate trade scores (2-week P&L performance)
      const scoredTrades = await openinsiderService.calculateTradeScores(trades);
      
      // Calculate aggregate insider score
      const insiderScore = openinsiderService.calculateInsiderScore(scoredTrades);

      // Return structured response with scores
      res.json({
        insiderName,
        count: scoredTrades.length,
        trades: scoredTrades,
        score: insiderScore
      });
    } catch (error: any) {
      console.error("[InsiderHistory] ERROR occurred:");
      console.error("[InsiderHistory] Error message:", error.message);
      console.error("[InsiderHistory] Error stack:", error.stack);
      if (error.stdout) console.error("[InsiderHistory] stdout:", error.stdout);
      if (error.stderr) console.error("[InsiderHistory] stderr:", error.stderr);
      
      // Map errors to appropriate HTTP status codes
      if (error.message?.includes("timeout") || error.message?.includes("network")) {
        return res.status(502).json({ 
          error: "Failed to fetch insider data from OpenInsider",
          details: "The service may be temporarily unavailable"
        });
      }
      
      res.status(500).json({ 
        error: "Failed to fetch insider trading history",
        details: error.message || "Unknown error"
      });
    }
  });

  app.post("/api/openinsider/fetch", async (req, res) => {
    try {
      // Per-user tenant isolation: Each user can fetch their own opportunity list with custom filters
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      // Get OpenInsider config (currently global, but users can customize via UI)
      const config = await storage.getOpeninsiderConfig();
      if (!config || !config.enabled) {
        return res.status(400).json({ error: "OpenInsider is not configured or disabled" });
      }

      // Build filters from config
      const filters: {
        insiderTitles?: string[];
        minTransactionValue?: number;
        previousDayOnly?: boolean;
      } = {};
      
      if (config.insiderTitles && config.insiderTitles.length > 0) {
        filters.insiderTitles = config.insiderTitles;
      }
      if (config.minTransactionValue) {
        filters.minTransactionValue = config.minTransactionValue;
      }
      if (config.fetchPreviousDayOnly) {
        filters.previousDayOnly = true;
      }

      // Get configurable backend filters
      const optionsDealThreshold = config.optionsDealThresholdPercent ?? 15;
      const minMarketCap = config.minMarketCap ?? 500; // Default $500M if not set
      
      // Log all active filters for debugging (split into stage-1 and stage-2)
      console.log(`[OpeninsiderFetch] ====== STAGE 1: Python Scraper Filters ======`);
      console.log(`[OpeninsiderFetch] Fetch limit: ${config.fetchLimit || 50}`);
      console.log(`[OpeninsiderFetch] Insider titles: ${filters.insiderTitles ? filters.insiderTitles.join(', ') : 'ALL'}`);
      console.log(`[OpeninsiderFetch] Min transaction value: ${filters.minTransactionValue ? '$' + filters.minTransactionValue.toLocaleString() : 'NONE'}`);
      console.log(`[OpeninsiderFetch] Previous day only: ${filters.previousDayOnly}`);
      console.log(`[OpeninsiderFetch] ====== STAGE 2: Backend Post-Processing ======`);
      console.log(`[OpeninsiderFetch] Min market cap: $${minMarketCap}M`);
      console.log(`[OpeninsiderFetch] Options deal threshold: ${optionsDealThreshold}% (insider price >= market price)`);
      console.log(`[OpeninsiderFetch] ==============================================`);
      
      // Fetch BOTH purchase and sale transactions for this user
      console.log(`[OpeninsiderFetch] User ${req.session.userId}: Fetching both purchases AND sales...`);
      const [purchasesResponse, salesResponse] = await Promise.all([
        openinsiderService.fetchInsiderPurchases(
          config.fetchLimit || 50,
          Object.keys(filters).length > 0 ? filters : undefined,
          "P"
        ),
        openinsiderService.fetchInsiderSales(
          config.fetchLimit || 50,
          Object.keys(filters).length > 0 ? filters : undefined
        )
      ]);
      
      // Merge transactions from both sources
      const transactions = [...purchasesResponse.transactions, ...salesResponse.transactions];
      
      // Merge stats
      const stage1Stats = {
        total_rows_scraped: purchasesResponse.stats.total_rows_scraped + salesResponse.stats.total_rows_scraped,
        filtered_not_purchase: purchasesResponse.stats.filtered_not_purchase + salesResponse.stats.filtered_not_purchase,
        filtered_invalid_data: purchasesResponse.stats.filtered_invalid_data + salesResponse.stats.filtered_invalid_data,
        filtered_by_date: purchasesResponse.stats.filtered_by_date + salesResponse.stats.filtered_by_date,
        filtered_by_title: purchasesResponse.stats.filtered_by_title + salesResponse.stats.filtered_by_title,
        filtered_by_transaction_value: purchasesResponse.stats.filtered_by_transaction_value + salesResponse.stats.filtered_by_transaction_value,
        filtered_by_insider_name: purchasesResponse.stats.filtered_by_insider_name + salesResponse.stats.filtered_by_insider_name,
      };
      
      console.log(`[OpeninsiderFetch] User ${req.session.userId}: Fetched ${purchasesResponse.transactions.length} purchases + ${salesResponse.transactions.length} sales = ${transactions.length} total`);
      console.log(`[OpeninsiderFetch] User ${req.session.userId}: BUY transactions: ${transactions.filter(t => t.recommendation === 'buy').length}`);
      console.log(`[OpeninsiderFetch] User ${req.session.userId}: SELL transactions: ${transactions.filter(t => t.recommendation === 'sell').length}`);
      
      const totalStage1Filtered = stage1Stats.filtered_by_title + stage1Stats.filtered_by_transaction_value + 
                                   stage1Stats.filtered_by_date + stage1Stats.filtered_not_purchase + 
                                   stage1Stats.filtered_invalid_data;
      
      console.log(`\n[OpeninsiderFetch] ======= STAGE 1: Python Scraper Filters =======`);
      console.log(`[OpeninsiderFetch] Total rows scraped: ${stage1Stats.total_rows_scraped}`);
      console.log(`[OpeninsiderFetch]   • Not a purchase / Invalid: ${stage1Stats.filtered_not_purchase + stage1Stats.filtered_invalid_data}`);
      console.log(`[OpeninsiderFetch]   • Filtered by date: ${stage1Stats.filtered_by_date}`);
      console.log(`[OpeninsiderFetch]   • Filtered by title: ${stage1Stats.filtered_by_title}`);
      console.log(`[OpeninsiderFetch]   • Filtered by transaction value: ${stage1Stats.filtered_by_transaction_value}`);
      console.log(`[OpeninsiderFetch] → Total Stage 1 filtered: ${totalStage1Filtered}`);
      console.log(`[OpeninsiderFetch] → Returned ${transactions.length} matching transactions`);
      console.log(`[OpeninsiderFetch] ===================================================\n`);
      
      if (transactions.length === 0) {
        await storage.updateOpeninsiderSyncStatus();
        return res.json({ success: true, message: "No new insider transactions found", created: 0 });
      }

      // Convert transactions to stock recommendations
      let createdCount = 0;
      let filteredCount = 0;
      const createdTickers: string[] = []; // Track newly created tickers for AI analysis
      
      // Step 1: Filter out existing transactions for this admin user (check composite key)
      console.log(`[OpeninsiderFetch] Filtering ${transactions.length} transactions for admin user ${req.session.userId}...`);
      const newTransactions = [];
      for (const transaction of transactions) {
        const existingTransaction = await storage.getTransactionByCompositeKey(
          req.session.userId!, // Admin user's stocks
          transaction.ticker,
          transaction.filingDate,
          transaction.insiderName,
          transaction.recommendation // Use actual recommendation (buy or sell)
        );
        if (!existingTransaction) {
          newTransactions.push(transaction);
        }
      }
      console.log(`[OpeninsiderFetch] ${newTransactions.length} new transactions after duplicate check`);
      console.log(`[OpeninsiderFetch] New BUY transactions: ${newTransactions.filter(t => t.recommendation === 'buy').length}`);
      console.log(`[OpeninsiderFetch] New SELL transactions: ${newTransactions.filter(t => t.recommendation === 'sell').length}`);
      
      if (newTransactions.length === 0) {
        await storage.updateOpeninsiderSyncStatus();
        return res.json({ 
          success: true, 
          message: "All transactions already exist in database",
          created: 0,
          total: transactions.length,
          filtered: 0
        });
      }
      
      // Step 2: Batch fetch all quotes and company data upfront
      const tickers = Array.from(new Set(newTransactions.map(t => t.ticker)));
      console.log(`[OpeninsiderFetch] Fetching data for ${tickers.length} unique tickers...`);
      
      // Batch fetch all data at once
      const [quotesMap, stockDataMap] = await Promise.all([
        finnhubService.getBatchQuotes(tickers),
        finnhubService.getBatchStockData(tickers)
      ]);
      console.log(`[OpeninsiderFetch] Received ${quotesMap.size} quotes and ${stockDataMap.size} company profiles`);
      
      // Step 3: Process transactions with cached data
      let filteredMarketCap = 0;
      let filteredOptionsDeals = 0;
      let filteredNoQuote = 0;
      
      console.log(`[OpeninsiderFetch] Processing ${newTransactions.length} new transactions with backend filters...`);
      
      for (const transaction of newTransactions) {
        try {
          // Get pre-fetched quote
          const quote = quotesMap.get(transaction.ticker);
          if (!quote || !quote.currentPrice) {
            filteredNoQuote++;
            console.log(`[OpeninsiderFetch] No quote for ${transaction.ticker}, skipping`);
            continue;
          }

          // Get pre-fetched company data
          const data = stockDataMap.get(transaction.ticker);
          
          // Apply market cap filter using user-configurable threshold
          // Note: data.marketCap is already in millions from Finnhub
          if (!data?.marketCap || data.marketCap < minMarketCap) {
            filteredMarketCap++;
            console.log(`[OpeninsiderFetch] ⊗ ${transaction.ticker} market cap too low:`);
            console.log(`  Insider: ${transaction.insiderName} (${transaction.insiderTitle || 'N/A'})`);
            console.log(`  Market cap: $${data?.marketCap || 0}M (need >$${minMarketCap}M)`);
            console.log(`  Insider price: $${transaction.price.toFixed(2)}, Market price: $${quote.currentPrice.toFixed(2)}`);
            continue;
          }
          
          // Apply options deal filter ONLY to BUY transactions using configurable threshold
          if (transaction.recommendation === "buy") {
            const insiderPriceNum = transaction.price;
            const thresholdPercent = optionsDealThreshold / 100;
            if (optionsDealThreshold > 0 && insiderPriceNum < quote.currentPrice * thresholdPercent) {
              filteredOptionsDeals++;
              console.log(`[OpeninsiderFetch] ⊗ ${transaction.ticker} likely options deal:`);
              console.log(`  Insider: ${transaction.insiderName} (${transaction.insiderTitle || 'N/A'})`);
              console.log(`  Insider price: $${insiderPriceNum.toFixed(2)} < ${optionsDealThreshold}% of market: $${quote.currentPrice.toFixed(2)}`);
              console.log(`  Transaction value: $${(insiderPriceNum * transaction.quantity).toLocaleString()}, Quantity: ${transaction.quantity.toLocaleString()}`);
              continue;
            }
          }

          // Create stock recommendation for admin user only
          console.log(`[OpeninsiderFetch] Creating stock for admin user ${req.session.userId}: ${transaction.ticker}...`);
          const newStock = await storage.createStock({
            userId: req.session.userId!, // Admin user only
            ticker: transaction.ticker,
            companyName: transaction.companyName || transaction.ticker,
            currentPrice: quote.currentPrice.toString(),
            previousClose: quote.previousClose?.toString() || quote.currentPrice.toString(),
            insiderPrice: transaction.price.toString(),
            insiderQuantity: transaction.quantity,
            insiderTradeDate: transaction.filingDate,
            insiderName: transaction.insiderName,
            insiderTitle: transaction.insiderTitle,
            recommendation: transaction.recommendation || "buy",
            source: "openinsider",
            confidenceScore: transaction.confidence || 75,
            peRatio: null,
            marketCap: data?.marketCap ? `$${Math.round(data.marketCap)}M` : null,
            description: data?.companyInfo?.description || null,
            industry: data?.companyInfo?.industry || null,
            country: data?.companyInfo?.country || null,
            webUrl: data?.companyInfo?.webUrl || null,
            ipo: data?.companyInfo?.ipo || null,
            news: data?.news || [],
            insiderSentimentMspr: data?.insiderSentiment?.mspr.toString() || null,
            insiderSentimentChange: data?.insiderSentiment?.change.toString() || null,
            priceHistory: [],
          });

          createdCount++;
          createdTickers.push(transaction.ticker); // Track this ticker for AI analysis
          
          // Log successful creation
          console.log(`[OpeninsiderFetch] ✓ Created recommendation for ${transaction.ticker}:`);
          console.log(`  Insider: ${transaction.insiderName} (${transaction.insiderTitle || 'N/A'})`);
          console.log(`  Insider price: $${transaction.price.toFixed(2)}, Market price: $${quote.currentPrice.toFixed(2)}`);
          console.log(`  Market cap: $${data.marketCap}M, Quantity: ${transaction.quantity.toLocaleString()}`);
          console.log(`  Transaction value: $${(transaction.price * transaction.quantity).toLocaleString()}`);

          // Send Telegram notification
          if (telegramNotificationService.isReady()) {
            try {
              const notificationSent = await telegramNotificationService.sendStockAlert({
                ticker: newStock.ticker,
                companyName: newStock.companyName,
                recommendation: newStock.recommendation || 'buy',
                currentPrice: newStock.currentPrice,
                insiderPrice: newStock.insiderPrice || undefined,
                insiderQuantity: newStock.insiderQuantity || undefined,
                confidenceScore: newStock.confidenceScore || undefined,
              });
              if (!notificationSent) {
                console.log(`[OpeninsiderFetch] Failed to send Telegram notification for ${transaction.ticker}`);
              }
            } catch (err) {
              console.error(`[OpeninsiderFetch] Error sending Telegram notification for ${transaction.ticker}:`, err);
            }
          }
        } catch (err) {
          console.error(`[OpeninsiderFetch] ❌ Error processing ${transaction.ticker}:`, err);
          console.error(`[OpeninsiderFetch] Error details:`, {
            ticker: transaction.ticker,
            insiderName: transaction.insiderName,
            error: err instanceof Error ? err.message : String(err),
            stack: err instanceof Error ? err.stack : undefined
          });
        }
      }

      // Queue ONE AI analysis job per unique ticker (not per transaction)
      // BUT ONLY if the ticker doesn't already have a completed analysis
      if (createdTickers.length > 0) {
        const uniqueTickers = Array.from(new Set(createdTickers));
        console.log(`[OpeninsiderFetch] Checking ${uniqueTickers.length} unique tickers for AI analysis (from ${createdTickers.length} transactions)...`);
        
        let queuedCount = 0;
        let skippedCount = 0;
        
        for (const ticker of uniqueTickers) {
          try {
            // Check if analysis already completed
            const existingAnalysis = await storage.getStockAnalysis(ticker);
            const needsAnalysis = !existingAnalysis || existingAnalysis.status !== 'completed';
            
            if (needsAnalysis) {
              await storage.enqueueAnalysisJob(ticker, "openinsider_fetch", "normal");
              console.log(`[OpeninsiderFetch] ✓ Queued AI analysis for ${ticker} (status: ${existingAnalysis?.status || 'none'})`);
              queuedCount++;
            } else {
              console.log(`[OpeninsiderFetch] ⊘ Skipped ${ticker} - already completed`);
              skippedCount++;
            }
          } catch (error) {
            console.error(`[OpeninsiderFetch] Failed to queue AI analysis for ${ticker}:`, error);
          }
        }
        
        console.log(`[OpeninsiderFetch] Analysis jobs: ${queuedCount} queued, ${skippedCount} skipped (already completed)`);
      }

      await storage.updateOpeninsiderSyncStatus();
      
      // Mark user's initial data as fetched if this is their first time
      // We do this regardless of createdCount to avoid the onboarding dialog reappearing
      // if all transactions were duplicates or filtered out
      if (req.session.userId) {
        const user = await storage.getUser(req.session.userId);
        if (user && !user.initialDataFetched) {
          await storage.markUserInitialDataFetched(req.session.userId);
          console.log(`[Onboarding] Marked user ${req.session.userId} initial data as fetched`);
          // Note: AI analysis jobs already queued above for all created stocks
        }
      }
      
      const duplicates = transactions.length - newTransactions.length;
      
      console.log(`\n[OpeninsiderFetch] ======= STAGE 2: Backend Post-Processing =======`);
      console.log(`[OpeninsiderFetch] Starting with: ${transactions.length} transactions`);
      console.log(`[OpeninsiderFetch]   ⊗ Duplicates: ${duplicates}`);
      console.log(`[OpeninsiderFetch]   ⊗ Market cap < $${minMarketCap}M: ${filteredMarketCap}`);
      console.log(`[OpeninsiderFetch]   ⊗ Options deals (< ${optionsDealThreshold}%): ${filteredOptionsDeals}`);
      console.log(`[OpeninsiderFetch]   ⊗ No quote: ${filteredNoQuote}`);
      console.log(`[OpeninsiderFetch] → Total Stage 2 filtered: ${duplicates + filteredMarketCap + filteredOptionsDeals + filteredNoQuote}`);
      console.log(`[OpeninsiderFetch] ===================================================`);
      console.log(`\n[OpeninsiderFetch] ✓ Successfully created ${createdCount} new recommendations\n`);
      
      res.json({ 
        success: true, 
        message: `Created ${createdCount} new recommendations. Stage 1: Scraped ${stage1Stats.total_rows_scraped} rows, filtered ${totalStage1Filtered}, returned ${transactions.length}. Stage 2: ${duplicates} duplicates, ${filteredMarketCap} market cap, ${filteredOptionsDeals} options deals, ${filteredNoQuote} no quote.`,
        created: createdCount,
        total: transactions.length,
        stage1: {
          totalScraped: stage1Stats.total_rows_scraped,
          filteredNotPurchase: stage1Stats.filtered_not_purchase + stage1Stats.filtered_invalid_data,
          filteredByDate: stage1Stats.filtered_by_date,
          filteredByTitle: stage1Stats.filtered_by_title,
          filteredByTransactionValue: stage1Stats.filtered_by_transaction_value,
          totalFiltered: totalStage1Filtered,
          returned: transactions.length
        },
        stage2: {
          duplicates: duplicates,
          marketCapTooLow: filteredMarketCap,
          optionsDeals: filteredOptionsDeals,
          noQuote: filteredNoQuote,
          totalFiltered: filteredMarketCap + filteredOptionsDeals + filteredNoQuote
        },
        activeFilters: {
          stage1: {
            insiderTitles: filters.insiderTitles || null,
            minTransactionValue: filters.minTransactionValue || null,
            previousDayOnly: filters.previousDayOnly || false
          },
          stage2: {
            minMarketCap: minMarketCap,
            optionsDealThreshold: optionsDealThreshold
          }
        }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("[OpeninsiderFetch] Error:", error);
      await storage.updateOpeninsiderSyncStatus(errorMessage);
      res.status(500).json({ error: "Failed to fetch OpenInsider data" });
    }
  });

  // Interactive Brokers (IBKR) routes
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
        status: orderResult.orderStatus,
        message: `${action.toUpperCase()} order for ${quantity} shares of ${ticker} placed successfully`
      });
    } catch (error: any) {
      console.error("IBKR trade execution error:", error);
      res.status(500).json({ error: error.message || "Failed to execute trade" });
    }
  });

  // What-If Backtest Job routes
  app.get("/api/backtest/jobs", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const jobs = await storage.getBacktestJobs(req.session.userId);
      res.json(jobs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch backtest jobs" });
    }
  });

  app.get("/api/backtest/jobs/:id", async (req, res) => {
    try {
      const job = await storage.getBacktestJob(req.params.id);
      if (!job) {
        return res.status(404).json({ error: "Backtest job not found" });
      }
      res.json(job);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch backtest job" });
    }
  });

  app.get("/api/backtest/jobs/:id/scenarios", async (req, res) => {
    try {
      const scenarios = await storage.getBacktestScenarios(req.params.id);
      res.json(scenarios);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch scenarios" });
    }
  });

  app.get("/api/backtest/jobs/:id/price-data", async (req, res) => {
    try {
      const priceData = await storage.getBacktestPriceData(req.params.id);
      res.json(priceData);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch price data" });
    }
  });

  app.post("/api/backtest/scenarios/:scenarioId/import", async (req, res) => {
    try {
      const { scenarioId } = req.params;
      const { scope = "all_holdings", ticker } = req.body;

      // Fetch all scenarios to find the one we need
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const allJobs = await storage.getBacktestJobs(req.session.userId);
      let scenario = null;
      
      for (const job of allJobs) {
        const scenarios = await storage.getBacktestScenarios(job.id);
        scenario = scenarios.find(s => s.id === scenarioId);
        if (scenario) break;
      }

      if (!scenario) {
        return res.status(404).json({ error: "Scenario not found" });
      }

      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      // Convert scenario to trading rule
      const tradingRule = await storage.createTradingRule({
        userId: req.session.userId,
        name: scenario.name || "Imported Scenario",
        enabled: false, // Start disabled for safety
        scope: scope,
        ticker: scope === "specific_stock" ? ticker : null,
        conditions: scenario.sellConditions || [],
        action: scenario.sellAction?.type === "sell_percentage" ? "sell" : "sell_all",
        actionParams: scenario.sellAction?.percentage 
          ? { percentage: scenario.sellAction.percentage }
          : undefined,
      });

      res.json(tradingRule);
    } catch (error) {
      console.error("Failed to import scenario:", error);
      res.status(500).json({ error: "Failed to import scenario as trading rule" });
    }
  });

  app.post("/api/backtest/jobs", async (req, res) => {
    try {
      const { messageCount, dataSource } = req.body;

      if (!messageCount || messageCount < 1 || messageCount > 2000) {
        return res.status(400).json({ error: "Message count must be between 1 and 2000" });
      }

      const validDataSources = ["telegram", "openinsider"];
      const selectedDataSource = dataSource || "telegram";
      
      if (!validDataSources.includes(selectedDataSource)) {
        return res.status(400).json({ error: `Data source must be one of: ${validDataSources.join(", ")}` });
      }

      const sourceName = selectedDataSource === "telegram" ? "Telegram messages" : "OpenInsider trades";
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const job = await storage.createBacktestJob({
        userId: req.session.userId,
        name: `Backtest ${messageCount} ${sourceName}`,
        dataSource: selectedDataSource,
        messageCount,
      });

      // Start background processing of the job (don't await - run async)
      backtestService.processBacktestJob(job.id).catch(error => {
        console.error(`[BacktestJob ${job.id}] Background processing failed:`, error);
      });

      res.json(job);
    } catch (error) {
      console.error("Failed to create backtest job:", error);
      res.status(500).json({ error: "Failed to create backtest job" });
    }
  });

  app.patch("/api/backtest/jobs/:id/cancel", async (req, res) => {
    try {
      const job = await storage.getBacktestJob(req.params.id);
      
      if (!job) {
        return res.status(404).json({ error: "Backtest job not found" });
      }

      if (["completed", "failed", "cancelled"].includes(job.status)) {
        return res.status(400).json({ error: "Cannot cancel a job that is already finished" });
      }

      await storage.updateBacktestJob(req.params.id, { 
        status: "cancelled",
        errorMessage: "Cancelled by user"
      });

      const updatedJob = await storage.getBacktestJob(req.params.id);
      res.json(updatedJob);
    } catch (error) {
      console.error("Failed to cancel backtest job:", error);
      res.status(500).json({ error: "Failed to cancel backtest job" });
    }
  });

  app.delete("/api/backtest/jobs/:id", async (req, res) => {
    try {
      const job = await storage.getBacktestJob(req.params.id);
      
      if (!job) {
        return res.status(404).json({ error: "Backtest job not found" });
      }

      await storage.deleteBacktestJob(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete backtest job:", error);
      res.status(500).json({ error: "Failed to delete backtest job" });
    }
  });

  // Temporary endpoint to manually trigger backtest job processing
  app.post("/api/backtest/jobs/:id/trigger", async (req, res) => {
    try {
      const job = await storage.getBacktestJob(req.params.id);
      
      if (!job) {
        return res.status(404).json({ error: "Backtest job not found" });
      }

      // Start background processing of the job
      backtestService.processBacktestJob(req.params.id).catch(error => {
        console.error(`[BacktestJob ${req.params.id}] Background processing failed:`, error);
      });

      res.json({ success: true, message: "Job processing triggered" });
    } catch (error) {
      console.error("Failed to trigger backtest job:", error);
      res.status(500).json({ error: "Failed to trigger backtest job" });
    }
  });

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

  // Notification routes
  app.get("/api/notifications", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const notifications = await storage.getNotifications(req.session.userId);
      res.json(notifications);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  app.get("/api/notifications/unread-count", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const count = await storage.getUnreadNotificationCount(req.session.userId);
      res.json({ count });
    } catch (error) {
      console.error("Failed to fetch unread count:", error);
      res.status(500).json({ error: "Failed to fetch unread count" });
    }
  });

  app.patch("/api/notifications/:id/read", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const updated = await storage.markNotificationAsRead(req.params.id, req.session.userId);
      if (!updated) {
        return res.status(404).json({ error: "Notification not found or access denied" });
      }

      res.json(updated);
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  });

  app.patch("/api/notifications/read-all", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const count = await storage.markAllNotificationsAsRead(req.session.userId);
      res.json({ count });
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
      res.status(500).json({ error: "Failed to mark all notifications as read" });
    }
  });

  app.delete("/api/notifications/clear-all", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const count = await storage.clearAllNotifications(req.session.userId);
      res.json({ success: true, count });
    } catch (error) {
      console.error("Failed to clear all notifications:", error);
      res.status(500).json({ error: "Failed to clear all notifications" });
    }
  });

  // Announcements routes
  app.get("/api/announcements/all", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      // Admins see ALL announcements (drafts + published)
      const announcements = await storage.getAllAnnouncements();
      
      res.json(announcements);
    } catch (error) {
      console.error("Failed to fetch all announcements:", error);
      res.status(500).json({ error: "Failed to fetch all announcements" });
    }
  });

  app.get("/api/announcements", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const announcements = await storage.getAnnouncements(req.session.userId);
      res.json(announcements);
    } catch (error) {
      console.error("Failed to fetch announcements:", error);
      res.status(500).json({ error: "Failed to fetch announcements" });
    }
  });

  app.get("/api/announcements/unread-count", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const count = await storage.getUnreadAnnouncementCount(req.session.userId);
      res.json({ count });
    } catch (error) {
      console.error("Failed to fetch unread announcement count:", error);
      res.status(500).json({ error: "Failed to fetch unread announcement count" });
    }
  });

  app.post("/api/announcements/mark-read", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { announcementId } = req.body;
      if (!announcementId) {
        return res.status(400).json({ error: "announcementId is required" });
      }

      await storage.markAnnouncementAsRead(req.session.userId, announcementId);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to mark announcement as read:", error);
      res.status(500).json({ error: "Failed to mark announcement as read" });
    }
  });

  app.post("/api/announcements/mark-all-read", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      await storage.markAllAnnouncementsAsRead(req.session.userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to mark all announcements as read:", error);
      res.status(500).json({ error: "Failed to mark all announcements as read" });
    }
  });

  app.post("/api/announcements", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const validatedData = insertAnnouncementSchema.parse({
        ...req.body,
        createdBy: req.session.userId,
      });

      const announcement = await storage.createAnnouncement(validatedData);
      res.json(announcement);
    } catch (error) {
      console.error("Failed to create announcement:", error);
      res.status(500).json({ error: "Failed to create announcement" });
    }
  });

  app.patch("/api/announcements/:id", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const updated = await storage.updateAnnouncement(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ error: "Announcement not found" });
      }

      res.json(updated);
    } catch (error) {
      console.error("Failed to update announcement:", error);
      res.status(500).json({ error: "Failed to update announcement" });
    }
  });

  app.patch("/api/announcements/:id/deactivate", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const updated = await storage.deactivateAnnouncement(req.params.id);
      if (!updated) {
        return res.status(404).json({ error: "Announcement not found" });
      }

      res.json(updated);
    } catch (error) {
      console.error("Failed to deactivate announcement:", error);
      res.status(500).json({ error: "Failed to deactivate announcement" });
    }
  });

  app.delete("/api/announcements/:id", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user?.isSuperAdmin) {
        return res.status(403).json({ error: "Super admin access required" });
      }

      await storage.deleteAnnouncement(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete announcement:", error);
      res.status(500).json({ error: "Failed to delete announcement" });
    }
  });

  // Admin Notifications routes (for super admins only)
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

  // ===== Glossary Terms API =====
  
  // Get all glossary terms (public endpoint, no auth required)
  app.get("/api/glossary", async (req, res) => {
    try {
      const terms = await db.select().from(glossaryTerms).orderBy(glossaryTerms.term);
      res.json(terms);
    } catch (error) {
      console.error("Failed to fetch glossary terms:", error);
      res.status(500).json({ error: "Failed to fetch glossary terms" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
