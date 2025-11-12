/**
 * OpenInsider Service - Interface with Python scraper to fetch insider trading data
 */

import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import { fileURLToPath } from "url";
import { createHash } from "crypto";
import { existsSync } from "fs";

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
}

export interface OpenInsiderFilters {
  insiderTitles?: string[];
  minTransactionValue?: number;
  previousDayOnly?: boolean;
  insider_name?: string;
}

class OpenInsiderService {
  private pythonScriptPath: string;

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
   * @returns Array of insider transactions
   */
  async fetchInsiderPurchases(
    limit: number = 100,
    filters?: OpenInsiderFilters
  ): Promise<OpenInsiderTransaction[]> {
    try {
      // Validate and clamp limit to prevent command injection
      // Ensure it's a finite number, otherwise use default
      const numericLimit = Number.isFinite(limit) ? limit : 100;
      const safeLimit = Math.max(1, Math.min(Math.floor(numericLimit), 500));
      
      const filterInfo = filters ? ` with filters: ${JSON.stringify(filters)}` : '';
      console.log(`[OpenInsider] Fetching ${safeLimit} insider purchase transactions${filterInfo}...`);

      // Build arguments for Python script
      const args = [this.pythonScriptPath, safeLimit.toString()];
      
      // Add filters as JSON argument if provided
      if (filters && (filters.insiderTitles || filters.minTransactionValue || filters.previousDayOnly || filters.insider_name)) {
        // Convert insider_name to insiderName for Python script
        const pythonFilters: any = {};
        if (filters.insiderTitles) pythonFilters.insiderTitles = filters.insiderTitles;
        if (filters.minTransactionValue) pythonFilters.minTransactionValue = filters.minTransactionValue;
        if (filters.previousDayOnly) pythonFilters.previousDayOnly = filters.previousDayOnly;
        if (filters.insider_name) pythonFilters.insiderName = filters.insider_name;
        
        args.push(JSON.stringify(pythonFilters));
      }

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
        return [];
      }

      const transactions: OpenInsiderTransaction[] = JSON.parse(stdout);
      console.log(`[OpenInsider] Successfully fetched ${transactions.length} transactions`);

      return transactions;
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
    const transactions = await this.fetchInsiderPurchases(limit, filters);
    return transactions.map(t => this.transactionToMessage(t));
  }
}

export const openinsiderService = new OpenInsiderService();
