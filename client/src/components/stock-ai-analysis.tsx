import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Brain, 
  Loader2, 
  AlertTriangle, 
  RotateCcw,
  FileText,
  TrendingUp,
  AlertCircle,
  Clock
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface StockAIAnalysisProps {
  ticker: string;
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
            <span>Loading analysis...</span>
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
                  Generate AI Analysis
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
              <span>AI analysis in progress...</span>
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

  // Get the score - Gemini's confidenceScore is PRIMARY, scorecard is just supporting data
  const aiScore = analysis.confidenceScore ?? (analysis as any).scorecard?.globalScore ?? 50;
  const scorecardScore = (analysis as any).scorecard?.globalScore; // Supporting metadata only
  
  // Determine if this is a SELL/short opportunity
  const overallRatingLower = (analysis.overallRating ?? '').toLowerCase();
  const recommendationLower = (analysis.recommendation ?? '').toLowerCase();
  const isSellOpportunity = recommendationLower === 'sell' || 
                            overallRatingLower.includes('sell') ||
                            overallRatingLower.includes('avoid');
  
  const getSignalLabel = (score: number, isSell: boolean): string => {
    if (isSell) {
      // For short opportunities, high score = strong short signal
      if (score >= 75) return "Strong Short";
      if (score >= 60) return "Short Signal";
      if (score >= 45) return "Weak Short";
      return "No Clear Signal";
    } else {
      if (score >= 75) return "Strong Buy";
      if (score >= 60) return "Moderate Buy";
      if (score >= 45) return "Hold";
      if (score >= 30) return "Weak";
      return "Avoid";
    }
  };
  const signalLabel = getSignalLabel(aiScore, isSellOpportunity);
  const signalVariant = aiScore >= 70 ? 'default' : aiScore >= 50 ? 'secondary' : 'destructive';

  // Build evidence chips from available data with hints for tooltips
  const evidenceChips: { label: string; source: string; hint: string }[] = [];
  
  // SEC Filing evidence
  if (analysis.secFilingType && analysis.secFilingDate) {
    const filingAge = Math.floor((Date.now() - new Date(analysis.secFilingDate).getTime()) / (1000 * 60 * 60 * 24));
    evidenceChips.push({ 
      label: `${analysis.secFilingType} filed ${analysis.secFilingDate}`, 
      source: "SEC",
      hint: filingAge <= 30 
        ? "Recent SEC filing provides current financial data for this analysis" 
        : `Filing is ${filingAge} days old - newer data would strengthen confidence`
    });
  }
  
  // Fundamental data evidence
  const fd = (analysis as any).fundamentalData;
  if (fd) {
    if (fd.peRatio != null) {
      const pe = Number(fd.peRatio);
      const peHint = pe < 15 ? "Low P/E suggests undervaluation or slower growth expectations" :
                     pe < 25 ? "Moderate P/E indicates reasonable market valuation" :
                     pe < 40 ? "Higher P/E reflects growth expectations - riskier if growth slows" :
                     "Very high P/E - requires strong growth to justify premium";
      evidenceChips.push({ 
        label: `P/E Ratio: ${pe.toFixed(1)}`, 
        source: "Fundamentals",
        hint: peHint
      });
    }
    if (fd.profitMargin != null) {
      const margin = Number(fd.profitMargin) * 100;
      const marginHint = margin > 20 ? "Strong profit margins indicate pricing power and efficiency" :
                         margin > 10 ? "Healthy margins - company converts revenue to profit effectively" :
                         margin > 0 ? "Thin margins - vulnerable to cost pressures or competition" :
                         "Negative margins - company is losing money on operations";
      evidenceChips.push({ 
        label: `Profit Margin: ${margin.toFixed(1)}%`, 
        source: "Fundamentals",
        hint: marginHint
      });
    }
    if (fd.returnOnEquity != null) {
      const roe = Number(fd.returnOnEquity) * 100;
      const roeHint = roe > 20 ? "Excellent ROE - management uses shareholder capital very effectively" :
                      roe > 10 ? "Solid ROE - decent returns on invested capital" :
                      roe > 0 ? "Modest ROE - limited value creation for shareholders" :
                      "Negative ROE - company is destroying shareholder value";
      evidenceChips.push({ 
        label: `Return on Equity: ${roe.toFixed(1)}%`, 
        source: "Fundamentals",
        hint: roeHint
      });
    }
    if (fd.currentRatio != null) {
      const cr = Number(fd.currentRatio);
      const crHint = cr > 2 ? "Strong liquidity - ample assets to cover short-term obligations" :
                     cr > 1 ? "Adequate liquidity - can meet near-term debts" :
                     "Low liquidity - may struggle to pay short-term obligations";
      evidenceChips.push({ 
        label: `Current Ratio: ${cr.toFixed(2)}`, 
        source: "Fundamentals",
        hint: crHint
      });
    }
    if (fd.debtToEquity != null) {
      const de = Number(fd.debtToEquity);
      const deHint = de < 0.5 ? "Low leverage - conservative capital structure, lower risk" :
                     de < 1.5 ? "Moderate leverage - balanced use of debt financing" :
                     "High leverage - significant debt increases financial risk";
      evidenceChips.push({ 
        label: `Debt/Equity: ${de.toFixed(2)}`, 
        source: "Fundamentals",
        hint: deHint
      });
    }
  }

  // Technical signals
  if (analysis.technicalAnalysisTrend) {
    const trend = analysis.technicalAnalysisTrend.toLowerCase();
    const techHint = trend.includes("bullish") ? "Technical indicators suggest upward momentum - supports buy thesis" :
                     trend.includes("bearish") ? "Technical indicators suggest downward pressure - caution advised" :
                     "Neutral technicals - price action doesn't strongly favor either direction";
    evidenceChips.push({ 
      label: `Technical Trend: ${analysis.technicalAnalysisTrend}`, 
      source: "Technicals",
      hint: techHint
    });
  }

  // Sentiment
  if (analysis.sentimentAnalysisTrend) {
    const sentiment = analysis.sentimentAnalysisTrend.toLowerCase();
    const sentHint = sentiment.includes("positive") || sentiment.includes("bullish") 
      ? "Positive news coverage may attract buyers and support price" :
      sentiment.includes("negative") || sentiment.includes("bearish")
      ? "Negative sentiment could pressure the stock in the short term" :
      "Mixed or neutral news - no strong sentiment catalyst identified";
    evidenceChips.push({ 
      label: `News Sentiment: ${analysis.sentimentAnalysisTrend}`, 
      source: "News",
      hint: sentHint
    });
  }

  // Insider Activity - from section explanations
  const insiderExplanation = (analysis as any).sectionExplanations?.insiderActivity;
  if (insiderExplanation?.keyFactors && insiderExplanation.keyFactors.length > 0) {
    const insiderFactor = insiderExplanation.keyFactors[0];
    const isPositive = insiderFactor.toLowerCase().includes("buy") || insiderFactor.toLowerCase().includes("purchase");
    evidenceChips.push({ 
      label: `Insider Activity: ${insiderFactor}`, 
      source: "Insider",
      hint: isPositive 
        ? "Insider buying signals confidence from those with deep company knowledge"
        : "Insider selling may indicate concerns, though could be for personal reasons"
    });
  }
  
  // Macro/Sector - from section explanations
  const macroExplanation = (analysis as any).sectionExplanations?.macroSector;
  if (macroExplanation?.summary) {
    evidenceChips.push({ 
      label: `Sector: ${macroExplanation.summary.slice(0, 60)}${macroExplanation.summary.length > 60 ? '...' : ''}`, 
      source: "Macro",
      hint: macroExplanation.outlook || "Sector conditions influence whether broader market trends support or hinder this stock"
    });
  }

  // Timing Assessment - critical for 1-2 week horizon
  const timingAssessment = (analysis as any).timingAssessment;
  if (timingAssessment?.phase) {
    const phase = timingAssessment.phase.toLowerCase();
    const timingHint = phase === 'early' 
      ? "You're early to this opportunity - the market may not have fully reacted yet"
      : phase === 'mid'
      ? "Mid-move timing - acceptable entry if fundamentals support the thesis"
      : "Late to the move - the opportunity window may have passed, higher risk";
    evidenceChips.push({ 
      label: `Timing: ${timingAssessment.phase.toUpperCase()} in move`, 
      source: "Timing",
      hint: timingAssessment.explanation || timingHint
    });
  }

  // Check for red flags / risks
  const hasWarnings = (analysis.redFlags && analysis.redFlags.length > 0) || 
                      (analysis.risks && analysis.risks.length > 0) ||
                      (analysis.weaknesses && analysis.weaknesses.length > 0);
  
  const allWarnings = [
    ...(analysis.redFlags || []),
    ...(analysis.weaknesses || []),
    ...(analysis.risks || [])
  ].slice(0, 5);

  return (
    <div className="space-y-4">
      {/* Section 1: The Decision */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="flex items-center gap-2 text-base">
              <Brain className="h-5 w-5" />
              AI Decision
            </CardTitle>
            <div className="flex items-center gap-3">
              <Badge variant={signalVariant} className="text-sm font-semibold px-3">
                {signalLabel}
              </Badge>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className={`text-xl font-mono font-bold cursor-help ${
                    aiScore >= 70 ? "text-emerald-600 dark:text-emerald-400" : 
                    aiScore >= 50 ? "text-amber-600 dark:text-amber-400" : 
                    "text-red-500 dark:text-red-400"
                  }`} data-testid="text-ai-score">
                    {aiScore}/100
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs text-sm">
                  <p className="font-medium">AI Confidence Score</p>
                  <p className="text-muted-foreground">
                    {isSellOpportunity 
                      ? "How confident the AI is in the short opportunity for a 1-2 week horizon"
                      : "How confident the AI is in the buy opportunity for a 1-2 week horizon"
                    }
                  </p>
                  {scorecardScore && scorecardScore !== aiScore && (
                    <p className="text-xs mt-1 text-muted-foreground">
                      Rule-based scorecard: {scorecardScore}/100
                    </p>
                  )}
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          {/* Timing Badge */}
          {timingAssessment?.phase && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Badge 
                variant={
                  timingAssessment.phase === 'early' ? 'default' : 
                  timingAssessment.phase === 'mid' ? 'secondary' : 
                  'destructive'
                }
                className="text-xs"
              >
                {timingAssessment.phase.toUpperCase()} in move
              </Badge>
              {timingAssessment.explanation && (
                <span className="text-xs text-muted-foreground">
                  {timingAssessment.explanation}
                </span>
              )}
            </div>
          )}
          
          {/* The Recommendation */}
          {analysis.recommendation && (
            <p className="text-sm leading-relaxed text-muted-foreground" data-testid="text-recommendation">
              {analysis.recommendation}
            </p>
          )}
          
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span className="italic">
              {isSellOpportunity 
                ? "Optimized for 1-2 week short opportunity" 
                : "Optimized for 1-2 week trading horizon"
              }
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: AI Reasoning - How did we get here? */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-5 w-5" />
            How This Decision Was Made
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          {/* AI's natural reasoning / summary */}
          {analysis.summary && (
            <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-reasoning">
              {analysis.summary}
            </p>
          )}

          {/* Key Strengths that support the decision */}
          {analysis.strengths && analysis.strengths.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                <TrendingUp className="h-4 w-4" />
                Key Strengths
              </div>
              <ul className="space-y-1.5 pl-6">
                {analysis.strengths.slice(0, 4).map((strength: string, i: number) => (
                  <li key={i} className="text-sm text-muted-foreground list-disc">
                    {strength}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Evidence Chips - Data grounding with tooltips */}
          {evidenceChips.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Based on
              </div>
              <div className="flex flex-wrap gap-2">
                {evidenceChips.slice(0, 10).map((chip, i) => (
                  <Tooltip key={i}>
                    <TooltipTrigger asChild>
                      <Badge 
                        variant="outline" 
                        className="text-xs font-normal bg-background cursor-help py-1.5"
                      >
                        <span className="text-muted-foreground mr-1.5 font-medium">{chip.source}:</span>
                        {chip.label}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs text-sm">
                      <p>{chip.hint}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 3: Warnings (collapsed if present) */}
      {hasWarnings && (
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="warnings" className="border rounded-lg px-4">
            <AccordionTrigger className="text-sm py-3" data-testid="button-toggle-warnings">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <AlertCircle className="h-4 w-4" />
                <span>Risks & Concerns</span>
                <Badge variant="secondary" className="text-xs ml-1">
                  {allWarnings.length}
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <ul className="space-y-2">
                {allWarnings.map((warning: string, i: number) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-amber-500 mt-0.5">•</span>
                    {warning}
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}

      {/* Footer */}
      <div className="flex flex-col items-center gap-2 pt-2">
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
              Refresh Analysis
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
