import { useQuery } from "@tanstack/react-query";
import type { Stock } from "@shared/schema";
import { useUser } from "@/contexts/UserContext";

/**
 * Hook to track and count new HIGH SIGNAL opportunities that haven't been viewed yet
 * High signal = stocks with score >= 70 in the "worthExploring" funnel section
 * Respects user's "Buy Only / All Opportunities" preference
 * Uses database viewedTickers for per-user, per-stock tracking
 */
export function useNewStocksCount(showAllOpportunities: boolean = false) {
  const { user } = useUser();
  
  const { data: stocks = [] } = useQuery<Stock[]>({
    queryKey: ["/api/stocks"],
  });

  const { data: analyses = [] } = useQuery<any[]>({
    queryKey: ["/api/stock-analyses"],
  });

  const { data: viewedTickers = [] } = useQuery<string[]>({
    queryKey: ["/api/stock-views", user?.id],
    enabled: !!user,
  });

  // Count NEW high signal stocks (BUY or SELL with score >= 70) that haven't been viewed
  // This matches the "High Signal" (worthExploring) filter criteria on the purchase page
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
    
    // Only count HIGH SIGNAL opportunities (>= 70)
    // This matches the worthExploring funnel section criteria
    if (!score || score < 70) return false;
    
    // Exclude already viewed stocks
    if (viewedTickers.includes(stock.ticker)) return false;
    
    return true;
  }).length;

  return newCount;
}
