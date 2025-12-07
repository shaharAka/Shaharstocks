import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  TrendingDown,
  Building2,
  Globe,
  Newspaper,
  ExternalLink,
  AlertTriangle,
  Calendar,
  DollarSign,
  Star,
  XCircle,
  Info,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { StockComments } from "@/components/stock-comments";
import { StockAIAnalysis } from "@/components/stock-ai-analysis";
import { InsiderHistoryDialog } from "@/components/insider-history-dialog";
import { CompactSignalBadge } from "@/components/compact-signal-badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useUser } from "@/contexts/UserContext";
import type { Stock, User, StockCommentWithUser } from "@shared/schema";

interface StockExplorerProps {
  stock: Stock | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFollow?: (stock: Stock) => void;
  onReject?: (stock: Stock) => void;
  users?: User[];
}

export function StockExplorer({
  stock,
  open,
  onOpenChange,
  onFollow,
  onReject,
  users = [],
}: StockExplorerProps) {
  const { toast } = useToast();
  const { user: currentUser } = useUser();
  const [insiderHistoryOpen, setInsiderHistoryOpen] = useState(false);
  const [selectedInsider, setSelectedInsider] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  
  // Track which ticker we've already marked as viewed in this dialog session
  const markedViewedRef = useRef<string | null>(null);

  // Mark stock as viewed when dialog opens
  const markViewedMutation = useMutation({
    mutationFn: async (ticker: string) => {
      const response = await apiRequest("POST", `/api/stocks/${ticker}/view`);
      return response;
    },
    onSuccess: () => {
      if (currentUser?.id) {
        queryClient.invalidateQueries({ queryKey: ["/api/stock-views", currentUser.id] });
      }
    },
  });

  // Reset to overview tab and mark as viewed when dialog opens for a new stock
  useEffect(() => {
    if (open && stock?.ticker) {
      setActiveTab("overview");
      
      // Mark as viewed only once per dialog open, and only if user is logged in
      if (currentUser?.id && markedViewedRef.current !== stock.ticker) {
        markedViewedRef.current = stock.ticker;
        markViewedMutation.mutate(stock.ticker);
      }
    }
    
    // Reset ref when dialog closes
    if (!open) {
      markedViewedRef.current = null;
    }
  }, [open, stock?.ticker, currentUser?.id]);

  const { data: comments = [] } = useQuery<StockCommentWithUser[]>({
    queryKey: ["/api/stocks", stock?.ticker, "comments"],
    queryFn: () => fetch(`/api/stocks/${stock?.ticker}/comments`).then(res => res.json()),
    enabled: !!stock?.ticker,
  });

  const { data: followedStocks = [] } = useQuery<any[]>({
    queryKey: ["/api/users/me/followed"],
    enabled: !!currentUser,
    retry: false,
    meta: { ignoreError: true },
  });

  const isFollowing = followedStocks.some(f => f.ticker === stock?.ticker);

  const followMutation = useMutation({
    mutationFn: async (ticker: string) => {
      const response = await fetch(`/api/stocks/${ticker}/follow`, {
        method: "POST",
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "Failed to follow stock");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/me/followed"] });
      queryClient.invalidateQueries({ queryKey: ["/api/followed-stocks-with-prices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/followed-stocks-with-status"] });
      toast({
        title: "Following",
        description: `Now following ${stock?.ticker}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to follow stock",
        variant: "destructive",
      });
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: async (ticker: string) => {
      const response = await fetch(`/api/stocks/${ticker}/follow`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to unfollow stock");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/me/followed"] });
      queryClient.invalidateQueries({ queryKey: ["/api/followed-stocks-with-prices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/followed-stocks-with-status"] });
      toast({
        title: "Success",
        description: `Unfollowed ${stock?.ticker}`,
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

  if (!stock) return null;

  const currentPrice = parseFloat(stock.currentPrice);
  const previousPrice = parseFloat(stock.previousClose || stock.currentPrice);
  const priceChange = currentPrice - previousPrice;
  const priceChangePercent = (priceChange / previousPrice) * 100;
  const isPositive = priceChange >= 0;

  const insiderPrice = stock.insiderPrice ? parseFloat(stock.insiderPrice) : currentPrice;
  const priceDiff = currentPrice - insiderPrice;
  const priceDiffPercent = insiderPrice > 0 ? (priceDiff / insiderPrice) * 100 : 0;

  const getInitials = (name: string) => {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const negativeKeywords = ["bankruptcy", "fraud", "investigation", "lawsuit", "downgrade", "loss", "scandal"];
  const hasNegativeNews = stock.news?.some(article => 
    negativeKeywords.some(keyword => article.headline.toLowerCase().includes(keyword))
  ) || false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto overflow-x-hidden" data-testid="dialog-stock-explorer">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold break-words" data-testid={`text-explorer-title-${stock.ticker}`}>
            {stock.ticker} - {stock.companyName}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full min-w-0">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="ai">AI Analysis</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="news">News</TabsTrigger>
            <TabsTrigger value="discussion">
              <span>Discussion</span>
              {comments.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 h-5 min-w-5 px-1.5">
                  {comments.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* AI Signal Score - Clickable to navigate to AI Analysis tab */}
            <Card 
              className="cursor-pointer hover-elevate active-elevate-2 transition-all"
              onClick={() => setActiveTab("ai")}
              data-testid="card-ai-signal"
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">AI Signal</CardTitle>
                  <span className="text-xs text-muted-foreground">View details →</span>
                </div>
              </CardHeader>
              <CardContent>
                <CompactSignalBadge ticker={stock.ticker} showEmptyState={true} />
              </CardContent>
            </Card>

            {/* Company Summary */}
            {(stock.description || stock.industry || stock.marketCap || stock.country) && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">About the Company</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {stock.description && (
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {stock.description}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    {stock.industry && (
                      <div className="flex items-center gap-1.5">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span>{stock.industry}</span>
                      </div>
                    )}
                    {stock.marketCap && (
                      <div className="flex items-center gap-1.5">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span>{stock.marketCap}</span>
                      </div>
                    )}
                    {stock.country && (
                      <div className="flex items-center gap-1.5">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <span>{stock.country}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Price Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Price Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-mono font-semibold">${currentPrice.toFixed(2)}</span>
                  <div className={`flex items-center gap-1 ${isPositive ? "text-success" : "text-destructive"}`}>
                    {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                    <span className="text-sm font-medium">
                      {isPositive ? "+" : ""}{priceChange.toFixed(2)} ({priceChangePercent.toFixed(2)}%)
                    </span>
                  </div>
                </div>

                {stock.priceHistory && stock.priceHistory.length > 0 && (
                  <div className="h-20 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={stock.priceHistory}>
                        <Line
                          type="monotone"
                          dataKey="price"
                          stroke={isPositive ? "hsl(var(--success))" : "hsl(var(--destructive))"}
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Insider Transaction */}
            {stock.insiderPrice && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Insider Transaction</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="flex items-center gap-1">
                        <p className="text-muted-foreground">Insider</p>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button 
                              type="button" 
                              className="inline-flex items-center justify-center focus:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-sm"
                              aria-label="Insider info"
                              data-testid="button-insider-info"
                            >
                              <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Click the name to see their trading history</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      {stock.insiderName ? (
                        <Button
                          variant="ghost"
                          className="h-auto p-0 font-medium text-primary hover:underline justify-start"
                          onClick={() => {
                            setSelectedInsider(stock.insiderName);
                            setInsiderHistoryOpen(true);
                          }}
                          data-testid="button-insider-name"
                        >
                          {stock.insiderName}
                        </Button>
                      ) : (
                        <p className="font-medium">N/A</p>
                      )}
                    </div>
                    <div>
                      <p className="text-muted-foreground">Title</p>
                      <p className="font-medium">{stock.insiderTitle || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Purchase Price</p>
                      <p className="font-mono font-medium">${insiderPrice.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Quantity</p>
                      <p className="font-mono font-medium">{stock.insiderQuantity?.toLocaleString() || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Trade Date</p>
                      <p className="font-medium">{stock.insiderTradeDate || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Current vs Insider</p>
                      <div className={`flex items-center gap-1 ${priceDiff >= 0 ? "text-success" : "text-destructive"}`}>
                        {priceDiff >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        <span className="font-mono text-sm font-medium">
                          {priceDiff >= 0 ? "+" : ""}{priceDiffPercent.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant={isFollowing ? "outline" : "default"}
                className="flex-1"
                onClick={() => {
                  if (isFollowing) {
                    unfollowMutation.mutate(stock.ticker);
                  } else {
                    followMutation.mutate(stock.ticker);
                  }
                }}
                disabled={followMutation.isPending || unfollowMutation.isPending}
                data-testid={`button-explorer-follow-${stock.ticker}`}
              >
                <Star className={`h-4 w-4 mr-2 ${isFollowing ? "fill-current" : ""}`} />
                {followMutation.isPending ? "Following..." : unfollowMutation.isPending ? "Unfollowing..." : isFollowing ? "Unfollow" : "Follow"}
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => onReject?.(stock)}
                data-testid={`button-explorer-reject-${stock.ticker}`}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="details" className="space-y-4">
            {/* Company Info */}
            {(stock.description || stock.industry || stock.country) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Company Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {stock.description && (
                    <p className="text-sm text-muted-foreground">{stock.description}</p>
                  )}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {stock.industry && (
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span>{stock.industry}</span>
                      </div>
                    )}
                    {stock.country && (
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <span>{stock.country}</span>
                      </div>
                    )}
                    {stock.ipo && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>IPO: {stock.ipo}</span>
                      </div>
                    )}
                    {stock.marketCap && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span>{stock.marketCap}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="news" className="space-y-4">
            {stock.news && stock.news.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Newspaper className="h-5 w-5" />
                    Latest News
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {hasNegativeNews && stock.recommendation === "buy" && (
                    <div className="mb-3 rounded-md bg-destructive/10 border border-destructive/20 p-3">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                        <p className="text-xs text-destructive-foreground">
                          <span className="font-semibold">Warning:</span> Negative news detected. Review carefully before purchasing.
                        </p>
                      </div>
                    </div>
                  )}
                  {stock.news.map((article, idx) => {
                    const isNegative = negativeKeywords.some(keyword => 
                      article.headline.toLowerCase().includes(keyword)
                    );
                    return (
                      <a
                        key={idx}
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block rounded-md bg-muted/50 p-3 hover-elevate"
                        data-testid={`link-explorer-news-${idx}`}
                      >
                        <div className="flex items-start gap-2">
                          {isNegative && (
                            <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium mb-1 ${isNegative ? 'text-destructive' : ''}`}>
                              {article.headline}
                            </p>
                            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{article.summary}</p>
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>{article.source}</span>
                              <span>{new Date(article.datetime * 1000).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                        </div>
                      </a>
                    );
                  })}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="ai" className="w-full max-w-full min-w-0 overflow-hidden">
            <div className="w-full max-w-full min-w-0">
              <StockAIAnalysis ticker={stock.ticker} />
            </div>
          </TabsContent>

          <TabsContent value="discussion">
            <StockComments ticker={stock.ticker} />
          </TabsContent>
        </Tabs>
      </DialogContent>

      {/* Insider History Dialog */}
      <InsiderHistoryDialog
        insiderName={selectedInsider}
        ticker={stock?.ticker || null}
        open={insiderHistoryOpen}
        onOpenChange={setInsiderHistoryOpen}
      />
    </Dialog>
  );
}
