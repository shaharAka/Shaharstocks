# Storage Refactoring Analysis & Findings

## File Size
- **Current**: 4,126 lines
- **Interface Methods**: ~196 methods
- **Goal**: Reduce through repository pattern + remove redundancies

## Redundancies Identified

### 1. Redundant Stock Query Methods
- ❌ **`getStocksByStatus(userId, status)`** - NOT USED ANYWHERE (can be removed)
- ✅ **`getStocksByUserStatus(userId, status)`** - Used 2x (KEEP)
- **Action**: Remove `getStocksByStatus` from interface and implementation

### 2. Stock Deletion Methods (All Used - Keep Separate)
- ✅ `deleteExpiredPendingStocks` - Used in cleanup job
- ✅ `deleteExpiredRejectedStocks` - Used in cleanup job  
- ✅ `deleteStocksOlderThan` - Used in cleanup job
- **Note**: Could potentially be unified with parameters, but they serve different purposes. Keep as-is for clarity.

### 3. Complex Methods to Review
- **`getStocksWithUserStatus`** - ~240 lines, very complex logic. Used 4x. This is a candidate for simplification but keep for now.

## Most Used Methods (Top 20)
1. getUser - 46x
2. getUserByEmail - 34x
3. getStock - 26x
4. getStockAnalysis - 24x
5. updateStock - 21x
6. enqueueAnalysisJob - 20x
7. updateUser - 18x
8. getUserFollowedStocks - 17x
9. getStocks - 17x
10. getPortfolioHoldings - 16x
11. getPortfolioHoldingByTicker - 16x
12. createTrade - 15x
13. updateBacktestJob - 13x
14. updateOpeninsiderSyncStatus - 12x
15. getUsers - 12x
16. getIbkrConfig - 12x
17. getBacktestJob - 12x
18. markStockAnalysisPhaseComplete - 9x
19. getTelegramConfig - 9x
20. updateUserStockStatus - 8x

## Repository Creation Status

### Completed (18 repositories)
1. SystemSettingsRepository
2. TelegramConfigRepository
3. IbkrConfigRepository
4. OpeninsiderConfigRepository
5. PaymentRepository
6. StockCommentRepository
7. StockViewRepository
8. TutorialRepository
9. PasswordResetRepository
10. ManualOverrideRepository
11. NotificationRepository
12. AnnouncementRepository
13. AdminNotificationRepository
14. FeatureSuggestionRepository
15. MacroAnalysisRepository
16. StockCandlestickRepository
17. (2 more... check count)

### Remaining Large Domains
- StocksRepository (largest - ~400+ lines)
- UsersRepository (large - ~300 lines)
- PortfolioHoldingsRepository
- TradesRepository
- TradingRulesRepository
- CompoundRulesRepository
- BacktestsRepository
- OpportunitiesRepository
- StockAnalysisRepository
- AiAnalysisJobsRepository
- FollowedStocksRepository
- DailyBriefsRepository
- TickerDailyBriefsRepository
- UserStockStatusRepository

## Next Steps
1. Remove `getStocksByStatus` method (unused)
2. Continue creating repositories for remaining domains
3. Create StorageFacade that aggregates all repositories
4. Update storage.ts to use facade (or replace entirely)
5. Test to ensure nothing breaks

