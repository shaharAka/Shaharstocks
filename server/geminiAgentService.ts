/**
 * Gemini AI Agent Service for Stock Evaluation
 * 
 * Provides AI-powered assessment of:
 * - Risk Analysis (downside risks and volatility)
 * - Entry Timing (trend analysis to determine if early/mid/late to profit)
 * - Conviction (confidence in trade thesis)
 * 
 * SELL-aware: Adapts prompts based on opportunity type (BUY vs SELL)
 */

import { GoogleGenAI } from "@google/genai";

export interface AIAgentEvaluation {
  riskAssessment: "minimal_risk" | "manageable_risk" | "moderate_risk" | "elevated_risk" | "high_risk";
  entryTiming: "early_before_profit" | "optimal_entry_window" | "mid_way_through_move" | "late_entry" | "missed_opportunity";
  conviction: "very_high_conviction" | "high_conviction" | "moderate_conviction" | "low_conviction" | "no_conviction";
  rationale: {
    risk: string;
    timing: string;
    conviction: string;
  };
}

export interface StockContext {
  ticker: string;
  companyName: string;
  currentPrice: number;
  opportunityType: "BUY" | "SELL";
  
  // Price trend data
  sma5?: number;
  sma10?: number;
  sma20?: number;
  rsi?: number;
  macdHistogram?: number;
  priceChangePercent?: number; // Recent price movement
  
  // Fundamental context
  revenueGrowthYoY?: number;
  epsGrowthYoY?: number;
  debtToEquity?: number;
  
  // Insider context
  insiderTradeDate?: string;
  daysSinceInsiderTrade?: number;
  insiderPrice?: number;
  
  // News/Sentiment
  avgSentiment?: number;
  newsCount?: number;
  
  // Sector context
  sectorVsSpy10d?: number;
  
  // Current scorecard (rule-based)
  fundamentalsScore?: number;
  technicalsScore?: number;
  insiderScore?: number;
  newsScore?: number;
  macroScore?: number;
}

/**
 * Helper to safely format a number with toFixed, handling null/undefined
 */
function safeFixed(value: number | null | undefined, decimals: number): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  return value.toFixed(decimals);
}

