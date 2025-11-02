import OpenAI from "openai";
import type { MacroAnalysis, InsertMacroAnalysis } from "@shared/schema";

// Using OpenAI API for macro analysis
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY!;

interface MarketData {
  sp500: {
    level: number;
    change: number;
    trend: string;
  };
  vix: {
    level: number;
    interpretation: string;
  };
  sectorPerformance: Array<{
    sector: string;
    performance: string;
    trend: string;
  }>;
  webNews?: Array<{
    title: string;
    snippet: string;
    sentiment: string;
  }>;
  economicIndicators?: {
    gdpGrowth?: number;
    inflationRate?: number;
    unemploymentRate?: number;
    fedFundsRate?: number;
  };
}

async function fetchMarketNewsSentiment(): Promise<Array<{ title: string; snippet: string; sentiment: string }>> {
  try {
    // Use Alpha Vantage News Sentiment API for market-wide news
    const response = await fetch(
      `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&topics=economy_macro,technology,finance&limit=10&apikey=${ALPHA_VANTAGE_API_KEY}`
    );
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const data = await response.json();
    
    if (!data.feed || !Array.isArray(data.feed)) {
      return [];
    }
    
    // Extract top news items with sentiment
    return data.feed.slice(0, 5).map((item: any) => ({
      title: item.title || "",
      snippet: item.summary?.substring(0, 150) || "",
      sentiment: item.overall_sentiment_label || "neutral",
    }));
  } catch (error) {
    console.warn("[MacroAgent] Market news fetch failed:", error);
    return [];
  }
}

async function fetchEconomicIndicators(): Promise<MarketData['economicIndicators']> {
  try {
    // Batch all economic indicator requests with staggered delays (75 calls/min = 800ms spacing)
    const delays = [0, 900, 1800, 2700]; // Stagger requests by 900ms each
    
    const [fedData, cpiData, unemploymentData, gdpData] = await Promise.all([
      // Fed Funds Rate
      (async () => {
        await new Promise(resolve => setTimeout(resolve, delays[0]));
        const response = await fetch(
          `https://www.alphavantage.co/query?function=FEDERAL_FUNDS_RATE&apikey=${ALPHA_VANTAGE_API_KEY}`
        );
        return response.json();
      })(),
      // CPI (inflation)
      (async () => {
        await new Promise(resolve => setTimeout(resolve, delays[1]));
        const response = await fetch(
          `https://www.alphavantage.co/query?function=CPI&apikey=${ALPHA_VANTAGE_API_KEY}`
        );
        return response.json();
      })(),
      // Unemployment
      (async () => {
        await new Promise(resolve => setTimeout(resolve, delays[2]));
        const response = await fetch(
          `https://www.alphavantage.co/query?function=UNEMPLOYMENT&apikey=${ALPHA_VANTAGE_API_KEY}`
        );
        return response.json();
      })(),
      // Real GDP
      (async () => {
        await new Promise(resolve => setTimeout(resolve, delays[3]));
        const response = await fetch(
          `https://www.alphavantage.co/query?function=REAL_GDP&apikey=${ALPHA_VANTAGE_API_KEY}`
        );
        return response.json();
      })(),
    ]);
    
    // Wait for rate limit reset before continuing
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      fedFundsRate: fedData.data?.[0]?.value ? parseFloat(fedData.data[0].value) : undefined,
      inflationRate: cpiData.data?.[0]?.value ? parseFloat(cpiData.data[0].value) : undefined,
      unemploymentRate: unemploymentData.data?.[0]?.value ? parseFloat(unemploymentData.data[0].value) : undefined,
      gdpGrowth: gdpData.data?.[0]?.value ? parseFloat(gdpData.data[0].value) : undefined,
    };
  } catch (error) {
    console.warn("[MacroAgent] Economic indicators fetch failed:", error);
    return {};
  }
}

