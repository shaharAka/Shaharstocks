# Stock Trading Dashboard - signal2

## Overview
signal2 is a professional stock trading dashboard offering real-time portfolio tracking, automated trigger-based trading, and comprehensive backtesting. It features a modern interface, integrates real-time stock recommendations, news sentiment, and AI-powered financial analysis from SEC EDGAR filings and Alpha Vantage. The system includes industry-specific macro analysis using sector ETFs, supports multi-user collaboration, PayPal subscriptions, Telegram integration for insider alerts, and intelligent, deduplicated notifications for high-value trading opportunities. The project aims to provide a minimalistic landing page prioritizing high-signal alerts, with advanced tools for deeper analysis.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The UI/UX utilizes shadcn/ui (New York style), Radix UI primitives, and Tailwind CSS for styling, supporting light/dark modes. Typography uses Inter for UI and JetBrains Mono for numerical data. It employs a mobile-first, 12-column CSS Grid layout for responsiveness. Visuals include auto-scaling charts, color-coded avatars, and interactive guided tours (`react-joyride`) managed by a `TutorialManager` component. The design emphasizes consistency with unified iconography, amber accents for signals, and green/red for price changes, and generous whitespace.

### Critical Architecture Decisions
- **Per-User Tenant Isolation**: Each user has their own isolated stock collection with a `userId` foreign key, ensuring data privacy and efficient per-user queries. All stock CRUD methods require a `userId`. Background jobs fan out shared market data to all users' instances of a ticker while maintaining user isolation.
- **Session Security & Data Isolation**: Full page reloads on authentication state changes prevent cross-user data contamination.
- **WebSocket Push Notification System**: Replaces aggressive polling with real-time, event-driven WebSocket communication for instant UI updates.
- **Database-Level Race Prevention**: Utilizes partial unique indexes on `aiAnalysisJobs(ticker)` where status is 'pending' or 'processing' to prevent duplicate AI analysis jobs.
- **Candlestick Data Architecture**: Candlestick data is stored once per ticker in a shared `stockCandlesticks` table and populated via daily background jobs, immediate fire-and-forget fetches on new stock follows, and on-demand frontend API requests.

### Technical Implementations
- **Frontend**: React 18, TypeScript, Vite, Wouter for routing, TanStack Query for server state management (with optimistic updates and user-scoped cache keys), React Hook Form with Zod for validation.
- **Backend**: Express.js with TypeScript, RESTful API design, JSON body parsing, Zod schema validation.
- **Database**: PostgreSQL (Neon serverless) with Drizzle ORM for type-safe queries, migrations, UUID primary keys, Decimal types, JSONB, and timestamp tracking.
- **Data Models**: Key entities include Stocks (per-user isolation), Portfolio Holdings, Trades, Trigger-based Trading Rules, Backtest Jobs/Price Data/Scenarios, Telegram Config, OpenInsider Config, Users, and Stock Comments.
- **Cache Isolation**: User-scoped cache keys and custom query functions prevent cross-user data contamination.

### Feature Specifications
- **AI-Powered Analysis (Simplified Signal Score + Playbook)**: Direct LLM evaluation replaces the previous rule-based scorecard system. The AI receives ALL available data (fundamentals, technicals, sentiment, news, insider transactions, timing) and produces:
  1. **Signal Score (1-100)**: Relevance of insider transaction to 1-2 week profit opportunity
  2. **Playbook**: Actionable guidance with specific data references and clear ENTER/WATCH/AVOID recommendations
  Multi-provider architecture supports OpenAI GPT and Google Gemini with admin-configurable runtime switching. Macro analysis factor optionally adjusts the final score. When refreshing analysis, previous results are deleted and recalculated fresh.
  - **Automatic Fallback Chain**: When a model fails (quota/rate limit), automatically tries the next model in order:
    1. gemini-3-pro-preview (primary)
    2. gpt-5.2
    3. gemini-3-flash-preview
    4. gpt-5
  The `generateWithFallback()` function handles this transparently across all AI analysis services.
