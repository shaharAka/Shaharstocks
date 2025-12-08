import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Brain, 
  Loader2, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  AlertCircle, 
  Target,
  Eye,
  Zap,
  Clock,
  RotateCcw,
  CheckCircle,
  XCircle,
  Pause
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { StockAnalysis } from "@shared/schema";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { TermTooltip } from "@/components/term-tooltip";

interface StockAIAnalysisProps {
  ticker: string;
}

function getSignalColor(score: number): string {
  if (score >= 70) return "text-green-600 dark:text-green-400";
  if (score >= 50) return "text-amber-600 dark:text-amber-400";
  if (score >= 30) return "text-orange-600 dark:text-orange-400";
  return "text-red-600 dark:text-red-400";
}

function getSignalBgColor(score: number): string {
  if (score >= 70) return "bg-green-500/10 border-green-500/20";
  if (score >= 50) return "bg-amber-500/10 border-amber-500/20";
  if (score >= 30) return "bg-orange-500/10 border-orange-500/20";
  return "bg-red-500/10 border-red-500/20";
}

function getSignalLabel(score: number): { label: string; icon: typeof CheckCircle } {
  if (score >= 70) return { label: "ENTER", icon: CheckCircle };
  if (score >= 50) return { label: "WATCH", icon: Eye };
  if (score >= 30) return { label: "CAUTION", icon: Pause };
  return { label: "AVOID", icon: XCircle };
}

