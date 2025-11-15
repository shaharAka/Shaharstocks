import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
  ExternalLink,
  Clock,
  MessageSquare,
  Star,
  Settings as SettingsIcon,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type Stock, type User } from "@shared/schema";
import { getTerm } from "@/lib/compliance";
import { useUser } from "@/contexts/UserContext";
import { StockTable } from "@/components/stock-table";
import { StockExplorer } from "@/components/stock-explorer";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MiniCandlestickChart } from "@/components/mini-candlestick-chart";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Filter, Search, SortAsc } from "lucide-react";
import Settings from "@/pages/settings";

type StockWithUserStatus = Stock & {
  userStatus: string;
  isFollowing?: boolean;
  analysisJob?: {
    status: string;
    currentStep: string | null;
  } | null;
  ageDays?: number;
};

type SortOption = "aiScore" | "daysFromTrade" | "marketCap";
type RecommendationFilter = "all" | "buy" | "sell";
type FunnelSection = "worthExploring" | "recents" | "processing" | "communityPicks" | "rejected";

type GroupedStock = {
  ticker: string;
  companyName: string;
  transactions: StockWithUserStatus[];
  latestTransaction: StockWithUserStatus;
  transactionCount: number;
  highestScore: number | null;
  daysSinceLatest: number;
  communityScore: number; // follows count
  isFollowing: boolean;
};

