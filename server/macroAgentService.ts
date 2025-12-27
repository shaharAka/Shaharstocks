import OpenAI from "openai";
import type { MacroAnalysis, InsertMacroAnalysis } from "@shared/schema";
import { getAIProvider, generateWithFallback, type AIProviderConfig, type ChatMessage } from "./aiProvider";

// Using OpenAI API for macro analysis (deprecated, using provider interface now)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Current AI provider configuration (shared with aiAnalysisService)
let currentProviderConfig: AIProviderConfig = { provider: "openai" };

export function setMacroProviderConfig(config: AIProviderConfig): void {
  console.log(`[MacroAgent] Setting AI provider to: ${config.provider}`);
  currentProviderConfig = config;
}

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
    etfSymbol: string;
    performance: string;
    trend: string;
    currentPrice?: number;
    changePercent?: number;
    weekChange?: number;
    monthChange?: number;
    volatility?: number;
    relativeStrength?: number;
    momentum?: number;
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
        const currentPrice = parseFloat(data["Global Quote"]?.["05. price"] || "0");
        
        return {
          sector: sector.name,
          etfSymbol: sector.symbol,
          performance: Math.abs(change) > 1 ? (change > 0 ? "strong" : "weak") : "moderate",
          trend: change > 0.5 ? "up" : change < -0.5 ? "down" : "flat",
          currentPrice: currentPrice > 0 ? currentPrice : undefined,
          changePercent: change,
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

// Calculate standard deviation for volatility
function calculateStdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
  const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  return Math.sqrt(variance);
}

// Fetch detailed ETF performance data with historical metrics
async function fetchDetailedETFData(etfSymbol: string, sp500Change: number): Promise<{
  currentPrice: number;
  dayChange: number;
  weekChange: number;
  monthChange: number;
  volatility: number;
  relativeStrength: number;
  momentum: number;
} | null> {
  try {
    console.log(`[MacroAgent] Fetching detailed data for ${etfSymbol}...`);
    
    // Fetch daily time series data (compact = 100 days)
    const response = await fetch(
      `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${etfSymbol}&apikey=${ALPHA_VANTAGE_API_KEY}&outputsize=compact`
    );
    await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limiting
    
    const data = await response.json();
    const timeSeries = data["Time Series (Daily)"];
    
    if (!timeSeries) {
      console.warn(`[MacroAgent] No time series data for ${etfSymbol}`);
      return null;
    }
    
    // Sort dates descending (most recent first)
    const dates = Object.keys(timeSeries).sort().reverse();
    if (dates.length < 22) { // Need at least 22 trading days for monthly data
      console.warn(`[MacroAgent] Insufficient data for ${etfSymbol}`);
      return null;
    }
    
    // Extract closing prices
    const prices = dates.map(date => parseFloat(timeSeries[date]["4. close"]));
    const currentPrice = prices[0];
    const weekAgoPrice = prices[5] || prices[prices.length - 1]; // ~5 trading days ago
    const monthAgoPrice = prices[21] || prices[prices.length - 1]; // ~21 trading days ago
    
    // Calculate percentage changes
    const dayChange = ((currentPrice - prices[1]) / prices[1]) * 100;
    const weekChange = ((currentPrice - weekAgoPrice) / weekAgoPrice) * 100;
    const monthChange = ((currentPrice - monthAgoPrice) / monthAgoPrice) * 100;
    
    // Calculate daily returns for last 21 days
    const returns: number[] = [];
    for (let i = 0; i < Math.min(21, prices.length - 1); i++) {
      returns.push(((prices[i] - prices[i + 1]) / prices[i + 1]) * 100);
    }
    
    // Volatility = standard deviation of daily returns (annualized approximation)
    const volatility = calculateStdDev(returns) * Math.sqrt(252); // Annualized volatility
    
    // Relative strength vs S&P 500 (ETF performance - SPY performance)
    const relativeStrength = dayChange - sp500Change;
    
    // Momentum = average of last 5 day returns
    const recentReturns = returns.slice(0, 5);
    const momentum = recentReturns.reduce((sum, r) => sum + r, 0) / recentReturns.length;
    
    return {
      currentPrice,
      dayChange,
      weekChange,
      monthChange,
      volatility,
      relativeStrength,
      momentum,
    };
  } catch (error) {
    console.warn(`[MacroAgent] Error fetching detailed data for ${etfSymbol}:`, error);
    return null;
  }
}

