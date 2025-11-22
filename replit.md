# Stock Trading Dashboard - signal2

## Overview
signal2 is a professional stock trading dashboard offering real-time portfolio tracking, automated trigger-based trading, and comprehensive backtesting. It features a modern interface, integrates real-time stock recommendations, news sentiment, and AI-powered financial analysis from SEC EDGAR filings and Alpha Vantage. The system includes industry-specific macro analysis using sector ETFs, supports multi-user collaboration, PayPal subscriptions, Telegram integration for insider alerts, and intelligent, deduplicated notifications for high-value trading opportunities. The project aims to provide a minimalistic landing page prioritizing high-signal alerts, with advanced tools for deeper analysis.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Changes

### November 22, 2025 - Dashboard Opportunities Section Added
- **High-Signal Opportunities Card**: Added new section to watchlist dashboard showing top 5 unfollowed stocks with integratedScore ≥ 70
- **Data Source**: Uses `/api/stocks/top-signals` endpoint which filters for completed analyses, high scores, and excludes already-followed stocks
- **Compact List Format**: Each opportunity shows score badge (amber-highlighted), ticker, company name, AI stance, current price, and price change %
- **Interactive Rows**: Entire row is clickable with hover/active elevation effects, navigating to ticker detail page
- **Loading States**: Displays 3 skeleton rows during data fetch to prevent layout shift
- **Empty State Handling**: Shows "No high-signal opportunities available" message with "Browse All Opportunities" button when no qualifying stocks exist
- **Minimalistic CTA**: Small "View All" ghost button in card header instead of prominent discover button
- **Discovery Focus**: Section exclusively shows opportunities to discover (unfollowed stocks), helping users find new high-value trades
- **Graceful Degradation**: When users have already followed all high-signal stocks, empty state provides clear path to browse all opportunities

### November 22, 2025 - Watchlist UX Improvements & Landing Page Update
- **Removed Repetitive CTAs**: Eliminated individual "View Details" buttons from watchlist cards that created visual clutter
- **Clickable Cards**: Made entire stock cards on watchlist page interactive - clicking anywhere on card navigates to detail view
- **Improved Interaction Feedback**: Cards now show hover elevation and press-down effects for better tactile feedback
- **Landing Page Refresh**: Updated home/login page with accurate signal2 branding and feature descriptions:
  - Changed title to "AI-Powered Trading Signals From Insider Activity"
  - Added 4 feature highlight cards (AI Analysis, Auto Data Collection, Smart Watchlist, Real-Time Alerts)
  - Replaced generic "StockDash" branding with "signal2"
- **Opportunities View**: Confirmed default view is table/list format (not cards) for better data density

### November 22, 2025 - Onboarding Flow Enhanced with Automatic Data Fetch
- **4-Step Onboarding Process**: Expanded onboarding from 3 to 4 steps to include automatic data fetching
- **Step 4 Auto-Fetch**: Step 4 automatically triggers OpenInsider data fetch upon mounting
- **Enforced Execution**: Both "Get Started" and "Skip" buttons disabled during fetch to ensure data loads before completion
- **Visual Feedback**: 
  - Loading state: "Fetching..." with animated Zap icon
  - Success state: Green checkmark with "Fetch Complete!" message and green border
  - Error state: "Fetch Failed" with retry button, allows skip after failure
- **Educational Content**: 
  - Automatic Data Collection card explains daily refresh and quality filters
  - Customizable Settings card directs users to Settings for configuration
- **User Flow**: Users must wait for fetch to complete or explicitly skip after error, ensuring every user either has initial data or makes conscious choice to explore first
- **Dependencies**: Proper useEffect dependencies prevent stale state and infinite loops

