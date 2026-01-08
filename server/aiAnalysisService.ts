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
import { generateWithFallback, type AIProviderConfig, type ChatMessage, type AICompletionOptions } from "./aiProvider";
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

// Default OpenAI client for backwards compatibility (only if API key is available)
const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

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

export interface FinancialAnalysis {
  ticker: string;
  overallRating: "strong_buy" | "buy" | "hold" | "avoid" | "strong_avoid" | "sell";
  confidenceScore: number; // 1-100 - The main signal score
  summary: string;
  playbook?: string; // Detailed actionable playbook with data references
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
  keyMetrics?: {
    profitability: string;
    liquidity: string;
    leverage: string;
    growth: string;
  };
  entryTiming?: {
    status: "early" | "optimal" | "late" | "missed";
    priceMoveSinceInsider: string;
    daysOld: number;
    assessment: string;
  };
  sectorAnalysis?: {
    sector: string;
    sectorOutlook: "bullish" | "bearish" | "neutral";
    sectorNote: string;
  };
  tradeParameters?: {
    entryPrice: number;
    stopLoss: number;
    stopLossPercent: number;
    profitTarget: number;
    profitTargetPercent: number;
    riskRewardRatio: number;
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
   * Analyze a stock using AI - Simplified Signal Score + Playbook approach
   * Combines ALL available data and asks AI for:
   * 1. Signal Score (1-100): Relevance of insider transaction to 1-2 week profit opportunity
   * 2. Playbook: Actionable explanation with data references and clear recommendation
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

    // Determine transaction direction
    const isBuy = insiderTradingStrength?.direction === "buy";
    const isSell = insiderTradingStrength?.direction === "sell";
    const transactionContext = isBuy ? "INSIDER BUYING" : (isSell ? "INSIDER SELLING" : "INSIDER TRADING");
    
    // Calculate days since insider transaction
    let daysSinceTransaction = "Unknown";
    if (insiderTradingStrength?.tradeDate) {
      const tradeDate = new Date(insiderTradingStrength.tradeDate);
      const today = new Date();
      const diffDays = Math.floor((today.getTime() - tradeDate.getTime()) / (1000 * 60 * 60 * 24));
      daysSinceTransaction = `${diffDays} days ago`;
    }

    // Build comprehensive prompt with ALL available data
    const prompt = `You are a momentum trader analyzing insider trading signals. Your goal: CAPITALIZE QUICKLY and MOVE ON. 

TRADING PHILOSOPHY:
- 1-2 WEEK maximum holding period
- Get in fast, take profits, rotate to next opportunity
- If timing is late or the move already happened → SKIP IT, find fresh signals
- We don't hold losers hoping they'll recover
- Speed and conviction matter more than perfection

CRITICAL - MULTI-FACTOR VALIDATION REQUIRED:
Insider signals alone are NOT enough to act. You MUST validate with:
1. TECHNICALS: RSI, MACD, trend direction - is momentum confirming the insider's bet?
2. SENTIMENT: Is news coverage supporting or contradicting the trade thesis?
3. FUNDAMENTALS: Is the company financially healthy enough to support the move?

SCORING RULE: If ANY of these factors strongly contradict the insider signal, score LOW (under 50).
- Insider buying but RSI overbought + bearish trend = SKIP
- Insider buying but negative sentiment flood = SKIP  
- Insider buying but weak financials / high debt = SKIP
Only score 70+ when insider signal + technicals + sentiment + fundamentals ALL align.

Evaluate this ${transactionContext} signal:

=== OPPORTUNITY OVERVIEW ===
Stock: ${ticker}
Sector: ${companyOverview?.sector || "N/A"}
Market Cap: ${comprehensiveFundamentals?.marketCap || companyOverview?.marketCap || "N/A"}
Insider Action: ${transactionContext}
Time Since Transaction: ${daysSinceTransaction}

=== INSIDER TRANSACTION DETAILS ===
${insiderTradingStrength ? `
Primary Transaction:
- Direction: ${insiderTradingStrength.direction.toUpperCase()}
- Insider: ${insiderTradingStrength.insiderName} (${insiderTradingStrength.insiderTitle})
- Date: ${insiderTradingStrength.tradeDate}
- Quantity: ${insiderTradingStrength.quantityStr}
- Insider Price: ${insiderTradingStrength.insiderPrice}
- Current Price: ${insiderTradingStrength.currentPrice}
- Total Value: ${insiderTradingStrength.totalValue}

Recent Transactions (Top 5):
${insiderTradingStrength.allTransactions.slice(0, 5).map((t, idx) => 
  `${idx + 1}. ${t.direction.toUpperCase()} - ${t.insiderName} (${t.insiderTitle}): ${t.quantityStr} @ ${t.price} on ${t.date}`
).join('\n')}

Signal Summary: ${insiderTradingStrength.buyCount} BUY, ${insiderTradingStrength.sellCount} SELL (Total: ${insiderTradingStrength.totalTransactions})
` : "No insider transaction details available"}

=== FUNDAMENTALS ===
VALUATION:
- P/E Ratio: ${comprehensiveFundamentals?.peRatio || companyOverview?.peRatio || "N/A"}
- PEG Ratio: ${comprehensiveFundamentals?.pegRatio || "N/A"}
- Profit Margin: ${comprehensiveFundamentals?.profitMargin ? `${(comprehensiveFundamentals.profitMargin * 100).toFixed(2)}%` : "N/A"}
- Return on Equity: ${comprehensiveFundamentals?.returnOnEquity ? `${(comprehensiveFundamentals.returnOnEquity * 100).toFixed(2)}%` : "N/A"}

BALANCE SHEET (${latestBalanceSheet?.fiscalDateEnding || "Latest"}):
- Total Assets: ${comprehensiveFundamentals?.totalAssets || latestBalanceSheet?.totalAssets || "N/A"}
- Total Liabilities: ${comprehensiveFundamentals?.totalLiabilities || latestBalanceSheet?.totalLiabilities || "N/A"}
- Current Ratio: ${comprehensiveFundamentals?.currentRatio || "N/A"}
- Debt-to-Equity: ${comprehensiveFundamentals?.debtToEquity || "N/A"}
- Cash: ${latestBalanceSheet?.cashAndCashEquivalentsAtCarryingValue || "N/A"}

INCOME (${latestIncomeStatement?.fiscalDateEnding || "Latest"}):
- Revenue: ${comprehensiveFundamentals?.totalRevenue || latestIncomeStatement?.totalRevenue || "N/A"}
- Gross Profit: ${comprehensiveFundamentals?.grossProfit || latestIncomeStatement?.grossProfit || "N/A"}
- Net Income: ${comprehensiveFundamentals?.netIncome || latestIncomeStatement?.netIncome || "N/A"}
- EBITDA: ${latestIncomeStatement?.ebitda || "N/A"}

CASH FLOW (${latestCashFlow?.fiscalDateEnding || "Latest"}):
- Operating Cash Flow: ${comprehensiveFundamentals?.operatingCashflow || latestCashFlow?.operatingCashflow || "N/A"}
- Free Cash Flow: ${comprehensiveFundamentals?.freeCashFlow || "N/A"}

=== TECHNICALS ===
${technicalIndicators ? `
- RSI: ${technicalIndicators.rsi.value.toFixed(2)} (${technicalIndicators.rsi.signal})
- MACD Trend: ${technicalIndicators.macd.trend}
- SMA20: $${technicalIndicators.sma20.toFixed(2)}, SMA50: $${technicalIndicators.sma50.toFixed(2)}
- Volatility (ATR): ${technicalIndicators.atr.toFixed(2)}
` : "Technical data not available"}

=== NEWS & SENTIMENT ===
${newsSentiment ? `
Sentiment Score: ${newsSentiment.aggregateSentiment.toFixed(2)} (${newsSentiment.sentimentTrend})
News Volume: ${newsSentiment.newsVolume} articles
Recent Headlines:
${newsSentiment.articles.slice(0, 5).map(a => `- ${a.title} (Sentiment: ${a.sentiment.toFixed(2)})`).join('\n')}
` : "News data not available"}

=== SEC FILINGS ===
${secFilings ? `
Filing: ${secFilings.formType} (${secFilings.filingDate})

Business Overview:
${secFilings.businessOverview ? secFilings.businessOverview.substring(0, 1500) : "Not available"}

Management Discussion:
${secFilings.managementDiscussion ? secFilings.managementDiscussion.substring(0, 2000) : "Not available"}

Risk Factors:
${secFilings.riskFactors ? secFilings.riskFactors.substring(0, 1500) : "Not available"}
` : "SEC filings not available"}

=== YOUR ANALYSIS TASK ===

Evaluate this opportunity and provide:

1. SIGNAL SCORE (1-100): How relevant is this insider ${isBuy ? "buy" : "sell"} signal to making money in 1-2 weeks?
   Consider:
   - Quality of the insider (C-suite vs routine filing)
   - Timing (how fresh is the transaction?)
   - Stock trend alignment with insider action
   - Sector/market conditions
   - Fundamentals supporting the trade thesis

2. PLAYBOOK: Clear, actionable guidance with data references

SCORING GUIDE (remember: quick trades, quick profits):
${isBuy ? `
For INSIDER BUYING:
- 70-100: FRESH SIGNAL, ACT NOW - Early timing, strong momentum, clear upside → ENTER immediately
- 40-69: WATCHLIST - Decent setup but wait for better entry or confirmation → Set alerts, be ready
- 1-39: STALE/MISSED - Move already happened, timing is late, or weak setup → SKIP, find next opportunity
` : `
For INSIDER SELLING:
- 70-100: FRESH SHORT - Valid bearish signal, breakdown imminent → SHORT or exit longs
- 40-69: CAUTION - Weakness showing but not confirmed → Watch for breakdown trigger
- 1-39: FALSE ALARM - Routine selling, strong stock → IGNORE, move on
`}

TIMING IS CRITICAL:
- Trade date >7 days old with >10% price move = likely MISSED (score low)
- Trade date <3 days old with minimal move = EARLY/OPTIMAL (score higher)
- Stale signals waste our time - be ruthless about freshness

Return ONLY this JSON (no markdown):
{
  "overallRating": "${isBuy ? 'buy' : 'sell'}" or "hold" or "avoid",
  "confidenceScore": 1-100,
  "summary": "2-3 sentence executive summary: What's the insider signal, and does the data support acting on it?",
  "playbook": "Write as an INVESTOR making a real decision (4-6 sentences). Explain your reasoning: 1) TIMING: Is this fresh or stale? Days since trade + price move. 2) VALIDATION: Do technicals, sentiment, and fundamentals SUPPORT or CONTRADICT the insider signal? Cite specific data. 3) DECISION: As an investor optimizing for quick turnaround - would YOU enter now? Why or why not? Be honest about risks. 4) VERDICT: ACT NOW (enter) / WATCHLIST (wait for trigger) / SKIP (move on to next opportunity).",
  "entryTiming": {
    "status": "early" or "optimal" or "late" or "missed",
    "priceMoveSinceInsider": "+X% or -X% since insider bought/sold",
    "daysOld": number of days since insider trade,
    "assessment": "1 decisive sentence: Are we EARLY (good) or did we MISS IT (move on)?"
  },
  "sectorAnalysis": {
    "sector": "Sector name",
    "sectorOutlook": "bullish" or "bearish" or "neutral",
    "sectorNote": "1 sentence on how sector conditions affect this trade"
  },
  "financialHealth": {
    "score": 0-100,
    "strengths": ["List 2-3 specific strengths with data values"],
    "weaknesses": ["List 2-3 specific weaknesses with data values"],
    "redFlags": ["List any serious red flags, or empty array"]
  },
  "technicalAnalysis": {
    "score": 0-100,
    "trend": "bullish" or "bearish" or "neutral",
    "momentum": "strong" or "moderate" or "weak",
    "signals": ["2-3 key technical observations"]
  },
  "sentimentAnalysis": {
    "score": 0-100,
    "trend": "positive" or "negative" or "neutral",
    "newsVolume": "high" or "medium" or "low",
    "key_themes": ["2-3 news themes if available"]
  },
  "risks": ["List 2-4 specific risks with data backing"],
  "opportunities": ["List 2-3 potential catalysts"],
  "tradeParameters": {
    "entryPrice": current stock price as number (use the current price provided),
    "stopLoss": recommended stop loss price as number (typically 5-10% below entry for buys, above for sells),
    "stopLossPercent": stop loss as percentage from entry (negative number like -7.5),
    "profitTarget": recommended profit target price as number (typically 10-20% above entry for buys, below for sells),
    "profitTargetPercent": profit target as percentage from entry (positive number like 15.0),
    "riskRewardRatio": ratio of potential profit to potential loss (e.g., 2.0 means 2:1 reward to risk)
  },
  "recommendation": "${isBuy ? 'BUY NOW / WATCH / AVOID' : 'SHORT NOW / WATCH / AVOID'} - 2-sentence action. State your position as an investor and WHY based on the data."
}

REMEMBER: You are an investor putting real money on the line. Explain your thinking. Reference actual numbers. Be honest about what the data says - don't sugarcoat weak signals. If you wouldn't personally take this trade for a 1-2 week quick turnaround, say so clearly.`;

    try {
      console.log(`[AIAnalysisService] Analyzing ${ticker} using ${currentProviderConfig.provider}`);
      
      const messages: ChatMessage[] = [{ role: "user", content: prompt }];
      
      const result = await generateWithFallback(currentProviderConfig, messages, {
        temperature: 0.3,
        maxTokens: 4096,
        responseFormat: "json"
      });

      if (result.usedFallback) {
        console.log(`[AIAnalysisService] ⚠️ Used fallback provider: ${result.provider} (${result.model})`);
      }

      const cleanedContent = stripMarkdownCodeBlocks(result.content || "{}");
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
    const score = analysis.confidenceScore; // Use the main signal score
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
      const messages: ChatMessage[] = [{ role: "user", content: prompt }];
      
      const result = await generateWithFallback(currentProviderConfig, messages, {
        temperature: 0.3,
        maxTokens: 500,
        responseFormat: "json"
      });

      if (result.usedFallback) {
        console.log(`[AIAnalysisService] ⚠️ Daily brief used fallback: ${result.provider} (${result.model})`);
      }

      const cleanedContent = stripMarkdownCodeBlocks(result.content || "{}");
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
      console.log(`[AIAnalysisService] Generating scorecard for ${ticker} using ${currentProviderConfig.provider}`);
      
      const messages: ChatMessage[] = [{ role: "user", content: prompt }];
      
      const result = await generateWithFallback(currentProviderConfig, messages, {
        temperature: 0.2, // Lower temperature for more consistent scoring
        maxTokens: 4096,
        responseFormat: "json"
      });

      if (result.usedFallback) {
        console.log(`[AIAnalysisService] ⚠️ Scorecard used fallback: ${result.provider} (${result.model})`);
      }

      const cleanedContent2 = stripMarkdownCodeBlocks(result.content || "{}");
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
