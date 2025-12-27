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
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useUser } from "@/contexts/UserContext";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { CandlestickChartCell } from "@/components/candlestick-chart-cell";

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

type SortField = "ticker" | "signal" | "price" | "change";
type SortDirection = "asc" | "desc";

export default function Following() {
  const { toast } = useToast();
  const { user } = useUser();
  const [tickerSearch, setTickerSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("signal");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

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

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection(field === "ticker" ? "asc" : "desc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 ml-1" />;
    return sortDirection === "asc" ? 
      <ArrowUp className="h-4 w-4 ml-1" /> : 
      <ArrowDown className="h-4 w-4 ml-1" />;
  };

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
      let compareA: any;
      let compareB: any;

      switch (sortField) {
        case "ticker":
          compareA = a.ticker;
          compareB = b.ticker;
          break;
        case "signal":
          compareA = a.integratedScore ?? a.aiScore ?? 0;
          compareB = b.integratedScore ?? b.aiScore ?? 0;
          break;
        case "price":
          compareA = parseFloat(a.currentPrice || "0");
          compareB = parseFloat(b.currentPrice || "0");
          break;
        case "change":
          compareA = parseFloat(a.priceChangePercent || "0");
          compareB = parseFloat(b.priceChangePercent || "0");
          break;
        default:
          return 0;
      }

      if (compareA < compareB) return sortDirection === "asc" ? -1 : 1;
      if (compareA > compareB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredStocks, sortField, sortDirection]);

  const hasPosition = (ticker: string) => {
    return holdings.some((h: any) => h.ticker === ticker && h.quantity > 0 && !h.isSimulated);
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full max-w-md" />
        <div className="rounded-md border">
          <Skeleton className="h-[400px] w-full" />
        </div>
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
          </div>
          <p className="text-sm text-muted-foreground">
            Stocks you're watching for potential entry
          </p>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon">
              <HelpCircle className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left" className="max-w-xs">
            <p className="text-xs">
              Stocks you've chosen to follow from Opportunities. 
              Enter a position when ready to track P&L.
            </p>
          </TooltipContent>
        </Tooltip>
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
        <div className="rounded-md border">
          <div className="overflow-x-auto">
            <Table className="text-xs">
              <TableHeader className="bg-background">
                <TableRow>
                  <TableHead className="min-w-[60px] px-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort("ticker")}
                      className="px-1 h-7 text-xs"
                      data-testid="sort-ticker"
                    >
                      Ticker
                      <SortIcon field="ticker" />
                    </Button>
                  </TableHead>
                  <TableHead className="hidden md:table-cell min-w-[100px] px-1">Company</TableHead>
                  <TableHead className="text-right w-[70px] px-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort("signal")}
                          className="px-1 h-7 text-xs"
                          data-testid="sort-signal"
                        >
                          Signal
                          <SortIcon field="signal" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs text-xs">
                        <p>Signal strength (0-100)</p>
                      </TooltipContent>
                    </Tooltip>
                  </TableHead>
                  <TableHead className="min-w-[55px] px-1">Type</TableHead>
                  <TableHead className="text-right min-w-[65px] px-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort("price")}
                      className="px-1 h-7 text-xs"
                      data-testid="sort-price"
                    >
                      Price
                      <SortIcon field="price" />
                    </Button>
                  </TableHead>
                  <TableHead className="hidden lg:table-cell min-w-[100px] px-1">Trend</TableHead>
                  <TableHead className="text-right min-w-[70px] px-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort("change")}
                      className="px-1 h-7 text-xs"
                      data-testid="sort-change"
                    >
                      Chg %
                      <SortIcon field="change" />
                    </Button>
                  </TableHead>
                  <TableHead className="hidden xl:table-cell w-[70px] px-1">Mkt Cap</TableHead>
                  <TableHead className="w-[130px] px-1 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedStocks.map((stock) => {
                  const currentPrice = parseFloat(stock.currentPrice || "0");
                  const priceChangePercent = parseFloat(stock.priceChangePercent || "0");
                  const isPositive = priceChangePercent >= 0;
                  const inPosition = hasPosition(stock.ticker);
                  const score = stock.integratedScore ?? stock.aiScore ?? null;

                  return (
                    <TableRow 
                      key={stock.ticker} 
                      className="hover-elevate h-10" 
                      data-testid={`row-stock-${stock.ticker}`}
                    >
                      <TableCell className="font-mono font-medium py-1 px-1 text-xs">
                        <div className="flex items-center gap-1.5">
                          <Star className="h-3 w-3 text-primary fill-current" />
                          <Link href={`/ticker/${stock.ticker}`} className="hover:underline">
                            {stock.ticker}
                          </Link>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground text-xs truncate max-w-[200px] py-1 px-1">
                        {stock.companyName || "-"}
                      </TableCell>
                      <TableCell className="text-right py-1 px-1">
                        {score !== null ? (
                          <Tooltip>
                            <TooltipTrigger>
                              <Badge 
                                className={cn(
                                  "font-mono text-xs",
                                  score >= 90 && "bg-amber-500 text-white",
                                  score >= 70 && score < 90 && "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
                                  score >= 50 && score < 70 && "bg-secondary text-secondary-foreground",
                                  score < 50 && "bg-secondary text-muted-foreground opacity-60"
                                )}
                              >
                                {score}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              Signal strength: {score}/100
                            </TooltipContent>
                          </Tooltip>
                        ) : stock.jobStatus === 'pending' || stock.jobStatus === 'processing' ? (
                          <Badge variant="outline" className="text-[10px]">
                            Analyzing...
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell className="py-1 px-1">
                        {stock.insiderAction && (
                          <Badge 
                            variant={stock.insiderAction === 'BUY' ? "default" : "destructive"}
                            className="text-[10px]"
                          >
                            {stock.insiderAction}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono py-1 px-1 text-xs">
                        ${currentPrice.toFixed(2)}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell py-1 px-1">
                        <div className="h-8 w-[100px]">
                          <CandlestickChartCell ticker={stock.ticker} height={32} />
                        </div>
                      </TableCell>
                      <TableCell className="text-right py-1 px-1">
                        <div className={cn(
                          "flex items-center justify-end gap-0.5 text-xs",
                          isPositive ? "text-success" : "text-destructive"
                        )}>
                          {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          <span className="font-mono">
                            {isPositive ? "+" : ""}{priceChangePercent.toFixed(1)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden xl:table-cell text-muted-foreground py-1 px-1 text-xs">
                        {stock.marketCap || "-"}
                      </TableCell>
                      <TableCell className="text-right py-1 px-1">
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
