import { Step } from "react-joyride";

export type TutorialId = "watchlist" | "recommendations" | "management" | "history" | "rules" | "backtesting" | "settings" | "analysis" | "onboarding" | "dashboard";

export interface TutorialConfig {
  id: TutorialId;
  title: string;
  steps: Step[];
}

// Route-to-Tutorial mapping
export interface RouteMapping {
  path: string;
  tutorialId: TutorialId;
  // Optional tab parameter for pages with tabs
  tab?: string;
}

export const routeToTutorialMap: RouteMapping[] = [
  { path: "/", tutorialId: "recommendations" },
  { path: "/recommendations", tutorialId: "recommendations" },
  { path: "/watchlist", tutorialId: "watchlist" },
  { path: "/portfolio", tutorialId: "watchlist" },
  { path: "/trading", tutorialId: "analysis" },
  { path: "/community", tutorialId: "dashboard" },
  { path: "/settings", tutorialId: "settings" },
];

// Helper function to get tutorial ID from current route and tab
export function getTutorialIdFromRoute(pathname: string, searchParams?: URLSearchParams): TutorialId | null {
  // Check for exact path match first
  const exactMatch = routeToTutorialMap.find(mapping => mapping.path === pathname);
  if (exactMatch) {
    return exactMatch.tutorialId;
  }
  
  // Default fallback
  return null;
}

