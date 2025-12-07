/**
 * AI Financial Analysis Service
 * Supports multiple AI providers (OpenAI, Gemini) for stock analysis
 * Combines fundamental data, technical indicators, news sentiment, price-news correlation,
 * volume analysis, and insider trading patterns for comprehensive analysis.
 * 
 * Provider selection is configurable via admin backoffice settings.
 */

import OpenAI from "openai";
import type { TechnicalIndicators, NewsSentiment, PriceNewsCorrelation } from "./stockService";
import { getAIProvider, type AIProviderConfig, type AIProvider, type ChatMessage } from "./aiProvider";
import { 
  generateScoringRubricPrompt, 
  scorecardConfig, 
  SCORECARD_VERSION,
  type Scorecard,
  type SectionScore,
  type MetricScore,
  calculateSectionScore,
  calculateGlobalScore,
  determineConfidence
} from "./scoring/scorecardConfig";

// Default OpenAI client for backwards compatibility
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Current AI provider configuration (will be loaded from database)
let currentProviderConfig: AIProviderConfig = { provider: "openai" };

/**
 * Strip markdown code fences from JSON response
 * Handles formats like: ```json\n{...}\n```, ```\n{...}\n```, or just {...}
 */
function stripMarkdownCodeBlocks(content: string): string {
  let cleaned = content.trim();
  if (cleaned.startsWith('```')) {
    // Remove opening fence (```json or ```)
    cleaned = cleaned.replace(/^```(?:json|JSON)?\s*\n?/, '');
    // Remove closing fence
    cleaned = cleaned.replace(/\n?```\s*$/, '');
    cleaned = cleaned.trim();
  }
  return cleaned;
}

export interface SectionExplanation {
  summary: string; // 1-2 sentence explanation of why this section scored as it did
  keyFactors: string[]; // 2-3 bullet points with specific metric values
  outlook: "bullish" | "neutral" | "bearish"; // Directional outlook for this section
}

export interface FinancialAnalysis {
  ticker: string;
  overallRating: "strong_buy" | "buy" | "hold" | "avoid" | "strong_avoid";
  confidenceScore: number; // 0-100
  summary: string;
  // NEW: Section-aligned explanations that map to the 5 scorecard sections
  // Optional since AI may not always return all sections
  sectionExplanations?: {
    fundamentals?: SectionExplanation;
    technicals?: SectionExplanation;
    insiderActivity?: SectionExplanation;
    newsSentiment?: SectionExplanation;
    macroSector?: SectionExplanation;
  };
  // Legacy fields - kept for backward compatibility
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
    direction: string; // "buy", "sell", or "mixed"
    transactionType: string; // "purchase", "sale", or "mixed"
    dominantSignal: string; // Human-readable signal description
    buyCount: number; // Number of BUY transactions
    sellCount: number; // Number of SELL transactions
    totalTransactions: number; // Total transaction count
    quantityStr: string; // Formatted quantity with "shares" or "Unknown"
    insiderPrice: string; // Formatted price or "Unknown"
    currentPrice: string; // Formatted price or "Unknown"
    insiderName: string;
    insiderTitle: string;
    tradeDate: string;
    totalValue: string; // Formatted value or "Unknown"
    confidence: string;
    allTransactions: Array<{
      direction: string;
      insiderName: string;
      insiderTitle: string;
      quantityStr: string; // Formatted quantity or "Unknown"
      price: string; // Formatted price or "Unknown"
      date: string;
      value: string; // Formatted value or "Unknown"
    }>;
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
  // Macro/sector analysis for context
  macroAnalysis?: {
    industry?: string;
    macroScore?: number;
    macroFactor?: number;
    marketCondition?: string;
    sectorOutlook?: string;
  };
}

/**
 * Calculate timing metrics for insider trade analysis
 */
function calculateTimingMetrics(insiderTradingStrength: FinancialData['insiderTradingStrength']): {
  daysSinceTrade: number;
  priceChangePct: number;
  timingPhase: 'early' | 'mid' | 'late' | 'unknown';
  timingExplanation: string;
} | null {
  if (!insiderTradingStrength) return null;
  
  // Parse trade date - handle missing/invalid dates
  const tradeDateStr = insiderTradingStrength.tradeDate;
  if (!tradeDateStr || tradeDateStr === 'Unknown' || tradeDateStr === 'N/A') return null;
  
  const tradeDate = new Date(tradeDateStr);
  if (isNaN(tradeDate.getTime())) return null;
  
  const now = new Date();
  const daysSinceTrade = Math.floor((now.getTime() - tradeDate.getTime()) / (1000 * 60 * 60 * 24));
  
  // Parse prices (remove $ and commas) - handle missing/unknown values
  const insiderPriceStr = insiderTradingStrength.insiderPrice;
  const currentPriceStr = insiderTradingStrength.currentPrice;
  
  // Guard against undefined, null, or "Unknown" values
  if (!insiderPriceStr || !currentPriceStr || 
      insiderPriceStr === 'Unknown' || currentPriceStr === 'Unknown' ||
      insiderPriceStr === 'N/A' || currentPriceStr === 'N/A') {
    // Return with just timing info, no price change
    return {
      daysSinceTrade,
      priceChangePct: 0,
      timingPhase: daysSinceTrade <= 5 ? 'early' : daysSinceTrade <= 14 ? 'mid' : 'late',
      timingExplanation: `Trade was ${daysSinceTrade} days ago. Price data unavailable for change calculation.`
    };
  }
  
  const insiderPrice = parseFloat(insiderPriceStr.replace(/[$,]/g, ''));
  const currentPrice = parseFloat(currentPriceStr.replace(/[$,]/g, ''));
  
  // Calculate price change
  const priceChangePct = isNaN(insiderPrice) || isNaN(currentPrice) || insiderPrice === 0 
    ? 0 
    : ((currentPrice - insiderPrice) / insiderPrice) * 100;
  
  // Determine timing phase based on days and price movement
  let timingPhase: 'early' | 'mid' | 'late' | 'unknown' = 'unknown';
  let timingExplanation = '';
  
  const isBuy = insiderTradingStrength.direction === 'buy';
  
  if (daysSinceTrade <= 5) {
    timingPhase = 'early';
    timingExplanation = `Trade was ${daysSinceTrade} days ago. This is EARLY - the market may not have fully reacted yet.`;
  } else if (daysSinceTrade <= 14) {
    if (isBuy) {
      if (priceChangePct > 10) {
        timingPhase = 'late';
        timingExplanation = `Price already up ${priceChangePct.toFixed(1)}% since trade ${daysSinceTrade} days ago. May be LATE to the move.`;
      } else if (priceChangePct < -5) {
        timingPhase = 'early';
        timingExplanation = `Price down ${Math.abs(priceChangePct).toFixed(1)}% since trade - could be a better entry if thesis holds.`;
      } else {
        timingPhase = 'mid';
        timingExplanation = `Trade ${daysSinceTrade} days ago, price ${priceChangePct >= 0 ? 'up' : 'down'} ${Math.abs(priceChangePct).toFixed(1)}%. MID-MOVE timing.`;
      }
    } else {
      if (priceChangePct < -10) {
        timingPhase = 'late';
        timingExplanation = `Price already down ${Math.abs(priceChangePct).toFixed(1)}% since sell ${daysSinceTrade} days ago. May be LATE to exit.`;
      } else {
        timingPhase = 'mid';
        timingExplanation = `Sell was ${daysSinceTrade} days ago. Price ${priceChangePct >= 0 ? 'up' : 'down'} ${Math.abs(priceChangePct).toFixed(1)}%.`;
      }
    }
  } else {
    timingPhase = 'late';
    timingExplanation = `Trade was ${daysSinceTrade} days ago (over 2 weeks). The opportunity window may have passed.`;
  }
  
  return { daysSinceTrade, priceChangePct, timingPhase, timingExplanation };
}

