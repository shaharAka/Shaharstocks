import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, TrendingUp, TrendingDown, Minus, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface InsiderTrade {
  ticker: string;
  companyName: string;
  tradeDate: string;
  price: number;
  quantity: number;
  value: number;
  insiderTitle?: string;
  twoWeekPriceChange?: number;
  twoWeekPnL?: number;
  isProfitable?: boolean;
}

interface InsiderScore {
  insiderName: string;
  totalTrades: number;
  scoredTrades: number;
  profitableTrades: number;
  successRate: number;
  averageGain: number;
  totalPnL: number;
  isPartialData: boolean;
  unscoredCount: number;
}

interface InsiderHistoryResponse {
  insiderName: string;
  count: number;
  trades: InsiderTrade[];
  score: InsiderScore | null;
}

interface InsiderHistoryDialogProps {
  insiderName: string | null;
  ticker: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InsiderHistoryDialog({
  insiderName,
  ticker,
  open,
  onOpenChange,
}: InsiderHistoryDialogProps) {
  const { data, isLoading, error } = useQuery<InsiderHistoryResponse>({
    queryKey: [`/api/insider/history/${encodeURIComponent(insiderName || '')}`, ticker],
    queryFn: () => {
      const url = `/api/insider/history/${encodeURIComponent(insiderName || '')}${ticker ? `?ticker=${ticker}` : ''}`;
      return fetch(url, { credentials: 'include' }).then(res => {
        if (!res.ok) throw new Error('Failed to fetch insider trading history');
        return res.json();
      });
    },
    enabled: open && !!insiderName,
  });

  // Debug logging
  console.log('[InsiderHistory] Dialog state:', { insiderName, open, isLoading, hasError: !!error, hasData: !!data });
  if (error) {
    console.error('[InsiderHistory] Error:', error);
  }

  const totalValue = data?.trades.reduce((sum, trade) => sum + trade.value, 0) || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]" data-testid="dialog-insider-history">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <span>Trading History: {insiderName}</span>
          </DialogTitle>
          <DialogDescription>
            View historical purchase transactions for this insider
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Insider Score Card */}
          {data?.score && data.score.scoredTrades > 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Success Rate</p>
                    <p className="text-2xl font-semibold font-mono flex items-center gap-2">
                      {data.score.successRate.toFixed(1)}%
                      {data.score.successRate >= 60 ? (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      ) : data.score.successRate >= 40 ? (
                        <Minus className="h-4 w-4 text-yellow-500" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Avg. 2W Gain</p>
                    <p className={`text-2xl font-semibold font-mono ${data.score.averageGain >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}>
                      {data.score.averageGain >= 0 ? '+' : ''}{data.score.averageGain.toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Total P&L</p>
                    <p className={`text-2xl font-semibold font-mono ${data.score.totalPnL >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}>
                      {data.score.totalPnL >= 0 ? '+' : ''}${(data.score.totalPnL / 1000).toFixed(1)}k
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Scored Trades</p>
                    <p className="text-2xl font-semibold font-mono">
                      {data.score.scoredTrades}/{data.count}
                    </p>
                  </div>
                </div>
                {data.score.isPartialData && data.score.unscoredCount > 0 && (
                  <Alert className="mt-4">
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      {data.score.unscoredCount} trade{data.score.unscoredCount > 1 ? 's' : ''} couldn't be scored (too recent or data unavailable)
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

          {/* Summary Header - Show even without scores */}
          {data && !data.score?.scoredTrades && (
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Total Trades</p>
                    <p className="text-2xl font-semibold font-mono">{data.count}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Total Value</p>
                    <p className="text-2xl font-semibold font-mono">
                      ${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          )}

          {/* Error State */}
          {error && (
            <Alert variant="destructive" data-testid="alert-insider-history-error">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Failed to load insider trading history. Please try again later.
              </AlertDescription>
            </Alert>
          )}

          {/* Empty State */}
          {data && data.count === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <p>No recent trading history found for this insider.</p>
              </CardContent>
            </Card>
          )}

          {/* Trades Table */}
          {data && data.count > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticker</TableHead>
                    <TableHead className="hidden md:table-cell">Company</TableHead>
                    <TableHead>Trade Date</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">Quantity</TableHead>
                    <TableHead className="text-right hidden md:table-cell">Value</TableHead>
                    <TableHead className="text-right">2W Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.trades.map((trade, index) => (
                    <TableRow key={`${trade.ticker}-${trade.tradeDate}-${index}`} data-testid={`row-trade-${index}`}>
                      <TableCell className="font-medium font-mono">{trade.ticker}</TableCell>
                      <TableCell className="max-w-[200px] truncate hidden md:table-cell" title={trade.companyName}>
                        {trade.companyName}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{trade.tradeDate}</TableCell>
                      <TableCell className="text-right font-mono">
                        ${trade.price.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono hidden sm:table-cell">
                        {trade.quantity.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold hidden md:table-cell">
                        ${trade.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </TableCell>
                      <TableCell className="text-right">
                        {trade.twoWeekPriceChange !== undefined ? (
                          <Badge 
                            variant={trade.isProfitable ? "default" : "destructive"}
                            className="font-mono font-semibold"
                            data-testid={`badge-score-${index}`}
                          >
                            {trade.twoWeekPriceChange >= 0 ? '+' : ''}{trade.twoWeekPriceChange.toFixed(1)}%
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
