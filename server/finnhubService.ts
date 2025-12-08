/**
 * Stock Market Data Service (Alpha Vantage)
 * Fetches real-time stock quotes, company profiles, news, and historical data
 * Using Alpha Vantage API (Pro license: 75 requests/minute)
 * 
 * Note: This file was previously using Finnhub. Now uses Alpha Vantage exclusively.
 * The service name is kept for backward compatibility with imports.
 */

interface StockQuote {
  symbol: string;
  currentPrice: number;
  previousClose: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
}

interface CompanyInfo {
  description?: string;
  industry?: string;
  country?: string;
  webUrl?: string;
  ipo?: string;
  marketCap?: number;
  name?: string;
  sector?: string;
  peRatio?: number;
}

interface NewsArticle {
  headline: string;
  summary: string;
  source: string;
  url: string;
  datetime: number;
  image?: string;
  sentiment?: number;
}

interface InsiderSentiment {
  mspr: number;  // Monthly Share Purchase Ratio (-1 to 1, where 1 = all buys, -1 = all sells)
  change: number;  // Change in MSPR from previous month
}

interface StockData {
  quote: StockQuote;
  marketCap?: number;
  companyInfo?: CompanyInfo;
  news?: NewsArticle[];
  insiderSentiment?: InsiderSentiment;
}

class AlphaVantageStockService {
  private apiKey: string;
  private baseUrl = "https://www.alphavantage.co/query";
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheTimeout = 60 * 1000; // 1 minute cache
  private lastApiCallTime: number = 0;
  private minDelayBetweenCalls: number = 800; // 0.8 seconds (Pro: 75 requests/minute)

  constructor() {
    this.apiKey = process.env.ALPHA_VANTAGE_API_KEY || "";
    
    if (!this.apiKey) {
      console.warn("[AlphaVantage] WARNING: ALPHA_VANTAGE_API_KEY not set. Stock data will not be available.");
    } else {
      console.log("[AlphaVantage] Stock service initialized (Pro license: 75 calls/min)");
    }
  }

  /**
   * Rate limiter - ensures at least 0.8 seconds between API calls (Pro: 75/min)
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastApiCallTime;
    
    if (timeSinceLastCall < this.minDelayBetweenCalls) {
      const waitTime = this.minDelayBetweenCalls - timeSinceLastCall;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastApiCallTime = Date.now();
  }

  /**
   * Fetch with caching and rate limiting
   */
  private async fetchWithCache(url: string, cacheKey: string): Promise<any> {
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    await this.enforceRateLimit();

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Alpha Vantage API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data["Error Message"]) {
      throw new Error(`Alpha Vantage API Error: ${data["Error Message"]}`);
    }
    
    if (data["Note"]) {
      console.warn("[AlphaVantage] API rate limit warning:", data["Note"]);
      throw new Error("API rate limit exceeded. Please try again later.");
    }

