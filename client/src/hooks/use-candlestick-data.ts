import { useQuery } from "@tanstack/react-query";

interface CandlestickData {
  ticker: string;
  candlestickData: { 
    date: string; 
    open: number; 
    high: number; 
    low: number; 
    close: number; 
    volume: number 
  }[];
}

export function useCandlestickData(ticker: string | undefined) {
  return useQuery<CandlestickData>({
    queryKey: [`/api/stocks/${ticker}/candlesticks`],
    enabled: !!ticker,
    retry: false,
    meta: { ignoreError: true },
    staleTime: 1000 * 60 * 60, // Cache for 1 hour (candlestick data doesn't change often)
  });
}
