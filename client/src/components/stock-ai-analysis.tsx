import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Brain, 
  Loader2, 
  AlertTriangle, 
  TrendingUp, 
  AlertCircle, 
  Globe,
  Target,
  Eye,
  Zap,
  Clock,
  RotateCcw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { StockAnalysis, MacroAnalysis } from "@shared/schema";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { TermTooltip } from "@/components/term-tooltip";
import { ScorecardDisplay } from "@/components/scorecard-display";

interface StockAIAnalysisProps {
  ticker: string;
}

// Helper to safely parse number (returns null for missing/invalid data)
const safeNumber = (value: any): number | null => {
  if (value == null) return null;
  const num = typeof value === 'string' ? parseFloat(value) : Number(value);
  return isNaN(num) ? null : num;
};

// Helper function to assess profitability from fundamental data
const assessProfitability = (data: any): string => {
  const profitMargin = safeNumber(data?.profitMargin);
  const roe = safeNumber(data?.returnOnEquity);
  
  // No data available
  if (profitMargin == null && roe == null) return "Unknown";
  
  // Data is stored as decimals (e.g., 0.162 = 16.2%)
  // Strong: >15% margin OR >15% ROE
  if ((profitMargin != null && profitMargin >= 0.15) || (roe != null && roe >= 0.15)) return "Strong";
  // Moderate: >8% margin OR >10% ROE
  if ((profitMargin != null && profitMargin >= 0.08) || (roe != null && roe >= 0.10)) return "Moderate";
  // Weak: positive but below thresholds OR negative (losses)
  return "Weak";
};

// Helper function to assess liquidity
const assessLiquidity = (data: any): string => {
  const currentRatio = safeNumber(data?.currentRatio);
  
  if (currentRatio == null) return "Unknown";
  if (currentRatio >= 2.0) return "Strong";
  if (currentRatio >= 1.0) return "Moderate";
  return "Weak";
};

// Helper function to assess debt level (leverage)
const assessDebtLevel = (data: any): string => {
  const debtToEquity = safeNumber(data?.debtToEquity);
  
  if (debtToEquity == null) return "Unknown";
  // Zero debt is excellent (net-cash businesses)
  if (debtToEquity === 0) return "Minimal";
  if (debtToEquity < 0.5) return "Conservative";
  if (debtToEquity < 1.5) return "Moderate";
  return "High";
};

// Helper function to assess growth
const assessGrowth = (data: any): string => {
  const peRatio = safeNumber(data?.peRatio);
  const eps = safeNumber(data?.eps);
  
  // No data available
  if (peRatio == null && eps == null) return "Unknown";
  
  // Strong growth: attractive P/E (15-30) OR high EPS (>$3)
  if ((peRatio != null && peRatio >= 15 && peRatio <= 30) || (eps != null && eps >= 3)) return "Strong";
  // Moderate: reasonable P/E (10-15) OR decent EPS (>$1)
  if ((peRatio != null && peRatio >= 10 && peRatio < 15) || (eps != null && eps >= 1)) return "Moderate";
  // Has data but doesn't meet thresholds (or negative EPS)
  return "Weak";
};

