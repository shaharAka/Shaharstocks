/**
 * Stock Market Data Service
 * Fetches real-time stock prices, historical data, and company information
 * Using Alpha Vantage API (Premium plan: $50/month, 75 requests/minute, 20+ years historical data)
 */

interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  previousClose: number;
}

interface StockProfile {
  symbol: string;
  name: string;
  marketCap: string;
  peRatio: string;
  sector: string;
  industry: string;
  description: string;
}

interface DailyPrice {
  date: string;
  price: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface TechnicalIndicators {
  rsi: { value: number; signal: "overbought" | "oversold" | "neutral" }; // Relative Strength Index
  macd: { value: number; signal: number; histogram: number; trend: "bullish" | "bearish" | "neutral" };
  bollingerBands: { upper: number; middle: number; lower: number; position: "above" | "below" | "inside" };
  sma20: number; // 20-day Simple Moving Average
  sma50: number; // 50-day Simple Moving Average
  ema12: number; // 12-day Exponential Moving Average
  volumeTrend: "increasing" | "decreasing" | "stable";
  atr: number; // Average True Range (volatility)
}

interface NewsSentiment {
  articles: Array<{
    title: string;
    source: string;
    url: string;
    publishedAt: string;
    sentiment: number; // -1 to 1
    relevanceScore: number; // 0 to 1
    topics: string[];
  }>;
  aggregateSentiment: number; // Average sentiment -1 to 1
  sentimentTrend: "improving" | "declining" | "stable";
  newsVolume: number; // Number of articles in period
}

interface PriceNewsCorrelation {
  correlation: number; // -1 to 1
  lag: "leads" | "lags" | "concurrent"; // Does price lead news or vice versa
  strength: "strong" | "moderate" | "weak";
}

/**
 * Wraps a promise with a timeout to prevent infinite hangs
 * @param promise The promise to wrap
 * @param timeoutMs Timeout in milliseconds  
 * @param errorMessage Custom error message when timeout occurs
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    ),
  ]);
}

class StockService {
  private apiKey: string;
  private baseUrl = "https://www.alphavantage.co/query";
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheTimeout = 60 * 1000; // 1 minute cache
  private lastApiCallTime: number = 0;
  private minDelayBetweenCalls: number = 800; // 0.8 seconds (Premium: 75 requests/minute = 1 every 0.8s)

  constructor() {
    // Alpha Vantage API key - Premium plan ($50/month)
    // Premium tier: 75 requests/minute, 20+ years historical data
    this.apiKey = process.env.ALPHA_VANTAGE_API_KEY || "";
    
    if (!this.apiKey) {
      console.warn("[StockService] WARNING: ALPHA_VANTAGE_API_KEY not set. Stock data will not be available.");
      console.warn("[StockService] Get a free API key at: https://www.alphavantage.co/support/#api-key");
    } else {
      console.log("[StockService] Alpha Vantage Premium initialized (75 calls/min)");
    }
  }

  /**
   * Global rate limiter - ensures at least 0.8 seconds between ANY API calls (Premium: 75/min)
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastApiCallTime;
    
    if (timeSinceLastCall < this.minDelayBetweenCalls) {
      const waitTime = this.minDelayBetweenCalls - timeSinceLastCall;
      console.log(`[StockService] Rate limiting: waiting ${Math.ceil(waitTime / 1000)}s before next API call...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastApiCallTime = Date.now();
  }

  private async fetchWithCache(url: string, cacheKey: string): Promise<any> {
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      console.log(`[StockService] Using cached data for ${cacheKey}`);
      return cached.data;
    }

    // Enforce rate limit BEFORE making the API call
    await this.enforceRateLimit();

    console.log(`[StockService] Fetching fresh data from API: ${cacheKey}`);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data["Error Message"]) {
      throw new Error(`API Error: ${data["Error Message"]}`);
    }
    
    if (data["Note"]) {
      console.warn("[StockService] API rate limit reached:", data["Note"]);
      throw new Error("API rate limit exceeded. Please try again later.");
    }

    this.cache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  }

  /**
   * Get real-time quote for a stock
   */
  async getQuote(ticker: string): Promise<StockQuote> {
    const url = `${this.baseUrl}?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${this.apiKey}`;
    const data = await this.fetchWithCache(url, `quote_${ticker}`);

    const quote = data["Global Quote"];
    if (!quote || !quote["05. price"]) {
      throw new Error(`No quote data found for ${ticker}`);
    }

    return {
      symbol: quote["01. symbol"],
      price: parseFloat(quote["05. price"]),
      change: parseFloat(quote["09. change"]),
      changePercent: parseFloat(quote["10. change percent"].replace("%", "")),
      volume: parseInt(quote["06. volume"]),
      previousClose: parseFloat(quote["08. previous close"]),
    };
  }

