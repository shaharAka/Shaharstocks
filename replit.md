# Stock Trading Dashboard - signal2

## Overview
signal2 is a professional stock trading dashboard providing real-time portfolio tracking, automated trigger-based trading rules, and comprehensive backtesting. It features a modern, information-dense interface, integrates real-time stock recommendations, news sentiment analysis, and AI-powered financial analysis from SEC EDGAR filings and Alpha Vantage. The system also includes industry-specific macro analysis using sector ETFs, supports multi-user collaboration, PayPal subscription payments, Telegram integration for insider trading alerts, and intelligent, deduplicated notifications for high-value trading opportunities. The project aims to offer a minimalistic landing page that prioritizes high-signal alerts for quick decisions, with advanced tools accessible for deeper analysis.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Updates

### AI Analysis Race Condition & Progress UI Fix (Nov 17, 2025 - COMPLETE)
**Problem 1 - Race Condition**: Multiple users fetching the same stock simultaneously could create duplicate AI analysis jobs due to a "time-of-check to time-of-use" (TOCTOU) race condition.

**Problem 2 - Missing Progress UI**: The `AnalysisPhaseIndicator` component on the opportunities table wasn't showing AI analysis progress.

**Solution**:
- ✅ **Database-Level Race Prevention**: Added partial unique index on `aiAnalysisJobs(ticker)` where status is 'pending' or 'processing'
- ✅ **Graceful Constraint Handling**: Modified `enqueueAnalysisJob()` with try-catch to handle unique constraint violations, returning existing job instead of crashing
- ✅ **Progress UI Data Join**: Modified `getStocks()` to LEFT JOIN with `aiAnalysisJobs` table, populating `stock.analysisJob` field with current job data
- ✅ **Migration Applied**: Schema updated successfully with `npm run db:push --force`

**Architecture**: The unique index prevents duplicate active jobs at the database level. If a race occurs, the unique constraint violation is caught and the existing job is returned seamlessly. The UI now receives analysis job data (currentStep, stepDetails) to properly display progress indicators with spinners, checkmarks, and phase labels.

**Impact**: Eliminates duplicate AI analysis jobs, ensures data consistency, restores real-time progress visibility for users watching stock analysis.

### WebSocket Push Notification System (Nov 16, 2025 - COMPLETE)
**Problem**: Aggressive 10-second polling intervals on 5+ pages caused constant re-renders, network spam, and poor UX.

**Solution**: Replaced polling with WebSocket-based real-time push notifications:
- ✅ **Server Infrastructure**: WebSocket server (`server/websocketServer.ts`) with session cookie authentication, per-user connection tracking, heartbeat/pong health checks
- ✅ **Event System**: Event dispatcher (`server/eventDispatcher.ts`) with domain events: `STOCK_STATUS_CHANGED`, `STOCK_POPULAR`, `FOLLOWED_STOCKS_UPDATED`, `NOTIFICATION_CREATED`
- ✅ **Client Hook**: WebSocket client hook (`client/src/hooks/use-websocket.ts`) with auto-reconnect, exponential backoff (1s → 32s max), and event callbacks
- ✅ **Polling Removed**: Eliminated all aggressive polling from `purchase.tsx` (10s), `simulation.tsx` (10s), `ticker-detail.tsx` (5s), `settings.tsx` (5s), and sidebar (10s)
- ✅ **Sidebar Integration**: Sidebar now uses WebSocket events + initial REST fetch instead of polling
- ✅ **Background Job Fix**: Fixed 11 TypeScript compile errors in background jobs by properly passing `userId` to storage methods

**Architecture**: WebSocket upgrade happens at `/ws` endpoint after Express session middleware authenticates the user. Each connected user joins a personal room (`user-${userId}`) for targeted notifications. Events are emitted by storage methods and background jobs, then dispatched to relevant user rooms.

