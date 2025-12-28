import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  HelpCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type Stock, type User, type Opportunity } from "@shared/schema";
import { getTerm } from "@/lib/compliance";
import { useUser } from "@/contexts/UserContext";
import { StockTable } from "@/components/stock-table";
import { Search, SortAsc } from "lucide-react";
import { cn } from "@/lib/utils";

// Opportunity adapted to Stock-like format for StockTable compatibility
type OpportunityAsStock = Stock & {
  opportunityId: string;
  cadence: string;
  userStatus: string;
  isFollowing?: boolean;
  analysisJob?: {
    status: string;
    currentStep: string | null;
  } | null;
  ageDays?: number;
};

type SortOption = "signal" | "daysFromTrade" | "marketCap";


// Convert Opportunity to Stock-like format for StockTable
function opportunityToStock(opp: Opportunity): OpportunityAsStock {
  return {
    id: opp.id,
    opportunityId: opp.id,
    cadence: opp.cadence,
    userId: "", // Not applicable for global opportunities
    ticker: opp.ticker,
    companyName: opp.companyName,
    currentPrice: opp.currentPrice,
    previousClose: opp.previousClose,
    insiderPrice: opp.insiderPrice,
    insiderQuantity: opp.insiderQuantity,
    insiderTradeDate: opp.insiderTradeDate,
    insiderName: opp.insiderName,
    insiderTitle: opp.insiderTitle,
    marketPriceAtInsiderDate: opp.marketPriceAtInsiderDate,
    marketCap: opp.marketCap,
    peRatio: opp.peRatio,
    recommendation: opp.recommendation,
    recommendationStatus: "pending",
    source: opp.source,
    confidenceScore: opp.confidenceScore,
    priceHistory: opp.priceHistory,
    description: opp.description,
    industry: opp.industry,
    country: opp.country,
    webUrl: opp.webUrl,
    ipo: opp.ipo,
    news: opp.news,
    insiderSentimentMspr: opp.insiderSentimentMspr,
    insiderSentimentChange: opp.insiderSentimentChange,
    microAnalysisCompleted: false,
    macroAnalysisCompleted: false,
    combinedAnalysisCompleted: false,
    lastUpdated: opp.lastUpdated,
    rejectedAt: null,
    userStatus: "pending",
    isFollowing: false,
  } as OpportunityAsStock;
}

// Generate contextual signal tooltip based on score and recommendation type
const getSignalTooltip = (score: number, recommendation: string): string => {
  const isBuy = recommendation.toLowerCase().includes("buy");
  const action = isBuy ? "BUY" : "SELL";
  
  if (score >= 90) {
    return `Very Strong ${action} Opportunity`;
  } else if (score >= 70) {
    return `Strong ${action} Opportunity`;
  } else if (score >= 40) {
    return `Neutral ${action} Signal`;
  } else {
    return `Weak ${action} Signal`;
  }
};