class AIAnalysisService {
  /**
   * Set the AI provider configuration
   * Called when admin changes the provider in settings
   */
  setProviderConfig(config: AIProviderConfig): void {
    console.log(`[AIAnalysisService] Setting AI provider to: ${config.provider}${config.model ? ` (model: ${config.model})` : ""}`);
    currentProviderConfig = config;
  }

  /**
   * Get the current AI provider configuration
   */
  getProviderConfig(): AIProviderConfig {
    return currentProviderConfig;
  }

  /**
   * Get the AI provider instance based on current configuration
   */
  private getProvider(): AIProvider {
    return getAIProvider(currentProviderConfig);
  }

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

    // Determine transaction direction and build context-aware prompt
    const isBuy = insiderTradingStrength?.direction === "buy";
    const isSell = insiderTradingStrength?.direction === "sell";
    const transactionContext = isBuy 
      ? "INSIDER BUYING" 
      : (isSell ? "INSIDER SELLING" : "INSIDER TRADING");
    
    // Calculate timing metrics to understand if we're early/mid/late in the move
    const timingMetrics = calculateTimingMetrics(insiderTradingStrength);
    
    const analysisContext = isBuy
      ? "Company insiders (executives, board members) just purchased shares. Analyze if this is a strong buy signal or if there are concerns that make it a pass within the next 1-2 weeks."
      : (isSell 
        ? "Company insiders (executives, board members) just SOLD shares. This is typically a BEARISH signal. Analyze if the fundamentals justify their decision to sell, or if this is just routine portfolio rebalancing. Consider whether you should AVOID this stock or if the sell is a false alarm."
        : "Company insiders just transacted shares. Analyze the signal.");

    // Build insider trade validation prompt - focus on 1-2 week outlook
    const prompt = `You are a seasoned equity analyst specializing in insider trading patterns. This stock has recent ${transactionContext} activity. Your job is to validate whether this insider signal is worth acting on for a 1-2 WEEK TRADING WINDOW.

INVESTMENT HORIZON: 1-2 weeks (short-term trading opportunity)

CONTEXT: ${analysisContext}

=== COMPANY: ${ticker} ===
Sector: ${companyOverview?.sector || "N/A"}
Market Cap: ${comprehensiveFundamentals?.marketCap || companyOverview?.marketCap || "N/A"}

=== SEC FILING ANALYSIS ===
${secFilings ? `
Filing Type: ${secFilings.formType} (Filed: ${secFilings.filingDate})

Read through this SEC filing as an analyst. Extract KEY SIGNALS that validate or contradict the insider ${isBuy ? "buy" : (isSell ? "sell" : "transaction")}:

BUSINESS OVERVIEW EXCERPT:
${secFilings.businessOverview ? secFilings.businessOverview.substring(0, 2500) : "Not available"}

MANAGEMENT DISCUSSION & ANALYSIS (MD&A) EXCERPT:
${secFilings.managementDiscussion ? secFilings.managementDiscussion.substring(0, 4000) : "Not available"}

RISK FACTORS EXCERPT:
${secFilings.riskFactors ? secFilings.riskFactors.substring(0, 3000) : "Not available"}

YOUR TASK: Extract 3-5 specific insights from these filings that either:
${isBuy 
  ? "- SUPPORT the insider buy (e.g., new product launch, expansion plans, strong guidance)\n- CONTRADICT the insider buy (e.g., major risks, declining markets, litigation)"
  : (isSell 
    ? "- JUSTIFY the insider sell (e.g., major risks, declining markets, litigation, operational challenges)\n- CONTRADICT the insider sell (e.g., strong guidance, new opportunities, improving fundamentals)"
    : "- Support or contradict the insider transaction")}
` : "SEC filings not available - rely on fundamentals only"}

=== COMPREHENSIVE FUNDAMENTALS ANALYSIS ===
Read these numbers like a professional analyst. Look for patterns, trends, and signals.

CRITICAL: When providing your financialHealth analysis, you MUST cite specific metrics from the company data below as evidence in your strengths and weaknesses arrays. 
For example:
- "Profit margin of 18.5% indicates strong profitability"
- "Current ratio of 2.1 shows excellent liquidity"
- "Debt-to-equity of 1.8 indicates high leverage"
- "Operating cash flow of $2.5B demonstrates solid operations"

Use the ACTUAL NUMBERS from the data below - do not make up numbers:

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
SIGNAL SUMMARY: ${insiderTradingStrength.dominantSignal}
Transaction Breakdown: ${insiderTradingStrength.buyCount} BUY, ${insiderTradingStrength.sellCount} SELL (Total: ${insiderTradingStrength.totalTransactions})

PRIMARY TRANSACTION (Most Recent):
- Direction: ${insiderTradingStrength.direction.toUpperCase()}
- Insider: ${insiderTradingStrength.insiderName} (${insiderTradingStrength.insiderTitle})
- Date: ${insiderTradingStrength.tradeDate}
- Quantity: ${insiderTradingStrength.quantityStr}
- Insider Price: ${insiderTradingStrength.insiderPrice}
- Current Price: ${insiderTradingStrength.currentPrice}
- Total Value: ${insiderTradingStrength.totalValue}

⏱️ TIMING ANALYSIS (CRITICAL FOR 1-2 WEEK HORIZON):
${timingMetrics ? `
- Days Since Trade: ${timingMetrics.daysSinceTrade} days
- Price Change Since Trade: ${timingMetrics.priceChangePct >= 0 ? '+' : ''}${timingMetrics.priceChangePct.toFixed(1)}%
- TIMING PHASE: ${timingMetrics.timingPhase.toUpperCase()}
- Assessment: ${timingMetrics.timingExplanation}

TIMING GUIDANCE:
- EARLY (0-5 days): Good entry window, market may not have fully absorbed the signal
- MID (5-14 days, modest move): Acceptable if fundamentals support
- LATE (14+ days OR >10% move already): Opportunity may have passed, higher risk

You MUST factor timing into your recommendation. If the trade is LATE, acknowledge this and adjust confidence accordingly.
` : "Timing data unavailable - proceed with caution on timing assessment"}

ALL TRANSACTIONS FOR THIS TICKER:
${insiderTradingStrength.allTransactions.map((t, idx) => 
  `${idx + 1}. ${t.direction.toUpperCase()} - ${t.insiderName} (${t.insiderTitle}): ${t.quantityStr} @ ${t.price} on ${t.date} (Value: ${t.value})`
).join('\n')}

SIGNAL INTERPRETATION:
${isBuy && insiderTradingStrength.sellCount === 0
  ? "✓ BULLISH SIGNAL: Only insider BUYING detected - typically indicates confidence in future performance"
  : (isSell && insiderTradingStrength.buyCount === 0
    ? "✗ BEARISH SIGNAL: Only insider SELLING detected - typically indicates concerns about future performance or overvaluation"
    : (insiderTradingStrength.buyCount > 0 && insiderTradingStrength.sellCount > 0
      ? `⚠️  MIXED SIGNALS: Both buying (${insiderTradingStrength.buyCount}) and selling (${insiderTradingStrength.sellCount}) detected. Analyze which signal is more recent and credible. Consider if different insiders have different outlooks, or if some are routine portfolio management.`
      : ""))}
` : "Insider transaction detected - validate this signal"}

