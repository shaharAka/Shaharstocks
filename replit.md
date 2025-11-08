# Stock Trading Dashboard - TradePro

## Overview

TradePro is a professional stock trading dashboard application offering real-time portfolio tracking, automated trigger-based trading rules, backtesting capabilities, and multi-user collaboration with session-based authentication. It combines modern fintech design with Material Design for a professional, information-dense interface optimized for timely trading decisions. The system is a full-stack TypeScript application with a React frontend and Express backend, focused on instant readability, quick trade execution, and comprehensive portfolio management. Key features include real-time stock recommendations with company profiles and news sentiment analysis, automated recommendation cleanup, and integration with Telegram for insider trading alerts. Features automated AI-powered financial analysis combining SEC EDGAR narrative reports (10-K/10-Q filings with MD&A, Risk Factors, Business Overview) and Alpha Vantage comprehensive fundamentals (income statement, balance sheet, cash flow, company overview) for deep multi-signal stock analysis. Includes industry-specific macro analysis that tailors market conditions to each stock's industry (e.g., Technology stocks analyzed against XLK ETF performance, Financials against XLF).

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Fixes

**November 8, 2025 - Super Admin Backoffice Feature:**
- **Feature**: Added comprehensive admin dashboard for managing users and subscriptions
- **Access**: Only users with `isAdmin: true` can access the `/admin` route
- **Admin User**: Created super admin account (shaharro@gmail.com) with full admin privileges
- **Capabilities**:
  - View all users with subscription status, email, and admin flags
  - Activate user subscriptions manually (requires admin secret)
  - Promote users to admin status (requires admin secret)
  - Stats dashboard showing total users, active subscriptions, inactive users, and admin count
- **Security**:
  - Frontend: Admin page redirects non-admins, query gated with `enabled: !!currentUser?.isAdmin`
  - Backend: `/api/users` endpoint validates session and admin status before returning user data
  - All admin actions require `x-admin-secret` header for authentication
  - Password hashes never exposed in API responses
- **UI**: Dedicated "Admin" section in sidebar (only visible to admin users) with "Backoffice" link

**November 2, 2025 - Automatic Initial Data Fetch for New Users:**
- **Feature**: New users now automatically receive 500 OpenInsider stock recommendations on signup
- **Implementation**: Added `initialDataFetched` boolean field to users schema to track completion
- **Behavior**: Background job fetches 500 insider transactions without filters using fire-and-forget pattern
- **Impact**: New users immediately see preliminary purchase recommendations, improving onboarding experience
- **Technical Details**: User creation endpoint responds immediately; data fetch runs asynchronously with proper error handling and duplicate prevention

**November 2, 2025 - Fixed Multi-User Simulate Feature Bug:**
- **Issue**: Simulated holdings were being created with NULL user_id, making them invisible on the Simulation page
- **Root Cause**: The `userId` field in `portfolioHoldings` and `trades` schemas was nullable (missing `.notNull()` constraint)
- **Solution**: Updated schema to make `userId` required with `.notNull()` constraint in both tables
- **Impact**: All new simulated holdings now properly track which user created them, enabling correct filtering on the Simulation page

## System Architecture

### Frontend Architecture

**Framework & Build System:**
- React 18 with TypeScript and Vite.
- Wouter for client-side routing.
- Custom Vite setup for SSR-ready architecture.

**UI Component System:**
- shadcn/ui (New York style) with Radix UI primitives.
- Tailwind CSS for styling with custom design tokens.
- Custom CSS variables for theme support (light/dark mode).

**State Management:**
- TanStack Query (React Query) v5 for server state management with optimistic updates and cache invalidation.
- React Hook Form with Zod for form validation.

**Design System:**
- Typography: Inter for UI, JetBrains Mono for numerical data.
- Color system: HSL-based.
- Responsive breakpoints: mobile-first approach.
- 12-column CSS Grid layout.

