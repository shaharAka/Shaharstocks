import { storage } from "../storage";
import { finnhubService } from "../finnhubService";
import { openinsiderService } from "../openinsiderService";

/**
 * Check if US stock market is currently open
 * Market hours: 9:30 AM - 4:00 PM ET, Monday-Friday
 */
export function isMarketOpen(): boolean {
  const now = new Date();
  
  // Convert to Eastern Time
  const etTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  
  // Check if weekend
  const day = etTime.getDay();
  if (day === 0 || day === 6) {
    return false; // Sunday or Saturday
  }
  
  // Check market hours (9:30 AM - 4:00 PM ET)
  const hours = etTime.getHours();
  const minutes = etTime.getMinutes();
  const timeInMinutes = hours * 60 + minutes;
  
  const marketOpen = 9 * 60 + 30;  // 9:30 AM
  const marketClose = 16 * 60;     // 4:00 PM
  
  return timeInMinutes >= marketOpen && timeInMinutes < marketClose;
}

// Helper function to fetch initial OpenInsider data for new users
export async function fetchInitialDataForUser(userId: string): Promise<void> {
  try {
    console.log(`[InitialDataFetch] Starting initial data fetch for user ${userId}...`);
    
    // Fetch BOTH purchases and sales (500 each) for comprehensive initial dataset
    const [purchasesResponse, salesResponse] = await Promise.all([
      openinsiderService.fetchInsiderPurchases(500, undefined, "P"),
      openinsiderService.fetchInsiderSales(500, undefined)
    ]);
    
    // Merge transactions from both sources
    const transactions = [...purchasesResponse.transactions, ...salesResponse.transactions];
    
    // Merge stats for logging
    const scraperResponse = {
      transactions,
      stats: {
        total_rows_scraped: purchasesResponse.stats.total_rows_scraped + salesResponse.stats.total_rows_scraped,
        filtered_not_purchase: purchasesResponse.stats.filtered_not_purchase + salesResponse.stats.filtered_not_purchase,
        filtered_invalid_data: purchasesResponse.stats.filtered_invalid_data + salesResponse.stats.filtered_invalid_data,
        filtered_by_date: purchasesResponse.stats.filtered_by_date + salesResponse.stats.filtered_by_date,
        filtered_by_title: purchasesResponse.stats.filtered_by_title + salesResponse.stats.filtered_by_title,
        filtered_by_transaction_value: purchasesResponse.stats.filtered_by_transaction_value + salesResponse.stats.filtered_by_transaction_value,
        filtered_by_insider_name: purchasesResponse.stats.filtered_by_insider_name + salesResponse.stats.filtered_by_insider_name,
      }
    };
    
    console.log(`[InitialDataFetch] Fetched ${purchasesResponse.transactions.length} purchases + ${salesResponse.transactions.length} sales = ${transactions.length} total`);
    
    if (transactions.length === 0) {
      console.log(`[InitialDataFetch] No transactions found for user ${userId}`);
      await storage.markUserInitialDataFetched(userId);
      return;
    }

    const totalStage1Filtered = scraperResponse.stats.filtered_by_title + scraperResponse.stats.filtered_by_transaction_value + 
                                 scraperResponse.stats.filtered_by_date + scraperResponse.stats.filtered_not_purchase + 
                                 scraperResponse.stats.filtered_invalid_data;
    
    console.log(`[InitialDataFetch] ======= STAGE 1: Python Scraper Filters =======`);
    console.log(`[InitialDataFetch] Total rows scraped: ${scraperResponse.stats.total_rows_scraped}`);
    console.log(`[InitialDataFetch]   • Not a purchase / Invalid: ${scraperResponse.stats.filtered_not_purchase + scraperResponse.stats.filtered_invalid_data}`);
    console.log(`[InitialDataFetch]   • Filtered by date: ${scraperResponse.stats.filtered_by_date}`);
    console.log(`[InitialDataFetch]   • Filtered by title: ${scraperResponse.stats.filtered_by_title}`);
    console.log(`[InitialDataFetch]   • Filtered by transaction value: ${scraperResponse.stats.filtered_by_transaction_value}`);
    console.log(`[InitialDataFetch] → Total Stage 1 filtered: ${totalStage1Filtered}`);
    console.log(`[InitialDataFetch] → Returned ${transactions.length} matching transactions`);
    console.log(`[InitialDataFetch] ===================================================`);
    
    // Convert transactions to stock recommendations
    let createdCount = 0;
    let filteredMarketCap = 0;
    let filteredOptionsDeals = 0;
    let filteredAlreadyExists = 0;
    let filteredNoQuote = 0;
    
    for (const transaction of transactions) {
      try {
        // Check if this exact transaction already exists using composite key
        const existingTransaction = await storage.getTransactionByCompositeKey(
          userId, // Per-user tenant isolation
          transaction.ticker,
          transaction.filingDate,
          transaction.insiderName,
          transaction.recommendation // Use actual recommendation (buy or sell)
        );
        
        if (existingTransaction) {
          filteredAlreadyExists++;
          continue;
        }

        // Get current market price from Finnhub
        const quote = await finnhubService.getQuote(transaction.ticker);
        if (!quote || !quote.currentPrice) {
          filteredNoQuote++;
          console.log(`[InitialDataFetch] ${transaction.ticker} no quote available, skipping`);
          continue;
        }

        // Fetch company profile, market cap, and news
        const stockData = await finnhubService.getBatchStockData([transaction.ticker]);
        const data = stockData.get(transaction.ticker);
        
        // Apply market cap filter (must be > $500M)
        const marketCapValue = data?.marketCap ? data.marketCap * 1_000_000 : 0;
        if (marketCapValue < 500_000_000) {
          filteredMarketCap++;
          console.log(`[InitialDataFetch] ${transaction.ticker} market cap too low: $${(marketCapValue / 1_000_000).toFixed(1)}M, skipping`);
          continue;
        }
        
        // Apply options deal filter ONLY to BUY transactions (insider price should be >= 15% of current price)
        if (transaction.recommendation === "buy") {
          const insiderPriceNum = transaction.price;
          if (insiderPriceNum < quote.currentPrice * 0.15) {
            filteredOptionsDeals++;
            console.log(`[InitialDataFetch] ${transaction.ticker} likely options deal (insider: $${insiderPriceNum.toFixed(2)} < 15% of market: $${quote.currentPrice.toFixed(2)}), skipping`);
            continue;
          }
        }

        // Create stock recommendation with complete information (per-user tenant isolation)
        await storage.createStock({
          userId, // Per-user tenant isolation - this stock belongs to this user only
          ticker: transaction.ticker,
          companyName: transaction.companyName || transaction.ticker,
          currentPrice: quote.currentPrice.toString(),
          previousClose: quote.previousClose?.toString() || quote.currentPrice.toString(),
          insiderPrice: transaction.price.toString(),
          insiderQuantity: transaction.quantity,
          insiderTradeDate: transaction.filingDate,
          insiderName: transaction.insiderName,
          insiderTitle: transaction.insiderTitle,
          recommendation: transaction.recommendation, // Use actual recommendation (buy or sell)
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

        createdCount++;
      } catch (err) {
        console.error(`[InitialDataFetch] Error processing ${transaction.ticker}:`, err);
      }
    }

    console.log(`\n[InitialDataFetch] ======= STAGE 2: Backend Post-Processing =======`);
    console.log(`[InitialDataFetch] Starting with: ${transactions.length} transactions`);
    console.log(`[InitialDataFetch]   ⊗ Already exists: ${filteredAlreadyExists}`);
    console.log(`[InitialDataFetch]   ⊗ Market cap < $500M: ${filteredMarketCap}`);
    console.log(`[InitialDataFetch]   ⊗ Options deals (< 15%): ${filteredOptionsDeals}`);
    console.log(`[InitialDataFetch]   ⊗ No quote: ${filteredNoQuote}`);
    console.log(`[InitialDataFetch] → Total Stage 2 filtered: ${filteredAlreadyExists + filteredMarketCap + filteredOptionsDeals + filteredNoQuote}`);
    console.log(`[InitialDataFetch] ===================================================`);
    console.log(`\n[InitialDataFetch] ✓ Successfully created ${createdCount} new recommendations for user ${userId}\n`);
    
    // Mark user as having initial data fetched
    await storage.markUserInitialDataFetched(userId);
    
  } catch (error) {
    console.error(`[InitialDataFetch] Error fetching initial data for user ${userId}:`, error);
    // Don't throw - this is a background operation
  }
}

