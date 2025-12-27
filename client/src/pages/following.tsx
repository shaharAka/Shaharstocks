import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
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
  priceChange?: string;
  priceChangePercent?: string;
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
      const data = query.state.data;
      if (!data) return false;
      const hasActiveJobs = data.some((stock) => 
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
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-64" />
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Star className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-semibold">Following</h1>
          <Badge variant="secondary" className="ml-2">
            {followedStocks.length}
          </Badge>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search stocks..."
              value={tickerSearch}
              onChange={(e) => setTickerSearch(e.target.value)}
              className="pl-9"
              data-testid="input-search-following"
            />
          </div>
        </div>
      </div>

      {followedStocks.length === 0 ? (
        <Card className="bg-notebook-page">
          <CardContent className="p-8 text-center">
            <Star className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No stocks followed yet</h3>
            <p className="text-muted-foreground mb-4">
              Start following stocks from the Opportunities page to track them here.
            </p>
            <Link href="/opportunities">
              <Button data-testid="button-go-to-opportunities">
                Browse Opportunities
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Ticker</TableHead>
                <TableHead className="hidden md:table-cell">Company</TableHead>
                <TableHead className="text-right w-[70px]">Signal</TableHead>
                <TableHead className="w-[60px]">Type</TableHead>
                <TableHead className="text-right w-[80px]">Price</TableHead>
                <TableHead className="text-right w-[80px]">Change</TableHead>
                <TableHead className="w-[140px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedStocks.map((stock) => {
                const currentPrice = parseFloat(stock.currentPrice || "0");
                const priceChangePercent = parseFloat(stock.priceChangePercent || "0");
                const isPositive = priceChangePercent >= 0;
                const inPosition = hasPosition(stock.ticker);

                return (
                  <TableRow key={stock.ticker} className="hover-elevate" data-testid={`row-stock-${stock.ticker}`}>
                    <TableCell className="font-mono font-medium">
                      <div className="flex items-center gap-1.5">
                        <Star className="h-3 w-3 text-primary fill-current" />
                        <Link href={`/ticker/${stock.ticker}`} className="hover:underline">
                          {stock.ticker}
                        </Link>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground text-sm truncate max-w-[200px]">
                      {stock.companyName || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {stock.integratedScore ? (
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge 
                              variant={stock.integratedScore >= 70 ? "default" : "secondary"}
                              className={cn(
                                "font-mono",
                                stock.integratedScore >= 80 && "bg-amber-500 text-white"
                              )}
                            >
                              {stock.integratedScore}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            Signal strength: {stock.integratedScore}/100
                          </TooltipContent>
                        </Tooltip>
                      ) : stock.jobStatus === 'pending' || stock.jobStatus === 'processing' ? (
                        <Badge variant="outline" className="text-xs">
                          Analyzing...
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {stock.insiderAction && (
                        <Badge 
                          variant={stock.insiderAction === 'BUY' ? "default" : "destructive"}
                          className="text-xs"
                        >
                          {stock.insiderAction}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      ${currentPrice.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className={cn(
                        "flex items-center justify-end gap-0.5 text-sm",
                        isPositive ? "text-success" : "text-destructive"
                      )}>
                        {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        <span className="font-mono">
                          {isPositive ? "+" : ""}{priceChangePercent.toFixed(1)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs text-muted-foreground"
                          onClick={() => unfollowMutation.mutate(stock.ticker)}
                          disabled={unfollowMutation.isPending}
                          data-testid={`button-unfollow-${stock.ticker}`}
                        >
                          Unfollow
                        </Button>
                        {!inPosition && (
                          <Button
                            size="sm"
                            variant="default"
                            className="h-7 px-2 text-xs"
                            onClick={() => enterPositionMutation.mutate({ 
                              ticker: stock.ticker, 
                              price: currentPrice 
                            })}
                            disabled={enterPositionMutation.isPending}
                            data-testid={`button-enter-${stock.ticker}`}
                          >
                            Enter
                          </Button>
                        )}
                        {inPosition && (
                          <Badge variant="outline" className="text-xs">
                            In Position
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
