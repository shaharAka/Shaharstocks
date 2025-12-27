import { useParams, useSearch } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Briefcase,
  UserCheck
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

  // Check if user is following this stock
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
      {/* 3-column layout: 1/3 left (stock+company+news+discussion), 2/3 right (AI) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* ═══════════════════════════════════════════════════════════════════════
            LEFT COLUMN (1/3) - Stock, Company+Insider, News, Discussion
            ═══════════════════════════════════════════════════════════════════════ */}
        <div className="space-y-3 lg:sticky lg:top-0 lg:self-start lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
          
          {/* STOCK ZONE */}
          <Card>
            <CardContent className="p-3">
              {/* Header Row */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    asChild
                    data-testid="button-back"
                  >
                    <Link href={backNav.href}>
                      <ArrowLeft className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h1 className="text-lg font-bold font-mono" data-testid="heading-ticker">
                        {stock.ticker}
                      </h1>
                      <Badge variant={stageInfo.variant} className="text-[9px] h-4" data-testid="badge-stage">
                        <stageInfo.icon className="h-2.5 w-2.5 mr-0.5" />
                        {stageInfo.label}
                      </Badge>
                    </div>
                    {stock.companyName && (
                      <p className="text-[10px] text-muted-foreground" data-testid="text-company-name">
                        {stock.companyName}
                      </p>
                    )}
                  </div>
                </div>
                <CompactSignalBadge ticker={ticker} />
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-xl font-bold font-mono" data-testid="text-current-price">
                  ${currentPrice.toFixed(2)}
                </span>
                <div className={`flex items-center gap-0.5 ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  <span className="text-xs font-medium" data-testid="text-price-change">
                    {isPositive ? '+' : ''}{priceChangePercent.toFixed(2)}%
                  </span>
                </div>
              </div>

              {/* Key Metrics Row */}
              <div className="flex gap-4 text-[10px] mb-2">
                {stock.marketCap && (
                  <div>
                    <span className="text-muted-foreground">MCap </span>
                    <span className="font-mono" data-testid="text-market-cap">{stock.marketCap}</span>
                  </div>
                )}
                {stock.peRatio && (
                  <div>
                    <span className="text-muted-foreground">P/E </span>
                    <span className="font-mono" data-testid="text-pe-ratio">{parseFloat(stock.peRatio).toFixed(1)}</span>
                  </div>
                )}
              </div>

              {/* Stage Actions */}
              {!isFollowing ? (
                <Button
                  size="sm"
                  className="w-full h-8"
                  onClick={() => followMutation.mutate()}
                  disabled={followMutation.isPending}
                  data-testid="button-follow"
                >
                  <Star className="h-3.5 w-3.5 mr-1.5" />
                  {followMutation.isPending ? "Following..." : "Follow"}
                </Button>
              ) : !hasEnteredPosition ? (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    className="flex-1 h-8"
                    onClick={() => togglePositionMutation.mutate({ 
                      hasEnteredPosition: true,
                      entryPrice: currentPrice 
                    })}
                    disabled={togglePositionMutation.isPending || isFollowedStocksFetching}
                    data-testid="button-enter-position"
                  >
                    <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
                    {togglePositionMutation.isPending ? "Entering..." : "Enter Position"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => unfollowMutation.mutate()}
                    disabled={unfollowMutation.isPending}
                    data-testid="button-unfollow"
                  >
                    <Star className="h-3.5 w-3.5 fill-current" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 flex-1 px-2 py-1.5 bg-primary/10 rounded text-xs">
                    <Briefcase className="h-3.5 w-3.5 text-primary" />
                    <span className="font-medium text-primary">In Position</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs px-3"
                    onClick={() => togglePositionMutation.mutate({ 
                      hasEnteredPosition: false 
                    })}
                    disabled={togglePositionMutation.isPending}
                    data-testid="button-exit-position"
                  >
                    Exit
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* COMPANY + INSIDER ZONE (Unified) */}
          <Card>
            <CardHeader className="p-3 pb-1">
              <CardTitle className="flex items-center gap-1.5 text-xs">
                <Building2 className="h-3 w-3" />
                Company & Insider
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 space-y-2">
              {/* Company Description */}
              {stock.description && (
                <p className="text-[10px] text-muted-foreground line-clamp-3" data-testid="text-description">
                  {stock.description}
                </p>
              )}
              
              {/* Company Meta */}
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px]">
                {stock.industry && (
                  <div className="flex items-center gap-1">
                    <Briefcase className="h-2.5 w-2.5 text-muted-foreground" />
                    <span data-testid="text-industry">{stock.industry}</span>
                  </div>
                )}
                {stock.country && (
                  <div className="flex items-center gap-1">
                    <Globe className="h-2.5 w-2.5 text-muted-foreground" />
                    <span data-testid="text-country">{stock.country}</span>
                  </div>
                )}
                {stock.ipo && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-2.5 w-2.5 text-muted-foreground" />
                    <span data-testid="text-ipo">{stock.ipo}</span>
                  </div>
                )}
              </div>

              {stock.webUrl && (
                <Button variant="outline" size="sm" asChild className="w-full h-6 text-[10px]">
                  <a href={stock.webUrl} target="_blank" rel="noopener noreferrer">
                    Website <ExternalLink className="h-2.5 w-2.5 ml-1" />
                  </a>
                </Button>
              )}

              {/* Insider Info - Unified */}
              {(stock.insiderPrice || stock.insiderTradeDate || stock.insiderName) && (
                <>
                  <Separator className="my-1" />
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1 text-[10px] font-medium">
                      <UserCheck className="h-3 w-3 text-amber-600" />
                      Insider Trade
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
                      {stock.insiderName && (
                        <div className="col-span-2 flex items-center gap-1">
                          <User className="h-2.5 w-2.5 text-muted-foreground" />
                          <span className="truncate" data-testid="text-insider-name">{stock.insiderName}</span>
                          {stock.insiderTitle && (
                            <span className="text-muted-foreground truncate">({stock.insiderTitle})</span>
                          )}
                        </div>
                      )}
                      {stock.insiderPrice && (
                        <div>
                          <span className="text-muted-foreground">Price </span>
                          <span className="font-mono" data-testid="text-insider-price">${parseFloat(stock.insiderPrice).toFixed(2)}</span>
                        </div>
                      )}
                      {stock.insiderQuantity && (
                        <div>
                          <span className="text-muted-foreground">Shares </span>
                          <span data-testid="text-insider-quantity">{stock.insiderQuantity.toLocaleString()}</span>
                        </div>
                      )}
                      {stock.insiderTradeDate && (
                        <div>
                          <span className="text-muted-foreground">Date </span>
                          <span data-testid="text-trade-date">{stock.insiderTradeDate}</span>
                        </div>
                      )}
                      {stock.marketPriceAtInsiderDate && (
                        <div>
                          <span className="text-muted-foreground">Mkt@ </span>
                          <span className="font-mono">${parseFloat(stock.marketPriceAtInsiderDate).toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

            </CardContent>
          </Card>

          {/* NEWS ZONE (Collapsible) */}
          <Card>
            <CardContent className="p-3">
              <Collapsible className="group">
                <CollapsibleTrigger asChild>
                  <button className="w-full flex items-center justify-between cursor-pointer" data-testid="button-toggle-news">
                    <span className="flex items-center gap-1.5 text-xs font-medium">
                      <Newspaper className="h-3 w-3" />
                      News
                      {newsItems.length > 0 && (
                        <Badge variant="secondary" className="text-[8px] h-4">{newsItems.length}</Badge>
                      )}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 transition-transform group-data-[state=open]:rotate-180" />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2">
                  {newsItems.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {newsItems.slice(0, 5).map((item: any, i: number) => (
                        <a 
                          key={i} 
                          href={item.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="block p-1.5 rounded hover:bg-muted/50 transition-colors"
                        >
                          <p className="text-[10px] font-medium line-clamp-2 mb-0.5">{item.headline}</p>
                          <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
                            <span className="truncate max-w-[100px]">{item.source}</span>
                            <span>{new Date(item.datetime * 1000).toLocaleDateString()}</span>
                          </div>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-muted-foreground text-center py-2">No news available</p>
                  )}
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>

          {/* DISCUSSION ZONE (Collapsible) */}
          <Card>
            <CardContent className="p-3">
              <Collapsible className="group">
                <CollapsibleTrigger asChild>
                  <button className="w-full flex items-center justify-between cursor-pointer" data-testid="button-toggle-discussion">
                    <span className="flex items-center gap-1.5 text-xs font-medium">
                      <MessageSquare className="h-3 w-3" />
                      Discussion
                      {comments.length > 0 && (
                        <Badge variant="secondary" className="text-[8px] h-4">{comments.length}</Badge>
                      )}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 transition-transform group-data-[state=open]:rotate-180" />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2 space-y-2">
                  {/* Add Comment */}
                  <div className="flex gap-1.5">
                    <Textarea
                      placeholder="Add comment..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      rows={1}
                      className="text-[10px] min-h-[28px] py-1.5"
                      data-testid="input-comment"
                    />
                    <Button
                      size="sm"
                      className="h-7 px-2 text-[10px]"
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

                  {/* Comment List */}
                  {comments.length === 0 ? (
                    <p className="text-[9px] text-muted-foreground text-center py-2">Be the first to comment!</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {comments.map((comment) => {
                        if (!comment.user) return null;
                        return (
                          <div key={comment.id} className="flex gap-1.5" data-testid={`comment-${comment.id}`}>
                            <Avatar className="h-5 w-5">
                              <AvatarFallback className="text-[8px]">
                                {getInitials(comment.user.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1 text-[9px]">
                                <span className="font-medium truncate">{comment.user.name}</span>
                                {comment.createdAt && (
                                  <span className="text-muted-foreground">
                                    {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-muted-foreground">{comment.comment}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════
            RIGHT COLUMN (2/3) - Trading Rules + AI Analysis (No Tabs)
            ═══════════════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Trading Rules Chart - Only for stocks where user is in position */}
          {hasEnteredPosition && (
            <StockSimulationPlot ticker={ticker} stock={stock} />
          )}

          {/* AI Analysis - Direct, no tabs */}
          <StockAIAnalysis ticker={ticker} />
        </div>
      </div>
    </div>
  );
}
