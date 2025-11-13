import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Package, Edit, Settings, X } from "lucide-react";
import { Link } from "wouter";
import type { PortfolioHolding, Stock } from "@shared/schema";
import { stockSchema } from "@shared/schema";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { StockExplorer } from "@/components/stock-explorer";

interface PortfolioOverviewProps {
  holdings: PortfolioHolding[];
  stocks: Stock[];
  isLoading: boolean;
}

export function PortfolioOverview({ holdings, stocks, isLoading }: PortfolioOverviewProps) {
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [holdingToDelete, setHoldingToDelete] = useState<PortfolioHolding | null>(null);
  const [stockDetailsOpen, setStockDetailsOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [loadingTicker, setLoadingTicker] = useState<string | null>(null);

  const fetchStockMutation = useMutation({
    mutationFn: async (ticker: string) => {
      const stockData = await apiRequest("GET", `/api/stocks/${ticker}`, {});
      return stockSchema.parse(stockData);
    },
    onSuccess: (stock) => {
      // Update the stocks cache with the validated lazy-loaded stock
      queryClient.setQueryData<Stock[]>(["/api/stocks"], (oldData) => {
        if (!oldData) return [stock];
        const exists = oldData.some(s => s.ticker === stock.ticker);
        return exists ? oldData.map(s => s.ticker === stock.ticker ? stock : s) : [...oldData, stock];
      });
      
      setSelectedStock(stock);
      setStockDetailsOpen(true);
      setLoadingTicker(null);
    },
    onError: (error: Error, ticker) => {
      setLoadingTicker(null);
      toast({
        title: "Unable to load stock details",
        description: `Could not find data for ${ticker}. It may not be in our system yet.`,
        variant: "destructive",
      });
    },
  });

  const handleCardClick = (ticker: string, existingStock: Stock | undefined) => {
    if (loadingTicker === ticker) {
      return; // Prevent double-clicks
    }
    
    // Always source from validated cache first
    const cachedStocks = queryClient.getQueryData<Stock[]>(["/api/stocks"]);
    const cachedStock = cachedStocks?.find(s => s.ticker === ticker);
    
    if (cachedStock) {
      // Use validated cached version
      setSelectedStock(cachedStock);
      setStockDetailsOpen(true);
    } else if (existingStock) {
      // Fallback to prop but still open dialog
      setSelectedStock(existingStock);
      setStockDetailsOpen(true);
    } else {
      // Lazy load if no data available
      setLoadingTicker(ticker);
      fetchStockMutation.mutate(ticker);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: async (holdingId: string) => {
      await apiRequest("DELETE", `/api/portfolio/holdings/${holdingId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/holdings"] });
      toast({
        title: "Holding Removed",
        description: `${holdingToDelete?.ticker} has been removed from your portfolio.`,
      });
      setDeleteDialogOpen(false);
      setHoldingToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to remove holding. Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <>
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Your Holdings</h2>
          <Button variant="outline" size="sm" asChild data-testid="button-view-all-stocks">
            <Link href="/recommendations">View Recommendations</Link>
          </Button>
        </div>

        {!holdings || holdings.length === 0 ? (
          <Card className="p-12">
            <div className="text-center">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Holdings Yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Start building your portfolio by purchasing stocks
              </p>
              <Button asChild data-testid="button-browse-stocks">
                <Link href="/recommendations">Browse Stock Recommendations</Link>
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {holdings.map((holding) => {
              const stock = stocks?.find((s) => s.ticker === holding.ticker);
              const pl = parseFloat(holding.profitLoss || "0");
              const plPercent = parseFloat(holding.profitLossPercent || "0");
              const isPositivePL = pl >= 0;

              // Mock mini chart data
              const miniChartData = stock?.priceHistory?.slice(-7) || [];

              return (
                <Card 
                  key={holding.id} 
                  className={`hover-elevate cursor-pointer ${loadingTicker === holding.ticker ? 'opacity-50' : ''}`}
                  data-testid={`card-holding-${holding.ticker}`}
                  onClick={() => handleCardClick(holding.ticker, stock)}
                >
                  <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-3">
                    <div>
                      <CardTitle className="text-lg font-semibold">
                        {holding.ticker}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {stock?.companyName || "Loading..."}
                      </p>
                    </div>
                    <Badge
                      variant={isPositivePL ? "default" : "destructive"}
                      className="font-mono text-xs"
                    >
                      {isPositivePL ? "+" : ""}{plPercent.toFixed(2)}%
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-baseline justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">Current Price</p>
                        <p className="text-xl font-mono font-semibold">
                          ${stock?.currentPrice || "0.00"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Quantity</p>
                        <p className="text-xl font-mono font-semibold">
                          {holding.quantity}
                        </p>
                      </div>
                    </div>

                    {miniChartData.length > 0 && (
                      <div className="h-12">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={miniChartData}>
                            <Line
                              type="monotone"
                              dataKey="price"
                              stroke={isPositivePL ? "hsl(var(--success))" : "hsl(var(--destructive))"}
                              strokeWidth={2}
                              dot={false}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t">
                      <div>
                        <p className="text-xs text-muted-foreground">Value</p>
                        <p className="text-base font-mono font-medium">
                          ${parseFloat(holding.currentValue || "0").toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">P&L</p>
                        <p
                          className={`text-base font-mono font-medium ${
                            isPositivePL ? "text-success" : "text-destructive"
                          }`}
                        >
                          {isPositivePL ? "+" : ""}${Math.abs(pl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        asChild 
                        data-testid={`button-view-rules-${holding.ticker}`}
                      >
                        <Link href={`/trading?tab=rules&ticker=${holding.ticker}`}>
                          <Settings className="h-4 w-4 mr-1" />
                          Rules
                        </Link>
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setHoldingToDelete(holding);
                          setDeleteDialogOpen(true);
                        }}
                        data-testid={`button-remove-${holding.ticker}`}
                        title="Remove from watchlist"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from Watchlist?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{holdingToDelete?.ticker}</strong> from your watchlist? 
              You can always add it back later. Your trade history will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (holdingToDelete) {
                  deleteMutation.mutate(holdingToDelete.id);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <StockExplorer
        stock={selectedStock}
        open={stockDetailsOpen}
        onOpenChange={setStockDetailsOpen}
      />
    </>
  );
}