export default function Opportunities() {
  const { toast } = useToast();
  const { user: currentUser } = useUser();
  const [, setLocation] = useLocation();
  
  // State management
  const [sortBy, setSortBy] = useState<SortOption>("signal");
  const [tickerSearch, setTickerSearch] = useState("");
  const [showAllOpportunities, setShowAllOpportunities] = useState(currentUser?.showAllOpportunities ?? false);
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

  // Sync showAllOpportunities state with user preference from database
  useEffect(() => {
    if (currentUser?.showAllOpportunities !== undefined) {
      setShowAllOpportunities(currentUser.showAllOpportunities);
    }
  }, [currentUser?.showAllOpportunities]);

  // Fetch unified global opportunities - filtered by user tier on server
  const { data: opportunitiesResponse, isLoading } = useQuery<{
    opportunities: Opportunity[];
    tier: 'pro' | 'free';
    cadence: string;
  }>({
    queryKey: ["/api/opportunities"],
    staleTime: 2 * 60 * 1000, // Consider fresh for 2 minutes
    refetchOnWindowFocus: true,
  });
  
  // Convert opportunities to stock-like format
  const stocks = useMemo(() => {
    if (!opportunitiesResponse?.opportunities) return [];
    return opportunitiesResponse.opportunities.map(opportunityToStock);
  }, [opportunitiesResponse]);

  // Fetch AI analyses - poll every 30 seconds to catch completed AI jobs while user is on page
  // Use ?all=true to get analyses for ALL tickers (needed for opportunities filtering)
  const { data: analyses = [] } = useQuery<any[]>({
    queryKey: ["/api/stock-analyses", { all: true }],
    queryFn: async () => {
      const res = await fetch("/api/stock-analyses?all=true", { credentials: 'include' });
      if (!res.ok) throw new Error("Failed to fetch analyses");
      return res.json();
    },
    staleTime: 30 * 1000, // Consider fresh for 30 seconds
    refetchOnWindowFocus: true,
    refetchInterval: 60 * 1000, // Poll every 60 seconds for AI analysis completion
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

  // Fetch OpenInsider config for community engagement threshold
  const { data: openinsiderConfig } = useQuery<any>({
    queryKey: ["/api/openinsider-config"],
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

  // Update user preference mutation
  const updatePreferenceMutation = useMutation({
    mutationFn: async (showAll: boolean) => {
      if (!currentUser) throw new Error("Not authenticated");
      return await apiRequest("PATCH", `/api/users/${currentUser.id}`, { showAllOpportunities: showAll });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/current-user"] });
    },
  });

  // Handle toggle change with persistence
  const handleShowAllOpportunitiesChange = (checked: boolean) => {
    setShowAllOpportunities(checked);
    updatePreferenceMutation.mutate(checked);
  };

  // Follow stock mutation
  const followMutation = useMutation({
    mutationFn: async (ticker: string) => {
      return await apiRequest("POST", `/api/stocks/${ticker}/follow`, null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/me/followed"] });
      queryClient.invalidateQueries({ queryKey: ["/api/followed-stocks-with-prices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/followed-stocks-with-status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stocks/with-user-status"] });
      
      toast({
        title: "Stock Followed",
        description: "Day-0 AI analysis has been queued for this stock",
      });
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

  // Reject opportunity mutation (uses opportunityId, not ticker)
  const rejectMutation = useMutation({
    mutationFn: async (opportunityId: string) => {
      return await apiRequest("POST", `/api/opportunities/${opportunityId}/reject`, null);
    },
    onSuccess: async () => {
      // Force immediate refetch to update UI
      await queryClient.refetchQueries({ queryKey: ["/api/opportunities"] });
      toast({
        title: "Opportunity Dismissed",
        description: "This opportunity has been hidden from your view",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to dismiss opportunity",
        variant: "destructive",
      });
    },
  });

  // Helper functions
  const getDaysFromBuy = (insiderTradeDate: string | null): number => {
    if (!insiderTradeDate) return 0;
    const tradeDate = new Date(insiderTradeDate);
    const now = new Date();
    return Math.floor((now.getTime() - tradeDate.getTime()) / (1000 * 60 * 60 * 24));
  };

  // Helper to parse market cap string to millions
  const parseMarketCap = (mc: string | null): number => {
    if (!mc) return 0;
    const normalized = mc.replace(/^(USD|US\$|\$|EUR|€|GBP|£)\s*/i, "").trim().toLowerCase();
    const match = normalized.match(/([\d,]+(?:\.\d+)?)\s*([tbmk])?/i);
    if (!match) return 0;
    const value = parseFloat(match[1].replace(/,/g, ""));
    if (isNaN(value)) return 0;
    const suffix = match[2];
    if (suffix === "t") return value * 1_000_000;
    if (suffix === "b") return value * 1000;
    if (suffix === "m") return value;
    if (suffix === "k") return value * 0.001;
    return value;
  };

  // Filter, enrich, group, and sort opportunities
  const displayOpportunities = useMemo(() => {
    if (!stocks || stocks.length === 0) return [];

    // Apply filters
    const followedTickers = new Set(followedStocks.map(f => f.ticker));
    
    let filtered = stocks.filter(stock => {
      const rec = stock.recommendation?.toLowerCase();
      if (!rec || (!rec.includes("buy") && !rec.includes("sell"))) return false;
      
      // Buy Only vs All filter
      if (!showAllOpportunities && !rec.includes("buy")) return false;
      
      // Options deal filter (BUY only)
      if (rec.includes("buy")) {
        const insiderPrice = stock.insiderPrice ? parseFloat(String(stock.insiderPrice)) : 0;
        const currentPrice = stock.currentPrice ? parseFloat(String(stock.currentPrice)) : 0;
        const thresholdPercent = (currentUser?.optionsDealThresholdPercent || 15) / 100;
        if (currentPrice > 0 && insiderPrice < currentPrice * thresholdPercent) return false;
      }
      
      // Market cap filter
      if (currentUser?.minMarketCapFilter) {
        const marketCapValue = parseMarketCap(stock.marketCap);
        if (marketCapValue > 0 && marketCapValue < currentUser.minMarketCapFilter) return false;
      }
      
      // Search filter
      if (tickerSearch.trim() !== "") {
        const searchTerm = tickerSearch.trim().toLowerCase();
        const tickerMatch = stock.ticker.toLowerCase().includes(searchTerm);
        const companyMatch = stock.companyName?.toLowerCase().includes(searchTerm);
        if (!tickerMatch && !companyMatch) return false;
      }
      
      return true;
    });

    // Enrich with AI scores and following status
    // integratedScore is the primary score from AI analysis
    const enriched = filtered.map(stock => {
      const analysis = analyses.find((a: any) => a.ticker === stock.ticker);
      const daysSinceTrade = getDaysFromBuy(stock.insiderTradeDate);
      // Use integratedScore as the primary score (this is the AI-generated signal score)
      const signalScore = analysis?.integratedScore ?? analysis?.confidenceScore ?? null;
      return {
        ...stock,
        signalScore,
        daysSinceTrade,
        isFollowing: followedTickers.has(stock.ticker),
      };
    });

    // Group by ticker to get highest score per ticker
    const grouped = new Map<string, typeof enriched[0] & { highestScore: number | null }>();
    enriched.forEach(stock => {
      const score = stock.signalScore;
      const existing = grouped.get(stock.ticker);
      
      if (!existing) {
        grouped.set(stock.ticker, { ...stock, highestScore: score });
      } else {
        // Keep the one with highest score, or most recent if scores equal
        if (score !== null && (existing.highestScore === null || score > existing.highestScore)) {
          grouped.set(stock.ticker, { ...stock, highestScore: score });
        } else if (stock.daysSinceTrade < existing.daysSinceTrade) {
          // Update to more recent transaction but preserve highest score
          grouped.set(stock.ticker, { ...stock, highestScore: existing.highestScore });
        }
      }
    });

    // Convert back to array and filter for high signal (score >= 70)
    let result = Array.from(grouped.values()).filter(stock => {
      const score = stock.highestScore;
      return score !== null && score >= 70;
    });

    // Sort
    result.sort((a, b) => {
      if (sortBy === "signal") {
        return (b.highestScore ?? 0) - (a.highestScore ?? 0);
      } else if (sortBy === "daysFromTrade") {
        return a.daysSinceTrade - b.daysSinceTrade;
      } else if (sortBy === "marketCap") {
        return parseMarketCap(b.marketCap) - parseMarketCap(a.marketCap);
      }
      return 0;
    });

    return result;
  }, [stocks, analyses, sortBy, tickerSearch, showAllOpportunities, followedStocks, currentUser]);

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-4 md:space-y-6 max-w-7xl">
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
    <div className="p-4 md:p-6 space-y-4 max-w-7xl">
      {/* Header with inline filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold whitespace-nowrap" data-testid="text-page-title">
            {getTerm("opportunities")}
          </h1>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6"
                tabIndex={0}
                aria-label="Learn how opportunities work"
                data-testid="button-help-opportunities"
              >
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-sm p-4 space-y-3 text-left">
              <p className="font-semibold text-sm">How the Board Works</p>
              <div className="space-y-2 text-xs">
                <p><strong>High Signal:</strong> Stocks with AI score 70+ showing strong opportunity</p>
                <p><strong>Recent:</strong> Mid-range scores (40-69) from the last 2 days</p>
                <p><strong>Processing:</strong> Awaiting AI analysis</p>
                <p><strong>Community:</strong> Stocks with high user engagement</p>
                <p><strong>Rejected:</strong> Stocks you've dismissed</p>
              </div>
              <div className="pt-2 border-t space-y-1 text-xs text-muted-foreground">
                <p>Stocks are automatically removed after 10-14 days unless you follow them.</p>
                <p>Low-confidence signals (score {"<"} 40) are auto-rejected.</p>
              </div>
            </TooltipContent>
          </Tooltip>
        </div>
        
        {/* Compact inline filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={tickerSearch}
              onChange={(e) => setTickerSearch(e.target.value)}
              className="pl-8 h-8 w-32 text-sm"
              data-testid="input-search"
            />
          </div>
          
          <div className="flex items-center gap-1.5 border rounded-md px-2 h-8">
            <Label htmlFor="show-all-toggle" className="text-xs font-medium cursor-pointer whitespace-nowrap">
              {showAllOpportunities ? "All" : "Buy"}
            </Label>
            <Switch
              id="show-all-toggle"
              checked={showAllOpportunities}
              onCheckedChange={handleShowAllOpportunitiesChange}
              className="scale-75"
              data-testid="toggle-show-all"
            />
          </div>
          
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
            <SelectTrigger className="h-8 w-32 text-xs" data-testid="select-sort">
              <SortAsc className="h-3.5 w-3.5 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="signal">Signal</SelectItem>
              <SelectItem value="daysFromTrade">Recent</SelectItem>
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
            <span className="font-medium" data-testid="text-total-count">{displayOpportunities.length}</span>
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
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                if (selectedTickers.size === 0) {
                  toast({
                    title: "No stocks selected",
                    description: "Please select at least one stock to reject",
                    variant: "destructive",
                  });
                  return;
                }
                
                // Find opportunity IDs for selected tickers and reject them
                const tickers = Array.from(selectedTickers);
                const opportunityIds = tickers
                  .map(ticker => {
                    const opp = displayOpportunities.find(o => o.ticker === ticker);
                    return opp?.opportunityId;
                  })
                  .filter((id): id is string => !!id);
                
                opportunityIds.forEach(id => {
                  rejectMutation.mutate(id);
                });
                
                toast({
                  title: "Dismissing Opportunities",
                  description: `Dismissing ${opportunityIds.length} opportunities`,
                });
                
                setSelectedTickers(new Set());
              }}
              disabled={rejectMutation.isPending}
              data-testid="button-bulk-reject"
            >
              Reject Selected
            </Button>
          </div>
        )}
      </div>

      {/* Opportunities List - Table View */}
      {displayOpportunities.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">
              No {getTerm("opportunities")} match your current filters.
            </p>
          </CardContent>
        </Card>
      ) : (
        <StockTable
          stocks={displayOpportunities as any}
          users={users}
          commentCounts={commentCounts}
          analyses={analyses}
          selectedTickers={selectedTickers}
          onToggleSelection={toggleSelection}
          onSelectAll={selectAll}
          viewedTickers={viewedTickers}
          preserveOrder={true}
          onStockClick={(stock) => {
            setLocation(`/ticker/${stock.ticker}?from=opportunities`);
          }}
        />
      )}
    </div>
  );
}
