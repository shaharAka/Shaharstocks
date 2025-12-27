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
      <div className="p-4 md:p-6 h-full">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
          <div className="space-y-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
          <div className="lg:col-span-2">
            <Skeleton className="h-[500px] w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!stock) {
    return (
      <div className="p-4 md:p-6">
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
    <div className="p-4 md:p-6 h-full overflow-auto">
      {/* 3-column layout: 1/3 left (stock+company), 2/3 right (AI) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* ═══════════════════════════════════════════════════════════════════════
            LEFT COLUMN (1/3) - Stock Info + Company Info
            ═══════════════════════════════════════════════════════════════════════ */}
        <div className="space-y-4 lg:sticky lg:top-0 lg:self-start">
          
          {/* STOCK ZONE */}
          <Card>
            <CardContent className="p-4">
              {/* Header Row */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    asChild
                    data-testid="button-back"
                  >
                    <Link href={backNav.href}>
                      <ArrowLeft className="h-4 w-4" />
                    </Link>
                  </Button>
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-xl font-bold font-mono" data-testid="heading-ticker">
                        {stock.ticker}
                      </h1>
                      <Badge variant={stageInfo.variant} className="text-[10px]" data-testid="badge-stage">
                        <stageInfo.icon className="h-2.5 w-2.5 mr-0.5" />
                        {stageInfo.label}
                      </Badge>
                    </div>
                    {stock.companyName && (
                      <p className="text-xs text-muted-foreground" data-testid="text-company-name">
                        {stock.companyName}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Price */}
              <div className="mb-3">
                <p className="text-[10px] text-muted-foreground mb-0.5">Current Price</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold font-mono" data-testid="text-current-price">
                    ${currentPrice.toFixed(2)}
                  </span>
                  <div className={`flex items-center gap-0.5 ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    <span className="text-xs font-medium" data-testid="text-price-change">
                      {isPositive ? '+' : ''}{priceChangePercent.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                {stock.marketCap && (
                  <div>
                    <p className="text-[10px] text-muted-foreground">Market Cap</p>
                    <p className="text-xs font-medium font-mono" data-testid="text-market-cap">{stock.marketCap}</p>
                  </div>
                )}
                {stock.peRatio && (
                  <div>
                    <p className="text-[10px] text-muted-foreground">P/E Ratio</p>
                    <p className="text-xs font-medium font-mono" data-testid="text-pe-ratio">{parseFloat(stock.peRatio).toFixed(2)}</p>
                  </div>
                )}
              </div>

              {/* Insider Summary */}
              {(stock.insiderPrice || stock.insiderTradeDate) && (
                <>
                  <Separator className="my-3" />
                  <div className="grid grid-cols-2 gap-2">
                    {stock.insiderPrice && (
                      <div>
                        <p className="text-[10px] text-muted-foreground">Insider Price</p>
                        <p className="text-xs font-mono font-medium" data-testid="text-insider-price">
                          ${parseFloat(stock.insiderPrice).toFixed(2)}
                        </p>
                      </div>
                    )}
                    {stock.insiderQuantity && (
                      <div>
                        <p className="text-[10px] text-muted-foreground">Shares</p>
                        <p className="text-xs font-medium" data-testid="text-insider-quantity">
                          {stock.insiderQuantity.toLocaleString()}
                        </p>
                      </div>
                    )}
                    {stock.insiderTradeDate && (
                      <div>
                        <p className="text-[10px] text-muted-foreground">Trade Date</p>
                        <p className="text-xs font-medium" data-testid="text-trade-date">
                          {stock.insiderTradeDate}
                        </p>
                      </div>
                    )}
                    {stock.insiderName && (
                      <div>
                        <p className="text-[10px] text-muted-foreground">Insider</p>
                        <p className="text-xs font-medium truncate" data-testid="text-insider-name">
                          {stock.insiderName}
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}

              <Separator className="my-3" />

              {/* Stage Actions */}
              <div className="flex flex-col gap-2">
                {!isFollowing ? (
                  <Button
                    className="w-full"
                    onClick={() => followMutation.mutate()}
                    disabled={followMutation.isPending}
                    data-testid="button-follow"
                  >
                    <Star className="h-4 w-4 mr-2" />
                    {followMutation.isPending ? "Following..." : "Follow"}
                  </Button>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-2 p-2 bg-muted/50 rounded-md">
                      <Label htmlFor="position-toggle" className="text-xs text-muted-foreground">
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
                      <Star className="h-3 w-3 mr-1 fill-current" />
                      Unfollow
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* COMPANY ZONE */}
          <Card>
            <CardHeader className="p-3 pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-1.5 text-sm">
                  <Building2 className="h-3.5 w-3.5" />
                  Company
                </CardTitle>
                <CompactSignalBadge ticker={ticker} />
              </div>
            </CardHeader>
            <CardContent className="p-3 pt-0 space-y-3">
              {/* Company Info */}
              {stock.description && (
                <p className="text-xs text-muted-foreground line-clamp-4" data-testid="text-description">
                  {stock.description}
                </p>
              )}
              
              <div className="flex flex-col gap-1.5 text-xs">
                {stock.industry && (
                  <div className="flex items-center gap-1.5">
                    <Briefcase className="h-3 w-3 text-muted-foreground" />
                    <span data-testid="text-industry">{stock.industry}</span>
                  </div>
                )}
                {stock.country && (
                  <div className="flex items-center gap-1.5">
                    <Globe className="h-3 w-3 text-muted-foreground" />
                    <span data-testid="text-country">{stock.country}</span>
                  </div>
                )}
                {stock.ipo && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">IPO:</span>
                    <span data-testid="text-ipo">{stock.ipo}</span>
                  </div>
                )}
              </div>

              {stock.webUrl && (
                <Button variant="outline" size="sm" asChild className="w-full h-7 text-xs">
                  <a href={stock.webUrl} target="_blank" rel="noopener noreferrer">
                    Website
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
                </Button>
              )}

              {/* Daily Briefs - Only for followed stocks */}
              {isFollowing && (
                <>
                  <Separator />
                  <LoadingStrikeBorder isLoading={hasActiveAnalysisJob}>
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <h4 className="text-xs font-medium flex items-center gap-1.5">
                          Daily Briefs
                          {hasActiveAnalysisJob && (
                            <Badge variant="secondary" className="text-[9px] h-4">Analyzing...</Badge>
                          )}
                        </h4>
                      </div>
                      
                      {briefsLoading ? (
                        <Skeleton className="h-16 w-full" />
                      ) : dailyBriefs.length === 0 ? (
                        <p className="text-[10px] text-muted-foreground">
                          Daily briefs will appear here once generated.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {(() => {
                            const renderBrief = (brief: any, isLatest: boolean = false) => {
                              const briefPriceChange = parseFloat(brief.priceChange || 0);
                              const briefPriceChangePercent = parseFloat(brief.priceChangePercent || 0);
                              const briefIsPositive = briefPriceChange >= 0;
                              
                              const activeStance = hasEnteredPosition ? brief.owningStance : brief.watchingStance;
                              const activeConfidence = hasEnteredPosition ? brief.owningConfidence : brief.watchingConfidence;
                              const activeText = hasEnteredPosition ? brief.owningText : brief.watchingText;
                              
                              const getStanceConfig = (stance: string) => {
                                const normalizedStance = stance?.toLowerCase() || "hold";
                                if (normalizedStance === "buy" || normalizedStance === "enter") {
                                  return { icon: ArrowUpCircle, text: "BUY", bgColor: "bg-green-50 dark:bg-green-950/30" };
                                } else if (normalizedStance === "sell" || normalizedStance === "short") {
                                  const displayText = !hasEnteredPosition ? "SHORT" : "SELL";
                                  return { icon: ArrowDownCircle, text: displayText, bgColor: "bg-red-50 dark:bg-red-950/30" };
                                } else if (normalizedStance === "cover") {
                                  return { icon: ArrowUpCircle, text: "COVER", bgColor: "bg-blue-50 dark:bg-blue-950/30" };
                                } else {
                                  return { icon: MinusCircle, text: "HOLD", bgColor: "bg-muted/20" };
                                }
                              };
                              
                              const stanceConfig = getStanceConfig(activeStance);
                              
                              return (
                                <div key={brief.id} className={`border rounded p-2 ${stanceConfig.bgColor}`}>
                                  <div className="flex items-center justify-between gap-1 mb-1">
                                    <div className="flex items-center gap-1">
                                      <Badge variant="outline" className="text-[9px] h-4">
                                        {isLatest ? "Latest" : new Date(brief.briefDate).toLocaleDateString()}
                                      </Badge>
                                      <Badge variant="secondary" className="text-[9px] h-4">
                                        {stanceConfig.text}
                                      </Badge>
                                    </div>
                                    <span className={`text-[10px] ${briefIsPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                      {briefIsPositive ? '+' : ''}{briefPriceChangePercent.toFixed(2)}%
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-muted-foreground line-clamp-2" data-testid={`text-brief-${brief.id}`}>
                                    {activeText}
                                  </p>
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
                                      <button className="w-full px-2 py-1.5 bg-muted/50 hover:bg-muted rounded text-left flex items-center justify-between gap-1 cursor-pointer text-[10px]" data-testid="button-toggle-previous-reports">
                                        <span className="font-medium">
                                          Previous ({previousBriefs.length})
                                        </span>
                                        <ChevronDown className="h-3 w-3 transition-transform group-data-[state=open]:rotate-180" />
                                      </button>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent className="space-y-1.5 mt-1.5">
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
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════
            RIGHT COLUMN (2/3) - AI Zone
            ═══════════════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Trading Rules Chart - Only for followed stocks */}
          {isFollowing && (
            <StockSimulationPlot ticker={ticker} stock={stock} />
          )}

          {/* Main Content Tabs */}
          <Tabs defaultValue="analysis" className="w-full">
            <TabsList className="w-full h-9 grid grid-cols-4">
              <TabsTrigger value="analysis" className="text-xs">AI Analysis</TabsTrigger>
              <TabsTrigger value="news" className="text-xs">News</TabsTrigger>
              <TabsTrigger value="insider" className="text-xs">Insider</TabsTrigger>
              <TabsTrigger value="discussion" className="text-xs">
                Discussion
                {comments.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-[9px] h-4">
                    {comments.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* AI Analysis Tab */}
            <TabsContent value="analysis" className="w-full">
              <StockAIAnalysis ticker={ticker} />
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
                        <span className="truncate max-w-[150px]">{item.source}</span>
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
      </div>
    </div>
  );
}
