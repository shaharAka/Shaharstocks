import { storage } from "./storage";
import { telegramService } from "./telegram";
import { openinsiderService } from "./openinsiderService";
import { finnhubService } from "./finnhubService";
import type { BacktestJob } from "@shared/schema";
import OpenAI from "openai";

// Initialize OpenAI for backtesting analysis
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface DailyPrice {
  date: string;
  close: number;
}

interface HistoricalPriceData {
  ticker: string;
  prices: DailyPrice[];
}

class BacktestService {
  /**
   * Fetch historical daily closing prices for a stock using Alpha Vantage
   * Returns data from start date to end date
   */
  async fetchHistoricalPrices(ticker: string, startDate: Date, endDate: Date): Promise<DailyPrice[]> {
    try {
      // Use Alpha Vantage to fetch historical candles (Premium: 75 calls/min)
      const prices = await finnhubService.getHistoricalCandlesAlphaVantage(ticker, startDate, endDate);
      
      if (prices.length === 0) {
        throw new Error(`No historical data available for ${ticker}`);
      }

      // Alpha Vantage returns in our format: { date: string, close: number }
      return prices;
    } catch (error: any) {
      console.error(`[BacktestService] Error fetching historical prices for ${ticker}:`, error.message);
      throw error;
    }
  }

