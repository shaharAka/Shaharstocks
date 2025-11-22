import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Star, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">
            My Watchlist
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {followedStocks.length} {followedStocks.length === 1 ? 'stock' : 'stocks'} you're following
          </p>
        </div>
        <Button asChild data-testid="button-discover">
          <Link href="/recommendations">
            <TrendingUp className="h-4 w-4 mr-2" />
            Discover Stocks
          </Link>
        </Button>
      </div>

      {/* Followed Stocks */}
      {sortedFollowedStocks.length > 0 ? (
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
      ) : (
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
      )}
    </div>
  );
}
