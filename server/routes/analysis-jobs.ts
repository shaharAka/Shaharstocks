import type { Express } from "express";
import { storage } from "../storage";

export function registerAnalysisJobsRoutes(app: Express) {
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

  // Reset/cancel stuck analysis jobs for a ticker
  app.post("/api/analysis-jobs/reset/:ticker", async (req, res) => {
    try {
      const ticker = req.params.ticker.toUpperCase();
      
      console.log(`[Queue API] Resetting stuck jobs for ticker: ${ticker}`);
      
      // Cancel any pending/processing jobs for this ticker
      await storage.cancelAnalysisJobsForTicker(ticker);
      
      // Reset the analysis phase flags on the stock
      await storage.resetStockAnalysisPhaseFlags(ticker);
      
      res.json({ 
        success: true, 
        message: `Reset analysis jobs for ${ticker}. You can now trigger a new analysis.` 
      });
    } catch (error) {
      console.error("[Queue API] Error resetting jobs:", error);
      res.status(500).json({ error: "Failed to reset analysis jobs" });
    }
  });
}

