import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface AnalysisPhaseIndicatorProps {
  microCompleted: boolean;
  macroCompleted: boolean;
  combinedCompleted: boolean;
  currentPhase?: "data_fetch" | "macro_analysis" | "micro_analysis" | "calculating_score" | "generating_report" | "integration" | "complete" | null;
  stepDetails?: {
    phase?: string;
    substep?: string;
    progress?: string;
  } | null;
  size?: "sm" | "md";
  showLabels?: boolean;
  showDetailedProgress?: boolean;
  className?: string;
}

export function AnalysisPhaseIndicator({
  microCompleted,
  macroCompleted,
  combinedCompleted,
  currentPhase,
  stepDetails,
  size = "sm",
  showLabels = false,
  showDetailedProgress = false,
  className,
}: AnalysisPhaseIndicatorProps) {
  const iconSize = size === "sm" ? "h-3 w-3" : "h-4 w-4";
  
  // IMPORTANT: Order matches actual execution order in queueWorker:
  // Phase 1: Data Collection (fetch all data + macro) -> Phase 2: Scorecard (calculate scores) -> Phase 3: AI Report
  const phases = [
    {
      id: "data",
      label: "Data collection",
      description: "Fetching market data and industry context",
      completed: macroCompleted,
      active: currentPhase === "data_fetch" || currentPhase === "macro_analysis",
      testId: "status-macro",
    },
    {
      id: "scoring",
      label: "Scorecard",
      description: "Calculating rule-based scores with AI evaluation",
      completed: microCompleted && macroCompleted,
      active: currentPhase === "calculating_score",
      testId: "status-micro",
    },
    {
      id: "report",
      label: "AI Report",
      description: "Generating investment recommendation",
      completed: combinedCompleted,
      active: currentPhase === "generating_report" || currentPhase === "integration",
      testId: "status-combined",
    },
  ];

  // Get the current phase label for inline display
  const getCurrentPhaseLabel = () => {
    if (!currentPhase) return null;
    
    switch (currentPhase) {
      case "data_fetch":
        return "Gathering market data...";
      case "macro_analysis":
        return "Collecting industry context...";
      case "calculating_score":
        return "Calculating scorecard...";
      case "generating_report":
        return "Generating AI report...";
      case "integration":
        return "Finalizing analysis...";
      case "complete":
        return "Analysis complete";
      default:
        return null;
    }
  };

  const currentPhaseLabel = getCurrentPhaseLabel();

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="flex items-center gap-1.5" data-testid="analysis-phase-indicator">
        {phases.map((phase) => {
          const Icon = phase.completed ? CheckCircle2 : phase.active ? Loader2 : Circle;
          const iconColor = phase.completed
            ? "text-success"
            : phase.active
            ? "text-warning"
            : "text-muted-foreground/40";

          return (
            <Tooltip key={phase.id}>
              <TooltipTrigger asChild>
                <div
                  className={cn("flex items-center", iconColor)}
                  data-testid={`${phase.testId}`}
                >
                  <Icon
                    className={cn(
                      iconSize,
                      phase.active && "animate-spin"
                    )}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs z-50">
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium">{phase.label}</span>
                  <span className="text-muted-foreground">{phase.description}</span>
                  <span className={cn(
                    "text-[10px]",
                    phase.completed ? "text-success" : phase.active ? "text-warning" : "text-muted-foreground"
                  )}>
                    {phase.completed ? "✓ Complete" : phase.active ? "In progress..." : "Pending"}
                  </span>
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      {showLabels && currentPhaseLabel && (
        <span className="text-[10px] text-muted-foreground">
          {currentPhaseLabel}
        </span>
      )}

      {showDetailedProgress && stepDetails && (stepDetails.substep || stepDetails.progress) && (
        <div className="flex flex-col gap-0.5 mt-1">
          {stepDetails.substep && (
            <span className="text-[10px] text-muted-foreground italic">
              {stepDetails.substep}
            </span>
          )}
          {stepDetails.progress && (
            <span className="text-[10px] font-mono text-muted-foreground">
              {stepDetails.progress}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
