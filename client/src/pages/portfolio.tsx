import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Package,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { Tutorial } from "@/components/tutorial";
import { Onboarding } from "@/components/onboarding";
import { useUser } from "@/contexts/UserContext";
import { usePortfolioHoldings, useStocks, useTradingRules, useTrades } from "@/hooks/use-portfolio-data";
import { PortfolioOverview } from "@/components/portfolio/overview";
import { PortfolioManagement } from "@/components/portfolio/management";
import { PortfolioHistory } from "@/components/portfolio/history";
import { LineChart, Line, ResponsiveContainer } from "recharts";

export default function Portfolio() {
  const [activeTab, setActiveTab] = useState("overview");
  const { user } = useUser();
  const [showOnboarding, setShowOnboarding] = useState(!user?.hasSeenOnboarding);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  
  // Ensure onboarding dialog closes permanently once user has seen it
  useEffect(() => {
    if (user?.hasSeenOnboarding) {
      setShowOnboarding(false);
    }
  }, [user?.hasSeenOnboarding]);
  
  const { data: holdings, isLoading: holdingsLoading } = usePortfolioHoldings();
  const { data: stocks, isLoading: stocksLoading } = useStocks();
  const { data: rules, isLoading: rulesLoading } = useTradingRules();
  const { data: trades, isLoading: tradesLoading } = useTrades();

  // Calculate portfolio metrics
  const portfolioValue = holdings?.reduce(
    (sum, h) => sum + (parseFloat(h.currentValue || "0")),
    0
  ) || 0;

  const totalProfitLoss = holdings?.reduce(
    (sum, h) => sum + (parseFloat(h.profitLoss || "0")),
    0
  ) || 0;

  const totalProfitLossPercent = portfolioValue > 0 
    ? ((totalProfitLoss / (portfolioValue - totalProfitLoss)) * 100) 
    : 0;

  const isPositive = totalProfitLoss >= 0;

  // Mock sparkline data for portfolio
  const portfolioSparkline = [
    { value: portfolioValue * 0.92 },
    { value: portfolioValue * 0.94 },
    { value: portfolioValue * 0.91 },
    { value: portfolioValue * 0.96 },
    { value: portfolioValue * 0.98 },
    { value: portfolioValue },
  ];

  const isLoading = holdingsLoading || stocksLoading;

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32 mb-2" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <Onboarding 
        open={showOnboarding && !user?.hasSeenOnboarding} 
        onOpenChange={setShowOnboarding}
        onComplete={() => setOnboardingComplete(true)}
      />
      {/* Only show tutorial after onboarding is complete or if user has already seen it */}
      {(onboardingComplete || user?.hasSeenOnboarding) && (
        <Tutorial tutorialId="portfolio" />
      )}
      <div className="p-4 md:p-6 space-y-4 md:space-y-6 max-w-screen-2xl mx-auto">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold mb-1" data-testid="text-page-title">
            Portfolio
          </h1>
          <p className="text-sm text-muted-foreground">
            Track your investments, manage holdings, and view trade history
          </p>
        </div>

        {/* Portfolio Summary Cards */}
        <div className="grid gap-4 md:gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Portfolio Value
              </CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl md:text-3xl font-mono font-semibold" data-testid="text-portfolio-value">
                ${portfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="mt-2 md:mt-3 h-8 md:h-12">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={portfolioSparkline}>
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total P&L
              </CardTitle>
              {isPositive ? (
                <TrendingUp className="h-4 w-4 text-success" />
              ) : (
                <TrendingDown className="h-4 w-4 text-destructive" />
              )}
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl md:text-3xl font-mono font-semibold ${
                  isPositive ? "text-success" : "text-destructive"
                }`}
                data-testid="text-total-pl"
              >
                {isPositive ? "+" : ""}${Math.abs(totalProfitLoss).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="flex items-center gap-1 mt-1">
                {isPositive ? (
                  <ArrowUpRight className="h-4 w-4 text-success" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 text-destructive" />
                )}
                <span
                  className={`text-sm font-mono font-medium ${
                    isPositive ? "text-success" : "text-destructive"
                  }`}
                >
                  {isPositive ? "+" : ""}{totalProfitLossPercent.toFixed(2)}%
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Holdings
              </CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl md:text-3xl font-mono font-semibold" data-testid="text-holdings-count">
                {holdings?.length || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Active positions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Trades
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl md:text-3xl font-mono font-semibold">
                {trades?.length || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                All time transactions
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabbed Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 md:space-y-6">
          <TabsList className="w-full grid grid-cols-3" data-testid="tabs-portfolio">
            <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
            <TabsTrigger value="management" data-testid="tab-management">Management</TabsTrigger>
            <TabsTrigger value="history" data-testid="tab-history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 md:space-y-6" forceMount hidden={activeTab !== "overview"}>
            <PortfolioOverview 
              holdings={holdings || []} 
              stocks={stocks || []} 
              isLoading={isLoading}
            />
          </TabsContent>

          <TabsContent value="management" className="space-y-6" forceMount hidden={activeTab !== "management"}>
            <PortfolioManagement 
              holdings={holdings || []} 
              stocks={stocks || []} 
              rules={rules || []}
              isLoading={isLoading || rulesLoading}
            />
          </TabsContent>

          <TabsContent value="history" className="space-y-6" forceMount hidden={activeTab !== "history"}>
            <PortfolioHistory 
              trades={trades || []} 
              isLoading={tradesLoading}
            />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
