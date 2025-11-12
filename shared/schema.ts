import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, integer, timestamp, boolean, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Stock information from Telegram insider trading feed
export const stocks = pgTable("stocks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticker: text("ticker").notNull().unique(),
  companyName: text("company_name").notNull(),
  currentPrice: decimal("current_price", { precision: 12, scale: 2 }).notNull(), // Real-time market price
  previousClose: decimal("previous_close", { precision: 12, scale: 2 }),
  insiderPrice: decimal("insider_price", { precision: 12, scale: 2 }), // Price at which insider bought/sold
  insiderQuantity: integer("insider_quantity"), // Number of shares insider traded
  insiderTradeDate: text("insider_trade_date"), // Date when insider executed the trade
  insiderName: text("insider_name"), // Name of the insider who executed the trade
  insiderTitle: text("insider_title"), // Title of the insider (CEO, CFO, Director, etc.)
  marketPriceAtInsiderDate: decimal("market_price_at_insider_date", { precision: 12, scale: 2 }), // Market closing price on insider trade date
  marketCap: text("market_cap"),
  peRatio: decimal("pe_ratio", { precision: 10, scale: 2 }),
  recommendation: text("recommendation"), // "buy", "sell" (from insider action)
  recommendationStatus: text("recommendation_status").default("pending"), // "pending", "approved", "rejected"
  source: text("source"), // "telegram" or "openinsider" - data source
  confidenceScore: integer("confidence_score"), // 0-100
  priceHistory: jsonb("price_history").$type<{ date: string; price: number }[]>().default([]), // Last 7 days of prices
  candlesticks: jsonb("candlesticks").$type<{ date: string; open: number; high: number; low: number; close: number; volume: number }[]>().default([]), // Last 2 weeks of OHLCV data for charts
  // Company information from Finnhub
  description: text("description"), // Company description/overview
  industry: text("industry"), // Company's industry sector
  country: text("country"), // Company's country
  webUrl: text("web_url"), // Company's website
  ipo: text("ipo"), // IPO date
  // Latest news articles
  news: jsonb("news").$type<{
    headline: string;
    summary: string;
    source: string;
    url: string;
    datetime: number;
    image?: string;
  }[]>().default([]),
  // Insider sentiment (from Finnhub)
  insiderSentimentMspr: decimal("insider_sentiment_mspr", { precision: 10, scale: 4 }), // Monthly Share Purchase Ratio (-1 to 1)
  insiderSentimentChange: decimal("insider_sentiment_change", { precision: 10, scale: 4 }), // Change in MSPR from previous month
  microAnalysisCompleted: boolean("micro_analysis_completed").notNull().default(false), // Micro agent (fundamental) analysis completed
  macroAnalysisCompleted: boolean("macro_analysis_completed").notNull().default(false), // Macro agent (industry/sector) analysis completed
  combinedAnalysisCompleted: boolean("combined_analysis_completed").notNull().default(false), // Integrated score calculated
  lastUpdated: timestamp("last_updated").defaultNow(),
  rejectedAt: timestamp("rejected_at"), // When the recommendation was rejected
});

export const insertStockSchema = createInsertSchema(stocks).omit({ id: true, lastUpdated: true, recommendationStatus: true, rejectedAt: true });
export type InsertStock = z.infer<typeof insertStockSchema>;
export type Stock = typeof stocks.$inferSelect;

// User-specific stock recommendation statuses
export const userStockStatuses = pgTable("user_stock_statuses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  ticker: text("ticker").notNull(),
  status: text("status").notNull().default("pending"), // "pending", "approved", "rejected", "dismissed"
  approvedAt: timestamp("approved_at"),
  rejectedAt: timestamp("rejected_at"),
  dismissedAt: timestamp("dismissed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userTickerUnique: uniqueIndex("user_ticker_unique_idx").on(table.userId, table.ticker),
}));

export const insertUserStockStatusSchema = createInsertSchema(userStockStatuses).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUserStockStatus = z.infer<typeof insertUserStockStatusSchema>;
export type UserStockStatus = typeof userStockStatuses.$inferSelect;