async function fetchMarketIndices(): Promise<MarketData> {
  console.log("[MacroAgent] Fetching market indices...");
  
  try {
    // Fetch S&P 500 data (using SPY as proxy)
    const sp500Response = await fetch(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=SPY&apikey=${ALPHA_VANTAGE_API_KEY}`
    );
    await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limiting
    
    const sp500Data = await sp500Response.json();
    const sp500Price = parseFloat(sp500Data["Global Quote"]?.["05. price"] || "0");
    const sp500Change = parseFloat(sp500Data["Global Quote"]?.["10. change percent"]?.replace("%", "") || "0");
    
    // Fetch VIX data
    const vixResponse = await fetch(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=^VIX&apikey=${ALPHA_VANTAGE_API_KEY}`
    );
    await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limiting
    
    const vixData = await vixResponse.json();
    const vixLevel = parseFloat(vixData["Global Quote"]?.["05. price"] || "20");
    
    // Fetch major sector ETFs for sector analysis
    const sectors = [
      { symbol: "XLK", name: "Technology" },
      { symbol: "XLF", name: "Financials" },
      { symbol: "XLE", name: "Energy" },
      { symbol: "XLV", name: "Healthcare" },
      { symbol: "XLI", name: "Industrials" },
    ];
    
    const sectorPerformance = await Promise.all(
      sectors.map(async (sector) => {
        const response = await fetch(
          `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${sector.symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`
        );
        await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limiting
        
        const data = await response.json();
        const change = parseFloat(data["Global Quote"]?.["10. change percent"]?.replace("%", "") || "0");
        
        return {
          sector: sector.name,
          performance: Math.abs(change) > 1 ? (change > 0 ? "strong" : "weak") : "moderate",
          trend: change > 0.5 ? "up" : change < -0.5 ? "down" : "flat",
        };
      })
    );
    
    // Fetch economic indicators and market news (parallel)
    console.log("[MacroAgent] Fetching economic indicators and market news...");
    const [economicIndicators, webNews] = await Promise.all([
      fetchEconomicIndicators(),
      fetchMarketNewsSentiment(),
    ]);
    
    return {
      sp500: {
        level: sp500Price,
        change: sp500Change,
        trend: sp500Change > 1 ? "bullish" : sp500Change < -1 ? "bearish" : "neutral",
      },
      vix: {
        level: vixLevel,
        interpretation: vixLevel < 15 ? "low_fear" : vixLevel < 20 ? "moderate_fear" : vixLevel < 30 ? "high_fear" : "extreme_fear",
      },
      sectorPerformance,
      economicIndicators,
      webNews: webNews.length > 0 ? webNews : undefined,
    };
  } catch (error) {
    console.error("[MacroAgent] Error fetching market data:", error);
    throw error;
  }
}

// Map industries to their corresponding ETF tickers for performance analysis
// Covers both Alpha Vantage and Finnhub naming conventions
const INDUSTRY_ETF_MAP: Record<string, string> = {
  // Technology
  "technology": "XLK",
  "information technology": "XLK",
  "software": "XLK",
  "semiconductors": "XLK",
  
  // Financials/Banking
  "financials": "XLF",
  "financial services": "XLF",
  "banking": "XLF",
  "banks": "XLF",
  "capital markets": "XLF",
  "insurance": "XLF",
  "diversified financial services": "XLF",
  
  // Healthcare
  "healthcare": "XLV",
  "health care": "XLV",
  "biotechnology": "XLV",
  "pharmaceuticals": "XLV",
  "medical devices": "XLV",
  
  // Energy
  "energy": "XLE",
  "oil & gas": "XLE",
  "oil and gas": "XLE",
  
  // Industrials
  "industrials": "XLI",
  "industrial": "XLI",
  "aerospace & defense": "XLI",
  "construction": "XLI",
  "machinery": "XLI",
  
  // Consumer
  "consumer discretionary": "XLY",
  "consumer cyclical": "XLY",
  "retail": "XLY",
  "consumer staples": "XLP",
  "consumer defensive": "XLP",
  
  // Utilities
  "utilities": "XLU",
  "utility": "XLU",
  
  // Real Estate
  "real estate": "XLRE",
  "reits": "XLRE",
  
  // Materials
  "materials": "XLB",
  "basic materials": "XLB",
  
  // Communication
  "communication services": "XLC",
  "telecommunications": "XLC",
  "media": "XLC",
};

