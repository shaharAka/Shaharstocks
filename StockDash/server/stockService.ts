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
   * Get company overview including market cap, P/E ratio, etc.
   */
  async getCompanyOverview(ticker: string): Promise<StockProfile> {
    const url = `${this.baseUrl}?function=OVERVIEW&symbol=${ticker}&apikey=${this.apiKey}`;
    const data = await this.fetchWithCache(url, `overview_${ticker}`);

    if (!data.Symbol) {
      throw new Error(`No company overview data found for ${ticker}`);
    }

    // Format market cap
    const marketCapNum = parseFloat(data.MarketCapitalization || "0");
    let marketCap = "N/A";
    if (marketCapNum >= 1e12) {
      marketCap = `$${(marketCapNum / 1e12).toFixed(2)}T`;
    } else if (marketCapNum >= 1e9) {
      marketCap = `$${(marketCapNum / 1e9).toFixed(2)}B`;
    } else if (marketCapNum >= 1e6) {
      marketCap = `$${(marketCapNum / 1e6).toFixed(2)}M`;
    }

    return {
      symbol: data.Symbol,
      name: data.Name || `${ticker} Inc.`,
      marketCap,
      peRatio: data.PERatio || "N/A",
      sector: data.Sector || "N/A",
      industry: data.Industry || "N/A",
      description: data.Description || "",
    };
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
   * Get balance sheet data (annual and quarterly)
   */
  async getBalanceSheet(ticker: string): Promise<any> {
    const url = `${this.baseUrl}?function=BALANCE_SHEET&symbol=${ticker}&apikey=${this.apiKey}`;
    const data = await this.fetchWithCache(url, `balance_sheet_${ticker}`);

    if (!data.symbol && !data.annualReports) {
      throw new Error(`No balance sheet data found for ${ticker}`);
    }

    return {
      symbol: data.symbol,
      annualReports: data.annualReports || [],
      quarterlyReports: data.quarterlyReports || [],
    };
  }

  /**
   * Get income statement data (annual and quarterly)
   */
  async getIncomeStatement(ticker: string): Promise<any> {
    const url = `${this.baseUrl}?function=INCOME_STATEMENT&symbol=${ticker}&apikey=${this.apiKey}`;
    const data = await this.fetchWithCache(url, `income_statement_${ticker}`);

    if (!data.symbol && !data.annualReports) {
      throw new Error(`No income statement data found for ${ticker}`);
    }

    return {
      symbol: data.symbol,
      annualReports: data.annualReports || [],
      quarterlyReports: data.quarterlyReports || [],
    };
  }

  /**
   * Get cash flow data (annual and quarterly)
   */
  async getCashFlow(ticker: string): Promise<any> {
    const url = `${this.baseUrl}?function=CASH_FLOW&symbol=${ticker}&apikey=${this.apiKey}`;
    const data = await this.fetchWithCache(url, `cash_flow_${ticker}`);

    if (!data.symbol && !data.annualReports) {
      throw new Error(`No cash flow data found for ${ticker}`);
    }

    return {
      symbol: data.symbol,
      annualReports: data.annualReports || [],
      quarterlyReports: data.quarterlyReports || [],
    };
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
   */
  async getTechnicalIndicators(ticker: string, dailyPrices: DailyPrice[]): Promise<TechnicalIndicators> {
    try {
      // Fetch RSI (Relative Strength Index - 14 period)
      const rsiUrl = `${this.baseUrl}?function=RSI&symbol=${ticker}&interval=daily&time_period=14&series_type=close&apikey=${this.apiKey}`;
      const rsiData = await this.fetchWithCache(rsiUrl, `rsi_${ticker}`);
      const rsiValue = parseFloat(Object.values(rsiData["Technical Analysis: RSI"] || {})[0]?.["RSI"] || "50");
      
      // Fetch MACD (Moving Average Convergence Divergence)
      const macdUrl = `${this.baseUrl}?function=MACD&symbol=${ticker}&interval=daily&series_type=close&apikey=${this.apiKey}`;
      const macdData = await this.fetchWithCache(macdUrl, `macd_${ticker}`);
      const latestMacd = Object.values(macdData["Technical Analysis: MACD"] || {})[0] as any;
      
      // Fetch Bollinger Bands
      const bbUrl = `${this.baseUrl}?function=BBANDS&symbol=${ticker}&interval=daily&time_period=20&series_type=close&apikey=${this.apiKey}`;
      const bbData = await this.fetchWithCache(bbUrl, `bbands_${ticker}`);
      const latestBB = Object.values(bbData["Technical Analysis: BBANDS"] || {})[0] as any;
      
      // Fetch SMA 20
      const sma20Url = `${this.baseUrl}?function=SMA&symbol=${ticker}&interval=daily&time_period=20&series_type=close&apikey=${this.apiKey}`;
      const sma20Data = await this.fetchWithCache(sma20Url, `sma20_${ticker}`);
      const sma20 = parseFloat(Object.values(sma20Data["Technical Analysis: SMA"] || {})[0]?.["SMA"] || "0");
      
      // Fetch SMA 50
      const sma50Url = `${this.baseUrl}?function=SMA&symbol=${ticker}&interval=daily&time_period=50&series_type=close&apikey=${this.apiKey}`;
      const sma50Data = await this.fetchWithCache(sma50Url, `sma50_${ticker}`);
      const sma50 = parseFloat(Object.values(sma50Data["Technical Analysis: SMA"] || {})[0]?.["SMA"] || "0");
      
      // Fetch EMA 12
      const ema12Url = `${this.baseUrl}?function=EMA&symbol=${ticker}&interval=daily&time_period=12&series_type=close&apikey=${this.apiKey}`;
      const ema12Data = await this.fetchWithCache(ema12Url, `ema12_${ticker}`);
      const ema12 = parseFloat(Object.values(ema12Data["Technical Analysis: EMA"] || {})[0]?.["EMA"] || "0");
      
      // Fetch ATR (Average True Range - volatility)
      const atrUrl = `${this.baseUrl}?function=ATR&symbol=${ticker}&interval=daily&time_period=14&apikey=${this.apiKey}`;
      const atrData = await this.fetchWithCache(atrUrl, `atr_${ticker}`);
      const atr = parseFloat(Object.values(atrData["Technical Analysis: ATR"] || {})[0]?.["ATR"] || "0");

      // Calculate current price position relative to Bollinger Bands
      const currentPrice = dailyPrices[dailyPrices.length - 1]?.close || 0;
      const upperBand = parseFloat(latestBB?.["Real Upper Band"] || currentPrice);
      const middleBand = parseFloat(latestBB?.["Real Middle Band"] || currentPrice);
      const lowerBand = parseFloat(latestBB?.["Real Lower Band"] || currentPrice);
      
      let bbPosition: "above" | "below" | "inside" = "inside";
      if (currentPrice > upperBand) bbPosition = "above";
      else if (currentPrice < lowerBand) bbPosition = "below";

      // Determine volume trend from recent data
      const recentVolumes = dailyPrices.slice(-10).map(p => p.volume);
      const avgRecentVolume = recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length;
      const lastVolume = dailyPrices[dailyPrices.length - 1]?.volume || 0;
      let volumeTrend: "increasing" | "decreasing" | "stable" = "stable";
      if (lastVolume > avgRecentVolume * 1.2) volumeTrend = "increasing";
      else if (lastVolume < avgRecentVolume * 0.8) volumeTrend = "decreasing";

      return {
        rsi: {
          value: rsiValue,
          signal: rsiValue > 70 ? "overbought" : rsiValue < 30 ? "oversold" : "neutral"
        },
        macd: {
          value: parseFloat(latestMacd?.["MACD"] || "0"),
          signal: parseFloat(latestMacd?.["MACD_Signal"] || "0"),
          histogram: parseFloat(latestMacd?.["MACD_Hist"] || "0"),
          trend: parseFloat(latestMacd?.["MACD_Hist"] || "0") > 0 ? "bullish" : parseFloat(latestMacd?.["MACD_Hist"] || "0") < 0 ? "bearish" : "neutral"
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
    } catch (error) {
      console.error(`[StockService] Error fetching technical indicators for ${ticker}:`, error);
      // Return neutral defaults if technical indicators fail
      return {
        rsi: { value: 50, signal: "neutral" },
        macd: { value: 0, signal: 0, histogram: 0, trend: "neutral" },
        bollingerBands: { upper: 0, middle: 0, lower: 0, position: "inside" },
        sma20: 0,
        sma50: 0,
        ema12: 0,
        volumeTrend: "stable",
        atr: 0
      };
    }
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
