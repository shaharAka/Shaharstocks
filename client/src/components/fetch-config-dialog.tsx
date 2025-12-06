import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RefreshCw, Info, CheckCircle2, Clock, AlertTriangle, Lock, Crown, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type OpeninsiderConfig } from "@shared/schema";
import { useUser } from "@/contexts/UserContext";
import { useLocation } from "wouter";
import { formatDistanceToNow, addHours, addDays, differenceInMinutes, differenceInHours } from "date-fns";

export function FetchConfigDialog() {
  const { toast } = useToast();
  const { user } = useUser();
  const [, setLocation] = useLocation();

  // Subscription-based refresh limits
  const isTrialUser = user?.subscriptionStatus === "trial" || user?.subscriptionStatus === "pending_verification";
  const isPaidUser = user?.subscriptionStatus === "active";
  const lastDataRefresh = user?.lastDataRefresh ? new Date(user.lastDataRefresh) : null;
  
  // Calculate next refresh time and status
  const getRefreshStatus = () => {
    if (!lastDataRefresh) {
      return { canRefresh: true, nextRefreshTime: null, timeUntilRefresh: null };
    }
    
    const now = new Date();
    const nextRefresh = isPaidUser ? addHours(lastDataRefresh, 1) : addDays(lastDataRefresh, 1);
    const canRefresh = now >= nextRefresh;
    
    if (canRefresh) {
      return { canRefresh: true, nextRefreshTime: null, timeUntilRefresh: null };
    }
    
    const minutesRemaining = differenceInMinutes(nextRefresh, now);
    const hoursRemaining = differenceInHours(nextRefresh, now);
    
    let timeUntilRefresh: string;
    if (minutesRemaining < 60) {
      timeUntilRefresh = `${minutesRemaining} minute${minutesRemaining !== 1 ? 's' : ''}`;
    } else {
      timeUntilRefresh = `${hoursRemaining} hour${hoursRemaining !== 1 ? 's' : ''}`;
    }
    
    return { canRefresh: false, nextRefreshTime: nextRefresh, timeUntilRefresh };
  };
  
  const refreshStatus = getRefreshStatus();

  // Fetch current configuration
  const { data: config, isLoading } = useQuery<OpeninsiderConfig>({
    queryKey: ["/api/openinsider-config"],
    retry: false,
  });

  // Local state for form
  const [fetchInterval, setFetchInterval] = useState<"hourly" | "daily">(
    (config?.fetchInterval as "hourly" | "daily") || "daily"
  );
  const [minMarketCap, setMinMarketCap] = useState(config?.minMarketCap ?? 500);
  const [optionsDealThreshold, setOptionsDealThreshold] = useState(
    config?.optionsDealThresholdPercent ?? 15
  );
  const [fetchLimit, setFetchLimit] = useState(config?.fetchLimit || 50);
  const [minCommunityEngagement, setMinCommunityEngagement] = useState(
    config?.minCommunityEngagement ?? 10
  );

  // Sync with fetched config
  useEffect(() => {
    if (config) {
      // Trial users are always forced to daily refresh
      const effectiveInterval = isTrialUser ? "daily" : ((config.fetchInterval as "hourly" | "daily") || "daily");
      setFetchInterval(effectiveInterval);
      setMinMarketCap(config.minMarketCap ?? 500);
      setOptionsDealThreshold(config.optionsDealThresholdPercent ?? 15);
      setFetchLimit(config.fetchLimit || 50);
      setMinCommunityEngagement(config.minCommunityEngagement ?? 10);
    }
  }, [config, isTrialUser]);


  // Save configuration
  const saveConfigMutation = useMutation({
    mutationFn: async () => {
      // Force daily for trial users
      const effectiveInterval = isTrialUser ? "daily" : fetchInterval;
      
      const configRes = await apiRequest("POST", "/api/openinsider/config", {
        enabled: true,
        fetchInterval: effectiveInterval,
        minMarketCap,
        optionsDealThresholdPercent: optionsDealThreshold,
        fetchLimit,
        minCommunityEngagement,
        insiderTitles: config?.insiderTitles || null,
        minTransactionValue: config?.minTransactionValue || null,
        fetchPreviousDayOnly: config?.fetchPreviousDayOnly || false,
      });
      
      return await configRes.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/openinsider-config"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stocks"] });
      toast({
        title: "Settings saved",
        description: "Your fetch configuration has been updated",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save configuration",
        variant: "destructive",
      });
    },
  });

  // Manual fetch trigger
  const fetchNowMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/openinsider/fetch", {});
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/stocks/with-user-status"] });
      toast({
        title: "Fetch complete",
        description: data.message || "New opportunities have been fetched",
      });
    },
    onError: () => {
      toast({
        title: "Fetch failed",
        description: "Unable to fetch new opportunities",
        variant: "destructive",
      });
    },
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveConfigMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="space-y-2">
          <div className="h-6 w-48 bg-muted animate-pulse rounded" />
          <div className="h-4 w-64 bg-muted animate-pulse rounded" />
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 p-6">
      {/* Status Banner */}
      {config?.lastSync && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span className="text-sm">
              Last fetched: {new Date(config.lastSync).toLocaleString()}
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => fetchNowMutation.mutate()}
              disabled={fetchNowMutation.isPending}
            >
              <RefreshCw className={`h-3 w-3 mr-2 ${fetchNowMutation.isPending ? "animate-spin" : ""}`} />
              Fetch Now
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Core Settings */}
      <div className="space-y-6">
        <div>
          <div className="mb-4">
            <h3 className="text-lg font-semibold">Opportunity Scanning</h3>
            <p className="text-sm text-muted-foreground">
              Control how new insider trading opportunities are discovered
            </p>
          </div>

          <Separator className="my-4" />

          {/* Refresh Cadence */}
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <Label className="text-base font-medium">Refresh Frequency</Label>
                  {isTrialUser && (
                    <Badge variant="secondary" className="text-xs">
                      <Lock className="h-3 w-3 mr-1" />
                      Paid Feature
                    </Badge>
                  )}
                  <HoverCard>
                    <HoverCardTrigger>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </HoverCardTrigger>
                    <HoverCardContent className="w-80">
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm">How it works</h4>
                        <p className="text-xs text-muted-foreground">
                          We automatically scan SEC filings for new insider trades at your chosen interval. 
                          <strong className="text-foreground"> Hourly</strong> gives you the fastest alerts but uses more resources.
                          <strong className="text-foreground"> Daily</strong> is perfect for long-term investors.
                        </p>
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                </div>
                <p className="text-sm text-muted-foreground">
                  How often to check for new opportunities
                </p>
              </div>
              {isTrialUser ? (
                <Badge variant="outline" className="opacity-60">
                  <Clock className="h-3 w-3 mr-1" />
                  Daily Only
                </Badge>
              ) : (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={fetchInterval === "hourly" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFetchInterval("hourly")}
                  >
                    <Clock className="h-3 w-3 mr-1" />
                    Hourly
                  </Button>
                  <Button
                    type="button"
                    variant={fetchInterval === "daily" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFetchInterval("daily")}
                  >
                    <Clock className="h-3 w-3 mr-1" />
                    Daily
                  </Button>
                </div>
              )}
            </div>
            
            {/* Upgrade prompt for trial users */}
            {isTrialUser && (
              <Alert className="bg-primary/5 border-primary/20">
                <Zap className="h-4 w-4 text-primary" />
                <AlertDescription className="ml-2">
                  <span className="font-medium">Trial users receive daily data updates.</span>
                  <br />
                  <span className="text-muted-foreground">
                    Upgrade to get hourly insider trading alerts and never miss a signal.
                  </span>
                  <Button 
                    type="button"
                    variant="default" 
                    size="sm" 
                    className="mt-2"
                    data-testid="button-upgrade-for-hourly"
                    onClick={() => setLocation("/purchase")}
                  >
                    <Crown className="h-4 w-4 mr-2" />
                    Upgrade Now
                  </Button>
                </AlertDescription>
              </Alert>
            )}
            
            {/* Data Refresh Status */}
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Clock className="h-4 w-4" />
                Data Refresh Status
              </div>
              <div className="grid gap-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Your Plan:</span>
                  <Badge variant={isPaidUser ? "default" : "secondary"} data-testid="badge-subscription-type">
                    {isPaidUser ? (
                      <>
                        <Crown className="h-3 w-3 mr-1" />
                        Paid (Hourly Updates)
                      </>
                    ) : (
                      <>
                        <Clock className="h-3 w-3 mr-1" />
                        Trial (Daily Updates)
                      </>
                    )}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Last Data Refresh:</span>
                  <span className="font-medium" data-testid="text-last-refresh">
                    {lastDataRefresh 
                      ? formatDistanceToNow(lastDataRefresh, { addSuffix: true })
                      : "Never"
                    }
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Next Refresh:</span>
                  <span className="font-medium" data-testid="text-next-refresh">
                    {refreshStatus.canRefresh ? (
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Ready Now
                      </Badge>
                    ) : (
                      <span className="text-amber-600">
                        In {refreshStatus.timeUntilRefresh}
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Market Cap Filter */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Label className="text-base font-medium">Minimum Market Cap</Label>
                <HoverCard>
                  <HoverCardTrigger>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </HoverCardTrigger>
                  <HoverCardContent className="w-80">
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">Why this matters</h4>
                      <p className="text-xs text-muted-foreground">
                        Filters out micro-cap stocks that may be too small or risky. 
                        Lower values = more opportunities but potentially higher risk.
                        Higher values = fewer but more established companies.
                      </p>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              </div>
              <div className="flex items-center gap-4">
                <Slider
                  value={[minMarketCap]}
                  onValueChange={([value]) => setMinMarketCap(value)}
                  min={0}
                  max={5000}
                  step={100}
                  className="flex-1"
                />
                <div className="w-32">
                  <Input
                    type="number"
                    value={minMarketCap}
                    onChange={(e) => setMinMarketCap(parseInt(e.target.value) || 0)}
                    className="text-right"
                  />
                </div>
                <span className="text-sm text-muted-foreground w-8">M</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Only show companies worth ${minMarketCap}M or more
              </p>
            </div>

            {/* Insider Price Filter */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Label className="text-base font-medium">Options Deal Filter</Label>
                <HoverCard>
                  <HoverCardTrigger>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </HoverCardTrigger>
                  <HoverCardContent className="w-80">
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">Catch options exercises</h4>
                      <p className="text-xs text-muted-foreground">
                        Filters out likely stock options exercises where the insider pays far below market price. 
                        These often aren't real "conviction buys" - just employees exercising pre-granted options.
                      </p>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              </div>
              <div className="flex items-center gap-4">
                <Slider
                  value={[optionsDealThreshold]}
                  onValueChange={([value]) => setOptionsDealThreshold(value)}
                  min={0}
                  max={50}
                  step={5}
                  className="flex-1"
                />
                <div className="w-32">
                  <Input
                    type="number"
                    value={optionsDealThreshold}
                    onChange={(e) => setOptionsDealThreshold(parseInt(e.target.value) || 0)}
                    className="text-right"
                  />
                </div>
                <span className="text-sm text-muted-foreground w-8">%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Hide buys where insider paid {optionsDealThreshold}% or more below market price
              </p>
            </div>

          </div>
        </div>

        {/* Advanced Settings */}
        <Accordion type="single" collapsible className="border rounded-lg">
          <AccordionItem value="advanced" className="border-0">
            <AccordionTrigger className="px-4 hover:no-underline">
              <span className="text-sm font-medium">Advanced Settings</span>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 space-y-4">
              {/* Batch Size */}
              <div className="space-y-2">
                <Label className="text-sm">Transactions per fetch</Label>
                <Input
                  type="number"
                  min="1"
                  max="500"
                  value={fetchLimit}
                  onChange={(e) => setFetchLimit(parseInt(e.target.value) || 50)}
                />
                <p className="text-xs text-muted-foreground">
                  Number of recent insider trades to scan (1-500)
                </p>
              </div>

              {/* Community Engagement */}
              <div className="space-y-2">
                <Label className="text-sm">Community Picks Threshold</Label>
                <Input
                  type="number"
                  min="1"
                  value={minCommunityEngagement}
                  onChange={(e) => setMinCommunityEngagement(parseInt(e.target.value) || 10)}
                />
                <p className="text-xs text-muted-foreground">
                  Minimum number of follows for a stock to appear in "Community" section
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <Button type="submit" disabled={saveConfigMutation.isPending} className="flex-1">
          {saveConfigMutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
