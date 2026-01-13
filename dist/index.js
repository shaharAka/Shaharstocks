var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc19) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc19 = __getOwnPropDesc(from, key)) || desc19.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  adminNotifications: () => adminNotifications,
  aiAnalysisJobs: () => aiAnalysisJobs,
  announcementReads: () => announcementReads,
  announcements: () => announcements,
  backtestJobs: () => backtestJobs,
  backtestPriceData: () => backtestPriceData,
  backtestScenarios: () => backtestScenarios,
  backtests: () => backtests,
  dailyBriefs: () => dailyBriefs,
  featureSuggestions: () => featureSuggestions,
  featureVotes: () => featureVotes,
  followedStocks: () => followedStocks,
  glossaryTerms: () => glossaryTerms,
  ibkrConfig: () => ibkrConfig,
  insertAdminNotificationSchema: () => insertAdminNotificationSchema,
  insertAiAnalysisJobSchema: () => insertAiAnalysisJobSchema,
  insertAnnouncementReadSchema: () => insertAnnouncementReadSchema,
  insertAnnouncementSchema: () => insertAnnouncementSchema,
  insertBacktestJobSchema: () => insertBacktestJobSchema,
  insertBacktestPriceDataSchema: () => insertBacktestPriceDataSchema,
  insertBacktestScenarioSchema: () => insertBacktestScenarioSchema,
  insertBacktestSchema: () => insertBacktestSchema,
  insertCompoundRuleSchema: () => insertCompoundRuleSchema,
  insertDailyBriefSchema: () => insertDailyBriefSchema,
  insertFeatureSuggestionSchema: () => insertFeatureSuggestionSchema,
  insertFeatureVoteSchema: () => insertFeatureVoteSchema,
  insertFollowedStockSchema: () => insertFollowedStockSchema,
  insertGlossaryTermSchema: () => insertGlossaryTermSchema,
  insertIbkrConfigSchema: () => insertIbkrConfigSchema,
  insertInsiderProfileSchema: () => insertInsiderProfileSchema,
  insertMacroAnalysisSchema: () => insertMacroAnalysisSchema,
  insertManualOverrideSchema: () => insertManualOverrideSchema,
  insertNotificationSchema: () => insertNotificationSchema,
  insertOpeninsiderConfigSchema: () => insertOpeninsiderConfigSchema,
  insertOpportunityBatchSchema: () => insertOpportunityBatchSchema,
  insertOpportunitySchema: () => insertOpportunitySchema,
  insertPasswordResetTokenSchema: () => insertPasswordResetTokenSchema,
  insertPaymentSchema: () => insertPaymentSchema,
  insertPortfolioHoldingSchema: () => insertPortfolioHoldingSchema,
  insertRuleActionSchema: () => insertRuleActionSchema,
  insertRuleConditionGroupSchema: () => insertRuleConditionGroupSchema,
  insertRuleConditionSchema: () => insertRuleConditionSchema,
  insertRuleExecutionSchema: () => insertRuleExecutionSchema,
  insertStockAnalysisSchema: () => insertStockAnalysisSchema,
  insertStockCandlesticksSchema: () => insertStockCandlesticksSchema,
  insertStockCommentSchema: () => insertStockCommentSchema,
  insertStockSchema: () => insertStockSchema,
  insertStockViewSchema: () => insertStockViewSchema,
  insertSystemSettingsSchema: () => insertSystemSettingsSchema,
  insertTelegramConfigSchema: () => insertTelegramConfigSchema,
  insertTickerDailyBriefSchema: () => insertTickerDailyBriefSchema,
  insertTradeSchema: () => insertTradeSchema,
  insertTradingRuleSchema: () => insertTradingRuleSchema,
  insertUserOpportunityRejectionSchema: () => insertUserOpportunityRejectionSchema,
  insertUserSchema: () => insertUserSchema,
  insertUserStockStatusSchema: () => insertUserStockStatusSchema,
  insertUserTutorialSchema: () => insertUserTutorialSchema,
  insiderProfiles: () => insiderProfiles,
  macroAnalyses: () => macroAnalyses,
  manualOverrides: () => manualOverrides,
  notifications: () => notifications,
  openinsiderConfig: () => openinsiderConfig,
  opportunities: () => opportunities,
  opportunityBatches: () => opportunityBatches,
  opportunitySchema: () => opportunitySchema,
  passwordResetTokens: () => passwordResetTokens,
  payments: () => payments,
  portfolioHoldings: () => portfolioHoldings,
  ruleActions: () => ruleActions,
  ruleConditionGroups: () => ruleConditionGroups,
  ruleConditions: () => ruleConditions,
  ruleExecutions: () => ruleExecutions,
  stockAnalyses: () => stockAnalyses,
  stockCandlesticks: () => stockCandlesticks,
  stockComments: () => stockComments,
  stockSchema: () => stockSchema,
  stockViews: () => stockViews,
  stocks: () => stocks,
  systemSettings: () => systemSettings,
  telegramConfig: () => telegramConfig,
  tickerDailyBriefs: () => tickerDailyBriefs,
  trades: () => trades,
  tradingRules: () => tradingRules,
  userOpportunityRejections: () => userOpportunityRejections,
  userStockStatuses: () => userStockStatuses,
  userTutorials: () => userTutorials,
  users: () => users
});
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, integer, timestamp, boolean, jsonb, uniqueIndex, index } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
var stocks, stockSchema, insertStockSchema, userStockStatuses, insertUserStockStatusSchema, opportunityBatches, insertOpportunityBatchSchema, opportunities, opportunitySchema, insertOpportunitySchema, userOpportunityRejections, insertUserOpportunityRejectionSchema, insiderProfiles, insertInsiderProfileSchema, stockAnalyses, insertStockAnalysisSchema, macroAnalyses, insertMacroAnalysisSchema, stockCandlesticks, insertStockCandlesticksSchema, aiAnalysisJobs, insertAiAnalysisJobSchema, portfolioHoldings, insertPortfolioHoldingSchema, trades, insertTradeSchema, tradingRules, insertTradingRuleSchema, ruleConditionGroups, insertRuleConditionGroupSchema, ruleConditions, insertRuleConditionSchema, ruleActions, insertRuleActionSchema, ruleExecutions, insertRuleExecutionSchema, insertCompoundRuleSchema, users, insertUserSchema, payments, insertPaymentSchema, manualOverrides, insertManualOverrideSchema, passwordResetTokens, insertPasswordResetTokenSchema, userTutorials, insertUserTutorialSchema, stockComments, insertStockCommentSchema, stockViews, insertStockViewSchema, backtests, insertBacktestSchema, telegramConfig, insertTelegramConfigSchema, ibkrConfig, insertIbkrConfigSchema, openinsiderConfig, insertOpeninsiderConfigSchema, backtestJobs, insertBacktestJobSchema, backtestPriceData, insertBacktestPriceDataSchema, backtestScenarios, insertBacktestScenarioSchema, featureSuggestions, insertFeatureSuggestionSchema, featureVotes, insertFeatureVoteSchema, notifications, insertNotificationSchema, announcements, insertAnnouncementSchema, announcementReads, insertAnnouncementReadSchema, adminNotifications, insertAdminNotificationSchema, followedStocks, insertFollowedStockSchema, dailyBriefs, insertDailyBriefSchema, tickerDailyBriefs, insertTickerDailyBriefSchema, glossaryTerms, insertGlossaryTermSchema, systemSettings, insertSystemSettingsSchema;
var init_schema = __esm({
  "shared/schema.ts"() {
    "use strict";
    stocks = pgTable("stocks", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
      // Per-tenant isolation with foreign key
      ticker: text("ticker").notNull(),
      // Removed .unique() to allow multiple transactions per company
      companyName: text("company_name").notNull(),
      currentPrice: decimal("current_price", { precision: 12, scale: 2 }).notNull(),
      // Real-time market price
      previousClose: decimal("previous_close", { precision: 12, scale: 2 }),
      insiderPrice: decimal("insider_price", { precision: 12, scale: 2 }),
      // Price at which insider transacted
      insiderQuantity: integer("insider_quantity"),
      // Number of shares insider transacted
      insiderTradeDate: text("insider_trade_date").notNull(),
      // Date when insider executed the transaction (required for uniqueness)
      insiderName: text("insider_name").notNull(),
      // Name of the insider who executed the transaction (required for uniqueness)
      insiderTitle: text("insider_title"),
      // Title of the insider (CEO, CFO, Director, etc.)
      marketPriceAtInsiderDate: decimal("market_price_at_insider_date", { precision: 12, scale: 2 }),
      // Market closing price on insider transaction date
      marketCap: text("market_cap"),
      peRatio: decimal("pe_ratio", { precision: 10, scale: 2 }),
      recommendation: text("recommendation").notNull(),
      // "buy", "sell" (insider transaction type) - required for uniqueness
      recommendationStatus: text("recommendation_status").default("pending"),
      // "pending", "approved", "rejected" - user review status
      source: text("source"),
      // "telegram" or "openinsider" - data source
      confidenceScore: integer("confidence_score"),
      // 0-100 data quality score - measures reliability of the data source
      priceHistory: jsonb("price_history").$type().default([]),
      // Last 7 days of prices
      // NOTE: Candlestick data moved to shared stockCandlesticks table (one record per ticker, reused across users)
      // Company information from Finnhub
      description: text("description"),
      // Company description/overview
      industry: text("industry"),
      // Company's industry sector
      country: text("country"),
      // Company's country
      webUrl: text("web_url"),
      // Company's website
      ipo: text("ipo"),
      // IPO date
      // Latest news articles
      news: jsonb("news").$type().default([]),
      // Insider sentiment (from Finnhub)
      insiderSentimentMspr: decimal("insider_sentiment_mspr", { precision: 10, scale: 4 }),
      // Monthly Share Purchase Ratio (-1 to 1)
      insiderSentimentChange: decimal("insider_sentiment_change", { precision: 10, scale: 4 }),
      // Change in MSPR from previous month
      microAnalysisCompleted: boolean("micro_analysis_completed").notNull().default(false),
      // Micro agent (fundamental) analysis completed
      macroAnalysisCompleted: boolean("macro_analysis_completed").notNull().default(false),
      // Macro agent (industry/sector) analysis completed
      combinedAnalysisCompleted: boolean("combined_analysis_completed").notNull().default(false),
      // Integrated score calculated
      lastUpdated: timestamp("last_updated").defaultNow(),
      rejectedAt: timestamp("rejected_at")
      // When the recommendation was rejected
    }, (table) => ({
      // Unique constraint: Each transaction is unique per user by ticker + trade date + insider + type
      // This allows the same real-world transaction to exist in multiple users' isolated collections
      transactionUnique: uniqueIndex("stock_transaction_unique_idx").on(
        table.userId,
        table.ticker,
        table.insiderTradeDate,
        table.insiderName,
        table.recommendation
      ),
      // Index on userId for efficient per-tenant queries
      userIdIdx: index("stocks_user_id_idx").on(table.userId)
    }));
    stockSchema = createSelectSchema(stocks);
    insertStockSchema = createInsertSchema(stocks).omit({ id: true, lastUpdated: true, recommendationStatus: true, rejectedAt: true });
    userStockStatuses = pgTable("user_stock_statuses", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      userId: varchar("user_id").notNull(),
      ticker: text("ticker").notNull(),
      status: text("status").notNull().default("pending"),
      // "pending", "approved", "rejected", "dismissed"
      approvedAt: timestamp("approved_at"),
      rejectedAt: timestamp("rejected_at"),
      dismissedAt: timestamp("dismissed_at"),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    }, (table) => ({
      userTickerUnique: uniqueIndex("user_ticker_unique_idx").on(table.userId, table.ticker)
    }));
    insertUserStockStatusSchema = createInsertSchema(userStockStatuses).omit({ id: true, createdAt: true, updatedAt: true });
    opportunityBatches = pgTable("opportunity_batches", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      cadence: text("cadence").notNull(),
      // "daily" or "hourly"
      fetchedAt: timestamp("fetched_at").defaultNow().notNull(),
      count: integer("count").notNull().default(0),
      // Number of opportunities in this batch
      source: text("source").notNull().default("openinsider"),
      // Data source
      metadata: jsonb("metadata").$type()
    });
    insertOpportunityBatchSchema = createInsertSchema(opportunityBatches).omit({ id: true });
    opportunities = pgTable("opportunities", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      batchId: varchar("batch_id").references(() => opportunityBatches.id, { onDelete: "cascade" }),
      // Which fetch batch this came from
      cadence: text("cadence").notNull(),
      // "daily" or "hourly" - determines visibility by tier
      ticker: text("ticker").notNull(),
      companyName: text("company_name").notNull(),
      currentPrice: decimal("current_price", { precision: 12, scale: 2 }).notNull(),
      previousClose: decimal("previous_close", { precision: 12, scale: 2 }),
      insiderPrice: decimal("insider_price", { precision: 12, scale: 2 }),
      insiderQuantity: integer("insider_quantity"),
      insiderTradeDate: text("insider_trade_date").notNull(),
      insiderName: text("insider_name").notNull(),
      insiderTitle: text("insider_title"),
      marketPriceAtInsiderDate: decimal("market_price_at_insider_date", { precision: 12, scale: 2 }),
      marketCap: text("market_cap"),
      peRatio: decimal("pe_ratio", { precision: 10, scale: 2 }),
      recommendation: text("recommendation").notNull(),
      // "buy" or "sell"
      source: text("source"),
      // "telegram" or "openinsider"
      confidenceScore: integer("confidence_score"),
      // 0-100 data quality score
      priceHistory: jsonb("price_history").$type().default([]),
      description: text("description"),
      industry: text("industry"),
      country: text("country"),
      webUrl: text("web_url"),
      ipo: text("ipo"),
      news: jsonb("news").$type().default([]),
      insiderSentimentMspr: decimal("insider_sentiment_mspr", { precision: 10, scale: 4 }),
      insiderSentimentChange: decimal("insider_sentiment_change", { precision: 10, scale: 4 }),
      lastUpdated: timestamp("last_updated").defaultNow(),
      createdAt: timestamp("created_at").defaultNow()
    }, (table) => ({
      // Unique constraint: Each real-world transaction is unique globally
      transactionUnique: uniqueIndex("opportunity_transaction_unique_idx").on(
        table.ticker,
        table.insiderTradeDate,
        table.insiderName,
        table.recommendation
      ),
      // Index for efficient cadence filtering
      cadenceIdx: index("opportunities_cadence_idx").on(table.cadence),
      // Index for ticker lookups
      tickerIdx: index("opportunities_ticker_idx").on(table.ticker)
    }));
    opportunitySchema = createSelectSchema(opportunities);
    insertOpportunitySchema = createInsertSchema(opportunities).omit({ id: true, lastUpdated: true, createdAt: true });
    userOpportunityRejections = pgTable("user_opportunity_rejections", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
      opportunityId: varchar("opportunity_id").notNull().references(() => opportunities.id, { onDelete: "cascade" }),
      rejectedAt: timestamp("rejected_at").defaultNow().notNull()
    }, (table) => ({
      userOpportunityUnique: uniqueIndex("user_opportunity_rejection_unique_idx").on(table.userId, table.opportunityId),
      userIdIdx: index("user_opportunity_rejections_user_id_idx").on(table.userId)
    }));
    insertUserOpportunityRejectionSchema = createInsertSchema(userOpportunityRejections).omit({ id: true, rejectedAt: true });
    insiderProfiles = pgTable("insider_profiles", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      insiderName: text("insider_name").notNull().unique(),
      totalTrades: integer("total_trades").notNull().default(0),
      successfulTrades: integer("successful_trades").notNull().default(0),
      // Trades that resulted in profit
      winLossRatio: decimal("win_loss_ratio", { precision: 5, scale: 2 }),
      // % of successful trades (0-100)
      confidenceScore: integer("confidence_score").notNull().default(50),
      // 0-100 INSIDER TRACK RECORD - calculated from historical win/loss ratio of this specific insider's past trades
      averageReturn: decimal("average_return", { precision: 10, scale: 2 }),
      // Average % return across all trades
      previousDeals: jsonb("previous_deals").$type().default([]),
      lastUpdated: timestamp("last_updated").defaultNow(),
      createdAt: timestamp("created_at").defaultNow()
    });
    insertInsiderProfileSchema = createInsertSchema(insiderProfiles).omit({ id: true, createdAt: true, lastUpdated: true });
    stockAnalyses = pgTable("stock_analyses", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      ticker: text("ticker").notNull().unique(),
      status: text("status").notNull().default("pending"),
      // "pending", "analyzing", "completed", "failed"
      overallRating: text("overall_rating"),
      // "strong_buy", "buy", "hold", "avoid", "strong_avoid"
      confidenceScore: integer("confidence_score"),
      // 0-100 MICRO AGENT overall score - LLM analysis of SEC filings, Alpha Vantage fundamentals, technical indicators, and news sentiment
      summary: text("summary"),
      financialHealthScore: integer("financial_health_score"),
      // 0-100 MICRO AGENT financial health component - LLM assessment of balance sheet, income statement, and cash flow strength
      strengths: jsonb("strengths").$type(),
      weaknesses: jsonb("weaknesses").$type(),
      redFlags: jsonb("red_flags").$type(),
      // Technical Analysis (multi-signal enhancement)
      technicalAnalysisScore: integer("technical_analysis_score"),
      // 0-100
      technicalAnalysisTrend: text("technical_analysis_trend"),
      // "bullish", "bearish", "neutral"
      technicalAnalysisMomentum: text("technical_analysis_momentum"),
      // "strong", "moderate", "weak"
      technicalAnalysisSignals: jsonb("technical_analysis_signals").$type(),
      // Sentiment Analysis (multi-signal enhancement)
      sentimentAnalysisScore: integer("sentiment_analysis_score"),
      // 0-100
      sentimentAnalysisTrend: text("sentiment_analysis_trend"),
      // "positive", "negative", "neutral"
      sentimentAnalysisNewsVolume: text("sentiment_analysis_news_volume"),
      // "high", "medium", "low"
      sentimentAnalysisKeyThemes: jsonb("sentiment_analysis_key_themes").$type(),
      keyMetrics: jsonb("key_metrics").$type(),
      risks: jsonb("risks").$type(),
      opportunities: jsonb("opportunities").$type(),
      recommendation: text("recommendation"),
      analyzedAt: timestamp("analyzed_at"),
      errorMessage: text("error_message"),
      // Error message if analysis failed
      // Entry Timing Assessment (quick turnaround optimization)
      entryTimingStatus: text("entry_timing_status"),
      // "early", "optimal", "late", "missed"
      entryTimingPriceMove: text("entry_timing_price_move"),
      // "+X% or -X% since insider trade"
      entryTimingDaysOld: integer("entry_timing_days_old"),
      // Days since insider trade
      entryTimingAssessment: text("entry_timing_assessment"),
      // 1-sentence timing verdict
      // Sector Analysis
      sectorName: text("sector_name"),
      // Sector name
      sectorOutlook: text("sector_outlook"),
      // "bullish", "bearish", "neutral"
      sectorNote: text("sector_note"),
      // 1-sentence sector context
      // SEC EDGAR Filing Data
      secFilingUrl: text("sec_filing_url"),
      // URL to latest 10-K or 10-Q filing
      secFilingType: text("sec_filing_type"),
      // "10-K", "10-Q", "8-K"
      secFilingDate: text("sec_filing_date"),
      // Date of the filing
      secCik: text("sec_cik"),
      // Company's CIK number for SEC lookups
      // SEC Filing Narrative Sections (extracted text)
      managementDiscussion: text("management_discussion"),
      // MD&A section
      riskFactors: text("risk_factors"),
      // Risk Factors section
      businessOverview: text("business_overview"),
      // Business section
      // Alpha Vantage Fundamental Data (structured financials)
      fundamentalData: jsonb("fundamental_data").$type(),
      fundamentalAnalysis: text("fundamental_analysis"),
      // AI's interpretation of the fundamental data
      // Macro Analysis Integration
      macroAnalysisId: varchar("macro_analysis_id").references(() => macroAnalyses.id),
      // Reference to the macro analysis used
      integratedScore: integer("integrated_score"),
      // Final score combining micro + macro (0-100)
      scoreAdjustment: text("score_adjustment"),
      // Explanation of how macro adjusted the score
      // Rule-based scorecard with per-metric breakdowns for explainable scoring
      scorecard: jsonb("scorecard").$type(),
      scorecardVersion: text("scorecard_version"),
      // Version of scorecard config used (e.g., "1.0")
      // Unified AI Report Fields (Day-0 + Daily Briefs)
      aiPlaybook: text("ai_playbook"),
      // The initial playbook text (merged Day-0 analysis)
      aiStance: text("ai_stance"),
      // Current recommended action: "ENTER", "WATCH", "AVOID"
      currentSignalScore: integer("current_signal_score"),
      // Daily-updated signal score (0-100), may differ from integratedScore
      stopLoss: decimal("stop_loss", { precision: 12, scale: 2 }),
      // Recommended stop loss price level
      profitTarget: decimal("profit_target", { precision: 12, scale: 2 }),
      // Recommended profit target price level
      stopLossPercent: decimal("stop_loss_percent", { precision: 5, scale: 2 }),
      // Stop loss as % below entry (e.g., -7.00)
      profitTargetPercent: decimal("profit_target_percent", { precision: 5, scale: 2 }),
      // Profit target as % above entry (e.g., +15.00)
      lastDailyBriefAt: timestamp("last_daily_brief_at"),
      // When the last daily brief was generated
      createdAt: timestamp("created_at").defaultNow()
    });
    insertStockAnalysisSchema = createInsertSchema(stockAnalyses).omit({ id: true, createdAt: true });
    macroAnalyses = pgTable("macro_analyses", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      industry: text("industry"),
      // Industry/sector being analyzed (e.g., "Banking", "Technology", "Healthcare")
      status: text("status").notNull().default("pending"),
      // "pending", "analyzing", "completed", "failed"
      macroScore: integer("macro_score"),
      // 0-100 overall macro economic health score
      macroFactor: decimal("macro_factor", { precision: 5, scale: 2 }),
      // 0.00-2.00 multiplier for micro scores (e.g., 0.67 = reduce, 1.2 = boost)
      summary: text("summary"),
      // High-level summary of macro conditions
      // Market Indices Data
      sp500Level: decimal("sp500_level", { precision: 12, scale: 2 }),
      sp500Change: decimal("sp500_change", { precision: 10, scale: 2 }),
      // % change
      sp500Trend: text("sp500_trend"),
      // "bullish", "bearish", "neutral"
      vixLevel: decimal("vix_level", { precision: 10, scale: 2 }),
      // Volatility index
      vixInterpretation: text("vix_interpretation"),
      // "low_fear", "moderate_fear", "high_fear", "extreme_fear"
      // Economic Indicators
      economicIndicators: jsonb("economic_indicators").$type(),
      // Sector Analysis
      sectorPerformance: jsonb("sector_performance").$type(),
      // Industry-Specific Sector Analysis (for the opportunity stock's sector)
      industrySectorAnalysis: jsonb("industry_sector_analysis").$type(),
      // Market Conditions
      marketCondition: text("market_condition"),
      // "bull", "bear", "sideways", "volatile"
      marketPhase: text("market_phase"),
      // "early_cycle", "mid_cycle", "late_cycle", "recession"
      riskAppetite: text("risk_appetite"),
      // "high", "moderate", "low"
      // AI Analysis
      keyThemes: jsonb("key_themes").$type(),
      opportunities: jsonb("opportunities").$type(),
      risks: jsonb("risks").$type(),
      recommendation: text("recommendation"),
      // Overall market recommendation
      analyzedAt: timestamp("analyzed_at"),
      errorMessage: text("error_message"),
      createdAt: timestamp("created_at").defaultNow()
    });
    insertMacroAnalysisSchema = createInsertSchema(macroAnalyses).omit({ id: true, createdAt: true });
    stockCandlesticks = pgTable("stock_candlesticks", {
      ticker: text("ticker").primaryKey(),
      // Ticker symbol (e.g., "AAPL")
      candlestickData: jsonb("candlestick_data").$type().notNull().default([]),
      // Last 14 trading days of OHLCV data
      lastUpdated: timestamp("last_updated").defaultNow(),
      createdAt: timestamp("created_at").defaultNow()
    });
    insertStockCandlesticksSchema = createInsertSchema(stockCandlesticks).omit({ createdAt: true });
    aiAnalysisJobs = pgTable("ai_analysis_jobs", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      ticker: text("ticker").notNull(),
      source: text("source").notNull(),
      // "user_manual", "background_job", "bulk_import", etc.
      priority: text("priority").notNull().default("normal"),
      // "high", "normal", "low"
      status: text("status").notNull().default("pending"),
      // "pending", "processing", "completed", "failed", "cancelled"
      retryCount: integer("retry_count").notNull().default(0),
      maxRetries: integer("max_retries").notNull().default(3),
      scheduledAt: timestamp("scheduled_at").defaultNow(),
      // When job should be processed (for delayed retries)
      startedAt: timestamp("started_at"),
      // When processing began
      completedAt: timestamp("completed_at"),
      // When job finished (success or failure)
      errorMessage: text("error_message"),
      // Error details if failed
      currentStep: text("current_step"),
      // Current processing step: "fetching_data", "micro_analysis", "macro_analysis", "calculating_score", "completed"
      stepDetails: jsonb("step_details").$type(),
      lastError: text("last_error"),
      // Detailed error message for the current/last failed step
      createdAt: timestamp("created_at").defaultNow()
    }, (table) => ({
      // Prevent duplicate active jobs for same ticker (race condition prevention)
      // Only one pending OR processing job allowed per ticker at a time
      activeJobUnique: uniqueIndex("active_job_unique_idx").on(table.ticker).where(sql`status IN ('pending', 'processing')`)
    }));
    insertAiAnalysisJobSchema = createInsertSchema(aiAnalysisJobs).omit({
      id: true,
      createdAt: true,
      startedAt: true,
      completedAt: true
    });
    portfolioHoldings = pgTable("portfolio_holdings", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
      ticker: text("ticker").notNull(),
      quantity: integer("quantity").notNull(),
      averagePurchasePrice: decimal("average_purchase_price", { precision: 12, scale: 2 }).notNull(),
      currentValue: decimal("current_value", { precision: 12, scale: 2 }),
      profitLoss: decimal("profit_loss", { precision: 12, scale: 2 }),
      profitLossPercent: decimal("profit_loss_percent", { precision: 10, scale: 2 }),
      isSimulated: boolean("is_simulated").notNull().default(false),
      // Track simulated vs real holdings
      lastUpdated: timestamp("last_updated").defaultNow()
    });
    insertPortfolioHoldingSchema = createInsertSchema(portfolioHoldings).omit({
      id: true,
      currentValue: true,
      profitLoss: true,
      profitLossPercent: true,
      lastUpdated: true
    });
    trades = pgTable("trades", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
      ticker: text("ticker").notNull(),
      type: text("type").notNull(),
      // "buy" or "sell"
      quantity: integer("quantity").notNull(),
      price: decimal("price", { precision: 12, scale: 2 }).notNull(),
      total: decimal("total", { precision: 12, scale: 2 }).notNull(),
      status: text("status").notNull().default("completed"),
      // "pending", "completed", "failed"
      broker: text("broker").default("manual"),
      // "manual", "ibkr"
      ibkrOrderId: text("ibkr_order_id"),
      // IBKR order ID for tracking
      isSimulated: boolean("is_simulated").notNull().default(false),
      // Track simulated vs real trades
      executedAt: timestamp("executed_at").defaultNow(),
      n8nWorkflowId: text("n8n_workflow_id")
    });
    insertTradeSchema = createInsertSchema(trades).omit({
      id: true
    });
    tradingRules = pgTable("trading_rules", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
      // Made nullable during migration
      name: text("name").notNull(),
      enabled: boolean("enabled").notNull().default(true),
      // Scope: "all_holdings", "specific_stock"
      scope: text("scope").notNull().default("all_holdings"),
      ticker: text("ticker"),
      // Only used when scope is "specific_stock"
      priority: integer("priority").notNull().default(1e3),
      // Lower = higher priority
      // Legacy fields for backward compatibility
      conditions: jsonb("conditions").$type(),
      action: text("action"),
      // "buy", "sell", "sell_all", "notify"
      actionParams: jsonb("action_params").$type(),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    insertTradingRuleSchema = createInsertSchema(tradingRules).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    }).extend({
      conditions: z.array(z.object({
        metric: z.string(),
        operator: z.string(),
        value: z.number(),
        logic: z.enum(["AND", "OR"]).optional(),
        baselinePrice: z.number().optional()
      })).optional()
    });
    ruleConditionGroups = pgTable("rule_condition_groups", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      ruleId: varchar("rule_id").notNull().references(() => tradingRules.id, { onDelete: "cascade" }),
      groupOrder: integer("group_order").notNull(),
      // Order of evaluation
      junctionOperator: text("junction_operator"),
      // "AND" or "OR" to connect to NEXT group
      description: text("description"),
      // Human-readable description
      createdAt: timestamp("created_at").defaultNow()
    });
    insertRuleConditionGroupSchema = createInsertSchema(ruleConditionGroups).omit({
      id: true,
      createdAt: true
    });
    ruleConditions = pgTable("rule_conditions", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      groupId: varchar("group_id").notNull().references(() => ruleConditionGroups.id, { onDelete: "cascade" }),
      // Metric types: "price_change_percent", "price_change_from_close_percent", "price_absolute", "days_held"
      metric: text("metric").notNull(),
      // Comparator: ">", "<", ">=", "<=", "=="
      comparator: text("comparator").notNull(),
      threshold: decimal("threshold", { precision: 12, scale: 4 }).notNull(),
      // The value to compare against
      // Time-based fields
      timeframeValue: integer("timeframe_value"),
      // e.g., 10 for "10 days"
      timeframeUnit: text("timeframe_unit"),
      // "days", "hours", "minutes"
      // Optional metadata for future extensibility
      metadata: jsonb("metadata").$type(),
      createdAt: timestamp("created_at").defaultNow()
    });
    insertRuleConditionSchema = createInsertSchema(ruleConditions).omit({
      id: true,
      createdAt: true
    });
    ruleActions = pgTable("rule_actions", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      groupId: varchar("group_id").notNull().references(() => ruleConditionGroups.id, { onDelete: "cascade" }),
      actionOrder: integer("action_order").notNull(),
      // Order of execution within the group
      // Action types: "sell_percentage", "sell_quantity", "sell_all", "notify"
      actionType: text("action_type").notNull(),
      quantity: integer("quantity"),
      // For sell_quantity
      percentage: decimal("percentage", { precision: 5, scale: 2 }),
      // For sell_percentage (0-100)
      allowRepeat: boolean("allow_repeat").notNull().default(false),
      // Can this action trigger multiple times?
      cooldownMinutes: integer("cooldown_minutes"),
      // Minimum time between repeated executions
      createdAt: timestamp("created_at").defaultNow()
    });
    insertRuleActionSchema = createInsertSchema(ruleActions).omit({
      id: true,
      createdAt: true
    });
    ruleExecutions = pgTable("rule_executions", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      ruleId: varchar("rule_id").notNull().references(() => tradingRules.id, { onDelete: "cascade" }),
      ticker: text("ticker").notNull(),
      holdingId: varchar("holding_id"),
      // Reference to portfolio_holdings
      triggeredAt: timestamp("triggered_at").notNull().defaultNow(),
      conditionsMet: jsonb("conditions_met").$type().notNull(),
      actionsExecuted: jsonb("actions_executed").$type().notNull(),
      success: boolean("success").notNull(),
      errorMessage: text("error_message")
    });
    insertRuleExecutionSchema = createInsertSchema(ruleExecutions).omit({
      id: true,
      triggeredAt: true
    });
    insertCompoundRuleSchema = z.object({
      // Rule header
      name: z.string().min(1),
      enabled: z.boolean().default(true),
      scope: z.enum(["all_holdings", "specific_stock"]).default("all_holdings"),
      ticker: z.string().optional(),
      priority: z.number().int().default(1e3),
      // Condition groups (each with its own actions)
      groups: z.array(z.object({
        groupOrder: z.number().int(),
        junctionOperator: z.enum(["AND", "OR"]).optional(),
        description: z.string().optional(),
        conditions: z.array(z.object({
          metric: z.enum(["price_change_percent", "price_change_from_close_percent", "price_absolute", "days_held"]),
          comparator: z.enum([">", "<", ">=", "<=", "=="]),
          threshold: z.string(),
          // Will be converted to decimal
          timeframeValue: z.number().int().optional(),
          timeframeUnit: z.enum(["days", "hours", "minutes"]).optional(),
          metadata: z.record(z.any()).optional()
        })),
        // Actions for this specific group
        actions: z.array(z.object({
          actionOrder: z.number().int(),
          actionType: z.enum(["sell_percentage", "sell_quantity", "sell_all", "notify"]),
          quantity: z.number().int().optional(),
          percentage: z.string().optional(),
          // Will be converted to decimal (0-100)
          allowRepeat: z.boolean().default(false),
          cooldownMinutes: z.number().int().optional()
        }))
      }))
    });
    users = pgTable("users", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      name: text("name").notNull(),
      email: text("email").notNull().unique(),
      passwordHash: text("password_hash"),
      // Hashed password for authentication (nullable for OAuth users)
      avatarColor: text("avatar_color").notNull().default("#3b82f6"),
      // Hex color for avatar
      // OAuth provider fields
      authProvider: text("auth_provider").notNull().default("email"),
      // "email", "google"
      googleSub: text("google_sub").unique(),
      // Google's unique user ID (sub claim)
      googlePicture: text("google_picture"),
      // Google profile picture URL
      isAdmin: boolean("is_admin").notNull().default(false),
      // Admin users can access backoffice
      isSuperAdmin: boolean("is_super_admin").notNull().default(false),
      // Super admin users can delete announcements and perform elevated operations
      emailVerified: boolean("email_verified").notNull().default(false),
      // Email verification status
      emailVerificationToken: text("email_verification_token"),
      // Token for email verification
      emailVerificationExpiry: timestamp("email_verification_expiry"),
      // Token expiry time
      subscriptionStatus: text("subscription_status").notNull().default("pending_verification"),
      // "pending_verification", "trial", "active", "inactive", "cancelled", "expired"
      paypalSubscriptionId: text("paypal_subscription_id"),
      // PayPal subscription ID
      subscriptionStartDate: timestamp("subscription_start_date"),
      subscriptionEndDate: timestamp("subscription_end_date"),
      trialEndsAt: timestamp("trial_ends_at"),
      // When the 30-day trial ends
      lastDataRefresh: timestamp("last_data_refresh"),
      // Last time user received new stock data (for subscription-based refresh limits)
      initialDataFetched: boolean("initial_data_fetched").notNull().default(false),
      // Track if initial 500 OpenInsider transactions have been fetched
      hasSeenOnboarding: boolean("has_seen_onboarding").notNull().default(false),
      // Track if user has completed the onboarding flow
      onboardingCompletedAt: timestamp("onboarding_completed_at"),
      // When user completed the unified onboarding flow
      tutorialCompletions: jsonb("tutorial_completions").$type().default({}),
      // Track which tutorials have been completed
      stockLimit: integer("stock_limit").notNull().default(100),
      // Maximum number of stocks to fetch (500 during onboarding, 100 default)
      riskPreference: text("risk_preference").notNull().default("balanced"),
      // "low", "balanced", "high" - determines default filter presets
      // Per-user display filters (client-side filtering of opportunities)
      optionsDealThresholdPercent: integer("options_deal_threshold_percent").notNull().default(15),
      // Filter out stocks where insider price < this % of market price (user-specific)
      minMarketCapFilter: integer("min_market_cap_filter").notNull().default(500),
      // Minimum market cap in millions for displaying opportunities (user-specific)
      showAllOpportunities: boolean("show_all_opportunities").notNull().default(false),
      // false = Buy Only (default), true = Show All (Buy + Sell)
      archived: boolean("archived").notNull().default(false),
      // Soft delete for hiding users from admin list
      archivedAt: timestamp("archived_at"),
      archivedBy: varchar("archived_by"),
      // Which admin archived this user
      createdAt: timestamp("created_at").defaultNow()
    });
    insertUserSchema = createInsertSchema(users).omit({
      id: true,
      createdAt: true,
      archivedAt: true,
      lastDataRefresh: true
    });
    payments = pgTable("payments", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
      amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
      paymentDate: timestamp("payment_date").notNull(),
      paymentMethod: text("payment_method").notNull(),
      // "paypal", "manual", "stripe", etc.
      status: text("status").notNull().default("completed"),
      // "completed", "pending", "failed", "refunded"
      transactionId: text("transaction_id"),
      // External payment processor transaction ID
      notes: text("notes"),
      // Admin notes about manual payments
      createdAt: timestamp("created_at").defaultNow(),
      createdBy: varchar("created_by")
      // Which admin created manual payment (null for automated)
    });
    insertPaymentSchema = createInsertSchema(payments).omit({
      id: true,
      createdAt: true
    });
    manualOverrides = pgTable("manual_overrides", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
      startDate: timestamp("start_date").notNull(),
      endDate: timestamp("end_date").notNull(),
      monthsExtended: integer("months_extended").notNull(),
      // How many months were added
      reason: text("reason"),
      // Why this override was created
      createdAt: timestamp("created_at").defaultNow(),
      createdBy: varchar("created_by").notNull()
      // Which admin created this override
    });
    insertManualOverrideSchema = createInsertSchema(manualOverrides).omit({
      id: true,
      createdAt: true
    });
    passwordResetTokens = pgTable("password_reset_tokens", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
      token: text("token").notNull().unique(),
      expiresAt: timestamp("expires_at").notNull(),
      used: boolean("used").notNull().default(false),
      createdAt: timestamp("created_at").defaultNow(),
      createdBy: varchar("created_by").notNull()
      // Which admin initiated the reset
    });
    insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({
      id: true,
      createdAt: true,
      used: true
    });
    userTutorials = pgTable("user_tutorials", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      userId: varchar("user_id").notNull(),
      tutorialId: text("tutorial_id").notNull(),
      // "dashboard", "purchase", "management", "history", "rules", "backtesting", "settings", "stocks", "simulation"
      completedAt: timestamp("completed_at").defaultNow()
    });
    insertUserTutorialSchema = createInsertSchema(userTutorials).omit({
      id: true,
      completedAt: true
    });
    stockComments = pgTable("stock_comments", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      ticker: text("ticker").notNull(),
      userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
      comment: text("comment").notNull(),
      createdAt: timestamp("created_at").defaultNow()
    });
    insertStockCommentSchema = createInsertSchema(stockComments).omit({
      id: true,
      createdAt: true
    });
    stockViews = pgTable("stock_views", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      ticker: text("ticker").notNull(),
      userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
      viewedAt: timestamp("viewed_at").defaultNow()
    });
    insertStockViewSchema = createInsertSchema(stockViews).omit({
      id: true,
      viewedAt: true
    });
    backtests = pgTable("backtests", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      name: text("name").notNull(),
      ruleId: varchar("rule_id"),
      startDate: timestamp("start_date").notNull(),
      endDate: timestamp("end_date").notNull(),
      initialCapital: decimal("initial_capital", { precision: 12, scale: 2 }).notNull(),
      finalValue: decimal("final_value", { precision: 12, scale: 2 }).notNull(),
      totalReturn: decimal("total_return", { precision: 10, scale: 2 }).notNull(),
      totalReturnPercent: decimal("total_return_percent", { precision: 10, scale: 2 }).notNull(),
      numberOfTrades: integer("number_of_trades").notNull(),
      winRate: decimal("win_rate", { precision: 5, scale: 2 }),
      bestTrade: decimal("best_trade", { precision: 12, scale: 2 }),
      worstTrade: decimal("worst_trade", { precision: 12, scale: 2 }),
      tradeLog: jsonb("trade_log").$type(),
      equityCurve: jsonb("equity_curve").$type(),
      createdAt: timestamp("created_at").defaultNow()
    });
    insertBacktestSchema = createInsertSchema(backtests).omit({
      id: true,
      createdAt: true
    });
    telegramConfig = pgTable("telegram_config", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
      // Made nullable during migration
      channelUsername: text("channel_username").notNull(),
      // e.g., "InsiderTrading_SEC"
      sessionString: text("session_string"),
      // Persisted session to avoid re-auth
      phoneNumber: text("phone_number"),
      // For display/reference only
      enabled: boolean("enabled").notNull().default(true),
      lastSync: timestamp("last_sync"),
      lastMessageId: integer("last_message_id")
      // Track last processed message to avoid duplicates
    });
    insertTelegramConfigSchema = createInsertSchema(telegramConfig).omit({
      id: true,
      lastSync: true,
      lastMessageId: true,
      sessionString: true
    });
    ibkrConfig = pgTable("ibkr_config", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
      // Made nullable during migration
      gatewayUrl: text("gateway_url").notNull().default("https://localhost:5000"),
      // IBKR Client Portal Gateway URL
      accountId: text("account_id"),
      // IBKR account ID (fetched from API)
      isConnected: boolean("is_connected").notNull().default(false),
      isPaperTrading: boolean("is_paper_trading").notNull().default(true),
      lastConnectionCheck: timestamp("last_connection_check"),
      lastError: text("last_error")
    });
    insertIbkrConfigSchema = createInsertSchema(ibkrConfig).omit({
      id: true,
      lastConnectionCheck: true,
      isConnected: true
    });
    openinsiderConfig = pgTable("openinsider_config", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
      // Made nullable during migration
      enabled: boolean("enabled").notNull().default(false),
      fetchLimit: integer("fetch_limit").notNull().default(50),
      // How many transactions to fetch
      fetchInterval: text("fetch_interval").notNull().default("hourly"),
      // "hourly" or "daily"
      fetchPreviousDayOnly: boolean("fetch_previous_day_only").notNull().default(false),
      // Only fetch yesterday's transactions
      // Filters
      insiderTitles: text("insider_titles").array(),
      // Filter by insider titles (CEO, CFO, Director, etc.)
      minTransactionValue: integer("min_transaction_value"),
      // Minimum transaction value in dollars
      minMarketCap: integer("min_market_cap").notNull().default(500),
      // Minimum market cap in millions (default $500M)
      optionsDealThresholdPercent: integer("options_deal_threshold_percent").notNull().default(15),
      // Insider price must be >= this % of market price (filters options deals)
      minCommunityEngagement: integer("min_community_engagement").notNull().default(10),
      // Minimum comments + follows to appear in Community section
      lastSync: timestamp("last_sync"),
      lastError: text("last_error")
    });
    insertOpeninsiderConfigSchema = createInsertSchema(openinsiderConfig).omit({
      id: true,
      lastSync: true
    });
    backtestJobs = pgTable("backtest_jobs", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
      // Made nullable during migration
      name: text("name").notNull(),
      dataSource: text("data_source").notNull().default("telegram"),
      // "telegram" or "openinsider"
      messageCount: integer("message_count").notNull(),
      // Number of messages/transactions to analyze
      status: text("status").notNull().default("pending"),
      // "pending", "fetching_messages", "filtering", "building_matrix", "generating_scenarios", "calculating_results", "completed", "failed"
      progress: integer("progress").default(0),
      // 0-100
      errorMessage: text("error_message"),
      candidateStocks: jsonb("candidate_stocks").$type().default([]),
      createdAt: timestamp("created_at").defaultNow(),
      completedAt: timestamp("completed_at")
    });
    insertBacktestJobSchema = createInsertSchema(backtestJobs).omit({
      id: true,
      status: true,
      progress: true,
      errorMessage: true,
      candidateStocks: true,
      createdAt: true,
      completedAt: true
    });
    backtestPriceData = pgTable("backtest_price_data", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      jobId: varchar("job_id").notNull(),
      ticker: text("ticker").notNull(),
      insiderBuyDate: text("insider_buy_date").notNull(),
      priceMatrix: jsonb("price_matrix").$type().notNull(),
      // Daily closing prices: 1 month before to 2 weeks after insider buy
      createdAt: timestamp("created_at").defaultNow()
    });
    insertBacktestPriceDataSchema = createInsertSchema(backtestPriceData).omit({
      id: true,
      createdAt: true
    });
    backtestScenarios = pgTable("backtest_scenarios", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      jobId: varchar("job_id").notNull(),
      scenarioNumber: integer("scenario_number").notNull(),
      // 1-10
      name: text("name").notNull(),
      // AI-generated scenario name
      description: text("description"),
      // AI-generated scenario description
      // Rule-based structure aligned with tradingRules
      sellConditions: jsonb("sell_conditions").$type().notNull(),
      sellAction: jsonb("sell_action").$type().notNull(),
      totalProfitLoss: decimal("total_profit_loss", { precision: 12, scale: 2 }).notNull(),
      totalProfitLossPercent: decimal("total_profit_loss_percent", { precision: 10, scale: 2 }).notNull(),
      winRate: decimal("win_rate", { precision: 5, scale: 2 }),
      // Percentage of winning trades
      numberOfTrades: integer("number_of_trades").notNull(),
      tradeDetails: jsonb("trade_details").$type(),
      createdAt: timestamp("created_at").defaultNow()
    });
    insertBacktestScenarioSchema = createInsertSchema(backtestScenarios).omit({
      id: true,
      createdAt: true
    });
    featureSuggestions = pgTable("feature_suggestions", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
      title: text("title").notNull(),
      description: text("description").notNull(),
      status: text("status").notNull().default("pending"),
      // "pending", "roadmap", "deleted"
      voteCount: integer("vote_count").notNull().default(0),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    insertFeatureSuggestionSchema = createInsertSchema(featureSuggestions).omit({
      id: true,
      voteCount: true,
      createdAt: true,
      updatedAt: true
    });
    featureVotes = pgTable("feature_votes", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      suggestionId: varchar("suggestion_id").notNull().references(() => featureSuggestions.id, { onDelete: "cascade" }),
      userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
      createdAt: timestamp("created_at").defaultNow()
    }, (table) => ({
      userSuggestionUnique: uniqueIndex("user_suggestion_unique_idx").on(table.userId, table.suggestionId)
    }));
    insertFeatureVoteSchema = createInsertSchema(featureVotes).omit({
      id: true,
      createdAt: true
    });
    notifications = pgTable("notifications", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
      ticker: text("ticker").notNull(),
      type: text("type").notNull(),
      // "high_score_buy", "high_score_sell", "popular_stock", "stance_change"
      score: integer("score"),
      // AI integrated score (nullable for non-score notifications)
      message: text("message").notNull(),
      metadata: jsonb("metadata").$type(),
      isRead: boolean("is_read").notNull().default(false),
      createdAt: timestamp("created_at").notNull().defaultNow()
    }, (table) => ({
      userIdIdx: uniqueIndex("notifications_user_id_idx").on(table.userId, table.isRead, table.createdAt),
      // Deduplication: prevent duplicate notifications for same user+ticker+type
      userTickerTypeUnique: uniqueIndex("notifications_user_ticker_type_idx").on(table.userId, table.ticker, table.type)
    }));
    insertNotificationSchema = createInsertSchema(notifications).omit({
      id: true,
      createdAt: true
    });
    announcements = pgTable("announcements", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      title: text("title").notNull(),
      content: text("content").notNull(),
      type: text("type").notNull().default("update"),
      // "feature", "update", "maintenance", "announcement"
      isActive: boolean("is_active").notNull().default(true),
      createdAt: timestamp("created_at").notNull().defaultNow(),
      createdBy: varchar("created_by").notNull().references(() => users.id)
    });
    insertAnnouncementSchema = createInsertSchema(announcements).omit({
      id: true,
      createdAt: true
    });
    announcementReads = pgTable("announcement_reads", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      announcementId: varchar("announcement_id").notNull().references(() => announcements.id, { onDelete: "cascade" }),
      userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
      readAt: timestamp("read_at").notNull().defaultNow()
    }, (table) => ({
      userAnnouncementUnique: uniqueIndex("user_announcement_unique_idx").on(table.userId, table.announcementId)
    }));
    insertAnnouncementReadSchema = createInsertSchema(announcementReads).omit({
      id: true,
      readAt: true
    });
    adminNotifications = pgTable("admin_notifications", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      type: text("type").notNull(),
      // "user_signup", etc.
      title: text("title").notNull(),
      message: text("message").notNull(),
      metadata: jsonb("metadata").$type(),
      isRead: boolean("is_read").notNull().default(false),
      readAt: timestamp("read_at"),
      createdAt: timestamp("created_at").notNull().defaultNow()
    });
    insertAdminNotificationSchema = createInsertSchema(adminNotifications).omit({
      id: true,
      createdAt: true,
      readAt: true
    });
    followedStocks = pgTable("followed_stocks", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      userId: varchar("user_id").notNull(),
      ticker: text("ticker").notNull(),
      followedAt: timestamp("followed_at").notNull().defaultNow(),
      hasEnteredPosition: boolean("has_entered_position").default(false).notNull(),
      // Track if user entered position
      entryPrice: decimal("entry_price", { precision: 12, scale: 2 }),
      // Price at which user entered position
      quantity: integer("quantity").default(1),
      // Number of shares (default 1 for simplicity)
      sellPrice: decimal("sell_price", { precision: 12, scale: 2 }),
      // Price at which position was closed
      sellDate: timestamp("sell_date"),
      // When position was closed
      pnl: decimal("pnl", { precision: 12, scale: 2 })
      // Profit/Loss: (sellPrice - entryPrice) * quantity
    }, (table) => ({
      userTickerFollowUnique: uniqueIndex("user_ticker_follow_unique_idx").on(table.userId, table.ticker)
    }));
    insertFollowedStockSchema = createInsertSchema(followedStocks).omit({ id: true, followedAt: true, hasEnteredPosition: true, entryPrice: true, sellPrice: true, sellDate: true, pnl: true, quantity: true });
    dailyBriefs = pgTable("daily_briefs", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
      // User-specific briefs
      ticker: text("ticker").notNull(),
      briefDate: text("brief_date").notNull(),
      // YYYY-MM-DD format
      priceSnapshot: decimal("price_snapshot", { precision: 12, scale: 2 }).notNull(),
      // Price at time of brief
      priceChange: decimal("price_change", { precision: 12, scale: 2 }),
      // Dollar change vs previous close
      priceChangePercent: decimal("price_change_percent", { precision: 10, scale: 2 }),
      // Percent change
      // WATCHING SCENARIO (Entry Evaluation) - "If I enter now, what should I do?"
      watchingStance: text("watching_stance").notNull(),
      // "buy", "hold", "sell"
      watchingConfidence: integer("watching_confidence").notNull(),
      // 1-10
      watchingText: text("watching_text").notNull(),
      // Brief for watching scenario
      watchingHighlights: text("watching_highlights").array().default([]),
      // Key points for watching
      // OWNING SCENARIO (Exit Strategy) - "If I already own it, what should I do?"
      owningStance: text("owning_stance").notNull(),
      // "buy", "hold", "sell", "cover" (cover = exit short)
      owningConfidence: integer("owning_confidence").notNull(),
      // 1-10
      owningText: text("owning_text").notNull(),
      // Brief for owning scenario
      owningHighlights: text("owning_highlights").array().default([]),
      // Key points for owning
      // Legacy fields - kept for backwards compatibility, now optional
      keyHighlights: text("key_highlights").array().default([]),
      recommendedStance: text("recommended_stance"),
      confidence: integer("confidence"),
      briefText: text("brief_text"),
      userOwnsPosition: boolean("user_owns_position").default(false),
      createdAt: timestamp("created_at").notNull().defaultNow()
    }, (table) => ({
      userTickerDateUnique: uniqueIndex("daily_brief_user_ticker_date_idx").on(table.userId, table.ticker, table.briefDate)
    }));
    insertDailyBriefSchema = createInsertSchema(dailyBriefs).omit({ id: true, createdAt: true });
    tickerDailyBriefs = pgTable("ticker_daily_briefs", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      ticker: text("ticker").notNull(),
      briefDate: text("brief_date").notNull(),
      // YYYY-MM-DD format
      // Price data at time of brief
      priceSnapshot: decimal("price_snapshot", { precision: 12, scale: 2 }).notNull(),
      priceChange: decimal("price_change", { precision: 12, scale: 2 }),
      // vs previous close
      priceChangePercent: decimal("price_change_percent", { precision: 10, scale: 2 }),
      priceSinceInsider: decimal("price_since_insider", { precision: 10, scale: 2 }),
      // % change since insider trade
      // Signal Score Evolution
      previousSignalScore: integer("previous_signal_score"),
      // Score before this brief
      newSignalScore: integer("new_signal_score").notNull(),
      // Score after this brief
      scoreChange: integer("score_change"),
      // Delta: newSignalScore - previousSignalScore
      scoreChangeReason: text("score_change_reason"),
      // AI explanation for score change
      // Updated Stance
      stance: text("stance").notNull(),
      // "ENTER", "WATCH", "AVOID"
      stanceChanged: boolean("stance_changed").default(false),
      // Did stance change from previous?
      // Brief Content
      briefText: text("brief_text").notNull(),
      // The daily analysis text
      keyUpdates: jsonb("key_updates").$type().default([]),
      // Key changes/updates noted
      // Data Sources Used
      newInsiderTransactions: boolean("new_insider_transactions").default(false),
      // Were there new insider trades?
      newsImpact: text("news_impact"),
      // "positive", "negative", "neutral", "none"
      priceActionAssessment: text("price_action_assessment"),
      // Brief on price movement
      // Stop Loss / Profit Target Updates
      stopLossHit: boolean("stop_loss_hit").default(false),
      // Did price hit stop loss?
      profitTargetHit: boolean("profit_target_hit").default(false),
      // Did price hit profit target?
      createdAt: timestamp("created_at").notNull().defaultNow()
    }, (table) => ({
      tickerDateUnique: uniqueIndex("ticker_daily_brief_unique_idx").on(table.ticker, table.briefDate),
      tickerIdx: index("ticker_daily_briefs_ticker_idx").on(table.ticker),
      dateIdx: index("ticker_daily_briefs_date_idx").on(table.briefDate)
    }));
    insertTickerDailyBriefSchema = createInsertSchema(tickerDailyBriefs).omit({ id: true, createdAt: true });
    glossaryTerms = pgTable("glossary_terms", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      term: text("term").notNull().unique(),
      // The financial term (e.g., "RSI", "P&L", "Profit Margin")
      definition: text("definition").notNull(),
      // Plain language definition
      category: text("category").notNull(),
      // "technical", "fundamental", "general"
      synonyms: text("synonyms").array().default([]),
      // Alternative names (e.g., ["Profit and Loss", "P&L"])
      createdAt: timestamp("created_at").notNull().defaultNow(),
      updatedAt: timestamp("updated_at").notNull().defaultNow()
    });
    insertGlossaryTermSchema = createInsertSchema(glossaryTerms).omit({ id: true, createdAt: true, updatedAt: true });
    systemSettings = pgTable("system_settings", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      appVersion: text("app_version").notNull().default("1.0.0"),
      // Application version displayed to users
      releaseNotes: text("release_notes"),
      // Optional notes for the current version
      lastUpdatedBy: varchar("last_updated_by").references(() => users.id),
      // Admin who last updated
      updatedAt: timestamp("updated_at").notNull().defaultNow(),
      // AI Provider Configuration
      aiProvider: text("ai_provider").notNull().default("openai"),
      // "openai" or "gemini"
      aiModel: text("ai_model")
      // Optional specific model override (e.g., "gpt-4o", "gemini-2.5-pro")
    });
    insertSystemSettingsSchema = createInsertSchema(systemSettings).omit({ id: true, updatedAt: true });
  }
});

// server/logger.ts
import pino from "pino";
function createLogger(source) {
  return logger2.child({ source });
}
var logLevel, logger2, log;
var init_logger = __esm({
  "server/logger.ts"() {
    "use strict";
    logLevel = process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "info" : "debug");
    logger2 = pino({
      level: logLevel,
      // In development, use pretty printing
      ...process.env.NODE_ENV !== "production" && {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "HH:MM:ss",
            ignore: "pid,hostname",
            singleLine: false
          }
        }
      },
      // In production, use structured JSON
      ...process.env.NODE_ENV === "production" && {
        formatters: {
          level: (label) => {
            return { level: label };
          }
        },
        timestamp: pino.stdTimeFunctions.isoTime
      },
      // Base context
      base: {
        env: process.env.NODE_ENV || "development"
      }
    });
    log = {
      info: (message, source = "express") => {
        logger2.info({ source }, message);
      },
      error: (message, error, source = "express") => {
        if (error instanceof Error) {
          logger2.error({ source, err: error }, message);
        } else if (error) {
          logger2.error({ source, error }, message);
        } else {
          logger2.error({ source }, message);
        }
      },
      warn: (message, source = "express") => {
        logger2.warn({ source }, message);
      },
      debug: (message, source = "express") => {
        logger2.debug({ source }, message);
      },
      // Add log() method for backward compatibility (maps to info)
      log: (message, source = "express") => {
        logger2.info({ source }, message);
      }
    };
  }
});

// server/db/readReplica.ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
function getDatabaseConfig() {
  const primaryUrl = process.env.DATABASE_URL;
  if (!primaryUrl) {
    throw new Error("DATABASE_URL environment variable is required");
  }
  const replicaUrl = process.env.DATABASE_REPLICA_URL;
  const enableReadReplicas = process.env.ENABLE_READ_REPLICAS === "true";
  return {
    primary: primaryUrl,
    replica: replicaUrl,
    enableReadReplicas: enableReadReplicas && !!replicaUrl
  };
}
function initializeDatabases() {
  dbConfig = getDatabaseConfig();
  const primaryPool = new Pool({ connectionString: dbConfig.primary });
  primaryDb = drizzle(primaryPool, { schema: schema_exports });
  log2.info("Primary database connection initialized");
  if (dbConfig.enableReadReplicas && dbConfig.replica) {
    const replicaPool = new Pool({ connectionString: dbConfig.replica });
    replicaDb = drizzle(replicaPool, { schema: schema_exports });
    log2.info("Read replica database connection initialized", {
      replicaEnabled: true
    });
  } else {
    log2.info("Read replicas not enabled", {
      enableReadReplicas: dbConfig.enableReadReplicas,
      replicaUrlConfigured: !!dbConfig.replica
    });
  }
}
var log2, primaryDb, replicaDb, dbConfig;
var init_readReplica = __esm({
  "server/db/readReplica.ts"() {
    "use strict";
    init_logger();
    init_schema();
    log2 = createLogger("db:read-replica");
    primaryDb = null;
    replicaDb = null;
    dbConfig = null;
  }
});

// server/db.ts
import { Pool as Pool2 } from "pg";
import { drizzle as drizzle2 } from "drizzle-orm/node-postgres";
var pool, db;
var init_db = __esm({
  "server/db.ts"() {
    "use strict";
    init_schema();
    init_readReplica();
    init_readReplica();
    if (!process.env.DATABASE_URL) {
      throw new Error(
        "DATABASE_URL must be set. Did you forget to provision a database?"
      );
    }
    pool = new Pool2({ connectionString: process.env.DATABASE_URL });
    db = drizzle2(pool, { schema: schema_exports });
    if (process.env.ENABLE_READ_REPLICAS === "true" && process.env.DATABASE_REPLICA_URL) {
      try {
        initializeDatabases();
      } catch (error) {
        console.warn("[db] Failed to initialize read replicas:", error);
      }
    }
  }
});

// shared/time.ts
function getStockAgeInDays(lastUpdated) {
  if (!lastUpdated) return 0;
  const updatedDate = typeof lastUpdated === "string" ? new Date(lastUpdated) : lastUpdated;
  const now = /* @__PURE__ */ new Date();
  const diffMs = now.getTime() - updatedDate.getTime();
  const diffDays = Math.floor(diffMs / (1e3 * 60 * 60 * 24));
  return diffDays;
}
function isStockStale(lastUpdated) {
  const ageDays = getStockAgeInDays(lastUpdated);
  return ageDays > 5;
}
var init_time = __esm({
  "shared/time.ts"() {
    "use strict";
  }
});

// server/eventDispatcher.ts
import { EventEmitter } from "events";
var EventDispatcher, eventDispatcher;
var init_eventDispatcher = __esm({
  "server/eventDispatcher.ts"() {
    "use strict";
    EventDispatcher = class _EventDispatcher extends EventEmitter {
      static instance;
      constructor() {
        super();
        this.setMaxListeners(100);
      }
      static getInstance() {
        if (!_EventDispatcher.instance) {
          _EventDispatcher.instance = new _EventDispatcher();
        }
        return _EventDispatcher.instance;
      }
      emit(event, data) {
        return super.emit(event, data);
      }
      on(event, listener) {
        return super.on(event, listener);
      }
    };
    eventDispatcher = EventDispatcher.getInstance();
  }
});

// server/repositories/base.ts
var BaseRepository;
var init_base = __esm({
  "server/repositories/base.ts"() {
    "use strict";
    init_db();
    BaseRepository = class {
      db = db;
    };
  }
});

// server/repositories/systemSettingsRepository.ts
import { eq } from "drizzle-orm";
var SystemSettingsRepository;
var init_systemSettingsRepository = __esm({
  "server/repositories/systemSettingsRepository.ts"() {
    "use strict";
    init_base();
    init_schema();
    SystemSettingsRepository = class extends BaseRepository {
      async getSystemSettings() {
        const [settings] = await this.db.select().from(systemSettings).limit(1);
        return settings;
      }
      async updateSystemSettings(updates) {
        const existing = await this.getSystemSettings();
        if (existing) {
          const [updated] = await this.db.update(systemSettings).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq(systemSettings.id, existing.id)).returning();
          return updated;
        } else {
          const [created] = await this.db.insert(systemSettings).values({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).returning();
          return created;
        }
      }
    };
  }
});

// server/repositories/telegramConfigRepository.ts
import { eq as eq2, sql as sql2 } from "drizzle-orm";
var TelegramConfigRepository;
var init_telegramConfigRepository = __esm({
  "server/repositories/telegramConfigRepository.ts"() {
    "use strict";
    init_base();
    init_schema();
    TelegramConfigRepository = class extends BaseRepository {
      async getTelegramConfig() {
        const [config] = await this.db.select().from(telegramConfig).limit(1);
        return config;
      }
      async createOrUpdateTelegramConfig(config) {
        const existing = await this.getTelegramConfig();
        if (existing) {
          const [updated] = await this.db.update(telegramConfig).set({ ...config, lastSync: sql2`now()` }).where(eq2(telegramConfig.id, existing.id)).returning();
          return updated;
        } else {
          const [created] = await this.db.insert(telegramConfig).values(config).returning();
          return created;
        }
      }
      async updateTelegramSyncStatus(lastMessageId) {
        const existing = await this.getTelegramConfig();
        if (existing) {
          await this.db.update(telegramConfig).set({ lastSync: sql2`now()`, lastMessageId }).where(eq2(telegramConfig.id, existing.id));
        }
      }
      async updateTelegramSession(sessionString) {
        const existing = await this.getTelegramConfig();
        if (existing) {
          await this.db.update(telegramConfig).set({ sessionString }).where(eq2(telegramConfig.id, existing.id));
        }
      }
    };
  }
});

// server/repositories/ibkrConfigRepository.ts
import { eq as eq3, sql as sql3 } from "drizzle-orm";
var IbkrConfigRepository;
var init_ibkrConfigRepository = __esm({
  "server/repositories/ibkrConfigRepository.ts"() {
    "use strict";
    init_base();
    init_schema();
    IbkrConfigRepository = class extends BaseRepository {
      async getIbkrConfig() {
        const [config] = await this.db.select().from(ibkrConfig).limit(1);
        return config;
      }
      async createOrUpdateIbkrConfig(config) {
        const existing = await this.getIbkrConfig();
        if (existing) {
          const [updated] = await this.db.update(ibkrConfig).set(config).where(eq3(ibkrConfig.id, existing.id)).returning();
          return updated;
        } else {
          const [created] = await this.db.insert(ibkrConfig).values({
            gatewayUrl: config.gatewayUrl || "https://localhost:5000",
            isPaperTrading: config.isPaperTrading !== void 0 ? config.isPaperTrading : true
          }).returning();
          return created;
        }
      }
      async updateIbkrConnectionStatus(isConnected, accountId, error) {
        const existing = await this.getIbkrConfig();
        if (existing) {
          await this.db.update(ibkrConfig).set({
            isConnected,
            lastConnectionCheck: sql3`now()`,
            ...accountId && { accountId },
            ...error !== void 0 && { lastError: error }
          }).where(eq3(ibkrConfig.id, existing.id));
        }
      }
    };
  }
});

// server/repositories/openinsiderConfigRepository.ts
import { eq as eq4, sql as sql4 } from "drizzle-orm";
var OpeninsiderConfigRepository;
var init_openinsiderConfigRepository = __esm({
  "server/repositories/openinsiderConfigRepository.ts"() {
    "use strict";
    init_base();
    init_schema();
    OpeninsiderConfigRepository = class extends BaseRepository {
      async getOpeninsiderConfig() {
        const [config] = await this.db.select().from(openinsiderConfig).limit(1);
        return config;
      }
      async createOrUpdateOpeninsiderConfig(config) {
        const existing = await this.getOpeninsiderConfig();
        if (existing) {
          const [updated] = await this.db.update(openinsiderConfig).set(config).where(eq4(openinsiderConfig.id, existing.id)).returning();
          return updated;
        } else {
          const [created] = await this.db.insert(openinsiderConfig).values({
            enabled: config.enabled !== void 0 ? config.enabled : false,
            fetchLimit: config.fetchLimit || 50
          }).returning();
          return created;
        }
      }
      async updateOpeninsiderSyncStatus(error) {
        const existing = await this.getOpeninsiderConfig();
        if (existing) {
          await this.db.update(openinsiderConfig).set({
            lastSync: sql4`now()`,
            ...error !== void 0 && { lastError: error }
          }).where(eq4(openinsiderConfig.id, existing.id));
        }
      }
    };
  }
});

// server/repositories/paymentRepository.ts
import { eq as eq5, desc, sql as sql5 } from "drizzle-orm";
var PaymentRepository;
var init_paymentRepository = __esm({
  "server/repositories/paymentRepository.ts"() {
    "use strict";
    init_base();
    init_schema();
    PaymentRepository = class extends BaseRepository {
      async getUserPayments(userId) {
        return await this.db.select().from(payments).where(eq5(payments.userId, userId)).orderBy(desc(payments.paymentDate));
      }
      async createPayment(payment) {
        const [created] = await this.db.insert(payments).values(payment).returning();
        return created;
      }
      async getPaymentByPaypalOrderId(orderId) {
        const [payment] = await this.db.select().from(payments).where(eq5(payments.paypalOrderId, orderId)).limit(1);
        return payment;
      }
      async getPaymentStats(userId) {
        const [stats] = await this.db.select({
          totalPaid: sql5`COALESCE(SUM(${payments.amount}), 0)::text`,
          lastPaymentDate: sql5`MAX(${payments.paymentDate})`,
          lastPaymentAmount: sql5`(
          SELECT ${payments.amount}::text 
          FROM ${payments} 
          WHERE ${payments.userId} = ${userId} 
          ORDER BY ${payments.paymentDate} DESC 
          LIMIT 1
        )`,
          paymentCount: sql5`COUNT(*)::int`
        }).from(payments).where(eq5(payments.userId, userId));
        return stats || {
          totalPaid: "0",
          lastPaymentDate: null,
          lastPaymentAmount: null,
          paymentCount: 0
        };
      }
    };
  }
});

// server/repositories/stockCommentRepository.ts
import { eq as eq6, desc as desc2, sql as sql6 } from "drizzle-orm";
var StockCommentRepository;
var init_stockCommentRepository = __esm({
  "server/repositories/stockCommentRepository.ts"() {
    "use strict";
    init_base();
    init_schema();
    StockCommentRepository = class extends BaseRepository {
      async getStockComments(ticker) {
        const comments = await this.db.select({
          comment: stockComments,
          user: users
        }).from(stockComments).leftJoin(users, eq6(stockComments.userId, users.id)).where(eq6(stockComments.ticker, ticker)).orderBy(desc2(stockComments.createdAt));
        return comments.map((row) => ({
          ...row.comment,
          user: row.user
        }));
      }
      async getStockCommentCounts() {
        const results = await this.db.select({
          ticker: stockComments.ticker,
          count: sql6`count(*)::int`
        }).from(stockComments).groupBy(stockComments.ticker);
        return results;
      }
      async createStockComment(comment) {
        const [created] = await this.db.insert(stockComments).values(comment).returning();
        return created;
      }
    };
  }
});

// server/repositories/stockViewRepository.ts
import { eq as eq7 } from "drizzle-orm";
var StockViewRepository;
var init_stockViewRepository = __esm({
  "server/repositories/stockViewRepository.ts"() {
    "use strict";
    init_base();
    init_schema();
    StockViewRepository = class extends BaseRepository {
      async markStockAsViewed(ticker, userId) {
        const [view] = await this.db.insert(stockViews).values({
          ticker: ticker.toUpperCase(),
          userId,
          viewedAt: /* @__PURE__ */ new Date()
        }).onConflictDoNothing().returning();
        if (view) {
          return view;
        }
        const [existing] = await this.db.select().from(stockViews).where(eq7(stockViews.userId, userId), eq7(stockViews.ticker, ticker.toUpperCase())).limit(1);
        return existing;
      }
      async markStocksAsViewed(tickers, userId) {
        const upperTickers = tickers.map((t) => t.toUpperCase());
        await this.db.insert(stockViews).values(
          upperTickers.map((ticker) => ({
            ticker,
            userId,
            viewedAt: /* @__PURE__ */ new Date()
          }))
        ).onConflictDoNothing();
      }
      async getUserStockViews(userId) {
        const views = await this.db.select({ ticker: stockViews.ticker }).from(stockViews).where(eq7(stockViews.userId, userId));
        return views.map((v) => v.ticker);
      }
    };
  }
});

// server/repositories/tutorialRepository.ts
import { eq as eq8 } from "drizzle-orm";
var TutorialRepository;
var init_tutorialRepository = __esm({
  "server/repositories/tutorialRepository.ts"() {
    "use strict";
    init_base();
    init_schema();
    TutorialRepository = class extends BaseRepository {
      async hasCompletedTutorial(userId, tutorialId) {
        const [tutorial] = await this.db.select().from(userTutorials).where(eq8(userTutorials.userId, userId), eq8(userTutorials.tutorialId, tutorialId)).limit(1);
        return !!tutorial;
      }
      async markTutorialAsCompleted(userId, tutorialId) {
        const [tutorial] = await this.db.insert(userTutorials).values({
          userId,
          tutorialId,
          completedAt: /* @__PURE__ */ new Date()
        }).onConflictDoNothing().returning();
        if (tutorial) {
          return tutorial;
        }
        const [existing] = await this.db.select().from(userTutorials).where(eq8(userTutorials.userId, userId), eq8(userTutorials.tutorialId, tutorialId)).limit(1);
        return existing;
      }
      async getUserTutorials(userId) {
        return await this.db.select().from(userTutorials).where(eq8(userTutorials.userId, userId));
      }
    };
  }
});

// server/repositories/passwordResetRepository.ts
import { eq as eq9, sql as sql7 } from "drizzle-orm";
var PasswordResetRepository;
var init_passwordResetRepository = __esm({
  "server/repositories/passwordResetRepository.ts"() {
    "use strict";
    init_base();
    init_schema();
    PasswordResetRepository = class extends BaseRepository {
      async createPasswordResetToken(token) {
        const [created] = await this.db.insert(passwordResetTokens).values(token).returning();
        return created;
      }
      async getPasswordResetToken(token) {
        const [tokenRecord] = await this.db.select().from(passwordResetTokens).where(eq9(passwordResetTokens.token, token));
        return tokenRecord;
      }
      async markPasswordResetTokenUsed(tokenId) {
        const result = await this.db.update(passwordResetTokens).set({ used: true }).where(eq9(passwordResetTokens.id, tokenId));
        return result.rowCount ? result.rowCount > 0 : false;
      }
      async purgeExpiredPasswordResetTokens() {
        const now = /* @__PURE__ */ new Date();
        const result = await this.db.delete(passwordResetTokens).where(
          sql7`${passwordResetTokens.expiresAt} < ${now} OR ${passwordResetTokens.used} = true`
        );
        return result.rowCount || 0;
      }
    };
  }
});

// server/repositories/manualOverrideRepository.ts
import { eq as eq10, and, sql as sql8, desc as desc3 } from "drizzle-orm";
var ManualOverrideRepository;
var init_manualOverrideRepository = __esm({
  "server/repositories/manualOverrideRepository.ts"() {
    "use strict";
    init_base();
    init_schema();
    ManualOverrideRepository = class extends BaseRepository {
      async createManualOverride(override) {
        const [created] = await this.db.insert(manualOverrides).values(override).returning();
        return created;
      }
      async getUserManualOverrides(userId) {
        return await this.db.select().from(manualOverrides).where(eq10(manualOverrides.userId, userId)).orderBy(desc3(manualOverrides.createdAt));
      }
      async getActiveManualOverride(userId) {
        const now = /* @__PURE__ */ new Date();
        const [override] = await this.db.select().from(manualOverrides).where(
          and(
            eq10(manualOverrides.userId, userId),
            sql8`${manualOverrides.startDate} <= ${now}`,
            sql8`${manualOverrides.endDate} > ${now}`
          )
        ).orderBy(desc3(manualOverrides.endDate)).limit(1);
        return override;
      }
    };
  }
});

// server/repositories/notificationRepository.ts
import { eq as eq11, desc as desc4, sql as sql9, and as and2 } from "drizzle-orm";
var NotificationRepository;
var init_notificationRepository = __esm({
  "server/repositories/notificationRepository.ts"() {
    "use strict";
    init_base();
    init_schema();
    NotificationRepository = class extends BaseRepository {
      async getNotifications(userId) {
        return await this.db.select().from(notifications).where(eq11(notifications.userId, userId)).orderBy(desc4(notifications.createdAt));
      }
      async getUnreadNotificationCount(userId) {
        const result = await this.db.select({ count: sql9`count(*)::int` }).from(notifications).where(
          and2(
            eq11(notifications.userId, userId),
            eq11(notifications.isRead, false)
          )
        );
        return result[0]?.count || 0;
      }
      async createNotification(notification) {
        const [created] = await this.db.insert(notifications).values(notification).returning();
        return created;
      }
      async markNotificationAsRead(id, userId) {
        const [updated] = await this.db.update(notifications).set({ isRead: true }).where(
          and2(
            eq11(notifications.id, id),
            eq11(notifications.userId, userId)
          )
        ).returning();
        return updated;
      }
      async markAllNotificationsAsRead(userId) {
        const result = await this.db.update(notifications).set({ isRead: true }).where(
          and2(
            eq11(notifications.userId, userId),
            eq11(notifications.isRead, false)
          )
        );
        return result.rowCount || 0;
      }
      async clearAllNotifications(userId) {
        const result = await this.db.delete(notifications).where(eq11(notifications.userId, userId));
        return result.rowCount || 0;
      }
    };
  }
});

// server/repositories/announcementRepository.ts
import { eq as eq12, desc as desc5, sql as sql10, and as and3 } from "drizzle-orm";
var AnnouncementRepository;
var init_announcementRepository = __esm({
  "server/repositories/announcementRepository.ts"() {
    "use strict";
    init_base();
    init_schema();
    AnnouncementRepository = class extends BaseRepository {
      async getAnnouncements(userId) {
        const allAnnouncements = await this.db.select().from(announcements).where(eq12(announcements.isActive, true)).orderBy(desc5(announcements.createdAt));
        const readRecords = await this.db.select().from(announcementReads).where(eq12(announcementReads.userId, userId));
        const readMap = new Map(readRecords.map((r) => [r.announcementId, r.readAt]));
        return allAnnouncements.map((announcement) => ({
          ...announcement,
          readAt: readMap.get(announcement.id) || null
        }));
      }
      async getUnreadAnnouncementCount(userId) {
        const result = await this.db.select({ count: sql10`count(*)::int` }).from(announcements).leftJoin(
          announcementReads,
          and3(
            eq12(announcementReads.announcementId, announcements.id),
            eq12(announcementReads.userId, userId)
          )
        ).where(
          and3(
            eq12(announcements.isActive, true),
            sql10`${announcementReads.id} IS NULL`
          )
        );
        return result[0]?.count || 0;
      }
      async getAllAnnouncements() {
        return await this.db.select().from(announcements).orderBy(sql10`${announcements.createdAt} DESC`);
      }
      async createAnnouncement(announcement) {
        const [created] = await this.db.insert(announcements).values(announcement).returning();
        return created;
      }
      async updateAnnouncement(id, updates) {
        const [updated] = await this.db.update(announcements).set(updates).where(eq12(announcements.id, id)).returning();
        return updated;
      }
      async deactivateAnnouncement(id) {
        return await this.updateAnnouncement(id, { isActive: false });
      }
      async deleteAnnouncement(id) {
        await this.db.delete(announcements).where(eq12(announcements.id, id));
      }
      async markAnnouncementAsRead(userId, announcementId) {
        await this.db.insert(announcementReads).values({ userId, announcementId }).onConflictDoNothing();
      }
      async markAllAnnouncementsAsRead(userId) {
        const activeAnnouncements = await this.db.select({ id: announcements.id }).from(announcements).where(eq12(announcements.isActive, true));
        if (activeAnnouncements.length > 0) {
          const values = activeAnnouncements.map((a) => ({ userId, announcementId: a.id }));
          await this.db.insert(announcementReads).values(values).onConflictDoNothing();
        }
      }
    };
  }
});

// server/repositories/adminNotificationRepository.ts
import { eq as eq13, desc as desc6, sql as sql11 } from "drizzle-orm";
var AdminNotificationRepository;
var init_adminNotificationRepository = __esm({
  "server/repositories/adminNotificationRepository.ts"() {
    "use strict";
    init_base();
    init_schema();
    AdminNotificationRepository = class extends BaseRepository {
      async getAdminNotifications() {
        return await this.db.select().from(adminNotifications).orderBy(desc6(adminNotifications.createdAt));
      }
      async getUnreadAdminNotificationCount() {
        const [result] = await this.db.select({ count: sql11`count(*)::int` }).from(adminNotifications).where(eq13(adminNotifications.isRead, false));
        return result?.count || 0;
      }
      async createAdminNotification(notification) {
        const [created] = await this.db.insert(adminNotifications).values(notification).returning();
        return created;
      }
      async markAdminNotificationAsRead(id) {
        const [updated] = await this.db.update(adminNotifications).set({ isRead: true, readAt: /* @__PURE__ */ new Date() }).where(eq13(adminNotifications.id, id)).returning();
        return updated;
      }
      async markAllAdminNotificationsAsRead() {
        await this.db.update(adminNotifications).set({ isRead: true, readAt: /* @__PURE__ */ new Date() }).where(eq13(adminNotifications.isRead, false));
      }
    };
  }
});

// server/repositories/featureSuggestionRepository.ts
import { eq as eq14, desc as desc7, sql as sql12, and as and4 } from "drizzle-orm";
var FeatureSuggestionRepository;
var init_featureSuggestionRepository = __esm({
  "server/repositories/featureSuggestionRepository.ts"() {
    "use strict";
    init_base();
    init_schema();
    FeatureSuggestionRepository = class extends BaseRepository {
      async getFeatureSuggestions(userId, status) {
        let query = this.db.select({
          id: featureSuggestions.id,
          userId: featureSuggestions.userId,
          title: featureSuggestions.title,
          description: featureSuggestions.description,
          status: featureSuggestions.status,
          voteCount: featureSuggestions.voteCount,
          createdAt: featureSuggestions.createdAt,
          updatedAt: featureSuggestions.updatedAt,
          userName: users.name
        }).from(featureSuggestions).leftJoin(users, eq14(featureSuggestions.userId, users.id));
        if (status) {
          query = query.where(eq14(featureSuggestions.status, status));
        }
        const suggestions = await query.orderBy(desc7(featureSuggestions.voteCount), desc7(featureSuggestions.createdAt));
        if (userId) {
          const userVotes = await this.db.select({ suggestionId: featureVotes.suggestionId }).from(featureVotes).where(eq14(featureVotes.userId, userId));
          const votedSuggestionIds = new Set(userVotes.map((v) => v.suggestionId));
          return suggestions.map((s) => ({
            ...s,
            userName: s.userName || "Unknown User",
            userHasVoted: votedSuggestionIds.has(s.id)
          }));
        }
        return suggestions.map((s) => ({
          ...s,
          userName: s.userName || "Unknown User",
          userHasVoted: false
        }));
      }
      async getFeatureSuggestion(id) {
        const [suggestion] = await this.db.select().from(featureSuggestions).where(eq14(featureSuggestions.id, id)).limit(1);
        return suggestion;
      }
      async createFeatureSuggestion(suggestion) {
        const [created] = await this.db.insert(featureSuggestions).values(suggestion).returning();
        return created;
      }
      async updateFeatureSuggestionStatus(id, status) {
        const [updated] = await this.db.update(featureSuggestions).set({ status, updatedAt: sql12`now()` }).where(eq14(featureSuggestions.id, id)).returning();
        return updated;
      }
      async deleteFeatureSuggestion(id) {
        const result = await this.db.delete(featureSuggestions).where(eq14(featureSuggestions.id, id));
        return (result.rowCount || 0) > 0;
      }
      async voteForSuggestion(suggestionId, userId) {
        try {
          await this.db.insert(featureVotes).values({ suggestionId, userId });
          await this.db.update(featureSuggestions).set({
            voteCount: sql12`${featureSuggestions.voteCount} + 1`,
            updatedAt: sql12`now()`
          }).where(eq14(featureSuggestions.id, suggestionId));
          return true;
        } catch (error) {
          return false;
        }
      }
      async unvoteForSuggestion(suggestionId, userId) {
        const result = await this.db.delete(featureVotes).where(
          and4(
            eq14(featureVotes.suggestionId, suggestionId),
            eq14(featureVotes.userId, userId)
          )
        );
        if (result.rowCount && result.rowCount > 0) {
          await this.db.update(featureSuggestions).set({
            voteCount: sql12`${featureSuggestions.voteCount} - 1`,
            updatedAt: sql12`now()`
          }).where(eq14(featureSuggestions.id, suggestionId));
          return true;
        }
        return false;
      }
      async hasUserVoted(suggestionId, userId) {
        const [vote] = await this.db.select().from(featureVotes).where(
          and4(
            eq14(featureVotes.suggestionId, suggestionId),
            eq14(featureVotes.userId, userId)
          )
        );
        return !!vote;
      }
    };
  }
});

// server/repositories/macroAnalysisRepository.ts
import { eq as eq15, desc as desc8, sql as sql13, and as and5 } from "drizzle-orm";
var MacroAnalysisRepository;
var init_macroAnalysisRepository = __esm({
  "server/repositories/macroAnalysisRepository.ts"() {
    "use strict";
    init_base();
    init_schema();
    MacroAnalysisRepository = class extends BaseRepository {
      async getLatestMacroAnalysis(industry) {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1e3);
        const [analysis] = await this.db.select().from(macroAnalyses).where(
          and5(
            industry ? eq15(macroAnalyses.industry, industry) : sql13`${macroAnalyses.industry} IS NULL`,
            sql13`${macroAnalyses.createdAt} >= ${sevenDaysAgo}`,
            eq15(macroAnalyses.status, "completed"),
            sql13`${macroAnalyses.macroFactor} IS NOT NULL`
          )
        ).orderBy(desc8(macroAnalyses.createdAt)).limit(1);
        return analysis;
      }
      async getMacroAnalysis(id) {
        const [analysis] = await this.db.select().from(macroAnalyses).where(eq15(macroAnalyses.id, id)).limit(1);
        return analysis;
      }
      async createMacroAnalysis(analysis) {
        const [created] = await this.db.insert(macroAnalyses).values(analysis).returning();
        return created;
      }
      async updateMacroAnalysisStatus(id, status, errorMessage) {
        await this.db.update(macroAnalyses).set({ status, errorMessage: errorMessage || null }).where(eq15(macroAnalyses.id, id));
      }
    };
  }
});

// server/repositories/stockCandlestickRepository.ts
import { eq as eq16, sql as sql14 } from "drizzle-orm";
var StockCandlestickRepository;
var init_stockCandlestickRepository = __esm({
  "server/repositories/stockCandlestickRepository.ts"() {
    "use strict";
    init_base();
    init_schema();
    StockCandlestickRepository = class extends BaseRepository {
      async getCandlesticksByTicker(ticker) {
        const [candlesticks] = await this.db.select().from(stockCandlesticks).where(eq16(stockCandlesticks.ticker, ticker));
        return candlesticks;
      }
      async upsertCandlesticks(ticker, candlestickData) {
        const existing = await this.getCandlesticksByTicker(ticker);
        if (existing) {
          const [updated] = await this.db.update(stockCandlesticks).set({
            candlestickData,
            lastUpdated: /* @__PURE__ */ new Date()
          }).where(eq16(stockCandlesticks.ticker, ticker)).returning();
          return updated;
        } else {
          const [created] = await this.db.insert(stockCandlesticks).values({
            ticker,
            candlestickData,
            lastUpdated: /* @__PURE__ */ new Date()
          }).returning();
          return created;
        }
      }
      async getAllTickersNeedingCandlestickData() {
        const oneDayAgo = /* @__PURE__ */ new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);
        const allTickers = await this.db.selectDistinct({ ticker: stocks.ticker }).from(stocks);
        const tickersWithRecentData = await this.db.select({ ticker: stockCandlesticks.ticker }).from(stockCandlesticks).where(sql14`${stockCandlesticks.lastUpdated} >= ${oneDayAgo}`);
        const recentTickerSet = new Set(tickersWithRecentData.map((t) => t.ticker));
        return allTickers.map((t) => t.ticker).filter((ticker) => !recentTickerSet.has(ticker));
      }
    };
  }
});

// server/repositories/stockAnalysisRepository.ts
import { eq as eq17, desc as desc9 } from "drizzle-orm";
var StockAnalysisRepository;
var init_stockAnalysisRepository = __esm({
  "server/repositories/stockAnalysisRepository.ts"() {
    "use strict";
    init_base();
    init_schema();
    StockAnalysisRepository = class extends BaseRepository {
      async getStockAnalysis(ticker) {
        const [analysis] = await this.db.select().from(stockAnalyses).where(eq17(stockAnalyses.ticker, ticker.toUpperCase())).limit(1);
        return analysis;
      }
      async getAllStockAnalyses() {
        return await this.db.select().from(stockAnalyses).orderBy(desc9(stockAnalyses.updatedAt));
      }
      async saveStockAnalysis(analysis) {
        const existing = await this.getStockAnalysis(analysis.ticker);
        if (existing) {
          await this.updateStockAnalysis(analysis.ticker, analysis);
          const updated = await this.getStockAnalysis(analysis.ticker);
          return updated;
        } else {
          const [created] = await this.db.insert(stockAnalyses).values({
            ...analysis,
            ticker: analysis.ticker.toUpperCase()
          }).returning();
          return created;
        }
      }
      async updateStockAnalysis(ticker, updates) {
        await this.db.update(stockAnalyses).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq17(stockAnalyses.ticker, ticker.toUpperCase()));
      }
      async updateStockAnalysisStatus(ticker, status, errorMessage) {
        await this.db.update(stockAnalyses).set({
          status,
          errorMessage: errorMessage || null,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq17(stockAnalyses.ticker, ticker.toUpperCase()));
      }
    };
  }
});

// server/repositories/aiAnalysisJobRepository.ts
import { eq as eq18, desc as desc10, sql as sql15, and as and6 } from "drizzle-orm";
var AiAnalysisJobRepository;
var init_aiAnalysisJobRepository = __esm({
  "server/repositories/aiAnalysisJobRepository.ts"() {
    "use strict";
    init_base();
    init_schema();
    AiAnalysisJobRepository = class extends BaseRepository {
      async enqueueAnalysisJob(ticker, source, priority = "normal", force = false) {
        if (force) {
          await this.db.update(aiAnalysisJobs).set({ status: "cancelled", completedAt: /* @__PURE__ */ new Date() }).where(
            and6(
              eq18(aiAnalysisJobs.ticker, ticker),
              sql15`${aiAnalysisJobs.status} IN ('pending', 'processing')`
            )
          );
          this.log(`Cancelled existing jobs for ${ticker} (force re-analysis)`);
        } else {
          const [existingJob] = await this.db.select().from(aiAnalysisJobs).where(
            and6(
              eq18(aiAnalysisJobs.ticker, ticker),
              sql15`${aiAnalysisJobs.status} IN ('pending', 'processing')`
            )
          ).limit(1);
          if (existingJob) {
            this.log(`Job already exists for ${ticker} with status ${existingJob.status}`);
            return existingJob;
          }
        }
        try {
          const [job] = await this.db.insert(aiAnalysisJobs).values({
            ticker,
            source,
            priority,
            status: "pending",
            retryCount: 0,
            maxRetries: 3,
            scheduledAt: /* @__PURE__ */ new Date()
          }).returning();
          const existingAnalysis = await this.db.select().from(stockAnalyses).where(eq18(stockAnalyses.ticker, ticker)).limit(1);
          if (existingAnalysis.length > 0) {
            const analysis = existingAnalysis[0];
            if (force || analysis.status !== "completed" || !analysis.integratedScore) {
              if (force) {
                await this.db.delete(stockAnalyses).where(eq18(stockAnalyses.ticker, ticker));
                await this.db.insert(stockAnalyses).values({
                  ticker,
                  status: "analyzing"
                });
                this.log(`Deleted old analysis for ${ticker} (forced refresh)`);
              } else {
                await this.db.update(stockAnalyses).set({ status: "analyzing", errorMessage: null }).where(eq18(stockAnalyses.ticker, ticker));
              }
            }
          } else {
            await this.db.insert(stockAnalyses).values({
              ticker,
              status: "analyzing"
            });
          }
          this.log(`Enqueued analysis job for ${ticker} (priority: ${priority}, source: ${source})`);
          return job;
        } catch (error) {
          if (error.code === "23505" || error.message?.includes("unique")) {
            this.log(`Race condition detected for ${ticker}, fetching existing job`);
            const [existingJob] = await this.db.select().from(aiAnalysisJobs).where(
              and6(
                eq18(aiAnalysisJobs.ticker, ticker),
                sql15`${aiAnalysisJobs.status} IN ('pending', 'processing')`
              )
            ).limit(1);
            if (existingJob) {
              return existingJob;
            }
          }
          throw error;
        }
      }
      async cancelAnalysisJobsForTicker(ticker) {
        await this.db.update(aiAnalysisJobs).set({ status: "cancelled", completedAt: /* @__PURE__ */ new Date() }).where(
          and6(
            eq18(aiAnalysisJobs.ticker, ticker),
            sql15`${aiAnalysisJobs.status} IN ('pending', 'processing')`
          )
        );
        this.log(`Cancelled any active jobs for ${ticker}`);
      }
      async dequeueNextJob() {
        const result = await this.db.execute(sql15`
      UPDATE ${aiAnalysisJobs}
      SET status = 'processing',
          started_at = NOW()
      WHERE id = (
        SELECT id
        FROM ${aiAnalysisJobs}
        WHERE status = 'pending'
          AND scheduled_at <= NOW()
        ORDER BY
          CASE priority
            WHEN 'high' THEN 1
            WHEN 'normal' THEN 2
            WHEN 'low' THEN 3
            ELSE 4
          END,
          scheduled_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      RETURNING *
    `);
        const jobs = result.rows;
        return jobs.length > 0 ? jobs[0] : void 0;
      }
      async getJobById(jobId) {
        const [job] = await this.db.select().from(aiAnalysisJobs).where(eq18(aiAnalysisJobs.id, jobId));
        return job;
      }
      async getJobsByTicker(ticker) {
        return await this.db.select().from(aiAnalysisJobs).where(eq18(aiAnalysisJobs.ticker, ticker)).orderBy(desc10(aiAnalysisJobs.createdAt));
      }
      async updateJobStatus(jobId, status, updates) {
        const updateData = {
          status,
          ...updates
        };
        if (status === "completed" || status === "failed") {
          updateData.completedAt = /* @__PURE__ */ new Date();
        }
        await this.db.update(aiAnalysisJobs).set(updateData).where(eq18(aiAnalysisJobs.id, jobId));
        this.log(`Updated job ${jobId} to status: ${status}`);
      }
      async updateJobProgress(jobId, currentStep, stepDetails) {
        await this.db.update(aiAnalysisJobs).set({
          currentStep,
          stepDetails,
          lastError: null
          // Clear error on successful progress update
        }).where(eq18(aiAnalysisJobs.id, jobId));
      }
      async resetStockAnalysisPhaseFlags(ticker) {
        const result = await this.db.execute(sql15`
      WITH lock AS (SELECT pg_advisory_xact_lock(hashtext(${ticker})))
      UPDATE ${stocks}
      SET 
        micro_analysis_completed = false,
        macro_analysis_completed = false,
        combined_analysis_completed = false
      WHERE ticker = ${ticker}
    `);
        this.log(`Reset phase flags for ${ticker} (updated ${result.rowCount || 0} rows)`);
      }
      async markStockAnalysisPhaseComplete(ticker, phase) {
        const fieldMap = {
          "micro": "micro_analysis_completed",
          "macro": "macro_analysis_completed",
          "combined": "combined_analysis_completed"
        };
        const fieldName = fieldMap[phase];
        const result = await this.db.execute(sql15`
      WITH lock AS (SELECT pg_advisory_xact_lock(hashtext(${ticker})))
      UPDATE ${stocks}
      SET ${sql15.raw(fieldName)} = true
      WHERE ticker = ${ticker}
    `);
        this.log(`Marked ${phase} analysis complete for ${ticker} (updated ${result.rowCount || 0} rows)`);
      }
      async getStocksWithIncompleteAnalysis() {
        const incompleteStocks = await this.db.select().from(stocks).where(
          and6(
            eq18(stocks.recommendationStatus, "pending"),
            sql15`(
            ${stocks.microAnalysisCompleted} = false
            OR ${stocks.macroAnalysisCompleted} = false
            OR ${stocks.combinedAnalysisCompleted} = false
          )`,
            sql15`NOT EXISTS (
            SELECT 1 FROM ${aiAnalysisJobs}
            WHERE ${aiAnalysisJobs.ticker} = ${stocks.ticker}
            AND ${aiAnalysisJobs.status} IN ('pending', 'processing')
          )`
          )
        );
        return incompleteStocks;
      }
      async getQueueStats() {
        const stats = await this.db.select({
          status: aiAnalysisJobs.status,
          count: sql15`count(*)::int`
        }).from(aiAnalysisJobs).groupBy(aiAnalysisJobs.status);
        const result = {
          pending: 0,
          processing: 0,
          completed: 0,
          failed: 0
        };
        for (const stat of stats) {
          if (stat.status in result) {
            result[stat.status] = stat.count;
          }
        }
        return result;
      }
      async resetStuckProcessingJobs(timeoutMs) {
        const timeoutInterval = `${Math.floor(timeoutMs / 1e3)} seconds`;
        const result = await this.db.execute(sql15`
      UPDATE ${aiAnalysisJobs}
      SET status = 'pending',
          started_at = NULL,
          retry_count = retry_count + 1
      WHERE status = 'processing'
        AND started_at < NOW() - INTERVAL '${sql15.raw(timeoutInterval)}'
    `);
        return result.rowCount || 0;
      }
    };
  }
});

// server/repositories/userStockStatusRepository.ts
import { eq as eq19, and as and7 } from "drizzle-orm";
var UserStockStatusRepository;
var init_userStockStatusRepository = __esm({
  "server/repositories/userStockStatusRepository.ts"() {
    "use strict";
    init_base();
    init_schema();
    UserStockStatusRepository = class extends BaseRepository {
      async getUserStockStatus(userId, ticker) {
        const [status] = await this.db.select().from(userStockStatuses).where(
          and7(
            eq19(userStockStatuses.userId, userId),
            eq19(userStockStatuses.ticker, ticker.toUpperCase())
          )
        ).limit(1);
        return status;
      }
      async getUserStockStatuses(userId, status) {
        const conditions = [eq19(userStockStatuses.userId, userId)];
        if (status) {
          conditions.push(eq19(userStockStatuses.status, status));
        }
        return await this.db.select().from(userStockStatuses).where(conditions.length > 1 ? and7(...conditions) : conditions[0]);
      }
      async createUserStockStatus(statusData) {
        const [created] = await this.db.insert(userStockStatuses).values({
          ...statusData,
          ticker: statusData.ticker.toUpperCase()
        }).returning();
        return created;
      }
      async updateUserStockStatus(userId, ticker, updates) {
        const [updated] = await this.db.update(userStockStatuses).set(updates).where(
          and7(
            eq19(userStockStatuses.userId, userId),
            eq19(userStockStatuses.ticker, ticker.toUpperCase())
          )
        ).returning();
        return updated;
      }
      async ensureUserStockStatus(userId, ticker) {
        const existing = await this.getUserStockStatus(userId, ticker);
        if (existing) {
          return existing;
        }
        return await this.createUserStockStatus({
          userId,
          ticker: ticker.toUpperCase(),
          status: "pending"
        });
      }
      async rejectTickerForUser(userId, ticker) {
        await this.ensureUserStockStatus(userId, ticker);
        const updatedStatus = await this.updateUserStockStatus(userId, ticker, {
          status: "rejected",
          rejectedAt: /* @__PURE__ */ new Date()
        });
        if (!updatedStatus) {
          throw new Error("Failed to update user stock status");
        }
        const result = await this.db.update(stocks).set({ recommendationStatus: "rejected" }).where(
          and7(
            eq19(stocks.userId, userId),
            eq19(stocks.ticker, ticker.toUpperCase())
          )
        );
        const stocksUpdated = result.rowCount || 0;
        return {
          userStatus: updatedStatus,
          stocksUpdated
        };
      }
    };
  }
});

// server/repositories/followedStockRepository.ts
import { eq as eq20, desc as desc11, sql as sql16, and as and8 } from "drizzle-orm";
var FollowedStockRepository;
var init_followedStockRepository = __esm({
  "server/repositories/followedStockRepository.ts"() {
    "use strict";
    init_base();
    init_schema();
    init_eventDispatcher();
    FollowedStockRepository = class extends BaseRepository {
      async getUserFollowedStocks(userId) {
        return await this.db.select().from(followedStocks).where(eq20(followedStocks.userId, userId)).orderBy(desc11(followedStocks.followedAt));
      }
      async followStock(follow) {
        const [newFollow] = await this.db.insert(followedStocks).values(follow).returning();
        eventDispatcher.emit("FOLLOWED_STOCK_UPDATED", {
          type: "FOLLOWED_STOCK_UPDATED",
          userId: follow.userId,
          ticker: follow.ticker,
          data: { action: "follow" }
        });
        return newFollow;
      }
      async unfollowStock(ticker, userId) {
        await this.db.delete(followedStocks).where(
          and8(
            eq20(followedStocks.ticker, ticker),
            eq20(followedStocks.userId, userId)
          )
        );
        eventDispatcher.emit("FOLLOWED_STOCK_UPDATED", {
          type: "FOLLOWED_STOCK_UPDATED",
          userId,
          ticker,
          data: { action: "unfollow" }
        });
        return true;
      }
      async toggleStockPosition(ticker, userId, hasEnteredPosition, entryPrice) {
        const updateData = {
          hasEnteredPosition
        };
        if (hasEnteredPosition && entryPrice !== void 0) {
          updateData.entryPrice = entryPrice.toString();
        } else if (!hasEnteredPosition) {
          updateData.entryPrice = null;
        }
        const result = await this.db.update(followedStocks).set(updateData).where(
          and8(
            eq20(followedStocks.ticker, ticker),
            eq20(followedStocks.userId, userId)
          )
        ).returning();
        if (result.length === 0) {
          throw new Error("Stock is not being followed");
        }
        eventDispatcher.emit("FOLLOWED_STOCK_UPDATED", {
          type: "FOLLOWED_STOCK_UPDATED",
          userId,
          ticker,
          data: { action: "position_toggle", hasEnteredPosition, entryPrice: updateData.entryPrice }
        });
        return true;
      }
      async closePosition(ticker, userId, sellPrice, quantity) {
        const followedStockResult = await this.db.select().from(followedStocks).where(
          and8(
            eq20(followedStocks.ticker, ticker),
            eq20(followedStocks.userId, userId)
          )
        ).limit(1);
        if (followedStockResult.length === 0) {
          throw new Error("Stock is not being followed");
        }
        const stock = followedStockResult[0];
        if (!stock.hasEnteredPosition || !stock.entryPrice) {
          throw new Error("No open position to close");
        }
        const entryPriceNum = parseFloat(stock.entryPrice);
        const pnl = (sellPrice - entryPriceNum) * quantity;
        const sellDate = /* @__PURE__ */ new Date();
        await this.db.update(followedStocks).set({
          sellPrice: sellPrice.toString(),
          sellDate,
          pnl: pnl.toFixed(2),
          hasEnteredPosition: false
        }).where(
          and8(
            eq20(followedStocks.ticker, ticker),
            eq20(followedStocks.userId, userId)
          )
        );
        eventDispatcher.emit("FOLLOWED_STOCK_UPDATED", {
          type: "FOLLOWED_STOCK_UPDATED",
          userId,
          ticker,
          data: { action: "close_position", sellPrice, pnl, sellDate }
        });
        return {
          pnl: pnl.toFixed(2),
          sellPrice: sellPrice.toString(),
          sellDate
        };
      }
      async getTotalPnL(userId) {
        const result = await this.db.select({
          totalPnl: sql16`COALESCE(SUM(CAST(${followedStocks.pnl} AS DECIMAL)), 0)`
        }).from(followedStocks).where(eq20(followedStocks.userId, userId));
        return result[0]?.totalPnl || 0;
      }
      async getFollowerCountForTicker(ticker) {
        const result = await this.db.select({ count: sql16`count(*)::int` }).from(followedStocks).where(eq20(followedStocks.ticker, ticker));
        return result[0]?.count || 0;
      }
      async getFollowerUserIdsForTicker(ticker) {
        const result = await this.db.select({ userId: followedStocks.userId }).from(followedStocks).where(eq20(followedStocks.ticker, ticker));
        return result.map((r) => r.userId);
      }
      async hasAnyUserPositionInTicker(ticker) {
        const result = await this.db.select({ id: followedStocks.id }).from(followedStocks).where(
          and8(
            eq20(followedStocks.ticker, ticker),
            eq20(followedStocks.hasEnteredPosition, true)
          )
        ).limit(1);
        return result.length > 0;
      }
      async getFollowedStocksWithPrices(userId) {
        const followedStocksList = await this.getUserFollowedStocks(userId);
        const results = [];
        for (const followed of followedStocksList) {
          const stockData = await this.db.select().from(stocks).where(eq20(stocks.ticker, followed.ticker)).orderBy(desc11(stocks.lastUpdated)).limit(1);
          if (stockData.length > 0) {
            const stock = stockData[0];
            const currentPrice = parseFloat(stock.currentPrice);
            const previousPrice = stock.previousClose ? parseFloat(stock.previousClose) : currentPrice;
            const priceChange = currentPrice - previousPrice;
            const priceChangePercent = previousPrice !== 0 ? priceChange / previousPrice * 100 : 0;
            results.push({
              ...followed,
              currentPrice: stock.currentPrice,
              priceChange: priceChange.toFixed(2),
              priceChangePercent: priceChangePercent.toFixed(2)
            });
          } else {
            results.push({
              ...followed,
              currentPrice: "0.00",
              priceChange: "0.00",
              priceChangePercent: "0.00"
            });
          }
        }
        return results;
      }
      async getFollowedStocksWithStatus(userId) {
        const followedWithPrices = await this.getFollowedStocksWithPrices(userId);
        const results = [];
        for (const followed of followedWithPrices) {
          const stockData = await this.db.select().from(stocks).where(eq20(stocks.ticker, followed.ticker)).orderBy(desc11(stocks.lastUpdated)).limit(1);
          const stock = stockData[0];
          const insiderAction = stock?.recommendation?.toUpperCase() || null;
          const jobs = await this.db.select().from(aiAnalysisJobs).where(eq20(aiAnalysisJobs.ticker, followed.ticker)).orderBy(desc11(aiAnalysisJobs.createdAt)).limit(1);
          const latestJob = jobs[0];
          const jobStatus = latestJob?.status || null;
          const briefs = await this.db.select().from(dailyBriefs).where(
            and8(
              eq20(dailyBriefs.ticker, followed.ticker),
              eq20(dailyBriefs.userId, userId)
            )
          ).orderBy(desc11(dailyBriefs.briefDate)).limit(1);
          const latestBrief = briefs[0];
          const normalizeStance = (rawStance) => {
            if (!rawStance) return null;
            const stance = rawStance.toLowerCase().trim();
            if (stance === "enter") return "buy";
            if (stance === "wait") return "hold";
            if (stance === "buy" || stance === "sell" || stance === "hold") return stance;
            this.log(`Unknown stance value: "${rawStance}", defaulting to "hold"`, "warn");
            return "hold";
          };
          const watchingStance = normalizeStance(latestBrief?.watchingStance);
          const owningStance = normalizeStance(latestBrief?.owningStance);
          const aiScore = latestBrief?.watchingConfidence ?? null;
          const analyses = await this.db.select().from(stockAnalyses).where(eq20(stockAnalyses.ticker, followed.ticker)).limit(1);
          const analysis = analyses[0];
          const integratedScore = analysis?.integratedScore ?? null;
          let stanceAlignment = null;
          if (watchingStance || owningStance) {
            if (watchingStance === "buy" || watchingStance === "sell" || owningStance === "buy" || owningStance === "sell") {
              stanceAlignment = "act";
            } else {
              stanceAlignment = "hold";
            }
          }
          results.push({
            ...followed,
            jobStatus,
            insiderAction,
            aiStance: watchingStance || owningStance,
            aiScore,
            integratedScore,
            stanceAlignment
          });
        }
        return results;
      }
    };
  }
});

// server/repositories/dailyBriefRepository.ts
import { eq as eq21, desc as desc12, and as and9 } from "drizzle-orm";
var DailyBriefRepository;
var init_dailyBriefRepository = __esm({
  "server/repositories/dailyBriefRepository.ts"() {
    "use strict";
    init_base();
    init_schema();
    DailyBriefRepository = class extends BaseRepository {
      // User-specific daily briefs
      async getDailyBriefsForTicker(ticker, userId) {
        return await this.db.select().from(dailyBriefs).where(
          and9(
            eq21(dailyBriefs.ticker, ticker),
            eq21(dailyBriefs.userId, userId)
          )
        ).orderBy(desc12(dailyBriefs.briefDate)).limit(7);
      }
      async getDailyBriefForUser(userId, ticker, briefDate) {
        const [brief] = await this.db.select().from(dailyBriefs).where(
          and9(
            eq21(dailyBriefs.userId, userId),
            eq21(dailyBriefs.ticker, ticker),
            eq21(dailyBriefs.briefDate, briefDate)
          )
        ).limit(1);
        return brief;
      }
      async createDailyBrief(brief) {
        const [existing] = await this.db.select().from(dailyBriefs).where(
          and9(
            eq21(dailyBriefs.userId, brief.userId),
            eq21(dailyBriefs.ticker, brief.ticker),
            eq21(dailyBriefs.briefDate, brief.briefDate)
          )
        ).limit(1);
        if (existing) {
          const [updated] = await this.db.update(dailyBriefs).set(brief).where(eq21(dailyBriefs.id, existing.id)).returning();
          return updated;
        }
        const [created] = await this.db.insert(dailyBriefs).values(brief).returning();
        return created;
      }
      // Global ticker daily briefs (not per-user)
      async getTickerDailyBriefs(ticker, limit = 7) {
        return await this.db.select().from(tickerDailyBriefs).where(eq21(tickerDailyBriefs.ticker, ticker.toUpperCase())).orderBy(desc12(tickerDailyBriefs.briefDate)).limit(limit);
      }
      async createTickerDailyBrief(brief) {
        const [existing] = await this.db.select().from(tickerDailyBriefs).where(
          and9(
            eq21(tickerDailyBriefs.ticker, brief.ticker.toUpperCase()),
            eq21(tickerDailyBriefs.briefDate, brief.briefDate)
          )
        ).limit(1);
        if (existing) {
          const [updated] = await this.db.update(tickerDailyBriefs).set({ ...brief, ticker: brief.ticker.toUpperCase() }).where(eq21(tickerDailyBriefs.id, existing.id)).returning();
          return updated;
        }
        const [created] = await this.db.insert(tickerDailyBriefs).values({ ...brief, ticker: brief.ticker.toUpperCase() }).returning();
        return created;
      }
      async getLatestTickerBrief(ticker) {
        const [brief] = await this.db.select().from(tickerDailyBriefs).where(eq21(tickerDailyBriefs.ticker, ticker.toUpperCase())).orderBy(desc12(tickerDailyBriefs.briefDate)).limit(1);
        return brief;
      }
    };
  }
});

// server/repositories/opportunityRepository.ts
import { eq as eq22, desc as desc13, sql as sql17, and as and10 } from "drizzle-orm";
var OpportunityRepository;
var init_opportunityRepository = __esm({
  "server/repositories/opportunityRepository.ts"() {
    "use strict";
    init_base();
    init_schema();
    OpportunityRepository = class extends BaseRepository {
      async getOpportunities(options) {
        this.log(`[OpportunityRepository.getOpportunities] Called with options:`, options);
        const conditions = [];
        if (options?.cadence === "daily") {
          conditions.push(eq22(opportunities.cadence, "daily"));
        } else if (options?.cadence === "hourly") {
          conditions.push(eq22(opportunities.cadence, "hourly"));
        }
        if (options?.ticker) {
          conditions.push(eq22(opportunities.ticker, options.ticker.toUpperCase()));
        }
        const twelveDaysAgo = /* @__PURE__ */ new Date();
        twelveDaysAgo.setDate(twelveDaysAgo.getDate() - 12);
        const cutoffDateStr = twelveDaysAgo.toISOString().split("T")[0];
        this.log(`[OpportunityRepository.getOpportunities] 12-day cutoff:`, cutoffDateStr);
        conditions.push(sql17`${opportunities.insiderTradeDate} >= ${cutoffDateStr}`);
        let query = this.db.select().from(opportunities);
        if (conditions.length > 0) {
          query = query.where(and10(...conditions));
        }
        const results = await query.orderBy(desc13(opportunities.createdAt));
        this.log(`[OpportunityRepository.getOpportunities] Raw results count:`, results.length);
        if (options?.userId) {
          const [rejections, followedStocksList] = await Promise.all([
            this.getUserRejections(options.userId),
            // Note: getUserFollowedStocks is in FollowedStockRepository - this will need to be injected
            // For now, we'll query directly to avoid circular dependency
            this.db.select().from(followedStocks).where(eq22(followedStocks.userId, options.userId))
          ]);
          const rejectedIds = new Set(rejections.map((r) => r.opportunityId));
          const followedTickers = new Set(followedStocksList.map((f) => f.ticker.toUpperCase()));
          this.log(`[OpportunityRepository.getOpportunities] Rejections:`, rejectedIds.size, "Followed tickers:", Array.from(followedTickers));
          const filtered = results.filter(
            (opp) => !rejectedIds.has(opp.id) && !followedTickers.has(opp.ticker.toUpperCase())
          );
          this.log(`[OpportunityRepository.getOpportunities] After filtering:`, filtered.length);
          return filtered;
        }
        return results;
      }
      async getOpportunity(id) {
        const [opportunity] = await this.db.select().from(opportunities).where(eq22(opportunities.id, id)).limit(1);
        return opportunity;
      }
      async getOpportunityByTransaction(ticker, insiderTradeDate, insiderName, recommendation, cadence) {
        const conditions = [
          eq22(opportunities.ticker, ticker),
          eq22(opportunities.insiderTradeDate, insiderTradeDate),
          eq22(opportunities.insiderName, insiderName),
          eq22(opportunities.recommendation, recommendation)
        ];
        if (cadence) {
          conditions.push(eq22(opportunities.cadence, cadence));
        }
        const [opportunity] = await this.db.select().from(opportunities).where(and10(...conditions)).limit(1);
        return opportunity;
      }
      async createOpportunity(opportunity) {
        const [created] = await this.db.insert(opportunities).values(opportunity).returning();
        return created;
      }
      async updateOpportunity(id, updates) {
        const [updated] = await this.db.update(opportunities).set({ ...updates, lastUpdated: sql17`now()` }).where(eq22(opportunities.id, id)).returning();
        return updated;
      }
      async deleteOpportunity(id) {
        const result = await this.db.delete(opportunities).where(eq22(opportunities.id, id)).returning();
        return result.length > 0;
      }
      // Opportunity Batches
      async createOpportunityBatch(batch) {
        const [created] = await this.db.insert(opportunityBatches).values(batch).returning();
        return created;
      }
      async updateOpportunityBatchStats(batchId, stats) {
        const statsJson = JSON.stringify({ stats });
        await this.db.execute(sql17`
      UPDATE opportunity_batches 
      SET count = ${stats.added},
          metadata = COALESCE(metadata, '{}'::jsonb) || ${statsJson}::jsonb
      WHERE id = ${batchId}
    `);
      }
      async getLatestBatch(cadence) {
        const [batch] = await this.db.select().from(opportunityBatches).where(eq22(opportunityBatches.cadence, cadence)).orderBy(desc13(opportunityBatches.fetchedAt)).limit(1);
        return batch;
      }
      async getLatestBatchWithStats() {
        const [batch] = await this.db.select().from(opportunityBatches).orderBy(desc13(opportunityBatches.fetchedAt)).limit(1);
        return batch;
      }
      // User Opportunity Rejections
      async rejectOpportunity(userId, opportunityId) {
        const [rejection] = await this.db.insert(userOpportunityRejections).values({ userId, opportunityId }).onConflictDoNothing().returning();
        if (!rejection) {
          const [existing] = await this.db.select().from(userOpportunityRejections).where(
            and10(
              eq22(userOpportunityRejections.userId, userId),
              eq22(userOpportunityRejections.opportunityId, opportunityId)
            )
          );
          return existing;
        }
        return rejection;
      }
      async unrejectOpportunity(userId, opportunityId) {
        const result = await this.db.delete(userOpportunityRejections).where(
          and10(
            eq22(userOpportunityRejections.userId, userId),
            eq22(userOpportunityRejections.opportunityId, opportunityId)
          )
        ).returning();
        return result.length > 0;
      }
      async getUserRejections(userId) {
        return await this.db.select().from(userOpportunityRejections).where(eq22(userOpportunityRejections.userId, userId));
      }
      async isOpportunityRejected(userId, opportunityId) {
        const [rejection] = await this.db.select().from(userOpportunityRejections).where(
          and10(
            eq22(userOpportunityRejections.userId, userId),
            eq22(userOpportunityRejections.opportunityId, opportunityId)
          )
        ).limit(1);
        return !!rejection;
      }
    };
  }
});

// server/repositories/portfolioHoldingRepository.ts
import { eq as eq23, and as and11, sql as sql18 } from "drizzle-orm";
var PortfolioHoldingRepository;
var init_portfolioHoldingRepository = __esm({
  "server/repositories/portfolioHoldingRepository.ts"() {
    "use strict";
    init_base();
    init_schema();
    PortfolioHoldingRepository = class extends BaseRepository {
      /**
       * Update holding values based on current stock price
       * This is a helper method used internally by other methods
       */
      async updateHoldingValues(holding) {
        const [stock] = await this.db.select().from(stocks).where(and11(
          eq23(stocks.ticker, holding.ticker),
          eq23(stocks.userId, holding.userId)
        ));
        if (!stock) return;
        const currentPrice = parseFloat(stock.currentPrice);
        const avgPrice = parseFloat(holding.averagePurchasePrice);
        const currentValue = currentPrice * holding.quantity;
        const totalCost = avgPrice * holding.quantity;
        const profitLoss = currentValue - totalCost;
        const profitLossPercent = profitLoss / totalCost * 100;
        await this.db.update(portfolioHoldings).set({
          currentValue: currentValue.toFixed(2),
          profitLoss: profitLoss.toFixed(2),
          profitLossPercent: profitLossPercent.toFixed(2),
          lastUpdated: sql18`now()`
        }).where(eq23(portfolioHoldings.id, holding.id));
      }
      async getPortfolioHoldings(userId, isSimulated) {
        let whereConditions = [eq23(portfolioHoldings.userId, userId)];
        if (isSimulated !== void 0) {
          whereConditions.push(eq23(portfolioHoldings.isSimulated, isSimulated));
        }
        const holdings = await this.db.select().from(portfolioHoldings).where(and11(...whereConditions));
        for (const holding of holdings) {
          await this.updateHoldingValues(holding);
        }
        return await this.db.select().from(portfolioHoldings).where(and11(...whereConditions));
      }
      async getPortfolioHolding(id, userId) {
        const whereClause = userId ? and11(eq23(portfolioHoldings.id, id), eq23(portfolioHoldings.userId, userId)) : eq23(portfolioHoldings.id, id);
        const [holding] = await this.db.select().from(portfolioHoldings).where(whereClause);
        if (holding) {
          await this.updateHoldingValues(holding);
          const [updated] = await this.db.select().from(portfolioHoldings).where(whereClause);
          return updated;
        }
        return void 0;
      }
      async getPortfolioHoldingByTicker(userId, ticker, isSimulated) {
        let whereConditions = [eq23(portfolioHoldings.userId, userId), eq23(portfolioHoldings.ticker, ticker)];
        if (isSimulated !== void 0) {
          whereConditions.push(eq23(portfolioHoldings.isSimulated, isSimulated));
        }
        const [holding] = await this.db.select().from(portfolioHoldings).where(and11(...whereConditions));
        if (holding) {
          await this.updateHoldingValues(holding);
          const [updated] = await this.db.select().from(portfolioHoldings).where(and11(...whereConditions));
          return updated;
        }
        return void 0;
      }
      async createPortfolioHolding(holding) {
        const [newHolding] = await this.db.insert(portfolioHoldings).values(holding).returning();
        await this.updateHoldingValues(newHolding);
        const [updated] = await this.db.select().from(portfolioHoldings).where(eq23(portfolioHoldings.id, newHolding.id));
        return updated;
      }
      async updatePortfolioHolding(id, updates) {
        const [updatedHolding] = await this.db.update(portfolioHoldings).set({ ...updates, lastUpdated: sql18`now()` }).where(eq23(portfolioHoldings.id, id)).returning();
        if (updatedHolding) {
          await this.updateHoldingValues(updatedHolding);
          const [updated] = await this.db.select().from(portfolioHoldings).where(eq23(portfolioHoldings.id, id));
          return updated;
        }
        return void 0;
      }
      async deletePortfolioHolding(id) {
        const result = await this.db.delete(portfolioHoldings).where(eq23(portfolioHoldings.id, id));
        return result.rowCount ? result.rowCount > 0 : false;
      }
      async deleteSimulatedHoldingsByTicker(userId, ticker) {
        const result = await this.db.delete(portfolioHoldings).where(and11(
          eq23(portfolioHoldings.userId, userId),
          eq23(portfolioHoldings.ticker, ticker),
          eq23(portfolioHoldings.isSimulated, true)
        )).returning();
        return result.length;
      }
    };
  }
});

// server/repositories/tradeRepository.ts
import { eq as eq24, and as and12, desc as desc14 } from "drizzle-orm";
var TradeRepository;
var init_tradeRepository = __esm({
  "server/repositories/tradeRepository.ts"() {
    "use strict";
    init_base();
    init_schema();
    TradeRepository = class extends BaseRepository {
      async getTrades(userId, isSimulated) {
        let whereConditions = [eq24(trades.userId, userId)];
        if (isSimulated !== void 0) {
          whereConditions.push(eq24(trades.isSimulated, isSimulated));
        }
        return await this.db.select().from(trades).where(and12(...whereConditions)).orderBy(desc14(trades.executedAt));
      }
      async getTrade(id, userId) {
        const whereClause = userId ? and12(eq24(trades.id, id), eq24(trades.userId, userId)) : eq24(trades.id, id);
        const [trade] = await this.db.select().from(trades).where(whereClause);
        return trade;
      }
      async createTrade(trade, portfolioHoldingRepository) {
        const isSimulated = trade.isSimulated ?? void 0;
        if (!trade.userId) {
          throw new Error("userId is required to create a trade");
        }
        const existingHolding = await portfolioHoldingRepository.getPortfolioHoldingByTicker(trade.userId, trade.ticker, isSimulated);
        if (trade.type === "sell") {
          if (!existingHolding) {
            throw new Error(`Cannot sell ${trade.ticker}: no holding found`);
          }
          if (trade.quantity > existingHolding.quantity) {
            throw new Error(
              `Cannot sell ${trade.quantity} shares of ${trade.ticker}: only ${existingHolding.quantity} shares available`
            );
          }
        }
        let realizedProfitLoss;
        let realizedProfitLossPercent;
        if (trade.type === "buy") {
          if (existingHolding) {
            const totalQuantity = existingHolding.quantity + trade.quantity;
            const totalCost = parseFloat(existingHolding.averagePurchasePrice) * existingHolding.quantity + parseFloat(trade.price) * trade.quantity;
            const newAvgPrice = totalCost / totalQuantity;
            await portfolioHoldingRepository.updatePortfolioHolding(existingHolding.id, {
              quantity: totalQuantity,
              averagePurchasePrice: newAvgPrice.toFixed(2)
            });
            const updatedHolding = await portfolioHoldingRepository.getPortfolioHolding(existingHolding.id);
            if (updatedHolding) {
              await portfolioHoldingRepository.updateHoldingValues(updatedHolding);
            }
          } else {
            const newHolding = await portfolioHoldingRepository.createPortfolioHolding({
              userId: trade.userId,
              ticker: trade.ticker,
              quantity: trade.quantity,
              averagePurchasePrice: trade.price,
              isSimulated: isSimulated !== void 0 ? isSimulated : false
            });
            await portfolioHoldingRepository.updateHoldingValues(newHolding);
          }
        } else if (trade.type === "sell" && existingHolding) {
          const sellPrice = parseFloat(trade.price);
          const avgPurchasePrice = parseFloat(existingHolding.averagePurchasePrice);
          const profitLoss = (sellPrice - avgPurchasePrice) * trade.quantity;
          const profitLossPercent = (sellPrice - avgPurchasePrice) / avgPurchasePrice * 100;
          realizedProfitLoss = profitLoss.toFixed(2);
          realizedProfitLossPercent = profitLossPercent.toFixed(2);
          const newQuantity = existingHolding.quantity - trade.quantity;
          if (newQuantity <= 0) {
            await portfolioHoldingRepository.deletePortfolioHolding(existingHolding.id);
          } else {
            await portfolioHoldingRepository.updatePortfolioHolding(existingHolding.id, {
              quantity: newQuantity
            });
            const updatedHolding = await portfolioHoldingRepository.getPortfolioHolding(existingHolding.id);
            if (updatedHolding) {
              await portfolioHoldingRepository.updateHoldingValues(updatedHolding);
            }
          }
        }
        const tradeData = {
          ...trade,
          ...realizedProfitLoss && { profitLoss: realizedProfitLoss },
          ...realizedProfitLossPercent && { profitLossPercent: realizedProfitLossPercent }
        };
        const [newTrade] = await this.db.insert(trades).values(tradeData).returning();
        return newTrade;
      }
      async updateTrade(id, updates) {
        const [updatedTrade] = await this.db.update(trades).set(updates).where(eq24(trades.id, id)).returning();
        return updatedTrade;
      }
      async deleteSimulatedTradesByTicker(userId, ticker) {
        const result = await this.db.delete(trades).where(and12(
          eq24(trades.userId, userId),
          eq24(trades.ticker, ticker),
          eq24(trades.isSimulated, true)
        )).returning();
        return result.length;
      }
    };
  }
});

// server/repositories/tradingRuleRepository.ts
import { eq as eq25, sql as sql19 } from "drizzle-orm";
var TradingRuleRepository;
var init_tradingRuleRepository = __esm({
  "server/repositories/tradingRuleRepository.ts"() {
    "use strict";
    init_base();
    init_schema();
    TradingRuleRepository = class extends BaseRepository {
      async getTradingRules(userId) {
        return await this.db.select().from(tradingRules).where(eq25(tradingRules.userId, userId));
      }
      async getTradingRule(id) {
        const [rule] = await this.db.select().from(tradingRules).where(eq25(tradingRules.id, id));
        return rule;
      }
      async createTradingRule(rule) {
        const [newRule] = await this.db.insert(tradingRules).values(rule).returning();
        return newRule;
      }
      async updateTradingRule(id, updates) {
        const [updatedRule] = await this.db.update(tradingRules).set({ ...updates, updatedAt: sql19`now()` }).where(eq25(tradingRules.id, id)).returning();
        return updatedRule;
      }
      async deleteTradingRule(id) {
        const result = await this.db.delete(tradingRules).where(eq25(tradingRules.id, id));
        return result.rowCount ? result.rowCount > 0 : false;
      }
    };
  }
});

// server/repositories/compoundRuleRepository.ts
import { eq as eq26, sql as sql20 } from "drizzle-orm";
var CompoundRuleRepository;
var init_compoundRuleRepository = __esm({
  "server/repositories/compoundRuleRepository.ts"() {
    "use strict";
    init_base();
    init_schema();
    CompoundRuleRepository = class extends BaseRepository {
      async getCompoundRules() {
        const allRules = await this.db.select().from(tradingRules).orderBy(tradingRules.priority);
        const compoundRules = [];
        for (const rule of allRules) {
          const groups = await this.db.select().from(ruleConditionGroups).where(eq26(ruleConditionGroups.ruleId, rule.id)).orderBy(ruleConditionGroups.groupOrder);
          const groupsWithConditions = await Promise.all(
            groups.map(async (group) => {
              const conditions = await this.db.select().from(ruleConditions).where(eq26(ruleConditions.groupId, group.id));
              return { ...group, conditions };
            })
          );
          const actions = await this.db.select().from(ruleActions).where(eq26(ruleActions.ruleId, rule.id)).orderBy(ruleActions.actionOrder);
          compoundRules.push({
            ...rule,
            groups: groupsWithConditions,
            actions
          });
        }
        return compoundRules;
      }
      async getCompoundRule(id) {
        const [rule] = await this.db.select().from(tradingRules).where(eq26(tradingRules.id, id));
        if (!rule) return void 0;
        const groups = await this.db.select().from(ruleConditionGroups).where(eq26(ruleConditionGroups.ruleId, id)).orderBy(ruleConditionGroups.groupOrder);
        const groupsWithConditions = await Promise.all(
          groups.map(async (group) => {
            const conditions = await this.db.select().from(ruleConditions).where(eq26(ruleConditions.groupId, group.id));
            return { ...group, conditions };
          })
        );
        const actions = await this.db.select().from(ruleActions).where(eq26(ruleActions.ruleId, id)).orderBy(ruleActions.actionOrder);
        return {
          ...rule,
          groups: groupsWithConditions,
          actions
        };
      }
      async createCompoundRule(ruleData) {
        const result = await this.db.transaction(async (tx) => {
          const [rule] = await tx.insert(tradingRules).values({
            name: ruleData.name,
            enabled: ruleData.enabled,
            scope: ruleData.scope,
            ticker: ruleData.ticker,
            priority: ruleData.priority
          }).returning();
          const groupsWithConditions = [];
          for (const groupData of ruleData.groups) {
            const [group] = await tx.insert(ruleConditionGroups).values({
              ruleId: rule.id,
              groupOrder: groupData.groupOrder,
              junctionOperator: groupData.junctionOperator,
              description: groupData.description
            }).returning();
            const conditions = [];
            for (const conditionData of groupData.conditions) {
              const [condition] = await tx.insert(ruleConditions).values({
                groupId: group.id,
                metric: conditionData.metric,
                comparator: conditionData.comparator,
                threshold: conditionData.threshold,
                timeframeValue: conditionData.timeframeValue,
                timeframeUnit: conditionData.timeframeUnit,
                metadata: conditionData.metadata
              }).returning();
              conditions.push(condition);
            }
            groupsWithConditions.push({ ...group, conditions });
          }
          const actions = [];
          for (const actionData of ruleData.actions) {
            const [action] = await tx.insert(ruleActions).values({
              ruleId: rule.id,
              actionOrder: actionData.actionOrder,
              actionType: actionData.actionType,
              quantity: actionData.quantity,
              percentage: actionData.percentage,
              allowRepeat: actionData.allowRepeat,
              cooldownMinutes: actionData.cooldownMinutes
            }).returning();
            actions.push(action);
          }
          return {
            ...rule,
            groups: groupsWithConditions,
            actions
          };
        });
        return result;
      }
      async updateCompoundRule(id, ruleData) {
        const existing = await this.getCompoundRule(id);
        if (!existing) return void 0;
        await this.db.transaction(async (tx) => {
          await tx.update(tradingRules).set({
            name: ruleData.name ?? existing.name,
            enabled: ruleData.enabled ?? existing.enabled,
            scope: ruleData.scope ?? existing.scope,
            ticker: ruleData.ticker ?? existing.ticker,
            priority: ruleData.priority ?? existing.priority,
            updatedAt: sql20`now()`
          }).where(eq26(tradingRules.id, id));
          if (ruleData.groups) {
            await tx.delete(ruleConditionGroups).where(eq26(ruleConditionGroups.ruleId, id));
            for (const groupData of ruleData.groups) {
              const [group] = await tx.insert(ruleConditionGroups).values({
                ruleId: id,
                groupOrder: groupData.groupOrder,
                junctionOperator: groupData.junctionOperator,
                description: groupData.description
              }).returning();
              for (const conditionData of groupData.conditions) {
                await tx.insert(ruleConditions).values({
                  groupId: group.id,
                  metric: conditionData.metric,
                  comparator: conditionData.comparator,
                  threshold: conditionData.threshold,
                  timeframeValue: conditionData.timeframeValue,
                  timeframeUnit: conditionData.timeframeUnit,
                  metadata: conditionData.metadata
                });
              }
            }
          }
          if (ruleData.actions) {
            await tx.delete(ruleActions).where(eq26(ruleActions.ruleId, id));
            for (const actionData of ruleData.actions) {
              await tx.insert(ruleActions).values({
                ruleId: id,
                actionOrder: actionData.actionOrder,
                actionType: actionData.actionType,
                quantity: actionData.quantity,
                percentage: actionData.percentage,
                allowRepeat: actionData.allowRepeat,
                cooldownMinutes: actionData.cooldownMinutes
              });
            }
          }
        });
        return await this.getCompoundRule(id);
      }
      async deleteCompoundRule(id) {
        const result = await this.db.delete(tradingRules).where(eq26(tradingRules.id, id));
        return result.rowCount ? result.rowCount > 0 : false;
      }
    };
  }
});

// server/repositories/ruleExecutionRepository.ts
import { eq as eq27, and as and13, desc as desc15 } from "drizzle-orm";
var RuleExecutionRepository;
var init_ruleExecutionRepository = __esm({
  "server/repositories/ruleExecutionRepository.ts"() {
    "use strict";
    init_base();
    init_schema();
    RuleExecutionRepository = class extends BaseRepository {
      async getRuleExecutions(ruleId, ticker) {
        let query = this.db.select().from(ruleExecutions).orderBy(desc15(ruleExecutions.triggeredAt));
        if (ruleId && ticker) {
          return await query.where(and13(eq27(ruleExecutions.ruleId, ruleId), eq27(ruleExecutions.ticker, ticker)));
        } else if (ruleId) {
          return await query.where(eq27(ruleExecutions.ruleId, ruleId));
        } else if (ticker) {
          return await query.where(eq27(ruleExecutions.ticker, ticker));
        }
        return await query;
      }
      async createRuleExecution(execution) {
        const [newExecution] = await this.db.insert(ruleExecutions).values(execution).returning();
        return newExecution;
      }
    };
  }
});

// server/repositories/backtestRepository.ts
import { eq as eq28, desc as desc16 } from "drizzle-orm";
var BacktestRepository;
var init_backtestRepository = __esm({
  "server/repositories/backtestRepository.ts"() {
    "use strict";
    init_base();
    init_schema();
    BacktestRepository = class extends BaseRepository {
      async getBacktests() {
        return await this.db.select().from(backtests).orderBy(desc16(backtests.createdAt));
      }
      async getBacktest(id) {
        const [backtest] = await this.db.select().from(backtests).where(eq28(backtests.id, id));
        return backtest;
      }
      async createBacktest(backtest) {
        const [newBacktest] = await this.db.insert(backtests).values(backtest).returning();
        return newBacktest;
      }
    };
  }
});

// server/repositories/backtestJobRepository.ts
import { eq as eq29, and as and14 } from "drizzle-orm";
var BacktestJobRepository;
var init_backtestJobRepository = __esm({
  "server/repositories/backtestJobRepository.ts"() {
    "use strict";
    init_base();
    init_schema();
    BacktestJobRepository = class extends BaseRepository {
      // Backtest Jobs
      async getBacktestJobs(userId) {
        return await this.db.select().from(backtestJobs).where(eq29(backtestJobs.userId, userId)).orderBy(backtestJobs.createdAt);
      }
      async getBacktestJob(id) {
        const [job] = await this.db.select().from(backtestJobs).where(eq29(backtestJobs.id, id));
        return job;
      }
      async createBacktestJob(job) {
        const [newJob] = await this.db.insert(backtestJobs).values(job).returning();
        return newJob;
      }
      async updateBacktestJob(id, updates) {
        const [updated] = await this.db.update(backtestJobs).set(updates).where(eq29(backtestJobs.id, id)).returning();
        return updated;
      }
      async deleteBacktestJob(id) {
        await this.db.delete(backtestPriceData).where(eq29(backtestPriceData.jobId, id));
        await this.db.delete(backtestScenarios).where(eq29(backtestScenarios.jobId, id));
        await this.db.delete(backtestJobs).where(eq29(backtestJobs.id, id));
        return true;
      }
      // Backtest Price Data
      async getBacktestPriceData(jobId) {
        const allData = await this.db.select().from(backtestPriceData).where(eq29(backtestPriceData.jobId, jobId));
        const uniqueByTicker = /* @__PURE__ */ new Map();
        allData.forEach((data) => {
          if (!uniqueByTicker.has(data.ticker) || data.createdAt && uniqueByTicker.get(data.ticker).createdAt && data.createdAt > uniqueByTicker.get(data.ticker).createdAt) {
            uniqueByTicker.set(data.ticker, data);
          }
        });
        return Array.from(uniqueByTicker.values());
      }
      async getCachedPriceData(ticker, insiderBuyDate) {
        const results = await this.db.select().from(backtestPriceData).where(
          and14(
            eq29(backtestPriceData.ticker, ticker),
            eq29(backtestPriceData.insiderBuyDate, insiderBuyDate)
          )
        ).limit(1);
        return results[0];
      }
      async createBacktestPriceData(data) {
        const [newData] = await this.db.insert(backtestPriceData).values(data).returning();
        return newData;
      }
      // Backtest Scenarios (returns only top 10 sorted by P&L)
      async getBacktestScenarios(jobId) {
        return await this.db.select().from(backtestScenarios).where(eq29(backtestScenarios.jobId, jobId)).orderBy(backtestScenarios.totalProfitLoss).limit(10);
      }
      async createBacktestScenario(scenario) {
        const [newScenario] = await this.db.insert(backtestScenarios).values(scenario).returning();
        return newScenario;
      }
    };
  }
});

// server/repositories/stockRepository.ts
import { eq as eq30, desc as desc17, sql as sql21, and as and15, inArray as inArray4, lt, or } from "drizzle-orm";
var StockRepository;
var init_stockRepository = __esm({
  "server/repositories/stockRepository.ts"() {
    "use strict";
    init_base();
    init_schema();
    StockRepository = class extends BaseRepository {
      async getStocks(userId) {
        const results = await this.db.select({
          stock: stocks,
          analysisJob: aiAnalysisJobs
        }).from(stocks).leftJoin(
          aiAnalysisJobs,
          and15(
            eq30(stocks.ticker, aiAnalysisJobs.ticker),
            sql21`${aiAnalysisJobs.status} IN ('pending', 'processing')`
          )
        ).where(eq30(stocks.userId, userId));
        return results.map((row) => ({
          ...row.stock,
          analysisJob: row.analysisJob || void 0
        }));
      }
      async getStocksByUserStatus(userId, status) {
        const results = await this.db.select({
          stock: stocks
        }).from(stocks).leftJoin(
          userStockStatuses,
          and15(
            eq30(stocks.ticker, userStockStatuses.ticker),
            eq30(userStockStatuses.userId, userId)
          )
        ).where(
          and15(
            eq30(stocks.userId, userId),
            // CRITICAL: Filter stocks by userId for tenant isolation
            eq30(userStockStatuses.status, status)
          )
        );
        return results.map((row) => row.stock);
      }
      async getStock(userId, ticker) {
        const [stock] = await this.db.select().from(stocks).where(and15(
          eq30(stocks.userId, userId),
          eq30(stocks.ticker, ticker)
        )).orderBy(desc17(stocks.lastUpdated)).limit(1);
        return stock;
      }
      async getAnyStockForTicker(ticker) {
        const [stock] = await this.db.select().from(stocks).where(eq30(stocks.ticker, ticker)).limit(1);
        return stock;
      }
      async getUserStocksForTicker(userId, ticker) {
        return await this.db.select().from(stocks).where(and15(
          eq30(stocks.userId, userId),
          eq30(stocks.ticker, ticker)
        ));
      }
      async getAllStocksForTickerGlobal(ticker) {
        return await this.db.select().from(stocks).where(eq30(stocks.ticker, ticker));
      }
      async getTransactionByCompositeKey(userId, ticker, insiderTradeDate, insiderName, recommendation) {
        const [stock] = await this.db.select().from(stocks).where(
          and15(
            eq30(stocks.userId, userId),
            eq30(stocks.ticker, ticker),
            eq30(stocks.insiderTradeDate, insiderTradeDate),
            eq30(stocks.insiderName, insiderName),
            eq30(stocks.recommendation, recommendation)
          )
        );
        return stock;
      }
      async createStock(stock) {
        const [newStock] = await this.db.insert(stocks).values(stock).returning();
        return newStock;
      }
      async updateStock(userId, ticker, updates, portfolioHoldingRepository) {
        const [updatedStock] = await this.db.update(stocks).set({ ...updates, lastUpdated: sql21`now()` }).where(and15(
          eq30(stocks.userId, userId),
          eq30(stocks.ticker, ticker)
        )).returning();
        if (updatedStock) {
          const holdings = await this.db.select().from(portfolioHoldings).where(and15(
            eq30(portfolioHoldings.userId, userId),
            eq30(portfolioHoldings.ticker, ticker)
          ));
          for (const holding of holdings) {
            await portfolioHoldingRepository.updateHoldingValues(holding);
          }
        }
        return updatedStock;
      }
      async deleteStock(userId, ticker) {
        const result = await this.db.delete(stocks).where(and15(
          eq30(stocks.userId, userId),
          eq30(stocks.ticker, ticker)
        ));
        return result.rowCount ? result.rowCount > 0 : false;
      }
      async unrejectStock(userId, ticker) {
        const [updatedStock] = await this.db.update(stocks).set({
          recommendationStatus: "pending",
          rejectedAt: null,
          lastUpdated: sql21`now()`
        }).where(and15(
          eq30(stocks.userId, userId),
          eq30(stocks.ticker, ticker)
        )).returning();
        return updatedStock;
      }
      async deleteExpiredPendingStocks(ageInDays) {
        const startTime = Date.now();
        const cutoffDate = /* @__PURE__ */ new Date();
        cutoffDate.setDate(cutoffDate.getDate() - ageInDays);
        this.log(`[CLEANUP] Starting cleanup: deleting pending stocks older than ${ageInDays} days (before ${cutoffDate.toISOString()})`);
        const result = await this.db.transaction(async (tx) => {
          const candidates = await tx.select({ ticker: stocks.ticker }).from(stocks).where(and15(
            lt(stocks.lastUpdated, cutoffDate),
            eq30(stocks.recommendationStatus, "pending")
          )).for("update");
          if (candidates.length === 0) {
            this.log("[CLEANUP] No expired pending stocks found");
            return { count: 0, tickers: [] };
          }
          const candidateTickers = candidates.map((c) => c.ticker);
          this.log(`[CLEANUP] Found ${candidateTickers.length} candidates: ${candidateTickers.join(", ")}`);
          const holdingsCheck = await tx.select({ ticker: portfolioHoldings.ticker }).from(portfolioHoldings).where(inArray4(portfolioHoldings.ticker, candidateTickers));
          const tradesCheck = await tx.select({ ticker: trades.ticker }).from(trades).where(inArray4(trades.ticker, candidateTickers));
          if (holdingsCheck.length > 0 || tradesCheck.length > 0) {
            const conflictTickers = Array.from(/* @__PURE__ */ new Set([
              ...holdingsCheck.map((h) => h.ticker),
              ...tradesCheck.map((t) => t.ticker)
            ]));
            this.log.error(`[CLEANUP] ABORT: Found portfolio/trade data for tickers: ${conflictTickers.join(", ")}`);
            throw new Error(`Cannot delete stocks with existing holdings/trades: ${conflictTickers.join(", ")}`);
          }
          const deleteCounts = {
            aiJobs: 0,
            analyses: 0,
            views: 0,
            userStatuses: 0,
            comments: 0
          };
          const deletedJobs = await tx.delete(aiAnalysisJobs).where(inArray4(aiAnalysisJobs.ticker, candidateTickers)).returning({ ticker: aiAnalysisJobs.ticker });
          deleteCounts.aiJobs = deletedJobs.length;
          const deletedAnalyses = await tx.delete(stockAnalyses).where(inArray4(stockAnalyses.ticker, candidateTickers)).returning({ ticker: stockAnalyses.ticker });
          deleteCounts.analyses = deletedAnalyses.length;
          const deletedViews = await tx.delete(stockViews).where(inArray4(stockViews.ticker, candidateTickers)).returning({ ticker: stockViews.ticker });
          deleteCounts.views = deletedViews.length;
          const deletedStatuses = await tx.delete(userStockStatuses).where(inArray4(userStockStatuses.ticker, candidateTickers)).returning({ ticker: userStockStatuses.ticker });
          deleteCounts.userStatuses = deletedStatuses.length;
          const deletedComments = await tx.delete(stockComments).where(inArray4(stockComments.ticker, candidateTickers)).returning({ ticker: stockComments.ticker });
          deleteCounts.comments = deletedComments.length;
          const deletedStocks = await tx.delete(stocks).where(inArray4(stocks.ticker, candidateTickers)).returning({ ticker: stocks.ticker });
          this.log(`[CLEANUP] Deleted child records:`, deleteCounts);
          this.log(`[CLEANUP] Deleted ${deletedStocks.length} stocks: ${deletedStocks.map((s) => s.ticker).join(", ")}`);
          return { count: deletedStocks.length, tickers: deletedStocks.map((s) => s.ticker) };
        });
        const elapsedMs = Date.now() - startTime;
        this.log(`[CLEANUP] Cleanup completed in ${elapsedMs}ms - Deleted ${result.count} stocks`);
        return result;
      }
      async deleteExpiredRejectedStocks(ageInDays) {
        const startTime = Date.now();
        const cutoffDate = /* @__PURE__ */ new Date();
        cutoffDate.setDate(cutoffDate.getDate() - ageInDays);
        this.log(`[CLEANUP] Starting cleanup: deleting rejected stocks older than ${ageInDays} days (before ${cutoffDate.toISOString()})`);
        const result = await this.db.transaction(async (tx) => {
          const candidates = await tx.select({ ticker: stocks.ticker }).from(stocks).where(and15(
            lt(stocks.rejectedAt, cutoffDate),
            sql21`${stocks.rejectedAt} IS NOT NULL`,
            eq30(stocks.recommendationStatus, "rejected")
          )).for("update");
          if (candidates.length === 0) {
            this.log("[CLEANUP] No expired rejected stocks found");
            return { count: 0, tickers: [] };
          }
          const candidateTickers = candidates.map((c) => c.ticker);
          this.log(`[CLEANUP] Found ${candidateTickers.length} rejected candidates: ${candidateTickers.join(", ")}`);
          const holdingsCheck = await tx.select({ ticker: portfolioHoldings.ticker }).from(portfolioHoldings).where(inArray4(portfolioHoldings.ticker, candidateTickers));
          const tradesCheck = await tx.select({ ticker: trades.ticker }).from(trades).where(inArray4(trades.ticker, candidateTickers));
          if (holdingsCheck.length > 0 || tradesCheck.length > 0) {
            const conflictTickers = Array.from(/* @__PURE__ */ new Set([
              ...holdingsCheck.map((h) => h.ticker),
              ...tradesCheck.map((t) => t.ticker)
            ]));
            this.log.error(`[CLEANUP] ABORT: Found portfolio/trade data for tickers: ${conflictTickers.join(", ")}`);
            throw new Error(`Cannot delete stocks with existing holdings/trades: ${conflictTickers.join(", ")}`);
          }
          const deleteCounts = {
            aiJobs: 0,
            analyses: 0,
            views: 0,
            userStatuses: 0,
            comments: 0
          };
          const deletedJobs = await tx.delete(aiAnalysisJobs).where(inArray4(aiAnalysisJobs.ticker, candidateTickers)).returning({ ticker: aiAnalysisJobs.ticker });
          deleteCounts.aiJobs = deletedJobs.length;
          const deletedAnalyses = await tx.delete(stockAnalyses).where(inArray4(stockAnalyses.ticker, candidateTickers)).returning({ ticker: stockAnalyses.ticker });
          deleteCounts.analyses = deletedAnalyses.length;
          const deletedViews = await tx.delete(stockViews).where(inArray4(stockViews.ticker, candidateTickers)).returning({ ticker: stockViews.ticker });
          deleteCounts.views = deletedViews.length;
          const deletedStatuses = await tx.delete(userStockStatuses).where(inArray4(userStockStatuses.ticker, candidateTickers)).returning({ ticker: userStockStatuses.ticker });
          deleteCounts.userStatuses = deletedStatuses.length;
          const deletedComments = await tx.delete(stockComments).where(inArray4(stockComments.ticker, candidateTickers)).returning({ ticker: stockComments.ticker });
          deleteCounts.comments = deletedComments.length;
          const deletedStocks = await tx.delete(stocks).where(inArray4(stocks.ticker, candidateTickers)).returning({ ticker: stocks.ticker });
          this.log(`[CLEANUP] Deleted child records:`, deleteCounts);
          this.log(`[CLEANUP] Deleted ${deletedStocks.length} rejected stocks: ${deletedStocks.map((s) => s.ticker).join(", ")}`);
          return { count: deletedStocks.length, tickers: deletedStocks.map((s) => s.ticker) };
        });
        const elapsedMs = Date.now() - startTime;
        this.log(`[CLEANUP] Rejected stocks cleanup completed in ${elapsedMs}ms - Deleted ${result.count} stocks`);
        return result;
      }
      async deleteStocksOlderThan(ageInDays) {
        const startTime = Date.now();
        const cutoffDate = /* @__PURE__ */ new Date();
        cutoffDate.setDate(cutoffDate.getDate() - ageInDays);
        const cutoffDateString = cutoffDate.toISOString().split("T")[0];
        this.log(`[CLEANUP] Starting 2-week horizon cleanup: deleting stocks older than ${ageInDays} days (before ${cutoffDateString}), excluding followed stocks`);
        const result = await this.db.transaction(async (tx) => {
          const candidates = await tx.select({ ticker: stocks.ticker }).from(stocks).leftJoin(followedStocks, eq30(stocks.ticker, followedStocks.ticker)).where(and15(
            lt(stocks.insiderTradeDate, cutoffDateString),
            sql21`${followedStocks.ticker} IS NULL`
            // Not followed by anyone
          ));
          if (candidates.length === 0) {
            this.log("[CLEANUP] No old non-followed stocks found");
            return { count: 0, tickers: [] };
          }
          const candidateTickers = candidates.map((c) => c.ticker);
          this.log(`[CLEANUP] Found ${candidateTickers.length} old non-followed stocks: ${candidateTickers.join(", ")}`);
          const holdingsCheck = await tx.select({ ticker: portfolioHoldings.ticker }).from(portfolioHoldings).where(inArray4(portfolioHoldings.ticker, candidateTickers)).limit(1);
          if (holdingsCheck.length > 0) {
            this.log.warn(`[CLEANUP] WARNING: Found portfolio holdings for stocks marked for deletion. Skipping cleanup for safety.`);
            return { count: 0, tickers: [] };
          }
          const tradesCheck = await tx.select({ ticker: trades.ticker }).from(trades).where(inArray4(trades.ticker, candidateTickers)).limit(1);
          if (tradesCheck.length > 0) {
            this.log.warn(`[CLEANUP] WARNING: Found trades for stocks marked for deletion. Skipping cleanup for safety.`);
            return { count: 0, tickers: [] };
          }
          const deleteCounts = {
            aiJobs: 0,
            analyses: 0,
            views: 0,
            userStatuses: 0,
            comments: 0
          };
          const deletedJobs = await tx.delete(aiAnalysisJobs).where(inArray4(aiAnalysisJobs.ticker, candidateTickers)).returning({ ticker: aiAnalysisJobs.ticker });
          deleteCounts.aiJobs = deletedJobs.length;
          const deletedAnalyses = await tx.delete(stockAnalyses).where(inArray4(stockAnalyses.ticker, candidateTickers)).returning({ ticker: stockAnalyses.ticker });
          deleteCounts.analyses = deletedAnalyses.length;
          const deletedViews = await tx.delete(stockViews).where(inArray4(stockViews.ticker, candidateTickers)).returning({ ticker: stockViews.ticker });
          deleteCounts.views = deletedViews.length;
          const deletedStatuses = await tx.delete(userStockStatuses).where(inArray4(userStockStatuses.ticker, candidateTickers)).returning({ ticker: userStockStatuses.ticker });
          deleteCounts.userStatuses = deletedStatuses.length;
          const deletedComments = await tx.delete(stockComments).where(inArray4(stockComments.ticker, candidateTickers)).returning({ ticker: stockComments.ticker });
          deleteCounts.comments = deletedComments.length;
          const deletedStocks = await tx.delete(stocks).where(inArray4(stocks.ticker, candidateTickers)).returning({ ticker: stocks.ticker });
          this.log(`[CLEANUP] Deleted child records:`, deleteCounts);
          this.log(`[CLEANUP] Deleted ${deletedStocks.length} old stocks: ${deletedStocks.map((s) => s.ticker).join(", ")}`);
          return { count: deletedStocks.length, tickers: deletedStocks.map((s) => s.ticker) };
        });
        const elapsedMs = Date.now() - startTime;
        this.log(`[CLEANUP] 2-week horizon cleanup completed in ${elapsedMs}ms - Deleted ${result.count} stocks`);
        return result;
      }
      // Global helpers for background jobs (efficiently update market data across all users)
      async getAllUniquePendingTickers() {
        const result = await this.db.selectDistinct({ ticker: stocks.ticker }).from(stocks).where(eq30(stocks.recommendationStatus, "pending"));
        return result.map((r) => r.ticker);
      }
      async getAllUniqueTickersNeedingData() {
        const result = await this.db.selectDistinct({ ticker: stocks.ticker }).from(stocks).where(
          or(
            eq30(stocks.recommendationStatus, "pending"),
            sql21`${stocks.candlesticks} IS NULL`,
            sql21`jsonb_array_length(${stocks.candlesticks}) = 0`
          )
        );
        return result.map((r) => r.ticker);
      }
      async updateStocksByTickerGlobally(ticker, updates) {
        const result = await this.db.update(stocks).set({ ...updates, lastUpdated: sql21`now()` }).where(eq30(stocks.ticker, ticker));
        return result.rowCount || 0;
      }
    };
  }
});

// server/repositories/userRepository.ts
import { eq as eq31, lt as lt2, and as and16 } from "drizzle-orm";
var UserRepository;
var init_userRepository = __esm({
  "server/repositories/userRepository.ts"() {
    "use strict";
    init_base();
    init_schema();
    UserRepository = class extends BaseRepository {
      async getUsers(options) {
        if (options?.includeArchived) {
          return await this.db.select().from(users);
        }
        return await this.db.select().from(users).where(eq31(users.archived, false));
      }
      async getSuperAdminUsers() {
        return await this.db.select().from(users).where(eq31(users.isSuperAdmin, true));
      }
      async getAllUserIds() {
        const result = await this.db.select({ id: users.id }).from(users).where(eq31(users.archived, false));
        return result.map((r) => r.id);
      }
      async getUser(id) {
        const [user] = await this.db.select().from(users).where(eq31(users.id, id));
        return user;
      }
      async getUserByEmail(email) {
        const [user] = await this.db.select().from(users).where(eq31(users.email, email));
        return user;
      }
      async getUserByGoogleSub(googleSub) {
        const [user] = await this.db.select().from(users).where(eq31(users.googleSub, googleSub));
        return user;
      }
      async getUserByVerificationToken(token) {
        const [user] = await this.db.select().from(users).where(eq31(users.emailVerificationToken, token));
        return user;
      }
      async createUser(user) {
        const [newUser] = await this.db.insert(users).values(user).returning();
        return newUser;
      }
      async createGoogleUser(user) {
        const [newUser] = await this.db.insert(users).values({
          name: user.name,
          email: user.email,
          googleSub: user.googleSub,
          googlePicture: user.googlePicture,
          avatarColor: user.avatarColor,
          authProvider: user.authProvider,
          emailVerified: user.emailVerified,
          subscriptionStatus: user.subscriptionStatus,
          trialEndsAt: user.trialEndsAt
        }).returning();
        return newUser;
      }
      async linkGoogleAccount(userId, googleSub, googlePicture) {
        const [updatedUser] = await this.db.update(users).set({
          googleSub,
          googlePicture: googlePicture || void 0,
          authProvider: "google"
        }).where(eq31(users.id, userId)).returning();
        return updatedUser;
      }
      async updateUser(id, updates) {
        const [updatedUser] = await this.db.update(users).set(updates).where(eq31(users.id, id)).returning();
        return updatedUser;
      }
      async deleteUser(id) {
        const result = await this.db.delete(users).where(eq31(users.id, id));
        return result.rowCount ? result.rowCount > 0 : false;
      }
      async verifyUserEmail(userId) {
        const now = /* @__PURE__ */ new Date();
        const trialEndsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1e3);
        const [updatedUser] = await this.db.update(users).set({
          emailVerified: true,
          emailVerificationToken: null,
          emailVerificationExpiry: null,
          subscriptionStatus: "trial",
          subscriptionStartDate: now,
          trialEndsAt
        }).where(eq31(users.id, userId)).returning();
        return updatedUser;
      }
      async updateVerificationToken(userId, token, expiry) {
        const [updatedUser] = await this.db.update(users).set({
          emailVerificationToken: token,
          emailVerificationExpiry: expiry
        }).where(eq31(users.id, userId)).returning();
        return updatedUser;
      }
      async purgeUnverifiedUsers(olderThanHours) {
        const cutoffDate = new Date(Date.now() - olderThanHours * 60 * 60 * 1e3);
        const result = await this.db.delete(users).where(
          and16(
            eq31(users.emailVerified, false),
            eq31(users.subscriptionStatus, "pending_verification"),
            eq31(users.isAdmin, false),
            // Never delete admin users
            eq31(users.isSuperAdmin, false),
            // Never delete super admin users
            lt2(users.createdAt, cutoffDate)
          )
        );
        return result.rowCount || 0;
      }
      async markUserInitialDataFetched(userId) {
        await this.db.update(users).set({ initialDataFetched: true }).where(eq31(users.id, userId));
      }
      async markUserHasSeenOnboarding(userId) {
        await this.db.update(users).set({ hasSeenOnboarding: true }).where(eq31(users.id, userId));
      }
      async completeUserOnboarding(userId) {
        await this.db.update(users).set({
          onboardingCompletedAt: /* @__PURE__ */ new Date(),
          hasSeenOnboarding: true
        }).where(eq31(users.id, userId));
      }
      async getUserProgress(userId) {
        const [user] = await this.db.select({
          onboardingCompletedAt: users.onboardingCompletedAt,
          tutorialCompletions: users.tutorialCompletions
        }).from(users).where(eq31(users.id, userId));
        if (!user) {
          return { onboardingCompletedAt: null, tutorialCompletions: {} };
        }
        return {
          onboardingCompletedAt: user.onboardingCompletedAt,
          tutorialCompletions: user.tutorialCompletions || {}
        };
      }
      async completeTutorial(userId, tutorialId) {
        const [user] = await this.db.select({ tutorialCompletions: users.tutorialCompletions }).from(users).where(eq31(users.id, userId));
        if (!user) return;
        const completions = user.tutorialCompletions || {};
        completions[tutorialId] = true;
        await this.db.update(users).set({ tutorialCompletions: completions }).where(eq31(users.id, userId));
      }
      async archiveUser(userId, archivedBy) {
        const [archivedUser] = await this.db.update(users).set({
          archived: true,
          archivedAt: /* @__PURE__ */ new Date(),
          archivedBy
        }).where(eq31(users.id, userId)).returning();
        return archivedUser;
      }
      async unarchiveUser(userId) {
        const [unarchivedUser] = await this.db.update(users).set({
          archived: false,
          archivedAt: null,
          archivedBy: null
        }).where(eq31(users.id, userId)).returning();
        return unarchivedUser;
      }
      async updateUserSubscriptionStatus(userId, status, endDate) {
        const updates = { subscriptionStatus: status };
        if (endDate) {
          updates.subscriptionEndDate = endDate;
        }
        const [updatedUser] = await this.db.update(users).set(updates).where(eq31(users.id, userId)).returning();
        return updatedUser;
      }
      async updateUserLastDataRefresh(userId) {
        const [updatedUser] = await this.db.update(users).set({ lastDataRefresh: /* @__PURE__ */ new Date() }).where(eq31(users.id, userId)).returning();
        return updatedUser;
      }
      canUserReceiveDataRefresh(user) {
        const ONE_HOUR5 = 60 * 60 * 1e3;
        const ONE_DAY4 = 24 * 60 * 60 * 1e3;
        const now = (/* @__PURE__ */ new Date()).getTime();
        if (user.subscriptionStatus === "active") {
          if (!user.lastDataRefresh) return true;
          const timeSinceLastRefresh = now - new Date(user.lastDataRefresh).getTime();
          return timeSinceLastRefresh >= ONE_HOUR5;
        }
        if (user.subscriptionStatus === "trial") {
          if (!user.lastDataRefresh) return true;
          const timeSinceLastRefresh = now - new Date(user.lastDataRefresh).getTime();
          return timeSinceLastRefresh >= ONE_DAY4;
        }
        return false;
      }
      async getUsersEligibleForDataRefresh() {
        const { or: or5 } = await import("drizzle-orm");
        const allUsers = await this.db.select().from(users).where(
          and16(
            eq31(users.archived, false),
            or5(
              eq31(users.subscriptionStatus, "active"),
              eq31(users.subscriptionStatus, "trial")
            )
          )
        );
        return allUsers.filter((user) => this.canUserReceiveDataRefresh(user));
      }
    };
  }
});

// server/repositories/index.ts
var init_repositories = __esm({
  "server/repositories/index.ts"() {
    "use strict";
    init_base();
    init_systemSettingsRepository();
    init_telegramConfigRepository();
    init_ibkrConfigRepository();
    init_openinsiderConfigRepository();
    init_paymentRepository();
    init_stockCommentRepository();
    init_stockViewRepository();
    init_tutorialRepository();
    init_passwordResetRepository();
    init_manualOverrideRepository();
    init_notificationRepository();
    init_announcementRepository();
    init_adminNotificationRepository();
    init_featureSuggestionRepository();
    init_macroAnalysisRepository();
    init_stockCandlestickRepository();
    init_stockAnalysisRepository();
    init_aiAnalysisJobRepository();
    init_userStockStatusRepository();
    init_followedStockRepository();
    init_dailyBriefRepository();
    init_opportunityRepository();
    init_portfolioHoldingRepository();
    init_tradeRepository();
    init_tradingRuleRepository();
    init_compoundRuleRepository();
    init_ruleExecutionRepository();
    init_backtestRepository();
    init_backtestJobRepository();
    init_stockRepository();
    init_userRepository();
  }
});

// server/repositories/storageFacade.ts
var StorageFacade;
var init_storageFacade = __esm({
  "server/repositories/storageFacade.ts"() {
    "use strict";
    init_repositories();
    init_stockAnalysisRepository();
    StorageFacade = class {
      // Repositories
      systemSettings;
      telegramConfig;
      ibkrConfig;
      openinsiderConfig;
      payment;
      stockComment;
      stockView;
      tutorial;
      passwordReset;
      manualOverride;
      notification;
      announcement;
      adminNotification;
      featureSuggestion;
      macroAnalysis;
      stockCandlestick;
      stockAnalysis;
      aiAnalysisJob;
      userStockStatus;
      followedStock;
      dailyBrief;
      opportunity;
      portfolioHolding;
      trade;
      tradingRule;
      compoundRule;
      ruleExecution;
      backtest;
      backtestJob;
      stock;
      user;
      constructor() {
        this.stockAnalysis = new StockAnalysisRepository();
        this.aiAnalysisJob = new AiAnalysisJobRepository(this.stockAnalysis);
        this.followedStock = new FollowedStockRepository();
        this.portfolioHolding = new PortfolioHoldingRepository();
        this.trade = new TradeRepository();
        this.stock = new StockRepository();
        this.systemSettings = new SystemSettingsRepository();
        this.telegramConfig = new TelegramConfigRepository();
        this.ibkrConfig = new IbkrConfigRepository();
        this.openinsiderConfig = new OpeninsiderConfigRepository();
        this.payment = new PaymentRepository();
        this.stockComment = new StockCommentRepository();
        this.stockView = new StockViewRepository();
        this.tutorial = new TutorialRepository();
        this.passwordReset = new PasswordResetRepository();
        this.manualOverride = new ManualOverrideRepository();
        this.notification = new NotificationRepository();
        this.announcement = new AnnouncementRepository();
        this.adminNotification = new AdminNotificationRepository();
        this.featureSuggestion = new FeatureSuggestionRepository();
        this.macroAnalysis = new MacroAnalysisRepository();
        this.stockCandlestick = new StockCandlestickRepository();
        this.userStockStatus = new UserStockStatusRepository();
        this.dailyBrief = new DailyBriefRepository();
        this.opportunity = new OpportunityRepository();
        this.tradingRule = new TradingRuleRepository();
        this.compoundRule = new CompoundRuleRepository();
        this.ruleExecution = new RuleExecutionRepository();
        this.backtest = new BacktestRepository();
        this.backtestJob = new BacktestJobRepository();
        this.user = new UserRepository();
      }
      // System Settings
      async getSystemSettings() {
        return this.systemSettings.getSystemSettings();
      }
      async updateSystemSettings(updates) {
        return this.systemSettings.updateSystemSettings(updates);
      }
      // Telegram Configuration
      async getTelegramConfig() {
        return this.telegramConfig.getTelegramConfig();
      }
      async createOrUpdateTelegramConfig(config) {
        return this.telegramConfig.createOrUpdateTelegramConfig(config);
      }
      async updateTelegramSyncStatus(lastMessageId) {
        return this.telegramConfig.updateTelegramSyncStatus(lastMessageId);
      }
      async updateTelegramSession(sessionString) {
        return this.telegramConfig.updateTelegramSession(sessionString);
      }
      // IBKR Configuration
      async getIbkrConfig() {
        return this.ibkrConfig.getIbkrConfig();
      }
      async createOrUpdateIbkrConfig(config) {
        return this.ibkrConfig.createOrUpdateIbkrConfig(config);
      }
      async updateIbkrConnectionStatus(isConnected, accountId, error) {
        return this.ibkrConfig.updateIbkrConnectionStatus(isConnected, accountId, error);
      }
      // OpenInsider Configuration
      async getOpeninsiderConfig() {
        return this.openinsiderConfig.getOpeninsiderConfig();
      }
      async createOrUpdateOpeninsiderConfig(config) {
        return this.openinsiderConfig.createOrUpdateOpeninsiderConfig(config);
      }
      async updateOpeninsiderSyncStatus(error) {
        return this.openinsiderConfig.updateOpeninsiderSyncStatus(error);
      }
      // Payments
      async getUserPayments(userId) {
        return this.payment.getUserPayments(userId);
      }
      async createPayment(payment) {
        return this.payment.createPayment(payment);
      }
      async getPaymentByPaypalOrderId(orderId) {
        return this.payment.getPaymentByPaypalOrderId(orderId);
      }
      async getPaymentStats(userId) {
        return this.payment.getPaymentStats(userId);
      }
      // Stock Comments
      async getStockComments(ticker) {
        return this.stockComment.getStockComments(ticker);
      }
      async getStockCommentCounts() {
        return this.stockComment.getStockCommentCounts();
      }
      async createStockComment(comment) {
        return this.stockComment.createStockComment(comment);
      }
      // Stock Views
      async markStockAsViewed(ticker, userId) {
        return this.stockView.markStockAsViewed(ticker, userId);
      }
      async markStocksAsViewed(tickers, userId) {
        return this.stockView.markStocksAsViewed(tickers, userId);
      }
      async getUserStockViews(userId) {
        return this.stockView.getUserStockViews(userId);
      }
      // Tutorials
      async hasCompletedTutorial(userId, tutorialId) {
        return this.tutorial.hasCompletedTutorial(userId, tutorialId);
      }
      async markTutorialAsCompleted(userId, tutorialId) {
        return this.tutorial.markTutorialAsCompleted(userId, tutorialId);
      }
      async getUserTutorials(userId) {
        return this.tutorial.getUserTutorials(userId);
      }
      // Password Reset
      async createPasswordResetToken(token) {
        return this.passwordReset.createPasswordResetToken(token);
      }
      async getPasswordResetToken(token) {
        return this.passwordReset.getPasswordResetToken(token);
      }
      async markPasswordResetTokenUsed(tokenId) {
        return this.passwordReset.markPasswordResetTokenUsed(tokenId);
      }
      async purgeExpiredPasswordResetTokens() {
        return this.passwordReset.purgeExpiredPasswordResetTokens();
      }
      // Manual Override
      async createManualOverride(override) {
        return this.manualOverride.createManualOverride(override);
      }
      async getUserManualOverrides(userId) {
        return this.manualOverride.getUserManualOverrides(userId);
      }
      async getActiveManualOverride(userId) {
        return this.manualOverride.getActiveManualOverride(userId);
      }
      // Notifications
      async getNotifications(userId) {
        return this.notification.getNotifications(userId);
      }
      async getUnreadNotificationCount(userId) {
        return this.notification.getUnreadNotificationCount(userId);
      }
      async createNotification(notification) {
        return this.notification.createNotification(notification);
      }
      async markNotificationAsRead(id, userId) {
        return this.notification.markNotificationAsRead(id, userId);
      }
      async markAllNotificationsAsRead(userId) {
        return this.notification.markAllNotificationsAsRead(userId);
      }
      async clearAllNotifications(userId) {
        return this.notification.clearAllNotifications(userId);
      }
      // Announcements
      async getAnnouncements(userId) {
        return this.announcement.getAnnouncements(userId);
      }
      async getUnreadAnnouncementCount(userId) {
        return this.announcement.getUnreadAnnouncementCount(userId);
      }
      async getAllAnnouncements() {
        return this.announcement.getAllAnnouncements();
      }
      async createAnnouncement(announcement) {
        return this.announcement.createAnnouncement(announcement);
      }
      async updateAnnouncement(id, updates) {
        return this.announcement.updateAnnouncement(id, updates);
      }
      async deactivateAnnouncement(id) {
        return this.announcement.deactivateAnnouncement(id);
      }
      async deleteAnnouncement(id) {
        return this.announcement.deleteAnnouncement(id);
      }
      async markAnnouncementAsRead(userId, announcementId) {
        return this.announcement.markAnnouncementAsRead(userId, announcementId);
      }
      async markAllAnnouncementsAsRead(userId) {
        return this.announcement.markAllAnnouncementsAsRead(userId);
      }
      // Admin Notifications
      async getAdminNotifications() {
        return this.adminNotification.getAdminNotifications();
      }
      async getUnreadAdminNotificationCount() {
        return this.adminNotification.getUnreadAdminNotificationCount();
      }
      async createAdminNotification(notification) {
        return this.adminNotification.createAdminNotification(notification);
      }
      async markAdminNotificationAsRead(id) {
        return this.adminNotification.markAdminNotificationAsRead(id);
      }
      async markAllAdminNotificationsAsRead() {
        return this.adminNotification.markAllAdminNotificationsAsRead();
      }
      // Feature Suggestions
      async getFeatureSuggestions(userId, status) {
        return this.featureSuggestion.getFeatureSuggestions(userId, status);
      }
      async getFeatureSuggestion(id) {
        return this.featureSuggestion.getFeatureSuggestion(id);
      }
      async createFeatureSuggestion(suggestion) {
        return this.featureSuggestion.createFeatureSuggestion(suggestion);
      }
      async updateFeatureSuggestionStatus(id, status) {
        return this.featureSuggestion.updateFeatureSuggestionStatus(id, status);
      }
      async deleteFeatureSuggestion(id) {
        return this.featureSuggestion.deleteFeatureSuggestion(id);
      }
      async voteForSuggestion(suggestionId, userId) {
        return this.featureSuggestion.voteForSuggestion(suggestionId, userId);
      }
      async unvoteForSuggestion(suggestionId, userId) {
        return this.featureSuggestion.unvoteForSuggestion(suggestionId, userId);
      }
      async hasUserVoted(suggestionId, userId) {
        return this.featureSuggestion.hasUserVoted(suggestionId, userId);
      }
      // Macro Analysis
      async getLatestMacroAnalysis(industry) {
        return this.macroAnalysis.getLatestMacroAnalysis(industry);
      }
      async getMacroAnalysis(id) {
        return this.macroAnalysis.getMacroAnalysis(id);
      }
      async createMacroAnalysis(analysis) {
        return this.macroAnalysis.createMacroAnalysis(analysis);
      }
      async updateMacroAnalysisStatus(id, status, errorMessage) {
        return this.macroAnalysis.updateMacroAnalysisStatus(id, status, errorMessage);
      }
      // Stock Candlesticks
      async getCandlesticksByTicker(ticker) {
        return this.stockCandlestick.getCandlesticksByTicker(ticker);
      }
      async upsertCandlesticks(ticker, candlestickData) {
        return this.stockCandlestick.upsertCandlesticks(ticker, candlestickData);
      }
      async getAllTickersNeedingCandlestickData() {
        return this.stockCandlestick.getAllTickersNeedingCandlestickData();
      }
      // Stock AI Analysis
      async getStockAnalysis(ticker) {
        return this.stockAnalysis.getStockAnalysis(ticker);
      }
      async getAllStockAnalyses() {
        return this.stockAnalysis.getAllStockAnalyses();
      }
      async saveStockAnalysis(analysis) {
        return this.stockAnalysis.saveStockAnalysis(analysis);
      }
      async updateStockAnalysis(ticker, updates) {
        return this.stockAnalysis.updateStockAnalysis(ticker, updates);
      }
      async updateStockAnalysisStatus(ticker, status, errorMessage) {
        return this.stockAnalysis.updateStockAnalysisStatus(ticker, status, errorMessage);
      }
      // AI Analysis Jobs
      async enqueueAnalysisJob(ticker, source, priority, force) {
        return this.aiAnalysisJob.enqueueAnalysisJob(ticker, source, priority || "normal", force);
      }
      async cancelAnalysisJobsForTicker(ticker) {
        return this.aiAnalysisJob.cancelAnalysisJobsForTicker(ticker);
      }
      async dequeueNextJob() {
        return this.aiAnalysisJob.dequeueNextJob();
      }
      async getJobById(jobId) {
        return this.aiAnalysisJob.getJobById(jobId);
      }
      async getJobsByTicker(ticker) {
        return this.aiAnalysisJob.getJobsByTicker(ticker);
      }
      async updateJobStatus(jobId, status, updates) {
        return this.aiAnalysisJob.updateJobStatus(jobId, status, updates);
      }
      async updateJobProgress(jobId, currentStep, stepDetails) {
        return this.aiAnalysisJob.updateJobProgress(jobId, currentStep, stepDetails);
      }
      async resetStockAnalysisPhaseFlags(ticker) {
        return this.aiAnalysisJob.resetStockAnalysisPhaseFlags(ticker);
      }
      async markStockAnalysisPhaseComplete(ticker, phase) {
        return this.aiAnalysisJob.markStockAnalysisPhaseComplete(ticker, phase);
      }
      async getStocksWithIncompleteAnalysis() {
        return this.aiAnalysisJob.getStocksWithIncompleteAnalysis();
      }
      async getQueueStats() {
        return this.aiAnalysisJob.getQueueStats();
      }
      async resetStuckProcessingJobs(timeoutMs) {
        return this.aiAnalysisJob.resetStuckProcessingJobs(timeoutMs);
      }
      // User Stock Statuses
      async getUserStockStatus(userId, ticker) {
        return this.userStockStatus.getUserStockStatus(userId, ticker);
      }
      async getUserStockStatuses(userId, status) {
        return this.userStockStatus.getUserStockStatuses(userId, status);
      }
      async createUserStockStatus(status) {
        return this.userStockStatus.createUserStockStatus(status);
      }
      async updateUserStockStatus(userId, ticker, updates) {
        return this.userStockStatus.updateUserStockStatus(userId, ticker, updates);
      }
      async ensureUserStockStatus(userId, ticker) {
        return this.userStockStatus.ensureUserStockStatus(userId, ticker);
      }
      async rejectTickerForUser(userId, ticker) {
        return this.userStockStatus.rejectTickerForUser(userId, ticker);
      }
      // Followed Stocks
      async getUserFollowedStocks(userId) {
        return this.followedStock.getUserFollowedStocks(userId);
      }
      async followStock(follow) {
        return this.followedStock.followStock(follow);
      }
      async unfollowStock(ticker, userId) {
        return this.followedStock.unfollowStock(ticker, userId);
      }
      async toggleStockPosition(ticker, userId, hasEnteredPosition, entryPrice) {
        return this.followedStock.toggleStockPosition(ticker, userId, hasEnteredPosition, entryPrice);
      }
      async closePosition(ticker, userId, sellPrice, quantity) {
        return this.followedStock.closePosition(ticker, userId, sellPrice, quantity);
      }
      async getTotalPnL(userId) {
        return this.followedStock.getTotalPnL(userId);
      }
      async getFollowedStocksWithPrices(userId) {
        return this.followedStock.getFollowedStocksWithPrices(userId);
      }
      async getFollowedStocksWithStatus(userId) {
        return this.followedStock.getFollowedStocksWithStatus(userId);
      }
      async getFollowerCountForTicker(ticker) {
        return this.followedStock.getFollowerCountForTicker(ticker);
      }
      async getFollowerUserIdsForTicker(ticker) {
        return this.followedStock.getFollowerUserIdsForTicker(ticker);
      }
      async hasAnyUserPositionInTicker(ticker) {
        return this.followedStock.hasAnyUserPositionInTicker(ticker);
      }
      // Daily Briefs
      async getDailyBriefsForTicker(ticker, userId) {
        return this.dailyBrief.getDailyBriefsForTicker(ticker, userId);
      }
      async getDailyBriefForUser(userId, ticker, briefDate) {
        return this.dailyBrief.getDailyBriefForUser(userId, ticker, briefDate);
      }
      async createDailyBrief(brief) {
        return this.dailyBrief.createDailyBrief(brief);
      }
      async getTickerDailyBriefs(ticker, limit) {
        return this.dailyBrief.getTickerDailyBriefs(ticker, limit);
      }
      async createTickerDailyBrief(brief) {
        return this.dailyBrief.createTickerDailyBrief(brief);
      }
      async getLatestTickerBrief(ticker) {
        return this.dailyBrief.getLatestTickerBrief(ticker);
      }
      // Opportunities
      async getOpportunities(options) {
        return this.opportunity.getOpportunities(options);
      }
      async getOpportunity(id) {
        return this.opportunity.getOpportunity(id);
      }
      async getOpportunityByTransaction(ticker, insiderTradeDate, insiderName, recommendation, cadence) {
        return this.opportunity.getOpportunityByTransaction(ticker, insiderTradeDate, insiderName, recommendation, cadence);
      }
      async createOpportunity(opportunity) {
        return this.opportunity.createOpportunity(opportunity);
      }
      async updateOpportunity(id, updates) {
        return this.opportunity.updateOpportunity(id, updates);
      }
      async deleteOpportunity(id) {
        return this.opportunity.deleteOpportunity(id);
      }
      async createOpportunityBatch(batch) {
        return this.opportunity.createOpportunityBatch(batch);
      }
      async updateOpportunityBatchStats(batchId, stats) {
        return this.opportunity.updateOpportunityBatchStats(batchId, stats);
      }
      async getLatestBatch(cadence) {
        return this.opportunity.getLatestBatch(cadence);
      }
      async getLatestBatchWithStats() {
        return this.opportunity.getLatestBatchWithStats();
      }
      async rejectOpportunity(userId, opportunityId) {
        return this.opportunity.rejectOpportunity(userId, opportunityId);
      }
      async unrejectOpportunity(userId, opportunityId) {
        return this.opportunity.unrejectOpportunity(userId, opportunityId);
      }
      async getUserRejections(userId) {
        return this.opportunity.getUserRejections(userId);
      }
      async isOpportunityRejected(userId, opportunityId) {
        return this.opportunity.isOpportunityRejected(userId, opportunityId);
      }
      // Portfolio Holdings
      async getPortfolioHoldings(userId, isSimulated) {
        return this.portfolioHolding.getPortfolioHoldings(userId, isSimulated);
      }
      async getPortfolioHolding(id, userId) {
        return this.portfolioHolding.getPortfolioHolding(id, userId);
      }
      async getPortfolioHoldingByTicker(userId, ticker, isSimulated) {
        return this.portfolioHolding.getPortfolioHoldingByTicker(userId, ticker, isSimulated);
      }
      async createPortfolioHolding(holding) {
        return this.portfolioHolding.createPortfolioHolding(holding);
      }
      async updatePortfolioHolding(id, updates) {
        return this.portfolioHolding.updatePortfolioHolding(id, updates);
      }
      async deletePortfolioHolding(id) {
        return this.portfolioHolding.deletePortfolioHolding(id);
      }
      async deleteSimulatedHoldingsByTicker(userId, ticker) {
        return this.portfolioHolding.deleteSimulatedHoldingsByTicker(userId, ticker);
      }
      // Trades
      async getTrades(userId, isSimulated) {
        return this.trade.getTrades(userId, isSimulated);
      }
      async getTrade(id, userId) {
        return this.trade.getTrade(id, userId);
      }
      async createTrade(trade) {
        return this.trade.createTrade(trade, this.portfolioHolding);
      }
      async updateTrade(id, updates) {
        return this.trade.updateTrade(id, updates);
      }
      async deleteSimulatedTradesByTicker(userId, ticker) {
        return this.trade.deleteSimulatedTradesByTicker(userId, ticker);
      }
      // Trading Rules
      async getTradingRules(userId) {
        return this.tradingRule.getTradingRules(userId);
      }
      async getTradingRule(id) {
        return this.tradingRule.getTradingRule(id);
      }
      async createTradingRule(rule) {
        return this.tradingRule.createTradingRule(rule);
      }
      async updateTradingRule(id, updates) {
        return this.tradingRule.updateTradingRule(id, updates);
      }
      async deleteTradingRule(id) {
        return this.tradingRule.deleteTradingRule(id);
      }
      // Compound Rules
      async getCompoundRules() {
        return this.compoundRule.getCompoundRules();
      }
      async getCompoundRule(id) {
        return this.compoundRule.getCompoundRule(id);
      }
      async createCompoundRule(rule) {
        return this.compoundRule.createCompoundRule(rule);
      }
      async updateCompoundRule(id, updates) {
        return this.compoundRule.updateCompoundRule(id, updates);
      }
      async deleteCompoundRule(id) {
        return this.compoundRule.deleteCompoundRule(id);
      }
      // Rule Executions
      async getRuleExecutions(ruleId, ticker) {
        return this.ruleExecution.getRuleExecutions(ruleId, ticker);
      }
      async createRuleExecution(execution) {
        return this.ruleExecution.createRuleExecution(execution);
      }
      // Backtests
      async getBacktests() {
        return this.backtest.getBacktests();
      }
      async getBacktest(id) {
        return this.backtest.getBacktest(id);
      }
      async createBacktest(backtest) {
        return this.backtest.createBacktest(backtest);
      }
      // Backtest Jobs
      async getBacktestJobs(userId) {
        return this.backtestJob.getBacktestJobs(userId);
      }
      async getBacktestJob(id) {
        return this.backtestJob.getBacktestJob(id);
      }
      async createBacktestJob(job) {
        return this.backtestJob.createBacktestJob(job);
      }
      async updateBacktestJob(id, updates) {
        return this.backtestJob.updateBacktestJob(id, updates);
      }
      async deleteBacktestJob(id) {
        return this.backtestJob.deleteBacktestJob(id);
      }
      async getBacktestPriceData(jobId) {
        return this.backtestJob.getBacktestPriceData(jobId);
      }
      async getCachedPriceData(ticker, insiderBuyDate) {
        return this.backtestJob.getCachedPriceData(ticker, insiderBuyDate);
      }
      async createBacktestPriceData(data) {
        return this.backtestJob.createBacktestPriceData(data);
      }
      async getBacktestScenarios(jobId) {
        return this.backtestJob.getBacktestScenarios(jobId);
      }
      async createBacktestScenario(scenario) {
        return this.backtestJob.createBacktestScenario(scenario);
      }
      // Stocks
      async getStocks(userId) {
        return this.stock.getStocks(userId);
      }
      async getStocksByUserStatus(userId, status) {
        return this.stock.getStocksByUserStatus(userId, status);
      }
      async getStock(userId, ticker) {
        return this.stock.getStock(userId, ticker);
      }
      async getAnyStockForTicker(ticker) {
        return this.stock.getAnyStockForTicker(ticker);
      }
      async getUserStocksForTicker(userId, ticker) {
        return this.stock.getUserStocksForTicker(userId, ticker);
      }
      async getAllStocksForTickerGlobal(ticker) {
        return this.stock.getAllStocksForTickerGlobal(ticker);
      }
      async getTransactionByCompositeKey(userId, ticker, insiderTradeDate, insiderName, recommendation) {
        return this.stock.getTransactionByCompositeKey(userId, ticker, insiderTradeDate, insiderName, recommendation);
      }
      async createStock(stock) {
        return this.stock.createStock(stock);
      }
      async updateStock(userId, ticker, updates) {
        return this.stock.updateStock(userId, ticker, updates, this.portfolioHolding);
      }
      async deleteStock(userId, ticker) {
        return this.stock.deleteStock(userId, ticker);
      }
      async deleteExpiredPendingStocks(ageInDays) {
        return this.stock.deleteExpiredPendingStocks(ageInDays);
      }
      async deleteExpiredRejectedStocks(ageInDays) {
        return this.stock.deleteExpiredRejectedStocks(ageInDays);
      }
      async deleteStocksOlderThan(ageInDays) {
        return this.stock.deleteStocksOlderThan(ageInDays);
      }
      async unrejectStock(userId, ticker) {
        return this.stock.unrejectStock(userId, ticker);
      }
      async getAllUniquePendingTickers() {
        return this.stock.getAllUniquePendingTickers();
      }
      async getAllUniqueTickersNeedingData() {
        return this.stock.getAllUniqueTickersNeedingData();
      }
      async updateStocksByTickerGlobally(ticker, updates) {
        return this.stock.updateStocksByTickerGlobally(ticker, updates);
      }
      // Users
      async getUsers(options) {
        return this.user.getUsers(options);
      }
      async getSuperAdminUsers() {
        return this.user.getSuperAdminUsers();
      }
      async getAllUserIds() {
        return this.user.getAllUserIds();
      }
      async getUser(id) {
        return this.user.getUser(id);
      }
      async getUserByEmail(email) {
        return this.user.getUserByEmail(email);
      }
      async getUserByGoogleSub(googleSub) {
        return this.user.getUserByGoogleSub(googleSub);
      }
      async getUserByVerificationToken(token) {
        return this.user.getUserByVerificationToken(token);
      }
      async createUser(user) {
        return this.user.createUser(user);
      }
      async createGoogleUser(user) {
        return this.user.createGoogleUser(user);
      }
      async linkGoogleAccount(userId, googleSub, googlePicture) {
        return this.user.linkGoogleAccount(userId, googleSub, googlePicture);
      }
      async updateUser(id, updates) {
        return this.user.updateUser(id, updates);
      }
      async deleteUser(id) {
        return this.user.deleteUser(id);
      }
      async verifyUserEmail(userId) {
        return this.user.verifyUserEmail(userId);
      }
      async updateVerificationToken(userId, token, expiry) {
        return this.user.updateVerificationToken(userId, token, expiry);
      }
      async purgeUnverifiedUsers(olderThanHours) {
        return this.user.purgeUnverifiedUsers(olderThanHours);
      }
      async markUserInitialDataFetched(userId) {
        return this.user.markUserInitialDataFetched(userId);
      }
      async markUserHasSeenOnboarding(userId) {
        return this.user.markUserHasSeenOnboarding(userId);
      }
      async completeUserOnboarding(userId) {
        return this.user.completeUserOnboarding(userId);
      }
      async getUserProgress(userId) {
        return this.user.getUserProgress(userId);
      }
      async completeTutorial(userId, tutorialId) {
        return this.user.completeTutorial(userId, tutorialId);
      }
      async archiveUser(userId, archivedBy) {
        return this.user.archiveUser(userId, archivedBy);
      }
      async unarchiveUser(userId) {
        return this.user.unarchiveUser(userId);
      }
      async updateUserSubscriptionStatus(userId, status, endDate) {
        return this.user.updateUserSubscriptionStatus(userId, status, endDate);
      }
      async updateUserLastDataRefresh(userId) {
        return this.user.updateUserLastDataRefresh(userId);
      }
      canUserReceiveDataRefresh(user) {
        return this.user.canUserReceiveDataRefresh(user);
      }
      async getUsersEligibleForDataRefresh() {
        return this.user.getUsersEligibleForDataRefresh();
      }
      // Legacy methods that may still be in IStorage but not yet migrated
      // These will be implemented as needed or removed if unused
      async initializeDefaults() {
        await this.telegramConfig.getTelegramConfig();
      }
      // Note: getStocksWithUserStatus is a complex method that will be handled by HybridStorage
      // This method should not be called directly on StorageFacade
      async getStocksWithUserStatus(userId, limit = 100) {
        throw new Error("getStocksWithUserStatus should be called on HybridStorage, not StorageFacade directly");
      }
    };
  }
});

// server/queue/connection.ts
import Redis from "ioredis";
function getRedisConnection() {
  if (redisClient) {
    return redisClient;
  }
  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
  log3.info(`Connecting to Redis at ${redisUrl.replace(/:[^:@]+@/, ":****@")}`);
  redisClient = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2e3);
      log3.warn(`Redis connection retry attempt ${times}, waiting ${delay}ms`);
      return delay;
    },
    reconnectOnError: (err) => {
      const targetError = "READONLY";
      if (err.message.includes(targetError)) {
        log3.error("Redis is in readonly mode, reconnecting...");
        return true;
      }
      return false;
    }
  });
  redisClient.on("connect", () => {
    log3.info("Redis connection established");
  });
  redisClient.on("ready", () => {
    log3.info("Redis connection ready");
  });
  redisClient.on("error", (err) => {
    log3.error("Redis connection error", err);
  });
  redisClient.on("close", () => {
    log3.warn("Redis connection closed");
  });
  redisClient.on("reconnecting", () => {
    log3.info("Redis reconnecting...");
  });
  return redisClient;
}
function isRedisConnected() {
  return redisClient?.status === "ready";
}
var log3, redisClient;
var init_connection = __esm({
  "server/queue/connection.ts"() {
    "use strict";
    init_logger();
    log3 = createLogger("queue:connection");
    redisClient = null;
  }
});

// server/cache/cache.ts
function generateKey(prefix, ...parts) {
  const validParts = parts.filter((p) => p !== void 0 && p !== null).map(String);
  return `${prefix}:${validParts.join(":")}`;
}
async function get(key) {
  if (!isRedisConnected()) {
    return null;
  }
  try {
    const redis = getRedisConnection();
    const value = await redis.get(key);
    if (!value) {
      return null;
    }
    return JSON.parse(value);
  } catch (error) {
    log4.error(`Cache get error for key ${key}`, error);
    return null;
  }
}
async function set(key, value, ttlSeconds = 300) {
  if (!isRedisConnected()) {
    return false;
  }
  try {
    const redis = getRedisConnection();
    const serialized = JSON.stringify(value);
    await redis.setex(key, ttlSeconds, serialized);
    return true;
  } catch (error) {
    log4.error(`Cache set error for key ${key}`, error);
    return false;
  }
}
async function del(key) {
  if (!isRedisConnected()) {
    return false;
  }
  try {
    const redis = getRedisConnection();
    await redis.del(key);
    return true;
  } catch (error) {
    log4.error(`Cache delete error for key ${key}`, error);
    return false;
  }
}
async function delPattern(pattern) {
  if (!isRedisConnected()) {
    return 0;
  }
  try {
    const redis = getRedisConnection();
    const keys = await redis.keys(pattern);
    if (keys.length === 0) {
      return 0;
    }
    await redis.del(...keys);
    return keys.length;
  } catch (error) {
    log4.error(`Cache delete pattern error for pattern ${pattern}`, error);
    return 0;
  }
}
async function getOrSet(key, fetcher, ttlSeconds = 300) {
  const cached = await get(key);
  if (cached !== null) {
    log4.debug(`Cache hit: ${key}`);
    return cached;
  }
  log4.debug(`Cache miss: ${key}`);
  const value = await fetcher();
  set(key, value, ttlSeconds).catch((err) => {
    log4.warn(`Failed to set cache for ${key}`, err);
  });
  return value;
}
async function invalidateUserCache(userId) {
  const key = generateKey(CACHE_PREFIXES.USER, userId);
  await del(key);
}
async function invalidateStocksCache(userId) {
  const pattern = generateKey(CACHE_PREFIXES.STOCKS, userId, "*");
  await delPattern(pattern);
}
async function invalidateFollowedStocksCache(userId) {
  const key = generateKey(CACHE_PREFIXES.FOLLOWED_STOCKS, userId);
  await del(key);
}
async function invalidatePortfolioCache(userId) {
  const key = generateKey(CACHE_PREFIXES.PORTFOLIO, userId);
  await del(key);
}
async function invalidateTradesCache(userId) {
  const pattern = generateKey(CACHE_PREFIXES.TRADES, userId, "*");
  await delPattern(pattern);
}
var log4, CACHE_PREFIXES, DEFAULT_TTL;
var init_cache = __esm({
  "server/cache/cache.ts"() {
    "use strict";
    init_connection();
    init_logger();
    log4 = createLogger("cache");
    CACHE_PREFIXES = {
      USER: "user",
      STOCKS: "stocks",
      OPPORTUNITIES: "opportunities",
      ANALYSIS: "analysis",
      QUOTE: "quote",
      NEWS: "news",
      FOLLOWED_STOCKS: "followed",
      PORTFOLIO: "portfolio",
      TRADES: "trades"
    };
    DEFAULT_TTL = {
      USER: 5 * 60,
      // 5 minutes
      STOCKS: 2 * 60,
      // 2 minutes
      OPPORTUNITIES: 1 * 60,
      // 1 minute
      ANALYSIS: 10 * 60,
      // 10 minutes (analyses change less frequently)
      QUOTE: 30,
      // 30 seconds (price data changes frequently)
      NEWS: 5 * 60,
      // 5 minutes
      FOLLOWED_STOCKS: 2 * 60,
      // 2 minutes
      PORTFOLIO: 1 * 60,
      // 1 minute
      TRADES: 30
      // 30 seconds
    };
  }
});

// server/cache/cachedStorage.ts
var cachedStorage_exports = {};
__export(cachedStorage_exports, {
  CachedStorage: () => CachedStorage,
  generateKey: () => generateKey3
});
function generateKey3(prefix, ...parts) {
  const validParts = parts.filter((p) => p !== void 0 && p !== null).map(String);
  return `${prefix}:${validParts.join(":")}`;
}
var CachedStorage;
var init_cachedStorage = __esm({
  "server/cache/cachedStorage.ts"() {
    "use strict";
    init_cache();
    CachedStorage = class {
      storage;
      constructor(storage2) {
        this.storage = storage2;
      }
      // Cache user lookups
      async getUser(userId) {
        return getOrSet(
          (void 0)(CACHE_PREFIXES.USER, userId),
          () => this.storage.getUser(userId),
          DEFAULT_TTL.USER
        );
      }
      async getUserByEmail(email) {
        return this.storage.getUserByEmail(email);
      }
      // Cache stocks (most expensive query)
      async getStocks(userId) {
        return getOrSet(
          (void 0)(CACHE_PREFIXES.STOCKS, userId, "all"),
          () => this.storage.getStocks(userId),
          DEFAULT_TTL.STOCKS
        );
      }
      async getStocksByUserStatus(userId, status) {
        return getOrSet(
          (void 0)(CACHE_PREFIXES.STOCKS, userId, status),
          () => this.storage.getStocksByUserStatus(userId, status),
          DEFAULT_TTL.STOCKS
        );
      }
      // Cache opportunities
      async getOpportunities(options) {
        const cadence = options?.cadence || "all";
        return getOrSet(
          (void 0)(CACHE_PREFIXES.OPPORTUNITIES, cadence),
          () => this.storage.getOpportunities(options),
          DEFAULT_TTL.OPPORTUNITIES
        );
      }
      // Cache followed stocks
      async getFollowedStocks(userId) {
        return getOrSet(
          (void 0)(CACHE_PREFIXES.FOLLOWED_STOCKS, userId),
          () => this.storage.getFollowedStocks(userId),
          DEFAULT_TTL.FOLLOWED_STOCKS
        );
      }
      // Cache portfolio
      async getPortfolio(userId) {
        return getOrSet(
          (void 0)(CACHE_PREFIXES.PORTFOLIO, userId),
          () => this.storage.getPortfolio(userId),
          DEFAULT_TTL.PORTFOLIO
        );
      }
      // Cache trades
      async getTrades(userId, isSimulated) {
        return getOrSet(
          (void 0)(CACHE_PREFIXES.TRADES, userId, isSimulated ? "simulated" : "real"),
          () => this.storage.getTrades(userId, isSimulated),
          DEFAULT_TTL.TRADES
        );
      }
      // For write operations, invalidate relevant caches
      async updateUser(userId, data) {
        const result = await this.storage.updateUser(userId, data);
        await invalidateUserCache(userId);
        return result;
      }
      async createStock(userId, data) {
        const result = await this.storage.createStock(userId, data);
        await invalidateStocksCache(userId);
        return result;
      }
      async updateStock(userId, ticker, data) {
        const result = await this.storage.updateStock(userId, ticker, data);
        await invalidateStocksCache(userId);
        return result;
      }
      async deleteStock(userId, ticker) {
        await this.storage.deleteStock(userId, ticker);
        await invalidateStocksCache(userId);
      }
      async followStock(userId, ticker) {
        const result = await this.storage.followStock(userId, ticker);
        await invalidateFollowedStocksCache(userId);
        await invalidateStocksCache(userId);
        return result;
      }
      async unfollowStock(userId, ticker) {
        await this.storage.unfollowStock(userId, ticker);
        await invalidateFollowedStocksCache(userId);
      }
      async createTrade(userId, data) {
        const result = await this.storage.createTrade(data);
        await invalidateTradesCache(userId);
        await invalidatePortfolioCache(userId);
        return result;
      }
      async updateTrade(userId, tradeId, data) {
        const result = await this.storage.updateTrade(tradeId, userId, data);
        await invalidateTradesCache(userId);
        await invalidatePortfolioCache(userId);
        return result;
      }
      async deleteTrade(userId, tradeId) {
        await this.storage.deleteTrade(tradeId, userId);
        await invalidateTradesCache(userId);
        await invalidatePortfolioCache(userId);
      }
      // Delegate all other methods to original storage (no caching needed or too complex)
      // This is a simplified version - in practice, you'd want to delegate all methods
      // For now, we'll use a Proxy to automatically delegate unknown methods
      // Note: TypeScript doesn't support perfect proxy typing, so we'll need to explicitly
      // implement the methods we want to cache, and use a fallback for others
      // For methods we don't cache, delegate directly
      // Since IStorage has many methods, we'll use a Proxy pattern at the storage level
      // instead of manually implementing everything here
    };
  }
});

// server/storage.ts
import { eq as eq32, desc as desc18, sql as sql22, and as and17, inArray as inArray5, lt as lt3, or as or3 } from "drizzle-orm";
var DatabaseStorage, HybridStorage, baseStorage, storage;
var init_storage = __esm({
  async "server/storage.ts"() {
    "use strict";
    init_schema();
    init_db();
    init_time();
    init_eventDispatcher();
    init_storageFacade();
    DatabaseStorage = class {
      async initializeDefaults() {
        const existingTelegramConfig = await this.getTelegramConfig();
        if (!existingTelegramConfig) {
          await this.createOrUpdateTelegramConfig({
            channelUsername: "InsiderTrading_SEC",
            phoneNumber: void 0,
            enabled: true
          });
        }
        const existingOpeninsiderConfig = await this.getOpeninsiderConfig();
        if (!existingOpeninsiderConfig) {
          await this.createOrUpdateOpeninsiderConfig({
            enabled: true,
            fetchLimit: 500,
            fetchInterval: "hourly",
            fetchPreviousDayOnly: false,
            insiderTitles: ["CEO", "CFO", "Director", "President", "COO", "CTO", "10% Owner"],
            minTransactionValue: 1e5
            // $100k minimum
          });
        }
      }
      async updateHoldingValues(holding) {
        const [stock] = await db.select().from(stocks).where(and17(
          eq32(stocks.ticker, holding.ticker),
          eq32(stocks.userId, holding.userId)
        ));
        if (!stock) return;
        const currentPrice = parseFloat(stock.currentPrice);
        const avgPrice = parseFloat(holding.averagePurchasePrice);
        const currentValue = currentPrice * holding.quantity;
        const totalCost = avgPrice * holding.quantity;
        const profitLoss = currentValue - totalCost;
        const profitLossPercent = profitLoss / totalCost * 100;
        await db.update(portfolioHoldings).set({
          currentValue: currentValue.toFixed(2),
          profitLoss: profitLoss.toFixed(2),
          profitLossPercent: profitLossPercent.toFixed(2),
          lastUpdated: sql22`now()`
        }).where(eq32(portfolioHoldings.id, holding.id));
      }
      // Stocks (Per-user tenant isolation)
      async getStocks(userId) {
        const results = await db.select({
          stock: stocks,
          analysisJob: aiAnalysisJobs
        }).from(stocks).leftJoin(
          aiAnalysisJobs,
          and17(
            eq32(stocks.ticker, aiAnalysisJobs.ticker),
            sql22`${aiAnalysisJobs.status} IN ('pending', 'processing')`
          )
        ).where(eq32(stocks.userId, userId));
        return results.map((row) => ({
          ...row.stock,
          analysisJob: row.analysisJob || void 0
        }));
      }
      async getStock(userId, ticker) {
        const [stock] = await db.select().from(stocks).where(and17(
          eq32(stocks.userId, userId),
          eq32(stocks.ticker, ticker)
        )).orderBy(desc18(stocks.lastUpdated)).limit(1);
        return stock;
      }
      async getAnyStockForTicker(ticker) {
        const [stock] = await db.select().from(stocks).where(eq32(stocks.ticker, ticker)).limit(1);
        return stock;
      }
      async getUserStocksForTicker(userId, ticker) {
        return await db.select().from(stocks).where(and17(
          eq32(stocks.userId, userId),
          eq32(stocks.ticker, ticker)
        ));
      }
      async getAllStocksForTickerGlobal(ticker) {
        return await db.select().from(stocks).where(eq32(stocks.ticker, ticker));
      }
      async getTransactionByCompositeKey(userId, ticker, insiderTradeDate, insiderName, recommendation) {
        const [stock] = await db.select().from(stocks).where(
          and17(
            eq32(stocks.userId, userId),
            eq32(stocks.ticker, ticker),
            eq32(stocks.insiderTradeDate, insiderTradeDate),
            eq32(stocks.insiderName, insiderName),
            eq32(stocks.recommendation, recommendation)
          )
        );
        return stock;
      }
      async createStock(stock) {
        const [newStock] = await db.insert(stocks).values(stock).returning();
        return newStock;
      }
      async updateStock(userId, ticker, updates) {
        const [updatedStock] = await db.update(stocks).set({ ...updates, lastUpdated: sql22`now()` }).where(and17(
          eq32(stocks.userId, userId),
          eq32(stocks.ticker, ticker)
        )).returning();
        if (updatedStock) {
          const holdings = await db.select().from(portfolioHoldings).where(and17(
            eq32(portfolioHoldings.userId, userId),
            eq32(portfolioHoldings.ticker, ticker)
          ));
          for (const holding of holdings) {
            await this.updateHoldingValues(holding);
          }
        }
        return updatedStock;
      }
      async deleteStock(userId, ticker) {
        const result = await db.delete(stocks).where(and17(
          eq32(stocks.userId, userId),
          eq32(stocks.ticker, ticker)
        ));
        return result.rowCount ? result.rowCount > 0 : false;
      }
      async deleteExpiredPendingStocks(ageInDays) {
        const startTime = Date.now();
        const cutoffDate = /* @__PURE__ */ new Date();
        cutoffDate.setDate(cutoffDate.getDate() - ageInDays);
        console.log(`[CLEANUP] Starting cleanup: deleting pending stocks older than ${ageInDays} days (before ${cutoffDate.toISOString()})`);
        const result = await db.transaction(async (tx) => {
          const candidates = await tx.select({ ticker: stocks.ticker }).from(stocks).where(and17(
            lt3(stocks.lastUpdated, cutoffDate),
            eq32(stocks.recommendationStatus, "pending")
          )).for("update");
          if (candidates.length === 0) {
            console.log("[CLEANUP] No expired pending stocks found");
            return { count: 0, tickers: [] };
          }
          const candidateTickers = candidates.map((c) => c.ticker);
          console.log(`[CLEANUP] Found ${candidateTickers.length} candidates: ${candidateTickers.join(", ")}`);
          const holdingsCheck = await tx.select({ ticker: portfolioHoldings.ticker }).from(portfolioHoldings).where(inArray5(portfolioHoldings.ticker, candidateTickers));
          const tradesCheck = await tx.select({ ticker: trades.ticker }).from(trades).where(inArray5(trades.ticker, candidateTickers));
          if (holdingsCheck.length > 0 || tradesCheck.length > 0) {
            const conflictTickers = Array.from(/* @__PURE__ */ new Set([
              ...holdingsCheck.map((h) => h.ticker),
              ...tradesCheck.map((t) => t.ticker)
            ]));
            console.error(`[CLEANUP] ABORT: Found portfolio/trade data for tickers: ${conflictTickers.join(", ")}`);
            throw new Error(`Cannot delete stocks with existing holdings/trades: ${conflictTickers.join(", ")}`);
          }
          const deleteCounts = {
            aiJobs: 0,
            analyses: 0,
            views: 0,
            userStatuses: 0,
            comments: 0
          };
          const deletedJobs = await tx.delete(aiAnalysisJobs).where(inArray5(aiAnalysisJobs.ticker, candidateTickers)).returning({ ticker: aiAnalysisJobs.ticker });
          deleteCounts.aiJobs = deletedJobs.length;
          const deletedAnalyses = await tx.delete(stockAnalyses).where(inArray5(stockAnalyses.ticker, candidateTickers)).returning({ ticker: stockAnalyses.ticker });
          deleteCounts.analyses = deletedAnalyses.length;
          const deletedViews = await tx.delete(stockViews).where(inArray5(stockViews.ticker, candidateTickers)).returning({ ticker: stockViews.ticker });
          deleteCounts.views = deletedViews.length;
          const deletedStatuses = await tx.delete(userStockStatuses).where(inArray5(userStockStatuses.ticker, candidateTickers)).returning({ ticker: userStockStatuses.ticker });
          deleteCounts.userStatuses = deletedStatuses.length;
          const deletedComments = await tx.delete(stockComments).where(inArray5(stockComments.ticker, candidateTickers)).returning({ ticker: stockComments.ticker });
          deleteCounts.comments = deletedComments.length;
          const deletedStocks = await tx.delete(stocks).where(inArray5(stocks.ticker, candidateTickers)).returning({ ticker: stocks.ticker });
          console.log(`[CLEANUP] Deleted child records:`, deleteCounts);
          console.log(`[CLEANUP] Deleted ${deletedStocks.length} stocks: ${deletedStocks.map((s) => s.ticker).join(", ")}`);
          return { count: deletedStocks.length, tickers: deletedStocks.map((s) => s.ticker) };
        });
        const elapsedMs = Date.now() - startTime;
        console.log(`[CLEANUP] Cleanup completed in ${elapsedMs}ms - Deleted ${result.count} stocks`);
        return result;
      }
      async deleteExpiredRejectedStocks(ageInDays) {
        const startTime = Date.now();
        const cutoffDate = /* @__PURE__ */ new Date();
        cutoffDate.setDate(cutoffDate.getDate() - ageInDays);
        console.log(`[CLEANUP] Starting cleanup: deleting rejected stocks older than ${ageInDays} days (before ${cutoffDate.toISOString()})`);
        const result = await db.transaction(async (tx) => {
          const candidates = await tx.select({ ticker: stocks.ticker }).from(stocks).where(and17(
            lt3(stocks.rejectedAt, cutoffDate),
            sql22`${stocks.rejectedAt} IS NOT NULL`,
            eq32(stocks.recommendationStatus, "rejected")
          )).for("update");
          if (candidates.length === 0) {
            console.log("[CLEANUP] No expired rejected stocks found");
            return { count: 0, tickers: [] };
          }
          const candidateTickers = candidates.map((c) => c.ticker);
          console.log(`[CLEANUP] Found ${candidateTickers.length} rejected candidates: ${candidateTickers.join(", ")}`);
          const holdingsCheck = await tx.select({ ticker: portfolioHoldings.ticker }).from(portfolioHoldings).where(inArray5(portfolioHoldings.ticker, candidateTickers));
          const tradesCheck = await tx.select({ ticker: trades.ticker }).from(trades).where(inArray5(trades.ticker, candidateTickers));
          if (holdingsCheck.length > 0 || tradesCheck.length > 0) {
            const conflictTickers = Array.from(/* @__PURE__ */ new Set([
              ...holdingsCheck.map((h) => h.ticker),
              ...tradesCheck.map((t) => t.ticker)
            ]));
            console.error(`[CLEANUP] ABORT: Found portfolio/trade data for tickers: ${conflictTickers.join(", ")}`);
            throw new Error(`Cannot delete stocks with existing holdings/trades: ${conflictTickers.join(", ")}`);
          }
          const deleteCounts = {
            aiJobs: 0,
            analyses: 0,
            views: 0,
            userStatuses: 0,
            comments: 0
          };
          const deletedJobs = await tx.delete(aiAnalysisJobs).where(inArray5(aiAnalysisJobs.ticker, candidateTickers)).returning({ ticker: aiAnalysisJobs.ticker });
          deleteCounts.aiJobs = deletedJobs.length;
          const deletedAnalyses = await tx.delete(stockAnalyses).where(inArray5(stockAnalyses.ticker, candidateTickers)).returning({ ticker: stockAnalyses.ticker });
          deleteCounts.analyses = deletedAnalyses.length;
          const deletedViews = await tx.delete(stockViews).where(inArray5(stockViews.ticker, candidateTickers)).returning({ ticker: stockViews.ticker });
          deleteCounts.views = deletedViews.length;
          const deletedStatuses = await tx.delete(userStockStatuses).where(inArray5(userStockStatuses.ticker, candidateTickers)).returning({ ticker: userStockStatuses.ticker });
          deleteCounts.userStatuses = deletedStatuses.length;
          const deletedComments = await tx.delete(stockComments).where(inArray5(stockComments.ticker, candidateTickers)).returning({ ticker: stockComments.ticker });
          deleteCounts.comments = deletedComments.length;
          const deletedStocks = await tx.delete(stocks).where(inArray5(stocks.ticker, candidateTickers)).returning({ ticker: stocks.ticker });
          console.log(`[CLEANUP] Deleted child records:`, deleteCounts);
          console.log(`[CLEANUP] Deleted ${deletedStocks.length} rejected stocks: ${deletedStocks.map((s) => s.ticker).join(", ")}`);
          return { count: deletedStocks.length, tickers: deletedStocks.map((s) => s.ticker) };
        });
        const elapsedMs = Date.now() - startTime;
        console.log(`[CLEANUP] Rejected stocks cleanup completed in ${elapsedMs}ms - Deleted ${result.count} stocks`);
        return result;
      }
      async getStocksByUserStatus(userId, status) {
        const results = await db.select({
          stock: stocks
        }).from(stocks).leftJoin(
          userStockStatuses,
          and17(
            eq32(stocks.ticker, userStockStatuses.ticker),
            eq32(userStockStatuses.userId, userId)
          )
        ).where(
          and17(
            eq32(stocks.userId, userId),
            // CRITICAL: Filter stocks by userId for tenant isolation
            eq32(userStockStatuses.status, status)
          )
        );
        return results.map((row) => row.stock);
      }
      async unrejectStock(userId, ticker) {
        const [updatedStock] = await db.update(stocks).set({
          recommendationStatus: "pending",
          rejectedAt: null,
          lastUpdated: sql22`now()`
        }).where(and17(
          eq32(stocks.userId, userId),
          eq32(stocks.ticker, ticker)
        )).returning();
        return updatedStock;
      }
      // Global helpers for background jobs (efficiently update market data across all users)
      async getAllUniquePendingTickers() {
        const result = await db.selectDistinct({ ticker: stocks.ticker }).from(stocks).where(eq32(stocks.recommendationStatus, "pending"));
        return result.map((r) => r.ticker);
      }
      async getAllUniqueTickersNeedingData() {
        const result = await db.selectDistinct({ ticker: stocks.ticker }).from(stocks).where(
          or3(
            eq32(stocks.recommendationStatus, "pending"),
            sql22`${stocks.candlesticks} IS NULL`,
            sql22`jsonb_array_length(${stocks.candlesticks}) = 0`
          )
        );
        return result.map((r) => r.ticker);
      }
      async updateStocksByTickerGlobally(ticker, updates) {
        const result = await db.update(stocks).set({ ...updates, lastUpdated: sql22`now()` }).where(eq32(stocks.ticker, ticker));
        return result.rowCount || 0;
      }
      async deleteStocksOlderThan(ageInDays) {
        const startTime = Date.now();
        const cutoffDate = /* @__PURE__ */ new Date();
        cutoffDate.setDate(cutoffDate.getDate() - ageInDays);
        const cutoffDateString = cutoffDate.toISOString().split("T")[0];
        console.log(`[CLEANUP] Starting 2-week horizon cleanup: deleting stocks older than ${ageInDays} days (before ${cutoffDateString}), excluding followed stocks`);
        const result = await db.transaction(async (tx) => {
          const candidates = await tx.select({ ticker: stocks.ticker }).from(stocks).leftJoin(followedStocks, eq32(stocks.ticker, followedStocks.ticker)).where(and17(
            lt3(stocks.insiderTradeDate, cutoffDateString),
            sql22`${followedStocks.ticker} IS NULL`
            // Not followed by anyone
          ));
          if (candidates.length === 0) {
            console.log("[CLEANUP] No old non-followed stocks found");
            return { count: 0, tickers: [] };
          }
          const candidateTickers = candidates.map((c) => c.ticker);
          console.log(`[CLEANUP] Found ${candidateTickers.length} old non-followed stocks: ${candidateTickers.join(", ")}`);
          const holdingsCheck = await tx.select({ ticker: portfolioHoldings.ticker }).from(portfolioHoldings).where(inArray5(portfolioHoldings.ticker, candidateTickers)).limit(1);
          if (holdingsCheck.length > 0) {
            console.warn(`[CLEANUP] WARNING: Found portfolio holdings for stocks marked for deletion. Skipping cleanup for safety.`);
            return { count: 0, tickers: [] };
          }
          const tradesCheck = await tx.select({ ticker: trades.ticker }).from(trades).where(inArray5(trades.ticker, candidateTickers)).limit(1);
          if (tradesCheck.length > 0) {
            console.warn(`[CLEANUP] WARNING: Found trades for stocks marked for deletion. Skipping cleanup for safety.`);
            return { count: 0, tickers: [] };
          }
          const deleteCounts = {
            aiJobs: 0,
            analyses: 0,
            views: 0,
            userStatuses: 0,
            comments: 0
          };
          const deletedJobs = await tx.delete(aiAnalysisJobs).where(inArray5(aiAnalysisJobs.ticker, candidateTickers)).returning({ ticker: aiAnalysisJobs.ticker });
          deleteCounts.aiJobs = deletedJobs.length;
          const deletedAnalyses = await tx.delete(stockAnalyses).where(inArray5(stockAnalyses.ticker, candidateTickers)).returning({ ticker: stockAnalyses.ticker });
          deleteCounts.analyses = deletedAnalyses.length;
          const deletedViews = await tx.delete(stockViews).where(inArray5(stockViews.ticker, candidateTickers)).returning({ ticker: stockViews.ticker });
          deleteCounts.views = deletedViews.length;
          const deletedStatuses = await tx.delete(userStockStatuses).where(inArray5(userStockStatuses.ticker, candidateTickers)).returning({ ticker: userStockStatuses.ticker });
          deleteCounts.userStatuses = deletedStatuses.length;
          const deletedComments = await tx.delete(stockComments).where(inArray5(stockComments.ticker, candidateTickers)).returning({ ticker: stockComments.ticker });
          deleteCounts.comments = deletedComments.length;
          const deletedStocks = await tx.delete(stocks).where(inArray5(stocks.ticker, candidateTickers)).returning({ ticker: stocks.ticker });
          console.log(`[CLEANUP] Deleted child records:`, deleteCounts);
          console.log(`[CLEANUP] Deleted ${deletedStocks.length} old stocks: ${deletedStocks.map((s) => s.ticker).join(", ")}`);
          return { count: deletedStocks.length, tickers: deletedStocks.map((s) => s.ticker) };
        });
        const elapsedMs = Date.now() - startTime;
        console.log(`[CLEANUP] 2-week horizon cleanup completed in ${elapsedMs}ms - Deleted ${result.count} stocks`);
        return result;
      }
      // Portfolio Holdings
      async getPortfolioHoldings(userId, isSimulated) {
        let whereConditions = [eq32(portfolioHoldings.userId, userId)];
        if (isSimulated !== void 0) {
          whereConditions.push(eq32(portfolioHoldings.isSimulated, isSimulated));
        }
        const holdings = await db.select().from(portfolioHoldings).where(and17(...whereConditions));
        for (const holding of holdings) {
          await this.updateHoldingValues(holding);
        }
        return await db.select().from(portfolioHoldings).where(and17(...whereConditions));
      }
      async getPortfolioHolding(id, userId) {
        const whereClause = userId ? and17(eq32(portfolioHoldings.id, id), eq32(portfolioHoldings.userId, userId)) : eq32(portfolioHoldings.id, id);
        const [holding] = await db.select().from(portfolioHoldings).where(whereClause);
        if (holding) {
          await this.updateHoldingValues(holding);
          const [updated] = await db.select().from(portfolioHoldings).where(whereClause);
          return updated;
        }
        return void 0;
      }
      async getPortfolioHoldingByTicker(userId, ticker, isSimulated) {
        let whereConditions = [eq32(portfolioHoldings.userId, userId), eq32(portfolioHoldings.ticker, ticker)];
        if (isSimulated !== void 0) {
          whereConditions.push(eq32(portfolioHoldings.isSimulated, isSimulated));
        }
        const [holding] = await db.select().from(portfolioHoldings).where(and17(...whereConditions));
        if (holding) {
          await this.updateHoldingValues(holding);
          const [updated] = await db.select().from(portfolioHoldings).where(and17(...whereConditions));
          return updated;
        }
        return void 0;
      }
      async createPortfolioHolding(holding) {
        const [newHolding] = await db.insert(portfolioHoldings).values(holding).returning();
        await this.updateHoldingValues(newHolding);
        const [updated] = await db.select().from(portfolioHoldings).where(eq32(portfolioHoldings.id, newHolding.id));
        return updated;
      }
      async updatePortfolioHolding(id, updates) {
        const [updatedHolding] = await db.update(portfolioHoldings).set({ ...updates, lastUpdated: sql22`now()` }).where(eq32(portfolioHoldings.id, id)).returning();
        if (updatedHolding) {
          await this.updateHoldingValues(updatedHolding);
          const [updated] = await db.select().from(portfolioHoldings).where(eq32(portfolioHoldings.id, id));
          return updated;
        }
        return void 0;
      }
      async deletePortfolioHolding(id) {
        const result = await db.delete(portfolioHoldings).where(eq32(portfolioHoldings.id, id));
        return result.rowCount ? result.rowCount > 0 : false;
      }
      async deleteSimulatedHoldingsByTicker(userId, ticker) {
        const result = await db.delete(portfolioHoldings).where(and17(
          eq32(portfolioHoldings.userId, userId),
          eq32(portfolioHoldings.ticker, ticker),
          eq32(portfolioHoldings.isSimulated, true)
        )).returning();
        return result.length;
      }
      // Trades
      async getTrades(userId, isSimulated) {
        let whereConditions = [eq32(trades.userId, userId)];
        if (isSimulated !== void 0) {
          whereConditions.push(eq32(trades.isSimulated, isSimulated));
        }
        return await db.select().from(trades).where(and17(...whereConditions)).orderBy(desc18(trades.executedAt));
      }
      async getTrade(id, userId) {
        const whereClause = userId ? and17(eq32(trades.id, id), eq32(trades.userId, userId)) : eq32(trades.id, id);
        const [trade] = await db.select().from(trades).where(whereClause);
        return trade;
      }
      async createTrade(trade) {
        const isSimulated = trade.isSimulated ?? void 0;
        if (!trade.userId) {
          throw new Error("userId is required to create a trade");
        }
        const existingHolding = await this.getPortfolioHoldingByTicker(trade.userId, trade.ticker, isSimulated);
        if (trade.type === "sell") {
          if (!existingHolding) {
            throw new Error(`Cannot sell ${trade.ticker}: no holding found`);
          }
          if (trade.quantity > existingHolding.quantity) {
            throw new Error(
              `Cannot sell ${trade.quantity} shares of ${trade.ticker}: only ${existingHolding.quantity} shares available`
            );
          }
        }
        let realizedProfitLoss;
        let realizedProfitLossPercent;
        if (trade.type === "buy") {
          if (existingHolding) {
            const totalQuantity = existingHolding.quantity + trade.quantity;
            const totalCost = parseFloat(existingHolding.averagePurchasePrice) * existingHolding.quantity + parseFloat(trade.price) * trade.quantity;
            const newAvgPrice = totalCost / totalQuantity;
            await this.updatePortfolioHolding(existingHolding.id, {
              quantity: totalQuantity,
              averagePurchasePrice: newAvgPrice.toFixed(2)
            });
            const updatedHolding = await this.getPortfolioHolding(existingHolding.id);
            if (updatedHolding) {
              await this.updateHoldingValues(updatedHolding);
            }
          } else {
            const newHolding = await this.createPortfolioHolding({
              userId: trade.userId,
              ticker: trade.ticker,
              quantity: trade.quantity,
              averagePurchasePrice: trade.price,
              isSimulated: isSimulated !== void 0 ? isSimulated : false
            });
            await this.updateHoldingValues(newHolding);
          }
        } else if (trade.type === "sell" && existingHolding) {
          const sellPrice = parseFloat(trade.price);
          const avgPurchasePrice = parseFloat(existingHolding.averagePurchasePrice);
          const profitLoss = (sellPrice - avgPurchasePrice) * trade.quantity;
          const profitLossPercent = (sellPrice - avgPurchasePrice) / avgPurchasePrice * 100;
          realizedProfitLoss = profitLoss.toFixed(2);
          realizedProfitLossPercent = profitLossPercent.toFixed(2);
          const newQuantity = existingHolding.quantity - trade.quantity;
          if (newQuantity <= 0) {
            await this.deletePortfolioHolding(existingHolding.id);
          } else {
            await this.updatePortfolioHolding(existingHolding.id, {
              quantity: newQuantity
            });
            const updatedHolding = await this.getPortfolioHolding(existingHolding.id);
            if (updatedHolding) {
              await this.updateHoldingValues(updatedHolding);
            }
          }
        }
        const tradeData = {
          ...trade,
          ...realizedProfitLoss && { profitLoss: realizedProfitLoss },
          ...realizedProfitLossPercent && { profitLossPercent: realizedProfitLossPercent }
        };
        const [newTrade] = await db.insert(trades).values(tradeData).returning();
        return newTrade;
      }
      async updateTrade(id, updates) {
        const [updatedTrade] = await db.update(trades).set(updates).where(eq32(trades.id, id)).returning();
        return updatedTrade;
      }
      async deleteSimulatedTradesByTicker(userId, ticker) {
        const result = await db.delete(trades).where(and17(
          eq32(trades.userId, userId),
          eq32(trades.ticker, ticker),
          eq32(trades.isSimulated, true)
        )).returning();
        return result.length;
      }
      // Trading Rules
      async getTradingRules(userId) {
        return await db.select().from(tradingRules).where(eq32(tradingRules.userId, userId));
      }
      async getTradingRule(id) {
        const [rule] = await db.select().from(tradingRules).where(eq32(tradingRules.id, id));
        return rule;
      }
      async createTradingRule(rule) {
        const [newRule] = await db.insert(tradingRules).values(rule).returning();
        return newRule;
      }
      async updateTradingRule(id, updates) {
        const [updatedRule] = await db.update(tradingRules).set({ ...updates, updatedAt: sql22`now()` }).where(eq32(tradingRules.id, id)).returning();
        return updatedRule;
      }
      async deleteTradingRule(id) {
        const result = await db.delete(tradingRules).where(eq32(tradingRules.id, id));
        return result.rowCount ? result.rowCount > 0 : false;
      }
      // Compound Rules (multi-condition rules)
      async getCompoundRules() {
        const allRules = await db.select().from(tradingRules).orderBy(tradingRules.priority);
        const compoundRules = [];
        for (const rule of allRules) {
          const groups = await db.select().from(ruleConditionGroups).where(eq32(ruleConditionGroups.ruleId, rule.id)).orderBy(ruleConditionGroups.groupOrder);
          const groupsWithConditions = await Promise.all(
            groups.map(async (group) => {
              const conditions = await db.select().from(ruleConditions).where(eq32(ruleConditions.groupId, group.id));
              return { ...group, conditions };
            })
          );
          const actions = await db.select().from(ruleActions).where(eq32(ruleActions.ruleId, rule.id)).orderBy(ruleActions.actionOrder);
          compoundRules.push({
            ...rule,
            groups: groupsWithConditions,
            actions
          });
        }
        return compoundRules;
      }
      async getCompoundRule(id) {
        const [rule] = await db.select().from(tradingRules).where(eq32(tradingRules.id, id));
        if (!rule) return void 0;
        const groups = await db.select().from(ruleConditionGroups).where(eq32(ruleConditionGroups.ruleId, id)).orderBy(ruleConditionGroups.groupOrder);
        const groupsWithConditions = await Promise.all(
          groups.map(async (group) => {
            const conditions = await db.select().from(ruleConditions).where(eq32(ruleConditions.groupId, group.id));
            return { ...group, conditions };
          })
        );
        const actions = await db.select().from(ruleActions).where(eq32(ruleActions.ruleId, id)).orderBy(ruleActions.actionOrder);
        return {
          ...rule,
          groups: groupsWithConditions,
          actions
        };
      }
      async createCompoundRule(ruleData) {
        const result = await db.transaction(async (tx) => {
          const [rule] = await tx.insert(tradingRules).values({
            name: ruleData.name,
            enabled: ruleData.enabled,
            scope: ruleData.scope,
            ticker: ruleData.ticker,
            priority: ruleData.priority
          }).returning();
          const groupsWithConditions = [];
          for (const groupData of ruleData.groups) {
            const [group] = await tx.insert(ruleConditionGroups).values({
              ruleId: rule.id,
              groupOrder: groupData.groupOrder,
              junctionOperator: groupData.junctionOperator,
              description: groupData.description
            }).returning();
            const conditions = [];
            for (const conditionData of groupData.conditions) {
              const [condition] = await tx.insert(ruleConditions).values({
                groupId: group.id,
                metric: conditionData.metric,
                comparator: conditionData.comparator,
                threshold: conditionData.threshold,
                timeframeValue: conditionData.timeframeValue,
                timeframeUnit: conditionData.timeframeUnit,
                metadata: conditionData.metadata
              }).returning();
              conditions.push(condition);
            }
            groupsWithConditions.push({ ...group, conditions });
          }
          const actions = [];
          for (const actionData of ruleData.actions) {
            const [action] = await tx.insert(ruleActions).values({
              ruleId: rule.id,
              actionOrder: actionData.actionOrder,
              actionType: actionData.actionType,
              quantity: actionData.quantity,
              percentage: actionData.percentage,
              allowRepeat: actionData.allowRepeat,
              cooldownMinutes: actionData.cooldownMinutes
            }).returning();
            actions.push(action);
          }
          return {
            ...rule,
            groups: groupsWithConditions,
            actions
          };
        });
        return result;
      }
      async updateCompoundRule(id, ruleData) {
        const existing = await this.getCompoundRule(id);
        if (!existing) return void 0;
        const result = await db.transaction(async (tx) => {
          const [rule] = await tx.update(tradingRules).set({
            name: ruleData.name ?? existing.name,
            enabled: ruleData.enabled ?? existing.enabled,
            scope: ruleData.scope ?? existing.scope,
            ticker: ruleData.ticker ?? existing.ticker,
            priority: ruleData.priority ?? existing.priority,
            updatedAt: sql22`now()`
          }).where(eq32(tradingRules.id, id)).returning();
          if (ruleData.groups) {
            await tx.delete(ruleConditionGroups).where(eq32(ruleConditionGroups.ruleId, id));
            const groupsWithConditions = [];
            for (const groupData of ruleData.groups) {
              const [group] = await tx.insert(ruleConditionGroups).values({
                ruleId: id,
                groupOrder: groupData.groupOrder,
                junctionOperator: groupData.junctionOperator,
                description: groupData.description
              }).returning();
              const conditions = [];
              for (const conditionData of groupData.conditions) {
                const [condition] = await tx.insert(ruleConditions).values({
                  groupId: group.id,
                  metric: conditionData.metric,
                  comparator: conditionData.comparator,
                  threshold: conditionData.threshold,
                  timeframeValue: conditionData.timeframeValue,
                  timeframeUnit: conditionData.timeframeUnit,
                  metadata: conditionData.metadata
                }).returning();
                conditions.push(condition);
              }
              groupsWithConditions.push({ ...group, conditions });
            }
          }
          if (ruleData.actions) {
            await tx.delete(ruleActions).where(eq32(ruleActions.ruleId, id));
            for (const actionData of ruleData.actions) {
              await tx.insert(ruleActions).values({
                ruleId: id,
                actionOrder: actionData.actionOrder,
                actionType: actionData.actionType,
                quantity: actionData.quantity,
                percentage: actionData.percentage,
                allowRepeat: actionData.allowRepeat,
                cooldownMinutes: actionData.cooldownMinutes
              });
            }
          }
          return rule;
        });
        return await this.getCompoundRule(id);
      }
      async deleteCompoundRule(id) {
        const result = await db.delete(tradingRules).where(eq32(tradingRules.id, id));
        return result.rowCount ? result.rowCount > 0 : false;
      }
      // Rule Executions (audit log)
      async getRuleExecutions(ruleId, ticker) {
        let query = db.select().from(ruleExecutions).orderBy(desc18(ruleExecutions.triggeredAt));
        if (ruleId && ticker) {
          return await query.where(and17(eq32(ruleExecutions.ruleId, ruleId), eq32(ruleExecutions.ticker, ticker)));
        } else if (ruleId) {
          return await query.where(eq32(ruleExecutions.ruleId, ruleId));
        } else if (ticker) {
          return await query.where(eq32(ruleExecutions.ticker, ticker));
        }
        return await query;
      }
      async createRuleExecution(execution) {
        const [newExecution] = await db.insert(ruleExecutions).values(execution).returning();
        return newExecution;
      }
      // Backtests
      async getBacktests() {
        return await db.select().from(backtests).orderBy(desc18(backtests.createdAt));
      }
      async getBacktest(id) {
        const [backtest] = await db.select().from(backtests).where(eq32(backtests.id, id));
        return backtest;
      }
      async createBacktest(backtest) {
        const [newBacktest] = await db.insert(backtests).values(backtest).returning();
        return newBacktest;
      }
      // Telegram Configuration
      async getTelegramConfig() {
        const [config] = await db.select().from(telegramConfig).limit(1);
        return config;
      }
      async createOrUpdateTelegramConfig(config) {
        const existing = await this.getTelegramConfig();
        if (existing) {
          const [updated] = await db.update(telegramConfig).set({ ...config, lastSync: sql22`now()` }).where(eq32(telegramConfig.id, existing.id)).returning();
          return updated;
        } else {
          const [newConfig] = await db.insert(telegramConfig).values(config).returning();
          return newConfig;
        }
      }
      async updateTelegramSyncStatus(lastMessageId) {
        const existing = await this.getTelegramConfig();
        if (existing) {
          await db.update(telegramConfig).set({ lastSync: sql22`now()`, lastMessageId }).where(eq32(telegramConfig.id, existing.id));
        }
      }
      async updateTelegramSession(sessionString) {
        const existing = await this.getTelegramConfig();
        if (existing) {
          await db.update(telegramConfig).set({ sessionString }).where(eq32(telegramConfig.id, existing.id));
        }
      }
      // IBKR Configuration
      async getIbkrConfig() {
        const [config] = await db.select().from(ibkrConfig).limit(1);
        return config;
      }
      async createOrUpdateIbkrConfig(config) {
        const existing = await this.getIbkrConfig();
        if (existing) {
          const [updated] = await db.update(ibkrConfig).set(config).where(eq32(ibkrConfig.id, existing.id)).returning();
          return updated;
        } else {
          const [newConfig] = await db.insert(ibkrConfig).values({
            gatewayUrl: config.gatewayUrl || "https://localhost:5000",
            isPaperTrading: config.isPaperTrading !== void 0 ? config.isPaperTrading : true
          }).returning();
          return newConfig;
        }
      }
      async updateIbkrConnectionStatus(isConnected, accountId, error) {
        const existing = await this.getIbkrConfig();
        if (existing) {
          await db.update(ibkrConfig).set({
            isConnected,
            lastConnectionCheck: sql22`now()`,
            ...accountId && { accountId },
            ...error !== void 0 && { lastError: error }
          }).where(eq32(ibkrConfig.id, existing.id));
        }
      }
      // OpenInsider Configuration
      async getOpeninsiderConfig() {
        const [config] = await db.select().from(openinsiderConfig).limit(1);
        return config;
      }
      async createOrUpdateOpeninsiderConfig(config) {
        const existing = await this.getOpeninsiderConfig();
        if (existing) {
          const [updated] = await db.update(openinsiderConfig).set(config).where(eq32(openinsiderConfig.id, existing.id)).returning();
          return updated;
        } else {
          const [newConfig] = await db.insert(openinsiderConfig).values({
            enabled: config.enabled !== void 0 ? config.enabled : false,
            fetchLimit: config.fetchLimit || 50
          }).returning();
          return newConfig;
        }
      }
      async updateOpeninsiderSyncStatus(error) {
        const existing = await this.getOpeninsiderConfig();
        if (existing) {
          await db.update(openinsiderConfig).set({
            lastSync: sql22`now()`,
            ...error !== void 0 && { lastError: error }
          }).where(eq32(openinsiderConfig.id, existing.id));
        }
      }
      // Global Opportunities (unified for all users)
      async getOpportunities(options) {
        console.log("[Storage.getOpportunities] Called with options:", options);
        const conditions = [];
        if (options?.cadence === "daily") {
          conditions.push(eq32(opportunities.cadence, "daily"));
        } else if (options?.cadence === "hourly") {
          conditions.push(eq32(opportunities.cadence, "hourly"));
        }
        if (options?.ticker) {
          conditions.push(eq32(opportunities.ticker, options.ticker));
        }
        const twelvesDaysAgo = /* @__PURE__ */ new Date();
        twelvesDaysAgo.setDate(twelvesDaysAgo.getDate() - 12);
        const cutoffDateStr = twelvesDaysAgo.toISOString().split("T")[0];
        console.log("[Storage.getOpportunities] 12-day cutoff:", cutoffDateStr);
        conditions.push(sql22`${opportunities.insiderTradeDate} >= ${cutoffDateStr}`);
        let query = db.select().from(opportunities);
        if (conditions.length > 0) {
          query = query.where(and17(...conditions));
        }
        const results = await query.orderBy(desc18(opportunities.createdAt));
        console.log("[Storage.getOpportunities] Raw results count:", results.length);
        if (options?.userId) {
          const [rejections, followedStocksList] = await Promise.all([
            this.getUserRejections(options.userId),
            this.getUserFollowedStocks(options.userId)
          ]);
          const rejectedIds = new Set(rejections.map((r) => r.opportunityId));
          const followedTickers = new Set(followedStocksList.map((f) => f.ticker.toUpperCase()));
          console.log("[Storage.getOpportunities] Rejections:", rejectedIds.size, "Followed tickers:", Array.from(followedTickers));
          const filtered = results.filter(
            (opp) => !rejectedIds.has(opp.id) && !followedTickers.has(opp.ticker.toUpperCase())
          );
          console.log("[Storage.getOpportunities] After filtering:", filtered.length);
          return filtered;
        }
        return results;
      }
      async getOpportunity(id) {
        const [result] = await db.select().from(opportunities).where(eq32(opportunities.id, id));
        return result;
      }
      async getOpportunityByTransaction(ticker, insiderTradeDate, insiderName, recommendation, cadence) {
        const conditions = [
          eq32(opportunities.ticker, ticker),
          eq32(opportunities.insiderTradeDate, insiderTradeDate),
          eq32(opportunities.insiderName, insiderName),
          eq32(opportunities.recommendation, recommendation)
        ];
        if (cadence) {
          conditions.push(eq32(opportunities.cadence, cadence));
        }
        const [result] = await db.select().from(opportunities).where(and17(...conditions));
        return result;
      }
      async createOpportunity(opportunity) {
        const [result] = await db.insert(opportunities).values(opportunity).returning();
        return result;
      }
      async updateOpportunity(id, updates) {
        const [result] = await db.update(opportunities).set({ ...updates, lastUpdated: sql22`now()` }).where(eq32(opportunities.id, id)).returning();
        return result;
      }
      async deleteOpportunity(id) {
        const result = await db.delete(opportunities).where(eq32(opportunities.id, id)).returning();
        return result.length > 0;
      }
      // Opportunity Batches
      async createOpportunityBatch(batch) {
        const [result] = await db.insert(opportunityBatches).values(batch).returning();
        return result;
      }
      async getLatestBatch(cadence) {
        const [result] = await db.select().from(opportunityBatches).where(eq32(opportunityBatches.cadence, cadence)).orderBy(desc18(opportunityBatches.fetchedAt)).limit(1);
        return result;
      }
      async updateOpportunityBatchStats(batchId, stats) {
        const statsJson = JSON.stringify({ stats });
        await db.execute(sql22`
      UPDATE opportunity_batches 
      SET count = ${stats.added},
          metadata = COALESCE(metadata, '{}'::jsonb) || ${statsJson}::jsonb
      WHERE id = ${batchId}
    `);
      }
      async getLatestBatchWithStats() {
        const [result] = await db.select().from(opportunityBatches).orderBy(desc18(opportunityBatches.fetchedAt)).limit(1);
        return result;
      }
      // User Opportunity Rejections
      async rejectOpportunity(userId, opportunityId) {
        const [result] = await db.insert(userOpportunityRejections).values({ userId, opportunityId }).onConflictDoNothing().returning();
        if (!result) {
          const [existing] = await db.select().from(userOpportunityRejections).where(
            and17(
              eq32(userOpportunityRejections.userId, userId),
              eq32(userOpportunityRejections.opportunityId, opportunityId)
            )
          );
          return existing;
        }
        return result;
      }
      async unrejectOpportunity(userId, opportunityId) {
        const result = await db.delete(userOpportunityRejections).where(
          and17(
            eq32(userOpportunityRejections.userId, userId),
            eq32(userOpportunityRejections.opportunityId, opportunityId)
          )
        ).returning();
        return result.length > 0;
      }
      async getUserRejections(userId) {
        return await db.select().from(userOpportunityRejections).where(eq32(userOpportunityRejections.userId, userId));
      }
      async isOpportunityRejected(userId, opportunityId) {
        const [result] = await db.select().from(userOpportunityRejections).where(
          and17(
            eq32(userOpportunityRejections.userId, userId),
            eq32(userOpportunityRejections.opportunityId, opportunityId)
          )
        );
        return !!result;
      }
      // What-If Backtest Jobs
      async getBacktestJobs(userId) {
        return await db.select().from(backtestJobs).where(eq32(backtestJobs.userId, userId)).orderBy(desc18(backtestJobs.createdAt));
      }
      async getBacktestJob(id) {
        const [job] = await db.select().from(backtestJobs).where(eq32(backtestJobs.id, id));
        return job;
      }
      async createBacktestJob(job) {
        const [newJob] = await db.insert(backtestJobs).values(job).returning();
        return newJob;
      }
      async updateBacktestJob(id, updates) {
        const [updated] = await db.update(backtestJobs).set(updates).where(eq32(backtestJobs.id, id)).returning();
        return updated;
      }
      async deleteBacktestJob(id) {
        await db.delete(backtestPriceData).where(eq32(backtestPriceData.jobId, id));
        await db.delete(backtestScenarios).where(eq32(backtestScenarios.jobId, id));
        const result = await db.delete(backtestJobs).where(eq32(backtestJobs.id, id));
        return true;
      }
      // Backtest Price Data
      async getBacktestPriceData(jobId) {
        const allData = await db.select().from(backtestPriceData).where(eq32(backtestPriceData.jobId, jobId));
        const uniqueByTicker = /* @__PURE__ */ new Map();
        allData.forEach((data) => {
          if (!uniqueByTicker.has(data.ticker) || data.createdAt && uniqueByTicker.get(data.ticker).createdAt && data.createdAt > uniqueByTicker.get(data.ticker).createdAt) {
            uniqueByTicker.set(data.ticker, data);
          }
        });
        return Array.from(uniqueByTicker.values());
      }
      async getCachedPriceData(ticker, insiderBuyDate) {
        const results = await db.select().from(backtestPriceData).where(
          and17(
            eq32(backtestPriceData.ticker, ticker),
            eq32(backtestPriceData.insiderBuyDate, insiderBuyDate)
          )
        ).limit(1);
        return results[0];
      }
      async createBacktestPriceData(data) {
        const [newData] = await db.insert(backtestPriceData).values(data).returning();
        return newData;
      }
      // Backtest Scenarios (returns only top 10 sorted by P&L)
      async getBacktestScenarios(jobId) {
        return await db.select().from(backtestScenarios).where(eq32(backtestScenarios.jobId, jobId)).orderBy(desc18(backtestScenarios.totalProfitLoss)).limit(10);
      }
      async createBacktestScenario(scenario) {
        const [newScenario] = await db.insert(backtestScenarios).values(scenario).returning();
        return newScenario;
      }
      // Users
      async getUsers(options) {
        if (options?.includeArchived) {
          return await db.select().from(users);
        }
        return await db.select().from(users).where(eq32(users.archived, false));
      }
      async getSuperAdminUsers() {
        return await db.select().from(users).where(eq32(users.isSuperAdmin, true));
      }
      async getAllUserIds() {
        const result = await db.select({ id: users.id }).from(users).where(eq32(users.archived, false));
        return result.map((r) => r.id);
      }
      async getUser(id) {
        const [user] = await db.select().from(users).where(eq32(users.id, id));
        return user;
      }
      async getUserByEmail(email) {
        const [user] = await db.select().from(users).where(eq32(users.email, email));
        return user;
      }
      async getUserByGoogleSub(googleSub) {
        const [user] = await db.select().from(users).where(eq32(users.googleSub, googleSub));
        return user;
      }
      async getUserByVerificationToken(token) {
        const [user] = await db.select().from(users).where(eq32(users.emailVerificationToken, token));
        return user;
      }
      async createUser(user) {
        const [newUser] = await db.insert(users).values(user).returning();
        return newUser;
      }
      async createGoogleUser(user) {
        const [newUser] = await db.insert(users).values({
          name: user.name,
          email: user.email,
          googleSub: user.googleSub,
          googlePicture: user.googlePicture,
          avatarColor: user.avatarColor,
          authProvider: user.authProvider,
          emailVerified: user.emailVerified,
          subscriptionStatus: user.subscriptionStatus,
          trialEndsAt: user.trialEndsAt
        }).returning();
        return newUser;
      }
      async linkGoogleAccount(userId, googleSub, googlePicture) {
        const [updatedUser] = await db.update(users).set({
          googleSub,
          googlePicture: googlePicture || void 0,
          authProvider: "google"
        }).where(eq32(users.id, userId)).returning();
        return updatedUser;
      }
      async updateUser(id, updates) {
        const [updatedUser] = await db.update(users).set(updates).where(eq32(users.id, id)).returning();
        return updatedUser;
      }
      async verifyUserEmail(userId) {
        const now = /* @__PURE__ */ new Date();
        const trialEndsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1e3);
        const [updatedUser] = await db.update(users).set({
          emailVerified: true,
          emailVerificationToken: null,
          emailVerificationExpiry: null,
          subscriptionStatus: "trial",
          subscriptionStartDate: now,
          trialEndsAt
        }).where(eq32(users.id, userId)).returning();
        return updatedUser;
      }
      async updateVerificationToken(userId, token, expiry) {
        const [updatedUser] = await db.update(users).set({
          emailVerificationToken: token,
          emailVerificationExpiry: expiry
        }).where(eq32(users.id, userId)).returning();
        return updatedUser;
      }
      async purgeUnverifiedUsers(olderThanHours) {
        const cutoffDate = new Date(Date.now() - olderThanHours * 60 * 60 * 1e3);
        const result = await db.delete(users).where(
          and17(
            eq32(users.emailVerified, false),
            eq32(users.subscriptionStatus, "pending_verification"),
            eq32(users.isAdmin, false),
            // Never delete admin users
            eq32(users.isSuperAdmin, false),
            // Never delete super admin users
            lt3(users.createdAt, cutoffDate)
          )
        );
        return result.rowCount || 0;
      }
      async markUserInitialDataFetched(userId) {
        await db.update(users).set({ initialDataFetched: true }).where(eq32(users.id, userId));
      }
      async markUserHasSeenOnboarding(userId) {
        await db.update(users).set({ hasSeenOnboarding: true }).where(eq32(users.id, userId));
      }
      async completeUserOnboarding(userId) {
        await db.update(users).set({
          onboardingCompletedAt: /* @__PURE__ */ new Date(),
          hasSeenOnboarding: true
        }).where(eq32(users.id, userId));
      }
      async getUserProgress(userId) {
        const [user] = await db.select({
          onboardingCompletedAt: users.onboardingCompletedAt,
          tutorialCompletions: users.tutorialCompletions
        }).from(users).where(eq32(users.id, userId));
        if (!user) {
          return { onboardingCompletedAt: null, tutorialCompletions: {} };
        }
        return {
          onboardingCompletedAt: user.onboardingCompletedAt,
          tutorialCompletions: user.tutorialCompletions || {}
        };
      }
      async completeTutorial(userId, tutorialId) {
        const [user] = await db.select({ tutorialCompletions: users.tutorialCompletions }).from(users).where(eq32(users.id, userId));
        if (!user) return;
        const completions = user.tutorialCompletions || {};
        completions[tutorialId] = true;
        await db.update(users).set({ tutorialCompletions: completions }).where(eq32(users.id, userId));
      }
      async deleteUser(id) {
        const result = await db.delete(users).where(eq32(users.id, id));
        return result.rowCount ? result.rowCount > 0 : false;
      }
      async archiveUser(userId, archivedBy) {
        const [archivedUser] = await db.update(users).set({
          archived: true,
          archivedAt: /* @__PURE__ */ new Date(),
          archivedBy
        }).where(eq32(users.id, userId)).returning();
        return archivedUser;
      }
      async unarchiveUser(userId) {
        const [unarchivedUser] = await db.update(users).set({
          archived: false,
          archivedAt: null,
          archivedBy: null
        }).where(eq32(users.id, userId)).returning();
        return unarchivedUser;
      }
      async updateUserSubscriptionStatus(userId, status, endDate) {
        const updates = { subscriptionStatus: status };
        if (endDate) {
          updates.subscriptionEndDate = endDate;
        }
        const [updatedUser] = await db.update(users).set(updates).where(eq32(users.id, userId)).returning();
        return updatedUser;
      }
      async updateUserLastDataRefresh(userId) {
        const [updatedUser] = await db.update(users).set({ lastDataRefresh: /* @__PURE__ */ new Date() }).where(eq32(users.id, userId)).returning();
        return updatedUser;
      }
      canUserReceiveDataRefresh(user) {
        const ONE_HOUR5 = 60 * 60 * 1e3;
        const ONE_DAY4 = 24 * 60 * 60 * 1e3;
        const now = (/* @__PURE__ */ new Date()).getTime();
        if (user.subscriptionStatus === "active") {
          if (!user.lastDataRefresh) return true;
          const timeSinceLastRefresh = now - new Date(user.lastDataRefresh).getTime();
          return timeSinceLastRefresh >= ONE_HOUR5;
        }
        if (user.subscriptionStatus === "trial") {
          if (!user.lastDataRefresh) return true;
          const timeSinceLastRefresh = now - new Date(user.lastDataRefresh).getTime();
          return timeSinceLastRefresh >= ONE_DAY4;
        }
        return false;
      }
      async getUsersEligibleForDataRefresh() {
        const allUsers = await db.select().from(users).where(
          and17(
            eq32(users.archived, false),
            or3(
              eq32(users.subscriptionStatus, "active"),
              eq32(users.subscriptionStatus, "trial")
            )
          )
        );
        return allUsers.filter((user) => this.canUserReceiveDataRefresh(user));
      }
      // Payments
      async getUserPayments(userId) {
        return await db.select().from(payments).where(eq32(payments.userId, userId)).orderBy(desc18(payments.paymentDate));
      }
      async createPayment(payment) {
        const [newPayment] = await db.insert(payments).values(payment).returning();
        return newPayment;
      }
      async getPaymentStats(userId) {
        const [stats] = await db.select({
          totalPaid: sql22`COALESCE(SUM(${payments.amount}), 0)::text`,
          lastPaymentDate: sql22`MAX(${payments.paymentDate})`,
          lastPaymentAmount: sql22`(
          SELECT ${payments.amount}::text 
          FROM ${payments} 
          WHERE ${payments.userId} = ${userId} 
          ORDER BY ${payments.paymentDate} DESC 
          LIMIT 1
        )`,
          paymentCount: sql22`COUNT(*)::int`
        }).from(payments).where(eq32(payments.userId, userId));
        return stats || {
          totalPaid: "0",
          lastPaymentDate: null,
          lastPaymentAmount: null,
          paymentCount: 0
        };
      }
      // Manual Overrides
      async createManualOverride(override) {
        const [newOverride] = await db.insert(manualOverrides).values(override).returning();
        return newOverride;
      }
      async getUserManualOverrides(userId) {
        return await db.select().from(manualOverrides).where(eq32(manualOverrides.userId, userId)).orderBy(desc18(manualOverrides.createdAt));
      }
      async getActiveManualOverride(userId) {
        const now = /* @__PURE__ */ new Date();
        const [override] = await db.select().from(manualOverrides).where(
          and17(
            eq32(manualOverrides.userId, userId),
            sql22`${manualOverrides.startDate} <= ${now}`,
            sql22`${manualOverrides.endDate} > ${now}`
          )
        ).orderBy(desc18(manualOverrides.endDate)).limit(1);
        return override;
      }
      // Password Reset
      async createPasswordResetToken(token) {
        const [newToken] = await db.insert(passwordResetTokens).values(token).returning();
        return newToken;
      }
      async getPasswordResetToken(token) {
        const [resetToken] = await db.select().from(passwordResetTokens).where(eq32(passwordResetTokens.token, token));
        return resetToken;
      }
      async markPasswordResetTokenUsed(tokenId) {
        const result = await db.update(passwordResetTokens).set({ used: true }).where(eq32(passwordResetTokens.id, tokenId));
        return result.rowCount ? result.rowCount > 0 : false;
      }
      async purgeExpiredPasswordResetTokens() {
        const now = /* @__PURE__ */ new Date();
        const result = await db.delete(passwordResetTokens).where(
          sql22`${passwordResetTokens.expiresAt} < ${now} OR ${passwordResetTokens.used} = true`
        );
        return result.rowCount || 0;
      }
      // Stock Comments
      async getStockComments(ticker) {
        const comments = await db.select({
          comment: stockComments,
          user: users
        }).from(stockComments).leftJoin(users, eq32(stockComments.userId, users.id)).where(eq32(stockComments.ticker, ticker)).orderBy(desc18(stockComments.createdAt));
        return comments.map((row) => ({
          ...row.comment,
          user: row.user
        }));
      }
      async createStockComment(comment) {
        const [newComment] = await db.insert(stockComments).values(comment).returning();
        return newComment;
      }
      async getStockCommentCounts() {
        const counts = await db.select({
          ticker: stockComments.ticker,
          count: sql22`count(*)::int`
        }).from(stockComments).groupBy(stockComments.ticker);
        return counts;
      }
      // Followed Stocks
      async getUserFollowedStocks(userId) {
        return await db.select().from(followedStocks).where(eq32(followedStocks.userId, userId)).orderBy(desc18(followedStocks.followedAt));
      }
      async followStock(follow) {
        const [newFollow] = await db.insert(followedStocks).values(follow).returning();
        eventDispatcher.emit("FOLLOWED_STOCK_UPDATED", {
          type: "FOLLOWED_STOCK_UPDATED",
          userId: follow.userId,
          ticker: follow.ticker,
          data: { action: "follow" }
        });
        return newFollow;
      }
      async unfollowStock(ticker, userId) {
        await db.delete(followedStocks).where(
          and17(
            eq32(followedStocks.ticker, ticker),
            eq32(followedStocks.userId, userId)
          )
        );
        eventDispatcher.emit("FOLLOWED_STOCK_UPDATED", {
          type: "FOLLOWED_STOCK_UPDATED",
          userId,
          ticker,
          data: { action: "unfollow" }
        });
        return true;
      }
      async toggleStockPosition(ticker, userId, hasEnteredPosition, entryPrice) {
        const updateData = {
          hasEnteredPosition
        };
        if (hasEnteredPosition && entryPrice !== void 0) {
          updateData.entryPrice = entryPrice.toString();
        } else if (!hasEnteredPosition) {
          updateData.entryPrice = null;
        }
        const result = await db.update(followedStocks).set(updateData).where(
          and17(
            eq32(followedStocks.ticker, ticker),
            eq32(followedStocks.userId, userId)
          )
        ).returning();
        if (result.length === 0) {
          throw new Error("Stock is not being followed");
        }
        eventDispatcher.emit("FOLLOWED_STOCK_UPDATED", {
          type: "FOLLOWED_STOCK_UPDATED",
          userId,
          ticker,
          data: { action: "position_toggle", hasEnteredPosition, entryPrice: updateData.entryPrice }
        });
        return true;
      }
      async closePosition(ticker, userId, sellPrice, quantity) {
        const followedStock = await db.select().from(followedStocks).where(
          and17(
            eq32(followedStocks.ticker, ticker),
            eq32(followedStocks.userId, userId)
          )
        ).limit(1);
        if (followedStock.length === 0) {
          throw new Error("Stock is not being followed");
        }
        const stock = followedStock[0];
        if (!stock.hasEnteredPosition || !stock.entryPrice) {
          throw new Error("No open position to close");
        }
        const entryPriceNum = parseFloat(stock.entryPrice);
        const pnl = (sellPrice - entryPriceNum) * quantity;
        const sellDate = /* @__PURE__ */ new Date();
        await db.update(followedStocks).set({
          sellPrice: sellPrice.toString(),
          sellDate,
          pnl: pnl.toFixed(2),
          hasEnteredPosition: false
          // Close the position
        }).where(
          and17(
            eq32(followedStocks.ticker, ticker),
            eq32(followedStocks.userId, userId)
          )
        );
        eventDispatcher.emit("FOLLOWED_STOCK_UPDATED", {
          type: "FOLLOWED_STOCK_UPDATED",
          userId,
          ticker,
          data: { action: "close_position", sellPrice, pnl, sellDate }
        });
        return {
          pnl: pnl.toFixed(2),
          sellPrice: sellPrice.toString(),
          sellDate
        };
      }
      async getTotalPnL(userId) {
        const result = await db.select({
          totalPnl: sql22`COALESCE(SUM(CAST(${followedStocks.pnl} AS DECIMAL)), 0)`
        }).from(followedStocks).where(eq32(followedStocks.userId, userId));
        return result[0]?.totalPnl || 0;
      }
      // Cross-user aggregation for "popular stock" notifications
      async getFollowerCountForTicker(ticker) {
        const result = await db.select({ count: sql22`count(*)::int` }).from(followedStocks).where(eq32(followedStocks.ticker, ticker));
        return result[0]?.count || 0;
      }
      async getFollowerUserIdsForTicker(ticker) {
        const result = await db.select({ userId: followedStocks.userId }).from(followedStocks).where(eq32(followedStocks.ticker, ticker));
        return result.map((r) => r.userId);
      }
      async hasAnyUserPositionInTicker(ticker) {
        const result = await db.select({ id: followedStocks.id }).from(followedStocks).where(
          and17(
            eq32(followedStocks.ticker, ticker),
            eq32(followedStocks.hasEnteredPosition, true)
          )
        ).limit(1);
        return result.length > 0;
      }
      async getFollowedStocksWithPrices(userId) {
        const followedStocksList = await this.getUserFollowedStocks(userId);
        const results = [];
        for (const followed of followedStocksList) {
          const stockData = await db.select().from(stocks).where(eq32(stocks.ticker, followed.ticker)).orderBy(desc18(stocks.lastUpdated)).limit(1);
          if (stockData.length > 0) {
            const stock = stockData[0];
            const currentPrice = parseFloat(stock.currentPrice);
            const previousPrice = stock.previousClose ? parseFloat(stock.previousClose) : currentPrice;
            const priceChange = currentPrice - previousPrice;
            const priceChangePercent = previousPrice !== 0 ? priceChange / previousPrice * 100 : 0;
            results.push({
              ...followed,
              currentPrice: stock.currentPrice,
              priceChange: priceChange.toFixed(2),
              priceChangePercent: priceChangePercent.toFixed(2)
            });
          } else {
            results.push({
              ...followed,
              currentPrice: "0.00",
              priceChange: "0.00",
              priceChangePercent: "0.00"
            });
          }
        }
        return results;
      }
      async getFollowedStocksWithStatus(userId) {
        const followedWithPrices = await this.getFollowedStocksWithPrices(userId);
        const results = [];
        for (const followed of followedWithPrices) {
          const stockData = await db.select().from(stocks).where(eq32(stocks.ticker, followed.ticker)).orderBy(desc18(stocks.lastUpdated)).limit(1);
          const stock = stockData[0];
          const insiderAction = stock?.recommendation?.toUpperCase() || null;
          const jobs = await db.select().from(aiAnalysisJobs).where(eq32(aiAnalysisJobs.ticker, followed.ticker)).orderBy(desc18(aiAnalysisJobs.createdAt)).limit(1);
          const latestJob = jobs[0];
          const jobStatus = latestJob?.status || null;
          const briefs = await db.select().from(dailyBriefs).where(
            and17(
              eq32(dailyBriefs.ticker, followed.ticker),
              eq32(dailyBriefs.userId, userId)
            )
          ).orderBy(desc18(dailyBriefs.briefDate)).limit(1);
          const latestBrief = briefs[0];
          const normalizeStance = (rawStance) => {
            if (!rawStance) return null;
            const stance = rawStance.toLowerCase().trim();
            if (stance === "enter") return "buy";
            if (stance === "wait") return "hold";
            if (stance === "buy" || stance === "sell" || stance === "hold") return stance;
            console.warn(`[Storage] Unknown stance value: "${rawStance}", defaulting to "hold"`);
            return "hold";
          };
          const watchingStance = normalizeStance(latestBrief?.watchingStance);
          const owningStance = normalizeStance(latestBrief?.owningStance);
          const aiScore = latestBrief?.watchingConfidence ?? null;
          const analyses = await db.select().from(stockAnalyses).where(eq32(stockAnalyses.ticker, followed.ticker)).limit(1);
          const analysis = analyses[0];
          const integratedScore = analysis?.integratedScore ?? null;
          let stanceAlignment = null;
          if (watchingStance || owningStance) {
            if (watchingStance === "buy" || watchingStance === "sell" || owningStance === "buy" || owningStance === "sell") {
              stanceAlignment = "act";
            } else {
              stanceAlignment = "hold";
            }
          }
          let aiStance = "HOLD";
          const relevantStance = followed.hasEnteredPosition ? owningStance : watchingStance;
          if (relevantStance === "buy") {
            aiStance = "BUY";
          } else if (relevantStance === "sell") {
            aiStance = "SELL";
          } else if (relevantStance === "hold") {
            aiStance = "HOLD";
          }
          results.push({
            ...followed,
            jobStatus,
            insiderAction,
            aiStance,
            aiScore,
            integratedScore,
            stanceAlignment
          });
        }
        return results;
      }
      async getDailyBriefsForTicker(ticker, userId) {
        return await db.select().from(dailyBriefs).where(
          and17(
            eq32(dailyBriefs.ticker, ticker),
            eq32(dailyBriefs.userId, userId)
          )
        ).orderBy(desc18(dailyBriefs.briefDate)).limit(7);
      }
      async getDailyBriefForUser(userId, ticker, briefDate) {
        const [brief] = await db.select().from(dailyBriefs).where(
          and17(
            eq32(dailyBriefs.userId, userId),
            eq32(dailyBriefs.ticker, ticker),
            eq32(dailyBriefs.briefDate, briefDate)
          )
        ).limit(1);
        return brief;
      }
      async createDailyBrief(brief) {
        const [existing] = await db.select().from(dailyBriefs).where(
          and17(
            eq32(dailyBriefs.userId, brief.userId),
            eq32(dailyBriefs.ticker, brief.ticker),
            eq32(dailyBriefs.briefDate, brief.briefDate)
          )
        ).limit(1);
        if (existing) {
          const [updated] = await db.update(dailyBriefs).set(brief).where(eq32(dailyBriefs.id, existing.id)).returning();
          return updated;
        }
        const [created] = await db.insert(dailyBriefs).values(brief).returning();
        return created;
      }
      // Global Ticker Daily Briefs (not per-user, shared across all users)
      async getTickerDailyBriefs(ticker, limit = 7) {
        return await db.select().from(tickerDailyBriefs).where(eq32(tickerDailyBriefs.ticker, ticker.toUpperCase())).orderBy(desc18(tickerDailyBriefs.briefDate)).limit(limit);
      }
      async createTickerDailyBrief(brief) {
        const [existing] = await db.select().from(tickerDailyBriefs).where(
          and17(
            eq32(tickerDailyBriefs.ticker, brief.ticker.toUpperCase()),
            eq32(tickerDailyBriefs.briefDate, brief.briefDate)
          )
        ).limit(1);
        if (existing) {
          const [updated] = await db.update(tickerDailyBriefs).set({ ...brief, ticker: brief.ticker.toUpperCase() }).where(eq32(tickerDailyBriefs.id, existing.id)).returning();
          return updated;
        }
        const [created] = await db.insert(tickerDailyBriefs).values({ ...brief, ticker: brief.ticker.toUpperCase() }).returning();
        return created;
      }
      async getLatestTickerBrief(ticker) {
        const [brief] = await db.select().from(tickerDailyBriefs).where(eq32(tickerDailyBriefs.ticker, ticker.toUpperCase())).orderBy(desc18(tickerDailyBriefs.briefDate)).limit(1);
        return brief;
      }
      async getUserStockStatus(userId, ticker) {
        const [status] = await db.select().from(userStockStatuses).where(
          and17(
            eq32(userStockStatuses.userId, userId),
            eq32(userStockStatuses.ticker, ticker)
          )
        );
        return status;
      }
      async getUserStockStatuses(userId, status) {
        if (status) {
          return await db.select().from(userStockStatuses).where(
            and17(
              eq32(userStockStatuses.userId, userId),
              eq32(userStockStatuses.status, status)
            )
          );
        }
        return await db.select().from(userStockStatuses).where(eq32(userStockStatuses.userId, userId));
      }
      async getStocksWithUserStatus(userId, limit = 100) {
        try {
          console.log(`[Storage] getStocksWithUserStatus called for userId: ${userId}, limit: ${limit}`);
          const twoWeeksAgo = /* @__PURE__ */ new Date();
          twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
          const twoWeeksAgoString = twoWeeksAgo.toISOString().split("T")[0];
          const followedTickerRows = await db.select({ ticker: followedStocks.ticker }).from(followedStocks).where(eq32(followedStocks.userId, userId));
          const allFollowedTickers = followedTickerRows.map((r) => r.ticker.toUpperCase());
          const followedTickerSet = new Set(allFollowedTickers);
          console.log(`[Storage] User follows ${followedTickerSet.size} tickers`);
          const userScopedFollowed = await db.select({
            stock: stocks,
            userStatus: userStockStatuses.status,
            userApprovedAt: userStockStatuses.approvedAt,
            userRejectedAt: userStockStatuses.rejectedAt,
            userDismissedAt: userStockStatuses.dismissedAt,
            isFollowing: followedStocks.ticker
          }).from(stocks).innerJoin(
            followedStocks,
            and17(
              eq32(stocks.ticker, followedStocks.ticker),
              eq32(followedStocks.userId, userId)
            )
          ).leftJoin(
            userStockStatuses,
            and17(
              eq32(stocks.ticker, userStockStatuses.ticker),
              eq32(userStockStatuses.userId, userId)
            )
          ).where(
            and17(
              eq32(stocks.userId, userId),
              eq32(stocks.recommendationStatus, "pending")
            )
          ).orderBy(desc18(stocks.insiderTradeDate));
          console.log(`[Storage] Found ${userScopedFollowed.length} user-scoped followed stocks`);
          const foundFollowedTickers = new Set(userScopedFollowed.map((r) => r.stock.ticker.toUpperCase()));
          const orphanedFollowTickers = allFollowedTickers.filter((t) => !foundFollowedTickers.has(t));
          let globalFallbackResults = [];
          if (orphanedFollowTickers.length > 0) {
            console.log(`[Storage] Found ${orphanedFollowTickers.length} orphaned followed tickers, checking global pool`);
            const globalStocksRaw = await db.select({
              stock: stocks,
              userStatus: userStockStatuses.status,
              userApprovedAt: userStockStatuses.approvedAt,
              userRejectedAt: userStockStatuses.rejectedAt,
              userDismissedAt: userStockStatuses.dismissedAt
            }).from(stocks).leftJoin(
              userStockStatuses,
              and17(
                eq32(stocks.ticker, userStockStatuses.ticker),
                eq32(userStockStatuses.userId, userId)
              )
            ).where(
              and17(
                inArray5(sql22`UPPER(${stocks.ticker})`, orphanedFollowTickers),
                eq32(stocks.recommendationStatus, "pending")
              )
            ).orderBy(stocks.ticker, desc18(stocks.lastUpdated));
            const seenGlobalTickers = /* @__PURE__ */ new Set();
            globalFallbackResults = globalStocksRaw.filter((row) => {
              const normalizedTicker = row.stock.ticker.toUpperCase();
              if (seenGlobalTickers.has(normalizedTicker)) return false;
              seenGlobalTickers.add(normalizedTicker);
              return true;
            }).map((row) => ({
              stock: row.stock,
              userStatus: row.userStatus,
              userApprovedAt: row.userApprovedAt,
              userRejectedAt: row.userRejectedAt,
              userDismissedAt: row.userDismissedAt,
              isFollowing: row.stock.ticker
              // Use original ticker casing from DB
            }));
            console.log(`[Storage] Found ${globalFallbackResults.length} stocks from global fallback (bulk query)`);
          }
          const recentNonFollowedResults = await db.select({
            stock: stocks,
            userStatus: userStockStatuses.status,
            userApprovedAt: userStockStatuses.approvedAt,
            userRejectedAt: userStockStatuses.rejectedAt,
            userDismissedAt: userStockStatuses.dismissedAt,
            isFollowing: sql22`NULL`
          }).from(stocks).leftJoin(
            userStockStatuses,
            and17(
              eq32(stocks.ticker, userStockStatuses.ticker),
              eq32(userStockStatuses.userId, userId)
            )
          ).where(
            and17(
              eq32(stocks.userId, userId),
              eq32(stocks.recommendationStatus, "pending"),
              sql22`${stocks.insiderTradeDate} >= ${twoWeeksAgoString}`,
              // Exclude followed stocks
              sql22`NOT EXISTS (
              SELECT 1 FROM followed_stocks fs 
              WHERE fs.ticker = ${stocks.ticker} AND fs.user_id = ${userId}
            )`
            )
          ).orderBy(desc18(stocks.insiderTradeDate)).limit(limit);
          console.log(`[Storage] Found ${recentNonFollowedResults.length} recent non-followed stocks`);
          const seenTickers = /* @__PURE__ */ new Set();
          const dedupedResults = [];
          for (const row of userScopedFollowed) {
            const upperTicker = row.stock.ticker.toUpperCase();
            if (!seenTickers.has(upperTicker)) {
              seenTickers.add(upperTicker);
              dedupedResults.push(row);
            }
          }
          for (const row of globalFallbackResults) {
            const upperTicker = row.stock.ticker.toUpperCase();
            if (!seenTickers.has(upperTicker)) {
              seenTickers.add(upperTicker);
              dedupedResults.push(row);
            }
          }
          for (const row of recentNonFollowedResults) {
            const upperTicker = row.stock.ticker.toUpperCase();
            if (!seenTickers.has(upperTicker)) {
              seenTickers.add(upperTicker);
              dedupedResults.push(row);
            }
          }
          console.log(`[Storage] After merge: ${dedupedResults.length} unique stocks`);
          console.log(`[Storage] Followed stocks in results: ${dedupedResults.filter((r) => r.isFollowing).length}`);
          const allJobs = await db.select().from(aiAnalysisJobs).where(
            and17(
              inArray5(aiAnalysisJobs.ticker, dedupedResults.map((r) => r.stock.ticker)),
              inArray5(aiAnalysisJobs.status, ["pending", "processing", "failed"])
            )
          );
          console.log(`[Storage] Found ${allJobs.length} active AI jobs`);
          const jobsByTicker = /* @__PURE__ */ new Map();
          for (const job of allJobs) {
            const existing = jobsByTicker.get(job.ticker);
            if (!existing || job.createdAt && existing.createdAt && job.createdAt > existing.createdAt) {
              jobsByTicker.set(job.ticker, job);
            }
          }
          const transformed = dedupedResults.map((row) => {
            const latestJob = jobsByTicker.get(row.stock.ticker);
            const lastUpdated = row.stock.lastUpdated || /* @__PURE__ */ new Date();
            return {
              ...row.stock,
              isStale: isStockStale(lastUpdated),
              ageDays: getStockAgeInDays(lastUpdated),
              userStatus: row.userStatus || "pending",
              userApprovedAt: row.userApprovedAt,
              userRejectedAt: row.userRejectedAt,
              userDismissedAt: row.userDismissedAt,
              isFollowing: !!row.isFollowing,
              analysisJob: latestJob ? {
                status: latestJob.status,
                currentStep: latestJob.currentStep,
                stepDetails: latestJob.stepDetails,
                lastError: latestJob.lastError,
                updatedAt: latestJob.createdAt
              } : null
            };
          });
          console.log(`[Storage] Transformed ${transformed.length} stocks`);
          console.log(`[Storage] Sample:`, transformed[0] ? {
            ticker: transformed[0].ticker,
            userStatus: transformed[0].userStatus,
            recommendationStatus: transformed[0].recommendationStatus
          } : "no data");
          return transformed;
        } catch (error) {
          console.error("[Storage] getStocksWithUserStatus ERROR:", error);
          throw error;
        }
      }
      async createUserStockStatus(statusData) {
        const [status] = await db.insert(userStockStatuses).values(statusData).onConflictDoUpdate({
          target: [userStockStatuses.userId, userStockStatuses.ticker],
          set: {
            status: statusData.status,
            approvedAt: statusData.approvedAt || null,
            rejectedAt: statusData.rejectedAt || null,
            dismissedAt: statusData.dismissedAt || null,
            updatedAt: /* @__PURE__ */ new Date()
          }
        }).returning();
        if (!status) {
          throw new Error(`Failed to create/update user stock status for ${statusData.ticker}`);
        }
        return status;
      }
      async updateUserStockStatus(userId, ticker, updates) {
        const [updated] = await db.update(userStockStatuses).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(
          and17(
            eq32(userStockStatuses.userId, userId),
            eq32(userStockStatuses.ticker, ticker)
          )
        ).returning();
        if (updated && updates.status) {
          eventDispatcher.emit("STOCK_STATUS_CHANGED", {
            type: "STOCK_STATUS_CHANGED",
            userId,
            ticker,
            status: updates.status
          });
        }
        return updated;
      }
      async ensureUserStockStatus(userId, ticker) {
        const existing = await this.getUserStockStatus(userId, ticker);
        if (existing) {
          return existing;
        }
        return await this.createUserStockStatus({ userId, ticker, status: "pending" });
      }
      async rejectTickerForUser(userId, ticker) {
        await this.ensureUserStockStatus(userId, ticker);
        const userStatus = await this.updateUserStockStatus(userId, ticker, {
          status: "rejected",
          rejectedAt: /* @__PURE__ */ new Date(),
          approvedAt: null,
          dismissedAt: null
        });
        const stockCount = await db.select().from(stocks).where(and17(
          eq32(stocks.ticker, ticker),
          eq32(stocks.userId, userId)
        ));
        console.log(`[RejectTicker] User ${userId} rejected ticker ${ticker} (${stockCount.length} user transactions)`);
        return {
          userStatus,
          stocksUpdated: stockCount.length
        };
      }
      async markStockAsViewed(ticker, userId) {
        const existing = await db.select().from(stockViews).where(
          and17(
            eq32(stockViews.ticker, ticker),
            eq32(stockViews.userId, userId)
          )
        ).limit(1);
        if (existing.length > 0) {
          return existing[0];
        }
        const [view] = await db.insert(stockViews).values({ ticker, userId }).returning();
        return view;
      }
      async markStocksAsViewed(tickers, userId) {
        if (tickers.length === 0) return;
        const existingViews = await db.select({ ticker: stockViews.ticker }).from(stockViews).where(
          and17(
            eq32(stockViews.userId, userId),
            inArray5(stockViews.ticker, tickers)
          )
        );
        const existingTickers = new Set(existingViews.map((v) => v.ticker));
        const newTickers = tickers.filter((ticker) => !existingTickers.has(ticker));
        if (newTickers.length > 0) {
          await db.insert(stockViews).values(newTickers.map((ticker) => ({ ticker, userId }))).onConflictDoNothing();
        }
      }
      async getUserStockViews(userId) {
        const views = await db.select({ ticker: stockViews.ticker }).from(stockViews).where(eq32(stockViews.userId, userId));
        return views.map((v) => v.ticker);
      }
      async hasCompletedTutorial(userId, tutorialId) {
        const result = await db.select().from(userTutorials).where(and17(eq32(userTutorials.userId, userId), eq32(userTutorials.tutorialId, tutorialId))).limit(1);
        return result.length > 0;
      }
      async markTutorialAsCompleted(userId, tutorialId) {
        const existing = await db.select().from(userTutorials).where(and17(eq32(userTutorials.userId, userId), eq32(userTutorials.tutorialId, tutorialId))).limit(1);
        if (existing.length > 0) {
          return existing[0];
        }
        const [tutorial] = await db.insert(userTutorials).values({ userId, tutorialId }).returning();
        return tutorial;
      }
      async getUserTutorials(userId) {
        return await db.select().from(userTutorials).where(eq32(userTutorials.userId, userId));
      }
      async getStockAnalysis(ticker) {
        const [analysis] = await db.select().from(stockAnalyses).where(eq32(stockAnalyses.ticker, ticker));
        return analysis;
      }
      async getAllStockAnalyses() {
        return await db.select().from(stockAnalyses);
      }
      async saveStockAnalysis(analysis) {
        await db.delete(stockAnalyses).where(eq32(stockAnalyses.ticker, analysis.ticker));
        const [newAnalysis] = await db.insert(stockAnalyses).values(analysis).returning();
        return newAnalysis;
      }
      async updateStockAnalysis(ticker, updates) {
        await db.update(stockAnalyses).set(updates).where(eq32(stockAnalyses.ticker, ticker));
      }
      async updateStockAnalysisStatus(ticker, status, errorMessage) {
        const updates = {
          status,
          errorMessage: errorMessage || null
          // Clear error message if not provided
        };
        await db.update(stockAnalyses).set(updates).where(eq32(stockAnalyses.ticker, ticker));
      }
      // Stock Candlesticks Methods (shared OHLCV data - one record per ticker, reused across users)
      async getCandlesticksByTicker(ticker) {
        const [candlesticks] = await db.select().from(stockCandlesticks).where(eq32(stockCandlesticks.ticker, ticker));
        return candlesticks;
      }
      async upsertCandlesticks(ticker, candlestickData) {
        const existing = await this.getCandlesticksByTicker(ticker);
        if (existing) {
          const [updated] = await db.update(stockCandlesticks).set({
            candlestickData,
            lastUpdated: /* @__PURE__ */ new Date()
          }).where(eq32(stockCandlesticks.ticker, ticker)).returning();
          return updated;
        } else {
          const [inserted] = await db.insert(stockCandlesticks).values({
            ticker,
            candlestickData,
            lastUpdated: /* @__PURE__ */ new Date()
          }).returning();
          return inserted;
        }
      }
      async getAllTickersNeedingCandlestickData() {
        const oneDayAgo = /* @__PURE__ */ new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);
        const allTickers = await db.selectDistinct({ ticker: stocks.ticker }).from(stocks);
        const tickersWithRecentData = await db.select({ ticker: stockCandlesticks.ticker }).from(stockCandlesticks).where(sql22`${stockCandlesticks.lastUpdated} >= ${oneDayAgo}`);
        const recentTickerSet = new Set(tickersWithRecentData.map((t) => t.ticker));
        return allTickers.map((t) => t.ticker).filter((ticker) => !recentTickerSet.has(ticker));
      }
      // AI Analysis Job Queue Methods
      async enqueueAnalysisJob(ticker, source, priority = "normal", force = false) {
        if (force) {
          await db.update(aiAnalysisJobs).set({ status: "cancelled", completedAt: /* @__PURE__ */ new Date() }).where(
            and17(
              eq32(aiAnalysisJobs.ticker, ticker),
              sql22`${aiAnalysisJobs.status} IN ('pending', 'processing')`
            )
          );
          console.log(`[Queue] Cancelled existing jobs for ${ticker} (force re-analysis)`);
        } else {
          const [existingJob] = await db.select().from(aiAnalysisJobs).where(
            and17(
              eq32(aiAnalysisJobs.ticker, ticker),
              sql22`${aiAnalysisJobs.status} IN ('pending', 'processing')`
            )
          ).limit(1);
          if (existingJob) {
            console.log(`[Queue] Job already exists for ${ticker} with status ${existingJob.status}`);
            return existingJob;
          }
        }
        try {
          const [job] = await db.insert(aiAnalysisJobs).values({
            ticker,
            source,
            priority,
            status: "pending",
            retryCount: 0,
            maxRetries: 3,
            scheduledAt: /* @__PURE__ */ new Date()
          }).returning();
          const existingAnalysis = await this.getStockAnalysis(ticker);
          if (existingAnalysis) {
            if (force || existingAnalysis.status !== "completed" || !existingAnalysis.integratedScore) {
              if (force) {
                await db.delete(stockAnalyses).where(eq32(stockAnalyses.ticker, ticker));
                await db.insert(stockAnalyses).values({
                  ticker,
                  status: "analyzing"
                });
                console.log(`[Queue] Deleted old analysis for ${ticker} (forced refresh)`);
              } else {
                await this.updateStockAnalysis(ticker, { status: "analyzing", errorMessage: null });
              }
            }
          } else {
            await db.insert(stockAnalyses).values({
              ticker,
              status: "analyzing"
            });
          }
          console.log(`[Queue] Enqueued analysis job for ${ticker} (priority: ${priority}, source: ${source})`);
          return job;
        } catch (error) {
          if (error.code === "23505" || error.message?.includes("unique")) {
            console.log(`[Queue] Race condition detected for ${ticker}, fetching existing job`);
            const [existingJob] = await db.select().from(aiAnalysisJobs).where(
              and17(
                eq32(aiAnalysisJobs.ticker, ticker),
                sql22`${aiAnalysisJobs.status} IN ('pending', 'processing')`
              )
            ).limit(1);
            if (existingJob) {
              return existingJob;
            }
          }
          throw error;
        }
      }
      async cancelAnalysisJobsForTicker(ticker) {
        await db.update(aiAnalysisJobs).set({ status: "cancelled", completedAt: /* @__PURE__ */ new Date() }).where(
          and17(
            eq32(aiAnalysisJobs.ticker, ticker),
            sql22`${aiAnalysisJobs.status} IN ('pending', 'processing')`
          )
        );
        console.log(`[Queue] Cancelled any active jobs for ${ticker}`);
      }
      async dequeueNextJob() {
        const result = await db.execute(sql22`
      UPDATE ${aiAnalysisJobs}
      SET status = 'processing',
          started_at = NOW()
      WHERE id = (
        SELECT id
        FROM ${aiAnalysisJobs}
        WHERE status = 'pending'
          AND scheduled_at <= NOW()
        ORDER BY
          CASE priority
            WHEN 'high' THEN 1
            WHEN 'normal' THEN 2
            WHEN 'low' THEN 3
            ELSE 4
          END,
          scheduled_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      RETURNING *
    `);
        const jobs = result.rows;
        return jobs.length > 0 ? jobs[0] : void 0;
      }
      async getJobById(jobId) {
        const [job] = await db.select().from(aiAnalysisJobs).where(eq32(aiAnalysisJobs.id, jobId));
        return job;
      }
      async getJobsByTicker(ticker) {
        return await db.select().from(aiAnalysisJobs).where(eq32(aiAnalysisJobs.ticker, ticker)).orderBy(desc18(aiAnalysisJobs.createdAt));
      }
      async updateJobStatus(jobId, status, updates = {}) {
        const updateData = {
          status,
          ...updates
        };
        if (status === "completed" || status === "failed") {
          updateData.completedAt = /* @__PURE__ */ new Date();
        }
        await db.update(aiAnalysisJobs).set(updateData).where(eq32(aiAnalysisJobs.id, jobId));
        console.log(`[Queue] Updated job ${jobId} to status: ${status}`);
      }
      async updateJobProgress(jobId, currentStep, stepDetails) {
        await db.update(aiAnalysisJobs).set({
          currentStep,
          stepDetails,
          lastError: null
          // Clear error on successful progress update
        }).where(eq32(aiAnalysisJobs.id, jobId));
      }
      async resetStockAnalysisPhaseFlags(ticker) {
        const result = await db.execute(sql22`
      WITH lock AS (SELECT pg_advisory_xact_lock(hashtext(${ticker})))
      UPDATE ${stocks}
      SET 
        micro_analysis_completed = false,
        macro_analysis_completed = false,
        combined_analysis_completed = false
      WHERE ticker = ${ticker}
    `);
        console.log(`[Storage] Reset phase flags for ${ticker} (updated ${result.rowCount || 0} rows)`);
      }
      async markStockAnalysisPhaseComplete(ticker, phase) {
        const fieldMap = {
          "micro": "micro_analysis_completed",
          "macro": "macro_analysis_completed",
          "combined": "combined_analysis_completed"
        };
        const fieldName = fieldMap[phase];
        const result = await db.execute(sql22`
      WITH lock AS (SELECT pg_advisory_xact_lock(hashtext(${ticker})))
      UPDATE ${stocks}
      SET ${sql22.raw(fieldName)} = true
      WHERE ticker = ${ticker}
    `);
        console.log(`[Storage] Marked ${phase} analysis complete for ${ticker} (updated ${result.rowCount || 0} rows)`);
      }
      async getStocksWithIncompleteAnalysis() {
        const incompleteStocks = await db.select().from(stocks).where(
          and17(
            eq32(stocks.recommendationStatus, "pending"),
            sql22`(
            ${stocks.microAnalysisCompleted} = false
            OR ${stocks.macroAnalysisCompleted} = false
            OR ${stocks.combinedAnalysisCompleted} = false
          )`,
            sql22`NOT EXISTS (
            SELECT 1 FROM ${aiAnalysisJobs}
            WHERE ${aiAnalysisJobs.ticker} = ${stocks.ticker}
            AND ${aiAnalysisJobs.status} IN ('pending', 'processing')
          )`
          )
        );
        return incompleteStocks;
      }
      async getQueueStats() {
        const stats = await db.select({
          status: aiAnalysisJobs.status,
          count: sql22`count(*)::int`
        }).from(aiAnalysisJobs).groupBy(aiAnalysisJobs.status);
        const result = {
          pending: 0,
          processing: 0,
          completed: 0,
          failed: 0
        };
        for (const stat of stats) {
          if (stat.status in result) {
            result[stat.status] = stat.count;
          }
        }
        return result;
      }
      async resetStuckProcessingJobs(timeoutMs) {
        const timeoutInterval = `${Math.floor(timeoutMs / 1e3)} seconds`;
        const result = await db.execute(sql22`
      UPDATE ${aiAnalysisJobs}
      SET status = 'pending',
          started_at = NULL,
          retry_count = retry_count + 1
      WHERE status = 'processing'
        AND started_at < NOW() - INTERVAL '${sql22.raw(timeoutInterval)}'
    `);
        return result.rowCount || 0;
      }
      // Macro Analysis Methods
      async getLatestMacroAnalysis(industry) {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1e3);
        const [analysis] = await db.select().from(macroAnalyses).where(
          and17(
            industry ? eq32(macroAnalyses.industry, industry) : sql22`${macroAnalyses.industry} IS NULL`,
            sql22`${macroAnalyses.createdAt} >= ${sevenDaysAgo}`,
            eq32(macroAnalyses.status, "completed"),
            sql22`${macroAnalyses.macroFactor} IS NOT NULL`
          )
        ).orderBy(desc18(macroAnalyses.createdAt)).limit(1);
        return analysis;
      }
      async getMacroAnalysis(id) {
        const [analysis] = await db.select().from(macroAnalyses).where(eq32(macroAnalyses.id, id)).limit(1);
        return analysis;
      }
      async createMacroAnalysis(analysis) {
        const [created] = await db.insert(macroAnalyses).values(analysis).returning();
        console.log(`[Storage] Created macro analysis with score ${created.macroScore} and factor ${created.macroFactor}`);
        return created;
      }
      async updateMacroAnalysisStatus(id, status, errorMessage) {
        await db.update(macroAnalyses).set({ status, errorMessage: errorMessage || null }).where(eq32(macroAnalyses.id, id));
      }
      // Feature Suggestion Methods
      async getFeatureSuggestions(userId, status) {
        let query = db.select({
          id: featureSuggestions.id,
          userId: featureSuggestions.userId,
          title: featureSuggestions.title,
          description: featureSuggestions.description,
          status: featureSuggestions.status,
          voteCount: featureSuggestions.voteCount,
          createdAt: featureSuggestions.createdAt,
          updatedAt: featureSuggestions.updatedAt,
          userName: users.name
        }).from(featureSuggestions).leftJoin(users, eq32(featureSuggestions.userId, users.id));
        if (status) {
          query = query.where(eq32(featureSuggestions.status, status));
        }
        const suggestions = await query.orderBy(desc18(featureSuggestions.voteCount), desc18(featureSuggestions.createdAt));
        if (userId) {
          const userVotes = await db.select({ suggestionId: featureVotes.suggestionId }).from(featureVotes).where(eq32(featureVotes.userId, userId));
          const votedSuggestionIds = new Set(userVotes.map((v) => v.suggestionId));
          return suggestions.map((s) => ({
            ...s,
            userName: s.userName || "Unknown User",
            userHasVoted: votedSuggestionIds.has(s.id)
          }));
        }
        return suggestions.map((s) => ({
          ...s,
          userName: s.userName || "Unknown User",
          userHasVoted: false
        }));
      }
      async getFeatureSuggestion(id) {
        const [suggestion] = await db.select().from(featureSuggestions).where(eq32(featureSuggestions.id, id));
        return suggestion;
      }
      async createFeatureSuggestion(suggestion) {
        const [created] = await db.insert(featureSuggestions).values(suggestion).returning();
        return created;
      }
      async updateFeatureSuggestionStatus(id, status) {
        const [updated] = await db.update(featureSuggestions).set({ status, updatedAt: sql22`now()` }).where(eq32(featureSuggestions.id, id)).returning();
        return updated;
      }
      async deleteFeatureSuggestion(id) {
        const result = await db.delete(featureSuggestions).where(eq32(featureSuggestions.id, id));
        return result.rowCount ? result.rowCount > 0 : false;
      }
      async voteForSuggestion(suggestionId, userId) {
        try {
          await db.insert(featureVotes).values({ suggestionId, userId });
          await db.update(featureSuggestions).set({
            voteCount: sql22`${featureSuggestions.voteCount} + 1`,
            updatedAt: sql22`now()`
          }).where(eq32(featureSuggestions.id, suggestionId));
          return true;
        } catch (error) {
          return false;
        }
      }
      async unvoteForSuggestion(suggestionId, userId) {
        const result = await db.delete(featureVotes).where(
          and17(
            eq32(featureVotes.suggestionId, suggestionId),
            eq32(featureVotes.userId, userId)
          )
        );
        if (result.rowCount && result.rowCount > 0) {
          await db.update(featureSuggestions).set({
            voteCount: sql22`${featureSuggestions.voteCount} - 1`,
            updatedAt: sql22`now()`
          }).where(eq32(featureSuggestions.id, suggestionId));
          return true;
        }
        return false;
      }
      async hasUserVoted(suggestionId, userId) {
        const [vote] = await db.select().from(featureVotes).where(
          and17(
            eq32(featureVotes.suggestionId, suggestionId),
            eq32(featureVotes.userId, userId)
          )
        );
        return !!vote;
      }
      // Notification Methods
      async getNotifications(userId) {
        return await db.select().from(notifications).where(eq32(notifications.userId, userId)).orderBy(desc18(notifications.createdAt));
      }
      async getUnreadNotificationCount(userId) {
        const result = await db.select({ count: sql22`count(*)::int` }).from(notifications).where(
          and17(
            eq32(notifications.userId, userId),
            eq32(notifications.isRead, false)
          )
        );
        return result[0]?.count || 0;
      }
      async createNotification(notification) {
        const [newNotification] = await db.insert(notifications).values(notification).returning();
        return newNotification;
      }
      async markNotificationAsRead(id, userId) {
        const [updated] = await db.update(notifications).set({ isRead: true }).where(
          and17(
            eq32(notifications.id, id),
            eq32(notifications.userId, userId)
          )
        ).returning();
        return updated;
      }
      async markAllNotificationsAsRead(userId) {
        const result = await db.update(notifications).set({ isRead: true }).where(
          and17(
            eq32(notifications.userId, userId),
            eq32(notifications.isRead, false)
          )
        );
        return result.rowCount || 0;
      }
      async clearAllNotifications(userId) {
        const result = await db.delete(notifications).where(eq32(notifications.userId, userId));
        return result.rowCount || 0;
      }
      async getAnnouncements(userId) {
        const result = await db.select({
          id: announcements.id,
          title: announcements.title,
          content: announcements.content,
          type: announcements.type,
          isActive: announcements.isActive,
          createdAt: announcements.createdAt,
          createdBy: announcements.createdBy,
          readAt: announcementReads.readAt
        }).from(announcements).leftJoin(
          announcementReads,
          and17(
            eq32(announcementReads.announcementId, announcements.id),
            eq32(announcementReads.userId, userId)
          )
        ).where(eq32(announcements.isActive, true)).orderBy(desc18(announcements.createdAt));
        return result;
      }
      async getUnreadAnnouncementCount(userId) {
        const result = await db.select({ count: sql22`count(*)::int` }).from(announcements).leftJoin(
          announcementReads,
          and17(
            eq32(announcementReads.announcementId, announcements.id),
            eq32(announcementReads.userId, userId)
          )
        ).where(
          and17(
            eq32(announcements.isActive, true),
            sql22`${announcementReads.id} IS NULL`
          )
        );
        return result[0]?.count || 0;
      }
      async createAnnouncement(announcement) {
        const [newAnnouncement] = await db.insert(announcements).values(announcement).returning();
        return newAnnouncement;
      }
      async updateAnnouncement(id, updates) {
        const [updated] = await db.update(announcements).set(updates).where(eq32(announcements.id, id)).returning();
        return updated;
      }
      async deactivateAnnouncement(id) {
        return this.updateAnnouncement(id, { isActive: false });
      }
      async markAnnouncementAsRead(userId, announcementId) {
        await db.insert(announcementReads).values({ userId, announcementId }).onConflictDoNothing();
      }
      async markAllAnnouncementsAsRead(userId) {
        const activeAnnouncements = await db.select({ id: announcements.id }).from(announcements).where(eq32(announcements.isActive, true));
        if (activeAnnouncements.length > 0) {
          const values = activeAnnouncements.map((a) => ({ userId, announcementId: a.id }));
          await db.insert(announcementReads).values(values).onConflictDoNothing();
        }
      }
      async getAllAnnouncements() {
        return await db.select().from(announcements).orderBy(sql22`${announcements.createdAt} DESC`);
      }
      async deleteAnnouncement(id) {
        await db.delete(announcements).where(eq32(announcements.id, id));
      }
      async getAdminNotifications() {
        return await db.select().from(adminNotifications).orderBy(sql22`${adminNotifications.createdAt} DESC`);
      }
      async getUnreadAdminNotificationCount() {
        const result = await db.select({ count: sql22`count(*)` }).from(adminNotifications).where(eq32(adminNotifications.isRead, false));
        return result[0]?.count || 0;
      }
      async createAdminNotification(notification) {
        const [created] = await db.insert(adminNotifications).values(notification).returning();
        return created;
      }
      async markAdminNotificationAsRead(id) {
        const [updated] = await db.update(adminNotifications).set({ isRead: true, readAt: /* @__PURE__ */ new Date() }).where(eq32(adminNotifications.id, id)).returning();
        return updated;
      }
      async markAllAdminNotificationsAsRead() {
        await db.update(adminNotifications).set({ isRead: true, readAt: /* @__PURE__ */ new Date() }).where(eq32(adminNotifications.isRead, false));
      }
      // System Settings
      async getSystemSettings() {
        const [settings] = await db.select().from(systemSettings).limit(1);
        return settings;
      }
      async updateSystemSettings(updates) {
        const existing = await this.getSystemSettings();
        if (existing) {
          const [updated] = await db.update(systemSettings).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq32(systemSettings.id, existing.id)).returning();
          return updated;
        } else {
          const [created] = await db.insert(systemSettings).values({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).returning();
          return created;
        }
      }
    };
    HybridStorage = class extends StorageFacade {
      legacyStorage;
      constructor() {
        super();
        this.legacyStorage = new DatabaseStorage();
      }
      // Delegate getStocksWithUserStatus to DatabaseStorage (complex method, not yet migrated)
      async getStocksWithUserStatus(userId, limit = 100) {
        return this.legacyStorage.getStocksWithUserStatus(userId, limit);
      }
    };
    baseStorage = new HybridStorage();
    if (process.env.ENABLE_CACHE === "true" || process.env.REDIS_URL) {
      try {
        const { CachedStorage: CachedStorage2 } = await Promise.resolve().then(() => (init_cachedStorage(), cachedStorage_exports));
        storage = new CachedStorage2(baseStorage);
        logger.info("[Storage] Caching layer enabled");
      } catch (error) {
        logger.warn("[Storage] Failed to enable caching layer, using base storage", error);
        storage = baseStorage;
      }
    } else {
      storage = baseStorage;
    }
  }
});

// server/telegramNotificationService.ts
var telegramNotificationService_exports = {};
__export(telegramNotificationService_exports, {
  telegramNotificationService: () => telegramNotificationService
});
import TelegramBot from "node-telegram-bot-api";
var TelegramNotificationService, telegramNotificationService;
var init_telegramNotificationService = __esm({
  "server/telegramNotificationService.ts"() {
    "use strict";
    TelegramNotificationService = class {
      bot = null;
      chatId = null;
      isInitialized = false;
      async initialize() {
        const token = process.env.TELEGRAM_BOT_TOKEN;
        const chatId = process.env.TELEGRAM_NOTIFICATION_CHAT_ID;
        if (!token) {
          console.log("[TelegramNotification] TELEGRAM_BOT_TOKEN not configured, notifications disabled");
          return;
        }
        if (!chatId) {
          console.log("[TelegramNotification] TELEGRAM_NOTIFICATION_CHAT_ID not configured, notifications disabled");
          return;
        }
        try {
          this.bot = new TelegramBot(token, { polling: false });
          this.chatId = chatId;
          const botInfo = await this.bot.getMe();
          console.log(`[TelegramNotification] Bot authenticated: @${botInfo.username} (${botInfo.first_name})`);
          console.log(`[TelegramNotification] Chat ID configured: ${chatId}`);
          this.isInitialized = true;
          console.log("[TelegramNotification] Service initialized successfully - ready to send alerts");
        } catch (error) {
          console.error("[TelegramNotification] Initialization failed:", error.message);
          this.isInitialized = false;
        }
      }
      /**
       * Send a plain text message
       */
      async sendMessage(text2) {
        if (!this.isInitialized || !this.bot || !this.chatId) {
          console.log("[TelegramNotification] Service not initialized, skipping notification");
          return false;
        }
        try {
          await this.bot.sendMessage(this.chatId, text2, { parse_mode: "Markdown" });
          return true;
        } catch (error) {
          console.error("[TelegramNotification] Failed to send message:", error.message);
          console.error("[TelegramNotification] Chat ID:", this.chatId);
          console.error("[TelegramNotification] Error details:", error.response?.body || error);
          return false;
        }
      }
      /**
       * Send a new stock recommendation alert
       */
      async sendStockAlert(stockData) {
        if (!this.isInitialized) {
          return false;
        }
        const emoji = stockData.recommendation?.toLowerCase().includes("buy") ? "\u{1F7E2}" : "\u{1F534}";
        const action = stockData.recommendation?.toUpperCase() || "TRADE";
        let message = `${emoji} *New ${action} Recommendation*

`;
        message += `*Ticker:* ${stockData.ticker}
`;
        message += `*Company:* ${stockData.companyName}
`;
        message += `*Current Price:* $${parseFloat(stockData.currentPrice).toFixed(2)}
`;
        if (stockData.insiderPrice) {
          message += `*Insider Price:* $${parseFloat(stockData.insiderPrice).toFixed(2)}
`;
        }
        if (stockData.insiderQuantity) {
          message += `*Insider Quantity:* ${stockData.insiderQuantity.toLocaleString()} shares
`;
        }
        if (stockData.confidenceScore) {
          message += `*Confidence:* ${stockData.confidenceScore}/100
`;
        }
        message += `
\u{1F4C8} View on Purchase page to approve or reject`;
        return await this.sendMessage(message);
      }
      /**
       * Check if the service is ready
       */
      isReady() {
        return this.isInitialized;
      }
    };
    telegramNotificationService = new TelegramNotificationService();
  }
});

// server/telegram.ts
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { NewMessage } from "telegram/events/index.js";
var TelegramService, telegramService;
var init_telegram = __esm({
  async "server/telegram.ts"() {
    "use strict";
    await init_storage();
    init_telegramNotificationService();
    TelegramService = class {
      client = null;
      isConnected = false;
      async initialize() {
        try {
          const config = await storage.getTelegramConfig();
          if (!config || !config.enabled) {
            console.log("[Telegram] No configuration found or disabled");
            return;
          }
          const apiId = parseInt(process.env.TELEGRAM_API_ID || "");
          const apiHash = process.env.TELEGRAM_API_HASH || "";
          if (!apiId || !apiHash) {
            console.error("[Telegram] Missing API credentials");
            return;
          }
          const session2 = new StringSession(config.sessionString || "");
          this.client = new TelegramClient(session2, apiId, apiHash, {
            connectionRetries: 5
          });
          console.log("[Telegram] Connecting to Telegram...");
          if (config.sessionString) {
            try {
              await this.client.connect();
              await this.client.getDialogs({ limit: 1 });
              this.isConnected = true;
              console.log("[Telegram] Connected successfully with saved session");
              await this.setupMessageListener(config.channelUsername);
              return;
            } catch (error) {
              console.log("[Telegram] Saved session invalid, authentication required");
              this.isConnected = false;
              return;
            }
          } else {
            console.log("[Telegram] No saved session found. Authentication required.");
            console.log("[Telegram] Please authenticate via Settings page.");
            this.isConnected = false;
            return;
          }
        } catch (error) {
          console.error("[Telegram] Initialization error:", error);
          this.isConnected = false;
        }
      }
      async setupMessageListener(channelUsername) {
        if (!this.client) return;
        try {
          this.client.addEventHandler(
            async (event) => {
              const message = event.message;
              console.log("[Telegram] New message from", channelUsername);
              console.log("[Telegram] Message ID:", message.id);
              console.log("[Telegram] Text:", message.text);
              if (message.text) {
                await this.parseAndCreateStockRecommendation(message.text);
              }
              await storage.updateTelegramSyncStatus(message.id);
            },
            new NewMessage({ chats: [channelUsername] })
          );
          console.log(`[Telegram] Listening to messages from @${channelUsername}`);
        } catch (error) {
          console.error("[Telegram] Error setting up message listener:", error);
        }
      }
      async fetchRecentMessages(channelUsername, limit = 10) {
        if (!this.client || !this.isConnected) {
          throw new Error("Telegram client not connected");
        }
        try {
          const config = await storage.getTelegramConfig();
          const lastMessageId = config?.lastMessageId || 0;
          const messages = await this.client.getMessages(channelUsername, {
            limit
          });
          console.log(`[Telegram] Fetched ${messages.length} messages`);
          if (messages.length > 0) {
            console.log("\n========== TELEGRAM MESSAGES ANALYSIS ==========");
            const examineCount = Math.min(3, messages.length);
            for (let i = 0; i < examineCount; i++) {
              const msg = messages[i];
              console.log(`
--- Message ${i + 1} (ID: ${msg.id}) ---`);
              console.log("Date:", msg.date);
              console.log("Text:", msg.text);
              console.log("Message:", msg.message);
              console.log("Sender ID:", msg.senderId?.toString());
              console.log("Views:", msg.views);
              console.log("Forwards:", msg.forwards);
              if (msg.entities && msg.entities.length > 0) {
                console.log("Entities:", msg.entities);
              }
              if (msg.media) {
                console.log("Media type:", msg.media.className);
              }
              console.log("All keys:", Object.keys(msg));
            }
            console.log("\n================================================\n");
          }
          const newMessages = messages.filter((msg) => msg.id > lastMessageId);
          console.log(`[Telegram] ${newMessages.length} new messages (${messages.length} total fetched)`);
          console.log(`[Telegram] Parsing ${messages.length} messages...`);
          for (const msg of messages) {
            const text2 = msg.text || msg.message || "";
            if (text2) {
              await this.parseAndCreateStockRecommendation(text2);
            }
          }
          if (messages.length > 0) {
            await storage.updateTelegramSyncStatus(messages[0].id);
          }
          return messages.map((msg) => ({
            id: msg.id,
            date: msg.date,
            text: msg.text || msg.message || "",
            senderId: msg.senderId?.toString() || "",
            views: msg.views,
            forwards: msg.forwards,
            entities: msg.entities
          }));
        } catch (error) {
          console.error("[Telegram] Error fetching messages:", error);
          throw error;
        }
      }
      /**
       * Fetch messages for backtest analysis without creating stocks in database
       */
      async fetchMessagesForBacktest(channelUsername, limit = 10) {
        if (!this.client || !this.isConnected) {
          throw new Error("Telegram client not connected");
        }
        try {
          const messages = await this.client.getMessages(channelUsername, {
            limit
          });
          console.log(`[Telegram] Fetched ${messages.length} messages for backtest`);
          return messages.map((msg) => ({
            id: msg.id,
            date: msg.date,
            text: msg.text || msg.message || "",
            senderId: msg.senderId?.toString() || "",
            views: msg.views,
            forwards: msg.forwards,
            entities: msg.entities
          }));
        } catch (error) {
          console.error("[Telegram] Error fetching messages for backtest:", error);
          throw error;
        }
      }
      async parseAndCreateStockRecommendation(messageText) {
        try {
          console.log("[Telegram] Parsing message:", messageText.substring(0, 100));
          const lines = messageText.split("\n").map((l) => l.trim()).filter((l) => l);
          if (lines.length < 3) {
            console.log("[Telegram] Message too short, skipping");
            return;
          }
          const firstLine = lines[0];
          const isSale = firstLine.toLowerCase().includes("sale") || firstLine.includes("\u{1F534}");
          const isBuy = firstLine.toLowerCase().includes("buy") || firstLine.includes("\u{1F7E2}");
          if (!isSale && !isBuy) {
            console.log("[Telegram] No sale/buy action found, skipping");
            return;
          }
          if (isSale) {
            return;
          }
          const recommendation = isBuy ? "buy" : "sell";
          const tickerMatch = firstLine.match(/[A-Z]{1,5}$/);
          if (!tickerMatch) {
            console.log("[Telegram] No ticker found in first line");
            return;
          }
          const ticker = tickerMatch[0];
          let tradeDate = "";
          if (lines.length > 1) {
            const dateLine = lines[1];
            if (dateLine.match(/\d{2}\.\d{2}\.\d{4}/)) {
              tradeDate = dateLine;
            }
          }
          const existingTransaction = await storage.getTransactionByCompositeKey(
            ticker,
            tradeDate,
            "Telegram Insider",
            // Default name since Telegram messages don't include insider name
            "buy"
            // Only processing buy recommendations from Telegram
          );
          if (existingTransaction) {
            console.log(`[Telegram] Transaction already exists: ${ticker} on ${tradeDate}, skipping`);
            return;
          }
          let price = "100.00";
          let quantity = 0;
          const calcLine = lines.find((l) => l.includes("*") && l.includes("="));
          if (calcLine) {
            const parts = calcLine.split("*");
            if (parts.length >= 2) {
              const priceStr = parts[0].trim().replace(",", ".");
              const priceNum = parseFloat(priceStr);
              if (!isNaN(priceNum) && priceNum > 0) {
                price = priceNum.toFixed(2);
              }
              const qtyStr = parts[1].split("=")[0].trim().replace(/\s/g, "");
              const qtyNum = parseInt(qtyStr);
              if (!isNaN(qtyNum)) {
                quantity = qtyNum;
              }
            }
          }
          let confidenceScore = 70;
          if (quantity > 1e5) confidenceScore = 90;
          else if (quantity > 5e4) confidenceScore = 85;
          else if (quantity > 1e4) confidenceScore = 80;
          else if (quantity > 1e3) confidenceScore = 75;
          const newStock = await storage.createStock({
            ticker,
            companyName: `${ticker} Inc.`,
            currentPrice: price,
            // Temporary - will be updated with real market price
            previousClose: price,
            insiderPrice: price,
            // Price at which insider bought/sold
            insiderQuantity: quantity,
            // Number of shares insider traded
            insiderTradeDate: tradeDate,
            // Date when insider executed the trade
            insiderName: "Telegram Insider",
            // Default name since Telegram doesn't provide insider details
            marketCap: "N/A",
            peRatio: "0",
            recommendation,
            source: "telegram",
            confidenceScore,
            priceHistory: []
          });
          console.log(`[Telegram] \u2705 Created stock: ${ticker} | ${recommendation.toUpperCase()} at $${price} | Qty: ${quantity.toLocaleString()} shares | Confidence: ${confidenceScore}%`);
          if (telegramNotificationService.isReady()) {
            await telegramNotificationService.sendStockAlert({
              ticker: newStock.ticker,
              companyName: newStock.companyName,
              recommendation: newStock.recommendation || "N/A",
              currentPrice: newStock.currentPrice,
              insiderPrice: newStock.insiderPrice || void 0,
              insiderQuantity: newStock.insiderQuantity || void 0,
              confidenceScore: newStock.confidenceScore || void 0
            });
            console.log(`[Telegram] \u{1F4E4} Sent notification for ${ticker}`);
          }
        } catch (error) {
          console.error("[Telegram] Error parsing message:", error);
        }
      }
      async disconnect() {
        if (this.client) {
          await this.client.disconnect();
          this.isConnected = false;
          console.log("[Telegram] Disconnected");
        }
      }
      getConnectionStatus() {
        return {
          isConnected: this.isConnected,
          hasClient: this.client !== null
        };
      }
      async startAuthentication(phoneNumber) {
        const apiId = parseInt(process.env.TELEGRAM_API_ID || "");
        const apiHash = process.env.TELEGRAM_API_HASH || "";
        if (!apiId || !apiHash) {
          throw new Error("Missing API credentials");
        }
        const session2 = new StringSession("");
        this.client = new TelegramClient(session2, apiId, apiHash, {
          connectionRetries: 5
        });
        await this.client.connect();
        const result = await this.client.sendCode(
          {
            apiId,
            apiHash
          },
          phoneNumber
        );
        return {
          phoneCodeHash: result.phoneCodeHash,
          message: "Verification code sent to your phone"
        };
      }
      async completeAuthentication(phoneNumber, phoneCode, phoneCodeHash) {
        if (!this.client) {
          throw new Error("Authentication not started");
        }
        const apiId = parseInt(process.env.TELEGRAM_API_ID || "");
        const apiHash = process.env.TELEGRAM_API_HASH || "";
        await this.client.invoke(
          new (await import("telegram/tl")).Api.auth.SignIn({
            phoneNumber,
            phoneCodeHash,
            phoneCode
          })
        );
        const sessionString = String(this.client.session.save());
        await storage.updateTelegramSession(sessionString);
        this.isConnected = true;
        const config = await storage.getTelegramConfig();
        if (config) {
          await this.setupMessageListener(config.channelUsername);
        }
        return {
          success: true,
          message: "Authentication successful"
        };
      }
    };
    telegramService = new TelegramService();
  }
});

// server/stockService.ts
function withTimeout(promise, timeoutMs, errorMessage) {
  return Promise.race([
    promise,
    new Promise(
      (_, reject) => setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    )
  ]);
}
var StockService, stockService;
var init_stockService = __esm({
  "server/stockService.ts"() {
    "use strict";
    StockService = class {
      apiKey;
      baseUrl = "https://www.alphavantage.co/query";
      cache = /* @__PURE__ */ new Map();
      cacheTimeout = 60 * 1e3;
      // 1 minute cache
      lastApiCallTime = 0;
      minDelayBetweenCalls = 800;
      // 0.8 seconds (Premium: 75 requests/minute = 1 every 0.8s)
      constructor() {
        this.apiKey = process.env.ALPHA_VANTAGE_API_KEY || "";
        if (!this.apiKey) {
          console.warn("[StockService] WARNING: ALPHA_VANTAGE_API_KEY not set. Stock data will not be available.");
          console.warn("[StockService] Get a free API key at: https://www.alphavantage.co/support/#api-key");
        } else {
          console.log("[StockService] Alpha Vantage Premium initialized (75 calls/min)");
        }
      }
      /**
       * Global rate limiter - ensures at least 0.8 seconds between ANY API calls (Premium: 75/min)
       */
      async enforceRateLimit() {
        const now = Date.now();
        const timeSinceLastCall = now - this.lastApiCallTime;
        if (timeSinceLastCall < this.minDelayBetweenCalls) {
          const waitTime = this.minDelayBetweenCalls - timeSinceLastCall;
          console.log(`[StockService] Rate limiting: waiting ${Math.ceil(waitTime / 1e3)}s before next API call...`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
        this.lastApiCallTime = Date.now();
      }
      async fetchWithCache(url, cacheKey) {
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
          console.log(`[StockService] Using cached data for ${cacheKey}`);
          return cached.data;
        }
        await this.enforceRateLimit();
        console.log(`[StockService] Fetching fresh data from API: ${cacheKey}`);
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`API request failed: ${response.statusText}`);
        }
        const data = await response.json();
        if (data["Error Message"]) {
          throw new Error(`API Error: ${data["Error Message"]}`);
        }
        if (data["Note"]) {
          console.warn("[StockService] API rate limit reached:", data["Note"]);
          throw new Error("API rate limit exceeded. Please try again later.");
        }
        this.cache.set(cacheKey, { data, timestamp: Date.now() });
        return data;
      }
      /**
       * Get real-time quote for a stock
       */
      async getQuote(ticker) {
        const url = `${this.baseUrl}?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${this.apiKey}`;
        const data = await this.fetchWithCache(url, `quote_${ticker}`);
        const quote = data["Global Quote"];
        if (!quote || !quote["05. price"]) {
          throw new Error(`No quote data found for ${ticker}`);
        }
        return {
          symbol: quote["01. symbol"],
          price: parseFloat(quote["05. price"]),
          change: parseFloat(quote["09. change"]),
          changePercent: parseFloat(quote["10. change percent"].replace("%", "")),
          volume: parseInt(quote["06. volume"]),
          previousClose: parseFloat(quote["08. previous close"])
        };
      }
      /**
       * Get daily historical prices for the last N days
       */
      async getDailyPrices(ticker, days = 7) {
        const url = `${this.baseUrl}?function=TIME_SERIES_DAILY&symbol=${ticker}&apikey=${this.apiKey}`;
        const data = await this.fetchWithCache(url, `daily_${ticker}`);
        const timeSeries = data["Time Series (Daily)"];
        if (!timeSeries) {
          throw new Error(`No daily price data found for ${ticker}`);
        }
        const prices = [];
        const dates = Object.keys(timeSeries).sort().reverse().slice(0, days);
        for (const date of dates) {
          const day = timeSeries[date];
          prices.push({
            date,
            price: parseFloat(day["4. close"]),
            open: parseFloat(day["1. open"]),
            high: parseFloat(day["2. high"]),
            low: parseFloat(day["3. low"]),
            close: parseFloat(day["4. close"]),
            volume: parseInt(day["5. volume"])
          });
        }
        return prices.reverse();
      }
      /**
       * Get 2 weeks of candlestick data for quick visual reference
       * Returns OHLCV data for the last 14 trading days
       */
      async getCandlestickData(ticker) {
        const url = `${this.baseUrl}?function=TIME_SERIES_DAILY&symbol=${ticker}&apikey=${this.apiKey}`;
        const data = await this.fetchWithCache(url, `daily_${ticker}`);
        const timeSeries = data["Time Series (Daily)"];
        if (!timeSeries) {
          throw new Error(`No daily price data found for ${ticker}`);
        }
        const prices = [];
        const dates = Object.keys(timeSeries).sort().reverse().slice(0, 14);
        for (const date of dates) {
          const day = timeSeries[date];
          prices.push({
            date,
            price: parseFloat(day["4. close"]),
            open: parseFloat(day["1. open"]),
            high: parseFloat(day["2. high"]),
            low: parseFloat(day["3. low"]),
            close: parseFloat(day["4. close"]),
            volume: parseInt(day["5. volume"])
          });
        }
        return prices.reverse();
      }
      /**
       * Get comprehensive stock data (quote + daily prices + overview)
       * Makes 3 API calls with global rate limiting (enforceRateLimit ensures 0.8s between ALL calls)
       */
      async getComprehensiveData(ticker) {
        if (!this.apiKey) {
          throw new Error("ALPHA_VANTAGE_API_KEY is not configured. Please set it in your environment variables.");
        }
        try {
          console.log(`[StockService] Fetching comprehensive data for ${ticker}...`);
          const quote = await this.getQuote(ticker);
          const dailyPrices = await this.getDailyPrices(ticker, 7);
          const overview = await this.getCompanyOverview(ticker);
          return {
            ticker: quote.symbol,
            companyName: overview.name,
            currentPrice: quote.price.toFixed(2),
            previousClose: quote.previousClose.toFixed(2),
            marketCap: overview.marketCap,
            peRatio: overview.peRatio,
            priceHistory: dailyPrices.map((p) => ({ date: p.date, price: p.price }))
          };
        } catch (error) {
          console.error(`[StockService] Error fetching comprehensive data for ${ticker}:`, error);
          throw error;
        }
      }
      /**
       * Get technical indicators for a stock (RSI, MACD, Bollinger Bands, Moving Averages, ATR)
       * Uses Alpha Vantage Premium API technical indicators endpoints
       * RESILIENT: Fetches all indicators in parallel with timeout protection and graceful fallbacks
       */
      async getTechnicalIndicators(ticker, dailyPrices) {
        console.log(`[StockService] \u{1F4CA} getTechnicalIndicators start for ${ticker} - fetching 7 indicators in parallel...`);
        const INDICATOR_TIMEOUT = 15e3;
        const currentPrice = dailyPrices[dailyPrices.length - 1]?.close || 0;
        const results = await Promise.allSettled([
          withTimeout(
            this.fetchWithCache(`${this.baseUrl}?function=RSI&symbol=${ticker}&interval=daily&time_period=14&series_type=close&apikey=${this.apiKey}`, `rsi_${ticker}`),
            INDICATOR_TIMEOUT,
            `RSI fetch timeout for ${ticker}`
          ),
          withTimeout(
            this.fetchWithCache(`${this.baseUrl}?function=MACD&symbol=${ticker}&interval=daily&series_type=close&apikey=${this.apiKey}`, `macd_${ticker}`),
            INDICATOR_TIMEOUT,
            `MACD fetch timeout for ${ticker}`
          ),
          withTimeout(
            this.fetchWithCache(`${this.baseUrl}?function=BBANDS&symbol=${ticker}&interval=daily&time_period=20&series_type=close&apikey=${this.apiKey}`, `bbands_${ticker}`),
            INDICATOR_TIMEOUT,
            `Bollinger Bands fetch timeout for ${ticker}`
          ),
          withTimeout(
            this.fetchWithCache(`${this.baseUrl}?function=SMA&symbol=${ticker}&interval=daily&time_period=20&series_type=close&apikey=${this.apiKey}`, `sma20_${ticker}`),
            INDICATOR_TIMEOUT,
            `SMA 20 fetch timeout for ${ticker}`
          ),
          withTimeout(
            this.fetchWithCache(`${this.baseUrl}?function=SMA&symbol=${ticker}&interval=daily&time_period=50&series_type=close&apikey=${this.apiKey}`, `sma50_${ticker}`),
            INDICATOR_TIMEOUT,
            `SMA 50 fetch timeout for ${ticker}`
          ),
          withTimeout(
            this.fetchWithCache(`${this.baseUrl}?function=EMA&symbol=${ticker}&interval=daily&time_period=12&series_type=close&apikey=${this.apiKey}`, `ema12_${ticker}`),
            INDICATOR_TIMEOUT,
            `EMA 12 fetch timeout for ${ticker}`
          ),
          withTimeout(
            this.fetchWithCache(`${this.baseUrl}?function=ATR&symbol=${ticker}&interval=daily&time_period=14&apikey=${this.apiKey}`, `atr_${ticker}`),
            INDICATOR_TIMEOUT,
            `ATR fetch timeout for ${ticker}`
          )
        ]);
        const [rsiResult, macdResult, bbResult, sma20Result, sma50Result, ema12Result, atrResult] = results;
        let rsiValue = 50;
        if (rsiResult.status === "fulfilled") {
          try {
            rsiValue = parseFloat(Object.values(rsiResult.value["Technical Analysis: RSI"] || {})[0]?.["RSI"] || "50");
            console.log(`[StockService] \u2705 RSI: ${rsiValue}`);
          } catch (e) {
            console.warn(`[StockService] \u26A0\uFE0F  RSI parse error, using default`);
          }
        } else {
          console.warn(`[StockService] \u26A0\uFE0F  RSI failed: ${rsiResult.reason.message}`);
        }
        let macdValue = 0, macdSignal = 0, macdHist = 0;
        if (macdResult.status === "fulfilled") {
          try {
            const latestMacd = Object.values(macdResult.value["Technical Analysis: MACD"] || {})[0];
            macdValue = parseFloat(latestMacd?.["MACD"] || "0");
            macdSignal = parseFloat(latestMacd?.["MACD_Signal"] || "0");
            macdHist = parseFloat(latestMacd?.["MACD_Hist"] || "0");
            console.log(`[StockService] \u2705 MACD fetched`);
          } catch (e) {
            console.warn(`[StockService] \u26A0\uFE0F  MACD parse error, using defaults`);
          }
        } else {
          console.warn(`[StockService] \u26A0\uFE0F  MACD failed: ${macdResult.reason.message}`);
        }
        let upperBand = currentPrice, middleBand = currentPrice, lowerBand = currentPrice;
        if (bbResult.status === "fulfilled") {
          try {
            const latestBB = Object.values(bbResult.value["Technical Analysis: BBANDS"] || {})[0];
            upperBand = parseFloat(latestBB?.["Real Upper Band"] || currentPrice);
            middleBand = parseFloat(latestBB?.["Real Middle Band"] || currentPrice);
            lowerBand = parseFloat(latestBB?.["Real Lower Band"] || currentPrice);
            console.log(`[StockService] \u2705 Bollinger Bands fetched`);
          } catch (e) {
            console.warn(`[StockService] \u26A0\uFE0F  Bollinger Bands parse error, using current price`);
          }
        } else {
          console.warn(`[StockService] \u26A0\uFE0F  Bollinger Bands failed: ${bbResult.reason.message}`);
        }
        const sma20 = sma20Result.status === "fulfilled" ? parseFloat(Object.values(sma20Result.value["Technical Analysis: SMA"] || {})[0]?.["SMA"] || "0") : 0;
        const sma50 = sma50Result.status === "fulfilled" ? parseFloat(Object.values(sma50Result.value["Technical Analysis: SMA"] || {})[0]?.["SMA"] || "0") : 0;
        const ema12 = ema12Result.status === "fulfilled" ? parseFloat(Object.values(ema12Result.value["Technical Analysis: EMA"] || {})[0]?.["EMA"] || "0") : 0;
        const atr = atrResult.status === "fulfilled" ? parseFloat(Object.values(atrResult.value["Technical Analysis: ATR"] || {})[0]?.["ATR"] || "0") : 0;
        if (sma20Result.status === "fulfilled") console.log(`[StockService] \u2705 SMA 20 fetched`);
        else console.warn(`[StockService] \u26A0\uFE0F  SMA 20 failed: ${sma20Result.reason.message}`);
        if (sma50Result.status === "fulfilled") console.log(`[StockService] \u2705 SMA 50 fetched`);
        else console.warn(`[StockService] \u26A0\uFE0F  SMA 50 failed: ${sma50Result.reason.message}`);
        if (ema12Result.status === "fulfilled") console.log(`[StockService] \u2705 EMA 12 fetched`);
        else console.warn(`[StockService] \u26A0\uFE0F  EMA 12 failed: ${ema12Result.reason.message}`);
        if (atrResult.status === "fulfilled") console.log(`[StockService] \u2705 ATR fetched`);
        else console.warn(`[StockService] \u26A0\uFE0F  ATR failed: ${atrResult.reason.message}`);
        let bbPosition = "inside";
        if (currentPrice > upperBand) bbPosition = "above";
        else if (currentPrice < lowerBand) bbPosition = "below";
        const recentVolumes = dailyPrices.slice(-10).map((p) => p.volume);
        const avgRecentVolume = recentVolumes.length > 0 ? recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length : 0;
        const lastVolume = dailyPrices[dailyPrices.length - 1]?.volume || 0;
        let volumeTrend = "stable";
        if (avgRecentVolume > 0) {
          if (lastVolume > avgRecentVolume * 1.2) volumeTrend = "increasing";
          else if (lastVolume < avgRecentVolume * 0.8) volumeTrend = "decreasing";
        }
        const successCount = results.filter((r) => r.status === "fulfilled").length;
        console.log(`[StockService] \u2705 getTechnicalIndicators complete for ${ticker}: ${successCount}/7 indicators fetched successfully`);
        return {
          rsi: {
            value: rsiValue,
            signal: rsiValue > 70 ? "overbought" : rsiValue < 30 ? "oversold" : "neutral"
          },
          macd: {
            value: macdValue,
            signal: macdSignal,
            histogram: macdHist,
            trend: macdHist > 0 ? "bullish" : macdHist < 0 ? "bearish" : "neutral"
          },
          bollingerBands: {
            upper: upperBand,
            middle: middleBand,
            lower: lowerBand,
            position: bbPosition
          },
          sma20,
          sma50,
          ema12,
          volumeTrend,
          atr
        };
      }
      /**
       * Get news sentiment for a stock from Alpha Vantage News Sentiment API
       * Analyzes last 2 weeks of news with AI-powered sentiment scoring
       */
      async getNewsSentiment(ticker) {
        try {
          const twoWeeksAgo = /* @__PURE__ */ new Date();
          twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
          const timeFrom = twoWeeksAgo.toISOString().split("T")[0].replace(/-/g, "") + "T0000";
          const url = `${this.baseUrl}?function=NEWS_SENTIMENT&tickers=${ticker}&time_from=${timeFrom}&limit=50&apikey=${this.apiKey}`;
          const data = await this.fetchWithCache(url, `news_sentiment_${ticker}`);
          const feed = data.feed || [];
          const articles = feed.map((article) => {
            const tickerSentiment = article.ticker_sentiment?.find(
              (ts) => ts.ticker === ticker
            ) || {};
            return {
              title: article.title || "",
              source: article.source || "",
              url: article.url || "",
              publishedAt: article.time_published || "",
              sentiment: parseFloat(tickerSentiment.ticker_sentiment_score || article.overall_sentiment_score || "0"),
              relevanceScore: parseFloat(tickerSentiment.relevance_score || "0"),
              topics: article.topics?.map((t) => t.topic) || []
            };
          });
          const sentiments = articles.map((a) => a.sentiment).filter((s) => !isNaN(s));
          const aggregateSentiment = sentiments.length > 0 ? sentiments.reduce((a, b) => a + b, 0) / sentiments.length : 0;
          const recentArticles = articles.slice(0, Math.floor(articles.length / 2));
          const olderArticles = articles.slice(Math.floor(articles.length / 2));
          const recentSentiment = recentArticles.length > 0 ? recentArticles.map((a) => a.sentiment).reduce((a, b) => a + b, 0) / recentArticles.length : 0;
          const olderSentiment = olderArticles.length > 0 ? olderArticles.map((a) => a.sentiment).reduce((a, b) => a + b, 0) / olderArticles.length : 0;
          let sentimentTrend = "stable";
          if (recentSentiment > olderSentiment + 0.1) sentimentTrend = "improving";
          else if (recentSentiment < olderSentiment - 0.1) sentimentTrend = "declining";
          return {
            articles,
            aggregateSentiment,
            sentimentTrend,
            newsVolume: articles.length
          };
        } catch (error) {
          console.error(`[StockService] Error fetching news sentiment for ${ticker}:`, error);
          return {
            articles: [],
            aggregateSentiment: 0,
            sentimentTrend: "stable",
            newsVolume: 0
          };
        }
      }
      /**
       * Analyze correlation between price movements and news sentiment
       * Determines if stock price leads, lags, or moves concurrently with news
       */
      analyzePriceNewsCorrelation(dailyPrices, newsSentiment) {
        try {
          if (dailyPrices.length < 5 || newsSentiment.articles.length < 3) {
            return {
              correlation: 0,
              lag: "concurrent",
              strength: "weak"
            };
          }
          const dailySentiment = /* @__PURE__ */ new Map();
          newsSentiment.articles.forEach((article) => {
            const date = article.publishedAt.substring(0, 8);
            const dateKey = `${date.substring(0, 4)}-${date.substring(4, 6)}-${date.substring(6, 8)}`;
            if (!dailySentiment.has(dateKey)) {
              dailySentiment.set(dateKey, []);
            }
            dailySentiment.get(dateKey).push(article.sentiment);
          });
          const priceChanges = dailyPrices.slice(1).map((day, i) => ({
            date: day.date,
            change: (day.close - dailyPrices[i].close) / dailyPrices[i].close * 100
          }));
          const matchedData = [];
          priceChanges.forEach((pc) => {
            const sentiments = dailySentiment.get(pc.date);
            if (sentiments && sentiments.length > 0) {
              const avgSentiment = sentiments.reduce((a, b) => a + b, 0) / sentiments.length;
              matchedData.push({
                priceChange: pc.change,
                sentiment: avgSentiment
              });
            }
          });
          if (matchedData.length < 3) {
            return {
              correlation: 0,
              lag: "concurrent",
              strength: "weak"
            };
          }
          const n = matchedData.length;
          const sumX = matchedData.reduce((sum, d) => sum + d.priceChange, 0);
          const sumY = matchedData.reduce((sum, d) => sum + d.sentiment, 0);
          const sumXY = matchedData.reduce((sum, d) => sum + d.priceChange * d.sentiment, 0);
          const sumX2 = matchedData.reduce((sum, d) => sum + d.priceChange ** 2, 0);
          const sumY2 = matchedData.reduce((sum, d) => sum + d.sentiment ** 2, 0);
          const correlation = (n * sumXY - sumX * sumY) / Math.sqrt((n * sumX2 - sumX ** 2) * (n * sumY2 - sumY ** 2));
          const absCorr = Math.abs(correlation);
          const strength = absCorr > 0.7 ? "strong" : absCorr > 0.4 ? "moderate" : "weak";
          const lag = absCorr > 0.4 ? "concurrent" : "concurrent";
          return {
            correlation: isNaN(correlation) ? 0 : correlation,
            lag,
            strength
          };
        } catch (error) {
          console.error(`[StockService] Error analyzing price-news correlation:`, error);
          return {
            correlation: 0,
            lag: "concurrent",
            strength: "weak"
          };
        }
      }
      /**
       * Get company fundamental overview from Alpha Vantage
       * Includes P/E ratio, market cap, dividend yield, profitability metrics, etc.
       */
      async getCompanyOverview(symbol) {
        try {
          const url = `${this.baseUrl}?function=OVERVIEW&symbol=${symbol}&apikey=${this.apiKey}`;
          const cacheKey = `overview_${symbol}`;
          const data = await this.fetchWithCache(url, cacheKey);
          if (!data.Symbol) {
            console.log(`[StockService] No overview data available for ${symbol}`);
            return null;
          }
          return {
            marketCap: data.MarketCapitalization || null,
            peRatio: parseFloat(data.PERatio) || null,
            pegRatio: parseFloat(data.PEGRatio) || null,
            bookValue: parseFloat(data.BookValue) || null,
            dividendYield: parseFloat(data.DividendYield) || null,
            eps: parseFloat(data.EPS) || null,
            revenuePerShare: parseFloat(data.RevenuePerShareTTM) || null,
            profitMargin: parseFloat(data.ProfitMargin) || null,
            operatingMargin: parseFloat(data.OperatingMarginTTM) || null,
            returnOnAssets: parseFloat(data.ReturnOnAssetsTTM) || null,
            returnOnEquity: parseFloat(data.ReturnOnEquityTTM) || null,
            debtToEquity: parseFloat(data.DebtToEquityRatio) || null,
            currentRatio: parseFloat(data.CurrentRatio) || null,
            quickRatio: parseFloat(data.QuickRatio) || null,
            revenueGrowthYoY: data.QuarterlyRevenueGrowthYOY ? parseFloat(data.QuarterlyRevenueGrowthYOY) * 100 : null,
            epsGrowthYoY: data.QuarterlyEarningsGrowthYOY ? parseFloat(data.QuarterlyEarningsGrowthYOY) * 100 : null
          };
        } catch (error) {
          console.error(`[StockService] Error fetching company overview for ${symbol}:`, error);
          return null;
        }
      }
      /**
       * Get income statement (quarterly) from Alpha Vantage
       * Returns latest quarter's revenue, profits, etc.
       */
      async getIncomeStatement(symbol) {
        try {
          const url = `${this.baseUrl}?function=INCOME_STATEMENT&symbol=${symbol}&apikey=${this.apiKey}`;
          const cacheKey = `income_${symbol}`;
          const data = await this.fetchWithCache(url, cacheKey);
          if (!data.quarterlyReports || data.quarterlyReports.length === 0) {
            console.log(`[StockService] No income statement data available for ${symbol}`);
            return null;
          }
          const latest = data.quarterlyReports[0];
          return {
            totalRevenue: latest.totalRevenue || null,
            grossProfit: latest.grossProfit || null,
            operatingIncome: latest.operatingIncome || null,
            netIncome: latest.netIncome || null,
            ebitda: latest.ebitda || null
          };
        } catch (error) {
          console.error(`[StockService] Error fetching income statement for ${symbol}:`, error);
          return null;
        }
      }
      /**
       * Get balance sheet (quarterly) from Alpha Vantage
       * Returns latest quarter's assets, liabilities, equity
       */
      async getBalanceSheet(symbol) {
        try {
          const url = `${this.baseUrl}?function=BALANCE_SHEET&symbol=${symbol}&apikey=${this.apiKey}`;
          const cacheKey = `balance_${symbol}`;
          const data = await this.fetchWithCache(url, cacheKey);
          if (!data.quarterlyReports || data.quarterlyReports.length === 0) {
            console.log(`[StockService] No balance sheet data available for ${symbol}`);
            return null;
          }
          const latest = data.quarterlyReports[0];
          const shortTermDebt = parseFloat(latest.shortTermDebt || "0");
          const longTermDebt = parseFloat(latest.longTermDebt || "0");
          const totalDebt = shortTermDebt + longTermDebt;
          return {
            totalAssets: latest.totalAssets || null,
            totalLiabilities: latest.totalLiabilities || null,
            totalShareholderEquity: latest.totalShareholderEquity || null,
            shortTermDebt: latest.shortTermDebt || null,
            longTermDebt: latest.longTermDebt || null,
            totalDebt: totalDebt > 0 ? totalDebt : null
          };
        } catch (error) {
          console.error(`[StockService] Error fetching balance sheet for ${symbol}:`, error);
          return null;
        }
      }
      /**
       * Get cash flow statement (quarterly) from Alpha Vantage
       * Returns latest quarter's cash flows
       */
      async getCashFlow(symbol) {
        try {
          const url = `${this.baseUrl}?function=CASH_FLOW&symbol=${symbol}&apikey=${this.apiKey}`;
          const cacheKey = `cashflow_${symbol}`;
          const data = await this.fetchWithCache(url, cacheKey);
          if (!data.quarterlyReports || data.quarterlyReports.length === 0) {
            console.log(`[StockService] No cash flow data available for ${symbol}`);
            return null;
          }
          const latest = data.quarterlyReports[0];
          const operatingCashflow = parseFloat(latest.operatingCashflow || "0");
          const capex = parseFloat(latest.capitalExpenditures || "0");
          const freeCashFlow = operatingCashflow - Math.abs(capex);
          return {
            operatingCashflow: latest.operatingCashflow || null,
            capitalExpenditures: latest.capitalExpenditures || null,
            freeCashFlow: freeCashFlow.toString()
          };
        } catch (error) {
          console.error(`[StockService] Error fetching cash flow for ${symbol}:`, error);
          return null;
        }
      }
      /**
       * Get comprehensive fundamental data combining all sources
       */
      async getComprehensiveFundamentals(symbol) {
        try {
          console.log(`[StockService] Fetching comprehensive fundamental data for ${symbol}...`);
          const overview = await this.getCompanyOverview(symbol);
          const income = await this.getIncomeStatement(symbol);
          const balance = await this.getBalanceSheet(symbol);
          const cashflow = await this.getCashFlow(symbol);
          return {
            ...overview,
            ...income,
            ...balance,
            ...cashflow
          };
        } catch (error) {
          console.error(`[StockService] Error fetching comprehensive fundamentals for ${symbol}:`, error);
          return null;
        }
      }
    };
    stockService = new StockService();
  }
});

// server/finnhubService.ts
var AlphaVantageStockService, finnhubService;
var init_finnhubService = __esm({
  "server/finnhubService.ts"() {
    "use strict";
    AlphaVantageStockService = class {
      apiKey;
      baseUrl = "https://www.alphavantage.co/query";
      cache = /* @__PURE__ */ new Map();
      cacheTimeout = 60 * 1e3;
      // 1 minute cache
      lastApiCallTime = 0;
      minDelayBetweenCalls = 800;
      // 0.8 seconds (Pro: 75 requests/minute)
      constructor() {
        this.apiKey = process.env.ALPHA_VANTAGE_API_KEY || "";
        if (!this.apiKey) {
          console.warn("[AlphaVantage] WARNING: ALPHA_VANTAGE_API_KEY not set. Stock data will not be available.");
        } else {
          console.log("[AlphaVantage] Stock service initialized (Pro license: 75 calls/min)");
        }
      }
      /**
       * Rate limiter - ensures at least 0.8 seconds between API calls (Pro: 75/min)
       */
      async enforceRateLimit() {
        const now = Date.now();
        const timeSinceLastCall = now - this.lastApiCallTime;
        if (timeSinceLastCall < this.minDelayBetweenCalls) {
          const waitTime = this.minDelayBetweenCalls - timeSinceLastCall;
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
        this.lastApiCallTime = Date.now();
      }
      /**
       * Fetch with caching and rate limiting
       */
      async fetchWithCache(url, cacheKey) {
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
          return cached.data;
        }
        await this.enforceRateLimit();
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Alpha Vantage API request failed: ${response.statusText}`);
        }
        const data = await response.json();
        if (data["Error Message"]) {
          throw new Error(`Alpha Vantage API Error: ${data["Error Message"]}`);
        }
        if (data["Note"]) {
          console.warn("[AlphaVantage] API rate limit warning:", data["Note"]);
          throw new Error("API rate limit exceeded. Please try again later.");
        }
        this.cache.set(cacheKey, { data, timestamp: Date.now() });
        return data;
      }
      /**
       * Get real-time quote for a stock
       */
      async getQuote(ticker) {
        if (!this.apiKey) {
          throw new Error("ALPHA_VANTAGE_API_KEY is not configured");
        }
        const url = `${this.baseUrl}?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${this.apiKey}`;
        try {
          const data = await this.fetchWithCache(url, `quote_${ticker}`);
          const quote = data["Global Quote"];
          if (!quote || !quote["05. price"]) {
            throw new Error(`No quote data found for ${ticker}`);
          }
          return {
            symbol: ticker,
            currentPrice: parseFloat(quote["05. price"]),
            previousClose: parseFloat(quote["08. previous close"]),
            change: parseFloat(quote["09. change"]),
            changePercent: parseFloat(quote["10. change percent"].replace("%", "")),
            high: parseFloat(quote["03. high"]),
            low: parseFloat(quote["04. low"]),
            open: parseFloat(quote["02. open"])
          };
        } catch (error) {
          console.error(`[AlphaVantage] Error fetching quote for ${ticker}:`, error);
          throw error;
        }
      }
      /**
       * Get company profile including market cap and company info
       */
      async getCompanyProfile(ticker) {
        if (!this.apiKey) {
          throw new Error("ALPHA_VANTAGE_API_KEY is not configured");
        }
        const url = `${this.baseUrl}?function=OVERVIEW&symbol=${ticker}&apikey=${this.apiKey}`;
        try {
          const data = await this.fetchWithCache(url, `profile_${ticker}`);
          if (!data || Object.keys(data).length === 0 || data["Error Message"]) {
            return null;
          }
          return {
            name: data.Name,
            marketCap: data.MarketCapitalization ? parseFloat(data.MarketCapitalization) : void 0,
            description: data.Description,
            industry: data.Industry,
            sector: data.Sector,
            country: data.Country,
            webUrl: data.Website || void 0,
            ipo: data.IPODate || void 0,
            peRatio: data.PERatio ? parseFloat(data.PERatio) : void 0
          };
        } catch (error) {
          console.error(`[AlphaVantage] Error fetching company profile for ${ticker}:`, error);
          return null;
        }
      }
      /**
       * Get company news with sentiment
       */
      async getCompanyNews(ticker) {
        if (!this.apiKey) {
          throw new Error("ALPHA_VANTAGE_API_KEY is not configured");
        }
        const url = `${this.baseUrl}?function=NEWS_SENTIMENT&tickers=${ticker}&limit=10&apikey=${this.apiKey}`;
        try {
          const data = await this.fetchWithCache(url, `news_${ticker}`);
          if (!data.feed || !Array.isArray(data.feed)) {
            return [];
          }
          return data.feed.slice(0, 5).map((article) => {
            const tickerSentiment = article.ticker_sentiment?.find(
              (ts) => ts.ticker.toUpperCase() === ticker.toUpperCase()
            );
            return {
              headline: article.title,
              summary: article.summary,
              source: article.source,
              url: article.url,
              datetime: new Date(article.time_published).getTime() / 1e3,
              image: article.banner_image || void 0,
              sentiment: tickerSentiment ? parseFloat(tickerSentiment.ticker_sentiment_score) : void 0
            };
          });
        } catch (error) {
          console.error(`[AlphaVantage] Error fetching news for ${ticker}:`, error);
          return [];
        }
      }
      /**
       * Get insider sentiment (not directly available in Alpha Vantage)
       * Returns null - insider data comes from OpenInsider instead
       */
      async getInsiderSentiment(ticker) {
        console.log(`[AlphaVantage] Insider sentiment not available via Alpha Vantage for ${ticker} (use OpenInsider)`);
        return null;
      }
      /**
       * Get historical closing price for a specific date
       * @param ticker Stock symbol
       * @param dateString Date in DD.MM.YYYY or DD.MM.YYYY HH:MM format
       */
      async getHistoricalPrice(ticker, dateString) {
        if (!this.apiKey) {
          console.log("[AlphaVantage] API key not configured, skipping historical price fetch");
          return null;
        }
        try {
          const datePart = dateString.split(" ")[0];
          const [day, month, year] = datePart.split(".").map(Number);
          const targetDate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const url = `${this.baseUrl}?function=TIME_SERIES_DAILY&symbol=${ticker}&apikey=${this.apiKey}`;
          const data = await this.fetchWithCache(url, `daily_${ticker}`);
          const timeSeries = data["Time Series (Daily)"];
          if (!timeSeries) {
            console.log(`[AlphaVantage] No time series data for ${ticker}`);
            return null;
          }
          if (timeSeries[targetDate]) {
            const closingPrice = parseFloat(timeSeries[targetDate]["4. close"]);
            console.log(`[AlphaVantage] Historical price for ${ticker} on ${dateString}: $${closingPrice.toFixed(2)}`);
            return closingPrice;
          }
          const targetDateObj = new Date(targetDate);
          const sortedDates = Object.keys(timeSeries).sort().reverse();
          for (const date of sortedDates) {
            const dateObj = new Date(date);
            if (dateObj <= targetDateObj) {
              const closingPrice = parseFloat(timeSeries[date]["4. close"]);
              console.log(`[AlphaVantage] Historical price for ${ticker} on ${dateString}: $${closingPrice.toFixed(2)} (from ${date})`);
              return closingPrice;
            }
          }
          console.log(`[AlphaVantage] No historical data found for ${ticker} on or before ${dateString}`);
          return null;
        } catch (error) {
          console.error(`[AlphaVantage] Error fetching historical price for ${ticker} on ${dateString}:`, error);
          return null;
        }
      }
      /**
       * Get historical daily candles using Alpha Vantage
       * @param ticker Stock symbol
       * @param fromDate Start date (YYYY-MM-DD or Date object)
       * @param toDate End date (YYYY-MM-DD or Date object)
       * @returns Array of daily prices with date and close price
       */
      async getHistoricalCandlesAlphaVantage(ticker, fromDate, toDate) {
        return this.getHistoricalCandles(ticker, fromDate, toDate);
      }
      /**
       * Get historical daily candles (OHLCV) for a stock
       * @param ticker Stock symbol
       * @param fromDate Start date (YYYY-MM-DD or Date object)
       * @param toDate End date (YYYY-MM-DD or Date object)
       * @returns Array of daily prices with date and close price
       */
      async getHistoricalCandles(ticker, fromDate, toDate) {
        if (!this.apiKey) {
          throw new Error("ALPHA_VANTAGE_API_KEY is not configured");
        }
        try {
          const fromDateObj = fromDate instanceof Date ? fromDate : new Date(fromDate);
          const toDateObj = toDate instanceof Date ? toDate : new Date(toDate);
          const url = `${this.baseUrl}?function=TIME_SERIES_DAILY&symbol=${ticker}&apikey=${this.apiKey}&outputsize=full`;
          const data = await this.fetchWithCache(url, `candles_${ticker}_full`);
          const timeSeries = data["Time Series (Daily)"];
          if (!timeSeries) {
            throw new Error(`No time series data for ${ticker}`);
          }
          const prices = [];
          const sortedDates = Object.keys(timeSeries).sort();
          for (const date of sortedDates) {
            const dateObj = new Date(date);
            if (dateObj >= fromDateObj && dateObj <= toDateObj) {
              prices.push({
                date,
                close: parseFloat(timeSeries[date]["4. close"])
              });
            }
          }
          if (prices.length === 0) {
            throw new Error(`No historical data available for ${ticker} in date range`);
          }
          console.log(`[AlphaVantage] Fetched ${prices.length} historical prices for ${ticker} from ${prices[0]?.date} to ${prices[prices.length - 1]?.date}`);
          return prices;
        } catch (error) {
          console.error(`[AlphaVantage] Error fetching historical candles for ${ticker}:`, error.message);
          throw error;
        }
      }
      /**
       * Get quotes for multiple stocks (batch)
       */
      async getBatchQuotes(tickers) {
        const quotes = /* @__PURE__ */ new Map();
        for (const ticker of tickers) {
          try {
            const quote = await this.getQuote(ticker);
            quotes.set(ticker, quote);
          } catch (error) {
            console.error(`[AlphaVantage] Failed to fetch quote for ${ticker}, skipping`);
          }
        }
        return quotes;
      }
      /**
       * Get quotes, market cap, company info, and news for multiple stocks (batch)
       */
      async getBatchStockData(tickers) {
        const stockData = /* @__PURE__ */ new Map();
        for (const ticker of tickers) {
          try {
            const quote = await this.getQuote(ticker);
            const companyInfo = await this.getCompanyProfile(ticker);
            const news = await this.getCompanyNews(ticker);
            stockData.set(ticker, {
              quote,
              marketCap: companyInfo?.marketCap,
              companyInfo: companyInfo || void 0,
              news,
              insiderSentiment: void 0
              // Sourced from OpenInsider
            });
          } catch (error) {
            console.error(`[AlphaVantage] Failed to fetch data for ${ticker}, skipping`);
          }
        }
        return stockData;
      }
    };
    finnhubService = new AlphaVantageStockService();
  }
});

// server/openinsiderService.ts
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import { fileURLToPath } from "url";
import { createHash } from "crypto";
import { existsSync } from "fs";
var execFileAsync, __filename, __dirname, OpenInsiderService, openinsiderService;
var init_openinsiderService = __esm({
  "server/openinsiderService.ts"() {
    "use strict";
    init_finnhubService();
    execFileAsync = promisify(execFile);
    __filename = fileURLToPath(import.meta.url);
    __dirname = path.dirname(__filename);
    OpenInsiderService = class {
      pythonScriptPath;
      priceCache = /* @__PURE__ */ new Map();
      CACHE_TTL_MS = 1e3 * 60 * 60;
      // 1 hour cache
      lastFinnhubCall = 0;
      MIN_CALL_INTERVAL_MS = 1200;
      // ~50 calls/minute to stay under 60/min limit
      constructor() {
        const possiblePaths = [
          path.join(__dirname, "openinsider_scraper.py"),
          path.join(process.cwd(), "server", "openinsider_scraper.py"),
          path.join(process.cwd(), "openinsider_scraper.py")
        ];
        const foundPath = possiblePaths.find((p) => existsSync(p));
        if (!foundPath) {
          console.error("[OpenInsider] Could not find openinsider_scraper.py in any of these locations:", possiblePaths);
          this.pythonScriptPath = possiblePaths[0];
        } else {
          this.pythonScriptPath = foundPath;
          console.log(`[OpenInsider] Using Python script at: ${this.pythonScriptPath}`);
        }
      }
      /**
       * Fetch insider purchase transactions from OpenInsider.com
       * @param limit Number of transactions to fetch (default: 100)
       * @param filters Optional filters for transactions
       * @param tradeType "P" for purchases or "S" for sales (default: "P")
       * @returns Scraper response with transactions and filtering statistics
       */
      async fetchInsiderPurchases(limit = 100, filters, tradeType = "P") {
        try {
          const normalizedTradeType = (tradeType || "P").toString().toUpperCase();
          if (normalizedTradeType !== "P" && normalizedTradeType !== "S") {
            throw new Error(`Invalid tradeType: ${tradeType}. Must be "P" (purchase) or "S" (sale)`);
          }
          const safeTradeType = normalizedTradeType;
          const numericLimit = Number.isFinite(limit) ? limit : 100;
          const safeLimit = Math.max(1, Math.min(Math.floor(numericLimit), 500));
          const transactionTypeLabel = safeTradeType === "S" ? "sale" : "purchase";
          const filterInfo = filters ? ` with filters: ${JSON.stringify(filters)}` : "";
          console.log(`[OpenInsider] Fetching ${safeLimit} insider ${transactionTypeLabel} transactions${filterInfo}...`);
          const args = [this.pythonScriptPath, safeLimit.toString()];
          if (filters && (filters.insiderTitles || filters.minTransactionValue || filters.previousDayOnly || filters.insider_name || filters.ticker)) {
            const pythonFilters = {};
            if (filters.insiderTitles) pythonFilters.insiderTitles = filters.insiderTitles;
            if (filters.minTransactionValue) pythonFilters.minTransactionValue = filters.minTransactionValue;
            if (filters.previousDayOnly) pythonFilters.previousDayOnly = filters.previousDayOnly;
            if (filters.insider_name) pythonFilters.insiderName = filters.insider_name;
            if (filters.ticker) pythonFilters.ticker = filters.ticker;
            args.push(JSON.stringify(pythonFilters));
          } else {
            args.push("{}");
          }
          args.push(safeTradeType);
          const { stdout, stderr } = await execFileAsync(
            "python3",
            args,
            {
              timeout: 6e4,
              // 60 second timeout
              maxBuffer: 10 * 1024 * 1024
              // 10MB buffer
            }
          );
          if (stderr) {
            console.error("[OpenInsider] Python stderr:", stderr);
          }
          if (!stdout || stdout.trim() === "") {
            console.error("[OpenInsider] No data returned from Python script");
            return {
              transactions: [],
              stats: {
                total_rows_scraped: 0,
                filtered_not_purchase: 0,
                filtered_invalid_data: 0,
                filtered_by_date: 0,
                filtered_by_title: 0,
                filtered_by_transaction_value: 0,
                filtered_by_insider_name: 0
              }
            };
          }
          const response = JSON.parse(stdout);
          console.log(`[OpenInsider] Successfully fetched ${response.transactions.length} transactions`);
          console.log(`[OpenInsider] Stage 1 Filter Stats:`, response.stats);
          return response;
        } catch (error) {
          console.error("[OpenInsider] Error fetching data:", error.message);
          if (error.stdout) {
            console.error("[OpenInsider] Python stdout:", error.stdout);
          }
          if (error.stderr) {
            console.error("[OpenInsider] Python stderr:", error.stderr);
          }
          throw new Error(`Failed to fetch OpenInsider data: ${error.message}`);
        }
      }
      /**
       * Convert OpenInsider transaction to message format compatible with backtest service
       * @param transaction OpenInsider transaction
       * @returns Message object similar to Telegram message format
       */
      transactionToMessage(transaction) {
        const messageText = `$${transaction.ticker} - ${transaction.recommendation.toUpperCase()} @ $${transaction.price.toFixed(2)} (Insider: ${transaction.insiderName}, Date: ${transaction.tradeDate}, Qty: ${transaction.quantity.toLocaleString()})`;
        const filingDate = this.parseDate(transaction.filingDate);
        const timestamp2 = Math.floor(filingDate.getTime() / 1e3);
        const idInput = `${transaction.ticker}|${transaction.filingDate}|${transaction.insiderName}|${transaction.quantity}|${transaction.price}`;
        const hash = createHash("sha256").update(idInput).digest("hex").substring(0, 16);
        const uniqueId = `openinsider_${hash}`;
        return {
          id: uniqueId,
          date: timestamp2,
          text: messageText,
          senderId: "openinsider",
          views: 0,
          forwards: 0,
          entities: [],
          // Additional metadata
          _source: "openinsider",
          _transaction: transaction
        };
      }
      /**
       * Parse date string from OpenInsider (format: YYYY-MM-DD)
       * @param dateStr Date string
       * @returns Date object
       */
      parseDate(dateStr) {
        const parts = dateStr.split("-");
        if (parts.length === 3) {
          const [year, month, day] = parts.map((p) => parseInt(p, 10));
          return new Date(year, month - 1, day);
        }
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          return date;
        }
        console.warn(`[OpenInsider] Could not parse date: ${dateStr}, using current date`);
        return /* @__PURE__ */ new Date();
      }
      /**
       * Fetch insider purchases and convert to message format for backtest
       * @param limit Number of transactions to fetch
       * @param filters Optional filters to apply
       * @returns Array of messages compatible with backtest service
       */
      async fetchMessagesForBacktest(limit, filters) {
        const scraperResponse = await this.fetchInsiderPurchases(limit, filters);
        return scraperResponse.transactions.map((t) => this.transactionToMessage(t));
      }
      /**
       * Fetch insider SALES transactions from OpenInsider.com
       * Thin wrapper around fetchInsiderPurchases with tradeType="S"
       * @param limit Number of transactions to fetch (default: 100)
       * @param filters Optional filters for transactions
       * @returns Scraper response with sale transactions and filtering statistics
       */
      async fetchInsiderSales(limit = 100, filters) {
        return this.fetchInsiderPurchases(limit, filters, "S");
      }
      /**
       * Calculate trade scores by fetching price 2 weeks after trade date
       * @param transactions Array of insider transactions
       * @returns Transactions with score data added
       */
      async calculateTradeScores(transactions) {
        console.log(`[OpenInsider] Calculating scores for ${transactions.length} trades...`);
        const scoredTransactions = await Promise.all(
          transactions.map(async (transaction) => {
            try {
              const tradeDate = new Date(transaction.tradeDate);
              const twoWeeksLater = new Date(tradeDate);
              twoWeeksLater.setDate(twoWeeksLater.getDate() + 14);
              const now = /* @__PURE__ */ new Date();
              if (twoWeeksLater > now) {
                return transaction;
              }
              const twoWeeksLaterPrice = await this.getPriceOnDate(
                transaction.ticker,
                twoWeeksLater
              );
              if (!twoWeeksLaterPrice) {
                console.log(`[OpenInsider] Could not fetch price for ${transaction.ticker} on ${twoWeeksLater.toISOString().split("T")[0]}`);
                return transaction;
              }
              const priceChange = (twoWeeksLaterPrice - transaction.price) / transaction.price * 100;
              const pnl = (twoWeeksLaterPrice - transaction.price) * transaction.quantity;
              const isProfitable = priceChange > 0;
              return {
                ...transaction,
                twoWeekPriceChange: priceChange,
                twoWeekPnL: pnl,
                isProfitable
              };
            } catch (error) {
              console.error(`[OpenInsider] Error calculating score for ${transaction.ticker}:`, error);
              return transaction;
            }
          })
        );
        const scoredCount = scoredTransactions.filter((t) => t.twoWeekPriceChange !== void 0).length;
        console.log(`[OpenInsider] Successfully scored ${scoredCount}/${transactions.length} trades`);
        return scoredTransactions;
      }
      /**
       * Get stock price on a specific date with caching and rate limiting
       * Uses Alpha Vantage for historical data
       */
      async getPriceOnDate(ticker, date) {
        const dateStr = date.toISOString().split("T")[0];
        const cacheKey = `${ticker}:${dateStr}`;
        const cached = this.priceCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
          return cached.price;
        }
        try {
          const now = Date.now();
          const timeSinceLastCall = now - this.lastFinnhubCall;
          if (timeSinceLastCall < this.MIN_CALL_INTERVAL_MS) {
            await new Promise(
              (resolve) => setTimeout(resolve, this.MIN_CALL_INTERVAL_MS - timeSinceLastCall)
            );
          }
          this.lastFinnhubCall = Date.now();
          const [year, month, day] = dateStr.split("-");
          const alphaVantageDateStr = `${day}.${month}.${year}`;
          const price = await finnhubService.getHistoricalPrice(ticker, alphaVantageDateStr);
          if (price !== null) {
            this.priceCache.set(cacheKey, { price, timestamp: Date.now() });
            return price;
          }
          return null;
        } catch (error) {
          console.error(`[OpenInsider] Error fetching price for ${ticker} on ${date}:`, error);
          return null;
        }
      }
      /**
       * Calculate aggregate score for an insider based on their trades
       * @param transactions Array of transactions by the same insider
       * @returns Insider score summary with partial data indicators
       */
      calculateInsiderScore(transactions) {
        if (transactions.length === 0) {
          return {
            insiderName: "",
            totalTrades: 0,
            scoredTrades: 0,
            profitableTrades: 0,
            successRate: 0,
            averageGain: 0,
            totalPnL: 0,
            isPartialData: false,
            unscoredCount: 0
          };
        }
        const insiderName = transactions[0].insiderName;
        const scoredTrades = transactions.filter(
          (t) => t.tradeType.startsWith("P") && // Only purchases
          t.twoWeekPriceChange !== void 0 && t.twoWeekPnL !== void 0
        );
        const purchaseTrades = transactions.filter((t) => t.tradeType.startsWith("P"));
        const unscoredCount = purchaseTrades.length - scoredTrades.length;
        const isPartialData = unscoredCount > 0;
        if (scoredTrades.length === 0) {
          return {
            insiderName,
            totalTrades: transactions.length,
            scoredTrades: 0,
            profitableTrades: 0,
            successRate: 0,
            averageGain: 0,
            totalPnL: 0,
            isPartialData,
            unscoredCount
          };
        }
        const profitableTrades = scoredTrades.filter((t) => t.isProfitable === true).length;
        const successRate = profitableTrades / scoredTrades.length * 100;
        const totalPriceChange = scoredTrades.reduce((sum, t) => sum + (t.twoWeekPriceChange || 0), 0);
        const averageGain = totalPriceChange / scoredTrades.length;
        const totalPnL = scoredTrades.reduce((sum, t) => sum + (t.twoWeekPnL || 0), 0);
        return {
          insiderName,
          totalTrades: transactions.length,
          scoredTrades: scoredTrades.length,
          profitableTrades,
          successRate,
          averageGain,
          totalPnL,
          isPartialData,
          unscoredCount
        };
      }
    };
    openinsiderService = new OpenInsiderService();
  }
});

// server/aiProvider.ts
var aiProvider_exports = {};
__export(aiProvider_exports, {
  SUPPORTED_MODELS: () => SUPPORTED_MODELS,
  clearProviderCache: () => clearProviderCache,
  fetchAvailableModels: () => fetchAvailableModels,
  generateWithFallback: () => generateWithFallback,
  getAIProvider: () => getAIProvider,
  getAvailableProviders: () => getAvailableProviders,
  isGeminiAvailable: () => isGeminiAvailable,
  isOpenAIAvailable: () => isOpenAIAvailable
});
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
function isQuotaOrRateLimitError(error) {
  const errorMessage = error?.message || String(error);
  if (errorMessage.includes("429") || errorMessage.includes("quota") || errorMessage.includes("RESOURCE_EXHAUSTED") || errorMessage.includes("rate") || errorMessage.includes("exceeded")) {
    return true;
  }
  if (error?.status === 429 || error?.code === 429) return true;
  if (error?.code === "RESOURCE_EXHAUSTED") return true;
  if (error?.error?.code === 429) return true;
  if (error?.error?.status === "RESOURCE_EXHAUSTED") return true;
  if (error?.response?.status === 429) return true;
  return false;
}
async function callOpenAI(model, messages, options) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");
  const client = new OpenAI({ apiKey });
  const maxTokens = options?.maxTokens ?? 4e3;
  const response = await client.chat.completions.create({
    model,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    temperature: options?.temperature ?? 0.3,
    max_completion_tokens: maxTokens,
    response_format: options?.responseFormat === "json" ? { type: "json_object" } : void 0
  });
  return response.choices[0]?.message?.content || "";
}
async function callGemini(model, messages, options) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");
  const client = new GoogleGenAI({ apiKey });
  const systemMessage = messages.find((m) => m.role === "system");
  const userMessages = messages.filter((m) => m.role !== "system");
  const contents = userMessages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }]
  }));
  const request = {
    model,
    contents,
    generationConfig: {
      temperature: options?.temperature ?? 0.3,
      maxOutputTokens: options?.maxTokens ?? 4e3
    }
  };
  if (options?.responseFormat === "json") {
    request.generationConfig.responseMimeType = "application/json";
  }
  if (systemMessage) {
    request.systemInstruction = { parts: [{ text: systemMessage.content }] };
  }
  const response = await client.models.generateContent(request);
  const candidate = response.candidates?.[0];
  if (candidate?.content?.parts) {
    return candidate.content.parts.map((p) => p.text || "").join("");
  }
  return "";
}
async function generateWithFallback(_config, messages, options) {
  const errors = [];
  for (let i = 0; i < SUPPORTED_MODELS.length; i++) {
    const modelConfig = SUPPORTED_MODELS[i];
    const isFirstAttempt = i === 0;
    try {
      console.log(`[AIProvider] ${isFirstAttempt ? "\u{1F680}" : "\u{1F504}"} Trying ${modelConfig.name} (${modelConfig.id})`);
      const startTime = Date.now();
      let content;
      if (modelConfig.provider === "openai") {
        content = await callOpenAI(modelConfig.id, messages, options);
      } else {
        content = await callGemini(modelConfig.id, messages, options);
      }
      const duration = Date.now() - startTime;
      console.log(`[AIProvider] \u2705 Success with ${modelConfig.name} in ${duration}ms`);
      return {
        content,
        usedFallback: !isFirstAttempt,
        provider: modelConfig.provider,
        model: modelConfig.id
      };
    } catch (error) {
      const errorMsg = error?.message || String(error);
      errors.push(`${modelConfig.id}: ${errorMsg.substring(0, 100)}`);
      if (isQuotaOrRateLimitError(error)) {
        console.log(`[AIProvider] \u26A0\uFE0F ${modelConfig.name} quota/rate limited, trying next...`);
        continue;
      }
      console.log(`[AIProvider] \u26A0\uFE0F ${modelConfig.name} failed: ${errorMsg.substring(0, 100)}, trying next...`);
      continue;
    }
  }
  throw new Error(`All AI models failed. Errors: ${errors.join(" | ")}`);
}
function isGeminiAvailable() {
  return !!process.env.GEMINI_API_KEY;
}
function isOpenAIAvailable() {
  return !!process.env.OPENAI_API_KEY;
}
function getAvailableProviders() {
  return [
    {
      id: "gemini",
      name: "Google Gemini",
      available: isGeminiAvailable(),
      models: ["gemini-3-pro-preview", "gemini-3-flash-preview"]
    },
    {
      id: "openai",
      name: "OpenAI",
      available: isOpenAIAvailable(),
      models: ["gpt-5.2", "gpt-5"]
    }
  ];
}
function getAIProvider(config) {
  return {
    getName: () => config.provider === "gemini" ? "Gemini" : "OpenAI",
    getModel: () => config.model || SUPPORTED_MODELS[0].id,
    generateCompletion: async (messages, options) => {
      const result = await generateWithFallback(config, messages, options);
      return result.content;
    }
  };
}
function clearProviderCache() {
}
async function fetchAvailableModels(_provider) {
  return SUPPORTED_MODELS.map((m) => m.id);
}
var SUPPORTED_MODELS;
var init_aiProvider = __esm({
  "server/aiProvider.ts"() {
    "use strict";
    SUPPORTED_MODELS = [
      { id: "gemini-3-pro-preview", provider: "gemini", name: "Gemini 3 Pro" },
      { id: "gpt-5.2", provider: "openai", name: "GPT-5.2" },
      { id: "gemini-3-flash-preview", provider: "gemini", name: "Gemini 3 Flash" },
      { id: "gpt-5", provider: "openai", name: "GPT-5" }
    ];
  }
});

// server/backtestService.ts
var backtestService_exports = {};
__export(backtestService_exports, {
  backtestService: () => backtestService,
  setBacktestProviderConfig: () => setBacktestProviderConfig
});
import OpenAI2 from "openai";
function setBacktestProviderConfig(config) {
  console.log(`[BacktestService] Setting AI provider to: ${config.provider}`);
  currentProviderConfig = config;
}
var openai, currentProviderConfig, BacktestService, backtestService;
var init_backtestService = __esm({
  async "server/backtestService.ts"() {
    "use strict";
    await init_storage();
    await init_telegram();
    init_openinsiderService();
    init_finnhubService();
    init_aiProvider();
    openai = process.env.OPENAI_API_KEY ? new OpenAI2({ apiKey: process.env.OPENAI_API_KEY }) : null;
    currentProviderConfig = { provider: "openai" };
    BacktestService = class {
      /**
       * Fetch historical daily closing prices for a stock using Alpha Vantage
       * Returns data from start date to end date
       */
      async fetchHistoricalPrices(ticker, startDate, endDate) {
        try {
          const prices = await finnhubService.getHistoricalCandlesAlphaVantage(ticker, startDate, endDate);
          if (prices.length === 0) {
            throw new Error(`No historical data available for ${ticker}`);
          }
          return prices;
        } catch (error) {
          console.error(`[BacktestService] Error fetching historical prices for ${ticker}:`, error.message);
          throw error;
        }
      }
      /**
       * Build price matrix for a stock: from insider trade date to today
       * Checks database cache first before hitting Alpha Vantage API
       */
      async buildPriceMatrix(ticker, insiderTradeDate) {
        const cached = await storage.getCachedPriceData(ticker, insiderTradeDate);
        if (cached && cached.priceMatrix && cached.priceMatrix.length > 0) {
          console.log(`[BacktestService] Using cached price data for ${ticker} (${cached.priceMatrix.length} days)`);
          return cached.priceMatrix;
        }
        const tradeDate = new Date(insiderTradeDate);
        const today = /* @__PURE__ */ new Date();
        today.setHours(0, 0, 0, 0);
        console.log(`[BacktestService] Fetching ${ticker} prices from Alpha Vantage (${insiderTradeDate} to ${today.toISOString().split("T")[0]})`);
        return await this.fetchHistoricalPrices(ticker, tradeDate, today);
      }
      /**
       * Find the first date when a trade became viable (met buy criteria)
       * Criteria: market cap > $500M AND insider price >= 15% of market price
       */
      findFirstViableDate(priceMatrix, insiderPrice, marketCap) {
        if (marketCap < 5e8) {
          return null;
        }
        for (const pricePoint of priceMatrix) {
          const marketPrice = pricePoint.close;
          const priceRatio = insiderPrice / marketPrice;
          if (priceRatio >= 0.15) {
            return pricePoint.date;
          }
        }
        return null;
      }
      /**
       * Check if job has been cancelled
       */
      async isJobCancelled(jobId) {
        const job = await storage.getBacktestJob(jobId);
        return job?.status === "cancelled";
      }
      /**
       * Process a backtest job through all stages
       */
      async processBacktestJob(jobId) {
        try {
          const job = await storage.getBacktestJob(jobId);
          if (!job) {
            throw new Error(`Job ${jobId} not found`);
          }
          console.log(`[BacktestJob ${jobId}] Starting job: ${job.name}`);
          await storage.updateBacktestJob(jobId, {
            status: "fetching_messages",
            progress: 10
          });
          if (await this.isJobCancelled(jobId)) {
            console.log(`[BacktestJob ${jobId}] Job cancelled by user`);
            return;
          }
          const dataSource = job.dataSource || "telegram";
          if (!["telegram", "openinsider"].includes(dataSource)) {
            throw new Error(`Invalid data source: ${dataSource}. Must be "telegram" or "openinsider"`);
          }
          let messages = [];
          if (dataSource === "telegram") {
            console.log(`[BacktestJob ${jobId}] Fetching ${job.messageCount} Telegram messages...`);
            const telegramConfig2 = await storage.getTelegramConfig();
            if (!telegramConfig2) {
              throw new Error("Telegram not configured");
            }
            messages = await telegramService.fetchMessagesForBacktest(
              telegramConfig2.channelUsername,
              job.messageCount
            );
          } else if (dataSource === "openinsider") {
            console.log(`[BacktestJob ${jobId}] Fetching ${job.messageCount} OpenInsider transactions...`);
            const openinsiderConfig2 = await storage.getOpeninsiderConfig();
            const filters = {};
            if (openinsiderConfig2?.insiderTitles && openinsiderConfig2.insiderTitles.length > 0) {
              filters.insiderTitles = openinsiderConfig2.insiderTitles;
            }
            if (openinsiderConfig2?.minTransactionValue) {
              filters.minTransactionValue = openinsiderConfig2.minTransactionValue;
            }
            const filterInfo = Object.keys(filters).length > 0 ? ` with filters: ${JSON.stringify(filters)}` : "";
            console.log(`[BacktestJob ${jobId}] Applying OpenInsider filters${filterInfo}`);
            messages = await openinsiderService.fetchMessagesForBacktest(
              job.messageCount,
              Object.keys(filters).length > 0 ? filters : void 0
            );
          } else {
            throw new Error(`Unknown data source: ${dataSource}`);
          }
          if (!messages || messages.length === 0) {
            throw new Error(`No messages fetched from ${dataSource}`);
          }
          console.log(`[BacktestJob ${jobId}] Fetched ${messages.length} messages from ${dataSource}`);
          if (await this.isJobCancelled(jobId)) {
            console.log(`[BacktestJob ${jobId}] Job cancelled by user`);
            return;
          }
          await storage.updateBacktestJob(jobId, {
            status: "filtering",
            progress: 25
          });
          console.log(`[BacktestJob ${jobId}] Filtering purchase candidates...`);
          const candidates = await this.filterPurchaseCandidates(messages);
          if (candidates.length === 0) {
            await storage.updateBacktestJob(jobId, {
              status: "completed",
              progress: 100,
              completedAt: /* @__PURE__ */ new Date(),
              candidateStocks: []
            });
            console.log(`[BacktestJob ${jobId}] No valid candidates found - job completed`);
            return;
          }
          console.log(`[BacktestJob ${jobId}] Found ${candidates.length} valid candidates`);
          await storage.updateBacktestJob(jobId, {
            status: "building_matrix",
            progress: 40
          });
          console.log(`[BacktestJob ${jobId}] Building price matrices for ${candidates.length} stocks...`);
          const viableCandidates = [];
          for (let i = 0; i < candidates.length; i++) {
            if (await this.isJobCancelled(jobId)) {
              console.log(`[BacktestJob ${jobId}] Job cancelled by user`);
              return;
            }
            const candidate = candidates[i];
            try {
              const priceMatrix = await this.buildPriceMatrix(
                candidate.ticker,
                candidate.insiderTradeDate
                // Use insider trade date to get full historical data
              );
              const marketCapValue = candidate.marketCap ? this.parseMarketCap(candidate.marketCap) : 0;
              if (!marketCapValue || isNaN(marketCapValue)) {
                console.log(`[BacktestJob ${jobId}] ${candidate.ticker} has invalid market cap, skipping`);
                continue;
              }
              const insiderPriceNum = parseFloat(candidate.insiderPrice);
              const firstViableDate = this.findFirstViableDate(priceMatrix, insiderPriceNum, marketCapValue);
              if (!firstViableDate) {
                console.log(`[BacktestJob ${jobId}] ${candidate.ticker} never became viable, skipping`);
                continue;
              }
              candidate.firstViableDate = firstViableDate;
              viableCandidates.push(candidate);
              await storage.createBacktestPriceData({
                jobId,
                ticker: candidate.ticker,
                insiderBuyDate: firstViableDate,
                // Use first viable date as purchase date
                priceMatrix
              });
              const progress = 40 + Math.floor((i + 1) / candidates.length * 20);
              await storage.updateBacktestJob(jobId, { progress });
              console.log(`[BacktestJob ${jobId}] Built price matrix for ${candidate.ticker} (${priceMatrix.length} days, first viable: ${firstViableDate})`);
              if (i < candidates.length - 1) {
                console.log(`[BacktestJob ${jobId}] Waiting 1 second for Alpha Vantage rate limit...`);
                await new Promise((resolve) => setTimeout(resolve, 1e3));
              }
            } catch (error) {
              console.error(`[BacktestJob ${jobId}] Failed to fetch prices for ${candidate.ticker}:`, error.message);
            }
          }
          await storage.updateBacktestJob(jobId, {
            candidateStocks: viableCandidates.map((c) => ({
              ticker: c.ticker,
              insiderBuyDate: c.firstViableDate,
              // First viable date used in simulation
              insiderPrice: parseFloat(c.insiderPrice),
              marketPrice: parseFloat(c.marketPriceAtInsiderDate || c.insiderPrice),
              marketCap: c.marketCap || "Unknown"
            }))
          });
          if (await this.isJobCancelled(jobId)) {
            console.log(`[BacktestJob ${jobId}] Job cancelled by user`);
            return;
          }
          await storage.updateBacktestJob(jobId, {
            status: "generating_scenarios",
            progress: 70
          });
          console.log(`[BacktestJob ${jobId}] Generating trading scenarios with OpenAI...`);
          await this.generateScenarios(jobId, viableCandidates);
          if (await this.isJobCancelled(jobId)) {
            console.log(`[BacktestJob ${jobId}] Job cancelled by user`);
            return;
          }
          await storage.updateBacktestJob(jobId, {
            status: "calculating_results",
            progress: 90
          });
          console.log(`[BacktestJob ${jobId}] All scenarios calculated successfully`);
          await storage.updateBacktestJob(jobId, {
            status: "completed",
            progress: 100,
            completedAt: /* @__PURE__ */ new Date()
          });
          console.log(`[BacktestJob ${jobId}] Job completed successfully`);
        } catch (error) {
          console.error(`[BacktestJob ${jobId}] Job failed:`, error);
          await storage.updateBacktestJob(jobId, {
            status: "failed",
            errorMessage: error.message
          });
        }
      }
      /**
       * Filter Telegram messages to find valid purchase candidates
       * Same criteria as Purchase page: market cap > $500M, insider price >= 15% of current price
       */
      async filterPurchaseCandidates(messages) {
        const candidatesMap = /* @__PURE__ */ new Map();
        for (const msg of messages) {
          if (!msg || !msg.text) continue;
          const ticker = this.extractTicker(msg.text);
          if (!ticker) continue;
          const recommendation = this.extractRecommendation(msg.text);
          if (recommendation !== "buy") continue;
          const insiderPrice = this.extractInsiderPrice(msg.text);
          if (!insiderPrice) continue;
          const telegramMessageDate = new Date(msg.date * 1e3).toISOString().split("T")[0];
          const insiderTradeDate = this.extractInsiderTradeDate(msg.text);
          const compositeKey = `${ticker}_${insiderTradeDate || telegramMessageDate}`;
          let stock = await storage.getAnyStockForTicker(ticker);
          if (!stock) {
            try {
              const quote = await finnhubService.getQuote(ticker);
              if (!quote || !quote.currentPrice || quote.currentPrice <= 0) {
                console.log(`[BacktestFilter] No valid quote for ${ticker}, skipping`);
                continue;
              }
              const profile = await finnhubService.getCompanyProfile(ticker);
              const marketCapValue = profile?.marketCap ? profile.marketCap * 1e6 : 0;
              if (marketCapValue < 5e8) {
                console.log(`[BacktestFilter] ${ticker} market cap too low: $${(marketCapValue / 1e6).toFixed(1)}M, skipping`);
                continue;
              }
              const insiderPriceNum = parseFloat(insiderPrice);
              if (insiderPriceNum < quote.currentPrice * 0.15) {
                console.log(`[BacktestFilter] ${ticker} likely options deal (insider: $${insiderPriceNum} vs market: $${quote.currentPrice}), skipping`);
                continue;
              }
              const candidate = {
                ticker,
                insiderPrice,
                insiderTradeDate,
                telegramMessageDate,
                // This is the actual purchase date
                marketPriceAtInsiderDate: quote.currentPrice.toString(),
                marketCap: `$${(marketCapValue / 1e6).toFixed(1)}M`
              };
              if (!candidatesMap.has(compositeKey)) {
                candidatesMap.set(compositeKey, candidate);
                console.log(`[BacktestFilter] ${ticker} is valid candidate (market cap: $${(marketCapValue / 1e6).toFixed(1)}M, price: $${quote.currentPrice})`);
              }
            } catch (error) {
              console.log(`[BacktestFilter] Failed to fetch ${ticker} info: ${error.message}, skipping`);
              continue;
            }
          } else {
            const marketCapValue = stock.marketCap ? this.parseMarketCap(stock.marketCap) : 0;
            if (marketCapValue < 5e8) {
              console.log(`[BacktestFilter] ${ticker} market cap too low, skipping`);
              continue;
            }
            const marketPrice = parseFloat(stock.currentPrice);
            const insiderPriceNum = parseFloat(insiderPrice);
            if (insiderPriceNum < marketPrice * 0.15) {
              console.log(`[BacktestFilter] ${ticker} likely options deal, skipping`);
              continue;
            }
            const candidate = {
              ticker,
              insiderPrice,
              insiderTradeDate,
              telegramMessageDate,
              // This is the actual purchase date
              marketPriceAtInsiderDate: stock.currentPrice,
              marketCap: stock.marketCap
            };
            if (!candidatesMap.has(compositeKey)) {
              candidatesMap.set(compositeKey, candidate);
              console.log(`[BacktestFilter] ${ticker} is valid candidate (existing in DB)`);
            }
          }
        }
        return Array.from(candidatesMap.values());
      }
      extractTicker(message) {
        let match = message.match(/\$([A-Z]{1,5})\b/);
        if (match) return match[1];
        match = message.match(/(?:Sale|Buy|Purchase)\s+([A-Z]{2,5})\b/i);
        if (match) return match[1];
        return null;
      }
      extractRecommendation(message) {
        const lowerMessage = message.toLowerCase();
        if (lowerMessage.includes("\u{1F7E2}") || lowerMessage.includes("purchase")) {
          return "buy";
        }
        if (lowerMessage.includes("\u{1F534}") || lowerMessage.includes("sale")) {
          return null;
        }
        if (lowerMessage.match(/\bbuy\b/i)) {
          return "buy";
        }
        return null;
      }
      extractInsiderPrice(message) {
        const priceMatch = message.match(/([\d,]+\.?\d*)\s*\*\s*[\d,]+/);
        if (priceMatch) {
          return priceMatch[1].replace(/,/g, "");
        }
        const match = message.match(/\$?([\d,]+\.?\d*)\s*(?:per share|\/share)?/i);
        return match ? match[1].replace(/,/g, "") : null;
      }
      extractInsiderTradeDate(message) {
        const ddmmyyyyMatch = message.match(/(\d{2})\.(\d{2})\.(\d{4})/);
        if (ddmmyyyyMatch) {
          const [, day, month, year] = ddmmyyyyMatch;
          return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
        }
        const dateMatch = message.match(/(\d{4}-\d{2}-\d{2})/);
        if (dateMatch) {
          return dateMatch[1];
        }
        const dateMatch2 = message.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (dateMatch2) {
          const [, month, day, year] = dateMatch2;
          return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
        }
        return (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      }
      parseMarketCap(marketCapStr) {
        const str = marketCapStr.toUpperCase().replace(/[^0-9.BMK]/g, "");
        const value = parseFloat(str);
        if (str.includes("T")) return value * 1e12;
        if (str.includes("B")) return value * 1e9;
        if (str.includes("M")) return value * 1e6;
        if (str.includes("K")) return value * 1e3;
        return value;
      }
      /**
       * Generate 100 trading rule scenarios using OpenAI
       */
      async generateScenarios(jobId, candidates) {
        console.log(`[BacktestJob ${jobId}] Generating AI trading scenarios...`);
        const marketSummary = candidates.map((c) => ({
          ticker: c.ticker,
          marketCap: c.marketCap,
          insiderBuyDate: c.insiderTradeDate
        })).slice(0, 5);
        const prompt = `You are a professional stock trading strategist. I have analyzed ${candidates.length} insider trading events where insiders purchased shares.

Sample stocks:
${marketSummary.map((s) => `- ${s.ticker} (Market Cap: ${s.marketCap}, Insider Buy: ${s.insiderBuyDate})`).join("\n")}

Generate 100 different trading rule scenarios using rule-based conditions. Each scenario defines WHEN to sell after buying at market price.

CRITICAL REQUIREMENTS - EVERY scenario MUST have:
1. At least ONE take-profit condition (price going UP - positive percentage)
2. At least ONE stop-loss condition (price going DOWN - negative percentage) OR a time-based exit
3. Conditions use OR logic (sell when ANY condition is met)

Available metrics for sell conditions:
- "price_change_from_buy_percent": % change from buy price (e.g., -5 for stop-loss, +15 for take-profit)
- "days_held": number of days since purchase (use as max holding period)

Available operators: ">", "<", ">=", "<=", "=="

Each scenario must specify:
1. name: A descriptive name for the strategy
2. description: Brief explanation of the strategy logic
3. sellConditions: Array of conditions that trigger a sell (MUST include both take-profit AND stop-loss or time exit)
4. sellAction: { "type": "sell_all" } (always sell entire position when conditions are met)

The scenarios should explore different combinations:
- Conservative: Small gains (5-10%), tight stops (-3% to -5%), short timeframes (7-14 days)
- Moderate: Medium gains (10-20%), moderate stops (-5% to -8%), medium timeframes (14-30 days)
- Aggressive: Large gains (20-50%), wider stops (-10% to -15%), longer timeframes (30-60 days)
- Hybrid: Mix of quick profits with trailing stops, momentum plays, etc.

Return ONLY valid JSON in this exact format:
{
  "scenarios": [
    {
      "name": "Quick 10% Profit or 5% Stop",
      "description": "Conservative strategy targeting quick 10% gains with tight 5% stop-loss protection",
      "sellConditions": [
        {
          "metric": "price_change_from_buy_percent",
          "operator": ">=",
          "value": 10,
          "logic": "OR"
        },
        {
          "metric": "price_change_from_buy_percent",
          "operator": "<=",
          "value": -5,
          "logic": "OR"
        },
        {
          "metric": "days_held",
          "operator": ">=",
          "value": 14
        }
      ],
      "sellAction": {
        "type": "sell_all"
      }
    }
  ]
}

Generate 100 diverse scenarios exploring all ranges of risk/reward profiles.`;
        try {
          console.log(`[BacktestJob ${jobId}] Using ${currentProviderConfig.provider} for scenario generation`);
          const messages = [
            { role: "system", content: "You are a stock trading strategist. Return only valid JSON with 100 diverse trading scenarios." },
            { role: "user", content: prompt }
          ];
          const result = await generateWithFallback(currentProviderConfig, messages, {
            temperature: 0.9,
            maxTokens: 16e3,
            responseFormat: "json"
          });
          if (result.usedFallback) {
            console.log(`[BacktestJob ${jobId}] \u26A0\uFE0F Used fallback: ${result.provider} (${result.model})`);
          }
          const content = result.content;
          if (!content) {
            throw new Error("No response from AI provider");
          }
          let cleanContent = content.trim();
          cleanContent = cleanContent.replace(/^```(?:json|JSON)?\s*\n?/i, "");
          cleanContent = cleanContent.replace(/\n?\s*```\s*$/i, "");
          cleanContent = cleanContent.trim();
          console.log(`[BacktestJob ${jobId}] OpenAI response preview: ${cleanContent.substring(0, 200)}...`);
          let parsedResult;
          try {
            parsedResult = JSON.parse(cleanContent);
          } catch (parseError) {
            console.error(`[BacktestJob ${jobId}] JSON parse error. First 500 chars of content:`, cleanContent.substring(0, 500));
            throw parseError;
          }
          let scenarios = parsedResult.scenarios || [];
          if (scenarios.length === 0) {
            throw new Error("No scenarios generated");
          }
          scenarios = scenarios.filter((scenario, index2) => {
            const conditions = scenario.sellConditions || [];
            const hasTakeProfit = conditions.some(
              (c) => c.metric === "price_change_from_buy_percent" && c.value > 0
            );
            const hasStopLossOrTimeExit = conditions.some(
              (c) => c.metric === "price_change_from_buy_percent" && c.value < 0 || c.metric === "days_held"
            );
            const isValid = hasTakeProfit && hasStopLossOrTimeExit;
            if (!isValid) {
              console.log(`[BacktestJob ${jobId}] Skipping invalid scenario ${index2 + 1}: ${scenario.name} (missing take-profit or stop-loss)`);
            }
            return isValid;
          });
          console.log(`[BacktestJob ${jobId}] Generated ${scenarios.length} valid scenarios (filtered from ${parsedResult.scenarios?.length || 0})`);
          for (let i = 0; i < scenarios.length; i++) {
            if (await this.isJobCancelled(jobId)) {
              console.log(`[BacktestJob ${jobId}] Job cancelled by user during scenario generation`);
              return;
            }
            const scenario = scenarios[i];
            const pnlResult = await this.calculateScenarioPnL(jobId, scenario, candidates);
            await storage.createBacktestScenario({
              jobId,
              scenarioNumber: i + 1,
              name: scenario.name || `Scenario ${i + 1}`,
              description: scenario.description || "",
              sellConditions: scenario.sellConditions || [],
              sellAction: scenario.sellAction || { type: "sell_all" },
              totalProfitLoss: pnlResult.totalPnL.toFixed(2),
              totalProfitLossPercent: pnlResult.totalPnLPercent.toFixed(2),
              winRate: pnlResult.winRate.toFixed(2),
              numberOfTrades: pnlResult.numberOfTrades,
              tradeDetails: pnlResult.tradeDetails
            });
            console.log(`[BacktestJob ${jobId}] Scenario ${i + 1}/${scenarios.length}: ${scenario.name} - P&L: $${pnlResult.totalPnL.toFixed(2)}`);
            const progress = 60 + Math.floor((i + 1) / scenarios.length * 30);
            await storage.updateBacktestJob(jobId, { progress });
          }
        } catch (error) {
          console.error(`[BacktestJob ${jobId}] OpenAI error:`, error.message);
          throw error;
        }
      }
      /**
       * Calculate P&L for a given trading scenario using rule-based conditions
       */
      async calculateScenarioPnL(jobId, scenario, candidates) {
        const trades2 = [];
        let totalInvested = 0;
        let totalReturned = 0;
        let wins = 0;
        const priceDataList = await storage.getBacktestPriceData(jobId);
        const sellConditions = scenario.sellConditions || [];
        const maxDaysCondition = sellConditions.find((c) => c.metric === "days_held");
        const maxDays = maxDaysCondition ? maxDaysCondition.value : 14;
        for (const candidate of candidates) {
          const priceData = priceDataList.find((pd) => pd.ticker === candidate.ticker);
          if (!priceData || !priceData.priceMatrix || priceData.priceMatrix.length === 0) {
            continue;
          }
          const buyDate = priceData.insiderBuyDate;
          let buyIndex = priceData.priceMatrix.findIndex((p) => p.date === buyDate);
          if (buyIndex === -1) {
            const buyDateTime = new Date(buyDate).getTime();
            for (let i = priceData.priceMatrix.length - 1; i >= 0; i--) {
              const priceDateTime = new Date(priceData.priceMatrix[i].date).getTime();
              if (priceDateTime <= buyDateTime) {
                buyIndex = i;
                break;
              }
            }
          }
          if (buyIndex === -1) continue;
          const actualBuyDate = priceData.priceMatrix[buyIndex].date;
          const buyPrice = priceData.priceMatrix[buyIndex].close;
          let sellDate = actualBuyDate;
          let sellPrice = buyPrice;
          let sellReason = "No sell condition met - held to end of data";
          let conditionMet = false;
          for (let dayOffset = 0; dayOffset < priceData.priceMatrix.length - buyIndex; dayOffset++) {
            const currentIndex = buyIndex + dayOffset;
            const currentPrice = priceData.priceMatrix[currentIndex].close;
            const daysHeld = dayOffset;
            const priceChangeFromBuyPercent = (currentPrice - buyPrice) / buyPrice * 100;
            for (const condition of sellConditions) {
              let conditionValue;
              if (condition.metric === "price_change_from_buy_percent") {
                conditionValue = priceChangeFromBuyPercent;
              } else if (condition.metric === "days_held") {
                conditionValue = daysHeld;
              } else {
                continue;
              }
              const isMet = this.evaluateCondition(conditionValue, condition.operator, condition.value);
              if (isMet) {
                sellDate = priceData.priceMatrix[currentIndex].date;
                sellPrice = currentPrice;
                sellReason = this.formatConditionReason(condition, conditionValue);
                conditionMet = true;
                break;
              }
            }
            if (conditionMet) {
              break;
            }
            if (daysHeld >= Math.max(maxDays, 14)) {
              sellDate = priceData.priceMatrix[currentIndex].date;
              sellPrice = currentPrice;
              sellReason = `Held for ${daysHeld} days (max)`;
              break;
            }
          }
          const profitLoss = sellPrice - buyPrice;
          const profitLossPercent = (sellPrice - buyPrice) / buyPrice * 100;
          totalInvested += buyPrice;
          totalReturned += sellPrice;
          if (profitLoss > 0) wins++;
          trades2.push({
            ticker: candidate.ticker,
            buyDate: actualBuyDate,
            buyPrice,
            sellDate,
            sellPrice,
            profitLoss,
            profitLossPercent,
            reason: sellReason
          });
        }
        const totalPnL = totalReturned - totalInvested;
        const totalPnLPercent = totalInvested > 0 ? totalPnL / totalInvested * 100 : 0;
        const winRate = trades2.length > 0 ? wins / trades2.length * 100 : 0;
        return {
          totalPnL,
          totalPnLPercent,
          winRate,
          numberOfTrades: trades2.length,
          tradeDetails: trades2
        };
      }
      /**
       * Evaluate a condition against a value
       */
      evaluateCondition(actualValue, operator, targetValue) {
        switch (operator) {
          case ">":
            return actualValue > targetValue;
          case "<":
            return actualValue < targetValue;
          case ">=":
            return actualValue >= targetValue;
          case "<=":
            return actualValue <= targetValue;
          case "==":
            return actualValue === targetValue;
          default:
            return false;
        }
      }
      /**
       * Format a condition into a human-readable reason
       */
      formatConditionReason(condition, actualValue) {
        const metric = condition.metric === "price_change_from_buy_percent" ? "price change" : condition.metric.replace(/_/g, " ");
        return `${metric} ${condition.operator} ${condition.value} (actual: ${actualValue.toFixed(2)})`;
      }
    };
    backtestService = new BacktestService();
  }
});

// server/scoring/scorecardConfig.ts
function calculateSectionScore(metrics) {
  let weightedSum = 0;
  let totalWeight = 0;
  for (const metric of Object.values(metrics)) {
    if (metric.ruleBucket === "missing") {
      continue;
    }
    weightedSum += metric.score * metric.weight;
    totalWeight += metric.weight;
  }
  if (totalWeight === 0) return 0;
  return Math.round(weightedSum / totalWeight * 10);
}
function calculateGlobalScore(sections) {
  let weightedSum = 0;
  let totalWeight = 0;
  for (const section of Object.values(sections)) {
    weightedSum += section.score * section.weight;
    totalWeight += section.weight;
  }
  if (totalWeight === 0) return 0;
  return Math.round(weightedSum / totalWeight);
}
function determineConfidence(sections) {
  let totalMetrics = 0;
  let missingMetrics = 0;
  for (const section of Object.values(sections)) {
    totalMetrics += Object.keys(section.metrics).length;
    missingMetrics += section.missingMetrics.length;
  }
  const missingRatio = missingMetrics / totalMetrics;
  if (missingRatio <= 0.1) return "high";
  if (missingRatio <= 0.3) return "medium";
  return "low";
}
function generateScoringRubricPrompt() {
  let prompt = `## SCORING RUBRIC (Version ${SCORECARD_VERSION})

`;
  prompt += `Trading Horizon: ${scorecardConfig.tradingHorizon}

`;
  prompt += `You MUST score each metric below. Missing data = score of 0.

`;
  for (const [sectionKey, section] of Object.entries(scorecardConfig.sections)) {
    prompt += `### ${section.name} (Weight: ${section.weight}%)
`;
    prompt += `${section.description}

`;
    for (const [metricKey, metric] of Object.entries(section.metrics)) {
      prompt += `**${metricKey}** - ${metric.name} (Weight: ${metric.weight}%)
`;
      prompt += `${metric.description}
`;
      prompt += `Scoring:
`;
      for (const [bucket, config] of Object.entries(metric.thresholds)) {
        const conditions = [];
        if (config.min !== void 0) conditions.push(`>= ${config.min}`);
        if (config.max !== void 0) conditions.push(`< ${config.max}`);
        if (config.condition) conditions.push(config.condition);
        prompt += `  - ${bucket.toUpperCase()} (${config.score} pts): ${conditions.join(" AND ")}
`;
      }
      prompt += `
`;
    }
    prompt += `
`;
  }
  return prompt;
}
var SCORECARD_VERSION, scorecardConfig;
var init_scorecardConfig = __esm({
  "server/scoring/scorecardConfig.ts"() {
    "use strict";
    SCORECARD_VERSION = "1.0";
    scorecardConfig = {
      version: SCORECARD_VERSION,
      tradingHorizon: "1-2 weeks",
      sections: {
        fundamentals: {
          name: "Fundamentals",
          weight: 35,
          description: "Financial health and growth metrics",
          metrics: {
            revenueGrowth: {
              name: "YoY Revenue Growth",
              weight: 25,
              description: "Year-over-year revenue growth percentage",
              thresholds: {
                excellent: { min: 25, score: 10 },
                good: { min: 10, max: 25, score: 8 },
                neutral: { min: 0, max: 10, score: 5 },
                weak: { min: -10, max: 0, score: 2 },
                poor: { max: -10, score: 0 }
              },
              missingDataScore: 0
            },
            epsGrowth: {
              name: "YoY EPS Growth",
              weight: 25,
              description: "Year-over-year earnings per share growth",
              thresholds: {
                excellent: { min: 30, score: 10 },
                good: { min: 15, max: 30, score: 8 },
                neutral: { min: 0, max: 15, score: 5 },
                weak: { min: -20, max: 0, score: 2 },
                poor: { max: -20, score: 0 }
              },
              missingDataScore: 0
            },
            profitMarginTrend: {
              name: "Profit Margin Trend",
              weight: 20,
              description: "Direction of profit margins over recent quarters",
              thresholds: {
                excellent: { condition: "strong_growth", score: 10 },
                good: { condition: "improving", score: 8 },
                neutral: { condition: "stable", score: 5 },
                weak: { condition: "declining", score: 2 },
                poor: { condition: "declining_fast", score: 0 }
              },
              missingDataScore: 0
            },
            fcfToDebt: {
              name: "FCF-to-Debt Ratio",
              weight: 15,
              description: "Free cash flow relative to total debt",
              thresholds: {
                excellent: { min: 0.4, score: 10 },
                good: { min: 0.2, max: 0.4, score: 8 },
                neutral: { min: 0.1, max: 0.2, score: 5 },
                weak: { min: 0.05, max: 0.1, score: 2 },
                poor: { max: 0.05, score: 0 }
              },
              missingDataScore: 0
            },
            debtToEquity: {
              name: "Debt-to-Equity Ratio",
              weight: 15,
              description: "Total debt relative to shareholder equity (lower is better)",
              thresholds: {
                excellent: { max: 0.5, score: 10 },
                good: { min: 0.5, max: 1, score: 8 },
                neutral: { min: 1, max: 2, score: 5 },
                weak: { min: 2, max: 3, score: 2 },
                poor: { min: 3, score: 0 }
              },
              missingDataScore: 0
            }
          }
        },
        technicals: {
          name: "Technicals",
          weight: 25,
          description: "Price action and momentum indicators (tuned for 1-2 week horizon)",
          metrics: {
            smaAlignment: {
              name: "Short-Term SMA Alignment",
              weight: 25,
              description: "5/10/20 day SMA alignment for short-term trend",
              thresholds: {
                excellent: { condition: "5>10>20_bullish", score: 10 },
                good: { condition: "mixed_bullish", score: 8 },
                neutral: { condition: "neutral_crossover", score: 5 },
                weak: { condition: "mixed_bearish", score: 2 },
                poor: { condition: "5<10<20_bearish", score: 0 }
              },
              missingDataScore: 0
            },
            rsiMomentum: {
              name: "RSI Momentum (14-day)",
              weight: 25,
              description: "Relative Strength Index position and direction",
              thresholds: {
                excellent: { condition: "40-60_rising", score: 10 },
                good: { condition: "30-70_favorable", score: 8 },
                neutral: { condition: "45-55_flat", score: 5 },
                weak: { condition: "approaching_extremes", score: 2 },
                poor: { condition: "overbought_80+_or_oversold_20-", score: 0 }
              },
              missingDataScore: 0
            },
            macdSignal: {
              name: "MACD Momentum",
              weight: 20,
              description: "MACD line vs signal line crossover and histogram",
              thresholds: {
                excellent: { condition: "strong_bullish_crossover", score: 10 },
                good: { condition: "bullish_momentum", score: 8 },
                neutral: { condition: "flat_no_signal", score: 5 },
                weak: { condition: "bearish_momentum", score: 2 },
                poor: { condition: "strong_bearish_crossover", score: 0 }
              },
              missingDataScore: 0
            },
            volumeSurge: {
              name: "Volume vs 10-Day Average",
              weight: 15,
              description: "Recent volume compared to short-term average",
              thresholds: {
                excellent: { condition: "2x+_with_price_confirmation", score: 10 },
                good: { min: 1.2, max: 2, score: 8 },
                neutral: { min: 0.8, max: 1.2, score: 5 },
                weak: { min: 0.5, max: 0.8, score: 2 },
                poor: { max: 0.5, score: 0 }
              },
              missingDataScore: 0
            },
            priceVsResistance: {
              name: "Price vs Key Levels",
              weight: 15,
              description: "Price position relative to support/resistance levels",
              thresholds: {
                excellent: { condition: "breakout_above_resistance", score: 10 },
                good: { condition: "near_support_bouncing", score: 8 },
                neutral: { condition: "mid_range", score: 5 },
                weak: { condition: "near_resistance_rejected", score: 2 },
                poor: { condition: "breakdown_below_support", score: 0 }
              },
              missingDataScore: 0
            }
          }
        },
        insiderActivity: {
          name: "Insider Activity",
          weight: 20,
          description: "Insider trading signals (critical for 1-2 week setups)",
          metrics: {
            netBuyRatio: {
              name: "Net Buy Ratio (30-day)",
              weight: 30,
              description: "Net insider buying vs selling in last 30 days",
              thresholds: {
                excellent: { min: 50, score: 10 },
                good: { min: 10, max: 50, score: 8 },
                neutral: { min: -10, max: 10, score: 5 },
                weak: { min: -50, max: -10, score: 2 },
                poor: { max: -50, score: 0 }
              },
              missingDataScore: 0
            },
            transactionRecency: {
              name: "Most Recent Transaction",
              weight: 30,
              description: "Days since last insider transaction (fresher = better)",
              thresholds: {
                excellent: { max: 7, score: 10 },
                good: { min: 7, max: 14, score: 8 },
                neutral: { min: 14, max: 30, score: 5 },
                weak: { min: 30, max: 60, score: 2 },
                poor: { min: 60, score: 0 }
              },
              missingDataScore: 0
            },
            transactionSize: {
              name: "Transaction Size vs Float",
              weight: 20,
              description: "Insider transaction value relative to float",
              thresholds: {
                excellent: { min: 0.5, score: 10 },
                good: { min: 0.1, max: 0.5, score: 8 },
                neutral: { min: 0.05, max: 0.1, score: 5 },
                weak: { min: 0.01, max: 0.05, score: 2 },
                poor: { max: 0.01, score: 0 }
              },
              missingDataScore: 0
            },
            insiderRole: {
              name: "Insider Role Weight",
              weight: 20,
              description: "Seniority of insiders making transactions (CEO/CFO > Directors)",
              thresholds: {
                excellent: { condition: "c_suite_buying", score: 10 },
                good: { condition: "vp_or_director_buying", score: 8 },
                neutral: { condition: "mixed_roles", score: 5 },
                weak: { condition: "only_10%_holders", score: 2 },
                poor: { condition: "no_meaningful_insider_activity", score: 0 }
              },
              missingDataScore: 0
            }
          }
        },
        newsSentiment: {
          name: "News Sentiment",
          weight: 15,
          description: "Market perception and news flow (short-term catalyst focus)",
          metrics: {
            avgSentiment: {
              name: "Average Sentiment Score",
              weight: 35,
              description: "Mean sentiment of recent news articles (-1 to 1)",
              thresholds: {
                excellent: { min: 0.5, score: 10 },
                good: { min: 0.2, max: 0.5, score: 8 },
                neutral: { min: -0.2, max: 0.2, score: 5 },
                weak: { min: -0.5, max: -0.2, score: 2 },
                poor: { max: -0.5, score: 0 }
              },
              missingDataScore: 0
            },
            sentimentMomentum: {
              name: "Sentiment Trend (7-day)",
              weight: 30,
              description: "Direction of sentiment change over last week",
              thresholds: {
                excellent: { condition: "strong_positive_shift", score: 10 },
                good: { condition: "improving", score: 8 },
                neutral: { condition: "stable", score: 5 },
                weak: { condition: "worsening", score: 2 },
                poor: { condition: "sharp_negative_shift", score: 0 }
              },
              missingDataScore: 0
            },
            newsVolume: {
              name: "News Volume (7-day)",
              weight: 20,
              description: "Number of relevant news articles in last week",
              thresholds: {
                excellent: { min: 10, score: 10 },
                good: { min: 6, max: 10, score: 8 },
                neutral: { min: 3, max: 6, score: 5 },
                weak: { min: 1, max: 3, score: 2 },
                poor: { max: 1, score: 0 }
              },
              missingDataScore: 0
            },
            catalystPresence: {
              name: "Upcoming Catalyst",
              weight: 15,
              description: "Presence of near-term catalysts (earnings, FDA, etc.)",
              thresholds: {
                excellent: { condition: "positive_catalyst_within_2_weeks", score: 10 },
                good: { condition: "neutral_catalyst_upcoming", score: 8 },
                neutral: { condition: "no_catalyst_expected", score: 5 },
                weak: { condition: "uncertainty_around_catalyst", score: 2 },
                poor: { condition: "negative_catalyst_expected", score: 0 }
              },
              missingDataScore: 0
            }
          }
        },
        macroSector: {
          name: "Macro/Sector",
          weight: 5,
          description: "Industry and macro context",
          metrics: {
            sectorMomentum: {
              name: "Sector vs SPY (10-day)",
              weight: 50,
              description: "Sector ETF performance relative to SPY over 10 days",
              thresholds: {
                excellent: { min: 5, score: 10 },
                good: { min: 2, max: 5, score: 8 },
                neutral: { min: -2, max: 2, score: 5 },
                weak: { min: -5, max: -2, score: 2 },
                poor: { max: -5, score: 0 }
              },
              missingDataScore: 0
            },
            macroRiskFlags: {
              name: "Macro Risk Environment",
              weight: 50,
              description: "Overall macro risk assessment for the sector",
              thresholds: {
                excellent: { condition: "favorable_tailwinds", score: 10 },
                good: { condition: "low_risk", score: 8 },
                neutral: { condition: "neutral", score: 5 },
                weak: { condition: "some_headwinds", score: 2 },
                poor: { condition: "severe_macro_risks", score: 0 }
              },
              missingDataScore: 0
            }
          }
        }
      }
    };
  }
});

// server/aiAnalysisService.ts
var aiAnalysisService_exports = {};
__export(aiAnalysisService_exports, {
  aiAnalysisService: () => aiAnalysisService
});
import OpenAI3 from "openai";
function stripMarkdownCodeBlocks(content) {
  let cleaned = content.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json|JSON)?\s*\n?/, "");
    cleaned = cleaned.replace(/\n?```\s*$/, "");
    cleaned = cleaned.trim();
  }
  return cleaned;
}
var openai2, currentProviderConfig2, AIAnalysisService, aiAnalysisService;
var init_aiAnalysisService = __esm({
  "server/aiAnalysisService.ts"() {
    "use strict";
    init_aiProvider();
    init_scorecardConfig();
    openai2 = process.env.OPENAI_API_KEY ? new OpenAI3({ apiKey: process.env.OPENAI_API_KEY }) : null;
    currentProviderConfig2 = { provider: "openai" };
    AIAnalysisService = class {
      /**
       * Set the AI provider configuration
       * Called when admin changes the provider in settings
       */
      setProviderConfig(config) {
        console.log(`[AIAnalysisService] Setting AI provider to: ${config.provider}${config.model ? ` (model: ${config.model})` : ""}`);
        currentProviderConfig2 = config;
      }
      /**
       * Get the current AI provider configuration
       */
      getProviderConfig() {
        return currentProviderConfig2;
      }
      /**
       * Analyze a stock using AI - Simplified Signal Score + Playbook approach
       * Combines ALL available data and asks AI for:
       * 1. Signal Score (1-100): Relevance of insider transaction to 1-2 week profit opportunity
       * 2. Playbook: Actionable explanation with data references and clear recommendation
       */
      async analyzeStock(financialData) {
        const {
          ticker,
          companyOverview,
          balanceSheet,
          incomeStatement,
          cashFlow,
          technicalIndicators,
          newsSentiment,
          priceNewsCorrelation,
          insiderTradingStrength,
          secFilings,
          comprehensiveFundamentals
        } = financialData;
        const latestBalanceSheet = balanceSheet?.annualReports?.[0] || balanceSheet?.quarterlyReports?.[0];
        const latestIncomeStatement = incomeStatement?.annualReports?.[0] || incomeStatement?.quarterlyReports?.[0];
        const latestCashFlow = cashFlow?.annualReports?.[0] || cashFlow?.quarterlyReports?.[0];
        const isBuy = insiderTradingStrength?.direction === "buy";
        const isSell = insiderTradingStrength?.direction === "sell";
        const transactionContext = isBuy ? "INSIDER BUYING" : isSell ? "INSIDER SELLING" : "INSIDER TRADING";
        let daysSinceTransaction = "Unknown";
        if (insiderTradingStrength?.tradeDate) {
          const tradeDate = new Date(insiderTradingStrength.tradeDate);
          const today = /* @__PURE__ */ new Date();
          const diffDays = Math.floor((today.getTime() - tradeDate.getTime()) / (1e3 * 60 * 60 * 24));
          daysSinceTransaction = `${diffDays} days ago`;
        }
        const prompt = `You are a momentum trader analyzing insider trading signals. Your goal: CAPITALIZE QUICKLY and MOVE ON. 

TRADING PHILOSOPHY:
- 1-2 WEEK maximum holding period
- Get in fast, take profits, rotate to next opportunity
- If timing is late or the move already happened \u2192 SKIP IT, find fresh signals
- We don't hold losers hoping they'll recover
- Speed and conviction matter more than perfection

CRITICAL - MULTI-FACTOR VALIDATION REQUIRED:
Insider signals alone are NOT enough to act. You MUST validate with:
1. TECHNICALS: RSI, MACD, trend direction - is momentum confirming the insider's bet?
2. SENTIMENT: Is news coverage supporting or contradicting the trade thesis?
3. FUNDAMENTALS: Is the company financially healthy enough to support the move?

SCORING RULE: If ANY of these factors strongly contradict the insider signal, score LOW (under 50).
- Insider buying but RSI overbought + bearish trend = SKIP
- Insider buying but negative sentiment flood = SKIP  
- Insider buying but weak financials / high debt = SKIP
Only score 70+ when insider signal + technicals + sentiment + fundamentals ALL align.

Evaluate this ${transactionContext} signal:

=== OPPORTUNITY OVERVIEW ===
Stock: ${ticker}
Sector: ${companyOverview?.sector || "N/A"}
Market Cap: ${comprehensiveFundamentals?.marketCap || companyOverview?.marketCap || "N/A"}
Insider Action: ${transactionContext}
Time Since Transaction: ${daysSinceTransaction}

=== INSIDER TRANSACTION DETAILS ===
${insiderTradingStrength ? `
Primary Transaction:
- Direction: ${insiderTradingStrength.direction.toUpperCase()}
- Insider: ${insiderTradingStrength.insiderName} (${insiderTradingStrength.insiderTitle})
- Date: ${insiderTradingStrength.tradeDate}
- Quantity: ${insiderTradingStrength.quantityStr}
- Insider Price: ${insiderTradingStrength.insiderPrice}
- Current Price: ${insiderTradingStrength.currentPrice}
- Total Value: ${insiderTradingStrength.totalValue}

Recent Transactions (Top 5):
${insiderTradingStrength.allTransactions.slice(0, 5).map(
          (t, idx) => `${idx + 1}. ${t.direction.toUpperCase()} - ${t.insiderName} (${t.insiderTitle}): ${t.quantityStr} @ ${t.price} on ${t.date}`
        ).join("\n")}

Signal Summary: ${insiderTradingStrength.buyCount} BUY, ${insiderTradingStrength.sellCount} SELL (Total: ${insiderTradingStrength.totalTransactions})
` : "No insider transaction details available"}

=== FUNDAMENTALS ===
VALUATION:
- P/E Ratio: ${comprehensiveFundamentals?.peRatio || companyOverview?.peRatio || "N/A"}
- PEG Ratio: ${comprehensiveFundamentals?.pegRatio || "N/A"}
- Profit Margin: ${comprehensiveFundamentals?.profitMargin ? `${(comprehensiveFundamentals.profitMargin * 100).toFixed(2)}%` : "N/A"}
- Return on Equity: ${comprehensiveFundamentals?.returnOnEquity ? `${(comprehensiveFundamentals.returnOnEquity * 100).toFixed(2)}%` : "N/A"}

BALANCE SHEET (${latestBalanceSheet?.fiscalDateEnding || "Latest"}):
- Total Assets: ${comprehensiveFundamentals?.totalAssets || latestBalanceSheet?.totalAssets || "N/A"}
- Total Liabilities: ${comprehensiveFundamentals?.totalLiabilities || latestBalanceSheet?.totalLiabilities || "N/A"}
- Current Ratio: ${comprehensiveFundamentals?.currentRatio || "N/A"}
- Debt-to-Equity: ${comprehensiveFundamentals?.debtToEquity || "N/A"}
- Cash: ${latestBalanceSheet?.cashAndCashEquivalentsAtCarryingValue || "N/A"}

INCOME (${latestIncomeStatement?.fiscalDateEnding || "Latest"}):
- Revenue: ${comprehensiveFundamentals?.totalRevenue || latestIncomeStatement?.totalRevenue || "N/A"}
- Gross Profit: ${comprehensiveFundamentals?.grossProfit || latestIncomeStatement?.grossProfit || "N/A"}
- Net Income: ${comprehensiveFundamentals?.netIncome || latestIncomeStatement?.netIncome || "N/A"}
- EBITDA: ${latestIncomeStatement?.ebitda || "N/A"}

CASH FLOW (${latestCashFlow?.fiscalDateEnding || "Latest"}):
- Operating Cash Flow: ${comprehensiveFundamentals?.operatingCashflow || latestCashFlow?.operatingCashflow || "N/A"}
- Free Cash Flow: ${comprehensiveFundamentals?.freeCashFlow || "N/A"}

=== TECHNICALS ===
${technicalIndicators ? `
- RSI: ${technicalIndicators.rsi.value.toFixed(2)} (${technicalIndicators.rsi.signal})
- MACD Trend: ${technicalIndicators.macd.trend}
- SMA20: $${technicalIndicators.sma20.toFixed(2)}, SMA50: $${technicalIndicators.sma50.toFixed(2)}
- Volatility (ATR): ${technicalIndicators.atr.toFixed(2)}
` : "Technical data not available"}

=== NEWS & SENTIMENT ===
${newsSentiment ? `
Sentiment Score: ${newsSentiment.aggregateSentiment.toFixed(2)} (${newsSentiment.sentimentTrend})
News Volume: ${newsSentiment.newsVolume} articles
Recent Headlines:
${newsSentiment.articles.slice(0, 5).map((a) => `- ${a.title} (Sentiment: ${a.sentiment.toFixed(2)})`).join("\n")}
` : "News data not available"}

=== SEC FILINGS ===
${secFilings ? `
Filing: ${secFilings.formType} (${secFilings.filingDate})

Business Overview:
${secFilings.businessOverview ? secFilings.businessOverview.substring(0, 1500) : "Not available"}

Management Discussion:
${secFilings.managementDiscussion ? secFilings.managementDiscussion.substring(0, 2e3) : "Not available"}

Risk Factors:
${secFilings.riskFactors ? secFilings.riskFactors.substring(0, 1500) : "Not available"}
` : "SEC filings not available"}

=== YOUR ANALYSIS TASK ===

Evaluate this opportunity and provide:

1. SIGNAL SCORE (1-100): How relevant is this insider ${isBuy ? "buy" : "sell"} signal to making money in 1-2 weeks?
   Consider:
   - Quality of the insider (C-suite vs routine filing)
   - Timing (how fresh is the transaction?)
   - Stock trend alignment with insider action
   - Sector/market conditions
   - Fundamentals supporting the trade thesis

2. PLAYBOOK: Clear, actionable guidance with data references

SCORING GUIDE (remember: quick trades, quick profits):
${isBuy ? `
For INSIDER BUYING:
- 70-100: FRESH SIGNAL, ACT NOW - Early timing, strong momentum, clear upside \u2192 ENTER immediately
- 40-69: WATCHLIST - Decent setup but wait for better entry or confirmation \u2192 Set alerts, be ready
- 1-39: STALE/MISSED - Move already happened, timing is late, or weak setup \u2192 SKIP, find next opportunity
` : `
For INSIDER SELLING:
- 70-100: FRESH SHORT - Valid bearish signal, breakdown imminent \u2192 SHORT or exit longs
- 40-69: CAUTION - Weakness showing but not confirmed \u2192 Watch for breakdown trigger
- 1-39: FALSE ALARM - Routine selling, strong stock \u2192 IGNORE, move on
`}

TIMING IS CRITICAL:
- Trade date >7 days old with >10% price move = likely MISSED (score low)
- Trade date <3 days old with minimal move = EARLY/OPTIMAL (score higher)
- Stale signals waste our time - be ruthless about freshness

Return ONLY this JSON (no markdown):
{
  "overallRating": "${isBuy ? "buy" : "sell"}" or "hold" or "avoid",
  "confidenceScore": 1-100,
  "summary": "2-3 sentence executive summary: What's the insider signal, and does the data support acting on it?",
  "playbook": "Write as an INVESTOR making a real decision (4-6 sentences). Explain your reasoning: 1) TIMING: Is this fresh or stale? Days since trade + price move. 2) VALIDATION: Do technicals, sentiment, and fundamentals SUPPORT or CONTRADICT the insider signal? Cite specific data. 3) DECISION: As an investor optimizing for quick turnaround - would YOU enter now? Why or why not? Be honest about risks. 4) VERDICT: ACT NOW (enter) / WATCHLIST (wait for trigger) / SKIP (move on to next opportunity).",
  "entryTiming": {
    "status": "early" or "optimal" or "late" or "missed",
    "priceMoveSinceInsider": "+X% or -X% since insider bought/sold",
    "daysOld": number of days since insider trade,
    "assessment": "1 decisive sentence: Are we EARLY (good) or did we MISS IT (move on)?"
  },
  "sectorAnalysis": {
    "sector": "Sector name",
    "sectorOutlook": "bullish" or "bearish" or "neutral",
    "sectorNote": "1 sentence on how sector conditions affect this trade"
  },
  "financialHealth": {
    "score": 0-100,
    "strengths": ["List 2-3 specific strengths with data values"],
    "weaknesses": ["List 2-3 specific weaknesses with data values"],
    "redFlags": ["List any serious red flags, or empty array"]
  },
  "technicalAnalysis": {
    "score": 0-100,
    "trend": "bullish" or "bearish" or "neutral",
    "momentum": "strong" or "moderate" or "weak",
    "signals": ["2-3 key technical observations"]
  },
  "sentimentAnalysis": {
    "score": 0-100,
    "trend": "positive" or "negative" or "neutral",
    "newsVolume": "high" or "medium" or "low",
    "key_themes": ["2-3 news themes if available"]
  },
  "risks": ["List 2-4 specific risks with data backing"],
  "opportunities": ["List 2-3 potential catalysts"],
  "tradeParameters": {
    "entryPrice": current stock price as number (use the current price provided),
    "stopLoss": recommended stop loss price as number (typically 5-10% below entry for buys, above for sells),
    "stopLossPercent": stop loss as percentage from entry (negative number like -7.5),
    "profitTarget": recommended profit target price as number (typically 10-20% above entry for buys, below for sells),
    "profitTargetPercent": profit target as percentage from entry (positive number like 15.0),
    "riskRewardRatio": ratio of potential profit to potential loss (e.g., 2.0 means 2:1 reward to risk)
  },
  "recommendation": "${isBuy ? "BUY NOW / WATCH / AVOID" : "SHORT NOW / WATCH / AVOID"} - 2-sentence action. State your position as an investor and WHY based on the data."
}

REMEMBER: You are an investor putting real money on the line. Explain your thinking. Reference actual numbers. Be honest about what the data says - don't sugarcoat weak signals. If you wouldn't personally take this trade for a 1-2 week quick turnaround, say so clearly.`;
        try {
          console.log(`[AIAnalysisService] Analyzing ${ticker} using ${currentProviderConfig2.provider}`);
          const messages = [{ role: "user", content: prompt }];
          const result = await generateWithFallback(currentProviderConfig2, messages, {
            temperature: 0.3,
            maxTokens: 4096,
            responseFormat: "json"
          });
          if (result.usedFallback) {
            console.log(`[AIAnalysisService] \u26A0\uFE0F Used fallback provider: ${result.provider} (${result.model})`);
          }
          const cleanedContent = stripMarkdownCodeBlocks(result.content || "{}");
          const analysis = JSON.parse(cleanedContent);
          return {
            ticker,
            ...analysis,
            analyzedAt: (/* @__PURE__ */ new Date()).toISOString()
          };
        } catch (error) {
          console.error("[AIAnalysisService] Error analyzing stock:", error);
          throw new Error(`Failed to analyze ${ticker}: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      }
      /**
       * Generate a quick summary of analysis for display
       */
      generateQuickSummary(analysis) {
        const rating = analysis.overallRating.replace(/_/g, " ").toUpperCase();
        const score = analysis.confidenceScore;
        return `${rating} (${score}/100) - ${analysis.summary}`;
      }
      /**
       * Generate a lightweight daily brief for a followed stock - DUAL-SCENARIO VERSION
       * Returns BOTH "watching" and "owning" scenarios so users can evaluate from both angles
       * This is NOT the full AI analysis - it's a quick daily update (<120 words each)
       * with buy/hold/sell guidance based on current price, news, and context
       */
      async generateDailyBrief(params) {
        const { ticker, currentPrice, previousPrice, opportunityType = "buy", recentNews, previousAnalysis } = params;
        const [watchingBrief, owningBrief] = await Promise.all([
          this.generateSingleScenario({ ticker, currentPrice, previousPrice, opportunityType, userOwnsPosition: false, recentNews, previousAnalysis }),
          this.generateSingleScenario({ ticker, currentPrice, previousPrice, opportunityType, userOwnsPosition: true, recentNews, previousAnalysis })
        ]);
        return {
          watching: watchingBrief,
          owning: owningBrief
        };
      }
      /**
       * Internal helper to generate a single scenario (watching or owning)
       */
      async generateSingleScenario(params) {
        const { ticker, currentPrice, previousPrice, opportunityType, userOwnsPosition, recentNews, previousAnalysis } = params;
        const priceChange = currentPrice - previousPrice;
        const priceChangePercent = (priceChange / previousPrice * 100).toFixed(2);
        const isBuyOpportunity = opportunityType === "buy";
        const isSellOpportunity = opportunityType === "sell";
        const positionContext = isSellOpportunity ? userOwnsPosition ? `USER HAS A SHORT POSITION - Focus on COVERING STRATEGY (when to cover the short or hold it). This is a SHORTING analysis.` : `USER CONSIDERING SHORTING - Focus on SHORT ENTRY EVALUATION (should they open a short position now or wait?)` : userOwnsPosition ? `USER OWNS THIS STOCK - Focus on EXIT STRATEGY ONLY (when to sell or hold). NEVER recommend adding to position.` : `USER CONSIDERING ENTRY - Focus on ENTRY EVALUATION (should they enter now, wait, or avoid?)`;
        const opportunityContext = isBuyOpportunity ? "This is a BUY OPPORTUNITY - insiders recently BOUGHT shares, signaling potential upside." : "This is a SELL/SHORT OPPORTUNITY - insiders recently SOLD shares, signaling potential downside or weakness. Low AI score indicates company weakness, making this a good shorting candidate.";
        let trendContext = "";
        let signalScore = 50;
        let aiPlaybookContext = "";
        if (previousAnalysis) {
          signalScore = previousAnalysis.integratedScore ?? previousAnalysis.confidenceScore ?? 50;
          if (previousAnalysis.technicalAnalysis) {
            const tech = previousAnalysis.technicalAnalysis;
            const trend = tech.trend || "neutral";
            const momentum = tech.momentum || "weak";
            const techScore = typeof tech.score === "number" ? tech.score : 50;
            const signals = Array.isArray(tech.signals) ? tech.signals.slice(0, 3) : [];
            trendContext = `
TECHNICAL ANALYSIS (from latest AI playbook):
- Trend: ${trend}
- Momentum: ${momentum}
- Technical Score: ${techScore}/100
${signals.length > 0 ? `- Key Signals: ${signals.join(", ")}` : ""}`;
          }
          if (previousAnalysis.sentimentAnalysis) {
            const sentiment = previousAnalysis.sentimentAnalysis;
            trendContext += `
SENTIMENT ANALYSIS:
- Sentiment Trend: ${sentiment.trend || "neutral"}
- News Volume: ${sentiment.newsVolume || "low"}
- Sentiment Score: ${sentiment.score || 50}/100
${sentiment.keyThemes && sentiment.keyThemes.length > 0 ? `- Key Themes: ${sentiment.keyThemes.slice(0, 3).join(", ")}` : ""}`;
          }
          const analysisAge = previousAnalysis.analyzedAt ? Math.floor((Date.now() - new Date(previousAnalysis.analyzedAt).getTime()) / (1e3 * 60 * 60 * 24)) : null;
          let scorecardContext = "";
          if (previousAnalysis.scorecard) {
            const sc = previousAnalysis.scorecard;
            const sections = sc.sections || {};
            scorecardContext = `
SCORECARD BREAKDOWN (${sc.confidence?.toUpperCase() || "MEDIUM"} confidence):
- Global Score: ${sc.globalScore}/100
${sections.fundamentals ? `- Fundamentals: ${sections.fundamentals.score}/100 (${sections.fundamentals.weight}% weight)` : ""}
${sections.technicals ? `- Technicals: ${sections.technicals.score}/100 (${sections.technicals.weight}% weight)` : ""}
${sections.insiderActivity ? `- Insider Activity: ${sections.insiderActivity.score}/100 (${sections.insiderActivity.weight}% weight)` : ""}
${sections.newsSentiment ? `- News Sentiment: ${sections.newsSentiment.score}/100 (${sections.newsSentiment.weight}% weight)` : ""}
${sections.macroSector ? `- Macro/Sector: ${sections.macroSector.score}/100 (${sections.macroSector.weight}% weight)` : ""}
${sc.summary ? `SCORECARD SUMMARY: ${sc.summary}` : ""}`;
          }
          aiPlaybookContext = `
=== LATEST AI PLAYBOOK (${analysisAge !== null ? `${analysisAge} days old` : "date unknown"}) ===
INTEGRATED SIGNAL SCORE: ${signalScore}/100 ${signalScore >= 90 ? "\u{1F525} VERY HIGH CONVICTION" : signalScore >= 70 ? "\u26A1 HIGH CONVICTION" : signalScore >= 50 ? "\u27A1\uFE0F MODERATE" : "\u26A0\uFE0F LOW/CAUTIONARY"}
OVERALL RATING: ${previousAnalysis.overallRating?.toUpperCase() || "N/A"}
SUMMARY: ${previousAnalysis.summary || "No summary available"}
${previousAnalysis.recommendation ? `
AI RECOMMENDATION: ${previousAnalysis.recommendation}` : ""}
${scorecardContext}
${previousAnalysis.risks && previousAnalysis.risks.length > 0 ? `
KEY RISKS: ${previousAnalysis.risks.slice(0, 3).join("; ")}` : ""}
${previousAnalysis.opportunities && previousAnalysis.opportunities.length > 0 ? `
KEY OPPORTUNITIES: ${previousAnalysis.opportunities.slice(0, 3).join("; ")}` : ""}
=== END PLAYBOOK ===`;
        }
        let stanceRules;
        if (userOwnsPosition) {
          stanceRules = isBuyOpportunity ? `STANCE RULES for OWNED LONG POSITION (Buy Opportunity):
Use initial trend as baseline. Focus on WHEN TO EXIT or HOLD.

\u26A0\uFE0F CRITICAL: You can ONLY recommend "sell" or "hold" - NEVER "buy". This is exit strategy, not adding to position.

ACT (sell only):
- "sell" if price +5%+ AND initial trend weakening (take profit)
- "sell" if price -3%+ AND violates initial bullish trend (stop loss)

HOLD:
- Gains +1-4% with initial trend intact (let it run)
- Sideways action, initial trend neutral (wait for clarity)
- Price -2% to -4% but initial trend still bullish/moderate (don't panic sell on small dips)

Decision: SELL when trend confirms exit. HOLD when trend supports staying in. NEVER recommend "buy".` : `STANCE RULES for OWNED SHORT POSITION (Sell/Short Opportunity):
You have a SHORT position. Price DECLINE = your profit. Focus on COVERING strategy.

\u26A0\uFE0F CRITICAL: You can ONLY recommend "cover" or "hold" - NO OTHER VALUES.
- "cover" = Close/exit the short position NOW (buy back shares to cover)
- "hold" = Keep the short position open / Stay short

COVER (EXIT SHORT):
- "cover" if price -5%+ (take short profit on significant decline)
- "cover" if price +3%+ AND initial bearish trend reversing bullish (stop loss - trend against you)
- "cover" if strong bullish news violates bearish thesis (cut losses early)

HOLD (STAY SHORT):
- "hold" if price declining -1% to -4% with initial bearish trend intact (let it run down)
- "hold" if sideways action with initial trend still bearish/weak (wait for more decline)
- "hold" if price +1% to +2% (small rally) but initial trend still bearish (noise, not reversal)

Decision: "cover" when you've profited enough OR trend reversing against you. "hold" when bearish trend continues. For shorts, price FALLING = your gain.`;
        } else {
          const scoreGuidance = isBuyOpportunity ? signalScore >= 90 ? "\u{1F525} VERY HIGH SIGNAL (90-100): Be HIGHLY LENIENT on entry. Even minor dips or mixed signals should trigger entry. This is a premium opportunity." : signalScore >= 70 ? "\u26A1 HIGH SIGNAL (70-89): Be MODERATELY LENIENT on entry. Accept small pullbacks and minor concerns as buying opportunities." : signalScore >= 50 ? "\u27A1\uFE0F  MODERATE SIGNAL (50-69): Be BALANCED. Require confirmatory signals before entry. Don't rush but don't be overly cautious." : "\u26A0\uFE0F  LOW SIGNAL (<50): Be CAUTIOUS. Require strong technical confirmation and favorable price action. Consider avoiding entry unless setup is perfect." : signalScore <= 30 ? "\u{1F525} VERY HIGH SHORT SIGNAL (<30): Be HIGHLY LENIENT on short entry. Fundamental weakness confirmed. Even minor bearish signals should trigger short." : signalScore <= 50 ? "\u26A1 HIGH SHORT SIGNAL (30-50): Be MODERATELY LENIENT on short entry. Weakness evident, accept minor setups." : signalScore <= 70 ? "\u27A1\uFE0F  MODERATE SHORT SIGNAL (50-70): Be BALANCED. Require confirmatory bearish signals before shorting." : "\u26A0\uFE0F  LOW SHORT SIGNAL (>70): Be CAUTIOUS. Company looks strong, avoid shorting unless very strong bearish breakdown occurs.";
          stanceRules = isBuyOpportunity ? `STANCE RULES for ENTRY DECISION (Buy Opportunity):
${scoreGuidance}

\u26A0\uFE0F CRITICAL: You can ONLY choose "buy" or "hold" - NO OTHER VALUES.
- "buy" = Enter position / Take the opportunity NOW
- "hold" = Wait for better setup / Don't enter yet

SIGNAL SCORE-BASED ENTRY THRESHOLDS:
${signalScore >= 90 ? `
VERY HIGH SIGNAL (90-100) - AGGRESSIVE ENTRY:
BUY (ACT):
- "buy" if ANY bullish signal present (very lenient threshold)
- "buy" even if price down -2% to -5% (premium dip buying opportunity)
- "buy" if trend neutral but score this high (trust the signal)
HOLD (WAIT):
- "hold" ONLY if catastrophic news or price -8%+ breakdown invalidates thesis` : signalScore >= 70 ? `
HIGH SIGNAL (70-89) - LENIENT ENTRY:
BUY (ACT):
- "buy" if trend bullish/moderate + price stable or up
- "buy" if trend bullish + price -2% to -5% (good dip entry on high-quality signal)
- "buy" if trend neutral but price showing support (score gives benefit of doubt)
HOLD (WAIT):
- "hold" if trend bearish/weak despite high score (conflicting signals)
- "hold" if price -5%+ breakdown (too much risk even with good score)` : signalScore >= 50 ? `
MODERATE SIGNAL (50-69) - BALANCED ENTRY:
BUY (ACT):
- "buy" if trend bullish/strong + price stable or up
- "buy" if trend bullish/moderate + price -2% to -3% (small dip only)
HOLD (WAIT):
- "hold" if trend neutral (need stronger confirmation for moderate score)
- "hold" if price -4%+ (too much weakness for moderate signal)
- "hold" if conflicting signals or mixed price action` : `
LOW SIGNAL (<50) - CAUTIOUS ENTRY:
BUY (ACT):
- "buy" ONLY if trend bullish/strong + price +2%+ breakout (perfect setup required)
HOLD (WAIT):
- "hold" if ANY uncertainty, neutral trend, or negative price action
- "hold" if score this low indicates fundamental concerns (be very selective)`}

Decision: Weight the SIGNAL SCORE heavily. High scores deserve aggressive "buy", low scores lean toward "hold".` : `STANCE RULES for SHORT ENTRY DECISION (Sell/Short Opportunity):
${scoreGuidance}

\u26A0\uFE0F CRITICAL: You can ONLY choose "sell" or "hold" - NO OTHER VALUES.
- "sell" = Enter short position / Short this stock NOW
- "hold" = Wait for better short setup / Don't short yet

SIGNAL SCORE-BASED SHORT ENTRY THRESHOLDS:
${signalScore <= 30 ? `
VERY HIGH SHORT SIGNAL (<30) - AGGRESSIVE SHORT ENTRY:
SELL (SHORT):
- "sell" if ANY bearish signal present (very lenient threshold for weak companies)
- "sell" even if price up +2% to +5% (rally into resistance, premium shorting opportunity)
- "sell" if trend neutral but score this low (fundamental weakness overrides technical neutrality)
HOLD (WAIT):
- "hold" ONLY if surprise positive news or price +8%+ breakout invalidates bearish thesis` : signalScore <= 50 ? `
HIGH SHORT SIGNAL (30-50) - LENIENT SHORT ENTRY:
SELL (SHORT):
- "sell" if trend bearish/weak + price breaking down
- "sell" if trend bearish/moderate + price rallying +2% to +4% (short the bounce on weak stock)
- "sell" if trend neutral but price showing resistance (score supports short bias)
HOLD (WAIT):
- "hold" if trend bullish despite low score (conflicting signals, wait for breakdown)
- "hold" if price +5%+ breakout (too much momentum even for weak stock)` : signalScore <= 70 ? `
MODERATE SHORT SIGNAL (50-70) - BALANCED SHORT ENTRY:
SELL (SHORT):
- "sell" if trend bearish/strong + price breaking down
- "sell" if trend bearish/moderate + price +2% to +3% rally (small bounce only)
HOLD (WAIT):
- "hold" if trend neutral (need stronger bearish confirmation for moderate score)
- "hold" if price +4%+ (too much strength for moderate short signal)
- "hold" if conflicting signals or mixed price action` : `
LOW SHORT SIGNAL (>70) - VERY CAUTIOUS SHORT ENTRY:
SELL (SHORT):
- "sell" ONLY if trend bearish/strong + price -5%+ breakdown (perfect breakdown required on strong company)
HOLD (WAIT):
- "hold" if ANY bullish signals, neutral trend, or positive price action
- "hold" if score this high indicates strong fundamentals (avoid shorting unless exceptional setup)`}

Decision: Weight the SIGNAL SCORE heavily for shorts. Very low scores (<30) deserve aggressive "sell" (short), high scores (>70) lean toward "hold" (wait).`;
        }
        const prompt = `You are a NEAR-TERM TRADER (1-2 week horizon) providing actionable daily guidance for ${ticker}.

\u26A1 CRITICAL: This is SHORT-TERM TRADING, not long-term investing. Even small trends demand action.

${positionContext}

OPPORTUNITY TYPE: ${opportunityContext}

CURRENT STATUS:
- Current Price: $${currentPrice.toFixed(2)}
- Previous Close: $${previousPrice.toFixed(2)}  
- Change: ${priceChange >= 0 ? "+" : ""}$${priceChange.toFixed(2)} (${priceChangePercent}%)

${aiPlaybookContext}

${trendContext}

${recentNews && recentNews.length > 0 ? `FRESH NEWS (with sentiment scores -1 to +1):
${recentNews.slice(0, 5).map((n) => {
          const sentiment = typeof n.sentiment === "number" ? n.sentiment : 0;
          const sentimentLabel = sentiment > 0.2 ? "\u{1F4C8} POSITIVE" : sentiment < -0.2 ? "\u{1F4C9} NEGATIVE" : "\u27A1\uFE0F NEUTRAL";
          return `- ${n.title || "Untitled"} (${n.source || "Unknown"}, sentiment: ${sentimentLabel} ${sentiment.toFixed(2)})`;
        }).join("\n")}
` : "No significant news available"}

YOUR TASK: Provide an ACTION-ORIENTED brief (<120 words). Reference the AI PLAYBOOK insights and fresh news.
- Use the INTEGRATED SIGNAL SCORE as your primary conviction anchor
- Factor in the AI RECOMMENDATION when making your stance decision
- Consider any KEY RISKS or OPPORTUNITIES from the playbook
- Weight fresh news sentiment appropriately

${trendContext || aiPlaybookContext ? `
TREND-BASED DECISION MAKING:
The AI playbook provides your BASELINE conviction. Compare current price action against this baseline:
- If price action CONFIRMS the playbook thesis \u2192 Consider ACT stance
- If price action VIOLATES the playbook thesis (owned position) \u2192 Consider ACT stance (stop loss)
- If price action is NEUTRAL \u2192 Consider HOLD stance
` : ""}

${stanceRules}

BE DECISIVE. Near-term traders need action, not patience.

Return JSON in this EXACT format (no extra text, no markdown, pure JSON):
{
  "recommendedStance": "buy" | "hold" | "sell" | "cover",
  "confidence": 1-10,
  "briefText": "A concise summary under 120 words with your recommendation and reasoning. Focus on NEAR-TERM action.",
  "keyHighlights": ["2-3 bullet points highlighting key price movements, catalysts, or concerns"]
}

\u26A0\uFE0F CRITICAL STANCE VALUES:
- Watching a BUY opportunity: Use "buy" (enter now) or "hold" (wait for better setup)
- Watching a SELL opportunity: Use "sell" (short now) or "hold" (wait for better short setup)
- Owning a LONG position: Use "sell" (exit now) or "hold" (stay in position)
- Owning a SHORT position: Use "cover" (exit short/buy to cover) or "hold" (stay short)`;
        try {
          const messages = [{ role: "user", content: prompt }];
          const result = await generateWithFallback(currentProviderConfig2, messages, {
            temperature: 0.3,
            maxTokens: 500,
            responseFormat: "json"
          });
          if (result.usedFallback) {
            console.log(`[AIAnalysisService] \u26A0\uFE0F Daily brief used fallback: ${result.provider} (${result.model})`);
          }
          const cleanedContent = stripMarkdownCodeBlocks(result.content || "{}");
          const brief = JSON.parse(cleanedContent);
          const wordCount = brief.briefText?.split(/\s+/).length || 0;
          if (wordCount > 120) {
            console.warn(`[AIAnalysisService] Daily brief for ${ticker} exceeded 120 words (${wordCount}), truncating...`);
            const words = brief.briefText.split(/\s+/).slice(0, 120);
            brief.briefText = words.join(" ") + "...";
          }
          return brief;
        } catch (error) {
          console.error(`[AIAnalysisService] Error generating daily brief for ${ticker}:`, error);
          throw new Error(`Failed to generate daily brief for ${ticker}: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      }
      /**
       * Generate a rule-based scorecard with per-metric scoring
       * This provides explainable, consistent scoring across all stocks
       * 
       * The LLM evaluates each metric based on the rubric and provides:
       * 1. A measurement value (extracted from the data)
       * 2. A rule bucket (excellent/good/neutral/weak/poor/missing)
       * 3. A score (0-10)
       * 4. A brief rationale
       * 
       * The server then aggregates section and global scores deterministically.
       */
      async generateScorecard(params) {
        const { ticker } = params;
        const dataContext = this.buildScorecardDataContext(params);
        const rubricPrompt = generateScoringRubricPrompt();
        const prompt = `You are a quantitative analyst scoring a stock using a RULE-BASED scorecard.
Your job is to evaluate each metric according to the EXACT thresholds in the rubric.

STOCK: ${ticker}

${rubricPrompt}

=== AVAILABLE DATA FOR ${ticker} ===
${dataContext}

=== YOUR TASK ===
Score EACH metric according to the rubric. For each metric:
1. Extract the MEASUREMENT from the data (use "N/A" if not available)
2. Determine which RULE BUCKET it falls into (excellent/good/neutral/weak/poor)
3. Assign the corresponding SCORE (10/8/5/2/0)
4. Write a brief RATIONALE explaining why

CRITICAL: 
- If data is missing for a metric, set ruleBucket="missing" and score=0
- Use the EXACT threshold ranges from the rubric
- Be consistent - the same measurement should always get the same score

Return your evaluation as JSON with this EXACT structure:
{
  "fundamentals": {
    "revenueGrowth": { "measurement": <number or "N/A">, "ruleBucket": "excellent|good|neutral|weak|poor|missing", "score": 0-10, "rationale": "brief explanation" },
    "epsGrowth": { "measurement": <number or "N/A">, "ruleBucket": "...", "score": 0-10, "rationale": "..." },
    "profitMarginTrend": { "measurement": "condition string or N/A", "ruleBucket": "...", "score": 0-10, "rationale": "..." },
    "fcfToDebt": { "measurement": <number or "N/A">, "ruleBucket": "...", "score": 0-10, "rationale": "..." },
    "debtToEquity": { "measurement": <number or "N/A">, "ruleBucket": "...", "score": 0-10, "rationale": "..." }
  },
  "technicals": {
    "smaAlignment": { "measurement": "condition string", "ruleBucket": "...", "score": 0-10, "rationale": "..." },
    "rsiMomentum": { "measurement": "RSI value + direction", "ruleBucket": "...", "score": 0-10, "rationale": "..." },
    "macdSignal": { "measurement": "condition string", "ruleBucket": "...", "score": 0-10, "rationale": "..." },
    "volumeSurge": { "measurement": "Xx avg", "ruleBucket": "...", "score": 0-10, "rationale": "..." },
    "priceVsResistance": { "measurement": "condition string", "ruleBucket": "...", "score": 0-10, "rationale": "..." }
  },
  "insiderActivity": {
    "netBuyRatio": { "measurement": <percentage or "N/A">, "ruleBucket": "...", "score": 0-10, "rationale": "..." },
    "transactionRecency": { "measurement": <days or "N/A">, "ruleBucket": "...", "score": 0-10, "rationale": "..." },
    "transactionSize": { "measurement": <percentage or "N/A">, "ruleBucket": "...", "score": 0-10, "rationale": "..." },
    "insiderRole": { "measurement": "role description", "ruleBucket": "...", "score": 0-10, "rationale": "..." }
  },
  "newsSentiment": {
    "avgSentiment": { "measurement": <-1 to 1 or "N/A">, "ruleBucket": "...", "score": 0-10, "rationale": "..." },
    "sentimentMomentum": { "measurement": "trend description", "ruleBucket": "...", "score": 0-10, "rationale": "..." },
    "newsVolume": { "measurement": <count or "N/A">, "ruleBucket": "...", "score": 0-10, "rationale": "..." },
    "catalystPresence": { "measurement": "catalyst description", "ruleBucket": "...", "score": 0-10, "rationale": "..." }
  },
  "macroSector": {
    "sectorMomentum": { "measurement": <percentage or "N/A">, "ruleBucket": "...", "score": 0-10, "rationale": "..." },
    "macroRiskFlags": { "measurement": "risk description", "ruleBucket": "...", "score": 0-10, "rationale": "..." }
  },
  "summary": "One sentence summary of the overall scoring: what are the main strengths and weaknesses?"
}

REMEMBER: This is a 1-2 WEEK trading horizon. Weight short-term catalysts and momentum appropriately.`;
        try {
          console.log(`[AIAnalysisService] Generating scorecard for ${ticker} using ${currentProviderConfig2.provider}`);
          const messages = [{ role: "user", content: prompt }];
          const result = await generateWithFallback(currentProviderConfig2, messages, {
            temperature: 0.2,
            // Lower temperature for more consistent scoring
            maxTokens: 4096,
            responseFormat: "json"
          });
          if (result.usedFallback) {
            console.log(`[AIAnalysisService] \u26A0\uFE0F Scorecard used fallback: ${result.provider} (${result.model})`);
          }
          const cleanedContent2 = stripMarkdownCodeBlocks(result.content || "{}");
          const llmResponse = JSON.parse(cleanedContent2);
          return this.buildScorecardFromLLMResponse(llmResponse, ticker);
        } catch (error) {
          console.error(`[AIAnalysisService] Error generating scorecard for ${ticker}:`, error);
          throw new Error(`Failed to generate scorecard for ${ticker}: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      }
      /**
       * Build context string from available data for scorecard generation
       */
      buildScorecardDataContext(params) {
        const sections = [];
        if (params.fundamentals) {
          const f = params.fundamentals;
          sections.push(`FUNDAMENTALS:
- Revenue Growth YoY: ${f.revenueGrowthYoY !== void 0 ? f.revenueGrowthYoY + "%" : "N/A"}
- EPS Growth YoY: ${f.epsGrowthYoY !== void 0 ? f.epsGrowthYoY + "%" : "N/A"}
- Profit Margin Trend: ${f.profitMarginTrend || "N/A"}
- Free Cash Flow: ${f.freeCashFlow !== void 0 ? "$" + f.freeCashFlow.toLocaleString() : "N/A"}
- Total Debt: ${f.totalDebt !== void 0 ? "$" + f.totalDebt.toLocaleString() : "N/A"}
- Debt-to-Equity: ${f.debtToEquity !== void 0 ? f.debtToEquity.toFixed(2) : "N/A"}`);
        } else {
          sections.push("FUNDAMENTALS: No data available");
        }
        if (params.technicals) {
          const t = params.technicals;
          sections.push(`TECHNICALS:
- Current Price: ${t.currentPrice !== void 0 ? "$" + t.currentPrice.toFixed(2) : "N/A"}
- SMA5: ${t.sma5 !== void 0 ? "$" + t.sma5.toFixed(2) : "N/A"}
- SMA10: ${t.sma10 !== void 0 ? "$" + t.sma10.toFixed(2) : "N/A"}
- SMA20: ${t.sma20 !== void 0 ? "$" + t.sma20.toFixed(2) : "N/A"}
- RSI (14): ${t.rsi !== void 0 ? t.rsi.toFixed(1) : "N/A"} ${t.rsiDirection ? "(" + t.rsiDirection + ")" : ""}
- MACD Line: ${t.macdLine !== void 0 ? t.macdLine.toFixed(4) : "N/A"}
- MACD Signal: ${t.macdSignal !== void 0 ? t.macdSignal.toFixed(4) : "N/A"}
- MACD Histogram: ${t.macdHistogram !== void 0 ? t.macdHistogram.toFixed(4) : "N/A"}
- Volume vs 10-day Avg: ${t.volumeVsAvg !== void 0 ? t.volumeVsAvg.toFixed(2) + "x" : "N/A"}
- Price Confirmation: ${t.priceConfirmation !== void 0 ? t.priceConfirmation ? "Yes" : "No" : "N/A"}`);
        } else {
          sections.push("TECHNICALS: No data available");
        }
        if (params.insiderActivity) {
          const i = params.insiderActivity;
          sections.push(`INSIDER ACTIVITY:
- Net Buy Ratio (30d): ${i.netBuyRatio30d !== void 0 ? i.netBuyRatio30d + "%" : "N/A"}
- Days Since Last Transaction: ${i.daysSinceLastTransaction !== void 0 ? i.daysSinceLastTransaction : "N/A"}
- Transaction Size vs Float: ${i.transactionSizeVsFloat !== void 0 ? i.transactionSizeVsFloat + "%" : "N/A"}
- Insider Roles: ${i.insiderRoles && i.insiderRoles.length > 0 ? i.insiderRoles.join(", ") : "N/A"}`);
        } else {
          sections.push("INSIDER ACTIVITY: No data available");
        }
        if (params.newsSentiment) {
          const n = params.newsSentiment;
          sections.push(`NEWS SENTIMENT:
- Average Sentiment: ${n.avgSentiment !== void 0 ? n.avgSentiment.toFixed(2) : "N/A"}
- Sentiment Trend: ${n.sentimentTrend || "N/A"}
- News Count (7d): ${n.newsCount7d !== void 0 ? n.newsCount7d : "N/A"}
- Upcoming Catalyst: ${n.upcomingCatalyst || "N/A"}`);
        } else {
          sections.push("NEWS SENTIMENT: No data available");
        }
        if (params.macroSector) {
          const m = params.macroSector;
          sections.push(`MACRO/SECTOR:
- Sector vs SPY (10d): ${m.sectorVsSpy10d !== void 0 ? (m.sectorVsSpy10d >= 0 ? "+" : "") + m.sectorVsSpy10d + "%" : "N/A"}
- Macro Risk Environment: ${m.macroRiskEnvironment || "N/A"}`);
        } else {
          sections.push("MACRO/SECTOR: No data available");
        }
        return sections.join("\n\n");
      }
      /**
       * Build a full Scorecard object from LLM response
       * This function validates and normalizes the LLM output
       */
      buildScorecardFromLLMResponse(llmResponse, ticker) {
        const sections = {};
        for (const [sectionKey, sectionConfig] of Object.entries(scorecardConfig.sections)) {
          const llmSection = llmResponse[sectionKey] || {};
          const metrics = {};
          const missingMetrics = [];
          for (const [metricKey, metricConfig] of Object.entries(sectionConfig.metrics)) {
            const llmMetric = llmSection[metricKey] || {};
            const ruleBucket = this.normalizeRuleBucket(llmMetric.ruleBucket);
            const score = this.normalizeScore(llmMetric.score, ruleBucket);
            const measurement = llmMetric.measurement ?? null;
            if (ruleBucket === "missing") {
              missingMetrics.push(metricKey);
            }
            metrics[metricKey] = {
              name: metricConfig.name,
              measurement,
              ruleBucket,
              score,
              maxScore: 10,
              weight: metricConfig.weight,
              rationale: llmMetric.rationale || `${metricConfig.name}: ${measurement} \u2192 ${ruleBucket} (${score}/10)`
            };
          }
          sections[sectionKey] = {
            name: sectionConfig.name,
            weight: sectionConfig.weight,
            score: calculateSectionScore(metrics),
            maxScore: 100,
            metrics,
            missingMetrics
          };
        }
        const globalScore = calculateGlobalScore(sections);
        const confidence = determineConfidence(sections);
        let totalMissing = 0;
        let totalMetrics = 0;
        for (const section of Object.values(sections)) {
          totalMissing += section.missingMetrics.length;
          totalMetrics += Object.keys(section.metrics).length;
        }
        const missingDataPenalty = Math.round(totalMissing / totalMetrics * 100);
        const summaryParts = [];
        for (const section of Object.values(sections)) {
          const status = section.score >= 70 ? "\u2713" : section.score >= 40 ? "~" : "\u2717";
          summaryParts.push(`${section.name}: ${section.score} ${status}`);
        }
        const llmSummary = llmResponse.summary || "";
        return {
          version: SCORECARD_VERSION,
          tradingHorizon: scorecardConfig.tradingHorizon,
          computedAt: (/* @__PURE__ */ new Date()).toISOString(),
          sections,
          globalScore,
          maxGlobalScore: 100,
          missingDataPenalty,
          confidence,
          summary: `${ticker}: ${globalScore}/100 (${confidence} confidence). ${summaryParts.join(" | ")}. ${llmSummary}`
        };
      }
      /**
       * Normalize rule bucket from LLM response
       */
      normalizeRuleBucket(bucket) {
        if (!bucket) return "missing";
        const normalized = bucket.toLowerCase().trim();
        const validBuckets = ["excellent", "good", "neutral", "weak", "poor", "missing"];
        if (validBuckets.includes(normalized)) {
          return normalized;
        }
        if (normalized.includes("excellent") || normalized.includes("exceptional")) return "excellent";
        if (normalized.includes("good") || normalized.includes("strong")) return "good";
        if (normalized.includes("neutral") || normalized.includes("average")) return "neutral";
        if (normalized.includes("weak") || normalized.includes("below")) return "weak";
        if (normalized.includes("poor") || normalized.includes("bad")) return "poor";
        if (normalized.includes("missing") || normalized.includes("n/a") || normalized.includes("unavailable")) return "missing";
        return "neutral";
      }
      /**
       * Normalize score from LLM response
       */
      normalizeScore(score, ruleBucket) {
        if (ruleBucket === "missing") return 0;
        if (typeof score === "number" && !isNaN(score)) {
          return Math.max(0, Math.min(10, Math.round(score)));
        }
        if (typeof score === "string") {
          const parsed = parseFloat(score);
          if (!isNaN(parsed)) {
            return Math.max(0, Math.min(10, Math.round(parsed)));
          }
        }
        const bucketDefaults = {
          excellent: 10,
          good: 8,
          neutral: 5,
          weak: 2,
          poor: 0,
          missing: 0
        };
        return bucketDefaults[ruleBucket] || 5;
      }
    };
    aiAnalysisService = new AIAnalysisService();
  }
});

// server/jobs/generateTickerDailyBriefs.ts
async function waitForAnalysis(storage2, ticker, maxWaitMs = MAX_ANALYSIS_WAIT_MS) {
  const startTime = Date.now();
  while (Date.now() - startTime < maxWaitMs) {
    const analysis = await storage2.getStockAnalysis(ticker);
    if (analysis && analysis.status === "completed") {
      return analysis;
    }
    if (analysis && analysis.status === "failed") {
      console.log(`[TickerDailyBriefs] Analysis failed for ${ticker}`);
      return null;
    }
    await new Promise((resolve) => setTimeout(resolve, ANALYSIS_POLL_INTERVAL_MS));
  }
  console.log(`[TickerDailyBriefs] Timeout waiting for analysis for ${ticker}`);
  return null;
}
async function runTickerDailyBriefGeneration(storage2) {
  const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  try {
    console.log("[TickerDailyBriefs] Starting daily brief generation...");
    const opportunities2 = await storage2.getOpportunities({ cadence: "all" });
    const tickerToOpportunities = /* @__PURE__ */ new Map();
    for (const opp of opportunities2) {
      const ticker = opp.ticker.toUpperCase();
      if (!tickerToOpportunities.has(ticker)) {
        tickerToOpportunities.set(ticker, []);
      }
      tickerToOpportunities.get(ticker).push(opp);
    }
    const uniqueTickers = Array.from(tickerToOpportunities.keys());
    console.log(`[TickerDailyBriefs] Found ${uniqueTickers.length} unique tickers to process`);
    let briefsGenerated = 0;
    let opportunitiesRemoved = 0;
    let analysisQueued = 0;
    let analysisRefreshed = 0;
    let skippedCount = 0;
    let errorCount = 0;
    for (const ticker of uniqueTickers) {
      try {
        const existingBrief = await storage2.getLatestTickerBrief(ticker);
        if (existingBrief && existingBrief.briefDate === today) {
          skippedCount++;
          continue;
        }
        let needsWait = false;
        try {
          await storage2.enqueueAnalysisJob(ticker, "daily_brief_refresh", "high");
          analysisQueued++;
          needsWait = true;
        } catch (queueError) {
          const existingAnalysis = await storage2.getStockAnalysis(ticker);
          if (existingAnalysis && (existingAnalysis.status === "pending" || existingAnalysis.status === "processing")) {
            needsWait = true;
          }
        }
        let analysis = null;
        if (needsWait) {
          console.log(`[TickerDailyBriefs] Waiting for fresh analysis for ${ticker}...`);
          analysis = await waitForAnalysis(storage2, ticker);
          if (analysis) {
            analysisRefreshed++;
          }
        } else {
          const existing = await storage2.getStockAnalysis(ticker);
          if (existing && existing.status === "completed") {
            analysis = existing;
          }
        }
        if (!analysis) {
          skippedCount++;
          continue;
        }
        const previousScore = existingBrief?.newSignalScore ?? null;
        const currentScore = analysis.integratedScore ?? analysis.confidenceScore ?? 0;
        const scoreChange = previousScore !== null ? currentScore - previousScore : null;
        let priceSnapshot = "0";
        let priceChange = null;
        let priceChangePercent = null;
        try {
          const quote = await stockService.getQuote(ticker);
          priceSnapshot = quote.price.toFixed(2);
          priceChange = quote.change.toFixed(2);
          priceChangePercent = quote.changePercent.toFixed(2);
        } catch (priceError) {
          console.error(`[TickerDailyBriefs] Failed to get quote for ${ticker}:`, priceError);
        }
        let newsImpact = null;
        let newsHeadlines = [];
        try {
          const newsSentiment = await stockService.getNewsSentiment(ticker);
          const oneDayAgo = /* @__PURE__ */ new Date();
          oneDayAgo.setDate(oneDayAgo.getDate() - 1);
          const recentNews = newsSentiment.articles.filter((a) => {
            const pubDate = a.publishedAt ? /* @__PURE__ */ new Date(
              a.publishedAt.substring(0, 4) + "-" + a.publishedAt.substring(4, 6) + "-" + a.publishedAt.substring(6, 8)
            ) : null;
            return pubDate && pubDate >= oneDayAgo;
          });
          if (recentNews.length > 0) {
            newsHeadlines = recentNews.slice(0, 3).map((a) => a.title);
            const avgSentiment = recentNews.reduce((sum, a) => sum + a.sentiment, 0) / recentNews.length;
            newsImpact = avgSentiment > 0.1 ? "positive" : avgSentiment < -0.1 ? "negative" : "neutral";
          }
        } catch (newsError) {
          console.error(`[TickerDailyBriefs] Failed to get news for ${ticker}:`, newsError);
        }
        let newInsiderTransactions = false;
        let insiderSummary = "";
        const tickerOpportunities = tickerToOpportunities.get(ticker) || [];
        const recentOpps = tickerOpportunities.filter((opp) => {
          if (!opp.insiderTradeDate) return false;
          const tradeDate = new Date(opp.insiderTradeDate);
          const threeDaysAgo = /* @__PURE__ */ new Date();
          threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
          return tradeDate >= threeDaysAgo;
        });
        if (recentOpps.length > 0) {
          newInsiderTransactions = true;
          const latestOpp2 = recentOpps[0];
          insiderSummary = `${latestOpp2.insiderName || "Insider"} ${latestOpp2.recommendation === "BUY" ? "bought" : "sold"} shares at $${latestOpp2.insiderPrice || "N/A"}`;
        }
        if (currentScore < SIGNAL_SCORE_THRESHOLD) {
          for (const opp of tickerOpportunities) {
            console.log(`[TickerDailyBriefs] ${ticker} score ${currentScore} < ${SIGNAL_SCORE_THRESHOLD}, removing from global opportunities`);
            await storage2.deleteOpportunity(opp.id);
            opportunitiesRemoved++;
          }
        }
        let stance;
        if (currentScore >= 70) {
          stance = "ENTER";
        } else if (currentScore >= 50) {
          stance = "WATCH";
        } else {
          stance = "AVOID";
        }
        const previousStance = existingBrief?.stance;
        const stanceChanged = previousStance ? stance !== previousStance : false;
        let briefText = "";
        briefText += `Signal Score: ${currentScore}/100`;
        if (scoreChange !== null && scoreChange !== 0) {
          briefText += ` (${scoreChange > 0 ? "+" : ""}${scoreChange})`;
        }
        briefText += `. Stance: ${stance}. `;
        if (priceChange && priceChangePercent) {
          const priceDir = parseFloat(priceChange) >= 0 ? "up" : "down";
          briefText += `Price ${priceDir} ${Math.abs(parseFloat(priceChangePercent))}% to $${priceSnapshot}. `;
        }
        if (newInsiderTransactions && insiderSummary) {
          briefText += `Recent insider: ${insiderSummary}. `;
        }
        if (newsHeadlines.length > 0) {
          briefText += `News: "${newsHeadlines[0]}"`;
          if (newsHeadlines.length > 1) {
            briefText += ` (+${newsHeadlines.length - 1} more)`;
          }
          briefText += ". ";
        }
        if (analysis.recommendation) {
          const playbookExcerpt = analysis.recommendation.substring(0, 150);
          briefText += `Playbook: ${playbookExcerpt}`;
          if (analysis.recommendation.length > 150) briefText += "...";
        }
        const keyUpdates = [];
        if (scoreChange !== null && Math.abs(scoreChange) >= 5) {
          keyUpdates.push(`Score ${scoreChange > 0 ? "increased" : "decreased"} by ${Math.abs(scoreChange)} points`);
        }
        if (stanceChanged) {
          keyUpdates.push(`Stance changed from ${previousStance} to ${stance}`);
        }
        if (newInsiderTransactions) {
          keyUpdates.push("New insider transaction detected");
        }
        if (priceChangePercent && Math.abs(parseFloat(priceChangePercent)) >= 3) {
          keyUpdates.push(`Significant price move: ${priceChangePercent}%`);
        }
        if (newsHeadlines.length > 0) {
          keyUpdates.push(`${newsHeadlines.length} news article${newsHeadlines.length > 1 ? "s" : ""} in last 24h`);
        }
        let priceSinceInsider = null;
        const latestOpp = tickerOpportunities[0];
        if (latestOpp?.insiderPrice && priceSnapshot !== "0") {
          const insiderPrice = parseFloat(latestOpp.insiderPrice);
          const currentPrice = parseFloat(priceSnapshot);
          if (insiderPrice > 0) {
            const pctChange = ((currentPrice - insiderPrice) / insiderPrice * 100).toFixed(2);
            priceSinceInsider = pctChange;
          }
        }
        const brief = {
          ticker,
          briefDate: today,
          priceSnapshot,
          priceChange,
          priceChangePercent,
          priceSinceInsider,
          previousSignalScore: previousScore,
          newSignalScore: currentScore,
          scoreChange,
          scoreChangeReason: scoreChange !== null && scoreChange !== 0 ? `Score changed due to updated market conditions and analysis` : null,
          stance,
          stanceChanged,
          briefText,
          keyUpdates,
          newInsiderTransactions,
          newsImpact,
          priceActionAssessment: priceChangePercent ? parseFloat(priceChangePercent) >= 3 ? "strong_up" : parseFloat(priceChangePercent) <= -3 ? "strong_down" : parseFloat(priceChangePercent) >= 0 ? "slight_up" : "slight_down" : null,
          stopLossHit: false,
          profitTargetHit: false
        };
        await storage2.createTickerDailyBrief(brief);
        briefsGenerated++;
        console.log(`[TickerDailyBriefs] Generated brief for ${ticker}: score ${currentScore}, price $${priceSnapshot}, ${newsHeadlines.length} news items`);
        await new Promise((resolve) => setTimeout(resolve, 1e3));
      } catch (error) {
        errorCount++;
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        console.error(`[TickerDailyBriefs] Error processing ${ticker}: ${errorMsg}`);
      }
    }
    console.log(`[TickerDailyBriefs] Job complete:`);
    console.log(`  \u2022 Briefs generated: ${briefsGenerated}`);
    console.log(`  \u2022 Opportunities removed (low score): ${opportunitiesRemoved}`);
    console.log(`  \u2022 Analysis jobs queued: ${analysisQueued}`);
    console.log(`  \u2022 Analyses refreshed: ${analysisRefreshed}`);
    console.log(`  \u2022 Skipped: ${skippedCount}`);
    console.log(`  \u2022 Errors: ${errorCount}`);
  } catch (error) {
    console.error("[TickerDailyBriefs] Error in daily brief job:", error);
  }
}
function startTickerDailyBriefScheduler(storage2) {
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1e3;
  function msUntilMidnightUTC() {
    const now = /* @__PURE__ */ new Date();
    const midnight = new Date(now);
    midnight.setUTCHours(24, 0, 0, 0);
    return midnight.getTime() - now.getTime();
  }
  const msToMidnight = msUntilMidnightUTC();
  console.log(`[TickerDailyBriefs] Scheduler will run at midnight UTC (in ${Math.round(msToMidnight / 6e4)} minutes)`);
  setTimeout(() => {
    runTickerDailyBriefGeneration(storage2).catch((err) => {
      console.error("[TickerDailyBriefs] Midnight run failed:", err);
    });
    setInterval(() => {
      runTickerDailyBriefGeneration(storage2).catch((err) => {
        console.error("[TickerDailyBriefs] Scheduled generation failed:", err);
      });
    }, TWENTY_FOUR_HOURS);
  }, msToMidnight);
  console.log("[TickerDailyBriefs] Scheduler started - runs at midnight UTC daily");
}
var SIGNAL_SCORE_THRESHOLD, MAX_ANALYSIS_WAIT_MS, ANALYSIS_POLL_INTERVAL_MS;
var init_generateTickerDailyBriefs = __esm({
  "server/jobs/generateTickerDailyBriefs.ts"() {
    "use strict";
    init_stockService();
    SIGNAL_SCORE_THRESHOLD = 70;
    MAX_ANALYSIS_WAIT_MS = 12e4;
    ANALYSIS_POLL_INTERVAL_MS = 5e3;
  }
});

// package.json
var require_package = __commonJS({
  "package.json"(exports, module) {
    module.exports = {
      name: "rest-express",
      version: "1.0.0",
      type: "module",
      license: "MIT",
      scripts: {
        dev: "NODE_ENV=development tsx server/index.ts",
        build: "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
        start: "NODE_ENV=production node dist/index.js",
        check: "tsc",
        "db:push": "drizzle-kit push",
        test: "vitest",
        "test:coverage": "vitest --coverage",
        "test:watch": "vitest --watch",
        "test:e2e": "playwright test",
        "test:e2e:ui": "playwright test --ui",
        "test:e2e:headed": "playwright test --headed",
        "test:e2e:report": "playwright show-report"
      },
      dependencies: {
        "@google/genai": "^1.30.0",
        "@hookform/resolvers": "^3.10.0",
        "@inquirer/prompts": "^7.9.0",
        "@jridgewell/trace-mapping": "^0.3.31",
        "@neondatabase/serverless": "^0.10.4",
        "@paypal/checkout-server-sdk": "^1.0.3",
        "@radix-ui/react-accordion": "^1.2.12",
        "@radix-ui/react-alert-dialog": "^1.1.15",
        "@radix-ui/react-aspect-ratio": "^1.1.7",
        "@radix-ui/react-avatar": "^1.1.10",
        "@radix-ui/react-checkbox": "^1.3.3",
        "@radix-ui/react-collapsible": "^1.1.12",
        "@radix-ui/react-context-menu": "^2.2.16",
        "@radix-ui/react-dialog": "^1.1.15",
        "@radix-ui/react-dropdown-menu": "^2.1.16",
        "@radix-ui/react-hover-card": "^1.1.15",
        "@radix-ui/react-label": "^2.1.7",
        "@radix-ui/react-menubar": "^1.1.16",
        "@radix-ui/react-navigation-menu": "^1.2.14",
        "@radix-ui/react-popover": "^1.1.15",
        "@radix-ui/react-progress": "^1.1.7",
        "@radix-ui/react-radio-group": "^1.3.8",
        "@radix-ui/react-scroll-area": "^1.2.10",
        "@radix-ui/react-select": "^2.2.6",
        "@radix-ui/react-separator": "^1.1.7",
        "@radix-ui/react-slider": "^1.3.6",
        "@radix-ui/react-slot": "^1.2.3",
        "@radix-ui/react-switch": "^1.2.6",
        "@radix-ui/react-tabs": "^1.1.13",
        "@radix-ui/react-toast": "^1.2.15",
        "@radix-ui/react-toggle": "^1.1.10",
        "@radix-ui/react-toggle-group": "^1.1.11",
        "@radix-ui/react-tooltip": "^1.2.8",
        "@sentry/node": "^10.32.1",
        "@sentry/profiling-node": "^10.32.1",
        "@sentry/react": "^10.32.1",
        "@tanstack/react-query": "^5.90.6",
        "@types/bcryptjs": "^2.4.6",
        "@types/node-telegram-bot-api": "^0.64.12",
        "@types/pg": "^8.16.0",
        "@vitest/ui": "^4.0.8",
        axios: "^1.13.1",
        bcryptjs: "^3.0.3",
        bullmq: "^5.66.4",
        "class-variance-authority": "^0.7.1",
        clsx: "^2.1.1",
        cmdk: "^1.1.1",
        "connect-pg-simple": "^10.0.0",
        cookie: "^1.0.2",
        "date-fns": "^3.6.0",
        "disposable-email-domains": "^1.0.62",
        "drizzle-orm": "^0.39.3",
        "drizzle-zod": "^0.7.1",
        "embla-carousel-react": "^8.6.0",
        express: "^4.21.2",
        "express-rate-limit": "^8.2.1",
        "express-session": "^1.18.2",
        "framer-motion": "^11.18.2",
        input: "^1.0.1",
        "input-otp": "^1.4.2",
        ioredis: "^5.8.2",
        "lucide-react": "^0.453.0",
        memorystore: "^1.6.7",
        "next-themes": "^0.4.6",
        "node-telegram-bot-api": "^0.66.0",
        openai: "^6.7.0",
        passport: "^0.7.0",
        "passport-local": "^1.0.0",
        pg: "^8.16.3",
        pino: "^10.1.0",
        "pino-pretty": "^13.1.3",
        "rate-limiter-flexible": "^9.0.1",
        react: "^18.3.1",
        "react-day-picker": "^8.10.1",
        "react-dom": "^18.3.1",
        "react-hook-form": "^7.66.0",
        "react-icons": "^5.5.0",
        "react-joyride": "^2.9.3",
        "react-resizable-panels": "^2.1.9",
        recharts: "^2.15.4",
        redis: "^5.10.0",
        resend: "^4.0.0",
        "rss-parser": "^3.13.0",
        "tailwind-merge": "^2.6.0",
        "tailwindcss-animate": "^1.0.7",
        telegram: "^2.26.22",
        "tw-animate-css": "^1.4.0",
        vaul: "^1.1.2",
        vitest: "^4.0.8",
        wouter: "^3.7.1",
        ws: "^8.18.3",
        zod: "^3.25.76",
        "zod-validation-error": "^3.5.3"
      },
      devDependencies: {
        "@replit/vite-plugin-cartographer": "^0.4.1",
        "@replit/vite-plugin-dev-banner": "^0.1.1",
        "@replit/vite-plugin-runtime-error-modal": "^0.0.3",
        "@tailwindcss/typography": "^0.5.15",
        "@tailwindcss/vite": "^4.1.3",
        "@types/connect-pg-simple": "^7.0.3",
        "@types/express": "4.17.21",
        "@types/express-session": "^1.18.0",
        "@types/node": "20.16.11",
        "@types/passport": "^1.0.16",
        "@types/passport-local": "^1.0.38",
        "@types/react": "^18.3.11",
        "@types/react-dom": "^18.3.1",
        "@types/ws": "^8.5.13",
        "@vitejs/plugin-react": "^4.7.0",
        autoprefixer: "^10.4.20",
        "drizzle-kit": "^0.31.4",
        esbuild: "^0.25.0",
        postcss: "^8.4.47",
        tailwindcss: "^3.4.17",
        tsx: "^4.20.5",
        typescript: "5.6.3",
        vite: "^5.4.20"
      },
      optionalDependencies: {
        bufferutil: "^4.0.8"
      }
    };
  }
});

// server/macroAgentService.ts
var macroAgentService_exports = {};
__export(macroAgentService_exports, {
  integrateScores: () => integrateScores,
  runMacroAnalysis: () => runMacroAnalysis,
  setMacroProviderConfig: () => setMacroProviderConfig
});
import OpenAI4 from "openai";
function setMacroProviderConfig(config) {
  console.log(`[MacroAgent] Setting AI provider to: ${config.provider}`);
  currentProviderConfig3 = config;
}
async function fetchMarketNewsSentiment() {
  try {
    const response = await fetch(
      `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&topics=economy_macro,technology,finance&limit=10&apikey=${ALPHA_VANTAGE_API_KEY}`
    );
    await new Promise((resolve) => setTimeout(resolve, 1e3));
    const data = await response.json();
    if (!data.feed || !Array.isArray(data.feed)) {
      return [];
    }
    return data.feed.slice(0, 5).map((item) => ({
      title: item.title || "",
      snippet: item.summary?.substring(0, 150) || "",
      sentiment: item.overall_sentiment_label || "neutral"
    }));
  } catch (error) {
    console.warn("[MacroAgent] Market news fetch failed:", error);
    return [];
  }
}
async function fetchEconomicIndicators() {
  try {
    const delays = [0, 900, 1800, 2700];
    const [fedData, cpiData, unemploymentData, gdpData] = await Promise.all([
      // Fed Funds Rate
      (async () => {
        await new Promise((resolve) => setTimeout(resolve, delays[0]));
        const response = await fetch(
          `https://www.alphavantage.co/query?function=FEDERAL_FUNDS_RATE&apikey=${ALPHA_VANTAGE_API_KEY}`
        );
        return response.json();
      })(),
      // CPI (inflation)
      (async () => {
        await new Promise((resolve) => setTimeout(resolve, delays[1]));
        const response = await fetch(
          `https://www.alphavantage.co/query?function=CPI&apikey=${ALPHA_VANTAGE_API_KEY}`
        );
        return response.json();
      })(),
      // Unemployment
      (async () => {
        await new Promise((resolve) => setTimeout(resolve, delays[2]));
        const response = await fetch(
          `https://www.alphavantage.co/query?function=UNEMPLOYMENT&apikey=${ALPHA_VANTAGE_API_KEY}`
        );
        return response.json();
      })(),
      // Real GDP
      (async () => {
        await new Promise((resolve) => setTimeout(resolve, delays[3]));
        const response = await fetch(
          `https://www.alphavantage.co/query?function=REAL_GDP&apikey=${ALPHA_VANTAGE_API_KEY}`
        );
        return response.json();
      })()
    ]);
    await new Promise((resolve) => setTimeout(resolve, 1e3));
    return {
      fedFundsRate: fedData.data?.[0]?.value ? parseFloat(fedData.data[0].value) : void 0,
      inflationRate: cpiData.data?.[0]?.value ? parseFloat(cpiData.data[0].value) : void 0,
      unemploymentRate: unemploymentData.data?.[0]?.value ? parseFloat(unemploymentData.data[0].value) : void 0,
      gdpGrowth: gdpData.data?.[0]?.value ? parseFloat(gdpData.data[0].value) : void 0
    };
  } catch (error) {
    console.warn("[MacroAgent] Economic indicators fetch failed:", error);
    return {};
  }
}
async function fetchMarketIndices() {
  console.log("[MacroAgent] Fetching market indices...");
  try {
    const sp500Response = await fetch(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=SPY&apikey=${ALPHA_VANTAGE_API_KEY}`
    );
    await new Promise((resolve) => setTimeout(resolve, 1e3));
    const sp500Data = await sp500Response.json();
    const sp500Price = parseFloat(sp500Data["Global Quote"]?.["05. price"] || "0");
    const sp500Change = parseFloat(sp500Data["Global Quote"]?.["10. change percent"]?.replace("%", "") || "0");
    const vixResponse = await fetch(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=^VIX&apikey=${ALPHA_VANTAGE_API_KEY}`
    );
    await new Promise((resolve) => setTimeout(resolve, 1e3));
    const vixData = await vixResponse.json();
    const vixLevel = parseFloat(vixData["Global Quote"]?.["05. price"] || "20");
    const sectors = [
      { symbol: "XLK", name: "Technology" },
      { symbol: "XLF", name: "Financials" },
      { symbol: "XLE", name: "Energy" },
      { symbol: "XLV", name: "Healthcare" },
      { symbol: "XLI", name: "Industrials" }
    ];
    const sectorPerformance = await Promise.all(
      sectors.map(async (sector) => {
        const response = await fetch(
          `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${sector.symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`
        );
        await new Promise((resolve) => setTimeout(resolve, 1e3));
        const data = await response.json();
        const change = parseFloat(data["Global Quote"]?.["10. change percent"]?.replace("%", "") || "0");
        const currentPrice = parseFloat(data["Global Quote"]?.["05. price"] || "0");
        return {
          sector: sector.name,
          etfSymbol: sector.symbol,
          performance: Math.abs(change) > 1 ? change > 0 ? "strong" : "weak" : "moderate",
          trend: change > 0.5 ? "up" : change < -0.5 ? "down" : "flat",
          currentPrice: currentPrice > 0 ? currentPrice : void 0,
          changePercent: change
        };
      })
    );
    console.log("[MacroAgent] Fetching economic indicators and market news...");
    const [economicIndicators, webNews] = await Promise.all([
      fetchEconomicIndicators(),
      fetchMarketNewsSentiment()
    ]);
    return {
      sp500: {
        level: sp500Price,
        change: sp500Change,
        trend: sp500Change > 1 ? "bullish" : sp500Change < -1 ? "bearish" : "neutral"
      },
      vix: {
        level: vixLevel,
        interpretation: vixLevel < 15 ? "low_fear" : vixLevel < 20 ? "moderate_fear" : vixLevel < 30 ? "high_fear" : "extreme_fear"
      },
      sectorPerformance,
      economicIndicators,
      webNews: webNews.length > 0 ? webNews : void 0
    };
  } catch (error) {
    console.error("[MacroAgent] Error fetching market data:", error);
    throw error;
  }
}
function normalizeIndustry(industry) {
  if (!industry || industry === "N/A") return null;
  return industry.toLowerCase().trim();
}
function calculateStdDev(values) {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squaredDiffs = values.map((val) => Math.pow(val - mean, 2));
  const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  return Math.sqrt(variance);
}
async function fetchDetailedETFData(etfSymbol, sp500Change) {
  try {
    console.log(`[MacroAgent] Fetching detailed data for ${etfSymbol}...`);
    const response = await fetch(
      `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${etfSymbol}&apikey=${ALPHA_VANTAGE_API_KEY}&outputsize=compact`
    );
    await new Promise((resolve) => setTimeout(resolve, 1e3));
    const data = await response.json();
    const timeSeries = data["Time Series (Daily)"];
    if (!timeSeries) {
      console.warn(`[MacroAgent] No time series data for ${etfSymbol}`);
      return null;
    }
    const dates = Object.keys(timeSeries).sort().reverse();
    if (dates.length < 22) {
      console.warn(`[MacroAgent] Insufficient data for ${etfSymbol}`);
      return null;
    }
    const prices = dates.map((date) => parseFloat(timeSeries[date]["4. close"]));
    const currentPrice = prices[0];
    const weekAgoPrice = prices[5] || prices[prices.length - 1];
    const monthAgoPrice = prices[21] || prices[prices.length - 1];
    const dayChange = (currentPrice - prices[1]) / prices[1] * 100;
    const weekChange = (currentPrice - weekAgoPrice) / weekAgoPrice * 100;
    const monthChange = (currentPrice - monthAgoPrice) / monthAgoPrice * 100;
    const returns = [];
    for (let i = 0; i < Math.min(21, prices.length - 1); i++) {
      returns.push((prices[i] - prices[i + 1]) / prices[i + 1] * 100);
    }
    const volatility = calculateStdDev(returns) * Math.sqrt(252);
    const relativeStrength = dayChange - sp500Change;
    const recentReturns = returns.slice(0, 5);
    const momentum = recentReturns.reduce((sum, r) => sum + r, 0) / recentReturns.length;
    return {
      currentPrice,
      dayChange,
      weekChange,
      monthChange,
      volatility,
      relativeStrength,
      momentum
    };
  } catch (error) {
    console.warn(`[MacroAgent] Error fetching detailed data for ${etfSymbol}:`, error);
    return null;
  }
}
async function runMacroAnalysis(industry) {
  const industryLabel = industry || "General Market";
  console.log(`[MacroAgent] Starting macro economic analysis for ${industryLabel}...`);
  let sanitizedResponse = "";
  try {
    const marketData = await fetchMarketIndices();
    let industrySectorAnalysis = void 0;
    const normalizedIndustry = normalizeIndustry(industry);
    if (normalizedIndustry && INDUSTRY_ETF_MAP[normalizedIndustry]) {
      const etfSymbol = INDUSTRY_ETF_MAP[normalizedIndustry];
      console.log(`[MacroAgent] Fetching detailed sector data for ${industry} \u2192 ${normalizedIndustry} (${etfSymbol})...`);
      const detailedData = await fetchDetailedETFData(etfSymbol, marketData.sp500.change);
      if (detailedData) {
        const normalizedRS = (detailedData.relativeStrength + 3) / 6 * 50;
        const relativeStrengthWeight = Math.min(Math.max(normalizedRS, 0), 50);
        const normalizedMomentum = (detailedData.momentum + 1.5) / 3 * 30;
        const momentumWeight = Math.min(Math.max(normalizedMomentum, 0), 30);
        const normalizedVolatility = (40 - detailedData.volatility) / 30 * 20;
        const volatilityWeight = Math.min(Math.max(normalizedVolatility, 0), 20);
        const sectorWeight = Math.round(relativeStrengthWeight + momentumWeight + volatilityWeight);
        console.log(`[MacroAgent] Sector Weight Calculation for ${etfSymbol}:`);
        console.log(`  - Relative Strength: ${detailedData.relativeStrength.toFixed(2)}% \u2192 ${relativeStrengthWeight.toFixed(1)} pts (max 50)`);
        console.log(`  - Momentum: ${detailedData.momentum.toFixed(2)}% \u2192 ${momentumWeight.toFixed(1)} pts (max 30)`);
        console.log(`  - Volatility: ${detailedData.volatility.toFixed(1)}% \u2192 ${volatilityWeight.toFixed(1)} pts (max 20)`);
        console.log(`  - Total Sector Weight: ${sectorWeight}/100`);
        const sectorExplanation = `${industry} sector (${etfSymbol}) is ${detailedData.relativeStrength > 1 ? "significantly outperforming" : detailedData.relativeStrength > 0 ? "slightly outperforming" : detailedData.relativeStrength > -1 ? "slightly underperforming" : "significantly underperforming"} the broader market with ${detailedData.relativeStrength > 0 ? "+" : ""}${detailedData.relativeStrength.toFixed(2)}% relative strength. ${detailedData.momentum > 0.5 ? "Strong positive" : detailedData.momentum > 0 ? "Moderate positive" : detailedData.momentum > -0.5 ? "Weak negative" : "Strong negative"} momentum (${detailedData.momentum.toFixed(2)}%). Volatility is ${detailedData.volatility > 25 ? "elevated" : detailedData.volatility > 15 ? "moderate" : "low"} at ${detailedData.volatility.toFixed(1)}% annualized. Sector weight: ${sectorWeight}/100 (${sectorWeight > 70 ? "high influence" : sectorWeight > 40 ? "moderate influence" : "low influence"} on analysis).`;
        industrySectorAnalysis = {
          etfSymbol,
          sectorName: industry || "Unknown",
          currentPrice: detailedData.currentPrice,
          dayChange: detailedData.dayChange,
          weekChange: detailedData.weekChange,
          monthChange: detailedData.monthChange,
          volatility: detailedData.volatility,
          relativeStrength: detailedData.relativeStrength,
          momentum: detailedData.momentum,
          sectorWeight,
          sectorExplanation
        };
        console.log(`[MacroAgent] Sector Analysis: ${sectorExplanation}`);
      }
    }
    const industryContext = industrySectorAnalysis ? `

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
INDUSTRY-SPECIFIC SECTOR ANALYSIS FOR: ${industry}
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

SECTOR ETF: ${industrySectorAnalysis.etfSymbol} - ${industrySectorAnalysis.sectorName}

PERFORMANCE METRICS:
- Current Price: $${industrySectorAnalysis.currentPrice.toFixed(2)}
- Daily Change: ${industrySectorAnalysis.dayChange > 0 ? "+" : ""}${industrySectorAnalysis.dayChange.toFixed(2)}%
- Week Change: ${industrySectorAnalysis.weekChange > 0 ? "+" : ""}${industrySectorAnalysis.weekChange.toFixed(2)}%
- Month Change: ${industrySectorAnalysis.monthChange > 0 ? "+" : ""}${industrySectorAnalysis.monthChange.toFixed(2)}%

SECTOR STRENGTH ANALYSIS:
- Relative Strength vs S&P 500: ${industrySectorAnalysis.relativeStrength > 0 ? "+" : ""}${industrySectorAnalysis.relativeStrength.toFixed(2)}% ${industrySectorAnalysis.relativeStrength > 1 ? "(SIGNIFICANTLY OUTPERFORMING \u2713)" : industrySectorAnalysis.relativeStrength > 0 ? "(Outperforming \u2713)" : industrySectorAnalysis.relativeStrength > -1 ? "(Underperforming \u2717)" : "(SIGNIFICANTLY UNDERPERFORMING \u2717\u2717)"}
- Momentum (5-day): ${industrySectorAnalysis.momentum > 0 ? "+" : ""}${industrySectorAnalysis.momentum.toFixed(2)}% ${industrySectorAnalysis.momentum > 0.5 ? "(STRONG POSITIVE \u2B06)" : industrySectorAnalysis.momentum > 0 ? "(Positive \u2197)" : industrySectorAnalysis.momentum > -0.5 ? "(Weak \u2198)" : "(NEGATIVE \u2B07)"}
- Volatility (annualized): ${industrySectorAnalysis.volatility.toFixed(1)}% ${industrySectorAnalysis.volatility > 25 ? "(HIGH VOLATILITY \u26A0)" : industrySectorAnalysis.volatility > 15 ? "(Moderate)" : "(Low \u2713)"}

SECTOR WEIGHT: ${industrySectorAnalysis.sectorWeight}/100 ${industrySectorAnalysis.sectorWeight > 70 ? "(HIGH INFLUENCE - PRIORITIZE SECTOR TRENDS)" : industrySectorAnalysis.sectorWeight > 40 ? "(MODERATE INFLUENCE)" : "(LOW INFLUENCE - GENERAL MARKET MATTERS MORE)"}

AUTOMATED SECTOR SUMMARY:
${industrySectorAnalysis.sectorExplanation}

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
CRITICAL GUIDANCE FOR YOUR ANALYSIS:
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

1. SECTOR WEIGHT INTERPRETATION:
   - ${industrySectorAnalysis.sectorWeight > 70 ? "This sector is showing VERY STRONG signals - prioritize sector-specific trends heavily in your recommendation" : industrySectorAnalysis.sectorWeight > 40 ? "This sector has MODERATE influence - balance sector and general market conditions" : "This sector is showing WEAK signals - rely more on general market conditions"}

2. RELATIVE STRENGTH MATTERS:
   - Sector is ${industrySectorAnalysis.relativeStrength > 0 ? "OUTPERFORMING" : "UNDERPERFORMING"} the market
   - This ${industrySectorAnalysis.relativeStrength > 1 || industrySectorAnalysis.relativeStrength < -1 ? "STRONGLY" : "moderately"} affects ${industry} stock recommendations

3. MOMENTUM SIGNALS:
   - ${industrySectorAnalysis.momentum > 0.5 ? "Strong positive momentum suggests continued strength - favorable for BUY recommendations" : industrySectorAnalysis.momentum > 0 ? "Moderate positive momentum - cautiously favorable" : industrySectorAnalysis.momentum > -0.5 ? "Weak momentum - neutral to slightly negative" : "Strong negative momentum - unfavorable for BUY, consider lower scores"}

4. VOLATILITY CONSIDERATIONS:
   - ${industrySectorAnalysis.volatility > 25 ? "HIGH volatility indicates increased risk - consider lowering recommendation strength" : industrySectorAnalysis.volatility > 15 ? "Moderate volatility - normal market conditions" : "Low volatility - stable sector, favorable for recommendations"}

YOUR SECTOR-SPECIFIC RECOMMENDATION MUST:
- Explain how the sector's ${industrySectorAnalysis.sectorWeight}/100 weight influenced your decision
- Address the ${industrySectorAnalysis.relativeStrength > 0 ? "outperformance" : "underperformance"} relative to the market
- Consider the ${industrySectorAnalysis.momentum > 0 ? "positive" : "negative"} momentum trend
- Account for the ${industrySectorAnalysis.volatility > 20 ? "elevated" : "moderate"} volatility level
` : industry ? `

INDUSTRY-SPECIFIC ANALYSIS FOR: ${industry}
- No detailed sector ETF data available
- Rely primarily on general market conditions for this analysis` : "";
    const economicContext = marketData.economicIndicators && Object.keys(marketData.economicIndicators).length > 0 ? `

ECONOMIC INDICATORS (Latest Data):
${marketData.economicIndicators.fedFundsRate ? `- Federal Funds Rate: ${marketData.economicIndicators.fedFundsRate.toFixed(2)}%` : ""}
${marketData.economicIndicators.inflationRate ? `- CPI (Inflation): ${marketData.economicIndicators.inflationRate}` : ""}
${marketData.economicIndicators.unemploymentRate ? `- Unemployment Rate: ${marketData.economicIndicators.unemploymentRate.toFixed(1)}%` : ""}
${marketData.economicIndicators.gdpGrowth ? `- Real GDP: $${(marketData.economicIndicators.gdpGrowth / 1e3).toFixed(2)}T` : ""}

These economic indicators provide crucial context for the 1-2 week market outlook. Consider their impact on investor sentiment and near-term market direction.` : "";
    const newsContext = marketData.webNews && marketData.webNews.length > 0 ? `

RECENT MARKET NEWS SENTIMENT (Alpha Vantage):
${marketData.webNews.map((news, idx) => `${idx + 1}. [${news.sentiment.toUpperCase()}] ${news.title}`).join("\n")}

News sentiment analysis shows the current market narrative and investor psychology. Use this to gauge near-term sentiment trends.` : "";
    const prompt = `You are a seasoned macro economist and market strategist analyzing current market conditions to provide guidance for equity investors${industry ? ` in the ${industry} sector` : ""}.

INVESTMENT HORIZON: 1-2 weeks (short-term trading window)

MARKET DATA:
- S&P 500 Level: ${marketData.sp500.level} (${marketData.sp500.change > 0 ? "+" : ""}${marketData.sp500.change.toFixed(2)}%)
- VIX (Fear Index): ${marketData.vix.level} (${marketData.vix.interpretation})
- Sector Performance: ${JSON.stringify(marketData.sectorPerformance, null, 2)}${economicContext}${newsContext}${industryContext}

YOUR ANALYSIS MUST INCLUDE TWO PARTS:

PART 1: GENERAL MARKET ANALYSIS (1-2 week outlook)
- What is the overall market sentiment and momentum for the next 1-2 weeks?
- Are there near-term catalysts (earnings, Fed announcements, economic data) upcoming?
- What is the short-term risk/reward profile?

PART 2: SECTOR-SPECIFIC ANALYSIS${industry ? ` FOR ${industry.toUpperCase()}` : " (if applicable)"}
${industry ? `- How is the ${industry} sector positioned for the next 1-2 weeks?
- Is it showing relative strength or weakness vs the broader market?
- Are there sector-specific catalysts or headwinds in the near term?` : "- General sector rotation patterns for the next 1-2 weeks"}

REQUIRED OUTPUT:

1. **macroScore** (0-100): Overall health of the market${industry ? ` and ${industry} sector` : ""} for the 1-2 week horizon

2. **recommendation** - MUST be one of these EXACT values:
   - "good" = Favorable conditions for 1-2 week trades (low volatility, positive momentum, sector strength)
   - "neutral" = Normal conditions, no strong tailwinds or headwinds
   - "risky" = Uncertain conditions (elevated volatility, mixed signals, sector weakness)
   - "bad" = Unfavorable conditions (high volatility, negative momentum, sector deterioration)

3. **marketCondition**: "bull", "bear", "sideways", or "volatile"
4. **marketPhase**: "early_cycle", "mid_cycle", "late_cycle", or "recession"
5. **riskAppetite**: "high", "moderate", or "low"
6. **keyThemes**: List 3-5 major themes affecting the 1-2 week outlook
7. **opportunities**: What positions benefit from current short-term conditions?
8. **risks**: What are the major near-term risks for the next 1-2 weeks?
9. **summary**: 2-3 sentence executive summary of the 1-2 week outlook

CRITICAL: The "recommendation" field MUST be exactly one of: "good", "neutral", "risky", or "bad"

Respond in JSON format:
{
  "macroScore": <number 0-100>,
  "recommendation": "<good|neutral|risky|bad>",
  "summary": "<string>",
  "marketCondition": "<string>",
  "marketPhase": "<string>",
  "riskAppetite": "<string>",
  "keyThemes": ["<theme1>", "<theme2>", ...],
  "opportunities": ["<opportunity1>", "<opportunity2>", ...],
  "risks": ["<risk1>", "<risk2>", ...]
}`;
    console.log(`[MacroAgent] Using ${currentProviderConfig3.provider} for macro analysis`);
    const messages = [
      {
        role: "system",
        content: "You are a macro economic analyst providing market-wide analysis. Always respond with valid JSON only, no markdown or additional text."
      },
      {
        role: "user",
        content: prompt
      }
    ];
    const result = await generateWithFallback(currentProviderConfig3, messages, {
      temperature: 0.3,
      responseFormat: "json"
    });
    if (result.usedFallback) {
      console.log(`[MacroAgent] \u26A0\uFE0F Used fallback: ${result.provider} (${result.model})`);
    }
    sanitizedResponse = result.content;
    sanitizedResponse = sanitizedResponse.trim();
    if (sanitizedResponse.startsWith("```")) {
      sanitizedResponse = sanitizedResponse.replace(/^```(?:json|JSON)?\s*\n?/, "");
      sanitizedResponse = sanitizedResponse.replace(/\n?```\s*$/, "");
      sanitizedResponse = sanitizedResponse.trim();
    }
    console.log(`[MacroAgent] Parsing JSON response (${sanitizedResponse.length} chars)...`);
    const analysis = JSON.parse(sanitizedResponse);
    const macroScore = typeof analysis.macroScore === "number" && !isNaN(analysis.macroScore) ? Math.max(0, Math.min(100, Math.round(analysis.macroScore))) : 50;
    const recommendation = (analysis.recommendation || "neutral").toLowerCase();
    const validRecommendations = ["good", "neutral", "risky", "bad"];
    const finalRecommendation = validRecommendations.includes(recommendation) ? recommendation : "neutral";
    const MACRO_MULTIPLIERS = {
      "good": 1.1,
      // 10% boost for favorable conditions
      "neutral": 1,
      // No adjustment
      "risky": 0.8,
      // 20% penalty for uncertain conditions
      "bad": 0.6
      // 40% penalty for unfavorable conditions
    };
    const macroFactor = MACRO_MULTIPLIERS[finalRecommendation];
    console.log(`[MacroAgent] Analysis complete. Macro Score: ${macroScore} Recommendation: ${finalRecommendation} Factor: ${macroFactor}`);
    if (recommendation !== finalRecommendation) {
      console.warn(`[MacroAgent] Invalid recommendation "${recommendation}" - defaulted to "neutral"`);
    }
    return {
      industry: industry || null,
      status: "completed",
      macroScore,
      macroFactor: macroFactor.toFixed(2),
      summary: analysis.summary,
      sp500Level: marketData.sp500.level.toFixed(2),
      sp500Change: marketData.sp500.change.toFixed(2),
      sp500Trend: marketData.sp500.trend,
      vixLevel: marketData.vix.level.toFixed(2),
      vixInterpretation: marketData.vix.interpretation,
      economicIndicators: marketData.economicIndicators || {},
      sectorPerformance: marketData.sectorPerformance,
      industrySectorAnalysis: industrySectorAnalysis || void 0,
      marketCondition: analysis.marketCondition,
      marketPhase: analysis.marketPhase,
      riskAppetite: analysis.riskAppetite,
      keyThemes: analysis.keyThemes,
      opportunities: analysis.opportunities,
      risks: analysis.risks,
      recommendation: finalRecommendation,
      // Categorical: "good", "neutral", "risky", "bad"
      analyzedAt: /* @__PURE__ */ new Date(),
      errorMessage: null
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[MacroAgent] Error during analysis:", error);
    if (errorMessage.includes("JSON") || errorMessage.includes("parse")) {
      console.error("[MacroAgent] JSON parse failed. Check OpenAI response format.");
      const preview = sanitizedResponse?.substring(0, 500) || "No response available";
      console.error("[MacroAgent] Response preview:", preview);
    }
    return {
      industry: industry || null,
      status: "failed",
      macroScore: null,
      macroFactor: null,
      summary: null,
      sp500Level: null,
      sp500Change: null,
      sp500Trend: null,
      vixLevel: null,
      vixInterpretation: null,
      economicIndicators: null,
      sectorPerformance: null,
      industrySectorAnalysis: void 0,
      marketCondition: null,
      marketPhase: null,
      riskAppetite: null,
      keyThemes: null,
      opportunities: null,
      risks: null,
      recommendation: null,
      analyzedAt: /* @__PURE__ */ new Date(),
      errorMessage: error instanceof Error ? error.message : "Unknown error during macro analysis"
    };
  }
}
function integrateScores(microScore, macroFactor) {
  const integrated = Math.round(microScore * macroFactor);
  const clamped = Math.max(0, Math.min(100, integrated));
  let adjustment = "";
  if (macroFactor < 0.9) {
    adjustment = `Score reduced from ${microScore} to ${clamped} due to challenging macro conditions (${macroFactor}x factor)`;
  } else if (macroFactor > 1.1) {
    adjustment = `Score boosted from ${microScore} to ${clamped} due to favorable macro conditions (${macroFactor}x factor)`;
  } else {
    adjustment = `Score maintained at ${clamped} (neutral macro environment, ${macroFactor}x factor)`;
  }
  return { integratedScore: clamped, adjustment };
}
var openai3, currentProviderConfig3, ALPHA_VANTAGE_API_KEY, INDUSTRY_ETF_MAP;
var init_macroAgentService = __esm({
  "server/macroAgentService.ts"() {
    "use strict";
    init_aiProvider();
    openai3 = process.env.OPENAI_API_KEY ? new OpenAI4({ apiKey: process.env.OPENAI_API_KEY }) : null;
    currentProviderConfig3 = { provider: "openai" };
    ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;
    INDUSTRY_ETF_MAP = {
      // Technology
      "technology": "XLK",
      "information technology": "XLK",
      "software": "XLK",
      "semiconductors": "XLK",
      // Financials/Banking
      "financials": "XLF",
      "financial services": "XLF",
      "banking": "XLF",
      "banks": "XLF",
      "capital markets": "XLF",
      "insurance": "XLF",
      "diversified financial services": "XLF",
      // Healthcare
      "healthcare": "XLV",
      "health care": "XLV",
      "biotechnology": "XLV",
      "pharmaceuticals": "XLV",
      "medical devices": "XLV",
      // Energy
      "energy": "XLE",
      "oil & gas": "XLE",
      "oil and gas": "XLE",
      // Industrials
      "industrials": "XLI",
      "industrial": "XLI",
      "aerospace & defense": "XLI",
      "construction": "XLI",
      "machinery": "XLI",
      // Consumer
      "consumer discretionary": "XLY",
      "consumer cyclical": "XLY",
      "retail": "XLY",
      "consumer staples": "XLP",
      "consumer defensive": "XLP",
      // Utilities
      "utilities": "XLU",
      "utility": "XLU",
      // Real Estate
      "real estate": "XLRE",
      "reits": "XLRE",
      // Materials
      "materials": "XLB",
      "basic materials": "XLB",
      // Communication
      "communication services": "XLC",
      "telecommunications": "XLC",
      "media": "XLC"
    };
  }
});

// server/jobs/cleanupStaleStocks.ts
async function runStaleStockCleanup(storage2) {
  try {
    console.log("[CLEANUP JOB] Starting daily stale stock cleanup...");
    const twoWeekResult = await storage2.deleteStocksOlderThan(14);
    if (twoWeekResult.count > 0) {
      console.log(`[CLEANUP JOB] \u2705 Successfully deleted ${twoWeekResult.count} stocks older than 2 weeks (non-followed)`);
      console.log(`[CLEANUP JOB] Deleted tickers: ${twoWeekResult.tickers.join(", ")}`);
    } else {
      console.log("[CLEANUP JOB] \u2705 No old non-followed stocks to delete (2-week horizon)");
    }
    const pendingResult = await storage2.deleteExpiredPendingStocks(10);
    if (pendingResult.count > 0) {
      console.log(`[CLEANUP JOB] \u2705 Successfully deleted ${pendingResult.count} expired pending stocks`);
      console.log(`[CLEANUP JOB] Deleted pending tickers: ${pendingResult.tickers.join(", ")}`);
    } else {
      console.log("[CLEANUP JOB] \u2705 No expired pending stocks to delete");
    }
    const rejectedResult = await storage2.deleteExpiredRejectedStocks(10);
    if (rejectedResult.count > 0) {
      console.log(`[CLEANUP JOB] \u2705 Successfully deleted ${rejectedResult.count} expired rejected stocks`);
      console.log(`[CLEANUP JOB] Deleted rejected tickers: ${rejectedResult.tickers.join(", ")}`);
    } else {
      console.log("[CLEANUP JOB] \u2705 No expired rejected stocks to delete");
    }
  } catch (error) {
    console.error("[CLEANUP JOB] \u274C Cleanup failed:", error);
  }
}
function startCleanupScheduler(storage2) {
  runStaleStockCleanup(storage2);
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1e3;
  setInterval(() => {
    runStaleStockCleanup(storage2);
  }, TWENTY_FOUR_HOURS);
  console.log("[CLEANUP SCHEDULER] \u2705 Started daily cleanup scheduler (runs every 24 hours)");
}
var init_cleanupStaleStocks = __esm({
  "server/jobs/cleanupStaleStocks.ts"() {
    "use strict";
  }
});

// server/jobs/utils.ts
function isMarketOpen3() {
  const now = /* @__PURE__ */ new Date();
  const etTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const day = etTime.getDay();
  if (day === 0 || day === 6) {
    return false;
  }
  const hours = etTime.getHours();
  const minutes = etTime.getMinutes();
  const timeInMinutes = hours * 60 + minutes;
  const marketOpen = 9 * 60 + 30;
  const marketClose = 16 * 60;
  return timeInMinutes >= marketOpen && timeInMinutes < marketClose;
}
var init_utils = __esm({
  "server/jobs/utils.ts"() {
    "use strict";
  }
});

// server/jobs/priceUpdate.ts
async function runPriceUpdate(storage2) {
  try {
    if (!isMarketOpen3()) {
      log6("[PriceUpdate] Market is closed, skipping stock price update");
      return;
    }
    log6("[PriceUpdate] Starting stock price update job...");
    const tickers = await storage2.getAllUniquePendingTickers();
    if (tickers.length === 0) {
      log6("[PriceUpdate] No pending stocks to update");
      return;
    }
    log6(`[PriceUpdate] Updating prices for ${tickers.length} unique pending tickers across all users`);
    const stockData = await finnhubService.getBatchStockData(tickers);
    let successCount = 0;
    for (const ticker of tickers) {
      const data = stockData.get(ticker);
      if (data) {
        const updatedCount = await storage2.updateStocksByTickerGlobally(ticker, {
          currentPrice: data.quote.currentPrice.toString(),
          previousClose: data.quote.previousClose.toString(),
          marketCap: data.marketCap ? `$${Math.round(data.marketCap)}M` : null,
          description: data.companyInfo?.description || null,
          industry: data.companyInfo?.industry || null,
          country: data.companyInfo?.country || null,
          webUrl: data.companyInfo?.webUrl || null,
          ipo: data.companyInfo?.ipo || null,
          news: data.news || [],
          insiderSentimentMspr: data.insiderSentiment?.mspr.toString() || null,
          insiderSentimentChange: data.insiderSentiment?.change.toString() || null
        });
        if (updatedCount > 0) {
          successCount++;
          log6(`[PriceUpdate] Updated ${ticker}: ${updatedCount} instances across users`);
        }
      }
    }
    log6(`[PriceUpdate] Successfully updated ${successCount}/${tickers.length} tickers`);
  } catch (error) {
    console.error("[PriceUpdate] Error updating stock prices:", error);
  }
}
function startPriceUpdateJob(storage2) {
  runPriceUpdate(storage2).catch((err) => {
    console.error("[PriceUpdate] Initial update failed:", err);
  });
  setInterval(() => {
    runPriceUpdate(storage2);
  }, FIVE_MINUTES);
  log6("[PriceUpdate] Background job started - updating every 5 minutes");
}
var log6, FIVE_MINUTES;
var init_priceUpdate = __esm({
  "server/jobs/priceUpdate.ts"() {
    "use strict";
    init_finnhubService();
    init_utils();
    init_logger();
    log6 = createLogger("jobs:priceUpdate");
    FIVE_MINUTES = 5 * 60 * 1e3;
  }
});

// server/jobs/candlestickData.ts
async function runCandlestickDataFetch(storage2) {
  try {
    log7("[CandlestickData] Starting candlestick data fetch job...");
    const tickers = await storage2.getAllTickersNeedingCandlestickData();
    if (tickers.length === 0) {
      log7("[CandlestickData] No stocks need candlestick data");
      return;
    }
    log7(`[CandlestickData] Fetching candlestick data for ${tickers.length} unique tickers (shared storage)`);
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    for (const ticker of tickers) {
      try {
        log7(`[CandlestickData] Fetching data for ${ticker}...`);
        const candlesticks = await stockService.getCandlestickData(ticker);
        if (candlesticks && candlesticks.length > 0) {
          await storage2.upsertCandlesticks(ticker, candlesticks.map((c) => ({
            date: c.date,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
            volume: c.volume
          })));
          log7(`[CandlestickData] \u2713 ${ticker} - fetched ${candlesticks.length} days, stored in shared table`);
          successCount++;
        } else {
          log7(`[CandlestickData] \u26A0\uFE0F ${ticker} - no candlestick data returned`);
          errorCount++;
          errors.push({ ticker, error: "No data returned from API" });
        }
      } catch (error) {
        errorCount++;
        const errorMsg = error.message || String(error);
        errors.push({ ticker, error: errorMsg });
        console.error(`[CandlestickData] \u2717 ${ticker} - Error: ${errorMsg}`);
      }
    }
    log7(`[CandlestickData] Successfully updated ${successCount}/${tickers.length} tickers`);
    if (errorCount > 0) {
      log7(`[CandlestickData] Failed to fetch data for ${errorCount} stocks:`);
      errors.forEach(({ ticker, error }) => {
        log7(`  - ${ticker}: ${error}`);
      });
    }
  } catch (error) {
    console.error("[CandlestickData] Error in candlestick data job:", error);
  }
}
function startCandlestickDataJob(storage2) {
  runCandlestickDataFetch(storage2).catch((err) => {
    console.error("[CandlestickData] Initial fetch failed:", err);
  });
  setInterval(() => {
    runCandlestickDataFetch(storage2);
  }, ONE_DAY);
  log7("[CandlestickData] Background job started - fetching once a day");
}
var log7, ONE_DAY;
var init_candlestickData = __esm({
  "server/jobs/candlestickData.ts"() {
    "use strict";
    init_stockService();
    init_logger();
    log7 = createLogger("jobs");
    ONE_DAY = 24 * 60 * 60 * 1e3;
  }
});

// server/jobs/holdingsPriceHistory.ts
async function runHoldingsPriceHistoryUpdate(storage2) {
  try {
    if (!isMarketOpen3()) {
      log8("[HoldingsHistory] Market is closed, skipping price update");
      return;
    }
    log8("[HoldingsHistory] Starting holdings price history update...");
    const users2 = await storage2.getUsers();
    const allHoldings = [];
    for (const user of users2) {
      const userHoldings = await storage2.getPortfolioHoldings(user.id);
      allHoldings.push(...userHoldings);
    }
    const holdings = allHoldings;
    if (holdings.length === 0) {
      log8("[HoldingsHistory] No holdings to update");
      return;
    }
    const tickerSet = new Set(holdings.map((h) => h.ticker));
    const tickers = Array.from(tickerSet);
    log8(`[HoldingsHistory] Updating price history for ${tickers.length} tickers`);
    const quotes = await finnhubService.getBatchQuotes(tickers);
    const now = (/* @__PURE__ */ new Date()).toISOString();
    let successCount = 0;
    for (const ticker of tickers) {
      const quote = quotes.get(ticker);
      if (!quote || !quote.currentPrice) {
        continue;
      }
      for (const user of users2) {
        const userStocks = await storage2.getStocks(user.id);
        const stock = userStocks.find((s) => s.ticker === ticker);
        if (!stock) continue;
        const priceHistory = stock.priceHistory || [];
        priceHistory.push({
          date: now,
          price: quote.currentPrice
        });
        await storage2.updateStock(user.id, ticker, {
          priceHistory,
          currentPrice: quote.currentPrice.toString()
        });
      }
      successCount++;
    }
    log8(`[HoldingsHistory] Successfully updated ${successCount}/${tickers.length} stocks with new price points`);
  } catch (error) {
    console.error("[HoldingsHistory] Error updating holdings price history:", error);
  }
}
function startHoldingsPriceHistoryJob(storage2) {
  runHoldingsPriceHistoryUpdate(storage2).catch((err) => {
    console.error("[HoldingsHistory] Initial update failed:", err);
  });
  setInterval(() => {
    runHoldingsPriceHistoryUpdate(storage2);
  }, FIVE_MINUTES2);
  log8("[HoldingsHistory] Background job started - updating price history every 5 minutes");
}
var log8, FIVE_MINUTES2;
var init_holdingsPriceHistory = __esm({
  "server/jobs/holdingsPriceHistory.ts"() {
    "use strict";
    init_finnhubService();
    init_utils();
    init_logger();
    log8 = createLogger("jobs");
    FIVE_MINUTES2 = 5 * 60 * 1e3;
  }
});

// server/jobs/telegramFetch.ts
async function runTelegramFetch(storage2) {
  try {
    log9("[TelegramFetch] Starting Telegram message fetch job...");
    const config = await storage2.getTelegramConfig();
    if (!config || !config.enabled) {
      log9("[TelegramFetch] Telegram is not configured or disabled, skipping");
      return;
    }
    const messages = await telegramService.fetchRecentMessages(config.channelUsername, 20);
    log9(`[TelegramFetch] Successfully fetched and processed ${messages.length} messages`);
  } catch (error) {
    console.error("[TelegramFetch] Error fetching Telegram messages:", error);
  }
}
function startTelegramFetchJob(storage2) {
  runTelegramFetch(storage2).catch((err) => {
    console.error("[TelegramFetch] Initial fetch failed:", err);
  });
  setInterval(() => {
    runTelegramFetch(storage2);
  }, ONE_HOUR);
  log9("[TelegramFetch] Background job started - fetching every hour");
}
var log9, ONE_HOUR;
var init_telegramFetch = __esm({
  async "server/jobs/telegramFetch.ts"() {
    "use strict";
    await init_telegram();
    init_logger();
    log9 = createLogger("jobs");
    ONE_HOUR = 60 * 60 * 1e3;
  }
});

// server/jobs/openinsiderFetch.ts
async function getTelegramNotificationService() {
  if (!ENABLE_TELEGRAM) return null;
  try {
    const { telegramNotificationService: telegramNotificationService2 } = await Promise.resolve().then(() => (init_telegramNotificationService(), telegramNotificationService_exports));
    return telegramNotificationService2;
  } catch {
    return null;
  }
}
async function runOpeninsiderFetch(storage2) {
  if (isJobRunning) {
    log10("[OpeninsiderFetch] Job already running, skipping this execution");
    return;
  }
  isJobRunning = true;
  const telegramNotificationService2 = await getTelegramNotificationService();
  try {
    log10("[OpeninsiderFetch] Starting OpenInsider data fetch job...");
    const config = await storage2.getOpeninsiderConfig();
    if (!config || !config.enabled) {
      log10("[OpeninsiderFetch] OpenInsider is not configured or disabled, skipping");
      return;
    }
    const filters = {};
    if (config.insiderTitles && config.insiderTitles.length > 0) {
      filters.insiderTitles = config.insiderTitles;
    }
    if (config.minTransactionValue) {
      filters.minTransactionValue = config.minTransactionValue;
    }
    if (config.fetchPreviousDayOnly) {
      filters.previousDayOnly = true;
    }
    const optionsDealThreshold = config.optionsDealThresholdPercent ?? 15;
    const minMarketCap = config.minMarketCap ?? 500;
    log10(`[OpeninsiderFetch] Fetching both purchases AND sales...`);
    const [purchasesResponse, salesResponse] = await Promise.all([
      openinsiderService.fetchInsiderPurchases(
        config.fetchLimit || 50,
        Object.keys(filters).length > 0 ? filters : void 0,
        "P"
      ),
      openinsiderService.fetchInsiderSales(
        config.fetchLimit || 50,
        Object.keys(filters).length > 0 ? filters : void 0
      )
    ]);
    const transactions = [...purchasesResponse.transactions, ...salesResponse.transactions];
    const stage1Stats = {
      total_rows_scraped: purchasesResponse.stats.total_rows_scraped + salesResponse.stats.total_rows_scraped,
      filtered_not_purchase: purchasesResponse.stats.filtered_not_purchase + salesResponse.stats.filtered_not_purchase,
      filtered_invalid_data: purchasesResponse.stats.filtered_invalid_data + salesResponse.stats.filtered_invalid_data,
      filtered_by_date: purchasesResponse.stats.filtered_by_date + salesResponse.stats.filtered_by_date,
      filtered_by_title: purchasesResponse.stats.filtered_by_title + salesResponse.stats.filtered_by_title,
      filtered_by_transaction_value: purchasesResponse.stats.filtered_by_transaction_value + salesResponse.stats.filtered_by_transaction_value,
      filtered_by_insider_name: purchasesResponse.stats.filtered_by_insider_name + salesResponse.stats.filtered_by_insider_name
    };
    log10(`[OpeninsiderFetch] Fetched ${purchasesResponse.transactions.length} purchases + ${salesResponse.transactions.length} sales = ${transactions.length} total`);
    if (transactions.length === 0) {
      log10("[OpeninsiderFetch] No insider transactions found");
      await storage2.updateOpeninsiderSyncStatus();
      return;
    }
    const totalStage1Filtered = stage1Stats.filtered_by_title + stage1Stats.filtered_by_transaction_value + stage1Stats.filtered_by_date + stage1Stats.filtered_not_purchase + stage1Stats.filtered_invalid_data;
    log10(`[OpeninsiderFetch] ======= STAGE 1: Python Scraper Filters =======`);
    log10(`[OpeninsiderFetch] Total rows scraped: ${stage1Stats.total_rows_scraped}`);
    log10(`[OpeninsiderFetch]   \u2022 Not a purchase / Invalid: ${stage1Stats.filtered_not_purchase + stage1Stats.filtered_invalid_data}`);
    log10(`[OpeninsiderFetch]   \u2022 Filtered by date: ${stage1Stats.filtered_by_date}`);
    log10(`[OpeninsiderFetch]   \u2022 Filtered by title: ${stage1Stats.filtered_by_title}`);
    log10(`[OpeninsiderFetch]   \u2022 Filtered by transaction value: ${stage1Stats.filtered_by_transaction_value}`);
    log10(`[OpeninsiderFetch] \u2192 Total Stage 1 filtered: ${totalStage1Filtered}`);
    log10(`[OpeninsiderFetch] \u2192 Returned ${transactions.length} matching transactions`);
    log10(`[OpeninsiderFetch] ===============================================`);
    let createdCount = 0;
    let filteredMarketCap = 0;
    let filteredOptionsDeals = 0;
    let filteredNoQuote = 0;
    let filteredDuplicates = 0;
    const createdTickers = /* @__PURE__ */ new Set();
    const users2 = await storage2.getUsersEligibleForDataRefresh();
    log10(`[OpeninsiderFetch] ${users2.length} users eligible for data refresh (trial: daily, paid: hourly)`);
    if (users2.length > 0) {
      for (const user of users2) {
        await storage2.updateUserLastDataRefresh(user.id);
      }
      log10(`[OpeninsiderFetch] Updated lastDataRefresh for ${users2.length} users at START of job`);
    }
    for (const transaction of transactions) {
      try {
        const quote = await finnhubService.getQuote(transaction.ticker);
        if (!quote || !quote.currentPrice) {
          filteredNoQuote++;
          log10(`[OpeninsiderFetch] Could not get quote for ${transaction.ticker}, skipping`);
          continue;
        }
        const stockData = await finnhubService.getBatchStockData([transaction.ticker]);
        const data = stockData.get(transaction.ticker);
        if (!data?.marketCap || data.marketCap < minMarketCap) {
          filteredMarketCap++;
          log10(`[OpeninsiderFetch] ${transaction.ticker} market cap too low: $${data?.marketCap || 0}M (need >$${minMarketCap}M), skipping`);
          continue;
        }
        if (transaction.recommendation === "buy") {
          const insiderPriceNum = transaction.price;
          const thresholdPercent = optionsDealThreshold / 100;
          if (optionsDealThreshold > 0 && insiderPriceNum < quote.currentPrice * thresholdPercent) {
            filteredOptionsDeals++;
            log10(`[OpeninsiderFetch] ${transaction.ticker} likely options deal: insider price $${insiderPriceNum.toFixed(2)} < ${optionsDealThreshold}% of market $${quote.currentPrice.toFixed(2)}, skipping`);
            continue;
          }
        }
        for (const user of users2) {
          const existingTransaction = await storage2.getTransactionByCompositeKey(
            user.id,
            transaction.ticker,
            transaction.filingDate,
            transaction.insiderName,
            transaction.recommendation
          );
          if (existingTransaction) {
            filteredDuplicates++;
            continue;
          }
          await storage2.createStock({
            userId: user.id,
            ticker: transaction.ticker,
            companyName: transaction.companyName || transaction.ticker,
            currentPrice: quote.currentPrice.toString(),
            previousClose: quote.previousClose?.toString() || quote.currentPrice.toString(),
            insiderPrice: transaction.price.toString(),
            insiderQuantity: transaction.quantity,
            insiderTradeDate: transaction.filingDate,
            insiderName: transaction.insiderName,
            insiderTitle: transaction.insiderTitle,
            recommendation: transaction.recommendation,
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
            priceHistory: []
          });
        }
        createdCount++;
        createdTickers.add(transaction.ticker);
        log10(`[OpeninsiderFetch] Created stock recommendation for ${transaction.ticker}`);
        if (ENABLE_TELEGRAM && telegramNotificationService2 && telegramNotificationService2.isReady()) {
          try {
            const notificationSent = await telegramNotificationService2.sendStockAlert({
              ticker: transaction.ticker,
              companyName: transaction.companyName || transaction.ticker,
              recommendation: transaction.recommendation || "buy",
              currentPrice: quote.currentPrice.toString(),
              insiderPrice: transaction.price.toString(),
              insiderQuantity: transaction.quantity,
              confidenceScore: transaction.confidence || 75
            });
            if (notificationSent) {
              log10(`[OpeninsiderFetch] Sent Telegram notification for ${transaction.ticker}`);
            } else {
              log10(`[OpeninsiderFetch] Failed to send Telegram notification for ${transaction.ticker}`);
            }
          } catch (err) {
            console.error(`[OpeninsiderFetch] Error sending Telegram notification for ${transaction.ticker}:`, err);
          }
        }
      } catch (err) {
        console.error(`[OpeninsiderFetch] Error processing ${transaction.ticker}:`, err);
      }
    }
    if (createdTickers.size > 0) {
      const uniqueTickersArray = Array.from(createdTickers);
      log10(`[OpeninsiderFetch] Queuing AI analysis for ${uniqueTickersArray.length} unique tickers...`);
      for (const ticker of uniqueTickersArray) {
        try {
          await storage2.enqueueAnalysisJob(ticker, "openinsider_fetch", "normal");
          log10(`[OpeninsiderFetch] \u2713 Queued AI analysis for ${ticker}`);
        } catch (error) {
          console.error(`[OpeninsiderFetch] Failed to queue AI analysis for ${ticker}:`, error);
        }
      }
    }
    log10(`
[OpeninsiderFetch] ======= STAGE 2: Backend Post-Processing =======`);
    log10(`[OpeninsiderFetch] Starting with: ${transactions.length} transactions`);
    log10(`[OpeninsiderFetch]   \u2297 Duplicates: ${filteredDuplicates}`);
    log10(`[OpeninsiderFetch]   \u2297 Market cap < $${minMarketCap}M: ${filteredMarketCap}`);
    log10(`[OpeninsiderFetch]   \u2297 Options deals (< ${optionsDealThreshold}%): ${filteredOptionsDeals}`);
    log10(`[OpeninsiderFetch]   \u2297 No quote: ${filteredNoQuote}`);
    log10(`[OpeninsiderFetch] \u2192 Total Stage 2 filtered: ${filteredDuplicates + filteredMarketCap + filteredOptionsDeals + filteredNoQuote}`);
    log10(`[OpeninsiderFetch] ===============================================`);
    log10(`
[OpeninsiderFetch] \u2713 Successfully created ${createdCount} new recommendations (${createdTickers.size} unique tickers)
`);
    await storage2.updateOpeninsiderSyncStatus();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[OpeninsiderFetch] Error fetching OpenInsider data:", error);
    await storage2.updateOpeninsiderSyncStatus(errorMessage);
  } finally {
    isJobRunning = false;
  }
}
function startOpeninsiderFetchJob(storage2) {
  runOpeninsiderFetch(storage2).catch((err) => {
    console.error("[OpeninsiderFetch] Initial fetch failed:", err);
  });
  async function getInterval() {
    const config = await storage2.getOpeninsiderConfig();
    return config?.fetchInterval === "daily" ? ONE_DAY2 : ONE_HOUR2;
  }
  getInterval().then((interval) => {
    setInterval(() => {
      runOpeninsiderFetch(storage2);
    }, interval);
    const intervalName = interval === ONE_DAY2 ? "daily" : "hourly";
    log10(`[OpeninsiderFetch] Background job started - fetching ${intervalName}`);
  });
}
var log10, ONE_HOUR2, ONE_DAY2, ENABLE_TELEGRAM, isJobRunning;
var init_openinsiderFetch = __esm({
  "server/jobs/openinsiderFetch.ts"() {
    "use strict";
    init_finnhubService();
    init_openinsiderService();
    init_logger();
    log10 = createLogger("jobs");
    ONE_HOUR2 = 60 * 60 * 1e3;
    ONE_DAY2 = 24 * 60 * 60 * 1e3;
    ENABLE_TELEGRAM = process.env.ENABLE_TELEGRAM === "true";
    isJobRunning = false;
  }
});

// server/secEdgarService.ts
import axios2 from "axios";
var SECEdgarService, secEdgarService;
var init_secEdgarService = __esm({
  "server/secEdgarService.ts"() {
    "use strict";
    SECEdgarService = class {
      baseUrl = "https://data.sec.gov";
      userAgent;
      lastRequestTime = 0;
      minRequestInterval = 100;
      // Minimum 100ms between requests (max 10 requests/second)
      constructor() {
        this.userAgent = "TradePro Dashboard contact@tradepro.app";
      }
      /**
       * Rate limiting to comply with SEC API usage policies
       * Ensures we don't overwhelm the SEC servers with requests
       */
      async rateLimit() {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        if (timeSinceLastRequest < this.minRequestInterval) {
          const delay = this.minRequestInterval - timeSinceLastRequest;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
        this.lastRequestTime = Date.now();
      }
      /**
       * Get company CIK number from ticker symbol
       * Uses SEC's company tickers JSON to lookup CIK
       */
      async getCIKFromTicker(ticker) {
        try {
          await this.rateLimit();
          const response = await axios2.get("https://www.sec.gov/files/company_tickers.json", {
            headers: { "User-Agent": this.userAgent }
          });
          const companies = response.data;
          for (const key in companies) {
            const company = companies[key];
            if (company.ticker === ticker.toUpperCase()) {
              return String(company.cik_str).padStart(10, "0");
            }
          }
          return null;
        } catch (error) {
          console.error(`Error fetching CIK for ticker ${ticker}:`, error);
          return null;
        }
      }
      /**
       * Get company submissions (all filings) by CIK
       */
      async getCompanySubmissions(cik) {
        try {
          await this.rateLimit();
          const paddedCik = cik.padStart(10, "0");
          const response = await axios2.get(`${this.baseUrl}/submissions/CIK${paddedCik}.json`, {
            headers: { "User-Agent": this.userAgent }
          });
          return response.data;
        } catch (error) {
          console.error(`Error fetching submissions for CIK ${cik}:`, error);
          return null;
        }
      }
      /**
       * Get latest 10-K or 10-Q filing for a company
       */
      async getLatestFiling(ticker, formTypes = ["10-K", "10-Q"]) {
        try {
          const cik = await this.getCIKFromTicker(ticker);
          if (!cik) {
            console.log(`CIK not found for ticker: ${ticker}`);
            return null;
          }
          const submissions = await this.getCompanySubmissions(cik);
          if (!submissions) {
            return null;
          }
          const recent = submissions.filings.recent;
          for (let i = 0; i < recent.form.length; i++) {
            const formType = recent.form[i];
            if (formTypes.includes(formType)) {
              const accessionNumber = recent.accessionNumber[i].replace(/-/g, "");
              const primaryDocument = recent.primaryDocument[i];
              const filingUrl = `https://www.sec.gov/Archives/edgar/data/${cik}/${accessionNumber}/${primaryDocument}`;
              return {
                formType,
                filingDate: recent.filingDate[i],
                filingUrl,
                cik
              };
            }
          }
          console.log(`No ${formTypes.join(" or ")} filing found for ticker: ${ticker}`);
          return null;
        } catch (error) {
          console.error(`Error fetching latest filing for ticker ${ticker}:`, error);
          return null;
        }
      }
      /**
       * Fetch the full text content of a filing
       */
      async getFilingContent(filingUrl) {
        try {
          await this.rateLimit();
          const response = await axios2.get(filingUrl, {
            headers: { "User-Agent": this.userAgent },
            responseType: "text"
          });
          return response.data;
        } catch (error) {
          console.error(`Error fetching filing content from ${filingUrl}:`, error);
          return null;
        }
      }
      /**
       * Extract specific sections from filing HTML
       * This is a basic extraction - could be enhanced with sec-api.io for better parsing
       */
      extractSections(htmlContent) {
        const cleanText = (html) => {
          return html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
        };
        const mdaMatch = htmlContent.match(/(?:item\s*7|management'?s?\s+discussion)/i);
        const riskMatch = htmlContent.match(/(?:item\s*1a|risk\s+factors)/i);
        const businessMatch = htmlContent.match(/(?:item\s*1[^a]|business\s+overview|description\s+of\s+business)/i);
        const extractChunk = (startPos, maxLength = 15e3) => {
          if (startPos === -1) return "";
          const chunk = htmlContent.substring(startPos, startPos + maxLength);
          return cleanText(chunk).substring(0, 1e4);
        };
        return {
          managementDiscussion: mdaMatch ? extractChunk(mdaMatch.index || 0) : null,
          riskFactors: riskMatch ? extractChunk(riskMatch.index || 0) : null,
          businessOverview: businessMatch ? extractChunk(businessMatch.index || 0) : null
        };
      }
      /**
       * Get comprehensive filing data for a ticker
       */
      async getCompanyFilingData(ticker) {
        try {
          const filing = await this.getLatestFiling(ticker);
          if (!filing) {
            return null;
          }
          const content = await this.getFilingContent(filing.filingUrl);
          if (!content) {
            return {
              ...filing,
              managementDiscussion: null,
              riskFactors: null,
              businessOverview: null
            };
          }
          const sections = this.extractSections(content);
          return {
            ...filing,
            ...sections
          };
        } catch (error) {
          console.error(`Error getting filing data for ticker ${ticker}:`, error);
          return null;
        }
      }
    };
    secEdgarService = new SECEdgarService();
  }
});

// server/queue/queues.ts
import { Queue } from "bullmq";
function getQueue(name) {
  if (queues.has(name)) {
    return queues.get(name);
  }
  const connection = getRedisConnection();
  const queue = new Queue(name, {
    connection,
    defaultJobOptions: {
      removeOnComplete: {
        age: 24 * 3600,
        // Keep completed jobs for 24 hours
        count: 1e3
        // Keep last 1000 completed jobs
      },
      removeOnFail: {
        age: 7 * 24 * 3600
        // Keep failed jobs for 7 days
      },
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2e3
      }
    }
  });
  queues.set(name, queue);
  log13.info(`Created queue: ${name}`);
  return queue;
}
var log13, QUEUE_NAMES, queues;
var init_queues = __esm({
  "server/queue/queues.ts"() {
    "use strict";
    init_connection();
    init_logger();
    log13 = createLogger("queue:queues");
    QUEUE_NAMES = {
      PRICE_UPDATE: "price-update",
      CANDLESTICK_DATA: "candlestick-data",
      HOLDINGS_PRICE_HISTORY: "holdings-price-history",
      TELEGRAM_FETCH: "telegram-fetch",
      OPENINSIDER_FETCH: "openinsider-fetch",
      RECOMMENDATION_CLEANUP: "recommendation-cleanup",
      SIMULATED_RULE_EXECUTION: "simulated-rule-execution",
      AI_ANALYSIS: "ai-analysis",
      ANALYSIS_RECONCILIATION: "analysis-reconciliation",
      DAILY_BRIEF: "daily-brief",
      UNVERIFIED_USER_CLEANUP: "unverified-user-cleanup",
      CLEANUP_STALE_STOCKS: "cleanup-stale-stocks",
      TICKER_DAILY_BRIEF: "ticker-daily-brief"
    };
    queues = /* @__PURE__ */ new Map();
  }
});

// server/jobs/recommendationCleanup.ts
async function runRecommendationCleanup(storage2) {
  try {
    log16("[Cleanup] Starting recommendation cleanup job...");
    const users2 = await storage2.getUsers();
    const now = /* @__PURE__ */ new Date();
    let rejectedCount = 0;
    let deletedCount = 0;
    let totalStocksChecked = 0;
    for (const user of users2) {
      const stocks2 = await storage2.getStocks(user.id);
      totalStocksChecked += stocks2.length;
      const pendingStocks = stocks2.filter(
        (stock) => stock.recommendationStatus === "pending" && stock.insiderTradeDate
      );
      for (const stock of pendingStocks) {
        try {
          const dateParts = stock.insiderTradeDate.split(" ")[0].split(".");
          if (dateParts.length >= 3) {
            const day = parseInt(dateParts[0], 10);
            const month = parseInt(dateParts[1], 10) - 1;
            const year = parseInt(dateParts[2], 10);
            const tradeDate = new Date(year, month, day);
            const ageMs = now.getTime() - tradeDate.getTime();
            if (ageMs > TWO_WEEKS_MS) {
              await storage2.updateStock(user.id, stock.ticker, {
                recommendationStatus: "rejected",
                rejectedAt: /* @__PURE__ */ new Date()
              });
              rejectedCount++;
              log16(`[Cleanup] Rejected ${stock.ticker} for user ${user.id} - trade date ${stock.insiderTradeDate} is older than 2 weeks`);
            }
          }
        } catch (parseError) {
          console.error(`[Cleanup] Error parsing date for ${stock.ticker}:`, parseError);
        }
      }
      const rejectedStocks = stocks2.filter(
        (stock) => stock.recommendationStatus === "rejected" && stock.rejectedAt
      );
      for (const stock of rejectedStocks) {
        try {
          const rejectedDate = new Date(stock.rejectedAt);
          const ageMs = now.getTime() - rejectedDate.getTime();
          if (ageMs > TWO_WEEKS_MS) {
            await storage2.deleteStock(user.id, stock.ticker);
            deletedCount++;
            log16(`[Cleanup] Deleted ${stock.ticker} for user ${user.id} - was rejected on ${stock.rejectedAt}`);
          }
        } catch (deleteError) {
          console.error(`[Cleanup] Error deleting rejected stock ${stock.ticker}:`, deleteError);
        }
      }
    }
    log16(`[Cleanup] Rejected ${rejectedCount} old recommendations, deleted ${deletedCount} old rejected stocks (checked ${totalStocksChecked} total stocks across ${users2.length} users)`);
  } catch (error) {
    console.error("[Cleanup] Error in cleanup job:", error);
  }
}
var log16, ONE_HOUR3, TWO_WEEKS_MS;
var init_recommendationCleanup = __esm({
  "server/jobs/recommendationCleanup.ts"() {
    "use strict";
    init_logger();
    log16 = createLogger("jobs");
    ONE_HOUR3 = 60 * 60 * 1e3;
    TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1e3;
  }
});

// server/jobs/simulatedRuleExecution.ts
async function getTelegramNotificationService2() {
  if (!ENABLE_TELEGRAM2) return null;
  try {
    const { telegramNotificationService: telegramNotificationService2 } = await Promise.resolve().then(() => (init_telegramNotificationService(), telegramNotificationService_exports));
    return telegramNotificationService2;
  } catch {
    return null;
  }
}
async function runSimulatedRuleExecution(storage2) {
  try {
    if (!isMarketOpen3()) {
      log17("[SimRuleExec] Market is closed, skipping rule evaluation");
      return;
    }
    log17("[SimRuleExec] Evaluating trading rules for simulated holdings...");
    const users2 = await storage2.getUsers();
    const allRulesArray = [];
    const allHoldingsArray = [];
    for (const user of users2) {
      const userRules = await storage2.getTradingRules(user.id);
      const userHoldings = await storage2.getPortfolioHoldings(user.id, true);
      allRulesArray.push(...userRules);
      allHoldingsArray.push(...userHoldings);
    }
    const enabledRules = allRulesArray.filter((rule) => rule.enabled);
    if (enabledRules.length === 0) {
      log17("[SimRuleExec] No enabled rules to evaluate");
      return;
    }
    const holdings = allHoldingsArray;
    if (holdings.length === 0) {
      log17("[SimRuleExec] No simulated holdings to evaluate");
      return;
    }
    const stockMap = /* @__PURE__ */ new Map();
    for (const user of users2) {
      const userStocks = await storage2.getStocks(user.id);
      for (const stock of userStocks) {
        if (!stockMap.has(stock.ticker)) {
          stockMap.set(stock.ticker, stock);
        }
      }
    }
    let executedCount = 0;
    const telegramNotificationService2 = await getTelegramNotificationService2();
    for (const holding of holdings) {
      const stock = stockMap.get(holding.ticker);
      if (!stock) continue;
      const currentPrice = parseFloat(stock.currentPrice);
      const purchasePrice = parseFloat(holding.averagePurchasePrice);
      const previousClose = parseFloat(stock.previousClose || stock.currentPrice);
      const applicableRules = enabledRules.filter(
        (rule) => (rule.action === "sell" || rule.action === "sell_all") && (rule.scope === "all_holdings" || rule.scope === "specific_stock" && rule.ticker === holding.ticker)
      );
      for (const rule of applicableRules) {
        if (!rule.conditions || rule.conditions.length === 0) continue;
        const condition = rule.conditions[0];
        let targetPrice = 0;
        let isTriggered = false;
        if (condition.metric === "price_change_percent") {
          targetPrice = purchasePrice * (1 + condition.value / 100);
          if (condition.operator === "<" || condition.operator === "<=") {
            isTriggered = currentPrice <= targetPrice;
          } else if (condition.operator === ">" || condition.operator === ">=") {
            isTriggered = currentPrice >= targetPrice;
          }
        } else if (condition.metric === "price_change_from_close_percent") {
          targetPrice = previousClose * (1 + condition.value / 100);
          if (condition.operator === "<" || condition.operator === "<=") {
            isTriggered = currentPrice <= targetPrice;
          } else if (condition.operator === ">" || condition.operator === ">=") {
            isTriggered = currentPrice >= targetPrice;
          }
        } else if (condition.metric === "price_absolute") {
          targetPrice = condition.value;
          if (condition.operator === "<" || condition.operator === "<=") {
            isTriggered = currentPrice <= targetPrice;
          } else if (condition.operator === ">" || condition.operator === ">=") {
            isTriggered = currentPrice >= targetPrice;
          }
        }
        if (isTriggered) {
          let quantityToSell = 0;
          if (rule.action === "sell_all") {
            quantityToSell = holding.quantity;
          } else if (rule.actionParams) {
            if ("quantity" in rule.actionParams && rule.actionParams.quantity) {
              quantityToSell = Math.min(rule.actionParams.quantity, holding.quantity);
            } else if ("percentage" in rule.actionParams && rule.actionParams.percentage) {
              quantityToSell = Math.floor(holding.quantity * (rule.actionParams.percentage / 100));
            }
          }
          if (quantityToSell > 0) {
            const total = currentPrice * quantityToSell;
            await storage2.createTrade({
              userId: holding.userId,
              ticker: holding.ticker,
              type: "sell",
              quantity: quantityToSell,
              price: currentPrice.toFixed(2),
              total: total.toFixed(2),
              status: "completed",
              broker: "simulation",
              isSimulated: true
            });
            executedCount++;
            log17(`[SimRuleExec] Executed rule "${rule.name}" for ${holding.ticker}: Sold ${quantityToSell} shares at $${currentPrice.toFixed(2)} (triggered by ${condition.metric})`);
            if (ENABLE_TELEGRAM2 && telegramNotificationService2) {
              const profitLoss = (currentPrice - purchasePrice) * quantityToSell;
              const profitLossPercent = (currentPrice - purchasePrice) / purchasePrice * 100;
              const message = `\u{1F916} SIMULATION: Auto-sell triggered

Rule: ${rule.name}
Stock: ${holding.ticker}
Sold: ${quantityToSell} shares @ $${currentPrice.toFixed(2)}
Purchase Price: $${purchasePrice.toFixed(2)}
P&L: ${profitLoss >= 0 ? "+" : ""}$${profitLoss.toFixed(2)} (${profitLossPercent >= 0 ? "+" : ""}${profitLossPercent.toFixed(2)}%)
Total: $${total.toFixed(2)}`;
              await telegramNotificationService2.sendMessage(message).catch((err) => {
                log17(`[SimRuleExec] Failed to send Telegram notification: ${err.message}`);
              });
            }
          }
        }
      }
    }
    if (executedCount > 0) {
      log17(`[SimRuleExec] Executed ${executedCount} simulated trades based on trading rules`);
    } else {
      log17("[SimRuleExec] No rule conditions met");
    }
  } catch (error) {
    console.error("[SimRuleExec] Error evaluating rules:", error);
  }
}
var log17, FIVE_MINUTES3, ENABLE_TELEGRAM2;
var init_simulatedRuleExecution = __esm({
  "server/jobs/simulatedRuleExecution.ts"() {
    "use strict";
    init_utils();
    init_logger();
    log17 = createLogger("jobs");
    FIVE_MINUTES3 = 5 * 60 * 1e3;
    ENABLE_TELEGRAM2 = process.env.ENABLE_TELEGRAM === "true";
  }
});

// server/jobs/aiAnalysis.ts
async function runAIAnalysis(storage2) {
  if (isRunning) {
    log18("[AIAnalysis] Skipping - previous job still running");
    return;
  }
  isRunning = true;
  try {
    log18("[AIAnalysis] Checking for stocks needing AI analysis...");
    const users2 = await storage2.getUsers();
    const allStocks = [];
    for (const user of users2) {
      const userStocks = await storage2.getStocks(user.id);
      allStocks.push(...userStocks);
    }
    const uniqueTickersSet = /* @__PURE__ */ new Set();
    const pendingStocks = allStocks.filter((stock) => {
      if (stock.recommendationStatus === "pending" && !uniqueTickersSet.has(stock.ticker)) {
        uniqueTickersSet.add(stock.ticker);
        return true;
      }
      return false;
    });
    if (pendingStocks.length === 0) {
      log18("[AIAnalysis] No pending stocks to analyze");
      return;
    }
    const buyCount = pendingStocks.filter((s) => s.recommendation === "buy").length;
    const sellCount = pendingStocks.filter((s) => s.recommendation === "sell").length;
    log18(`[AIAnalysis] Found ${pendingStocks.length} pending stocks (${buyCount} buys, ${sellCount} sells), checking for missing analyses...`);
    let analyzedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    for (const stock of pendingStocks) {
      try {
        const existingAnalysis = await storage2.getStockAnalysis(stock.ticker);
        if (existingAnalysis) {
          if (existingAnalysis.status === "completed" || existingAnalysis.status === "analyzing") {
            skippedCount++;
            continue;
          }
        } else {
          await storage2.saveStockAnalysis({
            ticker: stock.ticker,
            status: "pending"
          });
        }
        await storage2.updateStockAnalysisStatus(stock.ticker, "analyzing");
        log18(`[AIAnalysis] Running multi-signal analysis for ${stock.ticker}...`);
        const [companyOverview, balanceSheet, incomeStatement, cashFlow, dailyPrices] = await Promise.all([
          stockService.getCompanyOverview(stock.ticker),
          stockService.getBalanceSheet(stock.ticker),
          stockService.getIncomeStatement(stock.ticker),
          stockService.getCashFlow(stock.ticker),
          stockService.getDailyPrices(stock.ticker, 60)
        ]);
        const [technicalIndicators, newsSentiment] = await Promise.all([
          stockService.getTechnicalIndicators(stock.ticker, dailyPrices),
          stockService.getNewsSentiment(stock.ticker)
        ]);
        const priceNewsCorrelation = stockService.analyzePriceNewsCorrelation(dailyPrices, newsSentiment);
        log18(`[AIAnalysis] Fetching SEC filings and comprehensive fundamentals for ${stock.ticker}...`);
        let secFilingData = null;
        let comprehensiveFundamentals = null;
        try {
          secFilingData = await secEdgarService.getCompanyFilingData(stock.ticker);
        } catch (error) {
          console.warn(`[AIAnalysis] Could not fetch SEC filings for ${stock.ticker}, continuing without:`, error instanceof Error ? error.message : error);
        }
        try {
          comprehensiveFundamentals = await stockService.getComprehensiveFundamentals(stock.ticker);
        } catch (error) {
          console.warn(`[AIAnalysis] Could not fetch comprehensive fundamentals for ${stock.ticker}, continuing without:`, error instanceof Error ? error.message : error);
        }
        const secFilings = secFilingData ? {
          formType: secFilingData.formType,
          filingDate: secFilingData.filingDate,
          managementDiscussion: secFilingData.managementDiscussion,
          riskFactors: secFilingData.riskFactors,
          businessOverview: secFilingData.businessOverview
        } : void 0;
        const insiderTradingStrength = await (async () => {
          try {
            const allStocks2 = await storage2.getUserStocksForTicker(stock.userId, stock.ticker);
            if (allStocks2.length === 0) {
              return void 0;
            }
            const buyTransactions = allStocks2.filter((s) => s.recommendation?.toLowerCase().includes("buy"));
            const sellTransactions = allStocks2.filter((s) => s.recommendation?.toLowerCase().includes("sell"));
            let direction;
            let transactionType;
            let dominantSignal;
            if (buyTransactions.length > 0 && sellTransactions.length === 0) {
              direction = "buy";
              transactionType = "purchase";
              dominantSignal = "BULLISH - Only insider BUYING detected";
            } else if (sellTransactions.length > 0 && buyTransactions.length === 0) {
              direction = "sell";
              transactionType = "sale";
              dominantSignal = "BEARISH - Only insider SELLING detected";
            } else if (buyTransactions.length > 0 && sellTransactions.length > 0) {
              const sortedByDate = allStocks2.sort(
                (a, b) => new Date(b.lastUpdated || 0).getTime() - new Date(a.lastUpdated || 0).getTime()
              );
              const mostRecentSignal = sortedByDate.find(
                (s) => s.recommendation?.toLowerCase().includes("buy") || s.recommendation?.toLowerCase().includes("sell")
              );
              direction = mostRecentSignal?.recommendation?.toLowerCase().includes("buy") ? "buy" : "sell";
              transactionType = direction === "buy" ? "purchase" : "sale";
              dominantSignal = `MIXED SIGNALS - ${buyTransactions.length} BUY, ${sellTransactions.length} SELL (most recent: ${direction.toUpperCase()})`;
            } else {
              direction = "unknown";
              transactionType = "transaction";
              dominantSignal = "Unknown signal - no clear insider transactions";
            }
            const primaryStock = allStocks2.sort(
              (a, b) => new Date(b.lastUpdated || 0).getTime() - new Date(a.lastUpdated || 0).getTime()
            )[0];
            return {
              direction,
              transactionType,
              dominantSignal,
              buyCount: buyTransactions.length,
              sellCount: sellTransactions.length,
              totalTransactions: allStocks2.length,
              quantityStr: primaryStock.insiderQuantity ? `${primaryStock.insiderQuantity.toLocaleString()} shares` : "Unknown",
              insiderPrice: primaryStock.insiderPrice ? `$${parseFloat(primaryStock.insiderPrice).toFixed(2)}` : "Unknown",
              currentPrice: primaryStock.currentPrice ? `$${parseFloat(primaryStock.currentPrice).toFixed(2)}` : "Unknown",
              insiderName: primaryStock.insiderName || "Unknown",
              insiderTitle: primaryStock.insiderTitle || "Unknown",
              tradeDate: primaryStock.insiderTradeDate || "Unknown",
              totalValue: primaryStock.insiderPrice && primaryStock.insiderQuantity ? `$${(parseFloat(primaryStock.insiderPrice) * primaryStock.insiderQuantity).toFixed(2)}` : "Unknown",
              confidence: primaryStock.confidenceScore?.toString() || "Medium",
              allTransactions: allStocks2.map((s) => ({
                direction: s.recommendation?.toLowerCase() || "unknown",
                insiderName: s.insiderName || "Unknown",
                insiderTitle: s.insiderTitle || "Unknown",
                quantityStr: s.insiderQuantity ? `${s.insiderQuantity.toLocaleString()} shares` : "Unknown",
                price: s.insiderPrice ? `$${parseFloat(s.insiderPrice).toFixed(2)}` : "Unknown",
                date: s.insiderTradeDate || "Unknown",
                value: s.insiderPrice && s.insiderQuantity ? `$${(parseFloat(s.insiderPrice) * s.insiderQuantity).toFixed(2)}` : "Unknown"
              }))
            };
          } catch (error) {
            console.error(`[Reconciliation] Error getting insider trading data for ${stock.ticker}:`, error);
            return void 0;
          }
        })();
        const analysis = await aiAnalysisService.analyzeStock({
          ticker: stock.ticker,
          companyOverview,
          balanceSheet,
          incomeStatement,
          cashFlow,
          technicalIndicators,
          newsSentiment,
          priceNewsCorrelation,
          insiderTradingStrength,
          secFilings,
          comprehensiveFundamentals
        });
        await storage2.updateStockAnalysis(stock.ticker, {
          status: "completed",
          overallRating: analysis.overallRating,
          confidenceScore: analysis.confidenceScore,
          summary: analysis.summary,
          financialHealthScore: analysis.financialHealth.score,
          strengths: analysis.financialHealth.strengths,
          weaknesses: analysis.financialHealth.weaknesses,
          redFlags: analysis.financialHealth.redFlags,
          technicalAnalysisScore: analysis.technicalAnalysis?.score,
          technicalAnalysisTrend: analysis.technicalAnalysis?.trend,
          technicalAnalysisMomentum: analysis.technicalAnalysis?.momentum,
          technicalAnalysisSignals: analysis.technicalAnalysis?.signals,
          sentimentAnalysisScore: analysis.sentimentAnalysis?.score,
          sentimentAnalysisTrend: analysis.sentimentAnalysis?.trend,
          sentimentAnalysisNewsVolume: analysis.sentimentAnalysis?.newsVolume,
          sentimentAnalysisKeyThemes: analysis.sentimentAnalysis?.key_themes,
          keyMetrics: analysis.keyMetrics,
          risks: analysis.risks,
          opportunities: analysis.opportunities,
          recommendation: analysis.recommendation,
          analyzedAt: new Date(analysis.analyzedAt),
          errorMessage: null
          // Clear any previous errors
        });
        analyzedCount++;
        log18(`[AIAnalysis] Successfully analyzed ${stock.ticker} (Score: ${analysis.financialHealth.score}/100, Rating: ${analysis.overallRating})`);
        await new Promise((resolve) => setTimeout(resolve, 2e3));
      } catch (error) {
        errorCount++;
        console.error(`[AIAnalysis] Error analyzing ${stock.ticker}:`, error);
        await storage2.updateStockAnalysisStatus(
          stock.ticker,
          "failed",
          error instanceof Error ? error.message : "Unknown error"
        );
      }
    }
    log18(`[AIAnalysis] Job complete: analyzed ${analyzedCount}, skipped ${skippedCount}, errors ${errorCount}`);
  } catch (error) {
    console.error("[AIAnalysis] Error in AI analysis job:", error);
  } finally {
    isRunning = false;
  }
}
var log18, TEN_MINUTES, isRunning;
var init_aiAnalysis = __esm({
  "server/jobs/aiAnalysis.ts"() {
    "use strict";
    init_stockService();
    init_secEdgarService();
    init_aiAnalysisService();
    init_logger();
    log18 = createLogger("jobs");
    TEN_MINUTES = 10 * 60 * 1e3;
    isRunning = false;
  }
});

// server/jobs/analysisReconciliation.ts
async function runAnalysisReconciliation(storage2) {
  if (isRunning2) {
    log19("[Reconciliation] Skipping - previous job still running");
    return;
  }
  isRunning2 = true;
  try {
    log19("[Reconciliation] Checking for incomplete AI analyses...");
    const incompleteStocks = await storage2.getStocksWithIncompleteAnalysis();
    if (incompleteStocks.length === 0) {
      log19("[Reconciliation] No incomplete analyses found");
      return;
    }
    log19(`[Reconciliation] Found ${incompleteStocks.length} stocks with incomplete analyses`);
    let requeuedCount = 0;
    let skippedCount = 0;
    let repairedCount = 0;
    for (const stock of incompleteStocks) {
      try {
        const existingAnalysis = await storage2.getStockAnalysis(stock.ticker);
        if (existingAnalysis && existingAnalysis.status === "completed") {
          await storage2.markStockAnalysisPhaseComplete(stock.ticker, "micro");
          await storage2.markStockAnalysisPhaseComplete(stock.ticker, "macro");
          await storage2.markStockAnalysisPhaseComplete(stock.ticker, "combined");
          repairedCount++;
          log19(`[Reconciliation] Repaired flags for ${stock.ticker} (analysis already completed)`);
        } else {
          await storage2.enqueueAnalysisJob(stock.ticker, "reconciliation", "low");
          requeuedCount++;
          log19(`[Reconciliation] Re-queued ${stock.ticker} (micro: ${stock.microAnalysisCompleted}, macro: ${stock.macroAnalysisCompleted}, combined: ${stock.combinedAnalysisCompleted})`);
        }
      } catch (error) {
        skippedCount++;
        console.error(`[Reconciliation] Error processing ${stock.ticker}:`, error);
      }
    }
    log19(`[Reconciliation] Job complete: repaired ${repairedCount}, re-queued ${requeuedCount}, skipped ${skippedCount}`);
  } catch (error) {
    console.error("[Reconciliation] Error in reconciliation job:", error);
  } finally {
    isRunning2 = false;
  }
}
var log19, ONE_HOUR4, isRunning2;
var init_analysisReconciliation = __esm({
  "server/jobs/analysisReconciliation.ts"() {
    "use strict";
    init_logger();
    log19 = createLogger("jobs");
    ONE_HOUR4 = 60 * 60 * 1e3;
    isRunning2 = false;
  }
});

// server/jobs/dailyBrief.ts
async function runDailyBriefGeneration(storage2) {
  try {
    log20("[DailyBrief] Starting daily brief generation job...");
    const users2 = await storage2.getUsers();
    if (users2.length === 0) {
      log20("[DailyBrief] No users found");
      return;
    }
    log20(`[DailyBrief] Processing ${users2.length} users...`);
    const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    let generatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    for (const user of users2) {
      let userGeneratedCount = 0;
      let userSkippedCount = 0;
      let userErrorCount = 0;
      try {
        const followedStocks2 = await storage2.getUserFollowedStocks(user.id);
        if (followedStocks2.length === 0) {
          log20(`[DailyBrief] User ${user.name} has no followed stocks, skipping`);
          continue;
        }
        log20(`[DailyBrief] Processing ${followedStocks2.length} followed stocks for user ${user.name}...`);
        for (const followedStock of followedStocks2) {
          const ticker = followedStock.ticker.toUpperCase();
          try {
            const todayBrief = await storage2.getDailyBriefForUser(user.id, ticker, today);
            if (todayBrief) {
              log20(`[DailyBrief] Skipping ${ticker} for ${user.name} - brief already exists for today`);
              skippedCount++;
              userSkippedCount++;
              continue;
            }
            let quote;
            try {
              quote = await stockService.getQuote(ticker);
              if (!quote || quote.price === 0 || quote.previousClose === 0) {
                log20(`[DailyBrief] Skipping ${ticker} - invalid or missing price data from Alpha Vantage`);
                skippedCount++;
                userSkippedCount++;
                continue;
              }
              if (quote.previousClose === 0) {
                log20(`[DailyBrief] Skipping ${ticker} - previous close is zero, cannot calculate change`);
                skippedCount++;
                userSkippedCount++;
                continue;
              }
            } catch (quoteError) {
              log20(`[DailyBrief] Skipping ${ticker} - failed to fetch quote: ${quoteError instanceof Error ? quoteError.message : "Unknown error"}`);
              errorCount++;
              userErrorCount++;
              continue;
            }
            const holding = await storage2.getPortfolioHoldingByTicker(user.id, ticker);
            const userOwnsPosition = holding !== null;
            const latestAnalysis = await storage2.getStockAnalysis(ticker);
            if (latestAnalysis?.status === "completed") {
              log20(`[DailyBrief] Using enriched AI playbook for ${ticker}: score=${latestAnalysis.integratedScore || latestAnalysis.confidenceScore || "N/A"}, rating=${latestAnalysis.overallRating || "N/A"}`);
            } else {
              log20(`[DailyBrief] No completed AI analysis for ${ticker}, using fallback stock data`);
            }
            const stock = await storage2.getStock(user.id, ticker);
            const stockData = stock;
            const getAnalyzedAtString = (val) => {
              if (!val) return void 0;
              if (val instanceof Date) return val.toISOString();
              if (typeof val === "string") return val;
              return void 0;
            };
            const previousAnalysis = latestAnalysis?.status === "completed" ? {
              overallRating: latestAnalysis.overallRating || "hold",
              summary: latestAnalysis.summary || "No summary available",
              recommendation: latestAnalysis.recommendation || void 0,
              integratedScore: latestAnalysis.integratedScore ?? void 0,
              confidenceScore: latestAnalysis.confidenceScore ?? void 0,
              technicalAnalysis: {
                trend: latestAnalysis.technicalAnalysisTrend || "neutral",
                momentum: latestAnalysis.technicalAnalysisMomentum || "weak",
                score: latestAnalysis.technicalAnalysisScore ?? 50,
                signals: latestAnalysis.technicalAnalysisSignals || []
              },
              sentimentAnalysis: {
                trend: latestAnalysis.sentimentAnalysisTrend || "neutral",
                newsVolume: latestAnalysis.sentimentAnalysisNewsVolume || "low",
                score: latestAnalysis.sentimentAnalysisScore ?? 50,
                keyThemes: latestAnalysis.sentimentAnalysisKeyThemes || []
              },
              risks: latestAnalysis.risks || [],
              opportunities: latestAnalysis.opportunities || [],
              analyzedAt: getAnalyzedAtString(latestAnalysis.analyzedAt),
              scorecard: latestAnalysis.scorecard ? {
                globalScore: latestAnalysis.scorecard.globalScore,
                confidence: latestAnalysis.scorecard.confidence,
                sections: latestAnalysis.scorecard.sections ? {
                  fundamentals: latestAnalysis.scorecard.sections.fundamentals ? {
                    score: latestAnalysis.scorecard.sections.fundamentals.score,
                    weight: latestAnalysis.scorecard.sections.fundamentals.weight
                  } : void 0,
                  technicals: latestAnalysis.scorecard.sections.technicals ? {
                    score: latestAnalysis.scorecard.sections.technicals.score,
                    weight: latestAnalysis.scorecard.sections.technicals.weight
                  } : void 0,
                  insiderActivity: latestAnalysis.scorecard.sections.insiderActivity ? {
                    score: latestAnalysis.scorecard.sections.insiderActivity.score,
                    weight: latestAnalysis.scorecard.sections.insiderActivity.weight
                  } : void 0,
                  newsSentiment: latestAnalysis.scorecard.sections.newsSentiment ? {
                    score: latestAnalysis.scorecard.sections.newsSentiment.score,
                    weight: latestAnalysis.scorecard.sections.newsSentiment.weight
                  } : void 0,
                  macroSector: latestAnalysis.scorecard.sections.macroSector ? {
                    score: latestAnalysis.scorecard.sections.macroSector.score,
                    weight: latestAnalysis.scorecard.sections.macroSector.weight
                  } : void 0
                } : void 0,
                summary: latestAnalysis.scorecard.summary
              } : void 0
            } : stockData?.overallRating ? {
              overallRating: stockData.overallRating,
              summary: stockData.summary || "No previous analysis available",
              technicalAnalysis: stockData.technicalAnalysis ? {
                trend: stockData.technicalAnalysis.trend,
                momentum: stockData.technicalAnalysis.momentum,
                score: stockData.technicalAnalysis.score,
                signals: stockData.technicalAnalysis.signals
              } : void 0
            } : void 0;
            const opportunityType = latestAnalysis?.recommendation?.toLowerCase().includes("sell") || latestAnalysis?.recommendation?.toLowerCase().includes("avoid") || stockData?.recommendation?.toLowerCase().includes("sell") ? "sell" : "buy";
            let recentNews;
            try {
              const freshNewsSentiment = await stockService.getNewsSentiment(ticker);
              if (freshNewsSentiment?.articles && freshNewsSentiment.articles.length > 0) {
                recentNews = freshNewsSentiment.articles.slice(0, 5).map((article) => ({
                  title: article.title || "Untitled",
                  sentiment: typeof article.sentiment === "number" ? article.sentiment : 0,
                  source: article.source || "Unknown"
                }));
                log20(`[DailyBrief] Fetched ${recentNews.length} fresh news articles for ${ticker} (overall sentiment: ${freshNewsSentiment.aggregateSentiment?.toFixed(2) || "N/A"})`);
              }
            } catch (newsError) {
              log20(`[DailyBrief] Fresh news fetch failed for ${ticker}, using cached: ${newsError instanceof Error ? newsError.message : "Unknown"}`);
            }
            if (!recentNews || recentNews.length === 0) {
              const now = Date.now() / 1e3;
              const oneDayAgo = now - 24 * 60 * 60;
              recentNews = stockData?.news?.filter((article) => article.datetime && article.datetime >= oneDayAgo)?.slice(0, 3)?.map((article) => ({
                title: article.headline || "Untitled",
                sentiment: 0,
                source: article.source || "Unknown"
              }));
            }
            log20(`[DailyBrief] Generating dual-scenario brief for ${ticker} - user ${user.name} (${userOwnsPosition ? "owns" : "watching"}, ${opportunityType} opportunity)...`);
            const brief = await aiAnalysisService.generateDailyBrief({
              ticker,
              currentPrice: quote.price,
              previousPrice: quote.previousClose,
              opportunityType,
              recentNews: recentNews && recentNews.length > 0 ? recentNews : void 0,
              previousAnalysis
            });
            await storage2.createDailyBrief({
              userId: user.id,
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
            if (userOwnsPosition && brief.owning.recommendedStance === "sell") {
              try {
                const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1e3).toISOString().split("T")[0];
                const yesterdayBrief = await storage2.getDailyBriefForUser(user.id, ticker, yesterday);
                if (yesterdayBrief && yesterdayBrief.recommendedStance === "hold") {
                  log20(`[DailyBrief] Stance change detected for ${ticker} (${user.name}): hold\u2192sell on owned position`);
                  await storage2.createNotification({
                    userId: user.id,
                    ticker,
                    type: "stance_change",
                    message: `${ticker}: Stance changed from HOLD to SELL on your position`,
                    metadata: {
                      previousStance: "hold",
                      newStance: "sell"
                    },
                    isRead: false
                  });
                  log20(`[DailyBrief] Created stance_change notification for ${ticker} (${user.name})`);
                }
              } catch (notifError) {
                if (notifError instanceof Error && !notifError.message.includes("unique constraint")) {
                  log20(`[DailyBrief] Failed to create stance change notification for ${ticker} (${user.name}): ${notifError.message}`);
                }
              }
            }
            generatedCount++;
            userGeneratedCount++;
            log20(`[DailyBrief] Generated dual-scenario brief for ${ticker} (${user.name}): Watching=${brief.watching.recommendedStance}(${brief.watching.confidence}), Owning=${brief.owning.recommendedStance}(${brief.owning.confidence})`);
          } catch (error) {
            errorCount++;
            userErrorCount++;
            const errorMsg = error instanceof Error ? error.message : "Unknown error";
            log20(`[DailyBrief] Error generating brief for ${ticker} (${user.name}): ${errorMsg}`);
          }
        }
        log20(`[DailyBrief] User ${user.name} complete: generated ${userGeneratedCount}, skipped ${userSkippedCount}, errors ${userErrorCount}`);
      } catch (error) {
        errorCount++;
        userErrorCount++;
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        log20(`[DailyBrief] Error processing user ${user.name}: ${errorMsg}`);
      }
    }
    log20(`[DailyBrief] Job complete: generated ${generatedCount}, skipped ${skippedCount}, errors ${errorCount}`);
  } catch (error) {
    console.error("[DailyBrief] Error in daily brief job:", error);
  }
}
var log20, ONE_DAY3;
var init_dailyBrief = __esm({
  "server/jobs/dailyBrief.ts"() {
    "use strict";
    init_stockService();
    init_aiAnalysisService();
    init_logger();
    log20 = createLogger("jobs");
    ONE_DAY3 = 24 * 60 * 60 * 1e3;
  }
});

// server/jobs/unverifiedUserCleanup.ts
async function runUnverifiedUserCleanup(storage2) {
  try {
    log21("[UnverifiedCleanup] Starting cleanup of unverified users...");
    const deletedCount = await storage2.purgeUnverifiedUsers(CLEANUP_THRESHOLD_HOURS);
    if (deletedCount > 0) {
      log21(`[UnverifiedCleanup] Deleted ${deletedCount} unverified user(s) older than ${CLEANUP_THRESHOLD_HOURS} hours`);
    } else {
      log21("[UnverifiedCleanup] No unverified users to clean up");
    }
  } catch (error) {
    console.error("[UnverifiedCleanup] Error cleaning up unverified users:", error);
  }
}
var log21, SIX_HOURS, CLEANUP_THRESHOLD_HOURS;
var init_unverifiedUserCleanup = __esm({
  "server/jobs/unverifiedUserCleanup.ts"() {
    "use strict";
    init_logger();
    log21 = createLogger("jobs");
    SIX_HOURS = 6 * 60 * 60 * 1e3;
    CLEANUP_THRESHOLD_HOURS = 48;
  }
});

// server/queue/jobProcessors.ts
var jobProcessors;
var init_jobProcessors = __esm({
  async "server/queue/jobProcessors.ts"() {
    "use strict";
    init_priceUpdate();
    init_candlestickData();
    init_holdingsPriceHistory();
    await init_telegramFetch();
    init_openinsiderFetch();
    init_recommendationCleanup();
    init_simulatedRuleExecution();
    init_aiAnalysis();
    init_analysisReconciliation();
    init_dailyBrief();
    init_unverifiedUserCleanup();
    init_cleanupStaleStocks();
    init_generateTickerDailyBriefs();
    init_queues();
    jobProcessors = {
      [QUEUE_NAMES.PRICE_UPDATE]: async (job, storage2) => {
        await runPriceUpdate(storage2);
      },
      [QUEUE_NAMES.CANDLESTICK_DATA]: async (job, storage2) => {
        await runCandlestickDataFetch(storage2);
      },
      [QUEUE_NAMES.HOLDINGS_PRICE_HISTORY]: async (job, storage2) => {
        await runHoldingsPriceHistoryUpdate(storage2);
      },
      [QUEUE_NAMES.TELEGRAM_FETCH]: async (job, storage2) => {
        await runTelegramFetch(storage2);
      },
      [QUEUE_NAMES.OPENINSIDER_FETCH]: async (job, storage2) => {
        await runOpeninsiderFetch(storage2);
      },
      [QUEUE_NAMES.RECOMMENDATION_CLEANUP]: async (job, storage2) => {
        await runRecommendationCleanup(storage2);
      },
      [QUEUE_NAMES.SIMULATED_RULE_EXECUTION]: async (job, storage2) => {
        await runSimulatedRuleExecution(storage2);
      },
      [QUEUE_NAMES.AI_ANALYSIS]: async (job, storage2) => {
        await runAIAnalysis(storage2);
      },
      [QUEUE_NAMES.ANALYSIS_RECONCILIATION]: async (job, storage2) => {
        await runAnalysisReconciliation(storage2);
      },
      [QUEUE_NAMES.DAILY_BRIEF]: async (job, storage2) => {
        await runDailyBriefGeneration(storage2);
      },
      [QUEUE_NAMES.UNVERIFIED_USER_CLEANUP]: async (job, storage2) => {
        await runUnverifiedUserCleanup(storage2);
      },
      [QUEUE_NAMES.CLEANUP_STALE_STOCKS]: async (job, storage2) => {
        await runStaleStockCleanup(storage2);
      },
      [QUEUE_NAMES.TICKER_DAILY_BRIEF]: async (job, storage2) => {
        await runTickerDailyBriefGeneration(storage2);
      }
    };
  }
});

// server/queue/enhancedWorkers.ts
import { Worker as Worker2 } from "bullmq";
function createEnhancedWorker(queueName, storage2, customConcurrency) {
  if (workers2.has(queueName)) {
    log22.warn(`Worker for queue '${queueName}' already exists, returning existing worker`);
    return workers2.get(queueName);
  }
  const connection = getRedisConnection();
  const concurrency = customConcurrency ?? WORKER_CONCURRENCY[queueName] ?? 1;
  const config = WORKER_CONFIG[queueName] || {};
  const processor = jobProcessors[queueName];
  if (!processor) {
    throw new Error(`No processor found for queue: ${queueName}`);
  }
  const worker = new Worker2(
    queueName,
    async (job) => {
      const jobStartTime = Date.now();
      const jobId = job.id;
      const jobName = job.name;
      log22.info(`[${queueName}] Starting job '${jobName}' (ID: ${jobId})`, {
        queue: queueName,
        jobId,
        jobName,
        data: job.data
      });
      eventDispatcher.emit("job:started", {
        queue: queueName,
        jobId: String(jobId),
        jobName,
        data: job.data
      });
      try {
        const result = await processor(job, storage2);
        const duration = Date.now() - jobStartTime;
        log22.info(`[${queueName}] Job '${jobName}' (ID: ${jobId}) completed successfully in ${duration}ms`, {
          queue: queueName,
          jobId,
          jobName,
          duration
        });
        eventDispatcher.emit("job:completed", {
          queue: queueName,
          jobId: String(jobId),
          jobName,
          duration,
          result
        });
        return result;
      } catch (error) {
        const duration = Date.now() - jobStartTime;
        const errorMessage = error instanceof Error ? error.message : String(error);
        log22.error(`[${queueName}] Job '${jobName}' (ID: ${jobId}) failed after ${duration}ms: ${errorMessage}`, error, {
          queue: queueName,
          jobId,
          jobName,
          duration,
          attempt: job.attemptsMade,
          maxAttempts: job.opts.attempts
        });
        eventDispatcher.emit("job:failed", {
          queue: queueName,
          jobId: String(jobId),
          jobName,
          duration,
          error: errorMessage,
          attempt: job.attemptsMade,
          maxAttempts: job.opts.attempts,
          willRetry: (job.opts.attempts || 1) > (job.attemptsMade || 0)
        });
        throw error;
      }
    },
    {
      connection,
      concurrency,
      removeOnComplete: {
        age: 24 * 3600,
        // Keep completed jobs for 24 hours
        count: 1e3
        // Keep last 1000 completed jobs
      },
      removeOnFail: {
        age: 7 * 24 * 3600
        // Keep failed jobs for 7 days
      },
      ...config
    }
  );
  worker.on("completed", (job) => {
    log22.debug(`[${queueName}] Worker event: job completed`, {
      queue: queueName,
      jobId: job.id,
      jobName: job.name
    });
  });
  worker.on("failed", (job, err) => {
    log22.debug(`[${queueName}] Worker event: job failed`, {
      queue: queueName,
      jobId: job?.id,
      jobName: job?.name,
      error: err.message
    });
  });
  worker.on("error", (err) => {
    log22.error(`[${queueName}] Worker error: ${err.message}`, err, {
      queue: queueName
    });
  });
  worker.on("stalled", (jobId) => {
    log22.warn(`[${queueName}] Job stalled: ${jobId}`, {
      queue: queueName,
      jobId: String(jobId)
    });
    eventDispatcher.emit("job:stalled", {
      queue: queueName,
      jobId: String(jobId)
    });
  });
  worker.on("drained", () => {
    log22.info(`[${queueName}] Worker drained (all jobs processed)`, {
      queue: queueName
    });
  });
  workers2.set(queueName, worker);
  log22.info(`Enhanced worker for queue '${queueName}' created with concurrency ${concurrency}`, {
    queue: queueName,
    concurrency,
    config: config.attempts ? { attempts: config.attempts, backoff: config.backoff } : void 0
  });
  return worker;
}
var log22, WORKER_CONCURRENCY, WORKER_CONFIG, workers2;
var init_enhancedWorkers = __esm({
  async "server/queue/enhancedWorkers.ts"() {
    "use strict";
    init_connection();
    init_logger();
    await init_jobProcessors();
    init_queues();
    init_eventDispatcher();
    log22 = createLogger("queue:enhanced-workers");
    WORKER_CONCURRENCY = {
      [QUEUE_NAMES.PRICE_UPDATE]: parseInt(process.env.WORKER_PRICE_UPDATE_CONCURRENCY || "2", 10),
      [QUEUE_NAMES.CANDLESTICK_DATA]: parseInt(process.env.WORKER_CANDLESTICK_CONCURRENCY || "1", 10),
      [QUEUE_NAMES.HOLDINGS_PRICE_HISTORY]: parseInt(process.env.WORKER_HOLDINGS_CONCURRENCY || "2", 10),
      [QUEUE_NAMES.TELEGRAM_FETCH]: parseInt(process.env.WORKER_TELEGRAM_CONCURRENCY || "1", 10),
      [QUEUE_NAMES.OPENINSIDER_FETCH]: parseInt(process.env.WORKER_OPENINSIDER_CONCURRENCY || "1", 10),
      [QUEUE_NAMES.CLEANUP_STALE_STOCKS]: parseInt(process.env.WORKER_CLEANUP_CONCURRENCY || "1", 10),
      [QUEUE_NAMES.RECOMMENDATION_CLEANUP]: parseInt(process.env.WORKER_RECOMMENDATION_CLEANUP_CONCURRENCY || "1", 10),
      [QUEUE_NAMES.SIMULATED_RULE_EXECUTION]: parseInt(process.env.WORKER_SIMULATED_RULE_CONCURRENCY || "2", 10),
      [QUEUE_NAMES.AI_ANALYSIS]: parseInt(process.env.WORKER_AI_ANALYSIS_CONCURRENCY || "3", 10),
      // Increased for AI jobs
      [QUEUE_NAMES.ANALYSIS_RECONCILIATION]: parseInt(process.env.WORKER_ANALYSIS_RECONCILIATION_CONCURRENCY || "1", 10),
      [QUEUE_NAMES.DAILY_BRIEF]: parseInt(process.env.WORKER_DAILY_BRIEF_CONCURRENCY || "2", 10),
      [QUEUE_NAMES.UNVERIFIED_USER_CLEANUP]: parseInt(process.env.WORKER_UNVERIFIED_CLEANUP_CONCURRENCY || "1", 10),
      [QUEUE_NAMES.TICKER_DAILY_BRIEF]: parseInt(process.env.WORKER_TICKER_DAILY_BRIEF_CONCURRENCY || "2", 10)
    };
    WORKER_CONFIG = {
      [QUEUE_NAMES.AI_ANALYSIS]: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 5e3
          // Start with 5 seconds, exponential backoff
        }
      },
      [QUEUE_NAMES.PRICE_UPDATE]: {
        attempts: 3,
        backoff: {
          type: "fixed",
          delay: 2e3
          // 2 second delay between retries
        }
      }
      // Add more configurations as needed
    };
    workers2 = /* @__PURE__ */ new Map();
  }
});

// server/index.ts
import express2 from "express";

// server/routes.ts
await init_storage();
init_db();
init_schema();
await init_telegram();
init_stockService();
import { createServer } from "http";
import { z as z2 } from "zod";
import { eq as eq33, or as or4 } from "drizzle-orm";

// server/ibkrService.ts
import axios from "axios";
import https from "https";
var IbkrService = class {
  client;
  gatewayUrl;
  constructor(gatewayUrl = "https://localhost:5000") {
    this.gatewayUrl = gatewayUrl;
    this.client = axios.create({
      baseURL: `${gatewayUrl}/v1/api`,
      timeout: 1e4,
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
        // Required for self-signed cert on localhost
      })
    });
  }
  /**
   * Check if the gateway is authenticated and ready
   */
  async checkAuthStatus() {
    try {
      const response = await this.client.get("/iserver/auth/status");
      return response.data;
    } catch (error) {
      console.error("IBKR auth status check failed:", error);
      throw new Error("Failed to check IBKR authentication status. Is the gateway running?");
    }
  }
  /**
   * Get list of accounts
   */
  async getAccounts() {
    try {
      const response = await this.client.get("/portfolio/accounts");
      return response.data;
    } catch (error) {
      console.error("IBKR get accounts failed:", error);
      throw new Error("Failed to fetch IBKR accounts");
    }
  }
  /**
   * Get portfolio positions for an account
   */
  async getPositions(accountId) {
    try {
      const response = await this.client.get(`/portfolio/${accountId}/positions/0`);
      return response.data;
    } catch (error) {
      console.error("IBKR get positions failed:", error);
      throw new Error("Failed to fetch IBKR positions");
    }
  }
  /**
   * Search for a stock by ticker symbol to get contract ID (conid)
   */
  async searchContract(symbol) {
    try {
      const response = await this.client.get("/iserver/secdef/search", {
        params: { symbol }
      });
      return response.data;
    } catch (error) {
      console.error("IBKR contract search failed:", error);
      throw new Error(`Failed to search for ${symbol}`);
    }
  }
  /**
   * Get market data snapshot for a contract
   */
  async getMarketData(conid) {
    try {
      const response = await this.client.get("/iserver/marketdata/snapshot", {
        params: {
          conids: conid,
          fields: "31,55,84,86"
          // Last price, symbol, bid, ask
        }
      });
      return response.data[0];
    } catch (error) {
      console.error("IBKR market data fetch failed:", error);
      throw new Error("Failed to fetch market data");
    }
  }
  /**
   * Place a market order
   */
  async placeOrder(orderRequest) {
    try {
      const orderPayload = {
        orders: [{
          conid: orderRequest.conid,
          orderType: orderRequest.orderType,
          side: orderRequest.side,
          quantity: orderRequest.quantity,
          tif: orderRequest.tif || "DAY",
          ...orderRequest.price && { price: orderRequest.price }
        }]
      };
      const response = await this.client.post(
        `/iserver/account/${orderRequest.accountId}/orders`,
        orderPayload
      );
      const orderData = response.data[0];
      if (orderData.id && !orderData.error) {
        try {
          const confirmResponse = await this.client.post(
            `/iserver/reply/${orderData.id}`,
            { confirmed: true }
          );
          return {
            orderId: orderData.id,
            orderStatus: confirmResponse.data.order_status || "Submitted"
          };
        } catch (confirmError) {
          console.error("IBKR order confirmation failed:", confirmError);
          throw new Error("Order placed but confirmation failed");
        }
      } else if (orderData.error) {
        throw new Error(orderData.error);
      }
      return {
        orderId: orderData.id || "unknown",
        orderStatus: orderData.order_status || "Unknown"
      };
    } catch (error) {
      console.error("IBKR order placement failed:", error);
      throw new Error(error.response?.data?.error || "Failed to place order");
    }
  }
  /**
   * Get order status
   */
  async getOrderStatus(orderId) {
    try {
      const response = await this.client.get(`/iserver/account/order/status/${orderId}`);
      return response.data;
    } catch (error) {
      console.error("IBKR order status check failed:", error);
      throw new Error("Failed to get order status");
    }
  }
  /**
   * Cancel an order
   */
  async cancelOrder(accountId, orderId) {
    try {
      const response = await this.client.delete(`/iserver/account/${accountId}/order/${orderId}`);
      return response.data;
    } catch (error) {
      console.error("IBKR order cancellation failed:", error);
      throw new Error("Failed to cancel order");
    }
  }
  /**
   * Helper: Place a market buy order by ticker symbol
   */
  async buyStock(accountId, ticker, quantity) {
    const contracts = await this.searchContract(ticker);
    if (!contracts || contracts.length === 0) {
      throw new Error(`No contract found for ticker ${ticker}`);
    }
    const stockContract = contracts.find(
      (c) => c.sections?.some((s) => s.secType === "STK")
    );
    if (!stockContract) {
      throw new Error(`No stock contract found for ${ticker}`);
    }
    return this.placeOrder({
      accountId,
      conid: stockContract.conid,
      ticker,
      orderType: "MKT",
      side: "BUY",
      quantity,
      tif: "DAY"
    });
  }
  /**
   * Helper: Place a market sell order by ticker symbol
   */
  async sellStock(accountId, ticker, quantity) {
    const contracts = await this.searchContract(ticker);
    if (!contracts || contracts.length === 0) {
      throw new Error(`No contract found for ticker ${ticker}`);
    }
    const stockContract = contracts.find(
      (c) => c.sections?.some((s) => s.secType === "STK")
    );
    if (!stockContract) {
      throw new Error(`No stock contract found for ${ticker}`);
    }
    return this.placeOrder({
      accountId,
      conid: stockContract.conid,
      ticker,
      orderType: "MKT",
      side: "SELL",
      quantity,
      tif: "DAY"
    });
  }
};
var ibkrServiceInstance = null;
function getIbkrService(gatewayUrl) {
  if (!ibkrServiceInstance || gatewayUrl && ibkrServiceInstance["gatewayUrl"] !== gatewayUrl) {
    ibkrServiceInstance = new IbkrService(gatewayUrl);
  }
  return ibkrServiceInstance;
}

// server/routes.ts
init_telegramNotificationService();
await init_backtestService();
init_finnhubService();
init_openinsiderService();

// server/session.ts
import session from "express-session";
import MemoryStore from "memorystore";
var MemStore = MemoryStore(session);
var sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || "tradepro-session-secret-key",
  resave: false,
  saveUninitialized: false,
  store: new MemStore({
    checkPeriod: 864e5
    // prune expired entries every 24h
  }),
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1e3,
    // 30 days
    httpOnly: true,
    secure: false
    // set to true if using HTTPS
  }
});
function createRequireAdmin(storage2) {
  return async function requireAdmin(req, res, next) {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const user = await storage2.getUser(req.session.userId);
    if (!user || !user.isAdmin) {
      return res.status(403).json({ error: "Unauthorized - Admin access required" });
    }
    next();
  };
}

// server/paypalService.ts
var cachedAccessToken = null;
var tokenExpiresAt = 0;
async function generatePayPalAccessToken() {
  if (cachedAccessToken && Date.now() < tokenExpiresAt) {
    return cachedAccessToken;
  }
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("PayPal credentials not configured");
  }
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const response = await fetch("https://api-m.paypal.com/v1/oauth2/token", {
    method: "POST",
    body: "grant_type=client_credentials",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded"
    }
  });
  if (!response.ok) {
    throw new Error(`Failed to generate access token: ${response.statusText}`);
  }
  const data = await response.json();
  cachedAccessToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1e3;
  return data.access_token;
}
async function verifyPayPalWebhook(request) {
  try {
    const accessToken = await generatePayPalAccessToken();
    const verificationPayload = {
      auth_algo: request.headers["paypal-auth-algo"],
      cert_url: request.headers["paypal-cert-url"],
      transmission_id: request.headers["paypal-transmission-id"],
      transmission_sig: request.headers["paypal-transmission-sig"],
      transmission_time: request.headers["paypal-transmission-time"],
      webhook_id: request.webhookId,
      webhook_event: request.body
    };
    const response = await fetch(
      "https://api-m.paypal.com/v1/notifications/verify-webhook-signature",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify(verificationPayload)
      }
    );
    if (!response.ok) {
      const errorData = await response.json();
      console.error("[PayPal Webhook Verification] API Error:", errorData);
      return false;
    }
    const data = await response.json();
    return data.verification_status === "SUCCESS";
  } catch (error) {
    console.error("[PayPal Webhook Verification] Error:", error);
    return false;
  }
}
async function cancelPayPalSubscription(subscriptionId, reason = "Account closed by administrator") {
  if (!subscriptionId || subscriptionId === "manual_activation") {
    console.log("[PayPal] Skipping cancellation for non-PayPal subscription:", subscriptionId);
    return { success: true };
  }
  try {
    const accessToken = await generatePayPalAccessToken();
    const response = await fetch(
      `https://api-m.paypal.com/v1/billing/subscriptions/${subscriptionId}/cancel`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({ reason })
      }
    );
    if (response.status === 204) {
      console.log(`[PayPal] Successfully cancelled subscription: ${subscriptionId}`);
      return { success: true };
    }
    if (response.status === 422) {
      const errorData2 = await response.json();
      if (errorData2.details?.[0]?.issue === "SUBSCRIPTION_STATUS_INVALID") {
        console.log(`[PayPal] Subscription already cancelled or invalid: ${subscriptionId}`);
        return { success: true };
      }
    }
    const errorData = await response.json().catch(() => ({}));
    console.error(`[PayPal] Failed to cancel subscription ${subscriptionId}:`, errorData);
    return {
      success: false,
      error: errorData.message || `HTTP ${response.status}`
    };
  } catch (error) {
    console.error("[PayPal] Cancel subscription error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
async function getSubscriptionTransactions(subscriptionId, startTime, endTime) {
  if (!subscriptionId || subscriptionId === "manual_activation") {
    return { success: true, transactions: [] };
  }
  try {
    const accessToken = await generatePayPalAccessToken();
    const now = /* @__PURE__ */ new Date();
    const defaultEndTime = now.toISOString();
    const defaultStartTime = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1e3).toISOString();
    const params = new URLSearchParams({
      start_time: startTime || defaultStartTime,
      end_time: endTime || defaultEndTime
    });
    const response = await fetch(
      `https://api-m.paypal.com/v1/billing/subscriptions/${subscriptionId}/transactions?${params}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        }
      }
    );
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`[PayPal] Failed to get transactions for ${subscriptionId}:`, errorData);
      return {
        success: false,
        error: errorData.message || `HTTP ${response.status}`
      };
    }
    const data = await response.json();
    console.log(`[PayPal] Retrieved ${data.transactions?.length || 0} transactions for ${subscriptionId}`);
    return {
      success: true,
      transactions: data.transactions || []
    };
  } catch (error) {
    console.error("[PayPal] Get transactions error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

// server/routes.ts
init_aiAnalysisService();

// server/middleware/rateLimiter.ts
init_connection();
init_logger();
import { RateLimiterRedis, RateLimiterMemory } from "rate-limiter-flexible";
var log5 = createLogger("rateLimiter");
var limiters = /* @__PURE__ */ new Map();
function getRateLimiter(keyPrefix, options) {
  const cacheKey = `${keyPrefix}:${options.points}:${options.duration}`;
  if (limiters.has(cacheKey)) {
    return limiters.get(cacheKey);
  }
  let limiter;
  if (isRedisConnected()) {
    try {
      const redisClient2 = getRedisConnection();
      limiter = new RateLimiterRedis({
        storeClient: redisClient2,
        keyPrefix,
        points: options.points,
        duration: options.duration,
        blockDuration: options.blockDuration || options.duration
      });
      log5.info(`Created Redis-backed rate limiter: ${keyPrefix} (${options.points} requests per ${options.duration}s)`);
    } catch (error) {
      log5.warn(`Failed to create Redis rate limiter, falling back to memory: ${keyPrefix}`, error);
      limiter = new RateLimiterMemory({
        keyPrefix,
        points: options.points,
        duration: options.duration,
        blockDuration: options.blockDuration || options.duration
      });
    }
  } else {
    log5.warn(`Redis not available, using in-memory rate limiter: ${keyPrefix}`);
    limiter = new RateLimiterMemory({
      keyPrefix,
      points: options.points,
      duration: options.duration,
      blockDuration: options.blockDuration || options.duration
    });
  }
  limiters.set(cacheKey, limiter);
  return limiter;
}
function createRateLimiter(options) {
  const limiter = getRateLimiter("rl", {
    points: options.points,
    duration: options.duration,
    blockDuration: options.blockDuration
  });
  return async (req, res, next) => {
    try {
      const key = options.keyGenerator ? options.keyGenerator(req) : req.ip || req.socket.remoteAddress || "unknown";
      await limiter.consume(key);
      next();
    } catch (rateLimiterRes) {
      const retryAfter = Math.round(rateLimiterRes.msBeforeNext / 1e3) || 1;
      res.status(429).json({
        error: options.message || "Too many requests, please try again later",
        retryAfter,
        limit: options.points,
        window: options.duration
      });
      res.setHeader("Retry-After", retryAfter);
    }
  };
}
var globalApiRateLimiter = createRateLimiter({
  points: 100,
  duration: 15 * 60,
  // 15 minutes
  blockDuration: 15 * 60,
  // Block for 15 minutes
  message: "API rate limit exceeded. Please try again later."
});
var authRateLimiter = createRateLimiter({
  points: 5,
  duration: 15 * 60,
  // 15 minutes
  blockDuration: 30 * 60,
  // Block for 30 minutes
  message: "Too many authentication attempts. Please try again later."
});
var passwordResetRateLimiter = createRateLimiter({
  points: 3,
  duration: 60 * 60,
  // 1 hour
  blockDuration: 60 * 60,
  // Block for 1 hour
  message: "Too many password reset attempts. Please try again later."
});
var emailVerificationRateLimiter = createRateLimiter({
  points: 5,
  duration: 60 * 60,
  // 1 hour
  blockDuration: 60 * 60,
  // Block for 1 hour
  message: "Too many email verification requests. Please try again later."
});
var registrationRateLimiter = createRateLimiter({
  points: 3,
  duration: 60 * 60,
  // 1 hour
  blockDuration: 60 * 60,
  // Block for 1 hour
  message: "Too many registration attempts. Please try again later."
});
var adminRateLimiter = createRateLimiter({
  points: 200,
  duration: 15 * 60,
  // 15 minutes
  blockDuration: 15 * 60,
  // Block for 15 minutes
  message: "Admin API rate limit exceeded. Please try again later."
});
var webhookRateLimiter = createRateLimiter({
  points: 1e3,
  duration: 60,
  // 1 minute
  blockDuration: 60,
  // Block for 1 minute
  message: "Webhook rate limit exceeded."
});
var stockDataRateLimiter = createRateLimiter({
  points: 10,
  duration: 60,
  // 1 minute
  blockDuration: 60,
  // Block for 1 minute
  keyGenerator: (req) => {
    return req.session?.userId ? `user:${req.session.userId}` : req.ip || req.socket.remoteAddress || "unknown";
  },
  message: "Too many stock data refresh requests. Please wait before trying again."
});

// server/utils/emailValidation.ts
import { createRequire } from "module";
import { randomBytes } from "crypto";
var require2 = createRequire(import.meta.url);
var disposableDomains = require2("disposable-email-domains");
function isDisposableEmail(email) {
  const domain = email.toLowerCase().split("@")[1];
  if (!domain) return false;
  return disposableDomains.includes(domain);
}
function generateVerificationToken() {
  return randomBytes(32).toString("hex");
}
function isTokenExpired(expiryDate) {
  if (!expiryDate) return true;
  return /* @__PURE__ */ new Date() > new Date(expiryDate);
}

// server/emailService.ts
import { Resend } from "resend";
var connectionSettings;
async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY ? "repl " + process.env.REPL_IDENTITY : process.env.WEB_REPL_RENEWAL ? "depl " + process.env.WEB_REPL_RENEWAL : null;
  if (!xReplitToken) {
    throw new Error("X_REPLIT_TOKEN not found for repl/depl");
  }
  connectionSettings = await fetch(
    "https://" + hostname + "/api/v2/connection?include_secrets=true&connector_names=resend",
    {
      headers: {
        "Accept": "application/json",
        "X_REPLIT_TOKEN": xReplitToken
      }
    }
  ).then((res) => res.json()).then((data) => data.items?.[0]);
  if (!connectionSettings || !connectionSettings.settings.api_key) {
    throw new Error("Resend not connected");
  }
  return {
    apiKey: connectionSettings.settings.api_key,
    fromEmail: connectionSettings.settings.from_email
  };
}
async function getUncachableResendClient() {
  const { apiKey, fromEmail } = await getCredentials();
  return {
    client: new Resend(apiKey),
    fromEmail: fromEmail || "onboarding@resend.dev"
  };
}
async function sendVerificationEmail({ to, name, verificationUrl }) {
  try {
    const { client, fromEmail } = await getUncachableResendClient();
    const { data, error } = await client.emails.send({
      from: fromEmail,
      to,
      subject: "Verify your email - signal2",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Verify Your Email</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 0;">
              <tr>
                <td align="center">
                  <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); overflow: hidden;">
                    <!-- Header -->
                    <tr>
                      <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">signal2</h1>
                        <p style="margin: 8px 0 0; color: #e0e7ff; font-size: 14px;">Stock Analysis Platform</p>
                      </td>
                    </tr>
                    <!-- Content -->
                    <tr>
                      <td style="padding: 40px 30px;">
                        <h2 style="margin: 0 0 16px; color: #111827; font-size: 24px; font-weight: 600;">Welcome, ${name}!</h2>
                        <p style="margin: 0 0 24px; color: #6b7280; font-size: 16px; line-height: 1.6;">
                          Thank you for signing up. To get started with your 30-day free trial, please verify your email address by clicking the button below.
                        </p>
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td align="center" style="padding: 20px 0;">
                              <a href="${verificationUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-weight: 600; font-size: 16px;">
                                Verify Email Address
                              </a>
                            </td>
                          </tr>
                        </table>
                        <p style="margin: 24px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                          Or copy and paste this link into your browser:<br>
                          <a href="${verificationUrl}" style="color: #667eea; word-break: break-all;">${verificationUrl}</a>
                        </p>
                        <p style="margin: 24px 0 0; color: #9ca3af; font-size: 13px; line-height: 1.6;">
                          This verification link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.
                        </p>
                      </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                      <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                        <p style="margin: 0; color: #6b7280; font-size: 13px;">
                          &copy; ${(/* @__PURE__ */ new Date()).getFullYear()} signal2. All rights reserved.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `
    });
    if (error) {
      console.error("[EmailService] Failed to send verification email:", error);
      return false;
    }
    console.log("[EmailService] Verification email sent successfully:", data?.id);
    return true;
  } catch (error) {
    console.error("[EmailService] Error sending verification email:", error);
    return false;
  }
}
async function notifySuperAdminsNewSignup({ adminEmails, userName, userEmail, signupMethod }) {
  if (adminEmails.length === 0) {
    console.log("[EmailService] No super admins to notify");
    return true;
  }
  try {
    const { client, fromEmail } = await getUncachableResendClient();
    const { data, error } = await client.emails.send({
      from: fromEmail,
      to: adminEmails,
      subject: `New User Signup - ${userName}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 0;">
              <tr>
                <td align="center">
                  <table width="500" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
                    <tr>
                      <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
                        <h1 style="margin: 0; color: #ffffff; font-size: 20px;">New User Signup</h1>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 30px;">
                        <p style="margin: 0 0 16px; color: #374151; font-size: 16px;">A new user has signed up for signal2:</p>
                        <table style="width: 100%; border-collapse: collapse;">
                          <tr>
                            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Name:</td>
                            <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">${userName}</td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Email:</td>
                            <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">${userEmail}</td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Signup Method:</td>
                            <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">${signupMethod === "google" ? "Google OAuth" : "Email/Password"}</td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Date:</td>
                            <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">${(/* @__PURE__ */ new Date()).toLocaleString()}</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `
    });
    if (error) {
      console.error("[EmailService] Failed to send admin signup notification:", error);
      return false;
    }
    console.log("[EmailService] Admin signup notification sent:", data?.id);
    return true;
  } catch (error) {
    console.error("[EmailService] Error sending admin signup notification:", error);
    return false;
  }
}
function escapeHtml(text2) {
  return text2.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
async function sendBugReport({ subject, description, reporterName, reporterEmail, url, userAgent }) {
  const recipientEmail = "shaharro@gmail.com";
  const safeSubject = escapeHtml(subject);
  const safeDescription = escapeHtml(description);
  const safeName = escapeHtml(reporterName);
  const safeUrl = escapeHtml(url);
  const safeUserAgent = escapeHtml(userAgent);
  try {
    const { client, fromEmail } = await getUncachableResendClient();
    const { data, error } = await client.emails.send({
      from: fromEmail,
      to: recipientEmail,
      replyTo: reporterEmail,
      subject: `[Bug Report] ${subject}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 0;">
              <tr>
                <td align="center">
                  <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
                    <tr>
                      <td style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
                        <h1 style="margin: 0; color: #ffffff; font-size: 20px;">Bug Report</h1>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 30px;">
                        <h2 style="margin: 0 0 16px; color: #111827; font-size: 18px;">${safeSubject}</h2>
                        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                          <tr>
                            <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 100px;">From:</td>
                            <td style="padding: 8px 0; color: #111827; font-size: 14px;">${safeName} (${reporterEmail})</td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Page URL:</td>
                            <td style="padding: 8px 0; color: #111827; font-size: 14px; word-break: break-all;">${safeUrl}</td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Date:</td>
                            <td style="padding: 8px 0; color: #111827; font-size: 14px;">${(/* @__PURE__ */ new Date()).toLocaleString()}</td>
                          </tr>
                        </table>
                        <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; margin-bottom: 20px;">
                          <h3 style="margin: 0 0 8px; color: #374151; font-size: 14px; font-weight: 600;">Description:</h3>
                          <p style="margin: 0; color: #4b5563; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${safeDescription}</p>
                        </div>
                        <div style="background-color: #f3f4f6; border-radius: 6px; padding: 12px; font-size: 12px; color: #6b7280;">
                          <strong>User Agent:</strong><br>
                          ${safeUserAgent}
                        </div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `
    });
    if (error) {
      console.error("[EmailService] Failed to send bug report:", error);
      return false;
    }
    console.log("[EmailService] Bug report sent:", data?.id);
    return true;
  } catch (error) {
    console.error("[EmailService] Error sending bug report:", error);
    return false;
  }
}
async function notifySuperAdminsFirstPayment({ adminEmails, userName, userEmail, amount, subscriptionId }) {
  if (adminEmails.length === 0) {
    console.log("[EmailService] No super admins to notify");
    return true;
  }
  try {
    const { client, fromEmail } = await getUncachableResendClient();
    const { data, error } = await client.emails.send({
      from: fromEmail,
      to: adminEmails,
      subject: `New Paying Customer - ${userName}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 0;">
              <tr>
                <td align="center">
                  <table width="500" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
                    <tr>
                      <td style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
                        <h1 style="margin: 0; color: #ffffff; font-size: 20px;">New Paying Customer!</h1>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 30px;">
                        <p style="margin: 0 0 16px; color: #374151; font-size: 16px;">A user has made their first payment:</p>
                        <table style="width: 100%; border-collapse: collapse;">
                          <tr>
                            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Name:</td>
                            <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">${userName}</td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Email:</td>
                            <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">${userEmail}</td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Amount:</td>
                            <td style="padding: 8px 0; color: #10b981; font-size: 14px; font-weight: 600;">${amount}</td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Subscription ID:</td>
                            <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">${subscriptionId}</td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Date:</td>
                            <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">${(/* @__PURE__ */ new Date()).toLocaleString()}</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `
    });
    if (error) {
      console.error("[EmailService] Failed to send admin payment notification:", error);
      return false;
    }
    console.log("[EmailService] Admin payment notification sent:", data?.id);
    return true;
  } catch (error) {
    console.error("[EmailService] Error sending admin payment notification:", error);
    return false;
  }
}

// server/googleAuthService.ts
import crypto from "crypto";
function getGoogleCredentials() {
  return {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET
  };
}
function isGoogleConfigured() {
  const { clientId, clientSecret } = getGoogleCredentials();
  return !!(clientId && clientSecret);
}
function generateState() {
  return crypto.randomBytes(32).toString("hex");
}
function getGoogleAuthUrl(redirectUri, state) {
  const { clientId } = getGoogleCredentials();
  if (!clientId) {
    throw new Error("Google OAuth not configured");
  }
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "offline",
    prompt: "consent"
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}
async function exchangeCodeForTokens(code, redirectUri) {
  const { clientId, clientSecret } = getGoogleCredentials();
  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth not configured");
  }
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri
    })
  });
  if (!response.ok) {
    const error = await response.text();
    console.error("[Google OAuth] Token exchange failed:", error);
    throw new Error("Failed to exchange authorization code");
  }
  return response.json();
}
async function verifyIdTokenWithGoogle(idToken) {
  const { clientId } = getGoogleCredentials();
  const response = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
  );
  if (!response.ok) {
    const error = await response.text();
    console.error("[Google OAuth] Token verification failed:", error);
    throw new Error("Invalid or expired ID token");
  }
  const tokenInfo = await response.json();
  if (tokenInfo.aud !== clientId) {
    console.error("[Google OAuth] Token audience mismatch:", tokenInfo.aud, "vs", clientId);
    throw new Error("Token was not issued for this application");
  }
  if (tokenInfo.email_verified !== "true") {
    throw new Error("Email not verified with Google");
  }
  return tokenInfo;
}
async function handleGoogleCallback(code, redirectUri) {
  const tokens = await exchangeCodeForTokens(code, redirectUri);
  const tokenInfo = await verifyIdTokenWithGoogle(tokens.id_token);
  return {
    sub: tokenInfo.sub,
    email: tokenInfo.email,
    name: tokenInfo.name || tokenInfo.given_name || "User",
    picture: tokenInfo.picture,
    emailVerified: tokenInfo.email_verified === "true"
  };
}

// server/routes.ts
init_generateTickerDailyBriefs();
function isMarketOpen2() {
  const now = /* @__PURE__ */ new Date();
  const etTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const day = etTime.getDay();
  if (day === 0 || day === 6) {
    return false;
  }
  const hours = etTime.getHours();
  const minutes = etTime.getMinutes();
  const timeInMinutes = hours * 60 + minutes;
  const marketOpen = 9 * 60 + 30;
  const marketClose = 16 * 60;
  return timeInMinutes >= marketOpen && timeInMinutes < marketClose;
}
async function fetchInitialDataForUser(userId) {
  try {
    console.log(`[InitialDataFetch] Starting initial data fetch for user ${userId}...`);
    const [purchasesResponse, salesResponse] = await Promise.all([
      openinsiderService.fetchInsiderPurchases(500, void 0, "P"),
      openinsiderService.fetchInsiderSales(500, void 0)
    ]);
    const transactions = [...purchasesResponse.transactions, ...salesResponse.transactions];
    const scraperResponse = {
      transactions,
      stats: {
        total_rows_scraped: purchasesResponse.stats.total_rows_scraped + salesResponse.stats.total_rows_scraped,
        filtered_not_purchase: purchasesResponse.stats.filtered_not_purchase + salesResponse.stats.filtered_not_purchase,
        filtered_invalid_data: purchasesResponse.stats.filtered_invalid_data + salesResponse.stats.filtered_invalid_data,
        filtered_by_date: purchasesResponse.stats.filtered_by_date + salesResponse.stats.filtered_by_date,
        filtered_by_title: purchasesResponse.stats.filtered_by_title + salesResponse.stats.filtered_by_title,
        filtered_by_transaction_value: purchasesResponse.stats.filtered_by_transaction_value + salesResponse.stats.filtered_by_transaction_value,
        filtered_by_insider_name: purchasesResponse.stats.filtered_by_insider_name + salesResponse.stats.filtered_by_insider_name
      }
    };
    console.log(`[InitialDataFetch] Fetched ${purchasesResponse.transactions.length} purchases + ${salesResponse.transactions.length} sales = ${transactions.length} total`);
    if (transactions.length === 0) {
      console.log(`[InitialDataFetch] No transactions found for user ${userId}`);
      await storage.markUserInitialDataFetched(userId);
      return;
    }
    const totalStage1Filtered = scraperResponse.stats.filtered_by_title + scraperResponse.stats.filtered_by_transaction_value + scraperResponse.stats.filtered_by_date + scraperResponse.stats.filtered_not_purchase + scraperResponse.stats.filtered_invalid_data;
    console.log(`[InitialDataFetch] ======= STAGE 1: Python Scraper Filters =======`);
    console.log(`[InitialDataFetch] Total rows scraped: ${scraperResponse.stats.total_rows_scraped}`);
    console.log(`[InitialDataFetch]   \u2022 Not a purchase / Invalid: ${scraperResponse.stats.filtered_not_purchase + scraperResponse.stats.filtered_invalid_data}`);
    console.log(`[InitialDataFetch]   \u2022 Filtered by date: ${scraperResponse.stats.filtered_by_date}`);
    console.log(`[InitialDataFetch]   \u2022 Filtered by title: ${scraperResponse.stats.filtered_by_title}`);
    console.log(`[InitialDataFetch]   \u2022 Filtered by transaction value: ${scraperResponse.stats.filtered_by_transaction_value}`);
    console.log(`[InitialDataFetch] \u2192 Total Stage 1 filtered: ${totalStage1Filtered}`);
    console.log(`[InitialDataFetch] \u2192 Returned ${transactions.length} matching transactions`);
    console.log(`[InitialDataFetch] ===================================================`);
    let createdCount = 0;
    let filteredMarketCap = 0;
    let filteredOptionsDeals = 0;
    let filteredAlreadyExists = 0;
    let filteredNoQuote = 0;
    for (const transaction of transactions) {
      try {
        const existingTransaction = await storage.getTransactionByCompositeKey(
          userId,
          // Per-user tenant isolation
          transaction.ticker,
          transaction.filingDate,
          transaction.insiderName,
          transaction.recommendation
          // Use actual recommendation (buy or sell)
        );
        if (existingTransaction) {
          filteredAlreadyExists++;
          continue;
        }
        const quote = await finnhubService.getQuote(transaction.ticker);
        if (!quote || !quote.currentPrice) {
          filteredNoQuote++;
          console.log(`[InitialDataFetch] ${transaction.ticker} no quote available, skipping`);
          continue;
        }
        const stockData = await finnhubService.getBatchStockData([transaction.ticker]);
        const data = stockData.get(transaction.ticker);
        const marketCapValue = data?.marketCap ? data.marketCap * 1e6 : 0;
        if (marketCapValue < 5e8) {
          filteredMarketCap++;
          console.log(`[InitialDataFetch] ${transaction.ticker} market cap too low: $${(marketCapValue / 1e6).toFixed(1)}M, skipping`);
          continue;
        }
        if (transaction.recommendation === "buy") {
          const insiderPriceNum = transaction.price;
          if (insiderPriceNum < quote.currentPrice * 0.15) {
            filteredOptionsDeals++;
            console.log(`[InitialDataFetch] ${transaction.ticker} likely options deal (insider: $${insiderPriceNum.toFixed(2)} < 15% of market: $${quote.currentPrice.toFixed(2)}), skipping`);
            continue;
          }
        }
        await storage.createStock({
          userId,
          // Per-user tenant isolation - this stock belongs to this user only
          ticker: transaction.ticker,
          companyName: transaction.companyName || transaction.ticker,
          currentPrice: quote.currentPrice.toString(),
          previousClose: quote.previousClose?.toString() || quote.currentPrice.toString(),
          insiderPrice: transaction.price.toString(),
          insiderQuantity: transaction.quantity,
          insiderTradeDate: transaction.filingDate,
          insiderName: transaction.insiderName,
          insiderTitle: transaction.insiderTitle,
          recommendation: transaction.recommendation,
          // Use actual recommendation (buy or sell)
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
          priceHistory: []
        });
        createdCount++;
      } catch (err) {
        console.error(`[InitialDataFetch] Error processing ${transaction.ticker}:`, err);
      }
    }
    console.log(`
[InitialDataFetch] ======= STAGE 2: Backend Post-Processing =======`);
    console.log(`[InitialDataFetch] Starting with: ${transactions.length} transactions`);
    console.log(`[InitialDataFetch]   \u2297 Already exists: ${filteredAlreadyExists}`);
    console.log(`[InitialDataFetch]   \u2297 Market cap < $500M: ${filteredMarketCap}`);
    console.log(`[InitialDataFetch]   \u2297 Options deals (< 15%): ${filteredOptionsDeals}`);
    console.log(`[InitialDataFetch]   \u2297 No quote: ${filteredNoQuote}`);
    console.log(`[InitialDataFetch] \u2192 Total Stage 2 filtered: ${filteredAlreadyExists + filteredMarketCap + filteredOptionsDeals + filteredNoQuote}`);
    console.log(`[InitialDataFetch] ===================================================`);
    console.log(`
[InitialDataFetch] \u2713 Successfully created ${createdCount} new recommendations for user ${userId}
`);
    await storage.markUserInitialDataFetched(userId);
  } catch (error) {
    console.error(`[InitialDataFetch] Error fetching initial data for user ${userId}:`, error);
  }
}
async function registerRoutes(app2) {
  const requireAdmin = createRequireAdmin(storage);
  app2.get("/api/feature-flags", async (req, res) => {
    res.json({
      enableTelegram: process.env.ENABLE_TELEGRAM === "true"
    });
  });
  app2.get("/api/version", async (req, res) => {
    try {
      const settings = await storage.getSystemSettings();
      const packageJson = await Promise.resolve().then(() => __toESM(require_package(), 1));
      res.json({
        version: settings?.appVersion || packageJson.default.version,
        name: packageJson.default.name,
        releaseNotes: settings?.releaseNotes || null,
        updatedAt: settings?.updatedAt || null
      });
    } catch (error) {
      const packageJson = await Promise.resolve().then(() => __toESM(require_package(), 1));
      res.json({
        version: packageJson.default.version,
        name: packageJson.default.name
      });
    }
  });
  app2.post("/api/admin/version", requireAdmin, async (req, res) => {
    try {
      const { appVersion, releaseNotes } = req.body;
      if (!appVersion || typeof appVersion !== "string") {
        return res.status(400).json({ error: "Version is required" });
      }
      const settings = await storage.updateSystemSettings({
        appVersion: appVersion.trim(),
        releaseNotes: releaseNotes?.trim() || null,
        lastUpdatedBy: req.session.userId
      });
      res.json({
        success: true,
        version: settings.appVersion,
        releaseNotes: settings.releaseNotes,
        updatedAt: settings.updatedAt
      });
    } catch (error) {
      console.error("Error updating version:", error);
      res.status(500).json({ error: "Failed to update version" });
    }
  });
  app2.get("/api/admin/ai-provider", requireAdmin, async (req, res) => {
    try {
      const settings = await storage.getSystemSettings();
      const { getAvailableProviders: getAvailableProviders2 } = await Promise.resolve().then(() => (init_aiProvider(), aiProvider_exports));
      res.json({
        provider: settings?.aiProvider || "openai",
        model: settings?.aiModel || null,
        availableProviders: getAvailableProviders2()
      });
    } catch (error) {
      console.error("Error getting AI provider:", error);
      res.status(500).json({ error: "Failed to get AI provider configuration" });
    }
  });
  app2.post("/api/admin/ai-provider", requireAdmin, async (req, res) => {
    try {
      const { provider, model } = req.body;
      if (!provider || !["openai", "gemini"].includes(provider)) {
        return res.status(400).json({ error: "Invalid provider. Must be 'openai' or 'gemini'" });
      }
      const { isOpenAIAvailable: isOpenAIAvailable2, isGeminiAvailable: isGeminiAvailable2, clearProviderCache: clearProviderCache2 } = await Promise.resolve().then(() => (init_aiProvider(), aiProvider_exports));
      if (provider === "openai" && !isOpenAIAvailable2()) {
        return res.status(400).json({ error: "OpenAI API key is not configured" });
      }
      if (provider === "gemini" && !isGeminiAvailable2()) {
        return res.status(400).json({ error: "Gemini API key is not configured. Please add GEMINI_API_KEY to secrets." });
      }
      const settings = await storage.updateSystemSettings({
        aiProvider: provider,
        aiModel: model || null,
        lastUpdatedBy: req.session.userId
      });
      clearProviderCache2();
      const { aiAnalysisService: aiAnalysisService2 } = await Promise.resolve().then(() => (init_aiAnalysisService(), aiAnalysisService_exports));
      const { setMacroProviderConfig: setMacroProviderConfig2 } = await Promise.resolve().then(() => (init_macroAgentService(), macroAgentService_exports));
      const { setBacktestProviderConfig: setBacktestProviderConfig2 } = await init_backtestService().then(() => backtestService_exports);
      const config = { provider: settings.aiProvider, model: settings.aiModel || void 0 };
      aiAnalysisService2.setProviderConfig(config);
      setMacroProviderConfig2(config);
      setBacktestProviderConfig2(config);
      console.log(`[Admin] AI provider updated to: ${provider}${model ? ` (model: ${model})` : ""}`);
      res.json({
        success: true,
        provider: settings.aiProvider,
        model: settings.aiModel
      });
    } catch (error) {
      console.error("Error updating AI provider:", error);
      res.status(500).json({ error: "Failed to update AI provider configuration" });
    }
  });
  app2.get("/api/admin/ai-provider/models", requireAdmin, async (req, res) => {
    try {
      const provider = req.query.provider;
      if (!provider || !["openai", "gemini"].includes(provider)) {
        return res.status(400).json({ error: "Invalid provider. Must be 'openai' or 'gemini'" });
      }
      const { fetchAvailableModels: fetchAvailableModels2 } = await Promise.resolve().then(() => (init_aiProvider(), aiProvider_exports));
      const models = await fetchAvailableModels2(provider);
      res.json({
        provider,
        models
      });
    } catch (error) {
      console.error("Error fetching AI models:", error);
      res.status(500).json({ error: "Failed to fetch AI models" });
    }
  });
  app2.post("/api/admin/generate-daily-briefs", requireAdmin, async (req, res) => {
    try {
      console.log("[Admin] Manually triggering daily brief generation...");
      await runTickerDailyBriefGeneration(storage);
      const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const opportunities2 = await storage.getOpportunities({ cadence: "all" });
      const tickerSet = new Set(opportunities2.map((o) => o.ticker.toUpperCase()));
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
  app2.get("/api/auth/current-user", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.json({ user: null });
      }
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        req.session.userId = void 0;
        return res.json({ user: null });
      }
      res.json({ user });
    } catch (error) {
      res.status(500).json({ error: "Failed to get current user" });
    }
  });
  app2.get("/api/auth/trial-status", async (req, res) => {
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
          showPaymentReminder: false
        });
      }
      const now = /* @__PURE__ */ new Date();
      const trialEnd = user.trialEndsAt ? new Date(user.trialEndsAt) : null;
      if (!trialEnd) {
        return res.json({
          status: "trial",
          isTrialActive: true,
          daysRemaining: 0,
          showPaymentReminder: true
        });
      }
      const msRemaining = trialEnd.getTime() - now.getTime();
      const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1e3 * 60 * 60 * 24)));
      const isTrialActive = msRemaining > 0;
      const showPaymentReminder = daysRemaining <= 16 && isTrialActive;
      res.json({
        status: "trial",
        isTrialActive,
        daysRemaining,
        trialEndsAt: trialEnd.toISOString(),
        showPaymentReminder,
        isExpired: !isTrialActive && daysRemaining === 0
      });
    } catch (error) {
      console.error("Trial status error:", error);
      res.status(500).json({ error: "Failed to get trial status" });
    }
  });
  app2.get("/api/user/progress", async (req, res) => {
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
  app2.post("/api/user/complete-onboarding", async (req, res) => {
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
  app2.post("/api/user/tutorial/:id/complete", async (req, res) => {
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
  app2.post("/api/auth/login", authRateLimiter, async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      if (!user.passwordHash) {
        return res.status(401).json({
          error: "This account uses Google Sign-In. Please sign in with Google.",
          authProvider: user.authProvider
        });
      }
      const bcrypt = await import("bcryptjs");
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      if (!user.emailVerified) {
        return res.status(403).json({
          error: "Please verify your email before logging in. Check your inbox for the verification link.",
          emailVerificationRequired: true,
          email: user.email
        });
      }
      if (user.subscriptionStatus === "trial") {
        if (user.trialEndsAt) {
          const now = /* @__PURE__ */ new Date();
          const trialEnd = new Date(user.trialEndsAt);
          if (now > trialEnd) {
            await storage.updateUser(user.id, { subscriptionStatus: "expired" });
            return res.status(403).json({
              error: "Your free trial has expired. Please subscribe to continue.",
              subscriptionStatus: "expired",
              trialExpired: true
            });
          }
        }
      } else if (user.subscriptionStatus === "active") {
      } else {
        return res.status(403).json({
          error: user.subscriptionStatus === "expired" ? "Your free trial has expired. Please subscribe to continue." : "Subscription required",
          subscriptionStatus: user.subscriptionStatus,
          trialExpired: user.subscriptionStatus === "expired"
        });
      }
      req.session.userId = user.id;
      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ error: "Failed to save session" });
        }
        res.json({
          user: {
            ...user,
            passwordHash: void 0
            // Don't send password hash to client
          },
          subscriptionStatus: user.subscriptionStatus
        });
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Failed to login" });
    }
  });
  app2.post("/api/auth/signup", registrationRateLimiter, async (req, res) => {
    try {
      const { name, email, password } = req.body;
      if (!name || !email || !password) {
        return res.status(400).json({ error: "Name, email, and password are required" });
      }
      if (password.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters" });
      }
      if (isDisposableEmail(email)) {
        console.log(`[Signup] Blocked disposable email: ${email}`);
        return res.status(400).json({ error: "Disposable email addresses are not allowed. Please use a permanent email address." });
      }
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "Email already in use" });
      }
      const bcrypt = await import("bcryptjs");
      const passwordHash = await bcrypt.hash(password, 10);
      const avatarColors = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];
      const avatarColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];
      const verificationToken = generateVerificationToken();
      const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1e3);
      const newUser = await storage.createUser({
        name,
        email,
        passwordHash,
        avatarColor,
        emailVerified: false,
        emailVerificationToken: verificationToken,
        emailVerificationExpiry: verificationExpiry,
        subscriptionStatus: "pending_verification"
        // Start with pending
      });
      const isProduction = process.env.REPLIT_DEPLOYMENT === "1" || process.env.NODE_ENV === "production";
      const baseUrl = isProduction ? `https://${req.get("host")}` : `http://${req.get("host")}`;
      const verificationUrl = `${baseUrl}/verify-email?token=${verificationToken}`;
      const emailSent = await sendVerificationEmail({
        to: email,
        name,
        verificationUrl
      });
      if (!emailSent) {
        console.error(`[Signup] Failed to send verification email to ${email}`);
      }
      try {
        await storage.createAdminNotification({
          type: "user_signup",
          title: "New User Signup (Pending Verification)",
          message: `${name} (${email}) has signed up and is pending email verification`,
          metadata: {
            userId: newUser.id,
            userName: name,
            userEmail: email
          },
          isRead: false
        });
      } catch (notifError) {
        console.error("Failed to create admin notification for new signup:", notifError);
      }
      storage.getSuperAdminUsers().then(async (superAdmins) => {
        const adminEmails = superAdmins.map((a) => a.email);
        if (adminEmails.length > 0) {
          await notifySuperAdminsNewSignup({
            adminEmails,
            userName: name,
            userEmail: email,
            signupMethod: "email"
          });
        }
      }).catch((err) => console.error("Failed to notify super admins of signup:", err));
      res.json({
        success: true,
        message: "Account created! Please check your email to verify your account.",
        email
      });
    } catch (error) {
      console.error("Signup error:", error);
      res.status(500).json({ error: "Failed to create account" });
    }
  });
  app2.get("/api/auth/verify-email", async (req, res) => {
    try {
      const { token } = req.query;
      if (!token || typeof token !== "string") {
        return res.status(400).json({ error: "Invalid verification token" });
      }
      const user = await storage.getUserByVerificationToken(token);
      if (!user) {
        return res.status(404).json({ error: "Invalid or expired verification link" });
      }
      if (user.emailVerified) {
        return res.status(400).json({ error: "Email already verified" });
      }
      if (isTokenExpired(user.emailVerificationExpiry)) {
        return res.status(400).json({ error: "Verification link has expired. Please request a new one." });
      }
      const verifiedUser = await storage.verifyUserEmail(user.id);
      if (!verifiedUser) {
        return res.status(500).json({ error: "Failed to verify email" });
      }
      console.log(`[EmailVerification] User ${user.email} verified successfully`);
      res.json({
        success: true,
        message: "Email verified successfully! You can now log in.",
        email: user.email
      });
    } catch (error) {
      console.error("Email verification error:", error);
      res.status(500).json({ error: "Failed to verify email" });
    }
  });
  app2.post("/api/auth/resend-verification", emailVerificationRateLimiter, async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.json({
          success: true,
          message: "If an account with that email exists, a verification email has been sent."
        });
      }
      if (user.emailVerified) {
        return res.status(400).json({ error: "Email is already verified" });
      }
      const verificationToken = generateVerificationToken();
      const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1e3);
      await storage.updateVerificationToken(user.id, verificationToken, verificationExpiry);
      const isProduction = process.env.REPLIT_DEPLOYMENT === "1" || process.env.NODE_ENV === "production";
      const baseUrl = isProduction ? `https://${req.get("host")}` : `http://${req.get("host")}`;
      const verificationUrl = `${baseUrl}/verify-email?token=${verificationToken}`;
      const emailSent = await sendVerificationEmail({
        to: email,
        name: user.name,
        verificationUrl
      });
      if (!emailSent) {
        console.error(`[ResendVerification] Failed to send verification email to ${email}`);
        return res.status(500).json({ error: "Failed to send verification email" });
      }
      res.json({
        success: true,
        message: "Verification email sent. Please check your inbox."
      });
    } catch (error) {
      console.error("Resend verification error:", error);
      res.status(500).json({ error: "Failed to resend verification email" });
    }
  });
  app2.post("/api/bug-report", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }
      const { subject, description, url, userAgent } = req.body;
      if (!description || typeof description !== "string" || description.trim().length === 0) {
        return res.status(400).json({ error: "Description is required" });
      }
      const emailSent = await sendBugReport({
        subject: subject || "Bug Report",
        description: description.trim(),
        reporterName: user.name,
        reporterEmail: user.email,
        url: url || "Unknown",
        userAgent: userAgent || "Unknown"
      });
      if (!emailSent) {
        return res.status(500).json({ error: "Failed to send bug report" });
      }
      console.log(`[BugReport] Report sent from ${user.email}: ${subject}`);
      res.json({ success: true, message: "Bug report sent successfully" });
    } catch (error) {
      console.error("Bug report error:", error);
      res.status(500).json({ error: "Failed to send bug report" });
    }
  });
  app2.get("/api/auth/google/configured", (req, res) => {
    res.json({ configured: isGoogleConfigured() });
  });
  app2.get("/api/auth/google/url", (req, res) => {
    try {
      if (!isGoogleConfigured()) {
        return res.status(503).json({ error: "Google Sign-In is not configured" });
      }
      const state = generateState();
      req.session.googleOAuthState = state;
      const host = req.get("host") || req.hostname || "localhost";
      const protocol = host.includes("localhost") || host.includes("127.0.0.1") ? "http" : req.protocol || "https";
      const redirectUri = `${protocol}://${host}/api/auth/google/callback`;
      console.log(`[Google OAuth] Generated redirect URI: ${redirectUri}`);
      const authUrl = getGoogleAuthUrl(redirectUri, state);
      res.json({ url: authUrl });
    } catch (error) {
      console.error("[Google OAuth] Failed to generate auth URL:", error);
      res.status(500).json({ error: "Failed to initialize Google Sign-In" });
    }
  });
  app2.get("/api/auth/google/callback", async (req, res) => {
    try {
      const { code, state, error: oauthError } = req.query;
      if (oauthError) {
        console.error("[Google OAuth] Error from Google:", oauthError);
        return res.redirect("/login?error=google_auth_failed");
      }
      if (!code || typeof code !== "string") {
        return res.redirect("/login?error=missing_code");
      }
      if (!state || state !== req.session.googleOAuthState) {
        return res.redirect("/login?error=invalid_state");
      }
      delete req.session.googleOAuthState;
      const host = req.get("host") || req.hostname || "localhost";
      const protocol = host.includes("localhost") || host.includes("127.0.0.1") ? "http" : req.protocol || "https";
      const redirectUri = `${protocol}://${host}/api/auth/google/callback`;
      const googleUser = await handleGoogleCallback(code, redirectUri);
      let user = await storage.getUserByGoogleSub(googleUser.sub);
      if (!user) {
        user = await storage.getUserByEmail(googleUser.email);
        if (user) {
          await storage.linkGoogleAccount(user.id, googleUser.sub, googleUser.picture);
          if (!user.emailVerified) {
            await storage.updateUser(user.id, {
              emailVerified: true,
              subscriptionStatus: user.subscriptionStatus === "pending_verification" ? "trial" : user.subscriptionStatus,
              trialEndsAt: user.subscriptionStatus === "pending_verification" ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1e3) : user.trialEndsAt
            });
          }
        } else {
          const avatarColors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4"];
          const avatarColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];
          user = await storage.createGoogleUser({
            name: googleUser.name,
            email: googleUser.email,
            googleSub: googleUser.sub,
            googlePicture: googleUser.picture,
            avatarColor,
            authProvider: "google",
            emailVerified: true,
            // Google already verified the email
            subscriptionStatus: "trial",
            trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1e3)
            // 30-day trial
          });
          storage.getSuperAdminUsers().then(async (superAdmins) => {
            const adminEmails = superAdmins.map((a) => a.email);
            if (adminEmails.length > 0) {
              await notifySuperAdminsNewSignup({
                adminEmails,
                userName: googleUser.name,
                userEmail: googleUser.email,
                signupMethod: "google"
              });
            }
          }).catch((err) => console.error("Failed to notify super admins of Google signup:", err));
        }
      }
      if (user.subscriptionStatus === "expired") {
        return res.redirect("/login?error=trial_expired");
      }
      if (user.subscriptionStatus !== "trial" && user.subscriptionStatus !== "active") {
        return res.redirect("/login?error=subscription_required");
      }
      req.session.userId = user.id;
      req.session.save((err) => {
        if (err) {
          console.error("[Google OAuth] Session save error:", err);
          return res.redirect("/login?error=session_error");
        }
        res.redirect("/?login=success&provider=google");
      });
    } catch (error) {
      console.error("[Google OAuth] Callback error:", error);
      res.redirect("/login?error=google_auth_failed");
    }
  });
  app2.post("/api/auth/logout", async (req, res) => {
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
  app2.post("/api/auth/mark-onboarding-complete", async (req, res) => {
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
  app2.post("/api/webhooks/paypal", async (req, res) => {
    try {
      const webhookId = process.env.PAYPAL_WEBHOOK_ID;
      if (!webhookId) {
        console.error("[PayPal Webhook] PAYPAL_WEBHOOK_ID not configured");
        return res.status(500).json({ error: "Webhook not configured" });
      }
      const isValid = await verifyPayPalWebhook({
        webhookId,
        headers: {
          "paypal-transmission-sig": req.headers["paypal-transmission-sig"],
          "paypal-cert-url": req.headers["paypal-cert-url"],
          "paypal-transmission-id": req.headers["paypal-transmission-id"],
          "paypal-transmission-time": req.headers["paypal-transmission-time"],
          "paypal-auth-algo": req.headers["paypal-auth-algo"]
        },
        body: req.body
      });
      if (!isValid) {
        console.error("[PayPal Webhook] Invalid signature - potential security threat");
        return res.status(401).json({ error: "Invalid webhook signature" });
      }
      const { event_type, resource } = req.body;
      console.log(`[PayPal Webhook] Verified event: ${event_type}`);
      if (event_type === "BILLING.SUBSCRIPTION.ACTIVATED") {
        const { custom_id } = resource;
        const subscriptionId = resource.id;
        const user = await storage.getUserByEmail(custom_id);
        if (user) {
          const now = /* @__PURE__ */ new Date();
          let bonusDays = 0;
          if (user.subscriptionStatus === "trial" && user.trialEndsAt) {
            const trialEnd = new Date(user.trialEndsAt);
            const daysRemaining = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1e3 * 60 * 60 * 24)));
            bonusDays = daysRemaining + 14;
            console.log(`[PayPal Webhook] User had ${daysRemaining} trial days left, granting ${bonusDays} bonus days`);
          }
          const subscriptionEndDate = bonusDays > 0 ? new Date(now.getTime() + bonusDays * 24 * 60 * 60 * 1e3) : void 0;
          const updateData = {
            subscriptionStatus: "active",
            paypalSubscriptionId: subscriptionId,
            subscriptionStartDate: now,
            subscriptionEndDate: subscriptionEndDate || null,
            trialEndsAt: null
            // Clear trial end date - this is now a paid subscription
          };
          await storage.updateUser(user.id, updateData);
          console.log(`[PayPal Webhook] \u2705 Activated paid subscription for ${custom_id}${bonusDays > 0 ? ` with ${bonusDays} bonus days` : ""}`);
          const isFirstPayment = !user.paypalSubscriptionId && (user.subscriptionStatus === "trial" || user.subscriptionStatus === "pending_verification");
          if (isFirstPayment) {
            storage.getSuperAdminUsers().then(async (superAdmins) => {
              const adminEmails = superAdmins.map((a) => a.email);
              if (adminEmails.length > 0) {
                await notifySuperAdminsFirstPayment({
                  adminEmails,
                  userName: user.name,
                  userEmail: user.email,
                  amount: "$9.99/month",
                  // Standard subscription price
                  subscriptionId
                });
              }
            }).catch((err) => console.error("Failed to notify super admins of first payment:", err));
          }
          if (!user.initialDataFetched) {
            fetchInitialDataForUser(user.id).catch((err) => {
              console.error(`[SubscriptionActivation] Failed for user ${user.id}:`, err);
            });
          }
          console.log(`[PayPal Webhook] \u2705 Activated subscription for ${custom_id}`);
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
            subscriptionEndDate: /* @__PURE__ */ new Date()
          });
          console.log(`[PayPal Webhook] \u274C Cancelled subscription for ${custom_id}`);
        }
      }
      res.json({ received: true });
    } catch (error) {
      console.error("[PayPal Webhook] Processing error:", error);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  });
  app2.post("/api/admin/activate-subscription", requireAdmin, async (req, res) => {
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
        subscriptionStartDate: /* @__PURE__ */ new Date()
      });
      if (!user.initialDataFetched) {
        console.log(`[SubscriptionActivation] Triggering initial data fetch for user ${user.id}...`);
        fetchInitialDataForUser(user.id).catch((err) => {
          console.error(`[SubscriptionActivation] Background initial data fetch failed for user ${user.id}:`, err);
        });
      }
      res.json({
        success: true,
        user: {
          ...updatedUser,
          passwordHash: void 0
        }
      });
    } catch (error) {
      console.error("Subscription activation error:", error);
      res.status(500).json({ error: "Failed to activate subscription" });
    }
  });
  app2.post("/api/admin/create-super-admin", requireAdmin, async (req, res) => {
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
        subscriptionStartDate: /* @__PURE__ */ new Date()
      });
      res.json({
        success: true,
        message: "User promoted to super admin",
        user: {
          ...updatedUser,
          passwordHash: void 0
        }
      });
    } catch (error) {
      console.error("Super admin creation error:", error);
      res.status(500).json({ error: "Failed to create super admin" });
    }
  });
  app2.post("/api/admin/deactivate-subscription", requireAdmin, async (req, res) => {
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
        /* @__PURE__ */ new Date()
      );
      res.json({
        success: true,
        message: "Subscription deactivated",
        user: {
          ...updatedUser,
          passwordHash: void 0
        }
      });
    } catch (error) {
      console.error("Deactivate subscription error:", error);
      res.status(500).json({ error: "Failed to deactivate subscription" });
    }
  });
  app2.post("/api/admin/verify-email", requireAdmin, async (req, res) => {
    try {
      const adminUser = await storage.getUser(req.session.userId);
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
      const updatedUser = await storage.verifyUserEmail(user.id);
      res.json({
        success: true,
        message: "Email verified successfully",
        user: {
          ...updatedUser,
          passwordHash: void 0
        }
      });
    } catch (error) {
      console.error("Verify email error:", error);
      res.status(500).json({ error: "Failed to verify email" });
    }
  });
  app2.post("/api/admin/reset-password", requireAdmin, async (req, res) => {
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
        passwordHash
      });
      res.json({
        success: true,
        message: "Password reset successfully"
      });
    } catch (error) {
      console.error("Password reset error:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });
  app2.post("/api/admin/archive-user", requireAdmin, async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      let subscriptionCancelled = false;
      if (user.paypalSubscriptionId) {
        const cancelResult = await cancelPayPalSubscription(
          user.paypalSubscriptionId,
          "Account archived by administrator"
        );
        subscriptionCancelled = cancelResult.success;
        if (!cancelResult.success) {
          console.warn(`[Archive User] Failed to cancel PayPal subscription for ${email}: ${cancelResult.error}`);
        }
      }
      const archivedUser = await storage.archiveUser(user.id, req.session.userId);
      if (user.paypalSubscriptionId) {
        await storage.updateUser(user.id, { subscriptionStatus: "cancelled" });
      }
      res.json({
        success: true,
        message: "User archived",
        subscriptionCancelled,
        user: {
          ...archivedUser,
          passwordHash: void 0
        }
      });
    } catch (error) {
      console.error("Archive user error:", error);
      res.status(500).json({ error: "Failed to archive user" });
    }
  });
  app2.post("/api/admin/unarchive-user", requireAdmin, async (req, res) => {
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
          passwordHash: void 0
        }
      });
    } catch (error) {
      console.error("Unarchive user error:", error);
      res.status(500).json({ error: "Failed to unarchive user" });
    }
  });
  app2.delete("/api/admin/delete-user", requireAdmin, async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      let subscriptionCancelled = false;
      if (user.paypalSubscriptionId) {
        const cancelResult = await cancelPayPalSubscription(
          user.paypalSubscriptionId,
          "Account permanently deleted by administrator"
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
        subscriptionCancelled
      });
    } catch (error) {
      console.error("Delete user error:", error);
      res.status(500).json({ error: "Failed to delete user" });
    }
  });
  app2.post("/api/admin/extend-subscription", requireAdmin, async (req, res) => {
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
      const startDate = /* @__PURE__ */ new Date();
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + months);
      const override = await storage.createManualOverride({
        userId: user.id,
        startDate,
        endDate,
        monthsExtended: months,
        reason: reason || `Admin extended subscription by ${months} month(s)`,
        createdBy: req.session.userId
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
          passwordHash: void 0
        }
      });
    } catch (error) {
      console.error("Extend subscription error:", error);
      res.status(500).json({ error: "Failed to extend subscription" });
    }
  });
  app2.get("/api/admin/user-payments/:userId", requireAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const [payments2, stats, overrides] = await Promise.all([
        storage.getUserPayments(userId),
        storage.getPaymentStats(userId),
        storage.getUserManualOverrides(userId)
      ]);
      res.json({
        user: {
          ...user,
          passwordHash: void 0
        },
        payments: payments2,
        stats,
        overrides
      });
    } catch (error) {
      console.error("Get user payments error:", error);
      res.status(500).json({ error: "Failed to get user payments" });
    }
  });
  app2.post("/api/admin/create-payment", requireAdmin, async (req, res) => {
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
        paymentDate: /* @__PURE__ */ new Date(),
        paymentMethod: paymentMethod || "manual",
        status: "completed",
        transactionId: `manual_${Date.now()}`,
        notes: notes || "Manual payment entry by admin",
        createdBy: req.session.userId
      });
      res.json({
        success: true,
        message: "Payment record created",
        payment
      });
    } catch (error) {
      console.error("Create payment error:", error);
      res.status(500).json({ error: "Failed to create payment" });
    }
  });
  app2.get("/api/users", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const currentUser = await storage.getUser(req.session.userId);
      if (!currentUser?.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }
      const includeArchived = req.query.includeArchived === "true";
      const users2 = await storage.getUsers({ includeArchived });
      const sanitizedUsers = users2.map((user) => ({
        ...user,
        passwordHash: void 0
      }));
      res.json(sanitizedUsers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });
  app2.patch("/api/users/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { name, email, showAllOpportunities } = req.body;
      if (!req.session.userId || req.session.userId !== id) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      const updateData = {};
      if (name !== void 0) {
        if (!name) {
          return res.status(400).json({ error: "Name cannot be empty" });
        }
        updateData.name = name;
      }
      if (email !== void 0) {
        if (!email) {
          return res.status(400).json({ error: "Email cannot be empty" });
        }
        const existingUser = await storage.getUserByEmail(email);
        if (existingUser && existingUser.id !== id) {
          return res.status(400).json({ error: "Email already in use" });
        }
        updateData.email = email;
      }
      if (showAllOpportunities !== void 0) {
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
  app2.delete("/api/users/:id", async (req, res) => {
    try {
      const { id } = req.params;
      if (!req.session.userId || req.session.userId !== id) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      const user = await storage.getUser(id);
      let subscriptionCancelled = false;
      if (user?.paypalSubscriptionId) {
        const cancelResult = await cancelPayPalSubscription(
          user.paypalSubscriptionId,
          "Account deleted by user"
        );
        subscriptionCancelled = cancelResult.success;
        if (!cancelResult.success) {
          console.warn(`[Self Delete] Failed to cancel PayPal subscription for user ${id}: ${cancelResult.error}`);
        }
      }
      await storage.deleteUser(id);
      req.session.destroy((err) => {
        if (err) {
          console.error("Failed to destroy session:", err);
        }
      });
      res.json({ success: true, subscriptionCancelled });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete user" });
    }
  });
  app2.get("/api/subscriptions/transactions", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      if (!user.paypalSubscriptionId || user.paypalSubscriptionId === "manual_activation") {
        return res.json({
          transactions: [],
          message: user.paypalSubscriptionId === "manual_activation" ? "Manual subscription - no PayPal transactions" : "No active subscription"
        });
      }
      const result = await getSubscriptionTransactions(user.paypalSubscriptionId);
      if (!result.success) {
        return res.status(500).json({ error: result.error || "Failed to fetch transactions" });
      }
      res.json({ transactions: result.transactions || [] });
    } catch (error) {
      console.error("Get subscription transactions error:", error);
      res.status(500).json({ error: "Failed to fetch subscription transactions" });
    }
  });
  app2.get("/api/market/status", async (req, res) => {
    try {
      const now = /* @__PURE__ */ new Date();
      const etTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
      res.json({
        isOpen: isMarketOpen2(),
        currentTime: now.toISOString(),
        marketTime: etTime.toLocaleString("en-US", {
          timeZone: "America/New_York",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true
        }),
        timezone: "America/New_York"
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get market status" });
    }
  });
  app2.get("/api/stocks", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const { status } = req.query;
      if (status === "rejected") {
        const stocks3 = await storage.getStocksByUserStatus(req.session.userId, status);
        return res.json(stocks3);
      }
      const stocks2 = await storage.getStocks(req.session.userId);
      res.json(stocks2);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch stocks" });
    }
  });
  app2.get("/api/stocks/with-user-status", async (req, res) => {
    try {
      if (!req.session.userId) {
        console.log("[with-user-status] No userId in session");
        return res.status(401).json({ error: "Not authenticated" });
      }
      console.log(`[with-user-status] Fetching stocks for user ${req.session.userId}`);
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const stockLimit = !user.hasSeenOnboarding ? 500 : user.stockLimit || 100;
      console.log(`[with-user-status] User onboarding status: ${user.hasSeenOnboarding}, limit: ${stockLimit}`);
      const stocksWithStatus = await storage.getStocksWithUserStatus(req.session.userId, stockLimit);
      console.log(`[with-user-status] Found ${stocksWithStatus.length} stocks`);
      console.log(`[with-user-status] Pending stocks: ${stocksWithStatus.filter((s) => s.userStatus === "pending").length}`);
      console.log(`[with-user-status] Rejected stocks: ${stocksWithStatus.filter((s) => s.userStatus === "rejected").length}`);
      res.json(stocksWithStatus);
    } catch (error) {
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
  app2.get("/api/stocks/top-signals", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const followedStocks2 = await storage.getUserFollowedStocks(req.session.userId);
      const followedTickers = new Set(followedStocks2.map((fs2) => fs2.ticker.toUpperCase()));
      const stocksWithStatus = await storage.getStocksWithUserStatus(req.session.userId, 100);
      const highSignals = stocksWithStatus.filter((stock) => {
        const hasHighScore = (stock.integratedScore ?? 0) >= 70;
        const notFollowed = !followedTickers.has(stock.ticker.toUpperCase());
        const hasCompletedAnalysis = stock.jobStatus === "completed";
        return hasHighScore && notFollowed && hasCompletedAnalysis;
      }).slice(0, 12).map((stock) => ({
        ticker: stock.ticker,
        companyName: stock.companyName,
        currentPrice: stock.currentPrice,
        priceChange: stock.priceChange,
        priceChangePercent: stock.priceChangePercent,
        insiderAction: stock.recommendation,
        // BUY or SELL
        aiStance: stock.aiStance,
        integratedScore: stock.integratedScore,
        isFollowing: false
      }));
      res.json(highSignals);
    } catch (error) {
      console.error("Get top signals error:", error);
      res.status(500).json({ error: "Failed to fetch top signals" });
    }
  });
  app2.get("/api/stocks/:ticker", async (req, res) => {
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
  app2.post("/api/stocks", async (req, res) => {
    try {
      const validatedData = insertStockSchema.parse(req.body);
      const stock = await storage.createStock(validatedData);
      res.status(201).json(stock);
    } catch (error) {
      res.status(400).json({ error: "Invalid stock data" });
    }
  });
  app2.patch("/api/stocks/:ticker", async (req, res) => {
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
  app2.delete("/api/stocks/:ticker", async (req, res) => {
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
  app2.get("/api/stocks/diagnostics/candlesticks", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const stocks2 = await storage.getStocks(req.session.userId);
      const pendingStocks = stocks2.filter((s) => s.recommendationStatus === "pending");
      const diagnostics = {
        totalStocks: stocks2.length,
        pendingStocks: pendingStocks.length,
        note: "Candlesticks are now stored in shared stockCandlesticks table, accessible via /api/stocks/:ticker/candlesticks"
      };
      res.json(diagnostics);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch diagnostics", details: error.message });
    }
  });
  app2.post("/api/stocks/:ticker/refresh", async (req, res) => {
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
        companyName: marketData.companyName
      });
      console.log(`[StockAPI] \u2705 Refreshed ${ticker}: $${marketData.currentPrice} (${marketData.marketCap} market cap)`);
      res.json(updatedStock);
    } catch (error) {
      console.error(`[StockAPI] Error refreshing stock data:`, error.message);
      res.status(500).json({ error: error.message || "Failed to refresh stock data" });
    }
  });
  app2.post("/api/stocks/refresh-all", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const stocks2 = await storage.getStocks(req.session.userId);
      const pendingStocks = stocks2.filter((s) => s.recommendationStatus === "pending");
      console.log(`[StockAPI] Refreshing ${pendingStocks.length} pending stocks...`);
      console.log(`[StockAPI] Note: Each stock takes ~36 seconds (3 API calls with 12-second delays)`);
      console.log(`[StockAPI] Estimated total time: ${Math.ceil(pendingStocks.length * 36 / 60)} minutes`);
      const results = {
        success: [],
        failed: []
      };
      for (const stock of pendingStocks) {
        try {
          const marketData = await stockService.getComprehensiveData(stock.ticker);
          await storage.updateStock(req.session.userId, stock.ticker, {
            currentPrice: marketData.currentPrice,
            previousClose: marketData.previousClose,
            marketCap: marketData.marketCap,
            peRatio: marketData.peRatio,
            priceHistory: marketData.priceHistory,
            companyName: marketData.companyName
          });
          results.success.push(stock.ticker);
          console.log(`[StockAPI] \u2705 ${stock.ticker}: $${marketData.currentPrice} | Progress: ${results.success.length}/${pendingStocks.length}`);
        } catch (error) {
          results.failed.push({ ticker: stock.ticker, error: error.message });
          console.error(`[StockAPI] \u274C ${stock.ticker}: ${error.message}`);
        }
      }
      res.json({
        total: pendingStocks.length,
        success: results.success.length,
        failed: results.failed.length,
        results
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to refresh stocks" });
    }
  });
  app2.post("/api/stocks/:ticker/approve", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const stock = await storage.getStock(req.session.userId, req.params.ticker);
      if (!stock) {
        return res.status(404).json({ error: "Stock not found" });
      }
      const { price, quantity } = req.body;
      const purchasePrice = Number(price);
      const purchaseQuantity = Number(quantity);
      if (!isFinite(purchasePrice) || purchasePrice <= 0) {
        return res.status(400).json({ error: "Invalid purchase price - must be a positive number" });
      }
      if (!isFinite(purchaseQuantity) || purchaseQuantity <= 0 || !Number.isInteger(purchaseQuantity)) {
        return res.status(400).json({ error: "Invalid quantity - must be a positive whole number" });
      }
      await storage.ensureUserStockStatus(req.session.userId, req.params.ticker);
      await storage.updateUserStockStatus(req.session.userId, req.params.ticker, {
        status: "approved",
        approvedAt: /* @__PURE__ */ new Date()
      });
      const ibkrConfig2 = await storage.getIbkrConfig();
      let ibkrOrderId;
      let broker = "manual";
      if (ibkrConfig2 && ibkrConfig2.isConnected && ibkrConfig2.accountId) {
        try {
          console.log(`[IBKR] Executing BUY order for ${purchaseQuantity} shares of ${stock.ticker}`);
          const ibkr = getIbkrService(ibkrConfig2.gatewayUrl);
          const orderResult = await ibkr.buyStock(ibkrConfig2.accountId, stock.ticker, purchaseQuantity);
          ibkrOrderId = orderResult.orderId;
          broker = "ibkr";
          console.log(`[IBKR] \u2705 Order placed successfully: ${orderResult.orderId}`);
        } catch (ibkrError) {
          console.error("[IBKR] Trade execution failed:", ibkrError.message);
          console.log("[IBKR] Falling back to manual trade recording");
        }
      }
      const now = /* @__PURE__ */ new Date();
      const initialPricePoint = {
        date: now.toISOString().split("T")[0],
        price: purchasePrice
      };
      const priceHistory = stock.priceHistory || [];
      const dateExists = priceHistory.some((p) => p.date === initialPricePoint.date);
      if (!dateExists) {
        priceHistory.push(initialPricePoint);
        await storage.updateStock(req.session.userId, stock.ticker, {
          priceHistory
        });
      }
      const trade = {
        userId: req.session.userId,
        ticker: stock.ticker,
        type: "buy",
        quantity: purchaseQuantity,
        price: purchasePrice.toFixed(2),
        total: (purchasePrice * purchaseQuantity).toFixed(2),
        status: "completed",
        broker,
        ibkrOrderId
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
  app2.post("/api/stocks/:ticker/reject", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const ticker = req.params.ticker.toUpperCase();
      await storage.cancelAnalysisJobsForTicker(ticker);
      console.log(`[Reject] Cancelled any active analysis jobs for ${ticker}`);
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
  app2.patch("/api/stocks/:ticker/unreject", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      console.log(`[Unreject] Starting unreject for ${req.params.ticker} by user ${req.session.userId}`);
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
  app2.post("/api/stocks/:ticker/simulate", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const stock = await storage.getStock(req.session.userId, req.params.ticker);
      if (!stock) {
        return res.status(404).json({ error: "Stock not found" });
      }
      const simulationCapital = 1e3;
      const purchaseDate = stock.insiderTradeDate ? new Date(stock.insiderTradeDate) : /* @__PURE__ */ new Date();
      const purchaseDateStr = purchaseDate.toISOString().split("T")[0];
      let priceHistory = stock.priceHistory || [];
      if (priceHistory.length === 0 && stock.insiderTradeDate) {
        console.log(`[Simulation] Fetching price history for ${stock.ticker} from ${stock.insiderTradeDate} to today`);
        try {
          const fetchedPrices = await backtestService.fetchHistoricalPrices(
            stock.ticker,
            new Date(stock.insiderTradeDate),
            /* @__PURE__ */ new Date()
          );
          if (fetchedPrices.length > 0) {
            priceHistory = fetchedPrices.map((p) => ({
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
      const historicalPricePoint = priceHistory.find((p) => p.date === purchaseDateStr);
      const purchasePrice = historicalPricePoint ? historicalPricePoint.price : parseFloat(stock.currentPrice);
      const quantity = Math.floor(simulationCapital / purchasePrice);
      const total = purchasePrice * quantity;
      console.log(`[Simulation] Creating simulation for ${stock.ticker}:`);
      console.log(`[Simulation] - Purchase date: ${purchaseDateStr} (${stock.insiderTradeDate ? "insider trade date" : "today"})`);
      console.log(`[Simulation] - Purchase price: $${purchasePrice.toFixed(2)} (${historicalPricePoint ? "historical" : "current"})`);
      console.log(`[Simulation] - Quantity: ${quantity} shares`);
      if (!historicalPricePoint) {
        priceHistory.push({
          date: purchaseDateStr,
          price: purchasePrice
        });
        await storage.updateStock(req.session.userId, stock.ticker, {
          priceHistory
        });
      }
      const existingHolding = await storage.getPortfolioHoldingByTicker(req.session.userId, stock.ticker, true);
      if (existingHolding) {
        return res.status(400).json({ error: "Simulated holding already exists for this stock" });
      }
      const trade = {
        userId: req.session.userId,
        ticker: stock.ticker,
        type: "buy",
        quantity,
        price: purchasePrice.toFixed(2),
        total: total.toFixed(2),
        status: "completed",
        broker: "simulation",
        isSimulated: true,
        executedAt: purchaseDate
        // Set execution date to purchase date
      };
      const createdTrade = await storage.createTrade(trade);
      const holding = await storage.getPortfolioHoldingByTicker(req.session.userId, stock.ticker, true);
      await storage.ensureUserStockStatus(req.session.userId, req.params.ticker);
      await storage.updateUserStockStatus(req.session.userId, req.params.ticker, {
        status: "approved",
        approvedAt: /* @__PURE__ */ new Date()
      });
      res.json({
        status: "simulated",
        stock,
        trade: createdTrade,
        holding,
        message: stock.insiderTradeDate ? `Simulation created: ${quantity} shares purchased on ${purchaseDateStr} at $${purchasePrice.toFixed(2)} = $${total.toFixed(2)}` : `Simulation created: ${quantity} shares at $${purchasePrice.toFixed(2)} = $${total.toFixed(2)}`
      });
    } catch (error) {
      console.error("Simulate recommendation error:", error);
      res.status(500).json({ error: "Failed to create simulation" });
    }
  });
  app2.delete("/api/stocks/:ticker/simulate", async (req, res) => {
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
  const bulkTickersSchema = z2.object({
    tickers: z2.array(z2.string()).min(1, "At least one ticker is required").max(100, "Maximum 100 tickers allowed")
  });
  app2.post("/api/stocks/bulk-approve", async (req, res) => {
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
      const errors = [];
      for (const ticker of tickers) {
        try {
          const stock = await storage.getStock(req.session.userId, ticker);
          if (!stock) {
            errors.push(`${ticker}: not found`);
            continue;
          }
          const purchasePrice = parseFloat(stock.currentPrice);
          const purchaseQuantity = 10;
          await storage.updateStock(req.session.userId, ticker, {
            recommendationStatus: "approved"
          });
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
              averagePurchasePrice: purchasePrice.toFixed(2)
            });
          }
          await storage.createTrade({
            userId: req.session.userId,
            ticker,
            type: "buy",
            quantity: purchaseQuantity,
            price: purchasePrice.toFixed(2),
            total: (purchasePrice * purchaseQuantity).toFixed(2),
            status: "completed",
            broker: "manual"
          });
          success++;
        } catch (err) {
          errors.push(`${ticker}: ${err instanceof Error ? err.message : "unknown error"}`);
        }
      }
      res.json({
        success,
        failed: errors.length,
        errors: errors.length > 0 ? errors : void 0,
        message: `Approved ${success}/${tickers.length} stocks`
      });
    } catch (error) {
      console.error("Bulk approve error:", error);
      res.status(500).json({ error: "Failed to bulk approve" });
    }
  });
  app2.post("/api/stocks/bulk-reject", async (req, res) => {
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
      const errors = [];
      for (const ticker of tickers) {
        try {
          console.log(`[BULK REJECT] Processing ticker: ${ticker}`);
          await storage.cancelAnalysisJobsForTicker(ticker);
          const result = await storage.rejectTickerForUser(req.session.userId, ticker);
          console.log(`[BULK REJECT] Rejected ${ticker} - updated ${result.stocksUpdated} stock entries`);
          success++;
        } catch (err) {
          console.log(`[BULK REJECT] Error processing ${ticker}:`, err);
          errors.push(`${ticker}: ${err instanceof Error ? err.message : "unknown error"}`);
        }
      }
      console.log(`[BULK REJECT] Complete. Success: ${success}, Failed: ${errors.length}`);
      res.json({
        success,
        failed: errors.length,
        errors: errors.length > 0 ? errors : void 0,
        message: `Rejected ${success}/${tickers.length} recommendations`
      });
    } catch (error) {
      console.error("[BULK REJECT] Fatal error:", error);
      res.status(500).json({ error: "Failed to bulk reject" });
    }
  });
  app2.post("/api/stocks/bulk-refresh", async (req, res) => {
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
      const errors = [];
      for (const ticker of tickers) {
        try {
          const stock = await storage.getStock(req.session.userId, ticker);
          if (!stock) {
            errors.push(`${ticker}: not found`);
            continue;
          }
          await new Promise((resolve) => setTimeout(resolve, 1e3));
          const quote = await finnhubService.getQuote(ticker);
          if (quote && quote.currentPrice) {
            await storage.updateStock(req.session.userId, ticker, {
              currentPrice: quote.currentPrice.toFixed(2),
              previousClose: quote.previousClose?.toFixed(2) || stock.previousClose
            });
            success++;
          } else {
            errors.push(`${ticker}: no quote data`);
          }
        } catch (err) {
          errors.push(`${ticker}: ${err instanceof Error ? err.message : "unknown error"}`);
        }
      }
      res.json({
        success,
        failed: errors.length,
        errors: errors.length > 0 ? errors : void 0,
        message: `Refreshed ${success}/${tickers.length} stocks`
      });
    } catch (error) {
      console.error("Bulk refresh error:", error);
      res.status(500).json({ error: "Failed to bulk refresh" });
    }
  });
  app2.post("/api/stocks/bulk-analyze", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const validationResult = bulkTickersSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: "Invalid request", details: validationResult.error.errors });
      }
      const { tickers } = validationResult.data;
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
  app2.post("/api/stocks/:ticker/analyze", async (req, res) => {
    try {
      const ticker = req.params.ticker.toUpperCase();
      const { force } = req.body;
      if (!force) {
        const existingAnalysis = await storage.getStockAnalysis(ticker);
        if (existingAnalysis && existingAnalysis.analyzedAt) {
          const cacheAge = Date.now() - new Date(existingAnalysis.analyzedAt).getTime();
          const sevenDaysInMs = 7 * 24 * 60 * 60 * 1e3;
          if (cacheAge < sevenDaysInMs) {
            console.log(`[AI Analysis] Using cached analysis for ${ticker} (${Math.floor(cacheAge / (24 * 60 * 60 * 1e3))} days old)`);
            return res.json(existingAnalysis);
          }
        }
      }
      console.log(`[AI Analysis] Enqueueing analysis job for ${ticker} with macro integration${force ? " (forced)" : ""}...`);
      const job = await storage.enqueueAnalysisJob(ticker, "user_manual", "high", force);
      const pendingAnalysis = {
        id: job.id,
        ticker,
        status: "analyzing",
        overallRating: null,
        confidenceScore: null,
        summary: "Analysis in progress...",
        analyzedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      res.json(pendingAnalysis);
    } catch (error) {
      console.error("[AI Analysis] Error:", error);
      res.status(500).json({ error: "Failed to analyze stock: " + (error instanceof Error ? error.message : "Unknown error") });
    }
  });
  app2.get("/api/stocks/:ticker/analysis", async (req, res) => {
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
  app2.get("/api/stocks/:ticker/candlesticks", async (req, res) => {
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
  app2.get("/api/stocks/:ticker/sparkline", async (req, res) => {
    try {
      const ticker = req.params.ticker.toUpperCase();
      const candlesticks = await storage.getCandlesticksByTicker(ticker);
      if (!candlesticks || !candlesticks.candlestickData || candlesticks.candlestickData.length === 0) {
        return res.json([]);
      }
      const dataPoints = candlesticks.candlestickData.slice(-7);
      const sparklineData = dataPoints.map((d) => ({
        date: d.date,
        price: d.close
      }));
      res.json(sparklineData);
    } catch (error) {
      console.error("[Sparkline] Error fetching sparkline data:", error);
      res.status(500).json({ error: "Failed to fetch sparkline data" });
    }
  });
  app2.get("/api/stock-analyses", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const allAnalyses = await storage.getAllStockAnalyses();
      const includeAll = req.query.all === "true";
      let filteredAnalyses = allAnalyses;
      if (!includeAll) {
        const userStocks = await storage.getStocks(req.session.userId);
        const userTickers = new Set(userStocks.map((s) => s.ticker));
        filteredAnalyses = allAnalyses.filter((a) => userTickers.has(a.ticker));
      }
      const activeJobs = await db.selectDistinct({ ticker: aiAnalysisJobs.ticker }).from(aiAnalysisJobs).where(or4(
        eq33(aiAnalysisJobs.status, "pending"),
        eq33(aiAnalysisJobs.status, "processing")
      ));
      const activeJobTickers = new Set(activeJobs.map((j) => j.ticker));
      const analyses = filteredAnalyses.map((a) => {
        if (activeJobTickers.has(a.ticker)) {
          return {
            ticker: a.ticker,
            status: "processing",
            integratedScore: null,
            aiScore: null,
            confidenceScore: null,
            overallRating: null,
            summary: null,
            recommendation: null,
            analyzedAt: null
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
  app2.post("/api/macro-analysis/run", async (req, res) => {
    try {
      console.log("[Macro API] Running macro economic analysis...");
      const { runMacroAnalysis: runMacroAnalysis2 } = await Promise.resolve().then(() => (init_macroAgentService(), macroAgentService_exports));
      const analysisData = await runMacroAnalysis2();
      const savedAnalysis = await storage.createMacroAnalysis(analysisData);
      console.log("[Macro API] Macro analysis complete. ID:", savedAnalysis.id);
      res.json(savedAnalysis);
    } catch (error) {
      console.error("[Macro API] Error running macro analysis:", error);
      res.status(500).json({ error: "Failed to run macro analysis: " + (error instanceof Error ? error.message : "Unknown error") });
    }
  });
  app2.get("/api/macro-analysis/latest", async (req, res) => {
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
  app2.get("/api/macro-analysis/:id", async (req, res) => {
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
  app2.post("/api/analysis-jobs", async (req, res) => {
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
  app2.get("/api/analysis-jobs/stats", async (req, res) => {
    try {
      const stats = await storage.getQueueStats();
      res.json(stats);
    } catch (error) {
      console.error("[Queue API] Error fetching queue stats:", error);
      res.status(500).json({ error: "Failed to fetch queue stats" });
    }
  });
  app2.get("/api/analysis-jobs", async (req, res) => {
    try {
      const { ticker } = req.query;
      if (ticker) {
        const jobs = await storage.getJobsByTicker(ticker.toUpperCase());
        res.json(jobs);
      } else {
        const stats = await storage.getQueueStats();
        res.json(stats);
      }
    } catch (error) {
      console.error("[Queue API] Error fetching jobs:", error);
      res.status(500).json({ error: "Failed to fetch jobs" });
    }
  });
  app2.get("/api/analysis-jobs/:id", async (req, res) => {
    try {
      const job = await storage.getJobById(req.params.id);
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }
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
  app2.post("/api/analysis-jobs/reset/:ticker", async (req, res) => {
    try {
      const ticker = req.params.ticker.toUpperCase();
      console.log(`[Queue API] Resetting stuck jobs for ticker: ${ticker}`);
      await storage.cancelAnalysisJobsForTicker(ticker);
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
  app2.post("/api/stocks/analyze-all", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      console.log(`[Bulk AI Analysis] Starting bulk analysis for user ${req.session.userId}...`);
      const stocks2 = await storage.getStocks(req.session.userId);
      const pendingStocks = stocks2.filter(
        (stock) => stock.recommendation?.toLowerCase() === "buy" && stock.recommendationStatus === "pending"
      );
      if (pendingStocks.length === 0) {
        return res.json({
          message: "No pending stocks to analyze",
          queued: 0,
          total: 0
        });
      }
      console.log(`[Bulk AI Analysis] Found ${pendingStocks.length} pending stocks for user ${req.session.userId}`);
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
  app2.get("/api/stocks/:ticker/comments", async (req, res) => {
    try {
      const comments = await storage.getStockComments(req.params.ticker);
      res.json(comments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  });
  app2.post("/api/stocks/:ticker/comments", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const validatedData = insertStockCommentSchema.parse({
        ...req.body,
        ticker: req.params.ticker,
        userId: req.session.userId
      });
      const comment = await storage.createStockComment(validatedData);
      res.status(201).json(comment);
    } catch (error) {
      console.error("Create comment error:", error);
      res.status(400).json({ error: "Invalid comment data" });
    }
  });
  app2.get("/api/stock-comment-counts", async (req, res) => {
    try {
      const counts = await storage.getStockCommentCounts();
      res.json(counts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch comment counts" });
    }
  });
  app2.get("/api/users/me/followed", async (req, res) => {
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
  app2.post("/api/stocks/:ticker/follow", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const ticker = req.params.ticker.toUpperCase();
      const existingFollows = await storage.getUserFollowedStocks(req.session.userId);
      const alreadyFollowing = existingFollows.some((f) => f.ticker === ticker);
      if (alreadyFollowing) {
        return res.status(409).json({ error: "You are already following this stock" });
      }
      const validatedData = insertFollowedStockSchema.parse({
        ticker,
        userId: req.session.userId
      });
      const follow = await storage.followStock(validatedData);
      void (async () => {
        try {
          const existingCandlesticks = await storage.getCandlesticksByTicker(ticker);
          if (!existingCandlesticks || !existingCandlesticks.candlestickData || existingCandlesticks.candlestickData.length === 0) {
            console.log(`[Follow] Fetching candlestick data for newly followed stock ${ticker}...`);
            const candlesticks = await stockService.getCandlestickData(ticker);
            if (candlesticks && candlesticks.length > 0) {
              await storage.upsertCandlesticks(ticker, candlesticks.map((c) => ({
                date: c.date,
                open: c.open,
                high: c.high,
                low: c.low,
                close: c.close,
                volume: c.volume
              })));
              console.log(`[Follow] \u2713 Candlestick data fetched for ${ticker}`);
            }
          }
        } catch (err) {
          console.error(`[Follow] \u2717 Failed to fetch candlesticks for ${ticker}:`, err.message);
        }
      })();
      try {
        const followerCount = await storage.getFollowerCountForTicker(ticker);
        if (followerCount > 10) {
          console.log(`[Follow] Stock ${ticker} is popular with ${followerCount} followers, creating notifications...`);
          const stock = await storage.getStock(req.session.userId, ticker);
          const stockData = stock;
          const followerUserIds = await storage.getFollowerUserIdsForTicker(ticker);
          for (const followerUserId of followerUserIds) {
            try {
              await storage.createNotification({
                userId: followerUserId,
                ticker,
                type: "popular_stock",
                message: `${ticker} is trending! ${followerCount} traders are now following this stock`,
                metadata: { followerCount },
                isRead: false
              });
            } catch (notifError) {
              if (notifError instanceof Error && !notifError.message.includes("unique constraint")) {
                console.error(`[Follow] Failed to create popular stock notification for user ${followerUserId}:`, notifError);
              }
            }
          }
          console.log(`[Follow] Created ${followerUserIds.length} popular_stock notifications for ${ticker}`);
        }
      } catch (popularError) {
        console.error(`[Follow] Failed to check/create popular stock notifications:`, popularError);
      }
      try {
        const existingAnalysis = await storage.getStockAnalysis(ticker);
        const needsAnalysis = !existingAnalysis || existingAnalysis.status !== "completed";
        if (needsAnalysis) {
          console.log(`[Follow] Triggering day 0 analysis for ${ticker} (status: ${existingAnalysis?.status || "none"})`);
          await storage.enqueueAnalysisJob(ticker, "follow_day_0", "high");
        } else {
          console.log(`[Follow] Skipping analysis for ${ticker} - already completed`);
        }
      } catch (analysisError) {
        console.error(`[Follow] Failed to enqueue analysis for ${ticker}:`, analysisError);
      }
      const userId = req.session.userId;
      const generateDay0Brief = async (retryCount = 0) => {
        const maxRetries = 2;
        const retryDelayMs = 3e3;
        try {
          const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
          const existingBriefs = await storage.getDailyBriefsForTicker(ticker, userId);
          const briefExistsToday = existingBriefs.some((b) => b.briefDate === today);
          if (briefExistsToday) {
            console.log(`[Follow] Daily brief already exists for ${ticker} today, skipping`);
            return;
          }
          console.log(`[Follow] Generating day-0 daily brief for ${ticker}${retryCount > 0 ? ` (retry ${retryCount}/${maxRetries})` : ""}...`);
          const quote = await stockService.getQuote(ticker);
          if (!quote || quote.price === 0 || quote.previousClose === 0) {
            throw new Error("Unable to fetch valid price data");
          }
          const latestAnalysis = await storage.getStockAnalysis(ticker);
          const stock = await storage.getStock(userId, ticker);
          const stockData = stock;
          const getAnalyzedAtString = (val) => {
            if (!val) return void 0;
            if (val instanceof Date) return val.toISOString();
            if (typeof val === "string") return val;
            return void 0;
          };
          const previousAnalysis = latestAnalysis?.status === "completed" ? {
            overallRating: latestAnalysis.overallRating || "hold",
            summary: latestAnalysis.summary || "No summary available",
            recommendation: latestAnalysis.recommendation || void 0,
            integratedScore: latestAnalysis.integratedScore ?? void 0,
            confidenceScore: latestAnalysis.confidenceScore ?? void 0,
            technicalAnalysis: {
              trend: latestAnalysis.technicalAnalysisTrend || "neutral",
              momentum: latestAnalysis.technicalAnalysisMomentum || "weak",
              score: latestAnalysis.technicalAnalysisScore ?? 50,
              signals: latestAnalysis.technicalAnalysisSignals || []
            },
            sentimentAnalysis: {
              trend: latestAnalysis.sentimentAnalysisTrend || "neutral",
              newsVolume: latestAnalysis.sentimentAnalysisNewsVolume || "low",
              score: latestAnalysis.sentimentAnalysisScore ?? 50,
              keyThemes: latestAnalysis.sentimentAnalysisKeyThemes || []
            },
            risks: latestAnalysis.risks || [],
            opportunities: latestAnalysis.opportunities || [],
            analyzedAt: getAnalyzedAtString(latestAnalysis.analyzedAt),
            scorecard: latestAnalysis.scorecard ? {
              globalScore: latestAnalysis.scorecard.globalScore,
              confidence: latestAnalysis.scorecard.confidence,
              sections: latestAnalysis.scorecard.sections ? {
                fundamentals: latestAnalysis.scorecard.sections.fundamentals ? {
                  score: latestAnalysis.scorecard.sections.fundamentals.score,
                  weight: latestAnalysis.scorecard.sections.fundamentals.weight
                } : void 0,
                technicals: latestAnalysis.scorecard.sections.technicals ? {
                  score: latestAnalysis.scorecard.sections.technicals.score,
                  weight: latestAnalysis.scorecard.sections.technicals.weight
                } : void 0,
                insiderActivity: latestAnalysis.scorecard.sections.insiderActivity ? {
                  score: latestAnalysis.scorecard.sections.insiderActivity.score,
                  weight: latestAnalysis.scorecard.sections.insiderActivity.weight
                } : void 0,
                newsSentiment: latestAnalysis.scorecard.sections.newsSentiment ? {
                  score: latestAnalysis.scorecard.sections.newsSentiment.score,
                  weight: latestAnalysis.scorecard.sections.newsSentiment.weight
                } : void 0,
                macroSector: latestAnalysis.scorecard.sections.macroSector ? {
                  score: latestAnalysis.scorecard.sections.macroSector.score,
                  weight: latestAnalysis.scorecard.sections.macroSector.weight
                } : void 0
              } : void 0,
              summary: latestAnalysis.scorecard.summary
            } : void 0
          } : stockData?.overallRating ? {
            overallRating: stockData.overallRating,
            summary: stockData.summary || "No previous analysis available",
            technicalAnalysis: stockData.technicalAnalysis ? {
              trend: stockData.technicalAnalysis.trend,
              momentum: stockData.technicalAnalysis.momentum,
              score: stockData.technicalAnalysis.score,
              signals: stockData.technicalAnalysis.signals
            } : void 0
          } : void 0;
          if (latestAnalysis?.status === "completed") {
            console.log(`[Follow] Using enriched AI playbook for ${ticker}: score=${latestAnalysis.integratedScore || latestAnalysis.confidenceScore || "N/A"}, rating=${latestAnalysis.overallRating || "N/A"}`);
          } else {
            console.log(`[Follow] No completed AI analysis for ${ticker}, using fallback stock data`);
          }
          const latestRec = latestAnalysis?.recommendation?.toLowerCase() || "";
          const stockRec = stockData?.recommendation?.toLowerCase() || "";
          const opportunityType = latestRec.includes("sell") || latestRec.includes("avoid") || stockRec.includes("sell") ? "sell" : "buy";
          const holding = await storage.getPortfolioHoldingByTicker(userId, ticker, false);
          const userOwnsPosition = holding !== void 0 && holding.quantity > 0;
          let recentNews;
          try {
            const freshNewsSentiment = await stockService.getNewsSentiment(ticker);
            if (freshNewsSentiment?.articles && freshNewsSentiment.articles.length > 0) {
              recentNews = freshNewsSentiment.articles.slice(0, 5).map((article) => ({
                title: article.title || "Untitled",
                sentiment: typeof article.sentiment === "number" ? article.sentiment : 0,
                source: article.source || "Unknown"
              }));
              console.log(`[Follow] Fetched ${recentNews.length} fresh news articles for ${ticker}`);
            }
          } catch (newsError) {
            console.log(`[Follow] Fresh news fetch failed for ${ticker}, using cached`);
          }
          if (!recentNews || recentNews.length === 0) {
            const now = Date.now() / 1e3;
            const oneDayAgo = now - 24 * 60 * 60;
            recentNews = stockData?.news?.filter((article) => article.datetime && article.datetime >= oneDayAgo)?.slice(0, 3)?.map((article) => ({
              title: article.headline || "Untitled",
              sentiment: 0,
              source: article.source || "Unknown"
            }));
          }
          const brief = await aiAnalysisService.generateDailyBrief({
            ticker,
            currentPrice: quote.price,
            previousPrice: quote.previousClose,
            opportunityType,
            recentNews: recentNews && recentNews.length > 0 ? recentNews : void 0,
            previousAnalysis
          });
          await storage.createDailyBrief({
            userId,
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
        } catch (briefError) {
          const errorDetails = briefError instanceof Error ? briefError.message : JSON.stringify(briefError);
          console.error(`[Follow] Failed to generate day-0 brief for ${ticker} (attempt ${retryCount + 1}/${maxRetries + 1}):`, errorDetails);
          if (retryCount < maxRetries) {
            console.log(`[Follow] Retrying day-0 brief for ${ticker} in ${retryDelayMs / 1e3}s...`);
            await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
            return generateDay0Brief(retryCount + 1);
          } else {
            console.error(`[Follow] Day-0 brief generation failed permanently for ${ticker} after ${maxRetries + 1} attempts`);
          }
        }
      };
      generateDay0Brief().catch((err) => {
        console.error(`[Follow] Unhandled error in day-0 brief generation for ${ticker}:`, err);
      });
      res.status(201).json(follow);
    } catch (error) {
      console.error("Follow stock error:", error);
      res.status(400).json({ error: "Failed to follow stock" });
    }
  });
  app2.delete("/api/stocks/:ticker/follow", async (req, res) => {
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
  app2.patch("/api/stocks/:ticker/position", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const ticker = req.params.ticker.toUpperCase();
      const { hasEnteredPosition, entryPrice } = req.body;
      if (typeof hasEnteredPosition !== "boolean") {
        return res.status(400).json({ error: "hasEnteredPosition must be a boolean" });
      }
      if (entryPrice !== void 0 && (typeof entryPrice !== "number" || entryPrice <= 0)) {
        return res.status(400).json({ error: "entryPrice must be a positive number" });
      }
      await storage.toggleStockPosition(ticker, req.session.userId, hasEnteredPosition, entryPrice);
      if (hasEnteredPosition) {
        const existingHoldings = await storage.getPortfolioHoldings(req.session.userId, false);
        const existingHolding = existingHoldings.find((h) => h.ticker === ticker && h.quantity > 0);
        if (!existingHolding) {
          const priceToUse = entryPrice && entryPrice > 0 ? entryPrice : 0;
          await storage.createPortfolioHolding({
            userId: req.session.userId,
            ticker,
            quantity: 1,
            averagePurchasePrice: priceToUse.toString(),
            isSimulated: false
          });
        }
      } else if (!hasEnteredPosition) {
        const existingHoldings = await storage.getPortfolioHoldings(req.session.userId, false);
        const existingHolding = existingHoldings.find((h) => h.ticker === ticker && h.quantity > 0);
        if (existingHolding) {
          await storage.deletePortfolioHolding(existingHolding.id);
        }
      }
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
  app2.post("/api/stocks/:ticker/close-position", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const ticker = req.params.ticker.toUpperCase();
      const { sellPrice, quantity } = req.body;
      const sellPriceNum = Number(sellPrice);
      if (!Number.isFinite(sellPriceNum) || sellPriceNum <= 0) {
        return res.status(400).json({ error: "sellPrice must be a positive number" });
      }
      let validQuantity = 1;
      if (quantity !== void 0 && quantity !== null) {
        const quantityNum = Number(quantity);
        if (!Number.isFinite(quantityNum) || quantityNum < 1) {
          return res.status(400).json({ error: "quantity must be a positive integer" });
        }
        validQuantity = Math.floor(quantityNum);
      }
      const result = await storage.closePosition(ticker, req.session.userId, sellPriceNum, validQuantity);
      res.status(200).json(result);
    } catch (error) {
      console.error("Close position error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      if (errorMessage.includes("not being followed")) {
        return res.status(404).json({ error: "Stock is not being followed" });
      }
      if (errorMessage.includes("No open position")) {
        return res.status(400).json({ error: "No open position to close" });
      }
      res.status(500).json({ error: "Failed to close position" });
    }
  });
  app2.post("/api/stocks/bulk-follow", async (req, res) => {
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
            userId: req.session.userId
          });
          followedCount++;
          void (async () => {
            try {
              const existingCandlesticks = await storage.getCandlesticksByTicker(upperTicker);
              if (!existingCandlesticks || !existingCandlesticks.candlestickData || existingCandlesticks.candlestickData.length === 0) {
                console.log(`[BulkFollow] Fetching candlestick data for ${upperTicker}...`);
                const candlesticks = await stockService.getCandlestickData(upperTicker);
                if (candlesticks && candlesticks.length > 0) {
                  await storage.upsertCandlesticks(upperTicker, candlesticks.map((c) => ({
                    date: c.date,
                    open: c.open,
                    high: c.high,
                    low: c.low,
                    close: c.close,
                    volume: c.volume
                  })));
                  console.log(`[BulkFollow] \u2713 Candlestick data fetched for ${upperTicker}`);
                }
              }
            } catch (err) {
              console.error(`[BulkFollow] \u2717 Failed to fetch candlesticks for ${upperTicker}:`, err.message);
            }
          })();
          try {
            const existingAnalysis = await storage.getStockAnalysis(upperTicker);
            const needsAnalysis = !existingAnalysis || existingAnalysis.status !== "completed";
            if (needsAnalysis) {
              console.log(`[BulkFollow] Triggering day 0 analysis for ${upperTicker} (status: ${existingAnalysis?.status || "none"})`);
              await storage.enqueueAnalysisJob(upperTicker, "follow_day_0", "high");
            } else {
              console.log(`[BulkFollow] Skipping analysis for ${upperTicker} - already completed`);
            }
          } catch (analysisError) {
            console.error(`[BulkFollow] Failed to enqueue analysis for ${upperTicker}:`, analysisError);
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
  app2.get("/api/followed-stocks-with-prices", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const followedStocks2 = await storage.getFollowedStocksWithPrices(req.session.userId);
      res.json(followedStocks2);
    } catch (error) {
      console.error("Get followed stocks with prices error:", error);
      res.status(500).json({ error: "Failed to fetch followed stocks" });
    }
  });
  app2.get("/api/followed-stocks-with-status", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const followedStocks2 = await storage.getFollowedStocksWithStatus(req.session.userId);
      res.json(followedStocks2);
    } catch (error) {
      console.error("Get followed stocks with status error:", error);
      res.status(500).json({ error: "Failed to fetch followed stocks with status" });
    }
  });
  app2.get("/api/followed-stocks/count", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const followedStocks2 = await storage.getUserFollowedStocks(req.session.userId);
      const holdings = await storage.getPortfolioHoldings(req.session.userId, false);
      const positionTickers = new Set(holdings.filter((h) => h.quantity > 0).map((h) => h.ticker));
      const watchingCount = followedStocks2.filter((s) => !positionTickers.has(s.ticker)).length;
      res.json(watchingCount);
    } catch (error) {
      console.error("Get followed stocks count error:", error);
      res.status(500).json({ error: "Failed to fetch count" });
    }
  });
  app2.get("/api/positions/count", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const holdings = await storage.getPortfolioHoldings(req.session.userId, false);
      const activePositions = holdings.filter((h) => h.quantity > 0);
      res.json(activePositions.length);
    } catch (error) {
      console.error("Get positions count error:", error);
      res.status(500).json({ error: "Failed to fetch count" });
    }
  });
  app2.get("/api/portfolio/total-pnl", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const totalPnl = await storage.getTotalPnL(req.session.userId);
      res.json({ totalPnl });
    } catch (error) {
      console.error("Get total P&L error:", error);
      res.status(500).json({ error: "Failed to fetch total P&L" });
    }
  });
  app2.get("/api/stocks/:ticker/daily-briefs", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const tickerParam = req.params.ticker?.trim()?.toUpperCase();
      if (!tickerParam || tickerParam.length > 10 || !/^[A-Z]+$/.test(tickerParam)) {
        return res.status(400).json({ error: "Invalid ticker format" });
      }
      const followedStocks2 = await storage.getUserFollowedStocks(req.session.userId);
      const isFollowing = followedStocks2.some((fs2) => fs2.ticker.toUpperCase() === tickerParam);
      if (!isFollowing) {
        return res.status(403).json({ error: "You must follow this stock to view daily briefs" });
      }
      const briefs = await storage.getDailyBriefsForTicker(tickerParam, req.session.userId);
      res.json(briefs);
    } catch (error) {
      console.error("Get daily briefs error:", error);
      res.status(500).json({ error: "Failed to fetch daily briefs" });
    }
  });
  app2.get("/api/stocks/:ticker/ticker-daily-briefs", async (req, res) => {
    try {
      const tickerParam = req.params.ticker?.trim()?.toUpperCase();
      if (!tickerParam || tickerParam.length > 10 || !/^[A-Z]+$/.test(tickerParam)) {
        return res.status(400).json({ error: "Invalid ticker format" });
      }
      const limit = Math.min(parseInt(req.query.limit) || 7, 30);
      const briefs = await storage.getTickerDailyBriefs(tickerParam, limit);
      res.json(briefs);
    } catch (error) {
      console.error("Get ticker daily briefs error:", error);
      res.status(500).json({ error: "Failed to fetch ticker daily briefs" });
    }
  });
  app2.post("/api/stocks/:ticker/view", async (req, res) => {
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
  app2.post("/api/stocks/bulk-view", async (req, res) => {
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
  app2.get("/api/stock-views/:userId", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      if (req.params.userId !== req.session.userId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      const viewedTickers = await storage.getUserStockViews(req.params.userId);
      res.json(viewedTickers);
    } catch (error) {
      console.error("Get stock views error:", error);
      res.status(500).json({ error: "Failed to fetch stock views" });
    }
  });
  app2.get("/api/tutorials/:tutorialId/status", async (req, res) => {
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
  app2.post("/api/tutorials/:tutorialId/complete", async (req, res) => {
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
  app2.get("/api/tutorials/user", async (req, res) => {
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
  app2.get("/api/portfolio/holdings", async (req, res) => {
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
  app2.post("/api/portfolio/holdings", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const { ticker, quantity, averagePurchasePrice, isSimulated } = req.body;
      if (!ticker || quantity === void 0 || !averagePurchasePrice) {
        return res.status(400).json({ error: "Missing required fields: ticker, quantity, averagePurchasePrice" });
      }
      const holding = await storage.createPortfolioHolding({
        userId: req.session.userId,
        ticker: ticker.toUpperCase(),
        quantity,
        averagePurchasePrice,
        isSimulated: isSimulated ?? false
      });
      res.status(201).json(holding);
    } catch (error) {
      console.error("Create portfolio holding error:", error);
      res.status(500).json({ error: "Failed to create portfolio holding" });
    }
  });
  app2.get("/api/portfolio/holdings/:id", async (req, res) => {
    try {
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
  app2.delete("/api/portfolio/holdings/:id", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
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
  app2.get("/api/trades", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const isSimulated = req.query.simulated === "true";
      const trades2 = await storage.getTrades(req.session.userId, isSimulated ? true : false);
      res.json(trades2);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch trades" });
    }
  });
  app2.get("/api/trades/:id", async (req, res) => {
    try {
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
  app2.post("/api/trades", async (req, res) => {
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
  app2.get("/api/rules", async (req, res) => {
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
  app2.get("/api/rules/:id", async (req, res) => {
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
  app2.post("/api/rules", async (req, res) => {
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
  app2.patch("/api/rules/:id", async (req, res) => {
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
  app2.delete("/api/rules/:id", async (req, res) => {
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
  app2.get("/api/compound-rules", async (req, res) => {
    try {
      const rules = await storage.getCompoundRules();
      res.json(rules);
    } catch (error) {
      console.error("Error fetching compound rules:", error);
      res.status(500).json({ error: "Failed to fetch compound rules" });
    }
  });
  app2.get("/api/compound-rules/:id", async (req, res) => {
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
  app2.post("/api/compound-rules", async (req, res) => {
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
  app2.put("/api/compound-rules/:id", async (req, res) => {
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
  app2.delete("/api/compound-rules/:id", async (req, res) => {
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
  app2.get("/api/rule-executions", async (req, res) => {
    try {
      const ruleId = req.query.ruleId;
      const ticker = req.query.ticker;
      const executions = await storage.getRuleExecutions(ruleId, ticker);
      res.json(executions);
    } catch (error) {
      console.error("Error fetching rule executions:", error);
      res.status(500).json({ error: "Failed to fetch rule executions" });
    }
  });
  app2.get("/api/backtests", async (req, res) => {
    try {
      const backtests2 = await storage.getBacktests();
      res.json(backtests2);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch backtests" });
    }
  });
  app2.get("/api/backtests/:id", async (req, res) => {
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
  app2.post("/api/backtests", async (req, res) => {
    try {
      const { name, ruleId, startDate, endDate, initialCapital } = req.body;
      const rule = ruleId ? await storage.getTradingRule(ruleId) : null;
      if (ruleId && !rule) {
        return res.status(404).json({ error: "Trading rule not found" });
      }
      const capital = parseFloat(initialCapital);
      const numberOfTrades = Math.floor(Math.random() * 20) + 10;
      const winRate = 50 + Math.random() * 30;
      const returnPercent = Math.random() * 40 - 10;
      const totalReturn = capital * (returnPercent / 100);
      const finalValue = capital + totalReturn;
      const days = 30;
      const equityCurve = [];
      let currentValue = capital;
      for (let i = 0; i <= days; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        const dailyChange = totalReturn / days * (0.8 + Math.random() * 0.4);
        currentValue += dailyChange;
        equityCurve.push({
          date: date.toISOString(),
          value: Math.max(capital * 0.7, currentValue)
        });
      }
      const tradeLog = [];
      const ticker = rule?.ticker || "AAPL";
      for (let i = 0; i < numberOfTrades; i++) {
        const tradeDate = new Date(startDate);
        tradeDate.setDate(tradeDate.getDate() + Math.floor(i / numberOfTrades * days));
        tradeLog.push({
          date: tradeDate.toISOString(),
          type: i % 2 === 0 ? "buy" : "sell",
          ticker,
          quantity: Math.floor(Math.random() * 10) + 1,
          price: 150 + Math.random() * 50,
          total: (150 + Math.random() * 50) * (Math.floor(Math.random() * 10) + 1)
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
        equityCurve
      });
      res.status(201).json(backtest);
    } catch (error) {
      console.error("Backtest error:", error);
      res.status(400).json({ error: "Invalid backtest data" });
    }
  });
  app2.post("/api/stocks/bulk-simulate", async (req, res) => {
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
      for (const ticker of tickers) {
        try {
          const stock = await storage.getStock(req.session.userId, ticker);
          if (!stock) {
            errors.push({ ticker, error: "Stock not found" });
            continue;
          }
          const existingHolding = await storage.getPortfolioHoldingByTicker(req.session.userId, ticker, true);
          if (existingHolding) {
            errors.push({ ticker, error: "Simulated holding already exists" });
            continue;
          }
          const simulationCapital = 1e3;
          const purchaseDate = stock.insiderTradeDate ? new Date(stock.insiderTradeDate) : /* @__PURE__ */ new Date();
          const purchaseDateStr = purchaseDate.toISOString().split("T")[0];
          let priceHistory = stock.priceHistory || [];
          if (priceHistory.length === 0 && stock.insiderTradeDate) {
            console.log(`[BulkSimulation] Fetching price history for ${stock.ticker} from ${stock.insiderTradeDate} to today`);
            try {
              const fetchedPrices = await backtestService.fetchHistoricalPrices(
                stock.ticker,
                new Date(stock.insiderTradeDate),
                /* @__PURE__ */ new Date()
              );
              if (fetchedPrices.length > 0) {
                priceHistory = fetchedPrices.map((p) => ({
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
          const historicalPricePoint = priceHistory.find((p) => p.date === purchaseDateStr);
          const purchasePrice = historicalPricePoint ? historicalPricePoint.price : parseFloat(stock.currentPrice);
          const quantity = Math.floor(simulationCapital / purchasePrice);
          const total = purchasePrice * quantity;
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
            executedAt: purchaseDate
          });
          const holding = await storage.getPortfolioHoldingByTicker(req.session.userId, ticker, true);
          await storage.ensureUserStockStatus(req.session.userId, ticker);
          await storage.updateUserStockStatus(req.session.userId, ticker, {
            status: "approved",
            approvedAt: /* @__PURE__ */ new Date()
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
        errors: errors.length > 0 ? errors : void 0
      });
    } catch (error) {
      console.error("Bulk simulate error:", error);
      res.status(500).json({ error: "Failed to create simulations" });
    }
  });
  app2.get("/api/opportunities", async (req, res) => {
    try {
      if (!req.session?.userId) {
        console.log("[Opportunities] Not authenticated - no session userId");
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        console.log("[Opportunities] User not found for id:", req.session.userId);
        return res.status(401).json({ error: "User not found" });
      }
      const isPro = user.subscriptionStatus === "active" || user.subscriptionStatus === "trial" && user.trialEndsAt && new Date(user.trialEndsAt) > /* @__PURE__ */ new Date();
      const cadence = isPro ? "all" : "daily";
      console.log(`[Opportunities] User ${user.email}, tier: ${isPro ? "pro" : "free"}, cadence: ${cadence}`);
      const opportunities2 = await storage.getOpportunities({
        cadence,
        userId: req.session.userId
      });
      console.log(`[Opportunities] Returning ${opportunities2.length} opportunities`);
      res.json({
        opportunities: opportunities2,
        tier: isPro ? "pro" : "free",
        cadence
      });
    } catch (error) {
      console.error("Get opportunities error:", error);
      res.status(500).json({ error: "Failed to fetch opportunities" });
    }
  });
  app2.get("/api/opportunities/user/rejections", async (req, res) => {
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
  app2.get("/api/opportunities/latest-batch", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }
      const isPro = user.subscriptionStatus === "active" || user.subscriptionStatus === "trial" && user.trialEndsAt && new Date(user.trialEndsAt) > /* @__PURE__ */ new Date();
      const latestBatch = isPro ? await storage.getLatestBatch("hourly") ?? await storage.getLatestBatch("daily") : await storage.getLatestBatch("daily");
      if (!latestBatch) {
        return res.json({ fetchedAt: (/* @__PURE__ */ new Date()).toISOString(), cadence: isPro ? "hourly" : "daily", opportunityCount: 0 });
      }
      const fetchedAtStr = latestBatch.fetchedAt instanceof Date ? latestBatch.fetchedAt.toISOString() : latestBatch.fetchedAt;
      let metadata = latestBatch.metadata;
      if (typeof metadata === "string") {
        try {
          metadata = JSON.parse(metadata);
        } catch (e) {
          console.error("[LatestBatch] Failed to parse metadata:", e);
          metadata = null;
        }
      }
      const stats = metadata?.stats;
      console.log(`[LatestBatch] Batch ${latestBatch.id}, parsed metadata:`, metadata, "stats:", stats);
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
        } : void 0,
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
  app2.get("/api/opportunities/:id", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const opportunity = await storage.getOpportunity(req.params.id);
      if (!opportunity) {
        return res.status(404).json({ error: "Opportunity not found" });
      }
      const isRejected = await storage.isOpportunityRejected(req.session.userId, req.params.id);
      res.json({ ...opportunity, isRejected });
    } catch (error) {
      console.error("Get opportunity error:", error);
      res.status(500).json({ error: "Failed to fetch opportunity" });
    }
  });
  app2.post("/api/opportunities/:id/reject", async (req, res) => {
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
  app2.delete("/api/opportunities/:id/reject", async (req, res) => {
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
  app2.get("/api/telegram/config", async (req, res) => {
    try {
      const config = await storage.getTelegramConfig();
      if (!config) {
        return res.status(404).json({ error: "Telegram configuration not found" });
      }
      const { sessionString, ...configWithoutSession } = config;
      res.json(configWithoutSession);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch Telegram configuration" });
    }
  });
  app2.post("/api/telegram/config", async (req, res) => {
    try {
      const validatedData = insertTelegramConfigSchema.parse(req.body);
      const config = await storage.createOrUpdateTelegramConfig(validatedData);
      await telegramService.initialize();
      const { sessionString, ...configWithoutSession } = config;
      res.status(201).json(configWithoutSession);
    } catch (error) {
      console.error("Telegram config error:", error);
      res.status(400).json({ error: "Invalid Telegram configuration data" });
    }
  });
  app2.post("/api/telegram/fetch", async (req, res) => {
    try {
      const config = await storage.getTelegramConfig();
      if (!config || !config.enabled) {
        return res.status(400).json({ error: "Telegram is not configured or disabled" });
      }
      const limit = req.body.limit || 10;
      const messages = await telegramService.fetchRecentMessages(
        config.channelUsername,
        limit
      );
      res.json({
        success: true,
        messagesFetched: messages.length,
        messages: messages.map((msg) => ({
          id: msg.id,
          date: msg.date,
          text: msg.text,
          preview: msg.text?.substring(0, 100) || "(no text)",
          views: msg.views,
          entities: msg.entities
        })),
        message: `Fetched ${messages.length} messages from @${config.channelUsername}. Check server logs for detailed structure.`
      });
    } catch (error) {
      console.error("Telegram fetch error:", error);
      res.status(500).json({ error: "Failed to fetch Telegram messages" });
    }
  });
  app2.get("/api/telegram/status", async (req, res) => {
    try {
      const status = telegramService.getConnectionStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: "Failed to get connection status" });
    }
  });
  app2.post("/api/telegram/auth/send-code", async (req, res) => {
    try {
      const { phoneNumber } = req.body;
      if (!phoneNumber) {
        return res.status(400).json({ error: "Phone number is required" });
      }
      const result = await telegramService.startAuthentication(phoneNumber);
      res.json(result);
    } catch (error) {
      console.error("Send code error:", error);
      res.status(500).json({ error: error.message || "Failed to send verification code" });
    }
  });
  app2.post("/api/telegram/auth/sign-in", async (req, res) => {
    try {
      const { phoneNumber, phoneCode, phoneCodeHash } = req.body;
      if (!phoneNumber || !phoneCode || !phoneCodeHash) {
        return res.status(400).json({ error: "Phone number, code, and code hash are required" });
      }
      const result = await telegramService.completeAuthentication(phoneNumber, phoneCode, phoneCodeHash);
      res.json(result);
    } catch (error) {
      console.error("Sign in error:", error);
      res.status(500).json({ error: error.message || "Failed to complete authentication" });
    }
  });
  app2.post("/api/telegram/test-notification", async (req, res) => {
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
        insiderQuantity: 5e4,
        confidenceScore: 85
      });
      if (success) {
        res.json({ success: true, message: "Test notification sent successfully!" });
      } else {
        res.status(500).json({ success: false, error: "Failed to send notification" });
      }
    } catch (error) {
      console.error("Test notification error:", error);
      res.status(500).json({ error: error.message || "Failed to send test notification" });
    }
  });
  app2.get("/api/openinsider/config", async (req, res) => {
    try {
      let config = await storage.getOpeninsiderConfig();
      if (!config) {
        config = await storage.createOrUpdateOpeninsiderConfig({
          enabled: false,
          fetchLimit: 50
        });
      }
      res.json(config);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch OpenInsider configuration" });
    }
  });
  app2.post("/api/openinsider/config", async (req, res) => {
    try {
      const validatedData = insertOpeninsiderConfigSchema.parse(req.body);
      const config = await storage.createOrUpdateOpeninsiderConfig(validatedData);
      res.status(201).json(config);
    } catch (error) {
      console.error("OpenInsider config error:", error);
      res.status(400).json({ error: "Invalid OpenInsider configuration data" });
    }
  });
  app2.get("/api/insider/history/:insiderName", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const insiderName = decodeURIComponent(req.params.insiderName).trim();
      if (!insiderName) {
        return res.status(400).json({ error: "Insider name is required" });
      }
      const ticker = req.query.ticker?.trim().toUpperCase();
      const limitParam = req.query.limit;
      let limit = ticker ? 50 : 20;
      if (limitParam) {
        const parsed = parseInt(limitParam, 10);
        if (isNaN(parsed) || parsed < 1) {
          return res.status(400).json({ error: "Invalid limit parameter" });
        }
        limit = Math.min(parsed, ticker ? 200 : 100);
      }
      const sanitizedName = insiderName.replace(/[\n\r]/g, " ").substring(0, 100);
      const tickerInfo = ticker ? ` for ${ticker}` : "";
      console.log(`[InsiderHistory] Fetching history for "${sanitizedName}"${tickerInfo} (limit: ${limit})`);
      const scraperResponse = await openinsiderService.fetchInsiderPurchases(
        limit,
        { insider_name: insiderName, ticker }
      );
      const trades2 = scraperResponse.transactions;
      console.log(`[InsiderHistory] Found ${trades2.length} trades for "${sanitizedName}"`);
      console.log(`[InsiderHistory] Stage 1 Filter Stats:`, scraperResponse.stats);
      if (!trades2 || trades2.length === 0) {
        return res.json({
          insiderName,
          count: 0,
          trades: [],
          score: null
        });
      }
      const scoredTrades = await openinsiderService.calculateTradeScores(trades2);
      const insiderScore = openinsiderService.calculateInsiderScore(scoredTrades);
      res.json({
        insiderName,
        count: scoredTrades.length,
        trades: scoredTrades,
        score: insiderScore
      });
    } catch (error) {
      console.error("[InsiderHistory] ERROR occurred:");
      console.error("[InsiderHistory] Error message:", error.message);
      console.error("[InsiderHistory] Error stack:", error.stack);
      if (error.stdout) console.error("[InsiderHistory] stdout:", error.stdout);
      if (error.stderr) console.error("[InsiderHistory] stderr:", error.stderr);
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
  app2.post("/api/openinsider/fetch", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const config = await storage.getOpeninsiderConfig();
      if (!config || !config.enabled) {
        return res.status(400).json({ error: "OpenInsider is not configured or disabled" });
      }
      const user = await storage.getUser(req.session.userId);
      const isOnboarding = user && !user.initialDataFetched;
      const effectiveFetchLimit = isOnboarding ? Math.min(config.fetchLimit || 50, 50) : config.fetchLimit || 50;
      if (isOnboarding) {
        console.log(`[OpeninsiderFetch] ONBOARDING MODE: Using reduced limit of ${effectiveFetchLimit} for faster first-time fetch`);
      }
      const filters = {};
      if (config.insiderTitles && config.insiderTitles.length > 0) {
        filters.insiderTitles = config.insiderTitles;
      }
      if (config.minTransactionValue) {
        filters.minTransactionValue = config.minTransactionValue;
      }
      if (config.fetchPreviousDayOnly) {
        filters.previousDayOnly = true;
      }
      const optionsDealThreshold = config.optionsDealThresholdPercent ?? 15;
      const minMarketCap = config.minMarketCap ?? 500;
      console.log(`[OpeninsiderFetch] ====== STAGE 1: Python Scraper Filters ======`);
      console.log(`[OpeninsiderFetch] Fetch limit: ${effectiveFetchLimit}${isOnboarding ? " (onboarding reduced)" : ""}`);
      console.log(`[OpeninsiderFetch] Insider titles: ${filters.insiderTitles ? filters.insiderTitles.join(", ") : "ALL"}`);
      console.log(`[OpeninsiderFetch] Min transaction value: ${filters.minTransactionValue ? "$" + filters.minTransactionValue.toLocaleString() : "NONE"}`);
      console.log(`[OpeninsiderFetch] Previous day only: ${filters.previousDayOnly}`);
      console.log(`[OpeninsiderFetch] ====== STAGE 2: Backend Post-Processing ======`);
      console.log(`[OpeninsiderFetch] Min market cap: $${minMarketCap}M`);
      console.log(`[OpeninsiderFetch] Options deal threshold: ${optionsDealThreshold}% (insider price >= market price)`);
      console.log(`[OpeninsiderFetch] ==============================================`);
      console.log(`[OpeninsiderFetch] User ${req.session.userId}: Fetching both purchases AND sales...`);
      const [purchasesResponse, salesResponse] = await Promise.all([
        openinsiderService.fetchInsiderPurchases(
          effectiveFetchLimit,
          Object.keys(filters).length > 0 ? filters : void 0,
          "P"
        ),
        openinsiderService.fetchInsiderSales(
          effectiveFetchLimit,
          Object.keys(filters).length > 0 ? filters : void 0
        )
      ]);
      const transactions = [...purchasesResponse.transactions, ...salesResponse.transactions];
      const stage1Stats = {
        total_rows_scraped: purchasesResponse.stats.total_rows_scraped + salesResponse.stats.total_rows_scraped,
        filtered_not_purchase: purchasesResponse.stats.filtered_not_purchase + salesResponse.stats.filtered_not_purchase,
        filtered_invalid_data: purchasesResponse.stats.filtered_invalid_data + salesResponse.stats.filtered_invalid_data,
        filtered_by_date: purchasesResponse.stats.filtered_by_date + salesResponse.stats.filtered_by_date,
        filtered_by_title: purchasesResponse.stats.filtered_by_title + salesResponse.stats.filtered_by_title,
        filtered_by_transaction_value: purchasesResponse.stats.filtered_by_transaction_value + salesResponse.stats.filtered_by_transaction_value,
        filtered_by_insider_name: purchasesResponse.stats.filtered_by_insider_name + salesResponse.stats.filtered_by_insider_name
      };
      console.log(`[OpeninsiderFetch] User ${req.session.userId}: Fetched ${purchasesResponse.transactions.length} purchases + ${salesResponse.transactions.length} sales = ${transactions.length} total`);
      console.log(`[OpeninsiderFetch] User ${req.session.userId}: BUY transactions: ${transactions.filter((t) => t.recommendation === "buy").length}`);
      console.log(`[OpeninsiderFetch] User ${req.session.userId}: SELL transactions: ${transactions.filter((t) => t.recommendation === "sell").length}`);
      const totalStage1Filtered = stage1Stats.filtered_by_title + stage1Stats.filtered_by_transaction_value + stage1Stats.filtered_by_date + stage1Stats.filtered_not_purchase + stage1Stats.filtered_invalid_data;
      console.log(`
[OpeninsiderFetch] ======= STAGE 1: Python Scraper Filters =======`);
      console.log(`[OpeninsiderFetch] Total rows scraped: ${stage1Stats.total_rows_scraped}`);
      console.log(`[OpeninsiderFetch]   \u2022 Not a purchase / Invalid: ${stage1Stats.filtered_not_purchase + stage1Stats.filtered_invalid_data}`);
      console.log(`[OpeninsiderFetch]   \u2022 Filtered by date: ${stage1Stats.filtered_by_date}`);
      console.log(`[OpeninsiderFetch]   \u2022 Filtered by title: ${stage1Stats.filtered_by_title}`);
      console.log(`[OpeninsiderFetch]   \u2022 Filtered by transaction value: ${stage1Stats.filtered_by_transaction_value}`);
      console.log(`[OpeninsiderFetch] \u2192 Total Stage 1 filtered: ${totalStage1Filtered}`);
      console.log(`[OpeninsiderFetch] \u2192 Returned ${transactions.length} matching transactions`);
      console.log(`[OpeninsiderFetch] ===================================================
`);
      if (transactions.length === 0) {
        await storage.updateOpeninsiderSyncStatus();
        return res.json({ success: true, message: "No new insider transactions found", created: 0 });
      }
      let createdCount = 0;
      let filteredCount = 0;
      const createdTickers = [];
      console.log(`[OpeninsiderFetch] Filtering ${transactions.length} transactions for admin user ${req.session.userId}...`);
      const newTransactions = [];
      for (const transaction of transactions) {
        const existingTransaction = await storage.getTransactionByCompositeKey(
          req.session.userId,
          // Admin user's stocks
          transaction.ticker,
          transaction.filingDate,
          transaction.insiderName,
          transaction.recommendation
          // Use actual recommendation (buy or sell)
        );
        if (!existingTransaction) {
          newTransactions.push(transaction);
        }
      }
      console.log(`[OpeninsiderFetch] ${newTransactions.length} new transactions after duplicate check`);
      console.log(`[OpeninsiderFetch] New BUY transactions: ${newTransactions.filter((t) => t.recommendation === "buy").length}`);
      console.log(`[OpeninsiderFetch] New SELL transactions: ${newTransactions.filter((t) => t.recommendation === "sell").length}`);
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
      const tickers = Array.from(new Set(newTransactions.map((t) => t.ticker)));
      console.log(`[OpeninsiderFetch] Fetching data for ${tickers.length} unique tickers...`);
      const [quotesMap, stockDataMap] = await Promise.all([
        finnhubService.getBatchQuotes(tickers),
        finnhubService.getBatchStockData(tickers)
      ]);
      console.log(`[OpeninsiderFetch] Received ${quotesMap.size} quotes and ${stockDataMap.size} company profiles`);
      let filteredMarketCap = 0;
      let filteredOptionsDeals = 0;
      let filteredNoQuote = 0;
      console.log(`[OpeninsiderFetch] Processing ${newTransactions.length} new transactions with backend filters...`);
      for (const transaction of newTransactions) {
        try {
          const quote = quotesMap.get(transaction.ticker);
          if (!quote || !quote.currentPrice) {
            filteredNoQuote++;
            console.log(`[OpeninsiderFetch] No quote for ${transaction.ticker}, skipping`);
            continue;
          }
          const data = stockDataMap.get(transaction.ticker);
          if (!data?.marketCap || data.marketCap < minMarketCap) {
            filteredMarketCap++;
            console.log(`[OpeninsiderFetch] \u2297 ${transaction.ticker} market cap too low:`);
            console.log(`  Insider: ${transaction.insiderName} (${transaction.insiderTitle || "N/A"})`);
            console.log(`  Market cap: $${data?.marketCap || 0}M (need >$${minMarketCap}M)`);
            console.log(`  Insider price: $${transaction.price.toFixed(2)}, Market price: $${quote.currentPrice.toFixed(2)}`);
            continue;
          }
          if (transaction.recommendation === "buy") {
            const insiderPriceNum = transaction.price;
            const discountPercent = (quote.currentPrice - insiderPriceNum) / quote.currentPrice * 100;
            if (optionsDealThreshold > 0 && discountPercent > optionsDealThreshold) {
              filteredOptionsDeals++;
              console.log(`[OpeninsiderFetch] \u2297 ${transaction.ticker} likely options deal:`);
              console.log(`  Insider: ${transaction.insiderName} (${transaction.insiderTitle || "N/A"})`);
              console.log(`  Insider got ${discountPercent.toFixed(1)}% discount (>${optionsDealThreshold}% threshold)`);
              console.log(`  Insider price: $${insiderPriceNum.toFixed(2)}, Market price: $${quote.currentPrice.toFixed(2)}`);
              console.log(`  Transaction value: $${(insiderPriceNum * transaction.quantity).toLocaleString()}, Quantity: ${transaction.quantity.toLocaleString()}`);
              continue;
            }
          }
          console.log(`[OpeninsiderFetch] Creating stock for admin user ${req.session.userId}: ${transaction.ticker}...`);
          const newStock = await storage.createStock({
            userId: req.session.userId,
            // Admin user only
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
            priceHistory: []
          });
          createdCount++;
          createdTickers.push(transaction.ticker);
          console.log(`[OpeninsiderFetch] \u2713 Created recommendation for ${transaction.ticker}:`);
          console.log(`  Insider: ${transaction.insiderName} (${transaction.insiderTitle || "N/A"})`);
          console.log(`  Insider price: $${transaction.price.toFixed(2)}, Market price: $${quote.currentPrice.toFixed(2)}`);
          console.log(`  Market cap: $${data.marketCap}M, Quantity: ${transaction.quantity.toLocaleString()}`);
          console.log(`  Transaction value: $${(transaction.price * transaction.quantity).toLocaleString()}`);
          if (telegramNotificationService.isReady()) {
            try {
              const notificationSent = await telegramNotificationService.sendStockAlert({
                ticker: newStock.ticker,
                companyName: newStock.companyName,
                recommendation: newStock.recommendation || "buy",
                currentPrice: newStock.currentPrice,
                insiderPrice: newStock.insiderPrice || void 0,
                insiderQuantity: newStock.insiderQuantity || void 0,
                confidenceScore: newStock.confidenceScore || void 0
              });
              if (!notificationSent) {
                console.log(`[OpeninsiderFetch] Failed to send Telegram notification for ${transaction.ticker}`);
              }
            } catch (err) {
              console.error(`[OpeninsiderFetch] Error sending Telegram notification for ${transaction.ticker}:`, err);
            }
          }
        } catch (err) {
          console.error(`[OpeninsiderFetch] \u274C Error processing ${transaction.ticker}:`, err);
          console.error(`[OpeninsiderFetch] Error details:`, {
            ticker: transaction.ticker,
            insiderName: transaction.insiderName,
            error: err instanceof Error ? err.message : String(err),
            stack: err instanceof Error ? err.stack : void 0
          });
        }
      }
      if (createdTickers.length > 0) {
        const uniqueTickers = Array.from(new Set(createdTickers));
        console.log(`[OpeninsiderFetch] Checking ${uniqueTickers.length} unique tickers for AI analysis (from ${createdTickers.length} transactions)...`);
        let queuedCount = 0;
        let skippedCount = 0;
        for (const ticker of uniqueTickers) {
          try {
            const existingAnalysis = await storage.getStockAnalysis(ticker);
            const needsAnalysis = !existingAnalysis || existingAnalysis.status !== "completed";
            if (needsAnalysis) {
              await storage.enqueueAnalysisJob(ticker, "openinsider_fetch", "normal");
              console.log(`[OpeninsiderFetch] \u2713 Queued AI analysis for ${ticker} (status: ${existingAnalysis?.status || "none"})`);
              queuedCount++;
            } else {
              console.log(`[OpeninsiderFetch] \u2298 Skipped ${ticker} - already completed`);
              skippedCount++;
            }
          } catch (error) {
            console.error(`[OpeninsiderFetch] Failed to queue AI analysis for ${ticker}:`, error);
          }
        }
        console.log(`[OpeninsiderFetch] Analysis jobs: ${queuedCount} queued, ${skippedCount} skipped (already completed)`);
      }
      await storage.updateOpeninsiderSyncStatus();
      if (req.session.userId) {
        const user2 = await storage.getUser(req.session.userId);
        if (user2 && !user2.initialDataFetched) {
          await storage.markUserInitialDataFetched(req.session.userId);
          console.log(`[Onboarding] Marked user ${req.session.userId} initial data as fetched`);
        }
      }
      const duplicates = transactions.length - newTransactions.length;
      console.log(`
[OpeninsiderFetch] ======= STAGE 2: Backend Post-Processing =======`);
      console.log(`[OpeninsiderFetch] Starting with: ${transactions.length} transactions`);
      console.log(`[OpeninsiderFetch]   \u2297 Duplicates: ${duplicates}`);
      console.log(`[OpeninsiderFetch]   \u2297 Market cap < $${minMarketCap}M: ${filteredMarketCap}`);
      console.log(`[OpeninsiderFetch]   \u2297 Options deals (< ${optionsDealThreshold}%): ${filteredOptionsDeals}`);
      console.log(`[OpeninsiderFetch]   \u2297 No quote: ${filteredNoQuote}`);
      console.log(`[OpeninsiderFetch] \u2192 Total Stage 2 filtered: ${duplicates + filteredMarketCap + filteredOptionsDeals + filteredNoQuote}`);
      console.log(`[OpeninsiderFetch] ===================================================`);
      console.log(`
[OpeninsiderFetch] \u2713 Successfully created ${createdCount} new recommendations
`);
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
          duplicates,
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
            minMarketCap,
            optionsDealThreshold
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
  app2.get("/api/ibkr/config", async (req, res) => {
    try {
      let config = await storage.getIbkrConfig();
      if (!config) {
        config = await storage.createOrUpdateIbkrConfig({
          gatewayUrl: "https://localhost:5000",
          isPaperTrading: true
        });
      }
      res.json(config);
    } catch (error) {
      console.error("IBKR config fetch error:", error);
      res.status(500).json({ error: "Failed to fetch IBKR configuration" });
    }
  });
  app2.post("/api/ibkr/config", async (req, res) => {
    try {
      const config = await storage.createOrUpdateIbkrConfig(req.body);
      res.json(config);
    } catch (error) {
      console.error("IBKR config update error:", error);
      res.status(400).json({ error: "Failed to update IBKR configuration" });
    }
  });
  app2.get("/api/ibkr/status", async (req, res) => {
    try {
      const config = await storage.getIbkrConfig();
      if (!config) {
        return res.json({ connected: false, error: "IBKR not configured" });
      }
      const ibkr = getIbkrService(config.gatewayUrl);
      const authStatus = await ibkr.checkAuthStatus();
      await storage.updateIbkrConnectionStatus(authStatus.authenticated && authStatus.connected);
      res.json({
        connected: authStatus.authenticated && authStatus.connected,
        authenticated: authStatus.authenticated,
        competing: authStatus.competing,
        accountId: config.accountId,
        isPaperTrading: config.isPaperTrading,
        gatewayUrl: config.gatewayUrl
      });
    } catch (error) {
      console.error("IBKR status check error:", error);
      await storage.updateIbkrConnectionStatus(false, void 0, error.message);
      res.json({
        connected: false,
        error: "Gateway not reachable. Make sure IBKR Client Portal Gateway is running."
      });
    }
  });
  app2.get("/api/ibkr/accounts", async (req, res) => {
    try {
      const config = await storage.getIbkrConfig();
      if (!config) {
        return res.status(400).json({ error: "IBKR not configured" });
      }
      const ibkr = getIbkrService(config.gatewayUrl);
      const accounts = await ibkr.getAccounts();
      if (accounts.length > 0 && !config.accountId) {
        await storage.createOrUpdateIbkrConfig({ accountId: accounts[0].id });
      }
      res.json(accounts);
    } catch (error) {
      console.error("IBKR accounts fetch error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/ibkr/positions", async (req, res) => {
    try {
      const config = await storage.getIbkrConfig();
      if (!config || !config.accountId) {
        return res.status(400).json({ error: "IBKR account not configured" });
      }
      const ibkr = getIbkrService(config.gatewayUrl);
      const positions = await ibkr.getPositions(config.accountId);
      res.json(positions);
    } catch (error) {
      console.error("IBKR positions fetch error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/ibkr/trade", async (req, res) => {
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
      if (action === "buy") {
        orderResult = await ibkr.buyStock(config.accountId, ticker, quantity);
      } else if (action === "sell") {
        orderResult = await ibkr.sellStock(config.accountId, ticker, quantity);
      } else {
        return res.status(400).json({ error: "Invalid action. Must be 'buy' or 'sell'" });
      }
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const stock = await storage.getStock(req.session.userId, ticker);
      const price = stock ? parseFloat(stock.currentPrice) : 0;
      await storage.createTrade({
        userId: req.session.userId,
        ticker,
        type: action,
        quantity,
        price: price.toFixed(2),
        total: (price * quantity).toFixed(2),
        status: "completed",
        broker: "ibkr",
        ibkrOrderId: orderResult.orderId
      });
      res.json({
        success: true,
        orderId: orderResult.orderId,
        status: orderResult.orderStatus,
        message: `${action.toUpperCase()} order for ${quantity} shares of ${ticker} placed successfully`
      });
    } catch (error) {
      console.error("IBKR trade execution error:", error);
      res.status(500).json({ error: error.message || "Failed to execute trade" });
    }
  });
  app2.get("/api/backtest/jobs", async (req, res) => {
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
  app2.get("/api/backtest/jobs/:id", async (req, res) => {
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
  app2.get("/api/backtest/jobs/:id/scenarios", async (req, res) => {
    try {
      const scenarios = await storage.getBacktestScenarios(req.params.id);
      res.json(scenarios);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch scenarios" });
    }
  });
  app2.get("/api/backtest/jobs/:id/price-data", async (req, res) => {
    try {
      const priceData = await storage.getBacktestPriceData(req.params.id);
      res.json(priceData);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch price data" });
    }
  });
  app2.post("/api/backtest/scenarios/:scenarioId/import", async (req, res) => {
    try {
      const { scenarioId } = req.params;
      const { scope = "all_holdings", ticker } = req.body;
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const allJobs = await storage.getBacktestJobs(req.session.userId);
      let scenario = null;
      for (const job of allJobs) {
        const scenarios = await storage.getBacktestScenarios(job.id);
        scenario = scenarios.find((s) => s.id === scenarioId);
        if (scenario) break;
      }
      if (!scenario) {
        return res.status(404).json({ error: "Scenario not found" });
      }
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const tradingRule = await storage.createTradingRule({
        userId: req.session.userId,
        name: scenario.name || "Imported Scenario",
        enabled: false,
        // Start disabled for safety
        scope,
        ticker: scope === "specific_stock" ? ticker : null,
        conditions: scenario.sellConditions || [],
        action: scenario.sellAction?.type === "sell_percentage" ? "sell" : "sell_all",
        actionParams: scenario.sellAction?.percentage ? { percentage: scenario.sellAction.percentage } : void 0
      });
      res.json(tradingRule);
    } catch (error) {
      console.error("Failed to import scenario:", error);
      res.status(500).json({ error: "Failed to import scenario as trading rule" });
    }
  });
  app2.post("/api/backtest/jobs", async (req, res) => {
    try {
      const { messageCount, dataSource } = req.body;
      if (!messageCount || messageCount < 1 || messageCount > 2e3) {
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
        messageCount
      });
      backtestService.processBacktestJob(job.id).catch((error) => {
        console.error(`[BacktestJob ${job.id}] Background processing failed:`, error);
      });
      res.json(job);
    } catch (error) {
      console.error("Failed to create backtest job:", error);
      res.status(500).json({ error: "Failed to create backtest job" });
    }
  });
  app2.patch("/api/backtest/jobs/:id/cancel", async (req, res) => {
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
  app2.delete("/api/backtest/jobs/:id", async (req, res) => {
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
  app2.post("/api/backtest/jobs/:id/trigger", async (req, res) => {
    try {
      const job = await storage.getBacktestJob(req.params.id);
      if (!job) {
        return res.status(404).json({ error: "Backtest job not found" });
      }
      backtestService.processBacktestJob(req.params.id).catch((error) => {
        console.error(`[BacktestJob ${req.params.id}] Background processing failed:`, error);
      });
      res.json({ success: true, message: "Job processing triggered" });
    } catch (error) {
      console.error("Failed to trigger backtest job:", error);
      res.status(500).json({ error: "Failed to trigger backtest job" });
    }
  });
  app2.get("/api/feature-suggestions", async (req, res) => {
    try {
      const userId = req.query.userId;
      const status = req.query.status;
      const suggestions = await storage.getFeatureSuggestions(userId, status);
      res.json(suggestions);
    } catch (error) {
      console.error("Failed to get feature suggestions:", error);
      res.status(500).json({ error: "Failed to get feature suggestions" });
    }
  });
  app2.post("/api/feature-suggestions", async (req, res) => {
    try {
      const data = insertFeatureSuggestionSchema.parse(req.body);
      const suggestion = await storage.createFeatureSuggestion(data);
      res.status(201).json(suggestion);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Failed to create feature suggestion:", error);
      res.status(500).json({ error: "Failed to create feature suggestion" });
    }
  });
  app2.post("/api/feature-suggestions/:id/vote", async (req, res) => {
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
  app2.delete("/api/feature-suggestions/:id/vote", async (req, res) => {
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
  app2.patch("/api/feature-suggestions/:id/status", requireAdmin, async (req, res) => {
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
  app2.delete("/api/feature-suggestions/:id", requireAdmin, async (req, res) => {
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
  app2.get("/api/notifications", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const notifications2 = await storage.getNotifications(req.session.userId);
      res.json(notifications2);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });
  app2.get("/api/notifications/unread-count", async (req, res) => {
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
  app2.patch("/api/notifications/:id/read", async (req, res) => {
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
  app2.patch("/api/notifications/read-all", async (req, res) => {
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
  app2.delete("/api/notifications/clear-all", async (req, res) => {
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
  app2.get("/api/announcements/all", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUser(req.session.userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }
      const announcements2 = await storage.getAllAnnouncements();
      res.json(announcements2);
    } catch (error) {
      console.error("Failed to fetch all announcements:", error);
      res.status(500).json({ error: "Failed to fetch all announcements" });
    }
  });
  app2.get("/api/announcements", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const announcements2 = await storage.getAnnouncements(req.session.userId);
      res.json(announcements2);
    } catch (error) {
      console.error("Failed to fetch announcements:", error);
      res.status(500).json({ error: "Failed to fetch announcements" });
    }
  });
  app2.get("/api/announcements/unread-count", async (req, res) => {
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
  app2.post("/api/announcements/mark-read", async (req, res) => {
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
  app2.post("/api/announcements/mark-all-read", async (req, res) => {
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
  app2.post("/api/announcements", async (req, res) => {
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
        createdBy: req.session.userId
      });
      const announcement = await storage.createAnnouncement(validatedData);
      res.json(announcement);
    } catch (error) {
      console.error("Failed to create announcement:", error);
      res.status(500).json({ error: "Failed to create announcement" });
    }
  });
  app2.patch("/api/announcements/:id", async (req, res) => {
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
  app2.patch("/api/announcements/:id/deactivate", async (req, res) => {
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
  app2.delete("/api/announcements/:id", async (req, res) => {
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
  app2.get("/api/admin/notifications", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUser(req.session.userId);
      if (!user?.isSuperAdmin) {
        return res.status(403).json({ error: "Super admin access required" });
      }
      const notifications2 = await storage.getAdminNotifications();
      res.json(notifications2);
    } catch (error) {
      console.error("Failed to fetch admin notifications:", error);
      res.status(500).json({ error: "Failed to fetch admin notifications" });
    }
  });
  app2.get("/api/admin/notifications/unread-count", async (req, res) => {
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
  app2.post("/api/admin/notifications/:id/read", async (req, res) => {
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
  app2.post("/api/admin/notifications/mark-all-read", async (req, res) => {
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
  app2.post("/api/admin/regenerate-briefs", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUser(req.session.userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }
      const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const followedStocks2 = await storage.getUserFollowedStocks(req.session.userId);
      const followedTickers = followedStocks2.map((f) => f.ticker);
      let generatedCount = 0;
      let skippedCount = 0;
      let errorCount = 0;
      for (const ticker of followedTickers) {
        try {
          const quote = await stockService.getQuote(ticker);
          if (!quote || quote.price === 0 || quote.previousClose === 0) {
            console.log(`[AdminRegenerate] Skipping ${ticker} - invalid price data`);
            skippedCount++;
            continue;
          }
          const stock = await storage.getStock(req.session.userId, ticker);
          const stockData = stock;
          const opportunityType = stockData?.recommendation?.toLowerCase().includes("sell") ? "sell" : "buy";
          const previousAnalysis = stockData?.overallRating ? {
            overallRating: stockData.overallRating,
            summary: stockData.summary || "No previous analysis available",
            technicalAnalysis: stockData.technicalAnalysis ? {
              trend: stockData.technicalAnalysis.trend,
              momentum: stockData.technicalAnalysis.momentum,
              score: stockData.technicalAnalysis.score,
              signals: stockData.technicalAnalysis.signals
            } : void 0
          } : void 0;
          const holding = await storage.getPortfolioHoldingByTicker(req.session.userId, ticker, false);
          const userOwnsPosition = holding !== void 0 && holding.quantity > 0;
          const now = Date.now() / 1e3;
          const oneDayAgo = now - 24 * 60 * 60;
          const recentNews = stockData?.news?.filter((article) => article.datetime && article.datetime >= oneDayAgo)?.slice(0, 3)?.map((article) => ({
            title: article.headline || "Untitled",
            sentiment: 0,
            source: article.source || "Unknown"
          }));
          const brief = await aiAnalysisService.generateDailyBrief({
            ticker,
            currentPrice: quote.price,
            previousPrice: quote.previousClose,
            opportunityType,
            recentNews: recentNews && recentNews.length > 0 ? recentNews : void 0,
            previousAnalysis
          });
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
  app2.get("/api/glossary", async (req, res) => {
    try {
      const terms = await db.select().from(glossaryTerms).orderBy(glossaryTerms.term);
      res.json(terms);
    } catch (error) {
      console.error("Failed to fetch glossary terms:", error);
      res.status(500).json({ error: "Failed to fetch glossary terms" });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path3 from "path";
import { createServer as createViteServer, createLogger as createLogger2 } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path2 from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      ),
      await import("@replit/vite-plugin-dev-banner").then(
        (m) => m.devBanner()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path2.resolve(import.meta.dirname, "client", "src"),
      "@shared": path2.resolve(import.meta.dirname, "shared"),
      "@assets": path2.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path2.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path2.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
init_logger();
import { nanoid } from "nanoid";
var viteLogger = createLogger2();
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path3.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path3.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path3.resolve(distPath, "index.html"));
  });
}

// server/index.ts
init_logger();

// server/sentry.ts
import * as Sentry from "@sentry/node";
function initSentry() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    console.warn("[Sentry] SENTRY_DSN not configured, error tracking disabled");
    return;
  }
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || "development",
    // Performance Monitoring
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1,
    // 10% in prod, 100% in dev
    // Set release version
    release: process.env.SENTRY_RELEASE || void 0,
    // Filter out health check endpoints
    beforeSend(event, hint) {
      if (event.request?.url?.includes("/api/health")) {
        return null;
      }
      return event;
    }
  });
  console.log("[Sentry] Error tracking initialized");
}
function sentryErrorHandler() {
  if (!Sentry.Handlers || !Sentry.Handlers.errorHandler) {
    return (err, req, res, next) => next(err);
  }
  return Sentry.Handlers.errorHandler();
}
function sentryTracingHandler() {
  if (!Sentry.Handlers || !Sentry.Handlers.tracingHandler) {
    return (req, res, next) => next();
  }
  return Sentry.Handlers.tracingHandler();
}
function captureError(error, context) {
  if (context) {
    Sentry.withScope((scope) => {
      Object.entries(context).forEach(([key, value]) => {
        scope.setContext(key, value);
      });
      Sentry.captureException(error);
    });
  } else {
    Sentry.captureException(error);
  }
}

// server/index.ts
await init_storage();
await init_telegram();
init_finnhubService();
init_telegramNotificationService();
init_openinsiderService();
init_aiAnalysisService();
init_cleanupStaleStocks();
init_generateTickerDailyBriefs();
init_priceUpdate();
init_candlestickData();
init_holdingsPriceHistory();
await init_telegramFetch();
init_openinsiderFetch();
init_stockService();
init_secEdgarService();

// server/queueWorker.ts
await init_storage();
init_stockService();
init_secEdgarService();
init_aiAnalysisService();
var QueueWorker = class {
  running = false;
  pollInterval = 2e3;
  // Poll every 2 seconds when queue is active
  idleInterval = 1e4;
  // Poll every 10 seconds when queue is empty
  processingCount = 0;
  maxConcurrent = 1;
  // Process one job at a time for now
  stuckJobTimeoutMs = 30 * 60 * 1e3;
  // 30 minutes timeout for stuck jobs
  lastStuckJobCleanup = 0;
  stuckJobCleanupInterval = 5 * 60 * 1e3;
  // Check for stuck jobs every 5 minutes
  /**
   * Update job progress with current step and details
   */
  async updateProgress(jobId, ticker, currentStep, stepDetails) {
    try {
      await storage.updateJobProgress(jobId, currentStep, {
        ...stepDetails,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
      console.log(`[QueueWorker] \u{1F4CD} ${ticker} - ${currentStep}: ${stepDetails.substep || stepDetails.phase}`);
    } catch (error) {
      console.warn(`[QueueWorker] Failed to update progress for job ${jobId}:`, error);
    }
  }
  async start() {
    if (this.running) {
      console.log("[QueueWorker] Already running");
      return;
    }
    this.running = true;
    console.log("[QueueWorker] Starting AI analysis queue worker...");
    console.log("[QueueWorker] Initializing process loop...");
    this.processLoop().catch((error) => {
      console.error("[QueueWorker] FATAL: Process loop crashed:", error);
      console.error("[QueueWorker] Stack trace:", error instanceof Error ? error.stack : "N/A");
      this.running = false;
    });
    console.log("[QueueWorker] Background process loop initiated");
  }
  async stop() {
    console.log("[QueueWorker] Stopping queue worker...");
    this.running = false;
  }
  /**
   * Reset jobs that have been stuck in 'processing' state for too long
   * This handles cases where the worker crashed or timed out during processing
   */
  async cleanupStuckJobs() {
    const now = Date.now();
    if (now - this.lastStuckJobCleanup < this.stuckJobCleanupInterval) {
      return 0;
    }
    this.lastStuckJobCleanup = now;
    try {
      const resetCount = await storage.resetStuckProcessingJobs(this.stuckJobTimeoutMs);
      if (resetCount > 0) {
        console.log(`[QueueWorker] \u{1F504} Reset ${resetCount} stuck processing job(s)`);
      }
      return resetCount;
    } catch (error) {
      console.error("[QueueWorker] Error cleaning up stuck jobs:", error);
      return 0;
    }
  }
  async processLoop() {
    console.log("[QueueWorker] \u2705 Process loop started");
    while (this.running) {
      try {
        await this.cleanupStuckJobs();
        if (this.processingCount < this.maxConcurrent) {
          const job = await storage.dequeueNextJob();
          if (job) {
            console.log(`[QueueWorker] \u2705 Dequeued job ${job.id} for ${job.ticker}`);
            this.processJob(job).catch((error) => {
              console.error(`[QueueWorker] \u274C Unhandled error processing job ${job.id}:`, error);
            });
            await this.sleep(100);
          } else {
            await this.sleep(this.idleInterval);
          }
        } else {
          await this.sleep(this.pollInterval);
        }
      } catch (error) {
        console.error("[QueueWorker] \u274C Error in process loop:", error);
        await this.sleep(this.pollInterval);
      }
    }
    console.log("[QueueWorker] \u{1F6D1} Process loop ended");
  }
  async processJob(job) {
    this.processingCount++;
    const startTime = Date.now();
    console.log(`[QueueWorker] Processing job ${job.id} for ${job.ticker} (priority: ${job.priority}, attempt: ${job.retryCount + 1}/${job.maxRetries + 1})`);
    try {
      console.log(`[QueueWorker] Resetting phase completion flags for ${job.ticker}...`);
      await storage.resetStockAnalysisPhaseFlags(job.ticker);
      await this.updateProgress(job.id, job.ticker, "fetching_data", {
        phase: "data_fetch",
        substep: "Fetching fundamentals and price data",
        progress: "0/3"
      });
      console.log(`[QueueWorker] Fetching data for ${job.ticker}...`);
      const [companyOverview, balanceSheet, incomeStatement, cashFlow, dailyPrices] = await Promise.all([
        stockService.getCompanyOverview(job.ticker),
        stockService.getBalanceSheet(job.ticker),
        stockService.getIncomeStatement(job.ticker),
        stockService.getCashFlow(job.ticker),
        stockService.getDailyPrices(job.ticker, 60)
      ]);
      await this.updateProgress(job.id, job.ticker, "fetching_data", {
        phase: "data_fetch",
        substep: "Fetching technical indicators and news",
        progress: "1/3"
      });
      const [technicalIndicators, newsSentiment] = await Promise.all([
        stockService.getTechnicalIndicators(job.ticker, dailyPrices),
        stockService.getNewsSentiment(job.ticker)
      ]);
      console.log(`[QueueWorker] \u{1F4CA} Analyzing price-news correlation for ${job.ticker}...`);
      const priceNewsCorrelation = stockService.analyzePriceNewsCorrelation(dailyPrices, newsSentiment);
      console.log(`[QueueWorker] \u2705 Price-news correlation complete`);
      await this.updateProgress(job.id, job.ticker, "fetching_data", {
        phase: "data_fetch",
        substep: "Fetching SEC filings and fundamentals",
        progress: "2/3"
      });
      let secFilingData = null;
      let comprehensiveFundamentals = null;
      console.log(`[QueueWorker] \u{1F4C1} Fetching SEC filings for ${job.ticker}...`);
      try {
        secFilingData = await secEdgarService.getCompanyFilingData(job.ticker);
        console.log(`[QueueWorker] \u2705 SEC filings fetched successfully`);
      } catch (error) {
        console.warn(`[QueueWorker] \u26A0\uFE0F  Could not fetch SEC filings for ${job.ticker}:`, error instanceof Error ? error.message : error);
      }
      console.log(`[QueueWorker] \u{1F4CA} Fetching comprehensive fundamentals for ${job.ticker}...`);
      try {
        comprehensiveFundamentals = await stockService.getComprehensiveFundamentals(job.ticker);
        console.log(`[QueueWorker] \u2705 Fundamentals fetched successfully`);
      } catch (error) {
        console.warn(`[QueueWorker] \u26A0\uFE0F  Could not fetch fundamentals for ${job.ticker}:`, error instanceof Error ? error.message : error);
      }
      console.log(`[QueueWorker] \u{1F527} Preparing SEC filings data...`);
      const secFilings = secFilingData ? {
        formType: secFilingData.formType,
        filingDate: secFilingData.filingDate,
        managementDiscussion: secFilingData.managementDiscussion,
        riskFactors: secFilingData.riskFactors,
        businessOverview: secFilingData.businessOverview
      } : void 0;
      console.log(`[QueueWorker] \u2705 SEC data prepared`);
      console.log(`[QueueWorker] \u{1F50D} Checking for insider trading data for ${job.ticker}...`);
      const insiderTradingStrength = await (async () => {
        try {
          const allStocks = await storage.getAllStocksForTickerGlobal(job.ticker);
          console.log(`[QueueWorker] Found ${allStocks.length} transaction(s) across all users for ${job.ticker}`);
          if (allStocks.length === 0) {
            return void 0;
          }
          const buyTransactions = allStocks.filter((s) => s.recommendation?.toLowerCase() === "buy");
          const sellTransactions = allStocks.filter((s) => s.recommendation?.toLowerCase() === "sell");
          console.log(`[QueueWorker] Transaction breakdown: ${buyTransactions.length} BUY, ${sellTransactions.length} SELL`);
          let direction;
          let transactionType;
          let dominantSignal;
          if (buyTransactions.length > 0 && sellTransactions.length === 0) {
            direction = "buy";
            transactionType = "purchase";
            dominantSignal = "BULLISH - Only insider BUYING detected";
          } else if (sellTransactions.length > 0 && buyTransactions.length === 0) {
            direction = "sell";
            transactionType = "sale";
            dominantSignal = "BEARISH - Only insider SELLING detected";
          } else if (buyTransactions.length > 0 && sellTransactions.length > 0) {
            const sortedByDate = allStocks.sort(
              (a, b) => new Date(b.lastUpdated || 0).getTime() - new Date(a.lastUpdated || 0).getTime()
            );
            const mostRecentSignal = sortedByDate.find(
              (s) => s.recommendation?.toLowerCase() === "buy" || s.recommendation?.toLowerCase() === "sell"
            );
            if (mostRecentSignal) {
              direction = mostRecentSignal.recommendation?.toLowerCase() || "mixed";
              transactionType = direction === "buy" ? "purchase" : direction === "sell" ? "sale" : "mixed";
              dominantSignal = `MIXED SIGNALS - ${buyTransactions.length} BUY, ${sellTransactions.length} SELL (most recent: ${direction.toUpperCase()})`;
            } else {
              direction = buyTransactions.length >= sellTransactions.length ? "buy" : "sell";
              transactionType = direction === "buy" ? "purchase" : "sale";
              dominantSignal = `MIXED SIGNALS - ${buyTransactions.length} BUY, ${sellTransactions.length} SELL (using ${direction.toUpperCase()} as dominant)`;
            }
          } else {
            direction = "unknown";
            transactionType = "transaction";
            dominantSignal = "Unknown signal - no clear insider transactions";
          }
          const primaryStock = allStocks.sort(
            (a, b) => new Date(b.lastUpdated || 0).getTime() - new Date(a.lastUpdated || 0).getTime()
          )[0];
          return {
            direction,
            transactionType,
            dominantSignal,
            buyCount: buyTransactions.length,
            sellCount: sellTransactions.length,
            totalTransactions: allStocks.length,
            quantityStr: primaryStock.insiderQuantity ? `${primaryStock.insiderQuantity.toLocaleString()} shares` : "Unknown",
            insiderPrice: primaryStock.insiderPrice ? `$${parseFloat(primaryStock.insiderPrice).toFixed(2)}` : "Unknown",
            currentPrice: primaryStock.currentPrice ? `$${parseFloat(primaryStock.currentPrice).toFixed(2)}` : "Unknown",
            insiderName: primaryStock.insiderName || "Unknown",
            insiderTitle: primaryStock.insiderTitle || "Unknown",
            tradeDate: primaryStock.insiderTradeDate || "Unknown",
            totalValue: primaryStock.insiderPrice && primaryStock.insiderQuantity ? `$${(parseFloat(primaryStock.insiderPrice) * primaryStock.insiderQuantity).toFixed(2)}` : "Unknown",
            confidence: primaryStock.confidenceScore?.toString() || "Medium",
            // Include all transactions for full context
            allTransactions: allStocks.map((s) => ({
              direction: s.recommendation?.toLowerCase() || "unknown",
              insiderName: s.insiderName || "Unknown",
              insiderTitle: s.insiderTitle || "Unknown",
              quantityStr: s.insiderQuantity ? `${s.insiderQuantity.toLocaleString()} shares` : "Unknown",
              price: s.insiderPrice ? `$${parseFloat(s.insiderPrice).toFixed(2)}` : "Unknown",
              date: s.insiderTradeDate || "Unknown",
              value: s.insiderPrice && s.insiderQuantity ? `$${(parseFloat(s.insiderPrice) * s.insiderQuantity).toFixed(2)}` : "Unknown"
            }))
          };
        } catch (error) {
          console.error(`[QueueWorker] Error getting insider trading data:`, error);
          return void 0;
        }
      })();
      console.log(`[QueueWorker] \u2705 Insider trading check complete:`, insiderTradingStrength ? `${insiderTradingStrength.dominantSignal}` : "No insider data");
      await this.updateProgress(job.id, job.ticker, "fetching_data", {
        phase: "data_fetch",
        substep: "Data fetch complete",
        progress: "3/3"
      });
      const stock = await storage.getAnyStockForTicker(job.ticker);
      await this.updateProgress(job.id, job.ticker, "calculating_score", {
        phase: "calculating_score",
        substep: "Calculating signal score"
      });
      console.log(`[QueueWorker] Running AI analysis for ${job.ticker}...`);
      const analysis = await aiAnalysisService.analyzeStock({
        ticker: job.ticker,
        companyOverview,
        balanceSheet,
        incomeStatement,
        cashFlow,
        technicalIndicators,
        newsSentiment,
        priceNewsCorrelation,
        insiderTradingStrength,
        secFilings,
        comprehensiveFundamentals
      });
      const integratedScore = Math.max(1, Math.min(100, Math.round(analysis.confidenceScore)));
      console.log(`[QueueWorker] \u2705 Signal score calculated: ${integratedScore}/100`);
      await this.updateProgress(job.id, job.ticker, "generating_playbook", {
        phase: "integration",
        substep: "Generating playbook report"
      });
      console.log(`[QueueWorker] \u{1F4DD} Generating playbook report for ${job.ticker}...`);
      console.log(`[QueueWorker] \u{1F4BE} Saving analysis with playbook to database...`);
      await storage.saveStockAnalysis({
        ticker: analysis.ticker,
        status: "completed",
        overallRating: analysis.overallRating,
        confidenceScore: analysis.confidenceScore,
        summary: analysis.summary,
        financialHealthScore: analysis.financialHealth?.score,
        strengths: analysis.financialHealth?.strengths,
        weaknesses: analysis.financialHealth?.weaknesses,
        redFlags: analysis.financialHealth?.redFlags,
        technicalAnalysisScore: analysis.technicalAnalysis?.score,
        technicalAnalysisTrend: analysis.technicalAnalysis?.trend,
        technicalAnalysisMomentum: analysis.technicalAnalysis?.momentum,
        technicalAnalysisSignals: analysis.technicalAnalysis?.signals,
        sentimentAnalysisScore: analysis.sentimentAnalysis?.score,
        sentimentAnalysisTrend: analysis.sentimentAnalysis?.trend,
        sentimentAnalysisNewsVolume: analysis.sentimentAnalysis?.newsVolume,
        sentimentAnalysisKeyThemes: analysis.sentimentAnalysis?.key_themes,
        keyMetrics: analysis.keyMetrics,
        risks: analysis.risks,
        opportunities: analysis.opportunities,
        recommendation: analysis.playbook || analysis.recommendation,
        // Store playbook in recommendation field
        analyzedAt: new Date(analysis.analyzedAt),
        secFilingUrl: secFilingData?.filingUrl,
        secFilingType: secFilingData?.formType,
        secFilingDate: secFilingData?.filingDate,
        secCik: secFilingData?.cik,
        managementDiscussion: secFilingData?.managementDiscussion,
        riskFactors: secFilingData?.riskFactors,
        businessOverview: secFilingData?.businessOverview,
        fundamentalData: comprehensiveFundamentals,
        integratedScore,
        // AI signal score directly
        // Entry Timing Assessment
        entryTimingStatus: analysis.entryTiming?.status,
        entryTimingPriceMove: analysis.entryTiming?.priceMoveSinceInsider,
        entryTimingDaysOld: analysis.entryTiming?.daysOld,
        entryTimingAssessment: analysis.entryTiming?.assessment,
        // Sector Analysis
        sectorName: analysis.sectorAnalysis?.sector,
        sectorOutlook: analysis.sectorAnalysis?.sectorOutlook,
        sectorNote: analysis.sectorAnalysis?.sectorNote,
        // Trade Parameters (Stop Loss & Profit Target) - validate as numbers before saving
        stopLoss: typeof analysis.tradeParameters?.stopLoss === "number" && isFinite(analysis.tradeParameters.stopLoss) ? String(analysis.tradeParameters.stopLoss) : void 0,
        profitTarget: typeof analysis.tradeParameters?.profitTarget === "number" && isFinite(analysis.tradeParameters.profitTarget) ? String(analysis.tradeParameters.profitTarget) : void 0,
        stopLossPercent: typeof analysis.tradeParameters?.stopLossPercent === "number" && isFinite(analysis.tradeParameters.stopLossPercent) ? String(analysis.tradeParameters.stopLossPercent) : void 0,
        profitTargetPercent: typeof analysis.tradeParameters?.profitTargetPercent === "number" && isFinite(analysis.tradeParameters.profitTargetPercent) ? String(analysis.tradeParameters.profitTargetPercent) : void 0
      });
      await storage.markStockAnalysisPhaseComplete(job.ticker, "macro");
      await storage.markStockAnalysisPhaseComplete(job.ticker, "micro");
      await storage.markStockAnalysisPhaseComplete(job.ticker, "combined");
      console.log(`[QueueWorker] \u2705 Analysis complete for ${job.ticker}`);
      const isBuyOpportunity = (analysis.overallRating === "buy" || analysis.overallRating === "strong_buy") && integratedScore >= 80;
      const isSellOpportunity = (analysis.overallRating === "sell" || analysis.overallRating === "avoid" || analysis.overallRating === "strong_avoid") && integratedScore >= 80;
      if (isBuyOpportunity || isSellOpportunity) {
        const notificationType = isBuyOpportunity ? "high_score_buy" : "high_score_sell";
        let currentPrice;
        let insiderPrice;
        let previousClose;
        let priceChange;
        let priceChangePercent;
        if (stock) {
          currentPrice = parseFloat(stock.currentPrice);
          insiderPrice = stock.insiderPrice ? parseFloat(stock.insiderPrice) : void 0;
          previousClose = stock.previousClose ? parseFloat(stock.previousClose) : void 0;
          const comparisonPrice = insiderPrice || previousClose;
          if (comparisonPrice && isFinite(comparisonPrice) && comparisonPrice > 0 && isFinite(currentPrice)) {
            priceChange = currentPrice - comparisonPrice;
            priceChangePercent = priceChange / comparisonPrice * 100;
          }
        }
        let opportunityText = "";
        if (isBuyOpportunity) {
          if (priceChangePercent !== void 0 && priceChangePercent > 5) {
            opportunityText = `STRONG BUY - Price up ${priceChangePercent.toFixed(1)}% since insider bought. Consider entry.`;
          } else if (priceChangePercent !== void 0 && priceChangePercent < -3) {
            opportunityText = `BUY OPPORTUNITY - Price down ${Math.abs(priceChangePercent).toFixed(1)}% since insider bought. Better entry point!`;
          } else {
            opportunityText = `Strong BUY signal (${integratedScore}/100). Insider confidence confirmed.`;
          }
        } else {
          if (priceChangePercent !== void 0 && priceChangePercent < -5) {
            opportunityText = `SELL NOW - Price dropped ${Math.abs(priceChangePercent).toFixed(1)}% since insider sold. Exit position!`;
          } else if (priceChangePercent !== void 0 && priceChangePercent > 3) {
            opportunityText = `SELL SIGNAL - Price up ${priceChangePercent.toFixed(1)}% despite insider selling. Take profits!`;
          } else {
            opportunityText = `Strong SELL signal (${integratedScore}/100). Insider caution confirmed.`;
          }
        }
        console.log(`[QueueWorker] \u{1F514} ${notificationType} detected for ${job.ticker} (${integratedScore}/100), creating notifications...`);
        const allUsers = await storage.getUsers();
        const activeUsers = allUsers.filter((u) => u.subscriptionStatus === "active" && !u.archived);
        for (const user of activeUsers) {
          try {
            await storage.createNotification({
              userId: user.id,
              ticker: job.ticker,
              type: notificationType,
              score: integratedScore,
              message: `${job.ticker}: ${opportunityText}`,
              metadata: {
                currentPrice,
                priceChange,
                priceChangePercent,
                insiderPrice
              },
              isRead: false
            });
          } catch (error) {
            if (error instanceof Error && !error.message.includes("unique constraint")) {
              console.error(`[QueueWorker] Failed to create notification for user ${user.id}:`, error);
            }
          }
        }
        console.log(`[QueueWorker] \u2705 Created ${activeUsers.length} ${notificationType} notifications for ${job.ticker}`);
      }
      await this.updateProgress(job.id, job.ticker, "completed", {
        phase: "complete",
        substep: "Analysis complete",
        progress: "100%"
      });
      await storage.updateJobStatus(job.id, "completed");
      const duration = ((Date.now() - startTime) / 1e3).toFixed(2);
      console.log(`[QueueWorker] \u2705 Job ${job.id} completed successfully in ${duration}s (${job.ticker}: ${analysis.overallRating}, integrated score: ${integratedScore}/100)`);
    } catch (error) {
      const duration = ((Date.now() - startTime) / 1e3).toFixed(2);
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : void 0;
      console.error(`[QueueWorker] \u274C Job ${job.id} failed after ${duration}s:`, errorMessage);
      console.error(`[QueueWorker] Error stack:`, errorStack);
      if (job.retryCount < job.maxRetries) {
        const backoffMinutes = Math.pow(5, job.retryCount);
        const scheduledAt = new Date(Date.now() + backoffMinutes * 60 * 1e3);
        await storage.updateJobStatus(job.id, "pending", {
          retryCount: job.retryCount + 1,
          scheduledAt,
          errorMessage,
          lastError: errorMessage
          // Set lastError for frontend visibility
        });
        console.log(`[QueueWorker] Job ${job.id} will retry in ${backoffMinutes} minutes (attempt ${job.retryCount + 2}/${job.maxRetries + 1})`);
      } else {
        await storage.updateJobStatus(job.id, "failed", {
          errorMessage,
          lastError: errorMessage
          // Set lastError for frontend visibility
        });
        console.log(`[QueueWorker] Job ${job.id} failed permanently after ${job.maxRetries + 1} attempts`);
      }
    } finally {
      this.processingCount--;
    }
  }
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  async getStatus() {
    return {
      running: this.running,
      processingCount: this.processingCount,
      maxConcurrent: this.maxConcurrent
    };
  }
};
var queueWorker = new QueueWorker();

// server/websocketServer.ts
import { WebSocketServer, WebSocket } from "ws";
import { parse as parseCookie } from "cookie";
init_eventDispatcher();

// server/websocket/clusterAdapter.ts
init_connection();
init_logger();
var log11 = createLogger("websocket:cluster");
async function getClusteringStatus() {
  const redisAvailable = isRedisConnected();
  return {
    available: redisAvailable,
    enabled: false,
    // Clustering not yet implemented
    implementation: "single-instance"
    // Current: single instance, Future: redis-pubsub or socket.io
  };
}

// server/websocketServer.ts
init_logger();
var log12 = createLogger("websocket");
var WebSocketManager = class {
  wss = null;
  userConnections = /* @__PURE__ */ new Map();
  async initialize(server) {
    this.wss = new WebSocketServer({ noServer: true });
    const clusteringStatus = await getClusteringStatus();
    if (clusteringStatus.available) {
      log12.info("Redis available for WebSocket clustering", {
        enabled: clusteringStatus.enabled,
        implementation: clusteringStatus.implementation
      });
      log12.info("Note: WebSocket clustering not yet implemented. See server/websocket/README-CLUSTERING.md for details.");
    } else {
      log12.info("Redis not available - WebSocket running in single-instance mode");
    }
    server.on("upgrade", (request, socket, head) => {
      if (request.url !== "/ws") {
        socket.destroy();
        return;
      }
      this.authenticateConnection(request, (err, userId) => {
        if (err || !userId) {
          socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
          socket.destroy();
          return;
        }
        this.wss.handleUpgrade(request, socket, head, (ws) => {
          const authWs = ws;
          authWs.userId = userId;
          authWs.isAlive = true;
          this.wss.emit("connection", authWs, request);
        });
      });
    });
    this.wss.on("connection", (ws) => {
      const userId = ws.userId;
      log12.info(`User connected`, { userId });
      if (!this.userConnections.has(userId)) {
        this.userConnections.set(userId, /* @__PURE__ */ new Set());
      }
      this.userConnections.get(userId).add(ws);
      ws.isAlive = true;
      ws.on("pong", () => {
        ws.isAlive = true;
      });
      ws.on("message", (message) => {
        try {
          const data = JSON.parse(message.toString());
          log12.debug(`Received message from user`, { userId, data });
          if (data.type === "ping") {
            ws.send(JSON.stringify({ type: "pong" }));
          }
        } catch (error) {
          log12.error("Error parsing WebSocket message", error, { userId });
        }
      });
      ws.on("close", () => {
        log12.info(`User disconnected`, { userId });
        this.userConnections.get(userId)?.delete(ws);
        if (this.userConnections.get(userId)?.size === 0) {
          this.userConnections.delete(userId);
        }
      });
      ws.send(JSON.stringify({ type: "connected", userId }));
    });
    const heartbeatInterval = setInterval(() => {
      this.wss?.clients.forEach((ws) => {
        const authWs = ws;
        if (!authWs.isAlive) {
          log12.warn(`Terminating dead connection`, { userId: authWs.userId });
          return authWs.terminate();
        }
        authWs.isAlive = false;
        authWs.ping();
      });
    }, 3e4);
    this.wss.on("close", () => {
      clearInterval(heartbeatInterval);
    });
    this.subscribeToEvents();
    log12.info("WebSocket server initialized", {
      clusteringAvailable: clusteringStatus.available,
      clusteringEnabled: clusteringStatus.enabled
    });
  }
  authenticateConnection(request, callback) {
    const cookies = request.headers.cookie ? parseCookie(request.headers.cookie) : {};
    const sessionId = cookies["connect.sid"];
    if (!sessionId) {
      return callback(new Error("No session cookie"));
    }
    const fakeReq = {
      headers: { cookie: request.headers.cookie },
      session: void 0
    };
    const fakeRes = {
      getHeader: () => null,
      setHeader: () => {
      }
    };
    sessionMiddleware(fakeReq, fakeRes, (err) => {
      if (err) {
        return callback(new Error("Session authentication failed"));
      }
      const userId = fakeReq.session?.userId;
      if (!userId) {
        return callback(new Error("Not authenticated"));
      }
      callback(null, userId);
    });
  }
  subscribeToEvents() {
    eventDispatcher.on("STOCK_STATUS_CHANGED", (event) => {
      if (event.type === "STOCK_STATUS_CHANGED") {
        this.broadcastToUser(event.userId, {
          type: "STOCK_STATUS_CHANGED",
          ticker: event.ticker,
          status: event.status
        });
      }
    });
    eventDispatcher.on("STOCK_POPULAR", (event) => {
      if (event.type === "STOCK_POPULAR") {
        this.broadcastToAll({
          type: "STOCK_POPULAR",
          ticker: event.ticker,
          followerCount: event.followerCount
        });
      }
    });
    eventDispatcher.on("PRICE_UPDATED", (event) => {
      if (event.type === "PRICE_UPDATED") {
        this.broadcastToUser(event.userId, {
          type: "PRICE_UPDATED",
          ticker: event.ticker,
          price: event.price,
          change: event.change
        });
      }
    });
    eventDispatcher.on("FOLLOWED_STOCK_UPDATED", (event) => {
      if (event.type === "FOLLOWED_STOCK_UPDATED") {
        this.broadcastToUser(event.userId, {
          type: "FOLLOWED_STOCK_UPDATED",
          ticker: event.ticker,
          data: event.data
        });
      }
    });
    eventDispatcher.on("NEW_STOCK_ADDED", (event) => {
      if (event.type === "NEW_STOCK_ADDED") {
        this.broadcastToUser(event.userId, {
          type: "NEW_STOCK_ADDED",
          ticker: event.ticker,
          recommendation: event.recommendation
        });
      }
    });
    eventDispatcher.on("STANCE_CHANGED", (event) => {
      if (event.type === "STANCE_CHANGED") {
        this.broadcastToUser(event.userId, {
          type: "STANCE_CHANGED",
          ticker: event.ticker,
          oldStance: event.oldStance,
          newStance: event.newStance
        });
      }
    });
  }
  broadcastToUser(userId, message) {
    const connections = this.userConnections.get(userId);
    if (!connections || connections.size === 0) {
      return;
    }
    const payload = JSON.stringify(message);
    connections.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    });
  }
  broadcastToAll(message) {
    const payload = JSON.stringify(message);
    this.wss?.clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    });
  }
};
var websocketManager = new WebSocketManager();

// server/queue/index.ts
init_connection();

// server/queue/schedulers.ts
init_queues();
init_logger();
var log14 = createLogger("queue:schedulers");
async function scheduleRecurringJob(queueName, jobName, pattern, jobData) {
  const queue = getQueue(queueName);
  const repeatableJobs = await queue.getRepeatableJobs();
  const existing = repeatableJobs.find((job) => job.name === jobName);
  if (existing) {
    await queue.removeRepeatableByKey(existing.key);
    log14.info(`Removed existing repeatable job: ${jobName}`);
  }
  await queue.add(
    jobName,
    jobData || {},
    {
      repeat: {
        pattern: typeof pattern === "string" ? pattern : void 0,
        every: typeof pattern === "number" ? pattern : void 0
      }
    }
  );
  log14.info(`Scheduled recurring job: ${jobName} in queue ${queueName} with pattern: ${pattern}`);
}
async function initializeScheduledJobs() {
  log14.info("Initializing scheduled jobs...");
  await scheduleRecurringJob(
    QUEUE_NAMES.PRICE_UPDATE,
    "update-prices",
    5 * 60 * 1e3
    // 5 minutes
  );
  await scheduleRecurringJob(
    QUEUE_NAMES.CANDLESTICK_DATA,
    "fetch-candlestick-data",
    "30 16 * * 1-5"
    // 4:30 PM ET, Monday-Friday
  );
  await scheduleRecurringJob(
    QUEUE_NAMES.HOLDINGS_PRICE_HISTORY,
    "update-holdings-price-history",
    5 * 60 * 1e3
    // 5 minutes
  );
  await scheduleRecurringJob(
    QUEUE_NAMES.TELEGRAM_FETCH,
    "fetch-telegram-messages",
    60 * 60 * 1e3
    // 1 hour
  );
  await scheduleRecurringJob(
    QUEUE_NAMES.OPENINSIDER_FETCH,
    "fetch-openinsider-data",
    60 * 60 * 1e3
    // 1 hour
  );
  await scheduleRecurringJob(
    QUEUE_NAMES.RECOMMENDATION_CLEANUP,
    "cleanup-old-recommendations",
    "0 2 * * *"
    // 2 AM daily
  );
  await scheduleRecurringJob(
    QUEUE_NAMES.SIMULATED_RULE_EXECUTION,
    "execute-simulated-rules",
    5 * 60 * 1e3
    // 5 minutes
  );
  await scheduleRecurringJob(
    QUEUE_NAMES.AI_ANALYSIS,
    "analyze-new-stocks",
    10 * 60 * 1e3
    // 10 minutes
  );
  await scheduleRecurringJob(
    QUEUE_NAMES.ANALYSIS_RECONCILIATION,
    "reconcile-incomplete-analyses",
    60 * 60 * 1e3
    // 1 hour
  );
  await scheduleRecurringJob(
    QUEUE_NAMES.DAILY_BRIEF,
    "generate-daily-briefs",
    "0 6 * * *"
    // 6 AM daily
  );
  await scheduleRecurringJob(
    QUEUE_NAMES.UNVERIFIED_USER_CLEANUP,
    "cleanup-unverified-users",
    6 * 60 * 60 * 1e3
    // 6 hours
  );
  await scheduleRecurringJob(
    QUEUE_NAMES.CLEANUP_STALE_STOCKS,
    "cleanup-stale-stocks",
    "0 3 * * *"
    // 3 AM daily
  );
  await scheduleRecurringJob(
    QUEUE_NAMES.TICKER_DAILY_BRIEF,
    "generate-ticker-daily-briefs",
    "0 5 * * *"
    // 5 AM daily
  );
  log14.info("All scheduled jobs initialized");
}

// server/queue/workers.ts
init_connection();
init_logger();
import { Worker } from "bullmq";
var log15 = createLogger("queue:workers");
var workers = /* @__PURE__ */ new Map();
function createWorker(queueName, processor, storage2, options) {
  if (workers.has(queueName)) {
    log15.warn(`Worker for ${queueName} already exists, returning existing worker`);
    return workers.get(queueName);
  }
  const connection = getRedisConnection();
  const worker = new Worker(
    queueName,
    async (job) => {
      log15.info(`Processing job ${job.id} from queue ${queueName}`);
      try {
        await processor(job, storage2);
        log15.info(`Job ${job.id} completed successfully`);
      } catch (error) {
        log15.error(`Job ${job.id} failed`, error);
        throw error;
      }
    },
    {
      connection,
      concurrency: options?.concurrency || 1,
      limiter: options?.limiter,
      removeOnComplete: {
        age: 24 * 3600,
        count: 1e3
      },
      removeOnFail: {
        age: 7 * 24 * 3600
      }
    }
  );
  worker.on("completed", (job) => {
    log15.info(`Job ${job.id} completed in queue ${queueName}`);
  });
  worker.on("failed", (job, err) => {
    log15.error(`Job ${job?.id} failed in queue ${queueName}`, err);
  });
  worker.on("error", (err) => {
    log15.error(`Worker error in queue ${queueName}`, err);
  });
  workers.set(queueName, worker);
  log15.info(`Created worker for queue: ${queueName}`);
  return worker;
}

// server/queue/index.ts
await init_enhancedWorkers();
await init_jobProcessors();
init_queues();
init_logger();
var log23 = createLogger("queue");
var USE_ENHANCED_WORKERS = process.env.USE_ENHANCED_WORKERS !== "false";
async function initializeQueueSystem(storage2) {
  log23.info("Initializing queue system...");
  try {
    const connection = getRedisConnection();
    await connection.ping();
    log23.info("Redis connection verified");
  } catch (error) {
    log23.error("Failed to connect to Redis", error);
    throw new Error("Redis connection failed. Queue system requires Redis.");
  }
  await initializeScheduledJobs();
  if (USE_ENHANCED_WORKERS) {
    log23.info("Using enhanced workers with event-driven processing");
    for (const queueName of Object.keys(jobProcessors)) {
      createEnhancedWorker(queueName, storage2);
    }
  } else {
    log23.info("Using basic workers (legacy mode)");
    for (const [queueName, processor] of Object.entries(jobProcessors)) {
      createWorker(queueName, processor, storage2, {
        concurrency: 1
        // Process one job at a time per queue
      });
    }
  }
  log23.info("Queue system initialized successfully", {
    enhancedWorkers: USE_ENHANCED_WORKERS,
    queueCount: Object.keys(jobProcessors).length
  });
}

// server/index.ts
var ENABLE_TELEGRAM3 = process.env.ENABLE_TELEGRAM === "true";
initSentry();
var app = express2();
app.set("trust proxy", 1);
app.use(express2.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express2.urlencoded({ extended: false }));
app.use(sessionMiddleware);
app.use(sentryTracingHandler());
app.use("/api", globalApiRateLimiter);
app.use((req, res, next) => {
  const start = Date.now();
  const path4 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path4.startsWith("/api")) {
      let logLine = `${req.method} ${path4} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log.info(logLine, "api");
    }
  });
  next();
});
(async () => {
  await storage.initializeDefaults();
  log.info("Server starting with session-based admin authentication...", "server");
  try {
    const settings = await storage.getSystemSettings();
    if (settings?.aiProvider) {
      const { setMacroProviderConfig: setMacroProviderConfig2 } = await Promise.resolve().then(() => (init_macroAgentService(), macroAgentService_exports));
      const { setBacktestProviderConfig: setBacktestProviderConfig2 } = await init_backtestService().then(() => backtestService_exports);
      const { clearProviderCache: clearProviderCache2 } = await Promise.resolve().then(() => (init_aiProvider(), aiProvider_exports));
      const config = {
        provider: settings.aiProvider,
        model: settings.aiModel || void 0
      };
      aiAnalysisService.setProviderConfig(config);
      setMacroProviderConfig2(config);
      setBacktestProviderConfig2(config);
      clearProviderCache2();
      log.info(`AI provider initialized: ${settings.aiProvider}${settings.aiModel ? ` (model: ${settings.aiModel})` : ""}`, "server");
    } else {
      log.info("AI provider using default: OpenAI", "server");
    }
  } catch (err) {
    log.error(`AI provider initialization skipped: ${err.message}`, err, "server");
  }
  if (ENABLE_TELEGRAM3) {
    await telegramService.initialize().catch((err) => {
      log.warn(`Telegram service initialization skipped: ${err.message}`, "server");
    });
    await telegramNotificationService.initialize().catch((err) => {
      log.warn(`Telegram notification service initialization skipped: ${err.message}`, "server");
    });
  } else {
    log.info("Telegram integration disabled via feature flag", "server");
  }
  const server = await registerRoutes(app);
  await websocketManager.initialize(server);
  let useQueueSystem = false;
  try {
    await initializeQueueSystem(storage);
    log.info("Job queue system initialized", "server");
    useQueueSystem = true;
  } catch (error) {
    log.error("Failed to initialize job queue system, falling back to setInterval", error, "server");
    log.warn("Using legacy setInterval job scheduling", "server");
  }
  app.use(sentryErrorHandler());
  app.use((err, _req, res, _next) => {
    captureError(err, {
      request: {
        method: _req.method,
        url: _req.url,
        headers: _req.headers
      }
    });
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    log.error("Unhandled error", err, "express");
    res.status(status).json({ message });
  });
  if (app.get("env") === "development") {
    app.use("/api/*", (req, res, next) => {
      if (!res.headersSent) {
        res.status(404).json({ error: "API endpoint not found" });
      } else {
        next();
      }
    });
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(port, "0.0.0.0", () => {
    log.info(`serving on port ${port}`, "server");
  });
  if (!useQueueSystem) {
    log.info("Starting legacy setInterval jobs", "server");
    startPriceUpdateJob(storage);
    startCleanupScheduler(storage);
    startTickerDailyBriefScheduler(storage);
    startCandlestickDataJob(storage);
    startHoldingsPriceHistoryJob(storage);
    if (ENABLE_TELEGRAM3) {
      startTelegramFetchJob(storage);
    }
    startOpeninsiderFetchJob(storage);
    startUnifiedOpportunitiesFetchJob();
    startRecommendationCleanupJob(storage);
    startSimulatedRuleExecutionJob(storage);
    startAIAnalysisJob(storage);
    queueWorker.start();
    log("[QueueWorker] AI Analysis queue worker started");
    startAnalysisReconciliationJob(storage);
    startDailyBriefJob(storage);
    startUnverifiedUserCleanupJob(storage);
  } else {
    log.info("Queue system active - setInterval jobs skipped", "server");
  }
  queueWorker.start();
  log.info("[QueueWorker] AI Analysis queue worker started", "server");
})();
function startUnifiedOpportunitiesFetchJob() {
  const ONE_HOUR5 = 60 * 60 * 1e3;
  let isJobRunning2 = false;
  async function fetchUnifiedOpportunities(cadence) {
    if (isJobRunning2) {
      log(`[UnifiedOpportunities] Job already running, skipping ${cadence} execution`);
      return;
    }
    isJobRunning2 = true;
    try {
      log(`[UnifiedOpportunities] Starting ${cadence} opportunities fetch...`);
      const config = await storage.getOpeninsiderConfig();
      if (!config || !config.enabled) {
        log("[UnifiedOpportunities] OpenInsider is not configured or disabled, skipping");
        return;
      }
      const filters = {};
      if (config.insiderTitles && config.insiderTitles.length > 0) {
        filters.insiderTitles = config.insiderTitles;
      }
      if (config.minTransactionValue) {
        filters.minTransactionValue = config.minTransactionValue;
      }
      if (config.fetchPreviousDayOnly) {
        filters.previousDayOnly = true;
      }
      const optionsDealThreshold = config.optionsDealThresholdPercent ?? 15;
      const minMarketCap = config.minMarketCap ?? 500;
      const [purchasesResponse, salesResponse] = await Promise.all([
        openinsiderService.fetchInsiderPurchases(
          config.fetchLimit || 50,
          Object.keys(filters).length > 0 ? filters : void 0,
          "P"
        ),
        openinsiderService.fetchInsiderSales(
          config.fetchLimit || 50,
          Object.keys(filters).length > 0 ? filters : void 0
        )
      ]);
      const transactions = [...purchasesResponse.transactions, ...salesResponse.transactions];
      log(`[UnifiedOpportunities] Fetched ${transactions.length} transactions for ${cadence} cadence`);
      if (transactions.length === 0) {
        log("[UnifiedOpportunities] No insider transactions found");
        await storage.updateOpeninsiderSyncStatus();
        return;
      }
      const batch = await storage.createOpportunityBatch({
        cadence,
        count: transactions.length
      });
      log(`[UnifiedOpportunities] Created batch ${batch.id} for ${cadence} cadence`);
      let createdCount = 0;
      let duplicatesSkipped = 0;
      let filteredMarketCap = 0;
      let filteredNoQuote = 0;
      const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      const RATE_LIMIT_DELAY = 850;
      const tickerDataCache = /* @__PURE__ */ new Map();
      const uniqueTickers = Array.from(new Set(transactions.map((t) => t.ticker)));
      log(`[UnifiedOpportunities] Pre-fetching data for ${uniqueTickers.length} unique tickers...`);
      for (const ticker of uniqueTickers) {
        try {
          await delay(RATE_LIMIT_DELAY);
          const quote = await finnhubService.getQuote(ticker);
          if (!quote || !quote.currentPrice) {
            tickerDataCache.set(ticker, null);
            filteredNoQuote++;
            continue;
          }
          await delay(RATE_LIMIT_DELAY);
          const stockData = await finnhubService.getBatchStockData([ticker]);
          const data = stockData.get(ticker);
          if (!data?.marketCap || data.marketCap < minMarketCap) {
            tickerDataCache.set(ticker, null);
            filteredMarketCap++;
            continue;
          }
          tickerDataCache.set(ticker, { quote, data });
        } catch (error) {
          console.error(`[UnifiedOpportunities] Error pre-fetching ${ticker}:`, error);
          tickerDataCache.set(ticker, null);
        }
      }
      log(`[UnifiedOpportunities] Pre-fetched ${tickerDataCache.size} tickers, ${Array.from(tickerDataCache.values()).filter((v) => v !== null).length} valid`);
      for (const transaction of transactions) {
        try {
          const existing = await storage.getOpportunityByTransaction(
            transaction.ticker,
            transaction.tradeDate,
            transaction.insiderName,
            transaction.recommendation,
            cadence
            // Pass cadence to allow same transaction in different cadences
          );
          if (existing) {
            duplicatesSkipped++;
            continue;
          }
          const cachedData = tickerDataCache.get(transaction.ticker);
          if (!cachedData) {
            continue;
          }
          const { quote, data } = cachedData;
          const opportunity = await storage.createOpportunity({
            ticker: transaction.ticker,
            companyName: data.companyInfo?.name || transaction.companyName || transaction.ticker,
            recommendation: transaction.recommendation,
            cadence,
            batchId: batch.id,
            currentPrice: quote.currentPrice.toString(),
            insiderName: transaction.insiderName,
            insiderTitle: transaction.insiderTitle || null,
            insiderTradeDate: transaction.tradeDate,
            insiderQuantity: transaction.quantity,
            insiderPrice: transaction.price?.toString() || null,
            marketCap: data.marketCap?.toString() || null,
            country: data.companyInfo?.country || null,
            industry: data.companyInfo?.industry || null,
            source: "openinsider",
            confidenceScore: Math.round(transaction.confidence * 100)
          });
          try {
            const existingAnalysis = await storage.getStockAnalysis(transaction.ticker);
            if (existingAnalysis && existingAnalysis.status === "completed") {
              const signalScore = existingAnalysis.integratedScore ?? existingAnalysis.confidenceScore ?? 0;
              if (signalScore < 70) {
                log(`[UnifiedOpportunities] ${transaction.ticker} signal score ${signalScore} < 70, removing from global opportunities`);
                await storage.deleteOpportunity(opportunity.id);
                continue;
              }
              log(`[UnifiedOpportunities] ${transaction.ticker} signal score ${signalScore} >= 70, keeping opportunity`);
              const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
              await storage.createTickerDailyBrief({
                ticker: transaction.ticker.toUpperCase(),
                briefDate: today,
                priceSnapshot: quote.currentPrice.toString(),
                priceChange: null,
                priceChangePercent: null,
                priceSinceInsider: null,
                previousSignalScore: null,
                newSignalScore: signalScore,
                scoreChange: null,
                scoreChangeReason: "Initial Day-0 analysis",
                stance: signalScore >= 70 ? "ENTER" : signalScore >= 50 ? "WATCH" : "AVOID",
                stanceChanged: false,
                briefText: `Day-0 analysis: Signal score ${signalScore}/100. ${existingAnalysis.recommendation?.substring(0, 200) || ""}`,
                keyUpdates: [],
                newInsiderTransactions: true,
                newsImpact: null,
                priceActionAssessment: null,
                stopLossHit: false,
                profitTargetHit: false
              });
            } else {
              log(`[UnifiedOpportunities] Queuing AI analysis for ${transaction.ticker}...`);
              await storage.enqueueAnalysisJob(transaction.ticker, "opportunity_batch", "normal");
            }
          } catch (aiError) {
            console.error(`[UnifiedOpportunities] AI analysis check failed for ${transaction.ticker}:`, aiError);
          }
          createdCount++;
        } catch (error) {
          console.error(`[UnifiedOpportunities] Error processing ${transaction.ticker}:`, error);
        }
      }
      log(`[UnifiedOpportunities] ${cadence.toUpperCase()} batch complete:`);
      log(`  \u2022 Created: ${createdCount} opportunities`);
      log(`  \u2022 Duplicates skipped: ${duplicatesSkipped}`);
      log(`  \u2022 Filtered (market cap): ${filteredMarketCap}`);
      log(`  \u2022 Filtered (no quote): ${filteredNoQuote}`);
      await storage.updateOpportunityBatchStats(batch.id, {
        added: createdCount,
        rejected: filteredMarketCap + filteredNoQuote,
        duplicates: duplicatesSkipped
      });
      await storage.updateOpeninsiderSyncStatus();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[UnifiedOpportunities] Error in ${cadence} fetch:`, error);
      await storage.updateOpeninsiderSyncStatus(errorMessage);
    } finally {
      isJobRunning2 = false;
    }
  }
  function msUntilMidnightUTC() {
    const now = /* @__PURE__ */ new Date();
    const midnight = new Date(now);
    midnight.setUTCHours(24, 0, 0, 0);
    return midnight.getTime() - now.getTime();
  }
  async function hourlyCheck() {
    await fetchUnifiedOpportunities("hourly");
  }
  let lastDailyFetchDate = null;
  function hasDailyRunToday() {
    const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    return lastDailyFetchDate === today;
  }
  function markDailyRun() {
    lastDailyFetchDate = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  }
  async function runDailyFetch() {
    if (hasDailyRunToday()) {
      log("[UnifiedOpportunities] Daily fetch already ran today, skipping");
      return;
    }
    await fetchUnifiedOpportunities("daily");
    markDailyRun();
  }
  function scheduleDailyJob() {
    const msToMidnight = msUntilMidnightUTC();
    log(`[UnifiedOpportunities] Daily job scheduled in ${Math.round(msToMidnight / 6e4)} minutes (next midnight UTC)`);
    setTimeout(async () => {
      await runDailyFetch();
      setInterval(() => {
        runDailyFetch().catch((err) => {
          console.error("[UnifiedOpportunities] Daily fetch failed:", err);
        });
      }, 24 * 60 * 60 * 1e3);
    }, msToMidnight);
  }
  scheduleDailyJob();
  runDailyFetch().catch((err) => {
    console.error("[UnifiedOpportunities] Initial daily fetch failed:", err);
  });
  hourlyCheck().catch((err) => {
    console.error("[UnifiedOpportunities] Initial hourly fetch failed:", err);
  });
  setInterval(hourlyCheck, ONE_HOUR5);
  log("[UnifiedOpportunities] Background job started - hourly for pro, daily at midnight UTC for all");
}
function startRecommendationCleanupJob() {
  const ONE_HOUR5 = 60 * 60 * 1e3;
  const TWO_WEEKS_MS2 = 14 * 24 * 60 * 60 * 1e3;
  async function cleanupOldRecommendations() {
    try {
      log("[Cleanup] Starting recommendation cleanup job...");
      const users2 = await storage.getUsers();
      const now = /* @__PURE__ */ new Date();
      let rejectedCount = 0;
      let deletedCount = 0;
      let totalStocksChecked = 0;
      for (const user of users2) {
        const stocks2 = await storage.getStocks(user.id);
        totalStocksChecked += stocks2.length;
        const pendingStocks = stocks2.filter(
          (stock) => stock.recommendationStatus === "pending" && stock.insiderTradeDate
        );
        for (const stock of pendingStocks) {
          try {
            const dateParts = stock.insiderTradeDate.split(" ")[0].split(".");
            if (dateParts.length >= 3) {
              const day = parseInt(dateParts[0], 10);
              const month = parseInt(dateParts[1], 10) - 1;
              const year = parseInt(dateParts[2], 10);
              const tradeDate = new Date(year, month, day);
              const ageMs = now.getTime() - tradeDate.getTime();
              if (ageMs > TWO_WEEKS_MS2) {
                await storage.updateStock(user.id, stock.ticker, {
                  recommendationStatus: "rejected",
                  rejectedAt: /* @__PURE__ */ new Date()
                });
                rejectedCount++;
                log(`[Cleanup] Rejected ${stock.ticker} for user ${user.id} - trade date ${stock.insiderTradeDate} is older than 2 weeks`);
              }
            }
          } catch (parseError) {
            console.error(`[Cleanup] Error parsing date for ${stock.ticker}:`, parseError);
          }
        }
        const rejectedStocks = stocks2.filter(
          (stock) => stock.recommendationStatus === "rejected" && stock.rejectedAt
        );
        for (const stock of rejectedStocks) {
          try {
            const rejectedDate = new Date(stock.rejectedAt);
            const ageMs = now.getTime() - rejectedDate.getTime();
            if (ageMs > TWO_WEEKS_MS2) {
              await storage.deleteStock(user.id, stock.ticker);
              deletedCount++;
              log(`[Cleanup] Deleted ${stock.ticker} for user ${user.id} - was rejected on ${stock.rejectedAt}`);
            }
          } catch (deleteError) {
            console.error(`[Cleanup] Error deleting rejected stock ${stock.ticker}:`, deleteError);
          }
        }
      }
      log(`[Cleanup] Rejected ${rejectedCount} old recommendations, deleted ${deletedCount} old rejected stocks (checked ${totalStocksChecked} total stocks across ${users2.length} users)`);
    } catch (error) {
      console.error("[Cleanup] Error in cleanup job:", error);
    }
  }
  cleanupOldRecommendations().catch((err) => {
    console.error("[Cleanup] Initial cleanup failed:", err);
  });
  setInterval(cleanupOldRecommendations, ONE_HOUR5);
  log("[Cleanup] Background job started - cleaning up old recommendations every hour");
}
function startSimulatedRuleExecutionJob() {
  const FIVE_MINUTES4 = 5 * 60 * 1e3;
  async function evaluateAndExecuteRules() {
    try {
      if (!isMarketOpen()) {
        log("[SimRuleExec] Market is closed, skipping rule evaluation");
        return;
      }
      log("[SimRuleExec] Evaluating trading rules for simulated holdings...");
      const users2 = await storage.getUsers();
      const allRulesArray = [];
      const allHoldingsArray = [];
      for (const user of users2) {
        const userRules = await storage.getTradingRules(user.id);
        const userHoldings = await storage.getPortfolioHoldings(user.id, true);
        allRulesArray.push(...userRules);
        allHoldingsArray.push(...userHoldings);
      }
      const enabledRules = allRulesArray.filter((rule) => rule.enabled);
      if (enabledRules.length === 0) {
        log("[SimRuleExec] No enabled rules to evaluate");
        return;
      }
      const holdings = allHoldingsArray;
      if (holdings.length === 0) {
        log("[SimRuleExec] No simulated holdings to evaluate");
        return;
      }
      const stockMap = /* @__PURE__ */ new Map();
      for (const user of users2) {
        const userStocks = await storage.getStocks(user.id);
        for (const stock of userStocks) {
          if (!stockMap.has(stock.ticker)) {
            stockMap.set(stock.ticker, stock);
          }
        }
      }
      let executedCount = 0;
      for (const holding of holdings) {
        const stock = stockMap.get(holding.ticker);
        if (!stock) continue;
        const currentPrice = parseFloat(stock.currentPrice);
        const purchasePrice = parseFloat(holding.averagePurchasePrice);
        const previousClose = parseFloat(stock.previousClose || stock.currentPrice);
        const applicableRules = enabledRules.filter(
          (rule) => (rule.action === "sell" || rule.action === "sell_all") && (rule.scope === "all_holdings" || rule.scope === "specific_stock" && rule.ticker === holding.ticker)
        );
        for (const rule of applicableRules) {
          if (!rule.conditions || rule.conditions.length === 0) continue;
          const condition = rule.conditions[0];
          let targetPrice = 0;
          let isTriggered = false;
          if (condition.metric === "price_change_percent") {
            targetPrice = purchasePrice * (1 + condition.value / 100);
            if (condition.operator === "<" || condition.operator === "<=") {
              isTriggered = currentPrice <= targetPrice;
            } else if (condition.operator === ">" || condition.operator === ">=") {
              isTriggered = currentPrice >= targetPrice;
            }
          } else if (condition.metric === "price_change_from_close_percent") {
            targetPrice = previousClose * (1 + condition.value / 100);
            if (condition.operator === "<" || condition.operator === "<=") {
              isTriggered = currentPrice <= targetPrice;
            } else if (condition.operator === ">" || condition.operator === ">=") {
              isTriggered = currentPrice >= targetPrice;
            }
          } else if (condition.metric === "price_absolute") {
            targetPrice = condition.value;
            if (condition.operator === "<" || condition.operator === "<=") {
              isTriggered = currentPrice <= targetPrice;
            } else if (condition.operator === ">" || condition.operator === ">=") {
              isTriggered = currentPrice >= targetPrice;
            }
          }
          if (isTriggered) {
            let quantityToSell = 0;
            if (rule.action === "sell_all") {
              quantityToSell = holding.quantity;
            } else if (rule.actionParams) {
              if ("quantity" in rule.actionParams && rule.actionParams.quantity) {
                quantityToSell = Math.min(rule.actionParams.quantity, holding.quantity);
              } else if ("percentage" in rule.actionParams && rule.actionParams.percentage) {
                quantityToSell = Math.floor(holding.quantity * (rule.actionParams.percentage / 100));
              }
            }
            if (quantityToSell > 0) {
              const total = currentPrice * quantityToSell;
              await storage.createTrade({
                userId: holding.userId,
                ticker: holding.ticker,
                type: "sell",
                quantity: quantityToSell,
                price: currentPrice.toFixed(2),
                total: total.toFixed(2),
                status: "completed",
                broker: "simulation",
                isSimulated: true
              });
              executedCount++;
              log(`[SimRuleExec] Executed rule "${rule.name}" for ${holding.ticker}: Sold ${quantityToSell} shares at $${currentPrice.toFixed(2)} (triggered by ${condition.metric})`);
              if (ENABLE_TELEGRAM3 && telegramNotificationService) {
                const profitLoss = (currentPrice - purchasePrice) * quantityToSell;
                const profitLossPercent = (currentPrice - purchasePrice) / purchasePrice * 100;
                const message = `\u{1F916} SIMULATION: Auto-sell triggered

Rule: ${rule.name}
Stock: ${holding.ticker}
Sold: ${quantityToSell} shares @ $${currentPrice.toFixed(2)}
Purchase Price: $${purchasePrice.toFixed(2)}
P&L: ${profitLoss >= 0 ? "+" : ""}$${profitLoss.toFixed(2)} (${profitLossPercent >= 0 ? "+" : ""}${profitLossPercent.toFixed(2)}%)
Total: $${total.toFixed(2)}`;
                await telegramNotificationService.sendMessage(message).catch((err) => {
                  log(`[SimRuleExec] Failed to send Telegram notification: ${err.message}`);
                });
              }
            }
          }
        }
      }
      if (executedCount > 0) {
        log(`[SimRuleExec] Executed ${executedCount} simulated trades based on trading rules`);
      } else {
        log("[SimRuleExec] No rule conditions met");
      }
    } catch (error) {
      console.error("[SimRuleExec] Error evaluating rules:", error);
    }
  }
  evaluateAndExecuteRules().catch((err) => {
    console.error("[SimRuleExec] Initial evaluation failed:", err);
  });
  setInterval(evaluateAndExecuteRules, FIVE_MINUTES4);
  log("[SimRuleExec] Background job started - evaluating rules for simulated holdings every 5 minutes");
}
function startAIAnalysisJob() {
  const TEN_MINUTES2 = 10 * 60 * 1e3;
  let isRunning3 = false;
  async function analyzeNewStocks() {
    if (isRunning3) {
      log("[AIAnalysis] Skipping - previous job still running");
      return;
    }
    isRunning3 = true;
    try {
      log("[AIAnalysis] Checking for stocks needing AI analysis...");
      const users2 = await storage.getUsers();
      const allStocks = [];
      for (const user of users2) {
        const userStocks = await storage.getStocks(user.id);
        allStocks.push(...userStocks);
      }
      const uniqueTickersSet = /* @__PURE__ */ new Set();
      const pendingStocks = allStocks.filter((stock) => {
        if (stock.recommendationStatus === "pending" && !uniqueTickersSet.has(stock.ticker)) {
          uniqueTickersSet.add(stock.ticker);
          return true;
        }
        return false;
      });
      if (pendingStocks.length === 0) {
        log("[AIAnalysis] No pending stocks to analyze");
        return;
      }
      const buyCount = pendingStocks.filter((s) => s.recommendation === "buy").length;
      const sellCount = pendingStocks.filter((s) => s.recommendation === "sell").length;
      log(`[AIAnalysis] Found ${pendingStocks.length} pending stocks (${buyCount} buys, ${sellCount} sells), checking for missing analyses...`);
      let analyzedCount = 0;
      let skippedCount = 0;
      let errorCount = 0;
      for (const stock of pendingStocks) {
        try {
          const existingAnalysis = await storage.getStockAnalysis(stock.ticker);
          if (existingAnalysis) {
            if (existingAnalysis.status === "completed" || existingAnalysis.status === "analyzing") {
              skippedCount++;
              continue;
            }
          } else {
            await storage.saveStockAnalysis({
              ticker: stock.ticker,
              status: "pending"
            });
          }
          await storage.updateStockAnalysisStatus(stock.ticker, "analyzing");
          log(`[AIAnalysis] Running multi-signal analysis for ${stock.ticker}...`);
          const [companyOverview, balanceSheet, incomeStatement, cashFlow, dailyPrices] = await Promise.all([
            stockService.getCompanyOverview(stock.ticker),
            stockService.getBalanceSheet(stock.ticker),
            stockService.getIncomeStatement(stock.ticker),
            stockService.getCashFlow(stock.ticker),
            stockService.getDailyPrices(stock.ticker, 60)
          ]);
          const [technicalIndicators, newsSentiment] = await Promise.all([
            stockService.getTechnicalIndicators(stock.ticker, dailyPrices),
            stockService.getNewsSentiment(stock.ticker)
          ]);
          const priceNewsCorrelation = stockService.analyzePriceNewsCorrelation(dailyPrices, newsSentiment);
          log(`[AIAnalysis] Fetching SEC filings and comprehensive fundamentals for ${stock.ticker}...`);
          let secFilingData = null;
          let comprehensiveFundamentals = null;
          try {
            secFilingData = await secEdgarService.getCompanyFilingData(stock.ticker);
          } catch (error) {
            console.warn(`[AIAnalysis] Could not fetch SEC filings for ${stock.ticker}, continuing without:`, error instanceof Error ? error.message : error);
          }
          try {
            comprehensiveFundamentals = await stockService.getComprehensiveFundamentals(stock.ticker);
          } catch (error) {
            console.warn(`[AIAnalysis] Could not fetch comprehensive fundamentals for ${stock.ticker}, continuing without:`, error instanceof Error ? error.message : error);
          }
          const secFilings = secFilingData ? {
            formType: secFilingData.formType,
            filingDate: secFilingData.filingDate,
            managementDiscussion: secFilingData.managementDiscussion,
            riskFactors: secFilingData.riskFactors,
            businessOverview: secFilingData.businessOverview
          } : void 0;
          const insiderTradingStrength = await (async () => {
            try {
              const allStocks2 = await storage.getUserStocksForTicker(stock.userId, stock.ticker);
              if (allStocks2.length === 0) {
                return void 0;
              }
              const buyTransactions = allStocks2.filter((s) => s.recommendation?.toLowerCase().includes("buy"));
              const sellTransactions = allStocks2.filter((s) => s.recommendation?.toLowerCase().includes("sell"));
              let direction;
              let transactionType;
              let dominantSignal;
              if (buyTransactions.length > 0 && sellTransactions.length === 0) {
                direction = "buy";
                transactionType = "purchase";
                dominantSignal = "BULLISH - Only insider BUYING detected";
              } else if (sellTransactions.length > 0 && buyTransactions.length === 0) {
                direction = "sell";
                transactionType = "sale";
                dominantSignal = "BEARISH - Only insider SELLING detected";
              } else if (buyTransactions.length > 0 && sellTransactions.length > 0) {
                const sortedByDate = allStocks2.sort(
                  (a, b) => new Date(b.lastUpdated || 0).getTime() - new Date(a.lastUpdated || 0).getTime()
                );
                const mostRecentSignal = sortedByDate.find(
                  (s) => s.recommendation?.toLowerCase().includes("buy") || s.recommendation?.toLowerCase().includes("sell")
                );
                direction = mostRecentSignal?.recommendation?.toLowerCase().includes("buy") ? "buy" : "sell";
                transactionType = direction === "buy" ? "purchase" : "sale";
                dominantSignal = `MIXED SIGNALS - ${buyTransactions.length} BUY, ${sellTransactions.length} SELL (most recent: ${direction.toUpperCase()})`;
              } else {
                direction = "unknown";
                transactionType = "transaction";
                dominantSignal = "Unknown signal - no clear insider transactions";
              }
              const primaryStock = allStocks2.sort(
                (a, b) => new Date(b.lastUpdated || 0).getTime() - new Date(a.lastUpdated || 0).getTime()
              )[0];
              return {
                direction,
                transactionType,
                dominantSignal,
                buyCount: buyTransactions.length,
                sellCount: sellTransactions.length,
                totalTransactions: allStocks2.length,
                quantityStr: primaryStock.insiderQuantity ? `${primaryStock.insiderQuantity.toLocaleString()} shares` : "Unknown",
                insiderPrice: primaryStock.insiderPrice ? `$${parseFloat(primaryStock.insiderPrice).toFixed(2)}` : "Unknown",
                currentPrice: primaryStock.currentPrice ? `$${parseFloat(primaryStock.currentPrice).toFixed(2)}` : "Unknown",
                insiderName: primaryStock.insiderName || "Unknown",
                insiderTitle: primaryStock.insiderTitle || "Unknown",
                tradeDate: primaryStock.insiderTradeDate || "Unknown",
                totalValue: primaryStock.insiderPrice && primaryStock.insiderQuantity ? `$${(parseFloat(primaryStock.insiderPrice) * primaryStock.insiderQuantity).toFixed(2)}` : "Unknown",
                confidence: primaryStock.confidenceScore?.toString() || "Medium",
                allTransactions: allStocks2.map((s) => ({
                  direction: s.recommendation?.toLowerCase() || "unknown",
                  insiderName: s.insiderName || "Unknown",
                  insiderTitle: s.insiderTitle || "Unknown",
                  quantityStr: s.insiderQuantity ? `${s.insiderQuantity.toLocaleString()} shares` : "Unknown",
                  price: s.insiderPrice ? `$${parseFloat(s.insiderPrice).toFixed(2)}` : "Unknown",
                  date: s.insiderTradeDate || "Unknown",
                  value: s.insiderPrice && s.insiderQuantity ? `$${(parseFloat(s.insiderPrice) * s.insiderQuantity).toFixed(2)}` : "Unknown"
                }))
              };
            } catch (error) {
              console.error(`[Reconciliation] Error getting insider trading data for ${stock.ticker}:`, error);
              return void 0;
            }
          })();
          const analysis = await aiAnalysisService.analyzeStock({
            ticker: stock.ticker,
            companyOverview,
            balanceSheet,
            incomeStatement,
            cashFlow,
            technicalIndicators,
            newsSentiment,
            priceNewsCorrelation,
            insiderTradingStrength,
            secFilings,
            comprehensiveFundamentals
          });
          await storage.updateStockAnalysis(stock.ticker, {
            status: "completed",
            overallRating: analysis.overallRating,
            confidenceScore: analysis.confidenceScore,
            summary: analysis.summary,
            financialHealthScore: analysis.financialHealth.score,
            strengths: analysis.financialHealth.strengths,
            weaknesses: analysis.financialHealth.weaknesses,
            redFlags: analysis.financialHealth.redFlags,
            technicalAnalysisScore: analysis.technicalAnalysis?.score,
            technicalAnalysisTrend: analysis.technicalAnalysis?.trend,
            technicalAnalysisMomentum: analysis.technicalAnalysis?.momentum,
            technicalAnalysisSignals: analysis.technicalAnalysis?.signals,
            sentimentAnalysisScore: analysis.sentimentAnalysis?.score,
            sentimentAnalysisTrend: analysis.sentimentAnalysis?.trend,
            sentimentAnalysisNewsVolume: analysis.sentimentAnalysis?.newsVolume,
            sentimentAnalysisKeyThemes: analysis.sentimentAnalysis?.key_themes,
            keyMetrics: analysis.keyMetrics,
            risks: analysis.risks,
            opportunities: analysis.opportunities,
            recommendation: analysis.recommendation,
            analyzedAt: new Date(analysis.analyzedAt),
            errorMessage: null
            // Clear any previous errors
          });
          analyzedCount++;
          log(`[AIAnalysis] Successfully analyzed ${stock.ticker} (Score: ${analysis.financialHealth.score}/100, Rating: ${analysis.overallRating})`);
          await new Promise((resolve) => setTimeout(resolve, 2e3));
        } catch (error) {
          errorCount++;
          console.error(`[AIAnalysis] Error analyzing ${stock.ticker}:`, error);
          await storage.updateStockAnalysisStatus(
            stock.ticker,
            "failed",
            error instanceof Error ? error.message : "Unknown error"
          );
        }
      }
      log(`[AIAnalysis] Job complete: analyzed ${analyzedCount}, skipped ${skippedCount}, errors ${errorCount}`);
    } catch (error) {
      console.error("[AIAnalysis] Error in AI analysis job:", error);
    } finally {
      isRunning3 = false;
    }
  }
  analyzeNewStocks().catch((err) => {
    console.error("[AIAnalysis] Initial analysis failed:", err);
  });
  setInterval(analyzeNewStocks, TEN_MINUTES2);
  log("[AIAnalysis] Background job started - analyzing new stocks every 10 minutes");
}
function startAnalysisReconciliationJob() {
  const ONE_HOUR5 = 60 * 60 * 1e3;
  let isRunning3 = false;
  async function reconcileIncompleteAnalyses() {
    if (isRunning3) {
      log("[Reconciliation] Skipping - previous job still running");
      return;
    }
    isRunning3 = true;
    try {
      log("[Reconciliation] Checking for incomplete AI analyses...");
      const incompleteStocks = await storage.getStocksWithIncompleteAnalysis();
      if (incompleteStocks.length === 0) {
        log("[Reconciliation] No incomplete analyses found");
        return;
      }
      log(`[Reconciliation] Found ${incompleteStocks.length} stocks with incomplete analyses`);
      let requeuedCount = 0;
      let skippedCount = 0;
      let repairedCount = 0;
      for (const stock of incompleteStocks) {
        try {
          const existingAnalysis = await storage.getStockAnalysis(stock.ticker);
          if (existingAnalysis && existingAnalysis.status === "completed") {
            await storage.markStockAnalysisPhaseComplete(stock.ticker, "micro");
            await storage.markStockAnalysisPhaseComplete(stock.ticker, "macro");
            await storage.markStockAnalysisPhaseComplete(stock.ticker, "combined");
            repairedCount++;
            log(`[Reconciliation] Repaired flags for ${stock.ticker} (analysis already completed)`);
          } else {
            await storage.enqueueAnalysisJob(stock.ticker, "reconciliation", "low");
            requeuedCount++;
            log(`[Reconciliation] Re-queued ${stock.ticker} (micro: ${stock.microAnalysisCompleted}, macro: ${stock.macroAnalysisCompleted}, combined: ${stock.combinedAnalysisCompleted})`);
          }
        } catch (error) {
          skippedCount++;
          console.error(`[Reconciliation] Error processing ${stock.ticker}:`, error);
        }
      }
      log(`[Reconciliation] Job complete: repaired ${repairedCount}, re-queued ${requeuedCount}, skipped ${skippedCount}`);
    } catch (error) {
      console.error("[Reconciliation] Error in reconciliation job:", error);
    } finally {
      isRunning3 = false;
    }
  }
  reconcileIncompleteAnalyses().catch((err) => {
    console.error("[Reconciliation] Initial reconciliation failed:", err);
  });
  setInterval(reconcileIncompleteAnalyses, ONE_HOUR5);
  log("[Reconciliation] Background job started - reconciling incomplete analyses every hour");
}
function startDailyBriefJob() {
  const ONE_DAY4 = 24 * 60 * 60 * 1e3;
  async function generateDailyBriefs() {
    try {
      log("[DailyBrief] Starting daily brief generation job...");
      const users2 = await storage.getUsers();
      if (users2.length === 0) {
        log("[DailyBrief] No users found");
        return;
      }
      log(`[DailyBrief] Processing ${users2.length} users...`);
      const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      let generatedCount = 0;
      let skippedCount = 0;
      let errorCount = 0;
      for (const user of users2) {
        let userGeneratedCount = 0;
        let userSkippedCount = 0;
        let userErrorCount = 0;
        try {
          const followedStocks2 = await storage.getUserFollowedStocks(user.id);
          if (followedStocks2.length === 0) {
            log(`[DailyBrief] User ${user.name} has no followed stocks, skipping`);
            continue;
          }
          log(`[DailyBrief] Processing ${followedStocks2.length} followed stocks for user ${user.name}...`);
          for (const followedStock of followedStocks2) {
            const ticker = followedStock.ticker.toUpperCase();
            try {
              const todayBrief = await storage.getDailyBriefForUser(user.id, ticker, today);
              if (todayBrief) {
                log(`[DailyBrief] Skipping ${ticker} for ${user.name} - brief already exists for today`);
                skippedCount++;
                userSkippedCount++;
                continue;
              }
              let quote;
              try {
                quote = await stockService.getQuote(ticker);
                if (!quote || quote.price === 0 || quote.previousClose === 0) {
                  log(`[DailyBrief] Skipping ${ticker} - invalid or missing price data from Alpha Vantage`);
                  skippedCount++;
                  userSkippedCount++;
                  continue;
                }
                if (quote.previousClose === 0) {
                  log(`[DailyBrief] Skipping ${ticker} - previous close is zero, cannot calculate change`);
                  skippedCount++;
                  userSkippedCount++;
                  continue;
                }
              } catch (quoteError) {
                log(`[DailyBrief] Skipping ${ticker} - failed to fetch quote: ${quoteError instanceof Error ? quoteError.message : "Unknown error"}`);
                errorCount++;
                userErrorCount++;
                continue;
              }
              const holding = await storage.getPortfolioHoldingByTicker(user.id, ticker);
              const userOwnsPosition = holding !== null;
              const latestAnalysis = await storage.getStockAnalysis(ticker);
              if (latestAnalysis?.status === "completed") {
                log(`[DailyBrief] Using enriched AI playbook for ${ticker}: score=${latestAnalysis.integratedScore || latestAnalysis.confidenceScore || "N/A"}, rating=${latestAnalysis.overallRating || "N/A"}`);
              } else {
                log(`[DailyBrief] No completed AI analysis for ${ticker}, using fallback stock data`);
              }
              const stock = await storage.getStock(user.id, ticker);
              const stockData = stock;
              const getAnalyzedAtString = (val) => {
                if (!val) return void 0;
                if (val instanceof Date) return val.toISOString();
                if (typeof val === "string") return val;
                return void 0;
              };
              const previousAnalysis = latestAnalysis?.status === "completed" ? {
                overallRating: latestAnalysis.overallRating || "hold",
                summary: latestAnalysis.summary || "No summary available",
                recommendation: latestAnalysis.recommendation || void 0,
                integratedScore: latestAnalysis.integratedScore ?? void 0,
                confidenceScore: latestAnalysis.confidenceScore ?? void 0,
                technicalAnalysis: {
                  trend: latestAnalysis.technicalAnalysisTrend || "neutral",
                  momentum: latestAnalysis.technicalAnalysisMomentum || "weak",
                  score: latestAnalysis.technicalAnalysisScore ?? 50,
                  signals: latestAnalysis.technicalAnalysisSignals || []
                },
                sentimentAnalysis: {
                  trend: latestAnalysis.sentimentAnalysisTrend || "neutral",
                  newsVolume: latestAnalysis.sentimentAnalysisNewsVolume || "low",
                  score: latestAnalysis.sentimentAnalysisScore ?? 50,
                  keyThemes: latestAnalysis.sentimentAnalysisKeyThemes || []
                },
                risks: latestAnalysis.risks || [],
                opportunities: latestAnalysis.opportunities || [],
                analyzedAt: getAnalyzedAtString(latestAnalysis.analyzedAt),
                scorecard: latestAnalysis.scorecard ? {
                  globalScore: latestAnalysis.scorecard.globalScore,
                  confidence: latestAnalysis.scorecard.confidence,
                  sections: latestAnalysis.scorecard.sections ? {
                    fundamentals: latestAnalysis.scorecard.sections.fundamentals ? {
                      score: latestAnalysis.scorecard.sections.fundamentals.score,
                      weight: latestAnalysis.scorecard.sections.fundamentals.weight
                    } : void 0,
                    technicals: latestAnalysis.scorecard.sections.technicals ? {
                      score: latestAnalysis.scorecard.sections.technicals.score,
                      weight: latestAnalysis.scorecard.sections.technicals.weight
                    } : void 0,
                    insiderActivity: latestAnalysis.scorecard.sections.insiderActivity ? {
                      score: latestAnalysis.scorecard.sections.insiderActivity.score,
                      weight: latestAnalysis.scorecard.sections.insiderActivity.weight
                    } : void 0,
                    newsSentiment: latestAnalysis.scorecard.sections.newsSentiment ? {
                      score: latestAnalysis.scorecard.sections.newsSentiment.score,
                      weight: latestAnalysis.scorecard.sections.newsSentiment.weight
                    } : void 0,
                    macroSector: latestAnalysis.scorecard.sections.macroSector ? {
                      score: latestAnalysis.scorecard.sections.macroSector.score,
                      weight: latestAnalysis.scorecard.sections.macroSector.weight
                    } : void 0
                  } : void 0,
                  summary: latestAnalysis.scorecard.summary
                } : void 0
              } : stockData?.overallRating ? {
                overallRating: stockData.overallRating,
                summary: stockData.summary || "No previous analysis available",
                technicalAnalysis: stockData.technicalAnalysis ? {
                  trend: stockData.technicalAnalysis.trend,
                  momentum: stockData.technicalAnalysis.momentum,
                  score: stockData.technicalAnalysis.score,
                  signals: stockData.technicalAnalysis.signals
                } : void 0
              } : void 0;
              const opportunityType = latestAnalysis?.recommendation?.toLowerCase().includes("sell") || latestAnalysis?.recommendation?.toLowerCase().includes("avoid") || stockData?.recommendation?.toLowerCase().includes("sell") ? "sell" : "buy";
              let recentNews;
              try {
                const freshNewsSentiment = await stockService.getNewsSentiment(ticker);
                if (freshNewsSentiment?.articles && freshNewsSentiment.articles.length > 0) {
                  recentNews = freshNewsSentiment.articles.slice(0, 5).map((article) => ({
                    title: article.title || "Untitled",
                    sentiment: typeof article.sentiment === "number" ? article.sentiment : 0,
                    source: article.source || "Unknown"
                  }));
                  log(`[DailyBrief] Fetched ${recentNews.length} fresh news articles for ${ticker} (overall sentiment: ${freshNewsSentiment.aggregateSentiment?.toFixed(2) || "N/A"})`);
                }
              } catch (newsError) {
                log(`[DailyBrief] Fresh news fetch failed for ${ticker}, using cached: ${newsError instanceof Error ? newsError.message : "Unknown"}`);
              }
              if (!recentNews || recentNews.length === 0) {
                const now = Date.now() / 1e3;
                const oneDayAgo = now - 24 * 60 * 60;
                recentNews = stockData?.news?.filter((article) => article.datetime && article.datetime >= oneDayAgo)?.slice(0, 3)?.map((article) => ({
                  title: article.headline || "Untitled",
                  sentiment: 0,
                  source: article.source || "Unknown"
                }));
              }
              log(`[DailyBrief] Generating dual-scenario brief for ${ticker} - user ${user.name} (${userOwnsPosition ? "owns" : "watching"}, ${opportunityType} opportunity)...`);
              const brief = await aiAnalysisService.generateDailyBrief({
                ticker,
                currentPrice: quote.price,
                previousPrice: quote.previousClose,
                opportunityType,
                recentNews: recentNews && recentNews.length > 0 ? recentNews : void 0,
                previousAnalysis
              });
              await storage.createDailyBrief({
                userId: user.id,
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
              if (userOwnsPosition && brief.owning.recommendedStance === "sell") {
                try {
                  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1e3).toISOString().split("T")[0];
                  const yesterdayBrief = await storage.getDailyBriefForUser(user.id, ticker, yesterday);
                  if (yesterdayBrief && yesterdayBrief.recommendedStance === "hold") {
                    log(`[DailyBrief] Stance change detected for ${ticker} (${user.name}): hold\u2192sell on owned position`);
                    await storage.createNotification({
                      userId: user.id,
                      ticker,
                      type: "stance_change",
                      message: `${ticker}: Stance changed from HOLD to SELL on your position`,
                      metadata: {
                        previousStance: "hold",
                        newStance: "sell"
                      },
                      isRead: false
                    });
                    log(`[DailyBrief] Created stance_change notification for ${ticker} (${user.name})`);
                  }
                } catch (notifError) {
                  if (notifError instanceof Error && !notifError.message.includes("unique constraint")) {
                    log(`[DailyBrief] Failed to create stance change notification for ${ticker} (${user.name}): ${notifError.message}`);
                  }
                }
              }
              generatedCount++;
              userGeneratedCount++;
              log(`[DailyBrief] Generated dual-scenario brief for ${ticker} (${user.name}): Watching=${brief.watching.recommendedStance}(${brief.watching.confidence}), Owning=${brief.owning.recommendedStance}(${brief.owning.confidence})`);
            } catch (error) {
              errorCount++;
              userErrorCount++;
              const errorMsg = error instanceof Error ? error.message : "Unknown error";
              log(`[DailyBrief] Error generating brief for ${ticker} (${user.name}): ${errorMsg}`);
            }
          }
          log(`[DailyBrief] User ${user.name} complete: generated ${userGeneratedCount}, skipped ${userSkippedCount}, errors ${userErrorCount}`);
        } catch (error) {
          errorCount++;
          userErrorCount++;
          const errorMsg = error instanceof Error ? error.message : "Unknown error";
          log(`[DailyBrief] Error processing user ${user.name}: ${errorMsg}`);
        }
      }
      log(`[DailyBrief] Job complete: generated ${generatedCount}, skipped ${skippedCount}, errors ${errorCount}`);
    } catch (error) {
      console.error("[DailyBrief] Error in daily brief job:", error);
    }
  }
  setTimeout(() => {
    generateDailyBriefs().catch((err) => {
      console.error("[DailyBrief] Initial generation failed:", err);
    });
  }, 1e4);
  setInterval(generateDailyBriefs, ONE_DAY4);
  log("[DailyBrief] Background job started - generating briefs once a day");
}
function startUnverifiedUserCleanupJob() {
  const SIX_HOURS2 = 6 * 60 * 60 * 1e3;
  const CLEANUP_THRESHOLD_HOURS2 = 48;
  async function cleanupUnverifiedUsers() {
    try {
      log("[UnverifiedCleanup] Starting cleanup of unverified users...");
      const deletedCount = await storage.purgeUnverifiedUsers(CLEANUP_THRESHOLD_HOURS2);
      if (deletedCount > 0) {
        log(`[UnverifiedCleanup] Deleted ${deletedCount} unverified user(s) older than ${CLEANUP_THRESHOLD_HOURS2} hours`);
      } else {
        log("[UnverifiedCleanup] No unverified users to clean up");
      }
    } catch (error) {
      console.error("[UnverifiedCleanup] Error cleaning up unverified users:", error);
    }
  }
  setTimeout(() => {
    cleanupUnverifiedUsers().catch((err) => {
      console.error("[UnverifiedCleanup] Initial cleanup failed:", err);
    });
  }, 3e4);
  setInterval(cleanupUnverifiedUsers, SIX_HOURS2);
  log("[UnverifiedCleanup] Background job started - cleaning up every 6 hours");
}
