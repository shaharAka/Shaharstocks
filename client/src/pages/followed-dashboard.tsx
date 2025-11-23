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
  sellPrice: z.string().min(1, "Sell price is required").refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Must be a valid positive number",
  }),
  quantity: z.string().min(1, "Quantity is required").refine((val) => !isNaN(parseInt(val)) && parseInt(val) > 0, {
    message: "Must be a valid positive number",
  }),
});

type ClosePositionForm = z.infer<typeof closePositionSchema>;

function ClosePositionDialog({ ticker, entryPrice, onSuccess }: { ticker: string; entryPrice: string; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  
  const form = useForm<ClosePositionForm>({
    resolver: zodResolver(closePositionSchema),
    defaultValues: {
      sellPrice: "",
      quantity: "1",
    },
  });
  
  const closePositionMutation = useMutation({
    mutationFn: async (data: ClosePositionForm) => {
      return apiRequest(`/api/stocks/${ticker}/close-position`, {
        method: "POST",
        body: JSON.stringify({
          sellPrice: parseFloat(data.sellPrice),
          quantity: parseInt(data.quantity),
        }),
      });
    },
    onSuccess: (data) => {
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
            Entry Price: ${parseFloat(entryPrice).toFixed(2)}
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
                disabled={closePositionMutation.isPending}
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
      <div className="p-6 space-y-6 max-w-screen-2xl mx-auto">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
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
  const totalPnl = totalPnlData?.totalPnl ?? 0;

  return (
    <div className="p-6 space-y-8 max-w-screen-2xl mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">
          My Watchlist
        </h1>
        <p className="text-muted-foreground">
          Track your followed stocks and discover new opportunities
        </p>
      </div>

      {/* Stats Overview - Only show if user has stocks */}
      {followedStocks.length > 0 && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Stocks
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{followedStocks.length}</div>
              <p className="text-xs text-muted-foreground">
                Actively tracking
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                High Signals
              </CardTitle>
              <Zap className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{highSignalCount}</div>
              <p className="text-xs text-muted-foreground">
                Score ≥ 70
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Buy Signals
              </CardTitle>
              <Target className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{buySignals}</div>
              <p className="text-xs text-muted-foreground">
                AI recommends BUY
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total P&L
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={cn(
                "text-2xl font-bold font-mono",
                totalPnl >= 0 ? "text-success" : "text-destructive"
              )}>
                {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                Realized gains/losses
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Followed Stocks */}
      {sortedFollowedStocks.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold tracking-tight">Your Stocks</h2>
            <span className="text-sm text-muted-foreground">
              {sortedFollowedStocks.length} {sortedFollowedStocks.length === 1 ? 'stock' : 'stocks'}
            </span>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sortedFollowedStocks.map((stock) => {
              const priceChange = parseFloat(stock.priceChange || "0");
              const priceChangePercent = parseFloat(stock.priceChangePercent || "0");
              const isPricePositive = priceChange >= 0;
              const isAnalyzing = stock.jobStatus === 'pending' || stock.jobStatus === 'processing';
              const isHighSignal = (stock.integratedScore ?? 0) >= 70;

              return (
                <Link href={`/ticker/${stock.ticker}`} key={stock.ticker}>
                  <Card 
                    className={cn(
                      "hover-elevate active-elevate-2 cursor-pointer h-full transition-all",
                      isHighSignal && "border-amber-500/20"
                    )}
                    data-testid={`card-watchlist-${stock.ticker}`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-xl font-mono font-semibold">
                              {stock.ticker}
                            </CardTitle>
                            {isAnalyzing && (
                              <Badge variant="outline" className="h-5 text-[10px]">
                                Analyzing...
                              </Badge>
                            )}
                          </div>
                          {stock.aiStance && !isAnalyzing && (
                            <Badge 
                              variant={stock.aiStance === 'BUY' ? 'default' : stock.aiStance === 'SELL' ? 'destructive' : 'secondary'}
                              className="h-5 text-[10px] w-fit"
                            >
                              {stock.aiStance}
                            </Badge>
                          )}
                        </div>
                        {stock.integratedScore != null && (
                          <Badge 
                            variant="outline"
                            className={cn(
                              "h-7 px-2.5 text-sm font-bold",
                              stock.integratedScore >= 90 && "border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400",
                              stock.integratedScore >= 70 && stock.integratedScore < 90 && "border-amber-300 bg-amber-300/10 text-amber-600 dark:text-amber-400"
                            )}
                          >
                            {stock.integratedScore}
                          </Badge>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-end justify-between">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Current Price</p>
                            <p className="text-3xl font-mono font-bold">
                              ${parseFloat(stock.currentPrice).toFixed(2)}
                            </p>
                          </div>
                          {stock.priceChange && (
                            <div className="text-right">
                              <div className={cn(
                                "flex items-center gap-1 text-base font-semibold font-mono",
                                isPricePositive ? "text-success" : "text-destructive"
                              )}>
                                {isPricePositive ? (
                                  <ArrowUpRight className="h-5 w-5" />
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
                        
                        {/* Mini trend line */}
                        {stock.priceChange && (() => {
                          const previousPrice = parseFloat(stock.currentPrice) - priceChange;
                          const currentPriceNum = parseFloat(stock.currentPrice);
                          const minPrice = Math.min(previousPrice, currentPriceNum);
                          const maxPrice = Math.max(previousPrice, currentPriceNum);
                          const padding = (maxPrice - minPrice) * 0.2 || 0.01;
                          
                          return (
                            <div className="h-12 -mx-2">
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart
                                  data={[
                                    { price: previousPrice },
                                    { price: currentPriceNum }
                                  ]}
                                  margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                                >
                                  <YAxis 
                                    domain={[minPrice - padding, maxPrice + padding]}
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
                        })()}

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
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-amber-500" />
              <h2 className="text-xl font-semibold tracking-tight">High-Signal Opportunities</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Top-rated stocks you're not following yet
            </p>
          </div>
          <Link href="/recommendations">
            <Button variant="ghost" size="sm" data-testid="link-view-all-opportunities">
              View All
            </Button>
          </Link>
        </div>

        <Card>
          <CardContent className="pt-6">
            {isLoadingOpportunities ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4 py-3">
                    <Skeleton className="h-12 w-12 rounded" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                    <Skeleton className="h-10 w-24" />
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
                    <Link href={`/ticker/${stock.ticker}`} key={stock.ticker}>
                      <div 
                        className="flex items-center gap-4 py-4 hover-elevate active-elevate-2 cursor-pointer rounded-lg px-2 -mx-2"
                        data-testid={`opportunity-${stock.ticker}`}
                      >
                        <Badge 
                          variant="outline"
                          className={cn(
                            "h-12 w-12 flex items-center justify-center font-mono font-bold text-base rounded-lg shrink-0",
                            stock.integratedScore! >= 90 && "border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400",
                            stock.integratedScore! >= 70 && stock.integratedScore! < 90 && "border-amber-300 bg-amber-300/10 text-amber-600 dark:text-amber-400"
                          )}
                        >
                          {stock.integratedScore}
                        </Badge>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono font-bold text-base">{stock.ticker}</span>
                            {stock.aiStance && (
                              <Badge variant="default" className="h-4 text-[9px] px-1.5">
                                {stock.aiStance}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {stock.companyName}
                          </p>
                        </div>
                        
                        {/* Mini trend sparkline */}
                        {(() => {
                          const minPrice = Math.min(previousPrice, currentPrice);
                          const maxPrice = Math.max(previousPrice, currentPrice);
                          const padding = (maxPrice - minPrice) * 0.2 || 0.01;
                          
                          return (
                            <div className="h-12 w-20 shrink-0">
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart
                                  data={[
                                    { price: previousPrice },
                                    { price: currentPrice }
                                  ]}
                                  margin={{ top: 2, right: 2, left: 2, bottom: 2 }}
                                >
                                  <YAxis 
                                    domain={[minPrice - padding, maxPrice + padding]}
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
                        })()}
                        
                        <div className="text-right shrink-0">
                          <p className="text-lg font-mono font-bold mb-0.5">
                            ${currentPrice.toFixed(2)}
                          </p>
                          <div className={cn(
                            "flex items-center justify-end gap-1 text-sm font-semibold font-mono",
                            isPricePositive ? "text-success" : "text-destructive"
                          )}>
                            {isPricePositive ? (
                              <ArrowUpRight className="h-4 w-4" />
                            ) : (
                              <ArrowDownRight className="h-4 w-4" />
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
              <div className="text-center py-12">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                  <Lightbulb className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold mb-2">No opportunities available</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  All high-signal stocks are already in your watchlist
                </p>
                <Link href="/recommendations">
                  <Button variant="outline" size="sm">
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
          <CardContent className="pt-16 pb-16">
            <div className="text-center max-w-md mx-auto">
              <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 mb-6">
                <Star className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-2xl font-semibold mb-2">Your watchlist is empty</h3>
              <p className="text-muted-foreground mb-6">
                Discover high-signal stocks and start building your portfolio
              </p>
              <Link href="/recommendations">
                <Button size="lg">
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
