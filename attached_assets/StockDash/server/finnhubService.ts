/**
 * Finnhub Stock Market Data Service
 * Fetches real-time stock quotes from Finnhub API
 * Free tier: 60 API calls/minute
 */

interface FinnhubQuote {
  c: number;  // Current price
  d: number;  // Change
  dp: number; // Percent change
  h: number;  // High price of the day
  l: number;  // Low price of the day
  o: number;  // Open price of the day
  pc: number; // Previous close price
  t: number;  // Timestamp
}

interface FinnhubCompanyProfile {
  marketCapitalization: number;
  name: string;
  ticker: string;
  shareOutstanding: number;
  country: string;
  currency: string;
  exchange: string;
  finnhubIndustry: string;
  ipo: string;
  weburl: string;
  description?: string;
  logo?: string;
  phone?: string;
}

interface FinnhubNewsArticle {
  category: string;
  datetime: number;
  headline: string;
  id: number;
  image: string;
  related: string;
  source: string;
  summary: string;
  url: string;
}

interface FinnhubCandle {
  c: number[];  // Close prices
  h: number[];  // High prices
  l: number[];  // Low prices
  o: number[];  // Open prices
  s: string;    // Status: "ok" or "no_data"
  t: number[];  // Timestamps (UNIX)
  v: number[];  // Volume
}

interface FinnhubInsiderSentiment {
  symbol: string;
  year: number;
  month: number;
  change: number;
  mspr: number;  // Monthly Share Purchase Ratio
}

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
}

interface NewsArticle {
  headline: string;
  summary: string;
  source: string;
  url: string;
  datetime: number;
  image?: string;
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

class FinnhubService {
  private apiKey: string;
  private baseUrl = "https://finnhub.io/api/v1";

  constructor() {
    this.apiKey = process.env.FINNHUB_API_KEY || "";
    
    if (!this.apiKey) {
      console.warn("[Finnhub] WARNING: FINNHUB_API_KEY not set. Stock price updates will not work.");
      console.warn("[Finnhub] Get a free API key at: https://finnhub.io/register");
    } else {
      console.log("[Finnhub] Service initialized successfully");
    }
  }

  /**
   * Get real-time quote for a stock
   */
  async getQuote(ticker: string): Promise<StockQuote> {
    if (!this.apiKey) {
      throw new Error("FINNHUB_API_KEY is not configured");
    }

    const url = `${this.baseUrl}/quote?symbol=${ticker}&token=${this.apiKey}`;
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Finnhub API request failed: ${response.statusText}`);
      }

      const data: FinnhubQuote = await response.json();
      
      // Check if we got valid data
      if (data.c === 0 && data.pc === 0) {
        throw new Error(`No data available for ticker ${ticker}`);
      }

      return {
        symbol: ticker,
        currentPrice: data.c,
        previousClose: data.pc,
        change: data.d,
        changePercent: data.dp,
        high: data.h,
        low: data.l,
        open: data.o,
      };
    } catch (error) {
      console.error(`[Finnhub] Error fetching quote for ${ticker}:`, error);
      throw error;
    }
  }

  /**
   * Get company profile including market cap and company info
   */
  async getCompanyProfile(ticker: string): Promise<CompanyInfo | null> {
    if (!this.apiKey) {
      throw new Error("FINNHUB_API_KEY is not configured");
    }

    const url = `${this.baseUrl}/stock/profile2?symbol=${ticker}&token=${this.apiKey}`;
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Finnhub API request failed: ${response.statusText}`);
      }

      const data: FinnhubCompanyProfile = await response.json();
      
      // Check if we got valid data
      if (!data || Object.keys(data).length === 0) {
        return null;
      }

