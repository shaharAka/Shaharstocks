import { Step } from "react-joyride";

export type TutorialId = "portfolio" | "purchase" | "management" | "history" | "rules" | "backtesting" | "settings" | "trading" | "onboarding";

export interface TutorialConfig {
  id: TutorialId;
  title: string;
  steps: Step[];
}

export const tutorials: Record<TutorialId, TutorialConfig> = {
  portfolio: {
    id: "portfolio",
    title: "Portfolio Tour",
    steps: [
      {
        target: "body",
        content: "Welcome to signal2! This is your command center for stock trading. Let's take a quick tour of the main navigation.",
        placement: "center",
      },
      {
        target: '[data-testid="link-recommendations"]',
        content: "Recommendations: Review and approve insider trading recommendations from company insiders",
        placement: "right",
      },
      {
        target: '[data-testid="link-trading"]',
        content: "Trading: Create automated trading rules and test strategies with backtesting simulations",
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
        target: '[data-testid="tab-overview"]',
        content: "Overview tab: Your dashboard showing portfolio summary and holdings",
        placement: "bottom",
      },
      {
        target: '[data-testid="tab-management"]',
        content: "Management tab: Monitor positions with real-time charts and trading rules",
        placement: "bottom",
      },
      {
        target: '[data-testid="tab-history"]',
        content: "History tab: View all your past trades and performance",
        placement: "bottom",
      },
    ],
  },
  purchase: {
    id: "purchase",
    title: "Purchase Recommendations",
    steps: [
      {
        target: "body",
        content: "This page shows insider trading recommendations. Each recommendation comes from company insiders buying or selling their own stock.",
        placement: "center",
      },
      {
        target: '[data-testid="select-recommendation-filter"]',
        content: "Filter recommendations by Buy or Sell",
        placement: "bottom",
      },
      {
        target: '[data-testid="select-interest-filter"]',
        content: "Filter by team member interest. See which stocks your team finds interesting!",
        placement: "bottom",
      },
      {
        target: '[data-testid="select-days-filter"]',
        content: "Filter by time since insider purchase. Focus on recent opportunities.",
        placement: "bottom",
      },
      {
        target: '[data-testid^="card-stock-"]',
        content: "Click any stock card to see detailed analysis, company info, news, and AI insights. You can also mark stocks as interesting or add comments for team discussion.",
        placement: "top",
      },
      {
        target: '[data-testid^="checkbox-card-"]',
        content: "Select multiple stocks for bulk actions like approve, reject, or analyze.",
        placement: "left",
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
  trading: {
    id: "trading",
    title: "Trading Tools",
    steps: [
      {
        target: "body",
        content: "The Trading page has two powerful tools: automated trading rules and backtesting simulations",
        placement: "center",
      },
      {
        target: '[data-testid="tab-rules"]',
        content: "Trading Rules tab: Create automated rules to manage positions without constant monitoring",
        placement: "bottom",
      },
      {
        target: '[data-testid="tab-simulation"]',
        content: "Backtesting tab: Test strategies on historical data to see how they would have performed",
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
};
