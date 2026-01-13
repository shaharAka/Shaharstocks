import type { Express } from "express";
import { storage } from "../storage";
import { insertBacktestSchema } from "@shared/schema";
import { backtestService } from "../backtestService";

export function registerBacktestRoutes(app: Express) {
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
      const validatedData = insertBacktestSchema.parse({
        name,
        ruleId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        initialCapital: initialCapital?.toString(),
      });
      const backtest = await storage.createBacktest(validatedData);
      res.status(201).json(backtest);
    } catch (error) {
      res.status(400).json({ error: "Invalid backtest data" });
    }
  });

  // Backtest Jobs routes
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
}

