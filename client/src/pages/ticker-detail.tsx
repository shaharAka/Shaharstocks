import { useParams, useSearch } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  ArrowLeft, 
  Star, 
  TrendingUp, 
  TrendingDown, 
  ExternalLink,
  MessageSquare,
  Users,
  Calendar,
  Globe,
  Building2,
  Newspaper,
  TrendingUpIcon,
  ArrowUpCircle,
  ArrowDownCircle,
  MinusCircle,
  ChevronDown
} from "lucide-react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Link } from "wouter";
import type { Stock, StockCommentWithUser } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useUser } from "@/contexts/UserContext";
import { MiniCandlestickChart } from "@/components/mini-candlestick-chart";
import { StockSimulationPlot } from "@/components/stock-simulation-plot";
import { StockAIAnalysis } from "@/components/stock-ai-analysis";
import { SignalSummary } from "@/components/signal-summary";
import { CompactSignalBadge } from "@/components/compact-signal-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect, useMemo } from "react";
import { LoadingStrikeBorder } from "@/components/loading-strike-border";

// Map source param to back navigation config
const getBackNavigation = (source: string | null) => {
  switch (source) {
    case "following":
      return { href: "/following", label: "Following" };
    case "in-position":
      return { href: "/in-position", label: "In Position" };
    case "community":
      return { href: "/community", label: "Community" };
    case "opportunities":
    default:
      return { href: "/opportunities", label: "Opportunities" };
  }
};

