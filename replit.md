# Stock Trading Dashboard - TradePro

## Overview
TradePro is a professional stock trading dashboard designed for real-time portfolio tracking, automated trigger-based trading rules, and comprehensive backtesting. It features a modern, information-dense interface built with React and Express, emphasizing instant readability and quick trade execution. The system integrates real-time stock recommendations, news sentiment analysis, and automated AI-powered financial analysis from SEC EDGAR filings and Alpha Vantage fundamentals. It also includes industry-specific macro analysis by comparing stocks against relevant sector ETFs, and offers multi-user collaboration with session-based authentication and Telegram integration for insider trading alerts.

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

### Technical Implementations
- **Frontend**: React 18 with TypeScript and Vite, Wouter for routing, TanStack Query for server state management (optimistic updates, cache invalidation), React Hook Form with Zod for form validation.
- **Backend**: Express.js with TypeScript, RESTful API design, JSON body parsing, Zod schema validation.
- **Database**: PostgreSQL (Neon serverless) with Drizzle ORM for type-safe queries and migrations. Uses UUID primary keys, Decimal types for precision, JSONB for flexible data, and timestamp tracking.
- **Data Models**: Stocks, Portfolio Holdings, Trades, Trigger-based Trading Rules (with flexible scopes, conditions, actions), Backtest Jobs, Backtest Price Data, Backtest Scenarios, Telegram Config, OpenInsider Config, Users, Stock Comments.

### Feature Specifications
- **Company Info & News**: Integrates Finnhub for company profiles, market cap, and news with negative sentiment detection. Excludes stocks below $500M market cap from purchase recommendations.
- **Data Sources**:
    - **Telegram**: Direct client integration via GramJS for real-time channel monitoring, parsing messages for stock recommendations.
    - **OpenInsider.com**: Python-based scraper for insider trading transactions, generating stock recommendations. Uses SHA-256 hash for duplicate prevention.
- **AI-Powered Analysis**:
    - **Dual-agent AI**: Micro Agent (SEC EDGAR, Alpha Vantage fundamentals) and Macro Agent (industry-specific ETF performance).
    - **Industry-specific Macro Analysis**: Tailors market conditions to each stock's industry using sector ETFs (e.g., XLK for Tech, XLF for Financials), with comprehensive industry-to-ETF mapping.
- **Automated Recommendation Management**: Hourly job removes old pending BUY recommendations (2 weeks), filters out options deals and data errors.
- **Purchase Recommendation Filters**: 
    - Market cap threshold: Minimum $500M (excludes small-cap stocks)
    - Insider price ratio: 15%-200% of current price (filters out options deals where insider paid <15%, and data errors/unusual options exercises where insider paid >200%)
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

## External Dependencies

- **UI Frameworks**: @radix-ui/*, shadcn/ui, Recharts, Lucide React.
- **Database & ORM**: @neondatabase/serverless, Drizzle ORM, drizzle-zod.
- **Data Management**: @tanstack/react-query, react-hook-form, zod, date-fns.
- **Development Tools**: TypeScript, Vite, ESBuild, tsx, Vitest.
- **Integration Points**:
    - **Telegram**: GramJS for MTProto API communication.
    - **OpenInsider.com**: Python (BeautifulSoup4) for web scraping insider trading data.
    - **SEC EDGAR API**: For company filings (10-K/10-Q) and narrative sections (MD&A, Risk Factors, Business Overview).
    - **Alpha Vantage API**: For comprehensive financial fundamentals (Company Overview, Income Statement, Balance Sheet, Cash Flow, Technical Indicators) and News Sentiment.
    - **Finnhub API**: For real-time stock price updates, company profiles, market capitalization, and historical price data for backtesting.
- **Design & Styling**: Tailwind CSS, class-variance-authority (CVA), clsx, tailwind-merge, Google Fonts (Inter, Geist Mono, Fira Code).