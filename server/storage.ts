import {
  type Stock,
  type InsertStock,
  type PortfolioHolding,
  type InsertPortfolioHolding,
  type Trade,
  type InsertTrade,
  type TradingRule,
  type InsertTradingRule,
  type Backtest,
  type InsertBacktest,
  type TelegramConfig,
  type InsertTelegramConfig,
  type IbkrConfig,
  type InsertIbkrConfig,
  type OpeninsiderConfig,
  type InsertOpeninsiderConfig,
  type BacktestJob,
  type InsertBacktestJob,
  type BacktestPriceData,
  type InsertBacktestPriceData,
  type BacktestScenario,
  type InsertBacktestScenario,
  type CompoundRule,
  type InsertCompoundRule,
  type RuleConditionGroup,
  type InsertRuleConditionGroup,
  type RuleCondition,
  type InsertRuleCondition,
  type RuleAction,
  type InsertRuleAction,
  type RuleExecution,
  type InsertRuleExecution,
  type User,
  type InsertUser,
  type StockComment,
  type InsertStockComment,
  type StockCommentWithUser,
  type StockView,
  type InsertStockView,
  type StockAnalysis,
  type InsertStockAnalysis,
  type MacroAnalysis,
  type InsertMacroAnalysis,
  type AiAnalysisJob,
  type InsertAiAnalysisJob,
  type UserStockStatus,
  type InsertUserStockStatus,
  type UserTutorial,
  type InsertUserTutorial,
  type Payment,
  type InsertPayment,
  type ManualOverride,
  type InsertManualOverride,
  type PasswordResetToken,
  type InsertPasswordResetToken,
  type FeatureSuggestion,
  type InsertFeatureSuggestion,
  type FeatureVote,
  type InsertFeatureVote,
  type Notification,
  type InsertNotification,
  type InsiderProfile,
  type InsertInsiderProfile,
  type Announcement,
  type InsertAnnouncement,
  type AnnouncementRead,
  type InsertAnnouncementRead,
  type AdminNotification,
  type InsertAdminNotification,
  type FollowedStock,
  type InsertFollowedStock,
  type DailyBrief,
  type InsertDailyBrief,
  type StockCandlesticks,
  type InsertStockCandlesticks,
  stocks,
  portfolioHoldings,
  trades,
  tradingRules,
  backtests,
  telegramConfig,
  ibkrConfig,
  openinsiderConfig,
  backtestJobs,
  backtestPriceData,
  backtestScenarios,
  ruleConditionGroups,
  ruleConditions,
  ruleActions,
  ruleExecutions,
  users,
  stockComments,
  stockViews,
  stockAnalyses,
  stockCandlesticks,
  macroAnalyses,
  aiAnalysisJobs,
  userStockStatuses,
  userTutorials,
  payments,
  manualOverrides,
  passwordResetTokens,
  featureSuggestions,
  featureVotes,
  notifications,
  insiderProfiles,
  announcements,
  announcementReads,
  adminNotifications,
  followedStocks,
  dailyBriefs,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and, inArray, lt } from "drizzle-orm";
import { isStockStale, getStockAgeInDays } from "@shared/time";
import { eventDispatcher } from "./eventDispatcher";

export interface IStorage {
  // Stocks (Per-user tenant isolation)
  getStocks(userId: string): Promise<Stock[]>;
  getStocksByStatus(userId: string, status: string): Promise<Stock[]>;
  getStocksByUserStatus(userId: string, status: string): Promise<Stock[]>;
  getStock(userId: string, ticker: string): Promise<Stock | undefined>;
  getAnyStockForTicker(ticker: string): Promise<Stock | undefined>; // Global: Get ANY stock record for ticker (for extracting shared metadata like industry)
  getUserStocksForTicker(userId: string, ticker: string): Promise<Stock[]>; // Per-user: Get specific user's stocks for a ticker
  getAllStocksForTickerGlobal(ticker: string): Promise<Stock[]>; // Global: Get ALL users' stocks for a ticker (AI analysis aggregation)
  getTransactionByCompositeKey(userId: string, ticker: string, insiderTradeDate: string, insiderName: string, recommendation: string): Promise<Stock | undefined>;
  createStock(stock: InsertStock): Promise<Stock>;
  updateStock(userId: string, ticker: string, stock: Partial<Stock>): Promise<Stock | undefined>;
  deleteStock(userId: string, ticker: string): Promise<boolean>;
  deleteExpiredPendingStocks(ageInDays: number): Promise<{ count: number; tickers: string[] }>;
  deleteExpiredRejectedStocks(ageInDays: number): Promise<{ count: number; tickers: string[] }>;
  deleteStocksOlderThan(ageInDays: number): Promise<{ count: number; tickers: string[] }>;
  unrejectStock(userId: string, ticker: string): Promise<Stock | undefined>;
  // Global helpers for background jobs (update shared market data across all users' stocks)
  getAllUniquePendingTickers(): Promise<string[]>;
  getAllUniqueTickersNeedingData(): Promise<string[]>;
  updateStocksByTickerGlobally(ticker: string, updates: Partial<Stock>): Promise<number>;

  // Portfolio Holdings
  getPortfolioHoldings(userId: string, isSimulated?: boolean): Promise<PortfolioHolding[]>;
  getPortfolioHolding(id: string, userId?: string): Promise<PortfolioHolding | undefined>;
  getPortfolioHoldingByTicker(userId: string, ticker: string, isSimulated?: boolean): Promise<PortfolioHolding | undefined>;
  createPortfolioHolding(holding: InsertPortfolioHolding): Promise<PortfolioHolding>;
  updatePortfolioHolding(id: string, holding: Partial<PortfolioHolding>): Promise<PortfolioHolding | undefined>;
  deletePortfolioHolding(id: string): Promise<boolean>;
  deleteSimulatedHoldingsByTicker(userId: string, ticker: string): Promise<number>;

  // Trades
  getTrades(userId: string, isSimulated?: boolean): Promise<Trade[]>;
  getTrade(id: string, userId?: string): Promise<Trade | undefined>;
  createTrade(trade: InsertTrade): Promise<Trade>;
  updateTrade(id: string, trade: Partial<Trade>): Promise<Trade | undefined>;
  deleteSimulatedTradesByTicker(userId: string, ticker: string): Promise<number>;

  // Trading Rules
  getTradingRules(userId: string): Promise<TradingRule[]>;
  getTradingRule(id: string): Promise<TradingRule | undefined>;
  createTradingRule(rule: InsertTradingRule): Promise<TradingRule>;
  updateTradingRule(id: string, rule: Partial<TradingRule>): Promise<TradingRule | undefined>;
  deleteTradingRule(id: string): Promise<boolean>;

  // Compound Rules (multi-condition rules)
  getCompoundRules(): Promise<CompoundRule[]>;
  getCompoundRule(id: string): Promise<CompoundRule | undefined>;
  createCompoundRule(rule: InsertCompoundRule): Promise<CompoundRule>;
  updateCompoundRule(id: string, rule: Partial<InsertCompoundRule>): Promise<CompoundRule | undefined>;
  deleteCompoundRule(id: string): Promise<boolean>;

  // Rule Executions (audit log)
  getRuleExecutions(ruleId?: string, ticker?: string): Promise<RuleExecution[]>;
  createRuleExecution(execution: InsertRuleExecution): Promise<RuleExecution>;

  // Backtests
  getBacktests(): Promise<Backtest[]>;
  getBacktest(id: string): Promise<Backtest | undefined>;
  createBacktest(backtest: InsertBacktest): Promise<Backtest>;

  // Telegram Configuration
  getTelegramConfig(): Promise<TelegramConfig | undefined>;
  createOrUpdateTelegramConfig(config: InsertTelegramConfig): Promise<TelegramConfig>;
  updateTelegramSyncStatus(lastMessageId: number): Promise<void>;
  updateTelegramSession(sessionString: string): Promise<void>;

  // IBKR Configuration
  getIbkrConfig(): Promise<IbkrConfig | undefined>;
  createOrUpdateIbkrConfig(config: Partial<InsertIbkrConfig>): Promise<IbkrConfig>;
  updateIbkrConnectionStatus(isConnected: boolean, accountId?: string, error?: string): Promise<void>;

  // OpenInsider Configuration
  getOpeninsiderConfig(): Promise<OpeninsiderConfig | undefined>;
  createOrUpdateOpeninsiderConfig(config: Partial<InsertOpeninsiderConfig>): Promise<OpeninsiderConfig>;
  updateOpeninsiderSyncStatus(error?: string): Promise<void>;

  // What-If Backtest Jobs
  getBacktestJobs(userId: string): Promise<BacktestJob[]>;
  getBacktestJob(id: string): Promise<BacktestJob | undefined>;
  createBacktestJob(job: InsertBacktestJob): Promise<BacktestJob>;
  updateBacktestJob(id: string, updates: Partial<BacktestJob>): Promise<BacktestJob | undefined>;
  deleteBacktestJob(id: string): Promise<boolean>;

  // Backtest Price Data
  getBacktestPriceData(jobId: string): Promise<BacktestPriceData[]>;
  getCachedPriceData(ticker: string, insiderBuyDate: string): Promise<BacktestPriceData | undefined>;
  createBacktestPriceData(data: InsertBacktestPriceData): Promise<BacktestPriceData>;

  // Backtest Scenarios
  getBacktestScenarios(jobId: string): Promise<BacktestScenario[]>;
  createBacktestScenario(scenario: InsertBacktestScenario): Promise<BacktestScenario>;

  // Users
  getUsers(options?: { includeArchived?: boolean }): Promise<User[]>;
  getAllUserIds(): Promise<string[]>;
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  archiveUser(userId: string, archivedBy: string): Promise<User | undefined>;
  unarchiveUser(userId: string): Promise<User | undefined>;
  updateUserSubscriptionStatus(userId: string, status: string, endDate?: Date): Promise<User | undefined>;
  markUserHasSeenOnboarding(userId: string): Promise<void>;
  completeUserOnboarding(userId: string): Promise<void>;
  getUserProgress(userId: string): Promise<{ onboardingCompletedAt: Date | null; tutorialCompletions: Record<string, boolean> }>;
  completeTutorial(userId: string, tutorialId: string): Promise<void>;

  // Payments
  getUserPayments(userId: string): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  getPaymentStats(userId: string): Promise<{
    totalPaid: string;
    lastPaymentDate: Date | null;
    lastPaymentAmount: string | null;
    paymentCount: number;
  }>;

  // Manual Overrides
  createManualOverride(override: InsertManualOverride): Promise<ManualOverride>;
  getUserManualOverrides(userId: string): Promise<ManualOverride[]>;
  getActiveManualOverride(userId: string): Promise<ManualOverride | undefined>;

  // Password Reset
  createPasswordResetToken(token: InsertPasswordResetToken): Promise<PasswordResetToken>;
  getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined>;
  markPasswordResetTokenUsed(tokenId: string): Promise<boolean>;
  purgeExpiredPasswordResetTokens(): Promise<number>;

  // Stock Comments
  getStockComments(ticker: string): Promise<StockCommentWithUser[]>;
  getStockCommentCounts(): Promise<{ ticker: string; count: number }[]>;
  createStockComment(comment: InsertStockComment): Promise<StockComment>;

  // Followed Stocks
  getUserFollowedStocks(userId: string): Promise<FollowedStock[]>;
  followStock(follow: InsertFollowedStock): Promise<FollowedStock>;
  unfollowStock(ticker: string, userId: string): Promise<boolean>;
  toggleStockPosition(ticker: string, userId: string, hasEnteredPosition: boolean, entryPrice?: number): Promise<boolean>;
  getFollowedStocksWithPrices(userId: string): Promise<Array<FollowedStock & { currentPrice: string; priceChange: string; priceChangePercent: string }>>;
  getFollowedStocksWithStatus(userId: string): Promise<Array<FollowedStock & { 
    currentPrice: string; 
    priceChange: string; 
    priceChangePercent: string;
    jobStatus?: 'pending' | 'processing' | 'completed' | 'failed' | null;
    insiderAction?: 'BUY' | 'SELL' | null;
    aiStance?: 'BUY' | 'SELL' | 'HOLD' | null;
    aiScore?: number | null;
    integratedScore?: number | null;
    stanceAlignment?: 'act' | 'hold' | null;
  }>>;
  // Cross-user aggregation for "popular stock" notifications
  getFollowerCountForTicker(ticker: string): Promise<number>;
  getFollowerUserIdsForTicker(ticker: string): Promise<string[]>;
  getDailyBriefsForTicker(ticker: string): Promise<DailyBrief[]>;
  getDailyBriefForUser(userId: string, ticker: string, briefDate: string): Promise<DailyBrief | undefined>;
  createDailyBrief(brief: InsertDailyBrief): Promise<DailyBrief>;

  // User Stock Statuses
  getUserStockStatus(userId: string, ticker: string): Promise<UserStockStatus | undefined>;
  getUserStockStatuses(userId: string, status?: string): Promise<UserStockStatus[]>;
  createUserStockStatus(status: InsertUserStockStatus): Promise<UserStockStatus>;
  updateUserStockStatus(userId: string, ticker: string, updates: Partial<UserStockStatus>): Promise<UserStockStatus | undefined>;
  ensureUserStockStatus(userId: string, ticker: string): Promise<UserStockStatus>;
  rejectTickerForUser(userId: string, ticker: string): Promise<{ userStatus: UserStockStatus; stocksUpdated: number }>;

  // Stock Views
  markStockAsViewed(ticker: string, userId: string): Promise<StockView>;
  getUserStockViews(userId: string): Promise<string[]>; // Returns list of viewed tickers for user

  // Tutorials
  hasCompletedTutorial(userId: string, tutorialId: string): Promise<boolean>;
  markTutorialAsCompleted(userId: string, tutorialId: string): Promise<UserTutorial>;
  getUserTutorials(userId: string): Promise<UserTutorial[]>;

