# Stock Trading Dashboard - signal2

## Overview
signal2 is a professional stock trading dashboard offering real-time portfolio tracking, automated trigger-based trading rules, and comprehensive backtesting. It features a modern, information-dense interface for quick readability and trade execution. The system integrates real-time stock recommendations, news sentiment analysis, and AI-powered financial analysis from SEC EDGAR filings, Alpha Vantage fundamentals, and industry-specific macro analysis using sector ETFs. It supports multi-user collaboration, PayPal subscription payments, Telegram integration for insider trading alerts, and intelligent notifications with automatic deduplication for high-value trading opportunities.

## UX Philosophy
**Minimalistic landing page pushing high-signal alerts for quick decisions**: The primary flow prioritizes showing urgent opportunities with minimal friction. Users see filtered, high-quality recommendations immediately with prominent approve/reject actions. Advanced tools (AI analysis, simulations, what-if scenarios, detailed charts) are accessible but not prominent—users seeking depth can activate them via "Deep Dive" modals or navigate to advanced sections.

**Navigation Flow**: 📊 Opportunities (landing, quick decisions) → 🔬 Analysis (advanced: Simulation + What-If Rules) → ⭐ Watchlist (advanced: Tracked Stocks + Active Alerts + History).

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The UI/UX is built with shadcn/ui (New York style), Radix UI primitives, and Tailwind CSS for styling, supporting light/dark modes. Typography uses Inter for UI and JetBrains Mono for numerical data. A mobile-first, 12-column CSS Grid layout ensures responsiveness, with comprehensive mobile optimization for touch targets and responsive layouts across all critical components. Visuals include auto-scaling charts, color-coded avatars, and interactive guided tours using `react-joyride` for onboarding. **Tutorial System**: Centralized TutorialManager component maps routes to tutorials, enabling global help button to trigger context-appropriate tours from any page. Auto-starts on first visit, supports manual replay via help button, and preserves state during tab navigation.

### Technical Implementations
- **Frontend**: React 18, TypeScript, Vite, Wouter for routing, TanStack Query for server state management (optimistic updates, cache invalidation), React Hook Form with Zod for validation.
- **Backend**: Express.js with TypeScript, RESTful API design, JSON body parsing, Zod schema validation.
- **Database**: PostgreSQL (Neon serverless) with Drizzle ORM for type-safe queries and migrations, utilizing UUID primary keys, Decimal types, JSONB, and timestamp tracking.
- **Data Models**: Key entities include Stocks, Portfolio Holdings, Trades, Trigger-based Trading Rules (flexible scopes, conditions, actions), Backtest Jobs/Price Data/Scenarios, Telegram Config, OpenInsider Config, Users, and Stock Comments.