    this.cache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  }

  /**
   * Get real-time quote for a stock
   */
  async getQuote(ticker: string): Promise<StockQuote> {
    if (!this.apiKey) {
      throw new Error("ALPHA_VANTAGE_API_KEY is not configured");
    }

    const url = `${this.baseUrl}?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${this.apiKey}`;
    
    try {
      const data = await this.fetchWithCache(url, `quote_${ticker}`);
      const quote = data["Global Quote"];
      
      if (!quote || !quote["05. price"]) {
        throw new Error(`No quote data found for ${ticker}`);
      }

      return {
        symbol: ticker,
        currentPrice: parseFloat(quote["05. price"]),
        previousClose: parseFloat(quote["08. previous close"]),
        change: parseFloat(quote["09. change"]),
        changePercent: parseFloat(quote["10. change percent"].replace("%", "")),
        high: parseFloat(quote["03. high"]),
        low: parseFloat(quote["04. low"]),
        open: parseFloat(quote["02. open"]),
      };
    } catch (error) {
      console.error(`[AlphaVantage] Error fetching quote for ${ticker}:`, error);
      throw error;
    }
  }

  /**
   * Get company profile including market cap and company info
   */
  async getCompanyProfile(ticker: string): Promise<CompanyInfo | null> {
    if (!this.apiKey) {
      throw new Error("ALPHA_VANTAGE_API_KEY is not configured");
    }

    const url = `${this.baseUrl}?function=OVERVIEW&symbol=${ticker}&apikey=${this.apiKey}`;
    
    try {
      const data = await this.fetchWithCache(url, `profile_${ticker}`);
      
      if (!data || Object.keys(data).length === 0 || data["Error Message"]) {
        return null;
      }

      return {
        name: data.Name,
        marketCap: data.MarketCapitalization ? parseFloat(data.MarketCapitalization) : undefined,
        description: data.Description,
        industry: data.Industry,
        sector: data.Sector,
        country: data.Country,
        webUrl: data.Website || undefined,
        ipo: data.IPODate || undefined,
        peRatio: data.PERatio ? parseFloat(data.PERatio) : undefined,
      };
    } catch (error) {
      console.error(`[AlphaVantage] Error fetching company profile for ${ticker}:`, error);
      return null;
    }
  }

  /**
   * Get company news with sentiment
   */
  async getCompanyNews(ticker: string): Promise<NewsArticle[]> {
    if (!this.apiKey) {
      throw new Error("ALPHA_VANTAGE_API_KEY is not configured");
    }

    const url = `${this.baseUrl}?function=NEWS_SENTIMENT&tickers=${ticker}&limit=10&apikey=${this.apiKey}`;
    
    try {
      const data = await this.fetchWithCache(url, `news_${ticker}`);
      
      if (!data.feed || !Array.isArray(data.feed)) {
        return [];
      }

      return data.feed
        .slice(0, 5)
        .map((article: any) => {
          // Find sentiment for this specific ticker
          const tickerSentiment = article.ticker_sentiment?.find(
            (ts: any) => ts.ticker.toUpperCase() === ticker.toUpperCase()
          );
          
          return {
            headline: article.title,
            summary: article.summary,
            source: article.source,
            url: article.url,
            datetime: new Date(article.time_published).getTime() / 1000,
            image: article.banner_image || undefined,
            sentiment: tickerSentiment ? parseFloat(tickerSentiment.ticker_sentiment_score) : undefined,
          };
        });
    } catch (error) {
      console.error(`[AlphaVantage] Error fetching news for ${ticker}:`, error);
      return [];
    }
  }

  /**
   * Get insider sentiment (not directly available in Alpha Vantage)
   * Returns null - insider data comes from OpenInsider instead
   */
  async getInsiderSentiment(ticker: string): Promise<InsiderSentiment | null> {
    // Alpha Vantage doesn't provide insider sentiment data
    // This data is sourced from OpenInsider via openinsiderService.ts
    console.log(`[AlphaVantage] Insider sentiment not available via Alpha Vantage for ${ticker} (use OpenInsider)`);
    return null;
  }

  /**
   * Get historical closing price for a specific date
   * @param ticker Stock symbol
   * @param dateString Date in DD.MM.YYYY or DD.MM.YYYY HH:MM format
   */
  async getHistoricalPrice(ticker: string, dateString: string): Promise<number | null> {
    if (!this.apiKey) {
      console.log('[AlphaVantage] API key not configured, skipping historical price fetch');
      return null;
    }

    try {
      // Parse DD.MM.YYYY or DD.MM.YYYY HH:MM format
      const datePart = dateString.split(' ')[0];
      const [day, month, year] = datePart.split('.').map(Number);
      
      // Format as YYYY-MM-DD for Alpha Vantage
      const targetDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      const url = `${this.baseUrl}?function=TIME_SERIES_DAILY&symbol=${ticker}&apikey=${this.apiKey}`;
      const data = await this.fetchWithCache(url, `daily_${ticker}`);
      
      const timeSeries = data['Time Series (Daily)'];
      if (!timeSeries) {
        console.log(`[AlphaVantage] No time series data for ${ticker}`);
        return null;
      }
      
      // Try to find exact date first
      if (timeSeries[targetDate]) {
        const closingPrice = parseFloat(timeSeries[targetDate]['4. close']);
        console.log(`[AlphaVantage] Historical price for ${ticker} on ${dateString}: $${closingPrice.toFixed(2)}`);
        return closingPrice;
      }
      
      // If exact date not found (weekend/holiday), find closest previous trading day
      const targetDateObj = new Date(targetDate);
      const sortedDates = Object.keys(timeSeries).sort().reverse();
      
      for (const date of sortedDates) {
        const dateObj = new Date(date);
        if (dateObj <= targetDateObj) {
          const closingPrice = parseFloat(timeSeries[date]['4. close']);
          console.log(`[AlphaVantage] Historical price for ${ticker} on ${dateString}: $${closingPrice.toFixed(2)} (from ${date})`);
          return closingPrice;
        }
      }
      
      console.log(`[AlphaVantage] No historical data found for ${ticker} on or before ${dateString}`);
      return null;
    } catch (error) {
      console.error(`[AlphaVantage] Error fetching historical price for ${ticker} on ${dateString}:`, error);
      return null;
    }
  }

  /**
   * Get historical daily candles using Alpha Vantage
   * @param ticker Stock symbol
   * @param fromDate Start date (YYYY-MM-DD or Date object)
   * @param toDate End date (YYYY-MM-DD or Date object)
   * @returns Array of daily prices with date and close price
   */
  async getHistoricalCandlesAlphaVantage(ticker: string, fromDate: Date | string, toDate: Date | string): Promise<Array<{ date: string; close: number }>> {
    return this.getHistoricalCandles(ticker, fromDate, toDate);
  }

  /**
   * Get historical daily candles (OHLCV) for a stock
   * @param ticker Stock symbol
   * @param fromDate Start date (YYYY-MM-DD or Date object)
   * @param toDate End date (YYYY-MM-DD or Date object)
   * @returns Array of daily prices with date and close price
   */
  async getHistoricalCandles(ticker: string, fromDate: Date | string, toDate: Date | string): Promise<Array<{ date: string; close: number }>> {
    if (!this.apiKey) {
      throw new Error("ALPHA_VANTAGE_API_KEY is not configured");
    }

    try {
      const fromDateObj = fromDate instanceof Date ? fromDate : new Date(fromDate);
      const toDateObj = toDate instanceof Date ? toDate : new Date(toDate);

      const url = `${this.baseUrl}?function=TIME_SERIES_DAILY&symbol=${ticker}&apikey=${this.apiKey}&outputsize=full`;
      const data = await this.fetchWithCache(url, `candles_${ticker}_full`);
      
      const timeSeries = data['Time Series (Daily)'];
      if (!timeSeries) {
        throw new Error(`No time series data for ${ticker}`);
      }
      
      // Filter dates within range and convert to our format
      const prices: Array<{ date: string; close: number }> = [];
      const sortedDates = Object.keys(timeSeries).sort(); // Oldest to newest
      
      for (const date of sortedDates) {
        const dateObj = new Date(date);
        if (dateObj >= fromDateObj && dateObj <= toDateObj) {
          prices.push({
            date,
            close: parseFloat(timeSeries[date]['4. close']),
          });
        }
      }

      if (prices.length === 0) {
        throw new Error(`No historical data available for ${ticker} in date range`);
      }

      console.log(`[AlphaVantage] Fetched ${prices.length} historical prices for ${ticker} from ${prices[0]?.date} to ${prices[prices.length - 1]?.date}`);
      return prices;
    } catch (error: any) {
      console.error(`[AlphaVantage] Error fetching historical candles for ${ticker}:`, error.message);
      throw error;
    }
  }

  /**
   * Get quotes for multiple stocks (batch)
   */
  async getBatchQuotes(tickers: string[]): Promise<Map<string, StockQuote>> {
    const quotes = new Map<string, StockQuote>();
    
    for (const ticker of tickers) {
      try {
        const quote = await this.getQuote(ticker);
        quotes.set(ticker, quote);
      } catch (error) {
        console.error(`[AlphaVantage] Failed to fetch quote for ${ticker}, skipping`);
      }
    }
    
    return quotes;
  }

  /**
   * Get quotes, market cap, company info, and news for multiple stocks (batch)
   */
  async getBatchStockData(tickers: string[]): Promise<Map<string, StockData>> {
    const stockData = new Map<string, StockData>();
    
    for (const ticker of tickers) {
      try {
        const quote = await this.getQuote(ticker);
        const companyInfo = await this.getCompanyProfile(ticker);
        const news = await this.getCompanyNews(ticker);
        
        stockData.set(ticker, {
          quote,
          marketCap: companyInfo?.marketCap,
          companyInfo: companyInfo || undefined,
          news,
          insiderSentiment: undefined, // Sourced from OpenInsider
        });
      } catch (error) {
        console.error(`[AlphaVantage] Failed to fetch data for ${ticker}, skipping`);
      }
    }
    
    return stockData;
  }
}

// Export with same name for backward compatibility
export const finnhubService = new AlphaVantageStockService();
