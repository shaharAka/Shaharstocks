import { useState } from "react";
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
  CheckCircle,
  XCircle,
  FlaskConical,
} from "lucide-react";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { StockComments } from "@/components/stock-comments";
import { StockAIAnalysis } from "@/components/stock-ai-analysis";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useUser } from "@/contexts/UserContext";
import type { Stock, User, StockInterestWithUser, StockCommentWithUser } from "@shared/schema";

interface StockExplorerProps {
  stock: Stock | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove?: (stock: Stock) => void;
  onReject?: (stock: Stock) => void;
  onSimulate?: (ticker: string) => void;
  users?: User[];
  interests?: StockInterestWithUser[];
}

export function StockExplorer({
  stock,
  open,
  onOpenChange,
  onApprove,
  onReject,
  onSimulate,
  users = [],
  interests = [],
}: StockExplorerProps) {
  const { toast } = useToast();
  const { user: currentUser } = useUser();

  const { data: comments = [] } = useQuery<StockCommentWithUser[]>({
    queryKey: ["/api/stocks", stock?.ticker, "comments"],
    queryFn: () => fetch(`/api/stocks/${stock?.ticker}/comments`).then(res => res.json()),
    enabled: !!stock?.ticker,
  });

  const toggleInterestMutation = useMutation({
    mutationFn: async ({ ticker, isMarked }: { ticker: string; isMarked: boolean }) => {
      if (isMarked) {
        const response = await fetch(`/api/stocks/${ticker}/interests`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        });
        if (!response.ok) throw new Error("Failed to remove interest");
      } else {
        const response = await fetch(`/api/stocks/${ticker}/interests`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        if (!response.ok) throw new Error("Failed to add interest");
        return await response.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stock-interests"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update interest status.",
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

  const getStockInterests = (ticker: string) => {
    return interests.filter(i => i.ticker === ticker);
  };

  const negativeKeywords = ["bankruptcy", "fraud", "investigation", "lawsuit", "downgrade", "loss", "scandal"];
  const hasNegativeNews = stock.news?.some(article => 
    negativeKeywords.some(keyword => article.headline.toLowerCase().includes(keyword))
  ) || false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto overflow-x-hidden" data-testid="dialog-stock-explorer">
        <DialogHeader className="pr-6">
          <DialogTitle className="text-2xl font-semibold break-words" data-testid={`text-explorer-title-${stock.ticker}`}>
            {stock.ticker} - {stock.companyName}
          </DialogTitle>
          {stock.source && (
            <div className="mt-1">
              <Badge variant="outline">
                Source: {stock.source}
              </Badge>
            </div>
          )}
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full min-w-0">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="news">News</TabsTrigger>
            <TabsTrigger value="ai">AI Analysis</TabsTrigger>
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
                      <p className="text-muted-foreground">Insider</p>
                      <p className="font-medium">{stock.insiderName || "N/A"}</p>
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

            {/* Interest Markers */}
            {currentUser && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Team Interest</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Interested Users Display */}
                  {getStockInterests(stock.ticker).length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Interested team members:</p>
                      <div className="flex gap-2 flex-wrap">
                        {getStockInterests(stock.ticker).map((interest) => (
                          <div key={interest.id} className="flex items-center gap-1.5 bg-muted px-2 py-1 rounded-md">
                            <Avatar className="h-5 w-5" style={{ backgroundColor: interest.user.avatarColor }}>
                              <AvatarFallback 
                                className="text-white text-xs" 
                                style={{ backgroundColor: interest.user.avatarColor }}
                              >
                                {getInitials(interest.user.name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{interest.user.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Current User's Interest Toggle */}
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Mark your interest:</p>
                    <Button
                      size="sm"
                      variant={getStockInterests(stock.ticker).some(i => i.userId === currentUser.id) ? "default" : "outline"}
                      onClick={() => toggleInterestMutation.mutate({ 
                        ticker: stock.ticker, 
                        isMarked: getStockInterests(stock.ticker).some(i => i.userId === currentUser.id)
                      })}
                      disabled={toggleInterestMutation.isPending}
                      data-testid={`button-explorer-interest-toggle`}
                    >
                      <Avatar className="h-5 w-5 mr-1.5" style={{ backgroundColor: currentUser.avatarColor }}>
                        <AvatarFallback 
                          className="text-white text-xs" 
                          style={{ backgroundColor: currentUser.avatarColor }}
                        >
                          {getInitials(currentUser.name)}
                        </AvatarFallback>
                      </Avatar>
                      {getStockInterests(stock.ticker).some(i => i.userId === currentUser.id) ? "Remove Interest" : "Mark as Interesting"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="default"
                className="flex-1"
                onClick={() => onApprove?.(stock)}
                data-testid={`button-explorer-approve-${stock.ticker}`}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </Button>
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => onSimulate?.(stock.ticker)}
                data-testid={`button-explorer-simulate-${stock.ticker}`}
              >
                <FlaskConical className="h-4 w-4 mr-2" />
                Simulate
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
    </Dialog>
  );
}
