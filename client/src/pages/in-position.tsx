import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  ExternalLink,
  X,
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

type StockWithPrice = {
  ticker: string;
  currentPrice: string;
  previousClose?: string;
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

  const { data: holdings = [], isLoading } = useQuery<PortfolioHolding[]>({
    queryKey: ["/api/portfolio/holdings"],
    enabled: !!user,
  });

  const { data: stockPrices = [] } = useQuery<StockWithPrice[]>({
    queryKey: ["/api/followed-stocks-with-prices"],
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
    return activeHoldings.filter(h => h.ticker.includes(search));
  }, [activeHoldings, tickerSearch]);

  const getStockPrice = (ticker: string) => {
    const stock = stockPrices.find(s => s.ticker === ticker);
    return stock ? parseFloat(stock.currentPrice) : null;
  };

  const calculatePnL = (holding: PortfolioHolding) => {
    const currentPrice = getStockPrice(holding.ticker);
    if (!currentPrice) return { pnl: 0, pnlPercent: 0 };
    
    const entryPrice = parseFloat(holding.averagePurchasePrice);
    const pnl = (currentPrice - entryPrice) * holding.quantity;
    const pnlPercent = ((currentPrice - entryPrice) / entryPrice) * 100;
    return { pnl, pnlPercent };
  };

  const totalPnL = useMemo(() => {
    return filteredHoldings.reduce((sum, h) => {
      const { pnl } = calculatePnL(h);
      return sum + pnl;
    }, 0);
  }, [filteredHoldings, stockPrices]);

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">In Position</h1>
          <p className="text-muted-foreground text-sm">
            Active trades you've entered ({activeHoldings.length})
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className={cn(
            "text-lg font-mono font-bold",
            totalPnL >= 0 ? "text-success" : "text-destructive"
          )}>
            {totalPnL >= 0 ? '+' : ''}{totalPnL.toFixed(2)} P&L
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search ticker..."
              value={tickerSearch}
              onChange={(e) => setTickerSearch(e.target.value)}
              className="pl-8 w-48"
              data-testid="input-search-ticker"
            />
          </div>
        </div>
      </div>

      {filteredHoldings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No active positions</h3>
            <p className="text-muted-foreground mb-4">
              Enter positions from your Following list to start tracking P&L
            </p>
            <Link href="/following">
              <Button data-testid="button-browse-following">
                View Following <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Active Positions</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Ticker</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Entry Price</TableHead>
                  <TableHead className="text-right">Current Price</TableHead>
                  <TableHead className="text-right">P&L</TableHead>
                  <TableHead className="text-right">P&L %</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHoldings.map((holding) => {
                  const currentPrice = getStockPrice(holding.ticker);
                  const entryPrice = parseFloat(holding.averagePurchasePrice);
                  const { pnl, pnlPercent } = calculatePnL(holding);

                  return (
                    <TableRow 
                      key={holding.id} 
                      className="hover-elevate cursor-pointer"
                      onClick={() => window.location.href = `/ticker/${holding.ticker}`}
                      data-testid={`row-position-${holding.ticker}`}
                    >
                      <TableCell>
                        <span className="font-mono font-medium">{holding.ticker}</span>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {holding.quantity}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        ${entryPrice.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {currentPrice ? `$${currentPrice.toFixed(2)}` : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={cn(
                          "font-mono",
                          pnl >= 0 ? "text-success" : "text-destructive"
                        )}>
                          {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className={cn(
                          "flex items-center justify-end gap-1 font-mono",
                          pnlPercent >= 0 ? "text-success" : "text-destructive"
                        )}>
                          {pnlPercent >= 0 ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : (
                            <TrendingDown className="h-3 w-3" />
                          )}
                          {pnlPercent.toFixed(2)}%
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => setCloseDialog({ open: true, holding })}
                                data-testid={`button-close-position-${holding.ticker}`}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Close position</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Link href={`/ticker/${holding.ticker}`}>
                                <Button size="sm" variant="ghost" data-testid={`button-view-${holding.ticker}`}>
                                  <ExternalLink className="h-3 w-3" />
                                </Button>
                              </Link>
                            </TooltipTrigger>
                            <TooltipContent>View details</TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={closeDialog.open} onOpenChange={(open) => setCloseDialog({ open, holding: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close Position</DialogTitle>
            <DialogDescription>
              Are you sure you want to close your position in {closeDialog.holding?.ticker}?
            </DialogDescription>
          </DialogHeader>
          {closeDialog.holding && (
            <div className="py-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Quantity:</span>
                  <span className="ml-2 font-mono">{closeDialog.holding.quantity}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Entry:</span>
                  <span className="ml-2 font-mono">${parseFloat(closeDialog.holding.averagePurchasePrice).toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Current:</span>
                  <span className="ml-2 font-mono">
                    ${getStockPrice(closeDialog.holding.ticker)?.toFixed(2) || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">P&L:</span>
                  <span className={cn(
                    "ml-2 font-mono",
                    calculatePnL(closeDialog.holding).pnl >= 0 ? "text-success" : "text-destructive"
                  )}>
                    {calculatePnL(closeDialog.holding).pnl >= 0 ? '+' : ''}
                    ${calculatePnL(closeDialog.holding).pnl.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseDialog({ open: false, holding: null })}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => {
                if (closeDialog.holding) {
                  const closePrice = getStockPrice(closeDialog.holding.ticker) || parseFloat(closeDialog.holding.averagePurchasePrice);
                  closePositionMutation.mutate({
                    holdingId: closeDialog.holding.id,
                    closePrice,
                  });
                }
              }}
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