=== ANALYSIS REQUIREMENTS ===
${isBuy 
  ? `Your rating should be "buy" if the insider purchase is validated by strong fundamentals, or "pass" if there are concerns.`
  : (isSell 
    ? `Your rating should be "sell" or "avoid" if the insider sale is justified by weak fundamentals or risks, or "pass" if the sell appears to be routine and fundamentals remain strong.`
    : `Your rating should reflect whether the insider transaction is validated by fundamentals.`)}

Provide your analysis in this EXACT JSON format:
{
  "overallRating": ${isBuy ? '"buy" or "pass"' : (isSell ? '"sell" or "avoid" or "pass"' : '"buy" or "sell" or "pass"')},
  "confidenceScore": 0-100,
  "summary": "2-3 sentences synthesizing all 5 sections: ${isBuy ? 'Does this insider buy have merit? What\'s the 1-2 week outlook?' : (isSell ? 'Does this insider sell signal weakness? Should investors avoid or is this routine portfolio management?' : 'Validate the insider transaction')}",
  
  "sectionExplanations": {
    "fundamentals": {
      "summary": "1-2 sentences explaining fundamental strength/weakness citing revenue growth, EPS, profit margins, FCF-to-debt, debt-to-equity",
      "keyFactors": ["Revenue growth X%", "Profit margin Y%", "Debt-to-equity Z"],
      "outlook": "bullish" or "neutral" or "bearish"
    },
    "technicals": {
      "summary": "1-2 sentences explaining price momentum, SMA alignment, RSI, MACD signals for 1-2 week horizon",
      "keyFactors": ["RSI at X indicates Y", "Price above/below SMA20/50", "MACD signal"],
      "outlook": "bullish" or "neutral" or "bearish"
    },
    "insiderActivity": {
      "summary": "1-2 sentences explaining insider transaction quality: who bought/sold, how much, how recently, role significance",
      "keyFactors": ["Net buy/sell ratio", "Transaction recency (X days ago)", "Insider role (CEO/CFO/Director)"],
      "outlook": "bullish" or "neutral" or "bearish"
    },
    "newsSentiment": {
      "summary": "1-2 sentences explaining recent news flow, sentiment trend, and any upcoming catalysts",
      "keyFactors": ["Average sentiment score", "News volume (high/medium/low)", "Key themes"],
      "outlook": "bullish" or "neutral" or "bearish"
    },
    "macroSector": {
      "summary": "1-2 sentences explaining sector performance vs SPY and macro environment for this industry",
      "keyFactors": ["Sector ETF vs SPY performance", "Macro risk level"],
      "outlook": "bullish" or "neutral" or "bearish"
    }
  },
  
  "financialHealth": {
    "score": 0-100,
    "strengths": ["MUST cite specific metrics with actual values - e.g., 'Current ratio of 2.1 indicates strong liquidity', 'Profit margin of 18.5% shows excellent profitability'"],
    "weaknesses": ["MUST cite specific metrics with actual values - e.g., 'Debt-to-equity of 2.3 indicates high leverage', 'Negative operating cash flow of -$50M raises sustainability concerns'"],
    "redFlags": ["List any serious red flags from SEC filings or financials, or empty array"]
  },
  "secFilingInsights": ["Extract 3-5 KEY INSIGHTS from SEC filings that validate OR contradict the insider ${isBuy ? "buy" : (isSell ? "sell" : "transaction")}"],
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
  "insiderValidation": "1-2 sentences: Does the fundamental and technical analysis support this insider ${isBuy ? "buy" : (isSell ? "sell" : "transaction")}?",
  "timingAssessment": {
    "phase": "early" or "mid" or "late",
    "explanation": "1-2 sentences explaining if we are early, mid, or late in the move based on trade date and price action"
  },
  "risks": ["List 3-5 specific risks for the 1-2 week window"],
  "opportunities": ["List 2-4 specific catalysts that could ${isBuy ? "drive price up" : (isSell ? "drive price down" : "move price")} in 1-2 weeks"],
  "recommendation": "REQUIRED FORMAT: Start with 'For the 1-2 week trading window:' then give your ${isBuy ? "BUY or PASS" : (isSell ? "AVOID or PASS" : "action")} recommendation with 2-3 sentences explaining why, citing timing, fundamentals, and key evidence."
}

CRITICAL: OPPORTUNITY SCORE RUBRIC (confidenceScore: 0-100 scale)
⚠️ THIS SCORE REPRESENTS "OPPORTUNITY STRENGTH" NOT "COMPANY QUALITY" ⚠️

${isBuy 
  ? `For INSIDER BUYING (BUY signal):
HIGH SCORE = STRONG BUY OPPORTUNITY (good company + insiders buying = strong opportunity)
- 90-100: EXCEPTIONAL BUY - Company fundamentals excellent, insider buy highly validated, all signals bullish
- 70-89: STRONG BUY - Solid fundamentals support insider confidence, favorable 1-2 week outlook  
- 50-69: MODERATE BUY - Mixed signals, insider buy has merit but some concerns exist
- 30-49: WEAK/PASS - Fundamentals don't strongly support insider buy, or significant risks present
- 0-29: AVOID - Red flags contradict insider buy signal, company has serious issues`
  : (isSell 
    ? `For INSIDER SELLING (SELL signal):  
HIGH SCORE = STRONG SELL OPPORTUNITY (weak company + insiders selling = strong bearish signal)
- 90-100: EXCEPTIONAL SELL - Company fundamentals very weak, insider sell highly validated by deteriorating metrics, avoid this stock
- 70-89: STRONG SELL - Weak fundamentals justify insider sell, significant bearish indicators present
- 50-69: MODERATE SELL - Some weakness validates sell but not conclusive, proceed with caution
- 30-49: WEAK/PASS - Fundamentals remain relatively strong, likely routine portfolio rebalancing
- 0-29: IGNORE SELL - Strong fundamentals contradict sell signal, company remains healthy`
    : `For MIXED SIGNALS:
- 90-100: STRONG SIGNAL - All signals align
- 70-89: VALIDATED - Fundamentals support insider signal
- 50-69: MIXED - Some merit but concerns exist
- 30-49: PASS - Fundamentals don't support signal
- 0-29: IGNORE - Red flags contradict signal`)}

NOTE: This micro score will be adjusted by a separate MACRO analysis that considers market-wide and sector conditions.

