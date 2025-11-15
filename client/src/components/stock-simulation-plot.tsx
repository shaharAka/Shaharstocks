import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { type Stock, type TradingRule, type Trade } from "@shared/schema";

interface StockSimulationPlotProps {
  ticker: string;
  stock: Stock;
}

export function StockSimulationPlot({ ticker, stock }: StockSimulationPlotProps) {
  const { data: rules, isLoading: rulesLoading } = useQuery<TradingRule[]>({
    queryKey: ["/api/rules"],
  });

  // Fetch both real and simulated holdings to support all use cases
  const { data: realHoldings } = useQuery<any[]>({
    queryKey: ["/api/portfolio/holdings"],
    retry: false,
    meta: { ignoreError: true },
  });

  const { data: simulatedHoldings } = useQuery<any[]>({
    queryKey: ["/api/portfolio/holdings", "simulated"],
    queryFn: async () => {
      const response = await fetch("/api/portfolio/holdings?simulated=true");
      if (!response.ok) return [];
      return response.json();
    },
    retry: false,
    meta: { ignoreError: true },
  });

  const { data: trades } = useQuery<Trade[]>({
    queryKey: ["/api/trades"],
    retry: false,
    meta: { ignoreError: true },
  });

  // Check both real and simulated holdings
  const holding = realHoldings?.find(h => h.ticker === ticker) || 
                  simulatedHoldings?.find(h => h.ticker === ticker);
  const purchasePrice = holding ? parseFloat(holding.averagePurchasePrice) : null;
  const isSimulated = !!simulatedHoldings?.find(h => h.ticker === ticker);

  // Find purchase date from trades
  const purchaseDate = useMemo(() => {
    if (!trades) return null;
    const buyTrades = trades.filter(t => t.ticker === ticker && t.type === "buy" && t.executedAt);
    if (buyTrades.length === 0) return null;
    const firstBuyTrade = buyTrades.sort((a, b) => 
      new Date(a.executedAt!).getTime() - new Date(b.executedAt!).getTime()
    )[0];
    return firstBuyTrade?.executedAt ? new Date(firstBuyTrade.executedAt) : null;
  }, [trades, ticker]);

  // Build chart data from candlesticks (convert to price points)
  const chartData = useMemo(() => {
    const candlesticks = (stock as any).candlesticks;
    if (!candlesticks || candlesticks.length === 0) return [];
    
    return candlesticks
      .filter((candle: any) => {
        // Only show data from purchase date onwards if user has a position
        if (!purchaseDate) return true;
        const pointDate = new Date(candle.date);
        return pointDate >= purchaseDate;
      })
      .map((candle: any) => ({
        date: candle.date,
        price: candle.close, // Use closing price
      }))
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [(stock as any).candlesticks, purchaseDate]);

  // Calculate sell rule boundaries
  const sellRuleLines = useMemo(() => {
    if (!rules || !holding) return [];

    const lines: Array<{
      rule: TradingRule;
      price: number;
      label: string;
    }> = [];

    const applicableRules = rules.filter(
      (rule) =>
        rule.enabled &&
        (rule.action === "sell" || rule.action === "sell_all") &&
        (rule.scope === "all_holdings" || 
         (rule.scope === "specific_stock" && rule.ticker === ticker))
    );

    applicableRules.forEach((rule) => {
      if (!rule.conditions || rule.conditions.length === 0) return;
      
      const condition = rule.conditions[0];
      let boundaryPrice = 0;

      if (condition.metric === "price_change_percent" && purchasePrice) {
        boundaryPrice = purchasePrice * (1 + condition.value / 100);
      } else if (condition.metric === "price_change_from_close_percent") {
        const previousClose = parseFloat(stock.previousClose || stock.currentPrice);
        boundaryPrice = previousClose * (1 + condition.value / 100);
      } else if (condition.metric === "price_absolute") {
        boundaryPrice = condition.value;
      }

      if (boundaryPrice > 0) {
        const label = `${condition.metric === "price_change_percent" ? `${condition.value > 0 ? '+' : ''}${condition.value}%` : `$${condition.value}`}`;
        lines.push({ rule, price: boundaryPrice, label });
      }
    });

    return lines;
  }, [rules, holding, ticker, purchasePrice, stock]);

  const candlesticks = (stock as any).candlesticks;
  if (!candlesticks || candlesticks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Price Simulation</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No price data available for simulation
          </p>
        </CardContent>
      </Card>
    );
  }

  if (rulesLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Price Simulation</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Price Simulation with Trading Rules</CardTitle>
          {holding && (
            <Badge variant={isSimulated ? "secondary" : "default"} data-testid="badge-position">
              {isSimulated ? "Simulated Position" : "Actual Position"}
            </Badge>
          )}
        </div>
        {purchasePrice && (
          <p className="text-sm text-muted-foreground">
            Entry: ${purchasePrice.toFixed(2)} {purchaseDate && `on ${purchaseDate.toISOString().split('T')[0]}`}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="date" 
              stroke="hsl(var(--muted-foreground))"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => {
                const date = new Date(value);
                return `${date.getMonth() + 1}/${date.getDate()}`;
              }}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `$${value.toFixed(0)}`}
              domain={['auto', 'auto']}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "6px",
              }}
              labelFormatter={(value) => {
                const date = new Date(value as string);
                return date.toLocaleDateString();
              }}
              formatter={(value: any) => [`$${Number(value).toFixed(2)}`, "Price"]}
            />
            <Legend />
            
            {/* Purchase price line */}
            {purchasePrice && (
              <ReferenceLine
                y={purchasePrice}
                stroke="hsl(var(--primary))"
                strokeDasharray="5 5"
                label={{
                  value: `Entry: $${purchasePrice.toFixed(2)}`,
                  position: "insideTopRight",
                  fill: "hsl(var(--primary))",
                  fontSize: 12,
                }}
              />
            )}

            {/* Sell rule boundaries */}
            {sellRuleLines.map((line, index) => (
              <ReferenceLine
                key={index}
                y={line.price}
                stroke="hsl(var(--destructive))"
                strokeDasharray="3 3"
                label={{
                  value: `Sell ${line.label}`,
                  position: "insideTopRight",
                  fill: "hsl(var(--destructive))",
                  fontSize: 12,
                }}
              />
            ))}

            {/* Price line */}
            <Line
              type="monotone"
              dataKey="price"
              stroke="oklch(var(--chart-1))"
              strokeWidth={2}
              dot={false}
              name={ticker}
            />
          </LineChart>
        </ResponsiveContainer>

        {/* Rule indicators */}
        {sellRuleLines.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium">Active Trading Rules:</p>
            <div className="flex flex-wrap gap-2">
              {sellRuleLines.map((line, index) => (
                <Badge key={index} variant="outline">
                  Sell at {line.label} (${line.price.toFixed(2)})
                </Badge>
              ))}
            </div>
          </div>
        )}

        {!holding && sellRuleLines.length === 0 && (
          <div className="mt-4 p-4 bg-muted rounded-md">
            <p className="text-sm text-muted-foreground">
              Create trading rules to see automated sell boundaries overlaid on the chart
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
