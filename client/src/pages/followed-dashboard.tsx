import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Star, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
}

interface HighSignalStock {
  ticker: string;
  companyName?: string;
  currentPrice: string;
  priceChange?: string;
  priceChangePercent?: string;
  insiderAction?: 'BUY' | 'SELL' | null;
  aiStance?: 'BUY' | 'SELL' | 'HOLD' | null;
  integratedScore?: number | null;
  isFollowing?: boolean;
}

export default function FollowedDashboard() {
  const { toast } = useToast();

  const { data: followedStocks = [], isLoading: isLoadingFollowed } = useQuery<FollowedStock[]>({
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

  const { data: opportunities = [], isLoading: isLoadingOpportunities } = useQuery<HighSignalStock[]>({
    queryKey: ["/api/stocks/top-signals"],
    retry: false,
    meta: { ignoreError: true },
  });

  const followMutation = useMutation({
    mutationFn: async (ticker: string) => {
      await apiRequest("POST", "/api/follow-stock", { ticker });
    },
    onSuccess: (_, ticker) => {
      queryClient.invalidateQueries({ queryKey: ["/api/followed-stocks-with-status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stocks/top-signals"] });
      toast({
        title: "Stock Followed",
        description: `${ticker} added to watchlist`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to follow stock",
        variant: "destructive",
      });
    },
  });

  const isLoading = isLoadingFollowed || isLoadingOpportunities;

  // Filter actionable followed stocks
  const actionableStocks = followedStocks.filter(s => 
    s.stanceAlignment === 'act' && 
    s.jobStatus === 'completed' &&
    (s.aiStance === 'BUY' || s.aiStance === 'SELL')
  );

  // Filter top 5 discovery opportunities
  const followedTickers = new Set(followedStocks.map(s => s.ticker.toUpperCase()));
  const topDiscoveries = opportunities
    .filter(o => {
      const hasHighScore = (o.integratedScore ?? 0) >= 70;
      const isActionable = o.aiStance === 'BUY' || o.aiStance === 'SELL';
      const notFollowed = !followedTickers.has(o.ticker.toUpperCase());
      return hasHighScore && isActionable && notFollowed;
    })
    .sort((a, b) => (b.integratedScore ?? 0) - (a.integratedScore ?? 0))
    .slice(0, 5);

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

  return (
    <div className="p-6 space-y-6 max-w-screen-2xl mx-auto">
      {/* Hero Section with Stats */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold" data-testid="text-page-title">
          Dashboard
        </h1>
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Action Required
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{actionableStocks.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Stocks to review
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                High Signals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{topDiscoveries.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                New opportunities
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Following
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{followedStocks.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Total watchlist
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Discover Section - List Format */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Top Opportunities</h2>
          </div>
          <Button variant="ghost" size="sm" asChild data-testid="button-view-all">
            <Link href="/recommendations">View All</Link>
          </Button>
        </div>

        {topDiscoveries.length > 0 ? (
          <div className="space-y-2">
            {topDiscoveries.map((stock) => {
              const priceChange = parseFloat(stock.priceChange || "0");
              const priceChangePercent = parseFloat(stock.priceChangePercent || "0");
              const isPricePositive = priceChange >= 0;
              const isFollowing = followMutation.isPending && followMutation.variables === stock.ticker;

              return (
                <div 
                  key={stock.ticker}
                  className="flex items-center justify-between p-4 rounded-lg border hover-elevate"
                  data-testid={`row-discover-${stock.ticker}`}
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-lg">
                        {stock.ticker}
                      </span>
                      <Badge 
                        variant={stock.aiStance === 'BUY' ? 'default' : 'destructive'}
                        className="h-5 text-[10px]"
                      >
                        {stock.aiStance}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-3">
                      <div>
                        <p className="text-sm font-mono font-semibold">
                          ${parseFloat(stock.currentPrice).toFixed(2)}
                        </p>
                        {stock.priceChange && (
                          <div className={cn(
                            "flex items-center gap-1 text-xs font-mono",
                            isPricePositive ? "text-success" : "text-destructive"
                          )}>
                            {isPricePositive ? (
                              <ArrowUpRight className="h-3 w-3" />
                            ) : (
                              <ArrowDownRight className="h-3 w-3" />
                            )}
                            <span>
                              {isPricePositive ? "+" : ""}{priceChangePercent.toFixed(2)}%
                            </span>
                          </div>
                        )}
                      </div>

                      <Badge 
                        variant="outline"
                        className={cn(
                          "h-6 px-2 text-xs font-semibold",
                          (stock.integratedScore ?? 0) >= 90 && "border-amber-500 text-amber-600 dark:text-amber-400",
                          (stock.integratedScore ?? 0) >= 70 && (stock.integratedScore ?? 0) < 90 && "border-amber-300 text-amber-600 dark:text-amber-400"
                        )}
                      >
                        Score: {stock.integratedScore}
                      </Badge>
                    </div>
                  </div>

                  <Button 
                    size="sm"
                    onClick={() => followMutation.mutate(stock.ticker)}
                    disabled={isFollowing}
                    data-testid={`button-follow-${stock.ticker}`}
                  >
                    <Star className="h-4 w-4 mr-1" />
                    {isFollowing ? "Following..." : "Follow"}
                  </Button>
                </div>
              );
            })}
          </div>
        ) : (
          <Card className="p-8">
            <div className="text-center">
              <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground mb-3">
                No new opportunities available
              </p>
              <Button variant="outline" size="sm" asChild>
                <Link href="/recommendations">Browse All Stocks</Link>
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* My Watchlist Section - Card Format */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">My Watchlist</h2>
          </div>
          <Button variant="ghost" size="sm" asChild data-testid="button-view-watchlist">
            <Link href="/followed">View All</Link>
          </Button>
        </div>

        {actionableStocks.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {actionableStocks.map((stock) => {
              const priceChange = parseFloat(stock.priceChange || "0");
              const priceChangePercent = parseFloat(stock.priceChangePercent || "0");
              const isPricePositive = priceChange >= 0;

              return (
                <Card 
                  key={stock.ticker}
                  className="hover-elevate"
                  data-testid={`card-watchlist-${stock.ticker}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-xl font-mono font-semibold">
                          {stock.ticker}
                        </CardTitle>
                        <Badge 
                          variant={stock.aiStance === 'BUY' ? 'default' : 'destructive'}
                          className="h-5 text-[10px]"
                        >
                          {stock.aiStance}
                        </Badge>
                      </div>
                      {stock.integratedScore != null && (
                        <Badge 
                          variant="outline"
                          className={cn(
                            "h-6 px-2 text-xs font-semibold",
                            stock.integratedScore >= 90 && "border-amber-500 text-amber-600 dark:text-amber-400",
                            stock.integratedScore >= 70 && stock.integratedScore < 90 && "border-amber-300 text-amber-600 dark:text-amber-400"
                          )}
                        >
                          {stock.integratedScore}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <div className="flex items-baseline justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Current Price</p>
                        <p className="text-2xl font-mono font-semibold">
                          ${parseFloat(stock.currentPrice).toFixed(2)}
                        </p>
                      </div>
                      {stock.priceChange && (
                        <div className="text-right">
                          <div className={cn(
                            "flex items-center gap-1 text-sm font-medium font-mono",
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
                      )}
                    </div>

                    <Button 
                      variant="default"
                      size="sm" 
                      className="w-full" 
                      asChild
                      data-testid={`button-review-${stock.ticker}`}
                    >
                      <Link href={`/ticker/${stock.ticker}`}>
                        View Analysis
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : isNewUser ? (
          <Card className="p-8">
            <div className="text-center">
              <Star className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground mb-3">
                Start following stocks to track them here
              </p>
              <Button variant="outline" size="sm" asChild>
                <Link href="/recommendations">Discover Stocks</Link>
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="p-8">
            <div className="text-center">
              <Star className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground mb-3">
                No stocks require action at this time
              </p>
              <Button variant="outline" size="sm" asChild>
                <Link href="/followed">View All Followed Stocks</Link>
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
