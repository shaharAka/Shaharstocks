import { Step } from "react-joyride";

export type TutorialId = 
  | "ui-intro"
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
  "ui-intro": {
    id: "ui-intro",
    title: "Getting Started",
    triggerCondition: "after-onboarding",
    steps: [
      {
        target: "[data-testid='link-dashboard']",
        content: "This is your Dashboard - it shows all the stocks you're following in one simple view. Start here to track your watchlist.",
        placement: "right",
        disableBeacon: true,
      },
      {
        target: "[data-testid='link-opportunities']",
        content: "Browse Opportunities to discover new stocks with insider trading activity. Each stock is scored by AI to help you find the best signals.",
        placement: "right",
      },
      {
        target: "[data-testid='link-following']",
        content: "Your followed stocks appear here in the sidebar for quick access. They're organized by signal strength.",
        placement: "right",
      },
      {
        target: "[data-testid='button-notifications']",
        content: "Check notifications for high-value alerts: exceptional signals (90+), stance changes on your positions, and popular stocks.",
        placement: "bottom",
      },
      {
        target: "[data-testid='button-help']",
        content: "Click the help button anytime to replay the tutorial for the current page. Each page has its own guide to help you get the most out of signal2.",
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
        target: "[data-testid='text-page-title']",
        content: "This page shows stocks with insider trading activity from SEC filings. Each stock is analyzed by AI and receives a stance (BUY/SELL/HOLD) and signal score (0-100).",
        placement: "bottom",
      },
      {
        target: "[data-testid='toggle-show-all']",
        content: "Use this toggle to switch between 'Buy Opportunities Only' and 'All Opportunities'. Your preference is saved automatically for future sessions.",
        placement: "bottom",
      },
      {
        target: "[data-testid^='card-opportunity-']",
        content: "Each stock card shows the ticker, AI stance badge, signal score (70+ highlighted in amber), insider action, and transaction details. Click any card to see full analysis including financial health assessments.",
        placement: "top",
      },
      {
        target: "[data-testid^='button-follow-']",
        content: "Click the star button to follow stocks. Followed stocks appear in the 'Following' section in the sidebar and receive daily AI briefs.",
        placement: "left",
      },
      {
        target: "[data-testid='link-following']",
        content: "The 'Following' section in the sidebar shows all your followed stocks with their AI scores and stances. Stocks are grouped by signal strength - ACT (strong signals where AI agrees with insider) appear first.",
        placement: "right",
      },
      {
        target: "[data-testid='button-notifications']",
        content: "Check the notification bell for high-value alerts: exceptional signals (90+), stance changes, and popular stocks. That's it!",
        placement: "bottom",
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
        content: "The Analysis page lets you run backtests on historical data and test trading strategies. Use the Simulation tab to backtest using SEC insider trading data or Telegram signals.",
        placement: "center",
      },
      {
        target: "body",
        content: "For followed stocks, visit their detail page to see simulation charts with trading rule boundaries overlaid on price movements. This visualizes when rules would trigger. That's it!",
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
        target: "[data-testid='text-page-title']",
        content: "Settings lets you configure data sources, view subscription status, and manage integrations.",
        placement: "bottom",
      },
      {
        target: "[data-testid='card-openinsider-config']",
        content: "Configure insider trading data collection here: set fetch limits (1-500 transactions), fetch intervals (hourly/daily), and quality filters like minimum transaction value and community rating.",
        placement: "top",
      },
      {
        target: "[data-testid='card-billing-management']",
        content: "View your subscription status and manage your PayPal subscription. Your trial period and billing details appear in this card.",
        placement: "top",
      },
      {
        target: "[data-testid='card-display-preferences']",
        content: "Note: Display preferences like 'Show All Opportunities' have been moved to the Opportunities page for easier access. That's it!",
        placement: "top",
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
        content: "The Portfolio page has three tabs: Tracked Stocks (your followed stocks with prices), Active Alerts (triggered trading rules), and History (completed trades).",
        placement: "center",
      },
      {
        target: "body",
        content: "Click any stock in Tracked Stocks to see daily briefs, AI analysis, and simulation charts. Active Alerts shows triggered rules, and History tracks your trades with P&L. That's it!",
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
        content: "Click 'Suggest a Feature' at the top to submit ideas. Explain the problem you're solving and how the feature would help. Vote on existing ideas with the vote buttons - each user gets one vote per idea. That's it!",
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
        target: "[data-testid='link-following']",
        content: "Quick access: The 'Following' section in the sidebar always shows your followed stocks. They're grouped by signal strength - ACT stocks (where AI agrees with insider) appear first, HOLD stocks are grouped together.",
        placement: "right",
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
