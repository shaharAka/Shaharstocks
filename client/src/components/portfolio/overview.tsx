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
import { Package, Trash2 } from "lucide-react";
import { Link } from "wouter";
import type { PortfolioHolding, Stock } from "@shared/schema";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface PortfolioOverviewProps {
  holdings: PortfolioHolding[];
  stocks: Stock[];
  isLoading: boolean;
}

export function PortfolioOverview({ holdings, stocks, isLoading }: PortfolioOverviewProps) {
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [holdingToDelete, setHoldingToDelete] = useState<PortfolioHolding | null>(null);

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
                <Card key={holding.id} className="hover-elevate" data-testid={`card-holding-${holding.ticker}`}>
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

                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" size="sm" className="flex-1" asChild data-testid={`button-buy-${holding.ticker}`}>
                        <Link href={`/recommendations?ticker=${holding.ticker}&action=buy`}>
                          Buy More
                        </Link>
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1" asChild data-testid={`button-sell-${holding.ticker}`}>
                        <Link href={`/recommendations?ticker=${holding.ticker}&action=sell`}>
                          Sell
                        </Link>
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
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
    </>
  );
}
