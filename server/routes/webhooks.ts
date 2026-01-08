import type { Express } from "express";
import { storage } from "../storage";
import { webhookRateLimiter } from "../middleware/rateLimiter";
import { verifyPayPalWebhook } from "../paypalService";
import { notifySuperAdminsFirstPayment } from "../emailService";
import { fetchInitialDataForUser } from "./utils";

export function registerWebhookRoutes(app: Express) {
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

          // Send email notification to super admins for first payment (fire and forget)
          // Only notify if this is TRULY the first payment:
          // - User was on trial or pending verification (not cancelled/expired)
          // - User has never had a PayPal subscription before (prevents reactivation spam)
          const isFirstPayment = !user.paypalSubscriptionId && 
            (user.subscriptionStatus === "trial" || user.subscriptionStatus === "pending_verification");
          
          if (isFirstPayment) {
            storage.getSuperAdminUsers().then(async (superAdmins) => {
              const adminEmails = superAdmins.map(a => a.email);
              if (adminEmails.length > 0) {
                await notifySuperAdminsFirstPayment({
                  adminEmails,
                  userName: user.name,
                  userEmail: user.email,
                  amount: "$9.99/month", // Standard subscription price
                  subscriptionId,
                });
              }
            }).catch(err => console.error("Failed to notify super admins of first payment:", err));
          }

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
}

