import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { History as HistoryIcon, ArrowUpDown, Download } from "lucide-react";
import type { Trade } from "@shared/schema";
import { format } from "date-fns";

interface PortfolioHistoryProps {
  trades: Trade[];
  isLoading: boolean;
}

export function PortfolioHistory({ trades, isLoading }: PortfolioHistoryProps) {
  const [filterType, setFilterType] = useState<"all" | "buy" | "sell">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "completed" | "pending" | "failed">("all");

  const filteredTrades = trades?.filter((trade) => {
    const typeMatch = filterType === "all" || trade.type === filterType;
    const statusMatch = filterStatus === "all" || trade.status === filterStatus;
    return typeMatch && statusMatch;
  }) || [];

  const totalBuys = trades?.filter((t) => t.type === "buy").reduce((sum, t) => sum + parseFloat(t.total), 0) || 0;
  const totalSells = trades?.filter((t) => t.type === "sell").reduce((sum, t) => sum + parseFloat(t.total), 0) || 0;

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" => {
    if (status === "completed") return "default";
    if (status === "pending") return "secondary";
    return "destructive";
  };

  return (
    <>
      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Purchases
            </CardTitle>
            <ArrowUpDown className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-mono font-semibold text-success">
              ${totalBuys.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Buy orders executed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Sales
            </CardTitle>
            <ArrowUpDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-mono font-semibold text-destructive">
              ${totalSells.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Sell orders executed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <CardTitle>Transaction History</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={filterType} onValueChange={(v) => setFilterType(v as any)}>
                <SelectTrigger className="w-32" data-testid="select-filter-type">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="buy">Buy</SelectItem>
                  <SelectItem value="sell">Sell</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
                <SelectTrigger className="w-40" data-testid="select-filter-status">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" size="sm" data-testid="button-export">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!filteredTrades || filteredTrades.length === 0 ? (
            <div className="text-center py-12">
              <HistoryIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Trades Found</h3>
              <p className="text-sm text-muted-foreground">
                {trades && trades.length > 0 
                  ? "No trades match your current filters"
                  : "Start trading to see your transaction history"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTrades.map((trade) => (
                    <TableRow key={trade.id} data-testid={`row-trade-${trade.id}`}>
                      <TableCell className="text-sm">
                        {format(new Date(trade.executedAt), "MMM dd, yyyy HH:mm")}
                      </TableCell>
                      <TableCell className="font-medium">{trade.ticker}</TableCell>
                      <TableCell>
                        <Badge
                          variant={trade.type === "buy" ? "default" : "secondary"}
                          className="uppercase"
                        >
                          {trade.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {trade.quantity}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        ${parseFloat(trade.price).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        ${parseFloat(trade.total).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(trade.status)}>
                          {trade.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
