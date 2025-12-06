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
  RotateCcw,
  Users,
  Newspaper
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

  // Helper to get signal label from score
  const getSignalLabel = (score: number | null | undefined): string => {
    if (score == null) return "Analyzing...";
    if (score >= 75) return "Strong Buy";
    if (score >= 60) return "Moderate Buy";
    if (score >= 45) return "Hold";
    if (score >= 30) return "Weak";
    return "Avoid";
  };

  const globalScore = (analysis as any).scorecard?.globalScore ?? analysis.integratedScore;
  const signalLabel = getSignalLabel(globalScore);
  const scoreColor = globalScore >= 70 
    ? "text-emerald-600 dark:text-emerald-400" 
    : globalScore >= 50 
      ? "text-amber-600 dark:text-amber-400"
      : "text-red-500/70 dark:text-red-400/70";

  // Render completed AI Playbook
  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Section 1: AI Playbook - Front and Center */}
      <Card>
        <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <Brain className="h-4 sm:h-5 w-4 sm:w-5" />
              AI Playbook
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant={
                globalScore >= 70 ? 'default' :
                globalScore >= 50 ? 'secondary' : 'destructive'
              } className="text-xs sm:text-sm font-semibold">
                {signalLabel}
              </Badge>
              <span className={`text-lg sm:text-xl font-mono font-bold ${scoreColor}`} data-testid="text-global-score">
                {globalScore ?? '—'}/100
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-6 pt-0">
          {/* Primary Recommendation */}
          {analysis.recommendation && (
            <div className="p-3 sm:p-4 bg-muted/50 rounded-lg border-l-4 border-l-amber-500">
              <p className="text-xs sm:text-sm leading-relaxed font-medium" data-testid="text-recommendation">
                {analysis.recommendation}
              </p>
            </div>
          )}

          {/* Summary - Why this score */}
          {analysis.summary && (
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed" data-testid="text-signal-drivers">
              {analysis.summary}
            </p>
          )}

          {/* Key Strengths - Compact */}
          {analysis.strengths && analysis.strengths.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {analysis.strengths.slice(0, 4).map((strength: string, index: number) => (
                <Badge key={index} variant="outline" className="text-[10px] sm:text-xs bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400">
                  {strength.length > 40 ? strength.substring(0, 40) + '...' : strength}
                </Badge>
              ))}
            </div>
          )}

          {/* Time Horizon Note */}
          <p className="text-[10px] sm:text-xs text-muted-foreground italic">
            Optimized for 1-2 week trading horizon
          </p>
        </CardContent>
      </Card>

      {/* Section 2: Score Breakdown - Expandable */}
      {(analysis as any).scorecard?.sections && (
        <Accordion type="single" collapsible className="w-full" defaultValue="score-breakdown">
          <AccordionItem value="score-breakdown" className="border rounded-lg px-3 sm:px-4">
            <AccordionTrigger className="text-sm sm:text-base font-medium py-3" data-testid="button-toggle-scores">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                Score Breakdown
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-2 sm:space-y-3 pb-4">
              {/* Render each scorecard section with AI explanation */}
              {Object.entries((analysis as any).scorecard.sections).map(([sectionKey, section]: [string, any]) => {
                const sectionIcons: Record<string, any> = {
                  fundamentals: Brain,
                  technicals: TrendingUp,
                  insiderActivity: Users,
                  newsSentiment: Newspaper,
                  macroSector: Globe,
                };
                const sectionWeights: Record<string, string> = {
                  fundamentals: "35%",
                  technicals: "25%",
                  insiderActivity: "20%",
                  newsSentiment: "15%",
                  macroSector: "5%",
                };
                const Icon = sectionIcons[sectionKey] || Brain;
                const score = section?.score ?? 0;
                const sectionScoreColor = score >= 70 
                  ? "text-emerald-600 dark:text-emerald-400" 
                  : score >= 50 
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-red-500/70 dark:text-red-400/70";
                
                const sectionExplanation = (analysis as any).sectionExplanations?.[sectionKey];
                const outlookBadgeVariant = sectionExplanation?.outlook === 'bullish' ? 'default' 
                  : sectionExplanation?.outlook === 'bearish' ? 'destructive' : 'secondary';
                
                return (
                  <div key={sectionKey} className="p-2.5 sm:p-3 bg-muted/30 rounded-lg space-y-2">
                    {/* Section Header */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-xs sm:text-sm font-medium">{section?.name || sectionKey}</span>
                        <span className="text-[10px] text-muted-foreground">({sectionWeights[sectionKey] || ''})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {sectionExplanation?.outlook && (
                          <Badge variant={outlookBadgeVariant} className="text-[10px] sm:text-xs capitalize h-5">
                            {sectionExplanation.outlook}
                          </Badge>
                        )}
                        <span className={`text-sm font-mono font-bold ${sectionScoreColor}`} data-testid={`text-section-score-${sectionKey}`}>
                          {score}
                        </span>
                      </div>
                    </div>
                    
                    {/* AI Explanation */}
                    {sectionExplanation?.summary && (
                      <p className="text-[10px] sm:text-xs text-muted-foreground leading-relaxed">
                        {sectionExplanation.summary}
                      </p>
                    )}
                    
                    {/* Key Factors */}
                    {sectionExplanation?.keyFactors && sectionExplanation.keyFactors.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {sectionExplanation.keyFactors.slice(0, 3).map((factor: string, idx: number) => (
                          <Badge key={idx} variant="outline" className="text-[9px] sm:text-[10px] px-1.5 py-0.5 font-normal">
                            {factor}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              
              {/* Confidence indicator */}
              {(analysis as any).scorecard?.confidence && (
                <div className="text-[10px] sm:text-xs text-center text-muted-foreground pt-2 border-t">
                  Confidence: {(analysis as any).scorecard.confidence}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}

      {/* Section 3: Key Risks - Collapsible */}
      {((analysis.redFlags && analysis.redFlags.length > 0) || 
        (analysis.weaknesses && analysis.weaknesses.length > 0) ||
        (analysis.risks && analysis.risks.length > 0)) && (
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="risks" className="border rounded-lg px-3 sm:px-4">
            <AccordionTrigger className="text-sm sm:text-base font-medium py-3" data-testid="button-toggle-risks">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                Key Risks
                <Badge variant="outline" className="text-[10px] ml-1">
                  {(analysis.redFlags?.length || 0) + (analysis.weaknesses?.length || 0) + (analysis.risks?.length || 0)}
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-2 pb-4">
              {analysis.redFlags && analysis.redFlags.length > 0 && (
                <div className="space-y-1">
                  {analysis.redFlags.map((flag: string, index: number) => (
                    <div key={index} className="text-xs sm:text-sm text-muted-foreground flex items-start gap-2 p-2 bg-destructive/5 rounded">
                      <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-destructive" />
                      <span className="flex-1">{flag}</span>
                    </div>
                  ))}
                </div>
              )}
              {analysis.weaknesses && analysis.weaknesses.length > 0 && (
                <div className="space-y-1">
                  {analysis.weaknesses.map((weakness: string, index: number) => (
                    <div key={index} className="text-xs sm:text-sm text-muted-foreground flex items-start gap-2 p-2 bg-muted/30 rounded">
                      <span className="shrink-0 text-amber-500">•</span>
                      <span className="flex-1">{weakness}</span>
                    </div>
                  ))}
                </div>
              )}
              {analysis.risks && analysis.risks.length > 0 && (
                <div className="space-y-1">
                  {analysis.risks.map((risk: string, index: number) => (
                    <div key={index} className="text-xs sm:text-sm text-muted-foreground flex items-start gap-2 p-2 bg-muted/30 rounded">
                      <span className="shrink-0">•</span>
                      <span className="flex-1">{risk}</span>
                    </div>
                  ))}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}

      {/* Section 4: Advanced - For Technical Investors */}
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