  /**
   * Build price matrix for a stock: from insider trade date to today
   * Checks database cache first before hitting Alpha Vantage API
   */
  async buildPriceMatrix(ticker: string, insiderTradeDate: string): Promise<DailyPrice[]> {
    // Check if we already have cached price data for this ticker and date
    const cached = await storage.getCachedPriceData(ticker, insiderTradeDate);
    
    if (cached && cached.priceMatrix && cached.priceMatrix.length > 0) {
      console.log(`[BacktestService] Using cached price data for ${ticker} (${cached.priceMatrix.length} days)`);
      return cached.priceMatrix;
    }

    // Not in cache - fetch from Alpha Vantage
    const tradeDate = new Date(insiderTradeDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset to start of day

    console.log(`[BacktestService] Fetching ${ticker} prices from Alpha Vantage (${insiderTradeDate} to ${today.toISOString().split('T')[0]})`);

    return await this.fetchHistoricalPrices(ticker, tradeDate, today);
  }

  /**
   * Find the first date when a trade became viable (met buy criteria)
   * Criteria: market cap > $500M AND insider price >= 15% of market price
   */
  private findFirstViableDate(
    priceMatrix: DailyPrice[], 
    insiderPrice: number, 
    marketCap: number
  ): string | null {
    // Market cap threshold: $500M
    if (marketCap < 500_000_000) {
      return null; // Never viable
    }

    // Find first date where insider price >= 15% of market price
    for (const pricePoint of priceMatrix) {
      const marketPrice = pricePoint.close;
      const priceRatio = insiderPrice / marketPrice;
      
      if (priceRatio >= 0.15) {
        return pricePoint.date;
      }
    }

    return null; // Never met the 15% threshold
  }

  /**
   * Check if job has been cancelled
   */
  private async isJobCancelled(jobId: string): Promise<boolean> {
    const job = await storage.getBacktestJob(jobId);
    return job?.status === "cancelled";
  }

  /**
   * Process a backtest job through all stages
   */
  async processBacktestJob(jobId: string): Promise<void> {
    try {
      const job = await storage.getBacktestJob(jobId);
      if (!job) {
        throw new Error(`Job ${jobId} not found`);
      }

      console.log(`[BacktestJob ${jobId}] Starting job: ${job.name}`);

      // Stage 1: Fetch messages from selected data source
      await storage.updateBacktestJob(jobId, { 
        status: "fetching_messages", 
        progress: 10 
      });
      
      if (await this.isJobCancelled(jobId)) {
        console.log(`[BacktestJob ${jobId}] Job cancelled by user`);
        return;
      }

      // Safely default to telegram for legacy jobs or if undefined
      const dataSource = (job.dataSource as string | null | undefined) || "telegram";
      
      // Validate data source
      if (!["telegram", "openinsider"].includes(dataSource)) {
        throw new Error(`Invalid data source: ${dataSource}. Must be "telegram" or "openinsider"`);
      }
      
      let messages: any[] = [];

      if (dataSource === "telegram") {
        console.log(`[BacktestJob ${jobId}] Fetching ${job.messageCount} Telegram messages...`);
        
        // Get configured Telegram channel
        const telegramConfig = await storage.getTelegramConfig();
        if (!telegramConfig) {
          throw new Error("Telegram not configured");
        }
        
        messages = await telegramService.fetchMessagesForBacktest(
          telegramConfig.channelUsername, 
          job.messageCount
        );
      } else if (dataSource === "openinsider") {
        console.log(`[BacktestJob ${jobId}] Fetching ${job.messageCount} OpenInsider transactions...`);
        
        // Get OpenInsider config to apply filters
        const openinsiderConfig = await storage.getOpeninsiderConfig();
        
        // Build filters from config (same as background job)
        const filters: {
          insiderTitles?: string[];
          minTransactionValue?: number;
          previousDayOnly?: boolean;
        } = {};
        
        if (openinsiderConfig?.insiderTitles && openinsiderConfig.insiderTitles.length > 0) {
          filters.insiderTitles = openinsiderConfig.insiderTitles;
        }
        if (openinsiderConfig?.minTransactionValue) {
          filters.minTransactionValue = openinsiderConfig.minTransactionValue;
        }
        // Note: We don't use previousDayOnly for backtesting as we want historical data
        
        const filterInfo = Object.keys(filters).length > 0 ? ` with filters: ${JSON.stringify(filters)}` : '';
        console.log(`[BacktestJob ${jobId}] Applying OpenInsider filters${filterInfo}`);
        
        messages = await openinsiderService.fetchMessagesForBacktest(
          job.messageCount,
          Object.keys(filters).length > 0 ? filters : undefined
        );
      } else {
        throw new Error(`Unknown data source: ${dataSource}`);
      }
      
      if (!messages || messages.length === 0) {
        throw new Error(`No messages fetched from ${dataSource}`);
      }

      console.log(`[BacktestJob ${jobId}] Fetched ${messages.length} messages from ${dataSource}`);

      if (await this.isJobCancelled(jobId)) {
        console.log(`[BacktestJob ${jobId}] Job cancelled by user`);
        return;
      }

      // Stage 2: Filter purchase candidates
      await storage.updateBacktestJob(jobId, { 
        status: "filtering", 
        progress: 25 
      });

      console.log(`[BacktestJob ${jobId}] Filtering purchase candidates...`);
      const candidates = await this.filterPurchaseCandidates(messages);
      
      if (candidates.length === 0) {
        await storage.updateBacktestJob(jobId, { 
          status: "completed", 
          progress: 100,
          completedAt: new Date(),
          candidateStocks: []
        });
        console.log(`[BacktestJob ${jobId}] No valid candidates found - job completed`);
        return;
      }

      console.log(`[BacktestJob ${jobId}] Found ${candidates.length} valid candidates`);

      await storage.updateBacktestJob(jobId, {
        candidateStocks: candidates.map(c => ({
          ticker: c.ticker,
          insiderBuyDate: c.insiderTradeDate, // Insider's trade date
          insiderPrice: parseFloat(c.insiderPrice),
          marketPrice: parseFloat(c.marketPriceAtInsiderDate || c.insiderPrice),
          marketCap: c.marketCap || "Unknown",
        }))
      });

      // Stage 3: Build price matrices
      await storage.updateBacktestJob(jobId, { 
        status: "building_matrix", 
        progress: 40 
      });

      console.log(`[BacktestJob ${jobId}] Building price matrices for ${candidates.length} stocks...`);
      
      for (let i = 0; i < candidates.length; i++) {
        if (await this.isJobCancelled(jobId)) {
          console.log(`[BacktestJob ${jobId}] Job cancelled by user`);
          return;
        }

        const candidate = candidates[i];
        try {
          // Build price matrix from insider trade date to today
          const priceMatrix = await this.buildPriceMatrix(
            candidate.ticker, 
            candidate.insiderTradeDate // Use insider trade date to get full historical data
          );

          // Find the first viable date (when trade met buy criteria)
          const marketCapValue = candidate.marketCap ? this.parseMarketCap(candidate.marketCap) : 0;
          const insiderPriceNum = parseFloat(candidate.insiderPrice);
          const firstViableDate = this.findFirstViableDate(priceMatrix, insiderPriceNum, marketCapValue);

          if (!firstViableDate) {
            console.log(`[BacktestJob ${jobId}] ${candidate.ticker} never became viable, skipping`);
            continue;
          }

          // Store candidate with firstViableDate
          candidate.firstViableDate = firstViableDate;

          await storage.createBacktestPriceData({
            jobId,
            ticker: candidate.ticker,
            insiderBuyDate: firstViableDate, // Use first viable date as purchase date
            priceMatrix,
          });

          const progress = 40 + Math.floor((i + 1) / candidates.length * 20);
          await storage.updateBacktestJob(jobId, { progress });

          console.log(`[BacktestJob ${jobId}] Built price matrix for ${candidate.ticker} (${priceMatrix.length} days, first viable: ${firstViableDate})`);

          // Rate limiting: Alpha Vantage Premium is 75 calls/minute (0.8s per call)
          if (i < candidates.length - 1) {
            console.log(`[BacktestJob ${jobId}] Waiting 1 second for Alpha Vantage rate limit...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (error: any) {
          console.error(`[BacktestJob ${jobId}] Failed to fetch prices for ${candidate.ticker}:`, error.message);
          // Continue with other stocks
        }
      }

      if (await this.isJobCancelled(jobId)) {
        console.log(`[BacktestJob ${jobId}] Job cancelled by user`);
        return;
      }

      // Stage 4: Generate OpenAI scenarios and calculate P&L
      await storage.updateBacktestJob(jobId, { 
        status: "generating_scenarios", 
        progress: 70 
      });

      console.log(`[BacktestJob ${jobId}] Generating trading scenarios with OpenAI...`);
      await this.generateScenarios(jobId, candidates);

      if (await this.isJobCancelled(jobId)) {
        console.log(`[BacktestJob ${jobId}] Job cancelled by user`);
        return;
      }

      await storage.updateBacktestJob(jobId, { 
        status: "calculating_results", 
        progress: 90 
      });

      console.log(`[BacktestJob ${jobId}] All scenarios calculated successfully`);

      // Complete
      await storage.updateBacktestJob(jobId, { 
        status: "completed", 
        progress: 100,
        completedAt: new Date()
      });

      console.log(`[BacktestJob ${jobId}] Job completed successfully`);
    } catch (error: any) {
      console.error(`[BacktestJob ${jobId}] Job failed:`, error);
      await storage.updateBacktestJob(jobId, {
        status: "failed",
        errorMessage: error.message,
      });
    }
  }

  /**
   * Filter Telegram messages to find valid purchase candidates
   * Same criteria as Purchase page: market cap > $500M, insider price >= 15% of current price
   */
  private async filterPurchaseCandidates(messages: any[]): Promise<any[]> {
    const candidates: any[] = [];

    for (const msg of messages) {
      // Skip if message is missing
      if (!msg || !msg.text) continue;

      // Parse message to extract stock info
      const ticker = this.extractTicker(msg.text);
      if (!ticker) continue;

      const recommendation = this.extractRecommendation(msg.text);
      if (recommendation !== "buy") continue;

      const insiderPrice = this.extractInsiderPrice(msg.text);
      
      if (!insiderPrice) continue;

      // Use Telegram message post date as purchase date (when user could act on it)
      const telegramMessageDate = new Date(msg.date * 1000).toISOString().split('T')[0];
      const insiderTradeDate = this.extractInsiderTradeDate(msg.text); // For reference only

      // Try to get stock from database first
      let stock = await storage.getStock(ticker);
      
      // If not in database, fetch from Finnhub
      if (!stock) {
        try {
          const quote = await finnhubService.getQuote(ticker);
          if (!quote || !quote.currentPrice || quote.currentPrice <= 0) {
            console.log(`[BacktestFilter] No valid quote for ${ticker}, skipping`);
            continue;
          }

          const profile = await finnhubService.getCompanyProfile(ticker);
          const marketCapValue = profile?.marketCap ? profile.marketCap * 1_000_000 : 0;
          
          // Check market cap (must be > $500M)
          if (marketCapValue < 500_000_000) {
            console.log(`[BacktestFilter] ${ticker} market cap too low: $${(marketCapValue / 1_000_000).toFixed(1)}M, skipping`);
            continue;
          }

          // Check insider purchase ratio (insider price should be >= 15% of current price)
          const insiderPriceNum = parseFloat(insiderPrice);
          if (insiderPriceNum < quote.currentPrice * 0.15) {
            console.log(`[BacktestFilter] ${ticker} likely options deal (insider: $${insiderPriceNum} vs market: $${quote.currentPrice}), skipping`);
            continue;
          }

          candidates.push({
            ticker,
            insiderPrice,
            insiderTradeDate,
            telegramMessageDate, // This is the actual purchase date
            marketPriceAtInsiderDate: quote.currentPrice.toString(),
            marketCap: `$${(marketCapValue / 1_000_000).toFixed(1)}M`,
          });
          
          console.log(`[BacktestFilter] ${ticker} is valid candidate (market cap: $${(marketCapValue / 1_000_000).toFixed(1)}M, price: $${quote.currentPrice})`);
        } catch (error: any) {
          console.log(`[BacktestFilter] Failed to fetch ${ticker} info: ${error.message}, skipping`);
          continue;
        }
      } else {
        // Use existing stock data
        const marketCapValue = stock.marketCap ? this.parseMarketCap(stock.marketCap) : 0;
        
        // Check market cap (must be > $500M)
        if (marketCapValue < 500_000_000) {
          console.log(`[BacktestFilter] ${ticker} market cap too low, skipping`);
          continue;
        }

        // Check insider purchase ratio (insider price should be >= 15% of market price)
        const marketPrice = parseFloat(stock.currentPrice);
        const insiderPriceNum = parseFloat(insiderPrice);
        
        if (insiderPriceNum < marketPrice * 0.15) {
          console.log(`[BacktestFilter] ${ticker} likely options deal, skipping`);
          continue;
        }

        candidates.push({
          ticker,
          insiderPrice,
          insiderTradeDate,
          telegramMessageDate, // This is the actual purchase date
          marketPriceAtInsiderDate: stock.currentPrice,
          marketCap: stock.marketCap,
        });
        
        console.log(`[BacktestFilter] ${ticker} is valid candidate (existing in DB)`);
      }
    }

    return candidates;
  }

  private extractTicker(message: string): string | null {
    // Try to match $TICKER format
    let match = message.match(/\$([A-Z]{1,5})\b/);
    if (match) return match[1];

    // Try to match "Sale TICKER" or "Buy TICKER" format
    match = message.match(/(?:Sale|Buy|Purchase)\s+([A-Z]{2,5})\b/i);
    if (match) return match[1];

    return null;
  }

  private extractRecommendation(message: string): string | null {
    const lowerMessage = message.toLowerCase();
    
    // Look for purchase indicators (green circle emoji or "Purchase" keyword)
    if (lowerMessage.includes("🟢") || lowerMessage.includes("purchase")) {
      return "buy";
    }
    
    // Exclude sales (red circle emoji or "Sale" keyword)
    if (lowerMessage.includes("🔴") || lowerMessage.includes("sale")) {
      return null;
    }
    
    // Legacy: also check for "buy" keyword
    if (lowerMessage.match(/\bbuy\b/i)) {
      return "buy";
    }
    
    return null;
  }

  private extractInsiderPrice(message: string): string | null {
    // Match format: price * quantity = total
    // We want the price part (first number)
    const priceMatch = message.match(/([\d,]+\.?\d*)\s*\*\s*[\d,]+/);
    if (priceMatch) {
      return priceMatch[1].replace(/,/g, "");
    }
    
    // Fallback: try to find any price-like number
    const match = message.match(/\$?([\d,]+\.?\d*)\s*(?:per share|\/share)?/i);
    return match ? match[1].replace(/,/g, "") : null;
  }

  private extractInsiderTradeDate(message: string): string {
    // Try DD.MM.YYYY format (most common in Telegram messages)
    const ddmmyyyyMatch = message.match(/(\d{2})\.(\d{2})\.(\d{4})/);
    if (ddmmyyyyMatch) {
      const [, day, month, year] = ddmmyyyyMatch;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    // Try to extract date from message in YYYY-MM-DD format
    const dateMatch = message.match(/(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) {
      return dateMatch[1];
    }
    
    // Try to extract date in MM/DD/YYYY format
    const dateMatch2 = message.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (dateMatch2) {
      const [, month, day, year] = dateMatch2;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    // Default to today
    return new Date().toISOString().split('T')[0];
  }

  private parseMarketCap(marketCapStr: string): number {
    const str = marketCapStr.toUpperCase().replace(/[^0-9.BMK]/g, '');
    const value = parseFloat(str);
    
    if (str.includes('T')) return value * 1_000_000_000_000;
    if (str.includes('B')) return value * 1_000_000_000;
    if (str.includes('M')) return value * 1_000_000;
    if (str.includes('K')) return value * 1_000;
    
    return value;
  }

  /**
   * Generate 100 trading rule scenarios using OpenAI
   */
  async generateScenarios(jobId: string, candidates: any[]): Promise<void> {
    console.log(`[BacktestJob ${jobId}] Generating AI trading scenarios...`);

    // Prepare market data summary for OpenAI
    const marketSummary = candidates.map(c => ({
      ticker: c.ticker,
      marketCap: c.marketCap,
      insiderBuyDate: c.insiderTradeDate,
    })).slice(0, 5); // Limit to 5 examples for the prompt

    const prompt = `You are a professional stock trading strategist. I have analyzed ${candidates.length} insider trading events where insiders purchased shares.

Sample stocks:
${marketSummary.map(s => `- ${s.ticker} (Market Cap: ${s.marketCap}, Insider Buy: ${s.insiderBuyDate})`).join('\n')}

Generate 100 different trading rule scenarios using rule-based conditions. Each scenario defines WHEN to sell after buying at market price.

CRITICAL REQUIREMENTS - EVERY scenario MUST have:
1. At least ONE take-profit condition (price going UP - positive percentage)
2. At least ONE stop-loss condition (price going DOWN - negative percentage) OR a time-based exit
3. Conditions use OR logic (sell when ANY condition is met)

Available metrics for sell conditions:
- "price_change_from_buy_percent": % change from buy price (e.g., -5 for stop-loss, +15 for take-profit)
- "days_held": number of days since purchase (use as max holding period)

Available operators: ">", "<", ">=", "<=", "=="

Each scenario must specify:
1. name: A descriptive name for the strategy
2. description: Brief explanation of the strategy logic
3. sellConditions: Array of conditions that trigger a sell (MUST include both take-profit AND stop-loss or time exit)
4. sellAction: { "type": "sell_all" } (always sell entire position when conditions are met)

The scenarios should explore different combinations:
- Conservative: Small gains (5-10%), tight stops (-3% to -5%), short timeframes (7-14 days)
- Moderate: Medium gains (10-20%), moderate stops (-5% to -8%), medium timeframes (14-30 days)
- Aggressive: Large gains (20-50%), wider stops (-10% to -15%), longer timeframes (30-60 days)
- Hybrid: Mix of quick profits with trailing stops, momentum plays, etc.

Return ONLY valid JSON in this exact format:
{
  "scenarios": [
    {
      "name": "Quick 10% Profit or 5% Stop",
      "description": "Conservative strategy targeting quick 10% gains with tight 5% stop-loss protection",
      "sellConditions": [
        {
          "metric": "price_change_from_buy_percent",
          "operator": ">=",
          "value": 10,
          "logic": "OR"
        },
        {
          "metric": "price_change_from_buy_percent",
          "operator": "<=",
          "value": -5,
          "logic": "OR"
        },
        {
          "metric": "days_held",
          "operator": ">=",
          "value": 14
        }
      ],
      "sellAction": {
        "type": "sell_all"
      }
    }
  ]
}

Generate 100 diverse scenarios exploring all ranges of risk/reward profiles.`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a stock trading strategist. Return only valid JSON with 100 diverse trading scenarios." },
          { role: "user", content: prompt }
        ],
        temperature: 0.9, // Higher creativity for diverse scenarios
        max_tokens: 16000, // Increased for 100 scenarios
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No response from OpenAI");
      }

      // Strip markdown code blocks if present (```json ... ```)
      let cleanContent = content.trim();
      
      // More aggressive markdown removal
      // Remove opening code fence: ```json, ```JSON, or just ```
      cleanContent = cleanContent.replace(/^```(?:json|JSON)?\s*\n?/i, '');
      // Remove closing code fence: ```
      cleanContent = cleanContent.replace(/\n?\s*```\s*$/i, '');
      cleanContent = cleanContent.trim();
      
      // Log first 200 chars for debugging
      console.log(`[BacktestJob ${jobId}] OpenAI response preview: ${cleanContent.substring(0, 200)}...`);

      // Parse JSON response
      let result;
      try {
        result = JSON.parse(cleanContent);
      } catch (parseError) {
        console.error(`[BacktestJob ${jobId}] JSON parse error. First 500 chars of content:`, cleanContent.substring(0, 500));
        throw parseError;
      }
      let scenarios = result.scenarios || [];

      if (scenarios.length === 0) {
        throw new Error("No scenarios generated");
      }

      // Validate and filter scenarios to ensure they meet requirements
      scenarios = scenarios.filter((scenario: any, index: number) => {
        const conditions = scenario.sellConditions || [];
        const hasTakeProfit = conditions.some((c: any) => 
          c.metric === "price_change_from_buy_percent" && 
          c.value > 0
        );
        const hasStopLossOrTimeExit = conditions.some((c: any) => 
          (c.metric === "price_change_from_buy_percent" && c.value < 0) ||
          c.metric === "days_held"
        );

        const isValid = hasTakeProfit && hasStopLossOrTimeExit;
        if (!isValid) {
          console.log(`[BacktestJob ${jobId}] Skipping invalid scenario ${index + 1}: ${scenario.name} (missing take-profit or stop-loss)`);
        }
        return isValid;
      });

      console.log(`[BacktestJob ${jobId}] Generated ${scenarios.length} valid scenarios (filtered from ${result.scenarios?.length || 0})`);

      // Store all scenarios and calculate P&L
      for (let i = 0; i < scenarios.length; i++) {
        // Check if job was cancelled
        if (await this.isJobCancelled(jobId)) {
          console.log(`[BacktestJob ${jobId}] Job cancelled by user during scenario generation`);
          return;
        }

        const scenario = scenarios[i];
        
        const pnlResult = await this.calculateScenarioPnL(jobId, scenario, candidates);

        await storage.createBacktestScenario({
          jobId,
          scenarioNumber: i + 1,
          name: scenario.name || `Scenario ${i + 1}`,
          description: scenario.description || "",
          sellConditions: scenario.sellConditions || [],
          sellAction: scenario.sellAction || { type: "sell_all" },
          totalProfitLoss: pnlResult.totalPnL.toFixed(2),
          totalProfitLossPercent: pnlResult.totalPnLPercent.toFixed(2),
          winRate: pnlResult.winRate.toFixed(2),
          numberOfTrades: pnlResult.numberOfTrades,
          tradeDetails: pnlResult.tradeDetails,
        });

        console.log(`[BacktestJob ${jobId}] Scenario ${i + 1}/${scenarios.length}: ${scenario.name} - P&L: $${pnlResult.totalPnL.toFixed(2)}`);

        // Update progress (60-90% range for scenario calculation)
        const progress = 60 + Math.floor((i + 1) / scenarios.length * 30);
        await storage.updateBacktestJob(jobId, { progress });
      }
    } catch (error: any) {
      console.error(`[BacktestJob ${jobId}] OpenAI error:`, error.message);
      throw error;
    }
  }

  /**
   * Calculate P&L for a given trading scenario using rule-based conditions
   */
  async calculateScenarioPnL(jobId: string, scenario: any, candidates: any[]): Promise<{
    totalPnL: number;
    totalPnLPercent: number;
    winRate: number;
    numberOfTrades: number;
    tradeDetails: any[];
  }> {
    const trades: any[] = [];
    let totalInvested = 0;
    let totalReturned = 0;
    let wins = 0;

    // Get price data for all candidates
    const priceDataList = await storage.getBacktestPriceData(jobId);
    const sellConditions = scenario.sellConditions || [];

    // Default to 14 days if no days_held condition is specified
    const maxDaysCondition = sellConditions.find((c: any) => c.metric === "days_held");
    const maxDays = maxDaysCondition ? maxDaysCondition.value : 14;

    for (const candidate of candidates) {
      const priceData = priceDataList.find(pd => pd.ticker === candidate.ticker);
      if (!priceData || !priceData.priceMatrix || priceData.priceMatrix.length === 0) {
        continue; // Skip if no price data
      }

      // Use Telegram message date (when user could actually buy), not insider trade date
      const buyDate = candidate.telegramMessageDate;

      // Find buy date in price matrix, or snap to nearest prior trading day
      let buyIndex = priceData.priceMatrix.findIndex((p: any) => p.date === buyDate);
      
      // If exact date not found, snap to nearest prior trading day
      if (buyIndex === -1) {
        const buyDateTime = new Date(buyDate).getTime();
        // Find the closest date before or on the buy date
        for (let i = priceData.priceMatrix.length - 1; i >= 0; i--) {
          const priceDateTime = new Date(priceData.priceMatrix[i].date).getTime();
          if (priceDateTime <= buyDateTime) {
            buyIndex = i;
            break;
          }
        }
      }
      
      if (buyIndex === -1) continue; // Still no match, skip this candidate

      // Use the actual buy date from price matrix (may be snapped to prior trading day)
      const actualBuyDate = priceData.priceMatrix[buyIndex].date;
      const buyPrice = priceData.priceMatrix[buyIndex].close;

      // Simulate holding the position
      let sellDate = actualBuyDate;
      let sellPrice = buyPrice;
      let sellReason = "No sell condition met - held to end of data";
      let conditionMet = false;

      // Iterate through each day after buy
      for (let dayOffset = 0; dayOffset < priceData.priceMatrix.length - buyIndex; dayOffset++) {
        const currentIndex = buyIndex + dayOffset;
        const currentPrice = priceData.priceMatrix[currentIndex].close;
        const daysHeld = dayOffset;
        
        // Calculate metrics
        const priceChangeFromBuyPercent = ((currentPrice - buyPrice) / buyPrice) * 100;
        
        // Evaluate sell conditions (OR logic)
        for (const condition of sellConditions) {
          let conditionValue: number;
          
          // Get the metric value
          if (condition.metric === "price_change_from_buy_percent") {
            conditionValue = priceChangeFromBuyPercent;
          } else if (condition.metric === "days_held") {
            conditionValue = daysHeld;
          } else {
            continue; // Unknown metric
          }
          
          // Evaluate condition
          const isMet = this.evaluateCondition(conditionValue, condition.operator, condition.value);
          
          if (isMet) {
            sellDate = priceData.priceMatrix[currentIndex].date;
            sellPrice = currentPrice;
            sellReason = this.formatConditionReason(condition, conditionValue);
            conditionMet = true;
            break; // Exit condition loop (OR logic)
          }
        }
        
        if (conditionMet) {
          break; // Exit day loop
        }

        // Safety: don't go beyond max days (whichever is larger: explicit days_held or default 14)
        if (daysHeld >= Math.max(maxDays, 14)) {
          sellDate = priceData.priceMatrix[currentIndex].date;
          sellPrice = currentPrice;
          sellReason = `Held for ${daysHeld} days (max)`;
          break;
        }
      }

      const profitLoss = sellPrice - buyPrice;
      const profitLossPercent = ((sellPrice - buyPrice) / buyPrice) * 100;

      totalInvested += buyPrice;
      totalReturned += sellPrice;
      if (profitLoss > 0) wins++;

      trades.push({
        ticker: candidate.ticker,
        buyDate: actualBuyDate,
        buyPrice,
        sellDate,
        sellPrice,
        profitLoss,
        profitLossPercent,
        reason: sellReason,
      });
    }

    const totalPnL = totalReturned - totalInvested;
    const totalPnLPercent = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;
    const winRate = trades.length > 0 ? (wins / trades.length) * 100 : 0;

    return {
      totalPnL,
      totalPnLPercent,
      winRate,
      numberOfTrades: trades.length,
      tradeDetails: trades,
    };
  }

  /**
   * Evaluate a condition against a value
   */
  private evaluateCondition(actualValue: number, operator: string, targetValue: number): boolean {
    switch (operator) {
      case ">": return actualValue > targetValue;
      case "<": return actualValue < targetValue;
      case ">=": return actualValue >= targetValue;
      case "<=": return actualValue <= targetValue;
      case "==": return actualValue === targetValue;
      default: return false;
    }
  }

  /**
   * Format a condition into a human-readable reason
   */
  private formatConditionReason(condition: any, actualValue: number): string {
    const metric = condition.metric === "price_change_from_buy_percent" 
      ? "price change" 
      : condition.metric.replace(/_/g, " ");
    
    return `${metric} ${condition.operator} ${condition.value} (actual: ${actualValue.toFixed(2)})`;
  }
}

export const backtestService = new BacktestService();
