# Stock Trading Dashboard - signal2

## Overview
signal2 is a professional stock trading dashboard designed for real-time portfolio tracking, automated trigger-based trading rules, and comprehensive backtesting. It features a modern, information-dense interface built with React and Express, emphasizing instant readability and quick trade execution. The system integrates real-time stock recommendations, news sentiment analysis, and automated AI-powered financial analysis from SEC EDGAR filings and Alpha Vantage fundamentals. It also includes industry-specific macro analysis by comparing stocks against relevant sector ETFs, and offers multi-user collaboration with session-based authentication, PayPal subscription payments, and Telegram integration for insider trading alerts.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
- **Design System**: shadcn/ui (New York style) with Radix UI primitives, Tailwind CSS for styling, custom CSS variables for theming (light/dark mode).
- **Typography**: Inter for UI, JetBrains Mono for numerical data.
- **Responsiveness**: Mobile-first approach with a 12-column CSS Grid layout.
  - **Mobile Optimization (Completed)**: Comprehensive 44px minimum touch target compliance across all mobile-critical flows.
    - All primary buttons: 40px (`size="lg"`) or 44px (`h-11 w-11`)
    - Icon buttons in header/navigation: 44px (`h-11 w-11`)
    - Filter, toggle, and action buttons: 40px minimum
    - Responsive layouts: Single-column mobile (sm:grid-cols-2 tablets), proper breakpoints (sm:, md:, lg:, xl:)
    - Container padding: p-4 md:p-6, consistent spacing (gap-2 md:gap-3)
    - Font sizes: text-xl md:text-2xl headers, ≥14px body text
    - Optimized pages: Portfolio, Purchase/Recommendations, Trading (Rules/Simulation), Community, Settings
    - Optimized components: StockTable, BulkActionToolbar, StockComments, AppHeader, Sidebar
- **Visuals**: Charts with auto-scaling y-axis and inline ticker labels; color-coded avatars for user interest markers.
- **Tutorials**: Interactive guided tours using react-joyride for onboarding, with session-based tracking.
  - **Non-blocking behavior**: Tutorials use `spotlightClicks={true}` and `disableOverlayClose={false}` to prevent blocking user interaction.

### Technical Implementations
- **Frontend**: React 18 with TypeScript and Vite, Wouter for routing, TanStack Query for server state management (optimistic updates, cache invalidation), React Hook Form with Zod for form validation.
- **Backend**: Express.js with TypeScript, RESTful API design, JSON body parsing, Zod schema validation.
- **Database**: PostgreSQL (Neon serverless) with Drizzle ORM for type-safe queries and migrations. Uses UUID primary keys, Decimal types for precision, JSONB for flexible data, and timestamp tracking.
- **Data Models**: Stocks, Portfolio Holdings, Trades, Trigger-based Trading Rules (with flexible scopes, conditions, actions), Backtest Jobs, Backtest Price Data, Backtest Scenarios, Telegram Config, OpenInsider Config, Users, Stock Comments.

### Feature Specifications
- **PayPal Subscription Integration**: ✅ Production-ready automatic subscription activation with secure webhook signature verification.
    - **Frontend**: PayPal JavaScript SDK integration with environment-based configuration (`VITE_PAYPAL_CLIENT_ID`, `VITE_PAYPAL_PLAN_ID`)
    - **Backend**: Webhook endpoint at `/api/webhooks/paypal` with PayPal REST API signature verification (`server/paypalWebhookVerifier.ts`)
    - **Security**: OAuth token-based verification, rejects unverified webhooks, audit logging for all webhook events
    - **Events Handled**: `BILLING.SUBSCRIPTION.ACTIVATED`, `BILLING.SUBSCRIPTION.CANCELLED`
- **Company Info & News**: Integrates Finnhub for company profiles, market cap, and news with negative sentiment detection. Excludes stocks below $500M market cap from purchase recommendations.
- **Data Sources**:
    - **Telegram**: Direct client integration via GramJS for real-time channel monitoring, parsing messages for stock recommendations.
    - **OpenInsider.com**: Python-based scraper for insider trading transactions, generating stock recommendations. Uses SHA-256 hash for duplicate prevention.
- **AI-Powered Analysis**:
    - **Dual-agent AI**: Micro Agent (SEC EDGAR, Alpha Vantage fundamentals) and Macro Agent (industry-specific ETF performance).
    - **Industry-specific Macro Analysis**: Tailors market conditions to each stock's industry using sector ETFs (e.g., XLK for Tech, XLF for Financials), with comprehensive industry-to-ETF mapping.
