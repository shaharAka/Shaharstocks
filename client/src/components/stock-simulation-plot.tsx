import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Bell, BellOff, X } from "lucide-react";
import { type Stock, type TradingRule, type Trade } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface StockSimulationPlotProps {
  ticker: string;
  stock: Stock;
}

export function StockSimulationPlot({ ticker, stock }: StockSimulationPlotProps) {
  const { toast } = useToast();
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [ruleAction, setRuleAction] = useState<"sell" | "sell_all">("sell");
  const [conditionMetric, setConditionMetric] = useState<"price_change_percent" | "price_absolute">("price_change_percent");
  const [conditionValue, setConditionValue] = useState("");
  const [enableNotifications, setEnableNotifications] = useState(true);

  const { data: rules, isLoading: rulesLoading } = useQuery<TradingRule[]>({
    queryKey: ["/api/rules"],
  });

  const createRuleMutation = useMutation({
    mutationFn: async (newRule: any) => {
      return await apiRequest("POST", "/api/rules", newRule);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rules"] });
      toast({
        title: "Trading rule created",
        description: `Rule created for ${ticker}${enableNotifications ? ' with notifications enabled' : ''}`,
      });
      setShowRuleForm(false);
      setConditionValue("");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create rule",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: async (ruleId: string) => {
      return await apiRequest("DELETE", `/api/rules/${ruleId}`, null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rules"] });
      toast({
        title: "Trading rule deleted",
        description: "The trading rule has been removed",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete rule",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
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
  
  // Calculate P&L
  const currentPrice = parseFloat(stock.currentPrice);
  const unrealizedPnL = holding && purchasePrice ? (currentPrice - purchasePrice) * holding.shares : null;
  const unrealizedPnLPercent = holding && purchasePrice ? ((currentPrice - purchasePrice) / purchasePrice) * 100 : null;

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
    if (!rules) return [];

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

      if (condition.metric === "price_change_percent") {
        // Use stored baseline, or purchase price, or current price as fallback
        const basePrice = (condition as any).baselinePrice || purchasePrice || parseFloat(stock.currentPrice);
        boundaryPrice = basePrice * (1 + condition.value / 100);
      } else if (condition.metric === "price_change_from_close_percent") {
        const previousClose = parseFloat(stock.previousClose || stock.currentPrice);
        boundaryPrice = previousClose * (1 + condition.value / 100);
      } else if (condition.metric === "price_absolute") {
        // Absolute price rules work without a position
        boundaryPrice = condition.value;
      }

      if (boundaryPrice > 0) {
        const label = `${condition.metric === "price_change_percent" ? `${condition.value > 0 ? '+' : ''}${condition.value}%` : `$${condition.value}`}`;
        lines.push({ rule, price: boundaryPrice, label });
      }
    });

    return lines;
  }, [rules, ticker, purchasePrice, stock]);

  const handleCreateRule = () => {
    const value = parseFloat(conditionValue);
    if (isNaN(value)) {
      toast({
        title: "Invalid value",
        description: "Please enter a valid number",
        variant: "destructive",
      });
      return;
    }

    // For percentage: keep signed value; for absolute price: use positive value
    const conditionValue_normalized = conditionMetric === "price_change_percent" ? value : Math.abs(value);
    
    // Operator based on sign for percentage, or default for absolute price
    let operator: "greater_than_or_equal" | "less_than_or_equal";
    if (conditionMetric === "price_change_percent") {
      operator = value >= 0 ? "greater_than_or_equal" : "less_than_or_equal";
    } else {
      // For absolute price, use <= for sell (price falls below threshold)
      operator = "less_than_or_equal";
    }

    // For percentage rules, store the baseline price (purchase price or current price)
    const baselinePrice = conditionMetric === 'price_change_percent' 
      ? (purchasePrice || parseFloat(stock.currentPrice))
      : undefined;

    const newRule = {
      name: `${ticker} ${ruleAction} at ${conditionMetric === 'price_change_percent' ? `${value > 0 ? '+' : ''}${value}%` : `$${conditionValue_normalized}`}`,
      scope: "specific_stock" as const,
      ticker,
      action: ruleAction,
      conditions: [
        {
          metric: conditionMetric,
          operator,
          value: conditionValue_normalized,
          baselinePrice, // Store baseline for percentage rules
        },
      ],
      enabled: true,
      notifyOnTrigger: enableNotifications,
    };

    createRuleMutation.mutate(newRule);
  };

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
          <div className="flex items-center gap-4 text-sm">
            <span className="text-muted-foreground">
              Entry: ${purchasePrice.toFixed(2)} {purchaseDate && `on ${purchaseDate.toISOString().split('T')[0]}`}
            </span>
            {unrealizedPnL !== null && unrealizedPnLPercent !== null && (
              <div className={`flex items-center gap-1 font-medium ${unrealizedPnL >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                <span data-testid="text-unrealized-pnl">
                  {unrealizedPnL >= 0 ? '+' : ''}${unrealizedPnL.toFixed(2)} ({unrealizedPnL >= 0 ? '+' : ''}{unrealizedPnLPercent.toFixed(2)}%)
                </span>
                <Badge variant={unrealizedPnL >= 0 ? "default" : "destructive"} className="text-xs">
                  Unrealized P&L
                </Badge>
              </div>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(var(--border))" />
            <XAxis 
              dataKey="date" 
              stroke="oklch(var(--muted-foreground))"
              tick={{ fill: "oklch(var(--foreground))", fontSize: 12 }}
              tickFormatter={(value) => {
                const date = new Date(value);
                return `${date.getMonth() + 1}/${date.getDate()}`;
              }}
            />
            <YAxis 
              stroke="oklch(var(--muted-foreground))"
              tick={{ fill: "oklch(var(--foreground))", fontSize: 12 }}
              tickFormatter={(value) => `$${value.toFixed(0)}`}
              domain={['auto', 'auto']}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "oklch(var(--popover))",
                border: "1px solid oklch(var(--border))",
                borderRadius: "6px",
                color: "oklch(var(--popover-foreground))",
              }}
              labelFormatter={(value) => {
                const date = new Date(value as string);
                return date.toLocaleDateString();
              }}
              formatter={(value: any) => [`$${Number(value).toFixed(2)}`, "Price"]}
            />
            <Legend wrapperStyle={{ color: "oklch(var(--foreground))" }} />
            
            {/* Purchase price line */}
            {purchasePrice && (
              <ReferenceLine
                y={purchasePrice}
                stroke="oklch(var(--primary))"
                strokeDasharray="5 5"
                label={{
                  value: `Entry: $${purchasePrice.toFixed(2)}`,
                  position: "insideTopRight",
                  fill: "oklch(var(--primary))",
                  fontSize: 12,
                }}
              />
            )}

            {/* Sell rule boundaries */}
            {sellRuleLines.map((line, index) => (
              <ReferenceLine
                key={index}
                y={line.price}
                stroke="oklch(var(--destructive))"
                strokeDasharray="3 3"
                label={{
                  value: `Sell ${line.label}`,
                  position: "insideTopRight",
                  fill: "oklch(var(--destructive))",
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

        {/* Inline Rule Creation */}
        <div className="mt-6 pt-4 border-t">
          {!showRuleForm ? (
            <Button
              onClick={() => setShowRuleForm(true)}
              variant="outline"
              size="sm"
              className="w-full"
              data-testid="button-add-rule"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Trading Rule for {ticker}
            </Button>
          ) : (
            <div className="space-y-4 p-4 bg-muted rounded-md">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Create Trading Rule</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowRuleForm(false)}
                  data-testid="button-cancel-rule"
                >
                  Cancel
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rule-action">Action</Label>
                  <Select value={ruleAction} onValueChange={(v) => setRuleAction(v as "sell" | "sell_all")}>
                    <SelectTrigger id="rule-action" data-testid="select-rule-action">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sell">Sell</SelectItem>
                      <SelectItem value="sell_all">Sell All</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="condition-metric">Condition</Label>
                  <Select value={conditionMetric} onValueChange={(v) => setConditionMetric(v as any)}>
                    <SelectTrigger id="condition-metric" data-testid="select-condition-metric">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="price_change_percent">Price Change %</SelectItem>
                      <SelectItem value="price_absolute">Absolute Price</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="condition-value">
                  {conditionMetric === "price_change_percent" ? "Percentage" : "Price"} {" "}
                  {conditionMetric === "price_change_percent" && "(e.g., 10 for +10%, -5 for -5%)"}
                </Label>
                <Input
                  id="condition-value"
                  type="number"
                  step={conditionMetric === "price_change_percent" ? "0.1" : "0.01"}
                  placeholder={conditionMetric === "price_change_percent" ? "Enter percentage" : "Enter price"}
                  value={conditionValue}
                  onChange={(e) => setConditionValue(e.target.value)}
                  data-testid="input-condition-value"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-background rounded-md border">
                <div className="flex items-center gap-2">
                  {enableNotifications ? (
                    <Bell className="h-4 w-4 text-primary" />
                  ) : (
                    <BellOff className="h-4 w-4 text-muted-foreground" />
                  )}
                  <div>
                    <Label htmlFor="enable-notifications" className="cursor-pointer">
                      Enable Notifications
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Get alerted when this rule triggers for {ticker}
                    </p>
                  </div>
                </div>
                <Switch
                  id="enable-notifications"
                  checked={enableNotifications}
                  onCheckedChange={setEnableNotifications}
                  data-testid="switch-notifications"
                />
              </div>

              <Button
                onClick={handleCreateRule}
                className="w-full"
                disabled={createRuleMutation.isPending || !conditionValue}
                data-testid="button-create-rule"
              >
                {createRuleMutation.isPending ? "Creating..." : "Create Rule"}
              </Button>
            </div>
          )}
        </div>

        {/* Rule indicators */}
        {sellRuleLines.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium">Active Trading Rules:</p>
            <div className="flex flex-wrap gap-2">
              {sellRuleLines.map((line, index) => (
                <div key={index} className="relative group">
                  <Badge variant="outline" className="pr-6" data-testid={`badge-rule-${line.rule.id}`}>
                    Sell at {line.label} (${line.price.toFixed(2)})
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => deleteRuleMutation.mutate(line.rule.id)}
                    disabled={deleteRuleMutation.isPending}
                    data-testid={`button-delete-rule-${line.rule.id}`}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