  // Stock AI Analysis
  getStockAnalysis(ticker: string): Promise<StockAnalysis | undefined>;
  getAllStockAnalyses(): Promise<StockAnalysis[]>;
  saveStockAnalysis(analysis: InsertStockAnalysis): Promise<StockAnalysis>;
  updateStockAnalysis(ticker: string, updates: Partial<StockAnalysis>): Promise<void>;
  updateStockAnalysisStatus(ticker: string, status: string, errorMessage?: string): Promise<void>;

  // Stock Candlesticks (shared OHLCV data - one record per ticker, reused across users)
  getCandlesticksByTicker(ticker: string): Promise<StockCandlesticks | undefined>;
  upsertCandlesticks(ticker: string, candlestickData: { date: string; open: number; high: number; low: number; close: number; volume: number }[]): Promise<StockCandlesticks>;
  getAllTickersNeedingCandlestickData(): Promise<string[]>;

  // AI Analysis Job Queue
  enqueueAnalysisJob(ticker: string, source: string, priority?: string): Promise<AiAnalysisJob>;
  cancelAnalysisJobsForTicker(ticker: string): Promise<void>;
  dequeueNextJob(): Promise<AiAnalysisJob | undefined>;
  getJobById(jobId: string): Promise<AiAnalysisJob | undefined>;
  getJobsByTicker(ticker: string): Promise<AiAnalysisJob[]>;
  updateJobStatus(jobId: string, status: string, updates?: Partial<AiAnalysisJob>): Promise<void>;
  updateJobProgress(jobId: string, currentStep: string, stepDetails: any): Promise<void>;
  resetStockAnalysisPhaseFlags(ticker: string): Promise<void>;
  markStockAnalysisPhaseComplete(ticker: string, phase: 'micro' | 'macro' | 'combined'): Promise<void>;
  getStocksWithIncompleteAnalysis(): Promise<Stock[]>;
  getQueueStats(): Promise<{ pending: number; processing: number; completed: number; failed: number }>;

  // Macro Analysis
  getLatestMacroAnalysis(industry?: string | null): Promise<MacroAnalysis | undefined>;
  getMacroAnalysis(id: string): Promise<MacroAnalysis | undefined>;
  createMacroAnalysis(analysis: InsertMacroAnalysis): Promise<MacroAnalysis>;
  updateMacroAnalysisStatus(id: string, status: string, errorMessage?: string): Promise<void>;

  // Feature Suggestions
  getFeatureSuggestions(userId?: string, status?: string): Promise<(FeatureSuggestion & { userName: string; userHasVoted: boolean })[]>;
  getFeatureSuggestion(id: string): Promise<FeatureSuggestion | undefined>;
  createFeatureSuggestion(suggestion: InsertFeatureSuggestion): Promise<FeatureSuggestion>;
  updateFeatureSuggestionStatus(id: string, status: string): Promise<FeatureSuggestion | undefined>;
  deleteFeatureSuggestion(id: string): Promise<boolean>;
  voteForSuggestion(suggestionId: string, userId: string): Promise<boolean>;
  unvoteForSuggestion(suggestionId: string, userId: string): Promise<boolean>;
  hasUserVoted(suggestionId: string, userId: string): Promise<boolean>;