// AI Financial Analysis - cached results from OpenAI analysis
export const stockAnalyses = pgTable("stock_analyses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticker: text("ticker").notNull().unique(),
  status: text("status").notNull().default("pending"), // "pending", "analyzing", "completed", "failed"
  overallRating: text("overall_rating"), // "strong_buy", "buy", "hold", "avoid", "strong_avoid"
  confidenceScore: integer("confidence_score"), // 0-100
  summary: text("summary"),
  financialHealthScore: integer("financial_health_score"), // 0-100
  strengths: jsonb("strengths").$type<string[]>(),
  weaknesses: jsonb("weaknesses").$type<string[]>(),
  redFlags: jsonb("red_flags").$type<string[]>(),
  // Technical Analysis (multi-signal enhancement)
  technicalAnalysisScore: integer("technical_analysis_score"), // 0-100
  technicalAnalysisTrend: text("technical_analysis_trend"), // "bullish", "bearish", "neutral"
  technicalAnalysisMomentum: text("technical_analysis_momentum"), // "strong", "moderate", "weak"
  technicalAnalysisSignals: jsonb("technical_analysis_signals").$type<string[]>(),
  // Sentiment Analysis (multi-signal enhancement)
  sentimentAnalysisScore: integer("sentiment_analysis_score"), // 0-100
  sentimentAnalysisTrend: text("sentiment_analysis_trend"), // "positive", "negative", "neutral"
  sentimentAnalysisNewsVolume: text("sentiment_analysis_news_volume"), // "high", "medium", "low"
  sentimentAnalysisKeyThemes: jsonb("sentiment_analysis_key_themes").$type<string[]>(),
  keyMetrics: jsonb("key_metrics").$type<{
    profitability: string;
    liquidity: string;
    leverage: string;
    growth: string;
  }>(),
  risks: jsonb("risks").$type<string[]>(),
  opportunities: jsonb("opportunities").$type<string[]>(),
  recommendation: text("recommendation"),
  analyzedAt: timestamp("analyzed_at"),
  errorMessage: text("error_message"), // Error message if analysis failed
  // SEC EDGAR Filing Data
  secFilingUrl: text("sec_filing_url"), // URL to latest 10-K or 10-Q filing
  secFilingType: text("sec_filing_type"), // "10-K", "10-Q", "8-K"
  secFilingDate: text("sec_filing_date"), // Date of the filing
  secCik: text("sec_cik"), // Company's CIK number for SEC lookups
  // SEC Filing Narrative Sections (extracted text)
  managementDiscussion: text("management_discussion"), // MD&A section
  riskFactors: text("risk_factors"), // Risk Factors section
  businessOverview: text("business_overview"), // Business section
  // Alpha Vantage Fundamental Data (structured financials)
  fundamentalData: jsonb("fundamental_data").$type<{
    // From OVERVIEW endpoint
    marketCap?: string;
    peRatio?: number;
    pegRatio?: number;
    bookValue?: number;
    dividendYield?: number;
    eps?: number;
    revenuePerShare?: number;
    profitMargin?: number;
    operatingMargin?: number;
    returnOnAssets?: number;
    returnOnEquity?: number;
    debtToEquity?: number;
    currentRatio?: number;
    quickRatio?: number;
    // From INCOME_STATEMENT (latest quarter)
    totalRevenue?: string;
    grossProfit?: string;
    operatingIncome?: string;
    netIncome?: string;
    ebitda?: string;
    // From BALANCE_SHEET (latest quarter)
    totalAssets?: string;
    totalLiabilities?: string;
    totalShareholderEquity?: string;
    // From CASH_FLOW (latest quarter)
    operatingCashflow?: string;
    capitalExpenditures?: string;
    freeCashFlow?: string;
  }>(),
  fundamentalAnalysis: text("fundamental_analysis"), // AI's interpretation of the fundamental data
  // Macro Analysis Integration
  macroAnalysisId: varchar("macro_analysis_id").references(() => macroAnalyses.id), // Reference to the macro analysis used
  integratedScore: integer("integrated_score"), // Final score combining micro + macro (0-100)
  scoreAdjustment: text("score_adjustment"), // Explanation of how macro adjusted the score
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertStockAnalysisSchema = createInsertSchema(stockAnalyses).omit({ id: true, createdAt: true });
export type InsertStockAnalysis = z.infer<typeof insertStockAnalysisSchema>;
export type StockAnalysis = typeof stockAnalyses.$inferSelect;

// Macro Economic Analysis - market-wide analysis to factor into individual stock scores
export const macroAnalyses = pgTable("macro_analyses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  industry: text("industry"), // Industry/sector being analyzed (e.g., "Banking", "Technology", "Healthcare")
  status: text("status").notNull().default("pending"), // "pending", "analyzing", "completed", "failed"
  macroScore: integer("macro_score"), // 0-100 overall macro economic health score
  macroFactor: decimal("macro_factor", { precision: 5, scale: 2 }), // 0.00-2.00 multiplier for micro scores (e.g., 0.67 = reduce, 1.2 = boost)
  summary: text("summary"), // High-level summary of macro conditions
  // Market Indices Data
  sp500Level: decimal("sp500_level", { precision: 12, scale: 2 }),
  sp500Change: decimal("sp500_change", { precision: 10, scale: 2 }), // % change
  sp500Trend: text("sp500_trend"), // "bullish", "bearish", "neutral"
  vixLevel: decimal("vix_level", { precision: 10, scale: 2 }), // Volatility index
  vixInterpretation: text("vix_interpretation"), // "low_fear", "moderate_fear", "high_fear", "extreme_fear"
  // Economic Indicators
  economicIndicators: jsonb("economic_indicators").$type<{
    interestRate?: number;
    inflation?: number;
    unemploymentRate?: number;
    gdpGrowth?: number;
  }>(),
  // Sector Analysis
  sectorPerformance: jsonb("sector_performance").$type<{
    sector: string;
    performance: string; // "strong", "moderate", "weak"
    trend: string; // "up", "down", "flat"
  }[]>(),
  // Market Conditions
  marketCondition: text("market_condition"), // "bull", "bear", "sideways", "volatile"
  marketPhase: text("market_phase"), // "early_cycle", "mid_cycle", "late_cycle", "recession"
  riskAppetite: text("risk_appetite"), // "high", "moderate", "low"
  // AI Analysis
  keyThemes: jsonb("key_themes").$type<string[]>(),
  opportunities: jsonb("opportunities").$type<string[]>(),
  risks: jsonb("risks").$type<string[]>(),
  recommendation: text("recommendation"), // Overall market recommendation
  analyzedAt: timestamp("analyzed_at"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMacroAnalysisSchema = createInsertSchema(macroAnalyses).omit({ id: true, createdAt: true });
export type InsertMacroAnalysis = z.infer<typeof insertMacroAnalysisSchema>;
export type MacroAnalysis = typeof macroAnalyses.$inferSelect;

// AI Analysis Job Queue - manages asynchronous stock analysis tasks
export const aiAnalysisJobs = pgTable("ai_analysis_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticker: text("ticker").notNull(),
  source: text("source").notNull(), // "user_manual", "background_job", "bulk_import", etc.
  priority: text("priority").notNull().default("normal"), // "high", "normal", "low"
  status: text("status").notNull().default("pending"), // "pending", "processing", "completed", "failed"
  retryCount: integer("retry_count").notNull().default(0),
  maxRetries: integer("max_retries").notNull().default(3),
  scheduledAt: timestamp("scheduled_at").defaultNow(), // When job should be processed (for delayed retries)
  startedAt: timestamp("started_at"), // When processing began
  completedAt: timestamp("completed_at"), // When job finished (success or failure)
  errorMessage: text("error_message"), // Error details if failed
  currentStep: text("current_step"), // Current processing step: "fetching_data", "micro_analysis", "macro_analysis", "calculating_score", "completed"
  stepDetails: jsonb("step_details").$type<{
    phase?: string; // "data_fetch", "micro", "macro", "integration"
    substep?: string; // Detailed substep like "fetching RSI", "analyzing fundamentals"
    progress?: string; // Progress indicator like "2/7" or "50%"
    timestamp?: string; // ISO timestamp of last update
  }>(),
  lastError: text("last_error"), // Detailed error message for the current/last failed step
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAiAnalysisJobSchema = createInsertSchema(aiAnalysisJobs).omit({ 
  id: true, 
  createdAt: true, 
  startedAt: true, 
  completedAt: true 
});
export type InsertAiAnalysisJob = z.infer<typeof insertAiAnalysisJobSchema>;
export type AiAnalysisJob = typeof aiAnalysisJobs.$inferSelect;

// Portfolio holdings - tracks what user owns
export const portfolioHoldings = pgTable("portfolio_holdings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  ticker: text("ticker").notNull(),
  quantity: integer("quantity").notNull(),
  averagePurchasePrice: decimal("average_purchase_price", { precision: 12, scale: 2 }).notNull(),
  currentValue: decimal("current_value", { precision: 12, scale: 2 }),
  profitLoss: decimal("profit_loss", { precision: 12, scale: 2 }),
  profitLossPercent: decimal("profit_loss_percent", { precision: 10, scale: 2 }),
  isSimulated: boolean("is_simulated").notNull().default(false), // Track simulated vs real holdings
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export const insertPortfolioHoldingSchema = createInsertSchema(portfolioHoldings).omit({ 
  id: true, 
  currentValue: true, 
  profitLoss: true, 
  profitLossPercent: true,
  lastUpdated: true 
});
export type InsertPortfolioHolding = z.infer<typeof insertPortfolioHoldingSchema>;
export type PortfolioHolding = typeof portfolioHoldings.$inferSelect;

// Trade transactions history
export const trades = pgTable("trades", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  ticker: text("ticker").notNull(),
  type: text("type").notNull(), // "buy" or "sell"
  quantity: integer("quantity").notNull(),
  price: decimal("price", { precision: 12, scale: 2 }).notNull(),
  total: decimal("total", { precision: 12, scale: 2 }).notNull(),
  status: text("status").notNull().default("completed"), // "pending", "completed", "failed"
  broker: text("broker").default("manual"), // "manual", "ibkr"
  ibkrOrderId: text("ibkr_order_id"), // IBKR order ID for tracking
  isSimulated: boolean("is_simulated").notNull().default(false), // Track simulated vs real trades
  executedAt: timestamp("executed_at").defaultNow(),
  n8nWorkflowId: text("n8n_workflow_id"),
});

export const insertTradeSchema = createInsertSchema(trades).omit({ 
  id: true 
});
export type InsertTrade = z.infer<typeof insertTradeSchema>;
export type Trade = typeof trades.$inferSelect;

// Trading rules configuration - header/container for compound rules
export const tradingRules = pgTable("trading_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }), // Made nullable during migration
  name: text("name").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  // Scope: "all_holdings", "specific_stock"
  scope: text("scope").notNull().default("all_holdings"),
  ticker: text("ticker"), // Only used when scope is "specific_stock"
  priority: integer("priority").notNull().default(1000), // Lower = higher priority
  // Legacy fields for backward compatibility
  conditions: jsonb("conditions").$type<{
    metric: string;
    operator: string;
    value: number;
    logic?: "AND" | "OR";
  }[]>(),
  action: text("action"), // "buy", "sell", "sell_all", "notify"
  actionParams: jsonb("action_params").$type<{
    quantity?: number;
    percentage?: number;
  }>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTradingRuleSchema = createInsertSchema(tradingRules).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type InsertTradingRule = z.infer<typeof insertTradingRuleSchema>;
export type TradingRule = typeof tradingRules.$inferSelect;

// Rule condition groups - groups of conditions with AND/OR logic
export const ruleConditionGroups = pgTable("rule_condition_groups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ruleId: varchar("rule_id").notNull().references(() => tradingRules.id, { onDelete: "cascade" }),
  groupOrder: integer("group_order").notNull(), // Order of evaluation
  junctionOperator: text("junction_operator"), // "AND" or "OR" to connect to NEXT group
  description: text("description"), // Human-readable description
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertRuleConditionGroupSchema = createInsertSchema(ruleConditionGroups).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertRuleConditionGroup = z.infer<typeof insertRuleConditionGroupSchema>;
export type RuleConditionGroup = typeof ruleConditionGroups.$inferSelect;

// Rule conditions - individual conditions within a group
export const ruleConditions = pgTable("rule_conditions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: varchar("group_id").notNull().references(() => ruleConditionGroups.id, { onDelete: "cascade" }),
  // Metric types: "price_change_percent", "price_change_from_close_percent", "price_absolute", "days_held"
  metric: text("metric").notNull(),
  // Comparator: ">", "<", ">=", "<=", "=="
  comparator: text("comparator").notNull(),
  threshold: decimal("threshold", { precision: 12, scale: 4 }).notNull(), // The value to compare against
  // Time-based fields
  timeframeValue: integer("timeframe_value"), // e.g., 10 for "10 days"
  timeframeUnit: text("timeframe_unit"), // "days", "hours", "minutes"
  // Optional metadata for future extensibility
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertRuleConditionSchema = createInsertSchema(ruleConditions).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertRuleCondition = z.infer<typeof insertRuleConditionSchema>;
export type RuleCondition = typeof ruleConditions.$inferSelect;

// Rule actions - actions linked to specific condition groups
export const ruleActions = pgTable("rule_actions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: varchar("group_id").notNull().references(() => ruleConditionGroups.id, { onDelete: "cascade" }),
  actionOrder: integer("action_order").notNull(), // Order of execution within the group
  // Action types: "sell_percentage", "sell_quantity", "sell_all", "notify"
  actionType: text("action_type").notNull(),
  quantity: integer("quantity"), // For sell_quantity
  percentage: decimal("percentage", { precision: 5, scale: 2 }), // For sell_percentage (0-100)
  allowRepeat: boolean("allow_repeat").notNull().default(false), // Can this action trigger multiple times?
  cooldownMinutes: integer("cooldown_minutes"), // Minimum time between repeated executions
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertRuleActionSchema = createInsertSchema(ruleActions).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertRuleAction = z.infer<typeof insertRuleActionSchema>;
export type RuleAction = typeof ruleActions.$inferSelect;

// Rule executions - audit log of rule triggers and actions
export const ruleExecutions = pgTable("rule_executions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ruleId: varchar("rule_id").notNull().references(() => tradingRules.id, { onDelete: "cascade" }),
  ticker: text("ticker").notNull(),
  holdingId: varchar("holding_id"), // Reference to portfolio_holdings
  triggeredAt: timestamp("triggered_at").notNull().defaultNow(),
  conditionsMet: jsonb("conditions_met").$type<{
    groupId: string;
    conditions: {
      metric: string;
      comparator: string;
      threshold: number;
      actualValue: number;
      met: boolean;
    }[];
  }[]>().notNull(),
  actionsExecuted: jsonb("actions_executed").$type<{
    actionId: string;
    actionType: string;
    quantity?: number;
    percentage?: number;
    executed: boolean;
    result?: string;
  }[]>().notNull(),
  success: boolean("success").notNull(),
  errorMessage: text("error_message"),
});

export const insertRuleExecutionSchema = createInsertSchema(ruleExecutions).omit({ 
  id: true, 
  triggeredAt: true 
});
export type InsertRuleExecution = z.infer<typeof insertRuleExecutionSchema>;
export type RuleExecution = typeof ruleExecutions.$inferSelect;

// Compound types for working with full rule structures
export type CompoundRule = TradingRule & {
  groups: (RuleConditionGroup & {
    conditions: RuleCondition[];
    actions: RuleAction[]; // Actions are now per-group
  })[];
};

// Schema for creating a compound rule in one operation
export const insertCompoundRuleSchema = z.object({
  // Rule header
  name: z.string().min(1),
  enabled: z.boolean().default(true),
  scope: z.enum(["all_holdings", "specific_stock"]).default("all_holdings"),
  ticker: z.string().optional(),
  priority: z.number().int().default(1000),
  
  // Condition groups (each with its own actions)
  groups: z.array(z.object({
    groupOrder: z.number().int(),
    junctionOperator: z.enum(["AND", "OR"]).optional(),
    description: z.string().optional(),
    conditions: z.array(z.object({
      metric: z.enum(["price_change_percent", "price_change_from_close_percent", "price_absolute", "days_held"]),
      comparator: z.enum([">", "<", ">=", "<=", "=="]),
      threshold: z.string(), // Will be converted to decimal
      timeframeValue: z.number().int().optional(),
      timeframeUnit: z.enum(["days", "hours", "minutes"]).optional(),
      metadata: z.record(z.any()).optional(),
    })),
    // Actions for this specific group
    actions: z.array(z.object({
      actionOrder: z.number().int(),
      actionType: z.enum(["sell_percentage", "sell_quantity", "sell_all", "notify"]),
      quantity: z.number().int().optional(),
      percentage: z.string().optional(), // Will be converted to decimal (0-100)
      allowRepeat: z.boolean().default(false),
      cooldownMinutes: z.number().int().optional(),
    })),
  })),
});

export type InsertCompoundRule = z.infer<typeof insertCompoundRuleSchema>;

// Users - for collaboration
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(), // Hashed password for authentication
  avatarColor: text("avatar_color").notNull().default("#3b82f6"), // Hex color for avatar
  isAdmin: boolean("is_admin").notNull().default(false), // Admin users can access backoffice
  subscriptionStatus: text("subscription_status").notNull().default("inactive"), // "active", "inactive", "cancelled"
  paypalSubscriptionId: text("paypal_subscription_id"), // PayPal subscription ID
  subscriptionStartDate: timestamp("subscription_start_date"),
  subscriptionEndDate: timestamp("subscription_end_date"),
  initialDataFetched: boolean("initial_data_fetched").notNull().default(false), // Track if initial 500 OpenInsider transactions have been fetched
  hasSeenOnboarding: boolean("has_seen_onboarding").notNull().default(false), // Track if user has completed the onboarding flow
  archived: boolean("archived").notNull().default(false), // Soft delete for hiding users from admin list
  archivedAt: timestamp("archived_at"),
  archivedBy: varchar("archived_by"), // Which admin archived this user
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({ 
  id: true, 
  createdAt: true,
  archivedAt: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Payment history - track all payments (PayPal and manual)
export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentDate: timestamp("payment_date").notNull(),
  paymentMethod: text("payment_method").notNull(), // "paypal", "manual", "stripe", etc.
  status: text("status").notNull().default("completed"), // "completed", "pending", "failed", "refunded"
  transactionId: text("transaction_id"), // External payment processor transaction ID
  notes: text("notes"), // Admin notes about manual payments
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: varchar("created_by"), // Which admin created manual payment (null for automated)
});

export const insertPaymentSchema = createInsertSchema(payments).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;

// Manual subscription overrides - when admin extends subscription manually
export const manualOverrides = pgTable("manual_overrides", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  monthsExtended: integer("months_extended").notNull(), // How many months were added
  reason: text("reason"), // Why this override was created
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: varchar("created_by").notNull(), // Which admin created this override
});

export const insertManualOverrideSchema = createInsertSchema(manualOverrides).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertManualOverride = z.infer<typeof insertManualOverrideSchema>;
export type ManualOverride = typeof manualOverrides.$inferSelect;

// Password reset tokens - for secure admin password reset flow
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: varchar("created_by").notNull(), // Which admin initiated the reset
});

export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({ 
  id: true, 
  createdAt: true,
  used: true,
});
export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

// User tutorials - track which tutorials each user has completed
export const userTutorials = pgTable("user_tutorials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  tutorialId: text("tutorial_id").notNull(), // "dashboard", "purchase", "management", "history", "rules", "backtesting", "settings", "stocks", "simulation"
  completedAt: timestamp("completed_at").defaultNow(),
});

export const insertUserTutorialSchema = createInsertSchema(userTutorials).omit({ 
  id: true, 
  completedAt: true 
});
export type InsertUserTutorial = z.infer<typeof insertUserTutorialSchema>;
export type UserTutorial = typeof userTutorials.$inferSelect;

// Stock comments - for collaboration on stock analysis
export const stockComments = pgTable("stock_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticker: text("ticker").notNull(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  comment: text("comment").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertStockCommentSchema = createInsertSchema(stockComments).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertStockComment = z.infer<typeof insertStockCommentSchema>;
export type StockComment = typeof stockComments.$inferSelect;

// Combined type for comment with user info
export type StockCommentWithUser = StockComment & {
  user: User;
};

// Stock interests - marks which stocks users find interesting
export const stockInterests = pgTable("stock_interests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticker: text("ticker").notNull(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertStockInterestSchema = createInsertSchema(stockInterests).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertStockInterest = z.infer<typeof insertStockInterestSchema>;
export type StockInterest = typeof stockInterests.$inferSelect;

// Combined type for interest with user info
export type StockInterestWithUser = StockInterest & {
  user: User;
};

// Stock views - tracks when users have viewed/clicked on stocks
export const stockViews = pgTable("stock_views", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticker: text("ticker").notNull(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  viewedAt: timestamp("viewed_at").defaultNow(),
});

export const insertStockViewSchema = createInsertSchema(stockViews).omit({ 
  id: true, 
  viewedAt: true 
});
export type InsertStockView = z.infer<typeof insertStockViewSchema>;
export type StockView = typeof stockViews.$inferSelect;

// Backtest results
export const backtests = pgTable("backtests", {
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
  tradeLog: jsonb("trade_log").$type<{
    date: string;
    type: string;
    ticker: string;
    quantity: number;
    price: number;
    total: number;
  }[]>(),
  equityCurve: jsonb("equity_curve").$type<{ date: string; value: number }[]>(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertBacktestSchema = createInsertSchema(backtests).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertBacktest = z.infer<typeof insertBacktestSchema>;
export type Backtest = typeof backtests.$inferSelect;

// Telegram Client Configuration for channel monitoring
export const telegramConfig = pgTable("telegram_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }), // Made nullable during migration
  channelUsername: text("channel_username").notNull(), // e.g., "InsiderTrading_SEC"
  sessionString: text("session_string"), // Persisted session to avoid re-auth
  phoneNumber: text("phone_number"), // For display/reference only
  enabled: boolean("enabled").notNull().default(true),
  lastSync: timestamp("last_sync"),
  lastMessageId: integer("last_message_id"), // Track last processed message to avoid duplicates
});

export const insertTelegramConfigSchema = createInsertSchema(telegramConfig).omit({ 
  id: true, 
  lastSync: true,
  lastMessageId: true,
  sessionString: true 
});
export type InsertTelegramConfig = z.infer<typeof insertTelegramConfigSchema>;
export type TelegramConfig = typeof telegramConfig.$inferSelect;

// Interactive Brokers Configuration
export const ibkrConfig = pgTable("ibkr_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }), // Made nullable during migration
  gatewayUrl: text("gateway_url").notNull().default("https://localhost:5000"), // IBKR Client Portal Gateway URL
  accountId: text("account_id"), // IBKR account ID (fetched from API)
  isConnected: boolean("is_connected").notNull().default(false),
  isPaperTrading: boolean("is_paper_trading").notNull().default(true),
  lastConnectionCheck: timestamp("last_connection_check"),
  lastError: text("last_error"),
});

export const insertIbkrConfigSchema = createInsertSchema(ibkrConfig).omit({ 
  id: true, 
  lastConnectionCheck: true,
  isConnected: true 
});
export type InsertIbkrConfig = z.infer<typeof insertIbkrConfigSchema>;
export type IbkrConfig = typeof ibkrConfig.$inferSelect;

// OpenInsider Configuration for insider trading data
export const openinsiderConfig = pgTable("openinsider_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }), // Made nullable during migration
  enabled: boolean("enabled").notNull().default(false),
  fetchLimit: integer("fetch_limit").notNull().default(50), // How many transactions to fetch
  fetchInterval: text("fetch_interval").notNull().default("hourly"), // "hourly" or "daily"
  fetchPreviousDayOnly: boolean("fetch_previous_day_only").notNull().default(false), // Only fetch yesterday's transactions
  // Filters
  insiderTitles: text("insider_titles").array(), // Filter by insider titles (CEO, CFO, Director, etc.)
  minTransactionValue: integer("min_transaction_value"), // Minimum transaction value in dollars
  lastSync: timestamp("last_sync"),
  lastError: text("last_error"),
});

export const insertOpeninsiderConfigSchema = createInsertSchema(openinsiderConfig).omit({ 
  id: true, 
  lastSync: true 
});
export type InsertOpeninsiderConfig = z.infer<typeof insertOpeninsiderConfigSchema>;
export type OpeninsiderConfig = typeof openinsiderConfig.$inferSelect;

// What-If Backtest Jobs - AI-powered historical analysis
export const backtestJobs = pgTable("backtest_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }), // Made nullable during migration
  name: text("name").notNull(),
  dataSource: text("data_source").notNull().default("telegram"), // "telegram" or "openinsider"
  messageCount: integer("message_count").notNull(), // Number of messages/transactions to analyze
  status: text("status").notNull().default("pending"), // "pending", "fetching_messages", "filtering", "building_matrix", "generating_scenarios", "calculating_results", "completed", "failed"
  progress: integer("progress").default(0), // 0-100
  errorMessage: text("error_message"),
  candidateStocks: jsonb("candidate_stocks").$type<{
    ticker: string;
    insiderBuyDate: string;
    insiderPrice: number;
    marketPrice: number;
    marketCap: string;
  }[]>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const insertBacktestJobSchema = createInsertSchema(backtestJobs).omit({ 
  id: true, 
  status: true,
  progress: true,
  errorMessage: true,
  candidateStocks: true,
  createdAt: true,
  completedAt: true
});
export type InsertBacktestJob = z.infer<typeof insertBacktestJobSchema>;
export type BacktestJob = typeof backtestJobs.$inferSelect;

// Historical price matrix for backtest stocks
export const backtestPriceData = pgTable("backtest_price_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull(),
  ticker: text("ticker").notNull(),
  insiderBuyDate: text("insider_buy_date").notNull(),
  priceMatrix: jsonb("price_matrix").$type<{
    date: string; // YYYY-MM-DD
    close: number;
  }[]>().notNull(), // Daily closing prices: 1 month before to 2 weeks after insider buy
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertBacktestPriceDataSchema = createInsertSchema(backtestPriceData).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertBacktestPriceData = z.infer<typeof insertBacktestPriceDataSchema>;
export type BacktestPriceData = typeof backtestPriceData.$inferSelect;

// AI-generated trading scenarios
export const backtestScenarios = pgTable("backtest_scenarios", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull(),
  scenarioNumber: integer("scenario_number").notNull(), // 1-10
  name: text("name").notNull(), // AI-generated scenario name
  description: text("description"), // AI-generated scenario description
  // Rule-based structure aligned with tradingRules
  sellConditions: jsonb("sell_conditions").$type<{
    metric: string; // "price_change_percent", "days_held", "price_change_from_buy_percent"
    operator: string; // ">", "<", ">=", "<=", "=="
    value: number;
    logic?: "AND" | "OR";
  }[]>().notNull(),
  sellAction: jsonb("sell_action").$type<{
    type: string; // "sell_all", "sell_percentage"
    percentage?: number; // If type is "sell_percentage"
  }>().notNull(),
  totalProfitLoss: decimal("total_profit_loss", { precision: 12, scale: 2 }).notNull(),
  totalProfitLossPercent: decimal("total_profit_loss_percent", { precision: 10, scale: 2 }).notNull(),
  winRate: decimal("win_rate", { precision: 5, scale: 2 }), // Percentage of winning trades
  numberOfTrades: integer("number_of_trades").notNull(),
  tradeDetails: jsonb("trade_details").$type<{
    ticker: string;
    buyDate: string;
    buyPrice: number;
    sellDate: string;
    sellPrice: number;
    profitLoss: number;
    profitLossPercent: number;
    reason: string; // Description of which condition was triggered
  }[]>(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertBacktestScenarioSchema = createInsertSchema(backtestScenarios).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertBacktestScenario = z.infer<typeof insertBacktestScenarioSchema>;
export type BacktestScenario = typeof backtestScenarios.$inferSelect;

// Feature Suggestions - community board for feature requests
export const featureSuggestions = pgTable("feature_suggestions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("pending"), // "pending", "roadmap", "deleted"
  voteCount: integer("vote_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertFeatureSuggestionSchema = createInsertSchema(featureSuggestions).omit({ 
  id: true, 
  voteCount: true,
  createdAt: true, 
  updatedAt: true 
});
export type InsertFeatureSuggestion = z.infer<typeof insertFeatureSuggestionSchema>;
export type FeatureSuggestion = typeof featureSuggestions.$inferSelect;

// Feature Votes - track which users voted for which suggestions
export const featureVotes = pgTable("feature_votes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  suggestionId: varchar("suggestion_id").notNull().references(() => featureSuggestions.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userSuggestionUnique: uniqueIndex("user_suggestion_unique_idx").on(table.userId, table.suggestionId),
}));

export const insertFeatureVoteSchema = createInsertSchema(featureVotes).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertFeatureVote = z.infer<typeof insertFeatureVoteSchema>;
export type FeatureVote = typeof featureVotes.$inferSelect;

// Notifications - alerts for high-value stock opportunities
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  ticker: text("ticker").notNull(),
  score: integer("score").notNull(), // AI integrated score
  message: text("message").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: uniqueIndex("notifications_user_id_idx").on(table.userId, table.isRead, table.createdAt),
}));

export const insertNotificationSchema = createInsertSchema(notifications).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;