**Key Pages:**
- Dashboard, Stocks, History, Rules, Backtesting.

### Backend Architecture

**Server Framework:**
- Express.js with TypeScript.
- RESTful API design.

**API Structure:**
- Endpoints for stocks, portfolio, trades, rules, backtests, and Telegram configuration/status/authentication.

**Request/Response Handling:**
- JSON body parsing, standardized error responses, Zod schema validation.

### Data Storage

**ORM & Database:**
- PostgreSQL (Neon serverless) using Drizzle ORM for type-safe queries and migrations.
- Schema-first approach with TypeScript types generated from Drizzle schemas.

**Data Models:**
- Stocks (with market data, recommendations, confidence scores), Portfolio Holdings, Trades, Trigger-based Trading Rules (with flexible scopes, conditions, and actions), Backtest Jobs (with selectable data source: telegram or openinsider), Backtest Price Data, Backtest Scenarios, Telegram Config (for channel monitoring), OpenInsider Config (for web scraping configuration), Users (for collaboration), and Stock Comments (for team discussion on recommendations).

**Schema Patterns:**
- UUID primary keys, Decimal types for financial precision, JSONB for flexible data, Timestamp tracking.

### Core System Logic & Features

**Company Information & News Intelligence:**
- Integration with Finnhub for comprehensive company profiles (description, industry, country, IPO date) and market capitalization.
- Latest news feed with negative sentiment detection (e.g., bankruptcy, fraud) triggering warnings on BUY recommendations.
- Background jobs fetch quotes, profiles, and news every 5 minutes.
- Stocks below $500M market cap are excluded from purchase recommendations.

**Data Source Integration:**
- **Telegram**: Direct Telegram client integration via GramJS for real-time channel monitoring. Web-based authentication flow in Settings page. Automatic parsing of messages to extract ticker symbols, recommendations, prices, and confidence scores. New messages automatically create stock recommendations on the Purchase page. Hourly background job to fetch last 20 messages for comprehensive coverage.
- **OpenInsider.com**: Python-based scraper (BeautifulSoup4) fetches latest insider trading transactions directly from OpenInsider.com. Includes retry logic with exponential backoff for robustness. Parses purchase transactions with ticker, price, quantity, and filing dates. Converts transactions to unified message format compatible with backtest pipeline. Uses deterministic SHA-256 hash-based message IDs (from ticker + filingDate + insiderName + quantity + price) to prevent duplicates while avoiding collisions. Configurable via Settings page (enable/disable, fetch limit 1-100). Hourly background job fetches transactions and creates stock recommendations on the Purchase page. Both Telegram and OpenInsider can operate simultaneously as independent data sources.

**Industry-Specific Macro Analysis:**
- Dual-agent AI system: Micro Agent analyzes individual stocks using SEC EDGAR and Alpha Vantage fundamentals; Macro Agent provides industry-specific market analysis.
- Each stock gets macro analysis tailored to its industry by fetching performance data from corresponding sector ETFs (XLK for Technology, XLF for Financials, XLV for Healthcare, etc.).
- Comprehensive industry-to-ETF mapping (30+ variations) covers Alpha Vantage and Finnhub naming conventions with case-insensitive normalization.
- Macro analysis cached by industry for 7 days to optimize API usage while maintaining timely industry-specific insights.
- Final stock score integrates both agents: (micro score × industry-specific macro factor), clamped to 0-100 range.

**Automated Recommendation Management:**
- Hourly background job removes pending BUY recommendations older than 2 weeks.
- Price updates only track stocks in pending BUY recommendations every 5 minutes using Finnhub.
- Filters out likely options deals from purchase recommendations (insider purchase price < 0.15 * current stock price).

**Trading Rules:**
- Refactored to trigger-based system with flexible, portfolio-wide or specific-stock rules.
- Scope types: All Holdings, Specific Stock.
- Condition types: Price Change %, Price Change from Close %, Absolute Price.
- Action types: quantity (shares) or percentage of position.