  // Notifications
  getNotifications(userId: string): Promise<Notification[]>;
  getUnreadNotificationCount(userId: string): Promise<number>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: string, userId: string): Promise<Notification | undefined>;
  markAllNotificationsAsRead(userId: string): Promise<number>;
  clearAllNotifications(userId: string): Promise<number>;

  // Announcements
  getAnnouncements(userId: string): Promise<(Announcement & { readAt?: Date | null })[]>;
  getUnreadAnnouncementCount(userId: string): Promise<number>;
  getAllAnnouncements(): Promise<Announcement[]>;
  createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement>;
  updateAnnouncement(id: string, updates: Partial<Announcement>): Promise<Announcement | undefined>;
  deactivateAnnouncement(id: string): Promise<Announcement | undefined>;
  deleteAnnouncement(id: string): Promise<void>;
  markAnnouncementAsRead(userId: string, announcementId: string): Promise<void>;
  markAllAnnouncementsAsRead(userId: string): Promise<void>;

  // Admin Notifications
  getAdminNotifications(): Promise<AdminNotification[]>;
  getUnreadAdminNotificationCount(): Promise<number>;
  createAdminNotification(notification: InsertAdminNotification): Promise<AdminNotification>;
  markAdminNotificationAsRead(id: string): Promise<AdminNotification | undefined>;
  markAllAdminNotificationsAsRead(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async initializeDefaults() {
    // Create default Telegram configuration if it doesn't exist
    const existingTelegramConfig = await this.getTelegramConfig();
    if (!existingTelegramConfig) {
      await this.createOrUpdateTelegramConfig({
        channelUsername: "InsiderTrading_SEC",
        phoneNumber: undefined,
        enabled: true,
      });
    }

    // Create default OpenInsider configuration if it doesn't exist
    const existingOpeninsiderConfig = await this.getOpeninsiderConfig();
    if (!existingOpeninsiderConfig) {
      await this.createOrUpdateOpeninsiderConfig({
        enabled: true,
        fetchLimit: 500,
        fetchInterval: "hourly",
        fetchPreviousDayOnly: false,
        insiderTitles: ["CEO", "CFO", "Director", "President", "COO", "CTO", "10% Owner"],
        minTransactionValue: 100000, // $100k minimum
      });
    }
  }

  private async updateHoldingValues(holding: PortfolioHolding): Promise<void> {
    // CRITICAL: Filter by userId to ensure tenant isolation
    const [stock] = await db.select().from(stocks).where(and(
      eq(stocks.ticker, holding.ticker),
      eq(stocks.userId, holding.userId)
    ));
    if (!stock) return;

    const currentPrice = parseFloat(stock.currentPrice);
    const avgPrice = parseFloat(holding.averagePurchasePrice);
    const currentValue = currentPrice * holding.quantity;
    const totalCost = avgPrice * holding.quantity;
    const profitLoss = currentValue - totalCost;
    const profitLossPercent = (profitLoss / totalCost) * 100;

    await db
      .update(portfolioHoldings)
      .set({
        currentValue: currentValue.toFixed(2),
        profitLoss: profitLoss.toFixed(2),
        profitLossPercent: profitLossPercent.toFixed(2),
        lastUpdated: sql`now()`,
      })
      .where(eq(portfolioHoldings.id, holding.id));
  }

  // Stocks (Per-user tenant isolation)
  async getStocks(userId: string): Promise<Stock[]> {
    // Include active analysis job data for progress UI
    const results = await db
      .select({
        stock: stocks,
        analysisJob: aiAnalysisJobs,
      })
      .from(stocks)
      .leftJoin(
        aiAnalysisJobs,
        and(
          eq(stocks.ticker, aiAnalysisJobs.ticker),
          sql`${aiAnalysisJobs.status} IN ('pending', 'processing')`
        )
      )
      .where(eq(stocks.userId, userId));
    
    // Map results to include analysisJob data
    return results.map((row) => ({
      ...row.stock,
      analysisJob: row.analysisJob || undefined,
    } as any));
  }

  async getStock(userId: string, ticker: string): Promise<Stock | undefined> {
    // Handle multiple transactions per ticker by getting the most recent one
    const [stock] = await db
      .select()
      .from(stocks)
      .where(and(
        eq(stocks.userId, userId),
        eq(stocks.ticker, ticker)
      ))
      .orderBy(desc(stocks.lastUpdated))
      .limit(1);
    return stock;
  }

  async getAnyStockForTicker(ticker: string): Promise<Stock | undefined> {
    // Global: Returns ANY stock record for a ticker (for extracting shared metadata like industry)
    const [stock] = await db.select().from(stocks).where(eq(stocks.ticker, ticker)).limit(1);
    return stock;
  }

  async getUserStocksForTicker(userId: string, ticker: string): Promise<Stock[]> {
    // Per-user: Returns only this user's stocks for a ticker
    return await db.select().from(stocks).where(and(
      eq(stocks.userId, userId),
      eq(stocks.ticker, ticker)
    ));
  }

  async getAllStocksForTickerGlobal(ticker: string): Promise<Stock[]> {
    // Global: Returns ALL users' stocks for a ticker (used by AI worker for aggregation)
    return await db.select().from(stocks).where(eq(stocks.ticker, ticker));
  }

  async getTransactionByCompositeKey(
    userId: string,
    ticker: string,
    insiderTradeDate: string,
    insiderName: string,
    recommendation: string
  ): Promise<Stock | undefined> {
    const [stock] = await db
      .select()
      .from(stocks)
      .where(
        and(
          eq(stocks.userId, userId),
          eq(stocks.ticker, ticker),
          eq(stocks.insiderTradeDate, insiderTradeDate),
          eq(stocks.insiderName, insiderName),
          eq(stocks.recommendation, recommendation)
        )
      );
    return stock;
  }

  async createStock(stock: InsertStock): Promise<Stock> {
    const [newStock] = await db.insert(stocks).values(stock).returning();
    return newStock;
  }

  async updateStock(userId: string, ticker: string, updates: Partial<Stock>): Promise<Stock | undefined> {
    const [updatedStock] = await db
      .update(stocks)
      .set({ ...updates, lastUpdated: sql`now()` })
      .where(and(
        eq(stocks.userId, userId),
        eq(stocks.ticker, ticker)
      ))
      .returning();

    if (updatedStock) {
      // Update all holdings for this stock
      const holdings = await db
        .select()
        .from(portfolioHoldings)
        .where(and(
          eq(portfolioHoldings.userId, userId),
          eq(portfolioHoldings.ticker, ticker)
        ));
      
      for (const holding of holdings) {
        await this.updateHoldingValues(holding);
      }
    }

    return updatedStock;
  }

  async deleteStock(userId: string, ticker: string): Promise<boolean> {
    const result = await db.delete(stocks).where(and(
      eq(stocks.userId, userId),
      eq(stocks.ticker, ticker)
    ));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async deleteExpiredPendingStocks(ageInDays: number): Promise<{ count: number; tickers: string[] }> {
    const startTime = Date.now();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - ageInDays);
    
    console.log(`[CLEANUP] Starting cleanup: deleting pending stocks older than ${ageInDays} days (before ${cutoffDate.toISOString()})`);
    
    // Use transaction to ensure atomicity
    const result = await db.transaction(async (tx) => {
      // 1. Find candidate stocks (pending + older than cutoff)
      const candidates = await tx
        .select({ ticker: stocks.ticker })
        .from(stocks)
        .where(and(
          lt(stocks.lastUpdated, cutoffDate),
          eq(stocks.recommendationStatus, 'pending')
        ))
        .for('update'); // Lock rows for deletion
      
      if (candidates.length === 0) {
        console.log('[CLEANUP] No expired pending stocks found');
        return { count: 0, tickers: [] };
      }
      
      const candidateTickers = candidates.map(c => c.ticker);
      console.log(`[CLEANUP] Found ${candidateTickers.length} candidates: ${candidateTickers.join(', ')}`);
      
      // 2. Safety check: verify no portfolio holdings or trades exist for these tickers
      const holdingsCheck = await tx
        .select({ ticker: portfolioHoldings.ticker })
        .from(portfolioHoldings)
        .where(inArray(portfolioHoldings.ticker, candidateTickers));
      
      const tradesCheck = await tx
        .select({ ticker: trades.ticker })
        .from(trades)
        .where(inArray(trades.ticker, candidateTickers));
      
      if (holdingsCheck.length > 0 || tradesCheck.length > 0) {
        const conflictTickers = Array.from(new Set([
          ...holdingsCheck.map(h => h.ticker),
          ...tradesCheck.map(t => t.ticker)
        ]));
        console.error(`[CLEANUP] ABORT: Found portfolio/trade data for tickers: ${conflictTickers.join(', ')}`);
        throw new Error(`Cannot delete stocks with existing holdings/trades: ${conflictTickers.join(', ')}`);
      }
      
      // 3. Delete child records in safe order (ticker-based foreign keys)
      const deleteCounts = {
        aiJobs: 0,
        analyses: 0,
        views: 0,
        userStatuses: 0,
        comments: 0,
      };
      
      // Delete AI analysis jobs
      const deletedJobs = await tx.delete(aiAnalysisJobs)
        .where(inArray(aiAnalysisJobs.ticker, candidateTickers))
        .returning({ ticker: aiAnalysisJobs.ticker });
      deleteCounts.aiJobs = deletedJobs.length;
      
      // Delete stock analyses
      const deletedAnalyses = await tx.delete(stockAnalyses)
        .where(inArray(stockAnalyses.ticker, candidateTickers))
        .returning({ ticker: stockAnalyses.ticker });
      deleteCounts.analyses = deletedAnalyses.length;
      

      // Delete stock views
      const deletedViews = await tx.delete(stockViews)
        .where(inArray(stockViews.ticker, candidateTickers))
        .returning({ ticker: stockViews.ticker });
      deleteCounts.views = deletedViews.length;
      
      // Delete user stock statuses
      const deletedStatuses = await tx.delete(userStockStatuses)
        .where(inArray(userStockStatuses.ticker, candidateTickers))
        .returning({ ticker: userStockStatuses.ticker });
      deleteCounts.userStatuses = deletedStatuses.length;
      
      // Delete stock comments
      const deletedComments = await tx.delete(stockComments)
        .where(inArray(stockComments.ticker, candidateTickers))
        .returning({ ticker: stockComments.ticker });
      deleteCounts.comments = deletedComments.length;
      
      // 4. Finally, delete the stocks themselves
      const deletedStocks = await tx.delete(stocks)
        .where(inArray(stocks.ticker, candidateTickers))
        .returning({ ticker: stocks.ticker });
      
      console.log(`[CLEANUP] Deleted child records:`, deleteCounts);
      console.log(`[CLEANUP] Deleted ${deletedStocks.length} stocks: ${deletedStocks.map(s => s.ticker).join(', ')}`);
      
      return { count: deletedStocks.length, tickers: deletedStocks.map(s => s.ticker) };
    });
    
    const elapsedMs = Date.now() - startTime;
    console.log(`[CLEANUP] Cleanup completed in ${elapsedMs}ms - Deleted ${result.count} stocks`);
    
    return result;
  }

  async deleteExpiredRejectedStocks(ageInDays: number): Promise<{ count: number; tickers: string[] }> {
    const startTime = Date.now();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - ageInDays);
    
    console.log(`[CLEANUP] Starting cleanup: deleting rejected stocks older than ${ageInDays} days (before ${cutoffDate.toISOString()})`);
    
    // Use transaction to ensure atomicity
    const result = await db.transaction(async (tx) => {
      // 1. Find candidate stocks (rejected + older than cutoff)
      const candidates = await tx
        .select({ ticker: stocks.ticker })
        .from(stocks)
        .where(and(
          lt(stocks.rejectedAt, cutoffDate),
          sql`${stocks.rejectedAt} IS NOT NULL`,
          eq(stocks.recommendationStatus, 'rejected')
        ))
        .for('update'); // Lock rows for deletion
      
      if (candidates.length === 0) {
        console.log('[CLEANUP] No expired rejected stocks found');
        return { count: 0, tickers: [] };
      }
      
      const candidateTickers = candidates.map(c => c.ticker);
      console.log(`[CLEANUP] Found ${candidateTickers.length} rejected candidates: ${candidateTickers.join(', ')}`);
      
      // 2. Safety check: verify no portfolio holdings or trades exist for these tickers
      const holdingsCheck = await tx
        .select({ ticker: portfolioHoldings.ticker })
        .from(portfolioHoldings)
        .where(inArray(portfolioHoldings.ticker, candidateTickers));
      
      const tradesCheck = await tx
        .select({ ticker: trades.ticker })
        .from(trades)
        .where(inArray(trades.ticker, candidateTickers));
      
      if (holdingsCheck.length > 0 || tradesCheck.length > 0) {
        const conflictTickers = Array.from(new Set([
          ...holdingsCheck.map(h => h.ticker),
          ...tradesCheck.map(t => t.ticker)
        ]));
        console.error(`[CLEANUP] ABORT: Found portfolio/trade data for tickers: ${conflictTickers.join(', ')}`);
        throw new Error(`Cannot delete stocks with existing holdings/trades: ${conflictTickers.join(', ')}`);
      }
      
      // 3. Delete child records in safe order (ticker-based foreign keys)
      const deleteCounts = {
        aiJobs: 0,
        analyses: 0,
        views: 0,
        userStatuses: 0,
        comments: 0,
      };
      
      // Delete AI analysis jobs
      const deletedJobs = await tx.delete(aiAnalysisJobs)
        .where(inArray(aiAnalysisJobs.ticker, candidateTickers))
        .returning({ ticker: aiAnalysisJobs.ticker });
      deleteCounts.aiJobs = deletedJobs.length;
      
      // Delete stock analyses
      const deletedAnalyses = await tx.delete(stockAnalyses)
        .where(inArray(stockAnalyses.ticker, candidateTickers))
        .returning({ ticker: stockAnalyses.ticker });
      deleteCounts.analyses = deletedAnalyses.length;
      

      // Delete stock views
      const deletedViews = await tx.delete(stockViews)
        .where(inArray(stockViews.ticker, candidateTickers))
        .returning({ ticker: stockViews.ticker });
      deleteCounts.views = deletedViews.length;
      
      // Delete user stock statuses
      const deletedStatuses = await tx.delete(userStockStatuses)
        .where(inArray(userStockStatuses.ticker, candidateTickers))
        .returning({ ticker: userStockStatuses.ticker });
      deleteCounts.userStatuses = deletedStatuses.length;
      
      // Delete stock comments
      const deletedComments = await tx.delete(stockComments)
        .where(inArray(stockComments.ticker, candidateTickers))
        .returning({ ticker: stockComments.ticker });
      deleteCounts.comments = deletedComments.length;
      
      // 4. Finally, delete the stocks themselves
      const deletedStocks = await tx.delete(stocks)
        .where(inArray(stocks.ticker, candidateTickers))
        .returning({ ticker: stocks.ticker });
      
      console.log(`[CLEANUP] Deleted child records:`, deleteCounts);
      console.log(`[CLEANUP] Deleted ${deletedStocks.length} rejected stocks: ${deletedStocks.map(s => s.ticker).join(', ')}`);
      
      return { count: deletedStocks.length, tickers: deletedStocks.map(s => s.ticker) };
    });
    
    const elapsedMs = Date.now() - startTime;
    console.log(`[CLEANUP] Rejected stocks cleanup completed in ${elapsedMs}ms - Deleted ${result.count} stocks`);
    
    return result;
  }

  async getStocksByStatus(userId: string, status: string): Promise<Stock[]> {
    // CRITICAL: Filter by userId for tenant isolation
    return await db.select().from(stocks).where(and(
      eq(stocks.userId, userId),
      eq(stocks.recommendationStatus, status)
    ));
  }

  async getStocksByUserStatus(userId: string, status: string): Promise<Stock[]> {
    const results = await db
      .select({
        stock: stocks,
      })
      .from(stocks)
      .leftJoin(
        userStockStatuses,
        and(
          eq(stocks.ticker, userStockStatuses.ticker),
          eq(userStockStatuses.userId, userId)
        )
      )
      .where(
        and(
          eq(stocks.userId, userId), // CRITICAL: Filter stocks by userId for tenant isolation
          eq(userStockStatuses.status, status)
        )
      );
    
    return results.map(row => row.stock);
  }

  async unrejectStock(userId: string, ticker: string): Promise<Stock | undefined> {
    const [updatedStock] = await db
      .update(stocks)
      .set({ 
        recommendationStatus: "pending",
        rejectedAt: null,
        lastUpdated: sql`now()` 
      })
      .where(and(
        eq(stocks.userId, userId),
        eq(stocks.ticker, ticker)
      ))
      .returning();
    return updatedStock;
  }

  // Global helpers for background jobs (efficiently update market data across all users)
  async getAllUniquePendingTickers(): Promise<string[]> {
    const result = await db
      .selectDistinct({ ticker: stocks.ticker })
      .from(stocks)
      .where(eq(stocks.recommendationStatus, 'pending'));
    return result.map(r => r.ticker);
  }

  async getAllUniqueTickersNeedingData(): Promise<string[]> {
    const result = await db
      .selectDistinct({ ticker: stocks.ticker })
      .from(stocks)
      .where(
        or(
          eq(stocks.recommendationStatus, 'pending'),
          sql`${stocks.candlesticks} IS NULL`,
          sql`jsonb_array_length(${stocks.candlesticks}) = 0`
        )
      );
    return result.map(r => r.ticker);
  }

  async updateStocksByTickerGlobally(ticker: string, updates: Partial<Stock>): Promise<number> {
    const result = await db
      .update(stocks)
      .set({ ...updates, lastUpdated: sql`now()` })
      .where(eq(stocks.ticker, ticker));
    return result.rowCount || 0;
  }

  async deleteStocksOlderThan(ageInDays: number): Promise<{ count: number; tickers: string[] }> {
    const startTime = Date.now();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - ageInDays);
    const cutoffDateString = cutoffDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
    
    console.log(`[CLEANUP] Starting 2-week horizon cleanup: deleting stocks older than ${ageInDays} days (before ${cutoffDateString}), excluding followed stocks`);
    
    // Use transaction to ensure atomicity
    const result = await db.transaction(async (tx) => {
      // 1. Find candidate stocks (older than cutoff + NOT followed by any user)
      // insiderTradeDate is stored as text (YYYY-MM-DD), so compare with string
      const candidates = await tx
        .select({ ticker: stocks.ticker })
        .from(stocks)
        .leftJoin(followedStocks, eq(stocks.ticker, followedStocks.ticker))
        .where(and(
          lt(stocks.insiderTradeDate, cutoffDateString),
          sql`${followedStocks.ticker} IS NULL` // Not followed by anyone
        ))
        .for('update'); // Lock rows for deletion
      
      if (candidates.length === 0) {
        console.log('[CLEANUP] No old non-followed stocks found');
        return { count: 0, tickers: [] };
      }
      
      const candidateTickers = candidates.map(c => c.ticker);
      console.log(`[CLEANUP] Found ${candidateTickers.length} old non-followed stocks: ${candidateTickers.join(', ')}`);
      
      // 2. Safety check: verify no portfolio holdings or trades exist for these tickers
      const holdingsCheck = await tx
        .select({ ticker: portfolioHoldings.ticker })
        .from(portfolioHoldings)
        .where(inArray(portfolioHoldings.ticker, candidateTickers))
        .limit(1);
      
      if (holdingsCheck.length > 0) {
        console.warn(`[CLEANUP] WARNING: Found portfolio holdings for stocks marked for deletion. Skipping cleanup for safety.`);
        return { count: 0, tickers: [] };
      }
      
      const tradesCheck = await tx
        .select({ ticker: trades.ticker })
        .from(trades)
        .where(inArray(trades.ticker, candidateTickers))
        .limit(1);
      
      if (tradesCheck.length > 0) {
        console.warn(`[CLEANUP] WARNING: Found trades for stocks marked for deletion. Skipping cleanup for safety.`);
        return { count: 0, tickers: [] };
      }
      
      // 3. Delete all related child records first
      const deleteCounts = {
        aiJobs: 0,
        analyses: 0,
        views: 0,
        userStatuses: 0,
        comments: 0,
      };
      
      // Delete AI analysis jobs
      const deletedJobs = await tx.delete(aiAnalysisJobs)
        .where(inArray(aiAnalysisJobs.ticker, candidateTickers))
        .returning({ ticker: aiAnalysisJobs.ticker });
      deleteCounts.aiJobs = deletedJobs.length;
      
      // Delete stock analyses
      const deletedAnalyses = await tx.delete(stockAnalyses)
        .where(inArray(stockAnalyses.ticker, candidateTickers))
        .returning({ ticker: stockAnalyses.ticker });
      deleteCounts.analyses = deletedAnalyses.length;
      

      // Delete stock views
      const deletedViews = await tx.delete(stockViews)
        .where(inArray(stockViews.ticker, candidateTickers))
        .returning({ ticker: stockViews.ticker });
      deleteCounts.views = deletedViews.length;
      
      // Delete user stock statuses
      const deletedStatuses = await tx.delete(userStockStatuses)
        .where(inArray(userStockStatuses.ticker, candidateTickers))
        .returning({ ticker: userStockStatuses.ticker });
      deleteCounts.userStatuses = deletedStatuses.length;
      
      // Delete stock comments
      const deletedComments = await tx.delete(stockComments)
        .where(inArray(stockComments.ticker, candidateTickers))
        .returning({ ticker: stockComments.ticker });
      deleteCounts.comments = deletedComments.length;
      
      // 4. Finally, delete the stocks themselves
      const deletedStocks = await tx.delete(stocks)
        .where(inArray(stocks.ticker, candidateTickers))
        .returning({ ticker: stocks.ticker });
      
      console.log(`[CLEANUP] Deleted child records:`, deleteCounts);
      console.log(`[CLEANUP] Deleted ${deletedStocks.length} old stocks: ${deletedStocks.map(s => s.ticker).join(', ')}`);
      
      return { count: deletedStocks.length, tickers: deletedStocks.map(s => s.ticker) };
    });
    
    const elapsedMs = Date.now() - startTime;
    console.log(`[CLEANUP] 2-week horizon cleanup completed in ${elapsedMs}ms - Deleted ${result.count} stocks`);
    
    return result;
  }

  // Portfolio Holdings
  async getPortfolioHoldings(userId: string, isSimulated?: boolean): Promise<PortfolioHolding[]> {
    let whereConditions = [eq(portfolioHoldings.userId, userId)];
    
    if (isSimulated !== undefined) {
      whereConditions.push(eq(portfolioHoldings.isSimulated, isSimulated));
    }
    
    const holdings = await db.select().from(portfolioHoldings).where(and(...whereConditions));
    
    // Update values before returning
    for (const holding of holdings) {
      await this.updateHoldingValues(holding);
    }
    
    // Re-fetch with same filter after updates
    return await db.select().from(portfolioHoldings).where(and(...whereConditions));
  }

  async getPortfolioHolding(id: string, userId?: string): Promise<PortfolioHolding | undefined> {
    // CRITICAL SECURITY: If userId provided, verify ownership for tenant isolation
    const whereClause = userId 
      ? and(eq(portfolioHoldings.id, id), eq(portfolioHoldings.userId, userId))
      : eq(portfolioHoldings.id, id);
    
    const [holding] = await db.select().from(portfolioHoldings).where(whereClause);
    if (holding) {
      await this.updateHoldingValues(holding);
      const [updated] = await db.select().from(portfolioHoldings).where(whereClause);
      return updated;
    }
    return undefined;
  }

  async getPortfolioHoldingByTicker(userId: string, ticker: string, isSimulated?: boolean): Promise<PortfolioHolding | undefined> {
    let whereConditions = [eq(portfolioHoldings.userId, userId), eq(portfolioHoldings.ticker, ticker)];
    
    if (isSimulated !== undefined) {
      whereConditions.push(eq(portfolioHoldings.isSimulated, isSimulated));
    }
    
    const [holding] = await db
      .select()
      .from(portfolioHoldings)
      .where(and(...whereConditions));
    
    if (holding) {
      await this.updateHoldingValues(holding);
      const [updated] = await db
        .select()
        .from(portfolioHoldings)
        .where(and(...whereConditions));
      return updated;
    }
    return undefined;
  }

  async createPortfolioHolding(holding: InsertPortfolioHolding): Promise<PortfolioHolding> {
    const [newHolding] = await db.insert(portfolioHoldings).values(holding).returning();
    await this.updateHoldingValues(newHolding);
    const [updated] = await db.select().from(portfolioHoldings).where(eq(portfolioHoldings.id, newHolding.id));
    return updated;
  }

  async updatePortfolioHolding(id: string, updates: Partial<PortfolioHolding>): Promise<PortfolioHolding | undefined> {
    const [updatedHolding] = await db
      .update(portfolioHoldings)
      .set({ ...updates, lastUpdated: sql`now()` })
      .where(eq(portfolioHoldings.id, id))
      .returning();

    if (updatedHolding) {
      await this.updateHoldingValues(updatedHolding);
      const [updated] = await db.select().from(portfolioHoldings).where(eq(portfolioHoldings.id, id));
      return updated;
    }
    return undefined;
  }

  async deletePortfolioHolding(id: string): Promise<boolean> {
    const result = await db.delete(portfolioHoldings).where(eq(portfolioHoldings.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async deleteSimulatedHoldingsByTicker(userId: string, ticker: string): Promise<number> {
    const result = await db
      .delete(portfolioHoldings)
      .where(and(
        eq(portfolioHoldings.userId, userId),
        eq(portfolioHoldings.ticker, ticker),
        eq(portfolioHoldings.isSimulated, true)
      ))
      .returning();
    return result.length;
  }

  // Trades
  async getTrades(userId: string, isSimulated?: boolean): Promise<Trade[]> {
    let whereConditions = [eq(trades.userId, userId)];
    
    if (isSimulated !== undefined) {
      whereConditions.push(eq(trades.isSimulated, isSimulated));
    }
    
    return await db.select().from(trades).where(and(...whereConditions)).orderBy(desc(trades.executedAt));
  }

  async getTrade(id: string, userId?: string): Promise<Trade | undefined> {
    // CRITICAL SECURITY: If userId provided, verify ownership for tenant isolation
    const whereClause = userId
      ? and(eq(trades.id, id), eq(trades.userId, userId))
      : eq(trades.id, id);
    
    const [trade] = await db.select().from(trades).where(whereClause);
    return trade;
  }

  async createTrade(trade: InsertTrade): Promise<Trade> {
    // Update portfolio holdings first - ensure simulated and real holdings are kept separate
    const isSimulated = trade.isSimulated ?? undefined;
    
    // userId is required for portfolio operations
    if (!trade.userId) {
      throw new Error("userId is required to create a trade");
    }
    
    const existingHolding = await this.getPortfolioHoldingByTicker(trade.userId, trade.ticker, isSimulated);

    // Validate sell trades
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

    let realizedProfitLoss: string | undefined;
    let realizedProfitLossPercent: string | undefined;

    if (trade.type === "buy") {
      if (existingHolding) {
        // Update existing holding
        const totalQuantity = existingHolding.quantity + trade.quantity;
        const totalCost =
          parseFloat(existingHolding.averagePurchasePrice) * existingHolding.quantity +
          parseFloat(trade.price) * trade.quantity;
        const newAvgPrice = totalCost / totalQuantity;

        await this.updatePortfolioHolding(existingHolding.id, {
          quantity: totalQuantity,
          averagePurchasePrice: newAvgPrice.toFixed(2),
        });
        
        // Update holding values (current price, P&L, etc.)
        const updatedHolding = await this.getPortfolioHolding(existingHolding.id);
        if (updatedHolding) {
          await this.updateHoldingValues(updatedHolding);
        }
      } else {
        // Create new holding
        const newHolding = await this.createPortfolioHolding({
          userId: trade.userId,
          ticker: trade.ticker,
          quantity: trade.quantity,
          averagePurchasePrice: trade.price,
          isSimulated: isSimulated !== undefined ? isSimulated : false,
        });
        
        // Update holding values for new holding
        await this.updateHoldingValues(newHolding);
      }
    } else if (trade.type === "sell" && existingHolding) {
      // Calculate realized P&L for this sell
      const sellPrice = parseFloat(trade.price);
      const avgPurchasePrice = parseFloat(existingHolding.averagePurchasePrice);
      const profitLoss = (sellPrice - avgPurchasePrice) * trade.quantity;
      const profitLossPercent = ((sellPrice - avgPurchasePrice) / avgPurchasePrice) * 100;
      
      realizedProfitLoss = profitLoss.toFixed(2);
      realizedProfitLossPercent = profitLossPercent.toFixed(2);

      // Reduce holding quantity
      const newQuantity = existingHolding.quantity - trade.quantity;
      if (newQuantity <= 0) {
        // Completely sold - delete holding
        await this.deletePortfolioHolding(existingHolding.id);
      } else {
        // Partial sell - update quantity and recalculate values
        await this.updatePortfolioHolding(existingHolding.id, {
          quantity: newQuantity,
        });
        
        // Update holding values (current price, P&L, etc.) for remaining shares
        const updatedHolding = await this.getPortfolioHolding(existingHolding.id);
        if (updatedHolding) {
          await this.updateHoldingValues(updatedHolding);
        }
      }
    }

    // Create trade record with realized P&L for sells
    const tradeData = {
      ...trade,
      ...(realizedProfitLoss && { profitLoss: realizedProfitLoss }),
      ...(realizedProfitLossPercent && { profitLossPercent: realizedProfitLossPercent }),
    };
    
    const [newTrade] = await db.insert(trades).values(tradeData).returning();

    return newTrade;
  }

  async updateTrade(id: string, updates: Partial<Trade>): Promise<Trade | undefined> {
    const [updatedTrade] = await db
      .update(trades)
      .set(updates)
      .where(eq(trades.id, id))
      .returning();
    return updatedTrade;
  }

  async deleteSimulatedTradesByTicker(userId: string, ticker: string): Promise<number> {
    const result = await db
      .delete(trades)
      .where(and(
        eq(trades.userId, userId),
        eq(trades.ticker, ticker),
        eq(trades.isSimulated, true)
      ))
      .returning();
    return result.length;
  }

  // Trading Rules
  async getTradingRules(userId: string): Promise<TradingRule[]> {
    return await db.select().from(tradingRules).where(eq(tradingRules.userId, userId));
  }

  async getTradingRule(id: string): Promise<TradingRule | undefined> {
    const [rule] = await db.select().from(tradingRules).where(eq(tradingRules.id, id));
    return rule;
  }

  async createTradingRule(rule: InsertTradingRule): Promise<TradingRule> {
    const [newRule] = await db.insert(tradingRules).values(rule).returning();
    return newRule;
  }

  async updateTradingRule(id: string, updates: Partial<TradingRule>): Promise<TradingRule | undefined> {
    const [updatedRule] = await db
      .update(tradingRules)
      .set({ ...updates, updatedAt: sql`now()` })
      .where(eq(tradingRules.id, id))
      .returning();
    return updatedRule;
  }

  async deleteTradingRule(id: string): Promise<boolean> {
    const result = await db.delete(tradingRules).where(eq(tradingRules.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Compound Rules (multi-condition rules)
  async getCompoundRules(): Promise<CompoundRule[]> {
    const allRules = await db.select().from(tradingRules).orderBy(tradingRules.priority);
    
    const compoundRules: CompoundRule[] = [];
    for (const rule of allRules) {
      const groups = await db
        .select()
        .from(ruleConditionGroups)
        .where(eq(ruleConditionGroups.ruleId, rule.id))
        .orderBy(ruleConditionGroups.groupOrder);
      
      const groupsWithConditions = await Promise.all(
        groups.map(async (group) => {
          const conditions = await db
            .select()
            .from(ruleConditions)
            .where(eq(ruleConditions.groupId, group.id));
          
          return { ...group, conditions };
        })
      );
      
      const actions = await db
        .select()
        .from(ruleActions)
        .where(eq(ruleActions.ruleId, rule.id))
        .orderBy(ruleActions.actionOrder);
      
      compoundRules.push({
        ...rule,
        groups: groupsWithConditions,
        actions
      });
    }
    
    return compoundRules;
  }

  async getCompoundRule(id: string): Promise<CompoundRule | undefined> {
    const [rule] = await db.select().from(tradingRules).where(eq(tradingRules.id, id));
    if (!rule) return undefined;
    
    const groups = await db
      .select()
      .from(ruleConditionGroups)
      .where(eq(ruleConditionGroups.ruleId, id))
      .orderBy(ruleConditionGroups.groupOrder);
    
    const groupsWithConditions = await Promise.all(
      groups.map(async (group) => {
        const conditions = await db
          .select()
          .from(ruleConditions)
          .where(eq(ruleConditions.groupId, group.id));
        
        return { ...group, conditions };
      })
    );
    
    const actions = await db
      .select()
      .from(ruleActions)
      .where(eq(ruleActions.ruleId, id))
      .orderBy(ruleActions.actionOrder);
    
    return {
      ...rule,
      groups: groupsWithConditions,
      actions
    };
  }

  async createCompoundRule(ruleData: InsertCompoundRule): Promise<CompoundRule> {
    // Use a transaction to create all related records
    const result = await db.transaction(async (tx) => {
      // Create the rule header
      const [rule] = await tx.insert(tradingRules).values({
        name: ruleData.name,
        enabled: ruleData.enabled,
        scope: ruleData.scope,
        ticker: ruleData.ticker,
        priority: ruleData.priority,
      }).returning();
      
      // Create condition groups and their conditions
      const groupsWithConditions: (RuleConditionGroup & { conditions: RuleCondition[] })[] = [];
      for (const groupData of ruleData.groups) {
        const [group] = await tx.insert(ruleConditionGroups).values({
          ruleId: rule.id,
          groupOrder: groupData.groupOrder,
          junctionOperator: groupData.junctionOperator,
          description: groupData.description,
        }).returning();
        
        const conditions: RuleCondition[] = [];
        for (const conditionData of groupData.conditions) {
          const [condition] = await tx.insert(ruleConditions).values({
            groupId: group.id,
            metric: conditionData.metric,
            comparator: conditionData.comparator,
            threshold: conditionData.threshold,
            timeframeValue: conditionData.timeframeValue,
            timeframeUnit: conditionData.timeframeUnit,
            metadata: conditionData.metadata,
          }).returning();
          
          conditions.push(condition);
        }
        
        groupsWithConditions.push({ ...group, conditions });
      }
      
      // Create actions
      const actions: RuleAction[] = [];
      for (const actionData of ruleData.actions) {
        const [action] = await tx.insert(ruleActions).values({
          ruleId: rule.id,
          actionOrder: actionData.actionOrder,
          actionType: actionData.actionType,
          quantity: actionData.quantity,
          percentage: actionData.percentage,
          allowRepeat: actionData.allowRepeat,
          cooldownMinutes: actionData.cooldownMinutes,
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

  async updateCompoundRule(id: string, ruleData: Partial<InsertCompoundRule>): Promise<CompoundRule | undefined> {
    const existing = await this.getCompoundRule(id);
    if (!existing) return undefined;
    
    // Use a transaction to update all related records
    const result = await db.transaction(async (tx) => {
      // Update rule header
      const [rule] = await tx
        .update(tradingRules)
        .set({
          name: ruleData.name ?? existing.name,
          enabled: ruleData.enabled ?? existing.enabled,
          scope: ruleData.scope ?? existing.scope,
          ticker: ruleData.ticker ?? existing.ticker,
          priority: ruleData.priority ?? existing.priority,
          updatedAt: sql`now()`,
        })
        .where(eq(tradingRules.id, id))
        .returning();
      
      // If groups or actions are provided, delete old ones and create new ones
      if (ruleData.groups) {
        // Delete old groups (cascade will delete conditions)
        await tx.delete(ruleConditionGroups).where(eq(ruleConditionGroups.ruleId, id));
        
        // Create new groups and conditions
        const groupsWithConditions: (RuleConditionGroup & { conditions: RuleCondition[] })[] = [];
        for (const groupData of ruleData.groups) {
          const [group] = await tx.insert(ruleConditionGroups).values({
            ruleId: id,
            groupOrder: groupData.groupOrder,
            junctionOperator: groupData.junctionOperator,
            description: groupData.description,
          }).returning();
          
          const conditions: RuleCondition[] = [];
          for (const conditionData of groupData.conditions) {
            const [condition] = await tx.insert(ruleConditions).values({
              groupId: group.id,
              metric: conditionData.metric,
              comparator: conditionData.comparator,
              threshold: conditionData.threshold,
              timeframeValue: conditionData.timeframeValue,
              timeframeUnit: conditionData.timeframeUnit,
              metadata: conditionData.metadata,
            }).returning();
            
            conditions.push(condition);
          }
          
          groupsWithConditions.push({ ...group, conditions });
        }
      }
      
      if (ruleData.actions) {
        // Delete old actions
        await tx.delete(ruleActions).where(eq(ruleActions.ruleId, id));
        
        // Create new actions
        for (const actionData of ruleData.actions) {
          await tx.insert(ruleActions).values({
            ruleId: id,
            actionOrder: actionData.actionOrder,
            actionType: actionData.actionType,
            quantity: actionData.quantity,
            percentage: actionData.percentage,
            allowRepeat: actionData.allowRepeat,
            cooldownMinutes: actionData.cooldownMinutes,
          });
        }
      }
      
      return rule;
    });
    
    // Fetch the complete updated rule
    return await this.getCompoundRule(id);
  }

  async deleteCompoundRule(id: string): Promise<boolean> {
    // Cascade delete will handle groups, conditions, and actions
    const result = await db.delete(tradingRules).where(eq(tradingRules.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Rule Executions (audit log)
  async getRuleExecutions(ruleId?: string, ticker?: string): Promise<RuleExecution[]> {
    let query = db.select().from(ruleExecutions).orderBy(desc(ruleExecutions.triggeredAt));
    
    if (ruleId && ticker) {
      return await query.where(and(eq(ruleExecutions.ruleId, ruleId), eq(ruleExecutions.ticker, ticker)));
    } else if (ruleId) {
      return await query.where(eq(ruleExecutions.ruleId, ruleId));
    } else if (ticker) {
      return await query.where(eq(ruleExecutions.ticker, ticker));
    }
    
    return await query;
  }

  async createRuleExecution(execution: InsertRuleExecution): Promise<RuleExecution> {
    const [newExecution] = await db.insert(ruleExecutions).values(execution).returning();
    return newExecution;
  }

  // Backtests
  async getBacktests(): Promise<Backtest[]> {
    return await db.select().from(backtests).orderBy(desc(backtests.createdAt));
  }

  async getBacktest(id: string): Promise<Backtest | undefined> {
    const [backtest] = await db.select().from(backtests).where(eq(backtests.id, id));
    return backtest;
  }

  async createBacktest(backtest: InsertBacktest): Promise<Backtest> {
    const [newBacktest] = await db.insert(backtests).values(backtest).returning();
    return newBacktest;
  }

  // Telegram Configuration
  async getTelegramConfig(): Promise<TelegramConfig | undefined> {
    const [config] = await db.select().from(telegramConfig).limit(1);
    return config;
  }

  async createOrUpdateTelegramConfig(config: InsertTelegramConfig): Promise<TelegramConfig> {
    const existing = await this.getTelegramConfig();
    
    if (existing) {
      const [updated] = await db
        .update(telegramConfig)
        .set({ ...config, lastSync: sql`now()` })
        .where(eq(telegramConfig.id, existing.id))
        .returning();
      return updated;
    } else {
      const [newConfig] = await db.insert(telegramConfig).values(config).returning();
      return newConfig;
    }
  }

  async updateTelegramSyncStatus(lastMessageId: number): Promise<void> {
    const existing = await this.getTelegramConfig();
    if (existing) {
      await db
        .update(telegramConfig)
        .set({ lastSync: sql`now()`, lastMessageId })
        .where(eq(telegramConfig.id, existing.id));
    }
  }

  async updateTelegramSession(sessionString: string): Promise<void> {
    const existing = await this.getTelegramConfig();
    if (existing) {
      await db
        .update(telegramConfig)
        .set({ sessionString })
        .where(eq(telegramConfig.id, existing.id));
    }
  }

  // IBKR Configuration
  async getIbkrConfig(): Promise<IbkrConfig | undefined> {
    const [config] = await db.select().from(ibkrConfig).limit(1);
    return config;
  }

  async createOrUpdateIbkrConfig(config: Partial<InsertIbkrConfig>): Promise<IbkrConfig> {
    const existing = await this.getIbkrConfig();
    
    if (existing) {
      const [updated] = await db
        .update(ibkrConfig)
        .set(config)
        .where(eq(ibkrConfig.id, existing.id))
        .returning();
      return updated;
    } else {
      const [newConfig] = await db.insert(ibkrConfig).values({
        gatewayUrl: config.gatewayUrl || 'https://localhost:5000',
        isPaperTrading: config.isPaperTrading !== undefined ? config.isPaperTrading : true,
      }).returning();
      return newConfig;
    }
  }

  async updateIbkrConnectionStatus(isConnected: boolean, accountId?: string, error?: string): Promise<void> {
    const existing = await this.getIbkrConfig();
    if (existing) {
      await db
        .update(ibkrConfig)
        .set({ 
          isConnected, 
          lastConnectionCheck: sql`now()`,
          ...(accountId && { accountId }),
          ...(error !== undefined && { lastError: error })
        })
        .where(eq(ibkrConfig.id, existing.id));
    }
  }

  // OpenInsider Configuration
  async getOpeninsiderConfig(): Promise<OpeninsiderConfig | undefined> {
    const [config] = await db.select().from(openinsiderConfig).limit(1);
    return config;
  }

  async createOrUpdateOpeninsiderConfig(config: Partial<InsertOpeninsiderConfig>): Promise<OpeninsiderConfig> {
    const existing = await this.getOpeninsiderConfig();
    
    if (existing) {
      const [updated] = await db
        .update(openinsiderConfig)
        .set(config)
        .where(eq(openinsiderConfig.id, existing.id))
        .returning();
      return updated;
    } else {
      const [newConfig] = await db.insert(openinsiderConfig).values({
        enabled: config.enabled !== undefined ? config.enabled : false,
        fetchLimit: config.fetchLimit || 50,
      }).returning();
      return newConfig;
    }
  }

  async updateOpeninsiderSyncStatus(error?: string): Promise<void> {
    const existing = await this.getOpeninsiderConfig();
    if (existing) {
      await db
        .update(openinsiderConfig)
        .set({ 
          lastSync: sql`now()`,
          ...(error !== undefined && { lastError: error })
        })
        .where(eq(openinsiderConfig.id, existing.id));
    }
  }

  // What-If Backtest Jobs
  async getBacktestJobs(userId: string): Promise<BacktestJob[]> {
    return await db.select().from(backtestJobs).where(eq(backtestJobs.userId, userId)).orderBy(desc(backtestJobs.createdAt));
  }

  async getBacktestJob(id: string): Promise<BacktestJob | undefined> {
    const [job] = await db.select().from(backtestJobs).where(eq(backtestJobs.id, id));
    return job;
  }

  async createBacktestJob(job: InsertBacktestJob): Promise<BacktestJob> {
    const [newJob] = await db.insert(backtestJobs).values(job).returning();
    return newJob;
  }

  async updateBacktestJob(id: string, updates: Partial<BacktestJob>): Promise<BacktestJob | undefined> {
    const [updated] = await db
      .update(backtestJobs)
      .set(updates)
      .where(eq(backtestJobs.id, id))
      .returning();
    return updated;
  }

  async deleteBacktestJob(id: string): Promise<boolean> {
    // Delete related price data and scenarios first
    await db.delete(backtestPriceData).where(eq(backtestPriceData.jobId, id));
    await db.delete(backtestScenarios).where(eq(backtestScenarios.jobId, id));
    
    // Delete the job itself
    const result = await db.delete(backtestJobs).where(eq(backtestJobs.id, id));
    return true;
  }

  // Backtest Price Data
  async getBacktestPriceData(jobId: string): Promise<BacktestPriceData[]> {
    const allData = await db.select().from(backtestPriceData).where(eq(backtestPriceData.jobId, jobId));
    
    const uniqueByTicker = new Map<string, BacktestPriceData>();
    allData.forEach(data => {
      if (!uniqueByTicker.has(data.ticker) || 
          (data.createdAt && uniqueByTicker.get(data.ticker)!.createdAt && 
           data.createdAt > uniqueByTicker.get(data.ticker)!.createdAt!)) {
        uniqueByTicker.set(data.ticker, data);
      }
    });
    
    return Array.from(uniqueByTicker.values());
  }

  async getCachedPriceData(ticker: string, insiderBuyDate: string): Promise<BacktestPriceData | undefined> {
    const results = await db.select().from(backtestPriceData).where(
      and(
        eq(backtestPriceData.ticker, ticker),
        eq(backtestPriceData.insiderBuyDate, insiderBuyDate)
      )
    ).limit(1);
    return results[0];
  }

  async createBacktestPriceData(data: InsertBacktestPriceData): Promise<BacktestPriceData> {
    const [newData] = await db.insert(backtestPriceData).values(data).returning();
    return newData;
  }

  // Backtest Scenarios (returns only top 10 sorted by P&L)
  async getBacktestScenarios(jobId: string): Promise<BacktestScenario[]> {
    return await db.select()
      .from(backtestScenarios)
      .where(eq(backtestScenarios.jobId, jobId))
      .orderBy(desc(backtestScenarios.totalProfitLoss))
      .limit(10);
  }

  async createBacktestScenario(scenario: InsertBacktestScenario): Promise<BacktestScenario> {
    const [newScenario] = await db.insert(backtestScenarios).values(scenario).returning();
    return newScenario;
  }

  // Users
  async getUsers(options?: { includeArchived?: boolean }): Promise<User[]> {
    if (options?.includeArchived) {
      return await db.select().from(users);
    }
    return await db.select().from(users).where(eq(users.archived, false));
  }

  async getAllUserIds(): Promise<string[]> {
    const result = await db.select({ id: users.id }).from(users).where(eq(users.archived, false));
    return result.map(r => r.id);
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async markUserInitialDataFetched(userId: string): Promise<void> {
    await db
      .update(users)
      .set({ initialDataFetched: true })
      .where(eq(users.id, userId));
  }

  async markUserHasSeenOnboarding(userId: string): Promise<void> {
    await db
      .update(users)
      .set({ hasSeenOnboarding: true })
      .where(eq(users.id, userId));
  }

  async completeUserOnboarding(userId: string): Promise<void> {
    await db
      .update(users)
      .set({ 
        onboardingCompletedAt: new Date(),
        hasSeenOnboarding: true
      })
      .where(eq(users.id, userId));
  }

  async getUserProgress(userId: string): Promise<{ onboardingCompletedAt: Date | null; tutorialCompletions: Record<string, boolean> }> {
    const [user] = await db
      .select({
        onboardingCompletedAt: users.onboardingCompletedAt,
        tutorialCompletions: users.tutorialCompletions,
      })
      .from(users)
      .where(eq(users.id, userId));
    
    if (!user) {
      return { onboardingCompletedAt: null, tutorialCompletions: {} };
    }

    return {
      onboardingCompletedAt: user.onboardingCompletedAt,
      tutorialCompletions: (user.tutorialCompletions as Record<string, boolean>) || {},
    };
  }

  async completeTutorial(userId: string, tutorialId: string): Promise<void> {
    const [user] = await db
      .select({ tutorialCompletions: users.tutorialCompletions })
      .from(users)
      .where(eq(users.id, userId));
    
    if (!user) return;

    const completions = (user.tutorialCompletions as Record<string, boolean>) || {};
    completions[tutorialId] = true;

    await db
      .update(users)
      .set({ tutorialCompletions: completions })
      .where(eq(users.id, userId));
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async archiveUser(userId: string, archivedBy: string): Promise<User | undefined> {
    const [archivedUser] = await db
      .update(users)
      .set({
        archived: true,
        archivedAt: new Date(),
        archivedBy,
      })
      .where(eq(users.id, userId))
      .returning();
    return archivedUser;
  }

  async unarchiveUser(userId: string): Promise<User | undefined> {
    const [unarchivedUser] = await db
      .update(users)
      .set({
        archived: false,
        archivedAt: null,
        archivedBy: null,
      })
      .where(eq(users.id, userId))
      .returning();
    return unarchivedUser;
  }

  async updateUserSubscriptionStatus(userId: string, status: string, endDate?: Date): Promise<User | undefined> {
    const updates: Partial<User> = { subscriptionStatus: status };
    if (endDate) {
      updates.subscriptionEndDate = endDate;
    }
    const [updatedUser] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, userId))
      .returning();
    return updatedUser;
  }

  // Payments
  async getUserPayments(userId: string): Promise<Payment[]> {
    return await db
      .select()
      .from(payments)
      .where(eq(payments.userId, userId))
      .orderBy(desc(payments.paymentDate));
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const [newPayment] = await db.insert(payments).values(payment).returning();
    return newPayment;
  }

  async getPaymentStats(userId: string): Promise<{
    totalPaid: string;
    lastPaymentDate: Date | null;
    lastPaymentAmount: string | null;
    paymentCount: number;
  }> {
    const [stats] = await db
      .select({
        totalPaid: sql<string>`COALESCE(SUM(${payments.amount}), 0)::text`,
        lastPaymentDate: sql<Date | null>`MAX(${payments.paymentDate})`,
        lastPaymentAmount: sql<string | null>`(
          SELECT ${payments.amount}::text 
          FROM ${payments} 
          WHERE ${payments.userId} = ${userId} 
          ORDER BY ${payments.paymentDate} DESC 
          LIMIT 1
        )`,
        paymentCount: sql<number>`COUNT(*)::int`,
      })
      .from(payments)
      .where(eq(payments.userId, userId));

    return stats || {
      totalPaid: "0",
      lastPaymentDate: null,
      lastPaymentAmount: null,
      paymentCount: 0,
    };
  }

  // Manual Overrides
  async createManualOverride(override: InsertManualOverride): Promise<ManualOverride> {
    const [newOverride] = await db.insert(manualOverrides).values(override).returning();
    return newOverride;
  }

  async getUserManualOverrides(userId: string): Promise<ManualOverride[]> {
    return await db
      .select()
      .from(manualOverrides)
      .where(eq(manualOverrides.userId, userId))
      .orderBy(desc(manualOverrides.createdAt));
  }

  async getActiveManualOverride(userId: string): Promise<ManualOverride | undefined> {
    const now = new Date();
    const [override] = await db
      .select()
      .from(manualOverrides)
      .where(
        and(
          eq(manualOverrides.userId, userId),
          sql`${manualOverrides.startDate} <= ${now}`,
          sql`${manualOverrides.endDate} > ${now}`
        )
      )
      .orderBy(desc(manualOverrides.endDate))
      .limit(1);
    return override;
  }

  // Password Reset
  async createPasswordResetToken(token: InsertPasswordResetToken): Promise<PasswordResetToken> {
    const [newToken] = await db.insert(passwordResetTokens).values(token).returning();
    return newToken;
  }

  async getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
    const [resetToken] = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token));
    return resetToken;
  }

  async markPasswordResetTokenUsed(tokenId: string): Promise<boolean> {
    const result = await db
      .update(passwordResetTokens)
      .set({ used: true })
      .where(eq(passwordResetTokens.id, tokenId));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async purgeExpiredPasswordResetTokens(): Promise<number> {
    const now = new Date();
    const result = await db
      .delete(passwordResetTokens)
      .where(
        sql`${passwordResetTokens.expiresAt} < ${now} OR ${passwordResetTokens.used} = true`
      );
    return result.rowCount || 0;
  }

  // Stock Comments
  async getStockComments(ticker: string): Promise<StockCommentWithUser[]> {
    const comments = await db
      .select({
        comment: stockComments,
        user: users,
      })
      .from(stockComments)
      .leftJoin(users, eq(stockComments.userId, users.id))
      .where(eq(stockComments.ticker, ticker))
      .orderBy(desc(stockComments.createdAt));

    return comments.map((row) => ({
      ...row.comment,
      user: row.user!,
    }));
  }

  async createStockComment(comment: InsertStockComment): Promise<StockComment> {
    const [newComment] = await db.insert(stockComments).values(comment).returning();
    return newComment;
  }

  async getStockCommentCounts(): Promise<{ ticker: string; count: number }[]> {
    const counts = await db
      .select({
        ticker: stockComments.ticker,
        count: sql<number>`count(*)::int`,
      })
      .from(stockComments)
      .groupBy(stockComments.ticker);

    return counts;
  }

  // Followed Stocks
  async getUserFollowedStocks(userId: string): Promise<FollowedStock[]> {
    return await db
      .select()
      .from(followedStocks)
      .where(eq(followedStocks.userId, userId))
      .orderBy(desc(followedStocks.followedAt));
  }

  async followStock(follow: InsertFollowedStock): Promise<FollowedStock> {
    const [newFollow] = await db.insert(followedStocks).values(follow).returning();
    
    // Emit event for WebSocket cache invalidation
    eventDispatcher.emit("FOLLOWED_STOCK_UPDATED", {
      type: "FOLLOWED_STOCK_UPDATED",
      userId: follow.userId,
      ticker: follow.ticker,
      data: { action: "follow" }
    });
    
    return newFollow;
  }

  async unfollowStock(ticker: string, userId: string): Promise<boolean> {
    await db
      .delete(followedStocks)
      .where(
        and(
          eq(followedStocks.ticker, ticker),
          eq(followedStocks.userId, userId)
        )
      );
    
    // Emit event for WebSocket cache invalidation
    eventDispatcher.emit("FOLLOWED_STOCK_UPDATED", {
      type: "FOLLOWED_STOCK_UPDATED",
      userId,
      ticker,
      data: { action: "unfollow" }
    });
    
    return true;
  }

  async toggleStockPosition(ticker: string, userId: string, hasEnteredPosition: boolean, entryPrice?: number): Promise<boolean> {
    // When entering position, save the entry price; when exiting, clear it
    const updateData: { hasEnteredPosition: boolean; entryPrice?: string | null } = {
      hasEnteredPosition,
    };
    
    if (hasEnteredPosition && entryPrice !== undefined) {
      updateData.entryPrice = entryPrice.toString();
    } else if (!hasEnteredPosition) {
      updateData.entryPrice = null; // Clear entry price when exiting position
    }
    
    const result = await db
      .update(followedStocks)
      .set(updateData)
      .where(
        and(
          eq(followedStocks.ticker, ticker),
          eq(followedStocks.userId, userId)
        )
      )
      .returning();
    
    if (result.length === 0) {
      throw new Error("Stock is not being followed");
    }
    
    // Emit event for WebSocket cache invalidation
    eventDispatcher.emit("FOLLOWED_STOCK_UPDATED", {
      type: "FOLLOWED_STOCK_UPDATED",
      userId,
      ticker,
      data: { action: "position_toggle", hasEnteredPosition, entryPrice: updateData.entryPrice }
    });
    
    return true;
  }

  // Cross-user aggregation for "popular stock" notifications
  async getFollowerCountForTicker(ticker: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(followedStocks)
      .where(eq(followedStocks.ticker, ticker));
    return result[0]?.count || 0;
  }

  async getFollowerUserIdsForTicker(ticker: string): Promise<string[]> {
    const result = await db
      .select({ userId: followedStocks.userId })
      .from(followedStocks)
      .where(eq(followedStocks.ticker, ticker));
    return result.map(r => r.userId);
  }

  async getFollowedStocksWithPrices(userId: string): Promise<Array<FollowedStock & { currentPrice: string; priceChange: string; priceChangePercent: string }>> {
    const followedStocksList = await this.getUserFollowedStocks(userId);
    
    const results: Array<FollowedStock & { currentPrice: string; priceChange: string; priceChangePercent: string }> = [];
    
    for (const followed of followedStocksList) {
      const stockData = await db
        .select()
        .from(stocks)
        .where(eq(stocks.ticker, followed.ticker))
        .orderBy(desc(stocks.lastUpdated))
        .limit(1);
      
      if (stockData.length > 0) {
        const stock = stockData[0];
        const currentPrice = parseFloat(stock.currentPrice);
        const previousPrice = stock.previousClose ? parseFloat(stock.previousClose) : currentPrice;
        const priceChange = currentPrice - previousPrice;
        const priceChangePercent = previousPrice !== 0 ? (priceChange / previousPrice) * 100 : 0;
        
        results.push({
          ...followed,
          currentPrice: stock.currentPrice,
          priceChange: priceChange.toFixed(2),
          priceChangePercent: priceChangePercent.toFixed(2),
        });
      } else {
        // Include followed stocks even if no stock data exists yet
        results.push({
          ...followed,
          currentPrice: "0.00",
          priceChange: "0.00",
          priceChangePercent: "0.00",
        });
      }
    }
    
    return results;
  }

  async getFollowedStocksWithStatus(userId: string): Promise<Array<FollowedStock & { 
    currentPrice: string; 
    priceChange: string; 
    priceChangePercent: string;
    jobStatus?: 'pending' | 'processing' | 'completed' | 'failed' | null;
    insiderAction?: 'BUY' | 'SELL' | null;
    aiStance?: 'BUY' | 'SELL' | 'HOLD' | null;
    aiScore?: number | null;
    integratedScore?: number | null;
    stanceAlignment?: 'act' | 'hold' | null;
  }>> {
    const followedWithPrices = await this.getFollowedStocksWithPrices(userId);
    
    const results: Array<FollowedStock & { 
      currentPrice: string; 
      priceChange: string; 
      priceChangePercent: string;
      jobStatus?: 'pending' | 'processing' | 'completed' | 'failed' | null;
      insiderAction?: 'BUY' | 'SELL' | null;
      aiStance?: 'BUY' | 'SELL' | 'HOLD' | null;
      aiScore?: number | null;
      integratedScore?: number | null;
      stanceAlignment?: 'act' | 'hold' | null;
    }> = [];
    
    for (const followed of followedWithPrices) {
      // Get stock data for insider action (recommendation)
      const stockData = await db
        .select()
        .from(stocks)
        .where(eq(stocks.ticker, followed.ticker))
        .orderBy(desc(stocks.lastUpdated))
        .limit(1);
      
      const stock = stockData[0];
      const insiderAction = stock?.recommendation?.toUpperCase() as 'BUY' | 'SELL' | null || null;
      
      // Get latest analysis job status
      const jobs = await db
        .select()
        .from(aiAnalysisJobs)
        .where(eq(aiAnalysisJobs.ticker, followed.ticker))
        .orderBy(desc(aiAnalysisJobs.createdAt))
        .limit(1);
      
      const latestJob = jobs[0];
      const jobStatus = latestJob?.status as 'pending' | 'processing' | 'completed' | 'failed' | null || null;
      
      // Get latest daily brief for AI stance and score
      const briefs = await db
        .select()
        .from(dailyBriefs)
        .where(eq(dailyBriefs.ticker, followed.ticker))
        .orderBy(desc(dailyBriefs.briefDate))
        .limit(1);
      
      const latestBrief = briefs[0];
      
      // Helper to normalize stance values (handles legacy "enter"/"wait" and current "buy"/"sell"/"hold")
      const normalizeStance = (rawStance: string | null | undefined): 'buy' | 'sell' | 'hold' | null => {
        if (!rawStance) return null;
        const stance = rawStance.toLowerCase().trim();
        
        // Legacy mapping: "enter" → "buy" (for BUY opportunities) or could be "sell" (for SELL opportunities)
        // But since we don't know opportunity type here, treat "enter" as an action signal
        // Legacy mapping: "wait" → "hold"
        if (stance === 'enter') return 'buy'; // Legacy entry signal (assume BUY for simplicity)
        if (stance === 'wait') return 'hold'; // Legacy wait signal
        
        // Current values
        if (stance === 'buy' || stance === 'sell' || stance === 'hold') return stance;
        
        // Unknown value - default to hold for safety
        console.warn(`[Storage] Unknown stance value: "${rawStance}", defaulting to "hold"`);
        return 'hold';
      };
      
      const watchingStance = normalizeStance(latestBrief?.watchingStance);
      const owningStance = normalizeStance(latestBrief?.owningStance);
      const aiScore = latestBrief?.watchingConfidence ?? null;
      
      // Get integrated score from stock analysis (comprehensive micro + macro score)
      const analyses = await db
        .select()
        .from(stockAnalyses)
        .where(eq(stockAnalyses.ticker, followed.ticker))
        .limit(1);
      
      const analysis = analyses[0];
      const integratedScore = analysis?.integratedScore ?? null;
      
      // Calculate stance alignment using NEW dual-scenario logic
      // "act" = Either scenario recommends action (BUY/SELL for entry, BUY/SELL for exit)
      // "hold" = Both scenarios recommend hold/wait
      // 
      // Stance values from daily brief (after normalization):
      // - Watching BUY opportunity: "buy" (enter long) or "hold" (wait)
      // - Watching SELL opportunity: "sell" (enter short) or "hold" (wait)
      // - Owning long position: "sell" (exit) or "hold" (keep)
      // - Owning short position: "buy" (cover) or "hold" (keep)
      //
      // Examples:
      // - Watching "buy" + Owning "hold" = "act" (entry opportunity)
      // - Watching "hold" + Owning "sell" = "act" (exit signal)
      // - Watching "hold" + Owning "hold" = "hold" (no action)
      // - Watching "sell" + Owning "hold" = "act" (short entry opportunity)
      let stanceAlignment: 'act' | 'hold' | null = null;
      if (watchingStance || owningStance) {
        // ACT when either scenario recommends buy OR sell action
        if (watchingStance === 'buy' || watchingStance === 'sell' || owningStance === 'buy' || owningStance === 'sell') {
          stanceAlignment = 'act';
        } else {
          // HOLD when both scenarios recommend hold (or one is null and other is hold)
          stanceAlignment = 'hold';
        }
      }
      
      // Derive aiStance based on position status (use position-aware recommendation)
      // - If in position: use OWNING scenario's recommendation (exit/hold strategy)
      // - If watching: use WATCHING scenario's recommendation (entry/wait strategy)
      // Map to uppercase stance for display compatibility
      let aiStance: 'BUY' | 'SELL' | 'HOLD' = 'HOLD'; // Default to HOLD for safety
      
      const relevantStance = followed.hasEnteredPosition ? owningStance : watchingStance;
      if (relevantStance === 'buy') {
        aiStance = 'BUY';
      } else if (relevantStance === 'sell') {
        aiStance = 'SELL';
      } else if (relevantStance === 'hold') {
        aiStance = 'HOLD';
      }
      // Note: If relevantStance is null, aiStance defaults to 'HOLD' (safe fallback)
      
      // Push result with computed stanceAlignment
      results.push({
        ...followed,
        jobStatus,
        insiderAction,
        aiStance,
        aiScore,
        integratedScore,
        stanceAlignment,
      });
    }
    
    return results;
  }

  async getDailyBriefsForTicker(ticker: string): Promise<DailyBrief[]> {
    // Limit to last 7 days to keep response lightweight
    return await db
      .select()
      .from(dailyBriefs)
      .where(eq(dailyBriefs.ticker, ticker))
      .orderBy(desc(dailyBriefs.briefDate))
      .limit(7);
  }

  async getDailyBriefForUser(userId: string, ticker: string, briefDate: string): Promise<DailyBrief | undefined> {
    const [brief] = await db
      .select()
      .from(dailyBriefs)
      .where(
        and(
          eq(dailyBriefs.userId, userId),
          eq(dailyBriefs.ticker, ticker),
          eq(dailyBriefs.briefDate, briefDate)
        )
      )
      .limit(1);
    return brief;
  }

  async createDailyBrief(brief: InsertDailyBrief): Promise<DailyBrief> {
    // Check if brief already exists for this user+ticker+date
    const [existing] = await db
      .select()
      .from(dailyBriefs)
      .where(
        and(
          eq(dailyBriefs.userId, brief.userId),
          eq(dailyBriefs.ticker, brief.ticker),
          eq(dailyBriefs.briefDate, brief.briefDate)
        )
      )
      .limit(1);

    if (existing) {
      // Update existing brief
      const [updated] = await db
        .update(dailyBriefs)
        .set(brief)
        .where(eq(dailyBriefs.id, existing.id))
        .returning();
      return updated;
    }

    // Create new brief
    const [created] = await db
      .insert(dailyBriefs)
      .values(brief)
      .returning();
    return created;
  }

  async getUserStockStatus(userId: string, ticker: string): Promise<UserStockStatus | undefined> {
    const [status] = await db
      .select()
      .from(userStockStatuses)
      .where(
        and(
          eq(userStockStatuses.userId, userId),
          eq(userStockStatuses.ticker, ticker)
        )
      );
    return status;
  }

  async getUserStockStatuses(userId: string, status?: string): Promise<UserStockStatus[]> {
    if (status) {
      return await db
        .select()
        .from(userStockStatuses)
        .where(
          and(
            eq(userStockStatuses.userId, userId),
            eq(userStockStatuses.status, status)
          )
        );
    }
    return await db
      .select()
      .from(userStockStatuses)
      .where(eq(userStockStatuses.userId, userId));
  }

  async getStocksWithUserStatus(userId: string, limit: number = 100): Promise<any[]> {
    try {
      console.log(`[Storage] getStocksWithUserStatus called for userId: ${userId}, limit: ${limit}`);
      
      // Calculate 2 weeks ago date
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      const twoWeeksAgoString = twoWeeksAgo.toISOString().split('T')[0]; // Format as YYYY-MM-DD
      
      // Get all stocks with user statuses, filtered by:
      // 1. CRITICAL: Stocks must belong to this user (userId)
      // 2. Global stock status must be 'pending' (not rejected at stock level)
      // 3. Within last 2 weeks (insiderTradeDate >= 2 weeks ago), OR followed by user
      // 4. User status filtering happens in frontend (excluded rejected/dismissed)
      // Note: insiderTradeDate is stored as text (YYYY-MM-DD), so compare with string
      const results = await db
        .select({
          stock: stocks,
          userStatus: userStockStatuses.status,
          userApprovedAt: userStockStatuses.approvedAt,
          userRejectedAt: userStockStatuses.rejectedAt,
          userDismissedAt: userStockStatuses.dismissedAt,
          isFollowing: followedStocks.ticker,
        })
        .from(stocks)
        .leftJoin(
          userStockStatuses,
          and(
            eq(stocks.ticker, userStockStatuses.ticker),
            eq(userStockStatuses.userId, userId)
          )
        )
        .leftJoin(
          followedStocks,
          and(
            eq(stocks.ticker, followedStocks.ticker),
            eq(followedStocks.userId, userId)
          )
        )
        .where(
          and(
            eq(stocks.userId, userId), // CRITICAL: Filter by user
            eq(stocks.recommendationStatus, 'pending'),
            sql`(${stocks.insiderTradeDate} >= ${twoWeeksAgoString} OR ${followedStocks.ticker} IS NOT NULL)`
          )
        )
        .orderBy(desc(stocks.insiderTradeDate))
        .limit(limit);

      console.log(`[Storage] Query returned ${results.length} rows`);

      // Get latest AI jobs for all tickers
      const allJobs = await db
        .select()
        .from(aiAnalysisJobs)
        .where(
          and(
            inArray(aiAnalysisJobs.ticker, results.map(r => r.stock.ticker)),
            inArray(aiAnalysisJobs.status, ['pending', 'processing', 'failed'])
          )
        );

      console.log(`[Storage] Found ${allJobs.length} active AI jobs`);

      // Create a map of ticker -> latest job
      const jobsByTicker = new Map<string, typeof aiAnalysisJobs.$inferSelect>();
      for (const job of allJobs) {
        const existing = jobsByTicker.get(job.ticker);
        if (!existing || (job.createdAt && existing.createdAt && job.createdAt > existing.createdAt)) {
          jobsByTicker.set(job.ticker, job);
        }
      }

      // Transform results
      const transformed = results.map(row => {
        const latestJob = jobsByTicker.get(row.stock.ticker);
        const lastUpdated = row.stock.lastUpdated || new Date();
        
        return {
          ...row.stock,
          isStale: isStockStale(lastUpdated),
          ageDays: getStockAgeInDays(lastUpdated),
          userStatus: row.userStatus || "pending",
          userApprovedAt: row.userApprovedAt,
          userRejectedAt: row.userRejectedAt,
          userDismissedAt: row.userDismissedAt,
          analysisJob: latestJob ? {
            status: latestJob.status,
            currentStep: latestJob.currentStep,
            stepDetails: latestJob.stepDetails,
            lastError: latestJob.lastError,
            updatedAt: latestJob.createdAt,
          } : null,
        };
      });
      
      console.log(`[Storage] Transformed ${transformed.length} stocks`);
      console.log(`[Storage] Sample:`, transformed[0] ? {
        ticker: transformed[0].ticker,
        userStatus: transformed[0].userStatus,
        recommendationStatus: transformed[0].recommendationStatus
      } : 'no data');
      
      return transformed;
    } catch (error) {
      console.error('[Storage] getStocksWithUserStatus ERROR:', error);
      throw error;
    }
  }

  async createUserStockStatus(statusData: InsertUserStockStatus): Promise<UserStockStatus> {
    const [status] = await db
      .insert(userStockStatuses)
      .values(statusData)
      .onConflictDoUpdate({
        target: [userStockStatuses.userId, userStockStatuses.ticker],
        set: { 
          status: statusData.status,
          approvedAt: statusData.approvedAt || null,
          rejectedAt: statusData.rejectedAt || null,
          dismissedAt: statusData.dismissedAt || null,
          updatedAt: new Date()
        }
      })
      .returning();
    
    if (!status) {
      throw new Error(`Failed to create/update user stock status for ${statusData.ticker}`);
    }
    
    return status;
  }

  async updateUserStockStatus(userId: string, ticker: string, updates: Partial<UserStockStatus>): Promise<UserStockStatus | undefined> {
    const [updated] = await db
      .update(userStockStatuses)
      .set({ ...updates, updatedAt: new Date() })
      .where(
        and(
          eq(userStockStatuses.userId, userId),
          eq(userStockStatuses.ticker, ticker)
        )
      )
      .returning();
    
    // Emit event for WebSocket cache invalidation
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

  async ensureUserStockStatus(userId: string, ticker: string): Promise<UserStockStatus> {
    const existing = await this.getUserStockStatus(userId, ticker);
    if (existing) {
      return existing;
    }
    return await this.createUserStockStatus({ userId, ticker, status: "pending" });
  }

  async rejectTickerForUser(userId: string, ticker: string): Promise<{ userStatus: UserStockStatus; stocksUpdated: number }> {
    // Update ONLY user-specific stock status (not global stock status)
    // This allows the stock to remain visible to other users while hiding it for this user
    await this.ensureUserStockStatus(userId, ticker);
    const userStatus = await this.updateUserStockStatus(userId, ticker, {
      status: "rejected",
      rejectedAt: new Date(),
      approvedAt: null,
      dismissedAt: null,
    });

    // Count how many stock transactions exist for THIS USER's ticker (for logging)
    // CRITICAL: Filter by userId for accurate logging
    const stockCount = await db
      .select()
      .from(stocks)
      .where(and(
        eq(stocks.ticker, ticker),
        eq(stocks.userId, userId)
      ));

    console.log(`[RejectTicker] User ${userId} rejected ticker ${ticker} (${stockCount.length} user transactions)`);

    return {
      userStatus: userStatus!,
      stocksUpdated: stockCount.length,
    };
  }

  async markStockAsViewed(ticker: string, userId: string): Promise<StockView> {
    // Check if already viewed
    const existing = await db
      .select()
      .from(stockViews)
      .where(
        and(
          eq(stockViews.ticker, ticker),
          eq(stockViews.userId, userId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // Already viewed, just return it
      return existing[0];
    }

    // Create new view record
    const [view] = await db
      .insert(stockViews)
      .values({ ticker, userId })
      .returning();
    return view;
  }

  async getUserStockViews(userId: string): Promise<string[]> {
    const views = await db
      .select({ ticker: stockViews.ticker })
      .from(stockViews)
      .where(eq(stockViews.userId, userId));
    return views.map(v => v.ticker);
  }

  async hasCompletedTutorial(userId: string, tutorialId: string): Promise<boolean> {
    const result = await db
      .select()
      .from(userTutorials)
      .where(and(eq(userTutorials.userId, userId), eq(userTutorials.tutorialId, tutorialId)))
      .limit(1);
    return result.length > 0;
  }

  async markTutorialAsCompleted(userId: string, tutorialId: string): Promise<UserTutorial> {
    // Check if already completed
    const existing = await db
      .select()
      .from(userTutorials)
      .where(and(eq(userTutorials.userId, userId), eq(userTutorials.tutorialId, tutorialId)))
      .limit(1);
    
    if (existing.length > 0) {
      return existing[0];
    }

    const [tutorial] = await db
      .insert(userTutorials)
      .values({ userId, tutorialId })
      .returning();
    return tutorial;
  }

  async getUserTutorials(userId: string): Promise<UserTutorial[]> {
    return await db
      .select()
      .from(userTutorials)
      .where(eq(userTutorials.userId, userId));
  }

  async getStockAnalysis(ticker: string): Promise<StockAnalysis | undefined> {
    const [analysis] = await db
      .select()
      .from(stockAnalyses)
      .where(eq(stockAnalyses.ticker, ticker));
    return analysis;
  }

  async getAllStockAnalyses(): Promise<StockAnalysis[]> {
    return await db.select().from(stockAnalyses);
  }

  async saveStockAnalysis(analysis: InsertStockAnalysis): Promise<StockAnalysis> {
    // Delete existing analysis for this ticker if it exists
    await db.delete(stockAnalyses).where(eq(stockAnalyses.ticker, analysis.ticker));
    
    // Insert new analysis
    const [newAnalysis] = await db.insert(stockAnalyses).values(analysis).returning();
    return newAnalysis;
  }

  async updateStockAnalysis(ticker: string, updates: Partial<StockAnalysis>): Promise<void> {
    await db
      .update(stockAnalyses)
      .set(updates)
      .where(eq(stockAnalyses.ticker, ticker));
  }

  async updateStockAnalysisStatus(ticker: string, status: string, errorMessage?: string): Promise<void> {
    const updates: Partial<StockAnalysis> = { 
      status,
      errorMessage: errorMessage || null // Clear error message if not provided
    };
    await db
      .update(stockAnalyses)
      .set(updates)
      .where(eq(stockAnalyses.ticker, ticker));
  }

  // Stock Candlesticks Methods (shared OHLCV data - one record per ticker, reused across users)
  async getCandlesticksByTicker(ticker: string): Promise<StockCandlesticks | undefined> {
    const [candlesticks] = await db
      .select()
      .from(stockCandlesticks)
      .where(eq(stockCandlesticks.ticker, ticker));
    return candlesticks;
  }

  async upsertCandlesticks(
    ticker: string,
    candlestickData: { date: string; open: number; high: number; low: number; close: number; volume: number }[]
  ): Promise<StockCandlesticks> {
    // Check if candlestick data already exists for this ticker
    const existing = await this.getCandlesticksByTicker(ticker);
    
    if (existing) {
      // Update existing record
      const [updated] = await db
        .update(stockCandlesticks)
        .set({ 
          candlestickData, 
          lastUpdated: new Date() 
        })
        .where(eq(stockCandlesticks.ticker, ticker))
        .returning();
      return updated;
    } else {
      // Insert new record
      const [inserted] = await db
        .insert(stockCandlesticks)
        .values({ 
          ticker, 
          candlestickData, 
          lastUpdated: new Date() 
        })
        .returning();
      return inserted;
    }
  }

  async getAllTickersNeedingCandlestickData(): Promise<string[]> {
    // Get all unique tickers from stocks table that don't have candlestick data yet
    // or have stale data (older than 1 day)
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    // Get all unique tickers from stocks
    const allTickers = await db
      .selectDistinct({ ticker: stocks.ticker })
      .from(stocks);

    // Get tickers that have recent candlestick data
    const tickersWithRecentData = await db
      .select({ ticker: stockCandlesticks.ticker })
      .from(stockCandlesticks)
      .where(sql`${stockCandlesticks.lastUpdated} >= ${oneDayAgo}`);

    const recentTickerSet = new Set(tickersWithRecentData.map(t => t.ticker));
    
    // Return tickers that don't have recent data
    return allTickers
      .map(t => t.ticker)
      .filter(ticker => !recentTickerSet.has(ticker));
  }

  // AI Analysis Job Queue Methods
  async enqueueAnalysisJob(ticker: string, source: string, priority: string = "normal", force: boolean = false): Promise<AiAnalysisJob> {
    // If force=true (for re-analysis), cancel any existing pending/processing jobs
    if (force) {
      await db
        .update(aiAnalysisJobs)
        .set({ status: "cancelled", completedAt: new Date() })
        .where(
          and(
            eq(aiAnalysisJobs.ticker, ticker),
            sql`${aiAnalysisJobs.status} IN ('pending', 'processing')`
          )
        );
      console.log(`[Queue] Cancelled existing jobs for ${ticker} (force re-analysis)`);
    } else {
      // Check if there's already a pending or processing job for this ticker
      const [existingJob] = await db
        .select()
        .from(aiAnalysisJobs)
        .where(
          and(
            eq(aiAnalysisJobs.ticker, ticker),
            sql`${aiAnalysisJobs.status} IN ('pending', 'processing')`
          )
        )
        .limit(1);

      if (existingJob) {
        console.log(`[Queue] Job already exists for ${ticker} with status ${existingJob.status}`);
        return existingJob;
      }
    }

    // Create new job (race condition protected by unique index)
    try {
      const [job] = await db
        .insert(aiAnalysisJobs)
        .values({
          ticker,
          source,
          priority,
          status: "pending",
          retryCount: 0,
          maxRetries: 3,
          scheduledAt: new Date(),
        })
        .returning();

      // Create or update analysis record with "analyzing" status
      // This ensures the frontend can show the analyzing state immediately
      // But DON'T overwrite completed analysis with integrated scores
      const existingAnalysis = await this.getStockAnalysis(ticker);
      if (existingAnalysis) {
        // Only set to "analyzing" if not already completed with an integrated score
        if (existingAnalysis.status !== "completed" || !existingAnalysis.integratedScore) {
          await this.updateStockAnalysis(ticker, { status: "analyzing", errorMessage: null });
        }
      } else {
        await db.insert(stockAnalyses).values({
          ticker,
          status: "analyzing",
        });
      }

      console.log(`[Queue] Enqueued analysis job for ${ticker} (priority: ${priority}, source: ${source})`);
      return job;
    } catch (error: any) {
      // Handle race condition: unique constraint violation means another job was created simultaneously
      if (error.code === '23505' || error.message?.includes('unique')) {
        console.log(`[Queue] Race condition detected for ${ticker}, fetching existing job`);
        const [existingJob] = await db
          .select()
          .from(aiAnalysisJobs)
          .where(
            and(
              eq(aiAnalysisJobs.ticker, ticker),
              sql`${aiAnalysisJobs.status} IN ('pending', 'processing')`
            )
          )
          .limit(1);
        
        if (existingJob) {
          return existingJob;
        }
      }
      // Re-throw unexpected errors
      throw error;
    }
  }

  async cancelAnalysisJobsForTicker(ticker: string): Promise<void> {
    // Cancel any pending or processing jobs for this ticker
    await db
      .update(aiAnalysisJobs)
      .set({ status: "cancelled", completedAt: new Date() })
      .where(
        and(
          eq(aiAnalysisJobs.ticker, ticker),
          sql`${aiAnalysisJobs.status} IN ('pending', 'processing')`
        )
      );
    console.log(`[Queue] Cancelled any active jobs for ${ticker}`);
  }

  async dequeueNextJob(): Promise<AiAnalysisJob | undefined> {
    // Use FOR UPDATE SKIP LOCKED to get next available job atomically
    // Priority order: high > normal > low, then oldest first
    const result = await db.execute(sql`
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

    // db.execute returns an object with rows property
    const jobs = result.rows as any[];
    return jobs.length > 0 ? jobs[0] as AiAnalysisJob : undefined;
  }

  async getJobById(jobId: string): Promise<AiAnalysisJob | undefined> {
    const [job] = await db
      .select()
      .from(aiAnalysisJobs)
      .where(eq(aiAnalysisJobs.id, jobId));
    return job;
  }

  async getJobsByTicker(ticker: string): Promise<AiAnalysisJob[]> {
    return await db
      .select()
      .from(aiAnalysisJobs)
      .where(eq(aiAnalysisJobs.ticker, ticker))
      .orderBy(desc(aiAnalysisJobs.createdAt));
  }

  async updateJobStatus(jobId: string, status: string, updates: Partial<AiAnalysisJob> = {}): Promise<void> {
    const updateData: Partial<AiAnalysisJob> = {
      status,
      ...updates,
    };

    // Set completion timestamp for completed/failed jobs
    if (status === "completed" || status === "failed") {
      updateData.completedAt = new Date();
    }

    await db
      .update(aiAnalysisJobs)
      .set(updateData)
      .where(eq(aiAnalysisJobs.id, jobId));

    console.log(`[Queue] Updated job ${jobId} to status: ${status}`);
  }

  async updateJobProgress(jobId: string, currentStep: string, stepDetails: any): Promise<void> {
    await db
      .update(aiAnalysisJobs)
      .set({
        currentStep,
        stepDetails,
        lastError: null, // Clear error on successful progress update
      })
      .where(eq(aiAnalysisJobs.id, jobId));
  }

  async resetStockAnalysisPhaseFlags(ticker: string): Promise<void> {
    // Reset ALL phase completion flags for ALL stocks with this ticker
    // This ensures fresh progress tracking when a new analysis starts
    const result = await db.execute(sql`
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

  async markStockAnalysisPhaseComplete(ticker: string, phase: 'micro' | 'macro' | 'combined'): Promise<void> {
    // Update ALL stocks with this ticker (handles multiple transactions per ticker)
    // Use advisory lock to prevent race conditions without subquery issues
    const fieldMap = {
      'micro': 'micro_analysis_completed',
      'macro': 'macro_analysis_completed',
      'combined': 'combined_analysis_completed',
    };

    const fieldName = fieldMap[phase];

    // Use advisory lock with PostgreSQL's hashtext() to prevent concurrent updates
    // This avoids subquery issues while preventing race conditions with unique hash per ticker
    const result = await db.execute(sql`
      WITH lock AS (SELECT pg_advisory_xact_lock(hashtext(${ticker})))
      UPDATE ${stocks}
      SET ${sql.raw(fieldName)} = true
      WHERE ticker = ${ticker}
    `);

    console.log(`[Storage] Marked ${phase} analysis complete for ${ticker} (updated ${result.rowCount || 0} rows)`);
  }

  async getStocksWithIncompleteAnalysis(): Promise<Stock[]> {
    // Get stocks where at least one analysis phase is incomplete AND there's no active job running
    const incompleteStocks = await db
      .select()
      .from(stocks)
      .where(
        and(
          eq(stocks.recommendationStatus, 'pending'),
          sql`(
            ${stocks.microAnalysisCompleted} = false
            OR ${stocks.macroAnalysisCompleted} = false
            OR ${stocks.combinedAnalysisCompleted} = false
          )`,
          sql`NOT EXISTS (
            SELECT 1 FROM ${aiAnalysisJobs}
            WHERE ${aiAnalysisJobs.ticker} = ${stocks.ticker}
            AND ${aiAnalysisJobs.status} IN ('pending', 'processing')
          )`
        )
      );

    return incompleteStocks;
  }

  async getQueueStats(): Promise<{ pending: number; processing: number; completed: number; failed: number }> {
    const stats = await db
      .select({
        status: aiAnalysisJobs.status,
        count: sql<number>`count(*)::int`,
      })
      .from(aiAnalysisJobs)
      .groupBy(aiAnalysisJobs.status);

    const result = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
    };

    for (const stat of stats) {
      if (stat.status in result) {
        result[stat.status as keyof typeof result] = stat.count;
      }
    }

    return result;
  }

  // Macro Analysis Methods
  async getLatestMacroAnalysis(industry?: string | null): Promise<MacroAnalysis | undefined> {
    // Get macro analysis for specific industry or general market (null industry)
    // Filter for analyses less than 7 days old AND that are complete (have actual data)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const [analysis] = await db
      .select()
      .from(macroAnalyses)
      .where(
        and(
          industry 
            ? eq(macroAnalyses.industry, industry)
            : sql`${macroAnalyses.industry} IS NULL`,
          sql`${macroAnalyses.createdAt} >= ${sevenDaysAgo}`,
          eq(macroAnalyses.status, "completed"),
          sql`${macroAnalyses.macroFactor} IS NOT NULL`
        )
      )
      .orderBy(desc(macroAnalyses.createdAt))
      .limit(1);
    return analysis;
  }

  async getMacroAnalysis(id: string): Promise<MacroAnalysis | undefined> {
    const [analysis] = await db
      .select()
      .from(macroAnalyses)
      .where(eq(macroAnalyses.id, id))
      .limit(1);
    return analysis;
  }

  async createMacroAnalysis(analysis: InsertMacroAnalysis): Promise<MacroAnalysis> {
    const [created] = await db
      .insert(macroAnalyses)
      .values(analysis)
      .returning();
    console.log(`[Storage] Created macro analysis with score ${created.macroScore} and factor ${created.macroFactor}`);
    return created;
  }

  async updateMacroAnalysisStatus(id: string, status: string, errorMessage?: string): Promise<void> {
    await db
      .update(macroAnalyses)
      .set({ status, errorMessage: errorMessage || null })
      .where(eq(macroAnalyses.id, id));
  }

  // Feature Suggestion Methods
  async getFeatureSuggestions(userId?: string, status?: string): Promise<(FeatureSuggestion & { userName: string; userHasVoted: boolean })[]> {
    let query = db
      .select({
        id: featureSuggestions.id,
        userId: featureSuggestions.userId,
        title: featureSuggestions.title,
        description: featureSuggestions.description,
        status: featureSuggestions.status,
        voteCount: featureSuggestions.voteCount,
        createdAt: featureSuggestions.createdAt,
        updatedAt: featureSuggestions.updatedAt,
        userName: users.name,
      })
      .from(featureSuggestions)
      .leftJoin(users, eq(featureSuggestions.userId, users.id));

    if (status) {
      query = query.where(eq(featureSuggestions.status, status)) as any;
    }

    const suggestions = await query.orderBy(desc(featureSuggestions.voteCount), desc(featureSuggestions.createdAt));

    // Check if current user has voted for each suggestion
    if (userId) {
      const userVotes = await db
        .select({ suggestionId: featureVotes.suggestionId })
        .from(featureVotes)
        .where(eq(featureVotes.userId, userId));
      
      const votedSuggestionIds = new Set(userVotes.map(v => v.suggestionId));
      
      return suggestions.map(s => ({
        ...s,
        userName: s.userName || 'Unknown User',
        userHasVoted: votedSuggestionIds.has(s.id),
      }));
    }

    return suggestions.map(s => ({
      ...s,
      userName: s.userName || 'Unknown User',
      userHasVoted: false,
    }));
  }

  async getFeatureSuggestion(id: string): Promise<FeatureSuggestion | undefined> {
    const [suggestion] = await db
      .select()
      .from(featureSuggestions)
      .where(eq(featureSuggestions.id, id));
    return suggestion;
  }

  async createFeatureSuggestion(suggestion: InsertFeatureSuggestion): Promise<FeatureSuggestion> {
    const [created] = await db
      .insert(featureSuggestions)
      .values(suggestion)
      .returning();
    return created;
  }

  async updateFeatureSuggestionStatus(id: string, status: string): Promise<FeatureSuggestion | undefined> {
    const [updated] = await db
      .update(featureSuggestions)
      .set({ status, updatedAt: sql`now()` })
      .where(eq(featureSuggestions.id, id))
      .returning();
    return updated;
  }

  async deleteFeatureSuggestion(id: string): Promise<boolean> {
    const result = await db
      .delete(featureSuggestions)
      .where(eq(featureSuggestions.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async voteForSuggestion(suggestionId: string, userId: string): Promise<boolean> {
    try {
      // Insert vote
      await db.insert(featureVotes).values({ suggestionId, userId });
      
      // Increment vote count
      await db
        .update(featureSuggestions)
        .set({ 
          voteCount: sql`${featureSuggestions.voteCount} + 1`,
          updatedAt: sql`now()`
        })
        .where(eq(featureSuggestions.id, suggestionId));
      
      return true;
    } catch (error) {
      // Vote already exists (unique constraint violation)
      return false;
    }
  }

  async unvoteForSuggestion(suggestionId: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(featureVotes)
      .where(
        and(
          eq(featureVotes.suggestionId, suggestionId),
          eq(featureVotes.userId, userId)
        )
      );

    if (result.rowCount && result.rowCount > 0) {
      // Decrement vote count
      await db
        .update(featureSuggestions)
        .set({ 
          voteCount: sql`${featureSuggestions.voteCount} - 1`,
          updatedAt: sql`now()`
        })
        .where(eq(featureSuggestions.id, suggestionId));
      
      return true;
    }

    return false;
  }

  async hasUserVoted(suggestionId: string, userId: string): Promise<boolean> {
    const [vote] = await db
      .select()
      .from(featureVotes)
      .where(
        and(
          eq(featureVotes.suggestionId, suggestionId),
          eq(featureVotes.userId, userId)
        )
      );
    return !!vote;
  }

  // Notification Methods
  async getNotifications(userId: string): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false)
        )
      );
    return result[0]?.count || 0;
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db
      .insert(notifications)
      .values(notification)
      .returning();
    return newNotification;
  }

  async markNotificationAsRead(id: string, userId: string): Promise<Notification | undefined> {
    const [updated] = await db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(
          eq(notifications.id, id),
          eq(notifications.userId, userId)
        )
      )
      .returning();
    return updated;
  }

  async markAllNotificationsAsRead(userId: string): Promise<number> {
    const result = await db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false)
        )
      );
    return result.rowCount || 0;
  }

  async clearAllNotifications(userId: string): Promise<number> {
    const result = await db
      .delete(notifications)
      .where(eq(notifications.userId, userId));
    return result.rowCount || 0;
  }

  async getAnnouncements(userId: string): Promise<(Announcement & { readAt?: Date | null })[]> {
    const result = await db
      .select({
        id: announcements.id,
        title: announcements.title,
        content: announcements.content,
        type: announcements.type,
        isActive: announcements.isActive,
        createdAt: announcements.createdAt,
        createdBy: announcements.createdBy,
        readAt: announcementReads.readAt,
      })
      .from(announcements)
      .leftJoin(
        announcementReads,
        and(
          eq(announcementReads.announcementId, announcements.id),
          eq(announcementReads.userId, userId)
        )
      )
      .where(eq(announcements.isActive, true))
      .orderBy(desc(announcements.createdAt));
    
    return result;
  }

  async getUnreadAnnouncementCount(userId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(announcements)
      .leftJoin(
        announcementReads,
        and(
          eq(announcementReads.announcementId, announcements.id),
          eq(announcementReads.userId, userId)
        )
      )
      .where(
        and(
          eq(announcements.isActive, true),
          sql`${announcementReads.id} IS NULL`
        )
      );
    return result[0]?.count || 0;
  }

  async createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement> {
    const [newAnnouncement] = await db
      .insert(announcements)
      .values(announcement)
      .returning();
    return newAnnouncement;
  }

  async updateAnnouncement(id: string, updates: Partial<Announcement>): Promise<Announcement | undefined> {
    const [updated] = await db
      .update(announcements)
      .set(updates)
      .where(eq(announcements.id, id))
      .returning();
    return updated;
  }

  async deactivateAnnouncement(id: string): Promise<Announcement | undefined> {
    return this.updateAnnouncement(id, { isActive: false });
  }

  async markAnnouncementAsRead(userId: string, announcementId: string): Promise<void> {
    await db
      .insert(announcementReads)
      .values({ userId, announcementId })
      .onConflictDoNothing();
  }

  async markAllAnnouncementsAsRead(userId: string): Promise<void> {
    const activeAnnouncements = await db
      .select({ id: announcements.id })
      .from(announcements)
      .where(eq(announcements.isActive, true));

    if (activeAnnouncements.length > 0) {
      const values = activeAnnouncements.map(a => ({ userId, announcementId: a.id }));
      await db.insert(announcementReads).values(values).onConflictDoNothing();
    }
  }

  async getAllAnnouncements(): Promise<Announcement[]> {
    return await db
      .select()
      .from(announcements)
      .orderBy(sql`${announcements.createdAt} DESC`);
  }

  async deleteAnnouncement(id: string): Promise<void> {
    await db.delete(announcements).where(eq(announcements.id, id));
  }

  async getAdminNotifications(): Promise<AdminNotification[]> {
    return await db
      .select()
      .from(adminNotifications)
      .orderBy(sql`${adminNotifications.createdAt} DESC`);
  }

  async getUnreadAdminNotificationCount(): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(adminNotifications)
      .where(eq(adminNotifications.isRead, false));
    return result[0]?.count || 0;
  }

  async createAdminNotification(notification: InsertAdminNotification): Promise<AdminNotification> {
    const [created] = await db
      .insert(adminNotifications)
      .values(notification)
      .returning();
    return created;
  }

  async markAdminNotificationAsRead(id: string): Promise<AdminNotification | undefined> {
    const [updated] = await db
      .update(adminNotifications)
      .set({ isRead: true, readAt: new Date() })
      .where(eq(adminNotifications.id, id))
      .returning();
    return updated;
  }

  async markAllAdminNotificationsAsRead(): Promise<void> {
    await db
      .update(adminNotifications)
      .set({ isRead: true, readAt: new Date() })
      .where(eq(adminNotifications.isRead, false));
  }
}

export const storage = new DatabaseStorage();
