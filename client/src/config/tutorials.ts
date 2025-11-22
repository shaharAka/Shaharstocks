import { Step } from "react-joyride";

export type TutorialId = 
  | "opportunities-intro" 
  | "high-signal-follow" 
  | "first-follow"
  | "recommendations" 
  | "analysis" 
  | "settings" 
  | "community" 
  | "portfolio"
  | "watchlist";

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
  
  // Watchlist/Dashboard pages
  { path: "/dashboard", tutorialId: "watchlist" },
  
  // Portfolio/Watchlist pages (legacy - map to Portfolio component)
  { path: "/watchlist", tutorialId: "portfolio" },
  { path: "/portfolio", tutorialId: "portfolio" },
  { path: "/management", tutorialId: "portfolio" },
  { path: "/history", tutorialId: "portfolio" },
  { path: "/followed", tutorialId: "portfolio" },
  
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
    title: "Discover Opportunities",
    triggerCondition: "after-onboarding",
    steps: [
      {
        target: "body",
        content: "Welcome! This is where you discover stocks with insider trading activity from SEC filings, each analyzed by AI with a stance (BUY/SELL/HOLD) and signal score (0-100).",
        placement: "center",
      },
      {
        target: "body",
        content: "Browse through the stock cards. Each shows the AI stance, signal score (70+ highlighted in amber), and current price. Click any card to see detailed analysis including financial health assessments.",
        placement: "center",
      },
      {
        target: "body",
        content: "When you find interesting stocks, click the star button to follow them. Followed stocks appear in your 'My Watchlist' dashboard and receive daily AI briefs. Let's explore!",
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
        content: "Great! We've found a stock with an exceptional signal (90+). These represent high-quality opportunities identified by our dual-agent AI analysis of fundamentals and market conditions.",
        placement: "center",
      },
      {
        target: "[data-testid^='button-follow-']",
        content: "Click the star button to follow this stock. Following adds it to your 'My Watchlist' dashboard and enables daily AI briefs with fresh recommendations and financial health assessments.",
        placement: "bottom",
      },
      {
        target: "body",
        content: "You'll receive alerts for exceptional signals (90+), stance changes, and when stocks become popular (&gt;10 followers). Let's follow a stock to see it in action!",
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
        content: "Excellent! You've followed your first stock. It's now in your 'My Watchlist' dashboard where you can track it alongside all your other followed stocks.",
        placement: "center",
      },
      {
        target: "[data-testid='link-dashboard']",
        content: "Visit your Dashboard (My Watchlist) to see all followed stocks in one simple view with prices, scores, stances, and 'Analyzing...' status. Click any stock for detailed analysis.",
        placement: "right",
      },
      {
        target: "[data-testid='button-notifications']",
        content: "Check the notification bell for important alerts: high signals, stance changes, and popular stocks. You're all set to track opportunities!",
        placement: "bottom",
      },
    ],
  },
  recommendations: {
    id: "recommendations",
    title: "Discover Opportunities",
    triggerCondition: "route-based",
    steps: [
      {
        target: "body",
        content: "Welcome to Opportunities! Browse stocks with insider trading activity from SEC filings, each analyzed by AI. Each stock gets a stance (BUY/SELL/HOLD) and signal score (0-100). Strong signals (70+) appear in amber.",
        placement: "center",
      },
      {
        target: "body",
        content: "Click any stock card to see detailed analysis: AI stance, signal score, financial health assessments (Profitability, Liquidity, Debt, Growth rated as Strong/Moderate/Weak), and key insights.",
        placement: "center",
      },
      {
        target: "body",
        content: "Follow interesting stocks using the star button - they'll appear in your 'My Watchlist' dashboard and receive daily AI briefs. Check the notification bell for high-value alerts. Happy trading!",
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
  watchlist: {
    id: "watchlist",
    title: "My Watchlist Dashboard",
    triggerCondition: "route-based",
    steps: [
      {
        target: "body",
        content: "Your Watchlist dashboard shows all stocks you're following in one simple view - no hidden filters! See prices, signal scores, AI stances (BUY/SELL/HOLD), and 'Analyzing...' status for new additions.",
        placement: "center",
      },
      {
        target: "[data-testid^='card-watchlist-']",
        content: "Each card shows the ticker, AI stance badge, signal score (70+ highlighted in amber), current price with change, and a button to view full details. Click 'View Details' to see financial health assessments and daily briefs.",
        placement: "top",
      },
      {
        target: "[data-testid='button-discover']",
        content: "Click 'Discover Stocks' to browse new opportunities from insider trading. Follow interesting stocks to add them to this watchlist and receive daily AI updates. That's it!",
        placement: "left",
      },
    ],
  },
};
