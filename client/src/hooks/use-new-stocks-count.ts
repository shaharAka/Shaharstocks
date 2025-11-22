import { useQuery } from "@tanstack/react-query";
import type { Stock } from "@shared/schema";

const LAST_VIEWED_KEY = "purchase-last-viewed";

/**
 * Hook to track and count new HIGH SIGNAL opportunities that haven't been seen yet
 * High signal = stocks with very strong AI scores (>= 80) indicating AI strongly agrees with insider action
 * Respects user's "Buy Only / All Opportunities" preference
 */
export function useNewStocksCount(showAllOpportunities: boolean = false) {
  const { data: stocks = [] } = useQuery<Stock[]>({
    queryKey: ["/api/stocks"],
  });

  const { data: analyses = [] } = useQuery<any[]>({
    queryKey: ["/api/stock-analyses"],
  });

  // Get the last time user viewed the Purchase page
  const lastViewed = localStorage.getItem(LAST_VIEWED_KEY);
  const lastViewedDate = lastViewed ? new Date(lastViewed) : null;

  // Count NEW high signal stocks (BUY or SELL with score >= 80) since last view
  // Score >= 80 indicates AI strongly agrees with insider action (high confidence)
  const newCount = stocks.filter((stock) => {
    const rec = stock.recommendation?.toLowerCase();
    if (!rec) return false;
    
    // Respect user's preference: if showAllOpportunities is false, only count BUY recommendations
    if (showAllOpportunities) {
      if (!rec.includes("buy") && !rec.includes("sell")) return false;
    } else {
      if (!rec.includes("buy")) return false;
    }
    
    // Get AI analysis for this stock
    const analysis = analyses.find((a: any) => a.ticker === stock.ticker);
    const score = analysis?.integratedScore ?? analysis?.aiScore;
    
    // Only count HIGH SIGNAL opportunities (>= 80)
    // This represents stocks where AI strongly agrees with insider action
    if (!score || score < 80) return false;
    
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