Focus on actionable insights. Be direct. This is for real money decisions.`;

    try {
      const provider = this.getProvider();
      console.log(`[AIAnalysisService] Analyzing ${ticker} using ${provider.getName()} (${provider.getModel()})`);
      
      const messages: ChatMessage[] = [{ role: "user", content: prompt }];
      
      const content = await provider.generateCompletion(messages, {
        temperature: 0.3,
        maxTokens: 8192,
        responseFormat: "json"
      });

      const cleanedContent = stripMarkdownCodeBlocks(content || "{}");
      const analysis = JSON.parse(cleanedContent);

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

  /**
   * Generate a lightweight daily brief for a followed stock - DUAL-SCENARIO VERSION
   * Returns BOTH "watching" and "owning" scenarios so users can evaluate from both angles
   * This is NOT the full AI analysis - it's a quick daily update (<120 words each)
   * with buy/hold/sell guidance based on current price, news, and context
   */
  async generateDailyBrief(params: {
    ticker: string;
    currentPrice: number;
    previousPrice: number;
    opportunityType?: "buy" | "sell"; // Type of opportunity (based on insider action)
    recentNews?: { title: string; sentiment: number; source: string }[];
    previousAnalysis?: { 
      overallRating: string; 
      summary: string; 
      recommendation?: string; // Full AI recommendation text from playbook
      integratedScore?: number; // Combined micro+macro score (0-100)
      confidenceScore?: number; // MICRO AGENT confidence (0-100)
      technicalAnalysis?: {
        trend?: string;
        momentum?: string;
        score?: number;
        signals?: string[];
      };
      sentimentAnalysis?: {
        trend?: string;
        newsVolume?: string;
        score?: number;
        keyThemes?: string[];
      };
      risks?: string[];
      opportunities?: string[];
      analyzedAt?: string;
      scorecard?: {
        globalScore: number;
        confidence: "high" | "medium" | "low";
        sections?: {
          fundamentals?: { score: number; weight: number };
          technicals?: { score: number; weight: number };
          insiderActivity?: { score: number; weight: number };
          newsSentiment?: { score: number; weight: number };
          macroSector?: { score: number; weight: number };
        };
        summary?: string;
      };
    };
  }): Promise<{
    watching: {
      recommendedStance: "buy" | "hold" | "sell" | "cover";
      confidence: number; // 1-10
      briefText: string; // <120 words
      keyHighlights: string[]; // 2-3 bullet points
    };
    owning: {
      recommendedStance: "buy" | "hold" | "sell" | "cover";
      confidence: number; // 1-10
      briefText: string; // <120 words
      keyHighlights: string[]; // 2-3 bullet points
    };
  }> {
    const { ticker, currentPrice, previousPrice, opportunityType = "buy", recentNews, previousAnalysis } = params;
    
    // Generate BOTH scenarios in parallel
    const [watchingBrief, owningBrief] = await Promise.all([
      this.generateSingleScenario({ ticker, currentPrice, previousPrice, opportunityType, userOwnsPosition: false, recentNews, previousAnalysis }),
      this.generateSingleScenario({ ticker, currentPrice, previousPrice, opportunityType, userOwnsPosition: true, recentNews, previousAnalysis })
    ]);
    
    return {
      watching: watchingBrief,
      owning: owningBrief
    };
  }

  /**
   * Internal helper to generate a single scenario (watching or owning)
   */
  private async generateSingleScenario(params: {
    ticker: string;
    currentPrice: number;
    previousPrice: number;
    opportunityType: "buy" | "sell";
    userOwnsPosition: boolean;
    recentNews?: { title: string; sentiment: number; source: string }[];
    previousAnalysis?: { 
      overallRating: string; 
      summary: string; 
      recommendation?: string;
      integratedScore?: number;
      confidenceScore?: number;
      technicalAnalysis?: {
        trend?: string;
        momentum?: string;
        score?: number;
        signals?: string[];
      };
      sentimentAnalysis?: {
        trend?: string;
        newsVolume?: string;
        score?: number;
        keyThemes?: string[];
      };
      risks?: string[];
      opportunities?: string[];
      analyzedAt?: string;
      scorecard?: {
        globalScore: number;
        confidence: "high" | "medium" | "low";
        sections?: {
          fundamentals?: { score: number; weight: number };
          technicals?: { score: number; weight: number };
          insiderActivity?: { score: number; weight: number };
          newsSentiment?: { score: number; weight: number };
          macroSector?: { score: number; weight: number };
        };
        summary?: string;
      };
    };
  }): Promise<{
    recommendedStance: "buy" | "hold" | "sell" | "cover";
    confidence: number;
    briefText: string;
    keyHighlights: string[];
  }> {
    const { ticker, currentPrice, previousPrice, opportunityType, userOwnsPosition, recentNews, previousAnalysis } = params;
    
    const priceChange = currentPrice - previousPrice;
    const priceChangePercent = ((priceChange / previousPrice) * 100).toFixed(2);
    
    const isBuyOpportunity = opportunityType === "buy";
    const isSellOpportunity = opportunityType === "sell";
    
    const positionContext = isSellOpportunity
      ? (userOwnsPosition
          ? `USER HAS A SHORT POSITION - Focus on COVERING STRATEGY (when to cover the short or hold it). This is a SHORTING analysis.`
          : `USER CONSIDERING SHORTING - Focus on SHORT ENTRY EVALUATION (should they open a short position now or wait?)`)
      : (userOwnsPosition
          ? `USER OWNS THIS STOCK - Focus on EXIT STRATEGY ONLY (when to sell or hold). NEVER recommend adding to position.`
          : `USER CONSIDERING ENTRY - Focus on ENTRY EVALUATION (should they enter now, wait, or avoid?)`);
    
    const opportunityContext = isBuyOpportunity
      ? "This is a BUY OPPORTUNITY - insiders recently BOUGHT shares, signaling potential upside."
      : "This is a SELL/SHORT OPPORTUNITY - insiders recently SOLD shares, signaling potential downside or weakness. Low AI score indicates company weakness, making this a good shorting candidate.";
    
    // Build enriched context from latest AI analysis (playbook)
    let trendContext = "";
    let signalScore = 50; // Default if no analysis available
    let aiPlaybookContext = "";
    
    if (previousAnalysis) {
      // Use integrated score if available (combines micro + macro agents)
      signalScore = previousAnalysis.integratedScore ?? previousAnalysis.confidenceScore ?? 50;
      
      // Build technical analysis context
      if (previousAnalysis.technicalAnalysis) {
        const tech = previousAnalysis.technicalAnalysis;
        const trend = tech.trend || "neutral";
        const momentum = tech.momentum || "weak";
        const techScore = typeof tech.score === "number" ? tech.score : 50;
        const signals = Array.isArray(tech.signals) ? tech.signals.slice(0, 3) : [];
        
        trendContext = `
TECHNICAL ANALYSIS (from latest AI playbook):
- Trend: ${trend}
- Momentum: ${momentum}
- Technical Score: ${techScore}/100
${signals.length > 0 ? `- Key Signals: ${signals.join(', ')}` : ''}`;
      }
      
      // Build sentiment context
      if (previousAnalysis.sentimentAnalysis) {
        const sentiment = previousAnalysis.sentimentAnalysis;
        trendContext += `
SENTIMENT ANALYSIS:
- Sentiment Trend: ${sentiment.trend || 'neutral'}
- News Volume: ${sentiment.newsVolume || 'low'}
- Sentiment Score: ${sentiment.score || 50}/100
${sentiment.keyThemes && sentiment.keyThemes.length > 0 ? `- Key Themes: ${sentiment.keyThemes.slice(0, 3).join(', ')}` : ''}`;
      }
      
      // Build comprehensive AI playbook context
      const analysisAge = previousAnalysis.analyzedAt 
        ? Math.floor((Date.now() - new Date(previousAnalysis.analyzedAt).getTime()) / (1000 * 60 * 60 * 24))
        : null;
      
      // Build scorecard breakdown if available
      let scorecardContext = "";
      if (previousAnalysis.scorecard) {
        const sc = previousAnalysis.scorecard;
        const sections = sc.sections || {};
        scorecardContext = `
SCORECARD BREAKDOWN (${sc.confidence?.toUpperCase() || 'MEDIUM'} confidence):
- Global Score: ${sc.globalScore}/100
${sections.fundamentals ? `- Fundamentals: ${sections.fundamentals.score}/100 (${sections.fundamentals.weight}% weight)` : ''}
${sections.technicals ? `- Technicals: ${sections.technicals.score}/100 (${sections.technicals.weight}% weight)` : ''}
${sections.insiderActivity ? `- Insider Activity: ${sections.insiderActivity.score}/100 (${sections.insiderActivity.weight}% weight)` : ''}
${sections.newsSentiment ? `- News Sentiment: ${sections.newsSentiment.score}/100 (${sections.newsSentiment.weight}% weight)` : ''}
${sections.macroSector ? `- Macro/Sector: ${sections.macroSector.score}/100 (${sections.macroSector.weight}% weight)` : ''}
${sc.summary ? `SCORECARD SUMMARY: ${sc.summary}` : ''}`;
      }
      
      aiPlaybookContext = `