export async function runMacroAnalysis(industry?: string): Promise<InsertMacroAnalysis> {
  const industryLabel = industry || "General Market";
  console.log(`[MacroAgent] Starting macro economic analysis for ${industryLabel}...`);
  
  let sanitizedResponse = "";  // Declare in outer scope for error logging
  
  try {
    // Fetch market data
    const marketData = await fetchMarketIndices();
    
    // Fetch detailed industry-specific ETF performance if industry is provided
    let industrySectorAnalysis: InsertMacroAnalysis['industrySectorAnalysis'] = undefined;
    const normalizedIndustry = normalizeIndustry(industry);
    if (normalizedIndustry && INDUSTRY_ETF_MAP[normalizedIndustry]) {
      const etfSymbol = INDUSTRY_ETF_MAP[normalizedIndustry];
      console.log(`[MacroAgent] Fetching detailed sector data for ${industry} → ${normalizedIndustry} (${etfSymbol})...`);
      
      const detailedData = await fetchDetailedETFData(etfSymbol, marketData.sp500.change);
      
      if (detailedData) {
        // Calculate sector weight based on relative strength and momentum
        // Weight ranges from 0-100, higher when sector is outperforming
        
        // Normalize relative strength to 0-50 scale
        // Strong outperformance (>3%) = 50 pts, strong underperformance (<-3%) = 0 pts
        const normalizedRS = ((detailedData.relativeStrength + 3) / 6) * 50; // Map -3% to +3% range onto 0-50
        const relativeStrengthWeight = Math.min(Math.max(normalizedRS, 0), 50);
        
        // Normalize momentum to 0-30 scale
        // Strong positive (>1.5%) = 30 pts, strong negative (<-1.5%) = 0 pts
        const normalizedMomentum = ((detailedData.momentum + 1.5) / 3) * 30; // Map -1.5% to +1.5% range onto 0-30
        const momentumWeight = Math.min(Math.max(normalizedMomentum, 0), 30);
        
        // Normalize volatility to 0-20 scale (inverse - lower volatility = higher weight)
        // Low volatility (<10%) = 20 pts, high volatility (>40%) = 0 pts
        const normalizedVolatility = ((40 - detailedData.volatility) / 30) * 20; // Map 10-40% range onto 20-0
        const volatilityWeight = Math.min(Math.max(normalizedVolatility, 0), 20);
        
        const sectorWeight = Math.round(relativeStrengthWeight + momentumWeight + volatilityWeight);
        
        // Log weight calculation for verification
        console.log(`[MacroAgent] Sector Weight Calculation for ${etfSymbol}:`);
        console.log(`  - Relative Strength: ${detailedData.relativeStrength.toFixed(2)}% → ${relativeStrengthWeight.toFixed(1)} pts (max 50)`);
        console.log(`  - Momentum: ${detailedData.momentum.toFixed(2)}% → ${momentumWeight.toFixed(1)} pts (max 30)`);
        console.log(`  - Volatility: ${detailedData.volatility.toFixed(1)}% → ${volatilityWeight.toFixed(1)} pts (max 20)`);
        console.log(`  - Total Sector Weight: ${sectorWeight}/100`);
        
        // Generate sector explanation
        const sectorExplanation = `${industry} sector (${etfSymbol}) is ${
          detailedData.relativeStrength > 1 ? 'significantly outperforming' :
          detailedData.relativeStrength > 0 ? 'slightly outperforming' :
          detailedData.relativeStrength > -1 ? 'slightly underperforming' : 'significantly underperforming'
        } the broader market with ${detailedData.relativeStrength > 0 ? '+' : ''}${detailedData.relativeStrength.toFixed(2)}% relative strength. ` +
        `${detailedData.momentum > 0.5 ? 'Strong positive' : detailedData.momentum > 0 ? 'Moderate positive' : detailedData.momentum > -0.5 ? 'Weak negative' : 'Strong negative'} momentum (${detailedData.momentum.toFixed(2)}%). ` +
        `Volatility is ${detailedData.volatility > 25 ? 'elevated' : detailedData.volatility > 15 ? 'moderate' : 'low'} at ${detailedData.volatility.toFixed(1)}% annualized. ` +
        `Sector weight: ${sectorWeight}/100 (${sectorWeight > 70 ? 'high influence' : sectorWeight > 40 ? 'moderate influence' : 'low influence'} on analysis).`;
        
        industrySectorAnalysis = {
          etfSymbol,
          sectorName: industry || "Unknown",
          currentPrice: detailedData.currentPrice,
          dayChange: detailedData.dayChange,
          weekChange: detailedData.weekChange,
          monthChange: detailedData.monthChange,
          volatility: detailedData.volatility,
          relativeStrength: detailedData.relativeStrength,
          momentum: detailedData.momentum,
          sectorWeight,
          sectorExplanation,
        };
        
        console.log(`[MacroAgent] Sector Analysis: ${sectorExplanation}`);
      }
    }
    
    // Prepare prompt for OpenAI with enhanced sector context
    const industryContext = industrySectorAnalysis 
      ? `\n\n═══════════════════════════════════════════════════════════════
INDUSTRY-SPECIFIC SECTOR ANALYSIS FOR: ${industry}
═══════════════════════════════════════════════════════════════

SECTOR ETF: ${industrySectorAnalysis.etfSymbol} - ${industrySectorAnalysis.sectorName}

PERFORMANCE METRICS:
- Current Price: $${industrySectorAnalysis.currentPrice.toFixed(2)}
- Daily Change: ${industrySectorAnalysis.dayChange > 0 ? '+' : ''}${industrySectorAnalysis.dayChange.toFixed(2)}%
- Week Change: ${industrySectorAnalysis.weekChange > 0 ? '+' : ''}${industrySectorAnalysis.weekChange.toFixed(2)}%
- Month Change: ${industrySectorAnalysis.monthChange > 0 ? '+' : ''}${industrySectorAnalysis.monthChange.toFixed(2)}%

SECTOR STRENGTH ANALYSIS:
- Relative Strength vs S&P 500: ${industrySectorAnalysis.relativeStrength > 0 ? '+' : ''}${industrySectorAnalysis.relativeStrength.toFixed(2)}% ${
  industrySectorAnalysis.relativeStrength > 1 ? '(SIGNIFICANTLY OUTPERFORMING ✓)' :
  industrySectorAnalysis.relativeStrength > 0 ? '(Outperforming ✓)' :
  industrySectorAnalysis.relativeStrength > -1 ? '(Underperforming ✗)' : '(SIGNIFICANTLY UNDERPERFORMING ✗✗)'
}
- Momentum (5-day): ${industrySectorAnalysis.momentum > 0 ? '+' : ''}${industrySectorAnalysis.momentum.toFixed(2)}% ${
  industrySectorAnalysis.momentum > 0.5 ? '(STRONG POSITIVE ⬆)' :
  industrySectorAnalysis.momentum > 0 ? '(Positive ↗)' :
  industrySectorAnalysis.momentum > -0.5 ? '(Weak ↘)' : '(NEGATIVE ⬇)'
}
- Volatility (annualized): ${industrySectorAnalysis.volatility.toFixed(1)}% ${
  industrySectorAnalysis.volatility > 25 ? '(HIGH VOLATILITY ⚠)' :
  industrySectorAnalysis.volatility > 15 ? '(Moderate)' : '(Low ✓)'
}

SECTOR WEIGHT: ${industrySectorAnalysis.sectorWeight}/100 ${
  industrySectorAnalysis.sectorWeight > 70 ? '(HIGH INFLUENCE - PRIORITIZE SECTOR TRENDS)' :
  industrySectorAnalysis.sectorWeight > 40 ? '(MODERATE INFLUENCE)' : '(LOW INFLUENCE - GENERAL MARKET MATTERS MORE)'
}

AUTOMATED SECTOR SUMMARY:
${industrySectorAnalysis.sectorExplanation}

═══════════════════════════════════════════════════════════════
CRITICAL GUIDANCE FOR YOUR ANALYSIS:
═══════════════════════════════════════════════════════════════

1. SECTOR WEIGHT INTERPRETATION:
   - ${industrySectorAnalysis.sectorWeight > 70 ? 'This sector is showing VERY STRONG signals - prioritize sector-specific trends heavily in your recommendation' :
     industrySectorAnalysis.sectorWeight > 40 ? 'This sector has MODERATE influence - balance sector and general market conditions' :
     'This sector is showing WEAK signals - rely more on general market conditions'}

2. RELATIVE STRENGTH MATTERS:
   - Sector is ${industrySectorAnalysis.relativeStrength > 0 ? 'OUTPERFORMING' : 'UNDERPERFORMING'} the market
   - This ${industrySectorAnalysis.relativeStrength > 1 || industrySectorAnalysis.relativeStrength < -1 ? 'STRONGLY' : 'moderately'} affects ${industry} stock recommendations

3. MOMENTUM SIGNALS:
   - ${industrySectorAnalysis.momentum > 0.5 ? 'Strong positive momentum suggests continued strength - favorable for BUY recommendations' :
     industrySectorAnalysis.momentum > 0 ? 'Moderate positive momentum - cautiously favorable' :
     industrySectorAnalysis.momentum > -0.5 ? 'Weak momentum - neutral to slightly negative' :
     'Strong negative momentum - unfavorable for BUY, consider lower scores'}

4. VOLATILITY CONSIDERATIONS:
   - ${industrySectorAnalysis.volatility > 25 ? 'HIGH volatility indicates increased risk - consider lowering recommendation strength' :
     industrySectorAnalysis.volatility > 15 ? 'Moderate volatility - normal market conditions' :
     'Low volatility - stable sector, favorable for recommendations'}

YOUR SECTOR-SPECIFIC RECOMMENDATION MUST:
- Explain how the sector's ${industrySectorAnalysis.sectorWeight}/100 weight influenced your decision
- Address the ${industrySectorAnalysis.relativeStrength > 0 ? 'outperformance' : 'underperformance'} relative to the market
- Consider the ${industrySectorAnalysis.momentum > 0 ? 'positive' : 'negative'} momentum trend
- Account for the ${industrySectorAnalysis.volatility > 20 ? 'elevated' : 'moderate'} volatility level
`
      : industry
      ? `\n\nINDUSTRY-SPECIFIC ANALYSIS FOR: ${industry}
- No detailed sector ETF data available
- Rely primarily on general market conditions for this analysis`
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

    console.log(`[MacroAgent] Using ${currentProviderConfig.provider} for macro analysis`);
    
    const messages: ChatMessage[] = [
      {
        role: "system",
        content: "You are a macro economic analyst providing market-wide analysis. Always respond with valid JSON only, no markdown or additional text.",
      },
      {
        role: "user",
        content: prompt,
      },
    ];

    const result = await generateWithFallback(currentProviderConfig, messages, {
      temperature: 0.3,
      responseFormat: "json"
    });
    
    if (result.usedFallback) {
      console.log(`[MacroAgent] ⚠️ Used fallback: ${result.provider} (${result.model})`);
    }
    
    sanitizedResponse = result.content;
    
    // Strip markdown code fences if present (e.g., ```json ... ```)
    // Handle multiple formats: ```json\n{...}\n```, ```\n{...}\n```, or just {...}
    sanitizedResponse = sanitizedResponse.trim();
    if (sanitizedResponse.startsWith('```')) {
      // Remove opening fence (```json or ```)
      sanitizedResponse = sanitizedResponse.replace(/^```(?:json|JSON)?\s*\n?/, '');
      // Remove closing fence
      sanitizedResponse = sanitizedResponse.replace(/\n?```\s*$/, '');
      sanitizedResponse = sanitizedResponse.trim();
    }
    
    console.log(`[MacroAgent] Parsing JSON response (${sanitizedResponse.length} chars)...`);
    const analysis = JSON.parse(sanitizedResponse);
    
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
      industrySectorAnalysis: industrySectorAnalysis || undefined,
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
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[MacroAgent] Error during analysis:", error);
    
    // If this is a JSON parse error, log the problematic response
    if (errorMessage.includes('JSON') || errorMessage.includes('parse')) {
      console.error("[MacroAgent] JSON parse failed. Check OpenAI response format.");
      // Log a truncated version of the response for debugging (first 500 chars)
      const preview = sanitizedResponse?.substring(0, 500) || 'No response available';
      console.error("[MacroAgent] Response preview:", preview);
    }
    
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
      industrySectorAnalysis: undefined,
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