export function StockAIAnalysis({ ticker }: StockAIAnalysisProps) {
  const { toast } = useToast();

  const { data: analysis, isLoading: isLoadingExisting } = useQuery<StockAnalysis | null>({
    queryKey: ["/api/stocks", ticker, "analysis"],
    queryFn: async () => {
      const response = await fetch(`/api/stocks/${ticker}/analysis`);
      if (response.status === 404) return null;
      if (!response.ok) throw new Error("Failed to fetch analysis");
      return response.json();
    },
    staleTime: 0, // Always fetch fresh data for analysis
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data && (data.status === "pending" || data.status === "analyzing")) {
        return 3000;
      }
      return false;
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

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/stocks/${ticker}/analyze`, { force: true });
      return await response.json();
    },
    onSuccess: (pendingAnalysis) => {
      queryClient.setQueryData(["/api/stocks", ticker, "analysis"], pendingAnalysis);
      queryClient.invalidateQueries({ queryKey: ["/api/stock-analyses"] });
      toast({
        title: "Analysis Queued",
        description: `Re-analyzing ${ticker} with fresh data. Check back in a moment.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Analysis Failed",
        description: error.message || "Unable to generate AI analysis. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/analysis-jobs/reset/${ticker}`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stocks", ticker, "analysis"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stock-analyses"] });
      toast({
        title: "Analysis Reset",
        description: `Cleared stuck analysis for ${ticker}. You can now start a fresh analysis.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Reset Failed",
        description: error.message || "Unable to reset analysis. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (isLoadingExisting) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading playbook...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4 text-center">
            <p className="text-muted-foreground">No AI analysis available yet</p>
            <Button
              variant="default"
              onClick={() => analyzeMutation.mutate()}
              disabled={analyzeMutation.isPending}
              data-testid={`button-analyze-${ticker}`}
            >
              {analyzeMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4 mr-2" />
                  Generate AI Playbook
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show analyzing status
  if (analysis.status === "pending" || analysis.status === "analyzing") {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>AI playbook in progress...</span>
            </div>
            <div className="flex items-center gap-2 pt-2 border-t">
              <span className="text-xs text-muted-foreground">Stuck for too long?</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => resetMutation.mutate()}
                disabled={resetMutation.isPending}
                data-testid={`button-reset-${ticker}`}
                className="text-xs h-7"
              >
                {resetMutation.isPending ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Reset & Retry
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show error status
  if (analysis.status === "failed") {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <span>Analysis failed: {analysis.errorMessage || "Unknown error"}</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                onClick={() => analyzeMutation.mutate()}
                disabled={analyzeMutation.isPending || resetMutation.isPending}
                data-testid={`button-retry-${ticker}`}
              >
                {analyzeMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Retrying...
                  </>
                ) : (
                  "Retry Analysis"
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => resetMutation.mutate()}
                disabled={resetMutation.isPending || analyzeMutation.isPending}
                data-testid={`button-reset-failed-${ticker}`}
                className="text-xs"
              >
                {resetMutation.isPending ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Clear & Reset
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render completed AI Playbook
  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Section 1: Signal Drivers - Why this score */}
      <Card>
        <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-4">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
            <Target className="h-4 sm:h-5 w-4 sm:w-5" />
            Signal Drivers
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-6 pt-0">
          {analysis.summary && (
            <p className="text-xs sm:text-sm leading-relaxed" data-testid="text-signal-drivers">
              {analysis.summary}
            </p>
          )}

          {analysis.strengths && analysis.strengths.length > 0 && (
            <div className="space-y-1.5 sm:space-y-2">
              <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-amber-600 dark:text-amber-400">
                <TrendingUp className="h-3.5 sm:h-4 w-3.5 sm:w-4" />
                <span>Key Strengths</span>
              </div>
              <ul className="space-y-1">
                {analysis.strengths.map((strength: string, index: number) => (
                  <li key={index} className="text-xs sm:text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-amber-600 dark:text-amber-400 shrink-0">•</span>
                    <span className="flex-1">{strength}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(analysis as any).fundamentalSignals && (analysis as any).fundamentalSignals.length > 0 && (
            <div className="space-y-1.5 sm:space-y-2">
              <div className="text-xs sm:text-sm font-medium">Fundamental Signals</div>
              <ul className="space-y-1">
                {(analysis as any).fundamentalSignals.map((signal: string, index: number) => (
                  <li key={index} className="text-xs sm:text-sm text-muted-foreground flex items-start gap-2">
                    <Zap className="h-3.5 sm:h-4 w-3.5 sm:w-4 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
                    <span className="flex-1">{signal}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(analysis as any).secFilingInsights && (analysis as any).secFilingInsights.length > 0 && (
            <div className="space-y-1.5 sm:space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="text-xs sm:text-sm font-medium">SEC Filing Insights</div>
                {(analysis as any).secFilingType && (
                  <Badge variant="outline" className="text-[10px] sm:text-xs">{(analysis as any).secFilingType}</Badge>
                )}
              </div>
              <ul className="space-y-1">
                {(analysis as any).secFilingInsights.map((insight: string, index: number) => (
                  <li key={index} className="text-xs sm:text-sm text-muted-foreground flex items-start gap-2">
                    <span className="shrink-0">•</span>
                    <span className="flex-1">{insight}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Supporting Metrics (Micro + Macro Breakdown) */}
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="metrics">
              <AccordionTrigger className="text-xs sm:text-sm" data-testid="button-toggle-metrics">
                View Signal Components
              </AccordionTrigger>
              <AccordionContent className="space-y-3 sm:space-y-4 pt-2">
                {/* Micro Score (Company Analysis) */}
                {analysis.confidenceScore != null && (
                  <div className="flex items-center justify-between p-2 sm:p-3 bg-muted/30 rounded-lg gap-2">
                    <div className="flex items-center gap-2">
                      <Brain className="h-3.5 sm:h-4 w-3.5 sm:w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-xs sm:text-sm font-medium">Company Analysis</span>
                    </div>
                    <span className="text-xs sm:text-sm font-mono font-semibold" data-testid="text-micro-score">
                      {analysis.confidenceScore}/100
                    </span>
                  </div>
                )}

                {/* Macro Factor (Market Context) */}
                {macroAnalysis?.macroFactor != null && (
                  <div className="flex items-center justify-between p-2 sm:p-3 bg-muted/30 rounded-lg gap-2">
                    <div className="flex items-center gap-2">
                      <Globe className="h-3.5 sm:h-4 w-3.5 sm:w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-xs sm:text-sm font-medium">Market Context</span>
                    </div>
                    <span className="text-xs sm:text-sm font-mono font-semibold" data-testid="text-macro-factor">
                      ×{macroAnalysis.macroFactor}
                    </span>
                  </div>
                )}

                {/* Calculation - only show if we have integrated score and both components */}
                {analysis.integratedScore != null && 
                 macroAnalysis?.macroFactor != null && 
                 analysis.confidenceScore != null && (
                  <div className="text-[10px] sm:text-xs text-center text-muted-foreground pt-2 border-t">
                    Signal derived from Company Analysis ({analysis.confidenceScore}) adjusted by Market Context (×{macroAnalysis.macroFactor})
                  </div>
                )}
                
                {/* If only company score exists (no macro integration yet) */}
                {analysis.integratedScore == null && analysis.confidenceScore != null && (
                  <div className="text-[10px] sm:text-xs text-center text-muted-foreground pt-2 border-t">
                    Signal based on Company Analysis only (Market Context pending)
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Scorecard Breakdown - Detailed metric-by-metric analysis */}
      {(analysis as any).scorecard && 
       typeof (analysis as any).scorecard === 'object' && 
       (analysis as any).scorecard.globalScore !== undefined && (
        <ScorecardDisplay 
          scorecard={(analysis as any).scorecard} 
          data-testid="scorecard-display"
        />
      )}

      {/* Section 2: Key Watchpoints - Risks and catalysts */}
      <Card>
        <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-4">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
            <Eye className="h-4 sm:h-5 w-4 sm:w-5" />
            Key Watchpoints
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-6 pt-0">
          {analysis.redFlags && analysis.redFlags.length > 0 && (
            <div className="space-y-1.5 sm:space-y-2">
              <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-destructive">
                <AlertTriangle className="h-3.5 sm:h-4 w-3.5 sm:w-4" />
                <span>Risk Factors</span>
              </div>
              <ul className="space-y-1">
                {analysis.redFlags.map((flag: string, index: number) => (
                  <li key={index} className="text-xs sm:text-sm text-muted-foreground flex items-start gap-2">
                    <AlertCircle className="h-3.5 sm:h-4 w-3.5 sm:w-4 mt-0.5 shrink-0 text-destructive" />
                    <span className="flex-1">{flag}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {analysis.weaknesses && analysis.weaknesses.length > 0 && (
            <div className="space-y-1.5 sm:space-y-2">
              <div className="text-xs sm:text-sm font-medium">Weaknesses to Monitor</div>
              <ul className="space-y-1">
                {analysis.weaknesses.map((weakness: string, index: number) => (
                  <li key={index} className="text-xs sm:text-sm text-muted-foreground flex items-start gap-2">
                    <span className="shrink-0">•</span>
                    <span className="flex-1">{weakness}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {analysis.risks && analysis.risks.length > 0 && (
            <div className="space-y-1.5 sm:space-y-2">
              <div className="text-xs sm:text-sm font-medium">Additional Risks</div>
              <ul className="space-y-1">
                {analysis.risks.map((risk: string, index: number) => (
                  <li key={index} className="text-xs sm:text-sm text-muted-foreground flex items-start gap-2">
                    <AlertTriangle className="h-3 sm:h-3.5 w-3 sm:w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                    <span className="flex-1">{risk}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {analysis.opportunities && analysis.opportunities.length > 0 && (
            <div className="space-y-1.5 sm:space-y-2">
              <div className="text-xs sm:text-sm font-medium text-amber-600 dark:text-amber-400">Potential Catalysts</div>
              <ul className="space-y-1">
                {analysis.opportunities.map((opportunity: string, index: number) => (
                  <li key={index} className="text-xs sm:text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-amber-600 dark:text-amber-400 shrink-0">↗</span>
                    <span className="flex-1">{opportunity}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(!analysis.redFlags || analysis.redFlags.length === 0) && 
           (!analysis.weaknesses || analysis.weaknesses.length === 0) &&
           (!analysis.risks || analysis.risks.length === 0) &&
           (!analysis.opportunities || analysis.opportunities.length === 0) && (
            <p className="text-xs sm:text-sm text-muted-foreground italic">No significant watchpoints identified</p>
          )}
        </CardContent>
      </Card>

      {/* Section 3: Market Context - Macro factors */}
      {macroAnalysis && (
        <Card>
          <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-4">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <Globe className="h-4 sm:h-5 w-4 sm:w-5" />
              Market Context
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-6 pt-0">
            {macroAnalysis.summary && (
              <p className="text-xs sm:text-sm leading-relaxed text-muted-foreground italic">
                {macroAnalysis.summary}
              </p>
            )}

            {macroAnalysis.industry && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs sm:text-sm text-muted-foreground">Industry:</span>
                <Badge variant="secondary" className="text-[10px] sm:text-xs">{macroAnalysis.industry}</Badge>
              </div>
            )}

            {macroAnalysis.industrySectorAnalysis && (
              <div className="space-y-2 sm:space-y-3 p-2 sm:p-3 bg-muted/30 rounded-lg">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2">
                  <span className="text-xs sm:text-sm font-medium">ETF: {macroAnalysis.industrySectorAnalysis.etfSymbol}</span>
                  <Badge variant={
                    macroAnalysis.industrySectorAnalysis.sectorWeight > 70 ? 'default' :
                    macroAnalysis.industrySectorAnalysis.sectorWeight > 40 ? 'secondary' : 'outline'
                  } className="text-[10px] sm:text-xs w-fit">
                    Influence: {macroAnalysis.industrySectorAnalysis.sectorWeight}/100
                  </Badge>
                </div>
                
                <div className="grid grid-cols-3 gap-2 sm:gap-3 text-xs sm:text-sm">
                  <div>
                    <div className="text-muted-foreground text-[10px] sm:text-xs">Day</div>
                    <div className={`font-mono font-semibold text-xs sm:text-sm ${
                      macroAnalysis.industrySectorAnalysis.dayChange >= 0 ? 'text-success' : 'text-destructive'
                    }`}>
                      {macroAnalysis.industrySectorAnalysis.dayChange >= 0 ? '+' : ''}{macroAnalysis.industrySectorAnalysis.dayChange.toFixed(2)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-[10px] sm:text-xs">Week</div>
                    <div className={`font-mono font-semibold text-xs sm:text-sm ${
                      macroAnalysis.industrySectorAnalysis.weekChange >= 0 ? 'text-success' : 'text-destructive'
                    }`}>
                      {macroAnalysis.industrySectorAnalysis.weekChange >= 0 ? '+' : ''}{macroAnalysis.industrySectorAnalysis.weekChange.toFixed(2)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-[10px] sm:text-xs">Month</div>
                    <div className={`font-mono font-semibold text-xs sm:text-sm ${
                      macroAnalysis.industrySectorAnalysis.monthChange >= 0 ? 'text-success' : 'text-destructive'
                    }`}>
                      {macroAnalysis.industrySectorAnalysis.monthChange >= 0 ? '+' : ''}{macroAnalysis.industrySectorAnalysis.monthChange.toFixed(2)}%
                    </div>
                  </div>
                </div>

                <p className="text-[10px] sm:text-xs text-muted-foreground italic bg-background/50 p-1.5 sm:p-2 rounded">
                  {macroAnalysis.industrySectorAnalysis.sectorExplanation}
                </p>
              </div>
            )}

            {macroAnalysis.marketCondition && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm">
                <div>
                  <span className="text-muted-foreground">Market: </span>
                  <span className="font-medium capitalize">{macroAnalysis.marketCondition}</span>
                </div>
                {macroAnalysis.riskAppetite && (
                  <div>
                    <span className="text-muted-foreground">Risk: </span>
                    <span className="font-medium capitalize">{macroAnalysis.riskAppetite}</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Section 4: 2-Week Execution Notes */}
      <Card>
        <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-4">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
            <Clock className="h-4 sm:h-5 w-4 sm:w-5" />
            2-Week Execution Notes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-6 pt-0">
          {analysis.recommendation && (
            <div className="space-y-1.5 sm:space-y-2">
              <div className="text-xs sm:text-sm font-medium">Recommended Action</div>
              <p className="text-xs sm:text-sm leading-relaxed">
                {analysis.recommendation}
              </p>
            </div>
          )}

          {(analysis as any).insiderValidation && (
            <div className="space-y-1.5 sm:space-y-2 p-2 sm:p-3 bg-muted/30 rounded-lg">
              <div className="text-xs sm:text-sm font-medium">Insider Trade Context</div>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {(analysis as any).insiderValidation}
              </p>
            </div>
          )}

          <div className="p-2 sm:p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              <strong>Time Horizon:</strong> This analysis is optimized for a 2-week trading window. 
              Monitor daily briefs for position updates and changing market conditions.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Section - For Technical Investors */}
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="advanced">
          <AccordionTrigger className="text-sm" data-testid="button-toggle-advanced">
            Advanced - For Technical Investors
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-2">
            
            {/* Technical Analysis - Detailed Breakdown */}
            {analysis.technicalAnalysisScore != null && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>Technical Indicators</span>
                    <Badge variant={
                      analysis.technicalAnalysisScore >= 70 ? 'default' :
                      analysis.technicalAnalysisScore >= 40 ? 'secondary' : 'destructive'
                    }>
                      {analysis.technicalAnalysisScore}/100
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm text-muted-foreground space-y-2">
                    <p className="font-medium text-foreground">What This Means:</p>
                    <p>
                      Technical analysis uses price charts and mathematical indicators to predict future price movements. 
                      {analysis.technicalAnalysisTrend === 'bullish' && " The current trend is bullish, suggesting upward momentum."}
                      {analysis.technicalAnalysisTrend === 'bearish' && " The current trend is bearish, suggesting downward pressure."}
                      {analysis.technicalAnalysisTrend === 'neutral' && " The current trend is neutral, suggesting consolidation or sideways movement."}
                    </p>
                  </div>

                  {analysis.technicalAnalysisTrend && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Overall Trend:</span>
                      <Badge variant={
                        analysis.technicalAnalysisTrend === 'bullish' ? 'default' :
                        analysis.technicalAnalysisTrend === 'bearish' ? 'destructive' : 'secondary'
                      } className="capitalize">
                        {analysis.technicalAnalysisTrend}
                      </Badge>
                      {analysis.technicalAnalysisMomentum && (
                        <>
                          <span className="text-sm text-muted-foreground">Momentum:</span>
                          <Badge variant="outline" className="capitalize">
                            {analysis.technicalAnalysisMomentum}
                          </Badge>
                        </>
                      )}
                    </div>
                  )}

                  {analysis.technicalAnalysisSignals && analysis.technicalAnalysisSignals.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Key Signals:</div>
                      <ul className="space-y-1.5">
                        {analysis.technicalAnalysisSignals.map((signal: string, index: number) => (
                          <li key={index} className="text-sm text-muted-foreground flex items-start gap-2 pl-2">
                            <span className="shrink-0 mt-1.5">•</span>
                            <span className="flex-1">{signal}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground italic bg-muted/30 p-3 rounded-lg">
                    <strong>Note for Technical Traders:</strong> Technical indicators like <TermTooltip term="RSI">RSI</TermTooltip> (overbought/oversold), 
                    <TermTooltip term="MACD">MACD</TermTooltip> (momentum), <TermTooltip term="Bollinger Bands">Bollinger Bands</TermTooltip> (volatility), and moving averages (trend) help identify entry and exit points. 
                    Combined with volume trends and <TermTooltip term="ATR">ATR</TermTooltip> (volatility measurement), these signals provide a quantitative view of market sentiment.
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Sentiment Analysis - Detailed Breakdown */}
            {analysis.sentimentAnalysisScore != null && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>News Sentiment Analysis</span>
                    <Badge variant={
                      analysis.sentimentAnalysisScore >= 70 ? 'default' :
                      analysis.sentimentAnalysisScore >= 40 ? 'secondary' : 'destructive'
                    }>
                      {analysis.sentimentAnalysisScore}/100
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm text-muted-foreground space-y-2">
                    <p className="font-medium text-foreground">What This Means:</p>
                    <p>
                      Sentiment analysis evaluates recent news articles to gauge market perception. 
                      {analysis.sentimentAnalysisTrend === 'positive' && " Current coverage is predominantly positive, which may support price appreciation."}
                      {analysis.sentimentAnalysisTrend === 'negative' && " Current coverage is predominantly negative, which may create headwinds."}
                      {analysis.sentimentAnalysisTrend === 'neutral' && " Current coverage is balanced, with mixed positive and negative themes."}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {analysis.sentimentAnalysisTrend && (
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Sentiment Trend</div>
                        <Badge variant={
                          analysis.sentimentAnalysisTrend === 'positive' ? 'default' :
                          analysis.sentimentAnalysisTrend === 'negative' ? 'destructive' : 'secondary'
                        } className="capitalize">
                          {analysis.sentimentAnalysisTrend}
                        </Badge>
                      </div>
                    )}
                    {analysis.sentimentAnalysisNewsVolume && (
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">News Volume</div>
                        <Badge variant="outline" className="capitalize">
                          {analysis.sentimentAnalysisNewsVolume}
                        </Badge>
                      </div>
                    )}
                  </div>

                  {analysis.sentimentAnalysisKeyThemes && analysis.sentimentAnalysisKeyThemes.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Key Themes in Coverage:</div>
                      <div className="flex flex-wrap gap-2">
                        {analysis.sentimentAnalysisKeyThemes.map((theme: string, index: number) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {theme}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground italic bg-muted/30 p-3 rounded-lg">
                    <strong>For Advanced Investors:</strong> Sentiment scores aggregate tone, relevance, and <TermTooltip term="volume">volume</TermTooltip> of recent news coverage. 
                    High positive sentiment with high volume often precedes price movements. Key themes reveal what's driving the narrative—watch for shifts 
                    in coverage that may signal changing market perception ahead of price action.
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Financial Health - Detailed Breakdown */}
            {analysis.financialHealthScore != null && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>Financial Health Analysis</span>
                    <Badge variant={
                      analysis.financialHealthScore >= 70 ? 'default' :
                      analysis.financialHealthScore >= 40 ? 'secondary' : 'destructive'
                    }>
                      {analysis.financialHealthScore}/100
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm text-muted-foreground space-y-2">
                    <p className="font-medium text-foreground">What This Means:</p>
                    <p>
                      Financial health evaluates the company's balance sheet, income statement, and cash flow. 
                      A strong score indicates solid profitability, healthy liquidity, manageable debt, and sustainable growth. 
                      This provides confidence that the company can weather economic headwinds and fund future operations.
                    </p>
                  </div>

                  {/* Key Metrics with Evidence from Fundamental Data */}
                  {analysis.fundamentalData && (
                    <div className="grid grid-cols-2 gap-3">
                      {/* Profitability Evidence */}
                      <div className="p-3 bg-muted/30 rounded-lg space-y-2">
                        <div className="text-xs text-muted-foreground font-medium">Profitability</div>
                        <div className="text-sm font-medium">{assessProfitability(analysis.fundamentalData)}</div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          {analysis.fundamentalData?.profitMargin != null && (
                            <div>Profit Margin: <span className="font-mono">{(analysis.fundamentalData.profitMargin * 100).toFixed(1)}%</span></div>
                          )}
                          {analysis.fundamentalData?.returnOnEquity != null && (
                            <div>ROE: <span className="font-mono">{(analysis.fundamentalData.returnOnEquity * 100).toFixed(1)}%</span></div>
                          )}
                          {analysis.fundamentalData?.returnOnAssets != null && (
                            <div>ROA: <span className="font-mono">{(analysis.fundamentalData.returnOnAssets * 100).toFixed(1)}%</span></div>
                          )}
                        </div>
                      </div>

                      {/* Liquidity Evidence */}
                      <div className="p-3 bg-muted/30 rounded-lg space-y-2">
                        <div className="text-xs text-muted-foreground font-medium">Liquidity</div>
                        <div className="text-sm font-medium">{assessLiquidity(analysis.fundamentalData)}</div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          {analysis.fundamentalData?.currentRatio != null && (
                            <div>Current Ratio: <span className="font-mono">{analysis.fundamentalData.currentRatio.toFixed(2)}</span></div>
                          )}
                          {analysis.fundamentalData?.quickRatio != null && (
                            <div>Quick Ratio: <span className="font-mono">{analysis.fundamentalData.quickRatio.toFixed(2)}</span></div>
                          )}
                        </div>
                      </div>

                      {/* Leverage Evidence */}
                      <div className="p-3 bg-muted/30 rounded-lg space-y-2">
                        <div className="text-xs text-muted-foreground font-medium">Debt Level</div>
                        <div className="text-sm font-medium">{assessDebtLevel(analysis.fundamentalData)}</div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          {analysis.fundamentalData?.debtToEquity != null && (
                            <div>Debt-to-Equity: <span className="font-mono">{analysis.fundamentalData.debtToEquity.toFixed(2)}</span></div>
                          )}
                          {analysis.fundamentalData?.operatingMargin != null && (
                            <div>Op. Margin: <span className="font-mono">{(analysis.fundamentalData.operatingMargin * 100).toFixed(1)}%</span></div>
                          )}
                        </div>
                      </div>

                      {/* Growth Evidence */}
                      <div className="p-3 bg-muted/30 rounded-lg space-y-2">
                        <div className="text-xs text-muted-foreground font-medium">Growth</div>
                        <div className="text-sm font-medium">{assessGrowth(analysis.fundamentalData)}</div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          {analysis.fundamentalData?.eps != null && (
                            <div>EPS: <span className="font-mono">${analysis.fundamentalData.eps.toFixed(2)}</span></div>
                          )}
                          {analysis.fundamentalData?.peRatio != null && (
                            <div>P/E Ratio: <span className="font-mono">{analysis.fundamentalData.peRatio.toFixed(1)}</span></div>
                          )}
                          {analysis.fundamentalData?.dividendYield != null && (
                            <div>Dividend Yield: <span className="font-mono">{(analysis.fundamentalData.dividendYield * 100).toFixed(2)}%</span></div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground italic bg-muted/30 p-3 rounded-lg">
                    <strong>For Fundamental Analysts:</strong> Financial health combines <TermTooltip term="profit margin">profit margins</TermTooltip>, <TermTooltip term="ROE">return on equity (ROE)</TermTooltip>, 
                    <TermTooltip term="current ratio">current ratio</TermTooltip> (liquidity), <TermTooltip term="debt-to-equity ratio">debt-to-equity ratio</TermTooltip> (leverage), and revenue/earnings growth trends. 
                    Companies with high financial health scores are better positioned to execute their strategy, pay dividends, 
                    and maintain competitive advantages during market downturns.
                  </div>
                </CardContent>
              </Card>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Footer */}
      <div className="flex flex-col items-center gap-3 pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => analyzeMutation.mutate()}
          disabled={analyzeMutation.isPending}
          data-testid={`button-reanalyze-${ticker}`}
        >
          {analyzeMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Re-analyzing...
            </>
          ) : (
            <>
              <Brain className="h-4 w-4 mr-2" />
              Refresh Playbook
            </>
          )}
        </Button>
        
        {analysis.analyzedAt && (
          <p className="text-xs text-muted-foreground">
            Last updated: {new Date(analysis.analyzedAt).toLocaleDateString()} at {new Date(analysis.analyzedAt).toLocaleTimeString()}
          </p>
        )}
      </div>
    </div>
  );
}
