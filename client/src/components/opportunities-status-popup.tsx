import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Minimize2, Maximize2, Clock, Crown, Zap, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";

type OpportunitiesResponse = {
  opportunities: any[];
  tier: 'pro' | 'free';
  cadence: string;
};

type BatchInfo = {
  id: string;
  cadence: 'daily' | 'hourly';
  fetchedAt: string;
  opportunityCount: number;
};

export function OpportunitiesStatusPopup() {
  const [minimized, setMinimized] = useState(false);
  const [, setLocation] = useLocation();

  const { data: opportunitiesResponse } = useQuery<OpportunitiesResponse>({
    queryKey: ["/api/opportunities"],
    staleTime: 60 * 1000,
  });

  const { data: latestBatch } = useQuery<BatchInfo>({
    queryKey: ["/api/opportunities/latest-batch"],
    staleTime: 60 * 1000,
    retry: false,
  });

  const tier = opportunitiesResponse?.tier || 'free';
  const isPro = tier === 'pro';

  const calculateCountdown = (lastFetchStr: string | undefined, userIsPro: boolean) => {
    const lastFetch = lastFetchStr ? new Date(lastFetchStr) : new Date();
    const now = new Date();
    
    let nextUpdate: Date;
    if (userIsPro) {
      // Pro users: add 1 hour from last fetch time
      nextUpdate = new Date(lastFetch.getTime() + 60 * 60 * 1000);
      // If already past, calculate next hourly window from now
      while (nextUpdate <= now) {
        nextUpdate = new Date(nextUpdate.getTime() + 60 * 60 * 1000);
      }
    } else {
      // Free users: next midnight UTC
      nextUpdate = new Date(lastFetch);
      nextUpdate.setUTCDate(nextUpdate.getUTCDate() + 1);
      nextUpdate.setUTCHours(0, 0, 0, 0);
      // If already past, calculate next midnight from now
      if (nextUpdate <= now) {
        nextUpdate = new Date(now);
        nextUpdate.setUTCDate(nextUpdate.getUTCDate() + 1);
        nextUpdate.setUTCHours(0, 0, 0, 0);
      }
    }
    
    const diffMs = Math.max(0, nextUpdate.getTime() - now.getTime());
    const diffSeconds = Math.floor(diffMs / 1000);
    const hours = Math.floor(diffSeconds / 3600);
    const minutes = Math.floor((diffSeconds % 3600) / 60);
    const seconds = diffSeconds % 60;
    
    const countdownStr = userIsPro 
      ? `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      : `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    return { nextUpdate, countdown: countdownStr };
  };

  const { countdown } = useMemo(() => {
    return calculateCountdown(latestBatch?.fetchedAt, isPro);
  }, [latestBatch?.fetchedAt, isPro]);

  const [displayCountdown, setDisplayCountdown] = useState(countdown);
  
  useEffect(() => {
    setDisplayCountdown(countdown);
  }, [countdown]);
  
  useEffect(() => {
    const interval = setInterval(() => {
      const { countdown: newCountdown } = calculateCountdown(latestBatch?.fetchedAt, isPro);
      setDisplayCountdown(newCountdown);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [latestBatch?.fetchedAt, isPro]);

  if (minimized) {
    return (
      <div 
        className={cn(
          "fixed bottom-4 right-4 z-50",
          "bg-card border border-border rounded-lg shadow-lg",
          "animate-in slide-in-from-bottom-2 fade-in duration-200"
        )}
        data-testid="popup-opportunities-status-minimized"
      >
        <button
          onClick={() => setMinimized(false)}
          className="flex items-center gap-2 p-3 hover-elevate rounded-lg"
          data-testid="button-expand-status-popup"
        >
          <Timer className="h-4 w-4 text-primary" />
          <span className="font-mono font-medium text-sm">{displayCountdown}</span>
          <Maximize2 className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "fixed bottom-4 right-4 z-50 min-w-[280px] max-w-[320px]",
        "bg-card border border-border rounded-lg shadow-lg",
        "animate-in slide-in-from-bottom-5 fade-in duration-300"
      )}
      data-testid="popup-opportunities-status"
    >
      <div className="flex items-center justify-between p-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Timer className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">Next Update</span>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          onClick={() => setMinimized(true)}
          data-testid="button-minimize-status-popup"
        >
          <Minimize2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      
      <div className="p-4 space-y-4">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Badge variant={isPro ? "default" : "secondary"} data-testid="badge-user-tier">
              {isPro ? (
                <>
                  <Crown className="h-3 w-3 mr-1" />
                  Pro
                </>
              ) : (
                <>
                  <Clock className="h-3 w-3 mr-1" />
                  Free
                </>
              )}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {isPro ? "Hourly updates" : "Daily updates"}
            </span>
          </div>
          
          <div 
            className="font-mono text-3xl font-bold tracking-wider text-primary"
            data-testid="text-countdown-timer"
          >
            {displayCountdown}
          </div>
          
          <p className="text-xs text-muted-foreground">
            until new opportunities
          </p>
        </div>

        {!isPro && (
          <div className="pt-3 border-t border-border/50 space-y-3">
            <div className="flex items-start gap-2 text-sm">
              <Zap className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-muted-foreground">
                Upgrade to Pro for <strong className="text-foreground">hourly updates</strong> and never miss a signal
              </p>
            </div>
            <Button 
              variant="default" 
              size="sm" 
              className="w-full"
              data-testid="button-upgrade-pro"
              onClick={() => setLocation("/purchase")}
            >
              <Crown className="h-4 w-4 mr-2" />
              Upgrade to Pro
            </Button>
          </div>
        )}
        
        {latestBatch?.fetchedAt && (
          <div className="pt-2 border-t border-border/50">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Last update:</span>
              <span className="font-medium">
                {new Date(latestBatch.fetchedAt).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