export const tutorials: Record<TutorialId, TutorialConfig> = {
  watchlist: {
    id: "watchlist",
    title: "Watchlist Tour",
    steps: [
      {
        target: "body",
        content: "Welcome to your Watchlist! This is where you track stocks and manage alerts. Let's take a quick tour of the main navigation.",
        placement: "center",
      },
      {
        target: '[data-testid="link-recommendations"]',
        content: "Recommendations: Review AI-analyzed stock recommendations with insider trading signals",
        placement: "right",
      },
      {
        target: '[data-testid="link-analysis"]',
        content: "Analysis: Run simulations and create what-if trading rules to optimize your strategy",
        placement: "right",
      },
      {
        target: '[data-testid="link-community"]',
        content: "Community: Share feature ideas, vote on suggestions, and view the development roadmap",
        placement: "right",
      },
      {
        target: '[data-testid="button-settings"]',
        content: "Settings: Configure your data sources and integrations (click the gear icon)",
        placement: "left",
      },
      {
        target: '[data-testid="tab-tracked-stocks"]',
        content: "Tracked Stocks tab: Monitor the stocks you're tracking with current prices",
        placement: "bottom",
      },
      {
        target: '[data-testid="tab-active-alerts"]',
        content: "Active Alerts tab: View triggered sell alerts based on your trading rules",
        placement: "bottom",
      },
      {
        target: '[data-testid="tab-history"]',
        content: "History tab: View all your past trades and performance",
        placement: "bottom",
      },
    ],
  },
  recommendations: {
    id: "recommendations",
    title: "Stock Recommendations",
    steps: [
      {
        target: "body",
        content: "This page shows insider trading recommendations. Each recommendation comes from company insiders buying or selling their own stock. Use the filters above to find the most relevant opportunities.",
        placement: "center",
      },
      {
        target: '[data-testid="select-recommendation-filter"]',
        content: "Step 1: Filter by Buy or Sell recommendations to focus on the type of trade you're interested in.",
        placement: "bottom",
      },
      {
        target: '[data-testid="select-interest-filter"]',
        content: "Step 2: Filter by team member interest to see which stocks your colleagues find interesting.",
        placement: "bottom",
      },
      {
        target: '[data-testid="select-days-filter"]',
        content: "Step 3: Filter by how recent the insider purchase was - focus on fresh opportunities.",
        placement: "bottom",
      },
      {
        target: "body",
        content: "Step 4: Once stocks load, you can click any stock card for detailed analysis, mark stocks as interesting, or select multiple stocks for bulk actions. That's it!",
        placement: "center",
      },
    ],
  },
  management: {
    id: "management",
    title: "Portfolio Management",
    steps: [
      {
        target: "body",
        content: "Monitor your active holdings with real-time price charts and automated trading rules.",
        placement: "center",
      },
      {
        target: '[data-testid^="chart-"]',
        content: "Each chart shows the stock's price movement with trading rule boundaries. When price hits these boundaries, your rules execute automatically.",
        placement: "top",
      },
      {
        target: '[data-testid="button-remove-holding"]',
        content: "Manually close a position at any time",
        placement: "left",
      },
      {
        target: '[data-testid="button-add-rule"]',
        content: "Create trading rules to automatically sell based on price changes or time held",
        placement: "bottom",
      },
    ],
  },
  history: {
    id: "history",
    title: "Trade History",
    steps: [
      {
        target: "body",
        content: "View all your completed trades and performance",
        placement: "center",
      },
      {
        target: '[data-testid="text-total-profit"]',
        content: "Track your overall profit/loss across all trades",
        placement: "bottom",
      },
      {
        target: "table",
        content: "See details for each trade including entry/exit prices, quantity, and profit",
        placement: "top",
      },
    ],
  },
  analysis: {
    id: "analysis",
    title: "Analysis Tools",
    steps: [
      {
        target: "body",
        content: "The Analysis page has two powerful tools: simulation and what-if rules to optimize your trading strategy",
        placement: "center",
      },
      {
        target: '[data-testid="tab-simulation"]',
        content: "Simulation tab: Run backtests on historical data to see how strategies would have performed",
        placement: "bottom",
      },
      {
        target: '[data-testid="tab-rules"]',
        content: "What-If Rules tab: Test different trading rules to find the best approach",
        placement: "bottom",
      },
    ],
  },
  rules: {
    id: "rules",
    title: "Trading Rules",
    steps: [
      {
        target: "body",
        content: "Create automated trading rules to manage your positions without constant monitoring",
        placement: "center",
      },
      {
        target: '[data-testid="button-create-rule"]',
        content: "Click here to create a new trading rule",
        placement: "bottom",
      },
      {
        target: "body",
        content: "Rules can trigger on price changes, absolute prices, or time held. Actions include selling a percentage, quantity, or entire position.",
        placement: "center",
      },
    ],
  },
  backtesting: {
    id: "backtesting",
    title: "Strategy Backtesting",
    steps: [
      {
        target: "body",
        content: "Test your trading strategies on historical insider trading data to see how they would have performed",
        placement: "center",
      },
      {
        target: '[data-testid="button-create-backtest"]',
        content: "Create a new backtest scenario with your trading rules",
        placement: "bottom",
      },
      {
        target: '[data-testid="select-data-source"]',
        content: "Choose between Telegram or OpenInsider data sources for historical analysis",
        placement: "bottom",
      },
    ],
  },
  settings: {
    id: "settings",
    title: "Settings & Configuration",
    steps: [
      {
        target: "body",
        content: "Configure your data sources and integrations",
        placement: "center",
      },
      {
        target: '[data-testid="section-ibkr"]',
        content: "Connect to Interactive Brokers for automated trading execution",
        placement: "top",
      },
      {
        target: '[data-testid="section-openinsider"]',
        content: "Configure OpenInsider scraper to fetch insider trading transactions",
        placement: "top",
      },
    ],
  },
  onboarding: {
    id: "onboarding",
    title: "Welcome to signal2",
    steps: [
      {
        target: "body",
        content: "Welcome to signal2! Let's get you started with setting up your first data source for insider trading recommendations.",
        placement: "center",
      },
      {
        target: '[data-testid="section-openinsider"]',
        content: "OpenInsider.com scrapes real insider trading transactions. We'll start by fetching the first batch of recommendations.",
        placement: "center",
      },
      {
        target: '[data-testid="button-fetch-openinsider"]',
        content: "Click here to start fetching insider trading data. This will get you the latest 500 transactions.",
        placement: "top",
      },
    ],
  },
  dashboard: {
    id: "dashboard",
    title: "Community Dashboard",
    steps: [
      {
        target: "body",
        content: "Welcome to the Community page! Share ideas, vote on features, and see what's being built.",
        placement: "center",
      },
      {
        target: '[data-testid="button-new-idea"]',
        content: "Submit your own feature ideas and suggestions",
        placement: "bottom",
      },
      {
        target: '[data-testid^="card-idea-"]',
        content: "Vote on ideas you'd like to see implemented. Each user gets one vote per idea.",
        placement: "top",
      },
    ],
  },
};
