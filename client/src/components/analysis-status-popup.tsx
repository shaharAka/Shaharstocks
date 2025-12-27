import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Minimize2, Maximize2, Loader2, CheckCircle, XCircle, Clock, Timer, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";

type QueueStats = {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
};

type OpportunitiesResponse = {
  opportunities: any[];
  tier: 'pro' | 'free';
  cadence: string;
};

type BatchInfo = {
  id?: string;
  cadence: 'daily' | 'hourly';
  fetchedAt: string | Date;
  opportunityCount: number;
};

export function AnalysisStatusPopup() {
  const [minimized, setMinimized] = useState(false);
  const [lastCompleted, setLastCompleted] = useState(0);
  const [lastFailed, setLastFailed] = useState(0);
  const [recentlyAdded, setRecentlyAdded] = useState(0);
  const [recentlyRejected, setRecentlyRejected] = useState(0);
  const [, setLocation] = useLocation();

  const { data: stats } = useQuery<QueueStats>({
    queryKey: ["/api/analysis-jobs/stats"],
    refetchInterval: 3000,
  });

  const { data: opportunitiesResponse } = useQuery<OpportunitiesResponse>({
    queryKey: ["/api/opportunities"],
    staleTime: 60 * 1000,
  });

  const { data: latestBatch } = useQuery<BatchInfo>({
    queryKey: ["/api/opportunities/latest-batch"],
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  const tier = opportunitiesResponse?.tier || 'free';
  const isPro = tier === 'pro';

  const calculateCountdown = (lastFetch: string | Date | undefined, userIsPro: boolean) => {
    if (!lastFetch) {
      return { countdown: userIsPro ? '--:--' : '--:--:--' };
    }
    
    const fetchDate = typeof lastFetch === 'string' ? new Date(lastFetch) : lastFetch;
    if (isNaN(fetchDate.getTime())) {
      return { countdown: userIsPro ? '--:--' : '--:--:--' };
    }
    
    const now = new Date();
    
    let nextUpdate: Date;
    if (userIsPro) {
      nextUpdate = new Date(fetchDate.getTime() + 60 * 60 * 1000);
      while (nextUpdate <= now) {
        nextUpdate = new Date(nextUpdate.getTime() + 60 * 60 * 1000);
      }
    } else {
      nextUpdate = new Date(now);
      nextUpdate.setUTCDate(nextUpdate.getUTCDate() + 1);
      nextUpdate.setUTCHours(0, 0, 0, 0);
    }
    
    const diffMs = Math.max(0, nextUpdate.getTime() - now.getTime());
    const diffSeconds = Math.floor(diffMs / 1000);
    const hours = Math.floor(diffSeconds / 3600);
    const minutes = Math.floor((diffSeconds % 3600) / 60);
    const seconds = diffSeconds % 60;
    
    const countdownStr = userIsPro 
      ? `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      : `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    return { countdown: countdownStr };
  };

  const [displayCountdown, setDisplayCountdown] = useState('--:--');
  
  useEffect(() => {
    const updateCountdown = () => {
      const { countdown } = calculateCountdown(latestBatch?.fetchedAt, isPro);
      setDisplayCountdown(countdown);
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [latestBatch?.fetchedAt, isPro]);

  useEffect(() => {
    if (stats) {
      if (stats.completed > lastCompleted && lastCompleted > 0) {
        setRecentlyAdded(prev => prev + (stats.completed - lastCompleted));
      }
      if (stats.failed > lastFailed && lastFailed > 0) {
        setRecentlyRejected(prev => prev + (stats.failed - lastFailed));
      }
      setLastCompleted(stats.completed);
      setLastFailed(stats.failed);
    }
  }, [stats, lastCompleted, lastFailed]);

  useEffect(() => {
    if (stats && (stats.pending === 0 && stats.processing === 0)) {
      const timer = setTimeout(() => {
        setRecentlyAdded(0);
        setRecentlyRejected(0);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [stats]);

  const activeJobs = (stats?.pending ?? 0) + (stats?.processing ?? 0);
  const isProcessing = activeJobs > 0;

  const POPUP_WIDTH = "w-[200px]";

  if (minimized) {
    return (
      <div 
        className={cn(
          "fixed bottom-4 right-4 z-50",
          POPUP_WIDTH,
          "bg-card border border-border rounded-lg shadow-lg",
          "animate-in slide-in-from-bottom-2 fade-in duration-200"
        )}
        data-testid="popup-analysis-status-minimized"
      >
        <button
          onClick={() => setMinimized(false)}
          className="flex items-center justify-between w-full gap-2 p-2 hover-elevate rounded-lg"
          data-testid="button-expand-status-popup"
        >
          <div className="flex items-center gap-2">
            {isProcessing ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                <span className="text-xs font-medium">{activeJobs}</span>
              </>
            ) : (
              <Timer className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">{displayCountdown}</span>
            <Maximize2 className="h-3 w-3 text-muted-foreground" />
          </div>
        </button>
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "fixed bottom-4 right-4 z-50",
        POPUP_WIDTH,
        "bg-card border border-border rounded-lg shadow-lg",
        "animate-in slide-in-from-bottom-5 fade-in duration-300"
      )}
      data-testid="popup-analysis-status"
    >
      <div className="flex items-center justify-between p-2.5 border-b border-border/50">
        <div className="flex items-center gap-2">
          {isProcessing ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : (
            <Timer className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="font-medium text-sm">
            {isProcessing ? "Analyzing" : "Status"}
          </span>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          onClick={() => setMinimized(true)}
          data-testid="button-minimize-analysis-popup"
        >
          <Minimize2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      
      <div className="p-2.5 space-y-1.5">
        {isProcessing && (
          <>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>In Queue</span>
              </div>
              <span className="font-mono font-medium text-xs">{stats?.pending ?? 0}</span>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-primary">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Processing</span>
              </div>
              <span className="font-mono font-medium text-xs">{stats?.processing ?? 0}</span>
            </div>

            {recentlyAdded > 0 && (
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-success">
                  <CheckCircle className="h-3.5 w-3.5" />
                  <span>Added</span>
                </div>
                <span className="font-mono font-medium text-xs text-success">+{recentlyAdded}</span>
              </div>
            )}

            {recentlyRejected > 0 && (
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-destructive">
                  <XCircle className="h-3.5 w-3.5" />
                  <span>Rejected</span>
                </div>
                <span className="font-mono font-medium text-xs text-destructive">{recentlyRejected}</span>
              </div>
            )}
          </>
        )}

        <div className={cn(
          "flex items-center justify-between text-xs",
          isProcessing && "pt-1.5 border-t border-border/50"
        )}>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Timer className="h-3 w-3" />
            <span>Next update</span>
          </div>
          <span className="font-mono font-medium">{displayCountdown}</span>
        </div>
        
        {!isPro && (
          <button
            onClick={() => setLocation("/purchase")}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
            data-testid="link-upgrade-faster-updates"
          >
            <Zap className="h-3 w-3" />
            <span className="underline underline-offset-2">Get hourly updates</span>
          </button>
        )}
      </div>
    </div>
  );
}
