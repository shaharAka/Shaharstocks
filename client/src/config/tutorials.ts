import { Step } from "react-joyride";

export type TutorialId = "recommendations" | "analysis" | "settings" | "community" | "portfolio";

export interface TutorialConfig {
  id: TutorialId;
  title: string;
  steps: Step[];
}

// Route-to-Tutorial mapping
export interface RouteMapping {
  path: string;
  tutorialId: TutorialId;
}

export const routeToTutorialMap: RouteMapping[] = [
  // Opportunities/Purchase pages
  { path: "/", tutorialId: "recommendations" },
  { path: "/recommendations", tutorialId: "recommendations" },
  { path: "/purchase", tutorialId: "recommendations" },
  
  // Portfolio/Watchlist pages (all map to Portfolio component)
  { path: "/watchlist", tutorialId: "portfolio" },
  { path: "/portfolio", tutorialId: "portfolio" },
  { path: "/management", tutorialId: "portfolio" },
  { path: "/history", tutorialId: "portfolio" },
  { path: "/dashboard", tutorialId: "portfolio" },
  
  // Analysis/Trading pages
  { path: "/trading", tutorialId: "analysis" },
  { path: "/rules", tutorialId: "analysis" },
  { path: "/simulation", tutorialId: "analysis" },
  
  // Community pages
  { path: "/community", tutorialId: "community" },
  { path: "/community/discussion", tutorialId: "community" },
  { path: "/community/feature-suggestions", tutorialId: "community" },
  
  // Settings
  { path: "/settings", tutorialId: "settings" },
];

// Helper function to get tutorial ID from current route
export function getTutorialIdFromRoute(pathname: string): TutorialId | null {
  const exactMatch = routeToTutorialMap.find(mapping => mapping.path === pathname);
  return exactMatch?.tutorialId || null;
}

export const tutorials: Record<TutorialId, TutorialConfig> = {
  recommendations: {
    id: "recommendations",
    title: "Opportunities Dashboard",
    steps: [
      {
        target: "body",
        content: "Welcome to Opportunities! This shows stocks with insider trading activity from SEC filings, scored and filtered by AI. Use the dropdown filters to see BUY recommendations (high signals >60) or SELL recommendations (low scores <70), and filter by team interest or recency.",
        placement: "center",
      },
      {
        target: "body",
        content: "Click any stock card to see full details: AI analysis scores, community discussion, and simulation charts. Follow stocks using the star button to track them - followed stocks show daily briefs and appear in your watchlist.",
        placement: "center",
      },
      {
        target: "body",
        content: "Check the notification bell (top-right) for important alerts: high-score buy/sell signals, popular stocks (>10 followers), and stance changes on your positions. Happy trading!",
        placement: "center",
      },
    ],
  },
  analysis: {
    id: "analysis",
    title: "Simulation & What-If Analysis",
    steps: [
      {
        target: "body",
        content: "The Analysis page has two tabs: Simulation for running backtests on historical data, and What-If Rules for testing different trading strategies against your simulated positions.",
        placement: "center",
      },
      {
        target: "body",
        content: "Use the Simulation tab to backtest strategies using SEC insider trading data or Telegram signals. The system will show you historical performance metrics.",
        placement: "center",
      },
      {
        target: "body",
        content: "For stocks you follow, visit their detail page to see inline simulation charts with trading rule boundaries overlaid on price movements. This helps visualize when rules would trigger.",
        placement: "center",
      },
    ],
  },
  settings: {
    id: "settings",
    title: "Settings & Configuration",
    steps: [
      {
        target: "body",
        content: "Settings lets you configure data sources, view subscription status, and manage integrations. Scroll down to find insider trading data configuration and subscription management sections.",
        placement: "center",
      },
      {
        target: "body",
        content: "The Insider Trading Data section lets you configure SEC filing collection: set fetch limits (1-500 transactions), fetch intervals (hourly/daily), and quality filters like minimum transaction value.",
        placement: "center",
      },
      {
        target: "body",
        content: "Your subscription status appears in a dedicated card. You can manage your PayPal subscription through the provided link. That's all for settings!",
        placement: "center",
      },
    ],
  },
  portfolio: {
    id: "portfolio",
    title: "Portfolio & Watchlist",
    steps: [
      {
        target: "body",
        content: "The Portfolio page has three tabs at the top: Tracked Stocks shows stocks you're following with current prices and metrics, Active Alerts displays positions with triggered trading rules, and History shows completed trades.",
        placement: "center",
      },
      {
        target: "body",
        content: "In the Tracked Stocks tab, you'll see all stocks you've followed with real-time price updates. Click any stock to see daily briefs, AI analysis, and simulation charts on the detail page.",
        placement: "center",
      },
      {
        target: "body",
        content: "Active Alerts tab shows trading rules that have triggered on your positions. History tab tracks your completed trades with entry/exit prices and profit/loss. That's it!",
        placement: "center",
      },
    ],
  },
  community: {
    id: "community",
    title: "Community & Feature Voting",
    steps: [
      {
        target: "body",
        content: "The Community page is where you suggest features and vote on what gets built next. Your input directly shapes the product roadmap!",
        placement: "center",
      },
      {
        target: "body",
        content: "Click the button at the top to submit your own feature ideas. Explain the problem you're trying to solve and how the feature would help.",
        placement: "center",
      },
      {
        target: "body",
        content: "Vote on existing ideas by clicking the vote buttons on each card. Each user gets one vote per idea, and popular ideas get prioritized for development. That's it!",
        placement: "center",
      },
    ],
  },
};
