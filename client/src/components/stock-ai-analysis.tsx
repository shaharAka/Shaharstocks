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
  AlertCircle
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

  // Get the score and signal
  const globalScore = (analysis as any).scorecard?.globalScore ?? analysis.confidenceScore ?? 50;
  const getSignalLabel = (score: number): string => {
    if (score >= 75) return "Strong Buy";
    if (score >= 60) return "Moderate Buy";
    if (score >= 45) return "Hold";
    if (score >= 30) return "Weak";
    return "Avoid";
  };
  const signalLabel = getSignalLabel(globalScore);
  const signalVariant = globalScore >= 70 ? 'default' : globalScore >= 50 ? 'secondary' : 'destructive';

  // Build evidence chips from available data
  const evidenceChips: { label: string; source: string }[] = [];
  
  // SEC Filing evidence
  if (analysis.secFilingType && analysis.secFilingDate) {
    evidenceChips.push({ 
      label: `${analysis.secFilingType} filed ${analysis.secFilingDate}`, 
      source: "SEC" 
    });
  }
  
  // Fundamental data evidence
  const fd = (analysis as any).fundamentalData;
  if (fd) {
    if (fd.peRatio != null) {
      evidenceChips.push({ label: `P/E ${Number(fd.peRatio).toFixed(1)}`, source: "Fundamentals" });
    }
    if (fd.profitMargin != null) {
      evidenceChips.push({ label: `Profit Margin ${(Number(fd.profitMargin) * 100).toFixed(1)}%`, source: "Fundamentals" });
    }
    if (fd.returnOnEquity != null) {
      evidenceChips.push({ label: `ROE ${(Number(fd.returnOnEquity) * 100).toFixed(1)}%`, source: "Fundamentals" });
    }
    if (fd.currentRatio != null) {
      evidenceChips.push({ label: `Current Ratio ${Number(fd.currentRatio).toFixed(2)}`, source: "Fundamentals" });
    }
  }

  // Technical signals
  if (analysis.technicalAnalysisTrend) {
    evidenceChips.push({ 
      label: `Technical trend: ${analysis.technicalAnalysisTrend}`, 
      source: "Technicals" 
    });
  }

  // Sentiment
  if (analysis.sentimentAnalysisTrend) {
    evidenceChips.push({ 
      label: `News sentiment: ${analysis.sentimentAnalysisTrend}`, 
      source: "News" 
    });
  }

  // Insider Activity - from section explanations
  const insiderExplanation = (analysis as any).sectionExplanations?.insiderActivity;
  if (insiderExplanation?.keyFactors && insiderExplanation.keyFactors.length > 0) {
    evidenceChips.push({ 
      label: insiderExplanation.keyFactors[0], 
      source: "Insider" 
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
              <span className={`text-xl font-mono font-bold ${
                globalScore >= 70 ? "text-emerald-600 dark:text-emerald-400" : 
                globalScore >= 50 ? "text-amber-600 dark:text-amber-400" : 
                "text-red-500 dark:text-red-400"
              }`} data-testid="text-global-score">
                {globalScore}/100
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          {/* The Recommendation */}
          {analysis.recommendation && (
            <div className="p-4 bg-muted/50 rounded-lg border-l-4 border-l-amber-500">
              <p className="text-sm leading-relaxed font-medium" data-testid="text-recommendation">
                {analysis.recommendation}
              </p>
            </div>
          )}
          
          <p className="text-xs text-muted-foreground italic">
            Optimized for 1-2 week trading horizon
          </p>
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

          {/* Evidence Chips - Data grounding */}
          {evidenceChips.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Based on
              </div>
              <div className="flex flex-wrap gap-1.5">
                {evidenceChips.slice(0, 8).map((chip, i) => (
                  <Badge 
                    key={i} 
                    variant="outline" 
                    className="text-xs font-normal bg-background"
                  >
                    <span className="text-muted-foreground mr-1">{chip.source}:</span>
                    {chip.label}
                  </Badge>
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
