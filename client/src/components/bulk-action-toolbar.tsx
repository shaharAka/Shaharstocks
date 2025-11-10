import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, CheckCircle, XCircle, Users, RefreshCw, Sparkles, FlaskConical } from "lucide-react";

interface BulkActionToolbarProps {
  selectedCount: number;
  onClear: () => void;
  onApprove: () => void;
  onReject: () => void;
  onMarkInterest: () => void;
  onRefresh: () => void;
  onAnalyze: () => void;
  onSimulate: () => void;
  isSimulating?: boolean;
}

export function BulkActionToolbar({
  selectedCount,
  onClear,
  onApprove,
  onReject,
  onMarkInterest,
  onRefresh,
  onAnalyze,
  onSimulate,
  isSimulating = false,
}: BulkActionToolbarProps) {
  return (
    <div 
      className={`bg-primary/10 border border-primary/20 rounded-md p-3 mb-4 transition-opacity ${
        selectedCount === 0 ? "invisible h-0 mb-0 p-0 border-0" : "visible"
      }`}
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Badge variant="default" className="font-mono" data-testid="badge-selected-count">
            {selectedCount} selected
          </Badge>
          <Button
            variant="ghost"
            size="lg"
            onClick={onClear}
            data-testid="button-clear-selection"
          >
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="default"
            size="lg"
            onClick={onApprove}
            data-testid="button-bulk-approve"
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            Approve
          </Button>
          <Button
            variant="destructive"
            size="lg"
            onClick={onReject}
            data-testid="button-bulk-reject"
          >
            <XCircle className="h-4 w-4 mr-1" />
            Reject
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={onMarkInterest}
            data-testid="button-bulk-interest"
          >
            <Users className="h-4 w-4 mr-1" />
            Interest
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={onRefresh}
            data-testid="button-bulk-refresh"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={onAnalyze}
            data-testid="button-bulk-analyze"
          >
            <Sparkles className="h-4 w-4 mr-1" />
            Analyze
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={onSimulate}
            disabled={isSimulating}
            data-testid="button-bulk-simulate"
          >
            <FlaskConical className="h-4 w-4 mr-1" />
            {isSimulating ? "Simulating..." : "Simulate"}
          </Button>
        </div>
      </div>
    </div>
  );
}
