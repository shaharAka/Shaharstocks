import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  TrendingUp,
  TrendingDown,
  Star,
  Search,
  Loader2,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useUser } from "@/contexts/UserContext";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

type FollowedStock = {
  ticker: string;
  currentPrice: string;
  previousClose?: string;
  companyName?: string;
  marketCap?: string;
  jobStatus?: 'pending' | 'processing' | 'completed' | 'failed' | null;
  insiderAction?: 'BUY' | 'SELL' | null;
  aiStance?: 'BUY' | 'SELL' | 'HOLD' | null;
  aiScore?: number | null;
  integratedScore?: number | null;
  stanceAlignment?: 'act' | 'hold' | null;
};

export default function Following() {
  const { toast } = useToast();
  const { user } = useUser();
  const [tickerSearch, setTickerSearch] = useState("");

  const { data: followedStocks = [], isLoading } = useQuery<FollowedStock[]>({
    queryKey: ["/api/followed-stocks-with-status"],
    enabled: !!user,
    refetchInterval: (query) => {
      const hasActiveJobs = query.state.data?.some((stock) => 
        stock.jobStatus === 'pending' || stock.jobStatus === 'processing'
      );
      return hasActiveJobs ? 5000 : false;
    },
  });

  const { data: holdings = [] } = useQuery<any[]>({
    queryKey: ["/api/portfolio/holdings"],
    enabled: !!user,
  });

  const unfollowMutation = useMutation({
    mutationFn: async (ticker: string) => {
      return await apiRequest("DELETE", `/api/stocks/${ticker}/follow`, null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/followed-stocks-with-status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/followed-stocks/count"] });
      toast({
        title: "Stock Unfollowed",
        description: "Stock removed from your following list",
      });
    },
  });

  const enterPositionMutation = useMutation({
    mutationFn: async ({ ticker, price }: { ticker: string; price: number }) => {
      return await apiRequest("POST", "/api/portfolio/holdings", {
        ticker,
        quantity: 1,
        averagePurchasePrice: price.toString(),
        isSimulated: false,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/holdings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/positions/count"] });
      toast({
        title: "Position Entered",
        description: "Stock added to your positions",
      });
    },
  });

  const filteredStocks = useMemo(() => {
    if (!tickerSearch.trim()) return followedStocks;
    const search = tickerSearch.toUpperCase();
    return followedStocks.filter(s => 
      s.ticker.includes(search) || 
      s.companyName?.toUpperCase().includes(search)
    );
  }, [followedStocks, tickerSearch]);

  const sortedStocks = useMemo(() => {
    return [...filteredStocks].sort((a, b) => {
      if (a.stanceAlignment === 'act' && b.stanceAlignment !== 'act') return -1;
      if (a.stanceAlignment !== 'act' && b.stanceAlignment === 'act') return 1;
      const scoreA = a.integratedScore ?? 0;
      const scoreB = b.integratedScore ?? 0;
      return scoreB - scoreA;
    });
  }, [filteredStocks]);

  const hasPosition = (ticker: string) => {
    return holdings.some((h: any) => h.ticker === ticker && h.quantity > 0);
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Following</h1>
          <p className="text-muted-foreground text-sm">
            Stocks you're watching for opportunities ({followedStocks.length})
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search ticker..."
              value={tickerSearch}
              onChange={(e) => setTickerSearch(e.target.value)}
              className="pl-8 w-48"
              data-testid="input-search-ticker"
            />
          </div>
        </div>
      </div>

      {sortedStocks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Star className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No stocks followed yet</h3>
            <p className="text-muted-foreground mb-4">
              Start by exploring opportunities and following stocks you're interested in
            </p>
            <Link href="/opportunities">
              <Button data-testid="button-browse-opportunities">
                Browse Opportunities <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Followed Stocks</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Ticker</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Change</TableHead>
                  <TableHead className="text-center">Signal</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedStocks.map((stock) => {
                  const price = parseFloat(stock.currentPrice);
                  const prevClose = parseFloat(stock.previousClose || stock.currentPrice);
                  const change = price - prevClose;
                  const changePercent = ((change / prevClose) * 100);
                  const isProcessing = stock.jobStatus === 'pending' || stock.jobStatus === 'processing';
                  const inPosition = hasPosition(stock.ticker);

                  return (
                    <TableRow 
                      key={stock.ticker} 
                      className="hover-elevate cursor-pointer"
                      onClick={() => window.location.href = `/ticker/${stock.ticker}`}
                      data-testid={`row-stock-${stock.ticker}`}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {stock.insiderAction && (
                            <Badge 
                              variant={stock.insiderAction === 'BUY' ? 'default' : 'destructive'}
                              className={cn(
                                "h-5 px-1.5 text-xs",
                                stock.insiderAction === 'BUY' && "bg-success text-success-foreground"
                              )}
                            >
                              {stock.insiderAction === 'BUY' ? 'B' : 'S'}
                            </Badge>
                          )}
                          <span className="font-mono font-medium">{stock.ticker}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground truncate max-w-32">
                        {stock.companyName || '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        ${price.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className={cn(
                          "flex items-center justify-end gap-1 font-mono text-sm",
                          change >= 0 ? "text-success" : "text-destructive"
                        )}>
                          {change >= 0 ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : (
                            <TrendingDown className="h-3 w-3" />
                          )}
                          {changePercent.toFixed(2)}%
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {isProcessing ? (
                          <Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" />
                        ) : stock.integratedScore != null ? (
                          <Badge 
                            className={cn(
                              "font-mono",
                              stock.integratedScore >= 90 && "bg-amber-500 text-white",
                              stock.integratedScore >= 70 && stock.integratedScore < 90 && "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
                              stock.integratedScore >= 50 && stock.integratedScore < 70 && "bg-secondary",
                              stock.integratedScore < 50 && "bg-secondary text-muted-foreground"
                            )}
                          >
                            {stock.integratedScore}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {stock.stanceAlignment === 'act' && (
                          <Badge variant="default" className="text-xs">ACT</Badge>
                        )}
                        {stock.stanceAlignment === 'hold' && (
                          <Badge variant="outline" className="text-xs text-muted-foreground">HOLD</Badge>
                        )}
                        {inPosition && (
                          <Badge variant="secondary" className="text-xs ml-1">IN</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          {!inPosition && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => enterPositionMutation.mutate({ 
                                    ticker: stock.ticker, 
                                    price 
                                  })}
                                  disabled={enterPositionMutation.isPending}
                                  data-testid={`button-enter-position-${stock.ticker}`}
                                >
                                  <ArrowRight className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Enter position</TooltipContent>
                            </Tooltip>
                          )}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => unfollowMutation.mutate(stock.ticker)}
                                disabled={unfollowMutation.isPending}
                                data-testid={`button-unfollow-${stock.ticker}`}
                              >
                                <Star className="h-3 w-3 fill-current" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Unfollow</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Link href={`/ticker/${stock.ticker}`}>
                                <Button size="sm" variant="ghost" data-testid={`button-view-${stock.ticker}`}>
                                  <ExternalLink className="h-3 w-3" />
                                </Button>
                              </Link>
                            </TooltipTrigger>
                            <TooltipContent>View details</TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
