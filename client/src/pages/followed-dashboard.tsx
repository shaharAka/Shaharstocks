import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  Sparkles,
  BookOpen,
  Target,
  AlertCircle,
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

  // Fetch high signal opportunities (top stocks with integrated score >= 70)
  const { data: opportunities = [], isLoading: isLoadingOpportunities } = useQuery<HighSignalStock[]>({
    queryKey: ["/api/stocks/top-signals"],
    retry: false,
    meta: { ignoreError: true },
  });

  const isLoading = isLoadingFollowed || isLoadingOpportunities;

  // Group followed stocks
  const actStocks = followedStocks.filter(s => s.stanceAlignment === 'act');
  const watchingStocks = followedStocks.filter(s => s.stanceAlignment === 'hold' || !s.stanceAlignment);
  const processingCount = followedStocks.filter(s => 
    s.jobStatus === 'pending' || s.jobStatus === 'processing'
  ).length;

  // Filter high-signal opportunities (score >= 70, not already followed)
  // Create set of followed tickers for quick lookup
  const followedTickers = new Set(followedStocks.map(s => s.ticker.toUpperCase()));
  
  const highSignals = opportunities
    .filter(o => {
      const hasHighScore = (o.integratedScore ?? 0) >= 70;
      const notFollowed = !followedTickers.has(o.ticker.toUpperCase());
      return hasHighScore && notFollowed;
    })
    .sort((a, b) => (b.integratedScore ?? 0) - (a.integratedScore ?? 0)) // Sort by score descending
    .slice(0, 6);

  const renderStockCard = (stock: FollowedStock | HighSignalStock, showFollowButton = false) => {
    const isFollowedStock = 'stanceAlignment' in stock;
    const isProcessing = isFollowedStock && (stock.jobStatus === 'pending' || stock.jobStatus === 'processing');
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
              {'companyName' in stock && stock.companyName && (
                <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                  {stock.companyName}
                </p>
              )}
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

          {/* AI Stance */}
          {!isProcessing && stock.aiStance && (
            <div className="flex items-center gap-2 pt-2 border-t">
              <span className="text-xs text-muted-foreground">AI Recommendation:</span>
              <Badge 
                variant={isFollowedStock && (stock as FollowedStock).stanceAlignment === 'act' ? 'default' : 'secondary'}
                className="h-5 px-2 text-[10px]"
                data-testid={`badge-stance-${stock.ticker}`}
              >
                {stock.aiStance}
              </Badge>
            </div>
          )}

          {isProcessing && (
            <div className="flex items-center gap-2 text-muted-foreground pt-2 border-t">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-xs">Analyzing...</span>
            </div>
          )}

          {/* Action Button */}
          <Button 
            variant={showFollowButton ? "default" : "outline"}
            size="sm" 
            className="w-full" 
            asChild
            data-testid={`button-view-${stock.ticker}`}
          >
            <Link href={`/ticker/${stock.ticker}`}>
              {showFollowButton ? "View & Follow" : "View Analysis"}
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 max-w-screen-2xl mx-auto">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  // Determine user state for hero messaging
  const isNewUser = followedStocks.length === 0;
  const hasActionRequired = actStocks.length > 0;

  return (
    <div className="p-6 space-y-8 max-w-screen-2xl mx-auto">
      {/* Hero Section */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          {/* Left: Title & Guidance */}
          <div>
            <h1 className="text-3xl font-bold mb-2" data-testid="text-page-title">
              {isNewUser ? "Welcome to Signal2" : "Dashboard"}
            </h1>
            <p className="text-muted-foreground max-w-2xl">
              {isNewUser 
                ? "Start by exploring high-signal insider trading opportunities below. Our AI analyzes fundamentals, technicals, and insider actions to find the best trades."
                : hasActionRequired 
                ? "You have stocks requiring action. Review AI recommendations and make informed decisions."
                : "Monitor your followed stocks and discover new opportunities."}
            </p>
          </div>

          {/* Right: Quick Stats */}
          {!isNewUser && (
            <div className="flex flex-wrap gap-3">
              {actStocks.length > 0 && (
                <Card className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-2xl font-bold font-mono">{actStocks.length}</p>
                      <p className="text-xs text-muted-foreground">Action Required</p>
                    </div>
                  </div>
                </Card>
              )}
              {processingCount > 0 && (
                <Card className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
                    <div>
                      <p className="text-2xl font-bold font-mono">{processingCount}</p>
                      <p className="text-xs text-muted-foreground">Analyzing</p>
                    </div>
                  </div>
                </Card>
              )}
              <Card className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-amber-500" />
                  <div>
                    <p className="text-2xl font-bold font-mono">{highSignals.length}</p>
                    <p className="text-xs text-muted-foreground">New Signals</p>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Section 1: Action Required (Followed Stocks with ACT alignment) */}
      {actStocks.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Action Required</h2>
            </div>
            <Badge variant="default" className="h-6">
              {actStocks.length} {actStocks.length === 1 ? 'Stock' : 'Stocks'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            AI agrees with insider sentiment. These opportunities warrant immediate review.
          </p>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {actStocks.map(stock => renderStockCard(stock, false))}
          </div>
        </div>
      )}

      {/* Section 2: Top Insider Signals */}
      {highSignals.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500" />
                <h2 className="text-xl font-semibold">Top Insider Signals</h2>
              </div>
              <Badge variant="outline" className="h-6">
                Score ≥ 70
              </Badge>
            </div>
            <Button variant="outline" size="sm" asChild data-testid="button-view-all-opportunities">
              <Link href="/recommendations">View All</Link>
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            High-confidence opportunities based on insider trading analysis and AI recommendations.
          </p>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {highSignals.map(stock => renderStockCard(stock, true))}
          </div>
        </div>
      )}

      {/* Section 3: Watching (HOLD or No Alignment stocks) */}
      {watchingStocks.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-xl font-semibold">Monitoring</h2>
            </div>
            <Badge variant="secondary" className="h-6">
              {watchingStocks.length}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Stocks you're following with mixed signals or pending analysis.
          </p>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {watchingStocks.map(stock => renderStockCard(stock, false))}
          </div>
        </div>
      )}

      {/* Empty State for New Users */}
      {isNewUser && highSignals.length === 0 && (
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
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild data-testid="button-browse-opportunities">
                <Link href="/recommendations">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Browse Opportunities
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/community/discussion">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Learning Center
                </Link>
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Learning Center Section */}
      {!isNewUser && (
        <Card className="bg-muted/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              <CardTitle>Need Help?</CardTitle>
            </div>
            <CardDescription>
              Learn how to interpret signals, understand AI recommendations, and make informed trading decisions.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button variant="outline" size="sm" asChild>
              <Link href="/community/discussion">
                Community Discussion
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/community/feature-suggestions">
                Feature Requests
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