=== LATEST AI PLAYBOOK (${analysisAge !== null ? `${analysisAge} days old` : 'date unknown'}) ===
INTEGRATED SIGNAL SCORE: ${signalScore}/100 ${signalScore >= 90 ? '🔥 VERY HIGH CONVICTION' : signalScore >= 70 ? '⚡ HIGH CONVICTION' : signalScore >= 50 ? '➡️ MODERATE' : '⚠️ LOW/CAUTIONARY'}
OVERALL RATING: ${previousAnalysis.overallRating?.toUpperCase() || 'N/A'}
SUMMARY: ${previousAnalysis.summary || 'No summary available'}
${previousAnalysis.recommendation ? `
AI RECOMMENDATION: ${previousAnalysis.recommendation}` : ''}
${scorecardContext}
${previousAnalysis.risks && previousAnalysis.risks.length > 0 ? `
KEY RISKS: ${previousAnalysis.risks.slice(0, 3).join('; ')}` : ''}
${previousAnalysis.opportunities && previousAnalysis.opportunities.length > 0 ? `
KEY OPPORTUNITIES: ${previousAnalysis.opportunities.slice(0, 3).join('; ')}` : ''}
=== END PLAYBOOK ===`;
    }
    
    // Different stance rules based on ownership - NOW WITH TREND AWARENESS
    let stanceRules: string;
    
    if (userOwnsPosition) {
      // User owns the position - focus ONLY on exit strategy
      stanceRules = isBuyOpportunity
        ? `STANCE RULES for OWNED LONG POSITION (Buy Opportunity):
Use initial trend as baseline. Focus on WHEN TO EXIT or HOLD.

⚠️ CRITICAL: You can ONLY recommend "sell" or "hold" - NEVER "buy". This is exit strategy, not adding to position.

ACT (sell only):
- "sell" if price +5%+ AND initial trend weakening (take profit)
- "sell" if price -3%+ AND violates initial bullish trend (stop loss)

