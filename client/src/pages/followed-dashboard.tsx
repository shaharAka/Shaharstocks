import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp,
  TrendingDown,
  Loader2,
  Star,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
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

  // Group stocks by stance alignment
  const actStocks = followedStocks.filter(s => s.stanceAlignment === 'act');
  const holdStocks = followedStocks.filter(s => s.stanceAlignment === 'hold');
  const noAlignmentStocks = followedStocks.filter(s => !s.stanceAlignment);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-6 w-16" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32 mb-4" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const renderStockCard = (stock: FollowedStock) => {
    const isProcessing = stock.jobStatus === 'pending' || stock.jobStatus === 'processing';
    const priceChange = parseFloat(stock.priceChange || "0");
    const priceChangePercent = parseFloat(stock.priceChangePercent || "0");
    const isPricePositive = priceChange >= 0;

    return (
      <Card 
        key={stock.ticker} 
        className="hover-elevate transition-all"
        data-testid={`card-stock-${stock.ticker}`}
      >
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
          <div className="flex items-center gap-2 min-w-0">
            {/* Insider Action Badge */}
            {stock.insiderAction === 'BUY' && !isProcessing && (
              <Badge 
                className="h-5 px-1.5 text-[11px] font-bold flex-shrink-0 bg-success text-success-foreground"
                data-testid={`badge-insider-${stock.ticker}`}
              >
                BUY
              </Badge>
            )}
            {stock.insiderAction === 'SELL' && !isProcessing && (
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
            </div>
          </div>

          {/* Integrated Score Badge */}
          {stock.integratedScore != null && !isProcessing && (
            <Badge 
              className={cn(
                "h-6 px-2 text-xs font-bold flex-shrink-0 border-0",
                stock.integratedScore >= 90 && "bg-amber-500 text-white dark:bg-amber-600",
                stock.integratedScore >= 70 && stock.integratedScore < 90 && "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
                stock.integratedScore >= 50 && stock.integratedScore < 70 && "bg-secondary text-secondary-foreground",
                stock.integratedScore < 50 && "bg-secondary text-muted-foreground opacity-60"
              )}
              data-testid={`badge-score-${stock.ticker}`}
            >
              {stock.integratedScore}
            </Badge>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Price Information */}
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
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isPricePositive ? "+" : ""}${Math.abs(priceChange).toFixed(2)}
                </p>
              </div>
            )}
          </div>

          {/* AI Stance and Status */}
          <div className="flex items-center justify-between pt-3 border-t">
            <div className="flex items-center gap-2">
              {isProcessing ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-xs">Analyzing...</span>
                </div>
              ) : stock.aiStance && (
                <>
                  <span className="text-xs text-muted-foreground">AI Stance:</span>
                  <Badge 
                    variant={stock.stanceAlignment === 'act' ? 'default' : 'secondary'}
                    className="h-5 px-2 text-[10px]"
                    data-testid={`badge-stance-${stock.ticker}`}
                  >
                    {stock.aiStance}
                  </Badge>
                </>
              )}
            </div>

            {stock.hasEnteredPosition && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Star className="h-3 w-3 fill-current" />
                <span>In Position</span>
              </div>
            )}
          </div>

          {/* Action Button */}
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full" 
            asChild
            data-testid={`button-view-${stock.ticker}`}
          >
            <Link href={`/ticker/${stock.ticker}`}>
              View Details
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-6 space-y-6 max-w-screen-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold mb-1" data-testid="text-page-title">
          Following Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          Track your followed stocks and AI recommendations
        </p>
      </div>

      {followedStocks.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Followed Stocks Yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Start following stocks to see them here
            </p>
            <Button asChild data-testid="button-browse-opportunities">
              <Link href="/recommendations">Browse Opportunities</Link>
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* ACT Stocks - High Priority */}
          {actStocks.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-lg font-semibold">Action Recommended</h2>
                <Badge variant="default" className="h-5">
                  {actStocks.length}
                </Badge>
              </div>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {actStocks.map(renderStockCard)}
              </div>
            </div>
          )}

          {/* HOLD Stocks */}
          {holdStocks.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-lg font-semibold">Monitoring</h2>
                <Badge variant="secondary" className="h-5">
                  {holdStocks.length}
                </Badge>
              </div>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {holdStocks.map(renderStockCard)}
              </div>
            </div>
          )}

          {/* No Alignment Stocks - Processing or Missing Data */}
          {noAlignmentStocks.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-lg font-semibold">Analyzing</h2>
                <Badge variant="outline" className="h-5">
                  {noAlignmentStocks.length}
                </Badge>
              </div>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {noAlignmentStocks.map(renderStockCard)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