// Normalize industry/sector string for ETF lookup
function normalizeIndustry(industry: string | null | undefined): string | null {
  if (!industry || industry === "N/A") return null;
  return industry.toLowerCase().trim();
}

export async function runMacroAnalysis(industry?: string): Promise<InsertMacroAnalysis> {
  const industryLabel = industry || "General Market";
  console.log(`[MacroAgent] Starting macro economic analysis for ${industryLabel}...`);
  
  try {
    // Fetch market data
    const marketData = await fetchMarketIndices();
    
    // Fetch industry-specific ETF performance if industry is provided
    let industryPerformance: { change: number; trend: string } | null = null;
    const normalizedIndustry = normalizeIndustry(industry);
    if (normalizedIndustry && INDUSTRY_ETF_MAP[normalizedIndustry]) {
      const etfSymbol = INDUSTRY_ETF_MAP[normalizedIndustry];
      console.log(`[MacroAgent] Fetching industry-specific data for ${industry} → ${normalizedIndustry} (${etfSymbol})...`);
      
      try {
        const response = await fetch(
          `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${etfSymbol}&apikey=${ALPHA_VANTAGE_API_KEY}`
        );
        await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limiting
        
        const data = await response.json();
        const change = parseFloat(data["Global Quote"]?.["10. change percent"]?.replace("%", "") || "0");
        
        industryPerformance = {
          change,
          trend: change > 1 ? "strong_up" : change > 0.3 ? "up" : change < -1 ? "strong_down" : change < -0.3 ? "down" : "flat",
        };
      } catch (error) {
        console.warn(`[MacroAgent] Could not fetch industry data for ${industry}:`, error);
      }
    }
    
    // Prepare prompt for OpenAI
    const industryContext = industry 
      ? `\n\nINDUSTRY-SPECIFIC ANALYSIS FOR: ${industry}
${industryPerformance ? `- Industry ETF Performance: ${industryPerformance.change > 0 ? '+' : ''}${industryPerformance.change.toFixed(2)}% (Trend: ${industryPerformance.trend})
- Industry Relative Strength: ${industryPerformance.change > marketData.sp500.change ? 'Outperforming market' : 'Underperforming market'}` : '- No industry-specific data available'}

IMPORTANT: Your analysis should consider BOTH general market conditions AND this specific industry's performance. Adjust the macro factor based on how this industry is positioned in the current market environment.`
      : '';
    
    // Format economic indicators section if available
    const economicContext = marketData.economicIndicators && Object.keys(marketData.economicIndicators).length > 0
      ? `\n\nECONOMIC INDICATORS (Latest Data):
${marketData.economicIndicators.fedFundsRate ? `- Federal Funds Rate: ${marketData.economicIndicators.fedFundsRate.toFixed(2)}%` : ''}
${marketData.economicIndicators.inflationRate ? `- CPI (Inflation): ${marketData.economicIndicators.inflationRate}` : ''}
${marketData.economicIndicators.unemploymentRate ? `- Unemployment Rate: ${marketData.economicIndicators.unemploymentRate.toFixed(1)}%` : ''}
${marketData.economicIndicators.gdpGrowth ? `- Real GDP: $${(marketData.economicIndicators.gdpGrowth / 1000).toFixed(2)}T` : ''}

These economic indicators provide crucial context for the 1-2 week market outlook. Consider their impact on investor sentiment and near-term market direction.`
      : '';
    
    // Format news sentiment section if available
    const newsContext = marketData.webNews && marketData.webNews.length > 0
      ? `\n\nRECENT MARKET NEWS SENTIMENT (Alpha Vantage):
${marketData.webNews.map((news, idx) => `${idx + 1}. [${news.sentiment.toUpperCase()}] ${news.title}`).join('\n')}

News sentiment analysis shows the current market narrative and investor psychology. Use this to gauge near-term sentiment trends.`
      : '';
      
    const prompt = `You are a seasoned macro economist and market strategist analyzing current market conditions to provide guidance for equity investors${industry ? ` in the ${industry} sector` : ''}.

INVESTMENT HORIZON: 1-2 weeks (short-term trading window)

MARKET DATA:
- S&P 500 Level: ${marketData.sp500.level} (${marketData.sp500.change > 0 ? '+' : ''}${marketData.sp500.change.toFixed(2)}%)
- VIX (Fear Index): ${marketData.vix.level} (${marketData.vix.interpretation})
- Sector Performance: ${JSON.stringify(marketData.sectorPerformance, null, 2)}${economicContext}${newsContext}${industryContext}

YOUR ANALYSIS MUST INCLUDE TWO PARTS:

PART 1: GENERAL MARKET ANALYSIS (1-2 week outlook)
- What is the overall market sentiment and momentum for the next 1-2 weeks?
- Are there near-term catalysts (earnings, Fed announcements, economic data) upcoming?
- What is the short-term risk/reward profile?

PART 2: SECTOR-SPECIFIC ANALYSIS${industry ? ` FOR ${industry.toUpperCase()}` : ' (if applicable)'}
${industry ? `- How is the ${industry} sector positioned for the next 1-2 weeks?
- Is it showing relative strength or weakness vs the broader market?
- Are there sector-specific catalysts or headwinds in the near term?` : '- General sector rotation patterns for the next 1-2 weeks'}

REQUIRED OUTPUT:

1. **macroScore** (0-100): Overall health of the market${industry ? ` and ${industry} sector` : ''} for the 1-2 week horizon

2. **recommendation** - MUST be one of these EXACT values:
   - "good" = Favorable conditions for 1-2 week trades (low volatility, positive momentum, sector strength)
   - "neutral" = Normal conditions, no strong tailwinds or headwinds
   - "risky" = Uncertain conditions (elevated volatility, mixed signals, sector weakness)
   - "bad" = Unfavorable conditions (high volatility, negative momentum, sector deterioration)

3. **marketCondition**: "bull", "bear", "sideways", or "volatile"
4. **marketPhase**: "early_cycle", "mid_cycle", "late_cycle", or "recession"
5. **riskAppetite**: "high", "moderate", or "low"
6. **keyThemes**: List 3-5 major themes affecting the 1-2 week outlook
7. **opportunities**: What positions benefit from current short-term conditions?
8. **risks**: What are the major near-term risks for the next 1-2 weeks?
9. **summary**: 2-3 sentence executive summary of the 1-2 week outlook

CRITICAL: The "recommendation" field MUST be exactly one of: "good", "neutral", "risky", or "bad"

Respond in JSON format:
{
  "macroScore": <number 0-100>,
  "recommendation": "<good|neutral|risky|bad>",
  "summary": "<string>",
  "marketCondition": "<string>",
  "marketPhase": "<string>",
  "riskAppetite": "<string>",
  "keyThemes": ["<theme1>", "<theme2>", ...],
  "opportunities": ["<opportunity1>", "<opportunity2>", ...],
  "risks": ["<risk1>", "<risk2>", ...]
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a macro economic analyst providing market-wide analysis. Always respond with valid JSON only, no markdown or additional text.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3,
    });

    let responseText = completion.choices[0].message.content || "{}";
    
    // Strip markdown code fences if present (e.g., ```json ... ```)
    responseText = responseText.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
    
    const analysis = JSON.parse(responseText);
    
    // Validate and sanitize macro score
    const macroScore = typeof analysis.macroScore === "number" && !isNaN(analysis.macroScore) 
      ? Math.max(0, Math.min(100, Math.round(analysis.macroScore)))
      : 50; // Default to neutral if invalid
    
    // Map categorical recommendation to fixed multipliers
    const recommendation = (analysis.recommendation || "neutral").toLowerCase();
    const validRecommendations = ["good", "neutral", "risky", "bad"];
    const finalRecommendation = validRecommendations.includes(recommendation) 
      ? recommendation 
      : "neutral"; // Default to neutral if invalid
    
    // Fixed multiplier mapping
    const MACRO_MULTIPLIERS: Record<string, number> = {
      "good": 1.1,    // 10% boost for favorable conditions
      "neutral": 1.0, // No adjustment
      "risky": 0.8,   // 20% penalty for uncertain conditions
      "bad": 0.6      // 40% penalty for unfavorable conditions
    };
    
    const macroFactor = MACRO_MULTIPLIERS[finalRecommendation];
    
    console.log(`[MacroAgent] Analysis complete. Macro Score: ${macroScore} Recommendation: ${finalRecommendation} Factor: ${macroFactor}`);
    if (recommendation !== finalRecommendation) {
      console.warn(`[MacroAgent] Invalid recommendation "${recommendation}" - defaulted to "neutral"`);
    }
    
    return {
      industry: industry || null,
      status: "completed",
      macroScore: macroScore,
      macroFactor: macroFactor.toFixed(2),
      summary: analysis.summary,
      sp500Level: marketData.sp500.level.toFixed(2),
      sp500Change: marketData.sp500.change.toFixed(2),
      sp500Trend: marketData.sp500.trend,
      vixLevel: marketData.vix.level.toFixed(2),
      vixInterpretation: marketData.vix.interpretation,
      economicIndicators: marketData.economicIndicators || {},
      sectorPerformance: marketData.sectorPerformance,
      marketCondition: analysis.marketCondition,
      marketPhase: analysis.marketPhase,
      riskAppetite: analysis.riskAppetite,
      keyThemes: analysis.keyThemes,
      opportunities: analysis.opportunities,
      risks: analysis.risks,
      recommendation: finalRecommendation, // Categorical: "good", "neutral", "risky", "bad"
      analyzedAt: new Date(),
      errorMessage: null,
    };
  } catch (error) {
    console.error("[MacroAgent] Error during analysis:", error);
    return {
      industry: industry || null,
      status: "failed",
      macroScore: null,
      macroFactor: null,
      summary: null,
      sp500Level: null,
      sp500Change: null,
      sp500Trend: null,
      vixLevel: null,
      vixInterpretation: null,
      economicIndicators: null,
      sectorPerformance: null,
      marketCondition: null,
      marketPhase: null,
      riskAppetite: null,
      keyThemes: null,
      opportunities: null,
      risks: null,
      recommendation: null,
      analyzedAt: new Date(),
      errorMessage: error instanceof Error ? error.message : "Unknown error during macro analysis",
    };
  }
}

export function integrateScores(microScore: number, macroFactor: number): { integratedScore: number; adjustment: string } {
  const integrated = Math.round(microScore * macroFactor);
  const clamped = Math.max(0, Math.min(100, integrated));
  
  let adjustment = "";
  if (macroFactor < 0.9) {
    adjustment = `Score reduced from ${microScore} to ${clamped} due to challenging macro conditions (${macroFactor}x factor)`;
  } else if (macroFactor > 1.1) {
    adjustment = `Score boosted from ${microScore} to ${clamped} due to favorable macro conditions (${macroFactor}x factor)`;
  } else {
    adjustment = `Score maintained at ${clamped} (neutral macro environment, ${macroFactor}x factor)`;
  }
  
  return { integratedScore: clamped, adjustment };
}