function getSignalDescription(score: number): string {
  if (score >= 70) return "Strong insider signal with favorable conditions for entry";
  if (score >= 50) return "Moderate signal - monitor for better entry point";
  if (score >= 30) return "Weak signal - significant concerns present";
  return "Poor opportunity - risk outweighs potential reward";
}

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
    staleTime: 0,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data && (data.status === "pending" || data.status === "analyzing")) {
        return 3000;
      }
      return false;
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

  // Get signal score (use integratedScore or confidenceScore)
  const signalScore = analysis.integratedScore ?? analysis.confidenceScore ?? 50;
  const signalInfo = getSignalLabel(signalScore);
  const SignalIcon = signalInfo.icon;

  // Extract new fields with fallbacks for older analysis data
  const entryTiming = (analysis as any).entryTiming;
  const sectorAnalysis = (analysis as any).sectorAnalysis;

  // Helper for entry timing colors
  const getTimingColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'early': return 'text-green-600 dark:text-green-400 bg-green-500/10 border-green-500/20';
      case 'optimal': return 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'late': return 'text-orange-600 dark:text-orange-400 bg-orange-500/10 border-orange-500/20';
      case 'missed': return 'text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20';
      default: return 'text-muted-foreground bg-muted/30 border-border';
    }
  };

  // Helper for sector outlook colors
  const getSectorColor = (outlook: string) => {
    switch (outlook?.toLowerCase()) {
      case 'bullish': return 'text-green-600 dark:text-green-400';
      case 'bearish': return 'text-red-600 dark:text-red-400';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Section 1: Signal Score - Hero display */}
      <Card className={`border ${getSignalBgColor(signalScore)}`}>
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
            {/* Score Circle */}
            <div className="flex flex-col items-center">
              <div className={`text-4xl sm:text-5xl font-bold ${getSignalColor(signalScore)}`} data-testid="text-signal-score">
                {signalScore}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Signal Score</div>
            </div>
            
            {/* Verdict */}
            <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
                <SignalIcon className={`h-5 w-5 ${getSignalColor(signalScore)}`} />
                <span className={`text-lg sm:text-xl font-semibold ${getSignalColor(signalScore)}`}>
                  {signalInfo.label}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {getSignalDescription(signalScore)}
              </p>
            </div>

            {/* Refresh Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => analyzeMutation.mutate()}
              disabled={analyzeMutation.isPending}
              data-testid={`button-refresh-analysis-${ticker}`}
              className="shrink-0"
            >
              {analyzeMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Context Bar - Entry Timing, Sector, Sentiment */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
        {/* Entry Timing */}
        <div className={`p-3 rounded-lg border ${entryTiming?.status ? getTimingColor(entryTiming.status) : 'bg-muted/30 border-border'}`}>
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-4 w-4" />
            <span className="text-xs font-medium uppercase">Entry Timing</span>
          </div>
          {entryTiming ? (
            <>
              <div className="text-sm font-semibold capitalize" data-testid="text-entry-timing">
                {entryTiming.status || 'Unknown'}
              </div>
              {entryTiming.priceMoveSinceInsider && (
                <div className="text-xs text-muted-foreground mt-1">
                  {entryTiming.priceMoveSinceInsider}
                </div>
              )}
            </>
          ) : (
            <div className="text-sm text-muted-foreground">Not assessed</div>
          )}
        </div>

        {/* Sector Analysis */}
        <div className="p-3 rounded-lg border bg-muted/30 border-border">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="h-4 w-4" />
            <span className="text-xs font-medium uppercase">Sector</span>
          </div>
          {sectorAnalysis ? (
            <>
              <div className="text-sm font-semibold" data-testid="text-sector">
                {sectorAnalysis.sector || 'Unknown'}
              </div>
              <div className={`text-xs mt-1 capitalize ${getSectorColor(sectorAnalysis.sectorOutlook)}`}>
                {sectorAnalysis.sectorOutlook || 'Neutral'} outlook
              </div>
            </>
          ) : (
            <div className="text-sm text-muted-foreground">Not analyzed</div>
          )}
        </div>

        {/* News Sentiment */}
        <div className="p-3 rounded-lg border bg-muted/30 border-border">
          <div className="flex items-center gap-2 mb-1">
            <Eye className="h-4 w-4" />
            <span className="text-xs font-medium uppercase">News Sentiment</span>
          </div>
          {analysis.sentimentAnalysisScore != null ? (
            <>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-semibold ${
                  analysis.sentimentAnalysisScore >= 60 ? 'text-green-600 dark:text-green-400' :
                  analysis.sentimentAnalysisScore >= 40 ? 'text-amber-600 dark:text-amber-400' :
                  'text-red-600 dark:text-red-400'
                }`} data-testid="text-sentiment-score">
                  {analysis.sentimentAnalysisScore}/100
                </span>
                <Badge variant="outline" className="text-[10px] capitalize">
                  {analysis.sentimentAnalysisTrend || 'neutral'}
                </Badge>
              </div>
              {analysis.sentimentAnalysisNewsVolume && (
                <div className="text-xs text-muted-foreground mt-1 capitalize">
                  {analysis.sentimentAnalysisNewsVolume} news volume
                </div>
              )}
            </>
          ) : (
            <div className="text-sm text-muted-foreground">No data</div>
          )}
        </div>
      </div>

      {/* Entry Timing Assessment (if available) */}
      {entryTiming?.assessment && (
        <div className={`p-3 rounded-lg border ${getTimingColor(entryTiming.status)}`}>
          <p className="text-xs sm:text-sm" data-testid="text-timing-assessment">
            <strong>Timing:</strong> {entryTiming.assessment}
          </p>
        </div>
      )}

      {/* Sector Note (if available) */}
      {sectorAnalysis?.sectorNote && (
        <div className="p-3 rounded-lg border bg-muted/30 border-border">
          <p className="text-xs sm:text-sm" data-testid="text-sector-note">
            <strong>Sector Context:</strong> {sectorAnalysis.sectorNote}
          </p>
        </div>
      )}

      {/* Section 3: AI Playbook - The main recommendation */}
      <Card>
        <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-4">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
            <Target className="h-4 sm:h-5 w-4 sm:w-5 text-amber-600 dark:text-amber-400" />
            AI Playbook
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0">
          {/* Main Playbook/Recommendation */}
          {analysis.recommendation && (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <p className="text-sm sm:text-base leading-relaxed whitespace-pre-line" data-testid="text-playbook">
                {analysis.recommendation}
              </p>
            </div>
          )}

          {/* Summary if no playbook but has summary */}
          {!analysis.recommendation && analysis.summary && (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <p className="text-sm sm:text-base leading-relaxed" data-testid="text-summary">
                {analysis.summary}
              </p>
            </div>
          )}

          {!analysis.recommendation && !analysis.summary && (
            <p className="text-sm text-muted-foreground italic">No playbook available</p>
          )}
        </CardContent>
      </Card>

      {/* Section 3: Key Factors - Strengths & Risks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        {/* Bullish Factors */}
        <Card>
          <CardHeader className="p-3 sm:p-4 pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-green-600 dark:text-green-400">Bullish Factors</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            {analysis.strengths && analysis.strengths.length > 0 ? (
              <ul className="space-y-1.5">
                {analysis.strengths.slice(0, 4).map((strength: string, index: number) => (
                  <li key={index} className="text-xs sm:text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-green-600 dark:text-green-400 shrink-0">+</span>
                    <span className="flex-1">{strength}</span>
                  </li>
                ))}
              </ul>
            ) : analysis.opportunities && analysis.opportunities.length > 0 ? (
              <ul className="space-y-1.5">
                {analysis.opportunities.slice(0, 4).map((opp: string, index: number) => (
                  <li key={index} className="text-xs sm:text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-green-600 dark:text-green-400 shrink-0">+</span>
                    <span className="flex-1">{opp}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground italic">No bullish factors identified</p>
            )}
          </CardContent>
        </Card>

        {/* Bearish Factors */}
        <Card>
          <CardHeader className="p-3 sm:p-4 pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
              <span className="text-red-600 dark:text-red-400">Bearish Factors</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            {(analysis.redFlags && analysis.redFlags.length > 0) || 
             (analysis.weaknesses && analysis.weaknesses.length > 0) || 
             (analysis.risks && analysis.risks.length > 0) ? (
              <ul className="space-y-1.5">
                {[
                  ...(analysis.redFlags || []).slice(0, 2),
                  ...(analysis.weaknesses || []).slice(0, 2),
                  ...(analysis.risks || []).slice(0, 2)
                ].slice(0, 4).map((risk: string, index: number) => (
                  <li key={index} className="text-xs sm:text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-red-600 dark:text-red-400 shrink-0">-</span>
                    <span className="flex-1">{risk}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground italic">No significant risks identified</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Time Horizon Note */}
      <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
        <div className="flex items-start gap-2">
          <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            <strong className="text-foreground">2-Week Horizon:</strong> This analysis is optimized for short-term trading. 
            Monitor daily briefs for position updates.
          </p>
        </div>
      </div>

      {/* Advanced Section - Collapsible for technical details */}
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="advanced">
          <AccordionTrigger className="text-sm" data-testid="button-toggle-advanced">
            Advanced Details
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-2">
            
            {/* Technical Analysis */}
            {analysis.technicalAnalysisScore != null && (
              <Card>
                <CardHeader className="p-3 sm:p-4 pb-2">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span>Technical Indicators</span>
                    <Badge variant={
                      analysis.technicalAnalysisScore >= 70 ? 'default' :
                      analysis.technicalAnalysisScore >= 40 ? 'secondary' : 'destructive'
                    }>
                      {analysis.technicalAnalysisScore}/100
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-4 pt-0 space-y-3">
                  {analysis.technicalAnalysisTrend && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground">Trend:</span>
                      <Badge variant={
                        analysis.technicalAnalysisTrend === 'bullish' ? 'default' :
                        analysis.technicalAnalysisTrend === 'bearish' ? 'destructive' : 'secondary'
                      } className="capitalize text-xs">
                        {analysis.technicalAnalysisTrend}
                      </Badge>
                      {analysis.technicalAnalysisMomentum && (
                        <>
                          <span className="text-xs text-muted-foreground">Momentum:</span>
                          <Badge variant="outline" className="capitalize text-xs">
                            {analysis.technicalAnalysisMomentum}
                          </Badge>
                        </>
                      )}
                    </div>
                  )}

                  {analysis.technicalAnalysisSignals && analysis.technicalAnalysisSignals.length > 0 && (
                    <ul className="space-y-1">
                      {analysis.technicalAnalysisSignals.slice(0, 3).map((signal: string, index: number) => (
                        <li key={index} className="text-xs text-muted-foreground flex items-start gap-2">
                          <span className="shrink-0">•</span>
                          <span className="flex-1">{signal}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Sentiment Analysis */}
            {analysis.sentimentAnalysisScore != null && (
              <Card>
                <CardHeader className="p-3 sm:p-4 pb-2">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span>News Sentiment</span>
                    <Badge variant={
                      analysis.sentimentAnalysisScore >= 70 ? 'default' :
                      analysis.sentimentAnalysisScore >= 40 ? 'secondary' : 'destructive'
                    }>
                      {analysis.sentimentAnalysisScore}/100
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-4 pt-0 space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {analysis.sentimentAnalysisTrend && (
                      <>
                        <span className="text-xs text-muted-foreground">Sentiment:</span>
                        <Badge variant={
                          analysis.sentimentAnalysisTrend === 'positive' ? 'default' :
                          analysis.sentimentAnalysisTrend === 'negative' ? 'destructive' : 'secondary'
                        } className="capitalize text-xs">
                          {analysis.sentimentAnalysisTrend}
                        </Badge>
                      </>
                    )}
                    {analysis.sentimentAnalysisNewsVolume && (
                      <>
                        <span className="text-xs text-muted-foreground">Volume:</span>
                        <Badge variant="outline" className="capitalize text-xs">
                          {analysis.sentimentAnalysisNewsVolume}
                        </Badge>
                      </>
                    )}
                  </div>

                  {analysis.sentimentAnalysisKeyThemes && analysis.sentimentAnalysisKeyThemes.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {analysis.sentimentAnalysisKeyThemes.slice(0, 5).map((theme: string, index: number) => (
                        <Badge key={index} variant="secondary" className="text-[10px]">
                          {theme}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Financial Health */}
            {analysis.financialHealthScore != null && (
              <Card>
                <CardHeader className="p-3 sm:p-4 pb-2">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span>Financial Health</span>
                    <Badge variant={
                      analysis.financialHealthScore >= 70 ? 'default' :
                      analysis.financialHealthScore >= 40 ? 'secondary' : 'destructive'
                    }>
                      {analysis.financialHealthScore}/100
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-4 pt-0">
                  <div className="text-xs text-muted-foreground">
                    Fundamental analysis based on profitability, liquidity, and growth metrics.
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Analysis Timestamp */}
            {analysis.analyzedAt && (
              <div className="text-xs text-muted-foreground text-center pt-2">
                Last analyzed: {new Date(analysis.analyzedAt).toLocaleString()}
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
