import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { TrendingUp, Star, ArrowUpRight, ArrowDownRight, Lightbulb, Activity, Target, Zap, DollarSign, CircleX } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Stock } from "@shared/schema";
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";
import { useState } from "react";

interface FollowedStock {
  ticker: string;
  currentPrice: string;
  priceChange?: string;
  priceChangePercent?: string;
  jobStatus?: 'pending' | 'processing' | 'completed' | 'failed' | null;
  insiderAction?: 'BUY' | 'SELL' | null;
  aiStance?: 'BUY' | 'SELL' | 'HOLD' | null;
  aiScore?: number | null;
  integratedScore?: number | null;
  stanceAlignment?: 'act' | 'hold' | null;
  hasEnteredPosition?: boolean;
  entryPrice?: string | null;
}

type StockWithAnalysis = Stock & {
  integratedScore?: number | null;
  aiStance?: 'BUY' | 'SELL' | 'HOLD' | null;
  isFollowing?: boolean;
};

const closePositionSchema = z.object({
  sellPrice: z.string()
    .min(1, "Sell price is required")
    .refine((val) => {
      const num = parseFloat(val);
      return !isNaN(num) && Number.isFinite(num) && num > 0;
    }, {
      message: "Must be a valid positive number",
    }),
  quantity: z.string()
    .min(1, "Quantity is required")
    .refine((val) => {
      const num = parseInt(val, 10);
      return !isNaN(num) && Number.isFinite(num) && num >= 1;
    }, {
      message: "Must be a positive integer",
    }),
});

type ClosePositionForm = z.infer<typeof closePositionSchema>;

