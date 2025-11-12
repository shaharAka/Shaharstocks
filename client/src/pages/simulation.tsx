import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Tooltip as TooltipUI,
  TooltipContent as TooltipUIContent,
  TooltipTrigger as TooltipUITrigger,
} from "@/components/ui/tooltip";
import { Activity, TrendingUp, TrendingDown, FlaskConical, Play, Clock, CheckCircle2, CheckCircle, XCircle, Loader2, AlertCircle, Trash2, Download, ChevronDown, ChevronUp } from "lucide-react";
import { type PortfolioHolding, type Stock, type TradingRule, type Trade } from "@shared/schema";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
  ReferenceLine,
} from "recharts";

// Color palette for different stocks
const CHART_COLORS = [
  "oklch(var(--chart-1))",
  "oklch(var(--chart-2))",
  "oklch(var(--chart-3))",
  "oklch(var(--chart-4))",
  "oklch(var(--chart-5))",
];

export default function Simulation() {
  const [selectedTickers, setSelectedTickers] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"actual" | "normalized">("actual");
  const [messageCount, setMessageCount] = useState(20);
  const [dataSource, setDataSource] = useState<"telegram" | "openinsider">("openinsider");
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [scenarioToImport, setScenarioToImport] = useState<string | null>(null);
  const [importScope, setImportScope] = useState<"all_holdings" | "specific_stock">("all_holdings");
  const [importTicker, setImportTicker] = useState<string>("");
  const [expandedScenarios, setExpandedScenarios] = useState<Set<string>>(new Set());
  const isInitialized = useRef(false);
  const { toast } = useToast();

  // Feature flags
  const { data: featureFlags } = useQuery<{ enableTelegram: boolean }>({
    queryKey: ["/api/feature-flags"],
  });

  const { data: holdings, isLoading: holdingsLoading } = useQuery<PortfolioHolding[]>({
    queryKey: ["/api/portfolio/holdings", "simulated"],
    queryFn: async () => {
      const response = await fetch("/api/portfolio/holdings?simulated=true");
      if (!response.ok) throw new Error("Failed to fetch holdings");
      return response.json();
    },
    refetchInterval: 300000, // Refetch every 5 minutes
  });

  const { data: stocks, isLoading: stocksLoading } = useQuery<Stock[]>({
    queryKey: ["/api/stocks"],
    refetchInterval: 300000, // Refetch every 5 minutes
  });

  const { data: rules, isLoading: rulesLoading } = useQuery<TradingRule[]>({
    queryKey: ["/api/rules"],
    refetchInterval: 300000, // Refetch every 5 minutes
  });

  const { data: trades, isLoading: tradesLoading } = useQuery<Trade[]>({
    queryKey: ["/api/trades", "simulated"],
    queryFn: async () => {
      const response = await fetch("/api/trades?simulated=true");
      if (!response.ok) throw new Error("Failed to fetch trades");
      return response.json();
    },
    refetchInterval: 300000, // Refetch every 5 minutes
  });

  const { data: backtestJobsData, isLoading: backtestJobsLoading } = useQuery<any[]>({
    queryKey: ["/api/backtest/jobs"],
    refetchInterval: (query) => {
      const jobs = query.state.data || [];
      const hasActiveJobs = jobs.some((job: any) => 
        !["completed", "failed"].includes(job.status)
      );
      return hasActiveJobs ? 5000 : false; // Poll every 5 seconds if jobs are active
    },
  });

  const { data: telegramStatus } = useQuery<{ isConnected: boolean }>({
    queryKey: ["/api/telegram/status"],
    refetchInterval: 10000, // Check every 10 seconds
    enabled: featureFlags?.enableTelegram ?? false,
  });

  const backtestJobs = backtestJobsData || [];
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  
  const isTelegramConnected = (featureFlags?.enableTelegram && telegramStatus?.isConnected) || false;

  // Fetch scenarios for selected job
  const { data: scenariosData, isLoading: scenariosLoading } = useQuery<any[]>({
    queryKey: ["/api/backtest/jobs", selectedJobId, "scenarios"],
    enabled: !!selectedJobId,
  });

  // Sort scenarios by P&L (highest first) to show winning strategy at top
  const scenarios = useMemo(() => {
    if (!scenariosData) return [];
    return [...scenariosData].sort((a, b) => 
      parseFloat(b.totalProfitLoss) - parseFloat(a.totalProfitLoss)
    );
  }, [scenariosData]);

  // Fetch price data for selected job
  const { data: priceData, isLoading: priceDataLoading } = useQuery<any[]>({
    queryKey: ["/api/backtest/jobs", selectedJobId, "price-data"],
    enabled: !!selectedJobId,
  });

  // Get selected job details
  const selectedJob = selectedJobId ? backtestJobs.find(j => j.id === selectedJobId) : null;

  const launchBacktestMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/backtest/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageCount, dataSource }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to launch backtest");
      }
      return response.json();
    },
    onSuccess: () => {
      const sourceName = dataSource === "telegram" ? "Telegram messages" : "OpenInsider trades";
      toast({
        title: "Backtest launched",
        description: `Processing ${messageCount} ${sourceName} in the background...`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/backtest/jobs"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to launch backtest",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const launchBacktest = () => {
    // Only check Telegram connection if using Telegram as data source and feature is enabled
    if (featureFlags?.enableTelegram && dataSource === "telegram" && !isTelegramConnected) {
      toast({
        title: "Telegram not connected",
        description: "Please connect to Telegram in Settings before running a backtest.",
        variant: "destructive",
      });
      return;
    }
    launchBacktestMutation.mutate();
  };

  const cancelBacktestMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const response = await fetch(`/api/backtest/jobs/${jobId}/cancel`, {
        method: "PATCH",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to cancel backtest");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Backtest cancelled",
        description: "The job has been stopped.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/backtest/jobs"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to cancel backtest",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const cancelBacktest = (jobId: string) => {
    cancelBacktestMutation.mutate(jobId);
  };

  const deleteBacktestMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const response = await fetch(`/api/backtest/jobs/${jobId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete backtest");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Backtest deleted",
        description: "The job has been removed.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/backtest/jobs"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete backtest",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteBacktest = (jobId: string) => {
    deleteBacktestMutation.mutate(jobId);
  };

  const importScenarioMutation = useMutation({
    mutationFn: async ({ scenarioId, scope, ticker }: { scenarioId: string, scope: string, ticker?: string }) => {
      return await apiRequest("POST", `/api/backtest/scenarios/${scenarioId}/import`, { scope, ticker });
    },
    onSuccess: () => {
      toast({
        title: "Scenario imported",
        description: "Trading rule created successfully. Check the Rules page to enable it.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/rules"] });
      setImportDialogOpen(false);
      setScenarioToImport(null);
      setImportScope("all_holdings");
      setImportTicker("");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to import scenario",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteSimulationMutation = useMutation({
    mutationFn: async (ticker: string) => {
      return await apiRequest("DELETE", `/api/stocks/${ticker}/simulate`, null);
    },
    onSuccess: (data, ticker) => {
      toast({
        title: "Simulation Removed",
        description: `Removed simulated position for ${ticker}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/holdings", "simulated"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trades", "simulated"] });
      // Deselect ticker if it was selected
      setSelectedTickers((prev) => {
        const updated = new Set(prev);
        updated.delete(ticker);
        return updated;
      });
    },
    onError: () => {
      toast({
        title: "Failed to Remove",
        description: "Unable to remove simulation. Please try again.",
        variant: "destructive",
      });
    },
  });

  const openImportDialog = (scenarioId: string) => {
    setScenarioToImport(scenarioId);
    setImportScope("all_holdings");
    setImportTicker("");
    setImportDialogOpen(true);
  };

  const handleImportConfirm = () => {
    if (!scenarioToImport) return;
    if (importScope === "specific_stock" && !importTicker) {
      toast({
        title: "Select a ticker",
        description: "Please select a stock ticker for the rule.",
        variant: "destructive",
      });
      return;
    }
    importScenarioMutation.mutate({ 
      scenarioId: scenarioToImport, 
      scope: importScope,
      ticker: importScope === "specific_stock" ? importTicker : undefined
    });
  };

  const isLoading = holdingsLoading || stocksLoading || rulesLoading || tradesLoading;

  // Initialize selected tickers with all tickers when holdings load
  const holdingStocks = useMemo(() => {
    if (!holdings || !stocks) return [];
    return holdings
      .map((holding) => stocks.find((s) => s.ticker === holding.ticker))
      .filter((stock): stock is Stock => stock !== undefined);
  }, [holdings, stocks]);

  // Initialize selection with all tickers only once when data loads
  useEffect(() => {
    if (holdingStocks.length > 0 && !isInitialized.current) {
      setSelectedTickers(new Set(holdingStocks.map(s => s.ticker)));
      isInitialized.current = true;
    }
  }, [holdingStocks]);

  const toggleTicker = (ticker: string) => {
    setSelectedTickers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(ticker)) {
        newSet.delete(ticker);
      } else {
        newSet.add(ticker);
      }
      return newSet;
    });
  };

  const selectAllTickers = () => {
    setSelectedTickers(new Set(holdingStocks.map(s => s.ticker)));
  };

  const deselectAllTickers = () => {
    setSelectedTickers(new Set());
  };

  // Combine all price histories into a single dataset with continuous timeline
  const combinedChartData = useMemo(() => {
    if (!holdings || !stocks || !trades || selectedTickers.size === 0) return [];

    const filteredStocks = holdingStocks
      .filter((stock) => selectedTickers.has(stock.ticker) && stock.priceHistory);

    if (filteredStocks.length === 0) return [];

    // Get purchase dates from trades for each ticker
    const tickerPurchaseDates = new Map<string, Date>();
    filteredStocks.forEach(stock => {
      const buyTrades = trades.filter(t => t.ticker === stock.ticker && t.type === "buy" && t.executedAt);
      if (buyTrades.length > 0) {
        const firstBuyTrade = buyTrades.sort((a, b) => 
          new Date(a.executedAt!).getTime() - new Date(b.executedAt!).getTime()
        )[0];
        
        if (firstBuyTrade?.executedAt) {
          tickerPurchaseDates.set(stock.ticker, new Date(firstBuyTrade.executedAt));
        }
      }
    });

    // Find the global date range: earliest insider trade to latest price data
    let minDate: Date | null = null;
    let maxDate: Date | null = null;

    // Get earliest trade date across all selected stocks
    tickerPurchaseDates.forEach(purchaseDate => {
      if (!minDate || purchaseDate < minDate) {
        minDate = purchaseDate;
      }
    });

    // Get latest price data date
    filteredStocks.forEach(stock => {
      stock.priceHistory?.forEach(point => {
        const pointDate = new Date(point.date);
        if (!maxDate || pointDate > maxDate) {
          maxDate = pointDate;
        }
      });
    });

    // If no trade dates found, fall back to using all available price data
    if (!minDate) {
      filteredStocks.forEach(stock => {
        stock.priceHistory?.forEach(point => {
          const pointDate = new Date(point.date);
          if (!minDate || pointDate < minDate) {
            minDate = pointDate;
          }
        });
      });
    }

    if (!minDate || !maxDate) return [];

    // Build continuous date axis from min to max
    const allDates: string[] = [];
    const currentDate = new Date(minDate);
    currentDate.setHours(0, 0, 0, 0);
    const endDate = new Date(maxDate);
    endDate.setHours(0, 0, 0, 0);

    // Collect all actual dates from price histories for efficient lookup
    const availableDates = new Set<string>();
    filteredStocks.forEach(stock => {
      stock.priceHistory?.forEach(point => {
        availableDates.add(point.date);
      });
    });

    // Use only dates that exist in the price data
    const sortedAvailableDates = Array.from(availableDates)
      .map(dateStr => ({ dateStr, date: new Date(dateStr) }))
      .filter(({ date }) => date >= minDate! && date <= maxDate!)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map(({ dateStr }) => dateStr);

    // Build combined data - each stock only shows data from its trade date onward
    return sortedAvailableDates.map((date) => {
      const dataPoint: any = { date };
      const currentDateObj = new Date(date);
      
      filteredStocks.forEach((stock) => {
        const purchaseDate = tickerPurchaseDates.get(stock.ticker);
        
        // Only include price if date >= purchase date (or no purchase date = show all)
        if (!purchaseDate || currentDateObj >= purchaseDate) {
          const pricePoint = stock.priceHistory?.find((p) => p.date === date);
          if (pricePoint) {
            dataPoint[stock.ticker] = pricePoint.price;
          }
        }
        // Otherwise leave as undefined (stock line won't show before purchase)
      });
      
      return dataPoint;
    });
  }, [holdings, stocks, trades, holdingStocks, selectedTickers]);

  // Transform data for normalized view (percentage change from user's actual purchase price)
  const normalizedChartData = useMemo(() => {
    if (combinedChartData.length === 0 || !holdingStocks || !holdings || !trades) return [];

    // Use user's actual purchase date and price from trades
    const stockPurchaseDates: Record<string, Date> = {};
    const stockBasePrices: Record<string, number> = {};
    
    holdingStocks.forEach(stock => {
      if (!selectedTickers.has(stock.ticker)) return;

      // Find the holding for this stock to get the actual purchase price
      const holding = holdings.find(h => h.ticker === stock.ticker);
      if (!holding) return;

      // Use the user's actual average purchase price as baseline
      stockBasePrices[stock.ticker] = parseFloat(holding.averagePurchasePrice);

      // Find the first buy trade for this stock to get the actual purchase date
      const buyTrades = trades.filter(t => t.ticker === stock.ticker && t.type === "buy" && t.executedAt);
      if (buyTrades.length > 0) {
        const firstBuyTrade = buyTrades.sort((a, b) => 
          new Date(a.executedAt!).getTime() - new Date(b.executedAt!).getTime()
        )[0];
        
        if (firstBuyTrade?.executedAt) {
          stockPurchaseDates[stock.ticker] = new Date(firstBuyTrade.executedAt);
        }
      }
      
      if (!stockPurchaseDates[stock.ticker]) {
        // Fallback to first available data point if no trade found
        for (const dataPoint of combinedChartData) {
          if (dataPoint[stock.ticker] != null) {
            stockPurchaseDates[stock.ticker] = new Date(dataPoint.date);
            break;
          }
        }
      }
    });

    // Group data by "days since purchase" for each stock
    // We'll create a map where key is the day number, and value contains all stock prices for that day
    const dayDataMap = new Map<number, any>();
    
    combinedChartData.forEach(dataPoint => {
      const dataDate = new Date(dataPoint.date);
      if (isNaN(dataDate.getTime())) return; // Skip invalid dates
      
      Object.keys(stockPurchaseDates).forEach(ticker => {
        const purchaseDate = stockPurchaseDates[ticker];
        const daysSincePurchase = Math.floor((dataDate.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24));
        
        // Only include data from day 0 onwards
        if (daysSincePurchase >= 0 && dataPoint[ticker] != null && stockBasePrices[ticker]) {
          if (!dayDataMap.has(daysSincePurchase)) {
            dayDataMap.set(daysSincePurchase, { day: daysSincePurchase });
          }
          
          const percentChange = ((dataPoint[ticker] - stockBasePrices[ticker]) / stockBasePrices[ticker]) * 100;
          dayDataMap.get(daysSincePurchase)![ticker] = percentChange;
        }
      });
    });

    // Convert map to sorted array
    return Array.from(dayDataMap.values()).sort((a, b) => a.day - b.day);
  }, [combinedChartData, holdingStocks, selectedTickers, holdings, trades]);

  // Collect purchase markers for reference lines
  const purchaseMarkers = useMemo(() => {
    if (!holdings || !trades || !holdingStocks) return [];

    const markers: Array<{
      ticker: string;
      color: string;
      executedAt: Date;
      dateString: string;
    }> = [];

    holdingStocks.forEach((stock, index) => {
      if (!selectedTickers.has(stock.ticker)) return;

      const buyTrades = trades.filter(t => t.ticker === stock.ticker && t.type === "buy" && t.executedAt);
      if (buyTrades.length > 0) {
        const firstBuyTrade = buyTrades.sort((a, b) => 
          new Date(a.executedAt!).getTime() - new Date(b.executedAt!).getTime()
        )[0];
        
        if (firstBuyTrade?.executedAt) {
          const executedAt = new Date(firstBuyTrade.executedAt);
          const dateString = executedAt.toISOString().split('T')[0]; // YYYY-MM-DD format
          
          markers.push({
            ticker: stock.ticker,
            color: CHART_COLORS[index % CHART_COLORS.length],
            executedAt,
            dateString,
          });
        }
      }
    });

    return markers;
  }, [holdings, trades, holdingStocks, selectedTickers]);

  // Select which data to display based on view mode
  const displayChartData = viewMode === "normalized" ? normalizedChartData : combinedChartData;

  // Calculate sell rule boundary lines for selected stocks
  const sellRuleLines = useMemo(() => {
    if (!holdings || !stocks || !rules) return [];

    const lines: Array<{
      ticker: string;
      rule: TradingRule;
      price: number;
      isLower: boolean;
    }> = [];

    holdings.forEach((holding) => {
      const stock = stocks.find((s) => s.ticker === holding.ticker);
      if (!stock || !selectedTickers.has(stock.ticker)) return;

      const purchasePrice = parseFloat(holding.averagePurchasePrice);

      // Find applicable sell rules
      const applicableRules = rules.filter(
        (rule) =>
          rule.enabled &&
          (rule.action === "sell" || rule.action === "sell_all") &&
          (rule.scope === "all_holdings" || 
           (rule.scope === "specific_stock" && rule.ticker === stock.ticker))
      );

      applicableRules.forEach((rule) => {
        if (!rule.conditions || rule.conditions.length === 0) return;
        
        const condition = rule.conditions[0];
        let boundaryPrice = 0;

        if (condition.metric === "price_change_percent") {
          boundaryPrice = purchasePrice * (1 + condition.value / 100);
        } else if (condition.metric === "price_change_from_close_percent") {
          const previousClose = parseFloat(stock.previousClose || stock.currentPrice);
          boundaryPrice = previousClose * (1 + condition.value / 100);
        } else if (condition.metric === "price_absolute") {
          boundaryPrice = condition.value;
        }

        // Determine if lower or upper boundary
        const isLower = (condition.operator === "<" || condition.operator === "<=");

        lines.push({
          ticker: stock.ticker,
          rule,
          price: boundaryPrice,
          isLower,
        });
      });
    });

    return lines;
  }, [holdings, stocks, rules, selectedTickers]);

  // Calculate sell rule boundary lines as percentages for normalized view
  // Show each unique rule only once without stock-specific details, filtered by selected tickers
  const sellRuleLinesNormalized = useMemo(() => {
    if (!rules || !holdings || !stocks) return [];

    const uniqueLines = new Map<string, {
      rule: TradingRule;
      percentage: number;
      isLower: boolean;
      name: string;
    }>();

    // Only process rules that apply to selected stocks
    holdings.forEach((holding) => {
      const stock = stocks.find((s) => s.ticker === holding.ticker);
      if (!stock || !selectedTickers.has(stock.ticker)) return;

      // Find applicable sell rules for this stock
      const applicableRules = rules.filter(
        (rule) =>
          rule.enabled &&
          (rule.action === "sell" || rule.action === "sell_all") &&
          (rule.scope === "all_holdings" || 
           (rule.scope === "specific_stock" && rule.ticker === stock.ticker))
      );

      applicableRules.forEach((rule) => {
        if (!rule.conditions || rule.conditions.length === 0) return;
        const condition = rule.conditions[0];
        
        // Only show price_change_percent rules in normalized view
        if (condition.metric === "price_change_percent") {
          const percentage = condition.value;
          const isLower = (condition.operator === "<" || condition.operator === "<=");
          
          // Use rule ID as key to ensure each rule appears only once
          const key = `${rule.id}-${percentage}`;
          
          if (!uniqueLines.has(key)) {
            uniqueLines.set(key, {
              rule,
              percentage,
              isLower,
              name: rule.name,
            });
          }
        }
      });
    });

    return Array.from(uniqueLines.values());
  }, [rules, holdings, stocks, selectedTickers]);

  // Calculate Y-axis domain to include both data, boundary lines, and purchase prices
  const yAxisDomain = useMemo(() => {
    if (viewMode === "normalized") {
      // For normalized view, use percentage range
      const allValues: number[] = [];
      
      normalizedChartData.forEach((dataPoint) => {
        Object.keys(dataPoint).forEach((key) => {
          if (key !== 'date' && typeof dataPoint[key] === 'number') {
            allValues.push(dataPoint[key]);
          }
        });
      });

      // Include rule boundary percentages
      sellRuleLinesNormalized.forEach((line) => {
        allValues.push(line.percentage);
      });
      
      if (allValues.length === 0) return [-10, 10];
      
      const minValue = Math.min(...allValues, 0); // Include 0
      const maxValue = Math.max(...allValues, 0); // Include 0
      const padding = Math.max(Math.abs(minValue), Math.abs(maxValue)) * 0.1 || 1;
      
      return [
        Math.floor(minValue - padding),
        Math.ceil(maxValue + padding),
      ];
    }

    // Actual price view - existing logic
    const allPrices: number[] = [];

    // Collect all stock prices from chart data
    combinedChartData.forEach((dataPoint) => {
      Object.keys(dataPoint).forEach((key) => {
        if (key !== 'date' && typeof dataPoint[key] === 'number') {
          allPrices.push(dataPoint[key]);
        }
      });
    });

    // Collect all boundary prices
    sellRuleLines.forEach((line) => {
      allPrices.push(line.price);
    });

    // Include purchase prices in the domain
    holdings?.forEach((holding) => {
      if (selectedTickers.has(holding.ticker)) {
        allPrices.push(parseFloat(holding.averagePurchasePrice));
      }
    });

    if (allPrices.length === 0) return ['auto', 'auto'];

    const minPrice = Math.min(...allPrices);
    const maxPrice = Math.max(...allPrices);
    
    // Add 10% padding on both sides, with minimum padding for flat datasets
    let padding = (maxPrice - minPrice) * 0.1;
    if (padding === 0) {
      // If all prices are the same, add 1% of the price as padding
      padding = maxPrice * 0.01 || 1; // Fallback to 1 if price is 0
    }
    
    return [
      Math.floor(minPrice - padding),
      Math.ceil(maxPrice + padding),
    ];
  }, [viewMode, combinedChartData, normalizedChartData, sellRuleLines, sellRuleLinesNormalized, holdings, selectedTickers]);

  // Calculate portfolio summary with realized and unrealized P&L
  const portfolioSummary = useMemo(() => {
    if (!holdings || !stocks || !trades) return null;

    // Calculate unrealized P&L from current holdings
    let totalValue = 0;
    let totalCost = 0;

    holdings.forEach((holding) => {
      const stock = stocks.find((s) => s.ticker === holding.ticker);
      if (stock) {
        const currentPrice = parseFloat(stock.currentPrice);
        const purchasePrice = parseFloat(holding.averagePurchasePrice);
        totalValue += currentPrice * holding.quantity;
        totalCost += purchasePrice * holding.quantity;
      }
    });

    const unrealizedPL = totalValue - totalCost;
    const unrealizedPLPercent = totalCost > 0 ? (unrealizedPL / totalCost) * 100 : 0;

    // Calculate realized P&L from completed trades
    // Group trades by ticker to calculate P&L
    const tickerTrades = new Map<string, { buys: Trade[]; sells: Trade[] }>();
    
    trades.forEach((trade) => {
      if (!tickerTrades.has(trade.ticker)) {
        tickerTrades.set(trade.ticker, { buys: [], sells: [] });
      }
      const group = tickerTrades.get(trade.ticker)!;
      if (trade.type === "buy") {
        group.buys.push(trade);
      } else if (trade.type === "sell") {
        group.sells.push(trade);
      }
    });

    let realizedPL = 0;
    let totalInvested = 0;

    // For each ticker, calculate realized P&L
    tickerTrades.forEach((group, ticker) => {
      // Calculate weighted average purchase price from all buys
      let totalBuyQuantity = 0;
      let totalBuyCost = 0;
      group.buys.forEach((buy) => {
        const quantity = buy.quantity;
        const price = parseFloat(buy.price);
        totalBuyQuantity += quantity;
        totalBuyCost += price * quantity;
      });

      const avgPurchasePrice = totalBuyQuantity > 0 ? totalBuyCost / totalBuyQuantity : 0;

      // Calculate realized P&L from all sells
      group.sells.forEach((sell) => {
        const quantity = sell.quantity;
        const sellPrice = parseFloat(sell.price);
        const sellProceeds = sellPrice * quantity;
        const sellCost = avgPurchasePrice * quantity;
        realizedPL += sellProceeds - sellCost;
      });

      // Track total invested (for calculating overall invested amount)
      totalInvested += totalBuyCost;
    });

    // Total P&L = unrealized + realized
    const totalPL = unrealizedPL + realizedPL;
    // Total investment = all money invested (whether still holding or already sold)
    const totalInvestment = totalInvested > 0 ? totalInvested : totalCost;
    const totalPLPercent = totalInvestment > 0 ? (totalPL / totalInvestment) * 100 : 0;

    return {
      totalValue,
      totalCost,
      unrealizedPL,
      unrealizedPLPercent,
      realizedPL,
      totalPL,
      totalPLPercent: isFinite(totalPLPercent) ? totalPLPercent : 0,
      isPositive: totalPL >= 0,
    };
  }, [holdings, stocks, trades]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-96 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!holdings || holdings.length === 0) {
    return (
      <div className="p-6 space-y-6 max-w-screen-2xl mx-auto">
        <div>
          <h1 className="text-2xl font-semibold mb-1" data-testid="text-page-title">
            Simulation
          </h1>
          <p className="text-sm text-muted-foreground">
            Track simulated stock positions and performance
          </p>
        </div>
        <Card className="p-12">
          <div className="text-center">
            <FlaskConical className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2" data-testid="text-no-holdings">No Simulated Holdings</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create simulated trades from the Purchase page to track performance
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-screen-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold mb-1" data-testid="text-page-title">
          Simulation
        </h1>
        <p className="text-sm text-muted-foreground">
          Test trading strategies with simulated positions and AI-powered backtests
        </p>
      </div>

      <Tabs defaultValue="realtime" className="space-y-6" data-testid="tabs-simulation">
        <TabsList>
          <TabsTrigger value="realtime" data-testid="tab-realtime">Real-time</TabsTrigger>
          <TabsTrigger value="whatif" data-testid="tab-whatif">What-if</TabsTrigger>
        </TabsList>

        <TabsContent value="realtime" className="space-y-6">

      {portfolioSummary && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-xs text-muted-foreground mb-1">Current Value</div>
              <div className="text-2xl font-mono font-semibold" data-testid="text-total-value">
                ${portfolioSummary.totalValue.toFixed(2)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-xs text-muted-foreground mb-1">Invested</div>
              <div className="text-2xl font-mono font-semibold" data-testid="text-total-cost">
                ${portfolioSummary.totalCost.toFixed(2)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-xs text-muted-foreground mb-1">Unrealized P&L</div>
              <div
                className={`text-2xl font-mono font-semibold ${
                  portfolioSummary.unrealizedPL >= 0 ? "text-success" : "text-destructive"
                }`}
                data-testid="text-unrealized-pl"
              >
                {portfolioSummary.unrealizedPL >= 0 ? "+" : ""}${portfolioSummary.unrealizedPL.toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {portfolioSummary.unrealizedPL >= 0 ? "+" : ""}{portfolioSummary.unrealizedPLPercent.toFixed(2)}%
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-xs text-muted-foreground mb-1">Realized P&L</div>
              <div
                className={`text-2xl font-mono font-semibold ${
                  portfolioSummary.realizedPL >= 0 ? "text-success" : "text-destructive"
                }`}
                data-testid="text-realized-pl"
              >
                {portfolioSummary.realizedPL >= 0 ? "+" : ""}${portfolioSummary.realizedPL.toFixed(2)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-xs text-muted-foreground mb-1">Total P&L</div>
              <div
                className={`text-2xl font-mono font-semibold ${
                  portfolioSummary.isPositive ? "text-success" : "text-destructive"
                }`}
                data-testid="text-total-pl"
              >
                {portfolioSummary.isPositive ? "+" : ""}${portfolioSummary.totalPL.toFixed(2)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-xs text-muted-foreground mb-1">Total Return</div>
              <div
                className={`text-2xl font-mono font-semibold ${
                  portfolioSummary.isPositive ? "text-success" : "text-destructive"
                }`}
                data-testid="text-total-return"
              >
                {portfolioSummary.isPositive ? "+" : ""}{portfolioSummary.totalPLPercent.toFixed(2)}%
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card data-testid="card-unified-chart">
        <CardHeader className="space-y-3">
          <div className="flex flex-row items-center justify-between gap-2 flex-wrap">
            <div>
              <CardTitle>Simulated Price History</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                {viewMode === "normalized" ? "Percentage change from initial price" : "Stock prices updated every 5 minutes"}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 border rounded-md p-1">
                <TooltipUI>
                  <TooltipUITrigger asChild>
                    <Button
                      variant={viewMode === "actual" ? "default" : "ghost"}
                      size="lg"
                      onClick={() => setViewMode("actual")}
                      data-testid="toggle-view-mode-actual"
                      className="toggle-elevate"
                    >
                      Actual
                    </Button>
                  </TooltipUITrigger>
                  <TooltipUIContent>
                    <p>View actual dollar values of stock prices</p>
                  </TooltipUIContent>
                </TooltipUI>
                <TooltipUI>
                  <TooltipUITrigger asChild>
                    <Button
                      variant={viewMode === "normalized" ? "default" : "ghost"}
                      size="lg"
                      onClick={() => setViewMode("normalized")}
                      data-testid="toggle-view-mode-normalized"
                      className="toggle-elevate"
                    >
                      Normalized
                    </Button>
                  </TooltipUITrigger>
                  <TooltipUIContent>
                    <p>View percentage change from your purchase price</p>
                  </TooltipUIContent>
                </TooltipUI>
              </div>
              <Button
                variant="outline"
                size="lg"
                onClick={selectAllTickers}
                data-testid="button-select-all"
              >
                Select All
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={deselectAllTickers}
                data-testid="button-deselect-all"
              >
                Clear All
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground mr-1">Filter:</span>
            {holdingStocks.map((stock) => {
              const isSelected = selectedTickers.has(stock.ticker);
              return (
                <Badge
                  key={stock.ticker}
                  variant={isSelected ? "default" : "outline"}
                  className="cursor-pointer hover-elevate"
                  onClick={() => toggleTicker(stock.ticker)}
                  data-testid={`badge-filter-${stock.ticker}`}
                >
                  {stock.ticker}
                </Badge>
              );
            })}
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[500px] w-full" data-testid="chart-unified">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={displayChartData}
                margin={{ top: 30, right: 80, left: 20, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(var(--border))" />
                <XAxis
                  dataKey={viewMode === "normalized" ? "day" : "date"}
                  stroke="oklch(var(--muted-foreground))"
                  fontSize={12}
                  tickFormatter={(value) => {
                    if (viewMode === "normalized") {
                      return `Day ${value}`;
                    }
                    const date = new Date(value);
                    return `${date.getMonth() + 1}/${date.getDate()}`;
                  }}
                />
                <YAxis
                  stroke="oklch(var(--muted-foreground))"
                  fontSize={12}
                  domain={yAxisDomain as [number, number]}
                  tickFormatter={(value) => viewMode === "normalized" ? `${value.toFixed(0)}%` : `$${value.toFixed(0)}`}
                />
                {viewMode === "normalized" && (
                  <ReferenceLine
                    y={0}
                    stroke="oklch(var(--muted-foreground))"
                    strokeDasharray="5 5"
                    strokeWidth={1.5}
                  />
                )}
                {/* Purchase date markers */}
                {viewMode === "actual" && purchaseMarkers.map((marker) => (
                  <ReferenceLine
                    key={marker.ticker}
                    x={marker.dateString}
                    stroke={marker.color}
                    strokeDasharray="3 3"
                    strokeWidth={2}
                    label={{
                      value: `${marker.ticker} Buy`,
                      position: "top",
                      fill: marker.color,
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                    data-testid={`purchase-marker-${marker.ticker}`}
                  />
                ))}
                {viewMode === "normalized" && (
                  <ReferenceLine
                    x={0}
                    stroke="oklch(var(--primary))"
                    strokeDasharray="3 3"
                    strokeWidth={2}
                    label={{
                      value: "Purchase",
                      position: "top",
                      fill: "oklch(var(--primary))",
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                    data-testid="purchase-marker-normalized"
                  />
                )}
                <Tooltip
                  contentStyle={{
                    backgroundColor: "oklch(var(--popover))",
                    border: "1px solid oklch(var(--border))",
                    borderRadius: "6px",
                  }}
                  labelStyle={{ color: "oklch(var(--popover-foreground))" }}
                  formatter={(value: number, name: string) => [
                    viewMode === "normalized" ? `${value.toFixed(2)}%` : `$${value.toFixed(2)}`,
                    name
                  ]}
                  labelFormatter={(label) => viewMode === "normalized" ? `Day ${label}` : `Date: ${label}`}
                />
                <Legend
                  wrapperStyle={{
                    paddingTop: "20px",
                  }}
                  iconType="line"
                  formatter={(value) => (
                    <span style={{ color: "oklch(var(--foreground))", fontSize: "12px", fontWeight: 600 }}>
                      {value}
                    </span>
                  )}
                />

                {/* All stocks with different colors - only selected ones */}
                {holdingStocks
                  .filter((stock) => selectedTickers.has(stock.ticker))
                  .map((stock, index) => {
                    const color = CHART_COLORS[index % CHART_COLORS.length];
                    return (
                      <Line
                        key={stock.ticker}
                        type="monotone"
                        dataKey={stock.ticker}
                        stroke={color}
                        strokeWidth={2}
                        dot={false}
                        name={stock.ticker}
                      >
                        <LabelList
                          dataKey={stock.ticker}
                          position="right"
                          content={({ x, y, value, index: pointIndex }) => {
                            if (pointIndex === undefined || !displayChartData[pointIndex]) return null;
                            const isLastPoint = pointIndex === displayChartData.length - 1;
                            if (!isLastPoint) return null;
                            
                            return (
                              <text
                                x={Number(x) + 10}
                                y={Number(y)}
                                fill={color}
                                fontSize={12}
                                fontWeight={600}
                                textAnchor="start"
                              >
                                {stock.ticker}
                              </text>
                            );
                          }}
                        />
                      </Line>
                    );
                  })}

                {/* Trading rule boundary lines - only in actual mode */}
                {viewMode === "actual" && sellRuleLines.map((line, index) => {
                  const color = line.isLower ? "oklch(var(--destructive))" : "oklch(var(--success))";
                  const label = line.isLower ? "Stop Loss" : "Take Profit";
                  
                  return (
                    <ReferenceLine
                      key={`rule-${line.ticker}-${line.rule.id}-${index}`}
                      y={line.price}
                      stroke={color}
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      label={{
                        value: `${line.ticker} ${label}: $${line.price.toFixed(2)}`,
                        position: line.isLower ? "insideBottomLeft" : "insideTopLeft",
                        fill: color,
                        fontSize: 11,
                        fontWeight: "600",
                      }}
                    />
                  );
                })}

                {/* Purchase price reference lines - only in actual mode */}
                {viewMode === "actual" && holdings
                  ?.filter((holding) => selectedTickers.has(holding.ticker))
                  .map((holding) => {
                    const purchasePrice = parseFloat(holding.averagePurchasePrice);
                    return (
                      <ReferenceLine
                        key={`purchase-${holding.ticker}`}
                        y={purchasePrice}
                        stroke="oklch(var(--muted-foreground))"
                        strokeWidth={2}
                        strokeDasharray="3 3"
                        label={{
                          value: `${holding.ticker} Purchase: $${purchasePrice.toFixed(2)}`,
                          position: "insideTopLeft",
                          fill: "oklch(var(--muted-foreground))",
                          fontSize: 11,
                          fontWeight: "500",
                        }}
                      />
                    );
                  })}

                {/* Trading rule boundary lines - normalized mode */}
                {viewMode === "normalized" && sellRuleLinesNormalized.map((line, index) => {
                  const color = line.isLower ? "oklch(var(--destructive))" : "oklch(var(--success))";
                  const label = line.isLower ? "Stop Loss" : "Take Profit";
                  
                  return (
                    <ReferenceLine
                      key={`rule-norm-${line.rule.id}-${index}`}
                      y={line.percentage}
                      stroke={color}
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      label={{
                        value: `${label}: ${line.percentage >= 0 ? '+' : ''}${line.percentage.toFixed(1)}%`,
                        position: line.isLower ? "insideBottomLeft" : "insideTopLeft",
                        fill: color,
                        fontSize: 11,
                        fontWeight: "600",
                      }}
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="card-holdings-summary">
        <CardHeader>
          <CardTitle>Holdings Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {holdings.map((holding) => {
              const stock = stocks?.find((s) => s.ticker === holding.ticker);
              if (!stock) return null;

              const currentPrice = parseFloat(stock.currentPrice);
              const purchasePrice = parseFloat(holding.averagePurchasePrice);
              const profitLoss = currentPrice - purchasePrice;
              const profitLossPercent = (profitLoss / purchasePrice) * 100;
              const isPositive = profitLoss >= 0;

              return (
                <div key={holding.id} className="border rounded-lg p-4" data-testid={`holding-${stock.ticker}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold" data-testid={`text-ticker-${stock.ticker}`}>
                          {stock.ticker}
                        </h3>
                        <Badge
                          variant={isPositive ? "default" : "destructive"}
                          className="text-xs"
                          data-testid={`badge-performance-${stock.ticker}`}
                        >
                          {isPositive ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                          {isPositive ? "+" : ""}{profitLossPercent.toFixed(2)}%
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground" data-testid={`text-company-${stock.ticker}`}>
                        {stock.companyName}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground mb-1">Holding</div>
                        <div className="text-lg font-mono font-semibold" data-testid={`text-quantity-${stock.ticker}`}>
                          {holding.quantity} shares
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteSimulationMutation.mutate(stock.ticker)}
                        disabled={deleteSimulationMutation.isPending}
                        data-testid={`button-remove-${stock.ticker}`}
                        className="h-11 w-11"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm mt-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Purchase</p>
                      <p className="font-mono font-medium" data-testid={`text-purchase-${stock.ticker}`}>
                        ${purchasePrice.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Current</p>
                      <p className="font-mono font-medium" data-testid={`text-current-${stock.ticker}`}>
                        ${currentPrice.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">P&L</p>
                      <p
                        className={`font-mono font-medium ${
                          isPositive ? "text-success" : "text-destructive"
                        }`}
                        data-testid={`text-pl-${stock.ticker}`}
                      >
                        {isPositive ? "+" : ""}${profitLoss.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="whatif" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Launch What-If Backtest</CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Analyze historical insider trading data with AI-powered trading scenarios
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {featureFlags?.enableTelegram && !isTelegramConnected && dataSource === "telegram" && (
                  <div className="flex items-start gap-3 p-4 border border-destructive/50 bg-destructive/10 rounded-md">
                    <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-destructive">Telegram Not Connected</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Please connect to Telegram in Settings to enable backtesting. The backtest feature requires access to your Telegram channel to fetch historical messages.
                      </p>
                    </div>
                  </div>
                )}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label data-testid="label-data-source">Data Source</Label>
                    <RadioGroup 
                      value={dataSource} 
                      onValueChange={(value) => setDataSource(value as "telegram" | "openinsider")}
                      data-testid="radio-data-source"
                    >
                      {featureFlags?.enableTelegram && (
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="telegram" id="telegram" data-testid="radio-telegram" />
                        <Label htmlFor="telegram" className="font-normal cursor-pointer">
                          Telegram Channel
                        </Label>
                      </div>
                      )}
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="openinsider" id="openinsider" data-testid="radio-openinsider" />
                        <Label htmlFor="openinsider" className="font-normal cursor-pointer">
                          OpenInsider.com
                        </Label>
                      </div>
                    </RadioGroup>
                    <p className="text-xs text-muted-foreground">
                      {dataSource === "telegram" 
                        ? "Analyze historical messages from configured Telegram channel" 
                        : "Analyze latest insider trading transactions from OpenInsider.com"}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="messageCount" data-testid="label-message-count">
                        {dataSource === "telegram" ? "Number of Messages" : "Number of Transactions"}
                      </Label>
                      <Input
                        id="messageCount"
                        type="number"
                        min="1"
                        max="2000"
                        defaultValue="20"
                        placeholder="20"
                        onChange={(e) => setMessageCount(parseInt(e.target.value) || 20)}
                        data-testid="input-message-count"
                      />
                      <p className="text-xs text-muted-foreground">
                        {dataSource === "telegram"
                          ? "Fetch and analyze the last N Telegram messages (max 2000)"
                          : "Fetch and analyze the last N insider trades (max 2000)"}
                      </p>
                    </div>
                    <div className="flex items-end">
                      <Button 
                        className="w-full md:w-auto" 
                        onClick={launchBacktest}
                        disabled={launchBacktestMutation.isPending || (dataSource === "telegram" && !isTelegramConnected)}
                        data-testid="button-launch-backtest"
                      >
                        {launchBacktestMutation.isPending ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4 mr-2" />
                        )}
                        Launch Backtest
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h3 className="text-sm font-medium mb-2">How it works:</h3>
                  <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>
                      {dataSource === "telegram" 
                        ? "Fetches the last N messages from Telegram channel"
                        : "Fetches the last N insider purchase transactions from OpenInsider.com"}
                    </li>
                    <li>Filters purchase candidates (market cap &gt; $100M, valid insider trades)</li>
                    <li>Builds price matrix (1 month before to today)</li>
                    <li>OpenAI generates 10 trading rule scenarios</li>
                    <li>Calculates P&L for each scenario</li>
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Backtest Jobs</CardTitle>
            </CardHeader>
            <CardContent>
              {backtestJobsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : backtestJobs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8" data-testid="text-no-jobs">
                  No backtest jobs yet. Launch one above to get started.
                </p>
              ) : (
                <div className="space-y-2">
                  {backtestJobs.map((job) => {
                    const statusLabels: Record<string, string> = {
                      pending: "Queued",
                      fetching_messages: "Fetching Messages",
                      filtering: "Filtering Candidates",
                      building_matrix: "Building Price Matrix",
                      generating_scenarios: "Generating AI Scenarios",
                      calculating_results: "Calculating P&L",
                      completed: "Completed",
                      failed: "Failed",
                      cancelled: "Cancelled",
                    };

                    const isProcessing = !["completed", "failed", "cancelled"].includes(job.status);

                    return (
                      <div 
                        key={job.id} 
                        className="flex items-center justify-between p-4 border rounded-md hover-elevate cursor-pointer" 
                        onClick={() => job.status === "completed" && setSelectedJobId(job.id)}
                        data-testid={`card-backtest-job-${job.id}`}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          {isProcessing ? (
                            <Loader2 className="h-5 w-5 text-primary animate-spin" />
                          ) : job.status === "completed" ? (
                            <div className="h-5 w-5 rounded-full bg-success/20 flex items-center justify-center">
                              <div className="h-2 w-2 rounded-full bg-success" />
                            </div>
                          ) : (
                            <div className="h-5 w-5 rounded-full bg-destructive/20 flex items-center justify-center">
                              <div className="h-2 w-2 rounded-full bg-destructive" />
                            </div>
                          )}
                          <div className="flex-1">
                            <p className="text-sm font-medium">
                              Backtest {new Date(job.createdAt).toLocaleString()}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {job.messageCount} messages • {statusLabels[job.status] || job.status}
                              {isProcessing && ` • ${job.progress}%`}
                            </p>
                            {job.metadata?.candidateStocks && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {job.metadata.candidateStocks.length} candidate stocks found
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isProcessing ? (
                            <>
                              <Badge variant="outline">
                                <Clock className="h-3 w-3 mr-1" />
                                {job.progress}%
                              </Badge>
                              <Button
                                variant="ghost"
                                size="lg"
                                onClick={() => cancelBacktest(job.id)}
                                disabled={cancelBacktestMutation.isPending}
                                data-testid={`button-cancel-${job.id}`}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              {job.status === "completed" ? (
                                <Badge variant="default" className="bg-success hover:bg-success">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Done
                                </Badge>
                              ) : job.status === "cancelled" ? (
                                <Badge variant="outline">
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Cancelled
                                </Badge>
                              ) : (
                                <Badge variant="destructive">
                                  Failed
                                </Badge>
                              )}
                              <Button
                                variant="ghost"
                                size="lg"
                                onClick={() => deleteBacktest(job.id)}
                                disabled={deleteBacktestMutation.isPending}
                                data-testid={`button-delete-${job.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {selectedJobId && selectedJob && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Backtest Stocks & Historical Prices</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {selectedJob.candidateStocks?.length || 0} candidate stocks analyzed from {selectedJob.messageCount} messages
                  </p>
                </CardHeader>
                <CardContent>
                  {priceDataLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : !priceData || priceData.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No price data available for this job.
                    </p>
                  ) : (
                    <div className="space-y-6">
                      {priceData.map((stockData: any) => {
                        const candidate = selectedJob.candidateStocks?.find((c: any) => c.ticker === stockData.ticker);
                        const insiderBuyDate = new Date(stockData.insiderBuyDate);
                        
                        // Prepare chart data
                        const chartData = stockData.priceMatrix.map((p: any) => {
                          const date = new Date(p.date);
                          return {
                            date: p.date,
                            dateLabel: `${date.getMonth() + 1}/${date.getDate()}`,
                            price: p.close,
                            isInsiderBuy: p.date === stockData.insiderBuyDate,
                          };
                        });

                        // Calculate price change from purchase date to latest date
                        const purchasePrice = chartData.find((d: any) => d.isInsiderBuy)?.price || chartData[0]?.price;
                        const latestPrice = chartData[chartData.length - 1]?.price;
                        const priceChange = latestPrice && purchasePrice ? latestPrice - purchasePrice : 0;
                        const priceChangePercent = purchasePrice ? (priceChange / purchasePrice) * 100 : 0;
                        const isPositiveChange = priceChange >= 0;

                        return (
                          <div key={stockData.ticker} className="border rounded-lg p-4 space-y-4" data-testid={`stock-price-${stockData.ticker}`}>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-semibold text-lg">{stockData.ticker}</h4>
                                  {purchasePrice && latestPrice && (
                                    <Badge
                                      variant={isPositiveChange ? "default" : "destructive"}
                                      className="text-xs"
                                      data-testid={`badge-price-change-${stockData.ticker}`}
                                    >
                                      {isPositiveChange ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                                      {isPositiveChange ? "+" : ""}{priceChangePercent.toFixed(2)}%
                                    </Badge>
                                  )}
                                </div>
                                {candidate && (
                                  <div className="text-sm text-muted-foreground mt-1 space-y-0.5">
                                    <p>Market Cap: {candidate.marketCap}</p>
                                    <p>Purchase Date (Alert Received): {insiderBuyDate.toLocaleDateString()}</p>
                                    <p>Insider Price: ${candidate.insiderPrice?.toFixed(2)}</p>
                                    <p>Market Price at Alert: ${purchasePrice?.toFixed(2)}</p>
                                    {latestPrice && (
                                      <p className={isPositiveChange ? "text-success font-medium" : "text-destructive font-medium"}>
                                        Latest Price: ${latestPrice.toFixed(2)} ({isPositiveChange ? "+" : ""}${priceChange.toFixed(2)})
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                              <Badge variant="outline">
                                {chartData.length} days
                              </Badge>
                            </div>

                            <div className="h-64">
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                  <XAxis 
                                    dataKey="dateLabel" 
                                    tick={{ fontSize: 11 }}
                                    stroke="hsl(var(--muted-foreground))"
                                  />
                                  <YAxis 
                                    domain={['auto', 'auto']}
                                    tick={{ fontSize: 11 }}
                                    stroke="hsl(var(--muted-foreground))"
                                    tickFormatter={(value) => `$${value.toFixed(2)}`}
                                  />
                                  <Tooltip
                                    contentStyle={{
                                      backgroundColor: "hsl(var(--card))",
                                      border: "1px solid hsl(var(--border))",
                                      borderRadius: "0.5rem",
                                    }}
                                    formatter={(value: any) => [`$${value.toFixed(2)}`, "Price"]}
                                    labelFormatter={(label, payload) => {
                                      const item = payload[0]?.payload;
                                      return `${label}${item?.isInsiderBuy ? ' (Your Entry)' : ''}`;
                                    }}
                                  />
                                  <Line
                                    type="monotone"
                                    dataKey="price"
                                    stroke="hsl(var(--chart-1))"
                                    strokeWidth={2}
                                    dot={(props) => {
                                      const { cx, cy, payload } = props;
                                      if (payload.isInsiderBuy) {
                                        return (
                                          <circle
                                            cx={cx}
                                            cy={cy}
                                            r={6}
                                            fill="hsl(var(--primary))"
                                            stroke="hsl(var(--background))"
                                            strokeWidth={2}
                                          />
                                        );
                                      }
                                      return <circle cx={cx} cy={cy} r={2} fill="hsl(var(--chart-1))" />;
                                    }}
                                  />
                                  {/* Your purchase date reference line */}
                                  {chartData.find((d: any) => d.isInsiderBuy) && (
                                    <ReferenceLine
                                      x={chartData.find((d: any) => d.isInsiderBuy)?.dateLabel}
                                      stroke="hsl(var(--primary))"
                                      strokeWidth={2}
                                      strokeDasharray="5 5"
                                      label={{
                                        value: "Your Purchase",
                                        position: "top",
                                        fill: "hsl(var(--primary))",
                                        fontSize: 11,
                                        fontWeight: "600",
                                      }}
                                    />
                                  )}
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top 10 Scenario Results</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Showing the best 10 strategies out of 100 AI-generated scenarios, sorted by total P&L
                  </p>
                </CardHeader>
                <CardContent>
                  {scenariosLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : !scenarios || scenarios.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No scenarios found for this job.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {scenarios.map((scenario, index) => (
                        <div key={scenario.id} className="border rounded-md p-4 space-y-3" data-testid={`card-scenario-${scenario.scenarioNumber}`}>
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-medium">{scenario.name}</h4>
                                  {index === 0 && parseFloat(scenario.totalProfitLoss) > 0 && (
                                    <Badge variant="default" className="text-xs" data-testid="badge-winning-strategy">
                                      <TrendingUp className="h-3 w-3 mr-1" />
                                      Winning Strategy
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">{scenario.description}</p>
                              </div>
                              <Button
                                size="lg"
                                variant="outline"
                                onClick={() => openImportDialog(scenario.id)}
                                data-testid={`button-import-scenario-${scenario.scenarioNumber}`}
                              >
                                <Download className="h-3 w-3 mr-1" />
                                Import
                              </Button>
                            </div>

                            <div className="flex items-center gap-6 p-3 bg-muted/50 rounded-md">
                              <div>
                                <p className="text-xs text-muted-foreground">Total P&L</p>
                                <p className={`text-lg font-mono font-bold ${parseFloat(scenario.totalProfitLoss) >= 0 ? 'text-success' : 'text-destructive'}`} data-testid={`text-pnl-${scenario.scenarioNumber}`}>
                                  {parseFloat(scenario.totalProfitLoss) >= 0 ? '+' : ''}${parseFloat(scenario.totalProfitLoss).toFixed(2)}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Return %</p>
                                <p className={`text-lg font-mono font-bold ${parseFloat(scenario.totalProfitLossPercent) >= 0 ? 'text-success' : 'text-destructive'}`}>
                                  {parseFloat(scenario.totalProfitLossPercent) >= 0 ? '+' : ''}{parseFloat(scenario.totalProfitLossPercent).toFixed(2)}%
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Win Rate</p>
                                <p className="text-lg font-medium">{parseFloat(scenario.winRate || 0).toFixed(0)}%</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Trades</p>
                                <p className="text-lg font-medium">{scenario.numberOfTrades}</p>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <p className="text-sm font-medium">Sell Conditions:</p>
                            <div className="space-y-1">
                              {scenario.sellConditions && scenario.sellConditions.map((condition: any, idx: number) => (
                                <div key={idx} className="text-sm text-muted-foreground flex items-center gap-2">
                                  <span className="font-mono text-xs px-2 py-0.5 bg-muted rounded">
                                    {condition.metric.replace(/_/g, ' ')} {condition.operator} {condition.value}
                                  </span>
                                  {condition.logic && idx < scenario.sellConditions.length - 1 && (
                                    <span className="text-xs font-medium text-primary">{condition.logic}</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>

                          {scenario.tradeDetails && scenario.tradeDetails.length > 0 && (
                            <Collapsible
                              open={expandedScenarios.has(scenario.id)}
                              onOpenChange={(open) => {
                                const newExpanded = new Set(expandedScenarios);
                                if (open) {
                                  newExpanded.add(scenario.id);
                                } else {
                                  newExpanded.delete(scenario.id);
                                }
                                setExpandedScenarios(newExpanded);
                              }}
                            >
                              <CollapsibleTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="lg"
                                  className="w-full mt-2 justify-between"
                                  data-testid={`button-toggle-trades-${scenario.scenarioNumber}`}
                                >
                                  <span className="text-xs font-medium">View Individual Trades ({scenario.tradeDetails.length})</span>
                                  {expandedScenarios.has(scenario.id) ? (
                                    <ChevronUp className="h-3 w-3" />
                                  ) : (
                                    <ChevronDown className="h-3 w-3" />
                                  )}
                                </Button>
                              </CollapsibleTrigger>
                              <CollapsibleContent className="mt-2 space-y-2">
                                <div className="border rounded-md overflow-x-auto">
                                  <table className="w-full text-xs">
                                    <thead className="bg-muted">
                                      <tr>
                                        <th className="px-2 py-1 text-left font-medium">Ticker</th>
                                        <th className="px-2 py-1 text-left font-medium">Buy Date</th>
                                        <th className="px-2 py-1 text-right font-medium">Buy Price</th>
                                        <th className="px-2 py-1 text-left font-medium">Sell Date</th>
                                        <th className="px-2 py-1 text-right font-medium">Sell Price</th>
                                        <th className="px-2 py-1 text-right font-medium">P&L</th>
                                        <th className="px-2 py-1 text-right font-medium">Return %</th>
                                        <th className="px-2 py-1 text-left font-medium">Sell Reason</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {scenario.tradeDetails.map((trade: any, tradeIdx: number) => (
                                        <tr key={tradeIdx} className="border-t" data-testid={`trade-row-${scenario.scenarioNumber}-${tradeIdx}`}>
                                          <td className="px-2 py-1.5 font-medium">{trade.ticker}</td>
                                          <td className="px-2 py-1.5 text-muted-foreground">{new Date(trade.buyDate).toLocaleDateString()}</td>
                                          <td className="px-2 py-1.5 text-right font-mono">${trade.buyPrice.toFixed(2)}</td>
                                          <td className="px-2 py-1.5 text-muted-foreground">{new Date(trade.sellDate).toLocaleDateString()}</td>
                                          <td className="px-2 py-1.5 text-right font-mono">${trade.sellPrice.toFixed(2)}</td>
                                          <td className={`px-2 py-1.5 text-right font-mono font-medium ${trade.profitLoss >= 0 ? 'text-success' : 'text-destructive'}`}>
                                            {trade.profitLoss >= 0 ? '+' : ''}${trade.profitLoss.toFixed(2)}
                                          </td>
                                          <td className={`px-2 py-1.5 text-right font-mono ${trade.profitLossPercent >= 0 ? 'text-success' : 'text-destructive'}`}>
                                            {trade.profitLossPercent >= 0 ? '+' : ''}{trade.profitLossPercent.toFixed(2)}%
                                          </td>
                                          <td className="px-2 py-1.5 text-muted-foreground text-xs" data-testid={`text-reason-${scenario.scenarioNumber}-${tradeIdx}`}>
                                            {trade.reason || 'N/A'}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Scenario as Trading Rule</DialogTitle>
            <DialogDescription>
              Choose whether to apply this rule to all holdings or a specific stock.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <RadioGroup value={importScope} onValueChange={(value) => setImportScope(value as "all_holdings" | "specific_stock")}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all_holdings" id="all_holdings" data-testid="radio-all-holdings" />
                <Label htmlFor="all_holdings" className="cursor-pointer">Apply to all holdings</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="specific_stock" id="specific_stock" data-testid="radio-specific-stock" />
                <Label htmlFor="specific_stock" className="cursor-pointer">Apply to specific stock</Label>
              </div>
            </RadioGroup>

            {importScope === "specific_stock" && (
              <div className="space-y-2">
                <Label htmlFor="ticker-select">Select Stock</Label>
                <Select value={importTicker} onValueChange={setImportTicker}>
                  <SelectTrigger id="ticker-select" data-testid="select-ticker">
                    <SelectValue placeholder="Choose a stock..." />
                  </SelectTrigger>
                  <SelectContent>
                    {stocks?.map((stock) => (
                      <SelectItem key={stock.ticker} value={stock.ticker}>
                        {stock.ticker}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setImportDialogOpen(false)}
              disabled={importScenarioMutation.isPending}
              data-testid="button-cancel-import"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleImportConfirm}
              disabled={importScenarioMutation.isPending}
              data-testid="button-confirm-import"
            >
              {importScenarioMutation.isPending ? (
                <>
                  <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                "Import Rule"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