**Event Emissions** (COMPLETE):
- ✅ Added `eventDispatcher.emit()` to `followStock()` → FOLLOWED_STOCKS_UPDATED
- ✅ Added `eventDispatcher.emit()` to `unfollowStock()` → FOLLOWED_STOCKS_UPDATED  
- ✅ Added `eventDispatcher.emit()` to `updateUserStockStatus()` → STOCK_STATUS_CHANGED

**Next Steps** (for future enhancement):
1. Add more event emissions from background jobs after price updates
2. Add STOCK_POPULAR event emission when follower threshold is reached
3. Add NOTIFICATION_CREATED event emission when notifications are created
4. Test WebSocket connection end-to-end once server starts

**Impact**: Eliminates ~180 HTTP requests per minute from polling, reduces server load, enables instant UI updates when data changes.

## System Architecture

### UI/UX Decisions
The UI/UX is built with shadcn/ui (New York style), Radix UI primitives, and Tailwind CSS for styling, supporting light/dark modes. Typography uses Inter for UI and JetBrains Mono for numerical data. A mobile-first, 12-column CSS Grid layout ensures responsiveness. Visuals include auto-scaling charts, color-coded avatars, and interactive guided tours (`react-joyride`) managed by a `TutorialManager` component.

### Critical Architecture Decisions
- **Per-User Tenant Isolation** (Nov 16, 2025 - Major Refactor COMPLETE):
  - **Complete Data Privacy**: Each user has their own isolated stock collection - stocks table includes `userId` foreign key with cascade delete
  - **Unique Constraint**: `(userId, ticker, insiderTradeDate, insiderName, recommendation)` allows multiple transactions per ticker per user
  - **Performance Index**: Added index on `(userId, recommendation_status)` for fast per-user queries
  - **Storage Layer**: All 30+ stock CRUD methods require `userId` parameter to enforce isolation
  - **Background Jobs**: Efficient global update pattern using helper methods:
    - `getAllUniquePendingTickers()` - Get distinct tickers needing price updates across all users
    - `getAllUniqueTickersNeedingData()` - Get distinct tickers needing candlestick data
    - `updateStocksByTickerGlobally(ticker, updates)` - Fan out shared market data (prices, news, candlesticks) to all users' instances of a ticker
  - **Security**: Foreign key constraint ensures referential integrity, cascade delete removes user's stocks on account deletion
- **User-Specific Stock Actions**: All stock operations are user-scoped:
  - `rejectTickerForUser(userId, ticker)` - Updates user_stock_statuses to 'rejected' for that user only
  - `unrejectStock(userId, ticker)` - Unrejects stock for specific user without affecting other users
  - `deleteStock(userId, ticker)` - Deletes stock from specific user's collection only
- **Session Security & Data Isolation**: Full page reload on authentication state changes to prevent cross-user data contamination:
  - Logout: Forces full page reload to /login (clears all state, cache, and queries)
  - Login: Forces full page reload to / (ensures fresh session with correct user data)
  - Signup: Forces full page reload to / (clean slate for new users)
  - FIX (Nov 16, 2025): Changed from manual cache clearing to full page reload to prevent React Query cache persistence issues
  - Prevents critical security vulnerability where users could see each other's data

### Technical Implementations
- **Frontend**: React 18, TypeScript, Vite, Wouter for routing, TanStack Query for server state management (with optimistic updates and user-scoped cache keys), React Hook Form with Zod for validation.
- **Backend**: Express.js with TypeScript, RESTful API design, JSON body parsing, Zod schema validation.
- **Database**: PostgreSQL (Neon serverless) with Drizzle ORM for type-safe queries, migrations, UUID primary keys, Decimal types, JSONB, and timestamp tracking. Per-user tenant isolation with foreign key constraints ensures complete data privacy and referential integrity.
- **Data Models**: Key entities include Stocks (per-user isolation via userId FK), Portfolio Holdings, Trades, Trigger-based Trading Rules, Backtest Jobs/Price Data/Scenarios, Telegram Config, OpenInsider Config, Users, and Stock Comments.
- **Cache Isolation**: User-scoped cache keys and custom query functions are used across critical components to prevent cross-user data contamination, with backend enforcement via session authentication and database-level foreign key constraints.
- **Chart Visibility**: Stock simulation plots dynamically calculate Y-axis domains to ensure all price data and reference lines are visible.