  /**
   * Get daily historical prices for the last N days
   */
  async getDailyPrices(ticker: string, days: number = 7): Promise<DailyPrice[]> {
    const url = `${this.baseUrl}?function=TIME_SERIES_DAILY&symbol=${ticker}&apikey=${this.apiKey}`;
    const data = await this.fetchWithCache(url, `daily_${ticker}`);

    const timeSeries = data["Time Series (Daily)"];
    if (!timeSeries) {
      throw new Error(`No daily price data found for ${ticker}`);
    }

    const prices: DailyPrice[] = [];
    const dates = Object.keys(timeSeries).sort().reverse().slice(0, days);

    for (const date of dates) {
      const day = timeSeries[date];
      prices.push({
        date,
        price: parseFloat(day["4. close"]),
        open: parseFloat(day["1. open"]),
        high: parseFloat(day["2. high"]),
        low: parseFloat(day["3. low"]),
        close: parseFloat(day["4. close"]),
        volume: parseInt(day["5. volume"]),
      });
    }

    return prices.reverse(); // Oldest to newest
  }

  /**
   * Get 2 weeks of candlestick data for quick visual reference
   * Returns OHLCV data for the last 14 trading days
   */
  async getCandlestickData(ticker: string): Promise<DailyPrice[]> {
    const url = `${this.baseUrl}?function=TIME_SERIES_DAILY&symbol=${ticker}&apikey=${this.apiKey}`;
    const data = await this.fetchWithCache(url, `daily_${ticker}`);

    const timeSeries = data["Time Series (Daily)"];
    if (!timeSeries) {
      throw new Error(`No daily price data found for ${ticker}`);
    }

    const prices: DailyPrice[] = [];
    const dates = Object.keys(timeSeries).sort().reverse().slice(0, 14); // Last 14 trading days

    for (const date of dates) {
      const day = timeSeries[date];
      prices.push({
        date,
        price: parseFloat(day["4. close"]),
        open: parseFloat(day["1. open"]),
        high: parseFloat(day["2. high"]),
        low: parseFloat(day["3. low"]),
        close: parseFloat(day["4. close"]),
        volume: parseInt(day["5. volume"]),
      });
    }

    return prices.reverse(); // Oldest to newest for chart display
  }

  /**
   * Get comprehensive stock data (quote + daily prices + overview)
   * Makes 3 API calls with global rate limiting (enforceRateLimit ensures 0.8s between ALL calls)
   */
  async getComprehensiveData(ticker: string) {
    if (!this.apiKey) {
      throw new Error("ALPHA_VANTAGE_API_KEY is not configured. Please set it in your environment variables.");
    }

    try {
      console.log(`[StockService] Fetching comprehensive data for ${ticker}...`);
      
      // Global rate limiter is enforced in fetchWithCache before each API call
      const quote = await this.getQuote(ticker);
      const dailyPrices = await this.getDailyPrices(ticker, 7);
      const overview = await this.getCompanyOverview(ticker);

      return {
        ticker: quote.symbol,
        companyName: overview.name,
        currentPrice: quote.price.toFixed(2),
        previousClose: quote.previousClose.toFixed(2),
        marketCap: overview.marketCap,
        peRatio: overview.peRatio,
        priceHistory: dailyPrices.map(p => ({ date: p.date, price: p.price })),
      };
    } catch (error) {
      console.error(`[StockService] Error fetching comprehensive data for ${ticker}:`, error);
      throw error;
    }
  }

