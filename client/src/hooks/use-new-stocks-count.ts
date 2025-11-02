import { useQuery } from "@tanstack/react-query";
import type { Stock } from "@shared/schema";

const LAST_VIEWED_KEY = "purchase-last-viewed";

/**
 * Hook to track and count new stocks that haven't been seen yet
 */
export function useNewStocksCount() {
  const { data: stocks = [] } = useQuery<Stock[]>({
    queryKey: ["/api/stocks"],
  });

  // Get the last time user viewed the Purchase page
  const lastViewed = localStorage.getItem(LAST_VIEWED_KEY);
  const lastViewedDate = lastViewed ? new Date(lastViewed) : null;

  // Count stocks created after last view and with recommendation "buy" (pending purchase)
  const newCount = stocks.filter((stock) => {
    if (stock.recommendation !== "buy") return false;
    if (!lastViewedDate) return true; // First time viewing - all are new
    
    // Use insider trade date as the creation time
    if (!stock.insiderTradeDate) return false;
    const stockCreatedAt = new Date(stock.insiderTradeDate);
    return stockCreatedAt > lastViewedDate;
  }).length;

  return newCount;
}

/**
 * Mark the Purchase page as viewed (call this when user visits the page)
 */
export function markPurchaseAsViewed() {
  localStorage.setItem(LAST_VIEWED_KEY, new Date().toISOString());
}
