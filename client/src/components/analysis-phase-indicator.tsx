import { CheckCircle2, Circle, Loader2, Database, Brain, FileText } from "lucide-react";
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
  currentPhase?: string | null;
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

type StepStatus = "pending" | "active" | "completed";

interface Step {
  id: number;
  label: string;
  shortLabel: string;
  icon: typeof Database;
  status: StepStatus;
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
  
  const isComplete = microCompleted && macroCompleted && combinedCompleted;

  const getStepStatus = (stepNum: 1 | 2 | 3): StepStatus => {
    if (isComplete || currentPhase === "complete" || currentPhase === "completed") {
      return "completed";
    }

    const phase = stepDetails?.phase || currentPhase;

    switch (stepNum) {
      case 1: // Fetching stock data
        if (currentPhase === "fetching_data" || phase === "data_fetch") return "active";
        if (currentPhase === "calculating_score" || currentPhase === "generating_playbook" ||
            phase === "calculating_score" || phase === "integration") return "completed";
        return "pending";
        
      case 2: // Calculating signal
        if (currentPhase === "calculating_score" || phase === "calculating_score") return "active";
        if (currentPhase === "generating_playbook" || phase === "integration") return "completed";
        if (currentPhase === "fetching_data" || phase === "data_fetch") return "pending";
        return "pending";
        
      case 3: // Generating playbook
        if (currentPhase === "generating_playbook" || phase === "integration") return "active";
        if (isComplete) return "completed";
        return "pending";
        
      default:
        return "pending";
    }
  };

  const steps: Step[] = [
    {
      id: 1,
      label: "Fetching stock data",
      shortLabel: "Data",
      icon: Database,
      status: getStepStatus(1),
    },
    {
      id: 2,
      label: "Calculating signal",
      shortLabel: "Signal",
      icon: Brain,
      status: getStepStatus(2),
    },
    {
      id: 3,
      label: "Generating playbook",
      shortLabel: "Playbook",
      icon: FileText,
      status: getStepStatus(3),
    },
  ];

  const getIconForStatus = (status: StepStatus) => {
    if (status === "completed") return CheckCircle2;
    if (status === "active") return Loader2;
    return Circle;
  };

  const getIconColor = (status: StepStatus) => {
    if (status === "completed") return "text-success";
    if (status === "active") return "text-warning";
    return "text-muted-foreground/40";
  };

  const activeStep = steps.find(s => s.status === "active");
  const currentStepLabel = activeStep?.label || (isComplete ? "Analysis complete" : null);

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="flex items-center gap-1" data-testid="analysis-phase-indicator">
        {steps.map((step, index) => {
          const StatusIcon = getIconForStatus(step.status);
          const iconColor = getIconColor(step.status);

          return (
            <div key={step.id} className="flex items-center">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div 
                    className={cn("flex items-center gap-0.5", iconColor)} 
                    data-testid={`status-step-${step.id}`}
                  >
                    <StatusIcon
                      className={cn(
                        iconSize,
                        step.status === "active" && "animate-spin"
                      )}
                    />
                    {size === "md" && (
                      <span className="text-[10px] font-medium hidden sm:inline">
                        {step.shortLabel}
                      </span>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs z-50">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium">Step {step.id}: {step.label}</span>
                    <span className={cn(
                      "text-[10px]",
                      step.status === "completed" ? "text-success" : 
                      step.status === "active" ? "text-warning" : "text-muted-foreground"
                    )}>
                      {step.status === "completed" ? "Complete" : 
                       step.status === "active" ? "In progress..." : "Pending"}
                    </span>
                  </div>
                </TooltipContent>
              </Tooltip>
              
              {index < steps.length - 1 && (
                <div className={cn(
                  "w-2 h-px mx-0.5",
                  step.status === "completed" ? "bg-success" : "bg-muted-foreground/20"
                )} />
              )}
            </div>
          );
        })}
        
        {showLabels && currentStepLabel && (
          <span className={cn(
            "text-[10px] font-medium ml-1",
            isComplete ? "text-success" : "text-warning"
          )}>
            {currentStepLabel}
          </span>
        )}
      </div>

      {showDetailedProgress && stepDetails && (
        <div className="text-[10px] text-muted-foreground pl-4">
          {stepDetails.substep || stepDetails.phase}
          {stepDetails.progress && ` (${stepDetails.progress})`}
        </div>
      )}
    </div>
  );
}