      return {
        marketCap: data.marketCapitalization,
        description: data.description,
        industry: data.finnhubIndustry,
        country: data.country,
        webUrl: data.weburl,
        ipo: data.ipo,
      };
    } catch (error) {
      console.error(`[Finnhub] Error fetching company profile for ${ticker}:`, error);
      return null;
    }
  }

  /**
   * Get latest company news (last 7 days)
   */
  async getCompanyNews(ticker: string): Promise<NewsArticle[]> {
    if (!this.apiKey) {
      throw new Error("FINNHUB_API_KEY is not configured");
    }

    // Get news from last 7 days
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const toDate = today.toISOString().split('T')[0];
    const fromDate = weekAgo.toISOString().split('T')[0];

    const url = `${this.baseUrl}/company-news?symbol=${ticker}&from=${fromDate}&to=${toDate}&token=${this.apiKey}`;
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Finnhub API request failed: ${response.statusText}`);
      }

      const data: FinnhubNewsArticle[] = await response.json();
      
      // Return top 5 most recent news articles
      return data
        .slice(0, 5)
        .map(article => ({
          headline: article.headline,
          summary: article.summary,
          source: article.source,
          url: article.url,
          datetime: article.datetime,
          image: article.image,
        }));
    } catch (error) {
      console.error(`[Finnhub] Error fetching news for ${ticker}:`, error);
      return [];
    }
  }

  /**
   * Get insider sentiment data for a stock
   * Returns the most recent month's MSPR (Monthly Share Purchase Ratio) data
   */
  async getInsiderSentiment(ticker: string): Promise<InsiderSentiment | null> {
    if (!this.apiKey) {
      throw new Error("FINNHUB_API_KEY is not configured");
    }

    try {
      // Get data from last 3 months to ensure we get recent data
      const today = new Date();
      const threeMonthsAgo = new Date(today);
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      
      const toDate = today.toISOString().split('T')[0];
      const fromDate = threeMonthsAgo.toISOString().split('T')[0];

      const url = `${this.baseUrl}/stock/insider-sentiment?symbol=${ticker}&from=${fromDate}&to=${toDate}&token=${this.apiKey}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Finnhub API request failed: ${response.statusText}`);
      }

      const data: { data: FinnhubInsiderSentiment[] } = await response.json();
      
      // Get the most recent month's data
      if (data.data && data.data.length > 0) {
        const sortedData = data.data.sort((a, b) => {
          // Sort by year and month descending
          if (a.year !== b.year) return b.year - a.year;
          return b.month - a.month;
        });
        
        const latest = sortedData[0];
        console.log(`[Finnhub] Insider sentiment for ${ticker}: MSPR=${latest.mspr.toFixed(2)}, change=${latest.change.toFixed(2)}`);
        
        return {
          mspr: latest.mspr,
          change: latest.change,
        };
      }
      
      console.log(`[Finnhub] No insider sentiment data found for ${ticker}`);
      return null;
    } catch (error) {
      console.error(`[Finnhub] Error fetching insider sentiment for ${ticker}:`, error);
      return null;
    }
  }

  /**
   * Get historical closing price for a specific date using Alpha Vantage
   * @param ticker Stock symbol
   * @param dateString Date in DD.MM.YYYY or DD.MM.YYYY HH:MM format
   */
  async getHistoricalPrice(ticker: string, dateString: string): Promise<number | null> {
    const alphaVantageKey = process.env.ALPHA_VANTAGE_API_KEY;
    if (!alphaVantageKey) {
      console.log('[AlphaVantage] API key not configured, skipping historical price fetch');
      return null;
    }

    try {
      // Parse DD.MM.YYYY or DD.MM.YYYY HH:MM format
      const datePart = dateString.split(' ')[0]; // Remove time if present
      const [day, month, year] = datePart.split('.').map(Number);
      
      // Format as YYYY-MM-DD for Alpha Vantage
      const targetDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${ticker}&apikey=${alphaVantageKey}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Alpha Vantage API request failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Check for API errors
      if (data['Error Message'] || data['Note']) {
        console.log(`[AlphaVantage] API limit or error for ${ticker}: ${data['Error Message'] || data['Note']}`);
        return null;
      }
      
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
      const sortedDates = Object.keys(timeSeries).sort().reverse(); // Most recent first
      
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
    const alphaVantageKey = process.env.ALPHA_VANTAGE_API_KEY;
    if (!alphaVantageKey) {
      throw new Error("ALPHA_VANTAGE_API_KEY is not configured");
    }

    try {
      // Convert to Date objects if needed
      const fromDateObj = fromDate instanceof Date ? fromDate : new Date(fromDate);
      const toDateObj = toDate instanceof Date ? toDate : new Date(toDate);

      const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${ticker}&apikey=${alphaVantageKey}&outputsize=full`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Alpha Vantage API request failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Check for API errors
      if (data['Error Message'] || data['Note']) {
        throw new Error(`Alpha Vantage API error: ${data['Error Message'] || data['Note']}`);
      }
      
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
   * Get historical daily candles (OHLCV) for a stock
   * @param ticker Stock symbol
   * @param fromDate Start date (YYYY-MM-DD or Date object)
   * @param toDate End date (YYYY-MM-DD or Date object)
   * @returns Array of daily prices with date and close price
   */
  async getHistoricalCandles(ticker: string, fromDate: Date | string, toDate: Date | string): Promise<Array<{ date: string; close: number }>> {
    if (!this.apiKey) {
      throw new Error("FINNHUB_API_KEY is not configured");
    }

    try {
      // Convert dates to UNIX timestamps
      const fromTimestamp = Math.floor(
        (fromDate instanceof Date ? fromDate : new Date(fromDate)).getTime() / 1000
      );
      const toTimestamp = Math.floor(
        (toDate instanceof Date ? toDate : new Date(toDate)).getTime() / 1000
      );

      const url = `${this.baseUrl}/stock/candle?symbol=${ticker}&resolution=D&from=${fromTimestamp}&to=${toTimestamp}&token=${this.apiKey}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Finnhub API request failed: ${response.statusText}`);
      }

      const data: FinnhubCandle = await response.json();
      
      // Check if we got valid data
      if (data.s !== 'ok' || !data.c || data.c.length === 0) {
        console.log(`[Finnhub] No historical data available for ${ticker}`);
        return [];
      }

      // Convert to our format: array of { date, close }
      const prices: Array<{ date: string; close: number }> = [];
      for (let i = 0; i < data.c.length; i++) {
        const date = new Date(data.t[i] * 1000).toISOString().split('T')[0]; // Convert UNIX to YYYY-MM-DD
        prices.push({
          date,
          close: data.c[i],
        });
      }

      console.log(`[Finnhub] Fetched ${prices.length} historical prices for ${ticker} from ${prices[0]?.date} to ${prices[prices.length - 1]?.date}`);
      return prices;
    } catch (error) {
      console.error(`[Finnhub] Error fetching historical candles for ${ticker}:`, error);
      throw error;
    }
  }

  /**
   * Get quotes for multiple stocks (batch)
   */
  async getBatchQuotes(tickers: string[]): Promise<Map<string, StockQuote>> {
    const quotes = new Map<string, StockQuote>();
    
    // Finnhub free tier: 60 calls/minute = 1 call per second
    // We'll add a small delay between requests to be safe
    for (const ticker of tickers) {
      try {
        const quote = await this.getQuote(ticker);
        quotes.set(ticker, quote);
        
        // Wait 1 second between requests to avoid rate limits
        if (tickers.indexOf(ticker) < tickers.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(`[Finnhub] Failed to fetch ${ticker}, skipping`);
      }
    }
    
    return quotes;
  }

  /**
   * Get quotes, market cap, company info, news, and insider sentiment for multiple stocks (batch)
   */
  async getBatchStockData(tickers: string[]): Promise<Map<string, StockData>> {
    const stockData = new Map<string, StockData>();
    
    // Finnhub free tier: 60 calls/minute = 1 call per second
    // We need 4 calls per ticker (quote + profile + news + insider sentiment)
    for (const ticker of tickers) {
      try {
        const quote = await this.getQuote(ticker);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const companyInfo = await this.getCompanyProfile(ticker);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const news = await this.getCompanyNews(ticker);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const insiderSentiment = await this.getInsiderSentiment(ticker);
        
        stockData.set(ticker, {
          quote,
          marketCap: companyInfo?.marketCap,
          companyInfo: companyInfo || undefined,
          news,
          insiderSentiment: insiderSentiment || undefined,
        });
        
        // Wait 1 second before next ticker
        if (tickers.indexOf(ticker) < tickers.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(`[Finnhub] Failed to fetch data for ${ticker}, skipping`);
      }
    }
    
    return stockData;
  }
}

export const finnhubService = new FinnhubService();
