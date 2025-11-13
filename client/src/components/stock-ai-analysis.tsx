import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Loader2, AlertTriangle, TrendingUp, AlertCircle, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { StockAnalysis, MacroAnalysis } from "@shared/schema";

interface StockAIAnalysisProps {
  ticker: string;
}

export function StockAIAnalysis({ ticker }: StockAIAnalysisProps) {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(true);

  const { data: analysis, isLoading: isLoadingExisting } = useQuery<StockAnalysis | null>({
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
    enabled: !!analysis?.macroAnalysisId,
    queryFn: async () => {
      const response = await fetch(`/api/macro-analysis/${analysis?.macroAnalysisId}`);
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
      setIsExpanded(true);
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

  const getRecommendationColor = (recommendation: string) => {
    const lower = recommendation.toLowerCase();
    if (lower.includes("buy") || lower.includes("strong buy")) return "default";
    if (lower.includes("hold")) return "secondary";
    if (lower.includes("avoid") || lower.includes("sell")) return "destructive";
    return "secondary";
  };

  const formatRecommendation = (recommendation: string) => {
    return recommendation
      .replace(/_/g, " ")
      .split(" ")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-success";
    if (score >= 40) return "text-warning";
    return "text-destructive";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 70) return { label: "Strong", color: "text-success" };
    if (score >= 40) return { label: "Moderate", color: "text-warning" };
    return { label: "Weak", color: "text-destructive" };
  };

  if (isLoadingExisting) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Loading analysis...</span>
      </div>
    );
  }

  if (!analysis) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          analyzeMutation.mutate();
        }}
        disabled={analyzeMutation.isPending}
        data-testid={`button-analyze-${ticker}`}
        className="w-full"
      >
        {analyzeMutation.isPending ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Analyzing...
          </>
        ) : (
          <>
            <Brain className="h-4 w-4 mr-2" />
            Analyze with AI
          </>
        )}
      </Button>
    );
  }

  // Show analyzing status if analysis is pending or in progress
  if (analysis.status === "pending" || analysis.status === "analyzing") {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground p-2">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>AI analysis in progress...</span>
      </div>
    );
  }

  // Show error status if analysis failed
  if (analysis.status === "failed") {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-destructive p-2">
          <AlertTriangle className="h-3 w-3" />
          <span>Analysis failed: {analysis.errorMessage || "Unknown error"}</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            analyzeMutation.mutate();
          }}
          disabled={analyzeMutation.isPending}
          data-testid={`button-retry-${ticker}`}
          className="w-full"
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
      </div>
    );
  }

  // Only show completed analysis if we have all required data
  if (!analysis.financialHealthScore || !analysis.recommendation || !analysis.summary) {
    return (
      <div className="text-xs text-muted-foreground p-2">
        Incomplete analysis data
      </div>
    );
  }

  return (
    <div className="space-y-2 w-full max-w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        data-testid={`button-toggle-analysis-${ticker}`}
        className="w-full justify-between overflow-hidden"
      >
        <div className="flex items-center gap-2 min-w-0 overflow-hidden">
          <Brain className="h-4 w-4 shrink-0" />
          <span className="text-xs truncate">AI Analysis</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {analysis.integratedScore !== undefined && analysis.integratedScore !== null ? (
            <>
              <span className="text-xs text-muted-foreground font-mono">
                Micro: {analysis.confidenceScore}
              </span>
              <span className={`text-xs font-mono font-semibold ${getScoreColor(analysis.integratedScore)}`}>
                Final: {analysis.integratedScore}/100
              </span>
            </>
          ) : (
            <span className={`text-xs font-mono font-semibold ${getScoreColor(analysis.financialHealthScore)}`}>
              {analysis.financialHealthScore}/100
            </span>
          )}
        </div>
      </Button>
      
      <div className="w-full px-3">
        <div 
          className="text-xs font-medium w-full" 
          style={{ 
            wordBreak: 'break-word', 
            overflowWrap: 'anywhere', 
            whiteSpace: 'normal' 
          }}
        >
          {formatRecommendation(analysis.recommendation)}
        </div>
      </div>

      {isExpanded && (
        <Card className="p-3 space-y-3 w-full max-w-full overflow-hidden">
          {analysis.integratedScore !== undefined && analysis.integratedScore !== null && macroAnalysis && (
            <div className="space-y-3 w-full border-b pb-3">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                <div className="text-xs font-semibold">Dual-Agent Score Analysis</div>
              </div>
              
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="space-y-1">
                  <div className="text-muted-foreground">Micro (Company)</div>
                  <div className={`font-mono font-semibold ${getScoreColor(analysis.confidenceScore || 0)}`}>
                    {analysis.confidenceScore}/100
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-muted-foreground">Macro (Factor)</div>
                  <div className="font-mono font-semibold">
                    ×{macroAnalysis.macroFactor}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-muted-foreground">Final Score</div>
                  <div className={`font-mono font-semibold ${getScoreColor(analysis.integratedScore)}`}>
                    {analysis.integratedScore}/100
                  </div>
                </div>
              </div>

              <div className="space-y-2 bg-muted/30 p-2 rounded">
                <div className="flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5" />
                  <div className="text-xs font-medium">MACRO AGENT: Market & Sector Analysis (1-2 week outlook)</div>
                </div>
                
                <div className="space-y-1.5">
                  {macroAnalysis.industry && (
                    <div className="pb-1 border-b border-border/50">
                      <div className="text-xs">
                        <span className="text-muted-foreground">Industry Segment: </span>
                        <Badge variant="secondary" className="font-semibold">
                          {macroAnalysis.industry}
                        </Badge>
                      </div>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Recommendation: </span>
                      <Badge variant={
                        macroAnalysis.recommendation === 'good' ? 'default' : 
                        macroAnalysis.recommendation === 'neutral' ? 'secondary' :
                        macroAnalysis.recommendation === 'risky' ? 'outline' : 'destructive'
                      } className="font-semibold">
                        {macroAnalysis.recommendation?.toUpperCase() || 'NEUTRAL'} (×{macroAnalysis.macroFactor})
                      </Badge>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Market: </span>
                      <span className="font-medium capitalize">{macroAnalysis.marketCondition || "Neutral"}</span>
                    </div>
                  </div>

                  {(macroAnalysis.sp500Level || macroAnalysis.vixLevel) && (
                    <div className="pt-1 border-t border-border/50">
                      <div className="text-xs font-medium mb-1">Market Indices</div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {macroAnalysis.sp500Level && (
                          <div>
                            <span className="text-muted-foreground">S&P 500: </span>
                            <span className="font-mono">{parseFloat(macroAnalysis.sp500Level).toFixed(2)}</span>
                            {macroAnalysis.sp500Change && (
                              <span className={`ml-1 ${parseFloat(macroAnalysis.sp500Change) >= 0 ? 'text-success' : 'text-destructive'}`}>
                                ({parseFloat(macroAnalysis.sp500Change) >= 0 ? '+' : ''}{parseFloat(macroAnalysis.sp500Change).toFixed(2)}%)
                              </span>
                            )}
                          </div>
                        )}
                        {macroAnalysis.vixLevel && (
                          <div>
                            <span className="text-muted-foreground">VIX: </span>
                            <span className="font-mono">{parseFloat(macroAnalysis.vixLevel).toFixed(2)}</span>
                            {macroAnalysis.vixInterpretation && (
                              <span className="ml-1 text-muted-foreground capitalize">
                                ({macroAnalysis.vixInterpretation.replace(/_/g, ' ')})
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {macroAnalysis.economicIndicators && Object.keys(macroAnalysis.economicIndicators).length > 0 && (
                    <div className="pt-1 border-t border-border/50">
                      <div className="text-xs font-medium mb-1">Economic Indicators</div>
                      <div className="grid grid-cols-2 gap-1.5 text-xs">
                        {macroAnalysis.economicIndicators.interestRate && (
                          <div>
                            <span className="text-muted-foreground">Interest Rate: </span>
                            <span className="font-mono">{macroAnalysis.economicIndicators.interestRate}%</span>
                          </div>
                        )}
                        {macroAnalysis.economicIndicators.inflation && (
                          <div>
                            <span className="text-muted-foreground">Inflation: </span>
                            <span className="font-mono">{macroAnalysis.economicIndicators.inflation}%</span>
                          </div>
                        )}
                        {macroAnalysis.economicIndicators.unemploymentRate && (
                          <div>
                            <span className="text-muted-foreground">Unemployment: </span>
                            <span className="font-mono">{macroAnalysis.economicIndicators.unemploymentRate}%</span>
                          </div>
                        )}
                        {macroAnalysis.economicIndicators.gdpGrowth && (
                          <div>
                            <span className="text-muted-foreground">GDP Growth: </span>
                            <span className="font-mono">{macroAnalysis.economicIndicators.gdpGrowth}%</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {macroAnalysis.summary && (
                    <p className="text-xs text-muted-foreground italic pt-2 border-t border-border/50">
                      {macroAnalysis.summary}
                    </p>
                  )}
                </div>
              </div>

              <div className="text-xs">
                <span className="text-muted-foreground">Integration: </span>
                <span className="font-mono">{analysis.confidenceScore} × {macroAnalysis.macroFactor} = {analysis.integratedScore}/100</span>
              </div>
            </div>
          )}
          
          <div className="space-y-2 w-full max-w-full overflow-hidden border-t pt-3">
            <div className="flex items-center gap-1.5">
              <Brain className="h-3.5 w-3.5" />
              <div className="text-xs font-medium">MICRO AGENT: Stock-Specific Analysis</div>
            </div>
            <div className="space-y-1.5">
              {analysis.confidenceScore !== undefined && analysis.confidenceScore !== null ? (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">Overall Company Score</span>
                    <span className={`text-sm font-mono font-semibold shrink-0 ${getScoreColor(analysis.confidenceScore)}`}>
                      {analysis.confidenceScore}/100
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 pl-3">
                    <span className="text-xs text-muted-foreground">↳ Financial Health Component</span>
                    <span className="text-xs font-medium shrink-0 text-foreground/70">
                      {getScoreLabel(analysis.financialHealthScore).label}
                    </span>
                  </div>
                  {analysis.technicalAnalysisScore !== undefined && analysis.technicalAnalysisScore !== null && (
                    <div className="flex items-center justify-between gap-2 pl-3">
                      <span className="text-xs text-muted-foreground">↳ Technical Analysis Component</span>
                      <span className="text-xs font-medium shrink-0 text-foreground/70">
                        {getScoreLabel(analysis.technicalAnalysisScore).label}
                      </span>
                    </div>
                  )}
                  {analysis.sentimentAnalysisScore !== undefined && analysis.sentimentAnalysisScore !== null && (
                    <div className="flex items-center justify-between gap-2 pl-3">
                      <span className="text-xs text-muted-foreground">↳ Sentiment Analysis Component</span>
                      <span className="text-xs font-medium shrink-0 text-foreground/70">
                        {getScoreLabel(analysis.sentimentAnalysisScore).label}
                      </span>
                    </div>
                  )}
                  
                  <div className="mt-2 pt-2 border-t border-border/50">
                    <p className="text-xs text-muted-foreground/80 italic">
                      Overall Company Score is a weighted combination of the above components, 
                      determined by AI analysis based on signal strength and reliability.
                    </p>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">Financial Health</span>
                  <span className={`text-sm font-mono font-semibold shrink-0 ${getScoreColor(analysis.financialHealthScore)}`}>
                    {analysis.financialHealthScore}/100
                  </span>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground w-full pt-1" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere', whiteSpace: 'normal' }} data-testid={`text-analysis-summary-${ticker}`}>
              {analysis.summary}
            </p>

            {/* Technical Analysis Details */}
            {analysis.confidenceScore !== undefined && analysis.confidenceScore !== null && 
             analysis.technicalAnalysisScore !== undefined && analysis.technicalAnalysisScore !== null && (
              <div className="mt-3 p-2 bg-muted/30 rounded space-y-1.5">
                <div className="text-xs font-medium">Technical Analysis Evidence</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {analysis.technicalAnalysisTrend && (
                    <div>
                      <span className="text-muted-foreground">Trend: </span>
                      <span className="font-medium capitalize">{analysis.technicalAnalysisTrend}</span>
                    </div>
                  )}
                  {analysis.technicalAnalysisMomentum && (
                    <div>
                      <span className="text-muted-foreground">Momentum: </span>
                      <span className="font-medium capitalize">{analysis.technicalAnalysisMomentum}</span>
                    </div>
                  )}
                </div>
                {analysis.technicalAnalysisSignals && analysis.technicalAnalysisSignals.length > 0 && (
                  <ul className="space-y-0.5">
                    {analysis.technicalAnalysisSignals.map((signal: string, index: number) => (
                      <li key={index} className="text-xs text-muted-foreground flex items-start gap-1">
                        <span className="shrink-0">•</span>
                        <span className="flex-1">{signal}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Sentiment Analysis Details */}
            {analysis.confidenceScore !== undefined && analysis.confidenceScore !== null && 
             analysis.sentimentAnalysisScore !== undefined && analysis.sentimentAnalysisScore !== null && (
              <div className="mt-2 p-2 bg-muted/30 rounded space-y-1.5">
                <div className="text-xs font-medium">Sentiment Analysis Evidence</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {analysis.sentimentAnalysisTrend && (
                    <div>
                      <span className="text-muted-foreground">Trend: </span>
                      <span className="font-medium capitalize">{analysis.sentimentAnalysisTrend}</span>
                    </div>
                  )}
                  {analysis.sentimentAnalysisNewsVolume && (
                    <div>
                      <span className="text-muted-foreground">News Volume: </span>
                      <span className="font-medium capitalize">{analysis.sentimentAnalysisNewsVolume}</span>
                    </div>
                  )}
                </div>
                {analysis.sentimentAnalysisKeyThemes && analysis.sentimentAnalysisKeyThemes.length > 0 && (
                  <>
                    <div className="text-xs text-muted-foreground">Key Themes:</div>
                    <ul className="space-y-0.5">
                      {analysis.sentimentAnalysisKeyThemes.map((theme: string, index: number) => (
                        <li key={index} className="text-xs text-muted-foreground flex items-start gap-1">
                          <span className="shrink-0">•</span>
                          <span className="flex-1">{theme}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}
          </div>

          {analysis.redFlags && analysis.redFlags.length > 0 && (
            <div className="space-y-2 w-full max-w-full overflow-hidden">
              <div className="flex items-center gap-1.5 text-xs font-medium text-destructive">
                <AlertTriangle className="h-3 w-3 shrink-0" />
                <span>Red Flags</span>
              </div>
              <ul className="space-y-1 w-full max-w-full">
                {analysis.redFlags.map((flag: string, index: number) => (
                  <li key={index} className="text-xs text-muted-foreground flex items-start gap-1.5 w-full max-w-full overflow-hidden">
                    <AlertCircle className="h-3 w-3 mt-0.5 shrink-0 text-destructive" />
                    <span className="flex-1 min-w-0" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere', whiteSpace: 'normal' }}>{flag}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {analysis.strengths && analysis.strengths.length > 0 && (
            <div className="space-y-2 w-full max-w-full overflow-hidden">
              <div className="flex items-center gap-1.5 text-xs font-medium text-success">
                <TrendingUp className="h-3 w-3 shrink-0" />
                <span>Strengths</span>
              </div>
              <ul className="space-y-1 w-full max-w-full">
                {analysis.strengths.map((strength: string, index: number) => (
                  <li key={index} className="text-xs text-muted-foreground flex items-start gap-1.5 w-full max-w-full overflow-hidden">
                    <span className="text-success shrink-0">•</span>
                    <span className="flex-1 min-w-0" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere', whiteSpace: 'normal' }}>{strength}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(analysis as any).secFilingInsights && (analysis as any).secFilingInsights.length > 0 && (
            <div className="space-y-2 w-full border-t pt-3">
              <div className="text-xs font-semibold">SEC Filing Insights</div>
              {(analysis as any).secFilingType && (
                <div className="flex items-center gap-2 text-xs mb-2">
                  <Badge variant="outline">{(analysis as any).secFilingType}</Badge>
                  {(analysis as any).secFilingDate && (
                    <span className="text-muted-foreground">{new Date((analysis as any).secFilingDate).toLocaleDateString()}</span>
                  )}
                </div>
              )}
              <ul className="space-y-1 w-full max-w-full">
                {(analysis as any).secFilingInsights.map((insight: string, index: number) => (
                  <li key={index} className="text-xs text-muted-foreground flex items-start gap-1.5 w-full max-w-full overflow-hidden">
                    <span className="text-primary shrink-0">•</span>
                    <span className="flex-1 min-w-0" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere', whiteSpace: 'normal' }}>{insight}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(analysis as any).fundamentalSignals && (analysis as any).fundamentalSignals.length > 0 && (
            <div className="space-y-2 w-full border-t pt-3">
              <div className="text-xs font-semibold">Fundamental Signals</div>
              <ul className="space-y-1 w-full max-w-full">
                {(analysis as any).fundamentalSignals.map((signal: string, index: number) => (
                  <li key={index} className="text-xs text-muted-foreground flex items-start gap-1.5 w-full max-w-full overflow-hidden">
                    <TrendingUp className="h-3 w-3 mt-0.5 shrink-0 text-primary" />
                    <span className="flex-1 min-w-0" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere', whiteSpace: 'normal' }}>{signal}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(analysis as any).insiderValidation && (
            <div className="space-y-2 w-full border-t pt-3">
              <div className="text-xs font-semibold">Insider Trade Validation</div>
              <p className="text-xs text-muted-foreground" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere', whiteSpace: 'normal' }}>
                {(analysis as any).insiderValidation}
              </p>
            </div>
          )}

          <div className="pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => analyzeMutation.mutate()}
              disabled={analyzeMutation.isPending}
              data-testid={`button-reanalyze-${ticker}`}
              className="w-full"
            >
              {analyzeMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Re-analyzing...
                </>
              ) : (
                "Re-analyze"
              )}
            </Button>
          </div>

          {analysis.analyzedAt && (
            <p className="text-xs text-muted-foreground text-center">
              Last analyzed: {new Date(analysis.analyzedAt).toLocaleDateString()}
            </p>
          )}
        </Card>
      )}
    </div>
  );
}