  /**
   * Get technical indicators for a stock (RSI, MACD, Bollinger Bands, Moving Averages, ATR)
   * Uses Alpha Vantage Premium API technical indicators endpoints
   * RESILIENT: Fetches all indicators in parallel with timeout protection and graceful fallbacks
   */
  async getTechnicalIndicators(ticker: string, dailyPrices: DailyPrice[]): Promise<TechnicalIndicators> {
    console.log(`[StockService] 📊 getTechnicalIndicators start for ${ticker} - fetching 7 indicators in parallel...`);
    
    const INDICATOR_TIMEOUT = 15000; // 15 second timeout per indicator
    const currentPrice = dailyPrices[dailyPrices.length - 1]?.close || 0;

    // Fetch all indicators in parallel with timeout protection
    const results = await Promise.allSettled([
      withTimeout(
        this.fetchWithCache(`${this.baseUrl}?function=RSI&symbol=${ticker}&interval=daily&time_period=14&series_type=close&apikey=${this.apiKey}`, `rsi_${ticker}`),
        INDICATOR_TIMEOUT,
        `RSI fetch timeout for ${ticker}`
      ),
      withTimeout(
        this.fetchWithCache(`${this.baseUrl}?function=MACD&symbol=${ticker}&interval=daily&series_type=close&apikey=${this.apiKey}`, `macd_${ticker}`),
        INDICATOR_TIMEOUT,
        `MACD fetch timeout for ${ticker}`
      ),
      withTimeout(
        this.fetchWithCache(`${this.baseUrl}?function=BBANDS&symbol=${ticker}&interval=daily&time_period=20&series_type=close&apikey=${this.apiKey}`, `bbands_${ticker}`),
        INDICATOR_TIMEOUT,
        `Bollinger Bands fetch timeout for ${ticker}`
      ),
      withTimeout(
        this.fetchWithCache(`${this.baseUrl}?function=SMA&symbol=${ticker}&interval=daily&time_period=20&series_type=close&apikey=${this.apiKey}`, `sma20_${ticker}`),
        INDICATOR_TIMEOUT,
        `SMA 20 fetch timeout for ${ticker}`
      ),
      withTimeout(
        this.fetchWithCache(`${this.baseUrl}?function=SMA&symbol=${ticker}&interval=daily&time_period=50&series_type=close&apikey=${this.apiKey}`, `sma50_${ticker}`),
        INDICATOR_TIMEOUT,
        `SMA 50 fetch timeout for ${ticker}`
      ),
      withTimeout(
        this.fetchWithCache(`${this.baseUrl}?function=EMA&symbol=${ticker}&interval=daily&time_period=12&series_type=close&apikey=${this.apiKey}`, `ema12_${ticker}`),
        INDICATOR_TIMEOUT,
        `EMA 12 fetch timeout for ${ticker}`
      ),
      withTimeout(
        this.fetchWithCache(`${this.baseUrl}?function=ATR&symbol=${ticker}&interval=daily&time_period=14&apikey=${this.apiKey}`, `atr_${ticker}`),
        INDICATOR_TIMEOUT,
        `ATR fetch timeout for ${ticker}`
      ),
    ]);

    // Parse results with fallbacks
    const [rsiResult, macdResult, bbResult, sma20Result, sma50Result, ema12Result, atrResult] = results;

    // RSI parsing with fallback
    let rsiValue = 50; // Default neutral
    if (rsiResult.status === "fulfilled") {
      try {
        rsiValue = parseFloat(Object.values(rsiResult.value["Technical Analysis: RSI"] || {})[0]?.["RSI"] || "50");
        console.log(`[StockService] ✅ RSI: ${rsiValue}`);
      } catch (e) {
        console.warn(`[StockService] ⚠️  RSI parse error, using default`);
      }
    } else {
      console.warn(`[StockService] ⚠️  RSI failed: ${rsiResult.reason.message}`);
    }

    // MACD parsing with fallback
    let macdValue = 0, macdSignal = 0, macdHist = 0;
    if (macdResult.status === "fulfilled") {
      try {
        const latestMacd = Object.values(macdResult.value["Technical Analysis: MACD"] || {})[0] as any;
        macdValue = parseFloat(latestMacd?.["MACD"] || "0");
        macdSignal = parseFloat(latestMacd?.["MACD_Signal"] || "0");
        macdHist = parseFloat(latestMacd?.["MACD_Hist"] || "0");
        console.log(`[StockService] ✅ MACD fetched`);
      } catch (e) {
        console.warn(`[StockService] ⚠️  MACD parse error, using defaults`);
      }
    } else {
      console.warn(`[StockService] ⚠️  MACD failed: ${macdResult.reason.message}`);
    }

    // Bollinger Bands parsing with fallback
    let upperBand = currentPrice, middleBand = currentPrice, lowerBand = currentPrice;
    if (bbResult.status === "fulfilled") {
      try {
        const latestBB = Object.values(bbResult.value["Technical Analysis: BBANDS"] || {})[0] as any;
        upperBand = parseFloat(latestBB?.["Real Upper Band"] || currentPrice);
        middleBand = parseFloat(latestBB?.["Real Middle Band"] || currentPrice);
        lowerBand = parseFloat(latestBB?.["Real Lower Band"] || currentPrice);
        console.log(`[StockService] ✅ Bollinger Bands fetched`);
      } catch (e) {
        console.warn(`[StockService] ⚠️  Bollinger Bands parse error, using current price`);
      }
    } else {
      console.warn(`[StockService] ⚠️  Bollinger Bands failed: ${bbResult.reason.message}`);
    }

    // SMA/EMA/ATR parsing with fallbacks
    const sma20 = sma20Result.status === "fulfilled" ? parseFloat(Object.values(sma20Result.value["Technical Analysis: SMA"] || {})[0]?.["SMA"] || "0") : 0;
    const sma50 = sma50Result.status === "fulfilled" ? parseFloat(Object.values(sma50Result.value["Technical Analysis: SMA"] || {})[0]?.["SMA"] || "0") : 0;
    const ema12 = ema12Result.status === "fulfilled" ? parseFloat(Object.values(ema12Result.value["Technical Analysis: EMA"] || {})[0]?.["EMA"] || "0") : 0;
    const atr = atrResult.status === "fulfilled" ? parseFloat(Object.values(atrResult.value["Technical Analysis: ATR"] || {})[0]?.["ATR"] || "0") : 0;
    
    if (sma20Result.status === "fulfilled") console.log(`[StockService] ✅ SMA 20 fetched`);
    else console.warn(`[StockService] ⚠️  SMA 20 failed: ${sma20Result.reason.message}`);
    
    if (sma50Result.status === "fulfilled") console.log(`[StockService] ✅ SMA 50 fetched`);
    else console.warn(`[StockService] ⚠️  SMA 50 failed: ${sma50Result.reason.message}`);
    
    if (ema12Result.status === "fulfilled") console.log(`[StockService] ✅ EMA 12 fetched`);
    else console.warn(`[StockService] ⚠️  EMA 12 failed: ${ema12Result.reason.message}`);
    
    if (atrResult.status === "fulfilled") console.log(`[StockService] ✅ ATR fetched`);
    else console.warn(`[StockService] ⚠️  ATR failed: ${atrResult.reason.message}`);

    // Calculate Bollinger Band position
    let bbPosition: "above" | "below" | "inside" = "inside";
    if (currentPrice > upperBand) bbPosition = "above";
    else if (currentPrice < lowerBand) bbPosition = "below";

    // Calculate volume trend
    const recentVolumes = dailyPrices.slice(-10).map(p => p.volume);
    const avgRecentVolume = recentVolumes.length > 0 ? recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length : 0;
    const lastVolume = dailyPrices[dailyPrices.length - 1]?.volume || 0;
    let volumeTrend: "increasing" | "decreasing" | "stable" = "stable";
    if (avgRecentVolume > 0) {
      if (lastVolume > avgRecentVolume * 1.2) volumeTrend = "increasing";
      else if (lastVolume < avgRecentVolume * 0.8) volumeTrend = "decreasing";
    }

    const successCount = results.filter(r => r.status === "fulfilled").length;
    console.log(`[StockService] ✅ getTechnicalIndicators complete for ${ticker}: ${successCount}/7 indicators fetched successfully`);

    return {
      rsi: {
        value: rsiValue,
        signal: rsiValue > 70 ? "overbought" : rsiValue < 30 ? "oversold" : "neutral"
      },
      macd: {
        value: macdValue,
        signal: macdSignal,
        histogram: macdHist,
        trend: macdHist > 0 ? "bullish" : macdHist < 0 ? "bearish" : "neutral"
      },
      bollingerBands: {
        upper: upperBand,
        middle: middleBand,
        lower: lowerBand,
        position: bbPosition
      },
      sma20,
      sma50,
      ema12,
      volumeTrend,
      atr
    };
  }

