import { useQuery } from "@tanstack/react-query";
import { useUser } from "@/contexts/UserContext";

/**
 * Hook to count NEW opportunities in the HIGH SIGNAL filter
 * Returns EXACTLY the count of unviewed, high-signal opportunities the user sees
 * based on their Buy Only/All toggle selection
 * 
 * Uses same data source and filtering as Purchase page to ensure perfect alignment
 */
export function useNewStocksCount(showAllOpportunities: boolean = false) {
  const { user } = useUser();
  
  const { data: stocks = [] } = useQuery<any[]>({
    queryKey: ["/api/stocks/with-user-status"],
  });

  const { data: analyses = [] } = useQuery<any[]>({
    queryKey: ["/api/stock-analyses"],
  });

  const { data: viewedTickers = [] } = useQuery<string[]>({
    queryKey: ["/api/stock-views", user?.id],
    enabled: !!user,
  });

  const { data: openinsiderConfig } = useQuery<any>({
    queryKey: ["/api/openinsider-config"],
  });

  // Apply EXACT same filtering as Purchase page (lines 307-350)
  const filtered = stocks.filter(stock => {
    // Exclude rejected stocks (user has explicitly dismissed these)
    if (stock.userStatus === "rejected") return false;
    
    const rec = stock.recommendation?.toLowerCase();
    if (!rec || (!rec.includes("buy") && !rec.includes("sell"))) return false;
    
    // Apply recommendation filter: Buy Only (default) or All (Buy + Sell)
    if (!showAllOpportunities && !rec.includes("buy")) {
      return false; // Filter out SELL when "Buy Only" mode is active
    }
    
    // Runtime filter: Exclude BUY opportunities that are likely options deals
    const insiderOptionsPercentThreshold = openinsiderConfig?.insiderOptionsPercentThreshold ?? 0.15;
    if (rec.includes("buy") && stock.insiderPrice && stock.currentPrice) {
      const priceChangePercent = Math.abs((parseFloat(stock.currentPrice) - parseFloat(stock.insiderPrice)) / parseFloat(stock.insiderPrice));
      if (priceChangePercent > insiderOptionsPercentThreshold) {
        return false;
      }
    }
    
    // Apply market cap filter from user config
    const marketCapFilterEnabled = openinsiderConfig?.marketCapFilterEnabled ?? false;
    const minMarketCap = openinsiderConfig?.minMarketCap;
    if (marketCapFilterEnabled && minMarketCap) {
      const parseMarketCap = (cap: string) => {
        if (!cap) return 0;
        const match = cap.match(/([\d.]+)([BMK]?)/);
        if (!match) return 0;
        const value = parseFloat(match[1]);
        const unit = match[2]?.toUpperCase();
        if (unit === "B") return value * 1000;
        if (unit === "M") return value;
        if (unit === "K") return value / 1000;
        return value;
      };
      if (parseMarketCap(stock.marketCap) < minMarketCap) {
        return false;
      }
    }
    
    return true;
  });

  // Group by ticker (Purchase page lines 354-393)
  const grouped = new Map();
  for (const stock of filtered) {
    const existing = grouped.get(stock.ticker);
    if (existing) {
      existing.transactions.push(stock);
      const analysis = analyses.find((a: any) => a.ticker === stock.ticker);
      const score = analysis?.integratedScore ?? analysis?.aiScore ?? 0;
      if (score > existing.highestScore) {
        existing.highestScore = score;
      }
    } else {
      const analysis = analyses.find((a: any) => a.ticker === stock.ticker);
      grouped.set(stock.ticker, {
        ticker: stock.ticker,
        transactions: [stock],
        highestScore: analysis?.integratedScore ?? analysis?.aiScore ?? 0,
      });
    }
  }

  // Filter for High Signal (score >= 70) and exclude viewed
  const newCount = Array.from(grouped.values()).filter((group) => {
    const hasAnalysis = analyses.find((a: any) => a.ticker === group.ticker);
    if (!hasAnalysis) return false; // No analysis = not High Signal yet
    
    const score = group.highestScore;
    if (score < 70) return false; // Only High Signal (>= 70)
    
    if (viewedTickers.includes(group.ticker)) return false; // Exclude viewed
    
    return true;
  }).length;

  return newCount;
}
