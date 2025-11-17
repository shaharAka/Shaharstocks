# Stock Trading Dashboard - signal2

## Overview
signal2 is a professional stock trading dashboard offering real-time portfolio tracking, automated trigger-based trading, and comprehensive backtesting. It features a modern interface, integrates real-time stock recommendations, news sentiment, and AI-powered financial analysis from SEC EDGAR filings and Alpha Vantage. The system includes industry-specific macro analysis using sector ETFs, supports multi-user collaboration, PayPal subscriptions, Telegram integration for insider alerts, and intelligent, deduplicated notifications for high-value trading opportunities. The project aims to provide a minimalistic landing page prioritizing high-signal alerts, with advanced tools for deeper analysis.

## User Preferences
Preferred communication style: Simple, everyday language.

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
- **Candlestick Data Refactoring**: Candlestick data is stored once per ticker in a shared table, fetched on-demand by the frontend via API, and populated daily by a background job, eliminating duplication and simplifying synchronization.

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