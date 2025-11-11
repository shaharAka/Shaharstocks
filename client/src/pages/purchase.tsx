import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Building2,
  Globe,
  Newspaper,
  ExternalLink,
  AlertTriangle,
  Wifi,
  WifiOff,
  FlaskConical,
  MessageSquare,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type Stock, type User, type StockInterestWithUser } from "@shared/schema";

// Extended Stock type with user status and analysis job progress
type StockWithUserStatus = Stock & {
  userStatus: string;
  userApprovedAt?: Date | null;
  userRejectedAt?: Date | null;
  userDismissedAt?: Date | null;
  analysisJob?: {
    status: string;
    currentStep: string | null;
    stepDetails: any;
    lastError: string | null;
    updatedAt: Date | null;
  } | null;
};
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { StockComments } from "@/components/stock-comments";
import { StockExplorer } from "@/components/stock-explorer";
import { StockTable } from "@/components/stock-table";
import { MiniCandlestickChart } from "@/components/mini-candlestick-chart";
import { StockAIAnalysis } from "@/components/stock-ai-analysis";
import { AnalysisPhaseIndicator } from "@/components/analysis-phase-indicator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { BulkActionToolbar } from "@/components/bulk-action-toolbar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { LayoutGrid, LayoutList, ArchiveRestore } from "lucide-react";
import { markPurchaseAsViewed } from "@/hooks/use-new-stocks-count";
import { useUser } from "@/contexts/UserContext";

type RecommendationFilter = "all" | "buy" | "sell";
type InterestFilter = "all" | "multiple" | string; // "all", "multiple" (all users interested), or userId
type ViewMode = "cards" | "table";
type DaysFilter = "all" | "7" | "14" | "30" | "60";
type StockListTab = "pending" | "rejected";

interface IbkrStatus {
  connected: boolean;
  authenticated?: boolean;
  accountId?: string;
  isPaperTrading?: boolean;
  error?: string;
}

