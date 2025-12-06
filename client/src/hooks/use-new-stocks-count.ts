import { useQuery } from "@tanstack/react-query";
import { useUser } from "@/contexts/UserContext";

// Match the Purchase page's type definition
type StockWithUserStatus = {
  ticker: string;
  recommendation?: string;
  userStatus?: string;
  [key: string]: any;
};

/**
 * Hook to track and count new HIGH SIGNAL opportunities that haven't been viewed yet
 * High signal = stocks with score >= 70 in the "worthExploring" funnel section
 * Respects user's "Buy Only / All Opportunities" preference
 * Uses database viewedTickers for per-user, per-stock tracking
 * 
 * CRITICAL: Uses same data source as Purchase page (/api/stocks/with-user-status)
 * to ensure rejected stocks and user filters are properly applied
 */
export function useNewStocksCount(showAllOpportunities: boolean = false) {
  const { user } = useUser();
  
  const { data: stocks = [] } = useQuery<StockWithUserStatus[]>({
    queryKey: ["/api/stocks/with-user-status"],
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    refetchOnWindowFocus: true, // Refresh when user returns to tab
  });

  const { data: analyses = [] } = useQuery<any[]>({
    queryKey: ["/api/stock-analyses"],
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  const { data: viewedTickers = [] } = useQuery<string[]>({
    queryKey: ["/api/stock-views", user?.id],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  // Group stocks by ticker (same as Purchase page does)
  // Multiple insider transactions for same ticker = 1 opportunity
  const tickerMap = new Map<string, typeof stocks[0]>();
  
  for (const stock of stocks) {
    const existing = tickerMap.get(stock.ticker);
    if (!existing) {
      tickerMap.set(stock.ticker, stock);
    }
  }
  
  // Count NEW high signal TICKERS (grouped, not individual transactions)
  // This matches the "High Signal" (worthExploring) filter criteria on the purchase page
  const newCount = Array.from(tickerMap.values()).filter((stock) => {
    // Exclude rejected stocks (user has explicitly dismissed these)
    if (stock.userStatus === "rejected") return false;
    
    const rec = stock.recommendation?.toLowerCase();
    if (!rec) return false;
    
    // Respect user's preference: if showAllOpportunities is false, only count BUY recommendations
    if (showAllOpportunities) {
      if (!rec.includes("buy") && !rec.includes("sell")) return false;
    } else {
      if (!rec.includes("buy")) return false;
    }
    
    // Get AI analysis for this stock - must have analysis to be in High Signal filter
    const analysis = analyses.find((a: any) => a.ticker === stock.ticker);
    if (!analysis) return false; // No analysis = can't be High Signal yet
    
    // Check integrated score (preferred) or fall back to aiScore
    // NOTE: Must match Purchase page funnel logic - do not use confidenceScore
    const score = analysis.integratedScore ?? analysis.aiScore;
    
    // Only count HIGH SIGNAL opportunities (>= 70)
    // This exactly matches the worthExploring funnel section criteria on purchase page
    if (score == null || score < 70) return false;
    
    // Exclude already viewed stocks
    if (viewedTickers.includes(stock.ticker)) return false;
    
    return true;
  }).length;

  return newCount;
}
