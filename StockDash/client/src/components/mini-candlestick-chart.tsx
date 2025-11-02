import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";

interface CandleData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface MiniCandlestickChartProps {
  data: CandleData[];
  height?: number;
}

export function MiniCandlestickChart({ data, height = 60 }: MiniCandlestickChartProps) {
  if (!data || data.length === 0) {
    return null;
  }

  // Determine if the overall trend is up or down
  const firstClose = data[0]?.close || 0;
  const lastClose = data[data.length - 1]?.close || 0;
  const isPositive = lastClose >= firstClose;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
        <YAxis domain={['dataMin', 'dataMax']} hide />
        <Line
          type="monotone"
          dataKey="close"
          stroke={isPositive ? "hsl(var(--success))" : "hsl(var(--destructive))"}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
