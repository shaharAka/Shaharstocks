/**
 * OpenInsider Service - Interface with Python scraper to fetch insider trading data
 */

import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import { fileURLToPath } from "url";
import { createHash } from "crypto";
import { existsSync } from "fs";
import { finnhubService } from "./finnhubService.js";

const execFileAsync = promisify(execFile);

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface OpenInsiderTransaction {
  ticker: string;
  companyName: string;
  insiderName: string;
  insiderTitle?: string;
  tradeDate: string;
  filingDate: string;
  tradeType: string;
  price: number;
  quantity: number;
  value: number;
  recommendation: string;
  confidence: number;
  twoWeekPriceChange?: number;  // Price change after 2 weeks (percentage)
  twoWeekPnL?: number;  // P&L after 2 weeks in dollars
  isProfitable?: boolean;  // Whether the trade was profitable after 2 weeks
}

export interface InsiderScore {
  insiderName: string;
  totalTrades: number;
  scoredTrades: number;  // Number of trades that were successfully scored
  profitableTrades: number;
  successRate: number;  // Percentage of profitable trades
  averageGain: number;  // Average percentage gain across all trades
  totalPnL: number;  // Total P&L in dollars
  isPartialData: boolean;  // True if some trades couldn't be scored
  unscoredCount: number;  // Number of trades that couldn't be scored
}

export interface OpenInsiderFilters {
  insiderTitles?: string[];
  minTransactionValue?: number;
  previousDayOnly?: boolean;
  insider_name?: string;
  ticker?: string;
}

export interface ScraperFilterStats {
  total_rows_scraped: number;
  filtered_not_purchase: number;
  filtered_invalid_data: number;
  filtered_by_date: number;
  filtered_by_title: number;
  filtered_by_transaction_value: number;
  filtered_by_insider_name: number;
}

export interface ScraperResponse {
  transactions: OpenInsiderTransaction[];
  stats: ScraperFilterStats;
}

class OpenInsiderService {
  private pythonScriptPath: string;
  private priceCache: Map<string, { price: number; timestamp: number }> = new Map();
  private readonly CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour cache
  private lastFinnhubCall = 0;
  private readonly MIN_CALL_INTERVAL_MS = 1200; // ~50 calls/minute to stay under 60/min limit

