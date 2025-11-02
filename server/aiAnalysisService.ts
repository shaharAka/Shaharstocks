/**
 * AI Financial Analysis Service
 * Uses OpenAI GPT-4.1 via Replit AI Integrations to analyze stocks with multi-signal approach
 * Combines fundamental data, technical indicators, news sentiment, price-news correlation,
 * volume analysis, and insider trading patterns for comprehensive analysis.
 * 
 * This internally uses Replit AI Integrations, which provides OpenAI-compatible API access
 * without requiring your own OpenAI API key. Charges are billed to your Replit credits.
 */

import OpenAI from "openai";
import type { TechnicalIndicators, NewsSentiment, PriceNewsCorrelation } from "./stockService";

// Using OpenAI API for AI-powered stock analysis
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export interface FinancialAnalysis {
  ticker: string;
  overallRating: "strong_buy" | "buy" | "hold" | "avoid" | "strong_avoid";
  confidenceScore: number; // 0-100
  summary: string;
  financialHealth: {
    score: number; // 0-100
    strengths: string[];
    weaknesses: string[];
    redFlags: string[];
  };
  technicalAnalysis: {
    score: number; // 0-100
    trend: "bullish" | "bearish" | "neutral";
    momentum: "strong" | "moderate" | "weak";
    signals: string[];
  };
  sentimentAnalysis: {
    score: number; // 0-100
    trend: "positive" | "negative" | "neutral";
    newsVolume: "high" | "medium" | "low";
    key_themes: string[];
  };
  keyMetrics: {
    profitability: string;
    liquidity: string;
    leverage: string;
    growth: string;
  };
  risks: string[];
  opportunities: string[];
  recommendation: string;
  analyzedAt: string;
}

interface FinancialData {
  ticker: string;
  companyOverview: any;
  balanceSheet: any;
  incomeStatement: any;
  cashFlow: any;
  technicalIndicators?: TechnicalIndicators;
  newsSentiment?: NewsSentiment;
  priceNewsCorrelation?: PriceNewsCorrelation;
  insiderTradingStrength?: {
    recentPurchases: number;
    totalValue: string;
    confidence: string;
  };
  // SEC EDGAR Filing Narratives
  secFilings?: {
    formType: string;
    filingDate: string;
    managementDiscussion: string | null;
    riskFactors: string | null;
    businessOverview: string | null;
  };
  // Alpha Vantage Comprehensive Fundamentals
  comprehensiveFundamentals?: {
    marketCap?: string;
    peRatio?: number;
    pegRatio?: number;
    profitMargin?: number;
    returnOnEquity?: number;
    debtToEquity?: number;
    currentRatio?: number;
    totalRevenue?: string;
    grossProfit?: string;
    netIncome?: string;
    operatingCashflow?: string;
    freeCashFlow?: string;
    totalAssets?: string;
    totalLiabilities?: string;
  };
}

