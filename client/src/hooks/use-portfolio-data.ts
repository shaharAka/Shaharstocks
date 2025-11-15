import { useQuery } from "@tanstack/react-query";
import type { PortfolioHolding, Stock, Trade, TradingRule } from "@shared/schema";
import { stockSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useUser } from "@/contexts/UserContext";

export function usePortfolioHoldings() {
  return useQuery<PortfolioHolding[]>({
    queryKey: ["/api/portfolio/holdings"],
    refetchInterval: 300000, // Refetch every 5 minutes
  });
}

export function useStocks() {
  return useQuery<Stock[]>({
    queryKey: ["/api/stocks"],
    queryFn: async () => {
      const stocks = await apiRequest("GET", "/api/stocks", {});
      return stockSchema.array().parse(stocks);
    },
    refetchInterval: 300000, // Refetch every 5 minutes
  });
}

export function useTradingRules() {
  const { user } = useUser();
  return useQuery<TradingRule[]>({
    queryKey: ["/api/rules", user?.id],
    refetchInterval: 300000, // Refetch every 5 minutes
    enabled: !!user,
  });
}

export function useTrades() {
  return useQuery<Trade[]>({
    queryKey: ["/api/trades"],
  });
}