export default function Purchase() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { user: currentUser } = useUser();
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [approvalAction, setApprovalAction] = useState<"approve" | "reject">("approve");
  const [recommendationFilter, setRecommendationFilter] = useState<RecommendationFilter>("buy");
  const [purchasePrice, setPurchasePrice] = useState<string>("");
  const [purchaseQuantity, setPurchaseQuantity] = useState<string>("");
  const [expandedComments, setExpandedComments] = useState<string | null>(null);
  const [interestFilter, setInterestFilter] = useState<InterestFilter>("all");
  const [daysFilter, setDaysFilter] = useState<DaysFilter>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [explorerStock, setExplorerStock] = useState<Stock | null>(null);
  const [explorerOpen, setExplorerOpen] = useState(false);
  const [selectedTickers, setSelectedTickers] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<StockListTab>("pending");

  // Selection handlers
  const toggleSelection = (ticker: string) => {
    setSelectedTickers((prev) => {
      const next = new Set(prev);
      if (next.has(ticker)) {
        next.delete(ticker);
      } else {
        next.add(ticker);
      }
      return next;
    });
  };

  const selectAll = (tickers: string[]) => {
    setSelectedTickers(new Set(tickers));
  };

  const clearSelection = () => {
    setSelectedTickers(new Set());
  };

  // Mark page as viewed when component mounts to reset "new stocks" badge
  useEffect(() => {
    markPurchaseAsViewed();
  }, []);

  const { data: stocks, isLoading, error, refetch: refetchStocks } = useQuery<StockWithUserStatus[]>({
    queryKey: ["/api/stocks/with-user-status"],
    queryFn: async () => {
      console.log("[Frontend] Fetching stocks with user status...");
      const response = await fetch("/api/stocks/with-user-status");
      console.log("[Frontend] Response status:", response.status);
      console.log("[Frontend] Response ok:", response.ok);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("[Frontend] API Error:", errorText);
        throw new Error(`Failed to fetch: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      console.log("[Frontend] API returned:", data?.length || 0, "stocks");
      return data;
    }
  });

  // Debug logging
  useEffect(() => {
    console.log("[Frontend] currentUser:", currentUser?.email);
    console.log("[Frontend] stocks data:", stocks?.length || 0);
    console.log("[Frontend] isLoading:", isLoading);
    console.log("[Frontend] error:", error);
    console.log("[Frontend] After filter - pending stocks:", stocks?.filter(s => s.userStatus === "pending").length || 0);
    if (stocks && stocks.length > 0) {
      console.log("[Frontend] Sample stock:", {
        ticker: stocks[0].ticker,
        userStatus: stocks[0].userStatus,
        recommendation: stocks[0].recommendation
      });
    }
  }, [stocks, isLoading, error, currentUser]);

  // Query for rejected stocks
  const { data: rejectedStocks, isLoading: rejectedLoading, refetch: refetchRejected } = useQuery<Stock[]>({
    queryKey: ["/api/stocks", "rejected"],
    queryFn: async () => {
      const res = await fetch("/api/stocks?status=rejected");
      if (!res.ok) throw new Error("Failed to fetch rejected stocks");
      return await res.json();
    },
  });

  // Unreject mutation
  const unrejectMutation = useMutation({
    mutationFn: async (ticker: string) => {
      const response = await apiRequest("PATCH", `/api/stocks/${ticker}/unreject`, {});
      return await response.json();
    },
    onSuccess: async (data) => {
      // Use refetchQueries to force immediate refetch instead of just invalidating
      await queryClient.refetchQueries({ queryKey: ["/api/stocks", "rejected"] });
      await queryClient.refetchQueries({ queryKey: ["/api/stocks/with-user-status"] });
      
      // Switch to pending tab so user can see the restored stock
      setActiveTab("pending");
      
      toast({
        title: "Stock Restored",
        description: `${data.stock.ticker} has been restored to pending recommendations`,
      });
    },
    onError: () => {
      toast({
        title: "Restore Failed",
        description: "Unable to restore stock. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Determine if we should poll based on active jobs
  const hasActiveJobs = stocks?.some(s => 
    s.analysisJob?.status === "processing" || s.analysisJob?.status === "pending"
  ) || false;

  // Poll every 5 seconds when there are active jobs
  useEffect(() => {
    if (!hasActiveJobs) return;

    const interval = setInterval(() => {
      refetchStocks();
    }, 5000);

    return () => clearInterval(interval);
  }, [hasActiveJobs, refetchStocks]);

  // Track previous job statuses for notifications
  const [prevJobStatuses, setPrevJobStatuses] = useState<Record<string, string>>({});

  // Show toast notifications when analysis jobs complete or fail
  useEffect(() => {
    if (!stocks) return;

    let hasChanges = false;
    const newStatuses: Record<string, string> = {};

    stocks.forEach(stock => {
      const prevStatus = prevJobStatuses[stock.ticker];
      const currentStatus = stock.analysisJob?.status;

      if (currentStatus) {
        newStatuses[stock.ticker] = currentStatus;
      }

      // Only notify on status transitions
      if (prevStatus && prevStatus !== currentStatus) {
        hasChanges = true;
        
        if (currentStatus === "completed") {
          toast({
            title: `${stock.ticker} Analysis Complete`,
            description: `AI analysis finished with score ${stock.confidenceScore || 'N/A'}/100`,
          });
        } else if (currentStatus === "failed") {
          toast({
            title: `${stock.ticker} Analysis Failed`,
            description: stock.analysisJob?.lastError || "An error occurred during analysis",
            variant: "destructive",
          });
        }
      }
      
      // Check if we have a new status that wasn't tracked before
      if (!prevStatus && currentStatus) {
        hasChanges = true;
      }
    });

    // Only update state if there are actual changes
    if (hasChanges) {
      setPrevJobStatuses(newStatuses);
    }
  }, [stocks, toast, prevJobStatuses]);

  const { data: ibkrStatus } = useQuery<IbkrStatus>({
    queryKey: ["/api/ibkr/status"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: allInterests = [] } = useQuery<StockInterestWithUser[]>({
    queryKey: ["/api/stock-interests"],
  });

  const { data: commentCounts = [] } = useQuery<{ ticker: string; count: number }[]>({
    queryKey: ["/api/stock-comment-counts"],
  });

  const { data: analyses = [] } = useQuery<any[]>({
    queryKey: ["/api/stock-analyses"],
  });

  // Fetch viewed stocks for current user
  const { data: viewedTickers = [] } = useQuery<string[]>({
    queryKey: ["/api/stock-views", currentUser?.id],
    enabled: !!currentUser,
  });

  const refreshAllMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/stocks/refresh-all", {});
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/stocks/with-user-status"] });
      toast({
        title: "Stock Data Refreshed",
        description: `Updated ${data.success} stocks with current market prices`,
      });
    },
    onError: () => {
      toast({
        title: "Refresh Failed",
        description: "Unable to fetch market data. Please try again later.",
        variant: "destructive",
      });
    },
  });

  const bulkAnalyzeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/stocks/analyze-all", {});
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "AI Analysis Started",
        description: data.message || `Analyzing ${data.total} stocks in the background...`,
      });
      // Refetch analyses after a delay to show results
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/stock-analyses"] });
      }, 3000);
    },
    onError: () => {
      toast({
        title: "Analysis Failed",
        description: "Unable to start AI analysis. Please try again.",
        variant: "destructive",
      });
    },
  });

  const toggleInterestMutation = useMutation({
    mutationFn: async ({ ticker, isMarked }: { ticker: string; isMarked: boolean }) => {
      if (isMarked) {
        const response = await fetch(`/api/stocks/${ticker}/interests`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        });
        if (!response.ok) throw new Error("Failed to remove interest");
      } else {
        const response = await fetch(`/api/stocks/${ticker}/interests`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        if (!response.ok) throw new Error("Failed to add interest");
        return await response.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stock-interests"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update interest status.",
        variant: "destructive",
      });
    },
  });

  const markViewedMutation = useMutation({
    mutationFn: async ({ ticker }: { ticker: string }) => {
      const response = await fetch(`/api/stocks/${ticker}/view`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to mark as viewed");
      return await response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/stock-views", currentUser?.id] });
    },
  });

  const handleRecommendationMutation = useMutation({
    mutationFn: async ({ ticker, action, price, quantity }: { ticker: string; action: "approve" | "reject"; price?: number; quantity?: number }) => {
      const endpoint = action === "approve" 
        ? `/api/stocks/${ticker}/approve` 
        : `/api/stocks/${ticker}/reject`;
      const body = action === "approve" ? { price, quantity } : null;
      const response = await apiRequest("POST", endpoint, body);
      return await response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/stocks/with-user-status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/holdings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trades"] });
      
      if (variables.action === "approve") {
        const broker = data.broker || "manual";
        const brokerText = broker === "ibkr" ? "via Interactive Brokers" : "manually";
        toast({
          title: "Recommendation Approved",
          description: `Successfully purchased ${selectedStock?.ticker} shares ${brokerText}`,
        });
      } else {
        toast({
          title: "Recommendation Rejected",
          description: `Rejected ${selectedStock?.ticker} purchase recommendation`,
        });
      }
      
      setConfirmDialogOpen(false);
      setSelectedStock(null);
    },
    onError: () => {
      toast({
        title: "Action Failed",
        description: "Unable to process recommendation. Please try again.",
        variant: "destructive",
      });
    },
  });

  const simulateMutation = useMutation({
    mutationFn: async (ticker: string) => {
      const response = await apiRequest("POST", `/api/stocks/${ticker}/simulate`, null);
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/trades"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/holdings"] });
      toast({
        title: "Simulation Created",
        description: data.message || `Created $1000 simulated trade for ${data.stock?.ticker}`,
      });
      // Redirect to simulation page
      setLocation("/simulation");
    },
    onError: () => {
      toast({
        title: "Simulation Failed",
        description: "Unable to create simulation. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Bulk action mutations
  const bulkApproveMutation = useMutation({
    mutationFn: async (tickers: string[]) => {
      const response = await apiRequest("POST", "/api/stocks/bulk-approve", { tickers });
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/stocks/with-user-status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/holdings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trades"] });
      toast({
        title: "Bulk Approval Complete",
        description: `Successfully approved ${data.success || selectedTickers.size} stock purchases`,
      });
      clearSelection();
    },
    onError: () => {
      toast({
        title: "Bulk Approval Failed",
        description: "Unable to approve stocks. Please try again.",
        variant: "destructive",
      });
    },
  });

  const bulkRejectMutation = useMutation({
    mutationFn: async (tickers: string[]) => {
      console.log("[FRONTEND] Bulk reject mutation called with tickers:", tickers);
      const response = await apiRequest("POST", "/api/stocks/bulk-reject", { tickers });
      console.log("[FRONTEND] Bulk reject response status:", response.status);
      const data = await response.json();
      console.log("[FRONTEND] Bulk reject response data:", data);
      return data;
    },
    onSuccess: async (data) => {
      console.log("[FRONTEND] Bulk reject success, invalidating queries and refetching");
      await queryClient.invalidateQueries({ queryKey: ["/api/stocks/with-user-status"] });
      await refetchStocks();
      console.log("[FRONTEND] Refetch complete");
      toast({
        title: "Bulk Rejection Complete",
        description: `Successfully rejected ${data.success || selectedTickers.size} recommendations`,
      });
      clearSelection();
    },
    onError: (error) => {
      console.log("[FRONTEND] Bulk reject error:", error);
      toast({
        title: "Bulk Rejection Failed",
        description: "Unable to reject recommendations. Please try again.",
        variant: "destructive",
      });
    },
  });

  const bulkRefreshMutation = useMutation({
    mutationFn: async (tickers: string[]) => {
      const response = await apiRequest("POST", "/api/stocks/bulk-refresh", { tickers });
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/stocks/with-user-status"] });
      toast({
        title: "Bulk Refresh Complete",
        description: `Updated ${data.success || selectedTickers.size} stocks with current prices`,
      });
    },
    onError: () => {
      toast({
        title: "Bulk Refresh Failed",
        description: "Unable to refresh stock data. Please try again.",
        variant: "destructive",
      });
    },
  });

  const bulkAnalyzeMutationSelected = useMutation({
    mutationFn: async (tickers: string[]) => {
      const response = await apiRequest("POST", "/api/stocks/bulk-analyze", { tickers });
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Bulk Analysis Started",
        description: `Analyzing ${data.total || selectedTickers.size} stocks in the background...`,
      });
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/stock-analyses"] });
      }, 3000);
    },
    onError: () => {
      toast({
        title: "Bulk Analysis Failed",
        description: "Unable to start AI analysis. Please try again.",
        variant: "destructive",
      });
    },
  });

  const bulkSimulateMutation = useMutation({
    mutationFn: async (tickers: string[]) => {
      const response = await apiRequest("POST", "/api/stocks/bulk-simulate", { tickers });
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Simulated Positions Created",
        description: `Added ${data.created} stocks to the Simulation page for real-time what-if trading.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/holdings", "simulated"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trades", "simulated"] });
      clearSelection();
    },
    onError: () => {
      toast({
        title: "Simulation Failed",
        description: "Unable to create simulated positions. Please try again.",
        variant: "destructive",
      });
    },
  });

  const openConfirmDialog = (stock: Stock, action: "approve" | "reject") => {
    setSelectedStock(stock);
    setApprovalAction(action);
    // Initialize purchase price with current stock price and default quantity
    if (action === "approve") {
      setPurchasePrice(stock.currentPrice);
      setPurchaseQuantity("10");
    }
    setConfirmDialogOpen(true);
  };

  const handleConfirm = () => {
    if (!selectedStock) return;
    
    // For approve action, validate and parse the inputs
    if (approvalAction === "approve") {
      const price = parseFloat(purchasePrice);
      const quantity = parseInt(purchaseQuantity);
      
      if (isNaN(price) || price <= 0) {
        toast({
          title: "Invalid Price",
          description: "Please enter a valid purchase price",
          variant: "destructive",
        });
        return;
      }
      
      if (isNaN(quantity) || quantity <= 0) {
        toast({
          title: "Invalid Quantity",
          description: "Please enter a valid quantity (whole number)",
          variant: "destructive",
        });
        return;
      }
      
      handleRecommendationMutation.mutate({
        ticker: selectedStock.ticker,
        action: approvalAction,
        price,
        quantity,
      });
    } else {
      handleRecommendationMutation.mutate({
        ticker: selectedStock.ticker,
        action: approvalAction,
      });
    }
  };

  // Bulk action handlers
  const handleBulkApprove = () => {
    if (selectedTickers.size === 0) return;
    bulkApproveMutation.mutate(Array.from(selectedTickers));
  };

  const handleBulkReject = () => {
    if (selectedTickers.size === 0) return;
    bulkRejectMutation.mutate(Array.from(selectedTickers));
  };

  const handleBulkMarkInterest = () => {
    if (selectedTickers.size === 0) return;
    // For now, just show a toast - we can enhance this later to select which user
    toast({
      title: "Feature Coming Soon",
      description: "Bulk mark interest will be available soon",
    });
  };

  const handleBulkRefresh = () => {
    if (selectedTickers.size === 0) return;
    bulkRefreshMutation.mutate(Array.from(selectedTickers));
  };

  const handleBulkAnalyze = () => {
    if (selectedTickers.size === 0) return;
    bulkAnalyzeMutationSelected.mutate(Array.from(selectedTickers));
  };

  const handleBulkSimulate = () => {
    if (selectedTickers.size === 0) return;
    bulkSimulateMutation.mutate(Array.from(selectedTickers));
  };

  const getRecommendationColor = (rec: string | null) => {
    if (!rec) return "secondary";
    const lower = rec.toLowerCase();
    if (lower.includes("strong_buy") || lower === "strong buy") return "default";
    if (lower.includes("buy")) return "default";
    if (lower.includes("hold")) return "secondary";
    if (lower.includes("sell")) return "destructive";
    return "secondary";
  };

  const getRecommendationText = (rec: string | null) => {
    if (!rec) return "N/A";
    return rec.replace("_", " ").toUpperCase();
  };

  const getRecommendationIcon = (rec: string | null) => {
    if (!rec) return null;
    const lower = rec.toLowerCase();
    if (lower.includes("buy")) return <ArrowUpRight className="h-3 w-3" />;
    if (lower.includes("sell")) return <ArrowDownRight className="h-3 w-3" />;
    return <Clock className="h-3 w-3" />;
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
    
    // Parse DD.MM.YYYY format (e.g., "29.10.2025")
    const dateParts = insiderTradeDate.split(' ')[0].split('.');
    if (dateParts.length >= 3) {
      const day = parseInt(dateParts[0], 10);
      const month = parseInt(dateParts[1], 10) - 1; // JS months are 0-indexed
      const year = parseInt(dateParts[2], 10);
      const tradeDate = new Date(year, month, day);
      const now = new Date();
      const daysDiff = Math.floor((now.getTime() - tradeDate.getTime()) / (1000 * 60 * 60 * 24));
      return daysDiff;
    }
    
    // Fallback to standard parsing
    const tradeDate = new Date(insiderTradeDate);
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - tradeDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff;
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-4 md:gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-24 mb-2" />
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const getMarketCapValue = (marketCapStr: string | null): number => {
    if (!marketCapStr) return 0;
    // Parse "$1234M" format
    const match = marketCapStr.match(/\$?([\d.]+)M?/i);
    if (match) {
      return parseFloat(match[1]);
    }
    return 0;
  };

  const allPendingRecommendations = stocks?.filter(
    stock => 
      stock.userStatus === "pending" &&
      stock.recommendation && 
      (stock.recommendation.toLowerCase().includes("buy") || 
       stock.recommendation.toLowerCase().includes("sell"))
  ) || [];

  const pendingRecommendations = allPendingRecommendations.filter(stock => {
    // Filter by recommendation type
    if (recommendationFilter !== "all") {
      if (recommendationFilter === "buy" && !stock.recommendation?.toLowerCase().includes("buy")) return false;
      if (recommendationFilter === "sell" && !stock.recommendation?.toLowerCase().includes("sell")) return false;
    }
    
    // Filter by interest
    if (interestFilter !== "all") {
      const stockInterests = allInterests.filter(i => i.ticker === stock.ticker);
      
      if (interestFilter === "multiple") {
        // Show stocks where ALL users are interested
        const allUsersInterested = users.every(user => 
          stockInterests.some(i => i.userId === user.id)
        );
        if (!allUsersInterested) return false;
      } else {
        // Filter by specific user ID
        const userInterested = stockInterests.some(i => i.userId === interestFilter);
        if (!userInterested) return false;
      }
    }
    
    // Filter by days since insider purchase
    if (daysFilter !== "all" && stock.insiderTradeDate) {
      const daysSincePurchase = getDaysFromBuy(stock.insiderTradeDate);
      const maxDays = parseInt(daysFilter);
      if (daysSincePurchase > maxDays) return false;
    }
    
    // Automatically exclude small cap stocks (< $500M)
    const marketCapInMillions = getMarketCapValue(stock.marketCap);
    if (marketCapInMillions > 0 && marketCapInMillions < 500) {
      return false;
    }
    
    // Filter out likely options deals and data errors: 
    // insider price should be between 15% and 200% of current price
    if (stock.insiderPrice && stock.currentPrice) {
      const insiderPrice = parseFloat(stock.insiderPrice);
      const currentPrice = parseFloat(stock.currentPrice);
      if (insiderPrice > 0 && currentPrice > 0) {
        const ratio = insiderPrice / currentPrice;
        // Filter out if ratio is too low (< 0.15) or too high (> 2.0)
        if (ratio < 0.15 || ratio > 2.0) {
          return false;
        }
      }
    }
    
    return true;
  });

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getStockInterests = (ticker: string) => {
    return allInterests.filter(i => i.ticker === ticker);
  };

  const getCommentCount = (ticker: string) => {
    return commentCounts.find(c => c.ticker === ticker)?.count || 0;
  };

  const getAIAnalysis = (ticker: string) => {
    return analyses.find(a => a.ticker === ticker);
  };

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 max-w-screen-2xl mx-auto">
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold mb-1" data-testid="text-page-title">
              Purchase Recommendations
            </h1>
            <p className="text-sm text-muted-foreground">
              Review and approve stock recommendations from the Telegram channel
            </p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <Button
              variant="outline"
              size="lg"
              onClick={() => refreshAllMutation.mutate()}
              disabled={refreshAllMutation.isPending}
              data-testid="button-refresh-all"
              className="hidden sm:flex"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshAllMutation.isPending ? "animate-spin" : ""}`} />
              {refreshAllMutation.isPending ? "Refreshing..." : "Refresh Market Data"}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => refreshAllMutation.mutate()}
              disabled={refreshAllMutation.isPending}
              data-testid="button-refresh-all-mobile"
              className="sm:hidden h-11 w-11"
            >
              <RefreshCw className={`h-4 w-4 ${refreshAllMutation.isPending ? "animate-spin" : ""}`} />
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => bulkAnalyzeMutation.mutate()}
              disabled={bulkAnalyzeMutation.isPending}
              data-testid="button-analyze-all"
              className="hidden sm:flex"
            >
              <Sparkles className={`h-4 w-4 mr-2 ${bulkAnalyzeMutation.isPending ? "animate-spin" : ""}`} />
              {bulkAnalyzeMutation.isPending ? "Analyzing..." : "Run AI Analysis"}
            </Button>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 md:gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <div className="flex gap-1 flex-wrap">
              <Button
                variant={recommendationFilter === "buy" ? "default" : "outline"}
                size="lg"
                onClick={() => setRecommendationFilter("buy")}
                data-testid="button-filter-buy"
                className="toggle-elevate"
              >
                <ArrowUpRight className="h-3 w-3 mr-1" />
                Buy
              </Button>
              <Button
                variant={recommendationFilter === "sell" ? "default" : "outline"}
                size="lg"
                onClick={() => setRecommendationFilter("sell")}
                data-testid="button-filter-sell"
                className="toggle-elevate"
              >
                <ArrowDownRight className="h-3 w-3 mr-1" />
                Sell
              </Button>
              <Button
                variant={recommendationFilter === "all" ? "default" : "outline"}
                size="lg"
                onClick={() => setRecommendationFilter("all")}
                data-testid="button-filter-all"
                className="toggle-elevate"
              >
                All
              </Button>
            </div>
          </div>
          <Select value={interestFilter} onValueChange={(value: InterestFilter) => setInterestFilter(value)}>
            <SelectTrigger className="w-full sm:w-48" data-testid="select-interest-filter">
              <SelectValue placeholder="Filter by interest" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stocks</SelectItem>
              <SelectItem value="multiple">All Users Interested</SelectItem>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name} Interested
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={daysFilter} onValueChange={(value: DaysFilter) => setDaysFilter(value)}>
            <SelectTrigger className="w-full sm:w-48" data-testid="select-days-filter">
              <SelectValue placeholder="Filter by days" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any Time</SelectItem>
              <SelectItem value="7">Last 7 Days</SelectItem>
              <SelectItem value="14">Last 14 Days</SelectItem>
              <SelectItem value="30">Last 30 Days</SelectItem>
              <SelectItem value="60">Last 60 Days</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-1">
            <Button
              variant={viewMode === "table" ? "default" : "outline"}
              size="lg"
              onClick={() => setViewMode("table")}
              data-testid="button-view-table"
              className="toggle-elevate"
            >
              <LayoutList className="h-4 w-4 mr-2" />
              Table
            </Button>
            <Button
              variant={viewMode === "cards" ? "default" : "outline"}
              size="lg"
              onClick={() => setViewMode("cards")}
              data-testid="button-view-cards"
              className="toggle-elevate"
            >
              <LayoutGrid className="h-4 w-4 mr-2" />
              Cards
            </Button>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => {
        setActiveTab(value as StockListTab);
        clearSelection();
      }} className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending" data-testid="tab-pending">
            Pending ({allPendingRecommendations.length})
          </TabsTrigger>
          <TabsTrigger value="rejected" data-testid="tab-rejected">
            <ArchiveRestore className="h-4 w-4 mr-2" />
            Rejected ({rejectedStocks?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4 mt-4">
          <BulkActionToolbar
            selectedCount={selectedTickers.size}
            onClear={clearSelection}
            onApprove={handleBulkApprove}
            onReject={handleBulkReject}
            onMarkInterest={handleBulkMarkInterest}
            onRefresh={handleBulkRefresh}
            onAnalyze={handleBulkAnalyze}
            onSimulate={handleBulkSimulate}
            isSimulating={bulkSimulateMutation.isPending}
          />

          {pendingRecommendations.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2" data-testid="text-no-recommendations">No Pending Recommendations</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Stock recommendations from the Telegram channel will appear here
            </p>
          </div>
        </Card>
      ) : viewMode === "table" ? (
        <StockTable
          stocks={pendingRecommendations}
          users={users}
          interests={allInterests}
          commentCounts={commentCounts}
          analyses={analyses}
          selectedTickers={selectedTickers}
          onToggleSelection={toggleSelection}
          onSelectAll={selectAll}
          viewedTickers={viewedTickers}
          onStockClick={(stock) => {
            setExplorerStock(stock);
            setExplorerOpen(true);
            // Mark stock as viewed when clicked
            if (currentUser) {
              markViewedMutation.mutate({ ticker: stock.ticker });
            }
          }}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {pendingRecommendations.map((stock) => {
            const currentPrice = parseFloat(stock.currentPrice);
            const previousPrice = parseFloat(stock.previousClose || stock.currentPrice);
            const priceChange = currentPrice - previousPrice;
            const priceChangePercent = (priceChange / previousPrice) * 100;
            const isPositive = priceChange >= 0;

            // Insider transaction details
            const insiderPrice = stock.insiderPrice ? parseFloat(stock.insiderPrice) : currentPrice;
            const insiderQuantity = stock.insiderQuantity || 0;
            const priceDiff = currentPrice - insiderPrice;
            const priceDiffPercent = insiderPrice > 0 ? (priceDiff / insiderPrice) * 100 : 0;
            const isProfitable = priceDiff >= 0;

            const stockInterests = getStockInterests(stock.ticker);
            const analysis = getAIAnalysis(stock.ticker);

            return (
              <Card 
                key={stock.id} 
                className="hover-elevate cursor-pointer relative" 
                data-testid={`card-stock-${stock.ticker}`}
                onClick={() => {
                  setExplorerStock(stock);
                  setExplorerOpen(true);
                  // Mark stock as viewed when clicked
                  if (currentUser) {
                    markViewedMutation.mutate({ ticker: stock.ticker });
                  }
                }}
              >
                <div 
                  className="absolute top-2 right-2 z-10" 
                  onClick={(e) => e.stopPropagation()}
                >
                  <Checkbox
                    checked={selectedTickers.has(stock.ticker)}
                    onCheckedChange={() => toggleSelection(stock.ticker)}
                    aria-label={`Select ${stock.ticker}`}
                    data-testid={`checkbox-card-${stock.ticker}`}
                  />
                </div>
                <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2 pr-10">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <CardTitle className="text-lg font-semibold" data-testid={`text-ticker-${stock.ticker}`}>
                        {stock.ticker}
                      </CardTitle>
                      {isNewStock(stock.ticker, stock.insiderTradeDate) && (
                        <Badge variant="default" className="text-xs px-1.5 py-0" data-testid={`badge-new-${stock.ticker}`}>
                          NEW
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="text-xs line-clamp-1" data-testid={`text-company-${stock.ticker}`}>
                      {stock.companyName}
                    </CardDescription>
                  </div>
                  {stock.recommendation && (
                    <Badge
                      variant={getRecommendationColor(stock.recommendation)}
                      className="text-xs shrink-0"
                      data-testid={`badge-recommendation-${stock.ticker}`}
                    >
                      {getRecommendationIcon(stock.recommendation)}
                    </Badge>
                  )}
                </CardHeader>
                <CardContent className="space-y-3 pb-3">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-mono font-semibold" data-testid={`text-price-${stock.ticker}`}>
                      ${currentPrice.toFixed(2)}
                    </span>
                    <div
                      className={`flex items-center gap-1 ${
                        isPositive ? "text-success" : "text-destructive"
                      }`}
                      data-testid={`text-change-${stock.ticker}`}
                    >
                      {isPositive ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      <span className="text-sm font-mono font-medium">
                        {isPositive ? "+" : ""}
                        {priceChangePercent.toFixed(2)}%
                      </span>
                    </div>
                  </div>

                  {stock.insiderPrice && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Insider @ ${parseFloat(stock.insiderPrice).toFixed(2)}</span>
                      <span className={`font-mono text-sm ${isProfitable ? "text-success" : "text-destructive"}`} data-testid={`text-price-diff-${stock.ticker}`}>
                        {isProfitable ? "+" : ""}{priceDiffPercent.toFixed(1)}%
                      </span>
                    </div>
                  )}

                  {stock.insiderTradeDate && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground" data-testid={`text-days-from-buy-${stock.ticker}`}>
                      <Clock className="h-3 w-3" />
                      <span>{getDaysFromBuy(stock.insiderTradeDate)} days from buy</span>
                    </div>
                  )}

                  {stock.candlesticks && stock.candlesticks.length > 0 && (
                    <div className="-mx-2" data-testid={`chart-candlestick-${stock.ticker}`}>
                      <MiniCandlestickChart data={stock.candlesticks} height={50} />
                    </div>
                  )}

                  {stock.marketCap && (
                    <div className="text-xs text-muted-foreground" data-testid={`text-marketcap-${stock.ticker}`}>
                      {stock.marketCap} market cap
                    </div>
                  )}

                  {analysis && (
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
                      {analysis.status === "analyzing" ? (
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs" data-testid={`badge-ai-analyzing-${stock.ticker}`}>
                            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                            Analyzing...
                          </Badge>
                          <AnalysisPhaseIndicator
                            microCompleted={stock.microAnalysisCompleted}
                            macroCompleted={stock.macroAnalysisCompleted}
                            combinedCompleted={stock.combinedAnalysisCompleted}
                            currentPhase={stock.analysisJob?.currentStep as "data_fetch" | "macro_analysis" | "micro_analysis" | "integration" | "complete" | null | undefined}
                            size="sm"
                          />
                        </div>
                      ) : analysis.status === "failed" ? (
                        <div className="flex items-center gap-2">
                          <Badge variant="destructive" className="text-xs" data-testid={`badge-ai-failed-${stock.ticker}`}>
                            Analysis Failed
                          </Badge>
                          {stock.analysisJob?.lastError && (
                            <span className="text-[10px] text-destructive truncate max-w-[200px]" title={stock.analysisJob.lastError}>
                              {stock.analysisJob.lastError}
                            </span>
                          )}
                        </div>
                      ) : (
                        <>
                          {(() => {
                            const score = analysis.integratedScore ?? analysis.confidenceScore ?? analysis.financialHealthScore;
                            const rating = analysis.overallRating;
                            let badgeVariant: "default" | "secondary" | "destructive" | "outline" = "secondary";
                            
                            if (rating === "buy" || rating === "strong_buy") badgeVariant = "default";
                            else if (rating === "avoid" || rating === "sell" || rating === "strong_avoid") badgeVariant = "destructive";
                            
                            return (
                              <div className="flex items-center gap-2">
                                <Badge variant={badgeVariant} className="text-xs font-mono" data-testid={`badge-ai-score-${stock.ticker}`}>
                                  {score}/100
                                </Badge>
                                {analysis.integratedScore && analysis.confidenceScore !== analysis.integratedScore && (
                                  <span className="text-[10px] text-muted-foreground">
                                    (micro: {analysis.confidenceScore})
                                  </span>
                                )}
                                <AnalysisPhaseIndicator
                                  microCompleted={stock.microAnalysisCompleted}
                                  macroCompleted={stock.macroAnalysisCompleted}
                                  combinedCompleted={stock.combinedAnalysisCompleted}
                                  size="sm"
                                />
                              </div>
                            );
                          })()}
                        </>
                      )}
                    </div>
                  )}

                  {(stockInterests.length > 0 || getCommentCount(stock.ticker) > 0) && (
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex gap-1">
                        {stockInterests.map((interest) => (
                          <Avatar
                            key={interest.id}
                            className="h-6 w-6"
                            style={{ backgroundColor: interest.user.avatarColor }}
                            data-testid={`avatar-interest-${stock.ticker}-${interest.user.name.toLowerCase()}`}
                          >
                            <AvatarFallback
                              className="text-white text-xs"
                              style={{ backgroundColor: interest.user.avatarColor }}
                            >
                              {getInitials(interest.user.name)}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                      </div>
                      {getCommentCount(stock.ticker) > 0 && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <MessageSquare className="h-4 w-4" />
                          <span className="text-sm" data-testid={`text-comment-count-${stock.ticker}`}>
                            {getCommentCount(stock.ticker)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent data-testid="dialog-confirm">
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-title">
              {approvalAction === "approve" ? "Approve" : "Reject"} Recommendation
            </DialogTitle>
            <DialogDescription>
              {selectedStock?.ticker} - {selectedStock?.companyName}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="rounded-md bg-muted p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Stock</span>
                <span className="font-medium" data-testid="text-confirm-stock">
                  {selectedStock?.ticker}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Current Price</span>
                <span className="font-mono font-medium" data-testid="text-confirm-price">
                  ${selectedStock?.currentPrice}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Recommendation</span>
                <Badge
                  variant={getRecommendationColor(selectedStock?.recommendation || null)}
                  className="text-xs"
                  data-testid="badge-confirm-recommendation"
                >
                  {getRecommendationText(selectedStock?.recommendation || null)}
                </Badge>
              </div>
            </div>

            {approvalAction === "approve" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="purchase-price">Purchase Price ($)</Label>
                  <Input
                    id="purchase-price"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value)}
                    placeholder="Enter purchase price"
                    data-testid="input-purchase-price"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="purchase-quantity">Quantity (shares)</Label>
                  <Input
                    id="purchase-quantity"
                    type="number"
                    step="1"
                    min="1"
                    value={purchaseQuantity}
                    onChange={(e) => setPurchaseQuantity(e.target.value)}
                    placeholder="Enter number of shares"
                    data-testid="input-purchase-quantity"
                  />
                </div>
                <div className="rounded-md bg-muted p-3">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Estimated Total</span>
                    <span className="text-lg font-mono font-semibold" data-testid="text-confirm-total">
                      ${purchasePrice && purchaseQuantity ? 
                        (parseFloat(purchasePrice) * parseInt(purchaseQuantity)).toFixed(2) : "0.00"}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  This will add {purchaseQuantity || "0"} shares of {selectedStock?.ticker} to your portfolio at ${purchasePrice || "0.00"} per share.
                </p>
              </div>
            )}

            {approvalAction === "reject" && (
              <p className="text-sm text-muted-foreground">
                This recommendation will be marked as rejected and no purchase will be made.
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setConfirmDialogOpen(false)}
              data-testid="button-cancel-confirm"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant={approvalAction === "approve" ? "default" : "destructive"}
              className="flex-1"
              onClick={handleConfirm}
              disabled={handleRecommendationMutation.isPending}
              data-testid="button-execute-confirm"
            >
              {handleRecommendationMutation.isPending 
                ? "Processing..." 
                : approvalAction === "approve" 
                ? "Approve & Purchase" 
                : "Reject"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

        </TabsContent>

        <TabsContent value="rejected" className="space-y-4 mt-4">
          {rejectedLoading ? (
            <Card className="p-12">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Loading rejected stocks...</p>
              </div>
            </Card>
          ) : rejectedStocks && rejectedStocks.length === 0 ? (
            <Card className="p-12">
              <div className="text-center">
                <ArchiveRestore className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2" data-testid="text-no-rejected">No Rejected Stocks</h3>
                <p className="text-sm text-muted-foreground">
                  Stocks you reject will appear here for review
                </p>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              {rejectedStocks?.map((stock) => (
                <Card key={stock.ticker} className="hover-elevate">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg" data-testid={`text-ticker-${stock.ticker}`}>
                          {stock.ticker}
                        </CardTitle>
                        <CardDescription>{stock.companyName}</CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={() => unrejectMutation.mutate(stock.ticker)}
                        disabled={unrejectMutation.isPending}
                        data-testid={`button-restore-${stock.ticker}`}
                      >
                        <ArchiveRestore className="h-4 w-4 mr-2" />
                        Restore
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground mb-1">Current Price</p>
                        <p className="font-medium text-lg">${parseFloat(stock.currentPrice).toFixed(2)}</p>
                      </div>
                      {stock.insiderPrice && (
                        <div>
                          <p className="text-muted-foreground mb-1">Insider Price</p>
                          <p className="font-medium">${parseFloat(stock.insiderPrice).toFixed(2)}</p>
                        </div>
                      )}
                      {stock.marketCap && (
                        <div>
                          <p className="text-muted-foreground mb-1">Market Cap</p>
                          <p className="font-medium">{stock.marketCap}</p>
                        </div>
                      )}
                      {stock.rejectedAt && (
                        <div>
                          <p className="text-muted-foreground mb-1">Rejected</p>
                          <p className="font-medium text-xs">{new Date(stock.rejectedAt).toLocaleDateString()}</p>
                        </div>
                      )}
                    </div>
                    {stock.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{stock.description}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <StockExplorer
        stock={explorerStock}
        open={explorerOpen}
        onOpenChange={setExplorerOpen}
        onApprove={(stock) => {
          setExplorerOpen(false);
          openConfirmDialog(stock, "approve");
        }}
        onReject={(stock) => {
          setExplorerOpen(false);
          openConfirmDialog(stock, "reject");
        }}
        onSimulate={(ticker) => {
          setExplorerOpen(false);
          simulateMutation.mutate(ticker);
        }}
        users={users}
        interests={allInterests}
      />
    </div>
  );
}
