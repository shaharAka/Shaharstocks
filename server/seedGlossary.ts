import { db } from "./db";
import { glossaryTerms } from "@shared/schema";

const initialTerms = [
  // Technical Indicators
  {
    term: "RSI",
    definition: "Relative Strength Index - A momentum indicator that measures the speed and magnitude of price movements on a scale from 0 to 100. Values above 70 suggest the stock may be overbought, while values below 30 suggest it may be oversold.",
    category: "technical",
    synonyms: ["Relative Strength Index"],
  },
  {
    term: "MACD",
    definition: "Moving Average Convergence Divergence - A trend-following indicator that shows the relationship between two moving averages of a stock's price. When the MACD line crosses above the signal line, it suggests a bullish signal; crossing below suggests a bearish signal.",
    category: "technical",
    synonyms: ["Moving Average Convergence Divergence"],
  },
  {
    term: "Bollinger Bands",
    definition: "Volatility bands placed above and below a moving average. The bands widen during periods of increased volatility and contract during periods of low volatility. Prices touching the upper band may indicate overbought conditions, while touching the lower band may indicate oversold conditions.",
    category: "technical",
    synonyms: [],
  },
  {
    term: "SMA",
    definition: "Simple Moving Average - The average price of a stock over a specific period (like 20 or 50 days). It smooths out price data to help identify trends. When price crosses above the SMA, it may signal an uptrend; crossing below may signal a downtrend.",
    category: "technical",
    synonyms: ["Simple Moving Average"],
  },
  {
    term: "EMA",
    definition: "Exponential Moving Average - Similar to a simple moving average but gives more weight to recent prices, making it more responsive to new information. Often used to identify short-term trends.",
    category: "technical",
    synonyms: ["Exponential Moving Average"],
  },
  {
    term: "ATR",
    definition: "Average True Range - A measure of volatility that shows how much a stock typically moves during a trading session. Higher ATR indicates greater volatility and larger price swings; lower ATR indicates calmer trading.",
    category: "technical",
    synonyms: ["Average True Range"],
  },
  {
    term: "Volume Trend",
    definition: "The direction and strength of trading activity. Increasing volume often confirms price movements, while decreasing volume may suggest weakening conviction. Stable volume indicates consistent trading interest.",
    category: "technical",
    synonyms: ["Trading Volume Trend"],
  },
  
  // Fundamental Metrics
  {
    term: "P&L",
    definition: "Profit and Loss - A financial statement showing revenues, costs, and expenses over a specific period. It reveals whether a company is making or losing money.",
    category: "fundamental",
    synonyms: ["Profit and Loss", "Income Statement", "Profit Margin"],
  },
  {
    term: "Profit Margin",
    definition: "The percentage of revenue that becomes profit. For example, a 20% profit margin means the company keeps $0.20 of every dollar in sales after covering all expenses. Higher margins indicate better profitability.",
    category: "fundamental",
    synonyms: ["Net Margin", "Operating Margin", "P&L"],
  },
  {
    term: "P/E Ratio",
    definition: "Price-to-Earnings Ratio - Compares a company's stock price to its earnings per share. A P/E of 20 means investors are willing to pay $20 for every $1 of annual earnings. Higher P/E ratios may suggest growth expectations or overvaluation.",
    category: "fundamental",
    synonyms: ["PE Ratio", "Price to Earnings"],
  },
  {
    term: "Market Cap",
    definition: "Market Capitalization - The total value of all a company's outstanding shares. Calculated by multiplying share price by total shares. Companies are often grouped as small-cap (< $2B), mid-cap ($2B-$10B), or large-cap (> $10B).",
    category: "fundamental",
    synonyms: ["Market Capitalization"],
  },
  {
    term: "ROE",
    definition: "Return on Equity - Measures how efficiently a company uses shareholder investments to generate profit. A 15% ROE means the company generates $0.15 profit for every $1 of shareholder equity. Higher ROE typically indicates better performance.",
    category: "fundamental",
    synonyms: ["Return on Equity"],
  },
  {
    term: "Debt-to-Equity Ratio",
    definition: "Compares a company's total debt to shareholders' equity. A ratio of 0.5 means the company has $0.50 of debt for every $1 of equity. Lower ratios generally indicate less financial risk.",
    category: "fundamental",
    synonyms: ["D/E Ratio", "Leverage Ratio"],
  },
  {
    term: "Current Ratio",
    definition: "A liquidity measure comparing current assets to current liabilities. A ratio above 1.0 means the company has more short-term assets than short-term debts, suggesting good short-term financial health.",
    category: "fundamental",
    synonyms: ["Liquidity Ratio"],
  },
  {
    term: "Free Cash Flow",
    definition: "The cash a company generates after paying for operating expenses and capital expenditures. It represents money available for dividends, debt reduction, or growth investments. Positive free cash flow is a sign of financial health.",
    category: "fundamental",
    synonyms: ["FCF", "Operating Cash Flow"],
  },
  
  // General Terms
  {
    term: "Insider Trading",
    definition: "When company executives, directors, or employees buy or sell shares of their own company. Buying may signal confidence in the company's future, while selling could indicate concerns (or simply portfolio diversification).",
    category: "general",
    synonyms: ["Insider Transactions"],
  },
  {
    term: "SEC Filing",
    definition: "Official documents companies must file with the Securities and Exchange Commission. Key filings include 10-K (annual report), 10-Q (quarterly report), and 8-K (major events). These provide detailed financial and business information.",
    category: "general",
    synonyms: ["10-K", "10-Q", "8-K", "SEC Report"],
  },
  {
    term: "Sentiment Analysis",
    definition: "Using news articles, social media, and other text sources to gauge public opinion about a stock. Positive sentiment may support price increases, while negative sentiment may indicate downward pressure.",
    category: "general",
    synonyms: ["News Sentiment", "Market Sentiment"],
  },
  {
    term: "Financial Health Score",
    definition: "A comprehensive rating (0-100) that evaluates a company's overall financial condition by analyzing profitability, liquidity, debt levels, and growth metrics. Higher scores indicate stronger financial stability.",
    category: "general",
    synonyms: ["Financial Strength", "Credit Rating"],
  },
];

export async function seedGlossary() {
  console.log("Seeding glossary terms...");
  
  try {
    // Check if terms already exist
    const existing = await db.select().from(glossaryTerms).limit(1);
    
    if (existing.length > 0) {
      console.log("Glossary terms already seeded. Skipping.");
      return;
    }
    
    // Insert all terms
    for (const term of initialTerms) {
      await db.insert(glossaryTerms).values(term);
    }
    
    console.log(`✓ Successfully seeded ${initialTerms.length} glossary terms`);
  } catch (error) {
    console.error("Error seeding glossary:", error);
    throw error;
  }
}

// Auto-run when script is executed directly
seedGlossary()
  .then(() => {
    console.log("Glossary seeding complete");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Glossary seeding failed:", error);
    process.exit(1);
  });