class GeminiAgentService {
  private genAI: GoogleGenAI;
  private model: string = "gemini-2.5-flash-preview-05-20";

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("[GeminiAgentService] GEMINI_API_KEY not found - AI evaluation will be disabled");
    }
    this.genAI = new GoogleGenAI({ apiKey: apiKey || "" });
  }

  /**
   * Evaluate stock opportunity using Gemini AI
   */
  async evaluateStock(context: StockContext): Promise<AIAgentEvaluation> {
    const prompt = this.buildEvaluationPrompt(context);
    
    try {
      const response = await this.genAI.models.generateContent({
        model: this.model,
        contents: prompt,
      });
      
      // Extract text from response properly
      const candidate = response.candidates?.[0];
      let responseText = "";
      if (candidate?.content?.parts) {
        responseText = candidate.content.parts.map((p: any) => p.text || "").join("");
      }
      
      return this.parseEvaluationResponse(responseText);
    } catch (error) {
      // CRITICAL: Don't hide Gemini failures - propagate them so job can retry
      console.error("[GeminiAgentService] Gemini API call failed:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Gemini API call failed: ${errorMessage}`);
    }
  }

  /**
   * Build comprehensive evaluation prompt for Gemini
   */
  private buildEvaluationPrompt(context: StockContext): string {
    const direction = context.opportunityType === "BUY" ? "long (buy)" : "short (sell)";
    const profitDirection = context.opportunityType === "BUY" ? "upward" : "downward";
    
    return `You are an expert stock analyst evaluating a ${direction} opportunity for ${context.ticker} (${context.companyName}).

## OPPORTUNITY TYPE: ${context.opportunityType}
Current Price: $${context.currentPrice}

## PRICE TREND & TECHNICALS
${safeFixed(context.sma5, 2) ? `- 5-day SMA: $${safeFixed(context.sma5, 2)}` : ''}
${safeFixed(context.sma10, 2) ? `- 10-day SMA: $${safeFixed(context.sma10, 2)}` : ''}
${safeFixed(context.sma20, 2) ? `- 20-day SMA: $${safeFixed(context.sma20, 2)}` : ''}
${safeFixed(context.rsi, 1) ? `- RSI (14-day): ${safeFixed(context.rsi, 1)}` : ''}
${safeFixed(context.macdHistogram, 3) ? `- MACD Histogram: ${safeFixed(context.macdHistogram, 3)}` : ''}
${safeFixed(context.priceChangePercent, 1) ? `- Recent Price Change: ${(context.priceChangePercent ?? 0) > 0 ? '+' : ''}${safeFixed(context.priceChangePercent, 1)}%` : ''}

## FUNDAMENTALS
${safeFixed(context.revenueGrowthYoY, 1) ? `- Revenue Growth YoY: ${(context.revenueGrowthYoY ?? 0) > 0 ? '+' : ''}${safeFixed(context.revenueGrowthYoY, 1)}%` : ''}
${safeFixed(context.epsGrowthYoY, 1) ? `- EPS Growth YoY: ${(context.epsGrowthYoY ?? 0) > 0 ? '+' : ''}${safeFixed(context.epsGrowthYoY, 1)}%` : ''}
${safeFixed(context.debtToEquity, 2) ? `- Debt-to-Equity: ${safeFixed(context.debtToEquity, 2)}` : ''}

## INSIDER ACTIVITY
${context.daysSinceInsiderTrade != null ? `- Days Since Insider Trade: ${context.daysSinceInsiderTrade}` : ''}
${context.insiderPrice != null ? `- Insider Price: $${context.insiderPrice}` : ''}

## MARKET SENTIMENT
${safeFixed(context.avgSentiment, 2) ? `- News Sentiment: ${safeFixed(context.avgSentiment, 2)} (-1 to +1)` : ''}
${context.newsCount != null ? `- News Volume (7d): ${context.newsCount} articles` : ''}
${safeFixed(context.sectorVsSpy10d, 1) ? `- Sector vs SPY (10d): ${(context.sectorVsSpy10d ?? 0) > 0 ? '+' : ''}${safeFixed(context.sectorVsSpy10d, 1)}%` : ''}

## RULE-BASED SCORES (0-100)
${context.fundamentalsScore != null ? `- Fundamentals: ${context.fundamentalsScore}/100` : ''}
${context.technicalsScore != null ? `- Technicals: ${context.technicalsScore}/100` : ''}
${context.insiderScore != null ? `- Insider Activity: ${context.insiderScore}/100` : ''}
${context.newsScore != null ? `- News Sentiment: ${context.newsScore}/100` : ''}
${context.macroScore != null ? `- Macro/Sector: ${context.macroScore}/100` : ''}

---

Evaluate this ${direction} opportunity on three dimensions. Respond in EXACTLY this JSON format:

{
  "riskAssessment": "<one of: minimal_risk, manageable_risk, moderate_risk, elevated_risk, high_risk>",
  "entryTiming": "<one of: early_before_profit, optimal_entry_window, mid_way_through_move, late_entry, missed_opportunity>",
  "conviction": "<one of: very_high_conviction, high_conviction, moderate_conviction, low_conviction, no_conviction>",
  "rationale": {
    "risk": "<1-2 sentence explanation of downside risks>",
    "timing": "<1-2 sentence explanation analyzing the TREND and whether we're entering BEFORE the ${profitDirection} move, MID-WAY through it, or TOO LATE>",
    "conviction": "<1-2 sentence explanation of your confidence level in this ${direction} thesis>"
  }
}

**CRITICAL INSTRUCTIONS:**
1. **Risk Assessment**: Consider volatility, fundamental weakness, market conditions, sector headwinds.
2. **Entry Timing**: Look at the TREND (SMAs, RSI, MACD), the opportunity type (${context.opportunityType}), and the rule-based scores. Are we joining BEFORE the expected ${profitDirection} profit move, MID-WAY through it, or is it TOO LATE? Consider: Is the trend already extended? Are technicals showing early momentum or exhaustion?
3. **Conviction**: How confident are you in the ${direction} thesis given ALL the data?
4. **For ${context.opportunityType} opportunities**: ${context.opportunityType === "BUY" ? "Look for early uptrends, improving fundamentals, positive catalysts" : "Look for early downtrends, deteriorating fundamentals, negative catalysts"}.

Return ONLY the JSON object, no other text.`;
  }

  /**
   * Parse Gemini response into structured evaluation
   */
  private parseEvaluationResponse(response: string): AIAgentEvaluation {
    try {
      // Extract JSON from response (handle cases where AI adds extra text)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate structure
      if (!parsed.riskAssessment || !parsed.entryTiming || !parsed.conviction || !parsed.rationale) {
        throw new Error("Invalid response structure");
      }
      
      return {
        riskAssessment: parsed.riskAssessment,
        entryTiming: parsed.entryTiming,
        conviction: parsed.conviction,
        rationale: {
          risk: parsed.rationale.risk || "No risk rationale provided",
          timing: parsed.rationale.timing || "No timing rationale provided",
          conviction: parsed.rationale.conviction || "No conviction rationale provided"
        }
      };
    } catch (error) {
      // CRITICAL: Don't hide parse failures - propagate them so job can retry
      console.error("[GeminiAgentService] Error parsing response:", error);
      console.error("[GeminiAgentService] Raw response:", response);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to parse Gemini response: ${errorMessage}. Raw response: ${response.substring(0, 200)}`);
    }
  }
}

export const geminiAgentService = new GeminiAgentService();

/**
 * Check if an AIAgentEvaluation is a fallback/stub response
 * This centralized helper detects any result that should trigger a job retry
 */
export function isFallbackEvaluation(evaluation: AIAgentEvaluation): { isFallback: boolean; reason: string } {
  // Check 1: Default categorical triple (indicates Gemini error/parse failure)
  const isDefaultTriple = 
    evaluation.riskAssessment === 'moderate_risk' &&
    evaluation.entryTiming === 'mid_way_through_move' &&
    evaluation.conviction === 'moderate_conviction';
  
  // Check 2: Known stub patterns in rationale text
  const stubPatterns = [
    'Unable to',
    'No risk rationale',
    'No timing rationale',
    'No conviction rationale',
    'could not be assessed',
    'AI service error',
    'parse error',
    'limited data',
  ];
  
  const hasStubRationale = stubPatterns.some(pattern => 
    evaluation.rationale.risk.toLowerCase().includes(pattern.toLowerCase()) ||
    evaluation.rationale.timing.toLowerCase().includes(pattern.toLowerCase()) ||
    evaluation.rationale.conviction.toLowerCase().includes(pattern.toLowerCase())
  );
  
  // Check 3: Empty or very short rationale (indicates AI failure to generate substantive content)
  const hasEmptyRationale = 
    !evaluation.rationale.risk || evaluation.rationale.risk.trim().length < 10 ||
    !evaluation.rationale.timing || evaluation.rationale.timing.trim().length < 10 ||
    !evaluation.rationale.conviction || evaluation.rationale.conviction.trim().length < 10;
  
  if (isDefaultTriple && hasStubRationale) {
    return { isFallback: true, reason: 'Default triple with stub rationale (complete fallback)' };
  }
  
  if (isDefaultTriple) {
    return { isFallback: true, reason: 'Default categorical triple (likely fallback even without stub text)' };
  }
  
  if (hasStubRationale) {
    return { isFallback: true, reason: 'Stub rationale detected (partial failure)' };
  }
  
  if (hasEmptyRationale) {
    return { isFallback: true, reason: 'Empty or too short rationale (AI failed to generate substantive content)' };
  }
  
  return { isFallback: false, reason: '' };
}
