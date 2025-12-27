import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  MessageSquare,
  TrendingUp,
  Search,
  ExternalLink,
  Users,
  Lightbulb,
} from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

type CommentCount = {
  ticker: string;
  count: number;
};

type StockWithComments = {
  ticker: string;
  companyName?: string;
  commentCount: number;
  currentPrice?: string;
  integratedScore?: number;
};

export default function Community() {
  const { user } = useUser();
  const [tickerSearch, setTickerSearch] = useState("");
  const [activeTab, setActiveTab] = useState("discussions");

  const { data: commentCounts = [], isLoading: isLoadingComments } = useQuery<CommentCount[]>({
    queryKey: ["/api/stock-comment-counts"],
    enabled: !!user,
  });

  const { data: stocks = [] } = useQuery<any[]>({
    queryKey: ["/api/stocks/with-user-status"],
    enabled: !!user,
  });

  const { data: analyses = [] } = useQuery<any[]>({
    queryKey: ["/api/stock-analyses"],
    enabled: !!user,
  });

  const stocksWithComments = useMemo((): StockWithComments[] => {
    return commentCounts
      .filter(cc => cc.count > 0)
      .map(cc => {
        const stock = stocks.find(s => s.ticker === cc.ticker);
        const analysis = analyses.find(a => a.ticker === cc.ticker);
        return {
          ticker: cc.ticker,
          companyName: stock?.companyName,
          commentCount: cc.count,
          currentPrice: stock?.currentPrice,
          integratedScore: analysis?.integratedScore,
        };
      })
      .sort((a, b) => b.commentCount - a.commentCount);
  }, [commentCounts, stocks, analyses]);

  const filteredStocks = useMemo(() => {
    if (!tickerSearch.trim()) return stocksWithComments;
    const search = tickerSearch.toUpperCase();
    return stocksWithComments.filter(s => 
      s.ticker.includes(search) || 
      s.companyName?.toUpperCase().includes(search)
    );
  }, [stocksWithComments, tickerSearch]);

  if (isLoadingComments) {
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
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Community</h1>
          <p className="text-muted-foreground text-sm">
            See what others are discussing and share insights
          </p>
        </div>
        <div className="flex items-center gap-2">
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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="discussions" data-testid="tab-discussions">
            <MessageSquare className="h-4 w-4 mr-2" />
            Top Discussed
          </TabsTrigger>
          <TabsTrigger value="suggestions" data-testid="tab-suggestions">
            <Lightbulb className="h-4 w-4 mr-2" />
            Feature Ideas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="discussions" className="mt-4">
          {filteredStocks.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No discussions yet</h3>
                <p className="text-muted-foreground mb-4">
                  Be the first to start a discussion on a stock
                </p>
                <Link href="/opportunities">
                  <Button data-testid="button-browse-stocks">
                    Browse Stocks
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Most Discussed Stocks
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">#</TableHead>
                      <TableHead className="w-24">Ticker</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-center">Signal</TableHead>
                      <TableHead className="text-center">Comments</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStocks.map((stock, index) => (
                      <TableRow 
                        key={stock.ticker} 
                        className="hover-elevate cursor-pointer"
                        onClick={() => window.location.href = `/ticker/${stock.ticker}?from=community`}
                        data-testid={`row-discussion-${stock.ticker}`}
                      >
                        <TableCell className="font-mono text-muted-foreground">
                          {index + 1}
                        </TableCell>
                        <TableCell>
                          <span className="font-mono font-medium">{stock.ticker}</span>
                        </TableCell>
                        <TableCell className="text-muted-foreground truncate max-w-32">
                          {stock.companyName || '-'}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {stock.currentPrice ? `$${parseFloat(stock.currentPrice).toFixed(2)}` : '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          {stock.integratedScore != null ? (
                            <Badge 
                              className={cn(
                                "font-mono",
                                stock.integratedScore >= 90 && "bg-amber-500 text-white",
                                stock.integratedScore >= 70 && stock.integratedScore < 90 && "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
                                stock.integratedScore >= 50 && stock.integratedScore < 70 && "bg-secondary",
                                stock.integratedScore < 50 && "bg-secondary text-muted-foreground"
                              )}
                            >
                              {stock.integratedScore}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className="font-mono">
                            <MessageSquare className="h-3 w-3 mr-1" />
                            {stock.commentCount}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <Link href={`/ticker/${stock.ticker}?from=community`}>
                            <Button size="sm" variant="ghost" data-testid={`button-view-${stock.ticker}`}>
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="suggestions" className="mt-4">
          <Card>
            <CardContent className="py-12 text-center">
              <Lightbulb className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Feature Suggestions</h3>
              <p className="text-muted-foreground mb-4">
                Share your ideas for improving signal2
              </p>
              <Link href="/community/feature-suggestions">
                <Button data-testid="button-view-suggestions">
                  View Suggestions
                </Button>
              </Link>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
