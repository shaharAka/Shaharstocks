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
  currentPhase?: "data_fetch" | "macro_analysis" | "micro_analysis" | "integration" | "complete" | null;
  size?: "sm" | "md";
  showLabels?: boolean;
  className?: string;
}

export function AnalysisPhaseIndicator({
  microCompleted,
  macroCompleted,
  combinedCompleted,
  currentPhase,
  size = "sm",
  showLabels = false,
  className,
}: AnalysisPhaseIndicatorProps) {
  const iconSize = size === "sm" ? "h-3 w-3" : "h-4 w-4";
  
  const phases = [
    {
      id: "macro",
      label: "Macro context",
      description: "Industry/sector analysis",
      completed: macroCompleted,
      active: currentPhase === "macro_analysis",
      testId: "status-macro",
    },
    {
      id: "micro",
      label: "Micro fundamentals",
      description: "Company fundamentals analysis",
      completed: microCompleted,
      active: currentPhase === "micro_analysis",
      testId: "status-micro",
    },
    {
      id: "combined",
      label: "Combined score",
      description: "Integrated analysis score",
      completed: combinedCompleted,
      active: currentPhase === "integration",
      testId: "status-combined",
    },
  ];

  // Get the current phase label for inline display
  const getCurrentPhaseLabel = () => {
    if (!currentPhase) return null;
    
    switch (currentPhase) {
      case "data_fetch":
        return "Fetching data...";
      case "macro_analysis":
        return "Analyzing macro factors...";
      case "micro_analysis":
        return "Analyzing fundamentals...";
      case "integration":
        return "Calculating final score...";
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
              <TooltipContent side="top" className="text-xs">
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
    </div>
  );
}
