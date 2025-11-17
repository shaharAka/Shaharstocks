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
import { ArrowUpDown, ArrowUp, ArrowDown, ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown, Clock, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Stock, User } from "@shared/schema";
import { CandlestickChartCell } from "@/components/candlestick-chart-cell";
import { AnalysisPhaseIndicator } from "@/components/analysis-phase-indicator";
import { cn } from "@/lib/utils";

interface StockTableProps {
  stocks: Stock[];
  users: User[];
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

  // Generate contextual signal tooltip based on score and recommendation type
  const getSignalTooltip = (score: number, recommendation: string): string => {
    const isBuy = recommendation.toLowerCase().includes("buy");
    const action = isBuy ? "BUY" : "SELL";
    
    if (score >= 90) {
      return `Very Strong ${action} Opportunity`;
    } else if (score >= 70) {
      return `Strong ${action} Opportunity`;
    } else if (score >= 40) {
      return `Neutral ${action} Signal`;
    } else {
      return `Weak ${action} Signal`;
    }
  };

  return (
    <div className="rounded-md border max-h-[calc(100vh-16rem)] overflow-hidden flex flex-col">
      <div className="overflow-x-auto overflow-y-auto flex-1">
        <Table className="text-xs">
          <TableHeader className="sticky top-0 bg-background z-[1]">
            <TableRow>
              <TableHead className="w-8 px-1">
                {onSelectAll && (
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all"
                    data-testid="checkbox-select-all"
                  />
                )}
              </TableHead>
              <TableHead className="min-w-[60px] px-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort("ticker")}
                  className="px-1 h-7"
                  data-testid="sort-ticker"
                >
                  Ticker
                  <SortIcon field="ticker" />
                </Button>
              </TableHead>
              <TableHead className="hidden md:table-cell min-w-[100px] px-1">Company</TableHead>
              <TableHead className="text-right hidden lg:table-cell w-[70px] px-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort("aiScore")}
                      className="px-1 h-7"
                      data-testid="sort-ai-score"
                    >
                      Signal
                      <SortIcon field="aiScore" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-xs">
                    <div className="space-y-1">
                      <p className="font-semibold">Signal Strength (0-100)</p>
                      <p className="text-muted-foreground">
                        How strongly the fundamentals and analysis support the insider action
                      </p>
                      <p className="text-muted-foreground text-[10px] mt-1">
                        100 = very strong signal | 0 = weak/contradictory signal
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TableHead>
              <TableHead className="min-w-[55px] px-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort("recommendation")}
                  className="px-1 h-7"
                  data-testid="sort-recommendation"
                >
                  Type
                  <SortIcon field="recommendation" />
                </Button>
              </TableHead>
              <TableHead className="text-right min-w-[65px] px-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort("price")}
                  className="px-1 h-7"
                  data-testid="sort-price"
                >
                  Price
                  <SortIcon field="price" />
                </Button>
              </TableHead>
              <TableHead className="hidden lg:table-cell min-w-[100px] px-1">Trend</TableHead>
              <TableHead className="text-right min-w-[70px] px-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort("change")}
                  className="px-1 h-7"
                  data-testid="sort-change"
                >
                  Chg %
                  <SortIcon field="change" />
                </Button>
              </TableHead>
              <TableHead className="text-right hidden xl:table-cell w-[60px] px-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort("insiderPrice")}
                  className="px-1 h-7"
                  data-testid="sort-insider-price"
                >
                  Ins $
                  <SortIcon field="insiderPrice" />
                </Button>
              </TableHead>
              <TableHead className="hidden xl:table-cell w-[65px] px-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort("marketCap")}
                  className="px-1 h-7"
                  data-testid="sort-market-cap"
                >
                  Mkt Cap
                  <SortIcon field="marketCap" />
                </Button>
              </TableHead>
              <TableHead className="hidden lg:table-cell min-w-[55px] px-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort("daysFromBuy")}
                  className="px-1 h-7"
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
                className="cursor-pointer hover-elevate h-10"
                onClick={() => onStockClick(stock)}
                data-testid={`row-stock-${stock.ticker}`}
              >
                <TableCell 
                  className="w-8 py-1 px-1" 
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
                <TableCell className="font-medium font-mono py-1 px-1" data-testid={`cell-ticker-${stock.ticker}`}>
                  <div className="flex items-center gap-1.5">
                    {(stock as any).isFollowing && (
                      <Star className="h-3 w-3 text-primary fill-current" data-testid={`icon-following-${stock.ticker}`} />
                    )}
                    <span>{stock.ticker}</span>
                    {isNewStock(stock.ticker, stock.insiderTradeDate) && (
                      <Badge variant="default" className="text-[10px] px-1 py-0" data-testid={`badge-new-${stock.ticker}`}>
                        NEW
                      </Badge>
                    )}
                    {simulatedTickers.has(stock.ticker) && (
                      <Badge variant="outline" className="text-[10px] px-1 py-0 bg-accent/50" data-testid={`badge-simulated-${stock.ticker}`}>
                        SIM
                      </Badge>
                    )}
                    {(stock as any).isStale && (
                      <Badge variant="secondary" className="text-[10px] px-1 py-0" data-testid={`badge-stale-${stock.ticker}`}>
                        {(stock as any).ageDays}d
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell max-w-xs truncate text-muted-foreground py-1 px-1" data-testid={`cell-company-${stock.ticker}`}>
                  {stock.companyName}
                </TableCell>
                <TableCell className="text-right hidden lg:table-cell py-1 px-1" data-testid={`cell-ai-score-${stock.ticker}`}>
                  {(() => {
                    const analysis = getAIAnalysis(stock.ticker);
                    if (!analysis) return <span className="text-xs text-muted-foreground">-</span>;
                    
                    // Check if analysis is in progress
                    if (analysis.status === "pending" || analysis.status === "analyzing" || analysis.status === "processing") {
                      return (
                        <div className="flex items-center gap-2 justify-end">
                          <Badge variant="outline" className="text-xs">
                            Analyzing...
                          </Badge>
                          <AnalysisPhaseIndicator
                            microCompleted={stock.microAnalysisCompleted}
                            macroCompleted={stock.macroAnalysisCompleted}
                            combinedCompleted={stock.combinedAnalysisCompleted}
                            currentPhase={(stock as any).analysisJob?.currentStep as "data_fetch" | "macro_analysis" | "micro_analysis" | "integration" | "calculating_score" | "complete" | null | undefined}
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
                    
                    // Signal strength gradient in amber/orange (distinct from green BUY / red SELL)
                    const isExceptional = score >= 90;
                    const isStrong = score >= 70 && score < 90;
                    const isModerate = score >= 50 && score < 70;
                    
                    return (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge 
                            className={cn(
                              "font-mono transition-all border-0 cursor-help",
                              isExceptional && "bg-amber-500 text-white text-sm font-bold shadow-md dark:bg-amber-600",
                              isStrong && "bg-amber-100 text-amber-700 text-xs font-semibold dark:bg-amber-950 dark:text-amber-400",
                              isModerate && "bg-secondary text-secondary-foreground text-xs",
                              !isModerate && !isStrong && !isExceptional && "bg-secondary text-muted-foreground text-xs opacity-60"
                            )}
                            data-testid={`badge-signal-${stock.ticker}`}
                          >
                            {score}/100
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="text-xs">
                          {getSignalTooltip(score, stock.recommendation || "")}
                        </TooltipContent>
                      </Tooltip>
                    );
                  })()}
                </TableCell>
                <TableCell className="py-1 px-1">
                  {stock.recommendation && (
                    <Badge
                      variant={stock.recommendation.toLowerCase().includes("buy") ? "default" : "destructive"}
                      className="text-[10px] px-1"
                      data-testid={`badge-rec-${stock.ticker}`}
                    >
                      {stock.recommendation.toLowerCase().includes("buy") ? (
                        <ArrowUpRight className="h-2.5 w-2.5 mr-0.5" />
                      ) : (
                        <ArrowDownRight className="h-2.5 w-2.5 mr-0.5" />
                      )}
                      {stock.recommendation.replace("_", " ").toUpperCase()}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right font-mono py-1 px-1" data-testid={`cell-price-${stock.ticker}`}>
                  ${currentPrice.toFixed(2)}
                </TableCell>
                <TableCell className="hidden lg:table-cell w-24 py-1 px-1" data-testid={`cell-chart-${stock.ticker}`}>
                  <CandlestickChartCell ticker={stock.ticker} height={40} />
                </TableCell>
                <TableCell className="text-right py-1 px-1">
                  <div className={`flex items-center justify-end gap-0.5 ${isPositive ? "text-success" : "text-destructive"}`}>
                    {isPositive ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                    <span className="font-mono font-medium">
                      {isPositive ? "+" : ""}{priceChangePercent.toFixed(1)}%
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono text-muted-foreground hidden xl:table-cell py-1 px-1">
                  {insiderPrice ? `$${insiderPrice.toFixed(2)}` : "-"}
                </TableCell>
                <TableCell className="text-right text-muted-foreground hidden xl:table-cell py-1 px-1">
                  {stock.marketCap || "-"}
                </TableCell>
                <TableCell className="hidden lg:table-cell py-1 px-1">
                  {stock.insiderTradeDate && (
                    <div className="flex items-center gap-1 text-muted-foreground" data-testid={`text-days-from-buy-${stock.ticker}`}>
                      <Clock className="h-2.5 w-2.5" />
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