export default function TickerDetail() {
  const { ticker: rawTicker } = useParams<{ ticker: string }>();
  const ticker = rawTicker?.toUpperCase();
  const searchString = useSearch();
  const searchParams = useMemo(() => new URLSearchParams(searchString), [searchString]);
  const source = searchParams.get("from");
  const backNav = getBackNavigation(source);
  const { toast } = useToast();
  const { user: currentUser } = useUser();
  const [commentText, setCommentText] = useState("");

  // Fetch stock details
  const { data: stock, isLoading: stockLoading } = useQuery<Stock>({
    queryKey: ["/api/stocks", ticker],
    enabled: !!ticker,
  });

  // Check if user is following this stock (needed for daily briefs query)
  const { data: followedStocks = [], isFetching: isFollowedStocksFetching } = useQuery<any[]>({
    queryKey: ["/api/users/me/followed"],
    enabled: !!currentUser,
    retry: false,
    meta: { ignoreError: true },
  });

  const currentFollowedStock = followedStocks.find(f => f.ticker === ticker);
  const isFollowing = !!currentFollowedStock;
  const hasEnteredPosition = currentFollowedStock?.hasEnteredPosition ?? false;

  // Fetch daily briefs (lightweight daily reports for followed stocks)
  const { data: dailyBriefs = [], isLoading: briefsLoading } = useQuery<any[]>({
    queryKey: ["/api/stocks", ticker, "daily-briefs"],
    enabled: !!ticker && isFollowing, // Only fetch if following
    retry: false,
    meta: { ignoreError: true },
  });

  // Check if there's an active analysis job for this stock
  const { data: analysisJobs = [] } = useQuery<any[]>({
    queryKey: ["/api/analysis-jobs", { ticker }],
    enabled: !!ticker,
    // Removed aggressive polling - WebSocket invalidates cache on updates
    retry: false,
    meta: { ignoreError: true },
  });
  
  const hasActiveAnalysisJob = analysisJobs.some(
    (job: any) => job.status === "pending" || job.status === "processing"
  );

  // Mark stock as viewed mutation
  const markViewedMutation = useMutation({
    mutationFn: async (tickerToMark: string) => {
      return await apiRequest("POST", `/api/stocks/${tickerToMark}/view`, null);
    },
    onSuccess: () => {
      // Invalidate queries that depend on viewed status
      if (currentUser?.id) {
        queryClient.invalidateQueries({ queryKey: ["/api/stock-views", currentUser.id] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/stocks/with-user-status"] });
    },
  });

  // Mark stock as viewed when page loads
  useEffect(() => {
    if (ticker && currentUser && !markViewedMutation.isPending) {
      markViewedMutation.mutate(ticker);
    }
  }, [ticker, currentUser?.id]);

  // Fetch comments
  const { data: comments = [] } = useQuery<StockCommentWithUser[]>({
    queryKey: ["/api/stocks", ticker, "comments"],
    enabled: !!ticker,
    retry: false,
    meta: { ignoreError: true },
  });

  // Follow mutation
  const followMutation = useMutation({
    mutationFn: async () => {
      if (!ticker) {
        throw new Error("Ticker is not defined");
      }
      console.log("[Follow] Attempting to follow:", ticker);
      return await apiRequest("POST", `/api/stocks/${ticker}/follow`, null);
    },
    onSuccess: () => {
      console.log("[Follow] Successfully followed:", ticker);
      queryClient.invalidateQueries({ queryKey: ["/api/users/me/followed"] });
      queryClient.invalidateQueries({ queryKey: ["/api/followed-stocks-with-prices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/followed-stocks-with-status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stocks", ticker, "daily-briefs"] }); // Fetch daily briefs after following
      
      toast({
        title: "Stock Followed",
        description: "Day-0 AI analysis has been queued for this stock",
      });
    },
    onError: (error: any) => {
      console.error("[Follow] Error following stock:", error);
      const message = error.message?.includes("already following") 
        ? "You are already following this stock"
        : `Failed to follow stock: ${error.message || 'Unknown error'}`;
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    },
  });

  // Unfollow mutation
  const unfollowMutation = useMutation({
    mutationFn: async () => {
      if (!ticker) {
        throw new Error("Ticker is not defined");
      }
      return await apiRequest("DELETE", `/api/stocks/${ticker}/follow`, null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/me/followed"] });
      queryClient.invalidateQueries({ queryKey: ["/api/followed-stocks-with-prices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/followed-stocks-with-status"] });
      toast({
        title: "Stock Unfollowed",
        description: "You are no longer following this stock",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to unfollow stock",
        variant: "destructive",
      });
    },
  });

  // Toggle position mutation
  const togglePositionMutation = useMutation({
    mutationFn: async ({ hasEnteredPosition, entryPrice }: { hasEnteredPosition: boolean; entryPrice?: number }) => {
      if (!ticker) {
        throw new Error("Ticker is not defined");
      }
      return await apiRequest("PATCH", `/api/stocks/${ticker}/position`, { hasEnteredPosition, entryPrice });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/me/followed"] });
      queryClient.invalidateQueries({ queryKey: ["/api/followed-stocks-with-prices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/followed-stocks-with-status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stocks", ticker, "daily-briefs"] });
    },
    onError: (error: any) => {
      const errorMessage = error.message || "Failed to update position status";
      const isNotFollowing = errorMessage.includes("not being followed");
      
      // Refetch to ensure UI is in sync with backend state
      queryClient.invalidateQueries({ queryKey: ["/api/users/me/followed"] });
      
      toast({
        title: "Error",
        description: isNotFollowing 
          ? "You must follow this stock to track your position"
          : "Failed to update position status",
        variant: "destructive",
      });
    },
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async (text: string) => {
      if (!currentUser?.id) {
        throw new Error("User not authenticated");
      }
      return await apiRequest("POST", `/api/stocks/${ticker}/comments`, { 
        userId: currentUser.id,
        comment: text 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stocks", ticker, "comments"] });
      setCommentText("");
      toast({
        title: "Comment added",
        description: "Your comment has been posted",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add comment",
        variant: "destructive",
      });
    },
  });

  const getInitials = (name: string) => {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  if (stockLoading) {
    return (
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!stock) {
    return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Stock not found</p>
            <Button asChild className="mt-4" data-testid="button-back">
              <Link href={backNav.href}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to {backNav.label}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentPrice = parseFloat(stock.currentPrice);
  const previousPrice = parseFloat(stock.previousClose || stock.currentPrice);
  const priceChange = currentPrice - previousPrice;
  const priceChangePercent = (priceChange / previousPrice) * 100;
  const isPositive = priceChange >= 0;

  const newsItems = (stock as any).news || [];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            asChild
            data-testid="button-back"
          >
            <Link href={backNav.href}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-mono" data-testid="heading-ticker">
              {stock.ticker}
            </h1>
            {stock.companyName && (
              <p className="text-sm text-muted-foreground" data-testid="text-company-name">
                {stock.companyName}
              </p>
            )}
          </div>
        </div>
        {isFollowing ? (
          <Button
            variant="outline"
            onClick={() => unfollowMutation.mutate()}
            disabled={!ticker || unfollowMutation.isPending}
            data-testid="button-unfollow"
          >
            <Star className="h-4 w-4 mr-2 fill-current" />
            {unfollowMutation.isPending ? "Unfollowing..." : "Unfollow"}
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={() => followMutation.mutate()}
            disabled={!ticker || followMutation.isPending}
            data-testid="button-follow"
          >
            <Star className="h-4 w-4 mr-2" />
            {followMutation.isPending ? "Following..." : "Follow"}
          </Button>
        )}
      </div>

      {/* Price Overview */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm text-muted-foreground mb-2">Current Price</h3>
              <div className="flex items-baseline gap-4">
                <span className="text-4xl font-bold font-mono" data-testid="text-current-price">
                  ${currentPrice.toFixed(2)}
                </span>
                <div className={`flex items-center gap-1 ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {isPositive ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                  <span className="text-lg font-medium" data-testid="text-price-change">
                    {isPositive ? '+' : ''}{priceChange.toFixed(2)} ({isPositive ? '+' : ''}{priceChangePercent.toFixed(2)}%)
                  </span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {stock.marketCap && (
                <div>
                  <p className="text-sm text-muted-foreground">Market Cap</p>
                  <p className="text-lg font-medium" data-testid="text-market-cap">{stock.marketCap}</p>
                </div>
              )}
              {stock.peRatio && (
                <div>
                  <p className="text-sm text-muted-foreground">P/E Ratio</p>
                  <p className="text-lg font-medium" data-testid="text-pe-ratio">{parseFloat(stock.peRatio).toFixed(2)}</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily Briefs - Show above simulation for followed stocks */}
      {isFollowing && currentFollowedStock && (
        <LoadingStrikeBorder isLoading={hasActiveAnalysisJob}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    Daily Stock Briefs
                    {hasActiveAnalysisJob && (
                      <Badge variant="secondary" className="ml-2">
                        Analyzing...
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Lightweight daily reports with quick buy/sell/hold guidance for followed stocks
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="position-toggle" className="text-sm text-muted-foreground whitespace-nowrap">
                    {hasEnteredPosition ? "In Position" : "Watching"}
                  </Label>
                  <Switch
                    id="position-toggle"
                    checked={hasEnteredPosition}
                    onCheckedChange={(checked) => togglePositionMutation.mutate({ 
                      hasEnteredPosition: checked,
                      entryPrice: checked ? currentPrice : undefined 
                    })}
                    disabled={togglePositionMutation.isPending || isFollowedStocksFetching}
                    data-testid="switch-position"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
            {briefsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : dailyBriefs.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Daily briefs will appear here once generated. Briefs are created daily for stocks you follow.
              </p>
            ) : (
              <div className="space-y-6">
                {/* Helper function to render a brief */}
                {(() => {
                  const renderBrief = (brief: any, isLatest: boolean = false) => {
                    const priceChange = parseFloat(brief.priceChange || 0);
                    const priceChangePercent = parseFloat(brief.priceChangePercent || 0);
                    const isPositive = priceChange >= 0;
                    
                    const activeStance = hasEnteredPosition ? brief.owningStance : brief.watchingStance;
                    const activeConfidence = hasEnteredPosition ? brief.owningConfidence : brief.watchingConfidence;
                    const activeText = hasEnteredPosition ? brief.owningText : brief.watchingText;
                    const activeHighlights = hasEnteredPosition ? brief.owningHighlights : brief.watchingHighlights;
                    
                    const isAct = activeStance === "buy" || activeStance === "sell" || activeStance === "enter" || activeStance === "short" || activeStance === "cover";
                    
                    const getStanceConfig = (stance: string) => {
                      const normalizedStance = stance?.toLowerCase() || "hold";
                      if (normalizedStance === "buy" || normalizedStance === "enter") {
                        return { icon: ArrowUpCircle, text: "BUY", color: "text-green-600 dark:text-green-400", bgColor: "bg-green-50 dark:bg-green-950/30", borderColor: "border-green-500" };
                      } else if (normalizedStance === "sell" || normalizedStance === "short") {
                        // Display "SHORT" when watching (not in position), "SELL" when in position
                        const displayText = !hasEnteredPosition ? "SHORT" : "SELL";
                        return { icon: ArrowDownCircle, text: displayText, color: "text-red-600 dark:text-red-400", bgColor: "bg-red-50 dark:bg-red-950/30", borderColor: "border-red-500" };
                      } else if (normalizedStance === "cover") {
                        return { icon: ArrowUpCircle, text: "COVER", color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-50 dark:bg-blue-950/30", borderColor: "border-blue-500" };
                      } else {
                        return { icon: MinusCircle, text: "HOLD", color: "text-muted-foreground", bgColor: "bg-muted/20", borderColor: "border-gray-400 dark:border-gray-600" };
                      }
                    };
                    
                    const stanceConfig = getStanceConfig(activeStance);
                    
                    return (
                      <div key={brief.id} className={`border rounded-lg overflow-hidden ${stanceConfig.bgColor}`}>
                        <div className="px-4 py-4 space-y-3">
                          {/* Top row: Badges | Price info */}
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" data-testid={`badge-date-${brief.briefDate}`}>
                                {isLatest ? "Latest" : new Date(brief.briefDate).toLocaleDateString()}
                              </Badge>
                              <Badge variant={isAct ? "default" : "outline"} className={isAct ? "bg-primary" : ""}>
                                {stanceConfig.text}
                              </Badge>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-mono font-bold">
                                ${parseFloat(brief.priceSnapshot || 0).toFixed(2)}
                              </p>
                              <p className={`text-sm font-medium ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                {isPositive ? '+' : ''}{priceChange.toFixed(2)} ({isPositive ? '+' : ''}{priceChangePercent.toFixed(2)}%)
                              </p>
                            </div>
                          </div>
                          
                          {/* Status row: Icon | Status text | Confidence */}
                          <div className="flex items-center gap-2">
                            <stanceConfig.icon className={`h-5 w-5 ${stanceConfig.color}`} />
                            <h4 className="text-sm font-bold text-muted-foreground">
                              {hasEnteredPosition ? "CURRENTLY IN POSITION" : "CONSIDERING ENTRY"}
                            </h4>
                            <p className="text-xs text-muted-foreground">
                              Confidence: {activeConfidence}/10
                            </p>
                          </div>
                          
                          {/* Analysis text */}
                          <p className="text-sm text-muted-foreground" data-testid={`text-brief-${brief.id}`}>
                            {activeText}
                          </p>
                          
                          {/* Key highlights */}
                          {activeHighlights && activeHighlights.length > 0 && (
                            <ul className="list-disc list-inside space-y-1">
                              {activeHighlights.map((highlight: string, idx: number) => (
                                <li key={idx} className="text-xs text-muted-foreground">
                                  {highlight}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    );
                  };

                  const latestBrief = dailyBriefs[0];
                  const previousBriefs = dailyBriefs.slice(1);

                  return (
                    <>
                      {/* Latest Brief - Main Visual */}
                      {latestBrief && renderBrief(latestBrief, true)}
                      
                      {/* Previous Reports - Collapsible */}
                      {previousBriefs.length > 0 && (
                        <Collapsible className="group">
                          <div className="border rounded-lg overflow-hidden">
                            <CollapsibleTrigger asChild>
                              <button className="w-full px-4 py-3 bg-muted/50 hover:bg-muted text-left flex items-center justify-between gap-2 cursor-pointer" data-testid="button-toggle-previous-reports">
                                <span className="font-medium text-sm">
                                  Previous Reports ({previousBriefs.length})
                                </span>
                                <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
                              </button>
                            </CollapsibleTrigger>
                          </div>
                          <CollapsibleContent className="space-y-3 mt-3">
                            {previousBriefs.map((brief: any) => renderBrief(brief, false))}
                          </CollapsibleContent>
                        </Collapsible>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
            </CardContent>
          </Card>
        </LoadingStrikeBorder>
      )}

      {/* Company Information - Always visible */}
      {(stock.description || stock.industry || stock.country || stock.webUrl) && (
        <Card>
          <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-4">
            <div className="flex items-center justify-between gap-2 sm:gap-4 flex-wrap">
              <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                <Building2 className="h-4 sm:h-5 w-4 sm:w-5" />
                Company Information
              </CardTitle>
              <CompactSignalBadge ticker={ticker} />
            </div>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-6 pt-0">
            {stock.description && (
              <div>
                <h4 className="text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">About</h4>
                <p className="text-xs sm:text-sm text-muted-foreground" data-testid="text-description">
                  {stock.description}
                </p>
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
              {stock.industry && (
                <div>
                  <p className="text-[10px] sm:text-sm text-muted-foreground">Industry</p>
                  <p className="text-xs sm:text-base font-medium truncate" data-testid="text-industry">{stock.industry}</p>
                </div>
              )}
              {stock.country && (
                <div>
                  <p className="text-[10px] sm:text-sm text-muted-foreground">Country</p>
                  <p className="text-xs sm:text-base font-medium" data-testid="text-country">{stock.country}</p>
                </div>
              )}
              {stock.ipo && (
                <div>
                  <p className="text-[10px] sm:text-sm text-muted-foreground">IPO Date</p>
                  <p className="text-xs sm:text-base font-medium" data-testid="text-ipo">{stock.ipo}</p>
                </div>
              )}
            </div>
            {stock.webUrl && (
              <Button variant="outline" size="sm" asChild data-testid="button-website" className="text-xs sm:text-sm">
                <a href={stock.webUrl} target="_blank" rel="noopener noreferrer">
                  <Globe className="h-3.5 sm:h-4 w-3.5 sm:w-4 mr-1.5 sm:mr-2" />
                  Website
                  <ExternalLink className="h-3 w-3 ml-1.5 sm:ml-2" />
                </a>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Simulation Plot - shows price chart with trading rules overlay for followed stocks */}
      <StockSimulationPlot ticker={ticker} stock={stock} />

      {/* Main Content Tabs */}
      <Tabs defaultValue="analysis" className="w-full">
        <TabsList className="w-full h-auto flex flex-wrap gap-1 p-1 sm:grid sm:grid-cols-4 sm:gap-0 sm:h-10 sm:p-1">
          <TabsTrigger value="analysis" className="text-[11px] sm:text-sm flex-1 min-w-[55px] h-8 sm:h-auto">AI Analysis</TabsTrigger>
          <TabsTrigger value="news" className="text-[11px] sm:text-sm flex-1 min-w-[45px] h-8 sm:h-auto">News</TabsTrigger>
          <TabsTrigger value="insider" className="text-[11px] sm:text-sm flex-1 min-w-[55px] h-8 sm:h-auto">Insider</TabsTrigger>
          <TabsTrigger value="discussion" className="text-[11px] sm:text-sm flex-1 min-w-[60px] h-8 sm:h-auto">
            <span className="hidden sm:inline">Discussion</span>
            <span className="sm:hidden">Chat</span>
            {comments.length > 0 && (
              <Badge variant="secondary" className="ml-1 sm:ml-2 text-[9px] sm:text-xs">
                {comments.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* AI Analysis Tab */}
        <TabsContent value="analysis" className="w-full max-w-full min-w-0 overflow-hidden">
          <div className="w-full max-w-full min-w-0">
            {/* AI Playbook - Detailed analysis */}
            <StockAIAnalysis ticker={ticker} />
          </div>
        </TabsContent>

        {/* News Tab */}
        <TabsContent value="news" className="space-y-3 sm:space-y-4">
          {newsItems.length > 0 ? (
            newsItems.map((item: any, index: number) => (
              <Card key={index}>
                <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-4">
                  <CardTitle className="text-sm sm:text-lg flex items-start justify-between gap-2 sm:gap-4">
                    <span className="line-clamp-2">{item.headline}</span>
                    <Button variant="ghost" size="icon" asChild className="flex-shrink-0">
                      <a href={item.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </CardTitle>
                  <CardDescription className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-sm flex-wrap">
                    <Newspaper className="h-3 sm:h-4 w-3 sm:w-4" />
                    <span className="truncate max-w-[100px] sm:max-w-none">{item.source}</span>
                    <span>•</span>
                    <Calendar className="h-3 sm:h-4 w-3 sm:w-4" />
                    {new Date(item.datetime * 1000).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                {item.summary && (
                  <CardContent className="p-3 sm:p-6 pt-0">
                    <p className="text-xs sm:text-sm text-muted-foreground line-clamp-3 sm:line-clamp-none">{item.summary}</p>
                  </CardContent>
                )}
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-6 sm:p-8 text-center">
                <p className="text-xs sm:text-sm text-muted-foreground">No news available</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Insider Tab */}
        <TabsContent value="insider" className="space-y-3 sm:space-y-4">
          <Card>
            <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-4">
              <CardTitle className="text-sm sm:text-base">Insider Trade Information</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {stock.insiderPrice && (
                  <div>
                    <p className="text-[10px] sm:text-sm text-muted-foreground">Insider Price</p>
                    <p className="text-sm sm:text-lg font-mono font-medium" data-testid="text-insider-price">
                      ${parseFloat(stock.insiderPrice).toFixed(2)}
                    </p>
                  </div>
                )}
                {stock.insiderQuantity && (
                  <div>
                    <p className="text-[10px] sm:text-sm text-muted-foreground">Shares</p>
                    <p className="text-sm sm:text-lg font-medium" data-testid="text-insider-quantity">
                      {stock.insiderQuantity.toLocaleString()}
                    </p>
                  </div>
                )}
                {stock.insiderTradeDate && (
                  <div>
                    <p className="text-[10px] sm:text-sm text-muted-foreground">Trade Date</p>
                    <p className="text-sm sm:text-lg font-medium" data-testid="text-trade-date">
                      {stock.insiderTradeDate}
                    </p>
                  </div>
                )}
                {stock.marketPriceAtInsiderDate && (
                  <div>
                    <p className="text-[10px] sm:text-sm text-muted-foreground">Market at Trade</p>
                    <p className="text-sm sm:text-lg font-mono font-medium" data-testid="text-market-price-at-trade">
                      ${parseFloat(stock.marketPriceAtInsiderDate).toFixed(2)}
                    </p>
                  </div>
                )}
              </div>
              {(stock.insiderName || stock.insiderTitle) && (
                <>
                  <Separator className="my-4" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {stock.insiderName && (
                      <div>
                        <p className="text-sm text-muted-foreground">Insider Name</p>
                        <p className="text-lg font-medium" data-testid="text-insider-name">
                          {stock.insiderName}
                        </p>
                      </div>
                    )}
                    {stock.insiderTitle && (
                      <div>
                        <p className="text-sm text-muted-foreground">Insider Title</p>
                        <p className="text-lg font-medium" data-testid="text-insider-title">
                          {stock.insiderTitle}
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Discussion Tab */}
        <TabsContent value="discussion" className="space-y-4">
          {/* Comments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Comments ({comments.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add Comment */}
              <div className="flex gap-2">
                <Textarea
                  placeholder="Add a comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  rows={2}
                  data-testid="input-comment"
                />
                <Button
                  onClick={() => {
                    if (commentText.trim()) {
                      addCommentMutation.mutate(commentText);
                    }
                  }}
                  disabled={!commentText.trim() || addCommentMutation.isPending}
                  data-testid="button-add-comment"
                >
                  Post
                </Button>
              </div>

              <Separator />

              {/* Comment List */}
              {comments.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">
                  No comments yet. Be the first to share your thoughts!
                </p>
              ) : (
                <div className="space-y-3">
                  {comments.map((comment) => {
                    if (!comment.user) return null;
                    return (
                      <div key={comment.id} className="flex gap-3" data-testid={`comment-${comment.id}`}>
                        <Avatar>
                          <AvatarFallback>
                            {getInitials(comment.user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{comment.user.name}</span>
                            {comment.createdAt && (
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{comment.comment}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
