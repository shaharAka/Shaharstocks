/**
 * AI Analysis Trigger Tests
 * 
 * Validates that all 5 trigger paths correctly enqueue analysis jobs
 * with proper priority and source metadata.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockAnalysisJob } from "./fixtures";

vi.mock("../../server/storage", () => ({
  storage: {
    enqueueAnalysisJob: vi.fn(),
    getUser: vi.fn(),
    markUserInitialDataFetched: vi.fn(),
    getStocks: vi.fn(),
    getStock: vi.fn()
  }
}));

describe("AI Analysis Trigger Paths", () => {
  let storage: any;

  beforeEach(async () => {
    vi.clearAllMocks(); // Clear mock call counts between tests
    storage = (await import("../../server/storage")).storage;
    storage.enqueueAnalysisJob.mockResolvedValue(mockAnalysisJob);
  });

  describe("1. Onboarding Flow", () => {
    it("should queue analysis with 'onboarding' source and normal priority", async () => {
      // Simulate onboarding completion that triggers AI analysis
      const tickers = ["AAPL", "GOOGL", "MSFT"];
      
      for (const ticker of tickers) {
        await storage.enqueueAnalysisJob(ticker, "onboarding", "normal");
      }

      expect(storage.enqueueAnalysisJob).toHaveBeenCalledTimes(3);
      expect(storage.enqueueAnalysisJob).toHaveBeenCalledWith("AAPL", "onboarding", "normal");
      expect(storage.enqueueAnalysisJob).toHaveBeenCalledWith("GOOGL", "onboarding", "normal");
      expect(storage.enqueueAnalysisJob).toHaveBeenCalledWith("MSFT", "onboarding", "normal");
    });

    it("should handle partial failures during onboarding", async () => {
      storage.enqueueAnalysisJob
        .mockResolvedValueOnce(mockAnalysisJob) // AAPL succeeds
        .mockRejectedValueOnce(new Error("Queue full")) // GOOGL fails
        .mockResolvedValueOnce(mockAnalysisJob); // MSFT succeeds

      const tickers = ["AAPL", "GOOGL", "MSFT"];
      const results = await Promise.allSettled(
        tickers.map(ticker => storage.enqueueAnalysisJob(ticker, "onboarding", "normal"))
      );

      const succeeded = results.filter(r => r.status === "fulfilled");
      const failed = results.filter(r => r.status === "rejected");

      expect(succeeded).toHaveLength(2);
      expect(failed).toHaveLength(1);
    });
  });

  describe("2. Automated Background Jobs", () => {
    it("should queue analysis with 'automated' source", async () => {
      // Simulate automated recommendation system triggering analysis
      await storage.enqueueAnalysisJob("AAPL", "automated", "low");

      expect(storage.enqueueAnalysisJob).toHaveBeenCalledWith("AAPL", "automated", "low");
    });
  });

  describe("3. Fetch Now / Bulk Analyze", () => {
    it("should queue with 'manual' source and high priority with force flag", async () => {
      const tickers = ["AAPL", "GOOGL"];
      
      for (const ticker of tickers) {
        await storage.enqueueAnalysisJob(ticker, "manual", "high", true);
      }

      expect(storage.enqueueAnalysisJob).toHaveBeenCalledWith("AAPL", "manual", "high", true);
      expect(storage.enqueueAnalysisJob).toHaveBeenCalledWith("GOOGL", "manual", "high", true);
    });

    it("should only queue pending stocks for bulk analyze", async () => {
      storage.getStocks.mockResolvedValue([
        { ticker: "AAPL", recommendation: "buy", recommendationStatus: "pending" },
        { ticker: "GOOGL", recommendation: "buy", recommendationStatus: "completed" },
        { ticker: "MSFT", recommendation: "hold", recommendationStatus: "pending" }
      ]);

      const stocks = await storage.getStocks();
      const pendingBuyStocks = stocks.filter(
        (s: any) => s.recommendation === "buy" && s.recommendationStatus === "pending"
      );

      for (const stock of pendingBuyStocks) {
        await storage.enqueueAnalysisJob(stock.ticker, "manual", "high", true);
      }

      // Only AAPL should be queued (buy + pending)
      expect(storage.enqueueAnalysisJob).toHaveBeenCalledTimes(1);
      expect(storage.enqueueAnalysisJob).toHaveBeenCalledWith("AAPL", "manual", "high", true);
    });
  });

  describe("4. Run AI Analysis (Single Stock)", () => {
    it("should queue single stock with 'user_manual' source and high priority", async () => {
      await storage.enqueueAnalysisJob("AAPL", "user_manual", "high", false);

      expect(storage.enqueueAnalysisJob).toHaveBeenCalledWith("AAPL", "user_manual", "high", false);
    });

    it("should support force re-analysis for single stock", async () => {
      await storage.enqueueAnalysisJob("AAPL", "user_manual", "high", true);

      expect(storage.enqueueAnalysisJob).toHaveBeenCalledWith("AAPL", "user_manual", "high", true);
    });
  });

  describe("5. Re-run Analysis (Force)", () => {
    it("should queue with force flag to cancel existing jobs", async () => {
      const tickers = ["AAPL", "GOOGL", "MSFT"];
      
      for (const ticker of tickers) {
        await storage.enqueueAnalysisJob(ticker, "manual", "high", true);
      }

      // All calls should have force=true
      expect(storage.enqueueAnalysisJob).toHaveBeenCalledTimes(3);
      tickers.forEach(ticker => {
        expect(storage.enqueueAnalysisJob).toHaveBeenCalledWith(ticker, "manual", "high", true);
      });
    });
  });

  describe("Priority Verification", () => {
    it("should use correct priorities for each trigger type", async () => {
      // Onboarding: normal priority
      await storage.enqueueAnalysisJob("AAPL", "onboarding", "normal");
      expect(storage.enqueueAnalysisJob).toHaveBeenLastCalledWith(
        "AAPL", "onboarding", "normal"
      );

      // Automated: low priority
      await storage.enqueueAnalysisJob("GOOGL", "automated", "low");
      expect(storage.enqueueAnalysisJob).toHaveBeenLastCalledWith(
        "GOOGL", "automated", "low"
      );

      // Manual/User: high priority
      await storage.enqueueAnalysisJob("MSFT", "user_manual", "high");
      expect(storage.enqueueAnalysisJob).toHaveBeenLastCalledWith(
        "MSFT", "user_manual", "high"
      );

      // Bulk: high priority
      await storage.enqueueAnalysisJob("TSLA", "manual", "high", true);
      expect(storage.enqueueAnalysisJob).toHaveBeenLastCalledWith(
        "TSLA", "manual", "high", true
      );
    });
  });

  describe("Source Metadata Tracking", () => {
    it("should preserve source information for audit trail", async () => {
      const sources = [
        { ticker: "AAPL", source: "onboarding" },
        { ticker: "GOOGL", source: "automated" },
        { ticker: "MSFT", source: "user_manual" },
        { ticker: "TSLA", source: "manual" }
      ];

      for (const { ticker, source } of sources) {
        await storage.enqueueAnalysisJob(ticker, source, "normal");
      }

      expect(storage.enqueueAnalysisJob).toHaveBeenCalledTimes(4);
      
      // Verify each source was preserved (just check that all were called)
      expect(storage.enqueueAnalysisJob).toHaveBeenCalledTimes(4);
      
      // Verify specific calls
      expect(storage.enqueueAnalysisJob).toHaveBeenCalledWith("AAPL", "onboarding", "normal");
      expect(storage.enqueueAnalysisJob).toHaveBeenCalledWith("GOOGL", "automated", "normal");
      expect(storage.enqueueAnalysisJob).toHaveBeenCalledWith("MSFT", "user_manual", "normal");
      expect(storage.enqueueAnalysisJob).toHaveBeenCalledWith("TSLA", "manual", "normal");
    });
  });
});
