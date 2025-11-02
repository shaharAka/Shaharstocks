import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Activity, TrendingUp, TrendingDown, Edit2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type PortfolioHolding, type Stock, type TradingRule } from "@shared/schema";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Label as RechartsLabel,
  LabelList,
} from "recharts";

export default function Management() {
  const { toast } = useToast();
  const [editingRule, setEditingRule] = useState<TradingRule | null>(null);
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [newTriggerValue, setNewTriggerValue] = useState<number>(0);
  const [selectedTickers, setSelectedTickers] = useState<Set<string>>(new Set());
  const isInitialized = useRef(false);
  const [sellDialogOpen, setSellDialogOpen] = useState(false);
  const [selectedHolding, setSelectedHolding] = useState<PortfolioHolding | null>(null);
  const [sellQuantity, setSellQuantity] = useState<string>("");

  const { data: holdings, isLoading: holdingsLoading } = useQuery<PortfolioHolding[]>({
    queryKey: ["/api/portfolio/holdings"],
    refetchInterval: 300000, // Refetch every 5 minutes
  });

  const { data: stocks, isLoading: stocksLoading } = useQuery<Stock[]>({
    queryKey: ["/api/stocks"],
    refetchInterval: 300000, // Refetch every 5 minutes
  });

  const { data: rules, isLoading: rulesLoading } = useQuery<TradingRule[]>({
    queryKey: ["/api/rules"],
    refetchInterval: 300000, // Refetch every 5 minutes
  });

  const updateRuleMutation = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: number }) => {
      const rule = rules?.find(r => r.id === id);
      if (!rule || !rule.conditions || rule.conditions.length === 0) return;

      const updatedConditions = [...rule.conditions];
      updatedConditions[0] = {
        ...updatedConditions[0],
        value: value,
      };

      return await apiRequest("PATCH", `/api/rules/${id}`, {
        conditions: updatedConditions,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rules"] });
      toast({
        title: "Rule Updated",
        description: "Trading rule boundary has been updated successfully",
      });
      setRuleDialogOpen(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update trading rule",
        variant: "destructive",
      });
    },
  });

  const sellMutation = useMutation({
    mutationFn: async ({ ticker, quantity }: { ticker: string; quantity: number }) => {
      return await apiRequest("POST", `/api/ibkr/trade`, {
        ticker,
        action: "sell",
        quantity,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/holdings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stocks"] });
      toast({
        title: "Stock Sold",
        description: "Successfully sold shares",
      });
      setSellDialogOpen(false);
      setSelectedHolding(null);
      setSellQuantity("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to sell shares. Please try again.",
        variant: "destructive",
      });
    },
  });

  const isLoading = holdingsLoading || stocksLoading || rulesLoading;

  // Initialize selected tickers with all tickers when holdings load
  const holdingStocks = useMemo(() => {
    if (!holdings || !stocks) return [];
    return holdings
      .map((holding) => stocks.find((s) => s.ticker === holding.ticker))
      .filter((stock): stock is Stock => stock !== undefined);
  }, [holdings, stocks]);

  // Initialize selection with all tickers only once when data loads
  useEffect(() => {
    if (holdingStocks.length > 0 && !isInitialized.current) {
      setSelectedTickers(new Set(holdingStocks.map(s => s.ticker)));
      isInitialized.current = true;
    }
  }, [holdingStocks]);

  const handleEditRule = (rule: TradingRule) => {
    if (!rule.conditions || rule.conditions.length === 0) return;
    setEditingRule(rule);
    setNewTriggerValue(rule.conditions[0].value);
    setRuleDialogOpen(true);
  };

  const handleSaveRule = () => {
    if (!editingRule) return;
    updateRuleMutation.mutate({ id: editingRule.id, value: newTriggerValue });
  };

  const handleSellClick = (holding: PortfolioHolding) => {
    setSelectedHolding(holding);
    setSellQuantity(String(holding.quantity)); // Default to selling all shares
    setSellDialogOpen(true);
  };

  const handleSellConfirm = () => {
    if (!selectedHolding) return;
    
    const quantity = parseInt(sellQuantity);
    if (isNaN(quantity) || quantity <= 0 || quantity > selectedHolding.quantity) {
      toast({
        title: "Invalid Quantity",
        description: `Please enter a valid quantity between 1 and ${selectedHolding.quantity}`,
        variant: "destructive",
      });
      return;
    }

    sellMutation.mutate({ ticker: selectedHolding.ticker, quantity });
  };

  const toggleTicker = (ticker: string) => {
    setSelectedTickers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(ticker)) {
        newSet.delete(ticker);
      } else {
        newSet.add(ticker);
      }
      return newSet;
    });
  };

  const selectAllTickers = () => {
    setSelectedTickers(new Set(holdingStocks.map(s => s.ticker)));
  };

  const deselectAllTickers = () => {
    setSelectedTickers(new Set());
  };

  // Combine all price histories into a single dataset - filtered by selection
  const combinedChartData = useMemo(() => {
    if (!holdings || !stocks || selectedTickers.size === 0) return [];

    const filteredStocks = holdingStocks
      .filter((stock) => selectedTickers.has(stock.ticker) && stock.priceHistory);

    if (filteredStocks.length === 0) return [];

    // Collect all unique dates
    const allDates = new Set<string>();
    filteredStocks.forEach((stock) => {
      stock.priceHistory?.forEach((point) => {
        allDates.add(point.date);
      });
    });

    const sortedDates = Array.from(allDates).sort();

    // Build combined data
    return sortedDates.map((date) => {
      const dataPoint: any = { date };
      filteredStocks.forEach((stock) => {
        const pricePoint = stock.priceHistory?.find((p) => p.date === date);
        if (pricePoint) {
          dataPoint[stock.ticker] = pricePoint.price;
        }
      });
      return dataPoint;
    });
  }, [holdings, stocks, holdingStocks, selectedTickers]);

  // Calculate sell rules reference lines - filtered by selection
  const sellRuleLines = useMemo(() => {
    if (!holdings || !stocks || !rules || selectedTickers.size === 0) return [];

    const lines: Array<{
      ticker: string;
      rule: TradingRule;
      price: number;
      isLower: boolean;
    }> = [];

    holdings.forEach((holding) => {
      const stock = stocks.find((s) => s.ticker === holding.ticker);
      if (!stock || !selectedTickers.has(stock.ticker)) return;

      const purchasePrice = parseFloat(holding.averagePurchasePrice);

      // Find applicable sell rules
      const applicableRules = rules.filter(
        (rule) =>
          rule.enabled &&
          (rule.action === "sell" || rule.action === "sell_all") &&
          (rule.scope === "all_holdings" || 
           (rule.scope === "specific_stock" && rule.ticker === stock.ticker))
      );

      applicableRules.forEach((rule) => {
        if (!rule.conditions || rule.conditions.length === 0) return;
        
        const condition = rule.conditions[0];
        let boundaryPrice = 0;

        if (condition.metric === "price_change_percent") {
          boundaryPrice = purchasePrice * (1 + condition.value / 100);
        } else if (condition.metric === "price_change_from_close_percent") {
          const previousClose = parseFloat(stock.previousClose || stock.currentPrice);
          boundaryPrice = previousClose * (1 + condition.value / 100);
        } else if (condition.metric === "price_absolute") {
          boundaryPrice = condition.value;
        }

        // Determine if lower or upper boundary
        const isLower = (condition.operator === "<" || condition.operator === "<=");

        lines.push({
          ticker: stock.ticker,
          rule,
          price: boundaryPrice,
          isLower,
        });
      });
    });

    return lines;
  }, [holdings, stocks, rules, selectedTickers]);

  // Calculate Y-axis domain to include both data, boundary lines, and purchase prices
  const yAxisDomain = useMemo(() => {
    const allPrices: number[] = [];

    // Collect all stock prices from chart data
    combinedChartData.forEach((dataPoint) => {
      Object.keys(dataPoint).forEach((key) => {
        if (key !== 'date' && typeof dataPoint[key] === 'number') {
          allPrices.push(dataPoint[key]);
        }
      });
    });

    // Collect all boundary prices
    sellRuleLines.forEach((line) => {
      allPrices.push(line.price);
    });

    // Include purchase prices in the domain
    holdings?.forEach((holding) => {
      if (!holding.isSimulated && selectedTickers.has(holding.ticker)) {
        allPrices.push(parseFloat(holding.averagePurchasePrice));
      }
    });

    if (allPrices.length === 0) return ['auto', 'auto'];

    const minPrice = Math.min(...allPrices);
    const maxPrice = Math.max(...allPrices);
    
    // Add 10% padding on both sides, with minimum padding for flat datasets
    let padding = (maxPrice - minPrice) * 0.1;
    if (padding === 0) {
      // If all prices are the same, add 1% of the price as padding
      padding = maxPrice * 0.01 || 1; // Fallback to 1 if price is 0
    }
    
    return [
      Math.floor(minPrice - padding),
      Math.ceil(maxPrice + padding),
    ];
  }, [combinedChartData, sellRuleLines, holdings, selectedTickers]);

  // Calculate portfolio summary
  const portfolioSummary = useMemo(() => {
    if (!holdings || !stocks) return null;

    let totalValue = 0;
    let totalCost = 0;

    holdings.forEach((holding) => {
      const stock = stocks.find((s) => s.ticker === holding.ticker);
      if (stock) {
        const currentPrice = parseFloat(stock.currentPrice);
        const purchasePrice = parseFloat(holding.averagePurchasePrice);
        totalValue += currentPrice * holding.quantity;
        totalCost += purchasePrice * holding.quantity;
      }
    });

    const profitLoss = totalValue - totalCost;
    const profitLossPercent = (profitLoss / totalCost) * 100;

    return {
      totalValue,
      totalCost,
      profitLoss,
      profitLossPercent,
      isPositive: profitLoss >= 0,
    };
  }, [holdings, stocks]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-96 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!holdings || holdings.length === 0) {
    return (
      <div className="p-6 space-y-6 max-w-screen-2xl mx-auto">
        <div>
          <h1 className="text-2xl font-semibold mb-1" data-testid="text-page-title">
            Portfolio Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Interactive price charts with trading rule boundaries
          </p>
        </div>
        <Card className="p-12">
          <div className="text-center">
            <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2" data-testid="text-no-holdings">No Portfolio Holdings</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Purchase stocks to start managing your portfolio with automated rules
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-screen-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold mb-1" data-testid="text-page-title">
          Portfolio Management
        </h1>
        <p className="text-sm text-muted-foreground">
          All managed stocks with editable sell boundaries
        </p>
      </div>

      {portfolioSummary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-xs text-muted-foreground mb-1">Total Value</div>
              <div className="text-2xl font-mono font-semibold" data-testid="text-total-value">
                ${portfolioSummary.totalValue.toFixed(2)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-xs text-muted-foreground mb-1">Total Cost</div>
              <div className="text-2xl font-mono font-semibold" data-testid="text-total-cost">
                ${portfolioSummary.totalCost.toFixed(2)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-xs text-muted-foreground mb-1">P&L</div>
              <div
                className={`text-2xl font-mono font-semibold ${
                  portfolioSummary.isPositive ? "text-success" : "text-destructive"
                }`}
                data-testid="text-total-pl"
              >
                {portfolioSummary.isPositive ? "+" : ""}${portfolioSummary.profitLoss.toFixed(2)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-xs text-muted-foreground mb-1">Return</div>
              <div
                className={`text-2xl font-mono font-semibold ${
                  portfolioSummary.isPositive ? "text-success" : "text-destructive"
                }`}
                data-testid="text-total-return"
              >
                {portfolioSummary.isPositive ? "+" : ""}{portfolioSummary.profitLossPercent.toFixed(2)}%
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card data-testid="card-unified-chart">
        <CardHeader className="space-y-3">
          <div className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle>Portfolio Price History</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Stock prices from n8n workflow
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={selectAllTickers}
                data-testid="button-select-all"
              >
                Select All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={deselectAllTickers}
                data-testid="button-deselect-all"
              >
                Clear All
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground mr-1">Filter:</span>
            {holdingStocks.map((stock) => {
              const isSelected = selectedTickers.has(stock.ticker);
              return (
                <Badge
                  key={stock.ticker}
                  variant={isSelected ? "default" : "outline"}
                  className="cursor-pointer hover-elevate"
                  onClick={() => toggleTicker(stock.ticker)}
                  data-testid={`badge-filter-${stock.ticker}`}
                >
                  {stock.ticker}
                </Badge>
              );
            })}
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[500px] w-full" data-testid="chart-unified">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={combinedChartData}
                margin={{ top: 30, right: 80, left: 20, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return `${date.getMonth() + 1}/${date.getDate()}`;
                  }}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  domain={yAxisDomain as [number, number]}
                  tickFormatter={(value) => `$${value.toFixed(0)}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                  }}
                  labelStyle={{ color: "hsl(var(--popover-foreground))" }}
                  formatter={(value: number, name: string) => [`$${value.toFixed(2)}`, name]}
                  labelFormatter={(label) => `Date: ${label}`}
                />

                {/* All stocks with same color - only selected ones */}
                {holdingStocks
                  .filter((stock) => selectedTickers.has(stock.ticker))
                  .map((stock) => (
                    <Line
                      key={stock.ticker}
                      type="monotone"
                      dataKey={stock.ticker}
                      stroke="hsl(var(--chart-1))"
                      strokeWidth={2}
                      dot={false}
                      name={stock.ticker}
                    >
                      <LabelList
                        dataKey={stock.ticker}
                        position="right"
                        content={({ x, y, value, index }) => {
                          if (index === undefined || !combinedChartData[index]) return null;
                          const isLastPoint = index === combinedChartData.length - 1;
                          if (!isLastPoint) return null;
                          
                          return (
                            <text
                              x={Number(x) + 10}
                              y={Number(y)}
                              fill="hsl(var(--chart-1))"
                              fontSize={12}
                              fontWeight={600}
                              textAnchor="start"
                            >
                              {stock.ticker}
                            </text>
                          );
                        }}
                      />
                    </Line>
                  ))}

                {/* Sell rule boundaries */}
                {sellRuleLines.map((line, index) => {
                  const color = line.isLower ? "hsl(var(--destructive))" : "hsl(var(--success))";
                  const label = line.isLower ? "Stop Loss" : "Take Profit";
                  
                  return (
                    <ReferenceLine
                      key={`rule-${index}`}
                      y={line.price}
                      stroke={color}
                      strokeWidth={3}
                      strokeDasharray="5 5"
                      label={{
                        value: `${line.ticker}: ${label} $${line.price.toFixed(2)}`,
                        position: line.isLower ? "insideBottomLeft" : "insideTopLeft",
                        fill: color,
                        fontSize: 12,
                        fontWeight: "600",
                      }}
                      data-testid={`reference-line-${line.rule.id}`}
                    />
                  );
                })}

                {/* Purchase price reference lines */}
                {holdings
                  ?.filter((holding) => !holding.isSimulated && selectedTickers.has(holding.ticker))
                  .map((holding) => {
                    const purchasePrice = parseFloat(holding.averagePurchasePrice);
                    return (
                      <ReferenceLine
                        key={`purchase-${holding.ticker}`}
                        y={purchasePrice}
                        stroke="hsl(var(--muted-foreground))"
                        strokeWidth={2}
                        strokeDasharray="3 3"
                        label={{
                          value: `${holding.ticker} Purchase: $${purchasePrice.toFixed(2)}`,
                          position: "insideTopLeft",
                          fill: "hsl(var(--muted-foreground))",
                          fontSize: 11,
                          fontWeight: "500",
                        }}
                      />
                    );
                  })}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Sell rule controls - clickable */}
          {sellRuleLines.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-start gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground mb-2">Sell Boundaries (Click to adjust)</p>
                  <div className="flex items-center gap-3 flex-wrap">
                    {sellRuleLines.map((line, index) => {
                      const color = line.isLower ? "destructive" : "default";
                      return (
                        <Button
                          key={`rule-btn-${index}`}
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditRule(line.rule)}
                          className="h-8"
                          data-testid={`button-boundary-${line.rule.id}`}
                        >
                          <span className={line.isLower ? "text-destructive" : "text-success"}>
                            {line.isLower ? "▼" : "▲"}
                          </span>
                          <span className="mx-1">{line.ticker}</span>
                          <span className="font-mono">${line.price.toFixed(2)}</span>
                          <Edit2 className="h-3 w-3 ml-1" />
                        </Button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex flex-col gap-1 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-0.5 bg-destructive" style={{ borderTop: "3px dashed" }} />
                    <span className="text-muted-foreground">Stop Loss</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-0.5 bg-success" style={{ borderTop: "3px dashed" }} />
                    <span className="text-muted-foreground">Take Profit</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card data-testid="card-holdings-summary">
        <CardHeader>
          <CardTitle>Holdings Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {holdings.map((holding) => {
              const stock = stocks?.find((s) => s.ticker === holding.ticker);
              if (!stock) return null;

              const currentPrice = parseFloat(stock.currentPrice);
              const purchasePrice = parseFloat(holding.averagePurchasePrice);
              const profitLoss = currentPrice - purchasePrice;
              const profitLossPercent = (profitLoss / purchasePrice) * 100;
              const isPositive = profitLoss >= 0;

              return (
                <div key={holding.id} className="border rounded-lg p-4" data-testid={`holding-${stock.ticker}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold" data-testid={`text-ticker-${stock.ticker}`}>
                          {stock.ticker}
                        </h3>
                        <Badge
                          variant={isPositive ? "default" : "destructive"}
                          className="text-xs"
                          data-testid={`badge-performance-${stock.ticker}`}
                        >
                          {isPositive ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                          {isPositive ? "+" : ""}{profitLossPercent.toFixed(2)}%
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground" data-testid={`text-company-${stock.ticker}`}>
                        {stock.companyName}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground mb-1">Holding</div>
                      <div className="text-lg font-mono font-semibold" data-testid={`text-quantity-${stock.ticker}`}>
                        {holding.quantity} shares
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm mt-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Purchase</p>
                      <p className="font-mono font-medium" data-testid={`text-purchase-${stock.ticker}`}>
                        ${purchasePrice.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Current</p>
                      <p className="font-mono font-medium" data-testid={`text-current-${stock.ticker}`}>
                        ${currentPrice.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">P&L</p>
                      <p
                        className={`font-mono font-medium ${
                          isPositive ? "text-success" : "text-destructive"
                        }`}
                        data-testid={`text-pl-${stock.ticker}`}
                      >
                        {isPositive ? "+" : ""}${profitLoss.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t flex justify-end">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleSellClick(holding)}
                      data-testid={`button-sell-${stock.ticker}`}
                    >
                      Sell Shares
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Dialog open={ruleDialogOpen} onOpenChange={setRuleDialogOpen}>
        <DialogContent data-testid="dialog-adjust-rule">
          <DialogHeader>
            <DialogTitle>Adjust Sell Boundary</DialogTitle>
            <DialogDescription>
              Move the {editingRule?.conditions?.[0] && (editingRule.conditions[0].operator === "<" || editingRule.conditions[0].operator === "<=") ? "stop-loss" : "take-profit"} line by changing the trigger value
            </DialogDescription>
          </DialogHeader>

          {editingRule && editingRule.conditions && editingRule.conditions.length > 0 && (
            <div className="space-y-4 py-4">
              <div>
                <p className="text-sm font-medium mb-2">{editingRule.name}</p>
                <p className="text-xs text-muted-foreground">
                  {editingRule.scope === "all_holdings" ? "Applies to all holdings" : `Applies to ${editingRule.ticker}`}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="trigger-value">
                  Trigger Value {editingRule.conditions[0].metric.includes("percent") ? "(%)" : "($)"}
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="trigger-value"
                    type="number"
                    step="any"
                    value={newTriggerValue}
                    onChange={(e) => setNewTriggerValue(parseFloat(e.target.value) || 0)}
                    className="font-mono"
                    data-testid="input-trigger-value"
                  />
                  <span className="text-sm text-muted-foreground">
                    {editingRule.conditions[0].operator}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {editingRule.conditions[0].metric === "price_change_percent" && 
                    "Percentage change from purchase price (negative = loss, positive = gain)"}
                  {editingRule.conditions[0].metric === "price_change_from_close_percent" && 
                    "Percentage change from previous day's close"}
                  {editingRule.conditions[0].metric === "price_absolute" && 
                    "Absolute price level in dollars"}
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setRuleDialogOpen(false)}
                  data-testid="button-cancel-adjust"
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSaveRule}
                  disabled={updateRuleMutation.isPending}
                  data-testid="button-save-adjust"
                >
                  {updateRuleMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={sellDialogOpen} onOpenChange={setSellDialogOpen}>
        <DialogContent data-testid="dialog-sell-stock">
          <DialogHeader>
            <DialogTitle>Sell Shares</DialogTitle>
            <DialogDescription>
              {selectedHolding && stocks && (
                <>
                  Sell shares of {selectedHolding.ticker} ({stocks.find(s => s.ticker === selectedHolding.ticker)?.companyName})
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedHolding && stocks && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="sell-quantity">
                  Quantity (shares)
                </Label>
                <Input
                  id="sell-quantity"
                  type="number"
                  min="1"
                  max={selectedHolding.quantity}
                  value={sellQuantity}
                  onChange={(e) => setSellQuantity(e.target.value)}
                  className="font-mono"
                  data-testid="input-sell-quantity"
                />
                <p className="text-xs text-muted-foreground">
                  You currently hold {selectedHolding.quantity} shares. Max: {selectedHolding.quantity}
                </p>
              </div>

              <div className="rounded-md bg-muted p-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm">Current Price</span>
                  <span className="font-mono font-semibold" data-testid="text-sell-price">
                    ${parseFloat(stocks.find(s => s.ticker === selectedHolding.ticker)?.currentPrice || "0").toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">Estimated Total</span>
                  <span className="text-lg font-mono font-semibold" data-testid="text-sell-total">
                    ${sellQuantity && stocks.find(s => s.ticker === selectedHolding.ticker) ? 
                      (parseFloat(stocks.find(s => s.ticker === selectedHolding.ticker)!.currentPrice) * parseInt(sellQuantity)).toFixed(2) : "0.00"}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setSellDialogOpen(false)}
              data-testid="button-cancel-sell"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="flex-1"
              onClick={handleSellConfirm}
              disabled={sellMutation.isPending}
              data-testid="button-confirm-sell"
            >
              {sellMutation.isPending ? "Selling..." : "Confirm Sell"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
