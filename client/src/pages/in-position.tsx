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
  HelpCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useUser } from "@/contexts/UserContext";
import { Link, useLocation } from "wouter";
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

type SortField = "ticker" | "entry" | "current" | "qty" | "pnl" | "pnlPercent";
type SortDirection = "asc" | "desc";

export default function InPosition() {
  const { toast } = useToast();
  const { user } = useUser();
  const [, setLocation] = useLocation();
  const [tickerSearch, setTickerSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("pnl");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
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

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection(field === "ticker" ? "asc" : "desc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 ml-1" />;
    return sortDirection === "asc" ? 
      <ArrowUp className="h-4 w-4 ml-1" /> : 
      <ArrowDown className="h-4 w-4 ml-1" />;
  };

  const sortedHoldings = useMemo(() => {
    return [...filteredHoldings].sort((a, b) => {
      const pnlA = calculatePnL(a);
      const pnlB = calculatePnL(b);
      let compareA: any;
      let compareB: any;
      
      switch (sortField) {
        case "ticker":
          compareA = a.ticker;
          compareB = b.ticker;
          break;
        case "entry":
          compareA = parseFloat(a.averagePurchasePrice);
          compareB = parseFloat(b.averagePurchasePrice);
          break;
        case "current":
          compareA = pnlA.currentPrice;
          compareB = pnlB.currentPrice;
          break;
        case "qty":
          compareA = a.quantity;
          compareB = b.quantity;
          break;
        case "pnl":
          compareA = pnlA.pnl;
          compareB = pnlB.pnl;
          break;
        case "pnlPercent":
          compareA = pnlA.pnlPercent;
          compareB = pnlB.pnlPercent;
          break;
        default:
          return 0;
      }
      
      if (compareA < compareB) return sortDirection === "asc" ? -1 : 1;
      if (compareA > compareB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredHoldings, stockPrices, sortField, sortDirection]);

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
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header with inline search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold whitespace-nowrap" data-testid="text-page-title">
            In Position
          </h1>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6"
                tabIndex={0}
                aria-label="Learn how positions work"
                data-testid="button-help-positions"
              >
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-sm p-4 space-y-3 text-left">
              <p className="font-semibold text-sm">Active Positions</p>
              <div className="space-y-2 text-xs">
                <p><strong>Entry Price:</strong> Your average purchase price</p>
                <p><strong>Current Price:</strong> Live market price</p>
                <p><strong>P&L:</strong> Profit or loss on your position</p>
                <p><strong>Close:</strong> Close position and record P&L</p>
              </div>
            </TooltipContent>
          </Tooltip>
          <span className="text-sm text-muted-foreground ml-2" data-testid="text-positions-count">
            ({activeHoldings.length})
          </span>
          {activeHoldings.length > 0 && (
            <span className={cn(
              "text-sm font-medium flex items-center gap-0.5 ml-2",
              totalPnL >= 0 ? "text-success" : "text-destructive"
            )}>
              {totalPnL >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {totalPnL >= 0 ? "+" : ""}${totalPnL.toFixed(2)}
            </span>
          )}
        </div>
        
        {/* Compact inline search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={tickerSearch}
            onChange={(e) => setTickerSearch(e.target.value)}
            className="pl-8 h-8 w-32 text-sm"
            data-testid="input-search-positions"
          />
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
        <div className="rounded-md border max-h-[calc(100vh-16rem)] overflow-hidden flex flex-col">
          <div className="overflow-x-auto overflow-y-auto flex-1">
            <Table className="text-xs">
              <TableHeader className="sticky top-0 bg-background z-[1]">
                <TableRow>
                  <TableHead className="min-w-[60px] px-0.5 sm:px-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort("ticker")}
                      className="px-0.5 sm:px-1 h-7 text-[10px] sm:text-xs"
                      data-testid="sort-ticker"
                    >
                      Ticker
                      <SortIcon field="ticker" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right min-w-[55px] px-0.5 sm:px-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort("entry")}
                      className="px-0.5 sm:px-1 h-7 text-[10px] sm:text-xs"
                      data-testid="sort-entry"
                    >
                      Entry
                      <SortIcon field="entry" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right min-w-[55px] px-0.5 sm:px-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort("current")}
                      className="px-0.5 sm:px-1 h-7 text-[10px] sm:text-xs"
                      data-testid="sort-current"
                    >
                      <span className="hidden sm:inline">Current</span>
                      <span className="sm:hidden">Now</span>
                      <SortIcon field="current" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right hidden sm:table-cell min-w-[40px] px-0.5 sm:px-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort("qty")}
                      className="px-0.5 sm:px-1 h-7 text-[10px] sm:text-xs"
                      data-testid="sort-qty"
                    >
                      Qty
                      <SortIcon field="qty" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right min-w-[60px] px-0.5 sm:px-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort("pnl")}
                      className="px-0.5 sm:px-1 h-7 text-[10px] sm:text-xs"
                      data-testid="sort-pnl"
                    >
                      P&L
                      <SortIcon field="pnl" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right min-w-[55px] px-0.5 sm:px-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort("pnlPercent")}
                      className="px-0.5 sm:px-1 h-7 text-[10px] sm:text-xs"
                      data-testid="sort-pnl-percent"
                    >
                      <span className="hidden sm:inline">P&L %</span>
                      <span className="sm:hidden">%</span>
                      <SortIcon field="pnlPercent" />
                    </Button>
                  </TableHead>
                  <TableHead className="w-[70px] px-1 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedHoldings.map((holding) => {
                  const { pnl, pnlPercent, currentPrice } = calculatePnL(holding);
                  const entryPrice = parseFloat(holding.averagePurchasePrice);
                  const isPositive = pnl >= 0;

                  return (
                    <TableRow 
                      key={holding.id} 
                      className="cursor-pointer hover-elevate h-10" 
                      onClick={() => setLocation(`/ticker/${holding.ticker}?from=in-position`)}
                      data-testid={`row-position-${holding.ticker}`}
                    >
                      <TableCell className="font-medium font-mono py-1 px-0.5 sm:px-1 text-[11px] sm:text-xs">
                        <div className="flex items-center gap-0.5 sm:gap-1.5">
                          <Briefcase className="h-2.5 sm:h-3 w-2.5 sm:w-3 text-primary" />
                          <span>{holding.ticker}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground py-1 px-0.5 sm:px-1 text-[10px] sm:text-xs">
                        ${entryPrice.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono py-1 px-0.5 sm:px-1 text-[10px] sm:text-xs">
                        ${currentPrice.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono py-1 px-0.5 sm:px-1 text-[10px] sm:text-xs hidden sm:table-cell">
                        {holding.quantity}
                      </TableCell>
                      <TableCell className="text-right py-1 px-0.5 sm:px-1">
                        <span className={cn(
                          "font-mono font-medium text-[10px] sm:text-xs",
                          isPositive ? "text-success" : "text-destructive"
                        )}>
                          {isPositive ? "+" : ""}${pnl.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right py-1 px-0.5 sm:px-1">
                        <div className={cn(
                          "flex items-center justify-end gap-0.5 text-[10px] sm:text-xs",
                          isPositive ? "text-success" : "text-destructive"
                        )}>
                          {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          <span className="font-mono">
                            {isPositive ? "+" : ""}{pnlPercent.toFixed(1)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right py-1 px-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-6 px-2 text-[10px]"
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
