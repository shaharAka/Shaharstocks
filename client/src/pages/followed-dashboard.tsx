import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
        title: "Following",
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

  // Filter actionable followed stocks: ACT alignment, completed, BUY/SELL only
  const actionableStocks = followedStocks.filter(s => 
    s.stanceAlignment === 'act' && 
    s.jobStatus === 'completed' &&
    (s.aiStance === 'BUY' || s.aiStance === 'SELL')
  );

  // Filter top 3 discovery opportunities
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

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 max-w-screen-2xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <div className="grid md:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  const isNewUser = followedStocks.length === 0;

  return (
    <div className="p-6 space-y-6 max-w-screen-2xl mx-auto">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-semibold mb-1" data-testid="text-page-title">
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          {isNewUser 
            ? "High-confidence trading opportunities powered by AI"
            : `${actionableStocks.length} ${actionableStocks.length === 1 ? 'stock requires' : 'stocks require'} review`}
        </p>
      </div>

      {/* Two Column Layout */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Discover Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-2 border-b">
            <h2 className="text-lg font-medium">Discover</h2>
            <Button variant="ghost" size="sm" asChild data-testid="button-view-all">
              <Link href="/recommendations">View All</Link>
            </Button>
          </div>

          {topDiscoveries.length > 0 ? (
            <div className="space-y-2">
              {topDiscoveries.map((stock) => (
                <div 
                  key={stock.ticker}
                  className="flex items-center justify-between p-3 rounded-md border hover-elevate"
                  data-testid={`row-discover-${stock.ticker}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-semibold text-base">
                      {stock.ticker}
                    </span>
                    <Badge 
                      variant={stock.aiStance === 'BUY' ? 'default' : 'destructive'}
                      className="h-5 text-[10px]"
                    >
                      {stock.aiStance}
                    </Badge>
                    <Badge 
                      variant="outline"
                      className={cn(
                        "h-5 text-[10px] font-semibold",
                        (stock.integratedScore ?? 0) >= 90 && "border-amber-500 text-amber-600 dark:text-amber-400",
                        (stock.integratedScore ?? 0) >= 70 && (stock.integratedScore ?? 0) < 90 && "border-amber-300 text-amber-600 dark:text-amber-400"
                      )}
                    >
                      {stock.integratedScore}
                    </Badge>
                  </div>
                  <Button 
                    size="sm"
                    onClick={() => followMutation.mutate(stock.ticker)}
                    disabled={followMutation.isPending && followMutation.variables === stock.ticker}
                    data-testid={`button-follow-${stock.ticker}`}
                  >
                    Follow
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center border rounded-md">
              <p className="text-sm text-muted-foreground">
                No new opportunities at the moment
              </p>
              <Button variant="outline" size="sm" className="mt-3" asChild>
                <Link href="/recommendations">Browse All</Link>
              </Button>
            </div>
          )}
        </div>

        {/* My Watchlist Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-2 border-b">
            <h2 className="text-lg font-medium">My Watchlist</h2>
            <Button variant="ghost" size="sm" asChild data-testid="button-view-watchlist">
              <Link href="/followed">View All</Link>
            </Button>
          </div>

          {actionableStocks.length > 0 ? (
            <div className="space-y-2">
              {actionableStocks.map((stock) => (
                <div 
                  key={stock.ticker}
                  className="flex items-center justify-between p-3 rounded-md border hover-elevate"
                  data-testid={`row-watchlist-${stock.ticker}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-semibold text-base">
                      {stock.ticker}
                    </span>
                    <Badge 
                      variant={stock.aiStance === 'BUY' ? 'default' : 'destructive'}
                      className="h-5 text-[10px]"
                    >
                      {stock.aiStance}
                    </Badge>
                    <Badge 
                      variant="outline"
                      className={cn(
                        "h-5 text-[10px] font-semibold",
                        (stock.integratedScore ?? 0) >= 90 && "border-amber-500 text-amber-600 dark:text-amber-400",
                        (stock.integratedScore ?? 0) >= 70 && (stock.integratedScore ?? 0) < 90 && "border-amber-300 text-amber-600 dark:text-amber-400"
                      )}
                    >
                      {stock.integratedScore}
                    </Badge>
                  </div>
                  <Button 
                    size="sm"
                    variant="outline"
                    asChild
                    data-testid={`button-review-${stock.ticker}`}
                  >
                    <Link href={`/ticker/${stock.ticker}`}>
                      Review
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          ) : isNewUser ? (
            <div className="p-8 text-center border rounded-md">
              <p className="text-sm text-muted-foreground">
                Follow stocks to track them here
              </p>
              <Button variant="outline" size="sm" className="mt-3" asChild>
                <Link href="/recommendations">Discover Stocks</Link>
              </Button>
            </div>
          ) : (
            <div className="p-8 text-center border rounded-md">
              <p className="text-sm text-muted-foreground">
                No stocks require action right now
              </p>
              <Button variant="outline" size="sm" className="mt-3" asChild>
                <Link href="/followed">View All Followed</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