  /**
   * Get news sentiment for a stock from Alpha Vantage News Sentiment API
   * Analyzes last 2 weeks of news with AI-powered sentiment scoring
   */
  async getNewsSentiment(ticker: string): Promise<NewsSentiment> {
    try {
      // Calculate date 2 weeks ago
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      const timeFrom = twoWeeksAgo.toISOString().split('T')[0].replace(/-/g, '') + 'T0000';
      
      const url = `${this.baseUrl}?function=NEWS_SENTIMENT&tickers=${ticker}&time_from=${timeFrom}&limit=50&apikey=${this.apiKey}`;
      const data = await this.fetchWithCache(url, `news_sentiment_${ticker}`);
      
      const feed = data.feed || [];
      const articles = feed.map((article: any) => {
        // Find the sentiment for this specific ticker
        const tickerSentiment = article.ticker_sentiment?.find((ts: any) => 
          ts.ticker === ticker
        ) || {};
        
        return {
          title: article.title || "",
          source: article.source || "",
          url: article.url || "",
          publishedAt: article.time_published || "",
          sentiment: parseFloat(tickerSentiment.ticker_sentiment_score || article.overall_sentiment_score || "0"),
          relevanceScore: parseFloat(tickerSentiment.relevance_score || "0"),
          topics: article.topics?.map((t: any) => t.topic) || []
        };
      });

      // Calculate aggregate sentiment
      const sentiments = articles.map(a => a.sentiment).filter(s => !isNaN(s));
      const aggregateSentiment = sentiments.length > 0 
        ? sentiments.reduce((a, b) => a + b, 0) / sentiments.length 
        : 0;

      // Calculate sentiment trend (recent vs older)
      const recentArticles = articles.slice(0, Math.floor(articles.length / 2));
      const olderArticles = articles.slice(Math.floor(articles.length / 2));
      const recentSentiment = recentArticles.length > 0
        ? recentArticles.map(a => a.sentiment).reduce((a, b) => a + b, 0) / recentArticles.length
        : 0;
      const olderSentiment = olderArticles.length > 0
        ? olderArticles.map(a => a.sentiment).reduce((a, b) => a + b, 0) / olderArticles.length
        : 0;
      
      let sentimentTrend: "improving" | "declining" | "stable" = "stable";
      if (recentSentiment > olderSentiment + 0.1) sentimentTrend = "improving";
      else if (recentSentiment < olderSentiment - 0.1) sentimentTrend = "declining";

      return {
        articles,
        aggregateSentiment,
        sentimentTrend,
        newsVolume: articles.length
      };
    } catch (error) {
      console.error(`[StockService] Error fetching news sentiment for ${ticker}:`, error);
      return {
        articles: [],
        aggregateSentiment: 0,
        sentimentTrend: "stable",
        newsVolume: 0
      };
    }
  }