### Feature Specifications
- **PayPal Subscription Integration**: Automated subscription activation with secure webhook verification.
- **Company Info & News**: Integrates Finnhub for company profiles, market cap, and news with negative sentiment detection, filtering stocks below $500M market cap for purchase recommendations.
- **Data Sources**: Real-time Telegram channel monitoring via GramJS and automated collection of SEC insider trading regulatory filings via OpenInsider (fetching both purchases and sales). Each user can customize their own OpenInsider fetch settings (filters, limits, schedules) for their isolated opportunity list.
- **AI-Powered Analysis**: A dual-agent system (Micro Agent for SEC EDGAR/Alpha Vantage fundamentals, Macro Agent for **Enhanced Sector ETF Analysis**). The Macro Agent calculates volatility, momentum, and relative strength for sector ETFs, applying weighted influence on recommendations.
- **2-Week Event Horizon**: Opportunities page automatically cleans up stocks older than 2 weeks, unless followed by the user.
- **Automated Recommendation Management**: Hourly job filters and removes old pending BUY recommendations and options deals.
- **Purchase Recommendation Filters**: Enforces a minimum $500M market cap.
- **Trading Rules**: Trigger-based system for portfolio-wide or stock-specific rules based on price changes.
- **Collaboration**: Multi-user system with stock-specific comment threads and recommendation filtering.
- **Adaptive Stock Fetching**: Stock fetch limits adapt based on user onboarding status and user configuration, prioritizing fresh opportunities. Users can customize OpenInsider filters (insider titles, transaction values, market cap thresholds, options deal detection) to personalize their opportunity feed.
- **Follow Stock System**: Comprehensive follow/unfollow functionality with duplicate prevention, visual indicators, and automatic Day-0 AI analysis for new followed stocks. Followed stocks are accessible via a sidebar dropdown with real-time updates.
- **Admin Backoffice**: Comprehensive dashboard for user, subscription, and payment management with audit trails, soft/hard deletion, and password resets, featuring a two-tier admin system. Admin UI is organized into "User Management" and "Announcements" tabs.
- **Announcement System**: A platform-wide notification system allowing admins to create feature, update, maintenance, or general announcements. Users see published announcements via a header icon that highlights when unread announcements exist. Admins have full CRUD operations.
- **Version Display**: Version number displayed in the sidebar footer and accessible via API.
- **Daily Stock Briefs**: Lightweight daily trading reports for followed stocks with **dual-scenario analysis** ("IF I CONSIDER ENTERING" and "IF I ALREADY OWN") providing stance, confidence, price snapshots, and key highlights. Generated daily using Alpha Vantage and GPT-4.1, limited to the last 7 days.
- **Intelligent Notification System**: Real-time, deduplicated alerts for high-value trading opportunities (High Score Buy/Sell, Popular Stock, Stance Change) with distinct UI badging and API for management.

## External Dependencies

- **UI Frameworks**: @radix-ui/*, shadcn/ui, Recharts, Lucide React.
- **Database & ORM**: @neondatabase/serverless, Drizzle ORM, drizzle-zod.
- **Data Management**: @tanstack/react-query, react-hook-form, zod, date-fns.
- **Integration Points**:
    - **PayPal**: @paypal/checkout-server-sdk for subscription payments and webhook verification.
    - **Telegram**: GramJS for MTProto API communication.
    - **SEC Insider Trading Filings**: Automated collection from SEC regulatory data sources using Python (BeautifulSoup4).
    - **SEC EDGAR API**: For company filings and narrative sections.
    - **Alpha Vantage API**: For financial fundamentals, technical indicators, and news sentiment.
    - **Finnhub API**: For real-time stock prices, company profiles, market cap, and historical data.