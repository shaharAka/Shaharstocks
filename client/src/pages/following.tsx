import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  TrendingUp,
  TrendingDown,
  Clock,
  MessageSquare,
  Star,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type Stock, type User, type StockInterestWithUser } from "@shared/schema";
import { useUser } from "@/contexts/UserContext";
import { StockTable } from "@/components/stock-table";
import { StockExplorer } from "@/components/stock-explorer";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MiniCandlestickChart } from "@/components/mini-candlestick-chart";

type StockWithUserStatus = Stock & {
  userStatus: string;
  isFollowing?: boolean;
  analysisJob?: {
    status: string;
    currentStep: string | null;
  } | null;
};

export default function Following() {
  const { toast } = useToast();
  const { user: currentUser } = useUser();
  const [explorerStock, setExplorerStock] = useState<StockWithUserStatus | null>(null);
  const [explorerOpen, setExplorerOpen] = useState(false);

  // Fetch followed stocks with enriched data
  const { data: followedStocks = [], isLoading: followedLoading } = useQuery<StockWithUserStatus[]>({
    queryKey: ["/api/users/me/followed"],
    enabled: !!currentUser,
    retry: false,
    meta: { ignoreError: true },
  });

  // Fetch all users
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: !!currentUser,
    retry: false,
    meta: { ignoreError: true },
  });

  // Fetch all stock interests
  const { data: allInterests = [] } = useQuery<StockInterestWithUser[]>({
    queryKey: ["/api/stock-interests"],
    enabled: !!currentUser,
    retry: false,
    meta: { ignoreError: true },
  });

  // Fetch comment counts
  const { data: commentCounts = [] } = useQuery<{ ticker: string; count: number }[]>({
    queryKey: ["/api/stock-comment-counts"],
    enabled: !!currentUser,
    retry: false,
    meta: { ignoreError: true },
  });

  // Fetch AI analyses
  const { data: analyses = [] } = useQuery<any[]>({
    queryKey: ["/api/stock-analyses"],
    enabled: !!currentUser,
    retry: false,
    meta: { ignoreError: true },
  });

  // Unfollow mutation
  const unfollowMutation = useMutation({
    mutationFn: async (ticker: string) => {
      return await apiRequest("DELETE", `/api/stocks/${ticker}/follow`, null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/me/followed"] });
      queryClient.invalidateQueries({ queryKey: ["/api/followed-stocks-with-prices"] });
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

  const getStockInterests = (ticker: string) => {
    return allInterests.filter((interest) => interest.ticker === ticker);
  };

  const getCommentCount = (ticker: string) => {
    return commentCounts.find(c => c.ticker === ticker)?.count || 0;
  };

  const getInitials = (name: string) => {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  if (followedLoading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold" data-testid="heading-following">
          Following
        </h1>
        <p className="text-muted-foreground" data-testid="text-description">
          Stocks you're tracking with daily AI analysis summaries
        </p>
      </div>

      {followedStocks.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Star className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-2">
              You're not following any stocks yet
            </p>
            <p className="text-sm text-muted-foreground">
              Follow stocks from the Opportunities page to track them here
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="summary" className="w-full">
          <TabsList>
            <TabsTrigger value="summary" data-testid="tab-summary">Summary</TabsTrigger>
            <TabsTrigger value="details" data-testid="tab-details">Details</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="mt-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {followedStocks.map((stock) => {
                const currentPrice = parseFloat(stock.currentPrice);
                const previousPrice = parseFloat(stock.previousClose || stock.currentPrice);
                const priceChange = currentPrice - previousPrice;
                const priceChangePercent = (priceChange / previousPrice) * 100;
                const isPositive = priceChange >= 0;

                const insiderPrice = stock.insiderPrice ? parseFloat(stock.insiderPrice) : currentPrice;
                const priceDiff = currentPrice - insiderPrice;
                const priceDiffPercent = insiderPrice > 0 ? (priceDiff / insiderPrice) * 100 : 0;
                const isProfitable = priceDiff >= 0;

                const stockInterests = getStockInterests(stock.ticker);
                const aiScore = (stock as any).integratedScore ?? (stock as any).aiScore ?? null;

                return (
                  <Card
                    key={stock.id}
                    className="hover-elevate cursor-pointer relative"
                    data-testid={`card-stock-${stock.ticker}`}
                    onClick={() => {
                      if (stock.userStatus) {
                        setExplorerStock(stock as StockWithUserStatus);
                        setExplorerOpen(true);
                      }
                    }}
                  >
                    <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <CardTitle className="text-lg font-semibold" data-testid={`text-ticker-${stock.ticker}`}>
                            {stock.ticker}
                          </CardTitle>
                          <Star className="h-3.5 w-3.5 text-primary fill-current" data-testid={`icon-following-${stock.ticker}`} />
                        </div>
                        <CardDescription className="text-xs line-clamp-1" data-testid={`text-company-${stock.ticker}`}>
                          {stock.companyName}
                        </CardDescription>
                      </div>
                      {stock.recommendation && (
                        <Badge
                          variant={stock.recommendation.toLowerCase().includes("buy") ? "default" : "destructive"}
                          className="text-xs shrink-0"
                          data-testid={`badge-recommendation-${stock.ticker}`}
                        >
                          {stock.recommendation.toLowerCase().includes("buy") ? "BUY" : "SELL"}
                        </Badge>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-3 pb-3">
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-mono font-semibold" data-testid={`text-price-${stock.ticker}`}>
                          ${currentPrice.toFixed(2)}
                        </span>
                        <div
                          className={`flex items-center gap-1 ${
                            isPositive ? "text-success" : "text-destructive"
                          }`}
                          data-testid={`text-change-${stock.ticker}`}
                        >
                          {isPositive ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : (
                            <TrendingDown className="h-3 w-3" />
                          )}
                          <span className="text-sm font-mono font-medium">
                            {isPositive ? "+" : ""}
                            {priceChangePercent.toFixed(2)}%
                          </span>
                        </div>
                      </div>

                      {stock.insiderPrice && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Insider @ ${parseFloat(stock.insiderPrice).toFixed(2)}</span>
                          <span className={`font-mono text-sm ${isProfitable ? "text-success" : "text-destructive"}`} data-testid={`text-price-diff-${stock.ticker}`}>
                            {isProfitable ? "+" : ""}{priceDiffPercent.toFixed(1)}%
                          </span>
                        </div>
                      )}

                      {stock.insiderTradeDate && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground" data-testid={`text-days-from-trade-${stock.ticker}`}>
                          <Clock className="h-3 w-3" />
                          <span>
                            {(() => {
                              const tradeDate = new Date(stock.insiderTradeDate);
                              const today = new Date();
                              const diffTime = Math.abs(today.getTime() - tradeDate.getTime());
                              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                              return `${diffDays} days from trade`;
                            })()}
                          </span>
                        </div>
                      )}

                      {stock.candlesticks && stock.candlesticks.length > 0 && (
                        <div className="-mx-2" data-testid={`chart-candlestick-${stock.ticker}`}>
                          <MiniCandlestickChart data={stock.candlesticks} height={50} />
                        </div>
                      )}

                      {stock.marketCap && (
                        <div className="text-xs text-muted-foreground" data-testid={`text-marketcap-${stock.ticker}`}>
                          {stock.marketCap} market cap
                        </div>
                      )}

                      {aiScore !== null && (
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">AI Score:</span>
                          <Badge
                            variant={aiScore >= 75 ? "default" : aiScore >= 50 ? "secondary" : "outline"}
                            data-testid={`badge-score-${stock.ticker}`}
                          >
                            {aiScore}
                          </Badge>
                        </div>
                      )}

                      {(stockInterests.length > 0 || getCommentCount(stock.ticker) > 0) && (
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex gap-1">
                            {stockInterests.map((interest) => (
                              <Avatar
                                key={interest.id}
                                className="h-6 w-6"
                                style={{ backgroundColor: interest.user.avatarColor }}
                                data-testid={`avatar-interest-${stock.ticker}-${interest.user.name.toLowerCase()}`}
                              >
                                <AvatarFallback
                                  className="text-white text-xs"
                                  style={{ backgroundColor: interest.user.avatarColor }}
                                >
                                  {getInitials(interest.user.name)}
                                </AvatarFallback>
                              </Avatar>
                            ))}
                          </div>
                          {getCommentCount(stock.ticker) > 0 && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <MessageSquare className="h-4 w-4" />
                              <span className="text-sm" data-testid={`text-comment-count-${stock.ticker}`}>
                                {getCommentCount(stock.ticker)}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="details" className="mt-6">
            <StockTable
              stocks={followedStocks}
              users={users}
              interests={allInterests}
              commentCounts={commentCounts}
              analyses={analyses}
              selectedTickers={new Set()}
              onToggleSelection={() => {}}
              onSelectAll={() => {}}
              viewedTickers={[]}
              onStockClick={(stock) => {
                const stockWithStatus = followedStocks.find(s => s.ticker === stock.ticker);
                if (stockWithStatus) {
                  setExplorerStock(stockWithStatus);
                  setExplorerOpen(true);
                }
              }}
            />
          </TabsContent>
        </Tabs>
      )}

      <StockExplorer
        stock={explorerStock}
        open={explorerOpen}
        onOpenChange={setExplorerOpen}
        onFollow={undefined}
        onReject={(stock) => unfollowMutation.mutate(stock.ticker)}
        users={users}
        interests={allInterests}
      />
    </div>
  );
}
