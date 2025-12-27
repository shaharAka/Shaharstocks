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
  Calendar,
  Globe,
  Building2,
  Newspaper,
  ArrowUpCircle,
  ArrowDownCircle,
  MinusCircle,
  ChevronDown,
  Eye,
  Target,
  DollarSign,
  User,
  Briefcase
} from "lucide-react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Link } from "wouter";
import type { Stock, StockCommentWithUser } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useUser } from "@/contexts/UserContext";
import { StockSimulationPlot } from "@/components/stock-simulation-plot";
import { StockAIAnalysis } from "@/components/stock-ai-analysis";
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

// Helper to get stage info
const getStageInfo = (isFollowing: boolean, hasEnteredPosition: boolean) => {
  if (hasEnteredPosition) {
    return { label: "In Position", variant: "default" as const, icon: DollarSign };
  }
  if (isFollowing) {
    return { label: "Following", variant: "secondary" as const, icon: Eye };
  }
  return { label: "Opportunity", variant: "outline" as const, icon: Target };
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
  const stageInfo = getStageInfo(isFollowing, hasEnteredPosition);

  // Fetch daily briefs (lightweight daily reports for followed stocks)
  const { data: dailyBriefs = [], isLoading: briefsLoading } = useQuery<any[]>({
    queryKey: ["/api/stocks", ticker, "daily-briefs"],
    enabled: !!ticker && isFollowing,
    retry: false,
    meta: { ignoreError: true },
  });

  // Check if there's an active analysis job for this stock
  const { data: analysisJobs = [] } = useQuery<any[]>({
    queryKey: ["/api/analysis-jobs", { ticker }],
    enabled: !!ticker,
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
      return await apiRequest("POST", `/api/stocks/${ticker}/follow`, null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/me/followed"] });
      queryClient.invalidateQueries({ queryKey: ["/api/opportunities"] });
      toast({
        title: "Following",
        description: `You are now following ${ticker}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to follow stock",
        variant: "destructive",
      });
    },
  });

  // Unfollow mutation
  const unfollowMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", `/api/stocks/${ticker}/follow`, null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/me/followed"] });
      toast({
        title: "Unfollowed",
        description: `You are no longer following ${ticker}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to unfollow stock",
        variant: "destructive",
      });
    },
  });

  // Toggle position mutation
  const togglePositionMutation = useMutation({
    mutationFn: async ({ hasEnteredPosition, entryPrice }: { hasEnteredPosition: boolean; entryPrice?: number }) => {
      return await apiRequest("PATCH", `/api/stocks/${ticker}/position`, { 
        hasEnteredPosition,
        entryPrice 
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/me/followed"] });
      toast({
        title: variables.hasEnteredPosition ? "Position entered" : "Position exited",
        description: variables.hasEnteredPosition 
          ? `Marked as in position for ${ticker}` 
          : `Marked as watching ${ticker}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update position",
        variant: "destructive",
      });
    },
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async (comment: string) => {
      return await apiRequest("POST", `/api/stocks/${ticker}/comments`, { comment });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stocks", ticker, "comments"] });
      setCommentText("");
      toast({
        title: "Comment added",
        description: "Your comment has been posted",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add comment",
        variant: "destructive",
      });
    },
  });

  // Helper function to get user initials
  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  if (stockLoading) {
    return (
      <div className="p-4 md:p-6 space-y-4 max-w-5xl">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!stock) {
    return (
      <div className="p-4 md:p-6 max-w-5xl">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Stock not found</p>
            <Button variant="outline" asChild className="mt-4">
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

  const currentPrice = parseFloat(stock.currentPrice || "0");
  const previousClose = parseFloat(stock.previousClose || "0");
  const priceChange = currentPrice - previousClose;
  const priceChangePercent = previousClose > 0 ? (priceChange / previousClose) * 100 : 0;
  const isPositive = priceChange >= 0;

  // Parse news from stock data
  const newsItems = stock.news ? 
    (typeof stock.news === "string" ? JSON.parse(stock.news) : stock.news) 
    : [];

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-5xl">
      {/* ═══════════════════════════════════════════════════════════════════════
          STOCK ZONE - Header, Price, Stage Controls
          ═══════════════════════════════════════════════════════════════════════ */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          {/* Header Row */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                asChild
                data-testid="button-back"
              >
                <Link href={backNav.href}>
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl md:text-3xl font-bold font-mono" data-testid="heading-ticker">
                    {stock.ticker}
                  </h1>
                  <Badge variant={stageInfo.variant} className="text-xs" data-testid="badge-stage">
                    <stageInfo.icon className="h-3 w-3 mr-1" />
                    {stageInfo.label}
                  </Badge>
                </div>
                {stock.companyName && (
                  <p className="text-sm text-muted-foreground" data-testid="text-company-name">
                    {stock.companyName}
                  </p>
                )}
              </div>
            </div>
            
            {/* Stage Actions */}
            <div className="flex items-center gap-2">
              {!isFollowing ? (
                <Button
                  onClick={() => followMutation.mutate()}
                  disabled={followMutation.isPending}
                  data-testid="button-follow"
                >
                  <Star className="h-4 w-4 mr-2" />
                  {followMutation.isPending ? "Following..." : "Follow"}
                </Button>
              ) : (
                <>
                  <div className="flex items-center gap-2 mr-2">
                    <Label htmlFor="position-toggle" className="text-xs text-muted-foreground whitespace-nowrap">
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => unfollowMutation.mutate()}
                    disabled={unfollowMutation.isPending}
                    data-testid="button-unfollow"
                  >
                    <Star className="h-4 w-4 mr-1 fill-current" />
                    Unfollow
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Price Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Current Price</p>
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold font-mono" data-testid="text-current-price">
                  ${currentPrice.toFixed(2)}
                </span>
                <div className={`flex items-center gap-1 ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  <span className="text-sm font-medium" data-testid="text-price-change">
                    {isPositive ? '+' : ''}{priceChange.toFixed(2)} ({isPositive ? '+' : ''}{priceChangePercent.toFixed(2)}%)
                  </span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {stock.marketCap && (
                <div>
                  <p className="text-xs text-muted-foreground">Market Cap</p>
                  <p className="font-medium font-mono" data-testid="text-market-cap">{stock.marketCap}</p>
                </div>
              )}
              {stock.peRatio && (
                <div>
                  <p className="text-xs text-muted-foreground">P/E Ratio</p>
                  <p className="font-medium font-mono" data-testid="text-pe-ratio">{parseFloat(stock.peRatio).toFixed(2)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Insider Summary - Compact inline */}
          {(stock.insiderPrice || stock.insiderTradeDate) && (
            <>
              <Separator className="my-4" />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {stock.insiderPrice && (
                  <div>
                    <p className="text-[10px] text-muted-foreground">Insider Price</p>
                    <p className="text-sm font-mono font-medium" data-testid="text-insider-price">
                      ${parseFloat(stock.insiderPrice).toFixed(2)}
                    </p>
                  </div>
                )}
                {stock.insiderQuantity && (
                  <div>
                    <p className="text-[10px] text-muted-foreground">Shares</p>
                    <p className="text-sm font-medium" data-testid="text-insider-quantity">
                      {stock.insiderQuantity.toLocaleString()}
                    </p>
                  </div>
                )}
                {stock.insiderTradeDate && (
                  <div>
                    <p className="text-[10px] text-muted-foreground">Trade Date</p>
                    <p className="text-sm font-medium" data-testid="text-trade-date">
                      {stock.insiderTradeDate}
                    </p>
                  </div>
                )}
                {stock.insiderName && (
                  <div>
                    <p className="text-[10px] text-muted-foreground">Insider</p>
                    <p className="text-sm font-medium truncate" data-testid="text-insider-name">
                      {stock.insiderName}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════════════════════════
          COMPANY ZONE - About, Daily Briefs (if following)
          ═══════════════════════════════════════════════════════════════════════ */}
      {(stock.description || stock.industry || stock.country || stock.webUrl || (isFollowing && dailyBriefs.length > 0)) && (
        <Card>
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4" />
                Company
              </CardTitle>
              <CompactSignalBadge ticker={ticker} />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-4">
            {/* Company Info */}
            {stock.description && (
              <p className="text-sm text-muted-foreground line-clamp-3" data-testid="text-description">
                {stock.description}
              </p>
            )}
            
            <div className="flex items-center gap-4 flex-wrap text-sm">
              {stock.industry && (
                <div className="flex items-center gap-1.5">
                  <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                  <span data-testid="text-industry">{stock.industry}</span>
                </div>
              )}
              {stock.country && (
                <div className="flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                  <span data-testid="text-country">{stock.country}</span>
                </div>
              )}
              {stock.ipo && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">IPO:</span>
                  <span data-testid="text-ipo">{stock.ipo}</span>
                </div>
              )}
              {stock.webUrl && (
                <Button variant="ghost" size="sm" asChild className="h-auto py-0.5 px-1.5 text-xs">
                  <a href={stock.webUrl} target="_blank" rel="noopener noreferrer">
                    Website
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
                </Button>
              )}
            </div>

            {/* Daily Briefs - Only for followed stocks */}
            {isFollowing && (
              <>
                <Separator />
                <LoadingStrikeBorder isLoading={hasActiveAnalysisJob}>
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <h4 className="text-sm font-medium flex items-center gap-2">
                        Daily Briefs
                        {hasActiveAnalysisJob && (
                          <Badge variant="secondary" className="text-xs">Analyzing...</Badge>
                        )}
                      </h4>
                    </div>
                    
                    {briefsLoading ? (
                      <Skeleton className="h-20 w-full" />
                    ) : dailyBriefs.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        Daily briefs will appear here once generated.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {(() => {
                          const renderBrief = (brief: any, isLatest: boolean = false) => {
                            const briefPriceChange = parseFloat(brief.priceChange || 0);
                            const briefPriceChangePercent = parseFloat(brief.priceChangePercent || 0);
                            const briefIsPositive = briefPriceChange >= 0;
                            
                            const activeStance = hasEnteredPosition ? brief.owningStance : brief.watchingStance;
                            const activeConfidence = hasEnteredPosition ? brief.owningConfidence : brief.watchingConfidence;
                            const activeText = hasEnteredPosition ? brief.owningText : brief.watchingText;
                            const activeHighlights = hasEnteredPosition ? brief.owningHighlights : brief.watchingHighlights;
                            
                            const isAct = activeStance === "buy" || activeStance === "sell" || activeStance === "enter" || activeStance === "short" || activeStance === "cover";
                            
                            const getStanceConfig = (stance: string) => {
                              const normalizedStance = stance?.toLowerCase() || "hold";
                              if (normalizedStance === "buy" || normalizedStance === "enter") {
                                return { icon: ArrowUpCircle, text: "BUY", color: "text-green-600 dark:text-green-400", bgColor: "bg-green-50 dark:bg-green-950/30" };
                              } else if (normalizedStance === "sell" || normalizedStance === "short") {
                                const displayText = !hasEnteredPosition ? "SHORT" : "SELL";
                                return { icon: ArrowDownCircle, text: displayText, color: "text-red-600 dark:text-red-400", bgColor: "bg-red-50 dark:bg-red-950/30" };
                              } else if (normalizedStance === "cover") {
                                return { icon: ArrowUpCircle, text: "COVER", color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-50 dark:bg-blue-950/30" };
                              } else {
                                return { icon: MinusCircle, text: "HOLD", color: "text-muted-foreground", bgColor: "bg-muted/20" };
                              }
                            };
                            
                            const stanceConfig = getStanceConfig(activeStance);
                            
                            return (
                              <div key={brief.id} className={`border rounded-lg p-3 ${stanceConfig.bgColor}`}>
                                <div className="flex items-center justify-between gap-2 mb-2">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs">
                                      {isLatest ? "Latest" : new Date(brief.briefDate).toLocaleDateString()}
                                    </Badge>
                                    <Badge variant={isAct ? "default" : "outline"} className="text-xs">
                                      {stanceConfig.text}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                      Confidence: {activeConfidence}/10
                                    </span>
                                  </div>
                                  <div className="text-right">
                                    <span className="font-mono font-medium">
                                      ${parseFloat(brief.priceSnapshot || 0).toFixed(2)}
                                    </span>
                                    <span className={`ml-2 text-xs ${briefIsPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                      {briefIsPositive ? '+' : ''}{briefPriceChangePercent.toFixed(2)}%
                                    </span>
                                  </div>
                                </div>
                                <p className="text-sm text-muted-foreground" data-testid={`text-brief-${brief.id}`}>
                                  {activeText}
                                </p>
                                {activeHighlights && activeHighlights.length > 0 && (
                                  <ul className="list-disc list-inside mt-2 space-y-0.5">
                                    {activeHighlights.map((highlight: string, idx: number) => (
                                      <li key={idx} className="text-xs text-muted-foreground">
                                        {highlight}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            );
                          };

                          const latestBrief = dailyBriefs[0];
                          const previousBriefs = dailyBriefs.slice(1);

                          return (
                            <>
                              {latestBrief && renderBrief(latestBrief, true)}
                              
                              {previousBriefs.length > 0 && (
                                <Collapsible className="group">
                                  <CollapsibleTrigger asChild>
                                    <button className="w-full px-3 py-2 bg-muted/50 hover:bg-muted rounded-lg text-left flex items-center justify-between gap-2 cursor-pointer text-sm" data-testid="button-toggle-previous-reports">
                                      <span className="font-medium">
                                        Previous Reports ({previousBriefs.length})
                                      </span>
                                      <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
                                    </button>
                                  </CollapsibleTrigger>
                                  <CollapsibleContent className="space-y-2 mt-2">
                                    {previousBriefs.map((brief: any) => renderBrief(brief, false))}
                                  </CollapsibleContent>
                                </Collapsible>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </LoadingStrikeBorder>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          AI ZONE - Analysis, Trading Rules (if following), News, Discussion
          ═══════════════════════════════════════════════════════════════════════ */}
      
      {/* Trading Rules Chart - Only for followed stocks (not opportunities) */}
      {isFollowing && (
        <StockSimulationPlot ticker={ticker} stock={stock} />
      )}

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
            <StockAIAnalysis ticker={ticker} />
          </div>
        </TabsContent>

        {/* News Tab */}
        <TabsContent value="news" className="space-y-3">
          {newsItems.length > 0 ? (
            newsItems.map((item: any, index: number) => (
              <Card key={index}>
                <CardHeader className="p-3 pb-2">
                  <CardTitle className="text-sm flex items-start justify-between gap-2">
                    <span className="line-clamp-2">{item.headline}</span>
                    <Button variant="ghost" size="icon" asChild className="flex-shrink-0 h-6 w-6">
                      <a href={item.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </Button>
                  </CardTitle>
                  <CardDescription className="flex items-center gap-1.5 text-[10px] flex-wrap">
                    <Newspaper className="h-3 w-3" />
                    <span className="truncate max-w-[100px]">{item.source}</span>
                    <span>•</span>
                    <Calendar className="h-3 w-3" />
                    {new Date(item.datetime * 1000).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                {item.summary && (
                  <CardContent className="p-3 pt-0">
                    <p className="text-xs text-muted-foreground line-clamp-3">{item.summary}</p>
                  </CardContent>
                )}
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-sm text-muted-foreground">No news available</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Insider Tab */}
        <TabsContent value="insider" className="space-y-3">
          <Card>
            <CardHeader className="p-3 pb-2">
              <CardTitle className="text-sm">Insider Trade Details</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {stock.insiderPrice && (
                  <div>
                    <p className="text-[10px] text-muted-foreground">Insider Price</p>
                    <p className="text-sm font-mono font-medium">
                      ${parseFloat(stock.insiderPrice).toFixed(2)}
                    </p>
                  </div>
                )}
                {stock.insiderQuantity && (
                  <div>
                    <p className="text-[10px] text-muted-foreground">Shares</p>
                    <p className="text-sm font-medium">
                      {stock.insiderQuantity.toLocaleString()}
                    </p>
                  </div>
                )}
                {stock.insiderTradeDate && (
                  <div>
                    <p className="text-[10px] text-muted-foreground">Trade Date</p>
                    <p className="text-sm font-medium">{stock.insiderTradeDate}</p>
                  </div>
                )}
                {stock.marketPriceAtInsiderDate && (
                  <div>
                    <p className="text-[10px] text-muted-foreground">Market at Trade</p>
                    <p className="text-sm font-mono font-medium">
                      ${parseFloat(stock.marketPriceAtInsiderDate).toFixed(2)}
                    </p>
                  </div>
                )}
              </div>
              {(stock.insiderName || stock.insiderTitle) && (
                <>
                  <Separator className="my-3" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {stock.insiderName && (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-[10px] text-muted-foreground">Name</p>
                          <p className="text-sm font-medium">{stock.insiderName}</p>
                        </div>
                      </div>
                    )}
                    {stock.insiderTitle && (
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-[10px] text-muted-foreground">Title</p>
                          <p className="text-sm font-medium">{stock.insiderTitle}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Discussion Tab */}
        <TabsContent value="discussion" className="space-y-3">
          <Card>
            <CardHeader className="p-3 pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <MessageSquare className="h-4 w-4" />
                Comments ({comments.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 space-y-3">
              {/* Add Comment */}
              <div className="flex gap-2">
                <Textarea
                  placeholder="Add a comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  rows={2}
                  className="text-sm"
                  data-testid="input-comment"
                />
                <Button
                  size="sm"
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
                <p className="text-muted-foreground text-xs text-center py-4">
                  No comments yet. Be the first to share your thoughts!
                </p>
              ) : (
                <div className="space-y-3">
                  {comments.map((comment) => {
                    if (!comment.user) return null;
                    return (
                      <div key={comment.id} className="flex gap-2" data-testid={`comment-${comment.id}`}>
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="text-xs">
                            {getInitials(comment.user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-medium text-xs truncate">{comment.user.name}</span>
                            {comment.createdAt && (
                              <span className="text-[10px] text-muted-foreground flex-shrink-0">
                                {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{comment.comment}</p>
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
