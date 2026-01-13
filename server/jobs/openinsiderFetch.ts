/**
 * Background job to fetch new OpenInsider data (hourly or daily based on config)
 * Trial users: daily refresh only, Paid subscribers: hourly refresh
 */

import type { IStorage } from '../storage';
import { finnhubService } from '../finnhubService';
import { openinsiderService } from '../openinsiderService';
import { createLogger } from '../logger';
const log = createLogger('jobs');

const ONE_HOUR = 60 * 60 * 1000;
const ONE_DAY = 24 * 60 * 60 * 1000;

// Optional dependencies - only used if Telegram is enabled
const ENABLE_TELEGRAM = process.env.ENABLE_TELEGRAM === "true";

async function getTelegramNotificationService() {
  if (!ENABLE_TELEGRAM) return null;
  try {
    const { telegramNotificationService } = await import('../telegramNotificationService');
    return telegramNotificationService;
  } catch {
    return null;
  }
}

// Mutex to prevent concurrent job executions
let isJobRunning = false;

export async function runOpeninsiderFetch(storage: IStorage): Promise<void> {
  // Prevent concurrent executions
  if (isJobRunning) {
    log("[OpeninsiderFetch] Job already running, skipping this execution");
    return;
  }
  isJobRunning = true;
  
  // Get Telegram notification service if enabled
  const telegramNotificationService = await getTelegramNotificationService();
  
  try {
    log("[OpeninsiderFetch] Starting OpenInsider data fetch job...");

    // Get OpenInsider config
    const config = await storage.getOpeninsiderConfig();
    if (!config || !config.enabled) {
      log("[OpeninsiderFetch] OpenInsider is not configured or disabled, skipping");
      return;
    }

    // Build filters from config
    const filters: {
      insiderTitles?: string[];
      minTransactionValue?: number;
      previousDayOnly?: boolean;
    } = {};

    if (config.insiderTitles && config.insiderTitles.length > 0) {
      filters.insiderTitles = config.insiderTitles;
    }
    if (config.minTransactionValue) {
      filters.minTransactionValue = config.minTransactionValue;
    }
    if (config.fetchPreviousDayOnly) {
      filters.previousDayOnly = true;
    }

    // Get configurable backend filters
    const optionsDealThreshold = config.optionsDealThresholdPercent ?? 15;
    const minMarketCap = config.minMarketCap ?? 500;

    // Fetch BOTH purchase and sale transactions
    log(`[OpeninsiderFetch] Fetching both purchases AND sales...`);
    const [purchasesResponse, salesResponse] = await Promise.all([
    openinsiderService.fetchInsiderPurchases(
    config.fetchLimit || 50,
    Object.keys(filters).length > 0 ? filters : undefined,
    "P"
    ),
    openinsiderService.fetchInsiderSales(
    config.fetchLimit || 50,
    Object.keys(filters).length > 0 ? filters : undefined
    )
    ]);

    // Merge transactions from both sources
    const transactions = [...purchasesResponse.transactions, ...salesResponse.transactions];

    // Merge stats
    const stage1Stats = {
    total_rows_scraped: purchasesResponse.stats.total_rows_scraped + salesResponse.stats.total_rows_scraped,
    filtered_not_purchase: purchasesResponse.stats.filtered_not_purchase + salesResponse.stats.filtered_not_purchase,
    filtered_invalid_data: purchasesResponse.stats.filtered_invalid_data + salesResponse.stats.filtered_invalid_data,
    filtered_by_date: purchasesResponse.stats.filtered_by_date + salesResponse.stats.filtered_by_date,
    filtered_by_title: purchasesResponse.stats.filtered_by_title + salesResponse.stats.filtered_by_title,
    filtered_by_transaction_value: purchasesResponse.stats.filtered_by_transaction_value + salesResponse.stats.filtered_by_transaction_value,
    filtered_by_insider_name: purchasesResponse.stats.filtered_by_insider_name + salesResponse.stats.filtered_by_insider_name,
    };

    log(`[OpeninsiderFetch] Fetched ${purchasesResponse.transactions.length} purchases + ${salesResponse.transactions.length} sales = ${transactions.length} total`);

    if (transactions.length === 0) {
      log("[OpeninsiderFetch] No insider transactions found");
      await storage.updateOpeninsiderSyncStatus();
      return;
    }

    const totalStage1Filtered = stage1Stats.filtered_by_title + stage1Stats.filtered_by_transaction_value +
    stage1Stats.filtered_by_date + stage1Stats.filtered_not_purchase +
    stage1Stats.filtered_invalid_data;

    log(`[OpeninsiderFetch] ======= STAGE 1: Python Scraper Filters =======`);
    log(`[OpeninsiderFetch] Total rows scraped: ${stage1Stats.total_rows_scraped}`);
    log(`[OpeninsiderFetch]   • Not a purchase / Invalid: ${stage1Stats.filtered_not_purchase + stage1Stats.filtered_invalid_data}`);
    log(`[OpeninsiderFetch]   • Filtered by date: ${stage1Stats.filtered_by_date}`);
    log(`[OpeninsiderFetch]   • Filtered by title: ${stage1Stats.filtered_by_title}`);
    log(`[OpeninsiderFetch]   • Filtered by transaction value: ${stage1Stats.filtered_by_transaction_value}`);
    log(`[OpeninsiderFetch] → Total Stage 1 filtered: ${totalStage1Filtered}`);
    log(`[OpeninsiderFetch] → Returned ${transactions.length} matching transactions`);
    log(`[OpeninsiderFetch] ===============================================`);

    // Convert transactions to stock recommendations
    let createdCount = 0;
    let filteredMarketCap = 0;
    let filteredOptionsDeals = 0;
    let filteredNoQuote = 0;
    let filteredDuplicates = 0;
    const createdTickers = new Set<string>(); // Track unique tickers for AI analysis

    // Get only users who are eligible for data refresh based on subscription type
    // Trial users: daily refresh only, Paid subscribers: hourly refresh
    const users = await storage.getUsersEligibleForDataRefresh();
    log(`[OpeninsiderFetch] ${users.length} users eligible for data refresh (trial: daily, paid: hourly)`);

    // IMMEDIATELY update lastDataRefresh for eligible users to prevent duplicate refreshes
    // This happens BEFORE processing transactions to ensure eligibility is updated even if no stocks are created
    if (users.length > 0) {
      for (const user of users) {
        await storage.updateUserLastDataRefresh(user.id);
      }
      log(`[OpeninsiderFetch] Updated lastDataRefresh for ${users.length} users at START of job`);
    }

    for (const transaction of transactions) {
      try {
        // Get current market price from Finnhub (once per transaction)
        const quote = await finnhubService.getQuote(transaction.ticker);
        if (!quote || !quote.currentPrice) {
          filteredNoQuote++;
          log(`[OpeninsiderFetch] Could not get quote for ${transaction.ticker}, skipping`);
          continue;
        }

        // Fetch company profile, market cap, and news
        const stockData = await finnhubService.getBatchStockData([transaction.ticker]);
        const data = stockData.get(transaction.ticker);

        // Apply market cap filter
        if (!data?.marketCap || data.marketCap < minMarketCap) {
          filteredMarketCap++;
          log(`[OpeninsiderFetch] ${transaction.ticker} market cap too low: $${data?.marketCap || 0}M (need >$${minMarketCap}M), skipping`);
          continue;
        }

        // Apply options deal filter ONLY to BUY transactions
        if (transaction.recommendation === "buy") {
          const insiderPriceNum = transaction.price;
          const thresholdPercent = optionsDealThreshold / 100;
          if (optionsDealThreshold > 0 && insiderPriceNum < quote.currentPrice * thresholdPercent) {
            filteredOptionsDeals++;
            log(`[OpeninsiderFetch] ${transaction.ticker} likely options deal: insider price $${insiderPriceNum.toFixed(2)} < ${optionsDealThreshold}% of market $${quote.currentPrice.toFixed(2)}, skipping`);
            continue;
          }
        }

        // Create stock for ALL users (shared market data)
        for (const user of users) {
          // Check if transaction already exists for this user
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

          // Create stock recommendation for this user
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
            priceHistory: [],
          });
        }

        createdCount++;
        createdTickers.add(transaction.ticker);
        log(`[OpeninsiderFetch] Created stock recommendation for ${transaction.ticker}`);

        // Send Telegram notification using transaction data
        if (ENABLE_TELEGRAM && telegramNotificationService && telegramNotificationService.isReady()) {
          try {
            const notificationSent = await telegramNotificationService.sendStockAlert({
              ticker: transaction.ticker,
              companyName: transaction.companyName || transaction.ticker,
              recommendation: transaction.recommendation || 'buy',
              currentPrice: quote.currentPrice.toString(),
              insiderPrice: transaction.price.toString(),
              insiderQuantity: transaction.quantity,
              confidenceScore: transaction.confidence || 75,
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

    // Queue ONE AI analysis job per unique ticker (not per transaction)
    if (createdTickers.size > 0) {
      const uniqueTickersArray = Array.from(createdTickers);
      log(`[OpeninsiderFetch] Queuing AI analysis for ${uniqueTickersArray.length} unique tickers...`);
      for (const ticker of uniqueTickersArray) {
        try {
          await storage.enqueueAnalysisJob(ticker, "openinsider_fetch", "normal");
          log(`[OpeninsiderFetch] ✓ Queued AI analysis for ${ticker}`);
        } catch (error) {
          console.error(`[OpeninsiderFetch] Failed to queue AI analysis for ${ticker}:`, error);
        }
      }
    }

    log(`\n[OpeninsiderFetch] ======= STAGE 2: Backend Post-Processing =======`);
    log(`[OpeninsiderFetch] Starting with: ${transactions.length} transactions`);
    log(`[OpeninsiderFetch]   ⊗ Duplicates: ${filteredDuplicates}`);
    log(`[OpeninsiderFetch]   ⊗ Market cap < $${minMarketCap}M: ${filteredMarketCap}`);
    log(`[OpeninsiderFetch]   ⊗ Options deals (< ${optionsDealThreshold}%): ${filteredOptionsDeals}`);
    log(`[OpeninsiderFetch]   ⊗ No quote: ${filteredNoQuote}`);
    log(`[OpeninsiderFetch] → Total Stage 2 filtered: ${filteredDuplicates + filteredMarketCap + filteredOptionsDeals + filteredNoQuote}`);
    log(`[OpeninsiderFetch] ===============================================`);
    log(`\n[OpeninsiderFetch] ✓ Successfully created ${createdCount} new recommendations (${createdTickers.size} unique tickers)\n`);

    await storage.updateOpeninsiderSyncStatus();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[OpeninsiderFetch] Error fetching OpenInsider data:", error);
    await storage.updateOpeninsiderSyncStatus(errorMessage);
  } finally {
    // Release mutex
    isJobRunning = false;
  }
}

/**
 * Start the OpenInsider fetch job scheduler
 * Runs immediately on startup, then hourly or daily based on config
 */
export function startOpeninsiderFetchJob(storage: IStorage): void {
  // Run immediately on startup
  runOpeninsiderFetch(storage).catch(err => {
    console.error("[OpeninsiderFetch] Initial fetch failed:", err);
  });

  // Determine interval based on config
  async function getInterval() {
    const config = await storage.getOpeninsiderConfig();
    return config?.fetchInterval === "daily" ? ONE_DAY : ONE_HOUR;
  }

  // Set up interval job
  getInterval().then(interval => {
    setInterval(() => {
      runOpeninsiderFetch(storage);
    }, interval);
    const intervalName = interval === ONE_DAY ? "daily" : "hourly";
    log(`[OpeninsiderFetch] Background job started - fetching ${intervalName}`);
  });
}
