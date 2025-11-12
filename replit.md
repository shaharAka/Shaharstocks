# Stock Trading Dashboard - signal2

## Overview
signal2 is a professional stock trading dashboard offering real-time portfolio tracking, automated trigger-based trading rules, and comprehensive backtesting. It features a modern, information-dense interface for quick readability and trade execution. The system integrates real-time stock recommendations, news sentiment analysis, and AI-powered financial analysis from SEC EDGAR filings, Alpha Vantage fundamentals, and industry-specific macro analysis using sector ETFs. It supports multi-user collaboration, PayPal subscription payments, and Telegram integration for insider trading alerts.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The UI/UX is built with shadcn/ui (New York style), Radix UI primitives, and Tailwind CSS for styling, supporting light/dark modes. Typography uses Inter for UI and JetBrains Mono for numerical data. A mobile-first, 12-column CSS Grid layout ensures responsiveness, with comprehensive mobile optimization for touch targets and responsive layouts across all critical components. Visuals include auto-scaling charts, color-coded avatars, and interactive guided tours using `react-joyride` for onboarding.

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
- **Automated Recommendation Management**: Hourly job filters and removes old pending BUY recommendations and options deals.
- **Purchase Recommendation Filters**: Enforces a minimum $500M market cap.
- **Trading Rules**: Trigger-based system for portfolio-wide or stock-specific rules based on price changes.
- **Collaboration**: Multi-user system with stock-specific comment threads, interest markers, and recommendation filtering.
- **Admin Backoffice**: Comprehensive dashboard for user, subscription, and payment management with audit trails, soft/hard user deletion, and secure password resets. Two-tier admin system: regular admins can manage users/subscriptions, super admins (isSuperAdmin field) can additionally delete announcements and perform elevated operations.
- **Announcement System**: Beamer-like notification system allowing admins to create platform-wide announcements (feature, update, maintenance, general types) visible to all users via Gift icon popover in header. Gift icon highlights in **purple** (text-purple-500/400) when unread announcements exist. Announcements auto-mark all as read immediately upon popover open with optimistic UI updates. Admin panel provides full CRUD operations (create, edit, delete, draft/published toggle) with edit dialog reuse, status badges, and superadmin-only hard delete. **Flow**: Admins see all announcements (drafts + published) via `/api/announcements/all`, users only see published announcements (isActive=true) via `/api/announcements`. Mark-all-read uses optimistic updates for instant feedback.
- **Version Display**: Version number displayed in sidebar footer (from package.json) for deployment verification via `/api/version` endpoint.

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