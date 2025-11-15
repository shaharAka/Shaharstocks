import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowUpDown, ArrowUp, ArrowDown, ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown, Clock, Pin } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Stock, User, StockInterestWithUser } from "@shared/schema";
import { MiniCandlestickChart } from "@/components/mini-candlestick-chart";
import { AnalysisPhaseIndicator } from "@/components/analysis-phase-indicator";

interface StockTableProps {
  stocks: Stock[];
  users: User[];
  interests: StockInterestWithUser[];
  commentCounts: { ticker: string; count: number }[];
  analyses?: any[];
  selectedTickers?: Set<string>;
  simulatedTickers?: Set<string>;
  onToggleSelection?: (ticker: string) => void;
  onSelectAll?: (tickers: string[]) => void;
  onStockClick: (stock: Stock) => void;
  viewedTickers?: string[];
}

type SortField = "ticker" | "price" | "change" | "insiderPrice" | "marketCap" | "recommendation" | "aiScore" | "daysFromBuy";
type SortDirection = "asc" | "desc";

export function StockTable({ 
  stocks, 
  users, 
  interests, 
  commentCounts, 
  analyses = [], 
  selectedTickers = new Set(),
  simulatedTickers = new Set(),
  onToggleSelection,
  onSelectAll,
  onStockClick,
  viewedTickers = []
}: StockTableProps) {
  const [sortField, setSortField] = useState<SortField>("ticker");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  
  const allSelected = stocks.length > 0 && stocks.every(s => selectedTickers.has(s.ticker));
  const someSelected = stocks.some(s => selectedTickers.has(s.ticker)) && !allSelected;
  
  const handleSelectAll = () => {
    if (onSelectAll) {
      if (allSelected) {
        onSelectAll([]);
      } else {
        onSelectAll(stocks.map(s => s.ticker));
      }
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getAIAnalysis = (ticker: string) => {
    return analyses.find(a => a.ticker === ticker);
  };

  // Check if a stock was added recently (within last 48 hours) and not viewed by current user
  const isNewStock = (ticker: string, insiderTradeDate: string | null): boolean => {
    if (!insiderTradeDate) return false;
    
    // Check if current user has viewed this stock
    if (viewedTickers.includes(ticker)) return false;
    
    const tradeDate = new Date(insiderTradeDate);
    const now = new Date();
    const hoursSinceAdded = (now.getTime() - tradeDate.getTime()) / (1000 * 60 * 60);
    return hoursSinceAdded <= 48;
  };

  // Calculate days since insider purchased the stock
  const getDaysFromBuy = (insiderTradeDate: string | null): number => {
    if (!insiderTradeDate) return 0;
    const tradeDate = new Date(insiderTradeDate);
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - tradeDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff;
  };

  const sortedStocks = [...stocks].sort((a, b) => {
    let compareA: any;
    let compareB: any;

    switch (sortField) {
      case "ticker":
        compareA = a.ticker;
        compareB = b.ticker;
        break;
      case "price":
        compareA = parseFloat(a.currentPrice);
        compareB = parseFloat(b.currentPrice);
        break;
      case "change":
        const changeA = parseFloat(a.currentPrice) - parseFloat(a.previousClose || a.currentPrice);
        const changeB = parseFloat(b.currentPrice) - parseFloat(b.previousClose || b.currentPrice);
        compareA = changeA;
        compareB = changeB;
        break;
      case "insiderPrice":
        compareA = a.insiderPrice ? parseFloat(a.insiderPrice) : 0;
        compareB = b.insiderPrice ? parseFloat(b.insiderPrice) : 0;
        break;
      case "marketCap":
        const getMarketCapValue = (mcStr: string | null) => {
          if (!mcStr) return 0;
          // Match patterns like "$1.2M", "500M", "$1.5B", "2.3T"
          const match = mcStr.match(/\$?([\d.]+)\s*([KMBT])?/i);
          if (!match) return 0;
          
          const value = parseFloat(match[1]);
          const suffix = match[2]?.toUpperCase();
          
          // Convert to millions for consistent comparison
          switch (suffix) {
            case 'K': return value / 1000; // Thousands to millions
            case 'M': return value; // Already in millions
            case 'B': return value * 1000; // Billions to millions
            case 'T': return value * 1000000; // Trillions to millions
            default: return value; // No suffix, assume millions
          }
        };
        compareA = getMarketCapValue(a.marketCap);
        compareB = getMarketCapValue(b.marketCap);
        break;
      case "recommendation":
        compareA = a.recommendation || "";
        compareB = b.recommendation || "";
        break;
      case "aiScore":
        const analysisA = getAIAnalysis(a.ticker);
        const analysisB = getAIAnalysis(b.ticker);
        // Treat "analyzing" status as score 0 for sorting
        // Use integrated score (micro × macro) if available, fallback to confidence score, then financial health score
        const scoreA = analysisA?.integratedScore ?? analysisA?.confidenceScore ?? analysisA?.financialHealthScore;
        const scoreB = analysisB?.integratedScore ?? analysisB?.confidenceScore ?? analysisB?.financialHealthScore;
        compareA = (analysisA?.status === "analyzing" || !scoreA) ? 0 : scoreA;
        compareB = (analysisB?.status === "analyzing" || !scoreB) ? 0 : scoreB;
        break;
      case "daysFromBuy":
        compareA = getDaysFromBuy(a.insiderTradeDate);
        compareB = getDaysFromBuy(b.insiderTradeDate);
        break;
      default:
        compareA = a.ticker;
        compareB = b.ticker;
    }

    if (compareA < compareB) return sortDirection === "asc" ? -1 : 1;
    if (compareA > compareB) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 ml-1" />;
    return sortDirection === "asc" ? 
      <ArrowUp className="h-4 w-4 ml-1" /> : 
      <ArrowDown className="h-4 w-4 ml-1" />;
  };

  return (
    <div className="rounded-md border max-h-[calc(100vh-16rem)] overflow-hidden flex flex-col">
      <div className="overflow-x-auto overflow-y-auto flex-1">
        <Table className="text-sm">
          <TableHeader className="sticky top-0 bg-background z-[1]">
            <TableRow>
              <TableHead className="w-12">
                {onSelectAll && (
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all"
                    data-testid="checkbox-select-all"
                  />
                )}
              </TableHead>
              <TableHead className="min-w-[80px]">
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={() => handleSort("ticker")}
                  className="px-2"
                  data-testid="sort-ticker"
                >
                  Ticker
                  <SortIcon field="ticker" />
                </Button>
              </TableHead>
              <TableHead className="hidden md:table-cell min-w-[120px]">Company</TableHead>
              <TableHead className="hidden min-w-[70px]">
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={() => handleSort("recommendation")}
                  className="px-2"
                  data-testid="sort-recommendation"
                >
                  Rec.
                  <SortIcon field="recommendation" />
                </Button>
              </TableHead>
              <TableHead className="text-right min-w-[80px]">
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={() => handleSort("price")}
                  className="px-2"
                  data-testid="sort-price"
                >
                  Price
                  <SortIcon field="price" />
                </Button>
              </TableHead>
              <TableHead className="hidden lg:table-cell min-w-[120px]">Trend (2wk)</TableHead>
              <TableHead className="text-right min-w-[90px]">
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={() => handleSort("change")}
                  className="px-2"
                  data-testid="sort-change"
                >
                  Change
                  <SortIcon field="change" />
                </Button>
              </TableHead>
              <TableHead className="text-right hidden xl:table-cell w-[75px]">
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={() => handleSort("insiderPrice")}
                  className="px-1"
                  data-testid="sort-insider-price"
                >
                  Insider $
                  <SortIcon field="insiderPrice" />
                </Button>
              </TableHead>
              <TableHead className="hidden xl:table-cell w-[80px]">
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={() => handleSort("marketCap")}
                  className="px-1"
                  data-testid="sort-market-cap"
                >
                  Mkt Cap
                  <SortIcon field="marketCap" />
                </Button>
              </TableHead>
              <TableHead className="text-right hidden lg:table-cell w-[85px]">
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={() => handleSort("aiScore")}
                  className="px-1"
                  data-testid="sort-ai-score"
                >
                  AI Score
                  <SortIcon field="aiScore" />
                </Button>
              </TableHead>
              <TableHead className="hidden lg:table-cell min-w-[70px]">
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={() => handleSort("daysFromBuy")}
                  className="px-2"
                  data-testid="sort-days-from-buy"
                >
                  Days
                  <SortIcon field="daysFromBuy" />
                </Button>
              </TableHead>
            </TableRow>
            </TableHeader>
          <TableBody>
          {sortedStocks.map((stock) => {
            const currentPrice = parseFloat(stock.currentPrice);
            const previousPrice = parseFloat(stock.previousClose || stock.currentPrice);
            const priceChange = currentPrice - previousPrice;
            const priceChangePercent = (priceChange / previousPrice) * 100;
            const isPositive = priceChange >= 0;
            const insiderPrice = stock.insiderPrice ? parseFloat(stock.insiderPrice) : null;

            return (
              <TableRow
                key={stock.id}
                className="cursor-pointer hover-elevate h-12"
                onClick={() => onStockClick(stock)}
                data-testid={`row-stock-${stock.ticker}`}
              >
                <TableCell 
                  className="w-12 py-2" 
                  onClick={(e) => e.stopPropagation()}
                >
                  {onToggleSelection && (
                    <Checkbox
                      checked={selectedTickers.has(stock.ticker)}
                      onCheckedChange={() => onToggleSelection(stock.ticker)}
                      aria-label={`Select ${stock.ticker}`}
                      data-testid={`checkbox-${stock.ticker}`}
                    />
                  )}
                </TableCell>
                <TableCell className="font-medium font-mono py-2" data-testid={`cell-ticker-${stock.ticker}`}>
                  <div className="flex items-center gap-2">
                    {(stock as any).isPinned && (
                      <Pin className="h-3.5 w-3.5 text-primary fill-current" data-testid={`icon-pinned-${stock.ticker}`} />
                    )}
                    <span>{stock.ticker}</span>
                    {isNewStock(stock.ticker, stock.insiderTradeDate) && (
                      <Badge variant="default" className="text-xs px-1.5 py-0" data-testid={`badge-new-${stock.ticker}`}>
                        NEW
                      </Badge>
                    )}
                    {simulatedTickers.has(stock.ticker) && (
                      <Badge variant="outline" className="text-xs px-1.5 py-0 bg-accent/50" data-testid={`badge-simulated-${stock.ticker}`}>
                        SIMULATION
                      </Badge>
                    )}
                    {(stock as any).isStale && (
                      <Badge variant="secondary" className="text-xs px-1.5 py-0" data-testid={`badge-stale-${stock.ticker}`}>
                        {(stock as any).ageDays}d old
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell max-w-xs truncate text-xs text-muted-foreground py-2" data-testid={`cell-company-${stock.ticker}`}>
                  {stock.companyName}
                </TableCell>
                <TableCell className="hidden">
                  {stock.recommendation && (
                    <Badge
                      variant={stock.recommendation.toLowerCase().includes("buy") ? "default" : "destructive"}
                      className="text-xs"
                      data-testid={`badge-rec-${stock.ticker}`}
                    >
                      {stock.recommendation.toLowerCase().includes("buy") ? (
                        <ArrowUpRight className="h-3 w-3 mr-1" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3 mr-1" />
                      )}
                      {stock.recommendation.replace("_", " ").toUpperCase()}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right font-mono text-sm py-2" data-testid={`cell-price-${stock.ticker}`}>
                  ${currentPrice.toFixed(2)}
                </TableCell>
                <TableCell className="hidden lg:table-cell w-32 py-2" data-testid={`cell-chart-${stock.ticker}`}>
                  {stock.candlesticks && stock.candlesticks.length > 0 ? (
                    <div className="h-12">
                      <MiniCandlestickChart data={stock.candlesticks} height={48} />
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-right py-2">
                  <div className={`flex items-center justify-end gap-1 ${isPositive ? "text-success" : "text-destructive"}`}>
                    {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    <span className="text-xs font-mono font-medium">
                      {isPositive ? "+" : ""}{priceChangePercent.toFixed(2)}%
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono text-xs text-muted-foreground hidden xl:table-cell py-2">
                  {insiderPrice ? `$${insiderPrice.toFixed(2)}` : "-"}
                </TableCell>
                <TableCell className="text-right text-xs text-muted-foreground hidden xl:table-cell py-2">
                  {stock.marketCap || "-"}
                </TableCell>
                <TableCell className="text-right hidden lg:table-cell py-2" data-testid={`cell-ai-score-${stock.ticker}`}>
                  {(() => {
                    const analysis = getAIAnalysis(stock.ticker);
                    if (!analysis) return <span className="text-xs text-muted-foreground">-</span>;
                    
                    // Check if analysis is in progress
                    if (analysis.status === "pending" || analysis.status === "analyzing") {
                      return (
                        <div className="flex items-center gap-2 justify-end">
                          <Badge variant="outline" className="text-xs">
                            Analyzing...
                          </Badge>
                          <AnalysisPhaseIndicator
                            microCompleted={stock.microAnalysisCompleted}
                            macroCompleted={stock.macroAnalysisCompleted}
                            combinedCompleted={stock.combinedAnalysisCompleted}
                            currentPhase={(stock as any).analysisJob?.currentStep as "data_fetch" | "macro_analysis" | "micro_analysis" | "integration" | "complete" | null | undefined}
                            size="sm"
                          />
                        </div>
                      );
                    }
                    
                    // Show error state
                    if (analysis.status === "failed") {
                      return (
                        <Badge variant="destructive" className="text-xs">
                          Error
                        </Badge>
                      );
                    }
                    
                    // Use integrated score if available (micro × macro), otherwise use confidence score, fallback to financial health score
                    const score = analysis.integratedScore ?? analysis.confidenceScore ?? analysis.financialHealthScore;
                    const rating = analysis.overallRating;
                    let badgeVariant: "default" | "secondary" | "destructive" | "outline" = "secondary";
                    
                    if (rating === "buy" || rating === "strong_buy") badgeVariant = "default";
                    else if (rating === "avoid" || rating === "sell" || rating === "strong_avoid") badgeVariant = "destructive";
                    
                    return (
                      <div className="flex flex-col items-end gap-0.5">
                        <Badge variant={badgeVariant} className="text-xs font-mono">
                          {score}/100
                        </Badge>
                        {analysis.integratedScore && analysis.confidenceScore !== analysis.integratedScore && (
                          <span className="text-[10px] text-muted-foreground">
                            (micro: {analysis.confidenceScore})
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </TableCell>
                <TableCell className="hidden lg:table-cell py-2">
                  {stock.insiderTradeDate && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground" data-testid={`text-days-from-buy-${stock.ticker}`}>
                      <Clock className="h-3 w-3" />
                      <span>{getDaysFromBuy(stock.insiderTradeDate)}d</span>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      </div>
    </div>
  );
}
