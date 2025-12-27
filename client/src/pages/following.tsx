import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Star,
  Search,
  ArrowRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useUser } from "@/contexts/UserContext";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { StockTable } from "@/components/stock-table";
import { StockExplorer } from "@/components/stock-explorer";
import type { Stock, User } from "@shared/schema";

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
  const { user } = useUser();
  const [tickerSearch, setTickerSearch] = useState("");
  const [explorerStock, setExplorerStock] = useState<Stock | null>(null);
  const [explorerOpen, setExplorerOpen] = useState(false);

  const { data: stocks = [], isLoading } = useQuery<StockWithUserStatus[]>({
    queryKey: ["/api/stocks/with-user-status"],
    enabled: !!user,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;
      const hasActiveJobs = data.some((stock) => 
        stock.analysisJob?.status === 'pending' || stock.analysisJob?.status === 'processing'
      );
      return hasActiveJobs ? 5000 : false;
    },
  });

  const { data: analyses = [] } = useQuery<any[]>({
    queryKey: ["/api/stock-analyses"],
    enabled: !!user,
  });

  const { data: holdings = [] } = useQuery<any[]>({
    queryKey: ["/api/portfolio/holdings"],
    enabled: !!user,
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    retry: false,
    meta: { ignoreError: true },
  });

  const { data: commentCounts = [] } = useQuery<{ ticker: string; count: number }[]>({
    queryKey: ["/api/stock-comment-counts"],
    retry: false,
    meta: { ignoreError: true },
  });

  const unfollowMutation = useMutation({
    mutationFn: async (ticker: string) => {
      return await apiRequest("DELETE", `/api/stocks/${ticker}/follow`, null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stocks/with-user-status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/followed-stocks/count"] });
      toast({
        title: "Stock Unfollowed",
        description: "Stock removed from your following list",
      });
    },
  });

  const enterPositionMutation = useMutation({
    mutationFn: async ({ ticker, price }: { ticker: string; price: number }) => {
      return await apiRequest("POST", "/api/portfolio/holdings", {
        ticker,
        quantity: 1,
        averagePurchasePrice: price.toString(),
        isSimulated: false,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/holdings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/positions/count"] });
      toast({
        title: "Position Entered",
        description: "Stock added to your positions",
      });
    },
  });

  const followedStocks = useMemo(() => {
    return stocks.filter(s => s.isFollowing);
  }, [stocks]);

  const filteredStocks = useMemo(() => {
    if (!tickerSearch.trim()) return followedStocks;
    const search = tickerSearch.toUpperCase();
    return followedStocks.filter(s => 
      s.ticker.includes(search) || 
      s.companyName?.toUpperCase().includes(search)
    );
  }, [followedStocks, tickerSearch]);

  const followedTickers = useMemo(() => {
    return followedStocks.map(s => s.ticker);
  }, [followedStocks]);

  const holdingsData = useMemo(() => {
    return holdings.map((h: any) => ({
      ticker: h.ticker,
      quantity: h.quantity,
      averagePurchasePrice: h.averagePurchasePrice,
    }));
  }, [holdings]);

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-64" />
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Star className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-semibold">Following</h1>
          <Badge variant="secondary" className="ml-2">
            {followedStocks.length}
          </Badge>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search stocks..."
              value={tickerSearch}
              onChange={(e) => setTickerSearch(e.target.value)}
              className="pl-9"
              data-testid="input-search-following"
            />
          </div>
        </div>
      </div>

      {followedStocks.length === 0 ? (
        <Card className="bg-notebook-page">
          <CardContent className="p-8 text-center">
            <Star className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No stocks followed yet</h3>
            <p className="text-muted-foreground mb-4">
              Start following stocks from the Opportunities page to track them here.
            </p>
            <Link href="/opportunities">
              <Button data-testid="button-go-to-opportunities">
                Browse Opportunities
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <StockTable
          stocks={filteredStocks}
          users={users}
          commentCounts={commentCounts}
          analyses={analyses}
          onStockClick={(stock) => {
            setExplorerStock(stock);
            setExplorerOpen(true);
          }}
          showActions={true}
          onUnfollow={(ticker) => unfollowMutation.mutate(ticker)}
          onEnterPosition={(ticker, price) => enterPositionMutation.mutate({ ticker, price })}
          holdings={holdingsData}
          followedTickers={followedTickers}
          preserveOrder={false}
        />
      )}

      <StockExplorer
        stock={explorerStock}
        open={explorerOpen}
        onOpenChange={setExplorerOpen}
        users={users}
      />
    </div>
  );
}
