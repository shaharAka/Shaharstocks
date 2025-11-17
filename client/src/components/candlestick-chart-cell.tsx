import { useCandlestickData } from "@/hooks/use-candlestick-data";
import { MiniCandlestickChart } from "@/components/mini-candlestick-chart";

interface CandlestickChartCellProps {
  ticker: string;
  height?: number;
}

export function CandlestickChartCell({ ticker, height = 48 }: CandlestickChartCellProps) {
  const { data: candlestickData, isLoading } = useCandlestickData(ticker);

  if (isLoading) {
    return <span className="text-xs text-muted-foreground">Loading...</span>;
  }

  if (!candlestickData?.candlestickData || candlestickData.candlestickData.length === 0) {
    return <span className="text-xs text-muted-foreground">-</span>;
  }

  return (
    <div style={{ height: `${height}px` }}>
      <MiniCandlestickChart data={candlestickData.candlestickData} height={height} />
    </div>
  );
}
