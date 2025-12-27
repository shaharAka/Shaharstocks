import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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

type FollowedStock = {
  ticker: string;
  currentPrice: string;
  priceChange?: string;
  priceChangePercent?: string;
  companyName?: string;
};

export default function InPosition() {
  const { toast } = useToast();
  const { user } = useUser();
  const [tickerSearch, setTickerSearch] = useState("");
  const [closeDialog, setCloseDialog] = useState<{ open: boolean; holding: PortfolioHolding | null }>({
    open: false,
    holding: null,
  });

  const { data: holdings = [], isLoading: holdingsLoading } = useQuery<PortfolioHolding[]>({
    queryKey: ["/api/portfolio/holdings"],
    enabled: !!user,
  });

  const { data: stockPrices = [] } = useQuery<FollowedStock[]>({
    queryKey: ["/api/followed-stocks-with-status"],
    enabled: !!user,
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
      setCloseDialog({ open: false, holding: null });
      toast({
        title: "Position Closed",
        description: "Your position has been closed and P&L recorded",
      });
    },
  });

  const activeHoldings = useMemo(() => {
    return holdings.filter(h => h.quantity > 0 && !h.isSimulated);
  }, [holdings]);

  const filteredHoldings = useMemo(() => {
    if (!tickerSearch.trim()) return activeHoldings;
    const search = tickerSearch.toUpperCase();
    return activeHoldings.filter(h => h.ticker.toUpperCase().includes(search));
  }, [activeHoldings, tickerSearch]);

  const getStockData = (ticker: string) => {
    return stockPrices.find(s => s.ticker.toUpperCase() === ticker.toUpperCase());
  };

  const calculatePnL = (holding: PortfolioHolding) => {
    const stockData = getStockData(holding.ticker);
    if (!stockData) return { pnl: 0, pnlPercent: 0, currentPrice: 0 };
    
    const currentPrice = parseFloat(stockData.currentPrice);
    const entryPrice = parseFloat(holding.averagePurchasePrice);
    const pnl = (currentPrice - entryPrice) * holding.quantity;
    const pnlPercent = ((currentPrice - entryPrice) / entryPrice) * 100;
    return { pnl, pnlPercent, currentPrice };
  };

  const totalPnL = useMemo(() => {
    return filteredHoldings.reduce((sum, h) => {
      const { pnl } = calculatePnL(h);
      return sum + pnl;
    }, 0);
  }, [filteredHoldings, stockPrices]);

  const handleClosePosition = (holding: PortfolioHolding) => {
    setCloseDialog({ open: true, holding });
  };

  const confirmClosePosition = () => {
    if (closeDialog.holding) {
      const { currentPrice } = calculatePnL(closeDialog.holding);
      closePositionMutation.mutate({
        holdingId: closeDialog.holding.id,
        closePrice: currentPrice,
      });
    }
  };

  if (holdingsLoading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-64" />
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
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
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Ticker</TableHead>
                <TableHead className="text-right w-[80px]">Entry</TableHead>
                <TableHead className="text-right w-[80px]">Current</TableHead>
                <TableHead className="text-right w-[60px]">Qty</TableHead>
                <TableHead className="text-right w-[100px]">P&L</TableHead>
                <TableHead className="text-right w-[80px]">P&L %</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredHoldings.map((holding) => {
                const { pnl, pnlPercent, currentPrice } = calculatePnL(holding);
                const entryPrice = parseFloat(holding.averagePurchasePrice);
                const isPositive = pnl >= 0;

                return (
                  <TableRow key={holding.id} className="hover-elevate" data-testid={`row-position-${holding.ticker}`}>
                    <TableCell className="font-mono font-medium">
                      <Link href={`/ticker/${holding.ticker}`} className="hover:underline flex items-center gap-1.5">
                        <Briefcase className="h-3 w-3 text-primary" />
                        {holding.ticker}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">
                      ${entryPrice.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      ${currentPrice.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {holding.quantity}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={cn(
                        "font-mono font-medium",
                        isPositive ? "text-success" : "text-destructive"
                      )}>
                        {isPositive ? "+" : ""}${pnl.toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className={cn(
                        "flex items-center justify-end gap-0.5",
                        isPositive ? "text-success" : "text-destructive"
                      )}>
                        {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        <span className="font-mono">
                          {isPositive ? "+" : ""}{pnlPercent.toFixed(1)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-7 px-3 text-xs"
                        onClick={() => handleClosePosition(holding)}
                        data-testid={`button-close-${holding.ticker}`}
                      >
                        Close
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={closeDialog.open} onOpenChange={(open) => setCloseDialog({ ...closeDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close Position</DialogTitle>
            <DialogDescription>
              {closeDialog.holding && (
                <>
                  Are you sure you want to close your position in <strong>{closeDialog.holding.ticker}</strong>?
                  {(() => {
                    const { pnl, pnlPercent } = calculatePnL(closeDialog.holding!);
                    return (
                      <span className={cn("ml-1", pnl >= 0 ? "text-success" : "text-destructive")}>
                        P&L: {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)} ({pnlPercent >= 0 ? "+" : ""}{pnlPercent.toFixed(1)}%)
                      </span>
                    );
                  })()}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCloseDialog({ open: false, holding: null })}
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
    </div>
  );
}