export default function Purchase() {
  const { toast } = useToast();
  const { user: currentUser } = useUser();
  
  // State management
  const [sortBy, setSortBy] = useState<SortOption>("aiScore");
  const [tickerSearch, setTickerSearch] = useState("");
  const [recommendationFilter, setRecommendationFilter] = useState<RecommendationFilter>("all");
  const [funnelSection, setFunnelSection] = useState<FunnelSection>("worthExploring");
  const [explorerStock, setExplorerStock] = useState<Stock | null>(null);
  const [explorerOpen, setExplorerOpen] = useState(false);
  const [selectedTickers, setSelectedTickers] = useState<Set<string>>(new Set());
  const [fetchConfigOpen, setFetchConfigOpen] = useState(false);

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

  // Fetch users
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
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


  // Follow stock mutation
  const followMutation = useMutation({
    mutationFn: async (ticker: string) => {
      return await apiRequest("POST", `/api/stocks/${ticker}/follow`, null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/me/followed"] });
      queryClient.invalidateQueries({ queryKey: ["/api/followed-stocks-with-prices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stocks/with-user-status"] });
      toast({
        title: "Stock Followed",
        description: "Day-0 AI analysis has been queued for this stock",
      });
      setExplorerOpen(false);
    },
    onError: (error: any) => {
      const message = error.message?.includes("already following") 
        ? "You are already following this stock"
        : "Failed to follow stock";
      toast({
        title: "Error",
        description: message,
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

  // Group stocks by ticker and categorize into funnel sections
  const { groupedStocks, funnelSections } = useMemo(() => {
    if (!stocks) return { groupedStocks: [], funnelSections: {} as Record<FunnelSection, GroupedStock[]> };

    // Start with pending or rejected stocks
    let filtered = stocks.filter(stock => {
      const rec = stock.recommendation?.toLowerCase();
      if (!rec || (!rec.includes("buy") && !rec.includes("sell"))) return false;
      
      // Apply recommendation filter
      if (recommendationFilter !== "all") {
        if (recommendationFilter === "buy" && !rec.includes("buy")) return false;
        if (recommendationFilter === "sell" && !rec.includes("sell")) return false;
      }
      
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
    const followedTickers = new Set(followedStocks.map(f => f.ticker));
    const stocksWithScores = filtered.map(stock => {
      const analysis = analyses.find((a: any) => a.ticker === stock.ticker);
      const daysSinceTrade = getDaysFromBuy(stock.insiderTradeDate);
      return {
        ...stock,
        integratedScore: analysis?.integratedScore ?? null,
        aiScore: analysis?.aiScore ?? null,
        daysSinceTrade: daysSinceTrade,
        isFollowing: followedTickers.has(stock.ticker),
      };
    });

    // Group by ticker
    const grouped = new Map<string, GroupedStock>();
    stocksWithScores.forEach(stock => {
      const existing = grouped.get(stock.ticker);
      const score = (stock as any).integratedScore ?? (stock as any).aiScore;
      const daysSince = (stock as any).daysSinceTrade;
      
      // Calculate community score based on comment activity
      const communityScore = getCommentCount(stock.ticker);
      
      if (!existing) {
        grouped.set(stock.ticker, {
          ticker: stock.ticker,
          companyName: stock.companyName || stock.ticker,
          transactions: [stock],
          latestTransaction: stock,
          transactionCount: 1,
          highestScore: score,
          daysSinceLatest: daysSince,
          communityScore,
          isFollowing: (stock as any).isFollowing || false,
        });
      } else {
        existing.transactions.push(stock);
        existing.transactionCount++;
        
        // Update latest transaction if newer
        if (daysSince < existing.daysSinceLatest) {
          existing.latestTransaction = stock;
          existing.daysSinceLatest = daysSince;
        }
        
        // Update highest score
        if (score !== null && (existing.highestScore === null || score > existing.highestScore)) {
          existing.highestScore = score;
        }
      }
    });

    const groupedArray = Array.from(grouped.values());

    // Categorize into funnel sections
    const sections: Record<FunnelSection, GroupedStock[]> = {
      processing: [],
      worthExploring: [],
      recents: [],
      communityPicks: [],
      rejected: [],
    };

    groupedArray.forEach(group => {
      const score = group.highestScore;
      const isUserRejected = group.latestTransaction.userStatus === "rejected";
      
      // Processing: No AI score yet
      if (score === null) {
        sections.processing.push(group);
        return;
      }

      // Rejected: User rejected OR auto-rejected (score < 40, unless multiple transactions)
      if (isUserRejected || (score < 40 && group.transactionCount === 1)) {
        sections.rejected.push(group);
        return;
      }

      // Worth Exploring: Score > 70
      if (score > 70) {
        sections.worthExploring.push(group);
      }

      // Recents: Score 40-70 and < 2 days old
      if (score >= 40 && score <= 70 && group.daysSinceLatest < 2) {
        sections.recents.push(group);
      }

      // Community Picks: Sort all by community score later
      sections.communityPicks.push(group);
    });

    // Sort each section
    const sortGroupedStocks = (groups: GroupedStock[]) => {
      return [...groups].sort((a, b) => {
        if (sortBy === "aiScore") {
          return (b.highestScore ?? 0) - (a.highestScore ?? 0);
        } else if (sortBy === "daysFromTrade") {
          return a.daysSinceLatest - b.daysSinceLatest;
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
          return parseMarketCap(b.latestTransaction.marketCap) - parseMarketCap(a.latestTransaction.marketCap);
        }
        return 0;
      });
    };

    sections.processing = sortGroupedStocks(sections.processing);
    sections.worthExploring = sortGroupedStocks(sections.worthExploring);
    sections.recents = sortGroupedStocks(sections.recents);
    sections.rejected = sortGroupedStocks(sections.rejected);
    
    // Community picks sorted by community score
    sections.communityPicks = [...sections.communityPicks].sort((a, b) => b.communityScore - a.communityScore);

    return { groupedStocks: groupedArray, funnelSections: sections };
  }, [stocks, analyses, sortBy, tickerSearch, recommendationFilter, followedStocks, users, commentCounts]);

  // Get current section's stocks and flatten for rendering
  const groupedOpportunities = funnelSections[funnelSection] || [];
  
  // Convert grouped stocks back to individual stocks for rendering
  // Use latestTransaction as the main stock, but add metadata about grouping
  const opportunities = groupedOpportunities.map(group => ({
    ...group.latestTransaction,
    _groupedData: {
      transactionCount: group.transactionCount,
      highestScore: group.highestScore,
      allTransactions: group.transactions,
      communityScore: group.communityScore,
    },
    integratedScore: group.highestScore,
    aiScore: group.highestScore,
    isFollowing: group.isFollowing,
  }));


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
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="lg"
            onClick={() => setFetchConfigOpen(true)}
            data-testid="button-fetch-config"
          >
            <SettingsIcon className="h-4 w-4" />
            <span className="ml-2">Fetch Configuration</span>
          </Button>
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
      </div>

      {/* Quick Filters */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Quick Filters:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={funnelSection === "worthExploring" ? "default" : "outline"}
              className="cursor-pointer hover-elevate active-elevate-2"
              onClick={() => setFunnelSection("worthExploring")}
              data-testid="filter-worth-exploring"
            >
              High Score ({funnelSections.worthExploring?.length || 0})
            </Badge>
            <Badge
              variant={funnelSection === "recents" ? "default" : "outline"}
              className="cursor-pointer hover-elevate active-elevate-2"
              onClick={() => setFunnelSection("recents")}
              data-testid="filter-recents"
            >
              Recent ({funnelSections.recents?.length || 0})
            </Badge>
            <Badge
              variant={funnelSection === "processing" ? "default" : "outline"}
              className="cursor-pointer hover-elevate active-elevate-2"
              onClick={() => setFunnelSection("processing")}
              data-testid="filter-processing"
            >
              Processing ({funnelSections.processing?.length || 0})
            </Badge>
            <Badge
              variant={funnelSection === "communityPicks" ? "default" : "outline"}
              className="cursor-pointer hover-elevate active-elevate-2"
              onClick={() => setFunnelSection("communityPicks")}
              data-testid="filter-community"
            >
              Community ({funnelSections.communityPicks?.length || 0})
            </Badge>
            <Badge
              variant={funnelSection === "rejected" ? "destructive" : "outline"}
              className="cursor-pointer hover-elevate active-elevate-2"
              onClick={() => setFunnelSection("rejected")}
              data-testid="filter-rejected"
            >
              Rejected ({funnelSections.rejected?.length || 0})
            </Badge>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Type:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={recommendationFilter === "all" ? "default" : "outline"}
              className="cursor-pointer hover-elevate active-elevate-2"
              onClick={() => setRecommendationFilter("all")}
              data-testid="filter-all"
            >
              All
            </Badge>
            <Badge
              variant={recommendationFilter === "buy" ? "default" : "outline"}
              className="cursor-pointer hover-elevate active-elevate-2"
              onClick={() => setRecommendationFilter("buy")}
              data-testid="filter-buy"
            >
              Buy Only
            </Badge>
            <Badge
              variant={recommendationFilter === "sell" ? "default" : "outline"}
              className="cursor-pointer hover-elevate active-elevate-2"
              onClick={() => setRecommendationFilter("sell")}
              data-testid="filter-sell"
            >
              Sell Only
            </Badge>
          </div>
        </div>
      </div>

      {/* Search and Sort */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search ticker or company..."
            value={tickerSearch}
            onChange={(e) => setTickerSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search"
          />
        </div>
        <div className="w-full sm:w-56">
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
            <SelectTrigger data-testid="select-sort">
              <SortAsc className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="aiScore">AI Score</SelectItem>
              <SelectItem value="daysFromTrade">Most Recent</SelectItem>
              <SelectItem value="marketCap">Market Cap</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="flex gap-4 text-sm items-center justify-between">
        <div className="flex gap-4">
          <div>
            <span className="text-muted-foreground">Total {getTerm("opportunities")}: </span>
            <span className="font-medium" data-testid="text-total-count">{opportunities.length}</span>
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
      ) : (
        <StockTable
          stocks={opportunities}
          users={users}
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
      )}

      <StockExplorer
        stock={explorerStock}
        open={explorerOpen}
        onOpenChange={setExplorerOpen}
        onFollow={(stock) => followMutation.mutate(stock.ticker)}
        onReject={(stock) => rejectMutation.mutate(stock.ticker)}
        users={users}
      />

      <Dialog open={fetchConfigOpen} onOpenChange={setFetchConfigOpen}>
        <DialogContent className="max-w-[95vw] md:max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader className="sr-only">
            <DialogTitle>Fetch Configuration</DialogTitle>
            <DialogDescription>
              Configure data sources for insider trading opportunities
            </DialogDescription>
          </DialogHeader>
          <Settings />
        </DialogContent>
      </Dialog>
    </div>
  );
}