HOLD:
- Gains +1-4% with initial trend intact (let it run)
- Sideways action, initial trend neutral (wait for clarity)
- Price -2% to -4% but initial trend still bullish/moderate (don't panic sell on small dips)

Decision: SELL when trend confirms exit. HOLD when trend supports staying in. NEVER recommend "buy".`
        : `STANCE RULES for OWNED SHORT POSITION (Sell/Short Opportunity):
You have a SHORT position. Price DECLINE = your profit. Focus on COVERING strategy.

⚠️ CRITICAL: You can ONLY recommend "cover" or "hold" - NO OTHER VALUES.
- "cover" = Close/exit the short position NOW (buy back shares to cover)
- "hold" = Keep the short position open / Stay short

COVER (EXIT SHORT):
- "cover" if price -5%+ (take short profit on significant decline)
- "cover" if price +3%+ AND initial bearish trend reversing bullish (stop loss - trend against you)
- "cover" if strong bullish news violates bearish thesis (cut losses early)

HOLD (STAY SHORT):
- "hold" if price declining -1% to -4% with initial bearish trend intact (let it run down)
- "hold" if sideways action with initial trend still bearish/weak (wait for more decline)
- "hold" if price +1% to +2% (small rally) but initial trend still bearish (noise, not reversal)

Decision: "cover" when you've profited enough OR trend reversing against you. "hold" when bearish trend continues. For shorts, price FALLING = your gain.`
    } else {
      // User doesn't own - focus on entry evaluation with ENTER/WAIT logic
      const scoreGuidance = isBuyOpportunity
        ? signalScore >= 90
          ? "🔥 VERY HIGH SIGNAL (90-100): Be HIGHLY LENIENT on entry. Even minor dips or mixed signals should trigger entry. This is a premium opportunity."
          : signalScore >= 70
          ? "⚡ HIGH SIGNAL (70-89): Be MODERATELY LENIENT on entry. Accept small pullbacks and minor concerns as buying opportunities."
          : signalScore >= 50
          ? "➡️  MODERATE SIGNAL (50-69): Be BALANCED. Require confirmatory signals before entry. Don't rush but don't be overly cautious."
          : "⚠️  LOW SIGNAL (<50): Be CAUTIOUS. Require strong technical confirmation and favorable price action. Consider avoiding entry unless setup is perfect."
        : signalScore <= 30
        ? "🔥 VERY HIGH SHORT SIGNAL (<30): Be HIGHLY LENIENT on short entry. Fundamental weakness confirmed. Even minor bearish signals should trigger short."
        : signalScore <= 50
        ? "⚡ HIGH SHORT SIGNAL (30-50): Be MODERATELY LENIENT on short entry. Weakness evident, accept minor setups."
        : signalScore <= 70
        ? "➡️  MODERATE SHORT SIGNAL (50-70): Be BALANCED. Require confirmatory bearish signals before shorting."
        : "⚠️  LOW SHORT SIGNAL (>70): Be CAUTIOUS. Company looks strong, avoid shorting unless very strong bearish breakdown occurs.";
      
      stanceRules = isBuyOpportunity
        ? `STANCE RULES for ENTRY DECISION (Buy Opportunity):
${scoreGuidance}

⚠️ CRITICAL: You can ONLY choose "buy" or "hold" - NO OTHER VALUES.
- "buy" = Enter position / Take the opportunity NOW
- "hold" = Wait for better setup / Don't enter yet

SIGNAL SCORE-BASED ENTRY THRESHOLDS:
${signalScore >= 90 ? `
VERY HIGH SIGNAL (90-100) - AGGRESSIVE ENTRY:
BUY (ACT):
- "buy" if ANY bullish signal present (very lenient threshold)
- "buy" even if price down -2% to -5% (premium dip buying opportunity)
- "buy" if trend neutral but score this high (trust the signal)
HOLD (WAIT):
- "hold" ONLY if catastrophic news or price -8%+ breakdown invalidates thesis` 
: signalScore >= 70 ? `
HIGH SIGNAL (70-89) - LENIENT ENTRY:
BUY (ACT):
- "buy" if trend bullish/moderate + price stable or up
- "buy" if trend bullish + price -2% to -5% (good dip entry on high-quality signal)
- "buy" if trend neutral but price showing support (score gives benefit of doubt)
HOLD (WAIT):
- "hold" if trend bearish/weak despite high score (conflicting signals)
- "hold" if price -5%+ breakdown (too much risk even with good score)`
: signalScore >= 50 ? `
MODERATE SIGNAL (50-69) - BALANCED ENTRY:
BUY (ACT):
- "buy" if trend bullish/strong + price stable or up
- "buy" if trend bullish/moderate + price -2% to -3% (small dip only)
HOLD (WAIT):
- "hold" if trend neutral (need stronger confirmation for moderate score)
- "hold" if price -4%+ (too much weakness for moderate signal)
- "hold" if conflicting signals or mixed price action`
: `
LOW SIGNAL (<50) - CAUTIOUS ENTRY:
BUY (ACT):
- "buy" ONLY if trend bullish/strong + price +2%+ breakout (perfect setup required)
HOLD (WAIT):
- "hold" if ANY uncertainty, neutral trend, or negative price action
- "hold" if score this low indicates fundamental concerns (be very selective)`}

Decision: Weight the SIGNAL SCORE heavily. High scores deserve aggressive "buy", low scores lean toward "hold".`
        : `STANCE RULES for SHORT ENTRY DECISION (Sell/Short Opportunity):
${scoreGuidance}

⚠️ CRITICAL: You can ONLY choose "sell" or "hold" - NO OTHER VALUES.
- "sell" = Enter short position / Short this stock NOW
- "hold" = Wait for better short setup / Don't short yet

SIGNAL SCORE-BASED SHORT ENTRY THRESHOLDS:
${signalScore <= 30 ? `
VERY HIGH SHORT SIGNAL (<30) - AGGRESSIVE SHORT ENTRY:
SELL (SHORT):
- "sell" if ANY bearish signal present (very lenient threshold for weak companies)
- "sell" even if price up +2% to +5% (rally into resistance, premium shorting opportunity)
- "sell" if trend neutral but score this low (fundamental weakness overrides technical neutrality)
HOLD (WAIT):
- "hold" ONLY if surprise positive news or price +8%+ breakout invalidates bearish thesis`
: signalScore <= 50 ? `
HIGH SHORT SIGNAL (30-50) - LENIENT SHORT ENTRY:
SELL (SHORT):
- "sell" if trend bearish/weak + price breaking down
- "sell" if trend bearish/moderate + price rallying +2% to +4% (short the bounce on weak stock)
- "sell" if trend neutral but price showing resistance (score supports short bias)
HOLD (WAIT):
- "hold" if trend bullish despite low score (conflicting signals, wait for breakdown)
- "hold" if price +5%+ breakout (too much momentum even for weak stock)`
: signalScore <= 70 ? `
MODERATE SHORT SIGNAL (50-70) - BALANCED SHORT ENTRY:
SELL (SHORT):
- "sell" if trend bearish/strong + price breaking down
- "sell" if trend bearish/moderate + price +2% to +3% rally (small bounce only)
HOLD (WAIT):
- "hold" if trend neutral (need stronger bearish confirmation for moderate score)
- "hold" if price +4%+ (too much strength for moderate short signal)
- "hold" if conflicting signals or mixed price action`
: `
LOW SHORT SIGNAL (>70) - VERY CAUTIOUS SHORT ENTRY:
SELL (SHORT):
- "sell" ONLY if trend bearish/strong + price -5%+ breakdown (perfect breakdown required on strong company)
HOLD (WAIT):
- "hold" if ANY bullish signals, neutral trend, or positive price action
- "hold" if score this high indicates strong fundamentals (avoid shorting unless exceptional setup)`}

Decision: Weight the SIGNAL SCORE heavily for shorts. Very low scores (<30) deserve aggressive "sell" (short), high scores (>70) lean toward "hold" (wait).`
    }
    
    const prompt = `You are a NEAR-TERM TRADER (1-2 week horizon) providing actionable daily guidance for ${ticker}.

⚡ CRITICAL: This is SHORT-TERM TRADING, not long-term investing. Even small trends demand action.

${positionContext}

OPPORTUNITY TYPE: ${opportunityContext}

CURRENT STATUS:
- Current Price: $${currentPrice.toFixed(2)}
- Previous Close: $${previousPrice.toFixed(2)}  
- Change: ${priceChange >= 0 ? '+' : ''}$${priceChange.toFixed(2)} (${priceChangePercent}%)

${aiPlaybookContext}

${trendContext}

${recentNews && recentNews.length > 0 ? `FRESH NEWS (with sentiment scores -1 to +1):
${recentNews.slice(0, 5).map(n => {
  const sentiment = typeof n.sentiment === 'number' ? n.sentiment : 0;
  const sentimentLabel = sentiment > 0.2 ? '📈 POSITIVE' : sentiment < -0.2 ? '📉 NEGATIVE' : '➡️ NEUTRAL';
  return `- ${n.title || 'Untitled'} (${n.source || 'Unknown'}, sentiment: ${sentimentLabel} ${sentiment.toFixed(2)})`;
}).join('\n')}
` : 'No significant news available'}

YOUR TASK: Provide an ACTION-ORIENTED brief (<120 words). Reference the AI PLAYBOOK insights and fresh news.
- Use the INTEGRATED SIGNAL SCORE as your primary conviction anchor
- Factor in the AI RECOMMENDATION when making your stance decision
- Consider any KEY RISKS or OPPORTUNITIES from the playbook
- Weight fresh news sentiment appropriately

${trendContext || aiPlaybookContext ? `
TREND-BASED DECISION MAKING:
The AI playbook provides your BASELINE conviction. Compare current price action against this baseline:
- If price action CONFIRMS the playbook thesis → Consider ACT stance
- If price action VIOLATES the playbook thesis (owned position) → Consider ACT stance (stop loss)
- If price action is NEUTRAL → Consider HOLD stance
` : ''}

${stanceRules}

BE DECISIVE. Near-term traders need action, not patience.

Return JSON in this EXACT format (no extra text, no markdown, pure JSON):
{
  "recommendedStance": "buy" | "hold" | "sell" | "cover",
  "confidence": 1-10,
  "briefText": "A concise summary under 120 words with your recommendation and reasoning. Focus on NEAR-TERM action.",
  "keyHighlights": ["2-3 bullet points highlighting key price movements, catalysts, or concerns"]
}

⚠️ CRITICAL STANCE VALUES:
- Watching a BUY opportunity: Use "buy" (enter now) or "hold" (wait for better setup)
- Watching a SELL opportunity: Use "sell" (short now) or "hold" (wait for better short setup)
- Owning a LONG position: Use "sell" (exit now) or "hold" (stay in position)
- Owning a SHORT position: Use "cover" (exit short/buy to cover) or "hold" (stay short)`;

    try {
      const provider = this.getProvider();
      const messages: ChatMessage[] = [{ role: "user", content: prompt }];
      
      const content = await provider.generateCompletion(messages, {
        temperature: 0.3,
        maxTokens: 500,
        responseFormat: "json"
      });

      const cleanedContent = stripMarkdownCodeBlocks(content || "{}");
      const brief = JSON.parse(cleanedContent);
      
      // Validate and enforce word limit on briefText
      const wordCount = brief.briefText?.split(/\s+/).length || 0;
      if (wordCount > 120) {
        console.warn(`[AIAnalysisService] Daily brief for ${ticker} exceeded 120 words (${wordCount}), truncating...`);
        const words = brief.briefText.split(/\s+/).slice(0, 120);
        brief.briefText = words.join(' ') + '...';
      }

      return brief;
    } catch (error) {
      console.error(`[AIAnalysisService] Error generating daily brief for ${ticker}:`, error);
      throw new Error(`Failed to generate daily brief for ${ticker}: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Generate a rule-based scorecard with per-metric scoring
   * This provides explainable, consistent scoring across all stocks
   * 
   * The LLM evaluates each metric based on the rubric and provides:
   * 1. A measurement value (extracted from the data)
   * 2. A rule bucket (excellent/good/neutral/weak/poor/missing)
   * 3. A score (0-10)
   * 4. A brief rationale
   * 
   * The server then aggregates section and global scores deterministically.
   */
  async generateScorecard(params: {
    ticker: string;
    fundamentals?: {
      revenueGrowthYoY?: number;
      epsGrowthYoY?: number;
      profitMarginTrend?: string;
      freeCashFlow?: number;
      totalDebt?: number;
      debtToEquity?: number;
    };
    technicals?: {
      sma5?: number;
      sma10?: number;
      sma20?: number;
      currentPrice?: number;
      rsi?: number;
      rsiDirection?: string;
      macdLine?: number;
      macdSignal?: number;
      macdHistogram?: number;
      volumeVsAvg?: number;
      priceConfirmation?: boolean;
    };
    insiderActivity?: {
      netBuyRatio30d?: number;
      daysSinceLastTransaction?: number;
      transactionSizeVsFloat?: number;
      insiderRoles?: string[];
    };
    newsSentiment?: {
      avgSentiment?: number;
      sentimentTrend?: string;
      newsCount7d?: number;
      upcomingCatalyst?: string;
    };
    macroSector?: {
      sectorVsSpy10d?: number;
      macroRiskEnvironment?: string;
    };
  }): Promise<Scorecard> {
    const { ticker } = params;

    // Build the context string with all available data
    const dataContext = this.buildScorecardDataContext(params);
    
    // Generate the scoring rubric prompt
    const rubricPrompt = generateScoringRubricPrompt();

    const prompt = `You are a quantitative analyst scoring a stock using a RULE-BASED scorecard.
Your job is to evaluate each metric according to the EXACT thresholds in the rubric.

STOCK: ${ticker}

${rubricPrompt}

=== AVAILABLE DATA FOR ${ticker} ===
${dataContext}

=== YOUR TASK ===
Score EACH metric according to the rubric. For each metric:
1. Extract the MEASUREMENT from the data (use "N/A" if not available)
2. Determine which RULE BUCKET it falls into (excellent/good/neutral/weak/poor)
3. Assign the corresponding SCORE (10/8/5/2/0)
4. Write a brief RATIONALE explaining why

CRITICAL: 
- If data is missing for a metric, set ruleBucket="missing" and score=0
- Use the EXACT threshold ranges from the rubric
- Be consistent - the same measurement should always get the same score

Return your evaluation as JSON with this EXACT structure:
{
  "fundamentals": {
    "revenueGrowth": { "measurement": <number or "N/A">, "ruleBucket": "excellent|good|neutral|weak|poor|missing", "score": 0-10, "rationale": "brief explanation" },
    "epsGrowth": { "measurement": <number or "N/A">, "ruleBucket": "...", "score": 0-10, "rationale": "..." },
    "profitMarginTrend": { "measurement": "condition string or N/A", "ruleBucket": "...", "score": 0-10, "rationale": "..." },
    "fcfToDebt": { "measurement": <number or "N/A">, "ruleBucket": "...", "score": 0-10, "rationale": "..." },
    "debtToEquity": { "measurement": <number or "N/A">, "ruleBucket": "...", "score": 0-10, "rationale": "..." }
  },
  "technicals": {
    "smaAlignment": { "measurement": "condition string", "ruleBucket": "...", "score": 0-10, "rationale": "..." },
    "rsiMomentum": { "measurement": "RSI value + direction", "ruleBucket": "...", "score": 0-10, "rationale": "..." },
    "macdSignal": { "measurement": "condition string", "ruleBucket": "...", "score": 0-10, "rationale": "..." },
    "volumeSurge": { "measurement": "Xx avg", "ruleBucket": "...", "score": 0-10, "rationale": "..." },
    "priceVsResistance": { "measurement": "condition string", "ruleBucket": "...", "score": 0-10, "rationale": "..." }
  },
  "insiderActivity": {
    "netBuyRatio": { "measurement": <percentage or "N/A">, "ruleBucket": "...", "score": 0-10, "rationale": "..." },
    "transactionRecency": { "measurement": <days or "N/A">, "ruleBucket": "...", "score": 0-10, "rationale": "..." },
    "transactionSize": { "measurement": <percentage or "N/A">, "ruleBucket": "...", "score": 0-10, "rationale": "..." },
    "insiderRole": { "measurement": "role description", "ruleBucket": "...", "score": 0-10, "rationale": "..." }
  },
  "newsSentiment": {
    "avgSentiment": { "measurement": <-1 to 1 or "N/A">, "ruleBucket": "...", "score": 0-10, "rationale": "..." },
    "sentimentMomentum": { "measurement": "trend description", "ruleBucket": "...", "score": 0-10, "rationale": "..." },
    "newsVolume": { "measurement": <count or "N/A">, "ruleBucket": "...", "score": 0-10, "rationale": "..." },
    "catalystPresence": { "measurement": "catalyst description", "ruleBucket": "...", "score": 0-10, "rationale": "..." }
  },
  "macroSector": {
    "sectorMomentum": { "measurement": <percentage or "N/A">, "ruleBucket": "...", "score": 0-10, "rationale": "..." },
    "macroRiskFlags": { "measurement": "risk description", "ruleBucket": "...", "score": 0-10, "rationale": "..." }
  },
  "summary": "One sentence summary of the overall scoring: what are the main strengths and weaknesses?"
}

REMEMBER: This is a 1-2 WEEK trading horizon. Weight short-term catalysts and momentum appropriately.`;

    try {
      const provider = this.getProvider();
      console.log(`[AIAnalysisService] Generating scorecard for ${ticker} using ${provider.getName()}`);
      
      const messages: ChatMessage[] = [{ role: "user", content: prompt }];
      
      const content = await provider.generateCompletion(messages, {
        temperature: 0.2, // Lower temperature for more consistent scoring
        maxTokens: 4096,
        responseFormat: "json"
      });

      const cleanedContent2 = stripMarkdownCodeBlocks(content || "{}");
      const llmResponse = JSON.parse(cleanedContent2);
      
      // Build the full scorecard from LLM response
      return this.buildScorecardFromLLMResponse(llmResponse, ticker);
    } catch (error) {
      console.error(`[AIAnalysisService] Error generating scorecard for ${ticker}:`, error);
      throw new Error(`Failed to generate scorecard for ${ticker}: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Build context string from available data for scorecard generation
   */
  private buildScorecardDataContext(params: {
    ticker: string;
    fundamentals?: any;
    technicals?: any;
    insiderActivity?: any;
    newsSentiment?: any;
    macroSector?: any;
  }): string {
    const sections: string[] = [];

    // Fundamentals
    if (params.fundamentals) {
      const f = params.fundamentals;
      sections.push(`FUNDAMENTALS:
- Revenue Growth YoY: ${f.revenueGrowthYoY !== undefined ? f.revenueGrowthYoY + '%' : 'N/A'}
- EPS Growth YoY: ${f.epsGrowthYoY !== undefined ? f.epsGrowthYoY + '%' : 'N/A'}
- Profit Margin Trend: ${f.profitMarginTrend || 'N/A'}
- Free Cash Flow: ${f.freeCashFlow !== undefined ? '$' + f.freeCashFlow.toLocaleString() : 'N/A'}
- Total Debt: ${f.totalDebt !== undefined ? '$' + f.totalDebt.toLocaleString() : 'N/A'}
- Debt-to-Equity: ${f.debtToEquity !== undefined ? f.debtToEquity.toFixed(2) : 'N/A'}`);
    } else {
      sections.push('FUNDAMENTALS: No data available');
    }

    // Technicals
    if (params.technicals) {
      const t = params.technicals;
      sections.push(`TECHNICALS:
- Current Price: ${t.currentPrice !== undefined ? '$' + t.currentPrice.toFixed(2) : 'N/A'}
- SMA5: ${t.sma5 !== undefined ? '$' + t.sma5.toFixed(2) : 'N/A'}
- SMA10: ${t.sma10 !== undefined ? '$' + t.sma10.toFixed(2) : 'N/A'}
- SMA20: ${t.sma20 !== undefined ? '$' + t.sma20.toFixed(2) : 'N/A'}
- RSI (14): ${t.rsi !== undefined ? t.rsi.toFixed(1) : 'N/A'} ${t.rsiDirection ? '(' + t.rsiDirection + ')' : ''}
- MACD Line: ${t.macdLine !== undefined ? t.macdLine.toFixed(4) : 'N/A'}
- MACD Signal: ${t.macdSignal !== undefined ? t.macdSignal.toFixed(4) : 'N/A'}
- MACD Histogram: ${t.macdHistogram !== undefined ? t.macdHistogram.toFixed(4) : 'N/A'}
- Volume vs 10-day Avg: ${t.volumeVsAvg !== undefined ? t.volumeVsAvg.toFixed(2) + 'x' : 'N/A'}
- Price Confirmation: ${t.priceConfirmation !== undefined ? (t.priceConfirmation ? 'Yes' : 'No') : 'N/A'}`);
    } else {
      sections.push('TECHNICALS: No data available');
    }

    // Insider Activity
    if (params.insiderActivity) {
      const i = params.insiderActivity;
      sections.push(`INSIDER ACTIVITY:
- Net Buy Ratio (30d): ${i.netBuyRatio30d !== undefined ? i.netBuyRatio30d + '%' : 'N/A'}
- Days Since Last Transaction: ${i.daysSinceLastTransaction !== undefined ? i.daysSinceLastTransaction : 'N/A'}
- Transaction Size vs Float: ${i.transactionSizeVsFloat !== undefined ? i.transactionSizeVsFloat + '%' : 'N/A'}
- Insider Roles: ${i.insiderRoles && i.insiderRoles.length > 0 ? i.insiderRoles.join(', ') : 'N/A'}`);
    } else {
      sections.push('INSIDER ACTIVITY: No data available');
    }

    // News Sentiment
    if (params.newsSentiment) {
      const n = params.newsSentiment;
      sections.push(`NEWS SENTIMENT:
- Average Sentiment: ${n.avgSentiment !== undefined ? n.avgSentiment.toFixed(2) : 'N/A'}
- Sentiment Trend: ${n.sentimentTrend || 'N/A'}
- News Count (7d): ${n.newsCount7d !== undefined ? n.newsCount7d : 'N/A'}
- Upcoming Catalyst: ${n.upcomingCatalyst || 'N/A'}`);
    } else {
      sections.push('NEWS SENTIMENT: No data available');
    }

    // Macro/Sector
    if (params.macroSector) {
      const m = params.macroSector;
      sections.push(`MACRO/SECTOR:
- Sector vs SPY (10d): ${m.sectorVsSpy10d !== undefined ? (m.sectorVsSpy10d >= 0 ? '+' : '') + m.sectorVsSpy10d + '%' : 'N/A'}
- Macro Risk Environment: ${m.macroRiskEnvironment || 'N/A'}`);
    } else {
      sections.push('MACRO/SECTOR: No data available');
    }

    return sections.join('\n\n');
  }

  /**
   * Build a full Scorecard object from LLM response
   * This function validates and normalizes the LLM output
   */
  private buildScorecardFromLLMResponse(llmResponse: any, ticker: string): Scorecard {
    const sections: Record<string, SectionScore> = {};

    // Process each section
    for (const [sectionKey, sectionConfig] of Object.entries(scorecardConfig.sections)) {
      const llmSection = llmResponse[sectionKey] || {};
      const metrics: Record<string, MetricScore> = {};
      const missingMetrics: string[] = [];

      for (const [metricKey, metricConfig] of Object.entries(sectionConfig.metrics)) {
        const llmMetric = llmSection[metricKey] || {};
        
        // Validate and normalize the LLM response
        const ruleBucket = this.normalizeRuleBucket(llmMetric.ruleBucket);
        const score = this.normalizeScore(llmMetric.score, ruleBucket);
        const measurement = llmMetric.measurement ?? null;
        
        if (ruleBucket === 'missing') {
          missingMetrics.push(metricKey);
        }

        metrics[metricKey] = {
          name: metricConfig.name,
          measurement: measurement,
          ruleBucket: ruleBucket,
          score: score,
          maxScore: 10,
          weight: metricConfig.weight,
          rationale: llmMetric.rationale || `${metricConfig.name}: ${measurement} → ${ruleBucket} (${score}/10)`
        };
      }

      sections[sectionKey] = {
        name: sectionConfig.name,
        weight: sectionConfig.weight,
        score: calculateSectionScore(metrics),
        maxScore: 100,
        metrics,
        missingMetrics
      };
    }

    const globalScore = calculateGlobalScore(sections);
    const confidence = determineConfidence(sections);

    // Calculate missing data penalty
    let totalMissing = 0;
    let totalMetrics = 0;
    for (const section of Object.values(sections)) {
      totalMissing += section.missingMetrics.length;
      totalMetrics += Object.keys(section.metrics).length;
    }
    const missingDataPenalty = Math.round((totalMissing / totalMetrics) * 100);

    // Build summary
    const summaryParts: string[] = [];
    for (const section of Object.values(sections)) {
      const status = section.score >= 70 ? '✓' : section.score >= 40 ? '~' : '✗';
      summaryParts.push(`${section.name}: ${section.score} ${status}`);
    }

    const llmSummary = llmResponse.summary || '';

    return {
      version: SCORECARD_VERSION,
      tradingHorizon: scorecardConfig.tradingHorizon,
      computedAt: new Date().toISOString(),
      sections,
      globalScore,
      maxGlobalScore: 100,
      missingDataPenalty,
      confidence,
      summary: `${ticker}: ${globalScore}/100 (${confidence} confidence). ${summaryParts.join(' | ')}. ${llmSummary}`
    };
  }

  /**
   * Normalize rule bucket from LLM response
   */
  private normalizeRuleBucket(bucket: string | undefined): MetricScore['ruleBucket'] {
    if (!bucket) return 'missing';
    
    const normalized = bucket.toLowerCase().trim();
    const validBuckets = ['excellent', 'good', 'neutral', 'weak', 'poor', 'missing'];
    
    if (validBuckets.includes(normalized)) {
      return normalized as MetricScore['ruleBucket'];
    }
    
    // Map common variations
    if (normalized.includes('excellent') || normalized.includes('exceptional')) return 'excellent';
    if (normalized.includes('good') || normalized.includes('strong')) return 'good';
    if (normalized.includes('neutral') || normalized.includes('average')) return 'neutral';
    if (normalized.includes('weak') || normalized.includes('below')) return 'weak';
    if (normalized.includes('poor') || normalized.includes('bad')) return 'poor';
    if (normalized.includes('missing') || normalized.includes('n/a') || normalized.includes('unavailable')) return 'missing';
    
    return 'neutral'; // Default fallback
  }

  /**
   * Normalize score from LLM response
   */
  private normalizeScore(score: number | string | undefined, ruleBucket: MetricScore['ruleBucket']): number {
    if (ruleBucket === 'missing') return 0;
    
    if (typeof score === 'number' && !isNaN(score)) {
      return Math.max(0, Math.min(10, Math.round(score)));
    }
    
    if (typeof score === 'string') {
      const parsed = parseFloat(score);
      if (!isNaN(parsed)) {
        return Math.max(0, Math.min(10, Math.round(parsed)));
      }
    }
    
    // Fallback based on bucket
    const bucketDefaults: Record<string, number> = {
      excellent: 10,
      good: 8,
      neutral: 5,
      weak: 2,
      poor: 0,
      missing: 0
    };
    
    return bucketDefaults[ruleBucket] || 5;
  }
}

export const aiAnalysisService = new AIAnalysisService();
