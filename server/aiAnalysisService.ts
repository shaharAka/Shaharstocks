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
  "summary": "2-3 sentences: ${isBuy ? 'Does this insider buy have merit? What\'s the 1-2 week outlook?' : (isSell ? 'Does this insider sell signal weakness? Should investors avoid or is this routine portfolio management?' : 'Validate the insider transaction')}",
  "financialHealth": {
    "score": 0-100,
    "strengths": ["List 2-4 specific financial strengths you found in the numbers"],
    "weaknesses": ["List 2-4 specific financial weaknesses or concerns"],
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
  "risks": ["List 3-5 specific risks for the 1-2 week window"],
  "opportunities": ["List 2-4 specific catalysts that could ${isBuy ? "drive price up" : (isSell ? "drive price down" : "move price")} in 1-2 weeks"],
  "recommendation": "Clear 2-3 sentence recommendation: ${isBuy ? "BUY or PASS" : (isSell ? "SELL/AVOID or PASS" : "Action")} for 1-2 week window, and why"
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
    previousAnalysis?: { overallRating: string; summary: string; technicalAnalysis?: any }; // Include technical analysis from full AI analysis
  }): Promise<{
    watching: {
      recommendedStance: "buy" | "hold" | "sell";
      confidence: number; // 1-10
      briefText: string; // <120 words
      keyHighlights: string[]; // 2-3 bullet points
    };
    owning: {
      recommendedStance: "buy" | "hold" | "sell";
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
    previousAnalysis?: { overallRating: string; summary: string; technicalAnalysis?: any };
  }): Promise<{
    recommendedStance: "buy" | "hold" | "sell";
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
    
    // Build technical trend context from initial AI analysis if available
    let trendContext = "";
    if (previousAnalysis?.technicalAnalysis) {
      const tech = previousAnalysis.technicalAnalysis;
      const trend = tech.trend || "neutral"; // bullish, bearish, neutral
      const momentum = tech.momentum || "weak"; // strong, moderate, weak
      const score = typeof tech.score === "number" ? tech.score : 50; // 0-100, preserve 0 as valid bearish score
      const signals = Array.isArray(tech.signals) ? tech.signals.slice(0, 3) : [];
      
      trendContext = `
INITIAL AI TECHNICAL ANALYSIS (baseline trend from insider opportunity):
- Trend: ${trend}
- Momentum: ${momentum}
- Technical Score: ${score}/100
${signals.length > 0 ? `- Signals: ${signals.join(', ')}` : ''}`;
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

⚠️ CRITICAL: You can ONLY recommend "cover" or "hold" - NEVER "buy" or "sell".

COVER SHORT (ACT - close short position):
- "cover" if price -5%+ (take short profit on significant decline)
- "cover" if price +3%+ AND initial bearish trend reversing bullish (stop loss - trend against you)
- "cover" if strong bullish news violates bearish thesis (cut losses early)

HOLD SHORT (keep short position open):
- Price declining -1% to -4% with initial bearish trend intact (let it run down)
- Sideways action with initial trend still bearish/weak (wait for more decline)
- Small gain +1% to +2% (price rising slightly) but initial trend still bearish (noise, not reversal)

Decision: COVER when you've profited enough OR trend reversing against you. HOLD when bearish trend continues. For shorts, price FALLING = your gain.`
    } else {
      // User doesn't own - focus on entry evaluation with ENTER/WAIT logic
      stanceRules = isBuyOpportunity
        ? `STANCE RULES for ENTRY DECISION (Buy Opportunity):
Use initial trend to validate insider signal for entry.

⚠️ CRITICAL: You must choose "enter" or "wait" - NO OTHER VALUES.

ENTER (ACT):
- "enter" if initial trend bullish/strong + price stable or up
- "enter" if initial trend bullish/moderate + price -2% to -4% (dip entry)

WAIT:
- "wait" if initial trend neutral, price sideways (wait for clarity)
- "wait" if initial trend bullish but price action mixed
- "wait" if initial trend bearish/weak + price falling (avoid entry)

Decision: ENTER when initial trend confirms insider buy signal. WAIT if trend weak or unclear.`
        : `STANCE RULES for SHORT ENTRY DECISION (Sell/Short Opportunity):
Insiders sold. Low AI score indicates company weakness. Evaluate SHORT ENTRY.

⚠️ CRITICAL: You must choose "short" or "wait" - NO OTHER VALUES.

SHORT (ACT - open short position):
- "short" if initial trend bearish/weak + price breaking down (trend confirms weakness)
- "short" if initial trend bearish/moderate + price rallying +2% to +4% (rally into resistance, short the bounce)
- "short" if low AI score (<30) confirms fundamental weakness + any bearish technical signal

WAIT (don't open short):
- "wait" if initial trend bullish/strong + price rising (don't fight the trend)
- "wait" if initial trend neutral, price sideways (no clear short setup)
- "wait" if positive news contradicts bearish thesis (wait for clarity)

Decision: SHORT when bearish trend + weak fundamentals align. WAIT if trend unclear or bullish.`
    }
    
    const prompt = `You are a NEAR-TERM TRADER (1-2 week horizon) providing actionable daily guidance for ${ticker}.

⚡ CRITICAL: This is SHORT-TERM TRADING, not long-term investing. Even small trends demand action.

${positionContext}

OPPORTUNITY TYPE: ${opportunityContext}

CURRENT STATUS:
- Current Price: $${currentPrice.toFixed(2)}
- Previous Close: $${previousPrice.toFixed(2)}
- Change: ${priceChange >= 0 ? '+' : ''}$${priceChange.toFixed(2)} (${priceChangePercent}%)

${trendContext}

${previousAnalysis ? `PREVIOUS ANALYSIS CONTEXT:
Rating: ${previousAnalysis.overallRating}
Summary: ${previousAnalysis.summary}
` : ''}

${recentNews && recentNews.length > 0 ? `RECENT NEWS (last 24h):
${recentNews.slice(0, 3).map(n => `- ${n.title} (${n.source}, sentiment: ${n.sentiment > 0 ? 'positive' : n.sentiment < 0 ? 'negative' : 'neutral'})`).join('\n')}
` : 'No significant news in last 24h'}

YOUR TASK: Provide an ACTION-ORIENTED brief (<120 words). Near-term traders MUST act on trends.

${trendContext ? `
TREND-BASED DECISION MAKING:
The initial AI trend is your BASELINE. Compare current price action against this baseline:
- If price action CONFIRMS the trend → Consider ACT stance
- If price action VIOLATES the trend (owned position) → Consider ACT stance (stop loss)
- If price action is NEUTRAL → Consider HOLD stance
` : ''}

${stanceRules}

BE DECISIVE. Near-term traders need action, not patience.

Return JSON in this EXACT format (no extra text, no markdown, pure JSON):
{
  "recommendedStance": ${
    isSellOpportunity
      ? (userOwnsPosition ? '"cover" | "hold"' : '"short" | "wait"')
      : (userOwnsPosition ? '"sell" | "hold"' : '"enter" | "wait"')
  },
  "confidence": 1-10,
  "briefText": "A concise summary under 120 words with your recommendation and reasoning. Focus on NEAR-TERM action.",
  "keyHighlights": ["2-3 bullet points highlighting key price movements, catalysts, or concerns"]
}

${
  isSellOpportunity
    ? (userOwnsPosition
        ? '⚠️ CRITICAL: For short positions, you can ONLY use "cover" or "hold" - NEVER "sell", "enter", "wait", or "buy".'
        : '⚠️ CRITICAL: For short entry evaluation, you can ONLY use "short" or "wait" - NEVER "enter", "buy", "hold", or "sell".')
    : (userOwnsPosition
        ? '⚠️ CRITICAL: For owned positions, you can ONLY use "sell" or "hold" - NEVER "enter" or "wait".'
        : '⚠️ CRITICAL: For entry evaluation, you can ONLY use "enter" or "wait" - NEVER "buy", "hold", or "sell".')
}`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4.1",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_completion_tokens: 500, // Keep it lightweight
      });

      const content = response.choices[0]?.message?.content || "{}";
      const brief = JSON.parse(content);
      
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
}

export const aiAnalysisService = new AIAnalysisService();
