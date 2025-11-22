import { useQuery } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { StockAnalysis } from "@shared/schema";

interface CompactSignalBadgeProps {
  ticker: string;
}

export function CompactSignalBadge({ ticker }: CompactSignalBadgeProps) {
  const { data: analysis, isLoading } = useQuery<StockAnalysis | null>({
    queryKey: ["/api/ai-analysis", ticker],
    queryFn: async () => {
      const response = await fetch(`/api/ai-analysis/${ticker}`);
      if (response.status === 404) return null;
      if (!response.ok) throw new Error("Failed to fetch AI analysis");
      return response.json();
    },
  });

  if (isLoading || !analysis) {
    return null;
  }

  const primaryScore = analysis.integratedScore ?? analysis.confidenceScore ?? null;
  
  if (primaryScore === null) {
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