**Management Page Enhancements:**
- Chart y-axis automatically scales to include stock prices and trading rule boundaries.
- Inline ticker labels on charts and filter controls for selected stocks.

**Collaboration Features:**
- Multi-user system with two active users: Yotam and Shahar.
- Stock-specific comment threads on Purchase page for team discussion and analysis.
- Each comment displays author name, color-coded avatar, and relative timestamp.
- Collapsible discussion section on each stock card for organized conversation history.
- Comments persist across sessions and are tied to specific stock tickers.
- **Interest Markers**: Users can mark stocks as "interesting" with a single click using color-coded avatar buttons.
- **Interest Filtering**: Filter purchase recommendations by who's interested: "Yotam", "Shahar", "Both", or "All Stocks".
- Visual indicators show who marked each stock as interesting directly on the stock card.

**Tutorial System:**
- Interactive guided tours using react-joyride for new user onboarding.
- Automatically shows on first visit to each page with contextual help steps.
- Help button in navigation header allows users to replay tutorials anytime.
- Session-based tracking of completed tutorials per user in PostgreSQL.
- Tutorial configurations for all pages: Dashboard, Purchase, Management, History, Rules, Simulation, Settings.
- Each tutorial includes step-by-step guidance highlighting key interface elements and features.
- Custom styling matching application theme with primary color accents.

## External Dependencies

**UI Framework Components:**
- @radix-ui/*
- shadcn/ui
- Recharts
- Lucide React

**Database & ORM:**
- @neondatabase/serverless
- Drizzle ORM
- drizzle-zod

**Data Management:**
- @tanstack/react-query
- react-hook-form
- zod
- date-fns

**Development Tools:**
- TypeScript
- Vite
- ESBuild
- tsx

**Integration Points:**
- Telegram direct client integration (GramJS) for MTProto API communication.
  - Requires user-authenticated session via an out-of-band authentication script to generate session strings.
- OpenInsider.com scraper (Python + BeautifulSoup4) for insider trading data.
  - Web scraping with retry logic and exponential backoff for reliability.
  - Path resolution checks multiple locations (dist/, server/, workspace root) to support both development and production deployments.
  - Replit deployments include full source code snapshot, ensuring Python script availability in production.
- SEC EDGAR API for comprehensive company filings and narrative sections.
  - Direct integration with SEC's public API (no authentication required).
  - Fetches latest 10-K or 10-Q filings for deep fundamental analysis.
  - Extracts narrative sections: Management Discussion & Analysis (MD&A), Risk Factors, and Business Overview.
  - CIK (Central Index Key) lookup from ticker symbol using SEC's company_tickers.json endpoint.
  - Graceful degradation when filings are not available.
- Alpha Vantage API for comprehensive financial fundamentals and market data.
  - Premium tier: 75 calls/minute (1-second delays for rate limiting).
  - Company Overview: sector, market cap, P/E ratio, PEG ratio, profit margin, ROE, debt-to-equity, current ratio.
  - Income Statement: annual and quarterly reports with revenue, gross profit, net income, EBITDA.
  - Balance Sheet: annual and quarterly reports with assets, liabilities, equity, cash, long-term debt.
  - Cash Flow: annual and quarterly reports with operating cash flow, capital expenditures, free cash flow.
  - Technical Indicators: RSI, MACD, Bollinger Bands, SMA, EMA, ATR.
  - News Sentiment: latest news with sentiment analysis and relevance scores.
  - Graceful degradation when fundamental data is not available for a ticker.
- Finnhub API for real-time stock price updates, company profiles, market capitalization, and historical price data for backtesting.
  - Free tier: 60 calls/minute (1-second delays for rate limiting).
  - Provides historical daily candles (OHLCV) for backtesting simulations.

**Design & Styling:**
- Tailwind CSS
- class-variance-authority (CVA)
- clsx & tailwind-merge
- Google Fonts (Inter, Geist Mono, Fira Code)