  constructor() {
    // Try multiple locations for the Python script
    // 1. In dist directory (production build)
    // 2. In server directory (development)
    // 3. Workspace root fallback
    const possiblePaths = [
      path.join(__dirname, "openinsider_scraper.py"),
      path.join(process.cwd(), "server", "openinsider_scraper.py"),
      path.join(process.cwd(), "openinsider_scraper.py"),
    ];

    const foundPath = possiblePaths.find(p => existsSync(p));
    
    if (!foundPath) {
      console.error("[OpenInsider] Could not find openinsider_scraper.py in any of these locations:", possiblePaths);
      this.pythonScriptPath = possiblePaths[0]; // Use first path as fallback
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
  async fetchInsiderPurchases(
    limit: number = 100,
    filters?: OpenInsiderFilters,
    tradeType: "P" | "S" = "P"
  ): Promise<ScraperResponse> {
    try {
      // Validate and normalize tradeType to uppercase
      const normalizedTradeType = (tradeType || "P").toString().toUpperCase();
      if (normalizedTradeType !== "P" && normalizedTradeType !== "S") {
        throw new Error(`Invalid tradeType: ${tradeType}. Must be "P" (purchase) or "S" (sale)`);
      }
      const safeTradeType = normalizedTradeType as "P" | "S";
      
      // Validate and clamp limit to prevent command injection
      // Ensure it's a finite number, otherwise use default
      const numericLimit = Number.isFinite(limit) ? limit : 100;
      const safeLimit = Math.max(1, Math.min(Math.floor(numericLimit), 500));
      
      const transactionTypeLabel = safeTradeType === "S" ? "sale" : "purchase";
      const filterInfo = filters ? ` with filters: ${JSON.stringify(filters)}` : '';
      console.log(`[OpenInsider] Fetching ${safeLimit} insider ${transactionTypeLabel} transactions${filterInfo}...`);

      // Build arguments for Python script
      const args = [this.pythonScriptPath, safeLimit.toString()];
      
      // Add filters as JSON argument if provided
      if (filters && (filters.insiderTitles || filters.minTransactionValue || filters.previousDayOnly || filters.insider_name || filters.ticker)) {
        // Convert insider_name to insiderName for Python script
        const pythonFilters: any = {};
        if (filters.insiderTitles) pythonFilters.insiderTitles = filters.insiderTitles;
        if (filters.minTransactionValue) pythonFilters.minTransactionValue = filters.minTransactionValue;
        if (filters.previousDayOnly) pythonFilters.previousDayOnly = filters.previousDayOnly;
        if (filters.insider_name) pythonFilters.insiderName = filters.insider_name;
        if (filters.ticker) pythonFilters.ticker = filters.ticker;
        
        args.push(JSON.stringify(pythonFilters));
      } else {
        // Add empty filters placeholder to maintain correct arg position
        args.push("{}");
      }
      
      // Add trade_type parameter as third argument (now validated and normalized)
      args.push(safeTradeType);

      const { stdout, stderr } = await execFileAsync(
        "python3",
        args,
        {
          timeout: 60000, // 60 second timeout
          maxBuffer: 10 * 1024 * 1024, // 10MB buffer
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
            filtered_by_insider_name: 0,
          }
        };
      }

      const response: ScraperResponse = JSON.parse(stdout);
      console.log(`[OpenInsider] Successfully fetched ${response.transactions.length} transactions`);
      console.log(`[OpenInsider] Stage 1 Filter Stats:`, response.stats);

      return response;
    } catch (error: any) {
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
  transactionToMessage(transaction: OpenInsiderTransaction): any {
    // Create a message text similar to Telegram format
    // Format: "$TICKER - BUY @ $PRICE (Insider: NAME, Date: DATE, Qty: QTY)"
    const messageText = `$${transaction.ticker} - ${transaction.recommendation.toUpperCase()} @ $${transaction.price.toFixed(2)} (Insider: ${transaction.insiderName}, Date: ${transaction.tradeDate}, Qty: ${transaction.quantity.toLocaleString()})`;

    // Convert filing date to Unix timestamp (when the information became public)
    const filingDate = this.parseDate(transaction.filingDate);
    const timestamp = Math.floor(filingDate.getTime() / 1000);

    // Create deterministic unique ID using hash of immutable transaction fields
    // This ensures same transaction always gets same ID (deduplication)
    // while multiple insiders buying same stock on same day get different IDs
    const idInput = `${transaction.ticker}|${transaction.filingDate}|${transaction.insiderName}|${transaction.quantity}|${transaction.price}`;
    const hash = createHash('sha256').update(idInput).digest('hex').substring(0, 16);
    const uniqueId = `openinsider_${hash}`;

    return {
      id: uniqueId,
      date: timestamp,
      text: messageText,
      senderId: "openinsider",
      views: 0,
      forwards: 0,
      entities: [],
      // Additional metadata
      _source: "openinsider",
      _transaction: transaction,
    };
  }

  /**
   * Parse date string from OpenInsider (format: YYYY-MM-DD)
   * @param dateStr Date string
   * @returns Date object
   */
  private parseDate(dateStr: string): Date {
    // OpenInsider dates are typically in YYYY-MM-DD format
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const [year, month, day] = parts.map(p => parseInt(p, 10));
      return new Date(year, month - 1, day);
    }
    
    // Fallback: try to parse as-is
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date;
    }
    
    // If all else fails, return current date
    console.warn(`[OpenInsider] Could not parse date: ${dateStr}, using current date`);
    return new Date();
  }

  /**
   * Fetch insider purchases and convert to message format for backtest
   * @param limit Number of transactions to fetch
   * @param filters Optional filters to apply
   * @returns Array of messages compatible with backtest service
   */
  async fetchMessagesForBacktest(
    limit: number,
    filters?: OpenInsiderFilters
  ): Promise<any[]> {
    const scraperResponse = await this.fetchInsiderPurchases(limit, filters);
    return scraperResponse.transactions.map((t: OpenInsiderTransaction) => this.transactionToMessage(t));
  }

  /**
   * Fetch insider SALES transactions from OpenInsider.com
   * Thin wrapper around fetchInsiderPurchases with tradeType="S"
   * @param limit Number of transactions to fetch (default: 100)
   * @param filters Optional filters for transactions
   * @returns Scraper response with sale transactions and filtering statistics
   */
  async fetchInsiderSales(
    limit: number = 100,
    filters?: OpenInsiderFilters
  ): Promise<ScraperResponse> {
    return this.fetchInsiderPurchases(limit, filters, "S");
  }

  /**
   * Calculate trade scores by fetching price 2 weeks after trade date
   * @param transactions Array of insider transactions
   * @returns Transactions with score data added
   */
  async calculateTradeScores(
    transactions: OpenInsiderTransaction[]
  ): Promise<OpenInsiderTransaction[]> {
    console.log(`[OpenInsider] Calculating scores for ${transactions.length} trades...`);

    const scoredTransactions = await Promise.all(
      transactions.map(async (transaction) => {
        try {
          // Parse trade date (format: YYYY-MM-DD)
          const tradeDate = new Date(transaction.tradeDate);
          
          // Calculate date 2 weeks later
          const twoWeeksLater = new Date(tradeDate);
          twoWeeksLater.setDate(twoWeeksLater.getDate() + 14);
          
          // Don't calculate scores for trades that haven't reached 2 weeks yet
          const now = new Date();
          if (twoWeeksLater > now) {
            return transaction; // Return without score data
          }

          // Fetch historical price 2 weeks after trade
          const twoWeeksLaterPrice = await this.getPriceOnDate(
            transaction.ticker,
            twoWeeksLater
          );

          if (!twoWeeksLaterPrice) {
            console.log(`[OpenInsider] Could not fetch price for ${transaction.ticker} on ${twoWeeksLater.toISOString().split('T')[0]}`);
            return transaction;
          }

          // Calculate percentage change
          const priceChange = ((twoWeeksLaterPrice - transaction.price) / transaction.price) * 100;
          
          // Calculate P&L in dollars
          const pnl = (twoWeeksLaterPrice - transaction.price) * transaction.quantity;
          
          // Determine if profitable
          const isProfitable = priceChange > 0;

          return {
            ...transaction,
            twoWeekPriceChange: priceChange,
            twoWeekPnL: pnl,
            isProfitable,
          };
        } catch (error) {
          console.error(`[OpenInsider] Error calculating score for ${transaction.ticker}:`, error);
          return transaction; // Return without score data on error
        }
      })
    );

    const scoredCount = scoredTransactions.filter(t => t.twoWeekPriceChange !== undefined).length;
    console.log(`[OpenInsider] Successfully scored ${scoredCount}/${transactions.length} trades`);

    return scoredTransactions;
  }

  /**
   * Get stock price on a specific date with caching and rate limiting
   * Uses Alpha Vantage for historical data
   */
  private async getPriceOnDate(ticker: string, date: Date): Promise<number | null> {
    // Create cache key (YYYY-MM-DD format)
    const dateStr = date.toISOString().split('T')[0];
    const cacheKey = `${ticker}:${dateStr}`;
    
    // Check cache first
    const cached = this.priceCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return cached.price;
    }

    try {
      // Rate limiting: ensure minimum interval between API calls
      const now = Date.now();
      const timeSinceLastCall = now - this.lastFinnhubCall;
      if (timeSinceLastCall < this.MIN_CALL_INTERVAL_MS) {
        await new Promise(resolve => 
          setTimeout(resolve, this.MIN_CALL_INTERVAL_MS - timeSinceLastCall)
        );
      }
      this.lastFinnhubCall = Date.now();

      // Convert YYYY-MM-DD to DD.MM.YYYY format for Alpha Vantage
      const [year, month, day] = dateStr.split('-');
      const alphaVantageDateStr = `${day}.${month}.${year}`;

      // Use Alpha Vantage to fetch historical price
      const price = await finnhubService.getHistoricalPrice(ticker, alphaVantageDateStr);
      
      if (price !== null) {
        // Cache the result
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
  calculateInsiderScore(transactions: OpenInsiderTransaction[]): InsiderScore {
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
        unscoredCount: 0,
      };
    }

    const insiderName = transactions[0].insiderName;
    
    // Filter only PURCHASE trades that have been scored (2 weeks have passed)
    // Ignore sells as we're tracking insider buying patterns
    const scoredTrades = transactions.filter(t => 
      t.tradeType.startsWith("P") &&  // Only purchases
      t.twoWeekPriceChange !== undefined && 
      t.twoWeekPnL !== undefined
    );

    // Count trades that couldn't be scored (future trades or API failures)
    const purchaseTrades = transactions.filter(t => t.tradeType.startsWith("P"));
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
        unscoredCount,
      };
    }

    const profitableTrades = scoredTrades.filter(t => t.isProfitable === true).length;
    const successRate = (profitableTrades / scoredTrades.length) * 100;
    
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
      unscoredCount,
    };
  }
}

export const openinsiderService = new OpenInsiderService();