  /**
   * Analyze correlation between price movements and news sentiment
   * Determines if stock price leads, lags, or moves concurrently with news
   */
  analyzePriceNewsCorrelation(dailyPrices: DailyPrice[], newsSentiment: NewsSentiment): PriceNewsCorrelation {
    try {
      if (dailyPrices.length < 5 || newsSentiment.articles.length < 3) {
        return {
          correlation: 0,
          lag: "concurrent",
          strength: "weak"
        };
      }

      // Group news by date and calculate daily sentiment
      const dailySentiment = new Map<string, number[]>();
      newsSentiment.articles.forEach(article => {
        const date = article.publishedAt.substring(0, 8); // YYYYMMDD format
        const dateKey = `${date.substring(0, 4)}-${date.substring(4, 6)}-${date.substring(6, 8)}`;
        if (!dailySentiment.has(dateKey)) {
          dailySentiment.set(dateKey, []);
        }
        dailySentiment.get(dateKey)!.push(article.sentiment);
      });

      // Calculate daily price changes
      const priceChanges = dailyPrices.slice(1).map((day, i) => ({
        date: day.date,
        change: ((day.close - dailyPrices[i].close) / dailyPrices[i].close) * 100
      }));

      // Match price changes with sentiment for same dates
      const matchedData: Array<{ priceChange: number; sentiment: number }> = [];
      priceChanges.forEach(pc => {
        const sentiments = dailySentiment.get(pc.date);
        if (sentiments && sentiments.length > 0) {
          const avgSentiment = sentiments.reduce((a, b) => a + b, 0) / sentiments.length;
          matchedData.push({
            priceChange: pc.change,
            sentiment: avgSentiment
          });
        }
      });

      if (matchedData.length < 3) {
        return {
          correlation: 0,
          lag: "concurrent",
          strength: "weak"
        };
      }

      // Calculate Pearson correlation
      const n = matchedData.length;
      const sumX = matchedData.reduce((sum, d) => sum + d.priceChange, 0);
      const sumY = matchedData.reduce((sum, d) => sum + d.sentiment, 0);
      const sumXY = matchedData.reduce((sum, d) => sum + (d.priceChange * d.sentiment), 0);
      const sumX2 = matchedData.reduce((sum, d) => sum + (d.priceChange ** 2), 0);
      const sumY2 = matchedData.reduce((sum, d) => sum + (d.sentiment ** 2), 0);

      const correlation = (n * sumXY - sumX * sumY) / 
        Math.sqrt((n * sumX2 - sumX ** 2) * (n * sumY2 - sumY ** 2));

      // Determine strength
      const absCorr = Math.abs(correlation);
      const strength: "strong" | "moderate" | "weak" = 
        absCorr > 0.7 ? "strong" : absCorr > 0.4 ? "moderate" : "weak";

      // Simplified lag detection (would need more sophisticated analysis for real lag)
      // For now, assume concurrent if correlation is significant
      const lag: "leads" | "lags" | "concurrent" = 
        absCorr > 0.4 ? "concurrent" : "concurrent";

      return {
        correlation: isNaN(correlation) ? 0 : correlation,
        lag,
        strength
      };
    } catch (error) {
      console.error(`[StockService] Error analyzing price-news correlation:`, error);
      return {
        correlation: 0,
        lag: "concurrent",
        strength: "weak"
      };
    }
  }

