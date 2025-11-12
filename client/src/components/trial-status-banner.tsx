import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CreditCard, Clock, AlertTriangle } from "lucide-react";
import { Link } from "wouter";

interface TrialStatus {
  status: string;
  isTrialActive: boolean;
  daysRemaining: number;
  trialEndsAt?: string;
  showPaymentReminder: boolean;
}

export function TrialStatusBanner() {
  const { data: trialStatus } = useQuery<TrialStatus>({
    queryKey: ["/api/auth/trial-status"],
    refetchInterval: 60000, // Refresh every minute
    retry: false,
  });

  // Only show for trial users with active trial and payment reminder enabled
  if (!trialStatus || trialStatus.status !== "trial" || !trialStatus.isTrialActive || !trialStatus.showPaymentReminder) {
    return null;
  }

  const { daysRemaining } = trialStatus;
  
  // Determine urgency level
  const isUrgent = daysRemaining <= 3;

  return (
    <Alert 
      className="m-4 border-2" 
      variant={isUrgent ? "destructive" : "default"}
      data-testid="alert-trial-status"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          {isUrgent ? (
            <AlertTriangle className="h-5 w-5 mt-0.5" />
          ) : (
            <Clock className="h-5 w-5 mt-0.5" />
          )}
          <div className="space-y-1 flex-1">
            <AlertTitle className="text-base font-semibold" data-testid="text-trial-title">
              {isUrgent 
                ? `Trial Ending Soon - ${daysRemaining} ${daysRemaining === 1 ? 'Day' : 'Days'} Left`
                : `Free Trial - ${daysRemaining} ${daysRemaining === 1 ? 'Day' : 'Days'} Remaining`
              }
            </AlertTitle>
            <AlertDescription className="text-sm" data-testid="text-trial-description">
              {isUrgent
                ? "Your trial is ending soon. Subscribe now to continue accessing your portfolio and recommendations."
                : "Subscribe now to ensure uninterrupted access to all features after your trial ends."
              }
            </AlertDescription>
          </div>
        </div>
        <Link href="/settings">
          <Button 
            variant={isUrgent ? "default" : "outline"}
            size="sm"
            className="shrink-0"
            data-testid="button-subscribe-now"
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Subscribe Now
          </Button>
        </Link>
      </div>
    </Alert>
  );
}
