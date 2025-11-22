import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Target,
  Star,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
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

  // Fetch followed stocks
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

  // Fetch high signal opportunities
  const { data: opportunities = [], isLoading: isLoadingOpportunities } = useQuery<HighSignalStock[]>({
    queryKey: ["/api/stocks/top-signals"],
    retry: false,
    meta: { ignoreError: true },
  });

  // Follow mutation
  const followMutation = useMutation({
    mutationFn: async (ticker: string) => {
      await apiRequest("POST", "/api/follow-stock", { ticker });
    },
    onSuccess: (_, ticker) => {
      queryClient.invalidateQueries({ queryKey: ["/api/followed-stocks-with-status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stocks/top-signals"] });
      toast({
        title: "Stock Followed",
        description: `${ticker} has been added to your watchlist. AI analysis will begin shortly.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Follow Failed",
        description: error.message || "Failed to follow stock. Please try again.",
        variant: "destructive",
      });
    },
  });

  const isLoading = isLoadingFollowed || isLoadingOpportunities;

  // Filter for actionable followed stocks only (ACT alignment, completed analysis)
  const actionableStocks = followedStocks.filter(s => 
    s.stanceAlignment === 'act' && 
    s.jobStatus === 'completed' &&
    (s.aiStance === 'BUY' || s.aiStance === 'SELL')
  );

  // Filter for top 3 discovery opportunities (high score, BUY/SELL only, not followed)
  const followedTickers = new Set(followedStocks.map(s => s.ticker.toUpperCase()));
  
  const topDiscoveries = opportunities
    .filter(o => {
      const hasHighScore = (o.integratedScore ?? 0) >= 70;
      const isActionable = o.aiStance === 'BUY' || o.aiStance === 'SELL';
      const notFollowed = !followedTickers.has(o.ticker.toUpperCase());
      return hasHighScore && isActionable && notFollowed;
    })
    .sort((a, b) => (b.integratedScore ?? 0) - (a.integratedScore ?? 0))
    .slice(0, 3);

  const renderDiscoveryCard = (stock: HighSignalStock) => {
    const priceChange = parseFloat(stock.priceChange || "0");
    const priceChangePercent = parseFloat(stock.priceChangePercent || "0");
    const isPricePositive = priceChange >= 0;
    const isFollowing = followMutation.isPending && followMutation.variables === stock.ticker;

    return (
      <Card 
        key={stock.ticker} 
        className="hover-elevate transition-all"
        data-testid={`card-discover-${stock.ticker}`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {stock.insiderAction === 'BUY' && (
                <Badge 
                  className="h-5 px-1.5 text-[11px] font-bold flex-shrink-0 bg-success text-success-foreground"
                  data-testid={`badge-insider-${stock.ticker}`}
                >
                  BUY
                </Badge>
              )}
              {stock.insiderAction === 'SELL' && (
                <Badge 
                  variant="destructive"
                  className="h-5 px-1.5 text-[11px] font-bold flex-shrink-0"
                  data-testid={`badge-insider-${stock.ticker}`}
                >
                  SELL
                </Badge>
              )}
              <div className="min-w-0">
                <CardTitle className="text-lg font-semibold font-mono">
                  {stock.ticker}
                </CardTitle>
                {stock.companyName && (
                  <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                    {stock.companyName}
                  </p>
                )}
              </div>
            </div>

            {stock.integratedScore != null && (
              <Badge 
                className={cn(
                  "h-6 px-2 text-xs font-bold flex-shrink-0 border-0",
                  stock.integratedScore >= 90 && "bg-amber-500 text-white dark:bg-amber-600",
                  stock.integratedScore >= 70 && stock.integratedScore < 90 && "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
                )}
                data-testid={`badge-score-${stock.ticker}`}
              >
                {stock.integratedScore}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="flex items-baseline justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Price</p>
              <p className="text-xl font-mono font-semibold">
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

          {stock.aiStance && (
            <div className="flex items-center gap-2 pt-2 border-t">
              <span className="text-xs text-muted-foreground">AI says:</span>
              <Badge 
                variant="default"
                className="h-5 px-2 text-[10px]"
                data-testid={`badge-ai-${stock.ticker}`}
              >
                {stock.aiStance}
              </Badge>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button 
              variant="default"
              size="sm" 
              className="flex-1" 
              onClick={() => followMutation.mutate(stock.ticker)}
              disabled={isFollowing}
              data-testid={`button-follow-${stock.ticker}`}
            >
              {isFollowing ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Following...
                </>
              ) : (
                <>
                  <Star className="h-4 w-4 mr-1" />
                  Follow
                </>
              )}
            </Button>
            <Button 
              variant="outline"
              size="sm" 
              asChild
              data-testid={`button-view-${stock.ticker}`}
            >
              <Link href={`/ticker/${stock.ticker}`}>
                Details
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderActionCard = (stock: FollowedStock) => {
    const priceChange = parseFloat(stock.priceChange || "0");
    const priceChangePercent = parseFloat(stock.priceChangePercent || "0");
    const isPricePositive = priceChange >= 0;

    return (
      <Card 
        key={stock.ticker} 
        className="hover-elevate transition-all border-l-4 border-l-primary"
        data-testid={`card-action-${stock.ticker}`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {stock.insiderAction === 'BUY' && (
                <Badge 
                  className="h-5 px-1.5 text-[11px] font-bold flex-shrink-0 bg-success text-success-foreground"
                >
                  BUY
                </Badge>
              )}
              {stock.insiderAction === 'SELL' && (
                <Badge 
                  variant="destructive"
                  className="h-5 px-1.5 text-[11px] font-bold flex-shrink-0"
                >
                  SELL
                </Badge>
              )}
              <CardTitle className="text-lg font-semibold font-mono">
                {stock.ticker}
              </CardTitle>
            </div>

            {stock.integratedScore != null && (
              <Badge 
                className={cn(
                  "h-6 px-2 text-xs font-bold flex-shrink-0 border-0",
                  stock.integratedScore >= 90 && "bg-amber-500 text-white dark:bg-amber-600",
                  stock.integratedScore >= 70 && stock.integratedScore < 90 && "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
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
              <p className="text-xs text-muted-foreground mb-1">Price</p>
              <p className="text-xl font-mono font-semibold">
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

          <div className="flex items-center gap-2 pt-2 border-t">
            <span className="text-xs text-muted-foreground">AI agrees:</span>
            <Badge 
              variant="default"
              className="h-5 px-2 text-[10px]"
            >
              {stock.aiStance}
            </Badge>
          </div>

          <Button 
            variant="default"
            size="sm" 
            className="w-full" 
            asChild
            data-testid={`button-review-${stock.ticker}`}
          >
            <Link href={`/ticker/${stock.ticker}`}>
              Review Analysis
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-8 max-w-screen-2xl mx-auto">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  const isNewUser = followedStocks.length === 0;

  return (
    <div className="p-6 space-y-8 max-w-screen-2xl mx-auto">
      {/* Hero Section */}
      <div>
        <h1 className="text-3xl font-bold mb-2" data-testid="text-page-title">
          {isNewUser ? "Welcome to Signal2" : "Dashboard"}
        </h1>
        <p className="text-muted-foreground max-w-2xl">
          {isNewUser 
            ? "Discover high-confidence insider trading opportunities powered by AI analysis."
            : actionableStocks.length > 0
            ? `You have ${actionableStocks.length} ${actionableStocks.length === 1 ? 'stock' : 'stocks'} requiring review. AI agrees with insider sentiment on these opportunities.`
            : "Explore new opportunities and monitor your watchlist."}
        </p>
      </div>

      {/* Section 1: Discover - Top 3 Unfollowed High Signals */}
      {topDiscoveries.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="h-6 w-6 text-amber-500" />
              <div>
                <h2 className="text-2xl font-semibold">Discover Top Signals</h2>
                <p className="text-sm text-muted-foreground">
                  High-confidence opportunities based on insider activity and AI analysis
                </p>
              </div>
            </div>
            <Button variant="outline" asChild data-testid="button-view-all">
              <Link href="/recommendations">
                View All
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {topDiscoveries.map(renderDiscoveryCard)}
          </div>
        </div>
      )}

      {/* Section 2: My Watchlist - Action Required */}
      {actionableStocks.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Target className="h-6 w-6 text-primary" />
            <div>
              <h2 className="text-2xl font-semibold">My Watchlist - Action Required</h2>
              <p className="text-sm text-muted-foreground">
                Stocks you're following where AI agrees with insider sentiment
              </p>
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {actionableStocks.map(renderActionCard)}
          </div>
        </div>
      )}

      {/* Empty State for New Users */}
      {isNewUser && topDiscoveries.length === 0 && (
        <Card className="p-12">
          <div className="text-center max-w-lg mx-auto space-y-4">
            <div className="flex justify-center">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
            </div>
            <h3 className="text-xl font-semibold">Ready to discover opportunities?</h3>
            <p className="text-sm text-muted-foreground">
              Explore insider trading signals powered by AI analysis. We track SEC filings, 
              analyze company fundamentals, and provide actionable recommendations.
            </p>
            <Button asChild data-testid="button-browse-opportunities">
              <Link href="/recommendations">
                <Sparkles className="h-4 w-4 mr-2" />
                Browse Opportunities
              </Link>
            </Button>
          </div>
        </Card>
      )}

      {/* Empty State for Returning Users */}
      {!isNewUser && actionableStocks.length === 0 && topDiscoveries.length === 0 && (
        <Card className="p-12">
          <div className="text-center max-w-lg mx-auto space-y-4">
            <div className="flex justify-center">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                <Target className="h-8 w-8 text-muted-foreground" />
              </div>
            </div>
            <h3 className="text-xl font-semibold">No Actions Required</h3>
            <p className="text-sm text-muted-foreground">
              All your followed stocks are either being analyzed or have mixed signals. 
              Explore new opportunities or check back later for updates.
            </p>
            <Button asChild data-testid="button-explore">
              <Link href="/recommendations">
                Explore Opportunities
              </Link>
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
