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
import { AlertTriangle, TrendingUp } from "lucide-react";

interface InsiderTrade {
  ticker: string;
  companyName: string;
  tradeDate: string;
  price: number;
  quantity: number;
  value: number;
  insiderTitle?: string;
}

interface InsiderHistoryResponse {
  insiderName: string;
  count: number;
  trades: InsiderTrade[];
}

interface InsiderHistoryDialogProps {
  insiderName: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InsiderHistoryDialog({
  insiderName,
  open,
  onOpenChange,
}: InsiderHistoryDialogProps) {
  const { data, isLoading, error } = useQuery<InsiderHistoryResponse>({
    queryKey: [`/api/insider/history/${encodeURIComponent(insiderName || '')}`],
    enabled: open && !!insiderName,
  });

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
          {/* Summary Header */}
          {data && (
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
                    <TableHead>Company</TableHead>
                    <TableHead>Trade Date</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.trades.map((trade, index) => (
                    <TableRow key={`${trade.ticker}-${trade.tradeDate}-${index}`} data-testid={`row-trade-${index}`}>
                      <TableCell className="font-medium font-mono">{trade.ticker}</TableCell>
                      <TableCell className="max-w-[200px] truncate" title={trade.companyName}>
                        {trade.companyName}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{trade.tradeDate}</TableCell>
                      <TableCell className="text-right font-mono">
                        ${trade.price.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {trade.quantity.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        ${trade.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
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