- **Automated Recommendation Management**: Hourly job filters and removes old pending BUY recommendations and options deals.
- **Collaboration**: Multi-user system with stock-specific comment threads and recommendation filtering.
- **Adaptive Stock Fetching**: Stock fetch limits adjust based on user onboarding and configuration, with customizable OpenInsider filters.
- **Follow Stock System**: Comprehensive follow/unfollow functionality with duplicate prevention, visual indicators, and automatic Day-0 AI analysis.
- **Admin Backoffice**: Comprehensive dashboard for user, subscription, and payment management with audit trails, soft/hard deletion, password resets, and a two-tier admin system, including an Announcement System.
- **Daily Stock Briefs**: Lightweight daily trading reports for followed stocks with position-aware single-scenario display. Users can toggle between "Watching" and "In Position" modes.
- **Intelligent Notification System**: Real-time, deduplicated alerts for high-value trading opportunities with distinct UI badging.
- **Position Tracking with P&L Calculation**: Users can close positions with calculated P&L, displayed as total realized gains/losses on the dashboard.
- **Onboarding Flow**: 4-step onboarding with automatic data fetching, visual feedback for fetch status, and educational content. Uses a reduced fetch limit (50 max) during onboarding for faster completion.
- **Tutorial System**: Manual-only tutorials, triggered by user interaction, with enhanced element targeting and simplified content.
- **AI Analysis UX**: Compact signal badge in overview, detailed AI Playbook in a dedicated tab, amber gradient system for signal strength, and plain language.
- **Fetch Configuration**: Simplified dialog for data ingestion settings, defaulting to daily refresh, with display preferences managed on the Opportunities page.
- **Unified Global Opportunities System**: Replaces per-user data fetching with a global opportunities system where ALL users see the SAME insider trading opportunities. Key features:
  - **Global Data**: Opportunities stored without userId - fetched once, shared by all users
  - **Tier-Based Filtering**: Free/trial users see daily opportunities (fetched at 00:00 UTC), Pro users see both daily AND hourly opportunities
  - **Opportunity Visibility Rules**: Opportunities are shown to users UNLESS:
    - User has dismissed it (stored in `user_opportunity_rejections` table)
    - User is already following the ticker (moves to Following page)
    - Insider trade date is more than 12 days old (auto-filtered)
  - **Efficient API Usage**: Per-ticker caching during batch fetches minimizes Alpha Vantage API calls (2*uniqueTickers instead of 2N)
  - **Duplicate Prevention**: Same transaction can exist in different cadence batches via cadence-aware duplicate detection
  - **Database Tables**: `opportunities` (global), `opportunity_batches` (fetch tracking), `user_opportunity_rejections` (per-user dismissals)
  - **API Endpoint**: `GET /api/opportunities` with automatic tier detection for logged-in users
  - **Timer Display**: Always shows countdown to next fetch (next hour for Pro, next midnight UTC for Free) even when no previous batch exists

## External Dependencies

- **UI Frameworks**: @radix-ui/*, shadcn/ui, Recharts, Lucide React.
- **Database & ORM**: @neondatabase/serverless, Drizzle ORM, drizzle-zod.
- **Data Management**: @tanstack/react-query, react-hook-form, zod, date-fns.
- **Integration Points**:
    - **PayPal**: Centralized `paypalService.ts` handles subscription management including webhook verification, automatic subscription cancellation on account archive/deletion, payment history retrieval, and subscription details. Token caching improves API efficiency.
    - **Telegram**: GramJS for MTProto API communication.
    - **SEC Insider Trading Filings**: Automated collection from SEC regulatory data sources.
    - **SEC EDGAR API**: For company filings.
    - **Alpha Vantage API (Pro License)**: Used exclusively for all stock market data including real-time quotes, company profiles, market cap, historical prices, technical indicators, news sentiment, and fundamental data. Pro license provides 75 requests/minute with 20+ years of historical data. The service is implemented in `server/finnhubService.ts` (kept for backward compatibility) but uses Alpha Vantage endpoints.