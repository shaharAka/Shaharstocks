import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Brain, Globe, AlertTriangle } from "lucide-react";
import type { StockAnalysis, MacroAnalysis } from "@shared/schema";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface SignalSummaryProps {
  ticker: string;
}

export function SignalSummary({ ticker }: SignalSummaryProps) {
  const { data: analysis, isLoading: isLoadingAnalysis } = useQuery<StockAnalysis | null>({
    queryKey: ["/api/stocks", ticker, "analysis"],
    queryFn: async () => {
      const response = await fetch(`/api/stocks/${ticker}/analysis`);
      if (response.status === 404) return null;
      if (!response.ok) throw new Error("Failed to fetch analysis");
      return response.json();
    },
  });

  const { data: macroAnalysis } = useQuery<MacroAnalysis | null>({
    queryKey: ["/api/macro-analysis", analysis?.macroAnalysisId],
    enabled: analysis?.macroAnalysisId != null,
    queryFn: async () => {
      if (analysis?.macroAnalysisId == null) return null;
      const response = await fetch(`/api/macro-analysis/${analysis.macroAnalysisId}`);
      if (response.status === 404) return null;
      if (!response.ok) throw new Error("Failed to fetch macro analysis");
      return response.json();
    },
  });

  if (isLoadingAnalysis) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!analysis || analysis.status !== "completed") {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">No signal analysis available yet</p>
        </CardContent>
      </Card>
    );
  }

  // Calculate primary signal score (null if unavailable)
  const primaryScore = analysis.integratedScore ?? analysis.confidenceScore ?? null;
  
  // Don't render if no valid score
  if (primaryScore === null) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Signal analysis incomplete - awaiting score calculation</p>
        </CardContent>
      </Card>
    );
  }
  
  // Determine signal strength and colors using platform's amber gradient system
  const getSignalStrength = (score: number) => {
    if (score >= 70) return { label: "Strong Signal", variant: "default" as const, color: "text-amber-600 dark:text-amber-400" };
    if (score >= 40) return { label: "Moderate Signal", variant: "secondary" as const, color: "text-foreground" };
    return { label: "Weak Signal", variant: "destructive" as const, color: "text-destructive" };
  };

  const signalStrength = getSignalStrength(primaryScore);

  // Determine position stance (BUY or SELL SHORT)
  const getPositionStance = () => {
    const rec = analysis.recommendation?.toLowerCase() || "";
    
    if (rec.includes("buy") || rec.includes("strong buy")) {
      return {
        type: "BUY",
        icon: TrendingUp,
        variant: "default" as const,
        description: "Enter long position"
      };
    }
    
    if (rec.includes("sell") || rec.includes("avoid") || rec.includes("short")) {
      return {
        type: "SELL SHORT",
        icon: TrendingDown,
        variant: "destructive" as const,
        description: "Enter short position"
      };
    }
    
    return {
      type: "HOLD",
      icon: AlertTriangle,
      variant: "outline" as const,
      description: "Wait for clearer signal"
    };
  };

  const stance = getPositionStance();
  const StanceIcon = stance.icon;

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        {/* Position Stance */}
        <div className="flex items-center justify-center gap-3 py-4 border-y">
          <Badge variant={stance.variant} className="text-lg px-4 py-2 flex items-center gap-2" data-testid="badge-position-stance">
            <StanceIcon className="h-5 w-5" />
            {stance.type}
          </Badge>
          <span className="text-sm text-muted-foreground">{stance.description}</span>
        </div>

        {/* 2-Week Trade Thesis Headline */}
        {analysis.summary && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Trade Thesis</h4>
            <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-trade-thesis">
              {analysis.summary}
            </p>
          </div>
        )}

        {/* Supporting Metrics (Micro + Macro Breakdown) */}
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="metrics">
            <AccordionTrigger className="text-sm" data-testid="button-toggle-metrics">
              View Signal Components
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              {/* Micro Score (Company Analysis) */}
              {analysis.confidenceScore != null && (
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Company Analysis</span>
                  </div>
                  <span className="text-sm font-mono font-semibold" data-testid="text-micro-score">
                    {analysis.confidenceScore}/100
                  </span>
                </div>
              )}

              {/* Macro Factor (Market Context) */}
              {macroAnalysis?.macroFactor != null && (
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Market Context Factor</span>
                  </div>
                  <span className="text-sm font-mono font-semibold" data-testid="text-macro-factor">
                    ×{macroAnalysis.macroFactor}
                  </span>
                </div>
              )}

              {/* Calculation - only show if we have integrated score and both components */}
              {analysis.integratedScore != null && 
               macroAnalysis?.macroFactor != null && 
               analysis.confidenceScore != null && (
                <div className="text-xs text-center text-muted-foreground pt-2 border-t">
                  Signal derived from Company Analysis ({analysis.confidenceScore}) adjusted by Market Context (×{macroAnalysis.macroFactor})
                </div>
              )}
              
              {/* If only company score exists (no macro integration yet) */}
              {analysis.integratedScore == null && analysis.confidenceScore != null && (
                <div className="text-xs text-center text-muted-foreground pt-2 border-t">
                  Signal based on Company Analysis only (Market Context pending)
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
