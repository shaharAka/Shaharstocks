import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  ChevronDown, 
  TrendingUp, 
  BarChart3, 
  Users, 
  Newspaper, 
  Globe,
  Info
} from "lucide-react";
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
import { cn } from "@/lib/utils";

interface MetricScore {
  name: string;
  measurement: string | number | null;
  ruleBucket: "excellent" | "good" | "neutral" | "weak" | "poor" | "missing";
  score: number;
  maxScore: number;
  weight: number;
  rationale: string;
}

interface SectionScore {
  name: string;
  weight: number;
  score: number;
  maxScore: number;
  metrics: Record<string, MetricScore>;
  missingMetrics: string[];
}

interface Scorecard {
  version: string;
  tradingHorizon: string;
  computedAt: string;
  sections: Record<string, SectionScore>;
  globalScore: number;
  maxGlobalScore: number;
  missingDataPenalty: number;
  confidence: "high" | "medium" | "low";
  summary: string;
}

interface ScorecardDisplayProps {
  scorecard: Scorecard | null | undefined;
  className?: string;
}

const sectionIcons: Record<string, typeof TrendingUp> = {
  fundamentals: BarChart3,
  technicals: TrendingUp,
  insiderActivity: Users,
  newsSentiment: Newspaper,
  macroSector: Globe,
};

const bucketColors: Record<string, string> = {
  excellent: "bg-emerald-500 text-white",
  good: "bg-emerald-400/80 text-white",
  neutral: "bg-amber-400/80 text-white",
  weak: "bg-orange-400/80 text-white",
  poor: "bg-red-500 text-white",
  missing: "bg-gray-400 text-white",
};

const bucketBgColors: Record<string, string> = {
  excellent: "bg-emerald-500/10 border-emerald-500/30",
  good: "bg-emerald-400/10 border-emerald-400/30",
  neutral: "bg-amber-400/10 border-amber-400/30",
  weak: "bg-orange-400/10 border-orange-400/30",
  poor: "bg-red-500/10 border-red-500/30",
  missing: "bg-gray-400/10 border-gray-400/30",
};

function getScoreColor(score: number): string {
  if (score >= 70) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 50) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function getProgressColor(score: number): string {
  if (score >= 70) return "bg-emerald-500";
  if (score >= 50) return "bg-amber-500";
  return "bg-red-500";
}

function MetricRow({ metric }: { metric: MetricScore }) {
  const displayMeasurement = metric.measurement !== null && metric.measurement !== "N/A" 
    ? String(metric.measurement) 
    : "N/A";
  
  return (
    <div className={cn(
      "flex items-center justify-between gap-2 p-2 rounded-md border",
      bucketBgColors[metric.ruleBucket]
    )}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium truncate">{metric.name}</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3 w-3 text-muted-foreground cursor-help flex-shrink-0" />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <p className="text-xs">{metric.rationale}</p>
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-muted-foreground font-mono">
            {displayMeasurement}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", bucketColors[metric.ruleBucket])}>
          {metric.ruleBucket.toUpperCase()}
        </Badge>
        <span className={cn("font-mono text-sm font-bold", getScoreColor(metric.score * 10))}>
          {metric.score}/{metric.maxScore}
        </span>
      </div>
    </div>
  );
}

function SectionCard({ sectionKey, section }: { sectionKey: string; section: SectionScore }) {
  const Icon = sectionIcons[sectionKey] || BarChart3;
  const metrics = section.metrics ? Object.values(section.metrics) : [];
  const missingMetrics = section.missingMetrics || [];
  
  return (
    <AccordionItem value={sectionKey} className="border rounded-lg mb-2">
      <AccordionTrigger className="px-4 py-3 hover:no-underline hover-elevate rounded-t-lg">
        <div className="flex items-center justify-between w-full gap-4 pr-2">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm">{section.name || sectionKey}</span>
            <Badge variant="outline" className="text-[10px] px-1.5">
              {section.weight || 0}%
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className={cn("h-full rounded-full transition-all", getProgressColor(section.score || 0))}
                style={{ width: `${section.score || 0}%` }}
              />
            </div>
            <span className={cn("font-mono text-sm font-bold min-w-[3rem] text-right", getScoreColor(section.score || 0))}>
              {section.score || 0}/100
            </span>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-4 pb-3">
        <div className="space-y-2">
          {metrics.length > 0 ? (
            metrics.map((metric) => (
              <MetricRow key={metric.name} metric={metric} />
            ))
          ) : (
            <p className="text-xs text-muted-foreground">No metric details available</p>
          )}
          {missingMetrics.length > 0 && (
            <p className="text-[10px] text-muted-foreground mt-2">
              Missing data: {missingMetrics.join(", ")}
            </p>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

export function ScorecardDisplay({ scorecard, className }: ScorecardDisplayProps) {
  if (!scorecard) {
    return null;
  }

  // Validate that scorecard has required fields before rendering
  const hasRequiredFields = scorecard.globalScore !== undefined && scorecard.sections;
  if (!hasRequiredFields) {
    return null;
  }

  const sections = Object.entries(scorecard.sections || {});
  const confidence = scorecard.confidence || "medium";
  const version = scorecard.version || "1.0";
  const tradingHorizon = scorecard.tradingHorizon || "1-2 weeks";
  const globalScore = scorecard.globalScore ?? 0;
  const missingDataPenalty = scorecard.missingDataPenalty ?? 0;
  
  const confidenceColors = {
    high: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
    medium: "bg-amber-500/10 text-amber-600 border-amber-500/30",
    low: "bg-red-500/10 text-red-600 border-red-500/30",
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Score Breakdown
            </CardTitle>
            <Badge variant="outline" className="text-[10px]">
              v{version}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Badge 
              variant="outline" 
              className={cn("text-xs", confidenceColors[confidence])}
            >
              {confidence.toUpperCase()} confidence
            </Badge>
            <div className={cn(
              "px-3 py-1 rounded-md font-mono text-lg font-bold",
              globalScore >= 70 
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                : globalScore >= 50 
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  : "bg-red-500/10 text-red-600 dark:text-red-400"
            )}>
              {globalScore}/100
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {tradingHorizon} trading horizon
          {missingDataPenalty > 0 && (
            <span className="text-orange-500 ml-2">
              ({Math.round(missingDataPenalty)}% data missing)
            </span>
          )}
        </p>
      </CardHeader>
      <CardContent>
        {scorecard.summary && (
          <p className="text-sm text-muted-foreground mb-4 p-3 bg-muted/50 rounded-md">
            {scorecard.summary}
          </p>
        )}
        {sections.length > 0 ? (
          <Accordion type="multiple" className="space-y-0" defaultValue={["fundamentals"]}>
            {sections.map(([key, section]) => (
              <SectionCard key={key} sectionKey={key} section={section} />
            ))}
          </Accordion>
        ) : (
          <p className="text-sm text-muted-foreground">No section details available</p>
        )}
      </CardContent>
    </Card>
  );
}
