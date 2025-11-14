import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  RefreshCw,
  Search,
  Pin,
  PinOff,
  ExternalLink,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type Stock } from "@shared/schema";
import {
  getTerm,
  getRiskPreset,
  applyRiskPresetFilters,
  type RiskLevel,
} from "@/lib/compliance";
import { useUser } from "@/contexts/UserContext";

// Extended Stock type with user status and AI analysis
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

export default function Purchase() {
  const { toast } = useToast();
  const { user: currentUser } = useUser();
  
  // State management
  const [riskLevel, setRiskLevel] = useState<RiskLevel>("balanced");
  const [sortBy, setSortBy] = useState<SortOption>("aiScore");
  const [tickerSearch, setTickerSearch] = useState("");

  // Sync risk level with user's stored preference when user loads
  useEffect(() => {
    if (currentUser?.riskPreference) {
      setRiskLevel(currentUser.riskPreference as RiskLevel);
    }
  }, [currentUser?.riskPreference]);

  // Fetch opportunities
  const { data: stocks, isLoading, refetch } = useQuery<StockWithUserStatus[]>({
    queryKey: ["/api/stocks/with-user-status"],
  });

  // Fetch AI analyses
  const { data: analyses = [] } = useQuery<any[]>({
    queryKey: ["/api/stock-analyses"],
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

  // Filter and sort opportunities
  const opportunities = useMemo(() => {
    if (!stocks) return [];

    // Start with pending stocks (both BUY and SELL)
    let filtered = stocks.filter(stock => {
      // Only show pending stocks with either buy or sell recommendations
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

    // Join AI scores and calculate days from trade before filtering
    const stocksWithScores = filtered.map(stock => {
      const analysis = analyses.find((a: any) => a.ticker === stock.ticker);
      const daysSinceTrade = getDaysFromTrade(stock.insiderTradeDate);
      return {
        ...stock,
        integratedScore: analysis?.integratedScore ?? null,
        aiScore: analysis?.aiScore ?? null,
        daysSinceTrade: daysSinceTrade,
      };
    });

    // Apply 14-day filter: only show opportunities from the last 2 weeks
    const within14Days = stocksWithScores.filter(stock => {
      const days = (stock as any).daysSinceTrade;
      return days !== null && days <= 14;
    });

    // Apply risk preset filters (returns filtered array with merged scores preserved)
    const preset = getRiskPreset(riskLevel);
    const filteredWithScores = applyRiskPresetFilters(within14Days, preset);

    // Sort opportunities using merged fields
    const sorted = [...filteredWithScores].sort((a, b) => {
      if (sortBy === "aiScore") {
        const aScore = (a as any).integratedScore ?? (a as any).aiScore ?? 0;
        const bScore = (b as any).integratedScore ?? (b as any).aiScore ?? 0;
        return bScore - aScore; // Descending
      } else if (sortBy === "daysFromTrade") {
        const aDays = (a as any).daysSinceTrade ?? 999;
        const bDays = (b as any).daysSinceTrade ?? 999;
        return aDays - bDays; // Ascending
      } else if (sortBy === "marketCap") {
        const aMarketCap = parseMarketCapValue(a.marketCap);
        const bMarketCap = parseMarketCapValue(b.marketCap);
        return bMarketCap - aMarketCap; // Descending
      }
      return 0;
    });

    return sorted;
  }, [stocks, analyses, riskLevel, sortBy, tickerSearch]);

  // Get pinned opportunities
  const pinnedOpportunities = useMemo(() => {
    return opportunities.filter(stock => stock.isPinned === true);
  }, [opportunities]);

  // Group opportunities by company ticker
  const groupedOpportunities = useMemo(() => {
    const groups = new Map<string, typeof opportunities>();
    
    opportunities.forEach(stock => {
      const existing = groups.get(stock.ticker) || [];
      groups.set(stock.ticker, [...existing, stock]);
    });
    
    // Convert to array and sort by best AI score in each group
    return Array.from(groups.entries())
      .map(([ticker, stocks]) => ({
        ticker,
        companyName: stocks[0].companyName || ticker,
        stocks: stocks.sort((a, b) => {
          const aScore = (a as any).integratedScore ?? (a as any).aiScore ?? 0;
          const bScore = (b as any).integratedScore ?? (b as any).aiScore ?? 0;
          return bScore - aScore;
        }),
        maxAiScore: Math.max(...stocks.map(s => (s as any).integratedScore ?? (s as any).aiScore ?? 0)),
      }))
      .sort((a, b) => b.maxAiScore - a.maxAiScore); // Sort groups by best AI score
  }, [opportunities]);

  // Parse market cap for sorting
  function parseMarketCapValue(marketCap: string | null): number {
    if (!marketCap) return 0;
    const match = marketCap.match(/\$?([\d.]+)([BMK])?/i);
    if (!match) return 0;
    const value = parseFloat(match[1]);
    const unit = match[2]?.toUpperCase();
    if (unit === "B") return value * 1000;
    if (unit === "M") return value;
    if (unit === "K") return value / 1000;
    return value;
  }

  // Get AI analysis for a stock
  function getAIAnalysis(ticker: string) {
    return analyses.find((a: any) => a.ticker === ticker);
  }

  // Calculate days since insider trade (handles both ISO and DD.MM.YYYY formats)
  function getDaysFromTrade(insiderTradeDate: string | null): number {
    if (!insiderTradeDate) return 0;
    
    // Try ISO format first (YYYY-MM-DD)
    let tradeDate = new Date(insiderTradeDate);
    
    // If ISO parsing fails, try DD.MM.YYYY format
    if (isNaN(tradeDate.getTime())) {
      const dateParts = insiderTradeDate.split(' ')[0].split('.');
      if (dateParts.length >= 3) {
        const day = parseInt(dateParts[0], 10);
        const month = parseInt(dateParts[1], 10) - 1;
        const year = parseInt(dateParts[2], 10);
        tradeDate = new Date(year, month, day);
      }
    }
    
    // Calculate days difference
    if (!isNaN(tradeDate.getTime())) {
      const now = new Date();
      return Math.floor((now.getTime() - tradeDate.getTime()) / (1000 * 60 * 60 * 24));
    }
    
    return 0;
  }

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

      {/* Risk Level Toggle & Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Risk Level Tabs */}
        <div className="flex-1">
          <Label className="text-sm font-medium mb-2 block">Risk Profile</Label>
          <Tabs value={riskLevel} onValueChange={(value) => setRiskLevel(value as RiskLevel)}>
            <TabsList className="grid w-full grid-cols-3" data-testid="tabs-risk-level">
              <TabsTrigger value="high" data-testid="tab-risk-high">
                {getTerm("highRisk")}
              </TabsTrigger>
              <TabsTrigger value="balanced" data-testid="tab-risk-balanced">
                {getTerm("balanced")}
              </TabsTrigger>
              <TabsTrigger value="low" data-testid="tab-risk-low">
                {getTerm("lowRisk")}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Sort Control */}
        <div className="flex-1">
          <Label className="text-sm font-medium mb-2 block">Sort By</Label>
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

        {/* Search */}
        <div className="flex-1">
          <Label className="text-sm font-medium mb-2 block">Search</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search ticker or company..."
              value={tickerSearch}
              onChange={(e) => setTickerSearch(e.target.value)}
              className="pl-9"
              data-testid="input-ticker-search"
            />
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="flex gap-4 text-sm">
        <div>
          <span className="text-muted-foreground">Total {getTerm("opportunities")}: </span>
          <span className="font-medium" data-testid="text-total-count">{opportunities.length}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Picked: </span>
          <span className="font-medium" data-testid="text-picked-count">{pinnedOpportunities.length}</span>
        </div>
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
        <div className="space-y-6">
          {groupedOpportunities.map((group) => (
            <div key={group.ticker} className="space-y-3">
              {/* Company Header */}
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  {group.ticker}
                  <a
                    href={`https://finance.yahoo.com/quote/${group.ticker}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </h2>
                {group.companyName !== group.ticker && (
                  <span className="text-sm text-muted-foreground">{group.companyName}</span>
                )}
                {group.stocks.length > 1 && (
                  <Badge variant="outline" className="ml-auto">
                    {group.stocks.length} transactions
                  </Badge>
                )}
              </div>

              {/* Transaction Cards */}
              <div className="grid gap-4 md:gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {group.stocks.map((stock) => {
                  // Use merged fields directly instead of re-fetching
                  const aiScore = (stock as any).integratedScore ?? (stock as any).aiScore ?? null;
                  const daysSinceTrade = (stock as any).daysSinceTrade ?? 0;
                  
                  // Create composite key for unique identification
                  const compositeKey = `${stock.ticker}-${stock.insiderName}-${stock.insiderTradeDate}`;

                  return (
                    <Card 
                      key={stock.id || compositeKey} 
                      className="hover-elevate relative"
                      data-testid={`card-opportunity-${compositeKey}`}
                    >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base flex items-center gap-2">
                        <span className="truncate" data-testid={`text-insider-${compositeKey}`}>
                          {stock.insiderName || "Insider"}
                        </span>
                      </CardTitle>
                      {stock.insiderTitle && (
                        <p className="text-xs text-muted-foreground truncate mt-1">
                          {stock.insiderTitle}
                        </p>
                      )}
                      {stock.insiderTradeDate && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Trade: {new Date(stock.insiderTradeDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => togglePickMutation.mutate({ 
                        ticker: stock.ticker, 
                        isPinned: stock.isPinned ?? false 
                      })}
                      className="shrink-0"
                      data-testid={`button-pick-${stock.ticker}`}
                    >
                      {stock.isPinned ? (
                        <Pin className="h-4 w-4 fill-current" />
                      ) : (
                        <PinOff className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Price Info */}
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Current Price:</span>
                    <span className="font-medium">${stock.currentPrice}</span>
                  </div>

                  {/* Market Cap */}
                  {stock.marketCap && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Market Cap:</span>
                      <span className="font-medium">{stock.marketCap}</span>
                    </div>
                  )}

                  {/* Insider Price & Quantity */}
                  {stock.insiderPrice && stock.insiderQuantity && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Insider Trade:</span>
                      <span className="font-medium text-xs">
                        {stock.insiderQuantity.toLocaleString()} @ ${stock.insiderPrice}
                      </span>
                    </div>
                  )}

                  {/* Transaction Type */}
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">{getTerm("transactionType")}:</span>
                    <Badge variant={stock.recommendation?.toLowerCase().includes("buy") ? "default" : "destructive"}>
                      {getTerm(stock.recommendation?.toLowerCase().includes("buy") ? "insiderPurchase" : "insiderSale")}
                    </Badge>
                  </div>

                  {/* Days Since Trade */}
                  {daysSinceTrade > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Days from Trade:</span>
                      <span className="font-medium" data-testid={`text-days-${stock.ticker}`}>
                        {daysSinceTrade}
                      </span>
                    </div>
                  )}

                  {/* AI Score */}
                  {aiScore !== null && (
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">AI Score:</span>
                        <Badge 
                          variant={aiScore >= 75 ? "default" : aiScore >= 50 ? "secondary" : "outline"}
                          data-testid={`badge-score-${stock.ticker}`}
                        >
                          {aiScore}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {stock.recommendation?.toLowerCase().includes("buy") 
                          ? "Likelihood of price appreciation" 
                          : "Likelihood of price decline"}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}
