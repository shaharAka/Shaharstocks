import { useQuery } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, Minus, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { StockAnalysis } from "@shared/schema";

interface CompactSignalBadgeProps {
  ticker: string;
  showEmptyState?: boolean;
}

export function CompactSignalBadge({ ticker, showEmptyState = false }: CompactSignalBadgeProps) {
  const { data: analysis, isLoading } = useQuery<StockAnalysis | null>({
    queryKey: ["/api/stocks", ticker, "analysis"],
    queryFn: async () => {
      const response = await fetch(`/api/stocks/${ticker}/analysis`);
      if (response.status === 404) return null;
      if (!response.ok) throw new Error("Failed to fetch AI analysis");
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground" data-testid="compact-signal-badge-loading">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading signal...</span>
      </div>
    );
  }

  if (!analysis) {
    if (showEmptyState) {
      return (
        <div className="text-sm text-muted-foreground" data-testid="compact-signal-badge-empty">
          No AI analysis yet. Check the AI Analysis tab to generate one.
        </div>
      );
    }
    return null;
  }

  const primaryScore = analysis.integratedScore ?? analysis.confidenceScore ?? null;
  
  if (primaryScore === null) {
    if (showEmptyState) {
      return (
        <div className="text-sm text-muted-foreground" data-testid="compact-signal-badge-no-score">
          Analysis pending...
        </div>
      );
    }
    return null;
  }

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-amber-600 dark:text-amber-400";
    if (score >= 40) return "text-muted-foreground";
    return "text-red-500/70 dark:text-red-400/70";
  };

  const getStanceInfo = () => {
    if (analysis.recommendation === "BUY") {
      return { 
        icon: TrendingUp, 
        label: "BUY", 
        variant: "default" as const,
        className: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20"
      };
    }
    if (analysis.recommendation === "SELL") {
      return { 
        icon: TrendingDown, 
        label: "SELL SHORT", 
        variant: "destructive" as const,
        className: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
      };
    }
    return { 
      icon: Minus, 
      label: "HOLD", 
      variant: "secondary" as const,
      className: ""
    };
  };

  const stance = getStanceInfo();
  const StanceIcon = stance.icon;

  return (
    <div className="flex items-center gap-2 flex-wrap" data-testid="compact-signal-badge">
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground">AI Signal:</span>
        <span className={`text-sm font-mono font-bold ${getScoreColor(primaryScore)}`} data-testid="text-signal-score">
          {primaryScore}/100
        </span>
      </div>
      <Badge 
        variant={stance.variant} 
        className={`gap-1 ${stance.className}`}
        data-testid="badge-stance"
      >
        <StanceIcon className="h-3 w-3" />
        {stance.label}
      </Badge>
    </div>
  );
}
