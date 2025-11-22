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
  Clock
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
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>AI playbook in progress...</span>
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
            <Button
              variant="outline"
              onClick={() => analyzeMutation.mutate()}
              disabled={analyzeMutation.isPending}
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
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render completed AI Playbook
  return (
    <div className="space-y-4">
      {/* Section 1: Signal Drivers - Why this score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Signal Drivers
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {analysis.summary && (
            <p className="text-sm leading-relaxed" data-testid="text-signal-drivers">
              {analysis.summary}
            </p>
          )}

          {analysis.strengths && analysis.strengths.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-amber-600 dark:text-amber-400">
                <TrendingUp className="h-4 w-4" />
                <span>Key Strengths</span>
              </div>
              <ul className="space-y-1">
                {analysis.strengths.map((strength: string, index: number) => (
                  <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-amber-600 dark:text-amber-400 shrink-0">•</span>
                    <span className="flex-1">{strength}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(analysis as any).fundamentalSignals && (analysis as any).fundamentalSignals.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium">Fundamental Signals</div>
              <ul className="space-y-1">
                {(analysis as any).fundamentalSignals.map((signal: string, index: number) => (
                  <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                    <Zap className="h-4 w-4 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
                    <span className="flex-1">{signal}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(analysis as any).secFilingInsights && (analysis as any).secFilingInsights.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="text-sm font-medium">SEC Filing Insights</div>
                {(analysis as any).secFilingType && (
                  <Badge variant="outline">{(analysis as any).secFilingType}</Badge>
                )}
              </div>
              <ul className="space-y-1">
                {(analysis as any).secFilingInsights.map((insight: string, index: number) => (
                  <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="shrink-0">•</span>
                    <span className="flex-1">{insight}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 2: Key Watchpoints - Risks and catalysts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Key Watchpoints
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {analysis.redFlags && analysis.redFlags.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                <AlertTriangle className="h-4 w-4" />
                <span>Risk Factors</span>
              </div>
              <ul className="space-y-1">
                {analysis.redFlags.map((flag: string, index: number) => (
                  <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-destructive" />
                    <span className="flex-1">{flag}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {analysis.weaknesses && analysis.weaknesses.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium">Weaknesses to Monitor</div>
              <ul className="space-y-1">
                {analysis.weaknesses.map((weakness: string, index: number) => (
                  <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="shrink-0">•</span>
                    <span className="flex-1">{weakness}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {analysis.risks && analysis.risks.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium">Additional Risks</div>
              <ul className="space-y-1">
                {analysis.risks.map((risk: string, index: number) => (
                  <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                    <span className="flex-1">{risk}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {analysis.opportunities && analysis.opportunities.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-amber-600 dark:text-amber-400">Potential Catalysts</div>
              <ul className="space-y-1">
                {analysis.opportunities.map((opportunity: string, index: number) => (
                  <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
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
            <p className="text-sm text-muted-foreground italic">No significant watchpoints identified</p>
          )}
        </CardContent>
      </Card>

      {/* Section 3: Market Context - Macro factors */}
      {macroAnalysis && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Market Context
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {macroAnalysis.summary && (
              <p className="text-sm leading-relaxed text-muted-foreground italic">
                {macroAnalysis.summary}
              </p>
            )}

            {macroAnalysis.industry && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Industry Segment:</span>
                <Badge variant="secondary">{macroAnalysis.industry}</Badge>
              </div>
            )}

            {macroAnalysis.industrySectorAnalysis && (
              <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Sector ETF: {macroAnalysis.industrySectorAnalysis.etfSymbol}</span>
                  <Badge variant={
                    macroAnalysis.industrySectorAnalysis.sectorWeight > 70 ? 'default' :
                    macroAnalysis.industrySectorAnalysis.sectorWeight > 40 ? 'secondary' : 'outline'
                  }>
                    Influence: {macroAnalysis.industrySectorAnalysis.sectorWeight}/100
                  </Badge>
                </div>
                
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <div className="text-muted-foreground text-xs">Day</div>
                    <div className={`font-mono font-semibold ${
                      macroAnalysis.industrySectorAnalysis.dayChange >= 0 ? 'text-success' : 'text-destructive'
                    }`}>
                      {macroAnalysis.industrySectorAnalysis.dayChange >= 0 ? '+' : ''}{macroAnalysis.industrySectorAnalysis.dayChange.toFixed(2)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs">Week</div>
                    <div className={`font-mono font-semibold ${
                      macroAnalysis.industrySectorAnalysis.weekChange >= 0 ? 'text-success' : 'text-destructive'
                    }`}>
                      {macroAnalysis.industrySectorAnalysis.weekChange >= 0 ? '+' : ''}{macroAnalysis.industrySectorAnalysis.weekChange.toFixed(2)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs">Month</div>
                    <div className={`font-mono font-semibold ${
                      macroAnalysis.industrySectorAnalysis.monthChange >= 0 ? 'text-success' : 'text-destructive'
                    }`}>
                      {macroAnalysis.industrySectorAnalysis.monthChange >= 0 ? '+' : ''}{macroAnalysis.industrySectorAnalysis.monthChange.toFixed(2)}%
                    </div>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground italic bg-background/50 p-2 rounded">
                  {macroAnalysis.industrySectorAnalysis.sectorExplanation}
                </p>
              </div>
            )}

            {macroAnalysis.marketCondition && (
              <div className="flex items-center gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Market Condition: </span>
                  <span className="font-medium capitalize">{macroAnalysis.marketCondition}</span>
                </div>
                {macroAnalysis.riskAppetite && (
                  <div>
                    <span className="text-muted-foreground">Risk Appetite: </span>
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
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            2-Week Execution Notes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {analysis.recommendation && (
            <div className="space-y-2">
              <div className="text-sm font-medium">Recommended Action</div>
              <p className="text-sm leading-relaxed">
                {analysis.recommendation}
              </p>
            </div>
          )}

          {(analysis as any).insiderValidation && (
            <div className="space-y-2 p-3 bg-muted/30 rounded-lg">
              <div className="text-sm font-medium">Insider Trade Context</div>
              <p className="text-sm text-muted-foreground">
                {(analysis as any).insiderValidation}
              </p>
            </div>
          )}

          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <p className="text-xs text-muted-foreground">
              <strong>Time Horizon:</strong> This analysis is optimized for a 2-week trading window. 
              Monitor daily briefs for position updates and changing market conditions.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Metrics (Collapsible) */}
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="advanced">
          <AccordionTrigger className="text-sm" data-testid="button-toggle-advanced">
            Advanced Technical Metrics
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-2">
            {/* Technical Analysis */}
            {analysis.technicalAnalysisScore !== undefined && analysis.technicalAnalysisScore !== null && (
              <Card>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Technical Analysis Score</span>
                    <span className="text-sm font-mono font-semibold">{analysis.technicalAnalysisScore}/100</span>
                  </div>
                  {analysis.technicalAnalysisTrend && (
                    <div className="text-xs text-muted-foreground">
                      Trend: <span className="capitalize">{analysis.technicalAnalysisTrend}</span>
                    </div>
                  )}
                  {analysis.technicalAnalysisSignals && analysis.technicalAnalysisSignals.length > 0 && (
                    <ul className="space-y-0.5 text-xs">
                      {analysis.technicalAnalysisSignals.map((signal: string, index: number) => (
                        <li key={index} className="text-muted-foreground flex items-start gap-1">
                          <span>•</span>
                          <span>{signal}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Sentiment Analysis */}
            {analysis.sentimentAnalysisScore !== undefined && analysis.sentimentAnalysisScore !== null && (
              <Card>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Sentiment Analysis Score</span>
                    <span className="text-sm font-mono font-semibold">{analysis.sentimentAnalysisScore}/100</span>
                  </div>
                  {analysis.sentimentAnalysisTrend && (
                    <div className="text-xs text-muted-foreground">
                      Trend: <span className="capitalize">{analysis.sentimentAnalysisTrend}</span>
                    </div>
                  )}
                  {analysis.sentimentAnalysisKeyThemes && analysis.sentimentAnalysisKeyThemes.length > 0 && (
                    <div className="text-xs">
                      <div className="text-muted-foreground mb-1">Key Themes:</div>
                      <ul className="space-y-0.5">
                        {analysis.sentimentAnalysisKeyThemes.map((theme: string, index: number) => (
                          <li key={index} className="text-muted-foreground flex items-start gap-1">
                            <span>•</span>
                            <span>{theme}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Financial Health */}
            {analysis.financialHealthScore !== undefined && analysis.financialHealthScore !== null && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Financial Health Score</span>
                    <span className="text-sm font-mono font-semibold">{analysis.financialHealthScore}/100</span>
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
