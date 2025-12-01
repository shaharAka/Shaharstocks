import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  Package,
  ArrowUpRight,
  ArrowDownRight,
  Trash2,
} from "lucide-react";
import { Link } from "wouter";
import type { PortfolioHolding, Stock } from "@shared/schema";
import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [holdingToDelete, setHoldingToDelete] = useState<PortfolioHolding | null>(null);

  const { data: holdings, isLoading: holdingsLoading } = useQuery<PortfolioHolding[]>({
    queryKey: ["/api/portfolio/holdings"],
  });

  const { data: stocks, isLoading: stocksLoading } = useQuery<Stock[]>({
    queryKey: ["/api/stocks"],
  });

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

  // Calculate portfolio metrics
  const portfolioValue = holdings?.reduce(
    (sum, h) => sum + (parseFloat(h.currentValue || "0")),
    0
  ) || 0;

  const totalProfitLoss = holdings?.reduce(
    (sum, h) => sum + (parseFloat(h.profitLoss || "0")),
    0
  ) || 0;

  const totalProfitLossPercent = portfolioValue > 0 
    ? ((totalProfitLoss / (portfolioValue - totalProfitLoss)) * 100) 
    : 0;

  const isPositive = totalProfitLoss >= 0;

  // Mock sparkline data for portfolio
  const portfolioSparkline = [
    { value: portfolioValue * 0.92 },
    { value: portfolioValue * 0.94 },
    { value: portfolioValue * 0.91 },
    { value: portfolioValue * 0.96 },
    { value: portfolioValue * 0.98 },
    { value: portfolioValue },
  ];

  if (holdingsLoading || stocksLoading) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32 mb-2" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-screen-2xl mx-auto">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold mb-1" data-testid="text-page-title">
            Portfolio Overview
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Track your investments and monitor market performance
          </p>
        </div>

      {/* Portfolio Summary Cards */}
      <div className="grid gap-3 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 p-3 sm:pb-2 sm:px-6 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Portfolio Value
            </CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground hidden sm:block" />
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <div className="text-lg sm:text-3xl font-mono font-semibold truncate" data-testid="text-portfolio-value">
              ${portfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="mt-2 sm:mt-3 h-8 sm:h-12">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={portfolioSparkline}>
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 p-3 sm:pb-2 sm:px-6 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Total P&L
            </CardTitle>
            {isPositive ? (
              <TrendingUp className="h-4 w-4 text-success hidden sm:block" />
            ) : (
              <TrendingDown className="h-4 w-4 text-destructive hidden sm:block" />
            )}
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <div
              className={`text-lg sm:text-3xl font-mono font-semibold truncate ${
                isPositive ? "text-success" : "text-destructive"
              }`}
              data-testid="text-total-pl"
            >
              {isPositive ? "+" : ""}${Math.abs(totalProfitLoss).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="flex items-center gap-1 mt-1">
              {isPositive ? (
                <ArrowUpRight className="h-3 w-3 text-success" />
              ) : (
                <ArrowDownRight className="h-3 w-3 text-destructive" />
              )}
              <span
                className={`text-xs sm:text-sm font-mono font-medium ${
                  isPositive ? "text-success" : "text-destructive"
                }`}
              >
                {isPositive ? "+" : ""}{totalProfitLossPercent.toFixed(2)}%
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 p-3 sm:pb-2 sm:px-6 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Holdings
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground hidden sm:block" />
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <div className="text-lg sm:text-3xl font-mono font-semibold" data-testid="text-holdings-count">
              {holdings?.length || 0}
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
              Active positions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 p-3 sm:pb-2 sm:px-6 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Available Cash
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground hidden sm:block" />
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <div className="text-lg sm:text-3xl font-mono font-semibold">
              $0.00
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
              Ready to invest
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Holdings Grid */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-3 sm:mb-4">
          <h2 className="text-lg sm:text-xl font-semibold">Your Holdings</h2>
          <Button variant="outline" size="sm" asChild data-testid="button-view-all-stocks">
            <Link href="/purchase">
              <span className="hidden sm:inline">View All Stocks</span>
              <span className="sm:hidden">View All</span>
            </Link>
          </Button>
        </div>

        {!holdings || holdings.length === 0 ? (
          <Card className="p-6 sm:p-12">
            <div className="text-center">
              <Package className="h-10 sm:h-12 w-10 sm:w-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
              <h3 className="text-base sm:text-lg font-medium mb-2">No Holdings Yet</h3>
              <p className="text-xs sm:text-sm text-muted-foreground mb-4">
                Start building your portfolio by purchasing stocks
              </p>
              <Button asChild data-testid="button-browse-stocks">
                <Link href="/purchase">Browse Available Stocks</Link>
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid gap-3 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {holdings.map((holding) => {
              const stock = stocks?.find((s) => s.ticker === holding.ticker);
              const pl = parseFloat(holding.profitLoss || "0");
              const plPercent = parseFloat(holding.profitLossPercent || "0");
              const isPositivePL = pl >= 0;

              // Mock mini chart data
              const miniChartData = stock?.priceHistory?.slice(-7) || [];

              return (
                <Card key={holding.id} className="hover-elevate" data-testid={`card-holding-${holding.ticker}`}>
                  <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 p-3 sm:p-6 pb-2 sm:pb-3">
                    <div className="min-w-0">
                      <CardTitle className="text-base sm:text-lg font-semibold">
                        {holding.ticker}
                      </CardTitle>
                      <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                        {stock?.companyName || "Loading..."}
                      </p>
                    </div>
                    <Badge
                      variant={isPositivePL ? "default" : "destructive"}
                      className="font-mono text-[10px] sm:text-xs flex-shrink-0"
                    >
                      {isPositivePL ? "+" : ""}{plPercent.toFixed(2)}%
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-2 sm:space-y-3 p-3 pt-0 sm:p-6 sm:pt-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Price</p>
                        <p className="text-base sm:text-xl font-mono font-semibold">
                          ${stock?.currentPrice || "0.00"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Qty</p>
                        <p className="text-base sm:text-xl font-mono font-semibold">
                          {holding.quantity}
                        </p>
                      </div>
                    </div>

                    {miniChartData.length > 0 && (
                      <div className="h-10 sm:h-12">
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

                    <div className="flex items-center justify-between pt-2 border-t gap-2">
                      <div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Value</p>
                        <p className="text-sm sm:text-base font-mono font-medium">
                          ${parseFloat(holding.currentValue || "0").toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] sm:text-xs text-muted-foreground">P&L</p>
                        <p
                          className={`text-sm sm:text-base font-mono font-medium ${
                            isPositivePL ? "text-success" : "text-destructive"
                          }`}
                        >
                          {isPositivePL ? "+" : ""}${Math.abs(pl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-1.5 sm:gap-2 pt-2">
                      <Button variant="outline" size="sm" className="flex-1 text-xs sm:text-sm px-2 sm:px-3" asChild data-testid={`button-buy-${holding.ticker}`}>
                        <Link href={`/purchase?ticker=${holding.ticker}&action=buy`}>
                          <span className="hidden sm:inline">Buy More</span>
                          <span className="sm:hidden">Buy</span>
                        </Link>
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1 text-xs sm:text-sm px-2 sm:px-3" asChild data-testid={`button-sell-${holding.ticker}`}>
                        <Link href={`/purchase?ticker=${holding.ticker}&action=sell`}>
                          Sell
                        </Link>
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => {
                          setHoldingToDelete(holding);
                          setDeleteDialogOpen(true);
                        }}
                        data-testid={`button-delete-${holding.ticker}`}
                      >
                        <Trash2 className="h-4 w-4" />
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
            <AlertDialogTitle>Remove Holding?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{holdingToDelete?.ticker}</strong> from your portfolio? 
              This will delete the holding record but won't affect your trade history.
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
      </div>
    </>
  );
}
