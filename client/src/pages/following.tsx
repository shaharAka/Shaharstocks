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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  TrendingUp,
  TrendingDown,
  Star,
  Search,
  ArrowRight,
  SortAsc,
  HelpCircle,
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

type SortOption = "signal" | "price" | "change";

export default function Following() {
  const { toast } = useToast();
  const { user } = useUser();
  const [tickerSearch, setTickerSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("signal");

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
      switch (sortBy) {
        case "signal":
          if (a.stanceAlignment === 'act' && b.stanceAlignment !== 'act') return -1;
          if (a.stanceAlignment !== 'act' && b.stanceAlignment === 'act') return 1;
          const scoreA = a.integratedScore ?? 0;
          const scoreB = b.integratedScore ?? 0;
          return scoreB - scoreA;
        case "price":
          return parseFloat(b.currentPrice || "0") - parseFloat(a.currentPrice || "0");
        case "change":
          return parseFloat(b.priceChangePercent || "0") - parseFloat(a.priceChangePercent || "0");
        default:
          return 0;
      }
    });
  }, [filteredStocks, sortBy]);

  const hasPosition = (ticker: string) => {
    return holdings.some((h: any) => h.ticker === ticker && h.quantity > 0);
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Page Header - Matches Opportunities */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-primary" />
            <h1 className="text-xl md:text-2xl font-semibold" data-testid="text-page-title">
              Following
            </h1>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6"
                  tabIndex={0}
                  aria-label="Learn how following works"
                  data-testid="button-help-following"
                >
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-sm p-4 space-y-3 text-left">
                <p className="font-semibold text-sm">Your Watchlist</p>
                <div className="space-y-2 text-xs">
                  <p><strong>Following:</strong> Stocks you're actively monitoring</p>
                  <p><strong>Enter Position:</strong> Move to active trading when ready</p>
                  <p><strong>Signal Score:</strong> AI-generated opportunity strength</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
          <p className="text-sm text-muted-foreground">
            Stocks you're watching for potential trades
          </p>
        </div>
      </div>

      {/* Search and Controls Row - Matches Opportunities */}
      <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search ticker or company..."
            value={tickerSearch}
            onChange={(e) => setTickerSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search-following"
          />
        </div>
        
        <div className="w-full sm:w-48">
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
            <SelectTrigger data-testid="select-sort-following">
              <SortAsc className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="signal">Signal Strength</SelectItem>
              <SelectItem value="price">Price</SelectItem>
              <SelectItem value="change">% Change</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Bar - Matches Opportunities */}
      <div className="flex gap-4 text-sm items-center">
        <div>
          <span className="text-muted-foreground">Total Following: </span>
          <span className="font-medium" data-testid="text-following-count">{followedStocks.length}</span>
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
        <div className="rounded-md border overflow-hidden">
          <div className="overflow-x-auto">
            <Table className="text-xs">
              <TableHeader className="sticky top-0 bg-background z-[1]">
                <TableRow>
                  <TableHead className="min-w-[60px] px-1">Ticker</TableHead>
                  <TableHead className="hidden md:table-cell min-w-[100px] px-1">Company</TableHead>
                  <TableHead className="text-right w-[60px] px-1">Signal</TableHead>
                  <TableHead className="w-[50px] px-1">Type</TableHead>
                  <TableHead className="text-right min-w-[60px] px-1">Price</TableHead>
                  <TableHead className="text-right min-w-[60px] px-1">Change</TableHead>
                  <TableHead className="w-[120px] text-right px-1">Actions</TableHead>
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
                    <TableCell className="font-mono font-medium px-1">
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 text-primary fill-current shrink-0" />
                        <Link href={`/ticker/${stock.ticker}`} className="hover:underline">
                          {stock.ticker}
                        </Link>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground truncate max-w-[200px] px-1">
                      {stock.companyName || "-"}
                    </TableCell>
                    <TableCell className="text-right px-1">
                      {stock.integratedScore ? (
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge 
                              variant={stock.integratedScore >= 70 ? "default" : "secondary"}
                              className={cn(
                                "font-mono text-[10px]",
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
                        <Badge variant="outline" className="text-[10px]">
                          Analyzing...
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="px-1">
                      {stock.insiderAction && (
                        <Badge 
                          variant={stock.insiderAction === 'BUY' ? "default" : "destructive"}
                          className="text-[10px]"
                        >
                          {stock.insiderAction}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono px-1">
                      ${currentPrice.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right px-1">
                      <div className={cn(
                        "flex items-center justify-end gap-0.5",
                        isPositive ? "text-success" : "text-destructive"
                      )}>
                        {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        <span className="font-mono">
                          {isPositive ? "+" : ""}{priceChangePercent.toFixed(1)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right px-1">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-1.5 text-[10px] text-muted-foreground"
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
                            className="h-6 px-1.5 text-[10px]"
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
                          <Badge variant="outline" className="text-[10px]">
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
        </div>
      )}
    </div>
  );
}
