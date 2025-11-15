import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useState, useMemo } from "react";
import { MessageSquare, Users, TrendingUp, TrendingDown, Search } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Stock, User } from "@shared/schema";
import { StockExplorer } from "@/components/stock-explorer";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function CommunityDiscussion() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [explorerStock, setExplorerStock] = useState<Stock | null>(null);
  const [explorerOpen, setExplorerOpen] = useState(false);

  // Fetch all stocks
  const { data: stocks = [], isLoading: stocksLoading } = useQuery<Stock[]>({
    queryKey: ["/api/stocks/with-user-status"],
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

  // Follow stock mutation
  const followMutation = useMutation({
    mutationFn: async (ticker: string) => {
      return await apiRequest("POST", `/api/stocks/${ticker}/follow`, null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/me/followed"] });
      queryClient.invalidateQueries({ queryKey: ["/api/followed-stocks-with-prices"] });
      toast({
        title: "Stock Followed",
        description: "Day-0 AI analysis has been queued for this stock",
      });
      setExplorerOpen(false);
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

  // Reject stock mutation
  const rejectMutation = useMutation({
    mutationFn: async (ticker: string) => {
      return await apiRequest("POST", `/api/stocks/${ticker}/reject`, null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stocks/with-user-status"] });
      toast({
        title: "Opportunity Rejected",
        description: "This opportunity has been hidden",
      });
      setExplorerOpen(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reject opportunity",
        variant: "destructive",
      });
    },
  });

  // Helper functions
  const getCommentCount = (ticker: string) => {
    return commentCounts.find(c => c.ticker === ticker)?.count || 0;
  };

  const getInitials = (name: string) => {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  // Filter stocks that have comments
  const discussionStocks = useMemo(() => {
    const stocksWithActivity = stocks.filter(stock => {
      const hasComments = getCommentCount(stock.ticker) > 0;
      return hasComments;
    });

    // Apply search filter
    if (searchTerm.trim() === "") {
      return stocksWithActivity;
    }

    const search = searchTerm.toLowerCase();
    return stocksWithActivity.filter(stock => 
      stock.ticker.toLowerCase().includes(search) ||
      stock.companyName?.toLowerCase().includes(search)
    );
  }, [stocks, commentCounts, searchTerm]);

  // Sort by comment activity
  const sortedStocks = useMemo(() => {
    return [...discussionStocks].sort((a, b) => {
      const aActivity = getCommentCount(a.ticker);
      const bActivity = getCommentCount(b.ticker);
      return bActivity - aActivity;
    });
  }, [discussionStocks, commentCounts]);

  if (stocksLoading) {
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
              <CardContent>
                <Skeleton className="h-8 w-full" />
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
      <div className="flex items-center gap-3">
        <MessageSquare className="h-6 w-6 md:h-8 md:w-8 text-primary" />
        <div>
          <h1 className="text-xl md:text-2xl font-semibold mb-1" data-testid="heading-discussion">
            Discussion
          </h1>
          <p className="text-sm text-muted-foreground">
            Stocks with team comments
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by ticker or company..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
            data-testid="input-search"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="text-2xl font-bold" data-testid="text-total-discussions">
                  {sortedStocks.length}
                </div>
                <div className="text-xs text-muted-foreground">Active Discussions</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="text-2xl font-bold" data-testid="text-total-comments">
                  {commentCounts.reduce((sum, c) => sum + c.count, 0)}
                </div>
                <div className="text-xs text-muted-foreground">Total Comments</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Discussion List */}
      {sortedStocks.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground" data-testid="text-no-discussions">
              {searchTerm ? "No stocks match your search" : "No discussions yet. Start by adding comments on stocks."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sortedStocks.map((stock) => {
            const currentPrice = parseFloat(stock.currentPrice);
            const previousPrice = parseFloat(stock.previousClose || stock.currentPrice);
            const priceChange = currentPrice - previousPrice;
            const priceChangePercent = (priceChange / previousPrice) * 100;
            const isPositive = priceChange >= 0;
            const commentCount = getCommentCount(stock.ticker);

            return (
              <Card
                key={stock.id}
                className="hover-elevate cursor-pointer"
                onClick={() => {
                  setExplorerStock(stock);
                  setExplorerOpen(true);
                }}
                data-testid={`card-stock-${stock.ticker}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg mb-0.5" data-testid={`text-ticker-${stock.ticker}`}>
                        {stock.ticker}
                      </CardTitle>
                      <CardDescription className="text-xs line-clamp-1" data-testid={`text-company-${stock.ticker}`}>
                        {stock.companyName}
                      </CardDescription>
                    </div>
                    {stock.recommendation && (
                      <Badge
                        variant={stock.recommendation.toLowerCase().includes("buy") ? "default" : "destructive"}
                        className="text-xs shrink-0"
                      >
                        {stock.recommendation.toLowerCase().includes("buy") ? "BUY" : "SELL"}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Price */}
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-mono font-semibold" data-testid={`text-price-${stock.ticker}`}>
                      ${currentPrice.toFixed(2)}
                    </span>
                    <div
                      className={`flex items-center gap-1 ${
                        isPositive ? "text-success" : "text-destructive"
                      }`}
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

                  {/* Community Activity */}
                  {commentCount > 0 && (
                    <div className="flex items-center gap-2 pt-2 border-t">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <MessageSquare className="h-4 w-4" />
                        <span className="text-sm font-medium" data-testid={`text-comment-count-${stock.ticker}`}>
                          {commentCount} {commentCount === 1 ? 'comment' : 'comments'}
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <StockExplorer
        stock={explorerStock}
        open={explorerOpen}
        onOpenChange={setExplorerOpen}
        onFollow={(stock) => followMutation.mutate(stock.ticker)}
        onReject={(stock) => rejectMutation.mutate(stock.ticker)}
        users={users}
      />
    </div>
  );
}