### Feature Specifications
- **PayPal Subscription Integration**: Production-ready automated subscription activation with secure webhook verification.
- **Company Info & News**: Integrates Finnhub for company profiles, market cap, and news with negative sentiment detection; excludes stocks below $500M market cap from purchase recommendations.
- **Data Sources**: Real-time Telegram channel monitoring via GramJS and Python-based scraping of OpenInsider.com for insider trading data.
- **AI-Powered Analysis**: Dual-agent system comprising a Micro Agent (SEC EDGAR, Alpha Vantage fundamentals) and a Macro Agent (industry-specific ETF performance) for comprehensive financial analysis.
- **2-Week Event Horizon**: Opportunities page implements automatic cleanup of stocks older than 2 weeks (based on insider trade date). Old stocks are automatically removed from the board UNLESS the user is following them. Python scraper limited to fetching transactions from last 2 weeks maximum. Daily cleanup job removes stale non-followed stocks while preserving followed stocks indefinitely.
- **Automated Recommendation Management**: Hourly job filters and removes old pending BUY recommendations and options deals.
- **Purchase Recommendation Filters**: Enforces a minimum $500M market cap.
- **Trading Rules**: Trigger-based system for portfolio-wide or stock-specific rules based on price changes.
- **Collaboration**: Multi-user system with stock-specific comment threads, interest markers, and recommendation filtering.
- **Adaptive Stock Fetching**: Stock fetch limit adapts based on user onboarding status—500 stocks during onboarding for comprehensive exploration, then user-configurable limit (default 100) for focused daily trading. Stocks sorted by latest insider trade date (descending) to prioritize fresh opportunities.
- **Follow Stock System**: Comprehensive follow/unfollow functionality with duplicate prevention and visual indicators. Backend validates against existing follows and returns 409 status for duplicates. Frontend displays appropriate Follow/Unfollow buttons on ticker detail pages based on current follow status, with filled Star icons for quick identification of followed stocks in both card and table views. Bulk follow operations filter out already-followed stocks and provide detailed feedback about partial selections. Day-0 AI analysis automatically triggered when following new stocks. Followed stocks accessible exclusively via sidebar dropdown menu with real-time price updates and stance indicators; dedicated Following page removed for streamlined navigation.
- **Admin Backoffice**: Comprehensive dashboard for user, subscription, and payment management with audit trails, soft/hard user deletion, and secure password resets. Two-tier admin system: regular admins can manage users/subscriptions, super admins (isSuperAdmin field) can additionally delete announcements and perform elevated operations. **Admin UI Structure**: Organized using Shadcn Tabs component with two tabs - "User Management" tab (stats grid + users card) and "Announcements" tab (announcements management card), with all dialogs accessible from both tabs.
- **Announcement System**: Beamer-like notification system allowing admins to create platform-wide announcements (feature, update, maintenance, general types) visible to all users via Gift icon popover in header. Gift icon highlights in **purple** (text-purple-500/400) when unread announcements exist. Announcements auto-mark all as read immediately upon popover open with optimistic UI updates. Admin panel provides full CRUD operations (create, edit, delete, draft/published toggle) with edit dialog reuse, status badges, and superadmin-only hard delete. **Flow**: Admins see all announcements (drafts + published) via `/api/announcements/all`, users only see published announcements (isActive=true) via `/api/announcements`. Mark-all-read uses optimistic updates for instant feedback.
- **Version Display**: Version number displayed in sidebar footer (from package.json) for deployment verification via `/api/version` endpoint.
- **Daily Stock Briefs**: Lightweight daily trading reports (<120 words) for followed stocks only, separate from full AI analysis. Each brief provides buy/hold/sell stance, confidence (1-10), price snapshot with 24h change, and 2-3 key highlights. Generated daily via automated job using Alpha Vantage for real-time pricing and GPT-4.1 for AI recommendations. Briefs limited to last 7 days for performance. **API**: GET /api/stocks/:ticker/daily-briefs (authenticated, follow-validated with ticker normalization). **Frontend**: Displayed in ticker detail page with color-coded stance badges, price change indicators, confidence ratings, and bullet-point highlights. **Job**: Runs on startup and daily thereafter, validates price data, filters news to last 24h, comprehensive error handling with skip/error counters.
- **Intelligent Notification System**: Real-time alerts for high-value trading opportunities with automatic deduplication using unique constraint on (userId, ticker, type). **Four notification types**: (1) High Score Buy (AI score >70 with buy recommendation), (2) High Score Sell (AI score <30 with sell recommendation), (3) Popular Stock (>10 followers, notifies all followers), (4) Stance Change (hold→sell transitions on owned positions). **Triggers**: High-score notifications created during AI analysis job (queueWorker), popular stock notifications during follow action, stance change notifications during daily brief generation when detecting hold→sell transitions on user-owned positions. **UI**: Type-specific badge variants (buy=default, sell=destructive, trending=secondary, alert=outline), conditional score display only for high-score types, Clear All functionality with optimistic updates. **Deduplication**: Database-level unique constraint prevents duplicate notifications; backend catches constraint violations gracefully. **API**: GET /api/notifications (list), PATCH /api/notifications/:id/read (mark single), PATCH /api/notifications/read-all (mark all), DELETE /api/notifications/clear-all (delete all).

## External Dependencies

- **UI Frameworks**: @radix-ui/*, shadcn/ui, Recharts, Lucide React.
- **Database & ORM**: @neondatabase/serverless, Drizzle ORM, drizzle-zod.
- **Data Management**: @tanstack/react-query, react-hook-form, zod, date-fns.
- **Development Tools**: TypeScript, Vite, ESBuild, tsx, Vitest.
- **Integration Points**:
    - **PayPal**: @paypal/checkout-server-sdk for subscription payments and webhook verification.
    - **Telegram**: GramJS for MTProto API communication.
    - **OpenInsider.com**: Python (BeautifulSoup4) for web scraping.
    - **SEC EDGAR API**: For company filings and narrative sections.
    - **Alpha Vantage API**: For financial fundamentals, technical indicators, and news sentiment.
    - **Finnhub API**: For real-time stock prices, company profiles, market cap, and historical data.
- **Design & Styling**: Tailwind CSS, class-variance-authority (CVA), clsx, tailwind-merge, Google Fonts (Inter, Geist Mono, Fira Code).