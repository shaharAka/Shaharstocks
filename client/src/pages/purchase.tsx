import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  LayoutGrid,
  LayoutList,
  ExternalLink,
  Pin,
  PinOff,
  Clock,
  MessageSquare,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type Stock, type User, type StockInterestWithUser } from "@shared/schema";
import { getTerm } from "@/lib/compliance";
import { useUser } from "@/contexts/UserContext";
import { StockTable } from "@/components/stock-table";
import { StockExplorer } from "@/components/stock-explorer";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MiniCandlestickChart } from "@/components/mini-candlestick-chart";

type StockWithUserStatus = Stock & {
  userStatus: string;
  isPinned?: boolean;
  analysisJob?: {
    status: string;
    currentStep: string | null;
  } | null;
  ageDays?: number;
};

type SortOption = "aiScore" | "daysFromTrade" | "marketCap";
type ViewMode = "cards" | "table";

export default function Purchase() {
  const { toast } = useToast();
  const { user: currentUser } = useUser();
  
  // State management
  const [sortBy, setSortBy] = useState<SortOption>("aiScore");
  const [tickerSearch, setTickerSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [explorerStock, setExplorerStock] = useState<Stock | null>(null);
  const [explorerOpen, setExplorerOpen] = useState(false);
  const [selectedTickers, setSelectedTickers] = useState<Set<string>>(new Set());

  // Selection handlers
  const toggleSelection = (ticker: string) => {
    setSelectedTickers((prev) => {
      const next = new Set(prev);
      if (next.has(ticker)) {
        next.delete(ticker);
      } else {
        next.add(ticker);
      }
      return next;
    });
  };

  const selectAll = (tickers: string[]) => {
    setSelectedTickers(new Set(tickers));
  };

  // Fetch opportunities
  const { data: stocks, isLoading, refetch } = useQuery<StockWithUserStatus[]>({
    queryKey: ["/api/stocks/with-user-status"],
  });

  // Fetch AI analyses
  const { data: analyses = [] } = useQuery<any[]>({
    queryKey: ["/api/stock-analyses"],
  });

  // Fetch users (for interest indicators)
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    retry: false,
    meta: { ignoreError: true },
  });

  // Fetch stock interests
  const { data: allInterests = [] } = useQuery<StockInterestWithUser[]>({
    queryKey: ["/api/stock-interests"],
    retry: false,
    meta: { ignoreError: true },
  });

  // Fetch comment counts
  const { data: commentCounts = [] } = useQuery<{ ticker: string; count: number }[]>({
    queryKey: ["/api/stock-comment-counts"],
    retry: false,
    meta: { ignoreError: true },
  });

  // Fetch viewed tickers
  const { data: viewedTickers = [] } = useQuery<string[]>({
    queryKey: ["/api/stock-views", currentUser?.id],
    enabled: !!currentUser,
    retry: false,
    meta: { ignoreError: true },
  });

  // Fetch followed stocks
  const { data: followedStocks = [] } = useQuery<any[]>({
    queryKey: ["/api/users/me/followed"],
    enabled: !!currentUser,
    retry: false,
    meta: { ignoreError: true },
  });

  // Refresh all stocks mutation
  const refreshMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/stocks/refresh-all", {});
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/stocks/with-user-status"] });
      toast({
        title: getTerm("dataRefreshed"),
        description: `Updated ${data.success} ${getTerm("opportunities")}`,
      });
    },
    onError: () => {
      toast({
        title: "Refresh Failed",
        description: "Unable to fetch market data",
        variant: "destructive",
      });
    },
  });

  // Toggle pick mutation
  const togglePickMutation = useMutation({
    mutationFn: async ({ ticker, isPinned }: { ticker: string; isPinned: boolean }) => {
      if (isPinned) {
        return await apiRequest("DELETE", `/api/stocks/${ticker}/pin`, null);
      } else {
        return await apiRequest("POST", `/api/stocks/${ticker}/pin`, null);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stocks/with-user-status"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update pick status",
        variant: "destructive",
      });
    },
  });

  // Follow stock mutation
  const followMutation = useMutation({
    mutationFn: async (ticker: string) => {
      return await apiRequest("POST", `/api/stocks/${ticker}/follow`, null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/me/followed"] });
      queryClient.invalidateQueries({ queryKey: ["/api/followed-stocks-with-prices"] });
      toast({
        title: "Stock Followed",
        description: "You are now following this stock",
      });
      setExplorerOpen(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to follow stock",
        variant: "destructive",
      });
    },
  });

  // Reject stock mutation
  const rejectMutation = useMutation({
    mutationFn: async (ticker: string) => {
      return await apiRequest("POST", `/api/stocks/${ticker}/reject`, null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stocks/with-user-status"] });
      toast({
        title: "Opportunity Rejected",
        description: "This opportunity has been hidden",
      });
      setExplorerOpen(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reject opportunity",
        variant: "destructive",
      });
    },
  });

  // Helper functions
  const getStockInterests = (ticker: string) => {
    return allInterests.filter(i => i.ticker === ticker);
  };

  const getCommentCount = (ticker: string) => {
    return commentCounts.find(c => c.ticker === ticker)?.count || 0;
  };

  const getInitials = (name: string) => {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const isNewStock = (ticker: string, insiderTradeDate: string | null): boolean => {
    if (!insiderTradeDate) return false;
    if (viewedTickers.includes(ticker)) return false;
    const tradeDate = new Date(insiderTradeDate);
    const now = new Date();
    const hoursSinceAdded = (now.getTime() - tradeDate.getTime()) / (1000 * 60 * 60);
    return hoursSinceAdded <= 48;
  };

  const getDaysFromBuy = (insiderTradeDate: string | null): number => {
    if (!insiderTradeDate) return 0;
    const tradeDate = new Date(insiderTradeDate);
    const now = new Date();
    return Math.floor((now.getTime() - tradeDate.getTime()) / (1000 * 60 * 60 * 24));
  };

  // Filter and sort opportunities
  const opportunities = useMemo(() => {
    if (!stocks) return [];

    // Start with pending stocks
    let filtered = stocks.filter(stock => {
      if (stock.userStatus !== "pending") return false;
      const rec = stock.recommendation?.toLowerCase();
      if (!rec || (!rec.includes("buy") && !rec.includes("sell"))) return false;
      
      // Apply ticker search
      if (tickerSearch.trim() !== "") {
        const searchTerm = tickerSearch.trim().toLowerCase();
        const tickerMatch = stock.ticker.toLowerCase().includes(searchTerm);
        const companyMatch = stock.companyName?.toLowerCase().includes(searchTerm);
        if (!tickerMatch && !companyMatch) return false;
      }
      
      return true;
    });

    // Join AI scores and calculate days from trade
    const stocksWithScores = filtered.map(stock => {
      const analysis = analyses.find((a: any) => a.ticker === stock.ticker);
      const daysSinceTrade = getDaysFromBuy(stock.insiderTradeDate);
      return {
        ...stock,
        integratedScore: analysis?.integratedScore ?? null,
        aiScore: analysis?.aiScore ?? null,
        daysSinceTrade: daysSinceTrade,
      };
    });

    // Apply 14-day filter
    const within14Days = stocksWithScores.filter(stock => {
      const days = (stock as any).daysSinceTrade;
      return days !== null && days <= 14;
    });

    // Sort
    const sorted = [...within14Days].sort((a, b) => {
      if (sortBy === "aiScore") {
        const aScore = (a as any).integratedScore ?? (a as any).aiScore ?? 0;
        const bScore = (b as any).integratedScore ?? (b as any).aiScore ?? 0;
        return bScore - aScore;
      } else if (sortBy === "daysFromTrade") {
        const aDays = (a as any).daysSinceTrade ?? 999;
        const bDays = (b as any).daysSinceTrade ?? 999;
        return aDays - bDays;
      } else if (sortBy === "marketCap") {
        const parseMarketCap = (mc: string | null) => {
          if (!mc) return 0;
          const match = mc.match(/\$?([\d.]+)([BMK])?/i);
          if (!match) return 0;
          const value = parseFloat(match[1]);
          const unit = match[2]?.toUpperCase();
          if (unit === "B") return value * 1000;
          if (unit === "M") return value;
          if (unit === "K") return value / 1000;
          return value;
        };
        return parseMarketCap(b.marketCap) - parseMarketCap(a.marketCap);
      }
      return 0;
    });

    return sorted;
  }, [stocks, analyses, sortBy, tickerSearch]);

  // Get pinned opportunities
  const pinnedOpportunities = useMemo(() => {
    return opportunities.filter(stock => stock.isPinned === true);
  }, [opportunities]);

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-4 md:space-y-6 max-w-7xl mx-auto">
        <Skeleton className="h-8 w-48 mb-2" />
        <div className="grid gap-4 md:gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-24 mb-2" />
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 md:space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold mb-1" data-testid="text-page-title">
            {getTerm("opportunities")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {getTerm("opportunitiesDescription")}
          </p>
        </div>
        <Button
          variant="outline"
          size="lg"
          onClick={() => refreshMutation.mutate()}
          disabled={refreshMutation.isPending}
          data-testid="button-refresh"
        >
          <RefreshCw className={`h-4 w-4 ${refreshMutation.isPending ? "animate-spin" : ""}`} />
          <span className="ml-2">{getTerm("refresh")}</span>
        </Button>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="flex-1">
          <Input
            placeholder="Search by ticker or company name..."
            value={tickerSearch}
            onChange={(e) => setTickerSearch(e.target.value)}
            data-testid="input-search"
          />
        </div>

        {/* Sort Control */}
        <div className="w-full sm:w-48">
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
            <SelectTrigger data-testid="select-sort-by">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="aiScore">AI Score (High to Low)</SelectItem>
              <SelectItem value="daysFromTrade">Days from Trade (Recent First)</SelectItem>
              <SelectItem value="marketCap">Market Cap (Large to Small)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* View Mode Toggle */}
        <div className="flex gap-1">
          <Button
            variant={viewMode === "table" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("table")}
            data-testid="button-view-table"
          >
            <LayoutList className="h-4 w-4 mr-2" />
            Table
          </Button>
          <Button
            variant={viewMode === "cards" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("cards")}
            data-testid="button-view-cards"
          >
            <LayoutGrid className="h-4 w-4 mr-2" />
            Cards
          </Button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="flex gap-4 text-sm items-center justify-between">
        <div className="flex gap-4">
          <div>
            <span className="text-muted-foreground">Total {getTerm("opportunities")}: </span>
            <span className="font-medium" data-testid="text-total-count">{opportunities.length}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Picked: </span>
            <span className="font-medium" data-testid="text-picked-count">{pinnedOpportunities.length}</span>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedTickers.size > 0 && (
          <div className="flex gap-2 items-center">
            <span className="text-sm text-muted-foreground">
              {selectedTickers.size} selected
            </span>
            <Button
              size="sm"
              onClick={() => {
                if (selectedTickers.size === 0) {
                  toast({
                    title: "No stocks selected",
                    description: "Please select at least one stock to follow",
                    variant: "destructive",
                  });
                  return;
                }
                
                // Filter out already-followed stocks
                const followedTickers = new Set(followedStocks.map(f => f.ticker));
                const tickersToFollow = Array.from(selectedTickers).filter(
                  ticker => !followedTickers.has(ticker)
                );
                const alreadyFollowed = Array.from(selectedTickers).filter(
                  ticker => followedTickers.has(ticker)
                );
                
                if (tickersToFollow.length === 0) {
                  toast({
                    title: "Already Following",
                    description: `All ${selectedTickers.size} selected stocks are already being followed`,
                    variant: "destructive",
                  });
                  setSelectedTickers(new Set());
                  return;
                }
                
                // Follow the new stocks
                tickersToFollow.forEach(ticker => {
                  followMutation.mutate(ticker);
                });
                
                // Show appropriate message
                if (alreadyFollowed.length > 0) {
                  toast({
                    title: "Partially Followed",
                    description: `Following ${tickersToFollow.length} new stocks. ${alreadyFollowed.length} already followed.`,
                  });
                } else {
                  toast({
                    title: "Following Stocks",
                    description: `Following ${tickersToFollow.length} stocks`,
                  });
                }
                
                setSelectedTickers(new Set());
              }}
              disabled={followMutation.isPending}
              data-testid="button-bulk-follow"
            >
              Follow Selected
            </Button>
          </div>
        )}
      </div>

      {/* Opportunities List */}
      {opportunities.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">
              No {getTerm("opportunities")} match your current filters.
            </p>
          </CardContent>
        </Card>
      ) : viewMode === "table" ? (
        <StockTable
          stocks={opportunities}
          users={users}
          interests={allInterests}
          commentCounts={commentCounts}
          analyses={analyses}
          selectedTickers={selectedTickers}
          onToggleSelection={toggleSelection}
          onSelectAll={selectAll}
          viewedTickers={viewedTickers}
          onStockClick={(stock) => {
            setExplorerStock(stock);
            setExplorerOpen(true);
          }}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {opportunities.map((stock) => {
            const currentPrice = parseFloat(stock.currentPrice);
            const previousPrice = parseFloat(stock.previousClose || stock.currentPrice);
            const priceChange = currentPrice - previousPrice;
            const priceChangePercent = (priceChange / previousPrice) * 100;
            const isPositive = priceChange >= 0;

            const insiderPrice = stock.insiderPrice ? parseFloat(stock.insiderPrice) : currentPrice;
            const priceDiff = currentPrice - insiderPrice;
            const priceDiffPercent = insiderPrice > 0 ? (priceDiff / insiderPrice) * 100 : 0;
            const isProfitable = priceDiff >= 0;

            const stockInterests = getStockInterests(stock.ticker);
            const aiScore = (stock as any).integratedScore ?? (stock as any).aiScore ?? null;

            return (
              <Card
                key={stock.id}
                className="hover-elevate cursor-pointer relative"
                data-testid={`card-stock-${stock.ticker}`}
                onClick={() => {
                  setExplorerStock(stock);
                  setExplorerOpen(true);
                }}
              >
                <div
                  className="absolute top-2 right-2 z-10"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Checkbox
                    checked={selectedTickers.has(stock.ticker)}
                    onCheckedChange={() => toggleSelection(stock.ticker)}
                    aria-label={`Select ${stock.ticker}`}
                    data-testid={`checkbox-card-${stock.ticker}`}
                  />
                </div>
                <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2 pr-10">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <CardTitle className="text-lg font-semibold" data-testid={`text-ticker-${stock.ticker}`}>
                        {stock.ticker}
                      </CardTitle>
                      {isNewStock(stock.ticker, stock.insiderTradeDate) && (
                        <Badge variant="default" className="text-xs px-1.5 py-0" data-testid={`badge-new-${stock.ticker}`}>
                          NEW
                        </Badge>
                      )}
                      {stock.isPinned && (
                        <Pin className="h-3.5 w-3.5 text-primary fill-current" />
                      )}
                    </div>
                    <CardDescription className="text-xs line-clamp-1" data-testid={`text-company-${stock.ticker}`}>
                      {stock.companyName}
                    </CardDescription>
                  </div>
                  {stock.recommendation && (
                    <Badge
                      variant={stock.recommendation.toLowerCase().includes("buy") ? "default" : "destructive"}
                      className="text-xs shrink-0"
                      data-testid={`badge-recommendation-${stock.ticker}`}
                    >
                      {stock.recommendation.toLowerCase().includes("buy") ? "BUY" : "SELL"}
                    </Badge>
                  )}
                </CardHeader>
                <CardContent className="space-y-3 pb-3">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-mono font-semibold" data-testid={`text-price-${stock.ticker}`}>
                      ${currentPrice.toFixed(2)}
                    </span>
                    <div
                      className={`flex items-center gap-1 ${
                        isPositive ? "text-success" : "text-destructive"
                      }`}
                      data-testid={`text-change-${stock.ticker}`}
                    >
                      {isPositive ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      <span className="text-sm font-mono font-medium">
                        {isPositive ? "+" : ""}
                        {priceChangePercent.toFixed(2)}%
                      </span>
                    </div>
                  </div>

                  {stock.insiderPrice && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Insider @ ${parseFloat(stock.insiderPrice).toFixed(2)}</span>
                      <span className={`font-mono text-sm ${isProfitable ? "text-success" : "text-destructive"}`} data-testid={`text-price-diff-${stock.ticker}`}>
                        {isProfitable ? "+" : ""}{priceDiffPercent.toFixed(1)}%
                      </span>
                    </div>
                  )}

                  {stock.insiderTradeDate && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground" data-testid={`text-days-from-buy-${stock.ticker}`}>
                      <Clock className="h-3 w-3" />
                      <span>{getDaysFromBuy(stock.insiderTradeDate)} days from buy</span>
                    </div>
                  )}

                  {stock.candlesticks && stock.candlesticks.length > 0 && (
                    <div className="-mx-2" data-testid={`chart-candlestick-${stock.ticker}`}>
                      <MiniCandlestickChart data={stock.candlesticks} height={50} />
                    </div>
                  )}

                  {stock.marketCap && (
                    <div className="text-xs text-muted-foreground" data-testid={`text-marketcap-${stock.ticker}`}>
                      {stock.marketCap} market cap
                    </div>
                  )}

                  {aiScore !== null && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">AI Score:</span>
                      <Badge
                        variant={aiScore >= 75 ? "default" : aiScore >= 50 ? "secondary" : "outline"}
                        data-testid={`badge-score-${stock.ticker}`}
                      >
                        {aiScore}
                      </Badge>
                    </div>
                  )}

                  {(stockInterests.length > 0 || getCommentCount(stock.ticker) > 0) && (
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex gap-1">
                        {stockInterests.map((interest) => (
                          <Avatar
                            key={interest.id}
                            className="h-6 w-6"
                            style={{ backgroundColor: interest.user.avatarColor }}
                            data-testid={`avatar-interest-${stock.ticker}-${interest.user.name.toLowerCase()}`}
                          >
                            <AvatarFallback
                              className="text-white text-xs"
                              style={{ backgroundColor: interest.user.avatarColor }}
                            >
                              {getInitials(interest.user.name)}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                      </div>
                      {getCommentCount(stock.ticker) > 0 && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <MessageSquare className="h-4 w-4" />
                          <span className="text-sm" data-testid={`text-comment-count-${stock.ticker}`}>
                            {getCommentCount(stock.ticker)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <StockExplorer
        stock={explorerStock}
        open={explorerOpen}
        onOpenChange={setExplorerOpen}
        onFollow={(stock) => followMutation.mutate(stock.ticker)}
        onReject={(stock) => rejectMutation.mutate(stock.ticker)}
        users={users}
        interests={allInterests}
      />
    </div>
  );
}
