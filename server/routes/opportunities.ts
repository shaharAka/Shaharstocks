import type { Express } from "express";
import { storage } from "../storage";
import { verifyFirebaseToken } from "../middleware/firebaseAuth";
import { db } from "../db";
import { aiAnalysisJobs, opportunities } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export function registerOpportunitiesRoutes(app: Express) {
  app.get("/api/opportunities", verifyFirebaseToken, async (req, res) => {
    try {
      if (!req.user) {
        console.log('[Opportunities] Not authenticated - no user');
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const user = await storage.getUser(req.user.userId);
      if (!user) {
        console.log('[Opportunities] User not found for id:', req.user.userId);
        return res.status(401).json({ error: "User not found" });
      }
      
      // Determine cadence based on subscription tier
      // Basic/Trial = daily updates only
      // Pro = hourly updates only (not daily, not realtime)
      // Admin = realtime SEC opportunities only (regardless of subscription)
      const isPro = user.subscriptionStatus === 'pro';
      const isAdmin = user.isAdmin || user.isSuperAdmin;
      
      // Determine cadence for each tier
      const cadence = isAdmin ? 'realtime' : (isPro ? 'hourly' : 'daily');
      
      // Fetch opportunities filtered by cadence and user rejections
      const opportunities = await storage.getOpportunities({
        cadence: cadence as 'daily' | 'hourly' | 'realtime',
        userId: req.user.userId,
        includeBriefs: true
      });
      
      console.log(`[Opportunities] User ${user.email}, tier: ${isPro ? 'pro' : 'basic'}, admin: ${isAdmin}, cadence: ${cadence}, opportunities: ${opportunities.length}`);
      
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
  app.get("/api/opportunities/user/rejections", verifyFirebaseToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const rejections = await storage.getUserRejections(req.user.userId);
      res.json(rejections);
    } catch (error) {
      console.error("Get rejections error:", error);
      res.status(500).json({ error: "Failed to fetch rejections" });
    }
  });
  
  // Get latest opportunity batch info (for countdown timer) - MUST be before :id route
  app.get("/api/opportunities/latest-batch", verifyFirebaseToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const user = await storage.getUser(req.user.userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }
      
      // Determine user tier
      // Basic/Trial = daily updates only
      // Pro = hourly updates only
      // Admin = realtime SEC opportunities only
      const isPro = user.subscriptionStatus === 'pro';
      const isAdmin = user.isAdmin || user.isSuperAdmin;
      const cadence = isAdmin ? 'realtime' : (isPro ? 'hourly' : 'daily');
      
      // Get the latest batch for the user's cadence tier
      let latestBatch: any;
      if (isAdmin) {
        // Admin: get latest realtime batch (SEC poller creates these)
        latestBatch = await storage.getLatestBatch('realtime') || await storage.getLatestBatchWithStats();
      } else if (isPro) {
        // Pro: get latest hourly batch
        latestBatch = await storage.getLatestBatch('hourly');
      } else {
        // Basic/Trial: get latest daily batch
        latestBatch = await storage.getLatestBatch('daily');
      }
      
      if (!latestBatch) {
        return res.json({ fetchedAt: new Date().toISOString(), cadence, opportunityCount: 0 });
      }
      
      // If admin got a non-realtime batch, try to find a realtime one
      if (isAdmin && latestBatch.cadence !== 'realtime') {
        const realtimeBatch = await storage.getLatestBatch('realtime');
        if (realtimeBatch) {
          latestBatch = realtimeBatch;
        }
      }
      
      if (!latestBatch) {
        return res.json({ fetchedAt: new Date().toISOString(), cadence, opportunityCount: 0 });
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
      
      // Calculate queue stats - show batch-specific jobs
      const batchPending = await storage.countOpportunitiesByBatchPending(latestBatch.id);
      const batchAnalyzing = await storage.countOpportunitiesByBatchAnalyzing(latestBatch.id);
      const batchInQueue = batchPending + batchAnalyzing;
      
      // Get all opportunities from this batch
      const batchOpportunities = await db
        .select()
        .from(opportunities)
        .where(eq(opportunities.batchId, latestBatch.id));
      
      // Count opportunities added to board (score >= 70)
      const addedToBoard = await storage.countOpportunitiesByBatchWithScore(latestBatch.id, 70);
      
      // Count opportunities rejected by score (score < 70)
      const rejectedStillInDb = await storage.countOpportunitiesByBatchRejectedByScore(latestBatch.id, 70);
      
      // Calculate detailed stats for logging
      const fetched = latestBatch.count; // Total transactions fetched from OpenInsider
      const preFilterRejected = stats?.rejected ?? 0; // Rejected by initial filters (market cap, no quote)
      const duplicates = stats?.duplicates ?? 0; // Duplicates skipped
      const batchAdded = stats?.added ?? 0; // Opportunities created (after pre-filters)
      const currentInBatch = batchOpportunities.length;
      const estimatedDeleted = Math.max(0, batchAdded - currentInBatch - addedToBoard);
      const rejectedByScore = rejectedStillInDb + estimatedDeleted; // Low score rejections
      
      // Detailed logging for debugging
      console.log(`[LatestBatch] Batch ${latestBatch.id} detailed stats:`);
      console.log(`  • Fetched: ${fetched} transactions from OpenInsider`);
      console.log(`  • Pre-filter rejected: ${preFilterRejected} (market cap/no quote)`);
      console.log(`  • Duplicates skipped: ${duplicates}`);
      console.log(`  • Created: ${batchAdded} opportunities (after pre-filters)`);
      console.log(`  • In queue: ${batchInQueue} (${batchPending} pending, ${batchAnalyzing} processing)`);
      console.log(`  • Added to board: ${addedToBoard} (score >= 70)`);
      console.log(`  • Rejected by score: ${rejectedByScore} (${rejectedStillInDb} in DB, ${estimatedDeleted} deleted)`);
      console.log(`  • Total rejected: ${preFilterRejected + rejectedByScore} (pre-filter + low score)`);
      
      // Simplified stats for frontend popup
      const totalRejected = preFilterRejected + rejectedByScore;
      
      res.json({
        id: latestBatch.id,
        cadence: latestBatch.cadence,
        fetchedAt: fetchedAtStr,
        opportunityCount: latestBatch.count,
        stats: {
          fetched: fetched, // Total transactions fetched
          inQueue: batchInQueue, // Opportunities in analysis queue
          rejected: totalRejected, // All rejections (pre-filter + low score)
          addedToBoard: addedToBoard, // Opportunities with score >= 70
        },
        queueStats: {
          pending: batchPending,
          processing: batchAnalyzing,
          isProcessing: batchInQueue > 0
        }
      });
    } catch (error) {
      console.error("Get latest batch error:", error);
      res.status(500).json({ error: "Failed to fetch latest batch info" });
    }
  });
  
  // Get single opportunity by ID - MUST be after specific routes
  app.get("/api/opportunities/:id", verifyFirebaseToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const opportunity = await storage.getOpportunity(req.params.id);
      if (!opportunity) {
        return res.status(404).json({ error: "Opportunity not found" });
      }
      
      // Check if user rejected this opportunity
      const isRejected = await storage.isOpportunityRejected(req.user.userId, req.params.id);
      
      res.json({ ...opportunity, isRejected });
    } catch (error) {
      console.error("Get opportunity error:", error);
      res.status(500).json({ error: "Failed to fetch opportunity" });
    }
  });
  
  // Reject an opportunity (hide from user's view)
  app.post("/api/opportunities/:id/reject", verifyFirebaseToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const opportunity = await storage.getOpportunity(req.params.id);
      if (!opportunity) {
        return res.status(404).json({ error: "Opportunity not found" });
      }
      
      const rejection = await storage.rejectOpportunity(req.user.userId, req.params.id);
      res.json({ success: true, rejection });
    } catch (error) {
      console.error("Reject opportunity error:", error);
      res.status(500).json({ error: "Failed to reject opportunity" });
    }
  });
  
  // Unreject an opportunity (restore to user's view)
  app.delete("/api/opportunities/:id/reject", verifyFirebaseToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const success = await storage.unrejectOpportunity(req.user.userId, req.params.id);
      res.json({ success });
    } catch (error) {
      console.error("Unreject opportunity error:", error);
      res.status(500).json({ error: "Failed to unreject opportunity" });
    }
  });
}