// Sparkline component that fetches and displays historical price trend
function SparklineChart({ ticker, className }: { ticker: string; className?: string }) {
  const { data: sparklineData = [] } = useQuery<Array<{ date: string; price: number }>>({
    queryKey: [`/api/stocks/${ticker}/sparkline`],
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    meta: { ignoreError: true },
  });
  
  // If no sparkline data available, don't render anything
  if (!sparklineData || sparklineData.length === 0) {
    return null;
  }

  // Determine trend color based on 7-day performance (first vs last close)
  const firstPrice = sparklineData[0].price;
  const lastPrice = sparklineData[sparklineData.length - 1].price;
  const isPricePositive = lastPrice >= firstPrice;

  // Calculate domain with epsilon padding
  const prices = sparklineData.map(d => d.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const range = maxPrice - minPrice;
  
  let domainMin, domainMax;
  if (range === 0) {
    const epsilon = Math.max(minPrice * 0.01, 0.1);
    domainMin = minPrice - epsilon;
    domainMax = maxPrice + epsilon;
  } else {
    const padding = range * 0.2;
    domainMin = minPrice - padding;
    domainMax = maxPrice + padding;
  }

  return (
    <div className={className || "h-12 -mx-2"}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={sparklineData}
          margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
        >
          <YAxis 
            domain={[domainMin, domainMax]}
            hide
          />
          <Line
            type="monotone"
            dataKey="price"
            stroke={isPricePositive ? "hsl(var(--success))" : "hsl(var(--destructive))"}
            strokeWidth={2}
            dot={false}
            animationDuration={300}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function ClosePositionDialog({ ticker, entryPrice, onSuccess }: { ticker: string; entryPrice: string | null; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  
  // Handle missing entry price
  const entryPriceNum = entryPrice ? parseFloat(entryPrice) : 0;
  
  const form = useForm<ClosePositionForm>({
    resolver: zodResolver(closePositionSchema),
    mode: "onChange",
    defaultValues: {
      sellPrice: "",
      quantity: "1",
    },
  });
  
  const closePositionMutation = useMutation({
    mutationFn: async (data: ClosePositionForm) => {
      const sellPriceNum = parseFloat(data.sellPrice);
      const quantityNum = parseInt(data.quantity, 10);
      
      // Double-check values are valid before sending
      if (!Number.isFinite(sellPriceNum) || sellPriceNum <= 0) {
        throw new Error("Invalid sell price");
      }
      if (!Number.isFinite(quantityNum) || quantityNum < 1) {
        throw new Error("Invalid quantity");
      }
      
      const res = await apiRequest("POST", `/api/stocks/${ticker}/close-position`, {
        sellPrice: sellPriceNum,
        quantity: quantityNum,
      });
      return await res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/followed-stocks-with-status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/total-pnl"] });
      toast({
        title: "Position Closed",
        description: `P&L: ${parseFloat(data.pnl) >= 0 ? '+' : ''}$${data.pnl}`,
      });
      setOpen(false);
      form.reset();
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to close position",
        variant: "destructive",
      });
    },
  });
  
  const handleSubmit = (data: ClosePositionForm) => {
    closePositionMutation.mutate(data);
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          data-testid={`button-close-position-${ticker}`}
          className="gap-2"
        >
          <CircleX className="h-4 w-4" />
          Close Position
        </Button>
      </DialogTrigger>
      <DialogContent onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Close Position - {ticker}</DialogTitle>
          <DialogDescription>
            {entryPrice ? `Entry Price: $${entryPriceNum.toFixed(2)}` : "No entry price recorded"}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="sellPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sell Price</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      type="number" 
                      step="0.01" 
                      placeholder="0.00"
                      data-testid="input-sell-price"
                    />
                  </FormControl>
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
                  <FormControl>
                    <Input 
                      {...field} 
                      type="number" 
                      step="1" 
                      placeholder="1"
                      data-testid="input-quantity"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button 
                type="submit" 
                disabled={closePositionMutation.isPending || !form.formState.isValid}
                data-testid="button-submit-close-position"
              >
                {closePositionMutation.isPending ? "Closing..." : "Close Position"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function FollowedDashboard() {

  const { data: followedStocks = [], isLoading } = useQuery<FollowedStock[]>({
    queryKey: ["/api/followed-stocks-with-status"],
    refetchInterval: (query) => {
      const hasActiveJobs = query.state.data?.some((stock: any) => 
        stock.jobStatus === 'pending' || stock.jobStatus === 'processing'
      );
      return hasActiveJobs ? 5000 : false;
    },
    retry: false,
    meta: { ignoreError: true },
  });

  const { data: totalPnlData } = useQuery<{ totalPnl: number }>({
    queryKey: ["/api/portfolio/total-pnl"],
    retry: false,
    meta: { ignoreError: true },
  });

  // Fetch top high-signal opportunities (already filtered by backend)
  const { data: topOpportunities = [], isLoading: isLoadingOpportunities } = useQuery<StockWithAnalysis[]>({
    queryKey: ["/api/stocks/top-signals"],
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    refetchOnWindowFocus: true, // Refresh when user returns to tab
    retry: false,
    meta: { ignoreError: true },
  });

  // Sort followed stocks: analyzing first, then by score
  const sortedFollowedStocks = [...followedStocks].sort((a, b) => {
    // Put analyzing stocks first
    const aIsAnalyzing = a.jobStatus === 'pending' || a.jobStatus === 'processing';
    const bIsAnalyzing = b.jobStatus === 'pending' || b.jobStatus === 'processing';
    
    if (aIsAnalyzing && !bIsAnalyzing) return -1;
    if (!aIsAnalyzing && bIsAnalyzing) return 1;
    
    // Then sort by score (highest first)
    return (b.integratedScore ?? 0) - (a.integratedScore ?? 0);
  });

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-screen-2xl mx-auto">
        <Skeleton className="h-8 sm:h-10 w-48 sm:w-64" />
        <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 sm:h-24" />
          ))}
        </div>
        <Skeleton className="h-48 sm:h-64" />
      </div>
    );
  }

  const isNewUser = followedStocks.length === 0;

  // Calculate summary stats
  const highSignalCount = followedStocks.filter(s => (s.integratedScore ?? 0) >= 70).length;
  const avgScore = followedStocks.length > 0
    ? Math.round(followedStocks.reduce((sum, s) => sum + (s.integratedScore ?? 0), 0) / followedStocks.length)
    : 0;
  const buySignals = followedStocks.filter(s => s.aiStance === 'BUY').length;
  const totalPnl = typeof totalPnlData?.totalPnl === 'string' 
    ? parseFloat(totalPnlData.totalPnl) 
    : (totalPnlData?.totalPnl ?? 0);

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-screen-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold whitespace-nowrap" data-testid="text-page-title">
          My Watchlist
        </h1>
      </div>

      {/* Stats Overview - Only show if user has stocks */}
      {followedStocks.length > 0 && (
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 p-3 sm:p-6 pb-2 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">
                Total Stocks
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground hidden sm:block" />
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              <div className="text-lg sm:text-2xl font-bold">{followedStocks.length}</div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                Actively tracking
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 p-3 sm:p-6 pb-2 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">
                High Signals
              </CardTitle>
              <Zap className="h-4 w-4 text-amber-500 hidden sm:block" />
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              <div className="text-lg sm:text-2xl font-bold">{highSignalCount}</div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                Score ≥ 70
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 p-3 sm:p-6 pb-2 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">
                Buy Signals
              </CardTitle>
              <Target className="h-4 w-4 text-success hidden sm:block" />
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              <div className="text-lg sm:text-2xl font-bold">{buySignals}</div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                AI recommends BUY
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 p-3 sm:p-6 pb-2 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">
                Total P&L
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground hidden sm:block" />
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              <div className={cn(
                "text-lg sm:text-2xl font-bold font-mono truncate",
                totalPnl >= 0 ? "text-success" : "text-destructive"
              )}>
                {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                Realized P&L
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Followed Stocks */}
      {sortedFollowedStocks.length > 0 && (
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg sm:text-xl font-semibold tracking-tight">Your Stocks</h2>
            <span className="text-xs sm:text-sm text-muted-foreground">
              {sortedFollowedStocks.length} {sortedFollowedStocks.length === 1 ? 'stock' : 'stocks'}
            </span>
          </div>
          
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {sortedFollowedStocks.map((stock) => {
              const priceChange = parseFloat(stock.priceChange || "0");
              const priceChangePercent = parseFloat(stock.priceChangePercent || "0");
              const isPricePositive = priceChange >= 0;
              const isAnalyzing = stock.jobStatus === 'pending' || stock.jobStatus === 'processing';
              const isHighSignal = (stock.integratedScore ?? 0) >= 70;

              return (
                <Link href={`/ticker/${stock.ticker}?from=following`} key={stock.ticker}>
                  <Card 
                    className={cn(
                      "hover-elevate active-elevate-2 cursor-pointer h-full transition-all",
                      isHighSignal && "border-amber-500/20"
                    )}
                    data-testid={`card-watchlist-${stock.ticker}`}
                  >
                    <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <CardTitle className="text-lg sm:text-xl font-mono font-semibold">
                              {stock.ticker}
                            </CardTitle>
                            {isAnalyzing && (
                              <Badge variant="outline" className="h-5 text-[9px] sm:text-[10px]">
                                Analyzing...
                              </Badge>
                            )}
                          </div>
                          {stock.aiStance && !isAnalyzing && (
                            <Badge 
                              variant={stock.aiStance === 'BUY' ? 'default' : stock.aiStance === 'SELL' ? 'destructive' : 'outline'}
                              className={cn(
                                "h-5 text-[9px] sm:text-[10px] w-fit",
                                stock.aiStance === 'HOLD' && "text-muted-foreground border-muted-foreground/30"
                              )}
                            >
                              {stock.aiStance}
                            </Badge>
                          )}
                        </div>
                        {stock.integratedScore != null && (
                          <Badge 
                            variant="outline"
                            className={cn(
                              "h-6 sm:h-7 px-2 sm:px-2.5 text-xs sm:text-sm font-bold flex-shrink-0",
                              stock.integratedScore >= 90 && "border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400",
                              stock.integratedScore >= 70 && stock.integratedScore < 90 && "border-amber-300 bg-amber-300/10 text-amber-600 dark:text-amber-400"
                            )}
                          >
                            {stock.integratedScore}
                          </Badge>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="p-3 sm:p-6 pt-0">
                      <div className="space-y-2 sm:space-y-3">
                        <div className="flex items-end justify-between gap-2">
                          <div>
                            <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-1">Price</p>
                            <p className="text-xl sm:text-3xl font-mono font-bold">
                              ${parseFloat(stock.currentPrice).toFixed(2)}
                            </p>
                          </div>
                          {stock.priceChange && (
                            <div className="text-right">
                              <div className={cn(
                                "flex items-center gap-0.5 sm:gap-1 text-sm sm:text-base font-semibold font-mono",
                                isPricePositive ? "text-success" : "text-destructive"
                              )}>
                                {isPricePositive ? (
                                  <ArrowUpRight className="h-4 sm:h-5 w-4 sm:w-5" />
                                ) : (
                                  <ArrowDownRight className="h-5 w-5" />
                                )}
                                <span>
                                  {isPricePositive ? "+" : ""}{priceChangePercent.toFixed(2)}%
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {/* Mini trend sparkline - shows last 7 days */}
                        <SparklineChart ticker={stock.ticker} />

                        {/* Close Position Button */}
                        {stock.hasEnteredPosition && stock.entryPrice && (
                          <div className="pt-2 border-t">
                            <ClosePositionDialog 
                              ticker={stock.ticker} 
                              entryPrice={stock.entryPrice}
                              onSuccess={() => {}}
                            />
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Top Opportunities Section */}
      <div className="space-y-3 sm:space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="space-y-0.5 sm:space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 sm:h-5 w-4 sm:w-5 text-amber-500 flex-shrink-0" />
              <h2 className="text-lg sm:text-xl font-semibold tracking-tight truncate">High-Signal Opportunities</h2>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Top-rated stocks you're not following yet
            </p>
          </div>
          <Link href="/recommendations">
            <Button variant="ghost" size="sm" data-testid="link-view-all-opportunities" className="text-xs sm:text-sm flex-shrink-0">
              View All
            </Button>
          </Link>
        </div>

        <Card>
          <CardContent className="p-3 sm:p-6 pt-4 sm:pt-6">
            {isLoadingOpportunities ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 sm:gap-4 py-2 sm:py-3">
                    <Skeleton className="h-10 sm:h-12 w-10 sm:w-12 rounded" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-24 sm:w-32" />
                      <Skeleton className="h-3 w-32 sm:w-48" />
                    </div>
                    <Skeleton className="h-8 sm:h-10 w-16 sm:w-24" />
                  </div>
                ))}
              </div>
            ) : topOpportunities.length > 0 ? (
              <div className="divide-y">
                {topOpportunities.map((stock) => {
                  const currentPrice = parseFloat(stock.currentPrice);
                  const previousPrice = parseFloat(stock.previousClose || stock.currentPrice);
                  const priceChange = currentPrice - previousPrice;
                  const priceChangePercent = (priceChange / previousPrice) * 100;
                  const isPricePositive = priceChange >= 0;

                  return (
                    <Link href={`/ticker/${stock.ticker}?from=opportunities`} key={stock.ticker}>
                      <div 
                        className="flex items-center gap-2 sm:gap-4 py-3 sm:py-4 hover-elevate active-elevate-2 cursor-pointer rounded-lg px-1 sm:px-2 -mx-1 sm:-mx-2"
                        data-testid={`opportunity-${stock.ticker}`}
                      >
                        <Badge 
                          variant="outline"
                          className={cn(
                            "h-10 sm:h-12 w-10 sm:w-12 flex items-center justify-center font-mono font-bold text-sm sm:text-base rounded-lg shrink-0",
                            stock.integratedScore! >= 90 && "border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400",
                            stock.integratedScore! >= 70 && stock.integratedScore! < 90 && "border-amber-300 bg-amber-300/10 text-amber-600 dark:text-amber-400"
                          )}
                        >
                          {stock.integratedScore}
                        </Badge>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
                            <span className="font-mono font-bold text-sm sm:text-base">{stock.ticker}</span>
                            {stock.aiStance && (
                              <Badge 
                                variant={stock.aiStance === 'BUY' ? 'default' : stock.aiStance === 'SELL' ? 'destructive' : 'outline'}
                                className={cn(
                                  "h-4 text-[8px] sm:text-[9px] px-1 sm:px-1.5",
                                  stock.aiStance === 'HOLD' && "text-muted-foreground border-muted-foreground/30"
                                )}
                              >
                                {stock.aiStance}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs sm:text-sm text-muted-foreground truncate">
                            {stock.companyName}
                          </p>
                        </div>
                        
                        {/* Mini trend sparkline - hidden on very small screens */}
                        <SparklineChart ticker={stock.ticker} className="h-10 sm:h-12 w-14 sm:w-20 shrink-0 hidden xs:block" />
                        
                        <div className="text-right shrink-0">
                          <p className="text-base sm:text-lg font-mono font-bold mb-0.5">
                            ${currentPrice.toFixed(2)}
                          </p>
                          <div className={cn(
                            "flex items-center justify-end gap-0.5 sm:gap-1 text-xs sm:text-sm font-semibold font-mono",
                            isPricePositive ? "text-success" : "text-destructive"
                          )}>
                            {isPricePositive ? (
                              <ArrowUpRight className="h-3.5 sm:h-4 w-3.5 sm:w-4" />
                            ) : (
                              <ArrowDownRight className="h-3.5 sm:h-4 w-3.5 sm:w-4" />
                            )}
                            <span>
                              {isPricePositive ? "+" : ""}{priceChangePercent.toFixed(2)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 sm:py-12">
                <div className="inline-flex h-12 sm:h-16 w-12 sm:w-16 items-center justify-center rounded-full bg-muted mb-3 sm:mb-4">
                  <Lightbulb className="h-6 sm:h-8 w-6 sm:w-8 text-muted-foreground" />
                </div>
                <h3 className="text-sm sm:text-base font-semibold mb-1.5 sm:mb-2">No opportunities available</h3>
                <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                  All high-signal stocks are already in your watchlist
                </p>
                <Link href="/recommendations">
                  <Button variant="outline" size="sm" className="text-xs sm:text-sm">
                    Browse All Opportunities
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Empty state for new users - only show if no followed stocks */}
      {sortedFollowedStocks.length === 0 && (
        <Card>
          <CardContent className="pt-10 sm:pt-16 pb-10 sm:pb-16 px-4 sm:px-6">
            <div className="text-center max-w-md mx-auto">
              <div className="inline-flex h-16 sm:h-20 w-16 sm:w-20 items-center justify-center rounded-full bg-primary/10 mb-4 sm:mb-6">
                <Star className="h-8 sm:h-10 w-8 sm:w-10 text-primary" />
              </div>
              <h3 className="text-xl sm:text-2xl font-semibold mb-1.5 sm:mb-2">Your watchlist is empty</h3>
              <p className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6">
                Discover high-signal stocks and start building your portfolio
              </p>
              <Link href="/recommendations">
                <Button size="default">
                  <Lightbulb className="h-4 w-4 mr-2" />
                  Explore Opportunities
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
