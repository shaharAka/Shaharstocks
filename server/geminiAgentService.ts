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

import { GoogleGenAIService } from "./utils/googleGenAIService";

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

class GeminiAgentService {
  private genAI: GoogleGenAIService;

  constructor() {
    this.genAI = new GoogleGenAIService();
  }

  /**
   * Evaluate stock opportunity using Gemini AI
   */
  async evaluateStock(context: StockContext): Promise<AIAgentEvaluation> {
    const prompt = this.buildEvaluationPrompt(context);
    
    try {
      const response = await this.genAI.generateText(prompt);
      return this.parseEvaluationResponse(response);
    } catch (error) {
      console.error("[GeminiAgentService] Error evaluating stock:", error);
      // Return neutral assessment on error
      return {
        riskAssessment: "moderate_risk",
        entryTiming: "mid_way_through_move",
        conviction: "moderate_conviction",
        rationale: {
          risk: "Unable to assess risk due to AI service error",
          timing: "Unable to assess timing due to AI service error",
          conviction: "Unable to assess conviction due to AI service error"
        }
      };
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
${context.sma5 ? `- 5-day SMA: $${context.sma5.toFixed(2)}` : ''}
${context.sma10 ? `- 10-day SMA: $${context.sma10.toFixed(2)}` : ''}
${context.sma20 ? `- 20-day SMA: $${context.sma20.toFixed(2)}` : ''}
${context.rsi ? `- RSI (14-day): ${context.rsi.toFixed(1)}` : ''}
${context.macdHistogram ? `- MACD Histogram: ${context.macdHistogram.toFixed(3)}` : ''}
${context.priceChangePercent ? `- Recent Price Change: ${context.priceChangePercent > 0 ? '+' : ''}${context.priceChangePercent.toFixed(1)}%` : ''}

## FUNDAMENTALS
${context.revenueGrowthYoY !== undefined ? `- Revenue Growth YoY: ${context.revenueGrowthYoY > 0 ? '+' : ''}${context.revenueGrowthYoY.toFixed(1)}%` : ''}
${context.epsGrowthYoY !== undefined ? `- EPS Growth YoY: ${context.epsGrowthYoY > 0 ? '+' : ''}${context.epsGrowthYoY.toFixed(1)}%` : ''}
${context.debtToEquity !== undefined ? `- Debt-to-Equity: ${context.debtToEquity.toFixed(2)}` : ''}

## INSIDER ACTIVITY
${context.daysSinceInsiderTrade ? `- Days Since Insider Trade: ${context.daysSinceInsiderTrade}` : ''}
${context.insiderPrice ? `- Insider Price: $${context.insiderPrice}` : ''}

## MARKET SENTIMENT
${context.avgSentiment !== undefined ? `- News Sentiment: ${context.avgSentiment.toFixed(2)} (-1 to +1)` : ''}
${context.newsCount ? `- News Volume (7d): ${context.newsCount} articles` : ''}
${context.sectorVsSpy10d !== undefined ? `- Sector vs SPY (10d): ${context.sectorVsSpy10d > 0 ? '+' : ''}${context.sectorVsSpy10d.toFixed(1)}%` : ''}

## RULE-BASED SCORES (0-100)
${context.fundamentalsScore !== undefined ? `- Fundamentals: ${context.fundamentalsScore}/100` : ''}
${context.technicalsScore !== undefined ? `- Technicals: ${context.technicalsScore}/100` : ''}
${context.insiderScore !== undefined ? `- Insider Activity: ${context.insiderScore}/100` : ''}
${context.newsScore !== undefined ? `- News Sentiment: ${context.newsScore}/100` : ''}
${context.macroScore !== undefined ? `- Macro/Sector: ${context.macroScore}/100` : ''}

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
      console.error("[GeminiAgentService] Error parsing response:", error);
      console.error("[GeminiAgentService] Raw response:", response);
      
      // Return neutral fallback
      return {
        riskAssessment: "moderate_risk",
        entryTiming: "mid_way_through_move",
        conviction: "moderate_conviction",
        rationale: {
          risk: "Unable to parse AI risk assessment",
          timing: "Unable to parse AI timing assessment",
          conviction: "Unable to parse AI conviction assessment"
        }
      };
    }
  }
}

export const geminiAgentService = new GeminiAgentService();
