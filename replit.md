# Stock Trading Dashboard - signal2

## Overview
signal2 is a professional stock trading dashboard providing real-time portfolio tracking, automated trigger-based trading rules, and comprehensive backtesting. It features a modern, information-dense interface, integrates real-time stock recommendations, news sentiment analysis, and AI-powered financial analysis from SEC EDGAR filings and Alpha Vantage. The system also includes industry-specific macro analysis using sector ETFs, supports multi-user collaboration, PayPal subscription payments, Telegram integration for insider trading alerts, and intelligent, deduplicated notifications for high-value trading opportunities. The project aims to offer a minimalistic landing page that prioritizes high-signal alerts for quick decisions, with advanced tools accessible for deeper analysis.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The UI/UX is built with shadcn/ui (New York style), Radix UI primitives, and Tailwind CSS for styling, supporting light/dark modes. Typography uses Inter for UI and JetBrains Mono for numerical data. A mobile-first, 12-column CSS Grid layout ensures responsiveness. Visuals include auto-scaling charts, color-coded avatars, and interactive guided tours (`react-joyride`) managed by a `TutorialManager` component.

### Critical Architecture Decisions
- **Multi-Transaction Reject Flow**: The `rejectTickerForUser(userId, ticker)` method handles stocks with multiple insider trading transactions atomically. When a user rejects a ticker, it:
  - Updates user_stock_statuses to 'rejected' with timestamp
  - Updates ALL stocks table rows for that ticker to 'rejected' status
  - Cancels any in-flight AI analysis jobs for that ticker
  - Prevents rejected stocks from appearing in opportunities query
- **Opportunities Query Filter**: Only shows stocks where `recommendation_status='pending'` at the global level, ensuring rejected stocks don't reappear even with multiple transactions.
- **Session Security & Data Isolation**: Complete cache clearing on logout, login, and signup to prevent cross-user data contamination:
  - Logout: Clears ALL React Query cache, localStorage, and sessionStorage before redirecting
  - Login: Clears ALL cached data before fetching new user's data
  - Signup: Clears ALL cached data to ensure fresh start for new users
  - Prevents critical security vulnerability where users could see each other's data

### Technical Implementations
- **Frontend**: React 18, TypeScript, Vite, Wouter for routing, TanStack Query for server state management (with optimistic updates and user-scoped cache keys), React Hook Form with Zod for validation.
- **Backend**: Express.js with TypeScript, RESTful API design, JSON body parsing, Zod schema validation.
- **Database**: PostgreSQL (Neon serverless) with Drizzle ORM for type-safe queries, migrations, UUID primary keys, Decimal types, JSONB, and timestamp tracking.
- **Data Models**: Key entities include Stocks, Portfolio Holdings, Trades, Trigger-based Trading Rules, Backtest Jobs/Price Data/Scenarios, Telegram Config, OpenInsider Config, Users, and Stock Comments.
- **Cache Isolation**: User-scoped cache keys and custom query functions are used across critical components to prevent cross-user data contamination, with backend enforcement via session authentication.
- **Chart Visibility**: Stock simulation plots dynamically calculate Y-axis domains to ensure all price data and reference lines are visible.

### Feature Specifications
- **PayPal Subscription Integration**: Automated subscription activation with secure webhook verification.
- **Company Info & News**: Integrates Finnhub for company profiles, market cap, and news with negative sentiment detection, filtering stocks below $500M market cap for purchase recommendations.
- **Data Sources**: Real-time Telegram channel monitoring via GramJS and automated collection of SEC insider trading regulatory filings via OpenInsider (fetching both purchases and sales).
- **AI-Powered Analysis**: A dual-agent system (Micro Agent for SEC EDGAR/Alpha Vantage fundamentals, Macro Agent for **Enhanced Sector ETF Analysis**). The Macro Agent calculates volatility, momentum, and relative strength for sector ETFs, applying weighted influence on recommendations.
- **2-Week Event Horizon**: Opportunities page automatically cleans up stocks older than 2 weeks, unless followed by the user.
- **Automated Recommendation Management**: Hourly job filters and removes old pending BUY recommendations and options deals.
- **Purchase Recommendation Filters**: Enforces a minimum $500M market cap.
- **Trading Rules**: Trigger-based system for portfolio-wide or stock-specific rules based on price changes.
- **Collaboration**: Multi-user system with stock-specific comment threads and recommendation filtering.
- **Adaptive Stock Fetching**: Stock fetch limits adapt based on user onboarding status and user configuration, prioritizing fresh opportunities.
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