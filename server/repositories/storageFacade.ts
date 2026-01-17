/**
 * Storage Facade
 * Composes all repositories and implements IStorage interface
 * This allows gradual migration from monolithic storage.ts to repository pattern
 */

import { type IStorage } from "../storage";
import {
  SystemSettingsRepository,
  TelegramConfigRepository,
  IbkrConfigRepository,
  OpeninsiderConfigRepository,
  PaymentRepository,
  StockCommentRepository,
  StockViewRepository,
  TutorialRepository,
  PasswordResetRepository,
  ManualOverrideRepository,
  NotificationRepository,
  AnnouncementRepository,
  AdminNotificationRepository,
  FeatureSuggestionRepository,
  MacroAnalysisRepository,
  StockCandlestickRepository,
  StockAnalysisRepository,
  AiAnalysisJobRepository,
  UserStockStatusRepository,
  FollowedStockRepository,
  DailyBriefRepository,
  OpportunityRepository,
  PortfolioHoldingRepository,
  TradeRepository,
  TradingRuleRepository,
  CompoundRuleRepository,
  RuleExecutionRepository,
  BacktestRepository,
  BacktestJobRepository,
  StockRepository,
  UserRepository,
} from "./index";
import { StockAnalysisRepository as StockAnalysisRepo } from "./stockAnalysisRepository";

/**
 * StorageFacade implements IStorage by delegating to domain-specific repositories
 * Dependencies between repositories are injected via constructor
 */
export class StorageFacade implements IStorage {
  // Repositories
  private systemSettings: SystemSettingsRepository;
  private telegramConfig: TelegramConfigRepository;
  private ibkrConfig: IbkrConfigRepository;
  private openinsiderConfig: OpeninsiderConfigRepository;
  private payment: PaymentRepository;
  private stockComment: StockCommentRepository;
  private stockView: StockViewRepository;
  private tutorial: TutorialRepository;
  private passwordReset: PasswordResetRepository;
  private manualOverride: ManualOverrideRepository;
  private notification: NotificationRepository;
  private announcement: AnnouncementRepository;
  private adminNotification: AdminNotificationRepository;
  private featureSuggestion: FeatureSuggestionRepository;
  private macroAnalysis: MacroAnalysisRepository;
  private stockCandlestick: StockCandlestickRepository;
  private stockAnalysis: StockAnalysisRepository;
  private aiAnalysisJob: AiAnalysisJobRepository;
  private userStockStatus: UserStockStatusRepository;
  private followedStock: FollowedStockRepository;
  private dailyBrief: DailyBriefRepository;
  private opportunity: OpportunityRepository;
  private portfolioHolding: PortfolioHoldingRepository;
  private trade: TradeRepository;
  private tradingRule: TradingRuleRepository;
  private compoundRule: CompoundRuleRepository;
  private ruleExecution: RuleExecutionRepository;
  private backtest: BacktestRepository;
  private backtestJob: BacktestJobRepository;
  private stock: StockRepository;
  private user: UserRepository;