- **Automated Recommendation Management**: Hourly job removes old pending BUY recommendations (2 weeks), filters out options deals and data errors.
- **Purchase Recommendation Filters** (Applied to both manual fetch and hourly background job):
    - Market cap threshold: Minimum $500M (excludes small-cap stocks)
    - Note: Insider price ratio filtering (15%-200%) was removed due to stock-split adjustment issues. Relying on OpenInsider's upstream filtering instead.
- **Trading Rules**: Trigger-based system with flexible, portfolio-wide or specific-stock rules based on price changes.
- **Collaboration**: Multi-user system with stock-specific comment threads, interest markers, and filtering options for recommendations.
- **Admin Backoffice**: Comprehensive dashboard for user, subscription, and payment management (PayPal and manual), with audit trails for manual overrides, soft/hard user deletion, and secure password resets. Requires `isAdmin: true` for access and `x-admin-secret` for authentication.

## Testing

### AI Analysis Regression Suite
Comprehensive test coverage for the dual-agent (micro + macro) AI analysis system:
- **Test Framework**: Vitest with @vitest/ui
- **Coverage**: 47 tests, 100% passing ✅
- **Location**: `tests/ai-analysis/`
- **Files**: 
  - `fixtures.ts` - Mock data for all services
  - `queueWorker.test.ts` - Core pipeline tests (16 tests)
  - `triggers.test.ts` - All 5 trigger path tests (10 tests)
  - `integrated-score.test.ts` - Score calculation tests (21 tests)
- **Validation**:
  - All 5 trigger paths (onboarding, automated, fetch-now, single-run, re-run)
  - Complete micro + macro integration
  - Integrated score calculation (micro × macro, clamped 0-100)
  - Edge cases (missing data, retries, failures)
- **Run**: `npx vitest` or `npx vitest --ui`

### Known Issues & Fixes

#### AI Analysis Queue Worker Hang (Fixed - Nov 10, 2025)
**Problem**: AI analysis jobs were hanging indefinitely in "processing" state, never completing. Root cause was `getTechnicalIndicators()` fetching 7 technical indicators (RSI, MACD, Bollinger Bands, SMA 20, SMA 50, EMA 12, ATR) sequentially from Alpha Vantage API. If any single indicator request hung (commonly SMA 20), the entire analysis pipeline would freeze forever.

**Fix Applied**:
1. Added `withTimeout()` utility wrapper to prevent infinite promise hangs (15-second timeout per indicator)
2. Rewrote `getTechnicalIndicators()` to fetch all 7 indicators in parallel using `Promise.allSettled()`
3. Implemented graceful fallbacks - if any indicator times out or fails, analysis continues with neutral default values
4. Enhanced queue worker logging with iteration counts, job status emojis, and error stack traces for debugging

**Testing Notes**:
- Test suite (47 tests) uses heavy mocking and did NOT catch this production bug
- Real-world testing requires monitoring production logs after server restart
- Watch for indicators that consistently timeout (may indicate API quota issues)
- Queue worker polls every 2-10 seconds with atomic job dequeue (FOR UPDATE SKIP LOCKED)

**Architect Review**: ✅ Pass - No security issues, proper error handling, maintains pipeline behavior

## External Dependencies

