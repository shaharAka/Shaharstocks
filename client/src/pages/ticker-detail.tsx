import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  MinusCircle
} from "lucide-react";
import { Link } from "wouter";
import type { Stock, StockInterestWithUser, StockCommentWithUser } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useUser } from "@/contexts/UserContext";
import { MiniCandlestickChart } from "@/components/mini-candlestick-chart";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { LoadingStrikeBorder } from "@/components/loading-strike-border";

export default function TickerDetail() {
  const { ticker: rawTicker } = useParams<{ ticker: string }>();
  const ticker = rawTicker?.toUpperCase();
  const { toast } = useToast();
  const { user: currentUser } = useUser();
  const [commentText, setCommentText] = useState("");

  // Fetch stock details
  const { data: stock, isLoading: stockLoading } = useQuery<Stock>({
    queryKey: ["/api/stocks", ticker],
    enabled: !!ticker,
  });

  // Check if user is following this stock (needed for daily briefs query)
  const { data: followedStocks = [] } = useQuery<any[]>({
    queryKey: ["/api/users/me/followed"],
    enabled: !!currentUser,
    retry: false,
    meta: { ignoreError: true },
  });

  const isFollowing = followedStocks.some(f => f.ticker === ticker);

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
    refetchInterval: 5000, // Poll every 5 seconds
    retry: false,
    meta: { ignoreError: true },
  });
  
  const hasActiveAnalysisJob = analysisJobs.some(
    (job: any) => job.status === "pending" || job.status === "processing"
  );

  // Fetch AI analysis
  const { data: aiAnalysis } = useQuery<any>({
    queryKey: ["/api/stocks", ticker, "analysis"],
    enabled: !!ticker,
    retry: false,
    meta: { ignoreError: true },
  });

  // Fetch comments
  const { data: comments = [] } = useQuery<StockCommentWithUser[]>({
    queryKey: ["/api/stocks", ticker, "comments"],
    enabled: !!ticker,
    retry: false,
    meta: { ignoreError: true },
  });

  // Fetch interests
  const { data: interests = [] } = useQuery<StockInterestWithUser[]>({
    queryKey: ["/api/stocks", ticker, "interests"],
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
              <Link href="/recommendations">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Opportunities
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
            <Link href="/recommendations">
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

      {/* Candlestick Chart */}
      {stock.candlesticks && stock.candlesticks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Price Chart</CardTitle>
          </CardHeader>
          <CardContent>
            <MiniCandlestickChart
              data={stock.candlesticks}
              height={200}
            />
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="summary" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="analysis">AI Analysis</TabsTrigger>
          <TabsTrigger value="news">News</TabsTrigger>
          <TabsTrigger value="insider">Insider</TabsTrigger>
          <TabsTrigger value="discussion">
            Discussion
            {comments.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {comments.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Daily Brief Tab */}
        <TabsContent value="summary" className="space-y-4">
          <LoadingStrikeBorder isLoading={hasActiveAnalysisJob}>
            <Card>
              <CardHeader>
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
              </CardHeader>
              <CardContent>
              {briefsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ) : dailyBriefs.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  {isFollowing 
                    ? "Daily briefs will appear here once generated. Briefs are created daily for stocks you follow."
                    : "Follow this stock to receive daily briefs with quick trading guidance."
                  }
                </p>
              ) : (
                <div className="space-y-4">
                  {dailyBriefs.map((brief: any) => {
                    const priceChange = parseFloat(brief.priceChange || 0);
                    const priceChangePercent = parseFloat(brief.priceChangePercent || 0);
                    const isPositive = priceChange >= 0;
                    const stance = brief.recommendedStance?.toLowerCase();
                    
                    const getStanceConfig = () => {
                      if (stance === "buy") {
                        return {
                          icon: ArrowUpCircle,
                          text: "Consider Buying",
                          color: "text-green-600 dark:text-green-400",
                          bgColor: "bg-green-50 dark:bg-green-950/20",
                          borderColor: "border-l-green-500",
                        };
                      } else if (stance === "sell") {
                        return {
                          icon: ArrowDownCircle,
                          text: "Consider Selling",
                          color: "text-red-600 dark:text-red-400",
                          bgColor: "bg-red-50 dark:bg-red-950/20",
                          borderColor: "border-l-red-500",
                        };
                      } else {
                        return {
                          icon: MinusCircle,
                          text: "Hold Position",
                          color: "text-muted-foreground",
                          bgColor: "bg-muted/30",
                          borderColor: "border-l-gray-400 dark:border-l-gray-600",
                        };
                      }
                    };
                    
                    const config = getStanceConfig();
                    const StanceIcon = config.icon;
                    
                    return (
                      <div 
                        key={brief.id} 
                        className={`border rounded-lg border-l-4 ${config.borderColor} overflow-hidden`}
                      >
                        {/* Action Banner */}
                        <div className={`${config.bgColor} px-4 py-3 border-b`}>
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <StanceIcon className={`h-6 w-6 ${config.color}`} />
                              <div>
                                <h3 className={`text-lg font-bold ${config.color}`} data-testid={`action-text-${brief.id}`}>
                                  {config.text}
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                  Confidence: {brief.confidence}/10
                                </p>
                              </div>
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
                        </div>

                        {/* Content */}
                        <div className="p-4 space-y-3">
                          {/* Date */}
                          <Badge variant="outline" data-testid={`badge-date-${brief.briefDate}`}>
                            {new Date(brief.briefDate).toLocaleDateString()}
                          </Badge>

                          {/* Brief text */}
                          <p className="text-sm text-muted-foreground" data-testid={`text-brief-${brief.id}`}>
                            {brief.briefText}
                          </p>

                          {/* Key highlights */}
                          {brief.keyHighlights && brief.keyHighlights.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium mb-1">Key Highlights</h4>
                              <ul className="list-disc list-inside space-y-1">
                                {brief.keyHighlights.map((highlight: string, idx: number) => (
                                  <li key={idx} className="text-sm text-muted-foreground">
                                    {highlight}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              </CardContent>
            </Card>
          </LoadingStrikeBorder>

          {/* Company Information */}
          {(stock.description || stock.industry || stock.country || stock.webUrl) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Company Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {stock.description && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">About</h4>
                    <p className="text-sm text-muted-foreground" data-testid="text-description">
                      {stock.description}
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {stock.industry && (
                    <div>
                      <p className="text-sm text-muted-foreground">Industry</p>
                      <p className="font-medium" data-testid="text-industry">{stock.industry}</p>
                    </div>
                  )}
                  {stock.country && (
                    <div>
                      <p className="text-sm text-muted-foreground">Country</p>
                      <p className="font-medium" data-testid="text-country">{stock.country}</p>
                    </div>
                  )}
                  {stock.ipo && (
                    <div>
                      <p className="text-sm text-muted-foreground">IPO Date</p>
                      <p className="font-medium" data-testid="text-ipo">{stock.ipo}</p>
                    </div>
                  )}
                </div>
                {stock.webUrl && (
                  <Button variant="outline" size="sm" asChild data-testid="button-website">
                    <a href={stock.webUrl} target="_blank" rel="noopener noreferrer">
                      <Globe className="h-4 w-4 mr-2" />
                      Visit Website
                      <ExternalLink className="h-3 w-3 ml-2" />
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* AI Analysis Tab */}
        <TabsContent value="analysis" className="space-y-4">
          {aiAnalysis ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUpIcon className="h-5 w-5" />
                  Complete AI Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {aiAnalysis.confidenceScore !== undefined && (
                  <div>
                    <Badge variant={aiAnalysis.confidenceScore > 70 ? "default" : "secondary"}>
                      Confidence Score: {aiAnalysis.confidenceScore}/100
                    </Badge>
                  </div>
                )}
                {aiAnalysis.summary && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Summary</h4>
                    <p className="text-sm text-muted-foreground">{aiAnalysis.summary}</p>
                  </div>
                )}
                {aiAnalysis.strengths && aiAnalysis.strengths.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Strengths</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {aiAnalysis.strengths.map((s: string, i: number) => (
                        <li key={i} className="text-sm text-muted-foreground">{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {aiAnalysis.weaknesses && aiAnalysis.weaknesses.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Weaknesses</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {aiAnalysis.weaknesses.map((w: string, i: number) => (
                        <li key={i} className="text-sm text-muted-foreground">{w}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {aiAnalysis.redFlags && aiAnalysis.redFlags.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2 text-red-600 dark:text-red-400">Red Flags</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {aiAnalysis.redFlags.map((r: string, i: number) => (
                        <li key={i} className="text-sm text-red-600 dark:text-red-400">{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">No AI analysis available yet</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* News Tab */}
        <TabsContent value="news" className="space-y-4">
          {newsItems.length > 0 ? (
            newsItems.map((item: any, index: number) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-start justify-between gap-4">
                    <span>{item.headline}</span>
                    <Button variant="ghost" size="sm" asChild>
                      <a href={item.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    <Newspaper className="h-4 w-4" />
                    {item.source}
                    <span>•</span>
                    <Calendar className="h-4 w-4" />
                    {new Date(item.datetime * 1000).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                {item.summary && (
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{item.summary}</p>
                  </CardContent>
                )}
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">No news available</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Insider Tab */}
        <TabsContent value="insider" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Insider Trade Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {stock.insiderPrice && (
                  <div>
                    <p className="text-sm text-muted-foreground">Insider Price</p>
                    <p className="text-lg font-mono font-medium" data-testid="text-insider-price">
                      ${parseFloat(stock.insiderPrice).toFixed(2)}
                    </p>
                  </div>
                )}
                {stock.insiderQuantity && (
                  <div>
                    <p className="text-sm text-muted-foreground">Shares</p>
                    <p className="text-lg font-medium" data-testid="text-insider-quantity">
                      {stock.insiderQuantity.toLocaleString()}
                    </p>
                  </div>
                )}
                {stock.insiderTradeDate && (
                  <div>
                    <p className="text-sm text-muted-foreground">Trade Date</p>
                    <p className="text-lg font-medium" data-testid="text-trade-date">
                      {stock.insiderTradeDate}
                    </p>
                  </div>
                )}
                {stock.marketPriceAtInsiderDate && (
                  <div>
                    <p className="text-sm text-muted-foreground">Market Price at Trade</p>
                    <p className="text-lg font-mono font-medium" data-testid="text-market-price-at-trade">
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
          {/* Interested Users */}
          {interests.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Team Members Interested ({interests.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {interests.map((interest) => {
                    if (!interest.user) return null;
                    return (
                      <div key={interest.id} className="flex items-center gap-2 bg-muted px-3 py-1 rounded-full">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {getInitials(interest.user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{interest.user.name}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

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
