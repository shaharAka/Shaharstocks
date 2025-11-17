/**
 * Queue Worker AI Analysis Tests
 * 
 * Validates that the queue worker correctly executes both micro and macro analysis
 * for all trigger paths and properly integrates the scores.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { AiAnalysisJob } from "@shared/schema";
import {
  mockCompanyOverview,
  mockBalanceSheet,
  mockIncomeStatement,
  mockCashFlow,
  mockDailyPrices,
  mockTechnicalIndicators,
  mockNewsSentiment,
  mockSECFilings,
  mockComprehensiveFundamentals,
  mockMicroAnalysis,
  mockMacroAnalysis,
  mockMacroAnalysisGeneral,
  mockAnalysisJob
} from "./fixtures";

// Mock all external services
vi.mock("../../server/storage", () => ({
  storage: {
    getStock: vi.fn(),
    getAnyStockForTicker: vi.fn(), // Global: Get any stock for ticker (metadata extraction)
    getAllStocksForTickerGlobal: vi.fn(), // Global: Get all users' stocks for ticker (AI aggregation)
    getLatestMacroAnalysis: vi.fn(),
    createMacroAnalysis: vi.fn(),
    saveStockAnalysis: vi.fn(),
    markStockAnalysisPhaseComplete: vi.fn(), // Added for phase completion tracking
    updateJobStatus: vi.fn(),
    dequeueNextJob: vi.fn()
  }
}));

vi.mock("../../server/stockService", () => ({
  stockService: {
    getCompanyOverview: vi.fn(),
    getBalanceSheet: vi.fn(),
    getIncomeStatement: vi.fn(),
    getCashFlow: vi.fn(),
    getDailyPrices: vi.fn(),
    getTechnicalIndicators: vi.fn(),
    getNewsSentiment: vi.fn(),
    analyzePriceNewsCorrelation: vi.fn(),
    getComprehensiveFundamentals: vi.fn()
  }
}));

vi.mock("../../server/secEdgarService", () => ({
  secEdgarService: {
    getCompanyFilingData: vi.fn()
  }
}));

vi.mock("../../server/aiAnalysisService", () => ({
  aiAnalysisService: {
    analyzeStock: vi.fn()
  }
}));

vi.mock("../../server/macroAgentService", () => ({
  runMacroAnalysis: vi.fn()
}));

describe("QueueWorker - AI Analysis Pipeline", () => {
  let storage: any;
  let stockService: any;
  let secEdgarService: any;
  let aiAnalysisService: any;
  let macroAgentService: any;

  beforeEach(async () => {
    // Get mocked services
    storage = (await import("../../server/storage")).storage;
    stockService = (await import("../../server/stockService")).stockService;
    secEdgarService = (await import("../../server/secEdgarService")).secEdgarService;
    aiAnalysisService = (await import("../../server/aiAnalysisService")).aiAnalysisService;
    macroAgentService = await import("../../server/macroAgentService");

    // Setup default mock implementations
    storage.getStock.mockResolvedValue({
      ticker: "AAPL",
      industry: "Computer Hardware",
      currentPrice: "185.50",
      recommendation: "buy"
    });
    storage.getAnyStockForTicker.mockResolvedValue({
      ticker: "AAPL",
      industry: "Computer Hardware",
      currentPrice: "185.50",
      recommendation: "buy"
    });
    storage.getAllStocksForTickerGlobal.mockResolvedValue([]); // No insider trading data by default
    storage.markStockAnalysisPhaseComplete.mockResolvedValue(undefined);

    stockService.getCompanyOverview.mockResolvedValue(mockCompanyOverview);
    stockService.getBalanceSheet.mockResolvedValue(mockBalanceSheet);
    stockService.getIncomeStatement.mockResolvedValue(mockIncomeStatement);
    stockService.getCashFlow.mockResolvedValue(mockCashFlow);
    stockService.getDailyPrices.mockResolvedValue(mockDailyPrices);
    stockService.getTechnicalIndicators.mockResolvedValue(mockTechnicalIndicators);
    stockService.getNewsSentiment.mockResolvedValue(mockNewsSentiment);
    stockService.analyzePriceNewsCorrelation.mockReturnValue({ correlation: 0.65 });
    stockService.getComprehensiveFundamentals.mockResolvedValue(mockComprehensiveFundamentals);
    
    secEdgarService.getCompanyFilingData.mockResolvedValue(mockSECFilings);
    aiAnalysisService.analyzeStock.mockResolvedValue(mockMicroAnalysis);
    storage.getLatestMacroAnalysis.mockResolvedValue(mockMacroAnalysis);
    storage.saveStockAnalysis.mockResolvedValue(undefined);
    storage.updateJobStatus.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Complete Analysis Pipeline", () => {
    it("should fetch all required financial data", async () => {
      const { QueueWorker } = await import("../../server/queueWorker");
      const worker = new (QueueWorker as any)();

      await worker.processJob(mockAnalysisJob);

      // Verify all data sources were fetched
      expect(stockService.getCompanyOverview).toHaveBeenCalledWith("AAPL");
      expect(stockService.getBalanceSheet).toHaveBeenCalledWith("AAPL");
      expect(stockService.getIncomeStatement).toHaveBeenCalledWith("AAPL");
      expect(stockService.getCashFlow).toHaveBeenCalledWith("AAPL");
      expect(stockService.getDailyPrices).toHaveBeenCalledWith("AAPL", 60);
      expect(stockService.getTechnicalIndicators).toHaveBeenCalled();
      expect(stockService.getNewsSentiment).toHaveBeenCalledWith("AAPL");
      expect(stockService.getComprehensiveFundamentals).toHaveBeenCalledWith("AAPL");
    });

    it("should fetch SEC EDGAR filings", async () => {
      const { QueueWorker } = await import("../../server/queueWorker");
      const worker = new (QueueWorker as any)();

      await worker.processJob(mockAnalysisJob);

      expect(secEdgarService.getCompanyFilingData).toHaveBeenCalledWith("AAPL");
    });

    it("should run MICRO agent analysis with complete data", async () => {
      const { QueueWorker } = await import("../../server/queueWorker");
      const worker = new (QueueWorker as any)();

      await worker.processJob(mockAnalysisJob);

      expect(aiAnalysisService.analyzeStock).toHaveBeenCalledWith(
        expect.objectContaining({
          ticker: "AAPL",
          companyOverview: expect.any(Object),
          balanceSheet: expect.any(Object),
          incomeStatement: expect.any(Object),
          cashFlow: expect.any(Object),
          technicalIndicators: expect.any(Object),
          newsSentiment: expect.any(Object),
          priceNewsCorrelation: expect.any(Object),
          secFilings: expect.objectContaining({
            formType: "10-K",
            managementDiscussion: expect.any(String),
            riskFactors: expect.any(String),
            businessOverview: expect.any(String)
          }),
          comprehensiveFundamentals: expect.any(Object)
        })
      );
    });

    it("should get or create industry-specific MACRO analysis", async () => {
      const { QueueWorker } = await import("../../server/queueWorker");
      const worker = new (QueueWorker as any)();

      await worker.processJob(mockAnalysisJob);

      // Should check for existing macro analysis first
      expect(storage.getLatestMacroAnalysis).toHaveBeenCalledWith("Computer Hardware");
    });

    it("should create new MACRO analysis if none exists", async () => {
      storage.getLatestMacroAnalysis.mockResolvedValue(null);
      macroAgentService.runMacroAnalysis.mockResolvedValue({
        industry: "Computer Hardware",
        macroScore: 65,
        macroFactor: 0.95,
        recommendation: "neutral",
        marketCondition: "mixed signals",
        summary: "Market conditions moderately favorable"
      });
      storage.createMacroAnalysis.mockResolvedValue(mockMacroAnalysis);

      const { QueueWorker } = await import("../../server/queueWorker");
      const worker = new (QueueWorker as any)();

      await worker.processJob(mockAnalysisJob);

      expect(macroAgentService.runMacroAnalysis).toHaveBeenCalledWith("Computer Hardware");
      expect(storage.createMacroAnalysis).toHaveBeenCalled();
    });

    it("should calculate integrated score correctly (micro × macro)", async () => {
      storage.getLatestMacroAnalysis.mockResolvedValue(mockMacroAnalysis);

      const { QueueWorker } = await import("../../server/queueWorker");
      const worker = new (QueueWorker as any)();

      await worker.processJob(mockAnalysisJob);

      // microScore: 78, macroFactor: 0.95
      // Expected: 78 × 0.95 = 74.1 → 74
      expect(storage.saveStockAnalysis).toHaveBeenCalledWith(
        expect.objectContaining({
          ticker: "AAPL",
          confidenceScore: 78, // Original micro score
          integratedScore: 74, // Integrated score: 78 × 0.95 = 74
          macroAnalysisId: "macro-123"
        })
      );
    });

    it("should save complete analysis with both micro and macro data", async () => {
      const { QueueWorker } = await import("../../server/queueWorker");
      const worker = new (QueueWorker as any)();

      await worker.processJob(mockAnalysisJob);

      expect(storage.saveStockAnalysis).toHaveBeenCalledWith(
        expect.objectContaining({
          // Micro analysis results
          ticker: "AAPL",
          status: "completed",
          overallRating: "buy",
          confidenceScore: 78,
          summary: expect.any(String),
          financialHealthScore: 82,
          strengths: expect.any(Array),
          weaknesses: expect.any(Array),
          redFlags: expect.any(Array),
          technicalAnalysisScore: 75,
          sentimentAnalysisScore: 72,
          keyMetrics: expect.any(Object),
          risks: expect.any(Array),
          opportunities: expect.any(Array),
          recommendation: expect.any(String),
          // SEC filing data
          secFilingType: "10-K",
          managementDiscussion: expect.any(String),
          riskFactors: expect.any(String),
          businessOverview: expect.any(String),
          // Alpha Vantage fundamentals
          fundamentalData: expect.any(Object),
          // Macro integration
          macroAnalysisId: "macro-123",
          integratedScore: expect.any(Number)
        })
      );
    });

    it("should mark job as completed after successful analysis", async () => {
      const { QueueWorker } = await import("../../server/queueWorker");
      const worker = new (QueueWorker as any)();

      await worker.processJob(mockAnalysisJob);

      expect(storage.updateJobStatus).toHaveBeenCalledWith("job-123", "completed");
    });
  });

  describe("Edge Cases", () => {
    it("should handle missing SEC filings gracefully", async () => {
      secEdgarService.getCompanyFilingData.mockRejectedValue(new Error("SEC filing not found"));

      const { QueueWorker } = await import("../../server/queueWorker");
      const worker = new (QueueWorker as any)();

      await worker.processJob(mockAnalysisJob);

      // Should still complete analysis without SEC data
      expect(aiAnalysisService.analyzeStock).toHaveBeenCalled();
      
      // Verify it was called WITHOUT secFilings
      const callArgs = aiAnalysisService.analyzeStock.mock.calls[0][0];
      expect(callArgs.ticker).toBe("AAPL");
      expect(callArgs.secFilings).toBeUndefined();
      
      expect(storage.saveStockAnalysis).toHaveBeenCalled();
      expect(storage.updateJobStatus).toHaveBeenCalledWith("job-123", "completed");
    });

    it("should handle missing fundamentals gracefully", async () => {
      stockService.getComprehensiveFundamentals.mockRejectedValue(new Error("Fundamentals unavailable"));

      const { QueueWorker } = await import("../../server/queueWorker");
      const worker = new (QueueWorker as any)();

      await worker.processJob(mockAnalysisJob);

      // Should still complete analysis
      expect(aiAnalysisService.analyzeStock).toHaveBeenCalled();
      
      // Verify it was called WITHOUT comprehensiveFundamentals (accepts null or undefined)
      const callArgs = aiAnalysisService.analyzeStock.mock.calls[0][0];
      expect(callArgs.ticker).toBe("AAPL");
      expect(callArgs.comprehensiveFundamentals).toBeFalsy(); // Accepts both null and undefined
      
      expect(storage.updateJobStatus).toHaveBeenCalledWith("job-123", "completed");
    });

    it("should use general market macro when industry is N/A", async () => {
      storage.getStock.mockResolvedValue({
        ticker: "AAPL",
        industry: "N/A",
        currentPrice: "185.50"
      });

      const { QueueWorker } = await import("../../server/queueWorker");
      const worker = new (QueueWorker as any)();

      await worker.processJob(mockAnalysisJob);

      // Should request macro analysis with undefined industry (general market)
      expect(storage.getLatestMacroAnalysis).toHaveBeenCalledWith(undefined);
    });

    it("should clamp integrated score to 0-100 range", async () => {
      // Test upper bound
      aiAnalysisService.analyzeStock.mockResolvedValue({
        ...mockMicroAnalysis,
        confidenceScore: 95
      });
      storage.getLatestMacroAnalysis.mockResolvedValue({
        ...mockMacroAnalysis,
        macroFactor: "1.5" // Would result in 142.5
      });

      const { QueueWorker } = await import("../../server/queueWorker");
      const worker = new (QueueWorker as any)();

      await worker.processJob(mockAnalysisJob);

      expect(storage.saveStockAnalysis).toHaveBeenCalledWith(
        expect.objectContaining({
          integratedScore: 100 // Clamped to max
        })
      );
    });

    it("should handle retry on failure", async () => {
      stockService.getCompanyOverview.mockRejectedValue(new Error("API rate limit exceeded"));

      const { QueueWorker } = await import("../../server/queueWorker");
      const worker = new (QueueWorker as any)();

      const jobWithRetries = { ...mockAnalysisJob, retryCount: 0, maxRetries: 3 };

      await worker.processJob(jobWithRetries);

      // Should schedule retry
      expect(storage.updateJobStatus).toHaveBeenCalledWith(
        "job-123",
        "pending",
        expect.objectContaining({
          retryCount: 1,
          scheduledAt: expect.any(Date),
          errorMessage: expect.any(String)
        })
      );
    });

    it("should mark as failed after max retries", async () => {
      stockService.getCompanyOverview.mockRejectedValue(new Error("Permanent failure"));

      const { QueueWorker } = await import("../../server/queueWorker");
      const worker = new (QueueWorker as any)();

      const exhaustedJob = { ...mockAnalysisJob, retryCount: 3, maxRetries: 3 };

      await worker.processJob(exhaustedJob);

      expect(storage.updateJobStatus).toHaveBeenCalledWith(
        "job-123",
        "failed",
        expect.objectContaining({
          errorMessage: expect.any(String)
        })
      );
    });
  });

  describe("Data Completeness Validation", () => {
    it("should include ALL micro agent data sources", async () => {
      const { QueueWorker } = await import("../../server/queueWorker");
      const worker = new (QueueWorker as any)();

      await worker.processJob(mockAnalysisJob);

      const microCallArgs = aiAnalysisService.analyzeStock.mock.calls[0][0];

      // Verify all expected data is present
      expect(microCallArgs).toEqual(
        expect.objectContaining({
          ticker: "AAPL",
          companyOverview: mockCompanyOverview,
          balanceSheet: mockBalanceSheet,
          incomeStatement: mockIncomeStatement,
          cashFlow: mockCashFlow,
          technicalIndicators: mockTechnicalIndicators,
          newsSentiment: mockNewsSentiment,
          priceNewsCorrelation: { correlation: 0.65 },
          insiderTradingStrength: expect.any(Object),
          secFilings: expect.objectContaining({
            formType: "10-K",
            filingDate: "2023-11-01",
            managementDiscussion: expect.any(String),
            riskFactors: expect.any(String),
            businessOverview: expect.any(String)
          }),
          comprehensiveFundamentals: mockComprehensiveFundamentals
        })
      );
    });

    it("should include macro analysis in saved results", async () => {
      const { QueueWorker } = await import("../../server/queueWorker");
      const worker = new (QueueWorker as any)();

      await worker.processJob(mockAnalysisJob);

      expect(storage.saveStockAnalysis).toHaveBeenCalledWith(
        expect.objectContaining({
          macroAnalysisId: mockMacroAnalysis.id,
          integratedScore: expect.any(Number)
        })
      );
    });
  });
});