class AIAnalysisService {
  /**
   * Analyze a stock using AI with multi-signal approach
   * Combines fundamental data, technical indicators, news sentiment, and insider trading
   */
  async analyzeStock(financialData: FinancialData): Promise<FinancialAnalysis> {
    const { 
      ticker, 
      companyOverview, 
      balanceSheet, 
      incomeStatement, 
      cashFlow,
      technicalIndicators,
      newsSentiment,
      priceNewsCorrelation,
      insiderTradingStrength,
      secFilings,
      comprehensiveFundamentals
    } = financialData;

    // Prepare the financial data summary for AI (with null checks for graceful degradation)
    const latestBalanceSheet = balanceSheet?.annualReports?.[0] || balanceSheet?.quarterlyReports?.[0];
    const latestIncomeStatement = incomeStatement?.annualReports?.[0] || incomeStatement?.quarterlyReports?.[0];
    const latestCashFlow = cashFlow?.annualReports?.[0] || cashFlow?.quarterlyReports?.[0];

    // Build insider trade validation prompt - focus on 1-2 week outlook
    const prompt = `You are a seasoned equity analyst specializing in insider trading patterns. This stock has recent INSIDER BUYING activity. Your job is to validate whether this insider signal is worth acting on for a 1-2 WEEK TRADING WINDOW.

INVESTMENT HORIZON: 1-2 weeks (short-term trading opportunity)

CONTEXT: Company insiders (executives, board members) just purchased shares. Analyze if this is a strong buy signal or if there are concerns that make it a pass within the next 1-2 weeks.

=== COMPANY: ${ticker} ===
Sector: ${companyOverview?.sector || "N/A"}
Market Cap: ${comprehensiveFundamentals?.marketCap || companyOverview?.marketCap || "N/A"}

=== SEC FILING ANALYSIS ===
${secFilings ? `
Filing Type: ${secFilings.formType} (Filed: ${secFilings.filingDate})

Read through this SEC filing as an analyst. Extract KEY SIGNALS that validate or contradict the insider buy:

BUSINESS OVERVIEW EXCERPT:
${secFilings.businessOverview ? secFilings.businessOverview.substring(0, 2500) : "Not available"}

MANAGEMENT DISCUSSION & ANALYSIS (MD&A) EXCERPT:
${secFilings.managementDiscussion ? secFilings.managementDiscussion.substring(0, 4000) : "Not available"}

RISK FACTORS EXCERPT:
${secFilings.riskFactors ? secFilings.riskFactors.substring(0, 3000) : "Not available"}

YOUR TASK: Extract 3-5 specific insights from these filings that either:
- SUPPORT the insider buy (e.g., new product launch, expansion plans, strong guidance)
- CONTRADICT the insider buy (e.g., major risks, declining markets, litigation)
` : "SEC filings not available - rely on fundamentals only"}

=== COMPREHENSIVE FUNDAMENTALS ANALYSIS ===
Read these numbers like a professional analyst. Look for patterns, trends, and signals:

VALUATION & PROFITABILITY:
- P/E Ratio: ${comprehensiveFundamentals?.peRatio || companyOverview?.peRatio || "N/A"}
- PEG Ratio: ${comprehensiveFundamentals?.pegRatio || "N/A"}
- Profit Margin: ${comprehensiveFundamentals?.profitMargin ? `${(comprehensiveFundamentals.profitMargin * 100).toFixed(2)}%` : "N/A"}
- Return on Equity: ${comprehensiveFundamentals?.returnOnEquity ? `${(comprehensiveFundamentals.returnOnEquity * 100).toFixed(2)}%` : "N/A"}

BALANCE SHEET HEALTH (${latestBalanceSheet?.fiscalDateEnding || "Latest"}):
- Total Assets: ${comprehensiveFundamentals?.totalAssets || latestBalanceSheet?.totalAssets || "N/A"}
- Total Liabilities: ${comprehensiveFundamentals?.totalLiabilities || latestBalanceSheet?.totalLiabilities || "N/A"}
- Current Ratio: ${comprehensiveFundamentals?.currentRatio || "N/A"}
- Debt-to-Equity: ${comprehensiveFundamentals?.debtToEquity || "N/A"}
- Cash Position: ${latestBalanceSheet?.cashAndCashEquivalentsAtCarryingValue || "N/A"}

INCOME PERFORMANCE (${latestIncomeStatement?.fiscalDateEnding || "Latest"}):
- Revenue: ${comprehensiveFundamentals?.totalRevenue || latestIncomeStatement?.totalRevenue || "N/A"}
- Gross Profit: ${comprehensiveFundamentals?.grossProfit || latestIncomeStatement?.grossProfit || "N/A"}
- Net Income: ${comprehensiveFundamentals?.netIncome || latestIncomeStatement?.netIncome || "N/A"}
- EBITDA: ${latestIncomeStatement?.ebitda || "N/A"}

CASH FLOW STRENGTH (${latestCashFlow?.fiscalDateEnding || "Latest"}):
- Operating Cash Flow: ${comprehensiveFundamentals?.operatingCashflow || latestCashFlow?.operatingCashflow || "N/A"}
- Free Cash Flow: ${comprehensiveFundamentals?.freeCashFlow || (latestCashFlow?.operatingCashflow && latestCashFlow?.capitalExpenditures 
    ? (parseFloat(latestCashFlow.operatingCashflow) - parseFloat(latestCashFlow.capitalExpenditures)).toString() 
    : "N/A")}

YOUR TASK: Analyze these fundamentals to identify:
- Is the company financially healthy enough to support a price increase?
- Are profit margins expanding or contracting?
- Is there sufficient cash flow to fund operations?
- Are valuation multiples (P/E, PEG) attractive or expensive?

=== TECHNICAL & SENTIMENT ===
${technicalIndicators ? `
Technical Indicators:
- RSI: ${technicalIndicators.rsi.value.toFixed(2)} (${technicalIndicators.rsi.signal})
- MACD Trend: ${technicalIndicators.macd.trend}
- Price vs Moving Averages: SMA20 $${technicalIndicators.sma20.toFixed(2)}, SMA50 $${technicalIndicators.sma50.toFixed(2)}
- Volatility (ATR): ${technicalIndicators.atr.toFixed(2)}
` : ""}

${newsSentiment ? `
Recent News Sentiment: ${newsSentiment.aggregateSentiment.toFixed(2)} (${newsSentiment.sentimentTrend})
News Volume: ${newsSentiment.newsVolume} articles
Top Headlines: ${newsSentiment.articles.slice(0, 3).map(a => a.title).join(' | ')}
` : ""}

=== INSIDER TRADE VALIDATION ===
${insiderTradingStrength ? `
Insider Activity: ${insiderTradingStrength.recentPurchases} recent purchase(s)
Total Value: ${insiderTradingStrength.totalValue}
Signal Strength: ${insiderTradingStrength.confidence}
` : "Insider just bought shares - validate this signal"}

=== ANALYSIS REQUIREMENTS ===
Provide your analysis in this EXACT JSON format:
{
  "overallRating": "buy" or "pass",
  "confidenceScore": 0-100,
  "summary": "2-3 sentences: Does this insider buy have merit? What's the 1-2 week outlook?",
  "financialHealth": {
    "score": 0-100,
    "strengths": ["List 2-4 specific financial strengths you found in the numbers"],
    "weaknesses": ["List 2-4 specific financial weaknesses or concerns"],
    "redFlags": ["List any serious red flags from SEC filings or financials, or empty array"]
  },
  "secFilingInsights": ["Extract 3-5 KEY INSIGHTS from SEC filings that validate OR contradict the insider buy"],
  "fundamentalSignals": ["Extract 3-5 specific SIGNALS from the fundamental numbers (e.g., 'ROE 25% indicates strong profitability', 'Debt-to-equity 0.3 shows conservative leverage')"],
  "technicalAnalysis": {
    "score": 0-100,
    "trend": "bullish" or "bearish" or "neutral",
    "momentum": "strong" or "moderate" or "weak",
    "signals": ["2-3 key technical signals for the 1-2 week window"]
  },
  "sentimentAnalysis": {
    "score": 0-100,
    "trend": "positive" or "negative" or "neutral",
    "newsVolume": "high" or "medium" or "low",
    "key_themes": ["2-3 key themes from recent news"]
  },
  "insiderValidation": "1-2 sentences: Does the fundamental and technical analysis support this insider buy?",
  "risks": ["List 3-5 specific risks for the 1-2 week window"],
  "opportunities": ["List 2-4 specific catalysts that could drive price up in 1-2 weeks"],
  "recommendation": "Clear 2-3 sentence recommendation: BUY or PASS for 1-2 week window, and why"
}

MICRO SCORE RUBRIC (confidenceScore: 0-100 scale):
This is your STOCK-SPECIFIC (MICRO) analysis score based on fundamentals, technicals, and insider signals.
- 90-100: STRONG BUY - All signals align, insider buy is highly validated, excellent 1-2 week setup
- 70-89: BUY - Good fundamentals support insider signal, favorable near-term outlook
- 50-69: WEAK BUY - Mixed signals, insider buy has some merit but concerns exist
- 30-49: PASS - Fundamentals don't support insider buy, or significant risks
- 0-29: STRONG PASS - Red flags contradict insider signal, avoid

NOTE: This micro score will be adjusted by a separate MACRO analysis that considers market-wide and sector conditions.

Focus on actionable insights. Be direct. This is for real money decisions.`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4.1", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_completion_tokens: 8192,
      });

      const content = response.choices[0]?.message?.content || "{}";
      const analysis = JSON.parse(content);

      // Add metadata
      return {
        ticker,
        ...analysis,
        analyzedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error("[AIAnalysisService] Error analyzing stock:", error);
      throw new Error(`Failed to analyze ${ticker}: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Generate a quick summary of analysis for display
   */
  generateQuickSummary(analysis: FinancialAnalysis): string {
    const rating = analysis.overallRating.replace(/_/g, " ").toUpperCase();
    const score = analysis.financialHealth.score;
    return `${rating} (${score}/100) - ${analysis.summary}`;
  }
}

export const aiAnalysisService = new AIAnalysisService();
