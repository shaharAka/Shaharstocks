# Stock Trading Dashboard - Design Guidelines

## Design Approach

**Selected Approach:** Hybrid - Modern Fintech Reference + Material Design System

Drawing inspiration from professional trading platforms (Robinhood's clarity, Interactive Brokers' functionality, Bloomberg's information density) combined with Material Design principles for consistent component behavior. This dashboard prioritizes data visibility, quick decision-making, and professional-grade functionality.

**Core Principles:**
- Information density with clear hierarchy
- Instant readability for time-sensitive decisions
- Action-oriented interface for quick trade execution
- Professional credibility with modern aesthetics

---

## Typography

**Font Stack:** Inter (via Google Fonts) for primary UI, JetBrains Mono for numerical data

**Hierarchy:**
- Page Headers: 2xl (24px), font-semibold
- Section Headers: xl (20px), font-semibold
- Card Titles: lg (18px), font-medium
- Body Text: base (16px), font-normal
- Data Labels: sm (14px), font-medium, uppercase tracking
- Numerical Data: lg-2xl (18-24px), font-mono, font-semibold
- Metric Changes: base (16px), font-mono, font-medium
- Table Headers: sm (14px), font-semibold, uppercase

---

## Layout System

**Spacing Primitives:** Tailwind units of 2, 4, 6, 8, 12, 16, 24

**Grid Structure:**
- Main Container: max-w-screen-2xl, mx-auto, px-6
- Dashboard Grid: 12-column CSS Grid for flexible layouts
- Card Spacing: gap-6 between cards
- Section Padding: py-8 for major sections
- Component Internal Padding: p-6 for cards, p-4 for compact components

**Responsive Breakpoints:**
- Mobile: Single column, stacked cards
- Tablet (md:): 2-column grid for most cards
- Desktop (lg:): 3-4 column grid, sidebar navigation
- Large Desktop (xl:): Full 12-column utilization, multi-panel layouts

---

## Component Library

### Navigation
**Top Navigation Bar:**
- Fixed header, h-16
- Logo/Brand (left), Quick Stats (center), User Menu + Settings (right)
- Real-time connection status indicator
- Search bar for quick stock lookup

**Side Navigation (Desktop):**
- w-64, fixed sidebar
- Navigation items: Dashboard, Stocks, Portfolio, Rules, Backtesting, History
- Active state with subtle highlight
- Collapsible to icon-only mode (w-20)

### Dashboard Overview Cards

**Portfolio Summary Card:**
- Large hero card spanning 2 columns
- Total Portfolio Value (prominent, 3xl font-mono)
- Daily P&L with percentage change (2xl, with up/down indicators)
- Quick metrics row: Total Invested, Available Cash, Number of Holdings
- Mini sparkline chart showing portfolio performance

**Stock Holdings Grid:**
- Grid of stock cards (md:grid-cols-2 lg:grid-cols-3)
- Each card contains:
  - Company ticker + name (bold)
  - Current price (xl, font-mono)
  - Quantity owned + Total value
  - P&L percentage with visual indicator
  - Mini price chart (last 7 days)
  - Quick action buttons: Buy More, Sell, Details

### Stock Information Cards

**Detailed Stock Card:**
- Full-width card or modal overlay
- Top section: Company logo placeholder, name, ticker, current price (2xl)
- Key metrics grid (2-column on mobile, 4-column on desktop):
  - Market Cap, P/E Ratio, 52-Week Range, Volume, Beta, Dividend Yield
- Price chart with timeframe toggles (1D, 1W, 1M, 3M, 1Y)
- Recommendation section with confidence indicator
- Action panel with quantity input and Buy/Sell buttons

**Recommendation Badge:**
- Prominent display: "Strong Buy", "Buy", "Hold", "Sell"
- Includes confidence score (0-100)
- Supporting rationale in expandable section

### Trading Actions

**Buy/Sell Panel:**
- Sticky action panel (can be bottom sheet on mobile, sidebar on desktop)
- Stock ticker + current price at top
- Quantity input with +/- steppers
- Order type selector (Market, Limit)
- Total cost calculator (real-time)
- Prominent action buttons (Buy/Sell) with confirmation step
- Cancel button

**Order Confirmation Modal:**
- Overlay with backdrop blur
- Order summary with all details
- Warning for high-risk trades
- Confirm/Cancel buttons (Confirm is primary)

### Portfolio & Trade History

**Trade History Table:**
- Full-width responsive table
- Columns: Date, Stock, Type (Buy/Sell), Quantity, Price, Total, Status, P/L
- Row hover state for readability
- Filter controls: Date range, Stock, Type
- Export functionality button
- Pagination controls

**Status Indicators:**
- Visual badges for: Completed, Pending, Failed
- Inline P/L indicators with percentage

### Trading Rules Configuration

**Rules Manager:**
- List view of active rules (cards or table rows)
- Each rule card contains:
  - Rule name (editable inline)
  - Condition summary (readable format: "Buy when price drops 5%")
  - Active/Inactive toggle
  - Edit/Delete actions
- "Create New Rule" prominent button

**Rule Builder Panel:**
- Step-by-step form or modal
- Stock selector (dropdown/autocomplete)
- Condition builder:
  - Metric dropdown (Price, Volume, P/E, etc.)
  - Operator dropdown (>, <, =, %, etc.)
  - Value input
  - Multiple condition support with AND/OR logic
- Action selector (Buy X shares, Sell X%, Notify only)
- Preview of rule in readable format
- Save/Cancel buttons

### What-If Analysis / Backtesting

**Backtesting Dashboard:**
- Date range selector (from/to)
- Rule selector (test existing or create custom)
- Stock selector (single or portfolio-wide)
- "Run Backtest" primary button

**Results Display:**
- Performance summary cards:
  - Total Return, Win Rate, Number of Trades, Best/Worst Trade
- Equity curve chart (portfolio value over time)
- Trade distribution chart (wins vs losses)
- Detailed trade log table
- Comparison view (current rules vs modified rules)

### Data Visualization

**Charts:**
- Line charts for price/portfolio trends
- Candlestick charts for detailed stock analysis
- Bar charts for volume/comparison
- Sparklines for compact trend indicators
- All charts interactive with tooltips on hover

**Chart Controls:**
- Timeframe toggles in button group
- Zoom/pan controls for detailed analysis
- Toggle overlays (Moving Averages, Volume, Indicators)

### Forms & Inputs

**Input Fields:**
- Standard text inputs with labels above
- Numerical inputs with step controls
- Dropdowns with search capability for stocks
- Date/time pickers for rules and backtesting
- Consistent height (h-12) for all inputs
- Focus states with clear indicators

**Buttons:**
- Primary Actions (Buy, Sell, Execute): Large (h-12), prominent
- Secondary Actions (Cancel, Edit): Standard (h-10)
- Icon Buttons: Square (h-10 w-10) for table actions
- Button groups for toggles/filters

---

## Accessibility & Standards

- All numerical data in monospace font for alignment
- Clear focus indicators on all interactive elements
- Keyboard navigation for entire dashboard
- ARIA labels for screen readers on data points
- High contrast for P/L indicators (positive/negative)
- Loading states for real-time data updates
- Error states for failed connections/trades

---

## Images

No hero images required. This is a data-driven dashboard focusing on functionality.

**Icon Usage:** Material Icons via CDN for consistent iconography (trending up/down arrows, settings, history, notifications)

**Placeholders Needed:**
- Company logo placeholders in stock cards (use first letter of ticker as fallback)
- Empty state illustrations for: No holdings, No trade history, No rules configured

---

## Animations

Use sparingly and purposefully:
- Smooth number transitions for price updates (count-up effect)
- Subtle pulse on price change indicators
- Loading skeletons for data fetching
- Smooth expand/collapse for rule details
- Modal/drawer slide-in transitions (200ms)

No scroll-triggered animations or decorative effects - maintain professional focus.