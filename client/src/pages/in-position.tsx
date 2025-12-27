import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  TrendingUp,
  TrendingDown,
  Search,
  ArrowRight,
  Briefcase,
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
};

type PortfolioHolding = {
  id: string;
  ticker: string;
  quantity: number;
  averagePurchasePrice: string;
  currentValue: string | null;
  profitLoss: string | null;
  profitLossPercent: string | null;
  isSimulated: boolean;
};

export default function InPosition() {
  const { toast } = useToast();
  const { user } = useUser();
  const [tickerSearch, setTickerSearch] = useState("");
  const [explorerStock, setExplorerStock] = useState<Stock | null>(null);
  const [explorerOpen, setExplorerOpen] = useState(false);
  const [closeDialog, setCloseDialog] = useState<{ open: boolean; ticker: string | null; holdingId: string | null }>({
    open: false,
    ticker: null,
    holdingId: null,
  });

  const { data: stocks = [], isLoading: stocksLoading } = useQuery<StockWithUserStatus[]>({
    queryKey: ["/api/stocks/with-user-status"],
    enabled: !!user,
  });

  const { data: holdings = [], isLoading: holdingsLoading } = useQuery<PortfolioHolding[]>({
    queryKey: ["/api/portfolio/holdings"],
    enabled: !!user,
  });

  const { data: analyses = [] } = useQuery<any[]>({
    queryKey: ["/api/stock-analyses"],
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

  const closePositionMutation = useMutation({
    mutationFn: async ({ holdingId, closePrice }: { holdingId: string; closePrice: number }) => {
      return await apiRequest("POST", `/api/portfolio/holdings/${holdingId}/close`, {
        closePrice,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/holdings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/positions/count"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/total-pnl"] });
      setCloseDialog({ open: false, ticker: null, holdingId: null });
      toast({
        title: "Position Closed",
        description: "Your position has been closed and P&L recorded",
      });
    },
  });

  const isLoading = stocksLoading || holdingsLoading;

  const activeHoldings = useMemo(() => {
    return holdings.filter(h => h.quantity > 0 && !h.isSimulated);
  }, [holdings]);

  const positionTickers = useMemo(() => {
    return new Set(activeHoldings.map(h => h.ticker));
  }, [activeHoldings]);

  const stocksInPosition = useMemo(() => {
    return stocks.filter(s => positionTickers.has(s.ticker));
  }, [stocks, positionTickers]);

  const filteredStocks = useMemo(() => {
    if (!tickerSearch.trim()) return stocksInPosition;
    const search = tickerSearch.toUpperCase();
    return stocksInPosition.filter(s => 
      s.ticker.includes(search) || 
      s.companyName?.toUpperCase().includes(search)
    );
  }, [stocksInPosition, tickerSearch]);

  const followedTickers = useMemo(() => {
    return stocks.filter(s => s.isFollowing).map(s => s.ticker);
  }, [stocks]);

  const holdingsData = useMemo(() => {
    return activeHoldings.map(h => ({
      ticker: h.ticker,
      quantity: h.quantity,
      averagePurchasePrice: h.averagePurchasePrice,
    }));
  }, [activeHoldings]);

  const getHoldingForTicker = (ticker: string) => {
    return activeHoldings.find(h => h.ticker === ticker);
  };

  const totalPnL = useMemo(() => {
    return activeHoldings.reduce((sum, h) => {
      const stock = stocks.find(s => s.ticker === h.ticker);
      if (!stock) return sum;
      const currentPrice = parseFloat(stock.currentPrice);
      const entryPrice = parseFloat(h.averagePurchasePrice);
      return sum + (currentPrice - entryPrice) * h.quantity;
    }, 0);
  }, [activeHoldings, stocks]);

  const handleClosePosition = (ticker: string) => {
    const holding = getHoldingForTicker(ticker);
    if (holding) {
      setCloseDialog({ open: true, ticker, holdingId: holding.id });
    }
  };

  const confirmClosePosition = () => {
    if (closeDialog.holdingId && closeDialog.ticker) {
      const stock = stocks.find(s => s.ticker === closeDialog.ticker);
      if (stock) {
        closePositionMutation.mutate({
          holdingId: closeDialog.holdingId,
          closePrice: parseFloat(stock.currentPrice),
        });
      }
    }
  };

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
          <Briefcase className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-semibold">In Position</h1>
          <Badge variant="secondary" className="ml-2">
            {activeHoldings.length}
          </Badge>
          {activeHoldings.length > 0 && (
            <Badge 
              variant={totalPnL >= 0 ? "default" : "destructive"} 
              className={cn("ml-2", totalPnL >= 0 ? "bg-success" : "")}
            >
              {totalPnL >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
              {totalPnL >= 0 ? "+" : ""}${totalPnL.toFixed(2)}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search positions..."
              value={tickerSearch}
              onChange={(e) => setTickerSearch(e.target.value)}
              className="pl-9"
              data-testid="input-search-positions"
            />
          </div>
        </div>
      </div>

      {activeHoldings.length === 0 ? (
        <Card className="bg-notebook-page">
          <CardContent className="p-8 text-center">
            <Briefcase className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No active positions</h3>
            <p className="text-muted-foreground mb-4">
              Enter positions from stocks you're following to start tracking your trades.
            </p>
            <Link href="/following">
              <Button data-testid="button-go-to-following">
                View Following
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
          onClosePosition={handleClosePosition}
          holdings={holdingsData}
          followedTickers={followedTickers}
          preserveOrder={false}
        />
      )}

      <Dialog open={closeDialog.open} onOpenChange={(open) => setCloseDialog({ ...closeDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close Position</DialogTitle>
            <DialogDescription>
              Are you sure you want to close your position in {closeDialog.ticker}? This will record your P&L.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCloseDialog({ open: false, ticker: null, holdingId: null })}
              data-testid="button-cancel-close"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmClosePosition}
              disabled={closePositionMutation.isPending}
              data-testid="button-confirm-close"
            >
              Close Position
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <StockExplorer
        stock={explorerStock}
        open={explorerOpen}
        onOpenChange={setExplorerOpen}
        users={users}
      />
    </div>
  );
}