### November 22, 2025 - Tutorial System Overhaul
- **Manual-Only Tutorials**: Removed all auto-triggering logic from TutorialManager - tutorials only show when user clicks the help button
- **Contextual Tutorials Removed**: Eliminated `opportunities-intro`, `high-signal-follow`, and `first-follow` auto-triggered tutorials
- **Enhanced Element Targeting**: Updated all route-based tutorials to highlight specific page elements with testids instead of generic "body" targets
- **Simplified Tutorial Content**: Condensed verbose tutorials into focused, concise steps highlighting important UI elements
- **Location-Based Reset**: Added automatic reset of manual trigger state on location change to prevent tutorial carryover between pages
- **Onboarding Compatibility**: Tutorials now work during onboarding when manually triggered via help button
- **Tutorial Highlights**: 
  - Recommendations page: Page title, toggle, stock cards, follow buttons, notification bell
  - Settings page: Config cards, billing management, display preferences
  - Watchlist page: Stock cards, discover button (already had specific targets)

### November 22, 2025 - AI Analysis UX Improvements
- **Compact Signal Badge**: Added minimal signal indicator to Overview tab header showing score + stance (BUY/SELL/HOLD)
- **Tab Structure Refinement**: 
  - Overview tab (default) preserves original company information design with compact signal badge in card header
  - AI Analysis tab contains detailed AI Playbook with 4 sections (Signal Drivers, Key Watchpoints, Market Context, 2-Week Execution Notes)
  - Signal component breakdown (Company Analysis + Market Context factor) moved to collapsible accordion under Signal Drivers
- **Proper Nullish Checks**: All score/ID checks use `!= null` / `== null` to properly handle 0 values (critical for macroAnalysisId=0, macroFactor=0, scores=0)
- **Amber Gradient System**: Strong signals (≥70) use amber colors, moderate (40-69) neutral, weak (<40) muted red
- **Plain Language**: Replaced technical jargon (Micro Agent → Company Analysis, Macro Agent → Market Context)
- **2-Week Horizon**: Explicit messaging in 2-Week Execution Notes section and collapsible callout box
- **No Emojis**: All icons use lucide-react components (AlertTriangle, TrendingUp, Brain, Globe, etc.)

### November 22, 2025 - Fetch Configuration UX Redesign
- **Simplified Fetch Configuration Dialog**: Removed master enable/disable toggle in favor of always-enabled scanning with user-configurable settings
- **Default to Daily Refresh**: Changed default fetch interval from hourly to daily for better resource usage
- **Single-Location Display Preference**: 
  - "Buy Only / All Opportunities" toggle lives exclusively on Opportunities page
  - Auto-persists user's choice for future sessions (no separate Settings entry)
  - Fixed-width toggle component prevents layout shift when switching states
  - Removed from Settings page to simplify UX - one place to control the view
- **Progressive Disclosure Pattern**: Core settings visible by default, advanced options (batch size, community threshold) in collapsible accordion
- **Contextual Help System**: HoverCard info icons for each setting explaining impact and best practices
- **Focused Fetch Configuration**: Dialog now exclusively handles data ingestion settings (cadence, filters), keeping clear separation from display preferences

## System Architecture

### UI/UX Decisions
The UI/UX utilizes shadcn/ui (New York style), Radix UI primitives, and Tailwind CSS for styling, supporting light/dark modes. Typography uses Inter for UI and JetBrains Mono for numerical data. It employs a mobile-first, 12-column CSS Grid layout for responsiveness. Visuals include auto-scaling charts, color-coded avatars, and interactive guided tours (`react-joyride`) managed by a `TutorialManager` component.

### Critical Architecture Decisions
- **Per-User Tenant Isolation**: Each user has their own isolated stock collection with a `userId` foreign key in the stocks table. This ensures complete data privacy, unique constraints per user for stock data, and efficient per-user queries. All stock CRUD methods require a `userId` parameter. Background jobs use a global update pattern to fan out shared market data to all users' instances of a ticker while maintaining user isolation.
- **Session Security & Data Isolation**: Full page reloads on authentication state changes (login, logout, signup) prevent cross-user data contamination by clearing all state, cache, and queries.
- **WebSocket Push Notification System**: Replaces aggressive polling with real-time, event-driven WebSocket communication for instant UI updates, reducing server load and network traffic.
- **Database-Level Race Prevention**: Utilizes partial unique indexes on `aiAnalysisJobs(ticker)` where status is 'pending' or 'processing' to prevent duplicate AI analysis jobs.

