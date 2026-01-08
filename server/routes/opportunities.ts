import type { Express } from "express";
import { storage } from "../storage";

export function registerOpportunitiesRoutes(app: Express) {
  app.get("/api/opportunities", async (req, res) => {
    try {
      if (!req.session?.userId) {
        console.log('[Opportunities] Not authenticated - no session userId');
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        console.log('[Opportunities] User not found for id:', req.session.userId);
        return res.status(401).json({ error: "User not found" });
      }
      
      // Determine cadence based on subscription tier
      // Pro = active subscription, trial users also get pro access during trial period
      const isPro = user.subscriptionStatus === 'active' || 
                    (user.subscriptionStatus === 'trial' && user.trialEndsAt && new Date(user.trialEndsAt) > new Date());
      const cadence = isPro ? 'all' : 'daily'; // Pro users see all opportunities (daily + hourly), free users only daily
      
      console.log(`[Opportunities] User ${user.email}, tier: ${isPro ? 'pro' : 'free'}, cadence: ${cadence}`);
      
      // Fetch opportunities filtered by user rejections
      const opportunities = await storage.getOpportunities({
        cadence: cadence as 'daily' | 'hourly' | 'all',
        userId: req.session.userId
      });
      
      console.log(`[Opportunities] Returning ${opportunities.length} opportunities`);
      
      res.json({
        opportunities,
        tier: isPro ? 'pro' : 'free',
        cadence
      });
    } catch (error) {
      console.error("Get opportunities error:", error);
      res.status(500).json({ error: "Failed to fetch opportunities" });
    }
  });

  // Get user's rejected opportunities - MUST be before :id route
  app.get("/api/opportunities/user/rejections", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const rejections = await storage.getUserRejections(req.session.userId);
      res.json(rejections);
    } catch (error) {
      console.error("Get rejections error:", error);
      res.status(500).json({ error: "Failed to fetch rejections" });
    }
  });
  
  // Get latest opportunity batch info (for countdown timer) - MUST be before :id route
  app.get("/api/opportunities/latest-batch", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }
      
      // Determine user tier
      const isPro = user.subscriptionStatus === 'active' || 
                    (user.subscriptionStatus === 'trial' && user.trialEndsAt && new Date(user.trialEndsAt) > new Date());
      
      // Get latest batch based on user tier (pro gets most recent of any type, free gets latest daily)
      const latestBatch = isPro 
        ? await storage.getLatestBatch('hourly') ?? await storage.getLatestBatch('daily')
        : await storage.getLatestBatch('daily');
      
      if (!latestBatch) {
        return res.json({ fetchedAt: new Date().toISOString(), cadence: isPro ? 'hourly' : 'daily', opportunityCount: 0 });
      }
      
      const fetchedAtStr = latestBatch.fetchedAt instanceof Date 
        ? latestBatch.fetchedAt.toISOString() 
        : latestBatch.fetchedAt;
      
      // Extract stats from metadata (Drizzle may return JSONB as string)
      let metadata = latestBatch.metadata;
      if (typeof metadata === 'string') {
        try {
          metadata = JSON.parse(metadata);
        } catch (e) {
          console.error('[LatestBatch] Failed to parse metadata:', e);
          metadata = null;
        }
      }
      const stats = metadata?.stats;
      console.log(`[LatestBatch] Batch ${latestBatch.id}, parsed metadata:`, metadata, 'stats:', stats);
      
      // Get queue stats to show active processing status
      const queueStats = await storage.getQueueStats();
      const isProcessing = queueStats.pending > 0 || queueStats.processing > 0;
      
      res.json({
        id: latestBatch.id,
        cadence: latestBatch.cadence,
        fetchedAt: fetchedAtStr,
        opportunityCount: latestBatch.count,
        stats: stats ? {
          added: stats.added,
          rejected: stats.rejected,
          duplicates: stats.duplicates
        } : undefined,
        queueStats: {
          pending: queueStats.pending,
          processing: queueStats.processing,
          isProcessing
        }
      });
    } catch (error) {
      console.error("Get latest batch error:", error);
      res.status(500).json({ error: "Failed to fetch latest batch info" });
    }
  });
  
  // Get single opportunity by ID - MUST be after specific routes
  app.get("/api/opportunities/:id", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const opportunity = await storage.getOpportunity(req.params.id);
      if (!opportunity) {
        return res.status(404).json({ error: "Opportunity not found" });
      }
      
      // Check if user rejected this opportunity
      const isRejected = await storage.isOpportunityRejected(req.session.userId, req.params.id);
      
      res.json({ ...opportunity, isRejected });
    } catch (error) {
      console.error("Get opportunity error:", error);
      res.status(500).json({ error: "Failed to fetch opportunity" });
    }
  });
  
  // Reject an opportunity (hide from user's view)
  app.post("/api/opportunities/:id/reject", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const opportunity = await storage.getOpportunity(req.params.id);
      if (!opportunity) {
        return res.status(404).json({ error: "Opportunity not found" });
      }
      
      const rejection = await storage.rejectOpportunity(req.session.userId, req.params.id);
      res.json({ success: true, rejection });
    } catch (error) {
      console.error("Reject opportunity error:", error);
      res.status(500).json({ error: "Failed to reject opportunity" });
    }
  });
  
  // Unreject an opportunity (restore to user's view)
  app.delete("/api/opportunities/:id/reject", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const success = await storage.unrejectOpportunity(req.session.userId, req.params.id);
      res.json({ success });
    } catch (error) {
      console.error("Unreject opportunity error:", error);
      res.status(500).json({ error: "Failed to unreject opportunity" });
    }
  });
}

