import { Step } from "react-joyride";

export type TutorialId = 
  | "opportunities-intro" 
  | "high-signal-follow" 
  | "first-follow"
  | "recommendations" 
  | "analysis" 
  | "settings" 
  | "community" 
  | "portfolio";

export interface TutorialConfig {
  id: TutorialId;
  title: string;
  steps: Step[];
  triggerCondition?: "after-onboarding" | "high-signal-exists" | "first-follow" | "route-based";
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
  "opportunities-intro": {
    id: "opportunities-intro",
    title: "Opportunities Dashboard",
    triggerCondition: "after-onboarding",
    steps: [
      {
        target: "body",
        content: "Welcome to your Opportunities dashboard! This is where you'll find stocks with insider trading activity from SEC filings, each analyzed and scored by our AI system.",
        placement: "center",
      },
      {
        target: "[data-testid='stock-table']",
        content: "Each stock shows a Signal badge (0-100) indicating opportunity strength. Exceptional signals (90-100) appear in bold amber, strong signals (70-89) in light amber - representing high-quality opportunities regardless of BUY or SELL direction.",
        placement: "top",
      },
      {
        target: "body",
        content: "Use the filters at the top to narrow down stocks by insider action (BUY/SELL), signal strength, or sort by different metrics. Click any stock row to see detailed analysis!",
        placement: "center",
      },
    ],
  },
  "high-signal-follow": {
    id: "high-signal-follow",
    title: "High Signal Detected!",
    triggerCondition: "high-signal-exists",
    steps: [
      {
        target: "body",
        content: "Great! We've found a stock with an exceptional signal (90-100). These represent the highest-quality opportunities identified by our AI analysis.",
        placement: "center",
      },
      {
        target: "[data-testid^='button-follow-']",
        content: "Click the star button to follow this stock. Following a stock adds it to your watchlist and enables daily briefs, AI analysis updates, and personalized notifications.",
        placement: "bottom",
      },
      {
        target: "body",
        content: "You'll receive alerts when followed stocks hit important milestones: stance changes, high scores, or when they become popular with other users. Let's follow a stock to see how it works!",
        placement: "center",
      },
    ],
  },
  "first-follow": {
    id: "first-follow",
    title: "Stock Followed!",
    triggerCondition: "first-follow",
    steps: [
      {
        target: "body",
        content: "Excellent! You've followed your first stock. This stock is now in your watchlist and you'll receive personalized updates about it.",
        placement: "center",
      },
      {
        target: "[data-testid='nav-portfolio']",
        content: "Visit the Portfolio page to see all your followed stocks, track their performance, and view daily AI-generated briefs with trading insights.",
        placement: "right",
      },
      {
        target: "[data-testid='button-notifications']",
        content: "Check the notification bell for important alerts about your followed stocks: signal strength changes, stance shifts, and popularity trends. You're all set to start tracking opportunities!",
        placement: "bottom",
      },
    ],
  },
  recommendations: {
    id: "recommendations",
    title: "Opportunities Dashboard",
    triggerCondition: "route-based",
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
    triggerCondition: "route-based",
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
    triggerCondition: "route-based",
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
    triggerCondition: "route-based",
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
    triggerCondition: "route-based",
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
