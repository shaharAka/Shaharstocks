import { useQuery } from "@tanstack/react-query";
import type { Stock } from "@shared/schema";

const LAST_VIEWED_KEY = "purchase-last-viewed";

/**
 * Hook to track and count new high-score opportunities that haven't been seen yet
 */
export function useNewStocksCount() {
  const { data: stocks = [] } = useQuery<Stock[]>({
    queryKey: ["/api/stocks"],
  });

  const { data: analyses = [] } = useQuery<any[]>({
    queryKey: ["/api/stock-analyses"],
  });

  // Get the last time user viewed the Purchase page
  const lastViewed = localStorage.getItem(LAST_VIEWED_KEY);
  const lastViewedDate = lastViewed ? new Date(lastViewed) : null;

  // Count NEW high-score stocks (BUY or SELL with score >= 70) since last view
  const newCount = stocks.filter((stock) => {
    const rec = stock.recommendation?.toLowerCase();
    if (!rec || (!rec.includes("buy") && !rec.includes("sell"))) return false;
    
    // Get AI analysis for this stock
    const analysis = analyses.find((a: any) => a.ticker === stock.ticker);
    const score = analysis?.integratedScore ?? analysis?.aiScore;
    
    // Only count high-score opportunities (>= 70)
    if (!score || score < 70) return false;
    
    if (!lastViewedDate) return true; // First time viewing - all are new
    
    // Use analysis completion time to determine if it's "new"
    if (!analysis?.updatedAt) return false;
    const analysisCompletedAt = new Date(analysis.updatedAt);
    return analysisCompletedAt > lastViewedDate;
  }).length;

  return newCount;
}

/**
 * Mark the Purchase page as viewed (call this when user visits the page)
 */
export function markPurchaseAsViewed() {
  localStorage.setItem(LAST_VIEWED_KEY, new Date().toISOString());
}