### Technical Implementations
- **Frontend**: React 18, TypeScript, Vite, Wouter for routing, TanStack Query for server state management (with optimistic updates and user-scoped cache keys), React Hook Form with Zod for validation.
- **Backend**: Express.js with TypeScript, RESTful API design, JSON body parsing, Zod schema validation.
- **Database**: PostgreSQL (Neon serverless) with Drizzle ORM for type-safe queries, migrations, UUID primary keys, Decimal types, JSONB, and timestamp tracking.
- **Data Models**: Key entities include Stocks (per-user isolation), Portfolio Holdings, Trades, Trigger-based Trading Rules, Backtest Jobs/Price Data/Scenarios, Telegram Config, OpenInsider Config, Users, and Stock Comments.
- **Cache Isolation**: User-scoped cache keys and custom query functions are used to prevent cross-user data contamination.
- **Chart Visibility**: Stock simulation plots dynamically calculate Y-axis domains for optimal visibility.

### Feature Specifications
- **AI-Powered Analysis**: A dual-agent system (Micro Agent for SEC EDGAR/Alpha Vantage fundamentals, Macro Agent for Enhanced Sector ETF Analysis including volatility, momentum, and relative strength) influences recommendations.
- **Automated Recommendation Management**: Hourly job filters and removes old pending BUY recommendations and options deals.
- **Collaboration**: Multi-user system with stock-specific comment threads and recommendation filtering.
- **Adaptive Stock Fetching**: Stock fetch limits adjust based on user onboarding and configuration, with customizable OpenInsider filters for personalized opportunity feeds.
- **Follow Stock System**: Comprehensive follow/unfollow functionality with duplicate prevention, visual indicators, and automatic Day-0 AI analysis.
- **Admin Backoffice**: Comprehensive dashboard for user, subscription, and payment management with audit trails, soft/hard deletion, password resets, and a two-tier admin system. Includes an Announcement System for platform-wide notifications.
- **Daily Stock Briefs**: Lightweight daily trading reports for followed stocks with position-aware single-scenario display. Users can toggle between "Watching" (considering entry) and "In Position" (currently holding) modes via a switch control. Each mode shows the appropriate scenario analysis generated using Alpha Vantage and GPT-4.1. The position status is tracked per-user, per-stock in the followed_stocks table via hasEnteredPosition field.
- **Intelligent Notification System**: Real-time, deduplicated alerts for high-value trading opportunities (High Score Buy/Sell, Popular Stock, Stance Change) with distinct UI badging.
- **Candlestick Data Architecture**: Candlestick data is stored once per ticker in a shared `stockCandlesticks` table. Data is populated via three mechanisms: (1) Daily background job for all followed stocks, (2) Immediate fire-and-forget fetch when users follow new stocks (both single and bulk operations), (3) On-demand frontend API requests. This ensures charts appear immediately without waiting up to 24 hours for the daily job.

## External Dependencies

- **UI Frameworks**: @radix-ui/*, shadcn/ui, Recharts, Lucide React.
- **Database & ORM**: @neondatabase/serverless, Drizzle ORM, drizzle-zod.
- **Data Management**: @tanstack/react-query, react-hook-form, zod, date-fns.
- **Integration Points**:
    - **PayPal**: @paypal/checkout-server-sdk for subscription payments and webhook verification.
    - **Telegram**: GramJS for MTProto API communication.
    - **SEC Insider Trading Filings**: Automated collection from SEC regulatory data sources.
    - **SEC EDGAR API**: For company filings.
    - **Alpha Vantage API**: For financial fundamentals, technical indicators, and news sentiment.
    - **Finnhub API**: For real-time stock prices, company profiles, market cap, and historical data.