  constructor() {
    // Initialize repositories (handle dependencies)
    this.stockAnalysis = new StockAnalysisRepo();
    this.aiAnalysisJob = new AiAnalysisJobRepository(this.stockAnalysis);
    this.followedStock = new FollowedStockRepository();
    this.portfolioHolding = new PortfolioHoldingRepository();
    this.trade = new TradeRepository();
    this.stock = new StockRepository();
    
    // Initialize remaining repositories
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

  async updateSystemSettings(updates: any) {
    return this.systemSettings.updateSystemSettings(updates);
  }

  // Telegram Configuration
  async getTelegramConfig() {
    return this.telegramConfig.getTelegramConfig();
  }

  async createOrUpdateTelegramConfig(config: any) {
    return this.telegramConfig.createOrUpdateTelegramConfig(config);
  }

  async updateTelegramSyncStatus(lastMessageId: number) {
    return this.telegramConfig.updateTelegramSyncStatus(lastMessageId);
  }

  async updateTelegramSession(sessionString: string) {
    return this.telegramConfig.updateTelegramSession(sessionString);
  }

  // IBKR Configuration
  async getIbkrConfig() {
    return this.ibkrConfig.getIbkrConfig();
  }

  async createOrUpdateIbkrConfig(config: any) {
    return this.ibkrConfig.createOrUpdateIbkrConfig(config);
  }

  async updateIbkrConnectionStatus(isConnected: boolean, accountId?: string, error?: string) {
    return this.ibkrConfig.updateIbkrConnectionStatus(isConnected, accountId, error);
  }

  // OpenInsider Configuration
  async getOpeninsiderConfig() {
    return this.openinsiderConfig.getOpeninsiderConfig();
  }

  async createOrUpdateOpeninsiderConfig(config: any) {
    return this.openinsiderConfig.createOrUpdateOpeninsiderConfig(config);
  }

  async updateOpeninsiderSyncStatus(error?: string) {
    return this.openinsiderConfig.updateOpeninsiderSyncStatus(error);
  }

  // Payments
  async getUserPayments(userId: string) {
    return this.payment.getUserPayments(userId);
  }

  async createPayment(payment: any) {
    return this.payment.createPayment(payment);
  }

  async getPaymentByPaypalOrderId(orderId: string) {
    return this.payment.getPaymentByPaypalOrderId(orderId);
  }

  async getPaymentStats(userId: string) {
    return this.payment.getPaymentStats(userId);
  }

  // Stock Comments
  async getStockComments(ticker: string) {
    return this.stockComment.getStockComments(ticker);
  }

  async getStockCommentCounts() {
    return this.stockComment.getStockCommentCounts();
  }

  async createStockComment(comment: any) {
    return this.stockComment.createStockComment(comment);
  }

  // Stock Views
  async markStockAsViewed(ticker: string, userId: string) {
    return this.stockView.markStockAsViewed(ticker, userId);
  }

  async markStocksAsViewed(tickers: string[], userId: string) {
    return this.stockView.markStocksAsViewed(tickers, userId);
  }

  async getUserStockViews(userId: string) {
    return this.stockView.getUserStockViews(userId);
  }

  // Tutorials
  async hasCompletedTutorial(userId: string, tutorialId: string) {
    return this.tutorial.hasCompletedTutorial(userId, tutorialId);
  }

  async markTutorialAsCompleted(userId: string, tutorialId: string) {
    return this.tutorial.markTutorialAsCompleted(userId, tutorialId);
  }

  async getUserTutorials(userId: string) {
    return this.tutorial.getUserTutorials(userId);
  }

  // Password Reset
  async createPasswordResetToken(token: any) {
    return this.passwordReset.createPasswordResetToken(token);
  }

  async getPasswordResetToken(token: string) {
    return this.passwordReset.getPasswordResetToken(token);
  }

  async markPasswordResetTokenUsed(tokenId: string) {
    return this.passwordReset.markPasswordResetTokenUsed(tokenId);
  }

  async purgeExpiredPasswordResetTokens() {
    return this.passwordReset.purgeExpiredPasswordResetTokens();
  }

  // Manual Override
  async createManualOverride(override: any) {
    return this.manualOverride.createManualOverride(override);
  }

  async getUserManualOverrides(userId: string) {
    return this.manualOverride.getUserManualOverrides(userId);
  }

  async getActiveManualOverride(userId: string) {
    return this.manualOverride.getActiveManualOverride(userId);
  }

  // Notifications
  async getNotifications(userId: string) {
    return this.notification.getNotifications(userId);
  }

  async getUnreadNotificationCount(userId: string) {
    return this.notification.getUnreadNotificationCount(userId);
  }

  async createNotification(notification: any) {
    return this.notification.createNotification(notification);
  }

  async markNotificationAsRead(id: string, userId: string) {
    return this.notification.markNotificationAsRead(id, userId);
  }

  async markAllNotificationsAsRead(userId: string) {
    return this.notification.markAllNotificationsAsRead(userId);
  }

  async clearAllNotifications(userId: string) {
    return this.notification.clearAllNotifications(userId);
  }

  // Announcements
  async getAnnouncements(userId: string) {
    return this.announcement.getAnnouncements(userId);
  }

  async getUnreadAnnouncementCount(userId: string) {
    return this.announcement.getUnreadAnnouncementCount(userId);
  }

  async getAllAnnouncements() {
    return this.announcement.getAllAnnouncements();
  }

  async createAnnouncement(announcement: any) {
    return this.announcement.createAnnouncement(announcement);
  }

  async updateAnnouncement(id: string, updates: any) {
    return this.announcement.updateAnnouncement(id, updates);
  }

  async deactivateAnnouncement(id: string) {
    return this.announcement.deactivateAnnouncement(id);
  }

  async deleteAnnouncement(id: string) {
    return this.announcement.deleteAnnouncement(id);
  }

  async markAnnouncementAsRead(userId: string, announcementId: string) {
    return this.announcement.markAnnouncementAsRead(userId, announcementId);
  }

  async markAllAnnouncementsAsRead(userId: string) {
    return this.announcement.markAllAnnouncementsAsRead(userId);
  }

  // Admin Notifications
  async getAdminNotifications() {
    return this.adminNotification.getAdminNotifications();
  }

  async getUnreadAdminNotificationCount() {
    return this.adminNotification.getUnreadAdminNotificationCount();
  }

  async createAdminNotification(notification: any) {
    return this.adminNotification.createAdminNotification(notification);
  }

  async markAdminNotificationAsRead(id: string) {
    return this.adminNotification.markAdminNotificationAsRead(id);
  }

  async markAllAdminNotificationsAsRead() {
    return this.adminNotification.markAllAdminNotificationsAsRead();
  }

  // Feature Suggestions
  async getFeatureSuggestions(userId?: string, status?: string) {
    return this.featureSuggestion.getFeatureSuggestions(userId, status);
  }

  async getFeatureSuggestion(id: string) {
    return this.featureSuggestion.getFeatureSuggestion(id);
  }

  async createFeatureSuggestion(suggestion: any) {
    return this.featureSuggestion.createFeatureSuggestion(suggestion);
  }

  async updateFeatureSuggestionStatus(id: string, status: string) {
    return this.featureSuggestion.updateFeatureSuggestionStatus(id, status);
  }

  async deleteFeatureSuggestion(id: string) {
    return this.featureSuggestion.deleteFeatureSuggestion(id);
  }

  async voteForSuggestion(suggestionId: string, userId: string) {
    return this.featureSuggestion.voteForSuggestion(suggestionId, userId);
  }

  async unvoteForSuggestion(suggestionId: string, userId: string) {
    return this.featureSuggestion.unvoteForSuggestion(suggestionId, userId);
  }

  async hasUserVoted(suggestionId: string, userId: string) {
    return this.featureSuggestion.hasUserVoted(suggestionId, userId);
  }

  // Macro Analysis
  async getLatestMacroAnalysis(industry?: string | null) {
    return this.macroAnalysis.getLatestMacroAnalysis(industry);
  }

  async getMacroAnalysis(id: string) {
    return this.macroAnalysis.getMacroAnalysis(id);
  }

  async createMacroAnalysis(analysis: any) {
    return this.macroAnalysis.createMacroAnalysis(analysis);
  }

  async updateMacroAnalysisStatus(id: string, status: string, errorMessage?: string) {
    return this.macroAnalysis.updateMacroAnalysisStatus(id, status, errorMessage);
  }

  // Stock Candlesticks
  async getCandlesticksByTicker(ticker: string) {
    return this.stockCandlestick.getCandlesticksByTicker(ticker);
  }

  async upsertCandlesticks(ticker: string, candlestickData: any) {
    return this.stockCandlestick.upsertCandlesticks(ticker, candlestickData);
  }

  async getAllTickersNeedingCandlestickData() {
    return this.stockCandlestick.getAllTickersNeedingCandlestickData();
  }

  // Stock AI Analysis
  async getStockAnalysis(ticker: string) {
    return this.stockAnalysis.getStockAnalysis(ticker);
  }

  async getAllStockAnalyses() {
    return this.stockAnalysis.getAllStockAnalyses();
  }

  async saveStockAnalysis(analysis: any) {
    return this.stockAnalysis.saveStockAnalysis(analysis);
  }

  async updateStockAnalysis(ticker: string, updates: any) {
    return this.stockAnalysis.updateStockAnalysis(ticker, updates);
  }

  async updateStockAnalysisStatus(ticker: string, status: string, errorMessage?: string) {
    return this.stockAnalysis.updateStockAnalysisStatus(ticker, status, errorMessage);
  }

  // AI Analysis Jobs
  async enqueueAnalysisJob(ticker: string, source: string, priority?: string, force?: boolean) {
    return this.aiAnalysisJob.enqueueAnalysisJob(ticker, source, priority || "normal", force);
  }

  async cancelAnalysisJobsForTicker(ticker: string) {
    return this.aiAnalysisJob.cancelAnalysisJobsForTicker(ticker);
  }

  async dequeueNextJob() {
    return this.aiAnalysisJob.dequeueNextJob();
  }

  async getJobById(jobId: string) {
    return this.aiAnalysisJob.getJobById(jobId);
  }

  async getJobsByTicker(ticker: string) {
    return this.aiAnalysisJob.getJobsByTicker(ticker);
  }

  async updateJobStatus(jobId: string, status: string, updates?: any) {
    return this.aiAnalysisJob.updateJobStatus(jobId, status, updates);
  }

  async updateJobProgress(jobId: string, currentStep: string, stepDetails: any) {
    return this.aiAnalysisJob.updateJobProgress(jobId, currentStep, stepDetails);
  }

  async resetStockAnalysisPhaseFlags(ticker: string) {
    return this.aiAnalysisJob.resetStockAnalysisPhaseFlags(ticker);
  }

  async markStockAnalysisPhaseComplete(ticker: string, phase: 'micro' | 'macro' | 'combined') {
    return this.aiAnalysisJob.markStockAnalysisPhaseComplete(ticker, phase);
  }

  async getStocksWithIncompleteAnalysis() {
    return this.aiAnalysisJob.getStocksWithIncompleteAnalysis();
  }

  async getQueueStats() {
    return this.aiAnalysisJob.getQueueStats();
  }

  async resetStuckProcessingJobs(timeoutMs: number) {
    return this.aiAnalysisJob.resetStuckProcessingJobs(timeoutMs);
  }

  // User Stock Statuses
  async getUserStockStatus(userId: string, ticker: string) {
    return this.userStockStatus.getUserStockStatus(userId, ticker);
  }

  async getUserStockStatuses(userId: string, status?: string) {
    return this.userStockStatus.getUserStockStatuses(userId, status);
  }

  async createUserStockStatus(status: any) {
    return this.userStockStatus.createUserStockStatus(status);
  }

  async updateUserStockStatus(userId: string, ticker: string, updates: any) {
    return this.userStockStatus.updateUserStockStatus(userId, ticker, updates);
  }

  async ensureUserStockStatus(userId: string, ticker: string) {
    return this.userStockStatus.ensureUserStockStatus(userId, ticker);
  }

  async rejectTickerForUser(userId: string, ticker: string) {
    return this.userStockStatus.rejectTickerForUser(userId, ticker);
  }

  // Followed Stocks
  async getUserFollowedStocks(userId: string) {
    return this.followedStock.getUserFollowedStocks(userId);
  }

  async followStock(follow: any) {
    return this.followedStock.followStock(follow);
  }

  async unfollowStock(ticker: string, userId: string) {
    return this.followedStock.unfollowStock(ticker, userId);
  }

  async toggleStockPosition(ticker: string, userId: string, hasEnteredPosition: boolean, entryPrice?: number) {
    return this.followedStock.toggleStockPosition(ticker, userId, hasEnteredPosition, entryPrice);
  }

  async closePosition(ticker: string, userId: string, sellPrice: number, quantity: number) {
    return this.followedStock.closePosition(ticker, userId, sellPrice, quantity);
  }

  async getTotalPnL(userId: string) {
    return this.followedStock.getTotalPnL(userId);
  }

  async getFollowedStocksWithPrices(userId: string) {
    return this.followedStock.getFollowedStocksWithPrices(userId);
  }

  async getFollowedStocksWithStatus(userId: string) {
    return this.followedStock.getFollowedStocksWithStatus(userId);
  }

  async getFollowerCountForTicker(ticker: string) {
    return this.followedStock.getFollowerCountForTicker(ticker);
  }

  async getFollowerUserIdsForTicker(ticker: string) {
    return this.followedStock.getFollowerUserIdsForTicker(ticker);
  }

  async hasAnyUserPositionInTicker(ticker: string) {
    return this.followedStock.hasAnyUserPositionInTicker(ticker);
  }

  // Daily Briefs
  async getDailyBriefsForTicker(ticker: string, userId: string) {
    return this.dailyBrief.getDailyBriefsForTicker(ticker, userId);
  }

  async getDailyBriefForUser(userId: string, ticker: string, briefDate: string) {
    return this.dailyBrief.getDailyBriefForUser(userId, ticker, briefDate);
  }

  async createDailyBrief(brief: any) {
    return this.dailyBrief.createDailyBrief(brief);
  }

  async getTickerDailyBriefs(ticker: string, limit?: number) {
    return this.dailyBrief.getTickerDailyBriefs(ticker, limit);
  }

  async createTickerDailyBrief(brief: any) {
    return this.dailyBrief.createTickerDailyBrief(brief);
  }

  async getLatestTickerBrief(ticker: string) {
    return this.dailyBrief.getLatestTickerBrief(ticker);
  }

  // Opportunities
  async getOpportunities(options?: { 
    cadence?: 'daily' | 'hourly' | 'all';
    userId?: string;
    ticker?: string;
    includeBriefs?: boolean;
  }) {
    return this.opportunity.getOpportunities(options);
  }

  async getOpportunity(id: string) {
    return this.opportunity.getOpportunity(id);
  }

  async getOpportunityByTransaction(ticker: string, insiderTradeDate: string, insiderName: string, recommendation: string, cadence?: string) {
    return this.opportunity.getOpportunityByTransaction(ticker, insiderTradeDate, insiderName, recommendation, cadence);
  }

  async createOpportunity(opportunity: any) {
    return this.opportunity.createOpportunity(opportunity);
  }

  async updateOpportunity(id: string, updates: any) {
    return this.opportunity.updateOpportunity(id, updates);
  }

  async deleteOpportunity(id: string) {
    return this.opportunity.deleteOpportunity(id);
  }

  async createOpportunityBatch(batch: any) {
    return this.opportunity.createOpportunityBatch(batch);
  }

  async updateOpportunityBatchStats(batchId: string, stats: any) {
    return this.opportunity.updateOpportunityBatchStats(batchId, stats);
  }

  async getLatestBatch(cadence: 'daily' | 'hourly') {
    return this.opportunity.getLatestBatch(cadence);
  }

  async getLatestBatchWithStats() {
    return this.opportunity.getLatestBatchWithStats();
  }

  async promoteSecRealtimeToHourly() {
    return this.opportunity.promoteSecRealtimeToHourly();
  }

  async countOpportunitiesByBatchWithScore(batchId: string, minScore: number) {
    return this.opportunity.countOpportunitiesByBatchWithScore(batchId, minScore);
  }

  async countOpportunitiesByBatchInQueue(batchId: string) {
    return this.opportunity.countOpportunitiesByBatchInQueue(batchId);
  }

  async countOpportunitiesByBatchPending(batchId: string) {
    return this.opportunity.countOpportunitiesByBatchPending(batchId);
  }

  async countOpportunitiesByBatchAnalyzing(batchId: string) {
    return this.opportunity.countOpportunitiesByBatchAnalyzing(batchId);
  }

  async countOpportunitiesByBatchRejectedByScore(batchId: string, maxScore: number) {
    return this.opportunity.countOpportunitiesByBatchRejectedByScore(batchId, maxScore);
  }

  async rejectOpportunity(userId: string, opportunityId: string) {
    return this.opportunity.rejectOpportunity(userId, opportunityId);
  }

  async unrejectOpportunity(userId: string, opportunityId: string) {
    return this.opportunity.unrejectOpportunity(userId, opportunityId);
  }

  async getUserRejections(userId: string) {
    return this.opportunity.getUserRejections(userId);
  }

  async isOpportunityRejected(userId: string, opportunityId: string) {
    return this.opportunity.isOpportunityRejected(userId, opportunityId);
  }

  // Portfolio Holdings
  async getPortfolioHoldings(userId: string, isSimulated?: boolean) {
    return this.portfolioHolding.getPortfolioHoldings(userId, isSimulated);
  }

  async getPortfolioHolding(id: string, userId?: string) {
    return this.portfolioHolding.getPortfolioHolding(id, userId);
  }

  async getPortfolioHoldingByTicker(userId: string, ticker: string, isSimulated?: boolean) {
    return this.portfolioHolding.getPortfolioHoldingByTicker(userId, ticker, isSimulated);
  }

  async createPortfolioHolding(holding: any) {
    return this.portfolioHolding.createPortfolioHolding(holding);
  }

  async updatePortfolioHolding(id: string, updates: any) {
    return this.portfolioHolding.updatePortfolioHolding(id, updates);
  }

  async deletePortfolioHolding(id: string) {
    return this.portfolioHolding.deletePortfolioHolding(id);
  }

  async deleteSimulatedHoldingsByTicker(userId: string, ticker: string) {
    return this.portfolioHolding.deleteSimulatedHoldingsByTicker(userId, ticker);
  }

  // Trades
  async getTrades(userId: string, isSimulated?: boolean) {
    return this.trade.getTrades(userId, isSimulated);
  }

  async getTrade(id: string, userId?: string) {
    return this.trade.getTrade(id, userId);
  }

  async createTrade(trade: any) {
    return this.trade.createTrade(trade, this.portfolioHolding);
  }

  async updateTrade(id: string, updates: any) {
    return this.trade.updateTrade(id, updates);
  }

  async deleteSimulatedTradesByTicker(userId: string, ticker: string) {
    return this.trade.deleteSimulatedTradesByTicker(userId, ticker);
  }

  // Trading Rules
  async getTradingRules(userId: string) {
    return this.tradingRule.getTradingRules(userId);
  }

  async getTradingRule(id: string) {
    return this.tradingRule.getTradingRule(id);
  }

  async createTradingRule(rule: any) {
    return this.tradingRule.createTradingRule(rule);
  }

  async updateTradingRule(id: string, updates: any) {
    return this.tradingRule.updateTradingRule(id, updates);
  }

  async deleteTradingRule(id: string) {
    return this.tradingRule.deleteTradingRule(id);
  }

  // Compound Rules
  async getCompoundRules() {
    return this.compoundRule.getCompoundRules();
  }

  async getCompoundRule(id: string) {
    return this.compoundRule.getCompoundRule(id);
  }

  async createCompoundRule(rule: any) {
    return this.compoundRule.createCompoundRule(rule);
  }

  async updateCompoundRule(id: string, updates: any) {
    return this.compoundRule.updateCompoundRule(id, updates);
  }

  async deleteCompoundRule(id: string) {
    return this.compoundRule.deleteCompoundRule(id);
  }

  // Rule Executions
  async getRuleExecutions(ruleId?: string, ticker?: string) {
    return this.ruleExecution.getRuleExecutions(ruleId, ticker);
  }

  async createRuleExecution(execution: any) {
    return this.ruleExecution.createRuleExecution(execution);
  }

  // Backtests
  async getBacktests() {
    return this.backtest.getBacktests();
  }

  async getBacktest(id: string) {
    return this.backtest.getBacktest(id);
  }

  async createBacktest(backtest: any) {
    return this.backtest.createBacktest(backtest);
  }

  // Backtest Jobs
  async getBacktestJobs(userId: string) {
    return this.backtestJob.getBacktestJobs(userId);
  }

  async getBacktestJob(id: string) {
    return this.backtestJob.getBacktestJob(id);
  }

  async createBacktestJob(job: any) {
    return this.backtestJob.createBacktestJob(job);
  }

  async updateBacktestJob(id: string, updates: any) {
    return this.backtestJob.updateBacktestJob(id, updates);
  }

  async deleteBacktestJob(id: string) {
    return this.backtestJob.deleteBacktestJob(id);
  }

  async getBacktestPriceData(jobId: string) {
    return this.backtestJob.getBacktestPriceData(jobId);
  }

  async getCachedPriceData(ticker: string, insiderBuyDate: string) {
    return this.backtestJob.getCachedPriceData(ticker, insiderBuyDate);
  }

  async createBacktestPriceData(data: any) {
    return this.backtestJob.createBacktestPriceData(data);
  }

  async getBacktestScenarios(jobId: string) {
    return this.backtestJob.getBacktestScenarios(jobId);
  }

  async createBacktestScenario(scenario: any) {
    return this.backtestJob.createBacktestScenario(scenario);
  }

  // Stocks
  async getStocks(userId: string) {
    return this.stock.getStocks(userId);
  }

  async getStocksByUserStatus(userId: string, status: string) {
    return this.stock.getStocksByUserStatus(userId, status);
  }

  async getStock(userId: string, ticker: string) {
    return this.stock.getStock(userId, ticker);
  }

  async getAnyStockForTicker(ticker: string) {
    return this.stock.getAnyStockForTicker(ticker);
  }

  async getUserStocksForTicker(userId: string, ticker: string) {
    return this.stock.getUserStocksForTicker(userId, ticker);
  }

  async getAllStocksForTickerGlobal(ticker: string) {
    return this.stock.getAllStocksForTickerGlobal(ticker);
  }

  async getTransactionByCompositeKey(userId: string, ticker: string, insiderTradeDate: string, insiderName: string, recommendation: string) {
    return this.stock.getTransactionByCompositeKey(userId, ticker, insiderTradeDate, insiderName, recommendation);
  }

  async createStock(stock: any) {
    return this.stock.createStock(stock);
  }

  async updateStock(userId: string, ticker: string, updates: any) {
    return this.stock.updateStock(userId, ticker, updates, this.portfolioHolding);
  }

  async deleteStock(userId: string, ticker: string) {
    return this.stock.deleteStock(userId, ticker);
  }

  async deleteExpiredPendingStocks(ageInDays: number) {
    return this.stock.deleteExpiredPendingStocks(ageInDays);
  }

  async deleteExpiredRejectedStocks(ageInDays: number) {
    return this.stock.deleteExpiredRejectedStocks(ageInDays);
  }

  async deleteStocksOlderThan(ageInDays: number) {
    return this.stock.deleteStocksOlderThan(ageInDays);
  }

  async unrejectStock(userId: string, ticker: string) {
    return this.stock.unrejectStock(userId, ticker);
  }

  async getAllUniquePendingTickers() {
    return this.stock.getAllUniquePendingTickers();
  }

  async getAllUniqueTickersNeedingData() {
    return this.stock.getAllUniqueTickersNeedingData();
  }

  async updateStocksByTickerGlobally(ticker: string, updates: any) {
    return this.stock.updateStocksByTickerGlobally(ticker, updates);
  }

  // Users
  async getUsers(options?: any) {
    return this.user.getUsers(options);
  }

  async getSuperAdminUsers() {
    return this.user.getSuperAdminUsers();
  }

  async getAllUserIds() {
    return this.user.getAllUserIds();
  }

  async getUser(id: string) {
    return this.user.getUser(id);
  }

  async getUserByEmail(email: string) {
    return this.user.getUserByEmail(email);
  }

  async getUserByGoogleSub(googleSub: string) {
    return this.user.getUserByGoogleSub(googleSub);
  }

  async getUserByFirebaseUid(firebaseUid: string) {
    return this.user.getUserByFirebaseUid(firebaseUid);
  }

  async getUserByVerificationToken(token: string) {
    return this.user.getUserByVerificationToken(token);
  }

  async createUser(user: any) {
    return this.user.createUser(user);
  }

  async createGoogleUser(user: any) {
    return this.user.createGoogleUser(user);
  }

  async linkGoogleAccount(userId: string, googleSub: string, googlePicture?: string) {
    return this.user.linkGoogleAccount(userId, googleSub, googlePicture);
  }

  async updateUser(id: string, updates: any) {
    return this.user.updateUser(id, updates);
  }

  async deleteUser(id: string) {
    return this.user.deleteUser(id);
  }

  async verifyUserEmail(userId: string) {
    return this.user.verifyUserEmail(userId);
  }

  async updateVerificationToken(userId: string, token: string, expiry: Date) {
    return this.user.updateVerificationToken(userId, token, expiry);
  }

  async purgeUnverifiedUsers(olderThanHours: number) {
    return this.user.purgeUnverifiedUsers(olderThanHours);
  }

  async markUserInitialDataFetched(userId: string) {
    return this.user.markUserInitialDataFetched(userId);
  }

  async markUserHasSeenOnboarding(userId: string) {
    return this.user.markUserHasSeenOnboarding(userId);
  }

  async completeUserOnboarding(userId: string) {
    return this.user.completeUserOnboarding(userId);
  }

  async getUserProgress(userId: string) {
    return this.user.getUserProgress(userId);
  }

  async completeTutorial(userId: string, tutorialId: string) {
    return this.user.completeTutorial(userId, tutorialId);
  }

  async archiveUser(userId: string, archivedBy: string) {
    return this.user.archiveUser(userId, archivedBy);
  }

  async unarchiveUser(userId: string) {
    return this.user.unarchiveUser(userId);
  }

  async updateUserSubscriptionStatus(userId: string, status: string, endDate?: Date) {
    return this.user.updateUserSubscriptionStatus(userId, status, endDate);
  }

  async updateUserLastDataRefresh(userId: string) {
    return this.user.updateUserLastDataRefresh(userId);
  }

  canUserReceiveDataRefresh(user: any) {
    return this.user.canUserReceiveDataRefresh(user);
  }

  async getUsersEligibleForDataRefresh() {
    return this.user.getUsersEligibleForDataRefresh();
  }

  // Legacy methods that may still be in IStorage but not yet migrated
  // These will be implemented as needed or removed if unused
  async initializeDefaults() {
    // Delegate to telegram config for now
    await this.telegramConfig.getTelegramConfig();
  }

  // Note: getStocksWithUserStatus is a complex method that will be handled by HybridStorage
  // This method should not be called directly on StorageFacade
  async getStocksWithUserStatus(userId: string, limit: number = 100): Promise<any[]> {
    throw new Error("getStocksWithUserStatus should be called on HybridStorage, not StorageFacade directly");
  }
}

