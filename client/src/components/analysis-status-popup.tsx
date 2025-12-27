import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, Loader2, CheckCircle, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type QueueStats = {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
};

export function AnalysisStatusPopup() {
  const [dismissed, setDismissed] = useState(false);
  const [lastCompleted, setLastCompleted] = useState(0);
  const [lastFailed, setLastFailed] = useState(0);
  const [recentlyAdded, setRecentlyAdded] = useState(0);
  const [recentlyRejected, setRecentlyRejected] = useState(0);

  const { data: stats } = useQuery<QueueStats>({
    queryKey: ["/api/analysis-jobs/stats"],
    refetchInterval: 3000,
  });

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
  const isActive = activeJobs > 0;
  const [wasActive, setWasActive] = useState(false);

  useEffect(() => {
    if (!wasActive && isActive) {
      setDismissed(false);
    }
    setWasActive(isActive);
  }, [isActive, wasActive]);

  if (dismissed || !isActive) {
    return null;
  }

  return (
    <div 
      className={cn(
        "fixed bottom-4 right-4 z-50 min-w-[280px] max-w-[320px]",
        "bg-card border border-border rounded-lg shadow-lg",
        "animate-in slide-in-from-bottom-5 fade-in duration-300"
      )}
      data-testid="popup-analysis-status"
    >
      <div className="flex items-center justify-between p-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="font-medium text-sm">Analyzing Opportunities</span>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          onClick={() => setDismissed(true)}
          data-testid="button-dismiss-analysis-popup"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
      
      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>In Queue</span>
          </div>
          <span className="font-mono font-medium">{stats?.pending ?? 0}</span>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-primary">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>Processing</span>
          </div>
          <span className="font-mono font-medium">{stats?.processing ?? 0}</span>
        </div>

        {recentlyAdded > 0 && (
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-success">
              <CheckCircle className="h-3.5 w-3.5" />
              <span>Added</span>
            </div>
            <span className="font-mono font-medium text-success">+{recentlyAdded}</span>
          </div>
        )}

        {recentlyRejected > 0 && (
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-destructive">
              <XCircle className="h-3.5 w-3.5" />
              <span>Rejected</span>
            </div>
            <span className="font-mono font-medium text-destructive">{recentlyRejected}</span>
          </div>
        )}

        <div className="pt-2 border-t border-border/50">
          <div className="text-xs text-muted-foreground">
            Processing {activeJobs} {activeJobs === 1 ? 'opportunity' : 'opportunities'}...
          </div>
        </div>
      </div>
    </div>
  );
}
