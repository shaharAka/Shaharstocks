import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Star, TrendingUp, TrendingDown } from "lucide-react";
import { Link } from "wouter";
import type { Stock } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function TickerDetail() {
  const { ticker } = useParams<{ ticker: string }>();
  const { toast } = useToast();

  // Fetch stock details
  const { data: stock, isLoading: stockLoading } = useQuery<Stock>({
    queryKey: ["/api/stocks", ticker],
    enabled: !!ticker,
  });

  // Fetch daily summaries
  const { data: dailySummaries = [], isLoading: summariesLoading } = useQuery<any[]>({
    queryKey: ["/api/stocks", ticker, "daily-summaries"],
    enabled: !!ticker,
    retry: false,
    meta: { ignoreError: true },
  });

  // Unfollow mutation
  const unfollowMutation = useMutation({
    mutationFn: async () => {
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

  if (stockLoading) {
    return (
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!stock) {
    return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Stock not found</p>
            <Button asChild className="mt-4" data-testid="button-back">
              <Link href="/recommendations">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Opportunities
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentPrice = parseFloat(stock.currentPrice);
  const previousPrice = parseFloat(stock.previousClose || stock.currentPrice);
  const priceChange = currentPrice - previousPrice;
  const priceChangePercent = (priceChange / previousPrice) * 100;
  const isPositive = priceChange >= 0;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            asChild
            data-testid="button-back"
          >
            <Link href="/recommendations">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-mono" data-testid="heading-ticker">
              {stock.ticker}
            </h1>
            {stock.companyName && (
              <p className="text-sm text-muted-foreground" data-testid="text-company-name">
                {stock.companyName}
              </p>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => unfollowMutation.mutate()}
          disabled={unfollowMutation.isPending}
          data-testid="button-unfollow"
        >
          <Star className="h-4 w-4 mr-2 fill-current" />
          Unfollow
        </Button>
      </div>

      {/* Price Card */}
      <Card>
        <CardHeader>
          <CardTitle>Current Price</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-4">
            <span className="text-4xl font-bold font-mono" data-testid="text-current-price">
              ${currentPrice.toFixed(2)}
            </span>
            <div className={`flex items-center gap-1 ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {isPositive ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
              <span className="text-lg font-medium" data-testid="text-price-change">
                {isPositive ? '+' : ''}{priceChange.toFixed(2)} ({isPositive ? '+' : ''}{priceChangePercent.toFixed(2)}%)
              </span>
            </div>
          </div>
          {stock.marketCap && (
            <div className="mt-4">
              <span className="text-sm text-muted-foreground">Market Cap: </span>
              <span className="text-sm font-medium" data-testid="text-market-cap">{stock.marketCap}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Daily Summary Section */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Analysis Summary</CardTitle>
        </CardHeader>
        <CardContent>
          {summariesLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : dailySummaries.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Daily analysis summaries will appear here once generated. AI-powered micro and macro analysis runs daily for followed stocks.
            </p>
          ) : (
            <div className="space-y-4">
              {dailySummaries.map((summary: any) => (
                <div key={summary.id} className="border-l-4 border-l-primary pl-4 py-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" data-testid={`badge-date-${summary.summaryDate}`}>
                      {new Date(summary.summaryDate).toLocaleDateString()}
                    </Badge>
                    {summary.aiScore && (
                      <Badge variant={summary.aiScore > 7 ? "default" : "secondary"} data-testid={`badge-score-${summary.id}`}>
                        AI Score: {summary.aiScore}/10
                      </Badge>
                    )}
                  </div>
                  {summary.microAnalysis && (
                    <div className="mb-2">
                      <h4 className="text-sm font-medium mb-1">Micro Analysis</h4>
                      <p className="text-sm text-muted-foreground" data-testid={`text-micro-${summary.id}`}>
                        {summary.microAnalysis}
                      </p>
                    </div>
                  )}
                  {summary.macroAnalysis && (
                    <div>
                      <h4 className="text-sm font-medium mb-1">Macro Analysis</h4>
                      <p className="text-sm text-muted-foreground" data-testid={`text-macro-${summary.id}`}>
                        {summary.macroAnalysis}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Insider Trade Info */}
      {stock.insiderPrice && (
        <Card>
          <CardHeader>
            <CardTitle>Insider Trade Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Insider Price</p>
                <p className="text-lg font-mono font-medium" data-testid="text-insider-price">
                  ${parseFloat(stock.insiderPrice).toFixed(2)}
                </p>
              </div>
              {stock.insiderTradeDate && (
                <div>
                  <p className="text-sm text-muted-foreground">Trade Date</p>
                  <p className="text-lg font-medium" data-testid="text-trade-date">
                    {new Date(stock.insiderTradeDate).toLocaleDateString()}
                  </p>
                </div>
              )}
              {stock.insiderName && (
                <div>
                  <p className="text-sm text-muted-foreground">Insider Name</p>
                  <p className="text-lg font-medium" data-testid="text-insider-name">
                    {stock.insiderName}
                  </p>
                </div>
              )}
              {stock.insiderTitle && (
                <div>
                  <p className="text-sm text-muted-foreground">Insider Title</p>
                  <p className="text-lg font-medium" data-testid="text-insider-title">
                    {stock.insiderTitle}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
