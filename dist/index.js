var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc2) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc2 = __getOwnPropDesc(from, key)) || desc2.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server/stockService.ts
var stockService_exports = {};
__export(stockService_exports, {
  stockService: () => stockService
});
function withTimeout(promise, timeoutMs, errorMessage) {
  return Promise.race([
    promise,
    new Promise(
      (_, reject) => setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    )
  ]);
}
var StockService, stockService;
var init_stockService = __esm({
  "server/stockService.ts"() {
    "use strict";
    StockService = class {
      apiKey;
      baseUrl = "https://www.alphavantage.co/query";
      cache = /* @__PURE__ */ new Map();
      cacheTimeout = 60 * 1e3;
      // 1 minute cache
      lastApiCallTime = 0;
      minDelayBetweenCalls = 800;
      // 0.8 seconds (Premium: 75 requests/minute = 1 every 0.8s)
      constructor() {
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
      async enforceRateLimit() {
        const now = Date.now();
        const timeSinceLastCall = now - this.lastApiCallTime;
        if (timeSinceLastCall < this.minDelayBetweenCalls) {
          const waitTime = this.minDelayBetweenCalls - timeSinceLastCall;
          console.log(`[StockService] Rate limiting: waiting ${Math.ceil(waitTime / 1e3)}s before next API call...`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
        this.lastApiCallTime = Date.now();
      }
      async fetchWithCache(url, cacheKey) {
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
          console.log(`[StockService] Using cached data for ${cacheKey}`);
          return cached.data;
        }
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
      async getQuote(ticker) {
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
          previousClose: parseFloat(quote["08. previous close"])
        };
      }
      /**
       * Get daily historical prices for the last N days
       */
      async getDailyPrices(ticker, days = 7) {
        const url = `${this.baseUrl}?function=TIME_SERIES_DAILY&symbol=${ticker}&apikey=${this.apiKey}`;
        const data = await this.fetchWithCache(url, `daily_${ticker}`);
        const timeSeries = data["Time Series (Daily)"];
        if (!timeSeries) {
          throw new Error(`No daily price data found for ${ticker}`);
        }
        const prices = [];
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
            volume: parseInt(day["5. volume"])
          });
        }
        return prices.reverse();
      }
      /**
       * Get 2 weeks of candlestick data for quick visual reference
       * Returns OHLCV data for the last 14 trading days
       */
      async getCandlestickData(ticker) {
        const url = `${this.baseUrl}?function=TIME_SERIES_DAILY&symbol=${ticker}&apikey=${this.apiKey}`;
        const data = await this.fetchWithCache(url, `daily_${ticker}`);
        const timeSeries = data["Time Series (Daily)"];
        if (!timeSeries) {
          throw new Error(`No daily price data found for ${ticker}`);
        }
        const prices = [];
        const dates = Object.keys(timeSeries).sort().reverse().slice(0, 14);
        for (const date of dates) {
          const day = timeSeries[date];
          prices.push({
            date,
            price: parseFloat(day["4. close"]),
            open: parseFloat(day["1. open"]),
            high: parseFloat(day["2. high"]),
            low: parseFloat(day["3. low"]),
            close: parseFloat(day["4. close"]),
            volume: parseInt(day["5. volume"])
          });
        }
        return prices.reverse();
      }
      /**
       * Get comprehensive stock data (quote + daily prices + overview)
       * Makes 3 API calls with global rate limiting (enforceRateLimit ensures 0.8s between ALL calls)
       */
      async getComprehensiveData(ticker) {
        if (!this.apiKey) {
          throw new Error("ALPHA_VANTAGE_API_KEY is not configured. Please set it in your environment variables.");
        }
        try {
          console.log(`[StockService] Fetching comprehensive data for ${ticker}...`);
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
            priceHistory: dailyPrices.map((p) => ({ date: p.date, price: p.price }))
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
      async getTechnicalIndicators(ticker, dailyPrices) {
        console.log(`[StockService] \u{1F4CA} getTechnicalIndicators start for ${ticker} - fetching 7 indicators in parallel...`);
        const INDICATOR_TIMEOUT = 15e3;
        const currentPrice = dailyPrices[dailyPrices.length - 1]?.close || 0;
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
          )
        ]);
        const [rsiResult, macdResult, bbResult, sma20Result, sma50Result, ema12Result, atrResult] = results;
        let rsiValue = 50;
        if (rsiResult.status === "fulfilled") {
          try {
            rsiValue = parseFloat(Object.values(rsiResult.value["Technical Analysis: RSI"] || {})[0]?.["RSI"] || "50");
            console.log(`[StockService] \u2705 RSI: ${rsiValue}`);
          } catch (e) {
            console.warn(`[StockService] \u26A0\uFE0F  RSI parse error, using default`);
          }
        } else {
          console.warn(`[StockService] \u26A0\uFE0F  RSI failed: ${rsiResult.reason.message}`);
        }
        let macdValue = 0, macdSignal = 0, macdHist = 0;
        if (macdResult.status === "fulfilled") {
          try {
            const latestMacd = Object.values(macdResult.value["Technical Analysis: MACD"] || {})[0];
            macdValue = parseFloat(latestMacd?.["MACD"] || "0");
            macdSignal = parseFloat(latestMacd?.["MACD_Signal"] || "0");
            macdHist = parseFloat(latestMacd?.["MACD_Hist"] || "0");
            console.log(`[StockService] \u2705 MACD fetched`);
          } catch (e) {
            console.warn(`[StockService] \u26A0\uFE0F  MACD parse error, using defaults`);
          }
        } else {
          console.warn(`[StockService] \u26A0\uFE0F  MACD failed: ${macdResult.reason.message}`);
        }
        let upperBand = currentPrice, middleBand = currentPrice, lowerBand = currentPrice;
        if (bbResult.status === "fulfilled") {
          try {
            const latestBB = Object.values(bbResult.value["Technical Analysis: BBANDS"] || {})[0];
            upperBand = parseFloat(latestBB?.["Real Upper Band"] || currentPrice);
            middleBand = parseFloat(latestBB?.["Real Middle Band"] || currentPrice);
            lowerBand = parseFloat(latestBB?.["Real Lower Band"] || currentPrice);
            console.log(`[StockService] \u2705 Bollinger Bands fetched`);
          } catch (e) {
            console.warn(`[StockService] \u26A0\uFE0F  Bollinger Bands parse error, using current price`);
          }
        } else {
          console.warn(`[StockService] \u26A0\uFE0F  Bollinger Bands failed: ${bbResult.reason.message}`);
        }
        const sma20 = sma20Result.status === "fulfilled" ? parseFloat(Object.values(sma20Result.value["Technical Analysis: SMA"] || {})[0]?.["SMA"] || "0") : 0;
        const sma50 = sma50Result.status === "fulfilled" ? parseFloat(Object.values(sma50Result.value["Technical Analysis: SMA"] || {})[0]?.["SMA"] || "0") : 0;
        const ema12 = ema12Result.status === "fulfilled" ? parseFloat(Object.values(ema12Result.value["Technical Analysis: EMA"] || {})[0]?.["EMA"] || "0") : 0;
        const atr = atrResult.status === "fulfilled" ? parseFloat(Object.values(atrResult.value["Technical Analysis: ATR"] || {})[0]?.["ATR"] || "0") : 0;
        if (sma20Result.status === "fulfilled") console.log(`[StockService] \u2705 SMA 20 fetched`);
        else console.warn(`[StockService] \u26A0\uFE0F  SMA 20 failed: ${sma20Result.reason.message}`);
        if (sma50Result.status === "fulfilled") console.log(`[StockService] \u2705 SMA 50 fetched`);
        else console.warn(`[StockService] \u26A0\uFE0F  SMA 50 failed: ${sma50Result.reason.message}`);
        if (ema12Result.status === "fulfilled") console.log(`[StockService] \u2705 EMA 12 fetched`);
        else console.warn(`[StockService] \u26A0\uFE0F  EMA 12 failed: ${ema12Result.reason.message}`);
        if (atrResult.status === "fulfilled") console.log(`[StockService] \u2705 ATR fetched`);
        else console.warn(`[StockService] \u26A0\uFE0F  ATR failed: ${atrResult.reason.message}`);
        let bbPosition = "inside";
        if (currentPrice > upperBand) bbPosition = "above";
        else if (currentPrice < lowerBand) bbPosition = "below";
        const recentVolumes = dailyPrices.slice(-10).map((p) => p.volume);
        const avgRecentVolume = recentVolumes.length > 0 ? recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length : 0;
        const lastVolume = dailyPrices[dailyPrices.length - 1]?.volume || 0;
        let volumeTrend = "stable";
        if (avgRecentVolume > 0) {
          if (lastVolume > avgRecentVolume * 1.2) volumeTrend = "increasing";
          else if (lastVolume < avgRecentVolume * 0.8) volumeTrend = "decreasing";
        }
        const successCount = results.filter((r) => r.status === "fulfilled").length;
        console.log(`[StockService] \u2705 getTechnicalIndicators complete for ${ticker}: ${successCount}/7 indicators fetched successfully`);
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
      async getNewsSentiment(ticker) {
        try {
          const twoWeeksAgo = /* @__PURE__ */ new Date();
          twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
          const timeFrom = twoWeeksAgo.toISOString().split("T")[0].replace(/-/g, "") + "T0000";
          const url = `${this.baseUrl}?function=NEWS_SENTIMENT&tickers=${ticker}&time_from=${timeFrom}&limit=50&apikey=${this.apiKey}`;
          const data = await this.fetchWithCache(url, `news_sentiment_${ticker}`);
          const feed = data.feed || [];
          const articles = feed.map((article) => {
            const tickerSentiment = article.ticker_sentiment?.find(
              (ts) => ts.ticker === ticker
            ) || {};
            return {
              title: article.title || "",
              source: article.source || "",
              url: article.url || "",
              publishedAt: article.time_published || "",
              sentiment: parseFloat(tickerSentiment.ticker_sentiment_score || article.overall_sentiment_score || "0"),
              relevanceScore: parseFloat(tickerSentiment.relevance_score || "0"),
              topics: article.topics?.map((t) => t.topic) || []
            };
          });
          const sentiments = articles.map((a) => a.sentiment).filter((s) => !isNaN(s));
          const aggregateSentiment = sentiments.length > 0 ? sentiments.reduce((a, b) => a + b, 0) / sentiments.length : 0;
          const recentArticles = articles.slice(0, Math.floor(articles.length / 2));
          const olderArticles = articles.slice(Math.floor(articles.length / 2));
          const recentSentiment = recentArticles.length > 0 ? recentArticles.map((a) => a.sentiment).reduce((a, b) => a + b, 0) / recentArticles.length : 0;
          const olderSentiment = olderArticles.length > 0 ? olderArticles.map((a) => a.sentiment).reduce((a, b) => a + b, 0) / olderArticles.length : 0;
          let sentimentTrend = "stable";
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
      analyzePriceNewsCorrelation(dailyPrices, newsSentiment) {
        try {
          if (dailyPrices.length < 5 || newsSentiment.articles.length < 3) {
            return {
              correlation: 0,
              lag: "concurrent",
              strength: "weak"
            };
          }
          const dailySentiment = /* @__PURE__ */ new Map();
          newsSentiment.articles.forEach((article) => {
            const date = article.publishedAt.substring(0, 8);
            const dateKey = `${date.substring(0, 4)}-${date.substring(4, 6)}-${date.substring(6, 8)}`;
            if (!dailySentiment.has(dateKey)) {
              dailySentiment.set(dateKey, []);
            }
            dailySentiment.get(dateKey).push(article.sentiment);
          });
          const priceChanges = dailyPrices.slice(1).map((day, i) => ({
            date: day.date,
            change: (day.close - dailyPrices[i].close) / dailyPrices[i].close * 100
          }));
          const matchedData = [];
          priceChanges.forEach((pc) => {
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
          const n = matchedData.length;
          const sumX = matchedData.reduce((sum, d) => sum + d.priceChange, 0);
          const sumY = matchedData.reduce((sum, d) => sum + d.sentiment, 0);
          const sumXY = matchedData.reduce((sum, d) => sum + d.priceChange * d.sentiment, 0);
          const sumX2 = matchedData.reduce((sum, d) => sum + d.priceChange ** 2, 0);
          const sumY2 = matchedData.reduce((sum, d) => sum + d.sentiment ** 2, 0);
          const correlation = (n * sumXY - sumX * sumY) / Math.sqrt((n * sumX2 - sumX ** 2) * (n * sumY2 - sumY ** 2));
          const absCorr = Math.abs(correlation);
          const strength = absCorr > 0.7 ? "strong" : absCorr > 0.4 ? "moderate" : "weak";
          const lag = absCorr > 0.4 ? "concurrent" : "concurrent";
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
      async getCompanyOverview(symbol) {
        try {
          const url = `${this.baseUrl}?function=OVERVIEW&symbol=${symbol}&apikey=${this.apiKey}`;
          const cacheKey = `overview_${symbol}`;
          const data = await this.fetchWithCache(url, cacheKey);
          if (!data.Symbol) {
            console.log(`[StockService] No overview data available for ${symbol}`);
            return null;
          }
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
            quickRatio: parseFloat(data.QuickRatio) || null
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
      async getIncomeStatement(symbol) {
        try {
          const url = `${this.baseUrl}?function=INCOME_STATEMENT&symbol=${symbol}&apikey=${this.apiKey}`;
          const cacheKey = `income_${symbol}`;
          const data = await this.fetchWithCache(url, cacheKey);
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
            ebitda: latest.ebitda || null
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
      async getBalanceSheet(symbol) {
        try {
          const url = `${this.baseUrl}?function=BALANCE_SHEET&symbol=${symbol}&apikey=${this.apiKey}`;
          const cacheKey = `balance_${symbol}`;
          const data = await this.fetchWithCache(url, cacheKey);
          if (!data.quarterlyReports || data.quarterlyReports.length === 0) {
            console.log(`[StockService] No balance sheet data available for ${symbol}`);
            return null;
          }
          const latest = data.quarterlyReports[0];
          return {
            totalAssets: latest.totalAssets || null,
            totalLiabilities: latest.totalLiabilities || null,
            totalShareholderEquity: latest.totalShareholderEquity || null
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
      async getCashFlow(symbol) {
        try {
          const url = `${this.baseUrl}?function=CASH_FLOW&symbol=${symbol}&apikey=${this.apiKey}`;
          const cacheKey = `cashflow_${symbol}`;
          const data = await this.fetchWithCache(url, cacheKey);
          if (!data.quarterlyReports || data.quarterlyReports.length === 0) {
            console.log(`[StockService] No cash flow data available for ${symbol}`);
            return null;
          }
          const latest = data.quarterlyReports[0];
          const operatingCashflow = parseFloat(latest.operatingCashflow || "0");
          const capex = parseFloat(latest.capitalExpenditures || "0");
          const freeCashFlow = operatingCashflow - Math.abs(capex);
          return {
            operatingCashflow: latest.operatingCashflow || null,
            capitalExpenditures: latest.capitalExpenditures || null,
            freeCashFlow: freeCashFlow.toString()
          };
        } catch (error) {
          console.error(`[StockService] Error fetching cash flow for ${symbol}:`, error);
          return null;
        }
      }
      /**
       * Get comprehensive fundamental data combining all sources
       */
      async getComprehensiveFundamentals(symbol) {
        try {
          console.log(`[StockService] Fetching comprehensive fundamental data for ${symbol}...`);
          const overview = await this.getCompanyOverview(symbol);
          const income = await this.getIncomeStatement(symbol);
          const balance = await this.getBalanceSheet(symbol);
          const cashflow = await this.getCashFlow(symbol);
          return {
            ...overview,
            ...income,
            ...balance,
            ...cashflow
          };
        } catch (error) {
          console.error(`[StockService] Error fetching comprehensive fundamentals for ${symbol}:`, error);
          return null;
        }
      }
    };
    stockService = new StockService();
  }
});

// package.json
var require_package = __commonJS({
  "package.json"(exports, module) {
    module.exports = {
      name: "rest-express",
      version: "1.0.0",
      type: "module",
      license: "MIT",
      scripts: {
        dev: "NODE_ENV=development tsx server/index.ts",
        build: "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
        start: "NODE_ENV=production node dist/index.js",
        check: "tsc",
        "db:push": "drizzle-kit push"
      },
      dependencies: {
        "@hookform/resolvers": "^3.10.0",
        "@inquirer/prompts": "^7.9.0",
        "@jridgewell/trace-mapping": "^0.3.31",
        "@neondatabase/serverless": "^0.10.4",
        "@paypal/checkout-server-sdk": "^1.0.3",
        "@radix-ui/react-accordion": "^1.2.12",
        "@radix-ui/react-alert-dialog": "^1.1.15",
        "@radix-ui/react-aspect-ratio": "^1.1.7",
        "@radix-ui/react-avatar": "^1.1.10",
        "@radix-ui/react-checkbox": "^1.3.3",
        "@radix-ui/react-collapsible": "^1.1.12",
        "@radix-ui/react-context-menu": "^2.2.16",
        "@radix-ui/react-dialog": "^1.1.15",
        "@radix-ui/react-dropdown-menu": "^2.1.16",
        "@radix-ui/react-hover-card": "^1.1.15",
        "@radix-ui/react-label": "^2.1.7",
        "@radix-ui/react-menubar": "^1.1.16",
        "@radix-ui/react-navigation-menu": "^1.2.14",
        "@radix-ui/react-popover": "^1.1.15",
        "@radix-ui/react-progress": "^1.1.7",
        "@radix-ui/react-radio-group": "^1.3.8",
        "@radix-ui/react-scroll-area": "^1.2.10",
        "@radix-ui/react-select": "^2.2.6",
        "@radix-ui/react-separator": "^1.1.7",
        "@radix-ui/react-slider": "^1.3.6",
        "@radix-ui/react-slot": "^1.2.3",
        "@radix-ui/react-switch": "^1.2.6",
        "@radix-ui/react-tabs": "^1.1.13",
        "@radix-ui/react-toast": "^1.2.15",
        "@radix-ui/react-toggle": "^1.1.10",
        "@radix-ui/react-toggle-group": "^1.1.11",
        "@radix-ui/react-tooltip": "^1.2.8",
        "@tanstack/react-query": "^5.90.6",
        "@types/bcryptjs": "^2.4.6",
        "@types/node-telegram-bot-api": "^0.64.12",
        "@vitest/ui": "^4.0.8",
        axios: "^1.13.1",
        bcryptjs: "^3.0.3",
        "class-variance-authority": "^0.7.1",
        clsx: "^2.1.1",
        cmdk: "^1.1.1",
        "connect-pg-simple": "^10.0.0",
        cookie: "^1.0.2",
        "date-fns": "^3.6.0",
        "drizzle-orm": "^0.39.3",
        "drizzle-zod": "^0.7.1",
        "embla-carousel-react": "^8.6.0",
        express: "^4.21.2",
        "express-session": "^1.18.2",
        "framer-motion": "^11.18.2",
        input: "^1.0.1",
        "input-otp": "^1.4.2",
        "lucide-react": "^0.453.0",
        memorystore: "^1.6.7",
        "next-themes": "^0.4.6",
        "node-telegram-bot-api": "^0.66.0",
        openai: "^6.7.0",
        passport: "^0.7.0",
        "passport-local": "^1.0.0",
        react: "^18.3.1",
        "react-day-picker": "^8.10.1",
        "react-dom": "^18.3.1",
        "react-hook-form": "^7.66.0",
        "react-icons": "^5.5.0",
        "react-joyride": "^2.9.3",
        "react-resizable-panels": "^2.1.9",
        recharts: "^2.15.4",
        "rss-parser": "^3.13.0",
        "tailwind-merge": "^2.6.0",
        "tailwindcss-animate": "^1.0.7",
        telegram: "^2.26.22",
        "tw-animate-css": "^1.4.0",
        vaul: "^1.1.2",
        vitest: "^4.0.8",
        wouter: "^3.7.1",
        ws: "^8.18.3",
        zod: "^3.25.76",
        "zod-validation-error": "^3.5.3"
      },
      devDependencies: {
        "@replit/vite-plugin-cartographer": "^0.4.1",
        "@replit/vite-plugin-dev-banner": "^0.1.1",
        "@replit/vite-plugin-runtime-error-modal": "^0.0.3",
        "@tailwindcss/typography": "^0.5.15",
        "@tailwindcss/vite": "^4.1.3",
        "@types/connect-pg-simple": "^7.0.3",
        "@types/express": "4.17.21",
        "@types/express-session": "^1.18.0",
        "@types/node": "20.16.11",
        "@types/passport": "^1.0.16",
        "@types/passport-local": "^1.0.38",
        "@types/react": "^18.3.11",
        "@types/react-dom": "^18.3.1",
        "@types/ws": "^8.5.13",
        "@vitejs/plugin-react": "^4.7.0",
        autoprefixer: "^10.4.20",
        "drizzle-kit": "^0.31.4",
        esbuild: "^0.25.0",
        postcss: "^8.4.47",
        tailwindcss: "^3.4.17",
        tsx: "^4.20.5",
        typescript: "5.6.3",
        vite: "^5.4.20"
      },
      optionalDependencies: {
        bufferutil: "^4.0.8"
      }
    };
  }
});

// server/macroAgentService.ts
var macroAgentService_exports = {};
__export(macroAgentService_exports, {
  integrateScores: () => integrateScores,
  runMacroAnalysis: () => runMacroAnalysis
});
import OpenAI3 from "openai";
async function fetchMarketNewsSentiment() {
  try {
    const response = await fetch(
      `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&topics=economy_macro,technology,finance&limit=10&apikey=${ALPHA_VANTAGE_API_KEY}`
    );
    await new Promise((resolve) => setTimeout(resolve, 1e3));
    const data = await response.json();
    if (!data.feed || !Array.isArray(data.feed)) {
      return [];
    }
    return data.feed.slice(0, 5).map((item) => ({
      title: item.title || "",
      snippet: item.summary?.substring(0, 150) || "",
      sentiment: item.overall_sentiment_label || "neutral"
    }));
  } catch (error) {
    console.warn("[MacroAgent] Market news fetch failed:", error);
    return [];
  }
}
async function fetchEconomicIndicators() {
  try {
    const delays = [0, 900, 1800, 2700];
    const [fedData, cpiData, unemploymentData, gdpData] = await Promise.all([
      // Fed Funds Rate
      (async () => {
        await new Promise((resolve) => setTimeout(resolve, delays[0]));
        const response = await fetch(
          `https://www.alphavantage.co/query?function=FEDERAL_FUNDS_RATE&apikey=${ALPHA_VANTAGE_API_KEY}`
        );
        return response.json();
      })(),
      // CPI (inflation)
      (async () => {
        await new Promise((resolve) => setTimeout(resolve, delays[1]));
        const response = await fetch(
          `https://www.alphavantage.co/query?function=CPI&apikey=${ALPHA_VANTAGE_API_KEY}`
        );
        return response.json();
      })(),
      // Unemployment
      (async () => {
        await new Promise((resolve) => setTimeout(resolve, delays[2]));
        const response = await fetch(
          `https://www.alphavantage.co/query?function=UNEMPLOYMENT&apikey=${ALPHA_VANTAGE_API_KEY}`
        );
        return response.json();
      })(),
      // Real GDP
      (async () => {
        await new Promise((resolve) => setTimeout(resolve, delays[3]));
        const response = await fetch(
          `https://www.alphavantage.co/query?function=REAL_GDP&apikey=${ALPHA_VANTAGE_API_KEY}`
        );
        return response.json();
      })()
    ]);
    await new Promise((resolve) => setTimeout(resolve, 1e3));
    return {
      fedFundsRate: fedData.data?.[0]?.value ? parseFloat(fedData.data[0].value) : void 0,
      inflationRate: cpiData.data?.[0]?.value ? parseFloat(cpiData.data[0].value) : void 0,
      unemploymentRate: unemploymentData.data?.[0]?.value ? parseFloat(unemploymentData.data[0].value) : void 0,
      gdpGrowth: gdpData.data?.[0]?.value ? parseFloat(gdpData.data[0].value) : void 0
    };
  } catch (error) {
    console.warn("[MacroAgent] Economic indicators fetch failed:", error);
    return {};
  }
}
async function fetchMarketIndices() {
  console.log("[MacroAgent] Fetching market indices...");
  try {
    const sp500Response = await fetch(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=SPY&apikey=${ALPHA_VANTAGE_API_KEY}`
    );
    await new Promise((resolve) => setTimeout(resolve, 1e3));
    const sp500Data = await sp500Response.json();
    const sp500Price = parseFloat(sp500Data["Global Quote"]?.["05. price"] || "0");
    const sp500Change = parseFloat(sp500Data["Global Quote"]?.["10. change percent"]?.replace("%", "") || "0");
    const vixResponse = await fetch(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=^VIX&apikey=${ALPHA_VANTAGE_API_KEY}`
    );
    await new Promise((resolve) => setTimeout(resolve, 1e3));
    const vixData = await vixResponse.json();
    const vixLevel = parseFloat(vixData["Global Quote"]?.["05. price"] || "20");
    const sectors = [
      { symbol: "XLK", name: "Technology" },
      { symbol: "XLF", name: "Financials" },
      { symbol: "XLE", name: "Energy" },
      { symbol: "XLV", name: "Healthcare" },
      { symbol: "XLI", name: "Industrials" }
    ];
    const sectorPerformance = await Promise.all(
      sectors.map(async (sector) => {
        const response = await fetch(
          `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${sector.symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`
        );
        await new Promise((resolve) => setTimeout(resolve, 1e3));
        const data = await response.json();
        const change = parseFloat(data["Global Quote"]?.["10. change percent"]?.replace("%", "") || "0");
        const currentPrice = parseFloat(data["Global Quote"]?.["05. price"] || "0");
        return {
          sector: sector.name,
          etfSymbol: sector.symbol,
          performance: Math.abs(change) > 1 ? change > 0 ? "strong" : "weak" : "moderate",
          trend: change > 0.5 ? "up" : change < -0.5 ? "down" : "flat",
          currentPrice: currentPrice > 0 ? currentPrice : void 0,
          changePercent: change
        };
      })
    );
    console.log("[MacroAgent] Fetching economic indicators and market news...");
    const [economicIndicators, webNews] = await Promise.all([
      fetchEconomicIndicators(),
      fetchMarketNewsSentiment()
    ]);
    return {
      sp500: {
        level: sp500Price,
        change: sp500Change,
        trend: sp500Change > 1 ? "bullish" : sp500Change < -1 ? "bearish" : "neutral"
      },
      vix: {
        level: vixLevel,
        interpretation: vixLevel < 15 ? "low_fear" : vixLevel < 20 ? "moderate_fear" : vixLevel < 30 ? "high_fear" : "extreme_fear"
      },
      sectorPerformance,
      economicIndicators,
      webNews: webNews.length > 0 ? webNews : void 0
    };
  } catch (error) {
    console.error("[MacroAgent] Error fetching market data:", error);
    throw error;
  }
}
function normalizeIndustry(industry) {
  if (!industry || industry === "N/A") return null;
  return industry.toLowerCase().trim();
}
function calculateStdDev(values) {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squaredDiffs = values.map((val) => Math.pow(val - mean, 2));
  const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  return Math.sqrt(variance);
}
async function fetchDetailedETFData(etfSymbol, sp500Change) {
  try {
    console.log(`[MacroAgent] Fetching detailed data for ${etfSymbol}...`);
    const response = await fetch(
      `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${etfSymbol}&apikey=${ALPHA_VANTAGE_API_KEY}&outputsize=compact`
    );
    await new Promise((resolve) => setTimeout(resolve, 1e3));
    const data = await response.json();
    const timeSeries = data["Time Series (Daily)"];
    if (!timeSeries) {
      console.warn(`[MacroAgent] No time series data for ${etfSymbol}`);
      return null;
    }
    const dates = Object.keys(timeSeries).sort().reverse();
    if (dates.length < 22) {
      console.warn(`[MacroAgent] Insufficient data for ${etfSymbol}`);
      return null;
    }
    const prices = dates.map((date) => parseFloat(timeSeries[date]["4. close"]));
    const currentPrice = prices[0];
    const weekAgoPrice = prices[5] || prices[prices.length - 1];
    const monthAgoPrice = prices[21] || prices[prices.length - 1];
    const dayChange = (currentPrice - prices[1]) / prices[1] * 100;
    const weekChange = (currentPrice - weekAgoPrice) / weekAgoPrice * 100;
    const monthChange = (currentPrice - monthAgoPrice) / monthAgoPrice * 100;
    const returns = [];
    for (let i = 0; i < Math.min(21, prices.length - 1); i++) {
      returns.push((prices[i] - prices[i + 1]) / prices[i + 1] * 100);
    }
    const volatility = calculateStdDev(returns) * Math.sqrt(252);
    const relativeStrength = dayChange - sp500Change;
    const recentReturns = returns.slice(0, 5);
    const momentum = recentReturns.reduce((sum, r) => sum + r, 0) / recentReturns.length;
    return {
      currentPrice,
      dayChange,
      weekChange,
      monthChange,
      volatility,
      relativeStrength,
      momentum
    };
  } catch (error) {
    console.warn(`[MacroAgent] Error fetching detailed data for ${etfSymbol}:`, error);
    return null;
  }
}
async function runMacroAnalysis(industry) {
  const industryLabel = industry || "General Market";
  console.log(`[MacroAgent] Starting macro economic analysis for ${industryLabel}...`);
  let sanitizedResponse = "";
  try {
    const marketData = await fetchMarketIndices();
    let industrySectorAnalysis = void 0;
    const normalizedIndustry = normalizeIndustry(industry);
    if (normalizedIndustry && INDUSTRY_ETF_MAP[normalizedIndustry]) {
      const etfSymbol = INDUSTRY_ETF_MAP[normalizedIndustry];
      console.log(`[MacroAgent] Fetching detailed sector data for ${industry} \u2192 ${normalizedIndustry} (${etfSymbol})...`);
      const detailedData = await fetchDetailedETFData(etfSymbol, marketData.sp500.change);
      if (detailedData) {
        const normalizedRS = (detailedData.relativeStrength + 3) / 6 * 50;
        const relativeStrengthWeight = Math.min(Math.max(normalizedRS, 0), 50);
        const normalizedMomentum = (detailedData.momentum + 1.5) / 3 * 30;
        const momentumWeight = Math.min(Math.max(normalizedMomentum, 0), 30);
        const normalizedVolatility = (40 - detailedData.volatility) / 30 * 20;
        const volatilityWeight = Math.min(Math.max(normalizedVolatility, 0), 20);
        const sectorWeight = Math.round(relativeStrengthWeight + momentumWeight + volatilityWeight);
        console.log(`[MacroAgent] Sector Weight Calculation for ${etfSymbol}:`);
        console.log(`  - Relative Strength: ${detailedData.relativeStrength.toFixed(2)}% \u2192 ${relativeStrengthWeight.toFixed(1)} pts (max 50)`);
        console.log(`  - Momentum: ${detailedData.momentum.toFixed(2)}% \u2192 ${momentumWeight.toFixed(1)} pts (max 30)`);
        console.log(`  - Volatility: ${detailedData.volatility.toFixed(1)}% \u2192 ${volatilityWeight.toFixed(1)} pts (max 20)`);
        console.log(`  - Total Sector Weight: ${sectorWeight}/100`);
        const sectorExplanation = `${industry} sector (${etfSymbol}) is ${detailedData.relativeStrength > 1 ? "significantly outperforming" : detailedData.relativeStrength > 0 ? "slightly outperforming" : detailedData.relativeStrength > -1 ? "slightly underperforming" : "significantly underperforming"} the broader market with ${detailedData.relativeStrength > 0 ? "+" : ""}${detailedData.relativeStrength.toFixed(2)}% relative strength. ${detailedData.momentum > 0.5 ? "Strong positive" : detailedData.momentum > 0 ? "Moderate positive" : detailedData.momentum > -0.5 ? "Weak negative" : "Strong negative"} momentum (${detailedData.momentum.toFixed(2)}%). Volatility is ${detailedData.volatility > 25 ? "elevated" : detailedData.volatility > 15 ? "moderate" : "low"} at ${detailedData.volatility.toFixed(1)}% annualized. Sector weight: ${sectorWeight}/100 (${sectorWeight > 70 ? "high influence" : sectorWeight > 40 ? "moderate influence" : "low influence"} on analysis).`;
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
          sectorExplanation
        };
        console.log(`[MacroAgent] Sector Analysis: ${sectorExplanation}`);
      }
    }
    const industryContext = industrySectorAnalysis ? `

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
INDUSTRY-SPECIFIC SECTOR ANALYSIS FOR: ${industry}
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

SECTOR ETF: ${industrySectorAnalysis.etfSymbol} - ${industrySectorAnalysis.sectorName}

PERFORMANCE METRICS:
- Current Price: $${industrySectorAnalysis.currentPrice.toFixed(2)}
- Daily Change: ${industrySectorAnalysis.dayChange > 0 ? "+" : ""}${industrySectorAnalysis.dayChange.toFixed(2)}%
- Week Change: ${industrySectorAnalysis.weekChange > 0 ? "+" : ""}${industrySectorAnalysis.weekChange.toFixed(2)}%
- Month Change: ${industrySectorAnalysis.monthChange > 0 ? "+" : ""}${industrySectorAnalysis.monthChange.toFixed(2)}%

SECTOR STRENGTH ANALYSIS:
- Relative Strength vs S&P 500: ${industrySectorAnalysis.relativeStrength > 0 ? "+" : ""}${industrySectorAnalysis.relativeStrength.toFixed(2)}% ${industrySectorAnalysis.relativeStrength > 1 ? "(SIGNIFICANTLY OUTPERFORMING \u2713)" : industrySectorAnalysis.relativeStrength > 0 ? "(Outperforming \u2713)" : industrySectorAnalysis.relativeStrength > -1 ? "(Underperforming \u2717)" : "(SIGNIFICANTLY UNDERPERFORMING \u2717\u2717)"}
- Momentum (5-day): ${industrySectorAnalysis.momentum > 0 ? "+" : ""}${industrySectorAnalysis.momentum.toFixed(2)}% ${industrySectorAnalysis.momentum > 0.5 ? "(STRONG POSITIVE \u2B06)" : industrySectorAnalysis.momentum > 0 ? "(Positive \u2197)" : industrySectorAnalysis.momentum > -0.5 ? "(Weak \u2198)" : "(NEGATIVE \u2B07)"}
- Volatility (annualized): ${industrySectorAnalysis.volatility.toFixed(1)}% ${industrySectorAnalysis.volatility > 25 ? "(HIGH VOLATILITY \u26A0)" : industrySectorAnalysis.volatility > 15 ? "(Moderate)" : "(Low \u2713)"}

SECTOR WEIGHT: ${industrySectorAnalysis.sectorWeight}/100 ${industrySectorAnalysis.sectorWeight > 70 ? "(HIGH INFLUENCE - PRIORITIZE SECTOR TRENDS)" : industrySectorAnalysis.sectorWeight > 40 ? "(MODERATE INFLUENCE)" : "(LOW INFLUENCE - GENERAL MARKET MATTERS MORE)"}

AUTOMATED SECTOR SUMMARY:
${industrySectorAnalysis.sectorExplanation}

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
CRITICAL GUIDANCE FOR YOUR ANALYSIS:
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

1. SECTOR WEIGHT INTERPRETATION:
   - ${industrySectorAnalysis.sectorWeight > 70 ? "This sector is showing VERY STRONG signals - prioritize sector-specific trends heavily in your recommendation" : industrySectorAnalysis.sectorWeight > 40 ? "This sector has MODERATE influence - balance sector and general market conditions" : "This sector is showing WEAK signals - rely more on general market conditions"}

2. RELATIVE STRENGTH MATTERS:
   - Sector is ${industrySectorAnalysis.relativeStrength > 0 ? "OUTPERFORMING" : "UNDERPERFORMING"} the market
   - This ${industrySectorAnalysis.relativeStrength > 1 || industrySectorAnalysis.relativeStrength < -1 ? "STRONGLY" : "moderately"} affects ${industry} stock recommendations

3. MOMENTUM SIGNALS:
   - ${industrySectorAnalysis.momentum > 0.5 ? "Strong positive momentum suggests continued strength - favorable for BUY recommendations" : industrySectorAnalysis.momentum > 0 ? "Moderate positive momentum - cautiously favorable" : industrySectorAnalysis.momentum > -0.5 ? "Weak momentum - neutral to slightly negative" : "Strong negative momentum - unfavorable for BUY, consider lower scores"}

4. VOLATILITY CONSIDERATIONS:
   - ${industrySectorAnalysis.volatility > 25 ? "HIGH volatility indicates increased risk - consider lowering recommendation strength" : industrySectorAnalysis.volatility > 15 ? "Moderate volatility - normal market conditions" : "Low volatility - stable sector, favorable for recommendations"}

YOUR SECTOR-SPECIFIC RECOMMENDATION MUST:
- Explain how the sector's ${industrySectorAnalysis.sectorWeight}/100 weight influenced your decision
- Address the ${industrySectorAnalysis.relativeStrength > 0 ? "outperformance" : "underperformance"} relative to the market
- Consider the ${industrySectorAnalysis.momentum > 0 ? "positive" : "negative"} momentum trend
- Account for the ${industrySectorAnalysis.volatility > 20 ? "elevated" : "moderate"} volatility level
` : industry ? `

INDUSTRY-SPECIFIC ANALYSIS FOR: ${industry}
- No detailed sector ETF data available
- Rely primarily on general market conditions for this analysis` : "";
    const economicContext = marketData.economicIndicators && Object.keys(marketData.economicIndicators).length > 0 ? `

ECONOMIC INDICATORS (Latest Data):
${marketData.economicIndicators.fedFundsRate ? `- Federal Funds Rate: ${marketData.economicIndicators.fedFundsRate.toFixed(2)}%` : ""}
${marketData.economicIndicators.inflationRate ? `- CPI (Inflation): ${marketData.economicIndicators.inflationRate}` : ""}
${marketData.economicIndicators.unemploymentRate ? `- Unemployment Rate: ${marketData.economicIndicators.unemploymentRate.toFixed(1)}%` : ""}
${marketData.economicIndicators.gdpGrowth ? `- Real GDP: $${(marketData.economicIndicators.gdpGrowth / 1e3).toFixed(2)}T` : ""}

These economic indicators provide crucial context for the 1-2 week market outlook. Consider their impact on investor sentiment and near-term market direction.` : "";
    const newsContext = marketData.webNews && marketData.webNews.length > 0 ? `

RECENT MARKET NEWS SENTIMENT (Alpha Vantage):
${marketData.webNews.map((news, idx) => `${idx + 1}. [${news.sentiment.toUpperCase()}] ${news.title}`).join("\n")}

News sentiment analysis shows the current market narrative and investor psychology. Use this to gauge near-term sentiment trends.` : "";
    const prompt = `You are a seasoned macro economist and market strategist analyzing current market conditions to provide guidance for equity investors${industry ? ` in the ${industry} sector` : ""}.

INVESTMENT HORIZON: 1-2 weeks (short-term trading window)

MARKET DATA:
- S&P 500 Level: ${marketData.sp500.level} (${marketData.sp500.change > 0 ? "+" : ""}${marketData.sp500.change.toFixed(2)}%)
- VIX (Fear Index): ${marketData.vix.level} (${marketData.vix.interpretation})
- Sector Performance: ${JSON.stringify(marketData.sectorPerformance, null, 2)}${economicContext}${newsContext}${industryContext}

YOUR ANALYSIS MUST INCLUDE TWO PARTS:

PART 1: GENERAL MARKET ANALYSIS (1-2 week outlook)
- What is the overall market sentiment and momentum for the next 1-2 weeks?
- Are there near-term catalysts (earnings, Fed announcements, economic data) upcoming?
- What is the short-term risk/reward profile?

PART 2: SECTOR-SPECIFIC ANALYSIS${industry ? ` FOR ${industry.toUpperCase()}` : " (if applicable)"}
${industry ? `- How is the ${industry} sector positioned for the next 1-2 weeks?
- Is it showing relative strength or weakness vs the broader market?
- Are there sector-specific catalysts or headwinds in the near term?` : "- General sector rotation patterns for the next 1-2 weeks"}

REQUIRED OUTPUT:

1. **macroScore** (0-100): Overall health of the market${industry ? ` and ${industry} sector` : ""} for the 1-2 week horizon

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
    const completion = await openai3.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a macro economic analyst providing market-wide analysis. Always respond with valid JSON only, no markdown or additional text."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3
    });
    let responseText = completion.choices[0].message.content || "{}";
    sanitizedResponse = responseText;
    sanitizedResponse = sanitizedResponse.trim();
    if (sanitizedResponse.startsWith("```")) {
      sanitizedResponse = sanitizedResponse.replace(/^```(?:json|JSON)?\s*\n?/, "");
      sanitizedResponse = sanitizedResponse.replace(/\n?```\s*$/, "");
      sanitizedResponse = sanitizedResponse.trim();
    }
    console.log(`[MacroAgent] Parsing JSON response (${sanitizedResponse.length} chars)...`);
    const analysis = JSON.parse(sanitizedResponse);
    const macroScore = typeof analysis.macroScore === "number" && !isNaN(analysis.macroScore) ? Math.max(0, Math.min(100, Math.round(analysis.macroScore))) : 50;
    const recommendation = (analysis.recommendation || "neutral").toLowerCase();
    const validRecommendations = ["good", "neutral", "risky", "bad"];
    const finalRecommendation = validRecommendations.includes(recommendation) ? recommendation : "neutral";
    const MACRO_MULTIPLIERS = {
      "good": 1.1,
      // 10% boost for favorable conditions
      "neutral": 1,
      // No adjustment
      "risky": 0.8,
      // 20% penalty for uncertain conditions
      "bad": 0.6
      // 40% penalty for unfavorable conditions
    };
    const macroFactor = MACRO_MULTIPLIERS[finalRecommendation];
    console.log(`[MacroAgent] Analysis complete. Macro Score: ${macroScore} Recommendation: ${finalRecommendation} Factor: ${macroFactor}`);
    if (recommendation !== finalRecommendation) {
      console.warn(`[MacroAgent] Invalid recommendation "${recommendation}" - defaulted to "neutral"`);
    }
    return {
      industry: industry || null,
      status: "completed",
      macroScore,
      macroFactor: macroFactor.toFixed(2),
      summary: analysis.summary,
      sp500Level: marketData.sp500.level.toFixed(2),
      sp500Change: marketData.sp500.change.toFixed(2),
      sp500Trend: marketData.sp500.trend,
      vixLevel: marketData.vix.level.toFixed(2),
      vixInterpretation: marketData.vix.interpretation,
      economicIndicators: marketData.economicIndicators || {},
      sectorPerformance: marketData.sectorPerformance,
      industrySectorAnalysis: industrySectorAnalysis || void 0,
      marketCondition: analysis.marketCondition,
      marketPhase: analysis.marketPhase,
      riskAppetite: analysis.riskAppetite,
      keyThemes: analysis.keyThemes,
      opportunities: analysis.opportunities,
      risks: analysis.risks,
      recommendation: finalRecommendation,
      // Categorical: "good", "neutral", "risky", "bad"
      analyzedAt: /* @__PURE__ */ new Date(),
      errorMessage: null
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[MacroAgent] Error during analysis:", error);
    if (errorMessage.includes("JSON") || errorMessage.includes("parse")) {
      console.error("[MacroAgent] JSON parse failed. Check OpenAI response format.");
      const preview = sanitizedResponse?.substring(0, 500) || "No response available";
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
      industrySectorAnalysis: void 0,
      marketCondition: null,
      marketPhase: null,
      riskAppetite: null,
      keyThemes: null,
      opportunities: null,
      risks: null,
      recommendation: null,
      analyzedAt: /* @__PURE__ */ new Date(),
      errorMessage: error instanceof Error ? error.message : "Unknown error during macro analysis"
    };
  }
}
function integrateScores(microScore, macroFactor) {
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
var openai3, ALPHA_VANTAGE_API_KEY, INDUSTRY_ETF_MAP;
var init_macroAgentService = __esm({
  "server/macroAgentService.ts"() {
    "use strict";
    openai3 = new OpenAI3({
      apiKey: process.env.OPENAI_API_KEY
    });
    ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;
    INDUSTRY_ETF_MAP = {
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
      "media": "XLC"
    };
  }
});

// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  adminNotifications: () => adminNotifications,
  aiAnalysisJobs: () => aiAnalysisJobs,
  announcementReads: () => announcementReads,
  announcements: () => announcements,
  backtestJobs: () => backtestJobs,
  backtestPriceData: () => backtestPriceData,
  backtestScenarios: () => backtestScenarios,
  backtests: () => backtests,
  dailyBriefs: () => dailyBriefs,
  featureSuggestions: () => featureSuggestions,
  featureVotes: () => featureVotes,
  followedStocks: () => followedStocks,
  ibkrConfig: () => ibkrConfig,
  insertAdminNotificationSchema: () => insertAdminNotificationSchema,
  insertAiAnalysisJobSchema: () => insertAiAnalysisJobSchema,
  insertAnnouncementReadSchema: () => insertAnnouncementReadSchema,
  insertAnnouncementSchema: () => insertAnnouncementSchema,
  insertBacktestJobSchema: () => insertBacktestJobSchema,
  insertBacktestPriceDataSchema: () => insertBacktestPriceDataSchema,
  insertBacktestScenarioSchema: () => insertBacktestScenarioSchema,
  insertBacktestSchema: () => insertBacktestSchema,
  insertCompoundRuleSchema: () => insertCompoundRuleSchema,
  insertDailyBriefSchema: () => insertDailyBriefSchema,
  insertFeatureSuggestionSchema: () => insertFeatureSuggestionSchema,
  insertFeatureVoteSchema: () => insertFeatureVoteSchema,
  insertFollowedStockSchema: () => insertFollowedStockSchema,
  insertIbkrConfigSchema: () => insertIbkrConfigSchema,
  insertInsiderProfileSchema: () => insertInsiderProfileSchema,
  insertMacroAnalysisSchema: () => insertMacroAnalysisSchema,
  insertManualOverrideSchema: () => insertManualOverrideSchema,
  insertNotificationSchema: () => insertNotificationSchema,
  insertOpeninsiderConfigSchema: () => insertOpeninsiderConfigSchema,
  insertPasswordResetTokenSchema: () => insertPasswordResetTokenSchema,
  insertPaymentSchema: () => insertPaymentSchema,
  insertPortfolioHoldingSchema: () => insertPortfolioHoldingSchema,
  insertRuleActionSchema: () => insertRuleActionSchema,
  insertRuleConditionGroupSchema: () => insertRuleConditionGroupSchema,
  insertRuleConditionSchema: () => insertRuleConditionSchema,
  insertRuleExecutionSchema: () => insertRuleExecutionSchema,
  insertStockAnalysisSchema: () => insertStockAnalysisSchema,
  insertStockCandlesticksSchema: () => insertStockCandlesticksSchema,
  insertStockCommentSchema: () => insertStockCommentSchema,
  insertStockSchema: () => insertStockSchema,
  insertStockViewSchema: () => insertStockViewSchema,
  insertTelegramConfigSchema: () => insertTelegramConfigSchema,
  insertTradeSchema: () => insertTradeSchema,
  insertTradingRuleSchema: () => insertTradingRuleSchema,
  insertUserSchema: () => insertUserSchema,
  insertUserStockStatusSchema: () => insertUserStockStatusSchema,
  insertUserTutorialSchema: () => insertUserTutorialSchema,
  insiderProfiles: () => insiderProfiles,
  macroAnalyses: () => macroAnalyses,
  manualOverrides: () => manualOverrides,
  notifications: () => notifications,
  openinsiderConfig: () => openinsiderConfig,
  passwordResetTokens: () => passwordResetTokens,
  payments: () => payments,
  portfolioHoldings: () => portfolioHoldings,
  ruleActions: () => ruleActions,
  ruleConditionGroups: () => ruleConditionGroups,
  ruleConditions: () => ruleConditions,
  ruleExecutions: () => ruleExecutions,
  stockAnalyses: () => stockAnalyses,
  stockCandlesticks: () => stockCandlesticks,
  stockComments: () => stockComments,
  stockSchema: () => stockSchema,
  stockViews: () => stockViews,
  stocks: () => stocks,
  telegramConfig: () => telegramConfig,
  trades: () => trades,
  tradingRules: () => tradingRules,
  userStockStatuses: () => userStockStatuses,
  userTutorials: () => userTutorials,
  users: () => users
});
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, integer, timestamp, boolean, jsonb, uniqueIndex, index } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
var stocks = pgTable("stocks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  // Per-tenant isolation with foreign key
  ticker: text("ticker").notNull(),
  // Removed .unique() to allow multiple transactions per company
  companyName: text("company_name").notNull(),
  currentPrice: decimal("current_price", { precision: 12, scale: 2 }).notNull(),
  // Real-time market price
  previousClose: decimal("previous_close", { precision: 12, scale: 2 }),
  insiderPrice: decimal("insider_price", { precision: 12, scale: 2 }),
  // Price at which insider transacted
  insiderQuantity: integer("insider_quantity"),
  // Number of shares insider transacted
  insiderTradeDate: text("insider_trade_date").notNull(),
  // Date when insider executed the transaction (required for uniqueness)
  insiderName: text("insider_name").notNull(),
  // Name of the insider who executed the transaction (required for uniqueness)
  insiderTitle: text("insider_title"),
  // Title of the insider (CEO, CFO, Director, etc.)
  marketPriceAtInsiderDate: decimal("market_price_at_insider_date", { precision: 12, scale: 2 }),
  // Market closing price on insider transaction date
  marketCap: text("market_cap"),
  peRatio: decimal("pe_ratio", { precision: 10, scale: 2 }),
  recommendation: text("recommendation").notNull(),
  // "buy", "sell" (insider transaction type) - required for uniqueness
  recommendationStatus: text("recommendation_status").default("pending"),
  // "pending", "approved", "rejected" - user review status
  source: text("source"),
  // "telegram" or "openinsider" - data source
  confidenceScore: integer("confidence_score"),
  // 0-100 data quality score - measures reliability of the data source
  priceHistory: jsonb("price_history").$type().default([]),
  // Last 7 days of prices
  // NOTE: Candlestick data moved to shared stockCandlesticks table (one record per ticker, reused across users)
  // Company information from Finnhub
  description: text("description"),
  // Company description/overview
  industry: text("industry"),
  // Company's industry sector
  country: text("country"),
  // Company's country
  webUrl: text("web_url"),
  // Company's website
  ipo: text("ipo"),
  // IPO date
  // Latest news articles
  news: jsonb("news").$type().default([]),
  // Insider sentiment (from Finnhub)
  insiderSentimentMspr: decimal("insider_sentiment_mspr", { precision: 10, scale: 4 }),
  // Monthly Share Purchase Ratio (-1 to 1)
  insiderSentimentChange: decimal("insider_sentiment_change", { precision: 10, scale: 4 }),
  // Change in MSPR from previous month
  microAnalysisCompleted: boolean("micro_analysis_completed").notNull().default(false),
  // Micro agent (fundamental) analysis completed
  macroAnalysisCompleted: boolean("macro_analysis_completed").notNull().default(false),
  // Macro agent (industry/sector) analysis completed
  combinedAnalysisCompleted: boolean("combined_analysis_completed").notNull().default(false),
  // Integrated score calculated
  lastUpdated: timestamp("last_updated").defaultNow(),
  rejectedAt: timestamp("rejected_at")
  // When the recommendation was rejected
}, (table) => ({
  // Unique constraint: Each transaction is unique per user by ticker + trade date + insider + type
  // This allows the same real-world transaction to exist in multiple users' isolated collections
  transactionUnique: uniqueIndex("stock_transaction_unique_idx").on(
    table.userId,
    table.ticker,
    table.insiderTradeDate,
    table.insiderName,
    table.recommendation
  ),
  // Index on userId for efficient per-tenant queries
  userIdIdx: index("stocks_user_id_idx").on(table.userId)
}));
var stockSchema = createSelectSchema(stocks);
var insertStockSchema = createInsertSchema(stocks).omit({ id: true, lastUpdated: true, recommendationStatus: true, rejectedAt: true });
var userStockStatuses = pgTable("user_stock_statuses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  ticker: text("ticker").notNull(),
  status: text("status").notNull().default("pending"),
  // "pending", "approved", "rejected", "dismissed"
  approvedAt: timestamp("approved_at"),
  rejectedAt: timestamp("rejected_at"),
  dismissedAt: timestamp("dismissed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => ({
  userTickerUnique: uniqueIndex("user_ticker_unique_idx").on(table.userId, table.ticker)
}));
var insertUserStockStatusSchema = createInsertSchema(userStockStatuses).omit({ id: true, createdAt: true, updatedAt: true });
var insiderProfiles = pgTable("insider_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  insiderName: text("insider_name").notNull().unique(),
  totalTrades: integer("total_trades").notNull().default(0),
  successfulTrades: integer("successful_trades").notNull().default(0),
  // Trades that resulted in profit
  winLossRatio: decimal("win_loss_ratio", { precision: 5, scale: 2 }),
  // % of successful trades (0-100)
  confidenceScore: integer("confidence_score").notNull().default(50),
  // 0-100 INSIDER TRACK RECORD - calculated from historical win/loss ratio of this specific insider's past trades
  averageReturn: decimal("average_return", { precision: 10, scale: 2 }),
  // Average % return across all trades
  previousDeals: jsonb("previous_deals").$type().default([]),
  lastUpdated: timestamp("last_updated").defaultNow(),
  createdAt: timestamp("created_at").defaultNow()
});
var insertInsiderProfileSchema = createInsertSchema(insiderProfiles).omit({ id: true, createdAt: true, lastUpdated: true });
var stockAnalyses = pgTable("stock_analyses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticker: text("ticker").notNull().unique(),
  status: text("status").notNull().default("pending"),
  // "pending", "analyzing", "completed", "failed"
  overallRating: text("overall_rating"),
  // "strong_buy", "buy", "hold", "avoid", "strong_avoid"
  confidenceScore: integer("confidence_score"),
  // 0-100 MICRO AGENT overall score - LLM analysis of SEC filings, Alpha Vantage fundamentals, technical indicators, and news sentiment
  summary: text("summary"),
  financialHealthScore: integer("financial_health_score"),
  // 0-100 MICRO AGENT financial health component - LLM assessment of balance sheet, income statement, and cash flow strength
  strengths: jsonb("strengths").$type(),
  weaknesses: jsonb("weaknesses").$type(),
  redFlags: jsonb("red_flags").$type(),
  // Technical Analysis (multi-signal enhancement)
  technicalAnalysisScore: integer("technical_analysis_score"),
  // 0-100
  technicalAnalysisTrend: text("technical_analysis_trend"),
  // "bullish", "bearish", "neutral"
  technicalAnalysisMomentum: text("technical_analysis_momentum"),
  // "strong", "moderate", "weak"
  technicalAnalysisSignals: jsonb("technical_analysis_signals").$type(),
  // Sentiment Analysis (multi-signal enhancement)
  sentimentAnalysisScore: integer("sentiment_analysis_score"),
  // 0-100
  sentimentAnalysisTrend: text("sentiment_analysis_trend"),
  // "positive", "negative", "neutral"
  sentimentAnalysisNewsVolume: text("sentiment_analysis_news_volume"),
  // "high", "medium", "low"
  sentimentAnalysisKeyThemes: jsonb("sentiment_analysis_key_themes").$type(),
  keyMetrics: jsonb("key_metrics").$type(),
  risks: jsonb("risks").$type(),
  opportunities: jsonb("opportunities").$type(),
  recommendation: text("recommendation"),
  analyzedAt: timestamp("analyzed_at"),
  errorMessage: text("error_message"),
  // Error message if analysis failed
  // SEC EDGAR Filing Data
  secFilingUrl: text("sec_filing_url"),
  // URL to latest 10-K or 10-Q filing
  secFilingType: text("sec_filing_type"),
  // "10-K", "10-Q", "8-K"
  secFilingDate: text("sec_filing_date"),
  // Date of the filing
  secCik: text("sec_cik"),
  // Company's CIK number for SEC lookups
  // SEC Filing Narrative Sections (extracted text)
  managementDiscussion: text("management_discussion"),
  // MD&A section
  riskFactors: text("risk_factors"),
  // Risk Factors section
  businessOverview: text("business_overview"),
  // Business section
  // Alpha Vantage Fundamental Data (structured financials)
  fundamentalData: jsonb("fundamental_data").$type(),
  fundamentalAnalysis: text("fundamental_analysis"),
  // AI's interpretation of the fundamental data
  // Macro Analysis Integration
  macroAnalysisId: varchar("macro_analysis_id").references(() => macroAnalyses.id),
  // Reference to the macro analysis used
  integratedScore: integer("integrated_score"),
  // Final score combining micro + macro (0-100)
  scoreAdjustment: text("score_adjustment"),
  // Explanation of how macro adjusted the score
  createdAt: timestamp("created_at").defaultNow()
});
var insertStockAnalysisSchema = createInsertSchema(stockAnalyses).omit({ id: true, createdAt: true });
var macroAnalyses = pgTable("macro_analyses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  industry: text("industry"),
  // Industry/sector being analyzed (e.g., "Banking", "Technology", "Healthcare")
  status: text("status").notNull().default("pending"),
  // "pending", "analyzing", "completed", "failed"
  macroScore: integer("macro_score"),
  // 0-100 overall macro economic health score
  macroFactor: decimal("macro_factor", { precision: 5, scale: 2 }),
  // 0.00-2.00 multiplier for micro scores (e.g., 0.67 = reduce, 1.2 = boost)
  summary: text("summary"),
  // High-level summary of macro conditions
  // Market Indices Data
  sp500Level: decimal("sp500_level", { precision: 12, scale: 2 }),
  sp500Change: decimal("sp500_change", { precision: 10, scale: 2 }),
  // % change
  sp500Trend: text("sp500_trend"),
  // "bullish", "bearish", "neutral"
  vixLevel: decimal("vix_level", { precision: 10, scale: 2 }),
  // Volatility index
  vixInterpretation: text("vix_interpretation"),
  // "low_fear", "moderate_fear", "high_fear", "extreme_fear"
  // Economic Indicators
  economicIndicators: jsonb("economic_indicators").$type(),
  // Sector Analysis
  sectorPerformance: jsonb("sector_performance").$type(),
  // Industry-Specific Sector Analysis (for the opportunity stock's sector)
  industrySectorAnalysis: jsonb("industry_sector_analysis").$type(),
  // Market Conditions
  marketCondition: text("market_condition"),
  // "bull", "bear", "sideways", "volatile"
  marketPhase: text("market_phase"),
  // "early_cycle", "mid_cycle", "late_cycle", "recession"
  riskAppetite: text("risk_appetite"),
  // "high", "moderate", "low"
  // AI Analysis
  keyThemes: jsonb("key_themes").$type(),
  opportunities: jsonb("opportunities").$type(),
  risks: jsonb("risks").$type(),
  recommendation: text("recommendation"),
  // Overall market recommendation
  analyzedAt: timestamp("analyzed_at"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow()
});
var insertMacroAnalysisSchema = createInsertSchema(macroAnalyses).omit({ id: true, createdAt: true });
var stockCandlesticks = pgTable("stock_candlesticks", {
  ticker: text("ticker").primaryKey(),
  // Ticker symbol (e.g., "AAPL")
  candlestickData: jsonb("candlestick_data").$type().notNull().default([]),
  // Last 14 trading days of OHLCV data
  lastUpdated: timestamp("last_updated").defaultNow(),
  createdAt: timestamp("created_at").defaultNow()
});
var insertStockCandlesticksSchema = createInsertSchema(stockCandlesticks).omit({ createdAt: true });
var aiAnalysisJobs = pgTable("ai_analysis_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticker: text("ticker").notNull(),
  source: text("source").notNull(),
  // "user_manual", "background_job", "bulk_import", etc.
  priority: text("priority").notNull().default("normal"),
  // "high", "normal", "low"
  status: text("status").notNull().default("pending"),
  // "pending", "processing", "completed", "failed", "cancelled"
  retryCount: integer("retry_count").notNull().default(0),
  maxRetries: integer("max_retries").notNull().default(3),
  scheduledAt: timestamp("scheduled_at").defaultNow(),
  // When job should be processed (for delayed retries)
  startedAt: timestamp("started_at"),
  // When processing began
  completedAt: timestamp("completed_at"),
  // When job finished (success or failure)
  errorMessage: text("error_message"),
  // Error details if failed
  currentStep: text("current_step"),
  // Current processing step: "fetching_data", "micro_analysis", "macro_analysis", "calculating_score", "completed"
  stepDetails: jsonb("step_details").$type(),
  lastError: text("last_error"),
  // Detailed error message for the current/last failed step
  createdAt: timestamp("created_at").defaultNow()
}, (table) => ({
  // Prevent duplicate active jobs for same ticker (race condition prevention)
  // Only one pending OR processing job allowed per ticker at a time
  activeJobUnique: uniqueIndex("active_job_unique_idx").on(table.ticker).where(sql`status IN ('pending', 'processing')`)
}));
var insertAiAnalysisJobSchema = createInsertSchema(aiAnalysisJobs).omit({
  id: true,
  createdAt: true,
  startedAt: true,
  completedAt: true
});
var portfolioHoldings = pgTable("portfolio_holdings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  ticker: text("ticker").notNull(),
  quantity: integer("quantity").notNull(),
  averagePurchasePrice: decimal("average_purchase_price", { precision: 12, scale: 2 }).notNull(),
  currentValue: decimal("current_value", { precision: 12, scale: 2 }),
  profitLoss: decimal("profit_loss", { precision: 12, scale: 2 }),
  profitLossPercent: decimal("profit_loss_percent", { precision: 10, scale: 2 }),
  isSimulated: boolean("is_simulated").notNull().default(false),
  // Track simulated vs real holdings
  lastUpdated: timestamp("last_updated").defaultNow()
});
var insertPortfolioHoldingSchema = createInsertSchema(portfolioHoldings).omit({
  id: true,
  currentValue: true,
  profitLoss: true,
  profitLossPercent: true,
  lastUpdated: true
});
var trades = pgTable("trades", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  ticker: text("ticker").notNull(),
  type: text("type").notNull(),
  // "buy" or "sell"
  quantity: integer("quantity").notNull(),
  price: decimal("price", { precision: 12, scale: 2 }).notNull(),
  total: decimal("total", { precision: 12, scale: 2 }).notNull(),
  status: text("status").notNull().default("completed"),
  // "pending", "completed", "failed"
  broker: text("broker").default("manual"),
  // "manual", "ibkr"
  ibkrOrderId: text("ibkr_order_id"),
  // IBKR order ID for tracking
  isSimulated: boolean("is_simulated").notNull().default(false),
  // Track simulated vs real trades
  executedAt: timestamp("executed_at").defaultNow(),
  n8nWorkflowId: text("n8n_workflow_id")
});
var insertTradeSchema = createInsertSchema(trades).omit({
  id: true
});
var tradingRules = pgTable("trading_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  // Made nullable during migration
  name: text("name").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  // Scope: "all_holdings", "specific_stock"
  scope: text("scope").notNull().default("all_holdings"),
  ticker: text("ticker"),
  // Only used when scope is "specific_stock"
  priority: integer("priority").notNull().default(1e3),
  // Lower = higher priority
  // Legacy fields for backward compatibility
  conditions: jsonb("conditions").$type(),
  action: text("action"),
  // "buy", "sell", "sell_all", "notify"
  actionParams: jsonb("action_params").$type(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var insertTradingRuleSchema = createInsertSchema(tradingRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true
}).extend({
  conditions: z.array(z.object({
    metric: z.string(),
    operator: z.string(),
    value: z.number(),
    logic: z.enum(["AND", "OR"]).optional(),
    baselinePrice: z.number().optional()
  })).optional()
});
var ruleConditionGroups = pgTable("rule_condition_groups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ruleId: varchar("rule_id").notNull().references(() => tradingRules.id, { onDelete: "cascade" }),
  groupOrder: integer("group_order").notNull(),
  // Order of evaluation
  junctionOperator: text("junction_operator"),
  // "AND" or "OR" to connect to NEXT group
  description: text("description"),
  // Human-readable description
  createdAt: timestamp("created_at").defaultNow()
});
var insertRuleConditionGroupSchema = createInsertSchema(ruleConditionGroups).omit({
  id: true,
  createdAt: true
});
var ruleConditions = pgTable("rule_conditions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: varchar("group_id").notNull().references(() => ruleConditionGroups.id, { onDelete: "cascade" }),
  // Metric types: "price_change_percent", "price_change_from_close_percent", "price_absolute", "days_held"
  metric: text("metric").notNull(),
  // Comparator: ">", "<", ">=", "<=", "=="
  comparator: text("comparator").notNull(),
  threshold: decimal("threshold", { precision: 12, scale: 4 }).notNull(),
  // The value to compare against
  // Time-based fields
  timeframeValue: integer("timeframe_value"),
  // e.g., 10 for "10 days"
  timeframeUnit: text("timeframe_unit"),
  // "days", "hours", "minutes"
  // Optional metadata for future extensibility
  metadata: jsonb("metadata").$type(),
  createdAt: timestamp("created_at").defaultNow()
});
var insertRuleConditionSchema = createInsertSchema(ruleConditions).omit({
  id: true,
  createdAt: true
});
var ruleActions = pgTable("rule_actions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: varchar("group_id").notNull().references(() => ruleConditionGroups.id, { onDelete: "cascade" }),
  actionOrder: integer("action_order").notNull(),
  // Order of execution within the group
  // Action types: "sell_percentage", "sell_quantity", "sell_all", "notify"
  actionType: text("action_type").notNull(),
  quantity: integer("quantity"),
  // For sell_quantity
  percentage: decimal("percentage", { precision: 5, scale: 2 }),
  // For sell_percentage (0-100)
  allowRepeat: boolean("allow_repeat").notNull().default(false),
  // Can this action trigger multiple times?
  cooldownMinutes: integer("cooldown_minutes"),
  // Minimum time between repeated executions
  createdAt: timestamp("created_at").defaultNow()
});
var insertRuleActionSchema = createInsertSchema(ruleActions).omit({
  id: true,
  createdAt: true
});
var ruleExecutions = pgTable("rule_executions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ruleId: varchar("rule_id").notNull().references(() => tradingRules.id, { onDelete: "cascade" }),
  ticker: text("ticker").notNull(),
  holdingId: varchar("holding_id"),
  // Reference to portfolio_holdings
  triggeredAt: timestamp("triggered_at").notNull().defaultNow(),
  conditionsMet: jsonb("conditions_met").$type().notNull(),
  actionsExecuted: jsonb("actions_executed").$type().notNull(),
  success: boolean("success").notNull(),
  errorMessage: text("error_message")
});
var insertRuleExecutionSchema = createInsertSchema(ruleExecutions).omit({
  id: true,
  triggeredAt: true
});
var insertCompoundRuleSchema = z.object({
  // Rule header
  name: z.string().min(1),
  enabled: z.boolean().default(true),
  scope: z.enum(["all_holdings", "specific_stock"]).default("all_holdings"),
  ticker: z.string().optional(),
  priority: z.number().int().default(1e3),
  // Condition groups (each with its own actions)
  groups: z.array(z.object({
    groupOrder: z.number().int(),
    junctionOperator: z.enum(["AND", "OR"]).optional(),
    description: z.string().optional(),
    conditions: z.array(z.object({
      metric: z.enum(["price_change_percent", "price_change_from_close_percent", "price_absolute", "days_held"]),
      comparator: z.enum([">", "<", ">=", "<=", "=="]),
      threshold: z.string(),
      // Will be converted to decimal
      timeframeValue: z.number().int().optional(),
      timeframeUnit: z.enum(["days", "hours", "minutes"]).optional(),
      metadata: z.record(z.any()).optional()
    })),
    // Actions for this specific group
    actions: z.array(z.object({
      actionOrder: z.number().int(),
      actionType: z.enum(["sell_percentage", "sell_quantity", "sell_all", "notify"]),
      quantity: z.number().int().optional(),
      percentage: z.string().optional(),
      // Will be converted to decimal (0-100)
      allowRepeat: z.boolean().default(false),
      cooldownMinutes: z.number().int().optional()
    }))
  }))
});
var users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  // Hashed password for authentication
  avatarColor: text("avatar_color").notNull().default("#3b82f6"),
  // Hex color for avatar
  isAdmin: boolean("is_admin").notNull().default(false),
  // Admin users can access backoffice
  isSuperAdmin: boolean("is_super_admin").notNull().default(false),
  // Super admin users can delete announcements and perform elevated operations
  subscriptionStatus: text("subscription_status").notNull().default("trial"),
  // "trial", "active", "inactive", "cancelled", "expired"
  paypalSubscriptionId: text("paypal_subscription_id"),
  // PayPal subscription ID
  subscriptionStartDate: timestamp("subscription_start_date"),
  subscriptionEndDate: timestamp("subscription_end_date"),
  trialEndsAt: timestamp("trial_ends_at"),
  // When the 30-day trial ends
  initialDataFetched: boolean("initial_data_fetched").notNull().default(false),
  // Track if initial 500 OpenInsider transactions have been fetched
  hasSeenOnboarding: boolean("has_seen_onboarding").notNull().default(false),
  // Track if user has completed the onboarding flow
  onboardingCompletedAt: timestamp("onboarding_completed_at"),
  // When user completed the unified onboarding flow
  tutorialCompletions: jsonb("tutorial_completions").$type().default({}),
  // Track which tutorials have been completed
  stockLimit: integer("stock_limit").notNull().default(100),
  // Maximum number of stocks to fetch (500 during onboarding, 100 default)
  riskPreference: text("risk_preference").notNull().default("balanced"),
  // "low", "balanced", "high" - determines default filter presets
  // Per-user display filters (client-side filtering of opportunities)
  optionsDealThresholdPercent: integer("options_deal_threshold_percent").notNull().default(15),
  // Filter out stocks where insider price < this % of market price (user-specific)
  minMarketCapFilter: integer("min_market_cap_filter").notNull().default(500),
  // Minimum market cap in millions for displaying opportunities (user-specific)
  archived: boolean("archived").notNull().default(false),
  // Soft delete for hiding users from admin list
  archivedAt: timestamp("archived_at"),
  archivedBy: varchar("archived_by"),
  // Which admin archived this user
  createdAt: timestamp("created_at").defaultNow()
});
var insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  archivedAt: true
});
var payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentDate: timestamp("payment_date").notNull(),
  paymentMethod: text("payment_method").notNull(),
  // "paypal", "manual", "stripe", etc.
  status: text("status").notNull().default("completed"),
  // "completed", "pending", "failed", "refunded"
  transactionId: text("transaction_id"),
  // External payment processor transaction ID
  notes: text("notes"),
  // Admin notes about manual payments
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: varchar("created_by")
  // Which admin created manual payment (null for automated)
});
var insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true
});
var manualOverrides = pgTable("manual_overrides", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  monthsExtended: integer("months_extended").notNull(),
  // How many months were added
  reason: text("reason"),
  // Why this override was created
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: varchar("created_by").notNull()
  // Which admin created this override
});
var insertManualOverrideSchema = createInsertSchema(manualOverrides).omit({
  id: true,
  createdAt: true
});
var passwordResetTokens = pgTable("password_reset_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: varchar("created_by").notNull()
  // Which admin initiated the reset
});
var insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({
  id: true,
  createdAt: true,
  used: true
});
var userTutorials = pgTable("user_tutorials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  tutorialId: text("tutorial_id").notNull(),
  // "dashboard", "purchase", "management", "history", "rules", "backtesting", "settings", "stocks", "simulation"
  completedAt: timestamp("completed_at").defaultNow()
});
var insertUserTutorialSchema = createInsertSchema(userTutorials).omit({
  id: true,
  completedAt: true
});
var stockComments = pgTable("stock_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticker: text("ticker").notNull(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  comment: text("comment").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});
var insertStockCommentSchema = createInsertSchema(stockComments).omit({
  id: true,
  createdAt: true
});
var stockViews = pgTable("stock_views", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticker: text("ticker").notNull(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  viewedAt: timestamp("viewed_at").defaultNow()
});
var insertStockViewSchema = createInsertSchema(stockViews).omit({
  id: true,
  viewedAt: true
});
var backtests = pgTable("backtests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  ruleId: varchar("rule_id"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  initialCapital: decimal("initial_capital", { precision: 12, scale: 2 }).notNull(),
  finalValue: decimal("final_value", { precision: 12, scale: 2 }).notNull(),
  totalReturn: decimal("total_return", { precision: 10, scale: 2 }).notNull(),
  totalReturnPercent: decimal("total_return_percent", { precision: 10, scale: 2 }).notNull(),
  numberOfTrades: integer("number_of_trades").notNull(),
  winRate: decimal("win_rate", { precision: 5, scale: 2 }),
  bestTrade: decimal("best_trade", { precision: 12, scale: 2 }),
  worstTrade: decimal("worst_trade", { precision: 12, scale: 2 }),
  tradeLog: jsonb("trade_log").$type(),
  equityCurve: jsonb("equity_curve").$type(),
  createdAt: timestamp("created_at").defaultNow()
});
var insertBacktestSchema = createInsertSchema(backtests).omit({
  id: true,
  createdAt: true
});
var telegramConfig = pgTable("telegram_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  // Made nullable during migration
  channelUsername: text("channel_username").notNull(),
  // e.g., "InsiderTrading_SEC"
  sessionString: text("session_string"),
  // Persisted session to avoid re-auth
  phoneNumber: text("phone_number"),
  // For display/reference only
  enabled: boolean("enabled").notNull().default(true),
  lastSync: timestamp("last_sync"),
  lastMessageId: integer("last_message_id")
  // Track last processed message to avoid duplicates
});
var insertTelegramConfigSchema = createInsertSchema(telegramConfig).omit({
  id: true,
  lastSync: true,
  lastMessageId: true,
  sessionString: true
});
var ibkrConfig = pgTable("ibkr_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  // Made nullable during migration
  gatewayUrl: text("gateway_url").notNull().default("https://localhost:5000"),
  // IBKR Client Portal Gateway URL
  accountId: text("account_id"),
  // IBKR account ID (fetched from API)
  isConnected: boolean("is_connected").notNull().default(false),
  isPaperTrading: boolean("is_paper_trading").notNull().default(true),
  lastConnectionCheck: timestamp("last_connection_check"),
  lastError: text("last_error")
});
var insertIbkrConfigSchema = createInsertSchema(ibkrConfig).omit({
  id: true,
  lastConnectionCheck: true,
  isConnected: true
});
var openinsiderConfig = pgTable("openinsider_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  // Made nullable during migration
  enabled: boolean("enabled").notNull().default(false),
  fetchLimit: integer("fetch_limit").notNull().default(50),
  // How many transactions to fetch
  fetchInterval: text("fetch_interval").notNull().default("hourly"),
  // "hourly" or "daily"
  fetchPreviousDayOnly: boolean("fetch_previous_day_only").notNull().default(false),
  // Only fetch yesterday's transactions
  // Filters
  insiderTitles: text("insider_titles").array(),
  // Filter by insider titles (CEO, CFO, Director, etc.)
  minTransactionValue: integer("min_transaction_value"),
  // Minimum transaction value in dollars
  minMarketCap: integer("min_market_cap").notNull().default(500),
  // Minimum market cap in millions (default $500M)
  optionsDealThresholdPercent: integer("options_deal_threshold_percent").notNull().default(15),
  // Insider price must be >= this % of market price (filters options deals)
  minCommunityEngagement: integer("min_community_engagement").notNull().default(10),
  // Minimum comments + follows to appear in Community section
  lastSync: timestamp("last_sync"),
  lastError: text("last_error")
});
var insertOpeninsiderConfigSchema = createInsertSchema(openinsiderConfig).omit({
  id: true,
  lastSync: true
});
var backtestJobs = pgTable("backtest_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  // Made nullable during migration
  name: text("name").notNull(),
  dataSource: text("data_source").notNull().default("telegram"),
  // "telegram" or "openinsider"
  messageCount: integer("message_count").notNull(),
  // Number of messages/transactions to analyze
  status: text("status").notNull().default("pending"),
  // "pending", "fetching_messages", "filtering", "building_matrix", "generating_scenarios", "calculating_results", "completed", "failed"
  progress: integer("progress").default(0),
  // 0-100
  errorMessage: text("error_message"),
  candidateStocks: jsonb("candidate_stocks").$type().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at")
});
var insertBacktestJobSchema = createInsertSchema(backtestJobs).omit({
  id: true,
  status: true,
  progress: true,
  errorMessage: true,
  candidateStocks: true,
  createdAt: true,
  completedAt: true
});
var backtestPriceData = pgTable("backtest_price_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull(),
  ticker: text("ticker").notNull(),
  insiderBuyDate: text("insider_buy_date").notNull(),
  priceMatrix: jsonb("price_matrix").$type().notNull(),
  // Daily closing prices: 1 month before to 2 weeks after insider buy
  createdAt: timestamp("created_at").defaultNow()
});
var insertBacktestPriceDataSchema = createInsertSchema(backtestPriceData).omit({
  id: true,
  createdAt: true
});
var backtestScenarios = pgTable("backtest_scenarios", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull(),
  scenarioNumber: integer("scenario_number").notNull(),
  // 1-10
  name: text("name").notNull(),
  // AI-generated scenario name
  description: text("description"),
  // AI-generated scenario description
  // Rule-based structure aligned with tradingRules
  sellConditions: jsonb("sell_conditions").$type().notNull(),
  sellAction: jsonb("sell_action").$type().notNull(),
  totalProfitLoss: decimal("total_profit_loss", { precision: 12, scale: 2 }).notNull(),
  totalProfitLossPercent: decimal("total_profit_loss_percent", { precision: 10, scale: 2 }).notNull(),
  winRate: decimal("win_rate", { precision: 5, scale: 2 }),
  // Percentage of winning trades
  numberOfTrades: integer("number_of_trades").notNull(),
  tradeDetails: jsonb("trade_details").$type(),
  createdAt: timestamp("created_at").defaultNow()
});
var insertBacktestScenarioSchema = createInsertSchema(backtestScenarios).omit({
  id: true,
  createdAt: true
});
var featureSuggestions = pgTable("feature_suggestions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("pending"),
  // "pending", "roadmap", "deleted"
  voteCount: integer("vote_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var insertFeatureSuggestionSchema = createInsertSchema(featureSuggestions).omit({
  id: true,
  voteCount: true,
  createdAt: true,
  updatedAt: true
});
var featureVotes = pgTable("feature_votes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  suggestionId: varchar("suggestion_id").notNull().references(() => featureSuggestions.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow()
}, (table) => ({
  userSuggestionUnique: uniqueIndex("user_suggestion_unique_idx").on(table.userId, table.suggestionId)
}));
var insertFeatureVoteSchema = createInsertSchema(featureVotes).omit({
  id: true,
  createdAt: true
});
var notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  ticker: text("ticker").notNull(),
  type: text("type").notNull(),
  // "high_score_buy", "high_score_sell", "popular_stock", "stance_change"
  score: integer("score"),
  // AI integrated score (nullable for non-score notifications)
  message: text("message").notNull(),
  metadata: jsonb("metadata").$type(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow()
}, (table) => ({
  userIdIdx: uniqueIndex("notifications_user_id_idx").on(table.userId, table.isRead, table.createdAt),
  // Deduplication: prevent duplicate notifications for same user+ticker+type
  userTickerTypeUnique: uniqueIndex("notifications_user_ticker_type_idx").on(table.userId, table.ticker, table.type)
}));
var insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true
});
var announcements = pgTable("announcements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  content: text("content").notNull(),
  type: text("type").notNull().default("update"),
  // "feature", "update", "maintenance", "announcement"
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdBy: varchar("created_by").notNull().references(() => users.id)
});
var insertAnnouncementSchema = createInsertSchema(announcements).omit({
  id: true,
  createdAt: true
});
var announcementReads = pgTable("announcement_reads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  announcementId: varchar("announcement_id").notNull().references(() => announcements.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  readAt: timestamp("read_at").notNull().defaultNow()
}, (table) => ({
  userAnnouncementUnique: uniqueIndex("user_announcement_unique_idx").on(table.userId, table.announcementId)
}));
var insertAnnouncementReadSchema = createInsertSchema(announcementReads).omit({
  id: true,
  readAt: true
});
var adminNotifications = pgTable("admin_notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(),
  // "user_signup", etc.
  title: text("title").notNull(),
  message: text("message").notNull(),
  metadata: jsonb("metadata").$type(),
  isRead: boolean("is_read").notNull().default(false),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").notNull().defaultNow()
});
var insertAdminNotificationSchema = createInsertSchema(adminNotifications).omit({
  id: true,
  createdAt: true,
  readAt: true
});
var followedStocks = pgTable("followed_stocks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  ticker: text("ticker").notNull(),
  followedAt: timestamp("followed_at").notNull().defaultNow(),
  hasEnteredPosition: boolean("has_entered_position").default(false).notNull()
  // Track if user entered position
}, (table) => ({
  userTickerFollowUnique: uniqueIndex("user_ticker_follow_unique_idx").on(table.userId, table.ticker)
}));
var insertFollowedStockSchema = createInsertSchema(followedStocks).omit({ id: true, followedAt: true, hasEnteredPosition: true });
var dailyBriefs = pgTable("daily_briefs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  // User-specific briefs
  ticker: text("ticker").notNull(),
  briefDate: text("brief_date").notNull(),
  // YYYY-MM-DD format
  priceSnapshot: decimal("price_snapshot", { precision: 12, scale: 2 }).notNull(),
  // Price at time of brief
  priceChange: decimal("price_change", { precision: 12, scale: 2 }),
  // Dollar change vs previous close
  priceChangePercent: decimal("price_change_percent", { precision: 10, scale: 2 }),
  // Percent change
  // WATCHING SCENARIO (Entry Evaluation) - "If I enter now, what should I do?"
  watchingStance: text("watching_stance").notNull(),
  // "buy", "hold", "sell"
  watchingConfidence: integer("watching_confidence").notNull(),
  // 1-10
  watchingText: text("watching_text").notNull(),
  // Brief for watching scenario
  watchingHighlights: text("watching_highlights").array().default([]),
  // Key points for watching
  // OWNING SCENARIO (Exit Strategy) - "If I already own it, what should I do?"
  owningStance: text("owning_stance").notNull(),
  // "buy", "hold", "sell"
  owningConfidence: integer("owning_confidence").notNull(),
  // 1-10
  owningText: text("owning_text").notNull(),
  // Brief for owning scenario
  owningHighlights: text("owning_highlights").array().default([]),
  // Key points for owning
  // Legacy fields - kept for backwards compatibility, now optional
  keyHighlights: text("key_highlights").array().default([]),
  recommendedStance: text("recommended_stance"),
  confidence: integer("confidence"),
  briefText: text("brief_text"),
  userOwnsPosition: boolean("user_owns_position").default(false),
  createdAt: timestamp("created_at").notNull().defaultNow()
}, (table) => ({
  userTickerDateUnique: uniqueIndex("daily_brief_user_ticker_date_idx").on(table.userId, table.ticker, table.briefDate)
}));
var insertDailyBriefSchema = createInsertSchema(dailyBriefs).omit({ id: true, createdAt: true });

// server/db.ts
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
neonConfig.webSocketConstructor = ws;
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}
var pool = new Pool({ connectionString: process.env.DATABASE_URL });
var db = drizzle({ client: pool, schema: schema_exports });

// server/storage.ts
import { eq, desc, sql as sql2, and, inArray, lt } from "drizzle-orm";

// shared/time.ts
function getStockAgeInDays(lastUpdated) {
  if (!lastUpdated) return 0;
  const updatedDate = typeof lastUpdated === "string" ? new Date(lastUpdated) : lastUpdated;
  const now = /* @__PURE__ */ new Date();
  const diffMs = now.getTime() - updatedDate.getTime();
  const diffDays = Math.floor(diffMs / (1e3 * 60 * 60 * 24));
  return diffDays;
}
function isStockStale(lastUpdated) {
  const ageDays = getStockAgeInDays(lastUpdated);
  return ageDays > 5;
}

// server/eventDispatcher.ts
import { EventEmitter } from "events";
var EventDispatcher = class _EventDispatcher extends EventEmitter {
  static instance;
  constructor() {
    super();
    this.setMaxListeners(100);
  }
  static getInstance() {
    if (!_EventDispatcher.instance) {
      _EventDispatcher.instance = new _EventDispatcher();
    }
    return _EventDispatcher.instance;
  }
  emit(event, data) {
    return super.emit(event, data);
  }
  on(event, listener) {
    return super.on(event, listener);
  }
};
var eventDispatcher = EventDispatcher.getInstance();

// server/storage.ts
var DatabaseStorage = class {
  async initializeDefaults() {
    const existingTelegramConfig = await this.getTelegramConfig();
    if (!existingTelegramConfig) {
      await this.createOrUpdateTelegramConfig({
        channelUsername: "InsiderTrading_SEC",
        phoneNumber: void 0,
        enabled: true
      });
    }
    const existingOpeninsiderConfig = await this.getOpeninsiderConfig();
    if (!existingOpeninsiderConfig) {
      await this.createOrUpdateOpeninsiderConfig({
        enabled: true,
        fetchLimit: 500,
        fetchInterval: "hourly",
        fetchPreviousDayOnly: false,
        insiderTitles: ["CEO", "CFO", "Director", "President", "COO", "CTO", "10% Owner"],
        minTransactionValue: 1e5
        // $100k minimum
      });
    }
  }
  async updateHoldingValues(holding) {
    const [stock] = await db.select().from(stocks).where(and(
      eq(stocks.ticker, holding.ticker),
      eq(stocks.userId, holding.userId)
    ));
    if (!stock) return;
    const currentPrice = parseFloat(stock.currentPrice);
    const avgPrice = parseFloat(holding.averagePurchasePrice);
    const currentValue = currentPrice * holding.quantity;
    const totalCost = avgPrice * holding.quantity;
    const profitLoss = currentValue - totalCost;
    const profitLossPercent = profitLoss / totalCost * 100;
    await db.update(portfolioHoldings).set({
      currentValue: currentValue.toFixed(2),
      profitLoss: profitLoss.toFixed(2),
      profitLossPercent: profitLossPercent.toFixed(2),
      lastUpdated: sql2`now()`
    }).where(eq(portfolioHoldings.id, holding.id));
  }
  // Stocks (Per-user tenant isolation)
  async getStocks(userId) {
    const results = await db.select({
      stock: stocks,
      analysisJob: aiAnalysisJobs
    }).from(stocks).leftJoin(
      aiAnalysisJobs,
      and(
        eq(stocks.ticker, aiAnalysisJobs.ticker),
        sql2`${aiAnalysisJobs.status} IN ('pending', 'processing')`
      )
    ).where(eq(stocks.userId, userId));
    return results.map((row) => ({
      ...row.stock,
      analysisJob: row.analysisJob || void 0
    }));
  }
  async getStock(userId, ticker) {
    const [stock] = await db.select().from(stocks).where(and(
      eq(stocks.userId, userId),
      eq(stocks.ticker, ticker)
    )).orderBy(desc(stocks.lastUpdated)).limit(1);
    return stock;
  }
  async getAnyStockForTicker(ticker) {
    const [stock] = await db.select().from(stocks).where(eq(stocks.ticker, ticker)).limit(1);
    return stock;
  }
  async getUserStocksForTicker(userId, ticker) {
    return await db.select().from(stocks).where(and(
      eq(stocks.userId, userId),
      eq(stocks.ticker, ticker)
    ));
  }
  async getAllStocksForTickerGlobal(ticker) {
    return await db.select().from(stocks).where(eq(stocks.ticker, ticker));
  }
  async getTransactionByCompositeKey(userId, ticker, insiderTradeDate, insiderName, recommendation) {
    const [stock] = await db.select().from(stocks).where(
      and(
        eq(stocks.userId, userId),
        eq(stocks.ticker, ticker),
        eq(stocks.insiderTradeDate, insiderTradeDate),
        eq(stocks.insiderName, insiderName),
        eq(stocks.recommendation, recommendation)
      )
    );
    return stock;
  }
  async createStock(stock) {
    const [newStock] = await db.insert(stocks).values(stock).returning();
    return newStock;
  }
  async updateStock(userId, ticker, updates) {
    const [updatedStock] = await db.update(stocks).set({ ...updates, lastUpdated: sql2`now()` }).where(and(
      eq(stocks.userId, userId),
      eq(stocks.ticker, ticker)
    )).returning();
    if (updatedStock) {
      const holdings = await db.select().from(portfolioHoldings).where(and(
        eq(portfolioHoldings.userId, userId),
        eq(portfolioHoldings.ticker, ticker)
      ));
      for (const holding of holdings) {
        await this.updateHoldingValues(holding);
      }
    }
    return updatedStock;
  }
  async deleteStock(userId, ticker) {
    const result = await db.delete(stocks).where(and(
      eq(stocks.userId, userId),
      eq(stocks.ticker, ticker)
    ));
    return result.rowCount ? result.rowCount > 0 : false;
  }
  async deleteExpiredPendingStocks(ageInDays) {
    const startTime = Date.now();
    const cutoffDate = /* @__PURE__ */ new Date();
    cutoffDate.setDate(cutoffDate.getDate() - ageInDays);
    console.log(`[CLEANUP] Starting cleanup: deleting pending stocks older than ${ageInDays} days (before ${cutoffDate.toISOString()})`);
    const result = await db.transaction(async (tx) => {
      const candidates = await tx.select({ ticker: stocks.ticker }).from(stocks).where(and(
        lt(stocks.lastUpdated, cutoffDate),
        eq(stocks.recommendationStatus, "pending")
      )).for("update");
      if (candidates.length === 0) {
        console.log("[CLEANUP] No expired pending stocks found");
        return { count: 0, tickers: [] };
      }
      const candidateTickers = candidates.map((c) => c.ticker);
      console.log(`[CLEANUP] Found ${candidateTickers.length} candidates: ${candidateTickers.join(", ")}`);
      const holdingsCheck = await tx.select({ ticker: portfolioHoldings.ticker }).from(portfolioHoldings).where(inArray(portfolioHoldings.ticker, candidateTickers));
      const tradesCheck = await tx.select({ ticker: trades.ticker }).from(trades).where(inArray(trades.ticker, candidateTickers));
      if (holdingsCheck.length > 0 || tradesCheck.length > 0) {
        const conflictTickers = Array.from(/* @__PURE__ */ new Set([
          ...holdingsCheck.map((h) => h.ticker),
          ...tradesCheck.map((t) => t.ticker)
        ]));
        console.error(`[CLEANUP] ABORT: Found portfolio/trade data for tickers: ${conflictTickers.join(", ")}`);
        throw new Error(`Cannot delete stocks with existing holdings/trades: ${conflictTickers.join(", ")}`);
      }
      const deleteCounts = {
        aiJobs: 0,
        analyses: 0,
        views: 0,
        userStatuses: 0,
        comments: 0
      };
      const deletedJobs = await tx.delete(aiAnalysisJobs).where(inArray(aiAnalysisJobs.ticker, candidateTickers)).returning({ ticker: aiAnalysisJobs.ticker });
      deleteCounts.aiJobs = deletedJobs.length;
      const deletedAnalyses = await tx.delete(stockAnalyses).where(inArray(stockAnalyses.ticker, candidateTickers)).returning({ ticker: stockAnalyses.ticker });
      deleteCounts.analyses = deletedAnalyses.length;
      const deletedViews = await tx.delete(stockViews).where(inArray(stockViews.ticker, candidateTickers)).returning({ ticker: stockViews.ticker });
      deleteCounts.views = deletedViews.length;
      const deletedStatuses = await tx.delete(userStockStatuses).where(inArray(userStockStatuses.ticker, candidateTickers)).returning({ ticker: userStockStatuses.ticker });
      deleteCounts.userStatuses = deletedStatuses.length;
      const deletedComments = await tx.delete(stockComments).where(inArray(stockComments.ticker, candidateTickers)).returning({ ticker: stockComments.ticker });
      deleteCounts.comments = deletedComments.length;
      const deletedStocks = await tx.delete(stocks).where(inArray(stocks.ticker, candidateTickers)).returning({ ticker: stocks.ticker });
      console.log(`[CLEANUP] Deleted child records:`, deleteCounts);
      console.log(`[CLEANUP] Deleted ${deletedStocks.length} stocks: ${deletedStocks.map((s) => s.ticker).join(", ")}`);
      return { count: deletedStocks.length, tickers: deletedStocks.map((s) => s.ticker) };
    });
    const elapsedMs = Date.now() - startTime;
    console.log(`[CLEANUP] Cleanup completed in ${elapsedMs}ms - Deleted ${result.count} stocks`);
    return result;
  }
  async deleteExpiredRejectedStocks(ageInDays) {
    const startTime = Date.now();
    const cutoffDate = /* @__PURE__ */ new Date();
    cutoffDate.setDate(cutoffDate.getDate() - ageInDays);
    console.log(`[CLEANUP] Starting cleanup: deleting rejected stocks older than ${ageInDays} days (before ${cutoffDate.toISOString()})`);
    const result = await db.transaction(async (tx) => {
      const candidates = await tx.select({ ticker: stocks.ticker }).from(stocks).where(and(
        lt(stocks.rejectedAt, cutoffDate),
        sql2`${stocks.rejectedAt} IS NOT NULL`,
        eq(stocks.recommendationStatus, "rejected")
      )).for("update");
      if (candidates.length === 0) {
        console.log("[CLEANUP] No expired rejected stocks found");
        return { count: 0, tickers: [] };
      }
      const candidateTickers = candidates.map((c) => c.ticker);
      console.log(`[CLEANUP] Found ${candidateTickers.length} rejected candidates: ${candidateTickers.join(", ")}`);
      const holdingsCheck = await tx.select({ ticker: portfolioHoldings.ticker }).from(portfolioHoldings).where(inArray(portfolioHoldings.ticker, candidateTickers));
      const tradesCheck = await tx.select({ ticker: trades.ticker }).from(trades).where(inArray(trades.ticker, candidateTickers));
      if (holdingsCheck.length > 0 || tradesCheck.length > 0) {
        const conflictTickers = Array.from(/* @__PURE__ */ new Set([
          ...holdingsCheck.map((h) => h.ticker),
          ...tradesCheck.map((t) => t.ticker)
        ]));
        console.error(`[CLEANUP] ABORT: Found portfolio/trade data for tickers: ${conflictTickers.join(", ")}`);
        throw new Error(`Cannot delete stocks with existing holdings/trades: ${conflictTickers.join(", ")}`);
      }
      const deleteCounts = {
        aiJobs: 0,
        analyses: 0,
        views: 0,
        userStatuses: 0,
        comments: 0
      };
      const deletedJobs = await tx.delete(aiAnalysisJobs).where(inArray(aiAnalysisJobs.ticker, candidateTickers)).returning({ ticker: aiAnalysisJobs.ticker });
      deleteCounts.aiJobs = deletedJobs.length;
      const deletedAnalyses = await tx.delete(stockAnalyses).where(inArray(stockAnalyses.ticker, candidateTickers)).returning({ ticker: stockAnalyses.ticker });
      deleteCounts.analyses = deletedAnalyses.length;
      const deletedViews = await tx.delete(stockViews).where(inArray(stockViews.ticker, candidateTickers)).returning({ ticker: stockViews.ticker });
      deleteCounts.views = deletedViews.length;
      const deletedStatuses = await tx.delete(userStockStatuses).where(inArray(userStockStatuses.ticker, candidateTickers)).returning({ ticker: userStockStatuses.ticker });
      deleteCounts.userStatuses = deletedStatuses.length;
      const deletedComments = await tx.delete(stockComments).where(inArray(stockComments.ticker, candidateTickers)).returning({ ticker: stockComments.ticker });
      deleteCounts.comments = deletedComments.length;
      const deletedStocks = await tx.delete(stocks).where(inArray(stocks.ticker, candidateTickers)).returning({ ticker: stocks.ticker });
      console.log(`[CLEANUP] Deleted child records:`, deleteCounts);
      console.log(`[CLEANUP] Deleted ${deletedStocks.length} rejected stocks: ${deletedStocks.map((s) => s.ticker).join(", ")}`);
      return { count: deletedStocks.length, tickers: deletedStocks.map((s) => s.ticker) };
    });
    const elapsedMs = Date.now() - startTime;
    console.log(`[CLEANUP] Rejected stocks cleanup completed in ${elapsedMs}ms - Deleted ${result.count} stocks`);
    return result;
  }
  async getStocksByStatus(userId, status) {
    return await db.select().from(stocks).where(and(
      eq(stocks.userId, userId),
      eq(stocks.recommendationStatus, status)
    ));
  }
  async getStocksByUserStatus(userId, status) {
    const results = await db.select({
      stock: stocks
    }).from(stocks).leftJoin(
      userStockStatuses,
      and(
        eq(stocks.ticker, userStockStatuses.ticker),
        eq(userStockStatuses.userId, userId)
      )
    ).where(
      and(
        eq(stocks.userId, userId),
        // CRITICAL: Filter stocks by userId for tenant isolation
        eq(userStockStatuses.status, status)
      )
    );
    return results.map((row) => row.stock);
  }
  async unrejectStock(userId, ticker) {
    const [updatedStock] = await db.update(stocks).set({
      recommendationStatus: "pending",
      rejectedAt: null,
      lastUpdated: sql2`now()`
    }).where(and(
      eq(stocks.userId, userId),
      eq(stocks.ticker, ticker)
    )).returning();
    return updatedStock;
  }
  // Global helpers for background jobs (efficiently update market data across all users)
  async getAllUniquePendingTickers() {
    const result = await db.selectDistinct({ ticker: stocks.ticker }).from(stocks).where(eq(stocks.recommendationStatus, "pending"));
    return result.map((r) => r.ticker);
  }
  async getAllUniqueTickersNeedingData() {
    const result = await db.selectDistinct({ ticker: stocks.ticker }).from(stocks).where(
      or(
        eq(stocks.recommendationStatus, "pending"),
        sql2`${stocks.candlesticks} IS NULL`,
        sql2`jsonb_array_length(${stocks.candlesticks}) = 0`
      )
    );
    return result.map((r) => r.ticker);
  }
  async updateStocksByTickerGlobally(ticker, updates) {
    const result = await db.update(stocks).set({ ...updates, lastUpdated: sql2`now()` }).where(eq(stocks.ticker, ticker));
    return result.rowCount || 0;
  }
  async deleteStocksOlderThan(ageInDays) {
    const startTime = Date.now();
    const cutoffDate = /* @__PURE__ */ new Date();
    cutoffDate.setDate(cutoffDate.getDate() - ageInDays);
    const cutoffDateString = cutoffDate.toISOString().split("T")[0];
    console.log(`[CLEANUP] Starting 2-week horizon cleanup: deleting stocks older than ${ageInDays} days (before ${cutoffDateString}), excluding followed stocks`);
    const result = await db.transaction(async (tx) => {
      const candidates = await tx.select({ ticker: stocks.ticker }).from(stocks).leftJoin(followedStocks, eq(stocks.ticker, followedStocks.ticker)).where(and(
        lt(stocks.insiderTradeDate, cutoffDateString),
        sql2`${followedStocks.ticker} IS NULL`
        // Not followed by anyone
      )).for("update");
      if (candidates.length === 0) {
        console.log("[CLEANUP] No old non-followed stocks found");
        return { count: 0, tickers: [] };
      }
      const candidateTickers = candidates.map((c) => c.ticker);
      console.log(`[CLEANUP] Found ${candidateTickers.length} old non-followed stocks: ${candidateTickers.join(", ")}`);
      const holdingsCheck = await tx.select({ ticker: portfolioHoldings.ticker }).from(portfolioHoldings).where(inArray(portfolioHoldings.ticker, candidateTickers)).limit(1);
      if (holdingsCheck.length > 0) {
        console.warn(`[CLEANUP] WARNING: Found portfolio holdings for stocks marked for deletion. Skipping cleanup for safety.`);
        return { count: 0, tickers: [] };
      }
      const tradesCheck = await tx.select({ ticker: trades.ticker }).from(trades).where(inArray(trades.ticker, candidateTickers)).limit(1);
      if (tradesCheck.length > 0) {
        console.warn(`[CLEANUP] WARNING: Found trades for stocks marked for deletion. Skipping cleanup for safety.`);
        return { count: 0, tickers: [] };
      }
      const deleteCounts = {
        aiJobs: 0,
        analyses: 0,
        views: 0,
        userStatuses: 0,
        comments: 0
      };
      const deletedJobs = await tx.delete(aiAnalysisJobs).where(inArray(aiAnalysisJobs.ticker, candidateTickers)).returning({ ticker: aiAnalysisJobs.ticker });
      deleteCounts.aiJobs = deletedJobs.length;
      const deletedAnalyses = await tx.delete(stockAnalyses).where(inArray(stockAnalyses.ticker, candidateTickers)).returning({ ticker: stockAnalyses.ticker });
      deleteCounts.analyses = deletedAnalyses.length;
      const deletedViews = await tx.delete(stockViews).where(inArray(stockViews.ticker, candidateTickers)).returning({ ticker: stockViews.ticker });
      deleteCounts.views = deletedViews.length;
      const deletedStatuses = await tx.delete(userStockStatuses).where(inArray(userStockStatuses.ticker, candidateTickers)).returning({ ticker: userStockStatuses.ticker });
      deleteCounts.userStatuses = deletedStatuses.length;
      const deletedComments = await tx.delete(stockComments).where(inArray(stockComments.ticker, candidateTickers)).returning({ ticker: stockComments.ticker });
      deleteCounts.comments = deletedComments.length;
      const deletedStocks = await tx.delete(stocks).where(inArray(stocks.ticker, candidateTickers)).returning({ ticker: stocks.ticker });
      console.log(`[CLEANUP] Deleted child records:`, deleteCounts);
      console.log(`[CLEANUP] Deleted ${deletedStocks.length} old stocks: ${deletedStocks.map((s) => s.ticker).join(", ")}`);
      return { count: deletedStocks.length, tickers: deletedStocks.map((s) => s.ticker) };
    });
    const elapsedMs = Date.now() - startTime;
    console.log(`[CLEANUP] 2-week horizon cleanup completed in ${elapsedMs}ms - Deleted ${result.count} stocks`);
    return result;
  }
  // Portfolio Holdings
  async getPortfolioHoldings(userId, isSimulated) {
    let whereConditions = [eq(portfolioHoldings.userId, userId)];
    if (isSimulated !== void 0) {
      whereConditions.push(eq(portfolioHoldings.isSimulated, isSimulated));
    }
    const holdings = await db.select().from(portfolioHoldings).where(and(...whereConditions));
    for (const holding of holdings) {
      await this.updateHoldingValues(holding);
    }
    return await db.select().from(portfolioHoldings).where(and(...whereConditions));
  }
  async getPortfolioHolding(id, userId) {
    const whereClause = userId ? and(eq(portfolioHoldings.id, id), eq(portfolioHoldings.userId, userId)) : eq(portfolioHoldings.id, id);
    const [holding] = await db.select().from(portfolioHoldings).where(whereClause);
    if (holding) {
      await this.updateHoldingValues(holding);
      const [updated] = await db.select().from(portfolioHoldings).where(whereClause);
      return updated;
    }
    return void 0;
  }
  async getPortfolioHoldingByTicker(userId, ticker, isSimulated) {
    let whereConditions = [eq(portfolioHoldings.userId, userId), eq(portfolioHoldings.ticker, ticker)];
    if (isSimulated !== void 0) {
      whereConditions.push(eq(portfolioHoldings.isSimulated, isSimulated));
    }
    const [holding] = await db.select().from(portfolioHoldings).where(and(...whereConditions));
    if (holding) {
      await this.updateHoldingValues(holding);
      const [updated] = await db.select().from(portfolioHoldings).where(and(...whereConditions));
      return updated;
    }
    return void 0;
  }
  async createPortfolioHolding(holding) {
    const [newHolding] = await db.insert(portfolioHoldings).values(holding).returning();
    await this.updateHoldingValues(newHolding);
    const [updated] = await db.select().from(portfolioHoldings).where(eq(portfolioHoldings.id, newHolding.id));
    return updated;
  }
  async updatePortfolioHolding(id, updates) {
    const [updatedHolding] = await db.update(portfolioHoldings).set({ ...updates, lastUpdated: sql2`now()` }).where(eq(portfolioHoldings.id, id)).returning();
    if (updatedHolding) {
      await this.updateHoldingValues(updatedHolding);
      const [updated] = await db.select().from(portfolioHoldings).where(eq(portfolioHoldings.id, id));
      return updated;
    }
    return void 0;
  }
  async deletePortfolioHolding(id) {
    const result = await db.delete(portfolioHoldings).where(eq(portfolioHoldings.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }
  async deleteSimulatedHoldingsByTicker(userId, ticker) {
    const result = await db.delete(portfolioHoldings).where(and(
      eq(portfolioHoldings.userId, userId),
      eq(portfolioHoldings.ticker, ticker),
      eq(portfolioHoldings.isSimulated, true)
    )).returning();
    return result.length;
  }
  // Trades
  async getTrades(userId, isSimulated) {
    let whereConditions = [eq(trades.userId, userId)];
    if (isSimulated !== void 0) {
      whereConditions.push(eq(trades.isSimulated, isSimulated));
    }
    return await db.select().from(trades).where(and(...whereConditions)).orderBy(desc(trades.executedAt));
  }
  async getTrade(id, userId) {
    const whereClause = userId ? and(eq(trades.id, id), eq(trades.userId, userId)) : eq(trades.id, id);
    const [trade] = await db.select().from(trades).where(whereClause);
    return trade;
  }
  async createTrade(trade) {
    const isSimulated = trade.isSimulated ?? void 0;
    if (!trade.userId) {
      throw new Error("userId is required to create a trade");
    }
    const existingHolding = await this.getPortfolioHoldingByTicker(trade.userId, trade.ticker, isSimulated);
    if (trade.type === "sell") {
      if (!existingHolding) {
        throw new Error(`Cannot sell ${trade.ticker}: no holding found`);
      }
      if (trade.quantity > existingHolding.quantity) {
        throw new Error(
          `Cannot sell ${trade.quantity} shares of ${trade.ticker}: only ${existingHolding.quantity} shares available`
        );
      }
    }
    let realizedProfitLoss;
    let realizedProfitLossPercent;
    if (trade.type === "buy") {
      if (existingHolding) {
        const totalQuantity = existingHolding.quantity + trade.quantity;
        const totalCost = parseFloat(existingHolding.averagePurchasePrice) * existingHolding.quantity + parseFloat(trade.price) * trade.quantity;
        const newAvgPrice = totalCost / totalQuantity;
        await this.updatePortfolioHolding(existingHolding.id, {
          quantity: totalQuantity,
          averagePurchasePrice: newAvgPrice.toFixed(2)
        });
        const updatedHolding = await this.getPortfolioHolding(existingHolding.id);
        if (updatedHolding) {
          await this.updateHoldingValues(updatedHolding);
        }
      } else {
        const newHolding = await this.createPortfolioHolding({
          userId: trade.userId,
          ticker: trade.ticker,
          quantity: trade.quantity,
          averagePurchasePrice: trade.price,
          isSimulated: isSimulated !== void 0 ? isSimulated : false
        });
        await this.updateHoldingValues(newHolding);
      }
    } else if (trade.type === "sell" && existingHolding) {
      const sellPrice = parseFloat(trade.price);
      const avgPurchasePrice = parseFloat(existingHolding.averagePurchasePrice);
      const profitLoss = (sellPrice - avgPurchasePrice) * trade.quantity;
      const profitLossPercent = (sellPrice - avgPurchasePrice) / avgPurchasePrice * 100;
      realizedProfitLoss = profitLoss.toFixed(2);
      realizedProfitLossPercent = profitLossPercent.toFixed(2);
      const newQuantity = existingHolding.quantity - trade.quantity;
      if (newQuantity <= 0) {
        await this.deletePortfolioHolding(existingHolding.id);
      } else {
        await this.updatePortfolioHolding(existingHolding.id, {
          quantity: newQuantity
        });
        const updatedHolding = await this.getPortfolioHolding(existingHolding.id);
        if (updatedHolding) {
          await this.updateHoldingValues(updatedHolding);
        }
      }
    }
    const tradeData = {
      ...trade,
      ...realizedProfitLoss && { profitLoss: realizedProfitLoss },
      ...realizedProfitLossPercent && { profitLossPercent: realizedProfitLossPercent }
    };
    const [newTrade] = await db.insert(trades).values(tradeData).returning();
    return newTrade;
  }
  async updateTrade(id, updates) {
    const [updatedTrade] = await db.update(trades).set(updates).where(eq(trades.id, id)).returning();
    return updatedTrade;
  }
  async deleteSimulatedTradesByTicker(userId, ticker) {
    const result = await db.delete(trades).where(and(
      eq(trades.userId, userId),
      eq(trades.ticker, ticker),
      eq(trades.isSimulated, true)
    )).returning();
    return result.length;
  }
  // Trading Rules
  async getTradingRules(userId) {
    return await db.select().from(tradingRules).where(eq(tradingRules.userId, userId));
  }
  async getTradingRule(id) {
    const [rule] = await db.select().from(tradingRules).where(eq(tradingRules.id, id));
    return rule;
  }
  async createTradingRule(rule) {
    const [newRule] = await db.insert(tradingRules).values(rule).returning();
    return newRule;
  }
  async updateTradingRule(id, updates) {
    const [updatedRule] = await db.update(tradingRules).set({ ...updates, updatedAt: sql2`now()` }).where(eq(tradingRules.id, id)).returning();
    return updatedRule;
  }
  async deleteTradingRule(id) {
    const result = await db.delete(tradingRules).where(eq(tradingRules.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }
  // Compound Rules (multi-condition rules)
  async getCompoundRules() {
    const allRules = await db.select().from(tradingRules).orderBy(tradingRules.priority);
    const compoundRules = [];
    for (const rule of allRules) {
      const groups = await db.select().from(ruleConditionGroups).where(eq(ruleConditionGroups.ruleId, rule.id)).orderBy(ruleConditionGroups.groupOrder);
      const groupsWithConditions = await Promise.all(
        groups.map(async (group) => {
          const conditions = await db.select().from(ruleConditions).where(eq(ruleConditions.groupId, group.id));
          return { ...group, conditions };
        })
      );
      const actions = await db.select().from(ruleActions).where(eq(ruleActions.ruleId, rule.id)).orderBy(ruleActions.actionOrder);
      compoundRules.push({
        ...rule,
        groups: groupsWithConditions,
        actions
      });
    }
    return compoundRules;
  }
  async getCompoundRule(id) {
    const [rule] = await db.select().from(tradingRules).where(eq(tradingRules.id, id));
    if (!rule) return void 0;
    const groups = await db.select().from(ruleConditionGroups).where(eq(ruleConditionGroups.ruleId, id)).orderBy(ruleConditionGroups.groupOrder);
    const groupsWithConditions = await Promise.all(
      groups.map(async (group) => {
        const conditions = await db.select().from(ruleConditions).where(eq(ruleConditions.groupId, group.id));
        return { ...group, conditions };
      })
    );
    const actions = await db.select().from(ruleActions).where(eq(ruleActions.ruleId, id)).orderBy(ruleActions.actionOrder);
    return {
      ...rule,
      groups: groupsWithConditions,
      actions
    };
  }
  async createCompoundRule(ruleData) {
    const result = await db.transaction(async (tx) => {
      const [rule] = await tx.insert(tradingRules).values({
        name: ruleData.name,
        enabled: ruleData.enabled,
        scope: ruleData.scope,
        ticker: ruleData.ticker,
        priority: ruleData.priority
      }).returning();
      const groupsWithConditions = [];
      for (const groupData of ruleData.groups) {
        const [group] = await tx.insert(ruleConditionGroups).values({
          ruleId: rule.id,
          groupOrder: groupData.groupOrder,
          junctionOperator: groupData.junctionOperator,
          description: groupData.description
        }).returning();
        const conditions = [];
        for (const conditionData of groupData.conditions) {
          const [condition] = await tx.insert(ruleConditions).values({
            groupId: group.id,
            metric: conditionData.metric,
            comparator: conditionData.comparator,
            threshold: conditionData.threshold,
            timeframeValue: conditionData.timeframeValue,
            timeframeUnit: conditionData.timeframeUnit,
            metadata: conditionData.metadata
          }).returning();
          conditions.push(condition);
        }
        groupsWithConditions.push({ ...group, conditions });
      }
      const actions = [];
      for (const actionData of ruleData.actions) {
        const [action] = await tx.insert(ruleActions).values({
          ruleId: rule.id,
          actionOrder: actionData.actionOrder,
          actionType: actionData.actionType,
          quantity: actionData.quantity,
          percentage: actionData.percentage,
          allowRepeat: actionData.allowRepeat,
          cooldownMinutes: actionData.cooldownMinutes
        }).returning();
        actions.push(action);
      }
      return {
        ...rule,
        groups: groupsWithConditions,
        actions
      };
    });
    return result;
  }
  async updateCompoundRule(id, ruleData) {
    const existing = await this.getCompoundRule(id);
    if (!existing) return void 0;
    const result = await db.transaction(async (tx) => {
      const [rule] = await tx.update(tradingRules).set({
        name: ruleData.name ?? existing.name,
        enabled: ruleData.enabled ?? existing.enabled,
        scope: ruleData.scope ?? existing.scope,
        ticker: ruleData.ticker ?? existing.ticker,
        priority: ruleData.priority ?? existing.priority,
        updatedAt: sql2`now()`
      }).where(eq(tradingRules.id, id)).returning();
      if (ruleData.groups) {
        await tx.delete(ruleConditionGroups).where(eq(ruleConditionGroups.ruleId, id));
        const groupsWithConditions = [];
        for (const groupData of ruleData.groups) {
          const [group] = await tx.insert(ruleConditionGroups).values({
            ruleId: id,
            groupOrder: groupData.groupOrder,
            junctionOperator: groupData.junctionOperator,
            description: groupData.description
          }).returning();
          const conditions = [];
          for (const conditionData of groupData.conditions) {
            const [condition] = await tx.insert(ruleConditions).values({
              groupId: group.id,
              metric: conditionData.metric,
              comparator: conditionData.comparator,
              threshold: conditionData.threshold,
              timeframeValue: conditionData.timeframeValue,
              timeframeUnit: conditionData.timeframeUnit,
              metadata: conditionData.metadata
            }).returning();
            conditions.push(condition);
          }
          groupsWithConditions.push({ ...group, conditions });
        }
      }
      if (ruleData.actions) {
        await tx.delete(ruleActions).where(eq(ruleActions.ruleId, id));
        for (const actionData of ruleData.actions) {
          await tx.insert(ruleActions).values({
            ruleId: id,
            actionOrder: actionData.actionOrder,
            actionType: actionData.actionType,
            quantity: actionData.quantity,
            percentage: actionData.percentage,
            allowRepeat: actionData.allowRepeat,
            cooldownMinutes: actionData.cooldownMinutes
          });
        }
      }
      return rule;
    });
    return await this.getCompoundRule(id);
  }
  async deleteCompoundRule(id) {
    const result = await db.delete(tradingRules).where(eq(tradingRules.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }
  // Rule Executions (audit log)
  async getRuleExecutions(ruleId, ticker) {
    let query = db.select().from(ruleExecutions).orderBy(desc(ruleExecutions.triggeredAt));
    if (ruleId && ticker) {
      return await query.where(and(eq(ruleExecutions.ruleId, ruleId), eq(ruleExecutions.ticker, ticker)));
    } else if (ruleId) {
      return await query.where(eq(ruleExecutions.ruleId, ruleId));
    } else if (ticker) {
      return await query.where(eq(ruleExecutions.ticker, ticker));
    }
    return await query;
  }
  async createRuleExecution(execution) {
    const [newExecution] = await db.insert(ruleExecutions).values(execution).returning();
    return newExecution;
  }
  // Backtests
  async getBacktests() {
    return await db.select().from(backtests).orderBy(desc(backtests.createdAt));
  }
  async getBacktest(id) {
    const [backtest] = await db.select().from(backtests).where(eq(backtests.id, id));
    return backtest;
  }
  async createBacktest(backtest) {
    const [newBacktest] = await db.insert(backtests).values(backtest).returning();
    return newBacktest;
  }
  // Telegram Configuration
  async getTelegramConfig() {
    const [config] = await db.select().from(telegramConfig).limit(1);
    return config;
  }
  async createOrUpdateTelegramConfig(config) {
    const existing = await this.getTelegramConfig();
    if (existing) {
      const [updated] = await db.update(telegramConfig).set({ ...config, lastSync: sql2`now()` }).where(eq(telegramConfig.id, existing.id)).returning();
      return updated;
    } else {
      const [newConfig] = await db.insert(telegramConfig).values(config).returning();
      return newConfig;
    }
  }
  async updateTelegramSyncStatus(lastMessageId) {
    const existing = await this.getTelegramConfig();
    if (existing) {
      await db.update(telegramConfig).set({ lastSync: sql2`now()`, lastMessageId }).where(eq(telegramConfig.id, existing.id));
    }
  }
  async updateTelegramSession(sessionString) {
    const existing = await this.getTelegramConfig();
    if (existing) {
      await db.update(telegramConfig).set({ sessionString }).where(eq(telegramConfig.id, existing.id));
    }
  }
  // IBKR Configuration
  async getIbkrConfig() {
    const [config] = await db.select().from(ibkrConfig).limit(1);
    return config;
  }
  async createOrUpdateIbkrConfig(config) {
    const existing = await this.getIbkrConfig();
    if (existing) {
      const [updated] = await db.update(ibkrConfig).set(config).where(eq(ibkrConfig.id, existing.id)).returning();
      return updated;
    } else {
      const [newConfig] = await db.insert(ibkrConfig).values({
        gatewayUrl: config.gatewayUrl || "https://localhost:5000",
        isPaperTrading: config.isPaperTrading !== void 0 ? config.isPaperTrading : true
      }).returning();
      return newConfig;
    }
  }
  async updateIbkrConnectionStatus(isConnected, accountId, error) {
    const existing = await this.getIbkrConfig();
    if (existing) {
      await db.update(ibkrConfig).set({
        isConnected,
        lastConnectionCheck: sql2`now()`,
        ...accountId && { accountId },
        ...error !== void 0 && { lastError: error }
      }).where(eq(ibkrConfig.id, existing.id));
    }
  }
  // OpenInsider Configuration
  async getOpeninsiderConfig() {
    const [config] = await db.select().from(openinsiderConfig).limit(1);
    return config;
  }
  async createOrUpdateOpeninsiderConfig(config) {
    const existing = await this.getOpeninsiderConfig();
    if (existing) {
      const [updated] = await db.update(openinsiderConfig).set(config).where(eq(openinsiderConfig.id, existing.id)).returning();
      return updated;
    } else {
      const [newConfig] = await db.insert(openinsiderConfig).values({
        enabled: config.enabled !== void 0 ? config.enabled : false,
        fetchLimit: config.fetchLimit || 50
      }).returning();
      return newConfig;
    }
  }
  async updateOpeninsiderSyncStatus(error) {
    const existing = await this.getOpeninsiderConfig();
    if (existing) {
      await db.update(openinsiderConfig).set({
        lastSync: sql2`now()`,
        ...error !== void 0 && { lastError: error }
      }).where(eq(openinsiderConfig.id, existing.id));
    }
  }
  // What-If Backtest Jobs
  async getBacktestJobs(userId) {
    return await db.select().from(backtestJobs).where(eq(backtestJobs.userId, userId)).orderBy(desc(backtestJobs.createdAt));
  }
  async getBacktestJob(id) {
    const [job] = await db.select().from(backtestJobs).where(eq(backtestJobs.id, id));
    return job;
  }
  async createBacktestJob(job) {
    const [newJob] = await db.insert(backtestJobs).values(job).returning();
    return newJob;
  }
  async updateBacktestJob(id, updates) {
    const [updated] = await db.update(backtestJobs).set(updates).where(eq(backtestJobs.id, id)).returning();
    return updated;
  }
  async deleteBacktestJob(id) {
    await db.delete(backtestPriceData).where(eq(backtestPriceData.jobId, id));
    await db.delete(backtestScenarios).where(eq(backtestScenarios.jobId, id));
    const result = await db.delete(backtestJobs).where(eq(backtestJobs.id, id));
    return true;
  }
  // Backtest Price Data
  async getBacktestPriceData(jobId) {
    const allData = await db.select().from(backtestPriceData).where(eq(backtestPriceData.jobId, jobId));
    const uniqueByTicker = /* @__PURE__ */ new Map();
    allData.forEach((data) => {
      if (!uniqueByTicker.has(data.ticker) || data.createdAt && uniqueByTicker.get(data.ticker).createdAt && data.createdAt > uniqueByTicker.get(data.ticker).createdAt) {
        uniqueByTicker.set(data.ticker, data);
      }
    });
    return Array.from(uniqueByTicker.values());
  }
  async getCachedPriceData(ticker, insiderBuyDate) {
    const results = await db.select().from(backtestPriceData).where(
      and(
        eq(backtestPriceData.ticker, ticker),
        eq(backtestPriceData.insiderBuyDate, insiderBuyDate)
      )
    ).limit(1);
    return results[0];
  }
  async createBacktestPriceData(data) {
    const [newData] = await db.insert(backtestPriceData).values(data).returning();
    return newData;
  }
  // Backtest Scenarios (returns only top 10 sorted by P&L)
  async getBacktestScenarios(jobId) {
    return await db.select().from(backtestScenarios).where(eq(backtestScenarios.jobId, jobId)).orderBy(desc(backtestScenarios.totalProfitLoss)).limit(10);
  }
  async createBacktestScenario(scenario) {
    const [newScenario] = await db.insert(backtestScenarios).values(scenario).returning();
    return newScenario;
  }
  // Users
  async getUsers(options) {
    if (options?.includeArchived) {
      return await db.select().from(users);
    }
    return await db.select().from(users).where(eq(users.archived, false));
  }
  async getAllUserIds() {
    const result = await db.select({ id: users.id }).from(users).where(eq(users.archived, false));
    return result.map((r) => r.id);
  }
  async getUser(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  async getUserByEmail(email) {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }
  async createUser(user) {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }
  async updateUser(id, updates) {
    const [updatedUser] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return updatedUser;
  }
  async markUserInitialDataFetched(userId) {
    await db.update(users).set({ initialDataFetched: true }).where(eq(users.id, userId));
  }
  async markUserHasSeenOnboarding(userId) {
    await db.update(users).set({ hasSeenOnboarding: true }).where(eq(users.id, userId));
  }
  async completeUserOnboarding(userId) {
    await db.update(users).set({
      onboardingCompletedAt: /* @__PURE__ */ new Date(),
      hasSeenOnboarding: true
    }).where(eq(users.id, userId));
  }
  async getUserProgress(userId) {
    const [user] = await db.select({
      onboardingCompletedAt: users.onboardingCompletedAt,
      tutorialCompletions: users.tutorialCompletions
    }).from(users).where(eq(users.id, userId));
    if (!user) {
      return { onboardingCompletedAt: null, tutorialCompletions: {} };
    }
    return {
      onboardingCompletedAt: user.onboardingCompletedAt,
      tutorialCompletions: user.tutorialCompletions || {}
    };
  }
  async completeTutorial(userId, tutorialId) {
    const [user] = await db.select({ tutorialCompletions: users.tutorialCompletions }).from(users).where(eq(users.id, userId));
    if (!user) return;
    const completions = user.tutorialCompletions || {};
    completions[tutorialId] = true;
    await db.update(users).set({ tutorialCompletions: completions }).where(eq(users.id, userId));
  }
  async deleteUser(id) {
    const result = await db.delete(users).where(eq(users.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }
  async archiveUser(userId, archivedBy) {
    const [archivedUser] = await db.update(users).set({
      archived: true,
      archivedAt: /* @__PURE__ */ new Date(),
      archivedBy
    }).where(eq(users.id, userId)).returning();
    return archivedUser;
  }
  async unarchiveUser(userId) {
    const [unarchivedUser] = await db.update(users).set({
      archived: false,
      archivedAt: null,
      archivedBy: null
    }).where(eq(users.id, userId)).returning();
    return unarchivedUser;
  }
  async updateUserSubscriptionStatus(userId, status, endDate) {
    const updates = { subscriptionStatus: status };
    if (endDate) {
      updates.subscriptionEndDate = endDate;
    }
    const [updatedUser] = await db.update(users).set(updates).where(eq(users.id, userId)).returning();
    return updatedUser;
  }
  // Payments
  async getUserPayments(userId) {
    return await db.select().from(payments).where(eq(payments.userId, userId)).orderBy(desc(payments.paymentDate));
  }
  async createPayment(payment) {
    const [newPayment] = await db.insert(payments).values(payment).returning();
    return newPayment;
  }
  async getPaymentStats(userId) {
    const [stats] = await db.select({
      totalPaid: sql2`COALESCE(SUM(${payments.amount}), 0)::text`,
      lastPaymentDate: sql2`MAX(${payments.paymentDate})`,
      lastPaymentAmount: sql2`(
          SELECT ${payments.amount}::text 
          FROM ${payments} 
          WHERE ${payments.userId} = ${userId} 
          ORDER BY ${payments.paymentDate} DESC 
          LIMIT 1
        )`,
      paymentCount: sql2`COUNT(*)::int`
    }).from(payments).where(eq(payments.userId, userId));
    return stats || {
      totalPaid: "0",
      lastPaymentDate: null,
      lastPaymentAmount: null,
      paymentCount: 0
    };
  }
  // Manual Overrides
  async createManualOverride(override) {
    const [newOverride] = await db.insert(manualOverrides).values(override).returning();
    return newOverride;
  }
  async getUserManualOverrides(userId) {
    return await db.select().from(manualOverrides).where(eq(manualOverrides.userId, userId)).orderBy(desc(manualOverrides.createdAt));
  }
  async getActiveManualOverride(userId) {
    const now = /* @__PURE__ */ new Date();
    const [override] = await db.select().from(manualOverrides).where(
      and(
        eq(manualOverrides.userId, userId),
        sql2`${manualOverrides.startDate} <= ${now}`,
        sql2`${manualOverrides.endDate} > ${now}`
      )
    ).orderBy(desc(manualOverrides.endDate)).limit(1);
    return override;
  }
  // Password Reset
  async createPasswordResetToken(token) {
    const [newToken] = await db.insert(passwordResetTokens).values(token).returning();
    return newToken;
  }
  async getPasswordResetToken(token) {
    const [resetToken] = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.token, token));
    return resetToken;
  }
  async markPasswordResetTokenUsed(tokenId) {
    const result = await db.update(passwordResetTokens).set({ used: true }).where(eq(passwordResetTokens.id, tokenId));
    return result.rowCount ? result.rowCount > 0 : false;
  }
  async purgeExpiredPasswordResetTokens() {
    const now = /* @__PURE__ */ new Date();
    const result = await db.delete(passwordResetTokens).where(
      sql2`${passwordResetTokens.expiresAt} < ${now} OR ${passwordResetTokens.used} = true`
    );
    return result.rowCount || 0;
  }
  // Stock Comments
  async getStockComments(ticker) {
    const comments = await db.select({
      comment: stockComments,
      user: users
    }).from(stockComments).leftJoin(users, eq(stockComments.userId, users.id)).where(eq(stockComments.ticker, ticker)).orderBy(desc(stockComments.createdAt));
    return comments.map((row) => ({
      ...row.comment,
      user: row.user
    }));
  }
  async createStockComment(comment) {
    const [newComment] = await db.insert(stockComments).values(comment).returning();
    return newComment;
  }
  async getStockCommentCounts() {
    const counts = await db.select({
      ticker: stockComments.ticker,
      count: sql2`count(*)::int`
    }).from(stockComments).groupBy(stockComments.ticker);
    return counts;
  }
  // Followed Stocks
  async getUserFollowedStocks(userId) {
    return await db.select().from(followedStocks).where(eq(followedStocks.userId, userId)).orderBy(desc(followedStocks.followedAt));
  }
  async followStock(follow) {
    const [newFollow] = await db.insert(followedStocks).values(follow).returning();
    eventDispatcher.emit("FOLLOWED_STOCK_UPDATED", {
      type: "FOLLOWED_STOCK_UPDATED",
      userId: follow.userId,
      ticker: follow.ticker,
      data: { action: "follow" }
    });
    return newFollow;
  }
  async unfollowStock(ticker, userId) {
    await db.delete(followedStocks).where(
      and(
        eq(followedStocks.ticker, ticker),
        eq(followedStocks.userId, userId)
      )
    );
    eventDispatcher.emit("FOLLOWED_STOCK_UPDATED", {
      type: "FOLLOWED_STOCK_UPDATED",
      userId,
      ticker,
      data: { action: "unfollow" }
    });
    return true;
  }
  async toggleStockPosition(ticker, userId, hasEnteredPosition) {
    const result = await db.update(followedStocks).set({ hasEnteredPosition }).where(
      and(
        eq(followedStocks.ticker, ticker),
        eq(followedStocks.userId, userId)
      )
    ).returning();
    if (result.length === 0) {
      throw new Error("Stock is not being followed");
    }
    eventDispatcher.emit("FOLLOWED_STOCK_UPDATED", {
      type: "FOLLOWED_STOCK_UPDATED",
      userId,
      ticker,
      data: { action: "position_toggle", hasEnteredPosition }
    });
    return true;
  }
  // Cross-user aggregation for "popular stock" notifications
  async getFollowerCountForTicker(ticker) {
    const result = await db.select({ count: sql2`count(*)::int` }).from(followedStocks).where(eq(followedStocks.ticker, ticker));
    return result[0]?.count || 0;
  }
  async getFollowerUserIdsForTicker(ticker) {
    const result = await db.select({ userId: followedStocks.userId }).from(followedStocks).where(eq(followedStocks.ticker, ticker));
    return result.map((r) => r.userId);
  }
  async getFollowedStocksWithPrices(userId) {
    const followedStocksList = await this.getUserFollowedStocks(userId);
    const results = [];
    for (const followed of followedStocksList) {
      const stockData = await db.select().from(stocks).where(eq(stocks.ticker, followed.ticker)).orderBy(desc(stocks.lastUpdated)).limit(1);
      if (stockData.length > 0) {
        const stock = stockData[0];
        const currentPrice = parseFloat(stock.currentPrice);
        const previousPrice = stock.previousClose ? parseFloat(stock.previousClose) : currentPrice;
        const priceChange = currentPrice - previousPrice;
        const priceChangePercent = previousPrice !== 0 ? priceChange / previousPrice * 100 : 0;
        results.push({
          ...followed,
          currentPrice: stock.currentPrice,
          priceChange: priceChange.toFixed(2),
          priceChangePercent: priceChangePercent.toFixed(2)
        });
      } else {
        results.push({
          ...followed,
          currentPrice: "0.00",
          priceChange: "0.00",
          priceChangePercent: "0.00"
        });
      }
    }
    return results;
  }
  async getFollowedStocksWithStatus(userId) {
    const followedWithPrices = await this.getFollowedStocksWithPrices(userId);
    const results = [];
    for (const followed of followedWithPrices) {
      const stockData = await db.select().from(stocks).where(eq(stocks.ticker, followed.ticker)).orderBy(desc(stocks.lastUpdated)).limit(1);
      const stock = stockData[0];
      const insiderAction = stock?.recommendation?.toUpperCase() || null;
      const jobs = await db.select().from(aiAnalysisJobs).where(eq(aiAnalysisJobs.ticker, followed.ticker)).orderBy(desc(aiAnalysisJobs.createdAt)).limit(1);
      const latestJob = jobs[0];
      const jobStatus = latestJob?.status || null;
      const briefs = await db.select().from(dailyBriefs).where(eq(dailyBriefs.ticker, followed.ticker)).orderBy(desc(dailyBriefs.briefDate)).limit(1);
      const latestBrief = briefs[0];
      const normalizeStance = (rawStance) => {
        if (!rawStance) return null;
        const stance = rawStance.toLowerCase().trim();
        if (stance === "enter") return "buy";
        if (stance === "wait") return "hold";
        if (stance === "buy" || stance === "sell" || stance === "hold") return stance;
        console.warn(`[Storage] Unknown stance value: "${rawStance}", defaulting to "hold"`);
        return "hold";
      };
      const watchingStance = normalizeStance(latestBrief?.watchingStance);
      const owningStance = normalizeStance(latestBrief?.owningStance);
      const aiScore = latestBrief?.watchingConfidence ?? null;
      const analyses = await db.select().from(stockAnalyses).where(eq(stockAnalyses.ticker, followed.ticker)).limit(1);
      const analysis = analyses[0];
      const integratedScore = analysis?.integratedScore ?? null;
      let stanceAlignment = null;
      if (watchingStance || owningStance) {
        if (watchingStance === "buy" || watchingStance === "sell" || owningStance === "buy" || owningStance === "sell") {
          stanceAlignment = "act";
        } else {
          stanceAlignment = "hold";
        }
      }
      let aiStance = "HOLD";
      const relevantStance = followed.hasEnteredPosition ? owningStance : watchingStance;
      if (relevantStance === "buy") {
        aiStance = "BUY";
      } else if (relevantStance === "sell") {
        aiStance = "SELL";
      } else if (relevantStance === "hold") {
        aiStance = "HOLD";
      }
      results.push({
        ...followed,
        jobStatus,
        insiderAction,
        aiStance,
        aiScore,
        integratedScore,
        stanceAlignment
      });
    }
    return results;
  }
  async getDailyBriefsForTicker(ticker) {
    return await db.select().from(dailyBriefs).where(eq(dailyBriefs.ticker, ticker)).orderBy(desc(dailyBriefs.briefDate)).limit(7);
  }
  async getDailyBriefForUser(userId, ticker, briefDate) {
    const [brief] = await db.select().from(dailyBriefs).where(
      and(
        eq(dailyBriefs.userId, userId),
        eq(dailyBriefs.ticker, ticker),
        eq(dailyBriefs.briefDate, briefDate)
      )
    ).limit(1);
    return brief;
  }
  async createDailyBrief(brief) {
    const [existing] = await db.select().from(dailyBriefs).where(
      and(
        eq(dailyBriefs.userId, brief.userId),
        eq(dailyBriefs.ticker, brief.ticker),
        eq(dailyBriefs.briefDate, brief.briefDate)
      )
    ).limit(1);
    if (existing) {
      const [updated] = await db.update(dailyBriefs).set(brief).where(eq(dailyBriefs.id, existing.id)).returning();
      return updated;
    }
    const [created] = await db.insert(dailyBriefs).values(brief).returning();
    return created;
  }
  async getUserStockStatus(userId, ticker) {
    const [status] = await db.select().from(userStockStatuses).where(
      and(
        eq(userStockStatuses.userId, userId),
        eq(userStockStatuses.ticker, ticker)
      )
    );
    return status;
  }
  async getUserStockStatuses(userId, status) {
    if (status) {
      return await db.select().from(userStockStatuses).where(
        and(
          eq(userStockStatuses.userId, userId),
          eq(userStockStatuses.status, status)
        )
      );
    }
    return await db.select().from(userStockStatuses).where(eq(userStockStatuses.userId, userId));
  }
  async getStocksWithUserStatus(userId, limit = 100) {
    try {
      console.log(`[Storage] getStocksWithUserStatus called for userId: ${userId}, limit: ${limit}`);
      const twoWeeksAgo = /* @__PURE__ */ new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      const twoWeeksAgoString = twoWeeksAgo.toISOString().split("T")[0];
      const results = await db.select({
        stock: stocks,
        userStatus: userStockStatuses.status,
        userApprovedAt: userStockStatuses.approvedAt,
        userRejectedAt: userStockStatuses.rejectedAt,
        userDismissedAt: userStockStatuses.dismissedAt,
        isFollowing: followedStocks.ticker
      }).from(stocks).leftJoin(
        userStockStatuses,
        and(
          eq(stocks.ticker, userStockStatuses.ticker),
          eq(userStockStatuses.userId, userId)
        )
      ).leftJoin(
        followedStocks,
        and(
          eq(stocks.ticker, followedStocks.ticker),
          eq(followedStocks.userId, userId)
        )
      ).where(
        and(
          eq(stocks.userId, userId),
          // CRITICAL: Filter by user
          eq(stocks.recommendationStatus, "pending"),
          sql2`(${stocks.insiderTradeDate} >= ${twoWeeksAgoString} OR ${followedStocks.ticker} IS NOT NULL)`
        )
      ).orderBy(desc(stocks.insiderTradeDate)).limit(limit);
      console.log(`[Storage] Query returned ${results.length} rows`);
      const allJobs = await db.select().from(aiAnalysisJobs).where(
        and(
          inArray(aiAnalysisJobs.ticker, results.map((r) => r.stock.ticker)),
          inArray(aiAnalysisJobs.status, ["pending", "processing", "failed"])
        )
      );
      console.log(`[Storage] Found ${allJobs.length} active AI jobs`);
      const jobsByTicker = /* @__PURE__ */ new Map();
      for (const job of allJobs) {
        const existing = jobsByTicker.get(job.ticker);
        if (!existing || job.createdAt && existing.createdAt && job.createdAt > existing.createdAt) {
          jobsByTicker.set(job.ticker, job);
        }
      }
      const transformed = results.map((row) => {
        const latestJob = jobsByTicker.get(row.stock.ticker);
        const lastUpdated = row.stock.lastUpdated || /* @__PURE__ */ new Date();
        return {
          ...row.stock,
          isStale: isStockStale(lastUpdated),
          ageDays: getStockAgeInDays(lastUpdated),
          userStatus: row.userStatus || "pending",
          userApprovedAt: row.userApprovedAt,
          userRejectedAt: row.userRejectedAt,
          userDismissedAt: row.userDismissedAt,
          analysisJob: latestJob ? {
            status: latestJob.status,
            currentStep: latestJob.currentStep,
            stepDetails: latestJob.stepDetails,
            lastError: latestJob.lastError,
            updatedAt: latestJob.createdAt
          } : null
        };
      });
      console.log(`[Storage] Transformed ${transformed.length} stocks`);
      console.log(`[Storage] Sample:`, transformed[0] ? {
        ticker: transformed[0].ticker,
        userStatus: transformed[0].userStatus,
        recommendationStatus: transformed[0].recommendationStatus
      } : "no data");
      return transformed;
    } catch (error) {
      console.error("[Storage] getStocksWithUserStatus ERROR:", error);
      throw error;
    }
  }
  async createUserStockStatus(statusData) {
    const [status] = await db.insert(userStockStatuses).values(statusData).onConflictDoUpdate({
      target: [userStockStatuses.userId, userStockStatuses.ticker],
      set: {
        status: statusData.status,
        approvedAt: statusData.approvedAt || null,
        rejectedAt: statusData.rejectedAt || null,
        dismissedAt: statusData.dismissedAt || null,
        updatedAt: /* @__PURE__ */ new Date()
      }
    }).returning();
    if (!status) {
      throw new Error(`Failed to create/update user stock status for ${statusData.ticker}`);
    }
    return status;
  }
  async updateUserStockStatus(userId, ticker, updates) {
    const [updated] = await db.update(userStockStatuses).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(
      and(
        eq(userStockStatuses.userId, userId),
        eq(userStockStatuses.ticker, ticker)
      )
    ).returning();
    if (updated && updates.status) {
      eventDispatcher.emit("STOCK_STATUS_CHANGED", {
        type: "STOCK_STATUS_CHANGED",
        userId,
        ticker,
        status: updates.status
      });
    }
    return updated;
  }
  async ensureUserStockStatus(userId, ticker) {
    const existing = await this.getUserStockStatus(userId, ticker);
    if (existing) {
      return existing;
    }
    return await this.createUserStockStatus({ userId, ticker, status: "pending" });
  }
  async rejectTickerForUser(userId, ticker) {
    await this.ensureUserStockStatus(userId, ticker);
    const userStatus = await this.updateUserStockStatus(userId, ticker, {
      status: "rejected",
      rejectedAt: /* @__PURE__ */ new Date(),
      approvedAt: null,
      dismissedAt: null
    });
    const stockCount = await db.select().from(stocks).where(and(
      eq(stocks.ticker, ticker),
      eq(stocks.userId, userId)
    ));
    console.log(`[RejectTicker] User ${userId} rejected ticker ${ticker} (${stockCount.length} user transactions)`);
    return {
      userStatus,
      stocksUpdated: stockCount.length
    };
  }
  async markStockAsViewed(ticker, userId) {
    const existing = await db.select().from(stockViews).where(
      and(
        eq(stockViews.ticker, ticker),
        eq(stockViews.userId, userId)
      )
    ).limit(1);
    if (existing.length > 0) {
      return existing[0];
    }
    const [view] = await db.insert(stockViews).values({ ticker, userId }).returning();
    return view;
  }
  async getUserStockViews(userId) {
    const views = await db.select({ ticker: stockViews.ticker }).from(stockViews).where(eq(stockViews.userId, userId));
    return views.map((v) => v.ticker);
  }
  async hasCompletedTutorial(userId, tutorialId) {
    const result = await db.select().from(userTutorials).where(and(eq(userTutorials.userId, userId), eq(userTutorials.tutorialId, tutorialId))).limit(1);
    return result.length > 0;
  }
  async markTutorialAsCompleted(userId, tutorialId) {
    const existing = await db.select().from(userTutorials).where(and(eq(userTutorials.userId, userId), eq(userTutorials.tutorialId, tutorialId))).limit(1);
    if (existing.length > 0) {
      return existing[0];
    }
    const [tutorial] = await db.insert(userTutorials).values({ userId, tutorialId }).returning();
    return tutorial;
  }
  async getUserTutorials(userId) {
    return await db.select().from(userTutorials).where(eq(userTutorials.userId, userId));
  }
  async getStockAnalysis(ticker) {
    const [analysis] = await db.select().from(stockAnalyses).where(eq(stockAnalyses.ticker, ticker));
    return analysis;
  }
  async getAllStockAnalyses() {
    return await db.select().from(stockAnalyses);
  }
  async saveStockAnalysis(analysis) {
    await db.delete(stockAnalyses).where(eq(stockAnalyses.ticker, analysis.ticker));
    const [newAnalysis] = await db.insert(stockAnalyses).values(analysis).returning();
    return newAnalysis;
  }
  async updateStockAnalysis(ticker, updates) {
    await db.update(stockAnalyses).set(updates).where(eq(stockAnalyses.ticker, ticker));
  }
  async updateStockAnalysisStatus(ticker, status, errorMessage) {
    const updates = {
      status,
      errorMessage: errorMessage || null
      // Clear error message if not provided
    };
    await db.update(stockAnalyses).set(updates).where(eq(stockAnalyses.ticker, ticker));
  }
  // Stock Candlesticks Methods (shared OHLCV data - one record per ticker, reused across users)
  async getCandlesticksByTicker(ticker) {
    const [candlesticks] = await db.select().from(stockCandlesticks).where(eq(stockCandlesticks.ticker, ticker));
    return candlesticks;
  }
  async upsertCandlesticks(ticker, candlestickData) {
    const existing = await this.getCandlesticksByTicker(ticker);
    if (existing) {
      const [updated] = await db.update(stockCandlesticks).set({
        candlestickData,
        lastUpdated: /* @__PURE__ */ new Date()
      }).where(eq(stockCandlesticks.ticker, ticker)).returning();
      return updated;
    } else {
      const [inserted] = await db.insert(stockCandlesticks).values({
        ticker,
        candlestickData,
        lastUpdated: /* @__PURE__ */ new Date()
      }).returning();
      return inserted;
    }
  }
  async getAllTickersNeedingCandlestickData() {
    const oneDayAgo = /* @__PURE__ */ new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    const allTickers = await db.selectDistinct({ ticker: stocks.ticker }).from(stocks);
    const tickersWithRecentData = await db.select({ ticker: stockCandlesticks.ticker }).from(stockCandlesticks).where(sql2`${stockCandlesticks.lastUpdated} >= ${oneDayAgo}`);
    const recentTickerSet = new Set(tickersWithRecentData.map((t) => t.ticker));
    return allTickers.map((t) => t.ticker).filter((ticker) => !recentTickerSet.has(ticker));
  }
  // AI Analysis Job Queue Methods
  async enqueueAnalysisJob(ticker, source, priority = "normal", force = false) {
    if (force) {
      await db.update(aiAnalysisJobs).set({ status: "cancelled", completedAt: /* @__PURE__ */ new Date() }).where(
        and(
          eq(aiAnalysisJobs.ticker, ticker),
          sql2`${aiAnalysisJobs.status} IN ('pending', 'processing')`
        )
      );
      console.log(`[Queue] Cancelled existing jobs for ${ticker} (force re-analysis)`);
    } else {
      const [existingJob] = await db.select().from(aiAnalysisJobs).where(
        and(
          eq(aiAnalysisJobs.ticker, ticker),
          sql2`${aiAnalysisJobs.status} IN ('pending', 'processing')`
        )
      ).limit(1);
      if (existingJob) {
        console.log(`[Queue] Job already exists for ${ticker} with status ${existingJob.status}`);
        return existingJob;
      }
    }
    try {
      const [job] = await db.insert(aiAnalysisJobs).values({
        ticker,
        source,
        priority,
        status: "pending",
        retryCount: 0,
        maxRetries: 3,
        scheduledAt: /* @__PURE__ */ new Date()
      }).returning();
      const existingAnalysis = await this.getStockAnalysis(ticker);
      if (existingAnalysis) {
        if (existingAnalysis.status !== "completed" || !existingAnalysis.integratedScore) {
          await this.updateStockAnalysis(ticker, { status: "analyzing", errorMessage: null });
        }
      } else {
        await db.insert(stockAnalyses).values({
          ticker,
          status: "analyzing"
        });
      }
      console.log(`[Queue] Enqueued analysis job for ${ticker} (priority: ${priority}, source: ${source})`);
      return job;
    } catch (error) {
      if (error.code === "23505" || error.message?.includes("unique")) {
        console.log(`[Queue] Race condition detected for ${ticker}, fetching existing job`);
        const [existingJob] = await db.select().from(aiAnalysisJobs).where(
          and(
            eq(aiAnalysisJobs.ticker, ticker),
            sql2`${aiAnalysisJobs.status} IN ('pending', 'processing')`
          )
        ).limit(1);
        if (existingJob) {
          return existingJob;
        }
      }
      throw error;
    }
  }
  async cancelAnalysisJobsForTicker(ticker) {
    await db.update(aiAnalysisJobs).set({ status: "cancelled", completedAt: /* @__PURE__ */ new Date() }).where(
      and(
        eq(aiAnalysisJobs.ticker, ticker),
        sql2`${aiAnalysisJobs.status} IN ('pending', 'processing')`
      )
    );
    console.log(`[Queue] Cancelled any active jobs for ${ticker}`);
  }
  async dequeueNextJob() {
    const result = await db.execute(sql2`
      UPDATE ${aiAnalysisJobs}
      SET status = 'processing',
          started_at = NOW()
      WHERE id = (
        SELECT id
        FROM ${aiAnalysisJobs}
        WHERE status = 'pending'
          AND scheduled_at <= NOW()
        ORDER BY
          CASE priority
            WHEN 'high' THEN 1
            WHEN 'normal' THEN 2
            WHEN 'low' THEN 3
            ELSE 4
          END,
          scheduled_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      RETURNING *
    `);
    const jobs = result.rows;
    return jobs.length > 0 ? jobs[0] : void 0;
  }
  async getJobById(jobId) {
    const [job] = await db.select().from(aiAnalysisJobs).where(eq(aiAnalysisJobs.id, jobId));
    return job;
  }
  async getJobsByTicker(ticker) {
    return await db.select().from(aiAnalysisJobs).where(eq(aiAnalysisJobs.ticker, ticker)).orderBy(desc(aiAnalysisJobs.createdAt));
  }
  async updateJobStatus(jobId, status, updates = {}) {
    const updateData = {
      status,
      ...updates
    };
    if (status === "completed" || status === "failed") {
      updateData.completedAt = /* @__PURE__ */ new Date();
    }
    await db.update(aiAnalysisJobs).set(updateData).where(eq(aiAnalysisJobs.id, jobId));
    console.log(`[Queue] Updated job ${jobId} to status: ${status}`);
  }
  async updateJobProgress(jobId, currentStep, stepDetails) {
    await db.update(aiAnalysisJobs).set({
      currentStep,
      stepDetails,
      lastError: null
      // Clear error on successful progress update
    }).where(eq(aiAnalysisJobs.id, jobId));
  }
  async resetStockAnalysisPhaseFlags(ticker) {
    const result = await db.execute(sql2`
      WITH lock AS (SELECT pg_advisory_xact_lock(hashtext(${ticker})))
      UPDATE ${stocks}
      SET 
        micro_analysis_completed = false,
        macro_analysis_completed = false,
        combined_analysis_completed = false
      WHERE ticker = ${ticker}
    `);
    console.log(`[Storage] Reset phase flags for ${ticker} (updated ${result.rowCount || 0} rows)`);
  }
  async markStockAnalysisPhaseComplete(ticker, phase) {
    const fieldMap = {
      "micro": "micro_analysis_completed",
      "macro": "macro_analysis_completed",
      "combined": "combined_analysis_completed"
    };
    const fieldName = fieldMap[phase];
    const result = await db.execute(sql2`
      WITH lock AS (SELECT pg_advisory_xact_lock(hashtext(${ticker})))
      UPDATE ${stocks}
      SET ${sql2.raw(fieldName)} = true
      WHERE ticker = ${ticker}
    `);
    console.log(`[Storage] Marked ${phase} analysis complete for ${ticker} (updated ${result.rowCount || 0} rows)`);
  }
  async getStocksWithIncompleteAnalysis() {
    const incompleteStocks = await db.select().from(stocks).where(
      and(
        eq(stocks.recommendationStatus, "pending"),
        sql2`(
            ${stocks.microAnalysisCompleted} = false
            OR ${stocks.macroAnalysisCompleted} = false
            OR ${stocks.combinedAnalysisCompleted} = false
          )`,
        sql2`NOT EXISTS (
            SELECT 1 FROM ${aiAnalysisJobs}
            WHERE ${aiAnalysisJobs.ticker} = ${stocks.ticker}
            AND ${aiAnalysisJobs.status} IN ('pending', 'processing')
          )`
      )
    );
    return incompleteStocks;
  }
  async getQueueStats() {
    const stats = await db.select({
      status: aiAnalysisJobs.status,
      count: sql2`count(*)::int`
    }).from(aiAnalysisJobs).groupBy(aiAnalysisJobs.status);
    const result = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0
    };
    for (const stat of stats) {
      if (stat.status in result) {
        result[stat.status] = stat.count;
      }
    }
    return result;
  }
  // Macro Analysis Methods
  async getLatestMacroAnalysis(industry) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1e3);
    const [analysis] = await db.select().from(macroAnalyses).where(
      and(
        industry ? eq(macroAnalyses.industry, industry) : sql2`${macroAnalyses.industry} IS NULL`,
        sql2`${macroAnalyses.createdAt} >= ${sevenDaysAgo}`,
        eq(macroAnalyses.status, "completed"),
        sql2`${macroAnalyses.macroFactor} IS NOT NULL`
      )
    ).orderBy(desc(macroAnalyses.createdAt)).limit(1);
    return analysis;
  }
  async getMacroAnalysis(id) {
    const [analysis] = await db.select().from(macroAnalyses).where(eq(macroAnalyses.id, id)).limit(1);
    return analysis;
  }
  async createMacroAnalysis(analysis) {
    const [created] = await db.insert(macroAnalyses).values(analysis).returning();
    console.log(`[Storage] Created macro analysis with score ${created.macroScore} and factor ${created.macroFactor}`);
    return created;
  }
  async updateMacroAnalysisStatus(id, status, errorMessage) {
    await db.update(macroAnalyses).set({ status, errorMessage: errorMessage || null }).where(eq(macroAnalyses.id, id));
  }
  // Feature Suggestion Methods
  async getFeatureSuggestions(userId, status) {
    let query = db.select({
      id: featureSuggestions.id,
      userId: featureSuggestions.userId,
      title: featureSuggestions.title,
      description: featureSuggestions.description,
      status: featureSuggestions.status,
      voteCount: featureSuggestions.voteCount,
      createdAt: featureSuggestions.createdAt,
      updatedAt: featureSuggestions.updatedAt,
      userName: users.name
    }).from(featureSuggestions).leftJoin(users, eq(featureSuggestions.userId, users.id));
    if (status) {
      query = query.where(eq(featureSuggestions.status, status));
    }
    const suggestions = await query.orderBy(desc(featureSuggestions.voteCount), desc(featureSuggestions.createdAt));
    if (userId) {
      const userVotes = await db.select({ suggestionId: featureVotes.suggestionId }).from(featureVotes).where(eq(featureVotes.userId, userId));
      const votedSuggestionIds = new Set(userVotes.map((v) => v.suggestionId));
      return suggestions.map((s) => ({
        ...s,
        userName: s.userName || "Unknown User",
        userHasVoted: votedSuggestionIds.has(s.id)
      }));
    }
    return suggestions.map((s) => ({
      ...s,
      userName: s.userName || "Unknown User",
      userHasVoted: false
    }));
  }
  async getFeatureSuggestion(id) {
    const [suggestion] = await db.select().from(featureSuggestions).where(eq(featureSuggestions.id, id));
    return suggestion;
  }
  async createFeatureSuggestion(suggestion) {
    const [created] = await db.insert(featureSuggestions).values(suggestion).returning();
    return created;
  }
  async updateFeatureSuggestionStatus(id, status) {
    const [updated] = await db.update(featureSuggestions).set({ status, updatedAt: sql2`now()` }).where(eq(featureSuggestions.id, id)).returning();
    return updated;
  }
  async deleteFeatureSuggestion(id) {
    const result = await db.delete(featureSuggestions).where(eq(featureSuggestions.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }
  async voteForSuggestion(suggestionId, userId) {
    try {
      await db.insert(featureVotes).values({ suggestionId, userId });
      await db.update(featureSuggestions).set({
        voteCount: sql2`${featureSuggestions.voteCount} + 1`,
        updatedAt: sql2`now()`
      }).where(eq(featureSuggestions.id, suggestionId));
      return true;
    } catch (error) {
      return false;
    }
  }
  async unvoteForSuggestion(suggestionId, userId) {
    const result = await db.delete(featureVotes).where(
      and(
        eq(featureVotes.suggestionId, suggestionId),
        eq(featureVotes.userId, userId)
      )
    );
    if (result.rowCount && result.rowCount > 0) {
      await db.update(featureSuggestions).set({
        voteCount: sql2`${featureSuggestions.voteCount} - 1`,
        updatedAt: sql2`now()`
      }).where(eq(featureSuggestions.id, suggestionId));
      return true;
    }
    return false;
  }
  async hasUserVoted(suggestionId, userId) {
    const [vote] = await db.select().from(featureVotes).where(
      and(
        eq(featureVotes.suggestionId, suggestionId),
        eq(featureVotes.userId, userId)
      )
    );
    return !!vote;
  }
  // Notification Methods
  async getNotifications(userId) {
    return await db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt));
  }
  async getUnreadNotificationCount(userId) {
    const result = await db.select({ count: sql2`count(*)::int` }).from(notifications).where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false)
      )
    );
    return result[0]?.count || 0;
  }
  async createNotification(notification) {
    const [newNotification] = await db.insert(notifications).values(notification).returning();
    return newNotification;
  }
  async markNotificationAsRead(id, userId) {
    const [updated] = await db.update(notifications).set({ isRead: true }).where(
      and(
        eq(notifications.id, id),
        eq(notifications.userId, userId)
      )
    ).returning();
    return updated;
  }
  async markAllNotificationsAsRead(userId) {
    const result = await db.update(notifications).set({ isRead: true }).where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false)
      )
    );
    return result.rowCount || 0;
  }
  async clearAllNotifications(userId) {
    const result = await db.delete(notifications).where(eq(notifications.userId, userId));
    return result.rowCount || 0;
  }
  async getAnnouncements(userId) {
    const result = await db.select({
      id: announcements.id,
      title: announcements.title,
      content: announcements.content,
      type: announcements.type,
      isActive: announcements.isActive,
      createdAt: announcements.createdAt,
      createdBy: announcements.createdBy,
      readAt: announcementReads.readAt
    }).from(announcements).leftJoin(
      announcementReads,
      and(
        eq(announcementReads.announcementId, announcements.id),
        eq(announcementReads.userId, userId)
      )
    ).where(eq(announcements.isActive, true)).orderBy(desc(announcements.createdAt));
    return result;
  }
  async getUnreadAnnouncementCount(userId) {
    const result = await db.select({ count: sql2`count(*)::int` }).from(announcements).leftJoin(
      announcementReads,
      and(
        eq(announcementReads.announcementId, announcements.id),
        eq(announcementReads.userId, userId)
      )
    ).where(
      and(
        eq(announcements.isActive, true),
        sql2`${announcementReads.id} IS NULL`
      )
    );
    return result[0]?.count || 0;
  }
  async createAnnouncement(announcement) {
    const [newAnnouncement] = await db.insert(announcements).values(announcement).returning();
    return newAnnouncement;
  }
  async updateAnnouncement(id, updates) {
    const [updated] = await db.update(announcements).set(updates).where(eq(announcements.id, id)).returning();
    return updated;
  }
  async deactivateAnnouncement(id) {
    return this.updateAnnouncement(id, { isActive: false });
  }
  async markAnnouncementAsRead(userId, announcementId) {
    await db.insert(announcementReads).values({ userId, announcementId }).onConflictDoNothing();
  }
  async markAllAnnouncementsAsRead(userId) {
    const activeAnnouncements = await db.select({ id: announcements.id }).from(announcements).where(eq(announcements.isActive, true));
    if (activeAnnouncements.length > 0) {
      const values = activeAnnouncements.map((a) => ({ userId, announcementId: a.id }));
      await db.insert(announcementReads).values(values).onConflictDoNothing();
    }
  }
  async getAllAnnouncements() {
    return await db.select().from(announcements).orderBy(sql2`${announcements.createdAt} DESC`);
  }
  async deleteAnnouncement(id) {
    await db.delete(announcements).where(eq(announcements.id, id));
  }
  async getAdminNotifications() {
    return await db.select().from(adminNotifications).orderBy(sql2`${adminNotifications.createdAt} DESC`);
  }
  async getUnreadAdminNotificationCount() {
    const result = await db.select({ count: sql2`count(*)` }).from(adminNotifications).where(eq(adminNotifications.isRead, false));
    return result[0]?.count || 0;
  }
  async createAdminNotification(notification) {
    const [created] = await db.insert(adminNotifications).values(notification).returning();
    return created;
  }
  async markAdminNotificationAsRead(id) {
    const [updated] = await db.update(adminNotifications).set({ isRead: true, readAt: /* @__PURE__ */ new Date() }).where(eq(adminNotifications.id, id)).returning();
    return updated;
  }
  async markAllAdminNotificationsAsRead() {
    await db.update(adminNotifications).set({ isRead: true, readAt: /* @__PURE__ */ new Date() }).where(eq(adminNotifications.isRead, false));
  }
};
var storage = new DatabaseStorage();

// server/routes.ts
import { z as z2 } from "zod";
import { eq as eq2, or as or2 } from "drizzle-orm";

// server/telegram.ts
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { NewMessage } from "telegram/events/index.js";

// server/telegramNotificationService.ts
import TelegramBot from "node-telegram-bot-api";
var TelegramNotificationService = class {
  bot = null;
  chatId = null;
  isInitialized = false;
  async initialize() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_NOTIFICATION_CHAT_ID;
    if (!token) {
      console.log("[TelegramNotification] TELEGRAM_BOT_TOKEN not configured, notifications disabled");
      return;
    }
    if (!chatId) {
      console.log("[TelegramNotification] TELEGRAM_NOTIFICATION_CHAT_ID not configured, notifications disabled");
      return;
    }
    try {
      this.bot = new TelegramBot(token, { polling: false });
      this.chatId = chatId;
      const botInfo = await this.bot.getMe();
      console.log(`[TelegramNotification] Bot authenticated: @${botInfo.username} (${botInfo.first_name})`);
      console.log(`[TelegramNotification] Chat ID configured: ${chatId}`);
      this.isInitialized = true;
      console.log("[TelegramNotification] Service initialized successfully - ready to send alerts");
    } catch (error) {
      console.error("[TelegramNotification] Initialization failed:", error.message);
      this.isInitialized = false;
    }
  }
  /**
   * Send a plain text message
   */
  async sendMessage(text2) {
    if (!this.isInitialized || !this.bot || !this.chatId) {
      console.log("[TelegramNotification] Service not initialized, skipping notification");
      return false;
    }
    try {
      await this.bot.sendMessage(this.chatId, text2, { parse_mode: "Markdown" });
      return true;
    } catch (error) {
      console.error("[TelegramNotification] Failed to send message:", error.message);
      console.error("[TelegramNotification] Chat ID:", this.chatId);
      console.error("[TelegramNotification] Error details:", error.response?.body || error);
      return false;
    }
  }
  /**
   * Send a new stock recommendation alert
   */
  async sendStockAlert(stockData) {
    if (!this.isInitialized) {
      return false;
    }
    const emoji = stockData.recommendation?.toLowerCase().includes("buy") ? "\u{1F7E2}" : "\u{1F534}";
    const action = stockData.recommendation?.toUpperCase() || "TRADE";
    let message = `${emoji} *New ${action} Recommendation*

`;
    message += `*Ticker:* ${stockData.ticker}
`;
    message += `*Company:* ${stockData.companyName}
`;
    message += `*Current Price:* $${parseFloat(stockData.currentPrice).toFixed(2)}
`;
    if (stockData.insiderPrice) {
      message += `*Insider Price:* $${parseFloat(stockData.insiderPrice).toFixed(2)}
`;
    }
    if (stockData.insiderQuantity) {
      message += `*Insider Quantity:* ${stockData.insiderQuantity.toLocaleString()} shares
`;
    }
    if (stockData.confidenceScore) {
      message += `*Confidence:* ${stockData.confidenceScore}/100
`;
    }
    message += `
\u{1F4C8} View on Purchase page to approve or reject`;
    return await this.sendMessage(message);
  }
  /**
   * Check if the service is ready
   */
  isReady() {
    return this.isInitialized;
  }
};
var telegramNotificationService = new TelegramNotificationService();

// server/telegram.ts
var TelegramService = class {
  client = null;
  isConnected = false;
  async initialize() {
    try {
      const config = await storage.getTelegramConfig();
      if (!config || !config.enabled) {
        console.log("[Telegram] No configuration found or disabled");
        return;
      }
      const apiId = parseInt(process.env.TELEGRAM_API_ID || "");
      const apiHash = process.env.TELEGRAM_API_HASH || "";
      if (!apiId || !apiHash) {
        console.error("[Telegram] Missing API credentials");
        return;
      }
      const session2 = new StringSession(config.sessionString || "");
      this.client = new TelegramClient(session2, apiId, apiHash, {
        connectionRetries: 5
      });
      console.log("[Telegram] Connecting to Telegram...");
      if (config.sessionString) {
        try {
          await this.client.connect();
          await this.client.getDialogs({ limit: 1 });
          this.isConnected = true;
          console.log("[Telegram] Connected successfully with saved session");
          await this.setupMessageListener(config.channelUsername);
          return;
        } catch (error) {
          console.log("[Telegram] Saved session invalid, authentication required");
          this.isConnected = false;
          return;
        }
      } else {
        console.log("[Telegram] No saved session found. Authentication required.");
        console.log("[Telegram] Please authenticate via Settings page.");
        this.isConnected = false;
        return;
      }
    } catch (error) {
      console.error("[Telegram] Initialization error:", error);
      this.isConnected = false;
    }
  }
  async setupMessageListener(channelUsername) {
    if (!this.client) return;
    try {
      this.client.addEventHandler(
        async (event) => {
          const message = event.message;
          console.log("[Telegram] New message from", channelUsername);
          console.log("[Telegram] Message ID:", message.id);
          console.log("[Telegram] Text:", message.text);
          if (message.text) {
            await this.parseAndCreateStockRecommendation(message.text);
          }
          await storage.updateTelegramSyncStatus(message.id);
        },
        new NewMessage({ chats: [channelUsername] })
      );
      console.log(`[Telegram] Listening to messages from @${channelUsername}`);
    } catch (error) {
      console.error("[Telegram] Error setting up message listener:", error);
    }
  }
  async fetchRecentMessages(channelUsername, limit = 10) {
    if (!this.client || !this.isConnected) {
      throw new Error("Telegram client not connected");
    }
    try {
      const config = await storage.getTelegramConfig();
      const lastMessageId = config?.lastMessageId || 0;
      const messages = await this.client.getMessages(channelUsername, {
        limit
      });
      console.log(`[Telegram] Fetched ${messages.length} messages`);
      if (messages.length > 0) {
        console.log("\n========== TELEGRAM MESSAGES ANALYSIS ==========");
        const examineCount = Math.min(3, messages.length);
        for (let i = 0; i < examineCount; i++) {
          const msg = messages[i];
          console.log(`
--- Message ${i + 1} (ID: ${msg.id}) ---`);
          console.log("Date:", msg.date);
          console.log("Text:", msg.text);
          console.log("Message:", msg.message);
          console.log("Sender ID:", msg.senderId?.toString());
          console.log("Views:", msg.views);
          console.log("Forwards:", msg.forwards);
          if (msg.entities && msg.entities.length > 0) {
            console.log("Entities:", msg.entities);
          }
          if (msg.media) {
            console.log("Media type:", msg.media.className);
          }
          console.log("All keys:", Object.keys(msg));
        }
        console.log("\n================================================\n");
      }
      const newMessages = messages.filter((msg) => msg.id > lastMessageId);
      console.log(`[Telegram] ${newMessages.length} new messages (${messages.length} total fetched)`);
      console.log(`[Telegram] Parsing ${messages.length} messages...`);
      for (const msg of messages) {
        const text2 = msg.text || msg.message || "";
        if (text2) {
          await this.parseAndCreateStockRecommendation(text2);
        }
      }
      if (messages.length > 0) {
        await storage.updateTelegramSyncStatus(messages[0].id);
      }
      return messages.map((msg) => ({
        id: msg.id,
        date: msg.date,
        text: msg.text || msg.message || "",
        senderId: msg.senderId?.toString() || "",
        views: msg.views,
        forwards: msg.forwards,
        entities: msg.entities
      }));
    } catch (error) {
      console.error("[Telegram] Error fetching messages:", error);
      throw error;
    }
  }
  /**
   * Fetch messages for backtest analysis without creating stocks in database
   */
  async fetchMessagesForBacktest(channelUsername, limit = 10) {
    if (!this.client || !this.isConnected) {
      throw new Error("Telegram client not connected");
    }
    try {
      const messages = await this.client.getMessages(channelUsername, {
        limit
      });
      console.log(`[Telegram] Fetched ${messages.length} messages for backtest`);
      return messages.map((msg) => ({
        id: msg.id,
        date: msg.date,
        text: msg.text || msg.message || "",
        senderId: msg.senderId?.toString() || "",
        views: msg.views,
        forwards: msg.forwards,
        entities: msg.entities
      }));
    } catch (error) {
      console.error("[Telegram] Error fetching messages for backtest:", error);
      throw error;
    }
  }
  async parseAndCreateStockRecommendation(messageText) {
    try {
      console.log("[Telegram] Parsing message:", messageText.substring(0, 100));
      const lines = messageText.split("\n").map((l) => l.trim()).filter((l) => l);
      if (lines.length < 3) {
        console.log("[Telegram] Message too short, skipping");
        return;
      }
      const firstLine = lines[0];
      const isSale = firstLine.toLowerCase().includes("sale") || firstLine.includes("\u{1F534}");
      const isBuy = firstLine.toLowerCase().includes("buy") || firstLine.includes("\u{1F7E2}");
      if (!isSale && !isBuy) {
        console.log("[Telegram] No sale/buy action found, skipping");
        return;
      }
      if (isSale) {
        return;
      }
      const recommendation = isBuy ? "buy" : "sell";
      const tickerMatch = firstLine.match(/[A-Z]{1,5}$/);
      if (!tickerMatch) {
        console.log("[Telegram] No ticker found in first line");
        return;
      }
      const ticker = tickerMatch[0];
      let tradeDate = "";
      if (lines.length > 1) {
        const dateLine = lines[1];
        if (dateLine.match(/\d{2}\.\d{2}\.\d{4}/)) {
          tradeDate = dateLine;
        }
      }
      const existingTransaction = await storage.getTransactionByCompositeKey(
        ticker,
        tradeDate,
        "Telegram Insider",
        // Default name since Telegram messages don't include insider name
        "buy"
        // Only processing buy recommendations from Telegram
      );
      if (existingTransaction) {
        console.log(`[Telegram] Transaction already exists: ${ticker} on ${tradeDate}, skipping`);
        return;
      }
      let price = "100.00";
      let quantity = 0;
      const calcLine = lines.find((l) => l.includes("*") && l.includes("="));
      if (calcLine) {
        const parts = calcLine.split("*");
        if (parts.length >= 2) {
          const priceStr = parts[0].trim().replace(",", ".");
          const priceNum = parseFloat(priceStr);
          if (!isNaN(priceNum) && priceNum > 0) {
            price = priceNum.toFixed(2);
          }
          const qtyStr = parts[1].split("=")[0].trim().replace(/\s/g, "");
          const qtyNum = parseInt(qtyStr);
          if (!isNaN(qtyNum)) {
            quantity = qtyNum;
          }
        }
      }
      let confidenceScore = 70;
      if (quantity > 1e5) confidenceScore = 90;
      else if (quantity > 5e4) confidenceScore = 85;
      else if (quantity > 1e4) confidenceScore = 80;
      else if (quantity > 1e3) confidenceScore = 75;
      const newStock = await storage.createStock({
        ticker,
        companyName: `${ticker} Inc.`,
        currentPrice: price,
        // Temporary - will be updated with real market price
        previousClose: price,
        insiderPrice: price,
        // Price at which insider bought/sold
        insiderQuantity: quantity,
        // Number of shares insider traded
        insiderTradeDate: tradeDate,
        // Date when insider executed the trade
        insiderName: "Telegram Insider",
        // Default name since Telegram doesn't provide insider details
        marketCap: "N/A",
        peRatio: "0",
        recommendation,
        source: "telegram",
        confidenceScore,
        priceHistory: []
      });
      console.log(`[Telegram] \u2705 Created stock: ${ticker} | ${recommendation.toUpperCase()} at $${price} | Qty: ${quantity.toLocaleString()} shares | Confidence: ${confidenceScore}%`);
      if (telegramNotificationService.isReady()) {
        await telegramNotificationService.sendStockAlert({
          ticker: newStock.ticker,
          companyName: newStock.companyName,
          recommendation: newStock.recommendation || "N/A",
          currentPrice: newStock.currentPrice,
          insiderPrice: newStock.insiderPrice || void 0,
          insiderQuantity: newStock.insiderQuantity || void 0,
          confidenceScore: newStock.confidenceScore || void 0
        });
        console.log(`[Telegram] \u{1F4E4} Sent notification for ${ticker}`);
      }
    } catch (error) {
      console.error("[Telegram] Error parsing message:", error);
    }
  }
  async disconnect() {
    if (this.client) {
      await this.client.disconnect();
      this.isConnected = false;
      console.log("[Telegram] Disconnected");
    }
  }
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      hasClient: this.client !== null
    };
  }
  async startAuthentication(phoneNumber) {
    const apiId = parseInt(process.env.TELEGRAM_API_ID || "");
    const apiHash = process.env.TELEGRAM_API_HASH || "";
    if (!apiId || !apiHash) {
      throw new Error("Missing API credentials");
    }
    const session2 = new StringSession("");
    this.client = new TelegramClient(session2, apiId, apiHash, {
      connectionRetries: 5
    });
    await this.client.connect();
    const result = await this.client.sendCode(
      {
        apiId,
        apiHash
      },
      phoneNumber
    );
    return {
      phoneCodeHash: result.phoneCodeHash,
      message: "Verification code sent to your phone"
    };
  }
  async completeAuthentication(phoneNumber, phoneCode, phoneCodeHash) {
    if (!this.client) {
      throw new Error("Authentication not started");
    }
    const apiId = parseInt(process.env.TELEGRAM_API_ID || "");
    const apiHash = process.env.TELEGRAM_API_HASH || "";
    await this.client.invoke(
      new (await import("telegram/tl")).Api.auth.SignIn({
        phoneNumber,
        phoneCodeHash,
        phoneCode
      })
    );
    const sessionString = String(this.client.session.save());
    await storage.updateTelegramSession(sessionString);
    this.isConnected = true;
    const config = await storage.getTelegramConfig();
    if (config) {
      await this.setupMessageListener(config.channelUsername);
    }
    return {
      success: true,
      message: "Authentication successful"
    };
  }
};
var telegramService = new TelegramService();

// server/routes.ts
init_stockService();

// server/ibkrService.ts
import axios from "axios";
import https from "https";
var IbkrService = class {
  client;
  gatewayUrl;
  constructor(gatewayUrl = "https://localhost:5000") {
    this.gatewayUrl = gatewayUrl;
    this.client = axios.create({
      baseURL: `${gatewayUrl}/v1/api`,
      timeout: 1e4,
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
        // Required for self-signed cert on localhost
      })
    });
  }
  /**
   * Check if the gateway is authenticated and ready
   */
  async checkAuthStatus() {
    try {
      const response = await this.client.get("/iserver/auth/status");
      return response.data;
    } catch (error) {
      console.error("IBKR auth status check failed:", error);
      throw new Error("Failed to check IBKR authentication status. Is the gateway running?");
    }
  }
  /**
   * Get list of accounts
   */
  async getAccounts() {
    try {
      const response = await this.client.get("/portfolio/accounts");
      return response.data;
    } catch (error) {
      console.error("IBKR get accounts failed:", error);
      throw new Error("Failed to fetch IBKR accounts");
    }
  }
  /**
   * Get portfolio positions for an account
   */
  async getPositions(accountId) {
    try {
      const response = await this.client.get(`/portfolio/${accountId}/positions/0`);
      return response.data;
    } catch (error) {
      console.error("IBKR get positions failed:", error);
      throw new Error("Failed to fetch IBKR positions");
    }
  }
  /**
   * Search for a stock by ticker symbol to get contract ID (conid)
   */
  async searchContract(symbol) {
    try {
      const response = await this.client.get("/iserver/secdef/search", {
        params: { symbol }
      });
      return response.data;
    } catch (error) {
      console.error("IBKR contract search failed:", error);
      throw new Error(`Failed to search for ${symbol}`);
    }
  }
  /**
   * Get market data snapshot for a contract
   */
  async getMarketData(conid) {
    try {
      const response = await this.client.get("/iserver/marketdata/snapshot", {
        params: {
          conids: conid,
          fields: "31,55,84,86"
          // Last price, symbol, bid, ask
        }
      });
      return response.data[0];
    } catch (error) {
      console.error("IBKR market data fetch failed:", error);
      throw new Error("Failed to fetch market data");
    }
  }
  /**
   * Place a market order
   */
  async placeOrder(orderRequest) {
    try {
      const orderPayload = {
        orders: [{
          conid: orderRequest.conid,
          orderType: orderRequest.orderType,
          side: orderRequest.side,
          quantity: orderRequest.quantity,
          tif: orderRequest.tif || "DAY",
          ...orderRequest.price && { price: orderRequest.price }
        }]
      };
      const response = await this.client.post(
        `/iserver/account/${orderRequest.accountId}/orders`,
        orderPayload
      );
      const orderData = response.data[0];
      if (orderData.id && !orderData.error) {
        try {
          const confirmResponse = await this.client.post(
            `/iserver/reply/${orderData.id}`,
            { confirmed: true }
          );
          return {
            orderId: orderData.id,
            orderStatus: confirmResponse.data.order_status || "Submitted"
          };
        } catch (confirmError) {
          console.error("IBKR order confirmation failed:", confirmError);
          throw new Error("Order placed but confirmation failed");
        }
      } else if (orderData.error) {
        throw new Error(orderData.error);
      }
      return {
        orderId: orderData.id || "unknown",
        orderStatus: orderData.order_status || "Unknown"
      };
    } catch (error) {
      console.error("IBKR order placement failed:", error);
      throw new Error(error.response?.data?.error || "Failed to place order");
    }
  }
  /**
   * Get order status
   */
  async getOrderStatus(orderId) {
    try {
      const response = await this.client.get(`/iserver/account/order/status/${orderId}`);
      return response.data;
    } catch (error) {
      console.error("IBKR order status check failed:", error);
      throw new Error("Failed to get order status");
    }
  }
  /**
   * Cancel an order
   */
  async cancelOrder(accountId, orderId) {
    try {
      const response = await this.client.delete(`/iserver/account/${accountId}/order/${orderId}`);
      return response.data;
    } catch (error) {
      console.error("IBKR order cancellation failed:", error);
      throw new Error("Failed to cancel order");
    }
  }
  /**
   * Helper: Place a market buy order by ticker symbol
   */
  async buyStock(accountId, ticker, quantity) {
    const contracts = await this.searchContract(ticker);
    if (!contracts || contracts.length === 0) {
      throw new Error(`No contract found for ticker ${ticker}`);
    }
    const stockContract = contracts.find(
      (c) => c.sections?.some((s) => s.secType === "STK")
    );
    if (!stockContract) {
      throw new Error(`No stock contract found for ${ticker}`);
    }
    return this.placeOrder({
      accountId,
      conid: stockContract.conid,
      ticker,
      orderType: "MKT",
      side: "BUY",
      quantity,
      tif: "DAY"
    });
  }
  /**
   * Helper: Place a market sell order by ticker symbol
   */
  async sellStock(accountId, ticker, quantity) {
    const contracts = await this.searchContract(ticker);
    if (!contracts || contracts.length === 0) {
      throw new Error(`No contract found for ticker ${ticker}`);
    }
    const stockContract = contracts.find(
      (c) => c.sections?.some((s) => s.secType === "STK")
    );
    if (!stockContract) {
      throw new Error(`No stock contract found for ${ticker}`);
    }
    return this.placeOrder({
      accountId,
      conid: stockContract.conid,
      ticker,
      orderType: "MKT",
      side: "SELL",
      quantity,
      tif: "DAY"
    });
  }
};
var ibkrServiceInstance = null;
function getIbkrService(gatewayUrl) {
  if (!ibkrServiceInstance || gatewayUrl && ibkrServiceInstance["gatewayUrl"] !== gatewayUrl) {
    ibkrServiceInstance = new IbkrService(gatewayUrl);
  }
  return ibkrServiceInstance;
}

// server/openinsiderService.ts
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import { fileURLToPath } from "url";
import { createHash } from "crypto";
import { existsSync } from "fs";

// server/finnhubService.ts
var FinnhubService = class {
  apiKey;
  baseUrl = "https://finnhub.io/api/v1";
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
  async getQuote(ticker) {
    if (!this.apiKey) {
      throw new Error("FINNHUB_API_KEY is not configured");
    }
    const url = `${this.baseUrl}/quote?symbol=${ticker}&token=${this.apiKey}`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Finnhub API request failed: ${response.statusText}`);
      }
      const data = await response.json();
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
        open: data.o
      };
    } catch (error) {
      console.error(`[Finnhub] Error fetching quote for ${ticker}:`, error);
      throw error;
    }
  }
  /**
   * Get company profile including market cap and company info
   */
  async getCompanyProfile(ticker) {
    if (!this.apiKey) {
      throw new Error("FINNHUB_API_KEY is not configured");
    }
    const url = `${this.baseUrl}/stock/profile2?symbol=${ticker}&token=${this.apiKey}`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Finnhub API request failed: ${response.statusText}`);
      }
      const data = await response.json();
      if (!data || Object.keys(data).length === 0) {
        return null;
      }
      return {
        marketCap: data.marketCapitalization,
        description: data.description,
        industry: data.finnhubIndustry,
        country: data.country,
        webUrl: data.weburl,
        ipo: data.ipo
      };
    } catch (error) {
      console.error(`[Finnhub] Error fetching company profile for ${ticker}:`, error);
      return null;
    }
  }
  /**
   * Get latest company news (last 7 days)
   */
  async getCompanyNews(ticker) {
    if (!this.apiKey) {
      throw new Error("FINNHUB_API_KEY is not configured");
    }
    const today = /* @__PURE__ */ new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const toDate = today.toISOString().split("T")[0];
    const fromDate = weekAgo.toISOString().split("T")[0];
    const url = `${this.baseUrl}/company-news?symbol=${ticker}&from=${fromDate}&to=${toDate}&token=${this.apiKey}`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Finnhub API request failed: ${response.statusText}`);
      }
      const data = await response.json();
      return data.slice(0, 5).map((article) => ({
        headline: article.headline,
        summary: article.summary,
        source: article.source,
        url: article.url,
        datetime: article.datetime,
        image: article.image
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
  async getInsiderSentiment(ticker) {
    if (!this.apiKey) {
      throw new Error("FINNHUB_API_KEY is not configured");
    }
    try {
      const today = /* @__PURE__ */ new Date();
      const threeMonthsAgo = new Date(today);
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      const toDate = today.toISOString().split("T")[0];
      const fromDate = threeMonthsAgo.toISOString().split("T")[0];
      const url = `${this.baseUrl}/stock/insider-sentiment?symbol=${ticker}&from=${fromDate}&to=${toDate}&token=${this.apiKey}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Finnhub API request failed: ${response.statusText}`);
      }
      const data = await response.json();
      if (data.data && data.data.length > 0) {
        const sortedData = data.data.sort((a, b) => {
          if (a.year !== b.year) return b.year - a.year;
          return b.month - a.month;
        });
        const latest = sortedData[0];
        console.log(`[Finnhub] Insider sentiment for ${ticker}: MSPR=${latest.mspr.toFixed(2)}, change=${latest.change.toFixed(2)}`);
        return {
          mspr: latest.mspr,
          change: latest.change
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
  async getHistoricalPrice(ticker, dateString) {
    const alphaVantageKey = process.env.ALPHA_VANTAGE_API_KEY;
    if (!alphaVantageKey) {
      console.log("[AlphaVantage] API key not configured, skipping historical price fetch");
      return null;
    }
    try {
      const datePart = dateString.split(" ")[0];
      const [day, month, year] = datePart.split(".").map(Number);
      const targetDate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${ticker}&apikey=${alphaVantageKey}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Alpha Vantage API request failed: ${response.statusText}`);
      }
      const data = await response.json();
      if (data["Error Message"] || data["Note"]) {
        console.log(`[AlphaVantage] API limit or error for ${ticker}: ${data["Error Message"] || data["Note"]}`);
        return null;
      }
      const timeSeries = data["Time Series (Daily)"];
      if (!timeSeries) {
        console.log(`[AlphaVantage] No time series data for ${ticker}`);
        return null;
      }
      if (timeSeries[targetDate]) {
        const closingPrice = parseFloat(timeSeries[targetDate]["4. close"]);
        console.log(`[AlphaVantage] Historical price for ${ticker} on ${dateString}: $${closingPrice.toFixed(2)}`);
        return closingPrice;
      }
      const targetDateObj = new Date(targetDate);
      const sortedDates = Object.keys(timeSeries).sort().reverse();
      for (const date of sortedDates) {
        const dateObj = new Date(date);
        if (dateObj <= targetDateObj) {
          const closingPrice = parseFloat(timeSeries[date]["4. close"]);
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
  async getHistoricalCandlesAlphaVantage(ticker, fromDate, toDate) {
    const alphaVantageKey = process.env.ALPHA_VANTAGE_API_KEY;
    if (!alphaVantageKey) {
      throw new Error("ALPHA_VANTAGE_API_KEY is not configured");
    }
    try {
      const fromDateObj = fromDate instanceof Date ? fromDate : new Date(fromDate);
      const toDateObj = toDate instanceof Date ? toDate : new Date(toDate);
      const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${ticker}&apikey=${alphaVantageKey}&outputsize=full`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Alpha Vantage API request failed: ${response.statusText}`);
      }
      const data = await response.json();
      if (data["Error Message"] || data["Note"]) {
        throw new Error(`Alpha Vantage API error: ${data["Error Message"] || data["Note"]}`);
      }
      const timeSeries = data["Time Series (Daily)"];
      if (!timeSeries) {
        throw new Error(`No time series data for ${ticker}`);
      }
      const prices = [];
      const sortedDates = Object.keys(timeSeries).sort();
      for (const date of sortedDates) {
        const dateObj = new Date(date);
        if (dateObj >= fromDateObj && dateObj <= toDateObj) {
          prices.push({
            date,
            close: parseFloat(timeSeries[date]["4. close"])
          });
        }
      }
      if (prices.length === 0) {
        throw new Error(`No historical data available for ${ticker} in date range`);
      }
      console.log(`[AlphaVantage] Fetched ${prices.length} historical prices for ${ticker} from ${prices[0]?.date} to ${prices[prices.length - 1]?.date}`);
      return prices;
    } catch (error) {
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
  async getHistoricalCandles(ticker, fromDate, toDate) {
    if (!this.apiKey) {
      throw new Error("FINNHUB_API_KEY is not configured");
    }
    try {
      const fromTimestamp = Math.floor(
        (fromDate instanceof Date ? fromDate : new Date(fromDate)).getTime() / 1e3
      );
      const toTimestamp = Math.floor(
        (toDate instanceof Date ? toDate : new Date(toDate)).getTime() / 1e3
      );
      const url = `${this.baseUrl}/stock/candle?symbol=${ticker}&resolution=D&from=${fromTimestamp}&to=${toTimestamp}&token=${this.apiKey}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Finnhub API request failed: ${response.statusText}`);
      }
      const data = await response.json();
      if (data.s !== "ok" || !data.c || data.c.length === 0) {
        console.log(`[Finnhub] No historical data available for ${ticker}`);
        return [];
      }
      const prices = [];
      for (let i = 0; i < data.c.length; i++) {
        const date = new Date(data.t[i] * 1e3).toISOString().split("T")[0];
        prices.push({
          date,
          close: data.c[i]
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
  async getBatchQuotes(tickers) {
    const quotes = /* @__PURE__ */ new Map();
    for (const ticker of tickers) {
      try {
        const quote = await this.getQuote(ticker);
        quotes.set(ticker, quote);
        if (tickers.indexOf(ticker) < tickers.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1e3));
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
  async getBatchStockData(tickers) {
    const stockData = /* @__PURE__ */ new Map();
    for (const ticker of tickers) {
      try {
        const quote = await this.getQuote(ticker);
        await new Promise((resolve) => setTimeout(resolve, 1e3));
        const companyInfo = await this.getCompanyProfile(ticker);
        await new Promise((resolve) => setTimeout(resolve, 1e3));
        const news = await this.getCompanyNews(ticker);
        await new Promise((resolve) => setTimeout(resolve, 1e3));
        const insiderSentiment = await this.getInsiderSentiment(ticker);
        stockData.set(ticker, {
          quote,
          marketCap: companyInfo?.marketCap,
          companyInfo: companyInfo || void 0,
          news,
          insiderSentiment: insiderSentiment || void 0
        });
        if (tickers.indexOf(ticker) < tickers.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1e3));
        }
      } catch (error) {
        console.error(`[Finnhub] Failed to fetch data for ${ticker}, skipping`);
      }
    }
    return stockData;
  }
};
var finnhubService = new FinnhubService();

// server/openinsiderService.ts
var execFileAsync = promisify(execFile);
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var OpenInsiderService = class {
  pythonScriptPath;
  priceCache = /* @__PURE__ */ new Map();
  CACHE_TTL_MS = 1e3 * 60 * 60;
  // 1 hour cache
  lastFinnhubCall = 0;
  MIN_CALL_INTERVAL_MS = 1200;
  // ~50 calls/minute to stay under 60/min limit
  constructor() {
    const possiblePaths = [
      path.join(__dirname, "openinsider_scraper.py"),
      path.join(process.cwd(), "server", "openinsider_scraper.py"),
      path.join(process.cwd(), "openinsider_scraper.py")
    ];
    const foundPath = possiblePaths.find((p) => existsSync(p));
    if (!foundPath) {
      console.error("[OpenInsider] Could not find openinsider_scraper.py in any of these locations:", possiblePaths);
      this.pythonScriptPath = possiblePaths[0];
    } else {
      this.pythonScriptPath = foundPath;
      console.log(`[OpenInsider] Using Python script at: ${this.pythonScriptPath}`);
    }
  }
  /**
   * Fetch insider purchase transactions from OpenInsider.com
   * @param limit Number of transactions to fetch (default: 100)
   * @param filters Optional filters for transactions
   * @param tradeType "P" for purchases or "S" for sales (default: "P")
   * @returns Scraper response with transactions and filtering statistics
   */
  async fetchInsiderPurchases(limit = 100, filters, tradeType = "P") {
    try {
      const normalizedTradeType = (tradeType || "P").toString().toUpperCase();
      if (normalizedTradeType !== "P" && normalizedTradeType !== "S") {
        throw new Error(`Invalid tradeType: ${tradeType}. Must be "P" (purchase) or "S" (sale)`);
      }
      const safeTradeType = normalizedTradeType;
      const numericLimit = Number.isFinite(limit) ? limit : 100;
      const safeLimit = Math.max(1, Math.min(Math.floor(numericLimit), 500));
      const transactionTypeLabel = safeTradeType === "S" ? "sale" : "purchase";
      const filterInfo = filters ? ` with filters: ${JSON.stringify(filters)}` : "";
      console.log(`[OpenInsider] Fetching ${safeLimit} insider ${transactionTypeLabel} transactions${filterInfo}...`);
      const args = [this.pythonScriptPath, safeLimit.toString()];
      if (filters && (filters.insiderTitles || filters.minTransactionValue || filters.previousDayOnly || filters.insider_name || filters.ticker)) {
        const pythonFilters = {};
        if (filters.insiderTitles) pythonFilters.insiderTitles = filters.insiderTitles;
        if (filters.minTransactionValue) pythonFilters.minTransactionValue = filters.minTransactionValue;
        if (filters.previousDayOnly) pythonFilters.previousDayOnly = filters.previousDayOnly;
        if (filters.insider_name) pythonFilters.insiderName = filters.insider_name;
        if (filters.ticker) pythonFilters.ticker = filters.ticker;
        args.push(JSON.stringify(pythonFilters));
      } else {
        args.push("{}");
      }
      args.push(safeTradeType);
      const { stdout, stderr } = await execFileAsync(
        "python3",
        args,
        {
          timeout: 6e4,
          // 60 second timeout
          maxBuffer: 10 * 1024 * 1024
          // 10MB buffer
        }
      );
      if (stderr) {
        console.error("[OpenInsider] Python stderr:", stderr);
      }
      if (!stdout || stdout.trim() === "") {
        console.error("[OpenInsider] No data returned from Python script");
        return {
          transactions: [],
          stats: {
            total_rows_scraped: 0,
            filtered_not_purchase: 0,
            filtered_invalid_data: 0,
            filtered_by_date: 0,
            filtered_by_title: 0,
            filtered_by_transaction_value: 0,
            filtered_by_insider_name: 0
          }
        };
      }
      const response = JSON.parse(stdout);
      console.log(`[OpenInsider] Successfully fetched ${response.transactions.length} transactions`);
      console.log(`[OpenInsider] Stage 1 Filter Stats:`, response.stats);
      return response;
    } catch (error) {
      console.error("[OpenInsider] Error fetching data:", error.message);
      if (error.stdout) {
        console.error("[OpenInsider] Python stdout:", error.stdout);
      }
      if (error.stderr) {
        console.error("[OpenInsider] Python stderr:", error.stderr);
      }
      throw new Error(`Failed to fetch OpenInsider data: ${error.message}`);
    }
  }
  /**
   * Convert OpenInsider transaction to message format compatible with backtest service
   * @param transaction OpenInsider transaction
   * @returns Message object similar to Telegram message format
   */
  transactionToMessage(transaction) {
    const messageText = `$${transaction.ticker} - ${transaction.recommendation.toUpperCase()} @ $${transaction.price.toFixed(2)} (Insider: ${transaction.insiderName}, Date: ${transaction.tradeDate}, Qty: ${transaction.quantity.toLocaleString()})`;
    const filingDate = this.parseDate(transaction.filingDate);
    const timestamp2 = Math.floor(filingDate.getTime() / 1e3);
    const idInput = `${transaction.ticker}|${transaction.filingDate}|${transaction.insiderName}|${transaction.quantity}|${transaction.price}`;
    const hash = createHash("sha256").update(idInput).digest("hex").substring(0, 16);
    const uniqueId = `openinsider_${hash}`;
    return {
      id: uniqueId,
      date: timestamp2,
      text: messageText,
      senderId: "openinsider",
      views: 0,
      forwards: 0,
      entities: [],
      // Additional metadata
      _source: "openinsider",
      _transaction: transaction
    };
  }
  /**
   * Parse date string from OpenInsider (format: YYYY-MM-DD)
   * @param dateStr Date string
   * @returns Date object
   */
  parseDate(dateStr) {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const [year, month, day] = parts.map((p) => parseInt(p, 10));
      return new Date(year, month - 1, day);
    }
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date;
    }
    console.warn(`[OpenInsider] Could not parse date: ${dateStr}, using current date`);
    return /* @__PURE__ */ new Date();
  }
  /**
   * Fetch insider purchases and convert to message format for backtest
   * @param limit Number of transactions to fetch
   * @param filters Optional filters to apply
   * @returns Array of messages compatible with backtest service
   */
  async fetchMessagesForBacktest(limit, filters) {
    const scraperResponse = await this.fetchInsiderPurchases(limit, filters);
    return scraperResponse.transactions.map((t) => this.transactionToMessage(t));
  }
  /**
   * Fetch insider SALES transactions from OpenInsider.com
   * Thin wrapper around fetchInsiderPurchases with tradeType="S"
   * @param limit Number of transactions to fetch (default: 100)
   * @param filters Optional filters for transactions
   * @returns Scraper response with sale transactions and filtering statistics
   */
  async fetchInsiderSales(limit = 100, filters) {
    return this.fetchInsiderPurchases(limit, filters, "S");
  }
  /**
   * Calculate trade scores by fetching price 2 weeks after trade date
   * @param transactions Array of insider transactions
   * @returns Transactions with score data added
   */
  async calculateTradeScores(transactions) {
    console.log(`[OpenInsider] Calculating scores for ${transactions.length} trades...`);
    const scoredTransactions = await Promise.all(
      transactions.map(async (transaction) => {
        try {
          const tradeDate = new Date(transaction.tradeDate);
          const twoWeeksLater = new Date(tradeDate);
          twoWeeksLater.setDate(twoWeeksLater.getDate() + 14);
          const now = /* @__PURE__ */ new Date();
          if (twoWeeksLater > now) {
            return transaction;
          }
          const twoWeeksLaterPrice = await this.getPriceOnDate(
            transaction.ticker,
            twoWeeksLater
          );
          if (!twoWeeksLaterPrice) {
            console.log(`[OpenInsider] Could not fetch price for ${transaction.ticker} on ${twoWeeksLater.toISOString().split("T")[0]}`);
            return transaction;
          }
          const priceChange = (twoWeeksLaterPrice - transaction.price) / transaction.price * 100;
          const pnl = (twoWeeksLaterPrice - transaction.price) * transaction.quantity;
          const isProfitable = priceChange > 0;
          return {
            ...transaction,
            twoWeekPriceChange: priceChange,
            twoWeekPnL: pnl,
            isProfitable
          };
        } catch (error) {
          console.error(`[OpenInsider] Error calculating score for ${transaction.ticker}:`, error);
          return transaction;
        }
      })
    );
    const scoredCount = scoredTransactions.filter((t) => t.twoWeekPriceChange !== void 0).length;
    console.log(`[OpenInsider] Successfully scored ${scoredCount}/${transactions.length} trades`);
    return scoredTransactions;
  }
  /**
   * Get stock price on a specific date with caching and rate limiting
   * Uses Alpha Vantage for historical data
   */
  async getPriceOnDate(ticker, date) {
    const dateStr = date.toISOString().split("T")[0];
    const cacheKey = `${ticker}:${dateStr}`;
    const cached = this.priceCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return cached.price;
    }
    try {
      const now = Date.now();
      const timeSinceLastCall = now - this.lastFinnhubCall;
      if (timeSinceLastCall < this.MIN_CALL_INTERVAL_MS) {
        await new Promise(
          (resolve) => setTimeout(resolve, this.MIN_CALL_INTERVAL_MS - timeSinceLastCall)
        );
      }
      this.lastFinnhubCall = Date.now();
      const [year, month, day] = dateStr.split("-");
      const alphaVantageDateStr = `${day}.${month}.${year}`;
      const price = await finnhubService.getHistoricalPrice(ticker, alphaVantageDateStr);
      if (price !== null) {
        this.priceCache.set(cacheKey, { price, timestamp: Date.now() });
        return price;
      }
      return null;
    } catch (error) {
      console.error(`[OpenInsider] Error fetching price for ${ticker} on ${date}:`, error);
      return null;
    }
  }
  /**
   * Calculate aggregate score for an insider based on their trades
   * @param transactions Array of transactions by the same insider
   * @returns Insider score summary with partial data indicators
   */
  calculateInsiderScore(transactions) {
    if (transactions.length === 0) {
      return {
        insiderName: "",
        totalTrades: 0,
        scoredTrades: 0,
        profitableTrades: 0,
        successRate: 0,
        averageGain: 0,
        totalPnL: 0,
        isPartialData: false,
        unscoredCount: 0
      };
    }
    const insiderName = transactions[0].insiderName;
    const scoredTrades = transactions.filter(
      (t) => t.tradeType.startsWith("P") && // Only purchases
      t.twoWeekPriceChange !== void 0 && t.twoWeekPnL !== void 0
    );
    const purchaseTrades = transactions.filter((t) => t.tradeType.startsWith("P"));
    const unscoredCount = purchaseTrades.length - scoredTrades.length;
    const isPartialData = unscoredCount > 0;
    if (scoredTrades.length === 0) {
      return {
        insiderName,
        totalTrades: transactions.length,
        scoredTrades: 0,
        profitableTrades: 0,
        successRate: 0,
        averageGain: 0,
        totalPnL: 0,
        isPartialData,
        unscoredCount
      };
    }
    const profitableTrades = scoredTrades.filter((t) => t.isProfitable === true).length;
    const successRate = profitableTrades / scoredTrades.length * 100;
    const totalPriceChange = scoredTrades.reduce((sum, t) => sum + (t.twoWeekPriceChange || 0), 0);
    const averageGain = totalPriceChange / scoredTrades.length;
    const totalPnL = scoredTrades.reduce((sum, t) => sum + (t.twoWeekPnL || 0), 0);
    return {
      insiderName,
      totalTrades: transactions.length,
      scoredTrades: scoredTrades.length,
      profitableTrades,
      successRate,
      averageGain,
      totalPnL,
      isPartialData,
      unscoredCount
    };
  }
};
var openinsiderService = new OpenInsiderService();

// server/backtestService.ts
import OpenAI from "openai";
var openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});
var BacktestService = class {
  /**
   * Fetch historical daily closing prices for a stock using Alpha Vantage
   * Returns data from start date to end date
   */
  async fetchHistoricalPrices(ticker, startDate, endDate) {
    try {
      const prices = await finnhubService.getHistoricalCandlesAlphaVantage(ticker, startDate, endDate);
      if (prices.length === 0) {
        throw new Error(`No historical data available for ${ticker}`);
      }
      return prices;
    } catch (error) {
      console.error(`[BacktestService] Error fetching historical prices for ${ticker}:`, error.message);
      throw error;
    }
  }
  /**
   * Build price matrix for a stock: from insider trade date to today
   * Checks database cache first before hitting Alpha Vantage API
   */
  async buildPriceMatrix(ticker, insiderTradeDate) {
    const cached = await storage.getCachedPriceData(ticker, insiderTradeDate);
    if (cached && cached.priceMatrix && cached.priceMatrix.length > 0) {
      console.log(`[BacktestService] Using cached price data for ${ticker} (${cached.priceMatrix.length} days)`);
      return cached.priceMatrix;
    }
    const tradeDate = new Date(insiderTradeDate);
    const today = /* @__PURE__ */ new Date();
    today.setHours(0, 0, 0, 0);
    console.log(`[BacktestService] Fetching ${ticker} prices from Alpha Vantage (${insiderTradeDate} to ${today.toISOString().split("T")[0]})`);
    return await this.fetchHistoricalPrices(ticker, tradeDate, today);
  }
  /**
   * Find the first date when a trade became viable (met buy criteria)
   * Criteria: market cap > $500M AND insider price >= 15% of market price
   */
  findFirstViableDate(priceMatrix, insiderPrice, marketCap) {
    if (marketCap < 5e8) {
      return null;
    }
    for (const pricePoint of priceMatrix) {
      const marketPrice = pricePoint.close;
      const priceRatio = insiderPrice / marketPrice;
      if (priceRatio >= 0.15) {
        return pricePoint.date;
      }
    }
    return null;
  }
  /**
   * Check if job has been cancelled
   */
  async isJobCancelled(jobId) {
    const job = await storage.getBacktestJob(jobId);
    return job?.status === "cancelled";
  }
  /**
   * Process a backtest job through all stages
   */
  async processBacktestJob(jobId) {
    try {
      const job = await storage.getBacktestJob(jobId);
      if (!job) {
        throw new Error(`Job ${jobId} not found`);
      }
      console.log(`[BacktestJob ${jobId}] Starting job: ${job.name}`);
      await storage.updateBacktestJob(jobId, {
        status: "fetching_messages",
        progress: 10
      });
      if (await this.isJobCancelled(jobId)) {
        console.log(`[BacktestJob ${jobId}] Job cancelled by user`);
        return;
      }
      const dataSource = job.dataSource || "telegram";
      if (!["telegram", "openinsider"].includes(dataSource)) {
        throw new Error(`Invalid data source: ${dataSource}. Must be "telegram" or "openinsider"`);
      }
      let messages = [];
      if (dataSource === "telegram") {
        console.log(`[BacktestJob ${jobId}] Fetching ${job.messageCount} Telegram messages...`);
        const telegramConfig2 = await storage.getTelegramConfig();
        if (!telegramConfig2) {
          throw new Error("Telegram not configured");
        }
        messages = await telegramService.fetchMessagesForBacktest(
          telegramConfig2.channelUsername,
          job.messageCount
        );
      } else if (dataSource === "openinsider") {
        console.log(`[BacktestJob ${jobId}] Fetching ${job.messageCount} OpenInsider transactions...`);
        const openinsiderConfig2 = await storage.getOpeninsiderConfig();
        const filters = {};
        if (openinsiderConfig2?.insiderTitles && openinsiderConfig2.insiderTitles.length > 0) {
          filters.insiderTitles = openinsiderConfig2.insiderTitles;
        }
        if (openinsiderConfig2?.minTransactionValue) {
          filters.minTransactionValue = openinsiderConfig2.minTransactionValue;
        }
        const filterInfo = Object.keys(filters).length > 0 ? ` with filters: ${JSON.stringify(filters)}` : "";
        console.log(`[BacktestJob ${jobId}] Applying OpenInsider filters${filterInfo}`);
        messages = await openinsiderService.fetchMessagesForBacktest(
          job.messageCount,
          Object.keys(filters).length > 0 ? filters : void 0
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
          completedAt: /* @__PURE__ */ new Date(),
          candidateStocks: []
        });
        console.log(`[BacktestJob ${jobId}] No valid candidates found - job completed`);
        return;
      }
      console.log(`[BacktestJob ${jobId}] Found ${candidates.length} valid candidates`);
      await storage.updateBacktestJob(jobId, {
        status: "building_matrix",
        progress: 40
      });
      console.log(`[BacktestJob ${jobId}] Building price matrices for ${candidates.length} stocks...`);
      const viableCandidates = [];
      for (let i = 0; i < candidates.length; i++) {
        if (await this.isJobCancelled(jobId)) {
          console.log(`[BacktestJob ${jobId}] Job cancelled by user`);
          return;
        }
        const candidate = candidates[i];
        try {
          const priceMatrix = await this.buildPriceMatrix(
            candidate.ticker,
            candidate.insiderTradeDate
            // Use insider trade date to get full historical data
          );
          const marketCapValue = candidate.marketCap ? this.parseMarketCap(candidate.marketCap) : 0;
          if (!marketCapValue || isNaN(marketCapValue)) {
            console.log(`[BacktestJob ${jobId}] ${candidate.ticker} has invalid market cap, skipping`);
            continue;
          }
          const insiderPriceNum = parseFloat(candidate.insiderPrice);
          const firstViableDate = this.findFirstViableDate(priceMatrix, insiderPriceNum, marketCapValue);
          if (!firstViableDate) {
            console.log(`[BacktestJob ${jobId}] ${candidate.ticker} never became viable, skipping`);
            continue;
          }
          candidate.firstViableDate = firstViableDate;
          viableCandidates.push(candidate);
          await storage.createBacktestPriceData({
            jobId,
            ticker: candidate.ticker,
            insiderBuyDate: firstViableDate,
            // Use first viable date as purchase date
            priceMatrix
          });
          const progress = 40 + Math.floor((i + 1) / candidates.length * 20);
          await storage.updateBacktestJob(jobId, { progress });
          console.log(`[BacktestJob ${jobId}] Built price matrix for ${candidate.ticker} (${priceMatrix.length} days, first viable: ${firstViableDate})`);
          if (i < candidates.length - 1) {
            console.log(`[BacktestJob ${jobId}] Waiting 1 second for Alpha Vantage rate limit...`);
            await new Promise((resolve) => setTimeout(resolve, 1e3));
          }
        } catch (error) {
          console.error(`[BacktestJob ${jobId}] Failed to fetch prices for ${candidate.ticker}:`, error.message);
        }
      }
      await storage.updateBacktestJob(jobId, {
        candidateStocks: viableCandidates.map((c) => ({
          ticker: c.ticker,
          insiderBuyDate: c.firstViableDate,
          // First viable date used in simulation
          insiderPrice: parseFloat(c.insiderPrice),
          marketPrice: parseFloat(c.marketPriceAtInsiderDate || c.insiderPrice),
          marketCap: c.marketCap || "Unknown"
        }))
      });
      if (await this.isJobCancelled(jobId)) {
        console.log(`[BacktestJob ${jobId}] Job cancelled by user`);
        return;
      }
      await storage.updateBacktestJob(jobId, {
        status: "generating_scenarios",
        progress: 70
      });
      console.log(`[BacktestJob ${jobId}] Generating trading scenarios with OpenAI...`);
      await this.generateScenarios(jobId, viableCandidates);
      if (await this.isJobCancelled(jobId)) {
        console.log(`[BacktestJob ${jobId}] Job cancelled by user`);
        return;
      }
      await storage.updateBacktestJob(jobId, {
        status: "calculating_results",
        progress: 90
      });
      console.log(`[BacktestJob ${jobId}] All scenarios calculated successfully`);
      await storage.updateBacktestJob(jobId, {
        status: "completed",
        progress: 100,
        completedAt: /* @__PURE__ */ new Date()
      });
      console.log(`[BacktestJob ${jobId}] Job completed successfully`);
    } catch (error) {
      console.error(`[BacktestJob ${jobId}] Job failed:`, error);
      await storage.updateBacktestJob(jobId, {
        status: "failed",
        errorMessage: error.message
      });
    }
  }
  /**
   * Filter Telegram messages to find valid purchase candidates
   * Same criteria as Purchase page: market cap > $500M, insider price >= 15% of current price
   */
  async filterPurchaseCandidates(messages) {
    const candidatesMap = /* @__PURE__ */ new Map();
    for (const msg of messages) {
      if (!msg || !msg.text) continue;
      const ticker = this.extractTicker(msg.text);
      if (!ticker) continue;
      const recommendation = this.extractRecommendation(msg.text);
      if (recommendation !== "buy") continue;
      const insiderPrice = this.extractInsiderPrice(msg.text);
      if (!insiderPrice) continue;
      const telegramMessageDate = new Date(msg.date * 1e3).toISOString().split("T")[0];
      const insiderTradeDate = this.extractInsiderTradeDate(msg.text);
      const compositeKey = `${ticker}_${insiderTradeDate || telegramMessageDate}`;
      let stock = await storage.getAnyStockForTicker(ticker);
      if (!stock) {
        try {
          const quote = await finnhubService.getQuote(ticker);
          if (!quote || !quote.currentPrice || quote.currentPrice <= 0) {
            console.log(`[BacktestFilter] No valid quote for ${ticker}, skipping`);
            continue;
          }
          const profile = await finnhubService.getCompanyProfile(ticker);
          const marketCapValue = profile?.marketCap ? profile.marketCap * 1e6 : 0;
          if (marketCapValue < 5e8) {
            console.log(`[BacktestFilter] ${ticker} market cap too low: $${(marketCapValue / 1e6).toFixed(1)}M, skipping`);
            continue;
          }
          const insiderPriceNum = parseFloat(insiderPrice);
          if (insiderPriceNum < quote.currentPrice * 0.15) {
            console.log(`[BacktestFilter] ${ticker} likely options deal (insider: $${insiderPriceNum} vs market: $${quote.currentPrice}), skipping`);
            continue;
          }
          const candidate = {
            ticker,
            insiderPrice,
            insiderTradeDate,
            telegramMessageDate,
            // This is the actual purchase date
            marketPriceAtInsiderDate: quote.currentPrice.toString(),
            marketCap: `$${(marketCapValue / 1e6).toFixed(1)}M`
          };
          if (!candidatesMap.has(compositeKey)) {
            candidatesMap.set(compositeKey, candidate);
            console.log(`[BacktestFilter] ${ticker} is valid candidate (market cap: $${(marketCapValue / 1e6).toFixed(1)}M, price: $${quote.currentPrice})`);
          }
        } catch (error) {
          console.log(`[BacktestFilter] Failed to fetch ${ticker} info: ${error.message}, skipping`);
          continue;
        }
      } else {
        const marketCapValue = stock.marketCap ? this.parseMarketCap(stock.marketCap) : 0;
        if (marketCapValue < 5e8) {
          console.log(`[BacktestFilter] ${ticker} market cap too low, skipping`);
          continue;
        }
        const marketPrice = parseFloat(stock.currentPrice);
        const insiderPriceNum = parseFloat(insiderPrice);
        if (insiderPriceNum < marketPrice * 0.15) {
          console.log(`[BacktestFilter] ${ticker} likely options deal, skipping`);
          continue;
        }
        const candidate = {
          ticker,
          insiderPrice,
          insiderTradeDate,
          telegramMessageDate,
          // This is the actual purchase date
          marketPriceAtInsiderDate: stock.currentPrice,
          marketCap: stock.marketCap
        };
        if (!candidatesMap.has(compositeKey)) {
          candidatesMap.set(compositeKey, candidate);
          console.log(`[BacktestFilter] ${ticker} is valid candidate (existing in DB)`);
        }
      }
    }
    return Array.from(candidatesMap.values());
  }
  extractTicker(message) {
    let match = message.match(/\$([A-Z]{1,5})\b/);
    if (match) return match[1];
    match = message.match(/(?:Sale|Buy|Purchase)\s+([A-Z]{2,5})\b/i);
    if (match) return match[1];
    return null;
  }
  extractRecommendation(message) {
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes("\u{1F7E2}") || lowerMessage.includes("purchase")) {
      return "buy";
    }
    if (lowerMessage.includes("\u{1F534}") || lowerMessage.includes("sale")) {
      return null;
    }
    if (lowerMessage.match(/\bbuy\b/i)) {
      return "buy";
    }
    return null;
  }
  extractInsiderPrice(message) {
    const priceMatch = message.match(/([\d,]+\.?\d*)\s*\*\s*[\d,]+/);
    if (priceMatch) {
      return priceMatch[1].replace(/,/g, "");
    }
    const match = message.match(/\$?([\d,]+\.?\d*)\s*(?:per share|\/share)?/i);
    return match ? match[1].replace(/,/g, "") : null;
  }
  extractInsiderTradeDate(message) {
    const ddmmyyyyMatch = message.match(/(\d{2})\.(\d{2})\.(\d{4})/);
    if (ddmmyyyyMatch) {
      const [, day, month, year] = ddmmyyyyMatch;
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }
    const dateMatch = message.match(/(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) {
      return dateMatch[1];
    }
    const dateMatch2 = message.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (dateMatch2) {
      const [, month, day, year] = dateMatch2;
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }
    return (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  }
  parseMarketCap(marketCapStr) {
    const str = marketCapStr.toUpperCase().replace(/[^0-9.BMK]/g, "");
    const value = parseFloat(str);
    if (str.includes("T")) return value * 1e12;
    if (str.includes("B")) return value * 1e9;
    if (str.includes("M")) return value * 1e6;
    if (str.includes("K")) return value * 1e3;
    return value;
  }
  /**
   * Generate 100 trading rule scenarios using OpenAI
   */
  async generateScenarios(jobId, candidates) {
    console.log(`[BacktestJob ${jobId}] Generating AI trading scenarios...`);
    const marketSummary = candidates.map((c) => ({
      ticker: c.ticker,
      marketCap: c.marketCap,
      insiderBuyDate: c.insiderTradeDate
    })).slice(0, 5);
    const prompt = `You are a professional stock trading strategist. I have analyzed ${candidates.length} insider trading events where insiders purchased shares.

Sample stocks:
${marketSummary.map((s) => `- ${s.ticker} (Market Cap: ${s.marketCap}, Insider Buy: ${s.insiderBuyDate})`).join("\n")}

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
        temperature: 0.9,
        // Higher creativity for diverse scenarios
        max_tokens: 16e3
        // Increased for 100 scenarios
      });
      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No response from OpenAI");
      }
      let cleanContent = content.trim();
      cleanContent = cleanContent.replace(/^```(?:json|JSON)?\s*\n?/i, "");
      cleanContent = cleanContent.replace(/\n?\s*```\s*$/i, "");
      cleanContent = cleanContent.trim();
      console.log(`[BacktestJob ${jobId}] OpenAI response preview: ${cleanContent.substring(0, 200)}...`);
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
      scenarios = scenarios.filter((scenario, index2) => {
        const conditions = scenario.sellConditions || [];
        const hasTakeProfit = conditions.some(
          (c) => c.metric === "price_change_from_buy_percent" && c.value > 0
        );
        const hasStopLossOrTimeExit = conditions.some(
          (c) => c.metric === "price_change_from_buy_percent" && c.value < 0 || c.metric === "days_held"
        );
        const isValid = hasTakeProfit && hasStopLossOrTimeExit;
        if (!isValid) {
          console.log(`[BacktestJob ${jobId}] Skipping invalid scenario ${index2 + 1}: ${scenario.name} (missing take-profit or stop-loss)`);
        }
        return isValid;
      });
      console.log(`[BacktestJob ${jobId}] Generated ${scenarios.length} valid scenarios (filtered from ${result.scenarios?.length || 0})`);
      for (let i = 0; i < scenarios.length; i++) {
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
          tradeDetails: pnlResult.tradeDetails
        });
        console.log(`[BacktestJob ${jobId}] Scenario ${i + 1}/${scenarios.length}: ${scenario.name} - P&L: $${pnlResult.totalPnL.toFixed(2)}`);
        const progress = 60 + Math.floor((i + 1) / scenarios.length * 30);
        await storage.updateBacktestJob(jobId, { progress });
      }
    } catch (error) {
      console.error(`[BacktestJob ${jobId}] OpenAI error:`, error.message);
      throw error;
    }
  }
  /**
   * Calculate P&L for a given trading scenario using rule-based conditions
   */
  async calculateScenarioPnL(jobId, scenario, candidates) {
    const trades2 = [];
    let totalInvested = 0;
    let totalReturned = 0;
    let wins = 0;
    const priceDataList = await storage.getBacktestPriceData(jobId);
    const sellConditions = scenario.sellConditions || [];
    const maxDaysCondition = sellConditions.find((c) => c.metric === "days_held");
    const maxDays = maxDaysCondition ? maxDaysCondition.value : 14;
    for (const candidate of candidates) {
      const priceData = priceDataList.find((pd) => pd.ticker === candidate.ticker);
      if (!priceData || !priceData.priceMatrix || priceData.priceMatrix.length === 0) {
        continue;
      }
      const buyDate = priceData.insiderBuyDate;
      let buyIndex = priceData.priceMatrix.findIndex((p) => p.date === buyDate);
      if (buyIndex === -1) {
        const buyDateTime = new Date(buyDate).getTime();
        for (let i = priceData.priceMatrix.length - 1; i >= 0; i--) {
          const priceDateTime = new Date(priceData.priceMatrix[i].date).getTime();
          if (priceDateTime <= buyDateTime) {
            buyIndex = i;
            break;
          }
        }
      }
      if (buyIndex === -1) continue;
      const actualBuyDate = priceData.priceMatrix[buyIndex].date;
      const buyPrice = priceData.priceMatrix[buyIndex].close;
      let sellDate = actualBuyDate;
      let sellPrice = buyPrice;
      let sellReason = "No sell condition met - held to end of data";
      let conditionMet = false;
      for (let dayOffset = 0; dayOffset < priceData.priceMatrix.length - buyIndex; dayOffset++) {
        const currentIndex = buyIndex + dayOffset;
        const currentPrice = priceData.priceMatrix[currentIndex].close;
        const daysHeld = dayOffset;
        const priceChangeFromBuyPercent = (currentPrice - buyPrice) / buyPrice * 100;
        for (const condition of sellConditions) {
          let conditionValue;
          if (condition.metric === "price_change_from_buy_percent") {
            conditionValue = priceChangeFromBuyPercent;
          } else if (condition.metric === "days_held") {
            conditionValue = daysHeld;
          } else {
            continue;
          }
          const isMet = this.evaluateCondition(conditionValue, condition.operator, condition.value);
          if (isMet) {
            sellDate = priceData.priceMatrix[currentIndex].date;
            sellPrice = currentPrice;
            sellReason = this.formatConditionReason(condition, conditionValue);
            conditionMet = true;
            break;
          }
        }
        if (conditionMet) {
          break;
        }
        if (daysHeld >= Math.max(maxDays, 14)) {
          sellDate = priceData.priceMatrix[currentIndex].date;
          sellPrice = currentPrice;
          sellReason = `Held for ${daysHeld} days (max)`;
          break;
        }
      }
      const profitLoss = sellPrice - buyPrice;
      const profitLossPercent = (sellPrice - buyPrice) / buyPrice * 100;
      totalInvested += buyPrice;
      totalReturned += sellPrice;
      if (profitLoss > 0) wins++;
      trades2.push({
        ticker: candidate.ticker,
        buyDate: actualBuyDate,
        buyPrice,
        sellDate,
        sellPrice,
        profitLoss,
        profitLossPercent,
        reason: sellReason
      });
    }
    const totalPnL = totalReturned - totalInvested;
    const totalPnLPercent = totalInvested > 0 ? totalPnL / totalInvested * 100 : 0;
    const winRate = trades2.length > 0 ? wins / trades2.length * 100 : 0;
    return {
      totalPnL,
      totalPnLPercent,
      winRate,
      numberOfTrades: trades2.length,
      tradeDetails: trades2
    };
  }
  /**
   * Evaluate a condition against a value
   */
  evaluateCondition(actualValue, operator, targetValue) {
    switch (operator) {
      case ">":
        return actualValue > targetValue;
      case "<":
        return actualValue < targetValue;
      case ">=":
        return actualValue >= targetValue;
      case "<=":
        return actualValue <= targetValue;
      case "==":
        return actualValue === targetValue;
      default:
        return false;
    }
  }
  /**
   * Format a condition into a human-readable reason
   */
  formatConditionReason(condition, actualValue) {
    const metric = condition.metric === "price_change_from_buy_percent" ? "price change" : condition.metric.replace(/_/g, " ");
    return `${metric} ${condition.operator} ${condition.value} (actual: ${actualValue.toFixed(2)})`;
  }
};
var backtestService = new BacktestService();

// server/session.ts
import session from "express-session";
import MemoryStore from "memorystore";
var MemStore = MemoryStore(session);
var sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || "tradepro-session-secret-key",
  resave: false,
  saveUninitialized: false,
  store: new MemStore({
    checkPeriod: 864e5
    // prune expired entries every 24h
  }),
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1e3,
    // 30 days
    httpOnly: true,
    secure: false
    // set to true if using HTTPS
  }
});
function createRequireAdmin(storage2) {
  return async function requireAdmin(req, res, next) {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const user = await storage2.getUser(req.session.userId);
    if (!user || !user.isAdmin) {
      return res.status(403).json({ error: "Unauthorized - Admin access required" });
    }
    next();
  };
}

// server/paypalWebhookVerifier.ts
async function generatePayPalAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("PayPal credentials not configured");
  }
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const response = await fetch("https://api-m.paypal.com/v1/oauth2/token", {
    method: "POST",
    body: "grant_type=client_credentials",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded"
    }
  });
  if (!response.ok) {
    throw new Error(`Failed to generate access token: ${response.statusText}`);
  }
  const data = await response.json();
  return data.access_token;
}
async function verifyPayPalWebhook(request) {
  try {
    const accessToken = await generatePayPalAccessToken();
    const verificationPayload = {
      auth_algo: request.headers["paypal-auth-algo"],
      cert_url: request.headers["paypal-cert-url"],
      transmission_id: request.headers["paypal-transmission-id"],
      transmission_sig: request.headers["paypal-transmission-sig"],
      transmission_time: request.headers["paypal-transmission-time"],
      webhook_id: request.webhookId,
      webhook_event: request.body
    };
    const response = await fetch(
      "https://api-m.paypal.com/v1/notifications/verify-webhook-signature",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify(verificationPayload)
      }
    );
    if (!response.ok) {
      const errorData = await response.json();
      console.error("[PayPal Webhook Verification] API Error:", errorData);
      return false;
    }
    const data = await response.json();
    return data.verification_status === "SUCCESS";
  } catch (error) {
    console.error("[PayPal Webhook Verification] Error:", error);
    return false;
  }
}

// server/aiAnalysisService.ts
import OpenAI2 from "openai";
var openai2 = new OpenAI2({
  apiKey: process.env.OPENAI_API_KEY
});
var AIAnalysisService = class {
  /**
   * Analyze a stock using AI with multi-signal approach
   * Combines fundamental data, technical indicators, news sentiment, and insider trading
   */
  async analyzeStock(financialData) {
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
    const latestBalanceSheet = balanceSheet?.annualReports?.[0] || balanceSheet?.quarterlyReports?.[0];
    const latestIncomeStatement = incomeStatement?.annualReports?.[0] || incomeStatement?.quarterlyReports?.[0];
    const latestCashFlow = cashFlow?.annualReports?.[0] || cashFlow?.quarterlyReports?.[0];
    const isBuy = insiderTradingStrength?.direction === "buy";
    const isSell = insiderTradingStrength?.direction === "sell";
    const transactionContext = isBuy ? "INSIDER BUYING" : isSell ? "INSIDER SELLING" : "INSIDER TRADING";
    const analysisContext = isBuy ? "Company insiders (executives, board members) just purchased shares. Analyze if this is a strong buy signal or if there are concerns that make it a pass within the next 1-2 weeks." : isSell ? "Company insiders (executives, board members) just SOLD shares. This is typically a BEARISH signal. Analyze if the fundamentals justify their decision to sell, or if this is just routine portfolio rebalancing. Consider whether you should AVOID this stock or if the sell is a false alarm." : "Company insiders just transacted shares. Analyze the signal.";
    const prompt = `You are a seasoned equity analyst specializing in insider trading patterns. This stock has recent ${transactionContext} activity. Your job is to validate whether this insider signal is worth acting on for a 1-2 WEEK TRADING WINDOW.

INVESTMENT HORIZON: 1-2 weeks (short-term trading opportunity)

CONTEXT: ${analysisContext}

=== COMPANY: ${ticker} ===
Sector: ${companyOverview?.sector || "N/A"}
Market Cap: ${comprehensiveFundamentals?.marketCap || companyOverview?.marketCap || "N/A"}

=== SEC FILING ANALYSIS ===
${secFilings ? `
Filing Type: ${secFilings.formType} (Filed: ${secFilings.filingDate})

Read through this SEC filing as an analyst. Extract KEY SIGNALS that validate or contradict the insider ${isBuy ? "buy" : isSell ? "sell" : "transaction"}:

BUSINESS OVERVIEW EXCERPT:
${secFilings.businessOverview ? secFilings.businessOverview.substring(0, 2500) : "Not available"}

MANAGEMENT DISCUSSION & ANALYSIS (MD&A) EXCERPT:
${secFilings.managementDiscussion ? secFilings.managementDiscussion.substring(0, 4e3) : "Not available"}

RISK FACTORS EXCERPT:
${secFilings.riskFactors ? secFilings.riskFactors.substring(0, 3e3) : "Not available"}

YOUR TASK: Extract 3-5 specific insights from these filings that either:
${isBuy ? "- SUPPORT the insider buy (e.g., new product launch, expansion plans, strong guidance)\n- CONTRADICT the insider buy (e.g., major risks, declining markets, litigation)" : isSell ? "- JUSTIFY the insider sell (e.g., major risks, declining markets, litigation, operational challenges)\n- CONTRADICT the insider sell (e.g., strong guidance, new opportunities, improving fundamentals)" : "- Support or contradict the insider transaction"}
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
- Free Cash Flow: ${comprehensiveFundamentals?.freeCashFlow || (latestCashFlow?.operatingCashflow && latestCashFlow?.capitalExpenditures ? (parseFloat(latestCashFlow.operatingCashflow) - parseFloat(latestCashFlow.capitalExpenditures)).toString() : "N/A")}

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
Top Headlines: ${newsSentiment.articles.slice(0, 3).map((a) => a.title).join(" | ")}
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
${insiderTradingStrength.allTransactions.map(
      (t, idx) => `${idx + 1}. ${t.direction.toUpperCase()} - ${t.insiderName} (${t.insiderTitle}): ${t.quantityStr} @ ${t.price} on ${t.date} (Value: ${t.value})`
    ).join("\n")}

SIGNAL INTERPRETATION:
${isBuy && insiderTradingStrength.sellCount === 0 ? "\u2713 BULLISH SIGNAL: Only insider BUYING detected - typically indicates confidence in future performance" : isSell && insiderTradingStrength.buyCount === 0 ? "\u2717 BEARISH SIGNAL: Only insider SELLING detected - typically indicates concerns about future performance or overvaluation" : insiderTradingStrength.buyCount > 0 && insiderTradingStrength.sellCount > 0 ? `\u26A0\uFE0F  MIXED SIGNALS: Both buying (${insiderTradingStrength.buyCount}) and selling (${insiderTradingStrength.sellCount}) detected. Analyze which signal is more recent and credible. Consider if different insiders have different outlooks, or if some are routine portfolio management.` : ""}
` : "Insider transaction detected - validate this signal"}

=== ANALYSIS REQUIREMENTS ===
${isBuy ? `Your rating should be "buy" if the insider purchase is validated by strong fundamentals, or "pass" if there are concerns.` : isSell ? `Your rating should be "sell" or "avoid" if the insider sale is justified by weak fundamentals or risks, or "pass" if the sell appears to be routine and fundamentals remain strong.` : `Your rating should reflect whether the insider transaction is validated by fundamentals.`}

Provide your analysis in this EXACT JSON format:
{
  "overallRating": ${isBuy ? '"buy" or "pass"' : isSell ? '"sell" or "avoid" or "pass"' : '"buy" or "sell" or "pass"'},
  "confidenceScore": 0-100,
  "summary": "2-3 sentences: ${isBuy ? "Does this insider buy have merit? What's the 1-2 week outlook?" : isSell ? "Does this insider sell signal weakness? Should investors avoid or is this routine portfolio management?" : "Validate the insider transaction"}",
  "financialHealth": {
    "score": 0-100,
    "strengths": ["List 2-4 specific financial strengths you found in the numbers"],
    "weaknesses": ["List 2-4 specific financial weaknesses or concerns"],
    "redFlags": ["List any serious red flags from SEC filings or financials, or empty array"]
  },
  "secFilingInsights": ["Extract 3-5 KEY INSIGHTS from SEC filings that validate OR contradict the insider ${isBuy ? "buy" : isSell ? "sell" : "transaction"}"],
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
  "insiderValidation": "1-2 sentences: Does the fundamental and technical analysis support this insider ${isBuy ? "buy" : isSell ? "sell" : "transaction"}?",
  "risks": ["List 3-5 specific risks for the 1-2 week window"],
  "opportunities": ["List 2-4 specific catalysts that could ${isBuy ? "drive price up" : isSell ? "drive price down" : "move price"} in 1-2 weeks"],
  "recommendation": "Clear 2-3 sentence recommendation: ${isBuy ? "BUY or PASS" : isSell ? "SELL/AVOID or PASS" : "Action"} for 1-2 week window, and why"
}

CRITICAL: OPPORTUNITY SCORE RUBRIC (confidenceScore: 0-100 scale)
\u26A0\uFE0F THIS SCORE REPRESENTS "OPPORTUNITY STRENGTH" NOT "COMPANY QUALITY" \u26A0\uFE0F

${isBuy ? `For INSIDER BUYING (BUY signal):
HIGH SCORE = STRONG BUY OPPORTUNITY (good company + insiders buying = strong opportunity)
- 90-100: EXCEPTIONAL BUY - Company fundamentals excellent, insider buy highly validated, all signals bullish
- 70-89: STRONG BUY - Solid fundamentals support insider confidence, favorable 1-2 week outlook  
- 50-69: MODERATE BUY - Mixed signals, insider buy has merit but some concerns exist
- 30-49: WEAK/PASS - Fundamentals don't strongly support insider buy, or significant risks present
- 0-29: AVOID - Red flags contradict insider buy signal, company has serious issues` : isSell ? `For INSIDER SELLING (SELL signal):  
HIGH SCORE = STRONG SELL OPPORTUNITY (weak company + insiders selling = strong bearish signal)
- 90-100: EXCEPTIONAL SELL - Company fundamentals very weak, insider sell highly validated by deteriorating metrics, avoid this stock
- 70-89: STRONG SELL - Weak fundamentals justify insider sell, significant bearish indicators present
- 50-69: MODERATE SELL - Some weakness validates sell but not conclusive, proceed with caution
- 30-49: WEAK/PASS - Fundamentals remain relatively strong, likely routine portfolio rebalancing
- 0-29: IGNORE SELL - Strong fundamentals contradict sell signal, company remains healthy` : `For MIXED SIGNALS:
- 90-100: STRONG SIGNAL - All signals align
- 70-89: VALIDATED - Fundamentals support insider signal
- 50-69: MIXED - Some merit but concerns exist
- 30-49: PASS - Fundamentals don't support signal
- 0-29: IGNORE - Red flags contradict signal`}

NOTE: This micro score will be adjusted by a separate MACRO analysis that considers market-wide and sector conditions.

Focus on actionable insights. Be direct. This is for real money decisions.`;
    try {
      const response = await openai2.chat.completions.create({
        model: "gpt-4.1",
        // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_completion_tokens: 8192
      });
      const content = response.choices[0]?.message?.content || "{}";
      const analysis = JSON.parse(content);
      return {
        ticker,
        ...analysis,
        analyzedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
    } catch (error) {
      console.error("[AIAnalysisService] Error analyzing stock:", error);
      throw new Error(`Failed to analyze ${ticker}: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
  /**
   * Generate a quick summary of analysis for display
   */
  generateQuickSummary(analysis) {
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
  async generateDailyBrief(params) {
    const { ticker, currentPrice, previousPrice, opportunityType = "buy", recentNews, previousAnalysis } = params;
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
  async generateSingleScenario(params) {
    const { ticker, currentPrice, previousPrice, opportunityType, userOwnsPosition, recentNews, previousAnalysis } = params;
    const priceChange = currentPrice - previousPrice;
    const priceChangePercent = (priceChange / previousPrice * 100).toFixed(2);
    const isBuyOpportunity = opportunityType === "buy";
    const isSellOpportunity = opportunityType === "sell";
    const positionContext = isSellOpportunity ? userOwnsPosition ? `USER HAS A SHORT POSITION - Focus on COVERING STRATEGY (when to cover the short or hold it). This is a SHORTING analysis.` : `USER CONSIDERING SHORTING - Focus on SHORT ENTRY EVALUATION (should they open a short position now or wait?)` : userOwnsPosition ? `USER OWNS THIS STOCK - Focus on EXIT STRATEGY ONLY (when to sell or hold). NEVER recommend adding to position.` : `USER CONSIDERING ENTRY - Focus on ENTRY EVALUATION (should they enter now, wait, or avoid?)`;
    const opportunityContext = isBuyOpportunity ? "This is a BUY OPPORTUNITY - insiders recently BOUGHT shares, signaling potential upside." : "This is a SELL/SHORT OPPORTUNITY - insiders recently SOLD shares, signaling potential downside or weakness. Low AI score indicates company weakness, making this a good shorting candidate.";
    let trendContext = "";
    let signalScore = 50;
    if (previousAnalysis?.technicalAnalysis) {
      const tech = previousAnalysis.technicalAnalysis;
      const trend = tech.trend || "neutral";
      const momentum = tech.momentum || "weak";
      signalScore = typeof tech.score === "number" ? tech.score : 50;
      const signals = Array.isArray(tech.signals) ? tech.signals.slice(0, 3) : [];
      trendContext = `
INITIAL AI TECHNICAL ANALYSIS (baseline trend from insider opportunity):
- Trend: ${trend}
- Momentum: ${momentum}
- Signal Score: ${signalScore}/100 ${signalScore >= 90 ? "\u{1F525} VERY HIGH" : signalScore >= 70 ? "\u26A1 HIGH" : signalScore >= 50 ? "\u27A1\uFE0F  MODERATE" : "\u26A0\uFE0F  LOW"}
${signals.length > 0 ? `- Signals: ${signals.join(", ")}` : ""}`;
    }
    let stanceRules;
    if (userOwnsPosition) {
      stanceRules = isBuyOpportunity ? `STANCE RULES for OWNED LONG POSITION (Buy Opportunity):
Use initial trend as baseline. Focus on WHEN TO EXIT or HOLD.

\u26A0\uFE0F CRITICAL: You can ONLY recommend "sell" or "hold" - NEVER "buy". This is exit strategy, not adding to position.

ACT (sell only):
- "sell" if price +5%+ AND initial trend weakening (take profit)
- "sell" if price -3%+ AND violates initial bullish trend (stop loss)

HOLD:
- Gains +1-4% with initial trend intact (let it run)
- Sideways action, initial trend neutral (wait for clarity)
- Price -2% to -4% but initial trend still bullish/moderate (don't panic sell on small dips)

Decision: SELL when trend confirms exit. HOLD when trend supports staying in. NEVER recommend "buy".` : `STANCE RULES for OWNED SHORT POSITION (Sell/Short Opportunity):
You have a SHORT position. Price DECLINE = your profit. Focus on COVERING strategy.

\u26A0\uFE0F CRITICAL: You can ONLY recommend "buy" or "hold" - NO OTHER VALUES.
- "buy" = Cover the short position / Close the short NOW
- "hold" = Keep the short position open / Stay short

BUY (COVER SHORT):
- "buy" if price -5%+ (take short profit on significant decline)
- "buy" if price +3%+ AND initial bearish trend reversing bullish (stop loss - trend against you)
- "buy" if strong bullish news violates bearish thesis (cut losses early)

HOLD (STAY SHORT):
- "hold" if price declining -1% to -4% with initial bearish trend intact (let it run down)
- "hold" if sideways action with initial trend still bearish/weak (wait for more decline)
- "hold" if price +1% to +2% (small rally) but initial trend still bearish (noise, not reversal)

Decision: "buy" (cover) when you've profited enough OR trend reversing against you. "hold" (stay short) when bearish trend continues. For shorts, price FALLING = your gain.`;
    } else {
      const scoreGuidance = isBuyOpportunity ? signalScore >= 90 ? "\u{1F525} VERY HIGH SIGNAL (90-100): Be HIGHLY LENIENT on entry. Even minor dips or mixed signals should trigger entry. This is a premium opportunity." : signalScore >= 70 ? "\u26A1 HIGH SIGNAL (70-89): Be MODERATELY LENIENT on entry. Accept small pullbacks and minor concerns as buying opportunities." : signalScore >= 50 ? "\u27A1\uFE0F  MODERATE SIGNAL (50-69): Be BALANCED. Require confirmatory signals before entry. Don't rush but don't be overly cautious." : "\u26A0\uFE0F  LOW SIGNAL (<50): Be CAUTIOUS. Require strong technical confirmation and favorable price action. Consider avoiding entry unless setup is perfect." : signalScore <= 30 ? "\u{1F525} VERY HIGH SHORT SIGNAL (<30): Be HIGHLY LENIENT on short entry. Fundamental weakness confirmed. Even minor bearish signals should trigger short." : signalScore <= 50 ? "\u26A1 HIGH SHORT SIGNAL (30-50): Be MODERATELY LENIENT on short entry. Weakness evident, accept minor setups." : signalScore <= 70 ? "\u27A1\uFE0F  MODERATE SHORT SIGNAL (50-70): Be BALANCED. Require confirmatory bearish signals before shorting." : "\u26A0\uFE0F  LOW SHORT SIGNAL (>70): Be CAUTIOUS. Company looks strong, avoid shorting unless very strong bearish breakdown occurs.";
      stanceRules = isBuyOpportunity ? `STANCE RULES for ENTRY DECISION (Buy Opportunity):
${scoreGuidance}

\u26A0\uFE0F CRITICAL: You can ONLY choose "buy" or "hold" - NO OTHER VALUES.
- "buy" = Enter position / Take the opportunity NOW
- "hold" = Wait for better setup / Don't enter yet

SIGNAL SCORE-BASED ENTRY THRESHOLDS:
${signalScore >= 90 ? `
VERY HIGH SIGNAL (90-100) - AGGRESSIVE ENTRY:
BUY (ACT):
- "buy" if ANY bullish signal present (very lenient threshold)
- "buy" even if price down -2% to -5% (premium dip buying opportunity)
- "buy" if trend neutral but score this high (trust the signal)
HOLD (WAIT):
- "hold" ONLY if catastrophic news or price -8%+ breakdown invalidates thesis` : signalScore >= 70 ? `
HIGH SIGNAL (70-89) - LENIENT ENTRY:
BUY (ACT):
- "buy" if trend bullish/moderate + price stable or up
- "buy" if trend bullish + price -2% to -5% (good dip entry on high-quality signal)
- "buy" if trend neutral but price showing support (score gives benefit of doubt)
HOLD (WAIT):
- "hold" if trend bearish/weak despite high score (conflicting signals)
- "hold" if price -5%+ breakdown (too much risk even with good score)` : signalScore >= 50 ? `
MODERATE SIGNAL (50-69) - BALANCED ENTRY:
BUY (ACT):
- "buy" if trend bullish/strong + price stable or up
- "buy" if trend bullish/moderate + price -2% to -3% (small dip only)
HOLD (WAIT):
- "hold" if trend neutral (need stronger confirmation for moderate score)
- "hold" if price -4%+ (too much weakness for moderate signal)
- "hold" if conflicting signals or mixed price action` : `
LOW SIGNAL (<50) - CAUTIOUS ENTRY:
BUY (ACT):
- "buy" ONLY if trend bullish/strong + price +2%+ breakout (perfect setup required)
HOLD (WAIT):
- "hold" if ANY uncertainty, neutral trend, or negative price action
- "hold" if score this low indicates fundamental concerns (be very selective)`}

Decision: Weight the SIGNAL SCORE heavily. High scores deserve aggressive "buy", low scores lean toward "hold".` : `STANCE RULES for SHORT ENTRY DECISION (Sell/Short Opportunity):
${scoreGuidance}

\u26A0\uFE0F CRITICAL: You can ONLY choose "sell" or "hold" - NO OTHER VALUES.
- "sell" = Enter short position / Short this stock NOW
- "hold" = Wait for better short setup / Don't short yet

SIGNAL SCORE-BASED SHORT ENTRY THRESHOLDS:
${signalScore <= 30 ? `
VERY HIGH SHORT SIGNAL (<30) - AGGRESSIVE SHORT ENTRY:
SELL (SHORT):
- "sell" if ANY bearish signal present (very lenient threshold for weak companies)
- "sell" even if price up +2% to +5% (rally into resistance, premium shorting opportunity)
- "sell" if trend neutral but score this low (fundamental weakness overrides technical neutrality)
HOLD (WAIT):
- "hold" ONLY if surprise positive news or price +8%+ breakout invalidates bearish thesis` : signalScore <= 50 ? `
HIGH SHORT SIGNAL (30-50) - LENIENT SHORT ENTRY:
SELL (SHORT):
- "sell" if trend bearish/weak + price breaking down
- "sell" if trend bearish/moderate + price rallying +2% to +4% (short the bounce on weak stock)
- "sell" if trend neutral but price showing resistance (score supports short bias)
HOLD (WAIT):
- "hold" if trend bullish despite low score (conflicting signals, wait for breakdown)
- "hold" if price +5%+ breakout (too much momentum even for weak stock)` : signalScore <= 70 ? `
MODERATE SHORT SIGNAL (50-70) - BALANCED SHORT ENTRY:
SELL (SHORT):
- "sell" if trend bearish/strong + price breaking down
- "sell" if trend bearish/moderate + price +2% to +3% rally (small bounce only)
HOLD (WAIT):
- "hold" if trend neutral (need stronger bearish confirmation for moderate score)
- "hold" if price +4%+ (too much strength for moderate short signal)
- "hold" if conflicting signals or mixed price action` : `
LOW SHORT SIGNAL (>70) - VERY CAUTIOUS SHORT ENTRY:
SELL (SHORT):
- "sell" ONLY if trend bearish/strong + price -5%+ breakdown (perfect breakdown required on strong company)
HOLD (WAIT):
- "hold" if ANY bullish signals, neutral trend, or positive price action
- "hold" if score this high indicates strong fundamentals (avoid shorting unless exceptional setup)`}

Decision: Weight the SIGNAL SCORE heavily for shorts. Very low scores (<30) deserve aggressive "sell" (short), high scores (>70) lean toward "hold" (wait).`;
    }
    const prompt = `You are a NEAR-TERM TRADER (1-2 week horizon) providing actionable daily guidance for ${ticker}.

\u26A1 CRITICAL: This is SHORT-TERM TRADING, not long-term investing. Even small trends demand action.

${positionContext}

OPPORTUNITY TYPE: ${opportunityContext}

CURRENT STATUS:
- Current Price: $${currentPrice.toFixed(2)}
- Previous Close: $${previousPrice.toFixed(2)}
- Change: ${priceChange >= 0 ? "+" : ""}$${priceChange.toFixed(2)} (${priceChangePercent}%)

${trendContext}

${previousAnalysis ? `PREVIOUS ANALYSIS CONTEXT:
Rating: ${previousAnalysis.overallRating}
Summary: ${previousAnalysis.summary}
` : ""}

${recentNews && recentNews.length > 0 ? `RECENT NEWS (last 24h):
${recentNews.slice(0, 3).map((n) => `- ${n.title} (${n.source}, sentiment: ${n.sentiment > 0 ? "positive" : n.sentiment < 0 ? "negative" : "neutral"})`).join("\n")}
` : "No significant news in last 24h"}

YOUR TASK: Provide an ACTION-ORIENTED brief (<120 words). Near-term traders MUST act on trends.

${trendContext ? `
TREND-BASED DECISION MAKING:
The initial AI trend is your BASELINE. Compare current price action against this baseline:
- If price action CONFIRMS the trend \u2192 Consider ACT stance
- If price action VIOLATES the trend (owned position) \u2192 Consider ACT stance (stop loss)
- If price action is NEUTRAL \u2192 Consider HOLD stance
` : ""}

${stanceRules}

BE DECISIVE. Near-term traders need action, not patience.

Return JSON in this EXACT format (no extra text, no markdown, pure JSON):
{
  "recommendedStance": "buy" | "hold" | "sell",
  "confidence": 1-10,
  "briefText": "A concise summary under 120 words with your recommendation and reasoning. Focus on NEAR-TERM action.",
  "keyHighlights": ["2-3 bullet points highlighting key price movements, catalysts, or concerns"]
}

\u26A0\uFE0F CRITICAL STANCE VALUES:
- Watching a BUY opportunity: Use "buy" (enter now) or "hold" (wait for better setup)
- Watching a SELL opportunity: Use "sell" (short now) or "hold" (wait for better short setup)
- Owning a LONG position: Use "sell" (exit now) or "hold" (stay in position)
- Owning a SHORT position: Use "buy" (cover short) or "hold" (stay short)`;
    try {
      const response = await openai2.chat.completions.create({
        model: "gpt-4.1",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_completion_tokens: 500
        // Keep it lightweight
      });
      const content = response.choices[0]?.message?.content || "{}";
      const brief = JSON.parse(content);
      const wordCount = brief.briefText?.split(/\s+/).length || 0;
      if (wordCount > 120) {
        console.warn(`[AIAnalysisService] Daily brief for ${ticker} exceeded 120 words (${wordCount}), truncating...`);
        const words = brief.briefText.split(/\s+/).slice(0, 120);
        brief.briefText = words.join(" ") + "...";
      }
      return brief;
    } catch (error) {
      console.error(`[AIAnalysisService] Error generating daily brief for ${ticker}:`, error);
      throw new Error(`Failed to generate daily brief for ${ticker}: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
};
var aiAnalysisService = new AIAnalysisService();

// server/routes.ts
function isMarketOpen() {
  const now = /* @__PURE__ */ new Date();
  const etTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const day = etTime.getDay();
  if (day === 0 || day === 6) {
    return false;
  }
  const hours = etTime.getHours();
  const minutes = etTime.getMinutes();
  const timeInMinutes = hours * 60 + minutes;
  const marketOpen = 9 * 60 + 30;
  const marketClose = 16 * 60;
  return timeInMinutes >= marketOpen && timeInMinutes < marketClose;
}
async function fetchInitialDataForUser(userId) {
  try {
    console.log(`[InitialDataFetch] Starting initial data fetch for user ${userId}...`);
    const [purchasesResponse, salesResponse] = await Promise.all([
      openinsiderService.fetchInsiderPurchases(500, void 0, "P"),
      openinsiderService.fetchInsiderSales(500, void 0)
    ]);
    const transactions = [...purchasesResponse.transactions, ...salesResponse.transactions];
    const scraperResponse = {
      transactions,
      stats: {
        total_rows_scraped: purchasesResponse.stats.total_rows_scraped + salesResponse.stats.total_rows_scraped,
        filtered_not_purchase: purchasesResponse.stats.filtered_not_purchase + salesResponse.stats.filtered_not_purchase,
        filtered_invalid_data: purchasesResponse.stats.filtered_invalid_data + salesResponse.stats.filtered_invalid_data,
        filtered_by_date: purchasesResponse.stats.filtered_by_date + salesResponse.stats.filtered_by_date,
        filtered_by_title: purchasesResponse.stats.filtered_by_title + salesResponse.stats.filtered_by_title,
        filtered_by_transaction_value: purchasesResponse.stats.filtered_by_transaction_value + salesResponse.stats.filtered_by_transaction_value,
        filtered_by_insider_name: purchasesResponse.stats.filtered_by_insider_name + salesResponse.stats.filtered_by_insider_name
      }
    };
    console.log(`[InitialDataFetch] Fetched ${purchasesResponse.transactions.length} purchases + ${salesResponse.transactions.length} sales = ${transactions.length} total`);
    if (transactions.length === 0) {
      console.log(`[InitialDataFetch] No transactions found for user ${userId}`);
      await storage.markUserInitialDataFetched(userId);
      return;
    }
    const totalStage1Filtered = scraperResponse.stats.filtered_by_title + scraperResponse.stats.filtered_by_transaction_value + scraperResponse.stats.filtered_by_date + scraperResponse.stats.filtered_not_purchase + scraperResponse.stats.filtered_invalid_data;
    console.log(`[InitialDataFetch] ======= STAGE 1: Python Scraper Filters =======`);
    console.log(`[InitialDataFetch] Total rows scraped: ${scraperResponse.stats.total_rows_scraped}`);
    console.log(`[InitialDataFetch]   \u2022 Not a purchase / Invalid: ${scraperResponse.stats.filtered_not_purchase + scraperResponse.stats.filtered_invalid_data}`);
    console.log(`[InitialDataFetch]   \u2022 Filtered by date: ${scraperResponse.stats.filtered_by_date}`);
    console.log(`[InitialDataFetch]   \u2022 Filtered by title: ${scraperResponse.stats.filtered_by_title}`);
    console.log(`[InitialDataFetch]   \u2022 Filtered by transaction value: ${scraperResponse.stats.filtered_by_transaction_value}`);
    console.log(`[InitialDataFetch] \u2192 Total Stage 1 filtered: ${totalStage1Filtered}`);
    console.log(`[InitialDataFetch] \u2192 Returned ${transactions.length} matching transactions`);
    console.log(`[InitialDataFetch] ===================================================`);
    let createdCount = 0;
    let filteredMarketCap = 0;
    let filteredOptionsDeals = 0;
    let filteredAlreadyExists = 0;
    let filteredNoQuote = 0;
    for (const transaction of transactions) {
      try {
        const existingTransaction = await storage.getTransactionByCompositeKey(
          userId,
          // Per-user tenant isolation
          transaction.ticker,
          transaction.filingDate,
          transaction.insiderName,
          transaction.recommendation
          // Use actual recommendation (buy or sell)
        );
        if (existingTransaction) {
          filteredAlreadyExists++;
          continue;
        }
        const quote = await finnhubService.getQuote(transaction.ticker);
        if (!quote || !quote.currentPrice) {
          filteredNoQuote++;
          console.log(`[InitialDataFetch] ${transaction.ticker} no quote available, skipping`);
          continue;
        }
        const stockData = await finnhubService.getBatchStockData([transaction.ticker]);
        const data = stockData.get(transaction.ticker);
        const marketCapValue = data?.marketCap ? data.marketCap * 1e6 : 0;
        if (marketCapValue < 5e8) {
          filteredMarketCap++;
          console.log(`[InitialDataFetch] ${transaction.ticker} market cap too low: $${(marketCapValue / 1e6).toFixed(1)}M, skipping`);
          continue;
        }
        if (transaction.recommendation === "buy") {
          const insiderPriceNum = transaction.price;
          if (insiderPriceNum < quote.currentPrice * 0.15) {
            filteredOptionsDeals++;
            console.log(`[InitialDataFetch] ${transaction.ticker} likely options deal (insider: $${insiderPriceNum.toFixed(2)} < 15% of market: $${quote.currentPrice.toFixed(2)}), skipping`);
            continue;
          }
        }
        await storage.createStock({
          userId,
          // Per-user tenant isolation - this stock belongs to this user only
          ticker: transaction.ticker,
          companyName: transaction.companyName || transaction.ticker,
          currentPrice: quote.currentPrice.toString(),
          previousClose: quote.previousClose?.toString() || quote.currentPrice.toString(),
          insiderPrice: transaction.price.toString(),
          insiderQuantity: transaction.quantity,
          insiderTradeDate: transaction.filingDate,
          insiderName: transaction.insiderName,
          insiderTitle: transaction.insiderTitle,
          recommendation: transaction.recommendation,
          // Use actual recommendation (buy or sell)
          source: "openinsider",
          confidenceScore: transaction.confidence || 75,
          peRatio: null,
          marketCap: data?.marketCap ? `$${Math.round(data.marketCap)}M` : null,
          description: data?.companyInfo?.description || null,
          industry: data?.companyInfo?.industry || null,
          country: data?.companyInfo?.country || null,
          webUrl: data?.companyInfo?.webUrl || null,
          ipo: data?.companyInfo?.ipo || null,
          news: data?.news || [],
          insiderSentimentMspr: data?.insiderSentiment?.mspr.toString() || null,
          insiderSentimentChange: data?.insiderSentiment?.change.toString() || null,
          priceHistory: []
        });
        createdCount++;
      } catch (err) {
        console.error(`[InitialDataFetch] Error processing ${transaction.ticker}:`, err);
      }
    }
    console.log(`
[InitialDataFetch] ======= STAGE 2: Backend Post-Processing =======`);
    console.log(`[InitialDataFetch] Starting with: ${transactions.length} transactions`);
    console.log(`[InitialDataFetch]   \u2297 Already exists: ${filteredAlreadyExists}`);
    console.log(`[InitialDataFetch]   \u2297 Market cap < $500M: ${filteredMarketCap}`);
    console.log(`[InitialDataFetch]   \u2297 Options deals (< 15%): ${filteredOptionsDeals}`);
    console.log(`[InitialDataFetch]   \u2297 No quote: ${filteredNoQuote}`);
    console.log(`[InitialDataFetch] \u2192 Total Stage 2 filtered: ${filteredAlreadyExists + filteredMarketCap + filteredOptionsDeals + filteredNoQuote}`);
    console.log(`[InitialDataFetch] ===================================================`);
    console.log(`
[InitialDataFetch] \u2713 Successfully created ${createdCount} new recommendations for user ${userId}
`);
    await storage.markUserInitialDataFetched(userId);
  } catch (error) {
    console.error(`[InitialDataFetch] Error fetching initial data for user ${userId}:`, error);
  }
}
async function registerRoutes(app2) {
  const requireAdmin = createRequireAdmin(storage);
  app2.get("/api/feature-flags", async (req, res) => {
    res.json({
      enableTelegram: process.env.ENABLE_TELEGRAM === "true"
    });
  });
  app2.get("/api/version", async (req, res) => {
    const packageJson = await Promise.resolve().then(() => __toESM(require_package(), 1));
    res.json({
      version: packageJson.default.version,
      name: packageJson.default.name
    });
  });
  app2.get("/api/auth/current-user", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.json({ user: null });
      }
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        req.session.userId = void 0;
        return res.json({ user: null });
      }
      res.json({ user });
    } catch (error) {
      res.status(500).json({ error: "Failed to get current user" });
    }
  });
  app2.get("/api/auth/trial-status", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      if (user.subscriptionStatus !== "trial") {
        return res.json({
          status: user.subscriptionStatus,
          isTrialActive: false,
          daysRemaining: 0,
          showPaymentReminder: false
        });
      }
      const now = /* @__PURE__ */ new Date();
      const trialEnd = user.trialEndsAt ? new Date(user.trialEndsAt) : null;
      if (!trialEnd) {
        return res.json({
          status: "trial",
          isTrialActive: true,
          daysRemaining: 0,
          showPaymentReminder: true
        });
      }
      const msRemaining = trialEnd.getTime() - now.getTime();
      const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1e3 * 60 * 60 * 24)));
      const isTrialActive = msRemaining > 0;
      const showPaymentReminder = daysRemaining <= 16 && isTrialActive;
      res.json({
        status: "trial",
        isTrialActive,
        daysRemaining,
        trialEndsAt: trialEnd.toISOString(),
        showPaymentReminder,
        isExpired: !isTrialActive && daysRemaining === 0
      });
    } catch (error) {
      console.error("Trial status error:", error);
      res.status(500).json({ error: "Failed to get trial status" });
    }
  });
  app2.get("/api/user/progress", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const progress = await storage.getUserProgress(req.session.userId);
      res.json(progress);
    } catch (error) {
      console.error("Get user progress error:", error);
      res.status(500).json({ error: "Failed to get user progress" });
    }
  });
  app2.post("/api/user/complete-onboarding", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      await storage.completeUserOnboarding(req.session.userId);
      res.json({ message: "Onboarding completed successfully" });
    } catch (error) {
      console.error("Complete onboarding error:", error);
      res.status(500).json({ error: "Failed to complete onboarding" });
    }
  });
  app2.post("/api/user/tutorial/:id/complete", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const tutorialId = req.params.id;
      await storage.completeTutorial(req.session.userId, tutorialId);
      res.json({ message: "Tutorial marked as completed" });
    } catch (error) {
      console.error("Complete tutorial error:", error);
      res.status(500).json({ error: "Failed to complete tutorial" });
    }
  });
  app2.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      const bcrypt = await import("bcryptjs");
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      if (user.subscriptionStatus === "trial") {
        if (user.trialEndsAt) {
          const now = /* @__PURE__ */ new Date();
          const trialEnd = new Date(user.trialEndsAt);
          if (now > trialEnd) {
            await storage.updateUser(user.id, { subscriptionStatus: "expired" });
            return res.status(403).json({
              error: "Your free trial has expired. Please subscribe to continue.",
              subscriptionStatus: "expired",
              trialExpired: true
            });
          }
        }
      } else if (user.subscriptionStatus === "active") {
      } else {
        return res.status(403).json({
          error: user.subscriptionStatus === "expired" ? "Your free trial has expired. Please subscribe to continue." : "Subscription required",
          subscriptionStatus: user.subscriptionStatus,
          trialExpired: user.subscriptionStatus === "expired"
        });
      }
      req.session.userId = user.id;
      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ error: "Failed to save session" });
        }
        res.json({
          user: {
            ...user,
            passwordHash: void 0
            // Don't send password hash to client
          },
          subscriptionStatus: user.subscriptionStatus
        });
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Failed to login" });
    }
  });
  app2.post("/api/auth/signup", async (req, res) => {
    try {
      const { name, email, password } = req.body;
      if (!name || !email || !password) {
        return res.status(400).json({ error: "Name, email, and password are required" });
      }
      if (password.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters" });
      }
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "Email already in use" });
      }
      const bcrypt = await import("bcryptjs");
      const passwordHash = await bcrypt.hash(password, 10);
      const avatarColors = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];
      const avatarColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];
      const now = /* @__PURE__ */ new Date();
      const trialEndsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1e3);
      const newUser = await storage.createUser({
        name,
        email,
        passwordHash,
        avatarColor,
        subscriptionStatus: "trial",
        // Start with trial
        subscriptionStartDate: now,
        trialEndsAt
      });
      try {
        await storage.createAdminNotification({
          type: "user_signup",
          title: "New User Signup",
          message: `${name} (${email}) has signed up for a 30-day trial`,
          metadata: {
            userId: newUser.id,
            userName: name,
            userEmail: email
          },
          isRead: false
        });
      } catch (notifError) {
        console.error("Failed to create admin notification for new signup:", notifError);
      }
      req.session.userId = newUser.id;
      req.session.save((err) => {
        if (err) {
          console.error("Session save error during signup:", err);
          return res.status(500).json({ error: "Failed to save session" });
        }
        res.json({
          user: {
            ...newUser,
            passwordHash: void 0
            // Don't send password hash to client
          }
        });
      });
    } catch (error) {
      console.error("Signup error:", error);
      res.status(500).json({ error: "Failed to create account" });
    }
  });
  app2.post("/api/auth/logout", async (req, res) => {
    try {
      req.session.destroy((err) => {
        if (err) {
          return res.status(500).json({ error: "Failed to logout" });
        }
        res.json({ success: true });
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to logout" });
    }
  });
  app2.post("/api/auth/mark-onboarding-complete", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      await storage.markUserHasSeenOnboarding(req.session.userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Mark onboarding complete error:", error);
      res.status(500).json({ error: "Failed to mark onboarding as complete" });
    }
  });
  app2.post("/api/webhooks/paypal", async (req, res) => {
    try {
      const webhookId = process.env.PAYPAL_WEBHOOK_ID;
      if (!webhookId) {
        console.error("[PayPal Webhook] PAYPAL_WEBHOOK_ID not configured");
        return res.status(500).json({ error: "Webhook not configured" });
      }
      const isValid = await verifyPayPalWebhook({
        webhookId,
        headers: {
          "paypal-transmission-sig": req.headers["paypal-transmission-sig"],
          "paypal-cert-url": req.headers["paypal-cert-url"],
          "paypal-transmission-id": req.headers["paypal-transmission-id"],
          "paypal-transmission-time": req.headers["paypal-transmission-time"],
          "paypal-auth-algo": req.headers["paypal-auth-algo"]
        },
        body: req.body
      });
      if (!isValid) {
        console.error("[PayPal Webhook] Invalid signature - potential security threat");
        return res.status(401).json({ error: "Invalid webhook signature" });
      }
      const { event_type, resource } = req.body;
      console.log(`[PayPal Webhook] Verified event: ${event_type}`);
      if (event_type === "BILLING.SUBSCRIPTION.ACTIVATED") {
        const { custom_id } = resource;
        const subscriptionId = resource.id;
        const user = await storage.getUserByEmail(custom_id);
        if (user) {
          const now = /* @__PURE__ */ new Date();
          let bonusDays = 0;
          if (user.subscriptionStatus === "trial" && user.trialEndsAt) {
            const trialEnd = new Date(user.trialEndsAt);
            const daysRemaining = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1e3 * 60 * 60 * 24)));
            bonusDays = daysRemaining + 14;
            console.log(`[PayPal Webhook] User had ${daysRemaining} trial days left, granting ${bonusDays} bonus days`);
          }
          const subscriptionEndDate = bonusDays > 0 ? new Date(now.getTime() + bonusDays * 24 * 60 * 60 * 1e3) : void 0;
          const updateData = {
            subscriptionStatus: "active",
            paypalSubscriptionId: subscriptionId,
            subscriptionStartDate: now,
            subscriptionEndDate: subscriptionEndDate || null,
            trialEndsAt: null
            // Clear trial end date - this is now a paid subscription
          };
          await storage.updateUser(user.id, updateData);
          console.log(`[PayPal Webhook] \u2705 Activated paid subscription for ${custom_id}${bonusDays > 0 ? ` with ${bonusDays} bonus days` : ""}`);
          if (!user.initialDataFetched) {
            fetchInitialDataForUser(user.id).catch((err) => {
              console.error(`[SubscriptionActivation] Failed for user ${user.id}:`, err);
            });
          }
          console.log(`[PayPal Webhook] \u2705 Activated subscription for ${custom_id}`);
        } else {
          console.warn(`[PayPal Webhook] User not found for email: ${custom_id}`);
        }
      }
      if (event_type === "BILLING.SUBSCRIPTION.CANCELLED") {
        const { custom_id } = resource;
        const user = await storage.getUserByEmail(custom_id);
        if (user) {
          await storage.updateUser(user.id, {
            subscriptionStatus: "cancelled",
            subscriptionEndDate: /* @__PURE__ */ new Date()
          });
          console.log(`[PayPal Webhook] \u274C Cancelled subscription for ${custom_id}`);
        }
      }
      res.json({ received: true });
    } catch (error) {
      console.error("[PayPal Webhook] Processing error:", error);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  });
  app2.post("/api/admin/activate-subscription", requireAdmin, async (req, res) => {
    try {
      const { email, paypalSubscriptionId } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const updatedUser = await storage.updateUser(user.id, {
        subscriptionStatus: "active",
        paypalSubscriptionId: paypalSubscriptionId || "manual_activation",
        subscriptionStartDate: /* @__PURE__ */ new Date()
      });
      if (!user.initialDataFetched) {
        console.log(`[SubscriptionActivation] Triggering initial data fetch for user ${user.id}...`);
        fetchInitialDataForUser(user.id).catch((err) => {
          console.error(`[SubscriptionActivation] Background initial data fetch failed for user ${user.id}:`, err);
        });
      }
      res.json({
        success: true,
        user: {
          ...updatedUser,
          passwordHash: void 0
        }
      });
    } catch (error) {
      console.error("Subscription activation error:", error);
      res.status(500).json({ error: "Failed to activate subscription" });
    }
  });
  app2.post("/api/admin/create-super-admin", requireAdmin, async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const updatedUser = await storage.updateUser(user.id, {
        isAdmin: true,
        subscriptionStatus: "active",
        subscriptionStartDate: /* @__PURE__ */ new Date()
      });
      res.json({
        success: true,
        message: "User promoted to super admin",
        user: {
          ...updatedUser,
          passwordHash: void 0
        }
      });
    } catch (error) {
      console.error("Super admin creation error:", error);
      res.status(500).json({ error: "Failed to create super admin" });
    }
  });
  app2.post("/api/admin/deactivate-subscription", requireAdmin, async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const updatedUser = await storage.updateUserSubscriptionStatus(
        user.id,
        "inactive",
        /* @__PURE__ */ new Date()
      );
      res.json({
        success: true,
        message: "Subscription deactivated",
        user: {
          ...updatedUser,
          passwordHash: void 0
        }
      });
    } catch (error) {
      console.error("Deactivate subscription error:", error);
      res.status(500).json({ error: "Failed to deactivate subscription" });
    }
  });
  app2.post("/api/admin/reset-password", requireAdmin, async (req, res) => {
    try {
      const { email, newPassword } = req.body;
      if (!email || !newPassword) {
        return res.status(400).json({ error: "Email and new password are required" });
      }
      if (newPassword.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters" });
      }
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const bcrypt = await import("bcryptjs");
      const passwordHash = await bcrypt.hash(newPassword, 10);
      const updatedUser = await storage.updateUser(user.id, {
        passwordHash
      });
      res.json({
        success: true,
        message: "Password reset successfully"
      });
    } catch (error) {
      console.error("Password reset error:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });
  app2.post("/api/admin/archive-user", requireAdmin, async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const archivedUser = await storage.archiveUser(user.id, req.session.userId);
      res.json({
        success: true,
        message: "User archived",
        user: {
          ...archivedUser,
          passwordHash: void 0
        }
      });
    } catch (error) {
      console.error("Archive user error:", error);
      res.status(500).json({ error: "Failed to archive user" });
    }
  });
  app2.post("/api/admin/unarchive-user", requireAdmin, async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const unarchivedUser = await storage.unarchiveUser(user.id);
      res.json({
        success: true,
        message: "User unarchived",
        user: {
          ...unarchivedUser,
          passwordHash: void 0
        }
      });
    } catch (error) {
      console.error("Unarchive user error:", error);
      res.status(500).json({ error: "Failed to unarchive user" });
    }
  });
  app2.delete("/api/admin/delete-user", requireAdmin, async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const deleted = await storage.deleteUser(user.id);
      res.json({
        success: deleted,
        message: deleted ? "User permanently deleted" : "Failed to delete user"
      });
    } catch (error) {
      console.error("Delete user error:", error);
      res.status(500).json({ error: "Failed to delete user" });
    }
  });
  app2.post("/api/admin/extend-subscription", requireAdmin, async (req, res) => {
    try {
      const { email, months, reason } = req.body;
      if (!email || !months) {
        return res.status(400).json({ error: "Email and months are required" });
      }
      if (typeof months !== "number" || months <= 0 || months > 120) {
        return res.status(400).json({ error: "Months must be between 1 and 120" });
      }
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const startDate = /* @__PURE__ */ new Date();
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + months);
      const override = await storage.createManualOverride({
        userId: user.id,
        startDate,
        endDate,
        monthsExtended: months,
        reason: reason || `Admin extended subscription by ${months} month(s)`,
        createdBy: req.session.userId
      });
      const updatedUser = await storage.updateUserSubscriptionStatus(
        user.id,
        "active",
        endDate
      );
      res.json({
        success: true,
        message: `Subscription extended by ${months} month(s)`,
        override,
        user: {
          ...updatedUser,
          passwordHash: void 0
        }
      });
    } catch (error) {
      console.error("Extend subscription error:", error);
      res.status(500).json({ error: "Failed to extend subscription" });
    }
  });
  app2.get("/api/admin/user-payments/:userId", requireAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const [payments2, stats, overrides] = await Promise.all([
        storage.getUserPayments(userId),
        storage.getPaymentStats(userId),
        storage.getUserManualOverrides(userId)
      ]);
      res.json({
        user: {
          ...user,
          passwordHash: void 0
        },
        payments: payments2,
        stats,
        overrides
      });
    } catch (error) {
      console.error("Get user payments error:", error);
      res.status(500).json({ error: "Failed to get user payments" });
    }
  });
  app2.post("/api/admin/create-payment", requireAdmin, async (req, res) => {
    try {
      const { email, amount, paymentMethod, notes } = req.body;
      if (!email || !amount) {
        return res.status(400).json({ error: "Email and amount are required" });
      }
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const payment = await storage.createPayment({
        userId: user.id,
        amount: amount.toString(),
        paymentDate: /* @__PURE__ */ new Date(),
        paymentMethod: paymentMethod || "manual",
        status: "completed",
        transactionId: `manual_${Date.now()}`,
        notes: notes || "Manual payment entry by admin",
        createdBy: req.session.userId
      });
      res.json({
        success: true,
        message: "Payment record created",
        payment
      });
    } catch (error) {
      console.error("Create payment error:", error);
      res.status(500).json({ error: "Failed to create payment" });
    }
  });
  app2.get("/api/users", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const currentUser = await storage.getUser(req.session.userId);
      if (!currentUser?.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }
      const includeArchived = req.query.includeArchived === "true";
      const users2 = await storage.getUsers({ includeArchived });
      const sanitizedUsers = users2.map((user) => ({
        ...user,
        passwordHash: void 0
      }));
      res.json(sanitizedUsers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });
  app2.patch("/api/users/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { name, email } = req.body;
      if (!req.session.userId || req.session.userId !== id) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      if (!name || !email) {
        return res.status(400).json({ error: "Name and email are required" });
      }
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser && existingUser.id !== id) {
        return res.status(400).json({ error: "Email already in use" });
      }
      const updatedUser = await storage.updateUser(id, { name, email });
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({ user: updatedUser });
    } catch (error) {
      res.status(500).json({ error: "Failed to update user" });
    }
  });
  app2.delete("/api/users/:id", async (req, res) => {
    try {
      const { id } = req.params;
      if (!req.session.userId || req.session.userId !== id) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      await storage.deleteUser(id);
      req.session.destroy((err) => {
        if (err) {
          console.error("Failed to destroy session:", err);
        }
      });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete user" });
    }
  });
  app2.get("/api/market/status", async (req, res) => {
    try {
      const now = /* @__PURE__ */ new Date();
      const etTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
      res.json({
        isOpen: isMarketOpen(),
        currentTime: now.toISOString(),
        marketTime: etTime.toLocaleString("en-US", {
          timeZone: "America/New_York",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true
        }),
        timezone: "America/New_York"
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get market status" });
    }
  });
  app2.get("/api/stocks", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const { status } = req.query;
      if (status === "rejected") {
        const stocks3 = await storage.getStocksByUserStatus(req.session.userId, status);
        return res.json(stocks3);
      }
      const stocks2 = await storage.getStocks(req.session.userId);
      res.json(stocks2);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch stocks" });
    }
  });
  app2.get("/api/stocks/with-user-status", async (req, res) => {
    try {
      if (!req.session.userId) {
        console.log("[with-user-status] No userId in session");
        return res.status(401).json({ error: "Not authenticated" });
      }
      console.log(`[with-user-status] Fetching stocks for user ${req.session.userId}`);
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const stockLimit = !user.hasSeenOnboarding ? 500 : user.stockLimit || 100;
      console.log(`[with-user-status] User onboarding status: ${user.hasSeenOnboarding}, limit: ${stockLimit}`);
      const stocksWithStatus = await storage.getStocksWithUserStatus(req.session.userId, stockLimit);
      console.log(`[with-user-status] Found ${stocksWithStatus.length} stocks`);
      console.log(`[with-user-status] Pending stocks: ${stocksWithStatus.filter((s) => s.userStatus === "pending").length}`);
      console.log(`[with-user-status] Rejected stocks: ${stocksWithStatus.filter((s) => s.userStatus === "rejected").length}`);
      res.json(stocksWithStatus);
    } catch (error) {
      console.error("[with-user-status] ERROR:");
      console.error("Message:", error?.message);
      console.error("Stack:", error?.stack);
      console.error("Full error:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
      res.status(500).json({
        error: "Failed to fetch stocks with user status",
        details: error?.message || "Unknown error"
      });
    }
  });
  app2.get("/api/stocks/:ticker", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const stock = await storage.getStock(req.session.userId, req.params.ticker);
      if (!stock) {
        return res.status(404).json({ error: "Stock not found" });
      }
      res.json(stock);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch stock" });
    }
  });
  app2.post("/api/stocks", async (req, res) => {
    try {
      const validatedData = insertStockSchema.parse(req.body);
      const stock = await storage.createStock(validatedData);
      res.status(201).json(stock);
    } catch (error) {
      res.status(400).json({ error: "Invalid stock data" });
    }
  });
  app2.patch("/api/stocks/:ticker", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const stock = await storage.updateStock(req.session.userId, req.params.ticker, req.body);
      if (!stock) {
        return res.status(404).json({ error: "Stock not found" });
      }
      res.json(stock);
    } catch (error) {
      res.status(500).json({ error: "Failed to update stock" });
    }
  });
  app2.delete("/api/stocks/:ticker", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const deleted = await storage.deleteStock(req.session.userId, req.params.ticker);
      if (!deleted) {
        return res.status(404).json({ error: "Stock not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete stock" });
    }
  });
  app2.get("/api/stocks/diagnostics/candlesticks", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const stocks2 = await storage.getStocks(req.session.userId);
      const pendingStocks = stocks2.filter((s) => s.recommendationStatus === "pending");
      const diagnostics = {
        totalStocks: stocks2.length,
        pendingStocks: pendingStocks.length,
        note: "Candlesticks are now stored in shared stockCandlesticks table, accessible via /api/stocks/:ticker/candlesticks"
      };
      res.json(diagnostics);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch diagnostics", details: error.message });
    }
  });
  app2.post("/api/stocks/:ticker/refresh", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const ticker = req.params.ticker;
      const stock = await storage.getStock(req.session.userId, ticker);
      if (!stock) {
        return res.status(404).json({ error: "Stock not found" });
      }
      console.log(`[StockAPI] Refreshing market data for ${ticker}...`);
      const marketData = await stockService.getComprehensiveData(ticker);
      const updatedStock = await storage.updateStock(req.session.userId, ticker, {
        currentPrice: marketData.currentPrice,
        previousClose: marketData.previousClose,
        marketCap: marketData.marketCap,
        peRatio: marketData.peRatio,
        priceHistory: marketData.priceHistory,
        companyName: marketData.companyName
      });
      console.log(`[StockAPI] \u2705 Refreshed ${ticker}: $${marketData.currentPrice} (${marketData.marketCap} market cap)`);
      res.json(updatedStock);
    } catch (error) {
      console.error(`[StockAPI] Error refreshing stock data:`, error.message);
      res.status(500).json({ error: error.message || "Failed to refresh stock data" });
    }
  });
  app2.post("/api/stocks/refresh-all", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const stocks2 = await storage.getStocks(req.session.userId);
      const pendingStocks = stocks2.filter((s) => s.recommendationStatus === "pending");
      console.log(`[StockAPI] Refreshing ${pendingStocks.length} pending stocks...`);
      console.log(`[StockAPI] Note: Each stock takes ~36 seconds (3 API calls with 12-second delays)`);
      console.log(`[StockAPI] Estimated total time: ${Math.ceil(pendingStocks.length * 36 / 60)} minutes`);
      const results = {
        success: [],
        failed: []
      };
      for (const stock of pendingStocks) {
        try {
          const marketData = await stockService.getComprehensiveData(stock.ticker);
          await storage.updateStock(req.session.userId, stock.ticker, {
            currentPrice: marketData.currentPrice,
            previousClose: marketData.previousClose,
            marketCap: marketData.marketCap,
            peRatio: marketData.peRatio,
            priceHistory: marketData.priceHistory,
            companyName: marketData.companyName
          });
          results.success.push(stock.ticker);
          console.log(`[StockAPI] \u2705 ${stock.ticker}: $${marketData.currentPrice} | Progress: ${results.success.length}/${pendingStocks.length}`);
        } catch (error) {
          results.failed.push({ ticker: stock.ticker, error: error.message });
          console.error(`[StockAPI] \u274C ${stock.ticker}: ${error.message}`);
        }
      }
      res.json({
        total: pendingStocks.length,
        success: results.success.length,
        failed: results.failed.length,
        results
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to refresh stocks" });
    }
  });
  app2.post("/api/stocks/:ticker/approve", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const stock = await storage.getStock(req.session.userId, req.params.ticker);
      if (!stock) {
        return res.status(404).json({ error: "Stock not found" });
      }
      const { price, quantity } = req.body;
      const purchasePrice = Number(price);
      const purchaseQuantity = Number(quantity);
      if (!isFinite(purchasePrice) || purchasePrice <= 0) {
        return res.status(400).json({ error: "Invalid purchase price - must be a positive number" });
      }
      if (!isFinite(purchaseQuantity) || purchaseQuantity <= 0 || !Number.isInteger(purchaseQuantity)) {
        return res.status(400).json({ error: "Invalid quantity - must be a positive whole number" });
      }
      await storage.ensureUserStockStatus(req.session.userId, req.params.ticker);
      await storage.updateUserStockStatus(req.session.userId, req.params.ticker, {
        status: "approved",
        approvedAt: /* @__PURE__ */ new Date()
      });
      const ibkrConfig2 = await storage.getIbkrConfig();
      let ibkrOrderId;
      let broker = "manual";
      if (ibkrConfig2 && ibkrConfig2.isConnected && ibkrConfig2.accountId) {
        try {
          console.log(`[IBKR] Executing BUY order for ${purchaseQuantity} shares of ${stock.ticker}`);
          const ibkr = getIbkrService(ibkrConfig2.gatewayUrl);
          const orderResult = await ibkr.buyStock(ibkrConfig2.accountId, stock.ticker, purchaseQuantity);
          ibkrOrderId = orderResult.orderId;
          broker = "ibkr";
          console.log(`[IBKR] \u2705 Order placed successfully: ${orderResult.orderId}`);
        } catch (ibkrError) {
          console.error("[IBKR] Trade execution failed:", ibkrError.message);
          console.log("[IBKR] Falling back to manual trade recording");
        }
      }
      const now = /* @__PURE__ */ new Date();
      const initialPricePoint = {
        date: now.toISOString().split("T")[0],
        price: purchasePrice
      };
      const priceHistory = stock.priceHistory || [];
      const dateExists = priceHistory.some((p) => p.date === initialPricePoint.date);
      if (!dateExists) {
        priceHistory.push(initialPricePoint);
        await storage.updateStock(req.session.userId, stock.ticker, {
          priceHistory
        });
      }
      const trade = {
        userId: req.session.userId,
        ticker: stock.ticker,
        type: "buy",
        quantity: purchaseQuantity,
        price: purchasePrice.toFixed(2),
        total: (purchasePrice * purchaseQuantity).toFixed(2),
        status: "completed",
        broker,
        ibkrOrderId
      };
      await storage.createTrade(trade);
      res.json({
        status: "approved",
        stock,
        trade,
        broker,
        message: broker === "ibkr" ? "Trade executed via IBKR" : "Trade recorded manually"
      });
    } catch (error) {
      console.error("Approve recommendation error:", error);
      res.status(500).json({ error: "Failed to approve recommendation" });
    }
  });
  app2.post("/api/stocks/:ticker/reject", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const ticker = req.params.ticker.toUpperCase();
      await storage.cancelAnalysisJobsForTicker(ticker);
      console.log(`[Reject] Cancelled any active analysis jobs for ${ticker}`);
      const result = await storage.rejectTickerForUser(req.session.userId, ticker);
      console.log(`[Reject] Rejected ticker ${ticker} - updated ${result.stocksUpdated} stock entries`);
      res.json({
        status: "rejected",
        ticker,
        stocksUpdated: result.stocksUpdated,
        message: `Rejected ${result.stocksUpdated} transaction(s) for ${ticker}`
      });
    } catch (error) {
      console.error(`[Reject] Error rejecting ${req.params.ticker}:`, error);
      res.status(500).json({ error: "Failed to reject recommendation" });
    }
  });
  app2.patch("/api/stocks/:ticker/unreject", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      console.log(`[Unreject] Starting unreject for ${req.params.ticker} by user ${req.session.userId}`);
      await storage.ensureUserStockStatus(req.session.userId, req.params.ticker);
      const updatedUserStatus = await storage.updateUserStockStatus(req.session.userId, req.params.ticker, {
        status: "pending",
        rejectedAt: null
      });
      console.log(`[Unreject] Successfully restored ${req.params.ticker} to pending status for user ${req.session.userId}`);
      res.json({ status: "pending", userStatus: updatedUserStatus });
    } catch (error) {
      console.error("Unreject stock error:", error);
      res.status(500).json({ error: "Failed to unreject stock" });
    }
  });
  app2.post("/api/stocks/:ticker/simulate", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const stock = await storage.getStock(req.session.userId, req.params.ticker);
      if (!stock) {
        return res.status(404).json({ error: "Stock not found" });
      }
      const simulationCapital = 1e3;
      const purchaseDate = stock.insiderTradeDate ? new Date(stock.insiderTradeDate) : /* @__PURE__ */ new Date();
      const purchaseDateStr = purchaseDate.toISOString().split("T")[0];
      let priceHistory = stock.priceHistory || [];
      if (priceHistory.length === 0 && stock.insiderTradeDate) {
        console.log(`[Simulation] Fetching price history for ${stock.ticker} from ${stock.insiderTradeDate} to today`);
        try {
          const fetchedPrices = await backtestService.fetchHistoricalPrices(
            stock.ticker,
            new Date(stock.insiderTradeDate),
            /* @__PURE__ */ new Date()
          );
          if (fetchedPrices.length > 0) {
            priceHistory = fetchedPrices.map((p) => ({
              date: p.date,
              price: p.close
            }));
            await storage.updateStock(req.session.userId, stock.ticker, { priceHistory });
            console.log(`[Simulation] Fetched ${priceHistory.length} price points for ${stock.ticker}`);
          }
        } catch (error) {
          console.error(`[Simulation] Failed to fetch price history for ${stock.ticker}:`, error);
        }
      }
      const historicalPricePoint = priceHistory.find((p) => p.date === purchaseDateStr);
      const purchasePrice = historicalPricePoint ? historicalPricePoint.price : parseFloat(stock.currentPrice);
      const quantity = Math.floor(simulationCapital / purchasePrice);
      const total = purchasePrice * quantity;
      console.log(`[Simulation] Creating simulation for ${stock.ticker}:`);
      console.log(`[Simulation] - Purchase date: ${purchaseDateStr} (${stock.insiderTradeDate ? "insider trade date" : "today"})`);
      console.log(`[Simulation] - Purchase price: $${purchasePrice.toFixed(2)} (${historicalPricePoint ? "historical" : "current"})`);
      console.log(`[Simulation] - Quantity: ${quantity} shares`);
      if (!historicalPricePoint) {
        priceHistory.push({
          date: purchaseDateStr,
          price: purchasePrice
        });
        await storage.updateStock(req.session.userId, stock.ticker, {
          priceHistory
        });
      }
      const existingHolding = await storage.getPortfolioHoldingByTicker(req.session.userId, stock.ticker, true);
      if (existingHolding) {
        return res.status(400).json({ error: "Simulated holding already exists for this stock" });
      }
      const trade = {
        userId: req.session.userId,
        ticker: stock.ticker,
        type: "buy",
        quantity,
        price: purchasePrice.toFixed(2),
        total: total.toFixed(2),
        status: "completed",
        broker: "simulation",
        isSimulated: true,
        executedAt: purchaseDate
        // Set execution date to purchase date
      };
      const createdTrade = await storage.createTrade(trade);
      const holding = await storage.getPortfolioHoldingByTicker(req.session.userId, stock.ticker, true);
      await storage.ensureUserStockStatus(req.session.userId, req.params.ticker);
      await storage.updateUserStockStatus(req.session.userId, req.params.ticker, {
        status: "approved",
        approvedAt: /* @__PURE__ */ new Date()
      });
      res.json({
        status: "simulated",
        stock,
        trade: createdTrade,
        holding,
        message: stock.insiderTradeDate ? `Simulation created: ${quantity} shares purchased on ${purchaseDateStr} at $${purchasePrice.toFixed(2)} = $${total.toFixed(2)}` : `Simulation created: ${quantity} shares at $${purchasePrice.toFixed(2)} = $${total.toFixed(2)}`
      });
    } catch (error) {
      console.error("Simulate recommendation error:", error);
      res.status(500).json({ error: "Failed to create simulation" });
    }
  });
  app2.delete("/api/stocks/:ticker/simulate", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const { ticker } = req.params;
      const deletedHoldings = await storage.deleteSimulatedHoldingsByTicker(req.session.userId, ticker);
      const deletedTrades = await storage.deleteSimulatedTradesByTicker(req.session.userId, ticker);
      res.json({
        message: `Removed simulated position for ${ticker} (${deletedHoldings} holding(s), ${deletedTrades} trade(s))`,
        deletedHoldings,
        deletedTrades
      });
    } catch (error) {
      console.error("Delete simulation error:", error);
      res.status(500).json({ error: "Failed to delete simulation" });
    }
  });
  const bulkTickersSchema = z2.object({
    tickers: z2.array(z2.string()).min(1, "At least one ticker is required").max(100, "Maximum 100 tickers allowed")
  });
  app2.post("/api/stocks/bulk-approve", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const validationResult = bulkTickersSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: "Invalid request", details: validationResult.error.errors });
      }
      const { tickers } = validationResult.data;
      let success = 0;
      const errors = [];
      for (const ticker of tickers) {
        try {
          const stock = await storage.getStock(req.session.userId, ticker);
          if (!stock) {
            errors.push(`${ticker}: not found`);
            continue;
          }
          const purchasePrice = parseFloat(stock.currentPrice);
          const purchaseQuantity = 10;
          await storage.updateStock(req.session.userId, ticker, {
            recommendationStatus: "approved"
          });
          const existingHolding = await storage.getPortfolioHoldingByTicker(req.session.userId, ticker, false);
          if (existingHolding) {
            const currentAvg = parseFloat(existingHolding.averagePurchasePrice);
            const newAvg = ((currentAvg * existingHolding.quantity + purchasePrice * purchaseQuantity) / (existingHolding.quantity + purchaseQuantity)).toFixed(2);
            await storage.updatePortfolioHolding(existingHolding.id, {
              quantity: existingHolding.quantity + purchaseQuantity,
              averagePurchasePrice: newAvg
            });
          } else {
            await storage.createPortfolioHolding({
              userId: req.session.userId,
              ticker,
              quantity: purchaseQuantity,
              averagePurchasePrice: purchasePrice.toFixed(2)
            });
          }
          await storage.createTrade({
            userId: req.session.userId,
            ticker,
            type: "buy",
            quantity: purchaseQuantity,
            price: purchasePrice.toFixed(2),
            total: (purchasePrice * purchaseQuantity).toFixed(2),
            status: "completed",
            broker: "manual"
          });
          success++;
        } catch (err) {
          errors.push(`${ticker}: ${err instanceof Error ? err.message : "unknown error"}`);
        }
      }
      res.json({
        success,
        failed: errors.length,
        errors: errors.length > 0 ? errors : void 0,
        message: `Approved ${success}/${tickers.length} stocks`
      });
    } catch (error) {
      console.error("Bulk approve error:", error);
      res.status(500).json({ error: "Failed to bulk approve" });
    }
  });
  app2.post("/api/stocks/bulk-reject", async (req, res) => {
    try {
      console.log("[BULK REJECT] Endpoint called. Session userId:", req.session.userId);
      console.log("[BULK REJECT] Request body:", JSON.stringify(req.body));
      if (!req.session.userId) {
        console.log("[BULK REJECT] No userId in session - returning 401");
        return res.status(401).json({ error: "Not authenticated" });
      }
      const validationResult = bulkTickersSchema.safeParse(req.body);
      if (!validationResult.success) {
        console.log("[BULK REJECT] Validation failed:", validationResult.error.errors);
        return res.status(400).json({ error: "Invalid request", details: validationResult.error.errors });
      }
      const { tickers } = validationResult.data;
      console.log("[BULK REJECT] Processing tickers:", tickers);
      let success = 0;
      const errors = [];
      for (const ticker of tickers) {
        try {
          console.log(`[BULK REJECT] Processing ticker: ${ticker}`);
          await storage.cancelAnalysisJobsForTicker(ticker);
          const result = await storage.rejectTickerForUser(req.session.userId, ticker);
          console.log(`[BULK REJECT] Rejected ${ticker} - updated ${result.stocksUpdated} stock entries`);
          success++;
        } catch (err) {
          console.log(`[BULK REJECT] Error processing ${ticker}:`, err);
          errors.push(`${ticker}: ${err instanceof Error ? err.message : "unknown error"}`);
        }
      }
      console.log(`[BULK REJECT] Complete. Success: ${success}, Failed: ${errors.length}`);
      res.json({
        success,
        failed: errors.length,
        errors: errors.length > 0 ? errors : void 0,
        message: `Rejected ${success}/${tickers.length} recommendations`
      });
    } catch (error) {
      console.error("[BULK REJECT] Fatal error:", error);
      res.status(500).json({ error: "Failed to bulk reject" });
    }
  });
  app2.post("/api/stocks/bulk-refresh", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const validationResult = bulkTickersSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: "Invalid request", details: validationResult.error.errors });
      }
      const { tickers } = validationResult.data;
      let success = 0;
      const errors = [];
      for (const ticker of tickers) {
        try {
          const stock = await storage.getStock(req.session.userId, ticker);
          if (!stock) {
            errors.push(`${ticker}: not found`);
            continue;
          }
          await new Promise((resolve) => setTimeout(resolve, 1e3));
          const quote = await finnhubService.getQuote(ticker);
          if (quote && quote.currentPrice) {
            await storage.updateStock(req.session.userId, ticker, {
              currentPrice: quote.currentPrice.toFixed(2),
              previousClose: quote.previousClose?.toFixed(2) || stock.previousClose
            });
            success++;
          } else {
            errors.push(`${ticker}: no quote data`);
          }
        } catch (err) {
          errors.push(`${ticker}: ${err instanceof Error ? err.message : "unknown error"}`);
        }
      }
      res.json({
        success,
        failed: errors.length,
        errors: errors.length > 0 ? errors : void 0,
        message: `Refreshed ${success}/${tickers.length} stocks`
      });
    } catch (error) {
      console.error("Bulk refresh error:", error);
      res.status(500).json({ error: "Failed to bulk refresh" });
    }
  });
  app2.post("/api/stocks/bulk-analyze", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const validationResult = bulkTickersSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: "Invalid request", details: validationResult.error.errors });
      }
      const { tickers } = validationResult.data;
      let queuedCount = 0;
      for (const ticker of tickers) {
        try {
          const stock = await storage.getStock(req.session.userId, ticker);
          if (stock && stock.recommendationStatus === "pending") {
            await storage.enqueueAnalysisJob(ticker, "manual", "high", true);
            queuedCount++;
          }
        } catch (error) {
          console.error(`Failed to queue ${ticker}:`, error);
        }
      }
      res.json({
        total: tickers.length,
        queued: queuedCount,
        message: `Queued ${queuedCount} stocks for AI analysis`
      });
    } catch (error) {
      console.error("Bulk analyze error:", error);
      res.status(500).json({ error: "Failed to bulk analyze" });
    }
  });
  app2.post("/api/stocks/:ticker/analyze", async (req, res) => {
    try {
      const ticker = req.params.ticker.toUpperCase();
      const { force } = req.body;
      if (!force) {
        const existingAnalysis = await storage.getStockAnalysis(ticker);
        if (existingAnalysis && existingAnalysis.analyzedAt) {
          const cacheAge = Date.now() - new Date(existingAnalysis.analyzedAt).getTime();
          const sevenDaysInMs = 7 * 24 * 60 * 60 * 1e3;
          if (cacheAge < sevenDaysInMs) {
            console.log(`[AI Analysis] Using cached analysis for ${ticker} (${Math.floor(cacheAge / (24 * 60 * 60 * 1e3))} days old)`);
            return res.json(existingAnalysis);
          }
        }
      }
      console.log(`[AI Analysis] Enqueueing analysis job for ${ticker} with macro integration${force ? " (forced)" : ""}...`);
      const job = await storage.enqueueAnalysisJob(ticker, "user_manual", "high", force);
      const pendingAnalysis = {
        id: job.id,
        ticker,
        status: "analyzing",
        overallRating: null,
        confidenceScore: null,
        summary: "Analysis in progress...",
        analyzedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      res.json(pendingAnalysis);
    } catch (error) {
      console.error("[AI Analysis] Error:", error);
      res.status(500).json({ error: "Failed to analyze stock: " + (error instanceof Error ? error.message : "Unknown error") });
    }
  });
  app2.get("/api/stocks/:ticker/analysis", async (req, res) => {
    try {
      const ticker = req.params.ticker.toUpperCase();
      const analysis = await storage.getStockAnalysis(ticker);
      if (!analysis) {
        return res.status(404).json({ error: "No analysis found for this stock" });
      }
      res.json(analysis);
    } catch (error) {
      console.error("[AI Analysis] Error fetching analysis:", error);
      res.status(500).json({ error: "Failed to fetch analysis" });
    }
  });
  app2.get("/api/stocks/:ticker/candlesticks", async (req, res) => {
    try {
      const ticker = req.params.ticker.toUpperCase();
      const candlesticks = await storage.getCandlesticksByTicker(ticker);
      if (!candlesticks) {
        return res.status(404).json({ error: "No candlestick data found for this stock" });
      }
      res.json(candlesticks);
    } catch (error) {
      console.error("[Candlesticks] Error fetching candlestick data:", error);
      res.status(500).json({ error: "Failed to fetch candlestick data" });
    }
  });
  app2.get("/api/stock-analyses", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const userStocks = await storage.getStocks(req.session.userId);
      const userTickers = new Set(userStocks.map((s) => s.ticker));
      const allAnalyses = await storage.getAllStockAnalyses();
      const userAnalyses = allAnalyses.filter((a) => userTickers.has(a.ticker));
      const activeJobs = await db.selectDistinct({ ticker: aiAnalysisJobs.ticker }).from(aiAnalysisJobs).where(or2(
        eq2(aiAnalysisJobs.status, "pending"),
        eq2(aiAnalysisJobs.status, "processing")
      ));
      const activeJobTickers = new Set(activeJobs.map((j) => j.ticker));
      const analyses = userAnalyses.map((a) => {
        if (activeJobTickers.has(a.ticker)) {
          return {
            ticker: a.ticker,
            status: "processing",
            integratedScore: null,
            aiScore: null,
            confidenceScore: null,
            overallRating: null,
            summary: null,
            recommendation: null,
            analyzedAt: null
          };
        }
        return a;
      });
      res.json(analyses);
    } catch (error) {
      console.error("[AI Analysis] Error fetching analyses:", error);
      res.status(500).json({ error: "Failed to fetch analyses" });
    }
  });
  app2.post("/api/macro-analysis/run", async (req, res) => {
    try {
      console.log("[Macro API] Running macro economic analysis...");
      const { runMacroAnalysis: runMacroAnalysis2 } = await Promise.resolve().then(() => (init_macroAgentService(), macroAgentService_exports));
      const analysisData = await runMacroAnalysis2();
      const savedAnalysis = await storage.createMacroAnalysis(analysisData);
      console.log("[Macro API] Macro analysis complete. ID:", savedAnalysis.id);
      res.json(savedAnalysis);
    } catch (error) {
      console.error("[Macro API] Error running macro analysis:", error);
      res.status(500).json({ error: "Failed to run macro analysis: " + (error instanceof Error ? error.message : "Unknown error") });
    }
  });
  app2.get("/api/macro-analysis/latest", async (req, res) => {
    try {
      const analysis = await storage.getLatestMacroAnalysis();
      if (!analysis) {
        return res.status(404).json({ error: "No macro analysis found" });
      }
      res.json(analysis);
    } catch (error) {
      console.error("[Macro API] Error fetching latest macro analysis:", error);
      res.status(500).json({ error: "Failed to fetch macro analysis" });
    }
  });
  app2.get("/api/macro-analysis/:id", async (req, res) => {
    try {
      const analysis = await storage.getMacroAnalysis(req.params.id);
      if (!analysis) {
        return res.status(404).json({ error: "Macro analysis not found" });
      }
      res.json(analysis);
    } catch (error) {
      console.error("[Macro API] Error fetching macro analysis:", error);
      res.status(500).json({ error: "Failed to fetch macro analysis" });
    }
  });
  app2.post("/api/analysis-jobs", async (req, res) => {
    try {
      const { ticker, source = "user_manual", priority = "high" } = req.body;
      if (!ticker) {
        return res.status(400).json({ error: "Ticker is required" });
      }
      const job = await storage.enqueueAnalysisJob(
        ticker.toUpperCase(),
        source,
        priority
      );
      res.json(job);
    } catch (error) {
      console.error("[Queue API] Error enqueueing job:", error);
      res.status(500).json({ error: "Failed to enqueue analysis job" });
    }
  });
  app2.get("/api/analysis-jobs/stats", async (req, res) => {
    try {
      const stats = await storage.getQueueStats();
      res.json(stats);
    } catch (error) {
      console.error("[Queue API] Error fetching queue stats:", error);
      res.status(500).json({ error: "Failed to fetch queue stats" });
    }
  });
  app2.get("/api/analysis-jobs", async (req, res) => {
    try {
      const { ticker } = req.query;
      if (ticker) {
        const jobs = await storage.getJobsByTicker(ticker.toUpperCase());
        res.json(jobs);
      } else {
        const stats = await storage.getQueueStats();
        res.json(stats);
      }
    } catch (error) {
      console.error("[Queue API] Error fetching jobs:", error);
      res.status(500).json({ error: "Failed to fetch jobs" });
    }
  });
  app2.get("/api/analysis-jobs/:id", async (req, res) => {
    try {
      const job = await storage.getJobById(req.params.id);
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }
      if (job.status === "completed") {
        const analysis = await storage.getStockAnalysis(job.ticker);
        res.json({ ...job, analysis });
      } else {
        res.json(job);
      }
    } catch (error) {
      console.error("[Queue API] Error fetching job:", error);
      res.status(500).json({ error: "Failed to fetch job" });
    }
  });
  app2.post("/api/stocks/analyze-all", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      console.log(`[Bulk AI Analysis] Starting bulk analysis for user ${req.session.userId}...`);
      const stocks2 = await storage.getStocks(req.session.userId);
      const pendingStocks = stocks2.filter(
        (stock) => stock.recommendation?.toLowerCase() === "buy" && stock.recommendationStatus === "pending"
      );
      if (pendingStocks.length === 0) {
        return res.json({
          message: "No pending stocks to analyze",
          queued: 0,
          total: 0
        });
      }
      console.log(`[Bulk AI Analysis] Found ${pendingStocks.length} pending stocks for user ${req.session.userId}`);
      let queuedCount = 0;
      for (const stock of pendingStocks) {
        try {
          await storage.enqueueAnalysisJob(stock.ticker, "manual", "high", true);
          queuedCount++;
        } catch (error) {
          console.error(`[Bulk AI Analysis] Failed to queue ${stock.ticker}:`, error);
        }
      }
      res.json({
        message: `Queued ${queuedCount} stocks for AI analysis. Background worker will process them soon.`,
        queued: queuedCount,
        total: pendingStocks.length
      });
    } catch (error) {
      console.error("[Bulk AI Analysis] Error:", error);
      res.status(500).json({ error: "Failed to start bulk analysis" });
    }
  });
  app2.get("/api/stocks/:ticker/comments", async (req, res) => {
    try {
      const comments = await storage.getStockComments(req.params.ticker);
      res.json(comments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  });
  app2.post("/api/stocks/:ticker/comments", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const validatedData = insertStockCommentSchema.parse({
        ...req.body,
        ticker: req.params.ticker,
        userId: req.session.userId
      });
      const comment = await storage.createStockComment(validatedData);
      res.status(201).json(comment);
    } catch (error) {
      console.error("Create comment error:", error);
      res.status(400).json({ error: "Invalid comment data" });
    }
  });
  app2.get("/api/stock-comment-counts", async (req, res) => {
    try {
      const counts = await storage.getStockCommentCounts();
      res.json(counts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch comment counts" });
    }
  });
  app2.get("/api/users/me/followed", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const followed = await storage.getUserFollowedStocks(req.session.userId);
      res.json(followed);
    } catch (error) {
      console.error("Get user followed stocks error:", error);
      res.status(500).json({ error: "Failed to fetch followed stocks" });
    }
  });
  app2.post("/api/stocks/:ticker/follow", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const ticker = req.params.ticker.toUpperCase();
      const existingFollows = await storage.getUserFollowedStocks(req.session.userId);
      const alreadyFollowing = existingFollows.some((f) => f.ticker === ticker);
      if (alreadyFollowing) {
        return res.status(409).json({ error: "You are already following this stock" });
      }
      const validatedData = insertFollowedStockSchema.parse({
        ticker,
        userId: req.session.userId
      });
      const follow = await storage.followStock(validatedData);
      void (async () => {
        try {
          const existingCandlesticks = await storage.getCandlesticksByTicker(ticker);
          if (!existingCandlesticks || !existingCandlesticks.candlestickData || existingCandlesticks.candlestickData.length === 0) {
            console.log(`[Follow] Fetching candlestick data for newly followed stock ${ticker}...`);
            const candlesticks = await stockService.getCandlestickData(ticker);
            if (candlesticks && candlesticks.length > 0) {
              await storage.upsertCandlesticks(ticker, candlesticks.map((c) => ({
                date: c.date,
                open: c.open,
                high: c.high,
                low: c.low,
                close: c.close,
                volume: c.volume
              })));
              console.log(`[Follow] \u2713 Candlestick data fetched for ${ticker}`);
            }
          }
        } catch (err) {
          console.error(`[Follow] \u2717 Failed to fetch candlesticks for ${ticker}:`, err.message);
        }
      })();
      try {
        const followerCount = await storage.getFollowerCountForTicker(ticker);
        if (followerCount > 10) {
          console.log(`[Follow] Stock ${ticker} is popular with ${followerCount} followers, creating notifications...`);
          const stock = await storage.getStock(req.session.userId, ticker);
          const stockData = stock;
          const followerUserIds = await storage.getFollowerUserIdsForTicker(ticker);
          for (const followerUserId of followerUserIds) {
            try {
              await storage.createNotification({
                userId: followerUserId,
                ticker,
                type: "popular_stock",
                message: `${ticker} is trending! ${followerCount} traders are now following this stock`,
                metadata: { followerCount },
                isRead: false
              });
            } catch (notifError) {
              if (notifError instanceof Error && !notifError.message.includes("unique constraint")) {
                console.error(`[Follow] Failed to create popular stock notification for user ${followerUserId}:`, notifError);
              }
            }
          }
          console.log(`[Follow] Created ${followerUserIds.length} popular_stock notifications for ${ticker}`);
        }
      } catch (popularError) {
        console.error(`[Follow] Failed to check/create popular stock notifications:`, popularError);
      }
      try {
        const existingAnalysis = await storage.getStockAnalysis(ticker);
        const needsAnalysis = !existingAnalysis || existingAnalysis.status !== "completed";
        if (needsAnalysis) {
          console.log(`[Follow] Triggering day 0 analysis for ${ticker} (status: ${existingAnalysis?.status || "none"})`);
          await storage.enqueueAnalysisJob(ticker, "follow_day_0", "high");
        } else {
          console.log(`[Follow] Skipping analysis for ${ticker} - already completed`);
        }
      } catch (analysisError) {
        console.error(`[Follow] Failed to enqueue analysis for ${ticker}:`, analysisError);
      }
      try {
        const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
        const existingBriefs = await storage.getDailyBriefsForTicker(ticker);
        const briefExistsToday = existingBriefs.some((b) => b.briefDate === today);
        if (!briefExistsToday) {
          console.log(`[Follow] Generating day-0 daily brief for ${ticker}...`);
          const quote = await stockService.getQuote(ticker);
          if (!quote || quote.price === 0 || quote.previousClose === 0) {
            throw new Error("Unable to fetch valid price data");
          }
          const stock = await storage.getStock(req.session.userId, ticker);
          const stockData = stock;
          const previousAnalysis = stockData?.overallRating ? {
            overallRating: stockData.overallRating,
            summary: stockData.summary || "No previous analysis available",
            technicalAnalysis: stockData.technicalAnalysis ? {
              trend: stockData.technicalAnalysis.trend,
              momentum: stockData.technicalAnalysis.momentum,
              score: stockData.technicalAnalysis.score,
              signals: stockData.technicalAnalysis.signals
            } : void 0
          } : void 0;
          const opportunityType = stockData?.recommendation?.toLowerCase().includes("sell") ? "sell" : "buy";
          const holding = await storage.getPortfolioHoldingByTicker(req.session.userId, ticker, false);
          const userOwnsPosition = holding !== void 0 && holding.quantity > 0;
          const now = Date.now() / 1e3;
          const oneDayAgo = now - 24 * 60 * 60;
          const recentNews = stockData?.news?.filter((article) => article.datetime && article.datetime >= oneDayAgo)?.slice(0, 3)?.map((article) => ({
            title: article.headline || "Untitled",
            sentiment: 0,
            source: article.source || "Unknown"
          }));
          const brief = await aiAnalysisService.generateDailyBrief({
            ticker,
            currentPrice: quote.price,
            previousPrice: quote.previousClose,
            opportunityType,
            recentNews: recentNews && recentNews.length > 0 ? recentNews : void 0,
            previousAnalysis
          });
          await storage.createDailyBrief({
            userId: req.session.userId,
            ticker,
            briefDate: today,
            priceSnapshot: quote.price.toString(),
            priceChange: quote.change.toString(),
            priceChangePercent: quote.changePercent.toString(),
            // Watching scenario
            watchingStance: brief.watching.recommendedStance,
            watchingConfidence: brief.watching.confidence,
            watchingText: brief.watching.briefText,
            watchingHighlights: brief.watching.keyHighlights,
            // Owning scenario
            owningStance: brief.owning.recommendedStance,
            owningConfidence: brief.owning.confidence,
            owningText: brief.owning.briefText,
            owningHighlights: brief.owning.keyHighlights,
            // Legacy fields for backwards compat (use user's actual position)
            recommendedStance: userOwnsPosition ? brief.owning.recommendedStance : brief.watching.recommendedStance,
            confidence: userOwnsPosition ? brief.owning.confidence : brief.watching.confidence,
            briefText: userOwnsPosition ? brief.owning.briefText : brief.watching.briefText,
            keyHighlights: userOwnsPosition ? brief.owning.keyHighlights : brief.watching.keyHighlights,
            userOwnsPosition
          });
          console.log(`[Follow] Generated day-0 dual-scenario brief for ${ticker}: Watching=${brief.watching.recommendedStance}(${brief.watching.confidence}), Owning=${brief.owning.recommendedStance}(${brief.owning.confidence})`);
        } else {
          console.log(`[Follow] Daily brief already exists for ${ticker} today, skipping`);
        }
      } catch (briefError) {
        const errorDetails = briefError instanceof Error ? `${briefError.message}
${briefError.stack}` : JSON.stringify(briefError);
        console.error(`[Follow] Failed to generate day-0 brief for ${ticker}:`, errorDetails);
      }
      res.status(201).json(follow);
    } catch (error) {
      console.error("Follow stock error:", error);
      res.status(400).json({ error: "Failed to follow stock" });
    }
  });
  app2.delete("/api/stocks/:ticker/follow", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      await storage.unfollowStock(req.params.ticker.toUpperCase(), req.session.userId);
      res.status(204).send();
    } catch (error) {
      console.error("Unfollow stock error:", error);
      res.status(500).json({ error: "Failed to unfollow stock" });
    }
  });
  app2.patch("/api/stocks/:ticker/position", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const ticker = req.params.ticker.toUpperCase();
      const { hasEnteredPosition } = req.body;
      if (typeof hasEnteredPosition !== "boolean") {
        return res.status(400).json({ error: "hasEnteredPosition must be a boolean" });
      }
      await storage.toggleStockPosition(ticker, req.session.userId, hasEnteredPosition);
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Toggle position error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      if (errorMessage.includes("not being followed")) {
        return res.status(404).json({ error: "Stock is not being followed" });
      }
      res.status(500).json({ error: "Failed to toggle position status" });
    }
  });
  app2.post("/api/stocks/bulk-follow", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const validationResult = bulkTickersSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: "Invalid request", details: validationResult.error.errors });
      }
      const { tickers } = validationResult.data;
      let followedCount = 0;
      for (const ticker of tickers) {
        try {
          const upperTicker = ticker.toUpperCase();
          await storage.followStock({
            ticker: upperTicker,
            userId: req.session.userId
          });
          followedCount++;
          void (async () => {
            try {
              const existingCandlesticks = await storage.getCandlesticksByTicker(upperTicker);
              if (!existingCandlesticks || !existingCandlesticks.candlestickData || existingCandlesticks.candlestickData.length === 0) {
                console.log(`[BulkFollow] Fetching candlestick data for ${upperTicker}...`);
                const candlesticks = await stockService.getCandlestickData(upperTicker);
                if (candlesticks && candlesticks.length > 0) {
                  await storage.upsertCandlesticks(upperTicker, candlesticks.map((c) => ({
                    date: c.date,
                    open: c.open,
                    high: c.high,
                    low: c.low,
                    close: c.close,
                    volume: c.volume
                  })));
                  console.log(`[BulkFollow] \u2713 Candlestick data fetched for ${upperTicker}`);
                }
              }
            } catch (err) {
              console.error(`[BulkFollow] \u2717 Failed to fetch candlesticks for ${upperTicker}:`, err.message);
            }
          })();
          try {
            const existingAnalysis = await storage.getStockAnalysis(upperTicker);
            const needsAnalysis = !existingAnalysis || existingAnalysis.status !== "completed";
            if (needsAnalysis) {
              console.log(`[BulkFollow] Triggering day 0 analysis for ${upperTicker} (status: ${existingAnalysis?.status || "none"})`);
              await storage.enqueueAnalysisJob(upperTicker, "follow_day_0", "high");
            } else {
              console.log(`[BulkFollow] Skipping analysis for ${upperTicker} - already completed`);
            }
          } catch (analysisError) {
            console.error(`[BulkFollow] Failed to enqueue analysis for ${upperTicker}:`, analysisError);
          }
        } catch (error) {
          console.error(`Failed to follow ${ticker}:`, error);
        }
      }
      res.json({
        total: tickers.length,
        followed: followedCount,
        message: `Followed ${followedCount} stocks`
      });
    } catch (error) {
      console.error("Bulk follow error:", error);
      res.status(500).json({ error: "Failed to bulk follow" });
    }
  });
  app2.get("/api/followed-stocks-with-prices", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const followedStocks2 = await storage.getFollowedStocksWithPrices(req.session.userId);
      res.json(followedStocks2);
    } catch (error) {
      console.error("Get followed stocks with prices error:", error);
      res.status(500).json({ error: "Failed to fetch followed stocks" });
    }
  });
  app2.get("/api/followed-stocks-with-status", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const followedStocks2 = await storage.getFollowedStocksWithStatus(req.session.userId);
      res.json(followedStocks2);
    } catch (error) {
      console.error("Get followed stocks with status error:", error);
      res.status(500).json({ error: "Failed to fetch followed stocks with status" });
    }
  });
  app2.get("/api/stocks/:ticker/daily-briefs", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const tickerParam = req.params.ticker?.trim()?.toUpperCase();
      if (!tickerParam || tickerParam.length > 10 || !/^[A-Z]+$/.test(tickerParam)) {
        return res.status(400).json({ error: "Invalid ticker format" });
      }
      const followedStocks2 = await storage.getUserFollowedStocks(req.session.userId);
      const isFollowing = followedStocks2.some((fs2) => fs2.ticker.toUpperCase() === tickerParam);
      if (!isFollowing) {
        return res.status(403).json({ error: "You must follow this stock to view daily briefs" });
      }
      const briefs = await storage.getDailyBriefsForTicker(tickerParam);
      res.json(briefs);
    } catch (error) {
      console.error("Get daily briefs error:", error);
      res.status(500).json({ error: "Failed to fetch daily briefs" });
    }
  });
  app2.post("/api/stocks/:ticker/view", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const view = await storage.markStockAsViewed(req.params.ticker, req.session.userId);
      res.status(201).json(view);
    } catch (error) {
      console.error("Mark stock as viewed error:", error);
      res.status(500).json({ error: "Failed to mark stock as viewed" });
    }
  });
  app2.get("/api/stock-views/:userId", async (req, res) => {
    try {
      const viewedTickers = await storage.getUserStockViews(req.params.userId);
      res.json(viewedTickers);
    } catch (error) {
      console.error("Get stock views error:", error);
      res.status(500).json({ error: "Failed to fetch stock views" });
    }
  });
  app2.get("/api/tutorials/:tutorialId/status", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const completed = await storage.hasCompletedTutorial(req.session.userId, req.params.tutorialId);
      res.json({ completed });
    } catch (error) {
      console.error("Check tutorial status error:", error);
      res.status(500).json({ error: "Failed to check tutorial status" });
    }
  });
  app2.post("/api/tutorials/:tutorialId/complete", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      await storage.markTutorialAsCompleted(req.session.userId, req.params.tutorialId);
      res.status(201).json({ success: true });
    } catch (error) {
      console.error("Mark tutorial complete error:", error);
      res.status(500).json({ error: "Failed to mark tutorial as completed" });
    }
  });
  app2.get("/api/tutorials/user", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const tutorials = await storage.getUserTutorials(req.session.userId);
      res.json(tutorials);
    } catch (error) {
      console.error("Get user tutorials error:", error);
      res.status(500).json({ error: "Failed to fetch user tutorials" });
    }
  });
  app2.get("/api/portfolio/holdings", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const isSimulated = req.query.simulated === "true";
      const holdings = await storage.getPortfolioHoldings(req.session.userId, isSimulated ? true : false);
      res.json(holdings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch portfolio holdings" });
    }
  });
  app2.get("/api/portfolio/holdings/:id", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const holding = await storage.getPortfolioHolding(req.params.id, req.session.userId);
      if (!holding) {
        return res.status(404).json({ error: "Holding not found" });
      }
      res.json(holding);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch holding" });
    }
  });
  app2.delete("/api/portfolio/holdings/:id", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const holding = await storage.getPortfolioHolding(req.params.id, req.session.userId);
      if (!holding) {
        return res.status(404).json({ error: "Holding not found" });
      }
      const success = await storage.deletePortfolioHolding(req.params.id);
      if (!success) {
        return res.status(500).json({ error: "Failed to delete holding" });
      }
      res.json({ message: "Holding deleted successfully" });
    } catch (error) {
      console.error("Delete holding error:", error);
      res.status(500).json({ error: "Failed to delete holding" });
    }
  });
  app2.get("/api/trades", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const isSimulated = req.query.simulated === "true";
      const trades2 = await storage.getTrades(req.session.userId, isSimulated ? true : false);
      res.json(trades2);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch trades" });
    }
  });
  app2.get("/api/trades/:id", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const trade = await storage.getTrade(req.params.id, req.session.userId);
      if (!trade) {
        return res.status(404).json({ error: "Trade not found" });
      }
      res.json(trade);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch trade" });
    }
  });
  app2.post("/api/trades", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const validatedData = insertTradeSchema.parse({ ...req.body, userId: req.session.userId });
      const trade = await storage.createTrade(validatedData);
      res.status(201).json(trade);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(400).json({ error: "Invalid trade data" });
      }
    }
  });
  app2.get("/api/rules", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const rules = await storage.getTradingRules(req.session.userId);
      res.json(rules);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch trading rules" });
    }
  });
  app2.get("/api/rules/:id", async (req, res) => {
    try {
      const rule = await storage.getTradingRule(req.params.id);
      if (!rule) {
        return res.status(404).json({ error: "Trading rule not found" });
      }
      res.json(rule);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch trading rule" });
    }
  });
  app2.post("/api/rules", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const validatedData = insertTradingRuleSchema.parse({ ...req.body, userId: req.session.userId });
      const rule = await storage.createTradingRule(validatedData);
      res.status(201).json(rule);
    } catch (error) {
      res.status(400).json({ error: "Invalid trading rule data" });
    }
  });
  app2.patch("/api/rules/:id", async (req, res) => {
    try {
      const rule = await storage.updateTradingRule(req.params.id, req.body);
      if (!rule) {
        return res.status(404).json({ error: "Trading rule not found" });
      }
      res.json(rule);
    } catch (error) {
      res.status(500).json({ error: "Failed to update trading rule" });
    }
  });
  app2.delete("/api/rules/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteTradingRule(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Trading rule not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete trading rule" });
    }
  });
  app2.get("/api/compound-rules", async (req, res) => {
    try {
      const rules = await storage.getCompoundRules();
      res.json(rules);
    } catch (error) {
      console.error("Error fetching compound rules:", error);
      res.status(500).json({ error: "Failed to fetch compound rules" });
    }
  });
  app2.get("/api/compound-rules/:id", async (req, res) => {
    try {
      const rule = await storage.getCompoundRule(req.params.id);
      if (!rule) {
        return res.status(404).json({ error: "Compound rule not found" });
      }
      res.json(rule);
    } catch (error) {
      console.error("Error fetching compound rule:", error);
      res.status(500).json({ error: "Failed to fetch compound rule" });
    }
  });
  app2.post("/api/compound-rules", async (req, res) => {
    try {
      const validatedData = insertCompoundRuleSchema.parse(req.body);
      const rule = await storage.createCompoundRule(validatedData);
      res.status(201).json(rule);
    } catch (error) {
      console.error("Error creating compound rule:", error);
      res.status(400).json({
        error: "Invalid compound rule data",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
  app2.put("/api/compound-rules/:id", async (req, res) => {
    try {
      const partialData = insertCompoundRuleSchema.partial().parse(req.body);
      const rule = await storage.updateCompoundRule(req.params.id, partialData);
      if (!rule) {
        return res.status(404).json({ error: "Compound rule not found" });
      }
      res.json(rule);
    } catch (error) {
      console.error("Error updating compound rule:", error);
      res.status(400).json({
        error: "Invalid compound rule data",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
  app2.delete("/api/compound-rules/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteCompoundRule(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Compound rule not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting compound rule:", error);
      res.status(500).json({ error: "Failed to delete compound rule" });
    }
  });
  app2.get("/api/rule-executions", async (req, res) => {
    try {
      const ruleId = req.query.ruleId;
      const ticker = req.query.ticker;
      const executions = await storage.getRuleExecutions(ruleId, ticker);
      res.json(executions);
    } catch (error) {
      console.error("Error fetching rule executions:", error);
      res.status(500).json({ error: "Failed to fetch rule executions" });
    }
  });
  app2.get("/api/backtests", async (req, res) => {
    try {
      const backtests2 = await storage.getBacktests();
      res.json(backtests2);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch backtests" });
    }
  });
  app2.get("/api/backtests/:id", async (req, res) => {
    try {
      const backtest = await storage.getBacktest(req.params.id);
      if (!backtest) {
        return res.status(404).json({ error: "Backtest not found" });
      }
      res.json(backtest);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch backtest" });
    }
  });
  app2.post("/api/backtests", async (req, res) => {
    try {
      const { name, ruleId, startDate, endDate, initialCapital } = req.body;
      const rule = ruleId ? await storage.getTradingRule(ruleId) : null;
      if (ruleId && !rule) {
        return res.status(404).json({ error: "Trading rule not found" });
      }
      const capital = parseFloat(initialCapital);
      const numberOfTrades = Math.floor(Math.random() * 20) + 10;
      const winRate = 50 + Math.random() * 30;
      const returnPercent = Math.random() * 40 - 10;
      const totalReturn = capital * (returnPercent / 100);
      const finalValue = capital + totalReturn;
      const days = 30;
      const equityCurve = [];
      let currentValue = capital;
      for (let i = 0; i <= days; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        const dailyChange = totalReturn / days * (0.8 + Math.random() * 0.4);
        currentValue += dailyChange;
        equityCurve.push({
          date: date.toISOString(),
          value: Math.max(capital * 0.7, currentValue)
        });
      }
      const tradeLog = [];
      const ticker = rule?.ticker || "AAPL";
      for (let i = 0; i < numberOfTrades; i++) {
        const tradeDate = new Date(startDate);
        tradeDate.setDate(tradeDate.getDate() + Math.floor(i / numberOfTrades * days));
        tradeLog.push({
          date: tradeDate.toISOString(),
          type: i % 2 === 0 ? "buy" : "sell",
          ticker,
          quantity: Math.floor(Math.random() * 10) + 1,
          price: 150 + Math.random() * 50,
          total: (150 + Math.random() * 50) * (Math.floor(Math.random() * 10) + 1)
        });
      }
      const backtest = await storage.createBacktest({
        name,
        ruleId: ruleId || null,
        startDate,
        endDate,
        initialCapital,
        finalValue: finalValue.toFixed(2),
        totalReturn: totalReturn.toFixed(2),
        totalReturnPercent: returnPercent.toFixed(2),
        numberOfTrades,
        winRate: winRate.toFixed(2),
        bestTrade: (Math.random() * 500 + 100).toFixed(2),
        worstTrade: (-(Math.random() * 300 + 50)).toFixed(2),
        tradeLog,
        equityCurve
      });
      res.status(201).json(backtest);
    } catch (error) {
      console.error("Backtest error:", error);
      res.status(400).json({ error: "Invalid backtest data" });
    }
  });
  app2.post("/api/stocks/bulk-simulate", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const { tickers } = req.body;
      if (!Array.isArray(tickers) || tickers.length === 0) {
        return res.status(400).json({ error: "Tickers array is required" });
      }
      const createdHoldings = [];
      const errors = [];
      for (const ticker of tickers) {
        try {
          const stock = await storage.getStock(req.session.userId, ticker);
          if (!stock) {
            errors.push({ ticker, error: "Stock not found" });
            continue;
          }
          const existingHolding = await storage.getPortfolioHoldingByTicker(req.session.userId, ticker, true);
          if (existingHolding) {
            errors.push({ ticker, error: "Simulated holding already exists" });
            continue;
          }
          const simulationCapital = 1e3;
          const purchaseDate = stock.insiderTradeDate ? new Date(stock.insiderTradeDate) : /* @__PURE__ */ new Date();
          const purchaseDateStr = purchaseDate.toISOString().split("T")[0];
          let priceHistory = stock.priceHistory || [];
          if (priceHistory.length === 0 && stock.insiderTradeDate) {
            console.log(`[BulkSimulation] Fetching price history for ${stock.ticker} from ${stock.insiderTradeDate} to today`);
            try {
              const fetchedPrices = await backtestService.fetchHistoricalPrices(
                stock.ticker,
                new Date(stock.insiderTradeDate),
                /* @__PURE__ */ new Date()
              );
              if (fetchedPrices.length > 0) {
                priceHistory = fetchedPrices.map((p) => ({
                  date: p.date,
                  price: p.close
                }));
                await storage.updateStock(req.session.userId, stock.ticker, { priceHistory });
                console.log(`[BulkSimulation] Fetched ${priceHistory.length} price points for ${stock.ticker}`);
              }
            } catch (error) {
              console.error(`[BulkSimulation] Failed to fetch price history for ${stock.ticker}:`, error);
            }
          }
          const historicalPricePoint = priceHistory.find((p) => p.date === purchaseDateStr);
          const purchasePrice = historicalPricePoint ? historicalPricePoint.price : parseFloat(stock.currentPrice);
          const quantity = Math.floor(simulationCapital / purchasePrice);
          const total = purchasePrice * quantity;
          const trade = await storage.createTrade({
            userId: req.session.userId,
            ticker,
            type: "buy",
            quantity,
            price: purchasePrice.toFixed(2),
            total: total.toFixed(2),
            status: "completed",
            broker: "simulation",
            isSimulated: true,
            executedAt: purchaseDate
          });
          const holding = await storage.getPortfolioHoldingByTicker(req.session.userId, ticker, true);
          await storage.ensureUserStockStatus(req.session.userId, ticker);
          await storage.updateUserStockStatus(req.session.userId, ticker, {
            status: "approved",
            approvedAt: /* @__PURE__ */ new Date()
          });
          createdHoldings.push({ ticker, holdingId: holding?.id, tradeId: trade.id });
        } catch (error) {
          errors.push({ ticker, error: error instanceof Error ? error.message : "Unknown error" });
        }
      }
      res.json({
        success: true,
        total: tickers.length,
        created: createdHoldings.length,
        failed: errors.length,
        holdings: createdHoldings,
        errors: errors.length > 0 ? errors : void 0
      });
    } catch (error) {
      console.error("Bulk simulate error:", error);
      res.status(500).json({ error: "Failed to create simulations" });
    }
  });
  app2.get("/api/telegram/config", async (req, res) => {
    try {
      const config = await storage.getTelegramConfig();
      if (!config) {
        return res.status(404).json({ error: "Telegram configuration not found" });
      }
      const { sessionString, ...configWithoutSession } = config;
      res.json(configWithoutSession);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch Telegram configuration" });
    }
  });
  app2.post("/api/telegram/config", async (req, res) => {
    try {
      const validatedData = insertTelegramConfigSchema.parse(req.body);
      const config = await storage.createOrUpdateTelegramConfig(validatedData);
      await telegramService.initialize();
      const { sessionString, ...configWithoutSession } = config;
      res.status(201).json(configWithoutSession);
    } catch (error) {
      console.error("Telegram config error:", error);
      res.status(400).json({ error: "Invalid Telegram configuration data" });
    }
  });
  app2.post("/api/telegram/fetch", async (req, res) => {
    try {
      const config = await storage.getTelegramConfig();
      if (!config || !config.enabled) {
        return res.status(400).json({ error: "Telegram is not configured or disabled" });
      }
      const limit = req.body.limit || 10;
      const messages = await telegramService.fetchRecentMessages(
        config.channelUsername,
        limit
      );
      res.json({
        success: true,
        messagesFetched: messages.length,
        messages: messages.map((msg) => ({
          id: msg.id,
          date: msg.date,
          text: msg.text,
          preview: msg.text?.substring(0, 100) || "(no text)",
          views: msg.views,
          entities: msg.entities
        })),
        message: `Fetched ${messages.length} messages from @${config.channelUsername}. Check server logs for detailed structure.`
      });
    } catch (error) {
      console.error("Telegram fetch error:", error);
      res.status(500).json({ error: "Failed to fetch Telegram messages" });
    }
  });
  app2.get("/api/telegram/status", async (req, res) => {
    try {
      const status = telegramService.getConnectionStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: "Failed to get connection status" });
    }
  });
  app2.post("/api/telegram/auth/send-code", async (req, res) => {
    try {
      const { phoneNumber } = req.body;
      if (!phoneNumber) {
        return res.status(400).json({ error: "Phone number is required" });
      }
      const result = await telegramService.startAuthentication(phoneNumber);
      res.json(result);
    } catch (error) {
      console.error("Send code error:", error);
      res.status(500).json({ error: error.message || "Failed to send verification code" });
    }
  });
  app2.post("/api/telegram/auth/sign-in", async (req, res) => {
    try {
      const { phoneNumber, phoneCode, phoneCodeHash } = req.body;
      if (!phoneNumber || !phoneCode || !phoneCodeHash) {
        return res.status(400).json({ error: "Phone number, code, and code hash are required" });
      }
      const result = await telegramService.completeAuthentication(phoneNumber, phoneCode, phoneCodeHash);
      res.json(result);
    } catch (error) {
      console.error("Sign in error:", error);
      res.status(500).json({ error: error.message || "Failed to complete authentication" });
    }
  });
  app2.post("/api/telegram/test-notification", async (req, res) => {
    try {
      if (!telegramNotificationService.isReady()) {
        return res.status(503).json({
          error: "Telegram notification service not initialized",
          details: "Make sure TELEGRAM_BOT_TOKEN and TELEGRAM_NOTIFICATION_CHAT_ID are configured"
        });
      }
      const success = await telegramNotificationService.sendStockAlert({
        ticker: "TEST",
        companyName: "Test Company Inc.",
        recommendation: "buy",
        currentPrice: "123.45",
        insiderPrice: "120.00",
        insiderQuantity: 5e4,
        confidenceScore: 85
      });
      if (success) {
        res.json({ success: true, message: "Test notification sent successfully!" });
      } else {
        res.status(500).json({ success: false, error: "Failed to send notification" });
      }
    } catch (error) {
      console.error("Test notification error:", error);
      res.status(500).json({ error: error.message || "Failed to send test notification" });
    }
  });
  app2.get("/api/openinsider/config", async (req, res) => {
    try {
      let config = await storage.getOpeninsiderConfig();
      if (!config) {
        config = await storage.createOrUpdateOpeninsiderConfig({
          enabled: false,
          fetchLimit: 50
        });
      }
      res.json(config);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch OpenInsider configuration" });
    }
  });
  app2.post("/api/openinsider/config", async (req, res) => {
    try {
      const validatedData = insertOpeninsiderConfigSchema.parse(req.body);
      const config = await storage.createOrUpdateOpeninsiderConfig(validatedData);
      res.status(201).json(config);
    } catch (error) {
      console.error("OpenInsider config error:", error);
      res.status(400).json({ error: "Invalid OpenInsider configuration data" });
    }
  });
  app2.get("/api/insider/history/:insiderName", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const insiderName = decodeURIComponent(req.params.insiderName).trim();
      if (!insiderName) {
        return res.status(400).json({ error: "Insider name is required" });
      }
      const ticker = req.query.ticker?.trim().toUpperCase();
      const limitParam = req.query.limit;
      let limit = ticker ? 50 : 20;
      if (limitParam) {
        const parsed = parseInt(limitParam, 10);
        if (isNaN(parsed) || parsed < 1) {
          return res.status(400).json({ error: "Invalid limit parameter" });
        }
        limit = Math.min(parsed, ticker ? 200 : 100);
      }
      const sanitizedName = insiderName.replace(/[\n\r]/g, " ").substring(0, 100);
      const tickerInfo = ticker ? ` for ${ticker}` : "";
      console.log(`[InsiderHistory] Fetching history for "${sanitizedName}"${tickerInfo} (limit: ${limit})`);
      const scraperResponse = await openinsiderService.fetchInsiderPurchases(
        limit,
        { insider_name: insiderName, ticker }
      );
      const trades2 = scraperResponse.transactions;
      console.log(`[InsiderHistory] Found ${trades2.length} trades for "${sanitizedName}"`);
      console.log(`[InsiderHistory] Stage 1 Filter Stats:`, scraperResponse.stats);
      if (!trades2 || trades2.length === 0) {
        return res.json({
          insiderName,
          count: 0,
          trades: [],
          score: null
        });
      }
      const scoredTrades = await openinsiderService.calculateTradeScores(trades2);
      const insiderScore = openinsiderService.calculateInsiderScore(scoredTrades);
      res.json({
        insiderName,
        count: scoredTrades.length,
        trades: scoredTrades,
        score: insiderScore
      });
    } catch (error) {
      console.error("[InsiderHistory] ERROR occurred:");
      console.error("[InsiderHistory] Error message:", error.message);
      console.error("[InsiderHistory] Error stack:", error.stack);
      if (error.stdout) console.error("[InsiderHistory] stdout:", error.stdout);
      if (error.stderr) console.error("[InsiderHistory] stderr:", error.stderr);
      if (error.message?.includes("timeout") || error.message?.includes("network")) {
        return res.status(502).json({
          error: "Failed to fetch insider data from OpenInsider",
          details: "The service may be temporarily unavailable"
        });
      }
      res.status(500).json({
        error: "Failed to fetch insider trading history",
        details: error.message || "Unknown error"
      });
    }
  });
  app2.post("/api/openinsider/fetch", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const config = await storage.getOpeninsiderConfig();
      if (!config || !config.enabled) {
        return res.status(400).json({ error: "OpenInsider is not configured or disabled" });
      }
      const filters = {};
      if (config.insiderTitles && config.insiderTitles.length > 0) {
        filters.insiderTitles = config.insiderTitles;
      }
      if (config.minTransactionValue) {
        filters.minTransactionValue = config.minTransactionValue;
      }
      if (config.fetchPreviousDayOnly) {
        filters.previousDayOnly = true;
      }
      const optionsDealThreshold = config.optionsDealThresholdPercent ?? 15;
      const minMarketCap = config.minMarketCap ?? 500;
      console.log(`[OpeninsiderFetch] ====== STAGE 1: Python Scraper Filters ======`);
      console.log(`[OpeninsiderFetch] Fetch limit: ${config.fetchLimit || 50}`);
      console.log(`[OpeninsiderFetch] Insider titles: ${filters.insiderTitles ? filters.insiderTitles.join(", ") : "ALL"}`);
      console.log(`[OpeninsiderFetch] Min transaction value: ${filters.minTransactionValue ? "$" + filters.minTransactionValue.toLocaleString() : "NONE"}`);
      console.log(`[OpeninsiderFetch] Previous day only: ${filters.previousDayOnly}`);
      console.log(`[OpeninsiderFetch] ====== STAGE 2: Backend Post-Processing ======`);
      console.log(`[OpeninsiderFetch] Min market cap: $${minMarketCap}M`);
      console.log(`[OpeninsiderFetch] Options deal threshold: ${optionsDealThreshold}% (insider price >= market price)`);
      console.log(`[OpeninsiderFetch] ==============================================`);
      console.log(`[OpeninsiderFetch] User ${req.session.userId}: Fetching both purchases AND sales...`);
      const [purchasesResponse, salesResponse] = await Promise.all([
        openinsiderService.fetchInsiderPurchases(
          config.fetchLimit || 50,
          Object.keys(filters).length > 0 ? filters : void 0,
          "P"
        ),
        openinsiderService.fetchInsiderSales(
          config.fetchLimit || 50,
          Object.keys(filters).length > 0 ? filters : void 0
        )
      ]);
      const transactions = [...purchasesResponse.transactions, ...salesResponse.transactions];
      const stage1Stats = {
        total_rows_scraped: purchasesResponse.stats.total_rows_scraped + salesResponse.stats.total_rows_scraped,
        filtered_not_purchase: purchasesResponse.stats.filtered_not_purchase + salesResponse.stats.filtered_not_purchase,
        filtered_invalid_data: purchasesResponse.stats.filtered_invalid_data + salesResponse.stats.filtered_invalid_data,
        filtered_by_date: purchasesResponse.stats.filtered_by_date + salesResponse.stats.filtered_by_date,
        filtered_by_title: purchasesResponse.stats.filtered_by_title + salesResponse.stats.filtered_by_title,
        filtered_by_transaction_value: purchasesResponse.stats.filtered_by_transaction_value + salesResponse.stats.filtered_by_transaction_value,
        filtered_by_insider_name: purchasesResponse.stats.filtered_by_insider_name + salesResponse.stats.filtered_by_insider_name
      };
      console.log(`[OpeninsiderFetch] User ${req.session.userId}: Fetched ${purchasesResponse.transactions.length} purchases + ${salesResponse.transactions.length} sales = ${transactions.length} total`);
      console.log(`[OpeninsiderFetch] User ${req.session.userId}: BUY transactions: ${transactions.filter((t) => t.recommendation === "buy").length}`);
      console.log(`[OpeninsiderFetch] User ${req.session.userId}: SELL transactions: ${transactions.filter((t) => t.recommendation === "sell").length}`);
      const totalStage1Filtered = stage1Stats.filtered_by_title + stage1Stats.filtered_by_transaction_value + stage1Stats.filtered_by_date + stage1Stats.filtered_not_purchase + stage1Stats.filtered_invalid_data;
      console.log(`
[OpeninsiderFetch] ======= STAGE 1: Python Scraper Filters =======`);
      console.log(`[OpeninsiderFetch] Total rows scraped: ${stage1Stats.total_rows_scraped}`);
      console.log(`[OpeninsiderFetch]   \u2022 Not a purchase / Invalid: ${stage1Stats.filtered_not_purchase + stage1Stats.filtered_invalid_data}`);
      console.log(`[OpeninsiderFetch]   \u2022 Filtered by date: ${stage1Stats.filtered_by_date}`);
      console.log(`[OpeninsiderFetch]   \u2022 Filtered by title: ${stage1Stats.filtered_by_title}`);
      console.log(`[OpeninsiderFetch]   \u2022 Filtered by transaction value: ${stage1Stats.filtered_by_transaction_value}`);
      console.log(`[OpeninsiderFetch] \u2192 Total Stage 1 filtered: ${totalStage1Filtered}`);
      console.log(`[OpeninsiderFetch] \u2192 Returned ${transactions.length} matching transactions`);
      console.log(`[OpeninsiderFetch] ===================================================
`);
      if (transactions.length === 0) {
        await storage.updateOpeninsiderSyncStatus();
        return res.json({ success: true, message: "No new insider transactions found", created: 0 });
      }
      let createdCount = 0;
      let filteredCount = 0;
      const createdTickers = [];
      console.log(`[OpeninsiderFetch] Filtering ${transactions.length} transactions for admin user ${req.session.userId}...`);
      const newTransactions = [];
      for (const transaction of transactions) {
        const existingTransaction = await storage.getTransactionByCompositeKey(
          req.session.userId,
          // Admin user's stocks
          transaction.ticker,
          transaction.filingDate,
          transaction.insiderName,
          transaction.recommendation
          // Use actual recommendation (buy or sell)
        );
        if (!existingTransaction) {
          newTransactions.push(transaction);
        }
      }
      console.log(`[OpeninsiderFetch] ${newTransactions.length} new transactions after duplicate check`);
      console.log(`[OpeninsiderFetch] New BUY transactions: ${newTransactions.filter((t) => t.recommendation === "buy").length}`);
      console.log(`[OpeninsiderFetch] New SELL transactions: ${newTransactions.filter((t) => t.recommendation === "sell").length}`);
      if (newTransactions.length === 0) {
        await storage.updateOpeninsiderSyncStatus();
        return res.json({
          success: true,
          message: "All transactions already exist in database",
          created: 0,
          total: transactions.length,
          filtered: 0
        });
      }
      const tickers = Array.from(new Set(newTransactions.map((t) => t.ticker)));
      console.log(`[OpeninsiderFetch] Fetching data for ${tickers.length} unique tickers...`);
      const [quotesMap, stockDataMap] = await Promise.all([
        finnhubService.getBatchQuotes(tickers),
        finnhubService.getBatchStockData(tickers)
      ]);
      console.log(`[OpeninsiderFetch] Received ${quotesMap.size} quotes and ${stockDataMap.size} company profiles`);
      let filteredMarketCap = 0;
      let filteredOptionsDeals = 0;
      let filteredNoQuote = 0;
      console.log(`[OpeninsiderFetch] Processing ${newTransactions.length} new transactions with backend filters...`);
      for (const transaction of newTransactions) {
        try {
          const quote = quotesMap.get(transaction.ticker);
          if (!quote || !quote.currentPrice) {
            filteredNoQuote++;
            console.log(`[OpeninsiderFetch] No quote for ${transaction.ticker}, skipping`);
            continue;
          }
          const data = stockDataMap.get(transaction.ticker);
          if (!data?.marketCap || data.marketCap < minMarketCap) {
            filteredMarketCap++;
            console.log(`[OpeninsiderFetch] \u2297 ${transaction.ticker} market cap too low:`);
            console.log(`  Insider: ${transaction.insiderName} (${transaction.insiderTitle || "N/A"})`);
            console.log(`  Market cap: $${data?.marketCap || 0}M (need >$${minMarketCap}M)`);
            console.log(`  Insider price: $${transaction.price.toFixed(2)}, Market price: $${quote.currentPrice.toFixed(2)}`);
            continue;
          }
          if (transaction.recommendation === "buy") {
            const insiderPriceNum = transaction.price;
            const thresholdPercent = optionsDealThreshold / 100;
            if (optionsDealThreshold > 0 && insiderPriceNum < quote.currentPrice * thresholdPercent) {
              filteredOptionsDeals++;
              console.log(`[OpeninsiderFetch] \u2297 ${transaction.ticker} likely options deal:`);
              console.log(`  Insider: ${transaction.insiderName} (${transaction.insiderTitle || "N/A"})`);
              console.log(`  Insider price: $${insiderPriceNum.toFixed(2)} < ${optionsDealThreshold}% of market: $${quote.currentPrice.toFixed(2)}`);
              console.log(`  Transaction value: $${(insiderPriceNum * transaction.quantity).toLocaleString()}, Quantity: ${transaction.quantity.toLocaleString()}`);
              continue;
            }
          }
          console.log(`[OpeninsiderFetch] Creating stock for admin user ${req.session.userId}: ${transaction.ticker}...`);
          const newStock = await storage.createStock({
            userId: req.session.userId,
            // Admin user only
            ticker: transaction.ticker,
            companyName: transaction.companyName || transaction.ticker,
            currentPrice: quote.currentPrice.toString(),
            previousClose: quote.previousClose?.toString() || quote.currentPrice.toString(),
            insiderPrice: transaction.price.toString(),
            insiderQuantity: transaction.quantity,
            insiderTradeDate: transaction.filingDate,
            insiderName: transaction.insiderName,
            insiderTitle: transaction.insiderTitle,
            recommendation: transaction.recommendation || "buy",
            source: "openinsider",
            confidenceScore: transaction.confidence || 75,
            peRatio: null,
            marketCap: data?.marketCap ? `$${Math.round(data.marketCap)}M` : null,
            description: data?.companyInfo?.description || null,
            industry: data?.companyInfo?.industry || null,
            country: data?.companyInfo?.country || null,
            webUrl: data?.companyInfo?.webUrl || null,
            ipo: data?.companyInfo?.ipo || null,
            news: data?.news || [],
            insiderSentimentMspr: data?.insiderSentiment?.mspr.toString() || null,
            insiderSentimentChange: data?.insiderSentiment?.change.toString() || null,
            priceHistory: []
          });
          createdCount++;
          createdTickers.push(transaction.ticker);
          console.log(`[OpeninsiderFetch] \u2713 Created recommendation for ${transaction.ticker}:`);
          console.log(`  Insider: ${transaction.insiderName} (${transaction.insiderTitle || "N/A"})`);
          console.log(`  Insider price: $${transaction.price.toFixed(2)}, Market price: $${quote.currentPrice.toFixed(2)}`);
          console.log(`  Market cap: $${data.marketCap}M, Quantity: ${transaction.quantity.toLocaleString()}`);
          console.log(`  Transaction value: $${(transaction.price * transaction.quantity).toLocaleString()}`);
          if (telegramNotificationService.isReady()) {
            try {
              const notificationSent = await telegramNotificationService.sendStockAlert({
                ticker: newStock.ticker,
                companyName: newStock.companyName,
                recommendation: newStock.recommendation || "buy",
                currentPrice: newStock.currentPrice,
                insiderPrice: newStock.insiderPrice || void 0,
                insiderQuantity: newStock.insiderQuantity || void 0,
                confidenceScore: newStock.confidenceScore || void 0
              });
              if (!notificationSent) {
                console.log(`[OpeninsiderFetch] Failed to send Telegram notification for ${transaction.ticker}`);
              }
            } catch (err) {
              console.error(`[OpeninsiderFetch] Error sending Telegram notification for ${transaction.ticker}:`, err);
            }
          }
        } catch (err) {
          console.error(`[OpeninsiderFetch] \u274C Error processing ${transaction.ticker}:`, err);
          console.error(`[OpeninsiderFetch] Error details:`, {
            ticker: transaction.ticker,
            insiderName: transaction.insiderName,
            error: err instanceof Error ? err.message : String(err),
            stack: err instanceof Error ? err.stack : void 0
          });
        }
      }
      if (createdTickers.length > 0) {
        const uniqueTickers = Array.from(new Set(createdTickers));
        console.log(`[OpeninsiderFetch] Checking ${uniqueTickers.length} unique tickers for AI analysis (from ${createdTickers.length} transactions)...`);
        let queuedCount = 0;
        let skippedCount = 0;
        for (const ticker of uniqueTickers) {
          try {
            const existingAnalysis = await storage.getStockAnalysis(ticker);
            const needsAnalysis = !existingAnalysis || existingAnalysis.status !== "completed";
            if (needsAnalysis) {
              await storage.enqueueAnalysisJob(ticker, "openinsider_fetch", "normal");
              console.log(`[OpeninsiderFetch] \u2713 Queued AI analysis for ${ticker} (status: ${existingAnalysis?.status || "none"})`);
              queuedCount++;
            } else {
              console.log(`[OpeninsiderFetch] \u2298 Skipped ${ticker} - already completed`);
              skippedCount++;
            }
          } catch (error) {
            console.error(`[OpeninsiderFetch] Failed to queue AI analysis for ${ticker}:`, error);
          }
        }
        console.log(`[OpeninsiderFetch] Analysis jobs: ${queuedCount} queued, ${skippedCount} skipped (already completed)`);
      }
      await storage.updateOpeninsiderSyncStatus();
      if (req.session.userId) {
        const user = await storage.getUser(req.session.userId);
        if (user && !user.initialDataFetched) {
          await storage.markUserInitialDataFetched(req.session.userId);
          console.log(`[Onboarding] Marked user ${req.session.userId} initial data as fetched`);
        }
      }
      const duplicates = transactions.length - newTransactions.length;
      console.log(`
[OpeninsiderFetch] ======= STAGE 2: Backend Post-Processing =======`);
      console.log(`[OpeninsiderFetch] Starting with: ${transactions.length} transactions`);
      console.log(`[OpeninsiderFetch]   \u2297 Duplicates: ${duplicates}`);
      console.log(`[OpeninsiderFetch]   \u2297 Market cap < $${minMarketCap}M: ${filteredMarketCap}`);
      console.log(`[OpeninsiderFetch]   \u2297 Options deals (< ${optionsDealThreshold}%): ${filteredOptionsDeals}`);
      console.log(`[OpeninsiderFetch]   \u2297 No quote: ${filteredNoQuote}`);
      console.log(`[OpeninsiderFetch] \u2192 Total Stage 2 filtered: ${duplicates + filteredMarketCap + filteredOptionsDeals + filteredNoQuote}`);
      console.log(`[OpeninsiderFetch] ===================================================`);
      console.log(`
[OpeninsiderFetch] \u2713 Successfully created ${createdCount} new recommendations
`);
      res.json({
        success: true,
        message: `Created ${createdCount} new recommendations. Stage 1: Scraped ${stage1Stats.total_rows_scraped} rows, filtered ${totalStage1Filtered}, returned ${transactions.length}. Stage 2: ${duplicates} duplicates, ${filteredMarketCap} market cap, ${filteredOptionsDeals} options deals, ${filteredNoQuote} no quote.`,
        created: createdCount,
        total: transactions.length,
        stage1: {
          totalScraped: stage1Stats.total_rows_scraped,
          filteredNotPurchase: stage1Stats.filtered_not_purchase + stage1Stats.filtered_invalid_data,
          filteredByDate: stage1Stats.filtered_by_date,
          filteredByTitle: stage1Stats.filtered_by_title,
          filteredByTransactionValue: stage1Stats.filtered_by_transaction_value,
          totalFiltered: totalStage1Filtered,
          returned: transactions.length
        },
        stage2: {
          duplicates,
          marketCapTooLow: filteredMarketCap,
          optionsDeals: filteredOptionsDeals,
          noQuote: filteredNoQuote,
          totalFiltered: filteredMarketCap + filteredOptionsDeals + filteredNoQuote
        },
        activeFilters: {
          stage1: {
            insiderTitles: filters.insiderTitles || null,
            minTransactionValue: filters.minTransactionValue || null,
            previousDayOnly: filters.previousDayOnly || false
          },
          stage2: {
            minMarketCap,
            optionsDealThreshold
          }
        }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("[OpeninsiderFetch] Error:", error);
      await storage.updateOpeninsiderSyncStatus(errorMessage);
      res.status(500).json({ error: "Failed to fetch OpenInsider data" });
    }
  });
  app2.get("/api/ibkr/config", async (req, res) => {
    try {
      let config = await storage.getIbkrConfig();
      if (!config) {
        config = await storage.createOrUpdateIbkrConfig({
          gatewayUrl: "https://localhost:5000",
          isPaperTrading: true
        });
      }
      res.json(config);
    } catch (error) {
      console.error("IBKR config fetch error:", error);
      res.status(500).json({ error: "Failed to fetch IBKR configuration" });
    }
  });
  app2.post("/api/ibkr/config", async (req, res) => {
    try {
      const config = await storage.createOrUpdateIbkrConfig(req.body);
      res.json(config);
    } catch (error) {
      console.error("IBKR config update error:", error);
      res.status(400).json({ error: "Failed to update IBKR configuration" });
    }
  });
  app2.get("/api/ibkr/status", async (req, res) => {
    try {
      const config = await storage.getIbkrConfig();
      if (!config) {
        return res.json({ connected: false, error: "IBKR not configured" });
      }
      const ibkr = getIbkrService(config.gatewayUrl);
      const authStatus = await ibkr.checkAuthStatus();
      await storage.updateIbkrConnectionStatus(authStatus.authenticated && authStatus.connected);
      res.json({
        connected: authStatus.authenticated && authStatus.connected,
        authenticated: authStatus.authenticated,
        competing: authStatus.competing,
        accountId: config.accountId,
        isPaperTrading: config.isPaperTrading,
        gatewayUrl: config.gatewayUrl
      });
    } catch (error) {
      console.error("IBKR status check error:", error);
      await storage.updateIbkrConnectionStatus(false, void 0, error.message);
      res.json({
        connected: false,
        error: "Gateway not reachable. Make sure IBKR Client Portal Gateway is running."
      });
    }
  });
  app2.get("/api/ibkr/accounts", async (req, res) => {
    try {
      const config = await storage.getIbkrConfig();
      if (!config) {
        return res.status(400).json({ error: "IBKR not configured" });
      }
      const ibkr = getIbkrService(config.gatewayUrl);
      const accounts = await ibkr.getAccounts();
      if (accounts.length > 0 && !config.accountId) {
        await storage.createOrUpdateIbkrConfig({ accountId: accounts[0].id });
      }
      res.json(accounts);
    } catch (error) {
      console.error("IBKR accounts fetch error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/ibkr/positions", async (req, res) => {
    try {
      const config = await storage.getIbkrConfig();
      if (!config || !config.accountId) {
        return res.status(400).json({ error: "IBKR account not configured" });
      }
      const ibkr = getIbkrService(config.gatewayUrl);
      const positions = await ibkr.getPositions(config.accountId);
      res.json(positions);
    } catch (error) {
      console.error("IBKR positions fetch error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/ibkr/trade", async (req, res) => {
    try {
      const { ticker, action, quantity } = req.body;
      if (!ticker || !action || !quantity) {
        return res.status(400).json({ error: "Missing required fields: ticker, action, quantity" });
      }
      const config = await storage.getIbkrConfig();
      if (!config || !config.accountId) {
        return res.status(400).json({ error: "IBKR account not configured" });
      }
      if (!config.isConnected) {
        return res.status(400).json({ error: "IBKR gateway is not connected" });
      }
      const ibkr = getIbkrService(config.gatewayUrl);
      let orderResult;
      if (action === "buy") {
        orderResult = await ibkr.buyStock(config.accountId, ticker, quantity);
      } else if (action === "sell") {
        orderResult = await ibkr.sellStock(config.accountId, ticker, quantity);
      } else {
        return res.status(400).json({ error: "Invalid action. Must be 'buy' or 'sell'" });
      }
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const stock = await storage.getStock(req.session.userId, ticker);
      const price = stock ? parseFloat(stock.currentPrice) : 0;
      await storage.createTrade({
        userId: req.session.userId,
        ticker,
        type: action,
        quantity,
        price: price.toFixed(2),
        total: (price * quantity).toFixed(2),
        status: "completed",
        broker: "ibkr",
        ibkrOrderId: orderResult.orderId
      });
      res.json({
        success: true,
        orderId: orderResult.orderId,
        status: orderResult.orderStatus,
        message: `${action.toUpperCase()} order for ${quantity} shares of ${ticker} placed successfully`
      });
    } catch (error) {
      console.error("IBKR trade execution error:", error);
      res.status(500).json({ error: error.message || "Failed to execute trade" });
    }
  });
  app2.get("/api/backtest/jobs", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const jobs = await storage.getBacktestJobs(req.session.userId);
      res.json(jobs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch backtest jobs" });
    }
  });
  app2.get("/api/backtest/jobs/:id", async (req, res) => {
    try {
      const job = await storage.getBacktestJob(req.params.id);
      if (!job) {
        return res.status(404).json({ error: "Backtest job not found" });
      }
      res.json(job);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch backtest job" });
    }
  });
  app2.get("/api/backtest/jobs/:id/scenarios", async (req, res) => {
    try {
      const scenarios = await storage.getBacktestScenarios(req.params.id);
      res.json(scenarios);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch scenarios" });
    }
  });
  app2.get("/api/backtest/jobs/:id/price-data", async (req, res) => {
    try {
      const priceData = await storage.getBacktestPriceData(req.params.id);
      res.json(priceData);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch price data" });
    }
  });
  app2.post("/api/backtest/scenarios/:scenarioId/import", async (req, res) => {
    try {
      const { scenarioId } = req.params;
      const { scope = "all_holdings", ticker } = req.body;
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const allJobs = await storage.getBacktestJobs(req.session.userId);
      let scenario = null;
      for (const job of allJobs) {
        const scenarios = await storage.getBacktestScenarios(job.id);
        scenario = scenarios.find((s) => s.id === scenarioId);
        if (scenario) break;
      }
      if (!scenario) {
        return res.status(404).json({ error: "Scenario not found" });
      }
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const tradingRule = await storage.createTradingRule({
        userId: req.session.userId,
        name: scenario.name || "Imported Scenario",
        enabled: false,
        // Start disabled for safety
        scope,
        ticker: scope === "specific_stock" ? ticker : null,
        conditions: scenario.sellConditions || [],
        action: scenario.sellAction?.type === "sell_percentage" ? "sell" : "sell_all",
        actionParams: scenario.sellAction?.percentage ? { percentage: scenario.sellAction.percentage } : void 0
      });
      res.json(tradingRule);
    } catch (error) {
      console.error("Failed to import scenario:", error);
      res.status(500).json({ error: "Failed to import scenario as trading rule" });
    }
  });
  app2.post("/api/backtest/jobs", async (req, res) => {
    try {
      const { messageCount, dataSource } = req.body;
      if (!messageCount || messageCount < 1 || messageCount > 2e3) {
        return res.status(400).json({ error: "Message count must be between 1 and 2000" });
      }
      const validDataSources = ["telegram", "openinsider"];
      const selectedDataSource = dataSource || "telegram";
      if (!validDataSources.includes(selectedDataSource)) {
        return res.status(400).json({ error: `Data source must be one of: ${validDataSources.join(", ")}` });
      }
      const sourceName = selectedDataSource === "telegram" ? "Telegram messages" : "OpenInsider trades";
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const job = await storage.createBacktestJob({
        userId: req.session.userId,
        name: `Backtest ${messageCount} ${sourceName}`,
        dataSource: selectedDataSource,
        messageCount
      });
      backtestService.processBacktestJob(job.id).catch((error) => {
        console.error(`[BacktestJob ${job.id}] Background processing failed:`, error);
      });
      res.json(job);
    } catch (error) {
      console.error("Failed to create backtest job:", error);
      res.status(500).json({ error: "Failed to create backtest job" });
    }
  });
  app2.patch("/api/backtest/jobs/:id/cancel", async (req, res) => {
    try {
      const job = await storage.getBacktestJob(req.params.id);
      if (!job) {
        return res.status(404).json({ error: "Backtest job not found" });
      }
      if (["completed", "failed", "cancelled"].includes(job.status)) {
        return res.status(400).json({ error: "Cannot cancel a job that is already finished" });
      }
      await storage.updateBacktestJob(req.params.id, {
        status: "cancelled",
        errorMessage: "Cancelled by user"
      });
      const updatedJob = await storage.getBacktestJob(req.params.id);
      res.json(updatedJob);
    } catch (error) {
      console.error("Failed to cancel backtest job:", error);
      res.status(500).json({ error: "Failed to cancel backtest job" });
    }
  });
  app2.delete("/api/backtest/jobs/:id", async (req, res) => {
    try {
      const job = await storage.getBacktestJob(req.params.id);
      if (!job) {
        return res.status(404).json({ error: "Backtest job not found" });
      }
      await storage.deleteBacktestJob(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete backtest job:", error);
      res.status(500).json({ error: "Failed to delete backtest job" });
    }
  });
  app2.post("/api/backtest/jobs/:id/trigger", async (req, res) => {
    try {
      const job = await storage.getBacktestJob(req.params.id);
      if (!job) {
        return res.status(404).json({ error: "Backtest job not found" });
      }
      backtestService.processBacktestJob(req.params.id).catch((error) => {
        console.error(`[BacktestJob ${req.params.id}] Background processing failed:`, error);
      });
      res.json({ success: true, message: "Job processing triggered" });
    } catch (error) {
      console.error("Failed to trigger backtest job:", error);
      res.status(500).json({ error: "Failed to trigger backtest job" });
    }
  });
  app2.get("/api/feature-suggestions", async (req, res) => {
    try {
      const userId = req.query.userId;
      const status = req.query.status;
      const suggestions = await storage.getFeatureSuggestions(userId, status);
      res.json(suggestions);
    } catch (error) {
      console.error("Failed to get feature suggestions:", error);
      res.status(500).json({ error: "Failed to get feature suggestions" });
    }
  });
  app2.post("/api/feature-suggestions", async (req, res) => {
    try {
      const data = insertFeatureSuggestionSchema.parse(req.body);
      const suggestion = await storage.createFeatureSuggestion(data);
      res.status(201).json(suggestion);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Failed to create feature suggestion:", error);
      res.status(500).json({ error: "Failed to create feature suggestion" });
    }
  });
  app2.post("/api/feature-suggestions/:id/vote", async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }
      const success = await storage.voteForSuggestion(req.params.id, userId);
      if (!success) {
        return res.status(409).json({ error: "Already voted" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to vote for suggestion:", error);
      res.status(500).json({ error: "Failed to vote for suggestion" });
    }
  });
  app2.delete("/api/feature-suggestions/:id/vote", async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }
      const success = await storage.unvoteForSuggestion(req.params.id, userId);
      if (!success) {
        return res.status(404).json({ error: "Vote not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to unvote for suggestion:", error);
      res.status(500).json({ error: "Failed to unvote for suggestion" });
    }
  });
  app2.patch("/api/feature-suggestions/:id/status", requireAdmin, async (req, res) => {
    try {
      const { status } = req.body;
      if (!status) {
        return res.status(400).json({ error: "status is required" });
      }
      const updated = await storage.updateFeatureSuggestionStatus(req.params.id, status);
      if (!updated) {
        return res.status(404).json({ error: "Suggestion not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Failed to update suggestion status:", error);
      res.status(500).json({ error: "Failed to update suggestion status" });
    }
  });
  app2.delete("/api/feature-suggestions/:id", requireAdmin, async (req, res) => {
    try {
      const success = await storage.deleteFeatureSuggestion(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Suggestion not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete suggestion:", error);
      res.status(500).json({ error: "Failed to delete suggestion" });
    }
  });
  app2.get("/api/notifications", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const notifications2 = await storage.getNotifications(req.session.userId);
      res.json(notifications2);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });
  app2.get("/api/notifications/unread-count", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const count = await storage.getUnreadNotificationCount(req.session.userId);
      res.json({ count });
    } catch (error) {
      console.error("Failed to fetch unread count:", error);
      res.status(500).json({ error: "Failed to fetch unread count" });
    }
  });
  app2.patch("/api/notifications/:id/read", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const updated = await storage.markNotificationAsRead(req.params.id, req.session.userId);
      if (!updated) {
        return res.status(404).json({ error: "Notification not found or access denied" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  });
  app2.patch("/api/notifications/read-all", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const count = await storage.markAllNotificationsAsRead(req.session.userId);
      res.json({ count });
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
      res.status(500).json({ error: "Failed to mark all notifications as read" });
    }
  });
  app2.delete("/api/notifications/clear-all", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const count = await storage.clearAllNotifications(req.session.userId);
      res.json({ success: true, count });
    } catch (error) {
      console.error("Failed to clear all notifications:", error);
      res.status(500).json({ error: "Failed to clear all notifications" });
    }
  });
  app2.get("/api/announcements/all", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUser(req.session.userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }
      const announcements2 = await storage.getAllAnnouncements();
      res.json(announcements2);
    } catch (error) {
      console.error("Failed to fetch all announcements:", error);
      res.status(500).json({ error: "Failed to fetch all announcements" });
    }
  });
  app2.get("/api/announcements", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const announcements2 = await storage.getAnnouncements(req.session.userId);
      res.json(announcements2);
    } catch (error) {
      console.error("Failed to fetch announcements:", error);
      res.status(500).json({ error: "Failed to fetch announcements" });
    }
  });
  app2.get("/api/announcements/unread-count", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const count = await storage.getUnreadAnnouncementCount(req.session.userId);
      res.json({ count });
    } catch (error) {
      console.error("Failed to fetch unread announcement count:", error);
      res.status(500).json({ error: "Failed to fetch unread announcement count" });
    }
  });
  app2.post("/api/announcements/mark-read", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const { announcementId } = req.body;
      if (!announcementId) {
        return res.status(400).json({ error: "announcementId is required" });
      }
      await storage.markAnnouncementAsRead(req.session.userId, announcementId);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to mark announcement as read:", error);
      res.status(500).json({ error: "Failed to mark announcement as read" });
    }
  });
  app2.post("/api/announcements/mark-all-read", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      await storage.markAllAnnouncementsAsRead(req.session.userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to mark all announcements as read:", error);
      res.status(500).json({ error: "Failed to mark all announcements as read" });
    }
  });
  app2.post("/api/announcements", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUser(req.session.userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }
      const validatedData = insertAnnouncementSchema.parse({
        ...req.body,
        createdBy: req.session.userId
      });
      const announcement = await storage.createAnnouncement(validatedData);
      res.json(announcement);
    } catch (error) {
      console.error("Failed to create announcement:", error);
      res.status(500).json({ error: "Failed to create announcement" });
    }
  });
  app2.patch("/api/announcements/:id", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUser(req.session.userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }
      const updated = await storage.updateAnnouncement(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ error: "Announcement not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Failed to update announcement:", error);
      res.status(500).json({ error: "Failed to update announcement" });
    }
  });
  app2.patch("/api/announcements/:id/deactivate", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUser(req.session.userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }
      const updated = await storage.deactivateAnnouncement(req.params.id);
      if (!updated) {
        return res.status(404).json({ error: "Announcement not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Failed to deactivate announcement:", error);
      res.status(500).json({ error: "Failed to deactivate announcement" });
    }
  });
  app2.delete("/api/announcements/:id", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUser(req.session.userId);
      if (!user?.isSuperAdmin) {
        return res.status(403).json({ error: "Super admin access required" });
      }
      await storage.deleteAnnouncement(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete announcement:", error);
      res.status(500).json({ error: "Failed to delete announcement" });
    }
  });
  app2.get("/api/admin/notifications", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUser(req.session.userId);
      if (!user?.isSuperAdmin) {
        return res.status(403).json({ error: "Super admin access required" });
      }
      const notifications2 = await storage.getAdminNotifications();
      res.json(notifications2);
    } catch (error) {
      console.error("Failed to fetch admin notifications:", error);
      res.status(500).json({ error: "Failed to fetch admin notifications" });
    }
  });
  app2.get("/api/admin/notifications/unread-count", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUser(req.session.userId);
      if (!user?.isSuperAdmin) {
        return res.status(403).json({ error: "Super admin access required" });
      }
      const count = await storage.getUnreadAdminNotificationCount();
      res.json({ count });
    } catch (error) {
      console.error("Failed to fetch unread admin notification count:", error);
      res.status(500).json({ error: "Failed to fetch unread count" });
    }
  });
  app2.post("/api/admin/notifications/:id/read", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUser(req.session.userId);
      if (!user?.isSuperAdmin) {
        return res.status(403).json({ error: "Super admin access required" });
      }
      const notification = await storage.markAdminNotificationAsRead(req.params.id);
      if (!notification) {
        return res.status(404).json({ error: "Notification not found" });
      }
      res.json(notification);
    } catch (error) {
      console.error("Failed to mark admin notification as read:", error);
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  });
  app2.post("/api/admin/notifications/mark-all-read", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUser(req.session.userId);
      if (!user?.isSuperAdmin) {
        return res.status(403).json({ error: "Super admin access required" });
      }
      await storage.markAllAdminNotificationsAsRead();
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to mark all admin notifications as read:", error);
      res.status(500).json({ error: "Failed to mark all notifications as read" });
    }
  });
  app2.post("/api/admin/regenerate-briefs", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUser(req.session.userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }
      const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const followedStocks2 = await storage.getUserFollowedStocks(req.session.userId);
      const followedTickers = followedStocks2.map((f) => f.ticker);
      let generatedCount = 0;
      let skippedCount = 0;
      let errorCount = 0;
      for (const ticker of followedTickers) {
        try {
          const quote = await stockService.getQuote(ticker);
          if (!quote || quote.price === 0 || quote.previousClose === 0) {
            console.log(`[AdminRegenerate] Skipping ${ticker} - invalid price data`);
            skippedCount++;
            continue;
          }
          const stock = await storage.getStock(req.session.userId, ticker);
          const stockData = stock;
          const opportunityType = stockData?.recommendation?.toLowerCase().includes("sell") ? "sell" : "buy";
          const previousAnalysis = stockData?.overallRating ? {
            overallRating: stockData.overallRating,
            summary: stockData.summary || "No previous analysis available",
            technicalAnalysis: stockData.technicalAnalysis ? {
              trend: stockData.technicalAnalysis.trend,
              momentum: stockData.technicalAnalysis.momentum,
              score: stockData.technicalAnalysis.score,
              signals: stockData.technicalAnalysis.signals
            } : void 0
          } : void 0;
          const holding = await storage.getPortfolioHoldingByTicker(req.session.userId, ticker, false);
          const userOwnsPosition = holding !== void 0 && holding.quantity > 0;
          const now = Date.now() / 1e3;
          const oneDayAgo = now - 24 * 60 * 60;
          const recentNews = stockData?.news?.filter((article) => article.datetime && article.datetime >= oneDayAgo)?.slice(0, 3)?.map((article) => ({
            title: article.headline || "Untitled",
            sentiment: 0,
            source: article.source || "Unknown"
          }));
          const brief = await aiAnalysisService.generateDailyBrief({
            ticker,
            currentPrice: quote.price,
            previousPrice: quote.previousClose,
            opportunityType,
            recentNews: recentNews && recentNews.length > 0 ? recentNews : void 0,
            previousAnalysis
          });
          await storage.createDailyBrief({
            userId: req.session.userId,
            ticker,
            briefDate: today,
            priceSnapshot: quote.price.toString(),
            priceChange: quote.change.toString(),
            priceChangePercent: quote.changePercent.toString(),
            // Watching scenario
            watchingStance: brief.watching.recommendedStance,
            watchingConfidence: brief.watching.confidence,
            watchingText: brief.watching.briefText,
            watchingHighlights: brief.watching.keyHighlights,
            // Owning scenario
            owningStance: brief.owning.recommendedStance,
            owningConfidence: brief.owning.confidence,
            owningText: brief.owning.briefText,
            owningHighlights: brief.owning.keyHighlights,
            // Legacy fields for backwards compat (use user's actual position)
            recommendedStance: userOwnsPosition ? brief.owning.recommendedStance : brief.watching.recommendedStance,
            confidence: userOwnsPosition ? brief.owning.confidence : brief.watching.confidence,
            briefText: userOwnsPosition ? brief.owning.briefText : brief.watching.briefText,
            keyHighlights: userOwnsPosition ? brief.owning.keyHighlights : brief.watching.keyHighlights,
            userOwnsPosition
          });
          generatedCount++;
          console.log(`[AdminRegenerate] Generated dual-scenario brief for ${ticker}: Watching=${brief.watching.recommendedStance}(${brief.watching.confidence}), Owning=${brief.owning.recommendedStance}(${brief.owning.confidence})`);
        } catch (error) {
          errorCount++;
          console.error(`[AdminRegenerate] Error generating brief for ${ticker}:`, error);
        }
      }
      res.json({
        success: true,
        generated: generatedCount,
        skipped: skippedCount,
        errors: errorCount
      });
    } catch (error) {
      console.error("Failed to regenerate briefs:", error);
      res.status(500).json({ error: "Failed to regenerate briefs" });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path3 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path2 from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      ),
      await import("@replit/vite-plugin-dev-banner").then(
        (m) => m.devBanner()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path2.resolve(import.meta.dirname, "client", "src"),
      "@shared": path2.resolve(import.meta.dirname, "shared"),
      "@assets": path2.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path2.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path2.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path3.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path3.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path3.resolve(distPath, "index.html"));
  });
}

// server/jobs/cleanupStaleStocks.ts
async function runStaleStockCleanup(storage2) {
  try {
    console.log("[CLEANUP JOB] Starting daily stale stock cleanup...");
    const twoWeekResult = await storage2.deleteStocksOlderThan(14);
    if (twoWeekResult.count > 0) {
      console.log(`[CLEANUP JOB] \u2705 Successfully deleted ${twoWeekResult.count} stocks older than 2 weeks (non-followed)`);
      console.log(`[CLEANUP JOB] Deleted tickers: ${twoWeekResult.tickers.join(", ")}`);
    } else {
      console.log("[CLEANUP JOB] \u2705 No old non-followed stocks to delete (2-week horizon)");
    }
    const pendingResult = await storage2.deleteExpiredPendingStocks(10);
    if (pendingResult.count > 0) {
      console.log(`[CLEANUP JOB] \u2705 Successfully deleted ${pendingResult.count} expired pending stocks`);
      console.log(`[CLEANUP JOB] Deleted pending tickers: ${pendingResult.tickers.join(", ")}`);
    } else {
      console.log("[CLEANUP JOB] \u2705 No expired pending stocks to delete");
    }
    const rejectedResult = await storage2.deleteExpiredRejectedStocks(10);
    if (rejectedResult.count > 0) {
      console.log(`[CLEANUP JOB] \u2705 Successfully deleted ${rejectedResult.count} expired rejected stocks`);
      console.log(`[CLEANUP JOB] Deleted rejected tickers: ${rejectedResult.tickers.join(", ")}`);
    } else {
      console.log("[CLEANUP JOB] \u2705 No expired rejected stocks to delete");
    }
  } catch (error) {
    console.error("[CLEANUP JOB] \u274C Cleanup failed:", error);
  }
}
function startCleanupScheduler(storage2) {
  runStaleStockCleanup(storage2);
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1e3;
  setInterval(() => {
    runStaleStockCleanup(storage2);
  }, TWENTY_FOUR_HOURS);
  console.log("[CLEANUP SCHEDULER] \u2705 Started daily cleanup scheduler (runs every 24 hours)");
}

// server/index.ts
init_stockService();

// server/secEdgarService.ts
import axios2 from "axios";
var SECEdgarService = class {
  baseUrl = "https://data.sec.gov";
  userAgent;
  lastRequestTime = 0;
  minRequestInterval = 100;
  // Minimum 100ms between requests (max 10 requests/second)
  constructor() {
    this.userAgent = "TradePro Dashboard contact@tradepro.app";
  }
  /**
   * Rate limiting to comply with SEC API usage policies
   * Ensures we don't overwhelm the SEC servers with requests
   */
  async rateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.minRequestInterval) {
      const delay = this.minRequestInterval - timeSinceLastRequest;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    this.lastRequestTime = Date.now();
  }
  /**
   * Get company CIK number from ticker symbol
   * Uses SEC's company tickers JSON to lookup CIK
   */
  async getCIKFromTicker(ticker) {
    try {
      await this.rateLimit();
      const response = await axios2.get("https://www.sec.gov/files/company_tickers.json", {
        headers: { "User-Agent": this.userAgent }
      });
      const companies = response.data;
      for (const key in companies) {
        const company = companies[key];
        if (company.ticker === ticker.toUpperCase()) {
          return String(company.cik_str).padStart(10, "0");
        }
      }
      return null;
    } catch (error) {
      console.error(`Error fetching CIK for ticker ${ticker}:`, error);
      return null;
    }
  }
  /**
   * Get company submissions (all filings) by CIK
   */
  async getCompanySubmissions(cik) {
    try {
      await this.rateLimit();
      const paddedCik = cik.padStart(10, "0");
      const response = await axios2.get(`${this.baseUrl}/submissions/CIK${paddedCik}.json`, {
        headers: { "User-Agent": this.userAgent }
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching submissions for CIK ${cik}:`, error);
      return null;
    }
  }
  /**
   * Get latest 10-K or 10-Q filing for a company
   */
  async getLatestFiling(ticker, formTypes = ["10-K", "10-Q"]) {
    try {
      const cik = await this.getCIKFromTicker(ticker);
      if (!cik) {
        console.log(`CIK not found for ticker: ${ticker}`);
        return null;
      }
      const submissions = await this.getCompanySubmissions(cik);
      if (!submissions) {
        return null;
      }
      const recent = submissions.filings.recent;
      for (let i = 0; i < recent.form.length; i++) {
        const formType = recent.form[i];
        if (formTypes.includes(formType)) {
          const accessionNumber = recent.accessionNumber[i].replace(/-/g, "");
          const primaryDocument = recent.primaryDocument[i];
          const filingUrl = `https://www.sec.gov/Archives/edgar/data/${cik}/${accessionNumber}/${primaryDocument}`;
          return {
            formType,
            filingDate: recent.filingDate[i],
            filingUrl,
            cik
          };
        }
      }
      console.log(`No ${formTypes.join(" or ")} filing found for ticker: ${ticker}`);
      return null;
    } catch (error) {
      console.error(`Error fetching latest filing for ticker ${ticker}:`, error);
      return null;
    }
  }
  /**
   * Fetch the full text content of a filing
   */
  async getFilingContent(filingUrl) {
    try {
      await this.rateLimit();
      const response = await axios2.get(filingUrl, {
        headers: { "User-Agent": this.userAgent },
        responseType: "text"
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching filing content from ${filingUrl}:`, error);
      return null;
    }
  }
  /**
   * Extract specific sections from filing HTML
   * This is a basic extraction - could be enhanced with sec-api.io for better parsing
   */
  extractSections(htmlContent) {
    const cleanText = (html) => {
      return html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
    };
    const mdaMatch = htmlContent.match(/(?:item\s*7|management'?s?\s+discussion)/i);
    const riskMatch = htmlContent.match(/(?:item\s*1a|risk\s+factors)/i);
    const businessMatch = htmlContent.match(/(?:item\s*1[^a]|business\s+overview|description\s+of\s+business)/i);
    const extractChunk = (startPos, maxLength = 15e3) => {
      if (startPos === -1) return "";
      const chunk = htmlContent.substring(startPos, startPos + maxLength);
      return cleanText(chunk).substring(0, 1e4);
    };
    return {
      managementDiscussion: mdaMatch ? extractChunk(mdaMatch.index || 0) : null,
      riskFactors: riskMatch ? extractChunk(riskMatch.index || 0) : null,
      businessOverview: businessMatch ? extractChunk(businessMatch.index || 0) : null
    };
  }
  /**
   * Get comprehensive filing data for a ticker
   */
  async getCompanyFilingData(ticker) {
    try {
      const filing = await this.getLatestFiling(ticker);
      if (!filing) {
        return null;
      }
      const content = await this.getFilingContent(filing.filingUrl);
      if (!content) {
        return {
          ...filing,
          managementDiscussion: null,
          riskFactors: null,
          businessOverview: null
        };
      }
      const sections = this.extractSections(content);
      return {
        ...filing,
        ...sections
      };
    } catch (error) {
      console.error(`Error getting filing data for ticker ${ticker}:`, error);
      return null;
    }
  }
};
var secEdgarService = new SECEdgarService();

// server/queueWorker.ts
init_stockService();
var QueueWorker = class {
  running = false;
  pollInterval = 2e3;
  // Poll every 2 seconds when queue is active
  idleInterval = 1e4;
  // Poll every 10 seconds when queue is empty
  processingCount = 0;
  maxConcurrent = 1;
  // Process one job at a time for now
  /**
   * Update job progress with current step and details
   */
  async updateProgress(jobId, ticker, currentStep, stepDetails) {
    try {
      await storage.updateJobProgress(jobId, currentStep, {
        ...stepDetails,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
      console.log(`[QueueWorker] \u{1F4CD} ${ticker} - ${currentStep}: ${stepDetails.substep || stepDetails.phase}`);
    } catch (error) {
      console.warn(`[QueueWorker] Failed to update progress for job ${jobId}:`, error);
    }
  }
  async start() {
    if (this.running) {
      console.log("[QueueWorker] Already running");
      return;
    }
    this.running = true;
    console.log("[QueueWorker] Starting AI analysis queue worker...");
    console.log("[QueueWorker] Initializing process loop...");
    this.processLoop().catch((error) => {
      console.error("[QueueWorker] FATAL: Process loop crashed:", error);
      console.error("[QueueWorker] Stack trace:", error instanceof Error ? error.stack : "N/A");
      this.running = false;
    });
    console.log("[QueueWorker] Background process loop initiated");
  }
  async stop() {
    console.log("[QueueWorker] Stopping queue worker...");
    this.running = false;
  }
  async processLoop() {
    console.log("[QueueWorker] \u2705 Process loop started, running =", this.running);
    let iterationCount = 0;
    while (this.running) {
      iterationCount++;
      console.log(`[QueueWorker] \u{1F504} Loop iteration ${iterationCount}, processingCount = ${this.processingCount}`);
      try {
        if (this.processingCount < this.maxConcurrent) {
          console.log("[QueueWorker] \u{1F4E5} Polling for jobs...");
          const job = await storage.dequeueNextJob();
          if (job) {
            console.log(`[QueueWorker] \u2705 Dequeued job ${job.id} for ${job.ticker}`);
            this.processJob(job).catch((error) => {
              console.error(`[QueueWorker] \u274C Unhandled error processing job ${job.id}:`, error);
            });
            await this.sleep(100);
          } else {
            console.log(`[QueueWorker] \u{1F4A4} No pending jobs, sleeping for ${this.idleInterval}ms`);
            await this.sleep(this.idleInterval);
          }
        } else {
          console.log(`[QueueWorker] \u23F8\uFE0F  Max concurrent jobs (${this.maxConcurrent}) reached, waiting...`);
          await this.sleep(this.pollInterval);
        }
      } catch (error) {
        console.error("[QueueWorker] \u274C Error in process loop:", error);
        console.error("[QueueWorker] Stack trace:", error instanceof Error ? error.stack : "N/A");
        await this.sleep(this.pollInterval);
      }
    }
    console.log("[QueueWorker] \u{1F6D1} Process loop ended");
  }
  async processJob(job) {
    this.processingCount++;
    const startTime = Date.now();
    console.log(`[QueueWorker] Processing job ${job.id} for ${job.ticker} (priority: ${job.priority}, attempt: ${job.retryCount + 1}/${job.maxRetries + 1})`);
    try {
      console.log(`[QueueWorker] Resetting phase completion flags for ${job.ticker}...`);
      await storage.resetStockAnalysisPhaseFlags(job.ticker);
      await this.updateProgress(job.id, job.ticker, "fetching_data", {
        phase: "data_fetch",
        substep: "Fetching fundamentals and price data",
        progress: "0/3"
      });
      console.log(`[QueueWorker] Fetching data for ${job.ticker}...`);
      const [companyOverview, balanceSheet, incomeStatement, cashFlow, dailyPrices] = await Promise.all([
        stockService.getCompanyOverview(job.ticker),
        stockService.getBalanceSheet(job.ticker),
        stockService.getIncomeStatement(job.ticker),
        stockService.getCashFlow(job.ticker),
        stockService.getDailyPrices(job.ticker, 60)
      ]);
      await this.updateProgress(job.id, job.ticker, "fetching_data", {
        phase: "data_fetch",
        substep: "Fetching technical indicators and news",
        progress: "1/3"
      });
      const [technicalIndicators, newsSentiment] = await Promise.all([
        stockService.getTechnicalIndicators(job.ticker, dailyPrices),
        stockService.getNewsSentiment(job.ticker)
      ]);
      console.log(`[QueueWorker] \u{1F4CA} Analyzing price-news correlation for ${job.ticker}...`);
      const priceNewsCorrelation = stockService.analyzePriceNewsCorrelation(dailyPrices, newsSentiment);
      console.log(`[QueueWorker] \u2705 Price-news correlation complete`);
      await this.updateProgress(job.id, job.ticker, "fetching_data", {
        phase: "data_fetch",
        substep: "Fetching SEC filings and fundamentals",
        progress: "2/3"
      });
      let secFilingData = null;
      let comprehensiveFundamentals = null;
      console.log(`[QueueWorker] \u{1F4C1} Fetching SEC filings for ${job.ticker}...`);
      try {
        secFilingData = await secEdgarService.getCompanyFilingData(job.ticker);
        console.log(`[QueueWorker] \u2705 SEC filings fetched successfully`);
      } catch (error) {
        console.warn(`[QueueWorker] \u26A0\uFE0F  Could not fetch SEC filings for ${job.ticker}:`, error instanceof Error ? error.message : error);
      }
      console.log(`[QueueWorker] \u{1F4CA} Fetching comprehensive fundamentals for ${job.ticker}...`);
      try {
        comprehensiveFundamentals = await stockService.getComprehensiveFundamentals(job.ticker);
        console.log(`[QueueWorker] \u2705 Fundamentals fetched successfully`);
      } catch (error) {
        console.warn(`[QueueWorker] \u26A0\uFE0F  Could not fetch fundamentals for ${job.ticker}:`, error instanceof Error ? error.message : error);
      }
      console.log(`[QueueWorker] \u{1F527} Preparing SEC filings data...`);
      const secFilings = secFilingData ? {
        formType: secFilingData.formType,
        filingDate: secFilingData.filingDate,
        managementDiscussion: secFilingData.managementDiscussion,
        riskFactors: secFilingData.riskFactors,
        businessOverview: secFilingData.businessOverview
      } : void 0;
      console.log(`[QueueWorker] \u2705 SEC data prepared`);
      console.log(`[QueueWorker] \u{1F50D} Checking for insider trading data for ${job.ticker}...`);
      const insiderTradingStrength = await (async () => {
        try {
          const allStocks = await storage.getAllStocksForTickerGlobal(job.ticker);
          console.log(`[QueueWorker] Found ${allStocks.length} transaction(s) across all users for ${job.ticker}`);
          if (allStocks.length === 0) {
            return void 0;
          }
          const buyTransactions = allStocks.filter((s) => s.recommendation?.toLowerCase() === "buy");
          const sellTransactions = allStocks.filter((s) => s.recommendation?.toLowerCase() === "sell");
          console.log(`[QueueWorker] Transaction breakdown: ${buyTransactions.length} BUY, ${sellTransactions.length} SELL`);
          let direction;
          let transactionType;
          let dominantSignal;
          if (buyTransactions.length > 0 && sellTransactions.length === 0) {
            direction = "buy";
            transactionType = "purchase";
            dominantSignal = "BULLISH - Only insider BUYING detected";
          } else if (sellTransactions.length > 0 && buyTransactions.length === 0) {
            direction = "sell";
            transactionType = "sale";
            dominantSignal = "BEARISH - Only insider SELLING detected";
          } else if (buyTransactions.length > 0 && sellTransactions.length > 0) {
            const sortedByDate = allStocks.sort(
              (a, b) => new Date(b.lastUpdated || 0).getTime() - new Date(a.lastUpdated || 0).getTime()
            );
            const mostRecentSignal = sortedByDate.find(
              (s) => s.recommendation?.toLowerCase() === "buy" || s.recommendation?.toLowerCase() === "sell"
            );
            if (mostRecentSignal) {
              direction = mostRecentSignal.recommendation?.toLowerCase() || "mixed";
              transactionType = direction === "buy" ? "purchase" : direction === "sell" ? "sale" : "mixed";
              dominantSignal = `MIXED SIGNALS - ${buyTransactions.length} BUY, ${sellTransactions.length} SELL (most recent: ${direction.toUpperCase()})`;
            } else {
              direction = buyTransactions.length >= sellTransactions.length ? "buy" : "sell";
              transactionType = direction === "buy" ? "purchase" : "sale";
              dominantSignal = `MIXED SIGNALS - ${buyTransactions.length} BUY, ${sellTransactions.length} SELL (using ${direction.toUpperCase()} as dominant)`;
            }
          } else {
            direction = "unknown";
            transactionType = "transaction";
            dominantSignal = "Unknown signal - no clear insider transactions";
          }
          const primaryStock = allStocks.sort(
            (a, b) => new Date(b.lastUpdated || 0).getTime() - new Date(a.lastUpdated || 0).getTime()
          )[0];
          return {
            direction,
            transactionType,
            dominantSignal,
            buyCount: buyTransactions.length,
            sellCount: sellTransactions.length,
            totalTransactions: allStocks.length,
            quantityStr: primaryStock.insiderQuantity ? `${primaryStock.insiderQuantity.toLocaleString()} shares` : "Unknown",
            insiderPrice: primaryStock.insiderPrice ? `$${parseFloat(primaryStock.insiderPrice).toFixed(2)}` : "Unknown",
            currentPrice: primaryStock.currentPrice ? `$${parseFloat(primaryStock.currentPrice).toFixed(2)}` : "Unknown",
            insiderName: primaryStock.insiderName || "Unknown",
            insiderTitle: primaryStock.insiderTitle || "Unknown",
            tradeDate: primaryStock.insiderTradeDate || "Unknown",
            totalValue: primaryStock.insiderPrice && primaryStock.insiderQuantity ? `$${(parseFloat(primaryStock.insiderPrice) * primaryStock.insiderQuantity).toFixed(2)}` : "Unknown",
            confidence: primaryStock.confidenceScore?.toString() || "Medium",
            // Include all transactions for full context
            allTransactions: allStocks.map((s) => ({
              direction: s.recommendation?.toLowerCase() || "unknown",
              insiderName: s.insiderName || "Unknown",
              insiderTitle: s.insiderTitle || "Unknown",
              quantityStr: s.insiderQuantity ? `${s.insiderQuantity.toLocaleString()} shares` : "Unknown",
              price: s.insiderPrice ? `$${parseFloat(s.insiderPrice).toFixed(2)}` : "Unknown",
              date: s.insiderTradeDate || "Unknown",
              value: s.insiderPrice && s.insiderQuantity ? `$${(parseFloat(s.insiderPrice) * s.insiderQuantity).toFixed(2)}` : "Unknown"
            }))
          };
        } catch (error) {
          console.error(`[QueueWorker] Error getting insider trading data:`, error);
          return void 0;
        }
      })();
      console.log(`[QueueWorker] \u2705 Insider trading check complete:`, insiderTradingStrength ? `${insiderTradingStrength.dominantSignal}` : "No insider data");
      await this.updateProgress(job.id, job.ticker, "fetching_data", {
        phase: "data_fetch",
        substep: "Data fetch complete",
        progress: "3/3"
      });
      await this.updateProgress(job.id, job.ticker, "macro_analysis", {
        phase: "macro",
        substep: "Analyzing industry/sector conditions"
      });
      const stock = await storage.getAnyStockForTicker(job.ticker);
      const rawIndustry = stock?.industry || companyOverview?.industry || companyOverview?.sector || void 0;
      const stockIndustry = rawIndustry && rawIndustry !== "N/A" ? rawIndustry : void 0;
      console.log(`[QueueWorker] Getting macro economic analysis for industry: ${stockIndustry || "General Market"}...`);
      let macroAnalysis = await storage.getLatestMacroAnalysis(stockIndustry);
      if (!macroAnalysis) {
        console.log(`[QueueWorker] No macro analysis found for ${stockIndustry || "General Market"}, creating new one...`);
        const { runMacroAnalysis: runMacroAnalysis2 } = await Promise.resolve().then(() => (init_macroAgentService(), macroAgentService_exports));
        const macroData = await runMacroAnalysis2(stockIndustry);
        macroAnalysis = await storage.createMacroAnalysis(macroData);
        console.log(`[QueueWorker] Created macro analysis for ${stockIndustry || "General Market"} with factor ${macroAnalysis.macroFactor}`);
      } else {
        const createdDate = macroAnalysis.createdAt ? macroAnalysis.createdAt.toISOString() : "unknown";
        console.log(`[QueueWorker] Using existing macro analysis for ${stockIndustry || "General Market"} from ${createdDate}`);
        console.log(`[QueueWorker] Macro factor: ${macroAnalysis.macroFactor}, Macro score: ${macroAnalysis.macroScore}/100`);
      }
      await storage.markStockAnalysisPhaseComplete(job.ticker, "macro");
      console.log(`[QueueWorker] \u2705 Macro analysis phase complete for ${job.ticker}`);
      await this.updateProgress(job.id, job.ticker, "micro_analysis", {
        phase: "micro",
        substep: "Running fundamental analysis with AI"
      });
      console.log(`[QueueWorker] Running micro AI analysis for ${job.ticker}...`);
      const analysis = await aiAnalysisService.analyzeStock({
        ticker: job.ticker,
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
      });
      console.log(`[QueueWorker] \u2705 Micro analysis complete (score: ${analysis.confidenceScore}/100)`);
      await storage.markStockAnalysisPhaseComplete(job.ticker, "micro");
      console.log(`[QueueWorker] \u2705 Micro analysis phase complete for ${job.ticker}`);
      await this.updateProgress(job.id, job.ticker, "calculating_score", {
        phase: "integration",
        substep: "Calculating integrated score (micro \xD7 macro)"
      });
      const macroFactor = macroAnalysis.macroFactor ? parseFloat(macroAnalysis.macroFactor) : 1;
      const rawIntegratedScore = analysis.confidenceScore * macroFactor;
      const integratedScore = Math.max(0, Math.min(100, Math.round(rawIntegratedScore)));
      console.log(`[QueueWorker] Score integration: Micro ${analysis.confidenceScore} \xD7 Macro ${macroFactor} = ${rawIntegratedScore.toFixed(1)} \u2192 Clamped to ${integratedScore}/100`);
      console.log(`[QueueWorker] \u{1F4BE} Saving integrated analysis to database...`);
      await storage.saveStockAnalysis({
        ticker: analysis.ticker,
        status: "completed",
        overallRating: analysis.overallRating,
        confidenceScore: analysis.confidenceScore,
        summary: analysis.summary,
        financialHealthScore: analysis.financialHealth.score,
        strengths: analysis.financialHealth.strengths,
        weaknesses: analysis.financialHealth.weaknesses,
        redFlags: analysis.financialHealth.redFlags,
        technicalAnalysisScore: analysis.technicalAnalysis?.score,
        technicalAnalysisTrend: analysis.technicalAnalysis?.trend,
        technicalAnalysisMomentum: analysis.technicalAnalysis?.momentum,
        technicalAnalysisSignals: analysis.technicalAnalysis?.signals,
        sentimentAnalysisScore: analysis.sentimentAnalysis?.score,
        sentimentAnalysisTrend: analysis.sentimentAnalysis?.trend,
        sentimentAnalysisNewsVolume: analysis.sentimentAnalysis?.newsVolume,
        sentimentAnalysisKeyThemes: analysis.sentimentAnalysis?.key_themes,
        keyMetrics: analysis.keyMetrics,
        risks: analysis.risks,
        opportunities: analysis.opportunities,
        recommendation: analysis.recommendation,
        analyzedAt: new Date(analysis.analyzedAt),
        secFilingUrl: secFilingData?.filingUrl,
        secFilingType: secFilingData?.formType,
        secFilingDate: secFilingData?.filingDate,
        secCik: secFilingData?.cik,
        managementDiscussion: secFilingData?.managementDiscussion,
        riskFactors: secFilingData?.riskFactors,
        businessOverview: secFilingData?.businessOverview,
        fundamentalData: comprehensiveFundamentals,
        macroAnalysisId: macroAnalysis.id,
        integratedScore
      });
      await storage.markStockAnalysisPhaseComplete(job.ticker, "combined");
      console.log(`[QueueWorker] \u2705 All analysis phases complete for ${job.ticker}`);
      const isBuyOpportunity = analysis.recommendation === "buy" && integratedScore > 70;
      const isSellOpportunity = analysis.recommendation === "sell" && integratedScore > 70;
      if (isBuyOpportunity || isSellOpportunity) {
        const notificationType = isBuyOpportunity ? "high_score_buy" : "high_score_sell";
        let currentPrice;
        let insiderPrice;
        let previousClose;
        let priceChange;
        let priceChangePercent;
        if (stock) {
          currentPrice = parseFloat(stock.currentPrice);
          insiderPrice = stock.insiderPrice ? parseFloat(stock.insiderPrice) : void 0;
          previousClose = stock.previousClose ? parseFloat(stock.previousClose) : void 0;
          const comparisonPrice = insiderPrice || previousClose;
          if (comparisonPrice && isFinite(comparisonPrice) && comparisonPrice > 0 && isFinite(currentPrice)) {
            priceChange = currentPrice - comparisonPrice;
            priceChangePercent = priceChange / comparisonPrice * 100;
          }
        }
        let opportunityText = "";
        if (isBuyOpportunity) {
          if (priceChangePercent !== void 0 && priceChangePercent > 5) {
            opportunityText = `STRONG BUY - Price up ${priceChangePercent.toFixed(1)}% since insider bought. Consider entry.`;
          } else if (priceChangePercent !== void 0 && priceChangePercent < -3) {
            opportunityText = `BUY OPPORTUNITY - Price down ${Math.abs(priceChangePercent).toFixed(1)}% since insider bought. Better entry point!`;
          } else {
            opportunityText = `Strong BUY signal (${integratedScore}/100). Insider confidence confirmed.`;
          }
        } else {
          if (priceChangePercent !== void 0 && priceChangePercent < -5) {
            opportunityText = `SELL NOW - Price dropped ${Math.abs(priceChangePercent).toFixed(1)}% since insider sold. Exit position!`;
          } else if (priceChangePercent !== void 0 && priceChangePercent > 3) {
            opportunityText = `SELL SIGNAL - Price up ${priceChangePercent.toFixed(1)}% despite insider selling. Take profits!`;
          } else {
            opportunityText = `Strong SELL signal (${integratedScore}/100). Insider caution confirmed.`;
          }
        }
        console.log(`[QueueWorker] \u{1F514} ${notificationType} detected for ${job.ticker} (${integratedScore}/100), creating notifications...`);
        const allUsers = await storage.getUsers();
        const activeUsers = allUsers.filter((u) => u.subscriptionStatus === "active" && !u.archived);
        for (const user of activeUsers) {
          try {
            await storage.createNotification({
              userId: user.id,
              ticker: job.ticker,
              type: notificationType,
              score: integratedScore,
              message: `${job.ticker}: ${opportunityText}`,
              metadata: {
                currentPrice,
                priceChange,
                priceChangePercent,
                insiderPrice
              },
              isRead: false
            });
          } catch (error) {
            if (error instanceof Error && !error.message.includes("unique constraint")) {
              console.error(`[QueueWorker] Failed to create notification for user ${user.id}:`, error);
            }
          }
        }
        console.log(`[QueueWorker] \u2705 Created ${activeUsers.length} ${notificationType} notifications for ${job.ticker}`);
      }
      await this.updateProgress(job.id, job.ticker, "completed", {
        phase: "complete",
        substep: "Analysis complete",
        progress: "100%"
      });
      await storage.updateJobStatus(job.id, "completed");
      const duration = ((Date.now() - startTime) / 1e3).toFixed(2);
      console.log(`[QueueWorker] \u2705 Job ${job.id} completed successfully in ${duration}s (${job.ticker}: ${analysis.overallRating}, integrated score: ${integratedScore}/100)`);
    } catch (error) {
      const duration = ((Date.now() - startTime) / 1e3).toFixed(2);
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : void 0;
      console.error(`[QueueWorker] \u274C Job ${job.id} failed after ${duration}s:`, errorMessage);
      console.error(`[QueueWorker] Error stack:`, errorStack);
      if (job.retryCount < job.maxRetries) {
        const backoffMinutes = Math.pow(5, job.retryCount);
        const scheduledAt = new Date(Date.now() + backoffMinutes * 60 * 1e3);
        await storage.updateJobStatus(job.id, "pending", {
          retryCount: job.retryCount + 1,
          scheduledAt,
          errorMessage,
          lastError: errorMessage
          // Set lastError for frontend visibility
        });
        console.log(`[QueueWorker] Job ${job.id} will retry in ${backoffMinutes} minutes (attempt ${job.retryCount + 2}/${job.maxRetries + 1})`);
      } else {
        await storage.updateJobStatus(job.id, "failed", {
          errorMessage,
          lastError: errorMessage
          // Set lastError for frontend visibility
        });
        console.log(`[QueueWorker] Job ${job.id} failed permanently after ${job.maxRetries + 1} attempts`);
      }
    } finally {
      this.processingCount--;
    }
  }
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  async getStatus() {
    return {
      running: this.running,
      processingCount: this.processingCount,
      maxConcurrent: this.maxConcurrent
    };
  }
};
var queueWorker = new QueueWorker();

// server/websocketServer.ts
import { WebSocketServer, WebSocket } from "ws";
import { parse as parseCookie } from "cookie";
var WebSocketManager = class {
  wss = null;
  userConnections = /* @__PURE__ */ new Map();
  initialize(server) {
    this.wss = new WebSocketServer({ noServer: true });
    server.on("upgrade", (request, socket, head) => {
      if (request.url !== "/ws") {
        socket.destroy();
        return;
      }
      this.authenticateConnection(request, (err, userId) => {
        if (err || !userId) {
          socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
          socket.destroy();
          return;
        }
        this.wss.handleUpgrade(request, socket, head, (ws2) => {
          const authWs = ws2;
          authWs.userId = userId;
          authWs.isAlive = true;
          this.wss.emit("connection", authWs, request);
        });
      });
    });
    this.wss.on("connection", (ws2) => {
      const userId = ws2.userId;
      console.log(`[WebSocket] User ${userId} connected`);
      if (!this.userConnections.has(userId)) {
        this.userConnections.set(userId, /* @__PURE__ */ new Set());
      }
      this.userConnections.get(userId).add(ws2);
      ws2.isAlive = true;
      ws2.on("pong", () => {
        ws2.isAlive = true;
      });
      ws2.on("message", (message) => {
        try {
          const data = JSON.parse(message.toString());
          console.log(`[WebSocket] Received from user ${userId}:`, data);
          if (data.type === "ping") {
            ws2.send(JSON.stringify({ type: "pong" }));
          }
        } catch (error) {
          console.error("[WebSocket] Error parsing message:", error);
        }
      });
      ws2.on("close", () => {
        console.log(`[WebSocket] User ${userId} disconnected`);
        this.userConnections.get(userId)?.delete(ws2);
        if (this.userConnections.get(userId)?.size === 0) {
          this.userConnections.delete(userId);
        }
      });
      ws2.send(JSON.stringify({ type: "connected", userId }));
    });
    const heartbeatInterval = setInterval(() => {
      this.wss?.clients.forEach((ws2) => {
        const authWs = ws2;
        if (!authWs.isAlive) {
          console.log(`[WebSocket] Terminating dead connection for user ${authWs.userId}`);
          return authWs.terminate();
        }
        authWs.isAlive = false;
        authWs.ping();
      });
    }, 3e4);
    this.wss.on("close", () => {
      clearInterval(heartbeatInterval);
    });
    this.subscribeToEvents();
    console.log("[WebSocket] Server initialized");
  }
  authenticateConnection(request, callback) {
    const cookies = request.headers.cookie ? parseCookie(request.headers.cookie) : {};
    const sessionId = cookies["connect.sid"];
    if (!sessionId) {
      return callback(new Error("No session cookie"));
    }
    const fakeReq = {
      headers: { cookie: request.headers.cookie },
      session: void 0
    };
    const fakeRes = {
      getHeader: () => null,
      setHeader: () => {
      }
    };
    sessionMiddleware(fakeReq, fakeRes, (err) => {
      if (err) {
        return callback(new Error("Session authentication failed"));
      }
      const userId = fakeReq.session?.userId;
      if (!userId) {
        return callback(new Error("Not authenticated"));
      }
      callback(null, userId);
    });
  }
  subscribeToEvents() {
    eventDispatcher.on("STOCK_STATUS_CHANGED", (event) => {
      if (event.type === "STOCK_STATUS_CHANGED") {
        this.broadcastToUser(event.userId, {
          type: "STOCK_STATUS_CHANGED",
          ticker: event.ticker,
          status: event.status
        });
      }
    });
    eventDispatcher.on("STOCK_POPULAR", (event) => {
      if (event.type === "STOCK_POPULAR") {
        this.broadcastToAll({
          type: "STOCK_POPULAR",
          ticker: event.ticker,
          followerCount: event.followerCount
        });
      }
    });
    eventDispatcher.on("PRICE_UPDATED", (event) => {
      if (event.type === "PRICE_UPDATED") {
        this.broadcastToUser(event.userId, {
          type: "PRICE_UPDATED",
          ticker: event.ticker,
          price: event.price,
          change: event.change
        });
      }
    });
    eventDispatcher.on("FOLLOWED_STOCK_UPDATED", (event) => {
      if (event.type === "FOLLOWED_STOCK_UPDATED") {
        this.broadcastToUser(event.userId, {
          type: "FOLLOWED_STOCK_UPDATED",
          ticker: event.ticker,
          data: event.data
        });
      }
    });
    eventDispatcher.on("NEW_STOCK_ADDED", (event) => {
      if (event.type === "NEW_STOCK_ADDED") {
        this.broadcastToUser(event.userId, {
          type: "NEW_STOCK_ADDED",
          ticker: event.ticker,
          recommendation: event.recommendation
        });
      }
    });
    eventDispatcher.on("STANCE_CHANGED", (event) => {
      if (event.type === "STANCE_CHANGED") {
        this.broadcastToUser(event.userId, {
          type: "STANCE_CHANGED",
          ticker: event.ticker,
          oldStance: event.oldStance,
          newStance: event.newStance
        });
      }
    });
  }
  broadcastToUser(userId, message) {
    const connections = this.userConnections.get(userId);
    if (!connections || connections.size === 0) {
      return;
    }
    const payload = JSON.stringify(message);
    connections.forEach((ws2) => {
      if (ws2.readyState === WebSocket.OPEN) {
        ws2.send(payload);
      }
    });
  }
  broadcastToAll(message) {
    const payload = JSON.stringify(message);
    this.wss?.clients.forEach((ws2) => {
      if (ws2.readyState === WebSocket.OPEN) {
        ws2.send(payload);
      }
    });
  }
};
var websocketManager = new WebSocketManager();

// server/index.ts
var ENABLE_TELEGRAM = process.env.ENABLE_TELEGRAM === "true";
var app = express2();
app.use(express2.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express2.urlencoded({ extended: false }));
app.use(sessionMiddleware);
app.use((req, res, next) => {
  const start = Date.now();
  const path4 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path4.startsWith("/api")) {
      let logLine = `${req.method} ${path4} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  await storage.initializeDefaults();
  log("Server starting with session-based admin authentication...");
  if (ENABLE_TELEGRAM) {
    await telegramService.initialize().catch((err) => {
      log(`Telegram service initialization skipped: ${err.message}`);
    });
    await telegramNotificationService.initialize().catch((err) => {
      log(`Telegram notification service initialization skipped: ${err.message}`);
    });
  } else {
    log("Telegram integration disabled via feature flag");
  }
  const server = await registerRoutes(app);
  websocketManager.initialize(server);
  log("[WebSocket] Real-time update server initialized");
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    app.use("/api/*", (req, res, next) => {
      if (!res.headersSent) {
        res.status(404).json({ error: "API endpoint not found" });
      } else {
        next();
      }
    });
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
  startPriceUpdateJob();
  startCleanupScheduler(storage);
  startCandlestickDataJob();
  startHoldingsPriceHistoryJob();
  if (ENABLE_TELEGRAM) {
    startTelegramFetchJob();
  }
  startOpeninsiderFetchJob();
  startRecommendationCleanupJob();
  startSimulatedRuleExecutionJob();
  startAIAnalysisJob();
  queueWorker.start();
  log("[QueueWorker] AI Analysis queue worker started");
  startAnalysisReconciliationJob();
  startDailyBriefJob();
})();
function startPriceUpdateJob() {
  const FIVE_MINUTES = 5 * 60 * 1e3;
  async function updateStockPrices() {
    try {
      if (!isMarketOpen2()) {
        log("[PriceUpdate] Market is closed, skipping stock price update");
        return;
      }
      log("[PriceUpdate] Starting stock price update job...");
      const tickers = await storage.getAllUniquePendingTickers();
      if (tickers.length === 0) {
        log("[PriceUpdate] No pending stocks to update");
        return;
      }
      log(`[PriceUpdate] Updating prices for ${tickers.length} unique pending tickers across all users`);
      const stockData = await finnhubService.getBatchStockData(tickers);
      let successCount = 0;
      for (const ticker of tickers) {
        const data = stockData.get(ticker);
        if (data) {
          const updatedCount = await storage.updateStocksByTickerGlobally(ticker, {
            currentPrice: data.quote.currentPrice.toString(),
            previousClose: data.quote.previousClose.toString(),
            marketCap: data.marketCap ? `$${Math.round(data.marketCap)}M` : null,
            description: data.companyInfo?.description || null,
            industry: data.companyInfo?.industry || null,
            country: data.companyInfo?.country || null,
            webUrl: data.companyInfo?.webUrl || null,
            ipo: data.companyInfo?.ipo || null,
            news: data.news || [],
            insiderSentimentMspr: data.insiderSentiment?.mspr.toString() || null,
            insiderSentimentChange: data.insiderSentiment?.change.toString() || null
          });
          if (updatedCount > 0) {
            successCount++;
            log(`[PriceUpdate] Updated ${ticker}: ${updatedCount} instances across users`);
          }
        }
      }
      log(`[PriceUpdate] Successfully updated ${successCount}/${tickers.length} tickers`);
    } catch (error) {
      console.error("[PriceUpdate] Error updating stock prices:", error);
    }
  }
  updateStockPrices().catch((err) => {
    console.error("[PriceUpdate] Initial update failed:", err);
  });
  setInterval(updateStockPrices, FIVE_MINUTES);
  log("[PriceUpdate] Background job started - updating every 5 minutes");
}
function startCandlestickDataJob() {
  const ONE_DAY = 24 * 60 * 60 * 1e3;
  async function fetchCandlestickData() {
    try {
      log("[CandlestickData] Starting candlestick data fetch job...");
      const tickers = await storage.getAllTickersNeedingCandlestickData();
      if (tickers.length === 0) {
        log("[CandlestickData] No stocks need candlestick data");
        return;
      }
      log(`[CandlestickData] Fetching candlestick data for ${tickers.length} unique tickers (shared storage)`);
      const { stockService: stockService2 } = await Promise.resolve().then(() => (init_stockService(), stockService_exports));
      let successCount = 0;
      let errorCount = 0;
      const errors = [];
      for (const ticker of tickers) {
        try {
          log(`[CandlestickData] Fetching data for ${ticker}...`);
          const candlesticks = await stockService2.getCandlestickData(ticker);
          if (candlesticks && candlesticks.length > 0) {
            await storage.upsertCandlesticks(ticker, candlesticks.map((c) => ({
              date: c.date,
              open: c.open,
              high: c.high,
              low: c.low,
              close: c.close,
              volume: c.volume
            })));
            log(`[CandlestickData] \u2713 ${ticker} - fetched ${candlesticks.length} days, stored in shared table`);
            successCount++;
          } else {
            log(`[CandlestickData] \u26A0\uFE0F ${ticker} - no candlestick data returned`);
            errorCount++;
            errors.push({ ticker, error: "No data returned from API" });
          }
        } catch (error) {
          errorCount++;
          const errorMsg = error.message || String(error);
          errors.push({ ticker, error: errorMsg });
          console.error(`[CandlestickData] \u2717 ${ticker} - Error: ${errorMsg}`);
        }
      }
      log(`[CandlestickData] Successfully updated ${successCount}/${tickers.length} tickers`);
      if (errorCount > 0) {
        log(`[CandlestickData] Failed to fetch data for ${errorCount} stocks:`);
        errors.forEach(({ ticker, error }) => {
          log(`  - ${ticker}: ${error}`);
        });
      }
    } catch (error) {
      console.error("[CandlestickData] Error in candlestick data job:", error);
    }
  }
  fetchCandlestickData().catch((err) => {
    console.error("[CandlestickData] Initial fetch failed:", err);
  });
  setInterval(fetchCandlestickData, ONE_DAY);
  log("[CandlestickData] Background job started - fetching once a day");
}
function isMarketOpen2() {
  const now = /* @__PURE__ */ new Date();
  const etTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const day = etTime.getDay();
  if (day === 0 || day === 6) {
    return false;
  }
  const hours = etTime.getHours();
  const minutes = etTime.getMinutes();
  const timeInMinutes = hours * 60 + minutes;
  const marketOpen = 9 * 60 + 30;
  const marketClose = 16 * 60;
  return timeInMinutes >= marketOpen && timeInMinutes < marketClose;
}
function startHoldingsPriceHistoryJob() {
  const FIVE_MINUTES = 5 * 60 * 1e3;
  async function updateHoldingsPriceHistory() {
    try {
      if (!isMarketOpen2()) {
        log("[HoldingsHistory] Market is closed, skipping price update");
        return;
      }
      log("[HoldingsHistory] Starting holdings price history update...");
      const users2 = await storage.getUsers();
      const allHoldings = [];
      for (const user of users2) {
        const userHoldings = await storage.getPortfolioHoldings(user.id);
        allHoldings.push(...userHoldings);
      }
      const holdings = allHoldings;
      if (holdings.length === 0) {
        log("[HoldingsHistory] No holdings to update");
        return;
      }
      const tickerSet = new Set(holdings.map((h) => h.ticker));
      const tickers = Array.from(tickerSet);
      log(`[HoldingsHistory] Updating price history for ${tickers.length} tickers`);
      const quotes = await finnhubService.getBatchQuotes(tickers);
      const now = (/* @__PURE__ */ new Date()).toISOString();
      let successCount = 0;
      for (const ticker of tickers) {
        const quote = quotes.get(ticker);
        if (!quote || !quote.currentPrice) {
          continue;
        }
        for (const user of users2) {
          const userStocks = await storage.getStocks(user.id);
          const stock = userStocks.find((s) => s.ticker === ticker);
          if (!stock) continue;
          const priceHistory = stock.priceHistory || [];
          priceHistory.push({
            date: now,
            price: quote.currentPrice
          });
          await storage.updateStock(user.id, ticker, {
            priceHistory,
            currentPrice: quote.currentPrice.toString()
          });
        }
        successCount++;
      }
      log(`[HoldingsHistory] Successfully updated ${successCount}/${tickers.length} stocks with new price points`);
    } catch (error) {
      console.error("[HoldingsHistory] Error updating holdings price history:", error);
    }
  }
  updateHoldingsPriceHistory().catch((err) => {
    console.error("[HoldingsHistory] Initial update failed:", err);
  });
  setInterval(updateHoldingsPriceHistory, FIVE_MINUTES);
  log("[HoldingsHistory] Background job started - updating price history every 5 minutes");
}
function startTelegramFetchJob() {
  const ONE_HOUR = 60 * 60 * 1e3;
  async function fetchTelegramMessages() {
    try {
      log("[TelegramFetch] Starting Telegram message fetch job...");
      const config = await storage.getTelegramConfig();
      if (!config || !config.enabled) {
        log("[TelegramFetch] Telegram is not configured or disabled, skipping");
        return;
      }
      const messages = await telegramService.fetchRecentMessages(config.channelUsername, 20);
      log(`[TelegramFetch] Successfully fetched and processed ${messages.length} messages`);
    } catch (error) {
      console.error("[TelegramFetch] Error fetching Telegram messages:", error);
    }
  }
  fetchTelegramMessages().catch((err) => {
    console.error("[TelegramFetch] Initial fetch failed:", err);
  });
  setInterval(fetchTelegramMessages, ONE_HOUR);
  log("[TelegramFetch] Background job started - fetching every hour");
}
function startOpeninsiderFetchJob() {
  const ONE_HOUR = 60 * 60 * 1e3;
  const ONE_DAY = 24 * 60 * 60 * 1e3;
  async function fetchOpeninsiderData() {
    try {
      log("[OpeninsiderFetch] Starting OpenInsider data fetch job...");
      const config = await storage.getOpeninsiderConfig();
      if (!config || !config.enabled) {
        log("[OpeninsiderFetch] OpenInsider is not configured or disabled, skipping");
        return;
      }
      const filters = {};
      if (config.insiderTitles && config.insiderTitles.length > 0) {
        filters.insiderTitles = config.insiderTitles;
      }
      if (config.minTransactionValue) {
        filters.minTransactionValue = config.minTransactionValue;
      }
      if (config.fetchPreviousDayOnly) {
        filters.previousDayOnly = true;
      }
      const optionsDealThreshold = config.optionsDealThresholdPercent ?? 15;
      const minMarketCap = config.minMarketCap ?? 500;
      log(`[OpeninsiderFetch] Fetching both purchases AND sales...`);
      const [purchasesResponse, salesResponse] = await Promise.all([
        openinsiderService.fetchInsiderPurchases(
          config.fetchLimit || 50,
          Object.keys(filters).length > 0 ? filters : void 0,
          "P"
        ),
        openinsiderService.fetchInsiderSales(
          config.fetchLimit || 50,
          Object.keys(filters).length > 0 ? filters : void 0
        )
      ]);
      const transactions = [...purchasesResponse.transactions, ...salesResponse.transactions];
      const stage1Stats = {
        total_rows_scraped: purchasesResponse.stats.total_rows_scraped + salesResponse.stats.total_rows_scraped,
        filtered_not_purchase: purchasesResponse.stats.filtered_not_purchase + salesResponse.stats.filtered_not_purchase,
        filtered_invalid_data: purchasesResponse.stats.filtered_invalid_data + salesResponse.stats.filtered_invalid_data,
        filtered_by_date: purchasesResponse.stats.filtered_by_date + salesResponse.stats.filtered_by_date,
        filtered_by_title: purchasesResponse.stats.filtered_by_title + salesResponse.stats.filtered_by_title,
        filtered_by_transaction_value: purchasesResponse.stats.filtered_by_transaction_value + salesResponse.stats.filtered_by_transaction_value,
        filtered_by_insider_name: purchasesResponse.stats.filtered_by_insider_name + salesResponse.stats.filtered_by_insider_name
      };
      log(`[OpeninsiderFetch] Fetched ${purchasesResponse.transactions.length} purchases + ${salesResponse.transactions.length} sales = ${transactions.length} total`);
      if (transactions.length === 0) {
        log("[OpeninsiderFetch] No insider transactions found");
        await storage.updateOpeninsiderSyncStatus();
        return;
      }
      const totalStage1Filtered = stage1Stats.filtered_by_title + stage1Stats.filtered_by_transaction_value + stage1Stats.filtered_by_date + stage1Stats.filtered_not_purchase + stage1Stats.filtered_invalid_data;
      log(`[OpeninsiderFetch] ======= STAGE 1: Python Scraper Filters =======`);
      log(`[OpeninsiderFetch] Total rows scraped: ${stage1Stats.total_rows_scraped}`);
      log(`[OpeninsiderFetch]   \u2022 Not a purchase / Invalid: ${stage1Stats.filtered_not_purchase + stage1Stats.filtered_invalid_data}`);
      log(`[OpeninsiderFetch]   \u2022 Filtered by date: ${stage1Stats.filtered_by_date}`);
      log(`[OpeninsiderFetch]   \u2022 Filtered by title: ${stage1Stats.filtered_by_title}`);
      log(`[OpeninsiderFetch]   \u2022 Filtered by transaction value: ${stage1Stats.filtered_by_transaction_value}`);
      log(`[OpeninsiderFetch] \u2192 Total Stage 1 filtered: ${totalStage1Filtered}`);
      log(`[OpeninsiderFetch] \u2192 Returned ${transactions.length} matching transactions`);
      log(`[OpeninsiderFetch] ===============================================`);
      let createdCount = 0;
      let filteredMarketCap = 0;
      let filteredOptionsDeals = 0;
      let filteredNoQuote = 0;
      let filteredDuplicates = 0;
      const createdTickers = /* @__PURE__ */ new Set();
      const users2 = await storage.getUsers();
      for (const transaction of transactions) {
        try {
          const quote = await finnhubService.getQuote(transaction.ticker);
          if (!quote || !quote.currentPrice) {
            filteredNoQuote++;
            log(`[OpeninsiderFetch] Could not get quote for ${transaction.ticker}, skipping`);
            continue;
          }
          const stockData = await finnhubService.getBatchStockData([transaction.ticker]);
          const data = stockData.get(transaction.ticker);
          if (!data?.marketCap || data.marketCap < minMarketCap) {
            filteredMarketCap++;
            log(`[OpeninsiderFetch] ${transaction.ticker} market cap too low: $${data?.marketCap || 0}M (need >$${minMarketCap}M), skipping`);
            continue;
          }
          if (transaction.recommendation === "buy") {
            const insiderPriceNum = transaction.price;
            const thresholdPercent = optionsDealThreshold / 100;
            if (optionsDealThreshold > 0 && insiderPriceNum < quote.currentPrice * thresholdPercent) {
              filteredOptionsDeals++;
              log(`[OpeninsiderFetch] ${transaction.ticker} likely options deal: insider price $${insiderPriceNum.toFixed(2)} < ${optionsDealThreshold}% of market $${quote.currentPrice.toFixed(2)}, skipping`);
              continue;
            }
          }
          for (const user of users2) {
            const existingTransaction = await storage.getTransactionByCompositeKey(
              user.id,
              transaction.ticker,
              transaction.filingDate,
              transaction.insiderName,
              transaction.recommendation
            );
            if (existingTransaction) {
              filteredDuplicates++;
              continue;
            }
            await storage.createStock({
              userId: user.id,
              ticker: transaction.ticker,
              companyName: transaction.companyName || transaction.ticker,
              currentPrice: quote.currentPrice.toString(),
              previousClose: quote.previousClose?.toString() || quote.currentPrice.toString(),
              insiderPrice: transaction.price.toString(),
              insiderQuantity: transaction.quantity,
              insiderTradeDate: transaction.filingDate,
              insiderName: transaction.insiderName,
              insiderTitle: transaction.insiderTitle,
              recommendation: transaction.recommendation,
              source: "openinsider",
              confidenceScore: transaction.confidence || 75,
              peRatio: null,
              marketCap: data?.marketCap ? `$${Math.round(data.marketCap)}M` : null,
              description: data?.companyInfo?.description || null,
              industry: data?.companyInfo?.industry || null,
              country: data?.companyInfo?.country || null,
              webUrl: data?.companyInfo?.webUrl || null,
              ipo: data?.companyInfo?.ipo || null,
              news: data?.news || [],
              insiderSentimentMspr: data?.insiderSentiment?.mspr.toString() || null,
              insiderSentimentChange: data?.insiderSentiment?.change.toString() || null,
              priceHistory: []
            });
          }
          createdCount++;
          createdTickers.add(transaction.ticker);
          log(`[OpeninsiderFetch] Created stock recommendation for ${transaction.ticker}`);
          if (ENABLE_TELEGRAM && telegramNotificationService.isReady()) {
            try {
              const notificationSent = await telegramNotificationService.sendStockAlert({
                ticker: transaction.ticker,
                companyName: transaction.companyName || transaction.ticker,
                recommendation: transaction.recommendation || "buy",
                currentPrice: quote.currentPrice.toString(),
                insiderPrice: transaction.price.toString(),
                insiderQuantity: transaction.quantity,
                confidenceScore: transaction.confidence || 75
              });
              if (notificationSent) {
                log(`[OpeninsiderFetch] Sent Telegram notification for ${transaction.ticker}`);
              } else {
                log(`[OpeninsiderFetch] Failed to send Telegram notification for ${transaction.ticker}`);
              }
            } catch (err) {
              console.error(`[OpeninsiderFetch] Error sending Telegram notification for ${transaction.ticker}:`, err);
            }
          }
        } catch (err) {
          console.error(`[OpeninsiderFetch] Error processing ${transaction.ticker}:`, err);
        }
      }
      if (createdTickers.size > 0) {
        const uniqueTickersArray = Array.from(createdTickers);
        log(`[OpeninsiderFetch] Queuing AI analysis for ${uniqueTickersArray.length} unique tickers...`);
        for (const ticker of uniqueTickersArray) {
          try {
            await storage.enqueueAnalysisJob(ticker, "openinsider_fetch", "normal");
            log(`[OpeninsiderFetch] \u2713 Queued AI analysis for ${ticker}`);
          } catch (error) {
            console.error(`[OpeninsiderFetch] Failed to queue AI analysis for ${ticker}:`, error);
          }
        }
      }
      log(`
[OpeninsiderFetch] ======= STAGE 2: Backend Post-Processing =======`);
      log(`[OpeninsiderFetch] Starting with: ${transactions.length} transactions`);
      log(`[OpeninsiderFetch]   \u2297 Duplicates: ${filteredDuplicates}`);
      log(`[OpeninsiderFetch]   \u2297 Market cap < $${minMarketCap}M: ${filteredMarketCap}`);
      log(`[OpeninsiderFetch]   \u2297 Options deals (< ${optionsDealThreshold}%): ${filteredOptionsDeals}`);
      log(`[OpeninsiderFetch]   \u2297 No quote: ${filteredNoQuote}`);
      log(`[OpeninsiderFetch] \u2192 Total Stage 2 filtered: ${filteredDuplicates + filteredMarketCap + filteredOptionsDeals + filteredNoQuote}`);
      log(`[OpeninsiderFetch] ===============================================`);
      log(`
[OpeninsiderFetch] \u2713 Successfully created ${createdCount} new recommendations (${createdTickers.size} unique tickers)
`);
      await storage.updateOpeninsiderSyncStatus();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("[OpeninsiderFetch] Error fetching OpenInsider data:", error);
      await storage.updateOpeninsiderSyncStatus(errorMessage);
    }
  }
  fetchOpeninsiderData().catch((err) => {
    console.error("[OpeninsiderFetch] Initial fetch failed:", err);
  });
  async function getInterval() {
    const config = await storage.getOpeninsiderConfig();
    return config?.fetchInterval === "daily" ? ONE_DAY : ONE_HOUR;
  }
  getInterval().then((interval) => {
    setInterval(fetchOpeninsiderData, interval);
    const intervalName = interval === ONE_DAY ? "daily" : "hourly";
    log(`[OpeninsiderFetch] Background job started - fetching ${intervalName}`);
  });
}
function startRecommendationCleanupJob() {
  const ONE_HOUR = 60 * 60 * 1e3;
  const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1e3;
  async function cleanupOldRecommendations() {
    try {
      log("[Cleanup] Starting recommendation cleanup job...");
      const users2 = await storage.getUsers();
      const now = /* @__PURE__ */ new Date();
      let rejectedCount = 0;
      let deletedCount = 0;
      let totalStocksChecked = 0;
      for (const user of users2) {
        const stocks2 = await storage.getStocks(user.id);
        totalStocksChecked += stocks2.length;
        const pendingStocks = stocks2.filter(
          (stock) => stock.recommendationStatus === "pending" && stock.insiderTradeDate
        );
        for (const stock of pendingStocks) {
          try {
            const dateParts = stock.insiderTradeDate.split(" ")[0].split(".");
            if (dateParts.length >= 3) {
              const day = parseInt(dateParts[0], 10);
              const month = parseInt(dateParts[1], 10) - 1;
              const year = parseInt(dateParts[2], 10);
              const tradeDate = new Date(year, month, day);
              const ageMs = now.getTime() - tradeDate.getTime();
              if (ageMs > TWO_WEEKS_MS) {
                await storage.updateStock(user.id, stock.ticker, {
                  recommendationStatus: "rejected",
                  rejectedAt: /* @__PURE__ */ new Date()
                });
                rejectedCount++;
                log(`[Cleanup] Rejected ${stock.ticker} for user ${user.id} - trade date ${stock.insiderTradeDate} is older than 2 weeks`);
              }
            }
          } catch (parseError) {
            console.error(`[Cleanup] Error parsing date for ${stock.ticker}:`, parseError);
          }
        }
        const rejectedStocks = stocks2.filter(
          (stock) => stock.recommendationStatus === "rejected" && stock.rejectedAt
        );
        for (const stock of rejectedStocks) {
          try {
            const rejectedDate = new Date(stock.rejectedAt);
            const ageMs = now.getTime() - rejectedDate.getTime();
            if (ageMs > TWO_WEEKS_MS) {
              await storage.deleteStock(user.id, stock.ticker);
              deletedCount++;
              log(`[Cleanup] Deleted ${stock.ticker} for user ${user.id} - was rejected on ${stock.rejectedAt}`);
            }
          } catch (deleteError) {
            console.error(`[Cleanup] Error deleting rejected stock ${stock.ticker}:`, deleteError);
          }
        }
      }
      log(`[Cleanup] Rejected ${rejectedCount} old recommendations, deleted ${deletedCount} old rejected stocks (checked ${totalStocksChecked} total stocks across ${users2.length} users)`);
    } catch (error) {
      console.error("[Cleanup] Error in cleanup job:", error);
    }
  }
  cleanupOldRecommendations().catch((err) => {
    console.error("[Cleanup] Initial cleanup failed:", err);
  });
  setInterval(cleanupOldRecommendations, ONE_HOUR);
  log("[Cleanup] Background job started - cleaning up old recommendations every hour");
}
function startSimulatedRuleExecutionJob() {
  const FIVE_MINUTES = 5 * 60 * 1e3;
  async function evaluateAndExecuteRules() {
    try {
      if (!isMarketOpen2()) {
        log("[SimRuleExec] Market is closed, skipping rule evaluation");
        return;
      }
      log("[SimRuleExec] Evaluating trading rules for simulated holdings...");
      const users2 = await storage.getUsers();
      const allRulesArray = [];
      const allHoldingsArray = [];
      for (const user of users2) {
        const userRules = await storage.getTradingRules(user.id);
        const userHoldings = await storage.getPortfolioHoldings(user.id, true);
        allRulesArray.push(...userRules);
        allHoldingsArray.push(...userHoldings);
      }
      const enabledRules = allRulesArray.filter((rule) => rule.enabled);
      if (enabledRules.length === 0) {
        log("[SimRuleExec] No enabled rules to evaluate");
        return;
      }
      const holdings = allHoldingsArray;
      if (holdings.length === 0) {
        log("[SimRuleExec] No simulated holdings to evaluate");
        return;
      }
      const stockMap = /* @__PURE__ */ new Map();
      for (const user of users2) {
        const userStocks = await storage.getStocks(user.id);
        for (const stock of userStocks) {
          if (!stockMap.has(stock.ticker)) {
            stockMap.set(stock.ticker, stock);
          }
        }
      }
      let executedCount = 0;
      for (const holding of holdings) {
        const stock = stockMap.get(holding.ticker);
        if (!stock) continue;
        const currentPrice = parseFloat(stock.currentPrice);
        const purchasePrice = parseFloat(holding.averagePurchasePrice);
        const previousClose = parseFloat(stock.previousClose || stock.currentPrice);
        const applicableRules = enabledRules.filter(
          (rule) => (rule.action === "sell" || rule.action === "sell_all") && (rule.scope === "all_holdings" || rule.scope === "specific_stock" && rule.ticker === holding.ticker)
        );
        for (const rule of applicableRules) {
          if (!rule.conditions || rule.conditions.length === 0) continue;
          const condition = rule.conditions[0];
          let targetPrice = 0;
          let isTriggered = false;
          if (condition.metric === "price_change_percent") {
            targetPrice = purchasePrice * (1 + condition.value / 100);
            if (condition.operator === "<" || condition.operator === "<=") {
              isTriggered = currentPrice <= targetPrice;
            } else if (condition.operator === ">" || condition.operator === ">=") {
              isTriggered = currentPrice >= targetPrice;
            }
          } else if (condition.metric === "price_change_from_close_percent") {
            targetPrice = previousClose * (1 + condition.value / 100);
            if (condition.operator === "<" || condition.operator === "<=") {
              isTriggered = currentPrice <= targetPrice;
            } else if (condition.operator === ">" || condition.operator === ">=") {
              isTriggered = currentPrice >= targetPrice;
            }
          } else if (condition.metric === "price_absolute") {
            targetPrice = condition.value;
            if (condition.operator === "<" || condition.operator === "<=") {
              isTriggered = currentPrice <= targetPrice;
            } else if (condition.operator === ">" || condition.operator === ">=") {
              isTriggered = currentPrice >= targetPrice;
            }
          }
          if (isTriggered) {
            let quantityToSell = 0;
            if (rule.action === "sell_all") {
              quantityToSell = holding.quantity;
            } else if (rule.actionParams) {
              if ("quantity" in rule.actionParams && rule.actionParams.quantity) {
                quantityToSell = Math.min(rule.actionParams.quantity, holding.quantity);
              } else if ("percentage" in rule.actionParams && rule.actionParams.percentage) {
                quantityToSell = Math.floor(holding.quantity * (rule.actionParams.percentage / 100));
              }
            }
            if (quantityToSell > 0) {
              const total = currentPrice * quantityToSell;
              await storage.createTrade({
                userId: holding.userId,
                ticker: holding.ticker,
                type: "sell",
                quantity: quantityToSell,
                price: currentPrice.toFixed(2),
                total: total.toFixed(2),
                status: "completed",
                broker: "simulation",
                isSimulated: true
              });
              executedCount++;
              log(`[SimRuleExec] Executed rule "${rule.name}" for ${holding.ticker}: Sold ${quantityToSell} shares at $${currentPrice.toFixed(2)} (triggered by ${condition.metric})`);
              if (ENABLE_TELEGRAM && telegramNotificationService) {
                const profitLoss = (currentPrice - purchasePrice) * quantityToSell;
                const profitLossPercent = (currentPrice - purchasePrice) / purchasePrice * 100;
                const message = `\u{1F916} SIMULATION: Auto-sell triggered

Rule: ${rule.name}
Stock: ${holding.ticker}
Sold: ${quantityToSell} shares @ $${currentPrice.toFixed(2)}
Purchase Price: $${purchasePrice.toFixed(2)}
P&L: ${profitLoss >= 0 ? "+" : ""}$${profitLoss.toFixed(2)} (${profitLossPercent >= 0 ? "+" : ""}${profitLossPercent.toFixed(2)}%)
Total: $${total.toFixed(2)}`;
                await telegramNotificationService.sendMessage(message).catch((err) => {
                  log(`[SimRuleExec] Failed to send Telegram notification: ${err.message}`);
                });
              }
            }
          }
        }
      }
      if (executedCount > 0) {
        log(`[SimRuleExec] Executed ${executedCount} simulated trades based on trading rules`);
      } else {
        log("[SimRuleExec] No rule conditions met");
      }
    } catch (error) {
      console.error("[SimRuleExec] Error evaluating rules:", error);
    }
  }
  evaluateAndExecuteRules().catch((err) => {
    console.error("[SimRuleExec] Initial evaluation failed:", err);
  });
  setInterval(evaluateAndExecuteRules, FIVE_MINUTES);
  log("[SimRuleExec] Background job started - evaluating rules for simulated holdings every 5 minutes");
}
function startAIAnalysisJob() {
  const TEN_MINUTES = 10 * 60 * 1e3;
  let isRunning = false;
  async function analyzeNewStocks() {
    if (isRunning) {
      log("[AIAnalysis] Skipping - previous job still running");
      return;
    }
    isRunning = true;
    try {
      log("[AIAnalysis] Checking for stocks needing AI analysis...");
      const users2 = await storage.getUsers();
      const allStocks = [];
      for (const user of users2) {
        const userStocks = await storage.getStocks(user.id);
        allStocks.push(...userStocks);
      }
      const uniqueTickersSet = /* @__PURE__ */ new Set();
      const pendingStocks = allStocks.filter((stock) => {
        if (stock.recommendationStatus === "pending" && !uniqueTickersSet.has(stock.ticker)) {
          uniqueTickersSet.add(stock.ticker);
          return true;
        }
        return false;
      });
      if (pendingStocks.length === 0) {
        log("[AIAnalysis] No pending stocks to analyze");
        return;
      }
      const buyCount = pendingStocks.filter((s) => s.recommendation === "buy").length;
      const sellCount = pendingStocks.filter((s) => s.recommendation === "sell").length;
      log(`[AIAnalysis] Found ${pendingStocks.length} pending stocks (${buyCount} buys, ${sellCount} sells), checking for missing analyses...`);
      let analyzedCount = 0;
      let skippedCount = 0;
      let errorCount = 0;
      for (const stock of pendingStocks) {
        try {
          const existingAnalysis = await storage.getStockAnalysis(stock.ticker);
          if (existingAnalysis) {
            if (existingAnalysis.status === "completed" || existingAnalysis.status === "analyzing") {
              skippedCount++;
              continue;
            }
          } else {
            await storage.saveStockAnalysis({
              ticker: stock.ticker,
              status: "pending"
            });
          }
          await storage.updateStockAnalysisStatus(stock.ticker, "analyzing");
          log(`[AIAnalysis] Running multi-signal analysis for ${stock.ticker}...`);
          const [companyOverview, balanceSheet, incomeStatement, cashFlow, dailyPrices] = await Promise.all([
            stockService.getCompanyOverview(stock.ticker),
            stockService.getBalanceSheet(stock.ticker),
            stockService.getIncomeStatement(stock.ticker),
            stockService.getCashFlow(stock.ticker),
            stockService.getDailyPrices(stock.ticker, 60)
          ]);
          const [technicalIndicators, newsSentiment] = await Promise.all([
            stockService.getTechnicalIndicators(stock.ticker, dailyPrices),
            stockService.getNewsSentiment(stock.ticker)
          ]);
          const priceNewsCorrelation = stockService.analyzePriceNewsCorrelation(dailyPrices, newsSentiment);
          log(`[AIAnalysis] Fetching SEC filings and comprehensive fundamentals for ${stock.ticker}...`);
          let secFilingData = null;
          let comprehensiveFundamentals = null;
          try {
            secFilingData = await secEdgarService.getCompanyFilingData(stock.ticker);
          } catch (error) {
            console.warn(`[AIAnalysis] Could not fetch SEC filings for ${stock.ticker}, continuing without:`, error instanceof Error ? error.message : error);
          }
          try {
            comprehensiveFundamentals = await stockService.getComprehensiveFundamentals(stock.ticker);
          } catch (error) {
            console.warn(`[AIAnalysis] Could not fetch comprehensive fundamentals for ${stock.ticker}, continuing without:`, error instanceof Error ? error.message : error);
          }
          const secFilings = secFilingData ? {
            formType: secFilingData.formType,
            filingDate: secFilingData.filingDate,
            managementDiscussion: secFilingData.managementDiscussion,
            riskFactors: secFilingData.riskFactors,
            businessOverview: secFilingData.businessOverview
          } : void 0;
          const insiderTradingStrength = await (async () => {
            try {
              const allStocks2 = await storage.getUserStocksForTicker(stock.userId, stock.ticker);
              if (allStocks2.length === 0) {
                return void 0;
              }
              const buyTransactions = allStocks2.filter((s) => s.recommendation?.toLowerCase().includes("buy"));
              const sellTransactions = allStocks2.filter((s) => s.recommendation?.toLowerCase().includes("sell"));
              let direction;
              let transactionType;
              let dominantSignal;
              if (buyTransactions.length > 0 && sellTransactions.length === 0) {
                direction = "buy";
                transactionType = "purchase";
                dominantSignal = "BULLISH - Only insider BUYING detected";
              } else if (sellTransactions.length > 0 && buyTransactions.length === 0) {
                direction = "sell";
                transactionType = "sale";
                dominantSignal = "BEARISH - Only insider SELLING detected";
              } else if (buyTransactions.length > 0 && sellTransactions.length > 0) {
                const sortedByDate = allStocks2.sort(
                  (a, b) => new Date(b.lastUpdated || 0).getTime() - new Date(a.lastUpdated || 0).getTime()
                );
                const mostRecentSignal = sortedByDate.find(
                  (s) => s.recommendation?.toLowerCase().includes("buy") || s.recommendation?.toLowerCase().includes("sell")
                );
                direction = mostRecentSignal?.recommendation?.toLowerCase().includes("buy") ? "buy" : "sell";
                transactionType = direction === "buy" ? "purchase" : "sale";
                dominantSignal = `MIXED SIGNALS - ${buyTransactions.length} BUY, ${sellTransactions.length} SELL (most recent: ${direction.toUpperCase()})`;
              } else {
                direction = "unknown";
                transactionType = "transaction";
                dominantSignal = "Unknown signal - no clear insider transactions";
              }
              const primaryStock = allStocks2.sort(
                (a, b) => new Date(b.lastUpdated || 0).getTime() - new Date(a.lastUpdated || 0).getTime()
              )[0];
              return {
                direction,
                transactionType,
                dominantSignal,
                buyCount: buyTransactions.length,
                sellCount: sellTransactions.length,
                totalTransactions: allStocks2.length,
                quantityStr: primaryStock.insiderQuantity ? `${primaryStock.insiderQuantity.toLocaleString()} shares` : "Unknown",
                insiderPrice: primaryStock.insiderPrice ? `$${parseFloat(primaryStock.insiderPrice).toFixed(2)}` : "Unknown",
                currentPrice: primaryStock.currentPrice ? `$${parseFloat(primaryStock.currentPrice).toFixed(2)}` : "Unknown",
                insiderName: primaryStock.insiderName || "Unknown",
                insiderTitle: primaryStock.insiderTitle || "Unknown",
                tradeDate: primaryStock.insiderTradeDate || "Unknown",
                totalValue: primaryStock.insiderPrice && primaryStock.insiderQuantity ? `$${(parseFloat(primaryStock.insiderPrice) * primaryStock.insiderQuantity).toFixed(2)}` : "Unknown",
                confidence: primaryStock.confidenceScore?.toString() || "Medium",
                allTransactions: allStocks2.map((s) => ({
                  direction: s.recommendation?.toLowerCase() || "unknown",
                  insiderName: s.insiderName || "Unknown",
                  insiderTitle: s.insiderTitle || "Unknown",
                  quantityStr: s.insiderQuantity ? `${s.insiderQuantity.toLocaleString()} shares` : "Unknown",
                  price: s.insiderPrice ? `$${parseFloat(s.insiderPrice).toFixed(2)}` : "Unknown",
                  date: s.insiderTradeDate || "Unknown",
                  value: s.insiderPrice && s.insiderQuantity ? `$${(parseFloat(s.insiderPrice) * s.insiderQuantity).toFixed(2)}` : "Unknown"
                }))
              };
            } catch (error) {
              console.error(`[Reconciliation] Error getting insider trading data for ${stock.ticker}:`, error);
              return void 0;
            }
          })();
          const analysis = await aiAnalysisService.analyzeStock({
            ticker: stock.ticker,
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
          });
          await storage.updateStockAnalysis(stock.ticker, {
            status: "completed",
            overallRating: analysis.overallRating,
            confidenceScore: analysis.confidenceScore,
            summary: analysis.summary,
            financialHealthScore: analysis.financialHealth.score,
            strengths: analysis.financialHealth.strengths,
            weaknesses: analysis.financialHealth.weaknesses,
            redFlags: analysis.financialHealth.redFlags,
            technicalAnalysisScore: analysis.technicalAnalysis?.score,
            technicalAnalysisTrend: analysis.technicalAnalysis?.trend,
            technicalAnalysisMomentum: analysis.technicalAnalysis?.momentum,
            technicalAnalysisSignals: analysis.technicalAnalysis?.signals,
            sentimentAnalysisScore: analysis.sentimentAnalysis?.score,
            sentimentAnalysisTrend: analysis.sentimentAnalysis?.trend,
            sentimentAnalysisNewsVolume: analysis.sentimentAnalysis?.newsVolume,
            sentimentAnalysisKeyThemes: analysis.sentimentAnalysis?.key_themes,
            keyMetrics: analysis.keyMetrics,
            risks: analysis.risks,
            opportunities: analysis.opportunities,
            recommendation: analysis.recommendation,
            analyzedAt: new Date(analysis.analyzedAt),
            errorMessage: null
            // Clear any previous errors
          });
          analyzedCount++;
          log(`[AIAnalysis] Successfully analyzed ${stock.ticker} (Score: ${analysis.financialHealth.score}/100, Rating: ${analysis.overallRating})`);
          await new Promise((resolve) => setTimeout(resolve, 2e3));
        } catch (error) {
          errorCount++;
          console.error(`[AIAnalysis] Error analyzing ${stock.ticker}:`, error);
          await storage.updateStockAnalysisStatus(
            stock.ticker,
            "failed",
            error instanceof Error ? error.message : "Unknown error"
          );
        }
      }
      log(`[AIAnalysis] Job complete: analyzed ${analyzedCount}, skipped ${skippedCount}, errors ${errorCount}`);
    } catch (error) {
      console.error("[AIAnalysis] Error in AI analysis job:", error);
    } finally {
      isRunning = false;
    }
  }
  analyzeNewStocks().catch((err) => {
    console.error("[AIAnalysis] Initial analysis failed:", err);
  });
  setInterval(analyzeNewStocks, TEN_MINUTES);
  log("[AIAnalysis] Background job started - analyzing new stocks every 10 minutes");
}
function startAnalysisReconciliationJob() {
  const ONE_HOUR = 60 * 60 * 1e3;
  let isRunning = false;
  async function reconcileIncompleteAnalyses() {
    if (isRunning) {
      log("[Reconciliation] Skipping - previous job still running");
      return;
    }
    isRunning = true;
    try {
      log("[Reconciliation] Checking for incomplete AI analyses...");
      const incompleteStocks = await storage.getStocksWithIncompleteAnalysis();
      if (incompleteStocks.length === 0) {
        log("[Reconciliation] No incomplete analyses found");
        return;
      }
      log(`[Reconciliation] Found ${incompleteStocks.length} stocks with incomplete analyses`);
      let requeuedCount = 0;
      let skippedCount = 0;
      for (const stock of incompleteStocks) {
        try {
          await storage.enqueueAnalysisJob(stock.ticker, "reconciliation", "low");
          requeuedCount++;
          log(`[Reconciliation] Re-queued ${stock.ticker} (micro: ${stock.microAnalysisCompleted}, macro: ${stock.macroAnalysisCompleted}, combined: ${stock.combinedAnalysisCompleted})`);
        } catch (error) {
          skippedCount++;
          console.error(`[Reconciliation] Error re-queuing ${stock.ticker}:`, error);
        }
      }
      log(`[Reconciliation] Job complete: re-queued ${requeuedCount}, skipped ${skippedCount}`);
    } catch (error) {
      console.error("[Reconciliation] Error in reconciliation job:", error);
    } finally {
      isRunning = false;
    }
  }
  reconcileIncompleteAnalyses().catch((err) => {
    console.error("[Reconciliation] Initial reconciliation failed:", err);
  });
  setInterval(reconcileIncompleteAnalyses, ONE_HOUR);
  log("[Reconciliation] Background job started - reconciling incomplete analyses every hour");
}
function startDailyBriefJob() {
  const ONE_DAY = 24 * 60 * 60 * 1e3;
  async function generateDailyBriefs() {
    try {
      log("[DailyBrief] Starting daily brief generation job...");
      const users2 = await storage.getUsers();
      if (users2.length === 0) {
        log("[DailyBrief] No users found");
        return;
      }
      log(`[DailyBrief] Processing ${users2.length} users...`);
      const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      let generatedCount = 0;
      let skippedCount = 0;
      let errorCount = 0;
      for (const user of users2) {
        let userGeneratedCount = 0;
        let userSkippedCount = 0;
        let userErrorCount = 0;
        try {
          const followedStocks2 = await storage.getUserFollowedStocks(user.id);
          if (followedStocks2.length === 0) {
            log(`[DailyBrief] User ${user.name} has no followed stocks, skipping`);
            continue;
          }
          log(`[DailyBrief] Processing ${followedStocks2.length} followed stocks for user ${user.name}...`);
          for (const followedStock of followedStocks2) {
            const ticker = followedStock.ticker.toUpperCase();
            try {
              const todayBrief = await storage.getDailyBriefForUser(user.id, ticker, today);
              if (todayBrief) {
                log(`[DailyBrief] Skipping ${ticker} for ${user.name} - brief already exists for today`);
                skippedCount++;
                userSkippedCount++;
                continue;
              }
              let quote;
              try {
                quote = await stockService.getQuote(ticker);
                if (!quote || quote.price === 0 || quote.previousClose === 0) {
                  log(`[DailyBrief] Skipping ${ticker} - invalid or missing price data from Alpha Vantage`);
                  skippedCount++;
                  userSkippedCount++;
                  continue;
                }
                if (quote.previousClose === 0) {
                  log(`[DailyBrief] Skipping ${ticker} - previous close is zero, cannot calculate change`);
                  skippedCount++;
                  userSkippedCount++;
                  continue;
                }
              } catch (quoteError) {
                log(`[DailyBrief] Skipping ${ticker} - failed to fetch quote: ${quoteError instanceof Error ? quoteError.message : "Unknown error"}`);
                errorCount++;
                userErrorCount++;
                continue;
              }
              const holding = await storage.getPortfolioHoldingByTicker(user.id, ticker);
              const userOwnsPosition = holding !== null;
              const stock = await storage.getStock(user.id, ticker);
              const stockData = stock;
              const previousAnalysis = stockData?.overallRating ? {
                overallRating: stockData.overallRating,
                summary: stockData.summary || "No previous analysis available",
                technicalAnalysis: stockData.technicalAnalysis ? {
                  trend: stockData.technicalAnalysis.trend,
                  momentum: stockData.technicalAnalysis.momentum,
                  score: stockData.technicalAnalysis.score,
                  signals: stockData.technicalAnalysis.signals
                } : void 0
              } : void 0;
              const opportunityType = stockData?.recommendation?.toLowerCase().includes("sell") ? "sell" : "buy";
              const now = Date.now() / 1e3;
              const oneDayAgo = now - 24 * 60 * 60;
              const recentNews = stockData?.news?.filter((article) => article.datetime && article.datetime >= oneDayAgo)?.slice(0, 3)?.map((article) => ({
                title: article.headline || "Untitled",
                sentiment: 0,
                // Finnhub news doesn't include sentiment, use neutral
                source: article.source || "Unknown"
              }));
              log(`[DailyBrief] Generating dual-scenario brief for ${ticker} - user ${user.name} (${userOwnsPosition ? "owns" : "watching"}, ${opportunityType} opportunity)...`);
              const brief = await aiAnalysisService.generateDailyBrief({
                ticker,
                currentPrice: quote.price,
                previousPrice: quote.previousClose,
                opportunityType,
                recentNews: recentNews && recentNews.length > 0 ? recentNews : void 0,
                previousAnalysis
              });
              await storage.createDailyBrief({
                userId: user.id,
                ticker,
                briefDate: today,
                priceSnapshot: quote.price.toString(),
                priceChange: quote.change.toString(),
                priceChangePercent: quote.changePercent.toString(),
                // Watching scenario
                watchingStance: brief.watching.recommendedStance,
                watchingConfidence: brief.watching.confidence,
                watchingText: brief.watching.briefText,
                watchingHighlights: brief.watching.keyHighlights,
                // Owning scenario
                owningStance: brief.owning.recommendedStance,
                owningConfidence: brief.owning.confidence,
                owningText: brief.owning.briefText,
                owningHighlights: brief.owning.keyHighlights,
                // Legacy fields for backwards compat (use user's actual position)
                recommendedStance: userOwnsPosition ? brief.owning.recommendedStance : brief.watching.recommendedStance,
                confidence: userOwnsPosition ? brief.owning.confidence : brief.watching.confidence,
                briefText: userOwnsPosition ? brief.owning.briefText : brief.watching.briefText,
                keyHighlights: userOwnsPosition ? brief.owning.keyHighlights : brief.watching.keyHighlights,
                userOwnsPosition
              });
              if (userOwnsPosition && brief.owning.recommendedStance === "sell") {
                try {
                  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1e3).toISOString().split("T")[0];
                  const yesterdayBrief = await storage.getDailyBriefForUser(user.id, ticker, yesterday);
                  if (yesterdayBrief && yesterdayBrief.recommendedStance === "hold") {
                    log(`[DailyBrief] Stance change detected for ${ticker} (${user.name}): hold\u2192sell on owned position`);
                    await storage.createNotification({
                      userId: user.id,
                      ticker,
                      type: "stance_change",
                      message: `${ticker}: Stance changed from HOLD to SELL on your position`,
                      metadata: {
                        previousStance: "hold",
                        newStance: "sell"
                      },
                      isRead: false
                    });
                    log(`[DailyBrief] Created stance_change notification for ${ticker} (${user.name})`);
                  }
                } catch (notifError) {
                  if (notifError instanceof Error && !notifError.message.includes("unique constraint")) {
                    log(`[DailyBrief] Failed to create stance change notification for ${ticker} (${user.name}): ${notifError.message}`);
                  }
                }
              }
              generatedCount++;
              userGeneratedCount++;
              log(`[DailyBrief] Generated dual-scenario brief for ${ticker} (${user.name}): Watching=${brief.watching.recommendedStance}(${brief.watching.confidence}), Owning=${brief.owning.recommendedStance}(${brief.owning.confidence})`);
            } catch (error) {
              errorCount++;
              userErrorCount++;
              const errorMsg = error instanceof Error ? error.message : "Unknown error";
              log(`[DailyBrief] Error generating brief for ${ticker} (${user.name}): ${errorMsg}`);
            }
          }
          log(`[DailyBrief] User ${user.name} complete: generated ${userGeneratedCount}, skipped ${userSkippedCount}, errors ${userErrorCount}`);
        } catch (error) {
          errorCount++;
          userErrorCount++;
          const errorMsg = error instanceof Error ? error.message : "Unknown error";
          log(`[DailyBrief] Error processing user ${user.name}: ${errorMsg}`);
        }
      }
      log(`[DailyBrief] Job complete: generated ${generatedCount}, skipped ${skippedCount}, errors ${errorCount}`);
    } catch (error) {
      console.error("[DailyBrief] Error in daily brief job:", error);
    }
  }
  setTimeout(() => {
    generateDailyBriefs().catch((err) => {
      console.error("[DailyBrief] Initial generation failed:", err);
    });
  }, 1e4);
  setInterval(generateDailyBriefs, ONE_DAY);
  log("[DailyBrief] Background job started - generating briefs once a day");
}