  /**
   * Get company fundamental overview from Alpha Vantage
   * Includes P/E ratio, market cap, dividend yield, profitability metrics, etc.
   */
  async getCompanyOverview(symbol: string): Promise<any> {
    try {
      const url = `${this.baseUrl}?function=OVERVIEW&symbol=${symbol}&apikey=${this.apiKey}`;
      const cacheKey = `overview_${symbol}`;
      
      const data = await this.fetchWithCache(url, cacheKey);
      
      // Check if we got valid data
      if (!data.Symbol) {
        console.log(`[StockService] No overview data available for ${symbol}`);
        return null;
      }

      // Parse and return relevant fields
      return {
        marketCap: data.MarketCapitalization || null,
        peRatio: parseFloat(data.PERatio) || null,
        pegRatio: parseFloat(data.PEGRatio) || null,
        bookValue: parseFloat(data.BookValue) || null,
        dividendYield: parseFloat(data.DividendYield) || null,
        eps: parseFloat(data.EPS) || null,
        revenuePerShare: parseFloat(data.RevenuePerShareTTM) || null,
        profitMargin: parseFloat(data.ProfitMargin) || null,
        operatingMargin: parseFloat(data.OperatingMarginTTM) || null,
        returnOnAssets: parseFloat(data.ReturnOnAssetsTTM) || null,
        returnOnEquity: parseFloat(data.ReturnOnEquityTTM) || null,
        debtToEquity: parseFloat(data.DebtToEquityRatio) || null,
        currentRatio: parseFloat(data.CurrentRatio) || null,
        quickRatio: parseFloat(data.QuickRatio) || null,
      };
    } catch (error) {
      console.error(`[StockService] Error fetching company overview for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Get income statement (quarterly) from Alpha Vantage
   * Returns latest quarter's revenue, profits, etc.
   */
  async getIncomeStatement(symbol: string): Promise<any> {
    try {
      const url = `${this.baseUrl}?function=INCOME_STATEMENT&symbol=${symbol}&apikey=${this.apiKey}`;
      const cacheKey = `income_${symbol}`;
      
      const data = await this.fetchWithCache(url, cacheKey);
      
      // Get latest quarterly report
      if (!data.quarterlyReports || data.quarterlyReports.length === 0) {
        console.log(`[StockService] No income statement data available for ${symbol}`);
        return null;
      }

      const latest = data.quarterlyReports[0];
      
      return {
        totalRevenue: latest.totalRevenue || null,
        grossProfit: latest.grossProfit || null,
        operatingIncome: latest.operatingIncome || null,
        netIncome: latest.netIncome || null,
        ebitda: latest.ebitda || null,
      };
    } catch (error) {
      console.error(`[StockService] Error fetching income statement for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Get balance sheet (quarterly) from Alpha Vantage
   * Returns latest quarter's assets, liabilities, equity
   */
  async getBalanceSheet(symbol: string): Promise<any> {
    try {
      const url = `${this.baseUrl}?function=BALANCE_SHEET&symbol=${symbol}&apikey=${this.apiKey}`;
      const cacheKey = `balance_${symbol}`;
      
      const data = await this.fetchWithCache(url, cacheKey);
      
      // Get latest quarterly report
      if (!data.quarterlyReports || data.quarterlyReports.length === 0) {
        console.log(`[StockService] No balance sheet data available for ${symbol}`);
        return null;
      }

      const latest = data.quarterlyReports[0];
      
      return {
        totalAssets: latest.totalAssets || null,
        totalLiabilities: latest.totalLiabilities || null,
        totalShareholderEquity: latest.totalShareholderEquity || null,
      };
    } catch (error) {
      console.error(`[StockService] Error fetching balance sheet for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Get cash flow statement (quarterly) from Alpha Vantage
   * Returns latest quarter's cash flows
   */
  async getCashFlow(symbol: string): Promise<any> {
    try {
      const url = `${this.baseUrl}?function=CASH_FLOW&symbol=${symbol}&apikey=${this.apiKey}`;
      const cacheKey = `cashflow_${symbol}`;
      
      const data = await this.fetchWithCache(url, cacheKey);
      
      // Get latest quarterly report
      if (!data.quarterlyReports || data.quarterlyReports.length === 0) {
        console.log(`[StockService] No cash flow data available for ${symbol}`);
        return null;
      }

      const latest = data.quarterlyReports[0];
      
      // Calculate free cash flow
      const operatingCashflow = parseFloat(latest.operatingCashflow || '0');
      const capex = parseFloat(latest.capitalExpenditures || '0');
      const freeCashFlow = operatingCashflow - Math.abs(capex);
      
      return {
        operatingCashflow: latest.operatingCashflow || null,
        capitalExpenditures: latest.capitalExpenditures || null,
        freeCashFlow: freeCashFlow.toString(),
      };
    } catch (error) {
      console.error(`[StockService] Error fetching cash flow for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Get comprehensive fundamental data combining all sources
   */
  async getComprehensiveFundamentals(symbol: string): Promise<any> {
    try {
      console.log(`[StockService] Fetching comprehensive fundamental data for ${symbol}...`);
      
      // Fetch all fundamental data in sequence (due to rate limiting)
      const overview = await this.getCompanyOverview(symbol);
      const income = await this.getIncomeStatement(symbol);
      const balance = await this.getBalanceSheet(symbol);
      const cashflow = await this.getCashFlow(symbol);

      return {
        ...overview,
        ...income,
        ...balance,
        ...cashflow,
      };
    } catch (error) {
      console.error(`[StockService] Error fetching comprehensive fundamentals for ${symbol}:`, error);
      return null;
    }
  }
}

export const stockService = new StockService();
export type { TechnicalIndicators, NewsSentiment, PriceNewsCorrelation, DailyPrice };