- **UI Frameworks**: @radix-ui/*, shadcn/ui, Recharts, Lucide React.
- **Database & ORM**: @neondatabase/serverless, Drizzle ORM, drizzle-zod.
- **Data Management**: @tanstack/react-query, react-hook-form, zod, date-fns.
- **Development Tools**: TypeScript, Vite, ESBuild, tsx, Vitest.
- **Integration Points**:
    - **PayPal**: @paypal/checkout-server-sdk for subscription payments. REST API-based webhook verification for production security.
    - **Telegram**: GramJS for MTProto API communication.
    - **OpenInsider.com**: Python (BeautifulSoup4) for web scraping insider trading data.
    - **SEC EDGAR API**: For company filings (10-K/10-Q) and narrative sections (MD&A, Risk Factors, Business Overview).
    - **Alpha Vantage API**: For comprehensive financial fundamentals (Company Overview, Income Statement, Balance Sheet, Cash Flow, Technical Indicators) and News Sentiment.
    - **Finnhub API**: For real-time stock price updates, company profiles, market capitalization, and historical price data for backtesting.
- **Design & Styling**: Tailwind CSS, class-variance-authority (CVA), clsx, tailwind-merge, Google Fonts (Inter, Geist Mono, Fira Code).

## Recent Changes (November 12, 2025)

### Stale Stock Filtering & Cleanup System ✅
- **Status**: Fully implemented and production-ready
- **Features**:
  1. **Visual Indicators**: Stocks older than 5 days show a "{ageDays}d old" badge (secondary variant) in both card and table views
  2. **Automated Cleanup**: Daily background job deletes pending stocks older than 10 days
  3. **AI Score Filter**: New dropdown filter on purchase page (0-50 Low, 50-75 Medium, 75-100 High)
- **Backend Implementation**:
  - `shared/time.ts`: Utility functions for stock age calculations (`isStockStale`, `getStockAgeInDays`, `isStockExpired`)
  - `server/storage.ts`: Transactional `deleteExpiredPendingStocks()` with dependency checks and cascade deletes
  - `server/jobs/cleanupStaleStocks.ts`: Daily cleanup scheduler (runs on startup + every 24 hours)
  - API enhancement: `/api/stocks/with-user-status` now includes `isStale` and `ageDays` fields
- **Data Integrity**:
  - Transactional deletion with row-level locking (FOR UPDATE)
  - Pre-checks for portfolio/trade dependencies (aborts if conflicts found)
  - Cascade deletes across 6 child tables: aiAnalysisJobs → stockAnalyses → interests/views/userStatuses/comments → stocks
  - Structured logging with elapsed time, ticker lists, and child record counts
- **UI/UX**:
  - Stale badge appears next to "NEW" badge in ticker column
  - AI score filter excludes stocks without completed AI analysis when active
  - All elements have data-testid attributes for testing
- **Phase 2 Backlog**:
  - Audit log table for deleted stocks
  - Composite DB index on (recommendation_status, last_updated)
  - Retry logic and alerting for cleanup job failures
- **Architect Review**: ✅ Pass - Production-ready, no blocking defects

## Recent Changes (November 11, 2025)

### Stock Unreject/Restore & Detailed AI Progress Display ✅
- **Status**: Fixed and enhanced
- **Problem**: Rejected stock archive was not showing restored stocks in pending tab due to SQL query error in `getStocksWithUserStatus()`
- **Root Cause**: Drizzle ORM couldn't parse LATERAL join syntax for fetching latest AI analysis jobs per stock
- **Fix Applied**:
  1. Rewrote `getStocksWithUserStatus()` as two separate queries (stocks+user statuses, then AI jobs)
  2. Added `inArray` import from drizzle-orm for efficient job filtering
  3. Map AI jobs to stocks in JavaScript instead of SQL join
  4. Enhanced `AnalysisPhaseIndicator` component to display detailed substep and progress information
  5. Updated stock cards to show inline AI analysis progress (e.g., "Fetching RSI", "2/7")
- **Performance**: Two-query approach is acceptable for current ~80 stock workload; pagination can be added if volumes grow
- **Architect Review**: ✅ Pass - No security issues, proper error handling, good UX
- **Files Changed**: `server/storage.ts`, `server/routes.ts`, `client/src/components/analysis-phase-indicator.tsx`, `client/src/pages/purchase.tsx`

### PayPal Webhook Verification - PRODUCTION READY ✅
- **Status**: Implemented and tested, production-ready
- **Changes**:
  1. Created `server/paypalWebhookVerifier.ts` with REST API-based signature verification
  2. Updated `server/routes.ts` to enable webhook endpoint with security checks
  3. Moved PayPal credentials to environment variables (VITE_ prefix for frontend visibility)
  4. Updated `client/src/pages/signup.tsx` to use environment-based configuration
  5. Updated documentation (PAYPAL_INTEGRATION.md, replit.md)
- **Security**: All webhook requests verified via PayPal REST API before processing
- **Environment Variables Required**:
  - `PAYPAL_CLIENT_ID` - Server-side PayPal client ID
  - `PAYPAL_CLIENT_SECRET` - Server-side PayPal secret (never exposed to browser)
  - `PAYPAL_WEBHOOK_ID` - Webhook ID from PayPal dashboard
  - `VITE_PAYPAL_CLIENT_ID` - Frontend PayPal client ID (exposed to browser)
  - `VITE_PAYPAL_PLAN_ID` - Frontend subscription plan ID (exposed to browser)