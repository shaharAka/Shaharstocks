import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Minus,
  Activity,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertTradeSchema, type Stock } from "@shared/schema";
import { LineChart, Line, ResponsiveContainer } from "recharts";

const tradeFormSchema = insertTradeSchema.extend({
  orderType: z.enum(["market", "limit"]).default("market"),
});

type TradeFormData = z.infer<typeof tradeFormSchema>;

export default function Stocks() {
  const { toast } = useToast();
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [tradeDialogOpen, setTradeDialogOpen] = useState(false);
  const [tradeType, setTradeType] = useState<"buy" | "sell">("buy");

  const form = useForm<TradeFormData>({
    resolver: zodResolver(tradeFormSchema),
    defaultValues: {
      ticker: "",
      type: "buy",
      quantity: 1,
      price: "0",
      total: "0",
      status: "completed",
      orderType: "market",
    },
  });

  const { data: stocks, isLoading } = useQuery<Stock[]>({
    queryKey: ["/api/stocks"],
  });

  const executeTradeMutation = useMutation({
    mutationFn: async (trade: TradeFormData) => {
      const { orderType, ...tradeData } = trade;
      return await apiRequest("POST", "/api/trades", tradeData);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/holdings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trades"] });
      toast({
        title: "Trade Executed",
        description: `Successfully ${tradeType === "buy" ? "purchased" : "sold"} ${variables.quantity} shares of ${selectedStock?.ticker}`,
      });
      setTradeDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Trade Failed",
        description: "Unable to execute trade. Please try again.",
        variant: "destructive",
      });
    },
  });

  const openTradeDialog = (stock: Stock, type: "buy" | "sell") => {
    setSelectedStock(stock);
    setTradeType(type);
    form.reset({
      ticker: stock.ticker,
      type,
      quantity: 1,
      price: stock.currentPrice,
      total: stock.currentPrice,
      status: "completed",
      orderType: "market",
    });
    setTradeDialogOpen(true);
  };

  const onSubmitTrade = (data: TradeFormData) => {
    executeTradeMutation.mutate(data);
  };

  // Watch quantity changes to update total
  const quantity = form.watch("quantity");
  const price = form.watch("price");
  
  // Update total when quantity or price changes
  if (selectedStock && price && quantity) {
    const total = (parseFloat(price) * quantity).toFixed(2);
    if (form.getValues("total") !== total) {
      form.setValue("total", total);
    }
  }

  const getRecommendationColor = (rec: string | null) => {
    if (!rec) return "secondary";
    const lower = rec.toLowerCase();
    if (lower.includes("strong_buy") || lower === "strong buy") return "default";
    if (lower.includes("buy")) return "default";
    if (lower.includes("hold")) return "secondary";
    if (lower.includes("sell")) return "destructive";
    return "secondary";
  };

  const getRecommendationText = (rec: string | null) => {
    if (!rec) return "N/A";
    return rec.replace("_", " ").toUpperCase();
  };

  const getStockStaleness = (lastUpdated: Date | null) => {
    if (!lastUpdated) return { level: "fresh", opacity: 1, daysOld: 0 };
    
    const now = new Date();
    const updated = new Date(lastUpdated);
    const daysDiff = Math.floor((now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff >= 14) return { level: "expired", opacity: 0, daysOld: daysDiff };
    if (daysDiff >= 7) return { level: "very-stale", opacity: 0.5, daysOld: daysDiff };
    if (daysDiff >= 3) return { level: "stale", opacity: 0.75, daysOld: daysDiff };
    return { level: "fresh", opacity: 1, daysOld: daysDiff };
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-24 mb-2" />
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-screen-2xl mx-auto">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold whitespace-nowrap" data-testid="text-page-title">
          Available Stocks
        </h1>
      </div>

      {!stocks || stocks.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2" data-testid="text-no-stocks">No Stocks Available</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Configure your n8n workflow to start receiving stock data
            </p>
            <Button variant="outline" data-testid="button-configure-n8n">
              Configure n8n Integration
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {stocks
            .filter((stock) => {
              const staleness = getStockStaleness(stock.lastUpdated);
              return staleness.level !== "expired";
            })
            .map((stock) => {
            const currentPrice = parseFloat(stock.currentPrice);
            const previousPrice = parseFloat(stock.previousClose || stock.currentPrice);
            const priceChange = currentPrice - previousPrice;
            const priceChangePercent = (priceChange / previousPrice) * 100;
            const isPositive = priceChange >= 0;
            const staleness = getStockStaleness(stock.lastUpdated);

            return (
              <Card 
                key={stock.id} 
                className="hover-elevate transition-opacity" 
                style={{ opacity: staleness.opacity }}
                data-testid={`card-stock-${stock.ticker}`}
              >
                <CardHeader className="flex flex-row items-start justify-between gap-1 space-y-0 pb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle className="text-xl font-semibold" data-testid={`text-ticker-${stock.ticker}`}>
                        {stock.ticker}
                      </CardTitle>
                      {stock.source && (
                        <Badge
                          variant={stock.source === "telegram" ? "secondary" : "outline"}
                          className="text-xs shrink-0"
                          data-testid={`badge-source-${stock.ticker}`}
                        >
                          {stock.source === "telegram" ? "Telegram" : "SEC Filings"}
                        </Badge>
                      )}
                      {staleness.daysOld > 0 && (
                        <Badge
                          variant={staleness.level === "very-stale" ? "destructive" : staleness.level === "stale" ? "secondary" : "outline"}
                          className="text-xs shrink-0"
                          data-testid={`badge-age-${stock.ticker}`}
                        >
                          {staleness.daysOld}d old
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="text-xs line-clamp-1" data-testid={`text-company-${stock.ticker}`}>
                      {stock.companyName}
                    </CardDescription>
                  </div>
                  {stock.recommendation && (
                    <Badge
                      variant={getRecommendationColor(stock.recommendation)}
                      className="text-xs shrink-0"
                      data-testid={`badge-recommendation-${stock.ticker}`}
                    >
                      {getRecommendationText(stock.recommendation)}
                    </Badge>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-3xl font-mono font-semibold" data-testid={`text-price-${stock.ticker}`}>
                        ${currentPrice.toFixed(2)}
                      </span>
                      <div
                        className={`flex items-center gap-1 ${
                          isPositive ? "text-success" : "text-destructive"
                        }`}
                        data-testid={`text-change-${stock.ticker}`}
                      >
                        {isPositive ? (
                          <ArrowUpRight className="h-4 w-4" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4" />
                        )}
                        <span className="text-sm font-mono font-medium">
                          {isPositive ? "+" : ""}
                          {priceChangePercent.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {isPositive ? "+" : ""}${Math.abs(priceChange).toFixed(2)} today
                    </p>
                  </div>

                  {stock.priceHistory && stock.priceHistory.length > 0 && (
                    <div className="h-24">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={stock.priceHistory}>
                          <Line
                            type="monotone"
                            dataKey="price"
                            stroke={isPositive ? "hsl(var(--success))" : "hsl(var(--chart-1))"}
                            strokeWidth={2}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 pt-3 border-t">
                    {stock.marketCap && (
                      <div>
                        <p className="text-xs text-muted-foreground">Market Cap</p>
                        <p className="text-sm font-medium" data-testid={`text-marketcap-${stock.ticker}`}>{stock.marketCap}</p>
                      </div>
                    )}
                    {stock.peRatio && (
                      <div>
                        <p className="text-xs text-muted-foreground">P/E Ratio</p>
                        <p className="text-sm font-medium" data-testid={`text-peratio-${stock.ticker}`}>{parseFloat(stock.peRatio).toFixed(2)}</p>
                      </div>
                    )}
                    {stock.confidenceScore && (
                      <div className="col-span-2">
                        <p className="text-xs text-muted-foreground mb-1">
                          Insider Signal Confidence
                        </p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary"
                              style={{ width: `${stock.confidenceScore}%` }}
                              data-testid={`bar-confidence-${stock.ticker}`}
                            />
                          </div>
                          <span className="text-sm font-medium font-mono" data-testid={`text-confidence-${stock.ticker}`}>
                            {stock.confidenceScore}%
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1"
                      onClick={() => openTradeDialog(stock, "buy")}
                      data-testid={`button-buy-${stock.ticker}`}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Buy
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => openTradeDialog(stock, "sell")}
                      data-testid={`button-sell-${stock.ticker}`}
                    >
                      <Minus className="h-4 w-4 mr-1" />
                      Sell
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={tradeDialogOpen} onOpenChange={setTradeDialogOpen}>
        <DialogContent data-testid="dialog-trade">
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-title">
              {tradeType === "buy" ? "Buy" : "Sell"} {selectedStock?.ticker}
            </DialogTitle>
            <DialogDescription>
              {selectedStock?.companyName} - Current Price: ${selectedStock?.currentPrice}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitTrade)} className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="orderType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Order Type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-order-type">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="market">Market Order</SelectItem>
                        <SelectItem value="limit">Limit Order</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => field.onChange(Math.max(1, field.value - 1))}
                        disabled={field.value <= 1}
                        data-testid="button-decrease-quantity"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                          className="text-center font-mono"
                          data-testid="input-quantity"
                        />
                      </FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => field.onChange(field.value + 1)}
                        data-testid="button-increase-quantity"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="rounded-md bg-muted p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Price per share</span>
                  <span className="font-mono font-medium" data-testid="text-price-per-share">
                    ${selectedStock?.currentPrice}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Quantity</span>
                  <span className="font-mono font-medium" data-testid="text-quantity-summary">
                    {form.watch("quantity")}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-border">
                  <span className="font-medium">Total</span>
                  <span className="text-lg font-mono font-semibold" data-testid="text-total-cost">
                    ${form.watch("total")}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setTradeDialogOpen(false)}
                  data-testid="button-cancel-trade"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant={tradeType === "buy" ? "default" : "destructive"}
                  className="flex-1"
                  disabled={executeTradeMutation.isPending}
                  data-testid="button-confirm-trade"
                >
                  {executeTradeMutation.isPending ? "Processing..." : `Confirm ${tradeType === "buy" ? "Buy" : "Sell"}`}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
