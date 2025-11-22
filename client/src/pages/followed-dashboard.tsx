import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Star, ArrowUpRight, ArrowDownRight, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import type { Stock } from "@shared/schema";

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

type StockWithAnalysis = Stock & {
  integratedScore?: number | null;
  aiStance?: 'BUY' | 'SELL' | 'HOLD' | null;
  isFollowing?: boolean;
};

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

  return (
    <div className="p-6 space-y-6 max-w-screen-2xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-page-title">
          My Watchlist
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {followedStocks.length} {followedStocks.length === 1 ? 'stock' : 'stocks'} you're following
        </p>
      </div>

      {/* Followed Stocks */}
      {sortedFollowedStocks.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sortedFollowedStocks.map((stock) => {
            const priceChange = parseFloat(stock.priceChange || "0");
            const priceChangePercent = parseFloat(stock.priceChangePercent || "0");
            const isPricePositive = priceChange >= 0;
            const isAnalyzing = stock.jobStatus === 'pending' || stock.jobStatus === 'processing';

            return (
              <Link href={`/ticker/${stock.ticker}`} key={stock.ticker}>
                <Card 
                  className="hover-elevate active-elevate-2 cursor-pointer h-full"
                  data-testid={`card-watchlist-${stock.ticker}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-xl font-mono font-semibold">
                          {stock.ticker}
                        </CardTitle>
                        {isAnalyzing ? (
                          <Badge variant="outline" className="h-5 text-[10px]">
                            Analyzing...
                          </Badge>
                        ) : stock.aiStance && (
                          <Badge 
                            variant={stock.aiStance === 'BUY' ? 'default' : stock.aiStance === 'SELL' ? 'destructive' : 'secondary'}
                            className="h-5 text-[10px]"
                          >
                            {stock.aiStance}
                          </Badge>
                        )}
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

                  <CardContent>
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
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {/* Top Opportunities Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              <CardTitle className="text-lg">High-Signal Opportunities</CardTitle>
            </div>
            <Link href="/recommendations">
              <Button variant="ghost" size="sm" className="text-xs" data-testid="link-view-all-opportunities">
                View All
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingOpportunities ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3 flex-1">
                    <Skeleton className="h-10 w-10 rounded" />
                    <div className="space-y-1 flex-1">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                  <Skeleton className="h-6 w-12" />
                </div>
              ))}
            </div>
          ) : topOpportunities.length > 0 ? (
            <div className="space-y-1">
              {topOpportunities.map((stock) => {
                const currentPrice = parseFloat(stock.currentPrice);
                const previousPrice = parseFloat(stock.previousClose || stock.currentPrice);
                const priceChange = currentPrice - previousPrice;
                const priceChangePercent = (priceChange / previousPrice) * 100;
                const isPricePositive = priceChange >= 0;

                return (
                  <Link href={`/ticker/${stock.ticker}`} key={stock.ticker}>
                    <div 
                      className="flex items-center justify-between py-3 px-2 rounded-md hover-elevate active-elevate-2 cursor-pointer"
                      data-testid={`opportunity-${stock.ticker}`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="flex flex-col items-center justify-center">
                          <Badge 
                            variant="outline"
                            className={cn(
                              "h-8 w-12 flex items-center justify-center font-mono font-semibold text-sm",
                              stock.integratedScore! >= 90 && "border-amber-500 text-amber-600 dark:text-amber-400",
                              stock.integratedScore! >= 70 && stock.integratedScore! < 90 && "border-amber-300 text-amber-600 dark:text-amber-400"
                            )}
                          >
                            {stock.integratedScore}
                          </Badge>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-mono font-semibold">{stock.ticker}</p>
                            {stock.aiStance && (
                              <Badge variant="default" className="h-4 text-[9px] px-1">
                                {stock.aiStance}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {stock.companyName}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm font-mono font-medium">
                            ${currentPrice.toFixed(2)}
                          </p>
                          <p className={cn(
                            "text-xs font-mono",
                            isPricePositive ? "text-success" : "text-destructive"
                          )}>
                            {isPricePositive ? "+" : ""}{priceChangePercent.toFixed(2)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">
                No high-signal opportunities available right now
              </p>
              <Link href="/recommendations">
                <Button variant="outline" size="sm" className="mt-3">
                  Browse All Opportunities
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Empty state for new users - only show if no followed stocks */}
      {sortedFollowedStocks.length === 0 && (
        <Card className="p-8">
          <div className="text-center">
            <Star className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground mb-3">
              Start following stocks to track them here
            </p>
            <Link href="/recommendations">
              <Button variant="outline" size="sm">
                Discover Stocks
              </Button>
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}
