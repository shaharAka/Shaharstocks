import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Database, TrendingUp, Rocket } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useUser } from "@/contexts/UserContext";

interface OnboardingProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export function Onboarding({ open, onOpenChange, onComplete }: OnboardingProps) {
  const [step, setStep] = useState(1);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { completeOnboarding } = useUser();

  const fetchOpeninsiderMutation = useMutation({
    mutationFn: async () => {
      // First, ensure OpenInsider is enabled with meaningful default filters
      await apiRequest("POST", "/api/openinsider/config", {
        enabled: true,
        fetchLimit: 500,
        fetchInterval: "hourly",
        // Default filters for high-quality recommendations
        insiderTitles: ["CEO", "CFO", "Director", "President", "COO", "CTO", "10% Owner"],
        minTransactionValue: 100000, // $100k minimum transaction value
      });
      
      // Then fetch the data
      const res = await apiRequest("POST", "/api/openinsider/fetch", {
        limit: 500,
      });
      return await res.json();
    },
    onSuccess: async (data) => {
      // Invalidate queries to refresh stocks and user state (which includes initialDataFetched flag)
      await queryClient.invalidateQueries({ queryKey: ["/api/stocks"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/current-user"] });
      toast({
        title: "Data fetched successfully",
        description: data.message || `Fetched ${data.transactionsFetched} insider trading transactions`,
      });
      setStep(3);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to fetch insider trading data. You can try again later from Settings.",
        variant: "destructive",
      });
    },
  });

  const handleStartFetching = () => {
    setStep(2);
    fetchOpeninsiderMutation.mutate();
  };

  const handleViewRecommendations = async () => {
    await completeOnboarding();
    onOpenChange(false);
    setLocation("/recommendations");
    onComplete();
  };

  const handleSkip = async () => {
    await completeOnboarding();
    onOpenChange(false);
    onComplete();
  };

  const totalSteps = 3;
  const progress = (step / totalSteps) * 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-onboarding">
        <DialogHeader>
          <div className="flex items-center justify-between mb-2">
            <DialogTitle className="text-2xl">Welcome to signal2!</DialogTitle>
            <Badge variant="secondary" data-testid="badge-onboarding-step">
              Step {step} of {totalSteps}
            </Badge>
          </div>
          <Progress value={progress} className="h-2" data-testid="progress-onboarding" />
        </DialogHeader>

        <div className="space-y-6 py-4">
          {step === 1 && (
            <>
              <DialogDescription className="text-base">
                signal2 helps you track insider trading activity and make informed investment decisions. 
                Follow company insiders who are buying or selling their own stock.
              </DialogDescription>

              <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
                <Card data-testid="card-feature-insider">
                  <CardHeader className="pb-3">
                    <Database className="h-8 w-8 mb-2 text-primary" />
                    <CardTitle className="text-lg">Insider Data</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>
                      Track real insider transactions from SEC filings via OpenInsider.com
                    </CardDescription>
                  </CardContent>
                </Card>

                <Card data-testid="card-feature-ai">
                  <CardHeader className="pb-3">
                    <TrendingUp className="h-8 w-8 mb-2 text-primary" />
                    <CardTitle className="text-lg">AI Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>
                      Get dual-agent AI insights analyzing company fundamentals and market conditions
                    </CardDescription>
                  </CardContent>
                </Card>

                <Card data-testid="card-feature-automated">
                  <CardHeader className="pb-3">
                    <Rocket className="h-8 w-8 mb-2 text-primary" />
                    <CardTitle className="text-lg">Automated Trading</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>
                      Create rules to automatically manage positions based on price triggers
                    </CardDescription>
                  </CardContent>
                </Card>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg" data-testid="section-openinsider">
                <h3 className="font-semibold mb-2">Let's Start with Data</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  We'll fetch the latest 500 insider trading transactions from OpenInsider.com. 
                  This will give you a solid foundation of recent insider activity to review.
                </p>
                <p className="text-sm text-muted-foreground">
                  This usually takes about 30-60 seconds. You can configure additional data sources later in Settings.
                </p>
              </div>
            </>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center py-8" data-testid="section-fetching">
                <div className="relative mb-6">
                  <div className="h-16 w-16 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                  <Database className="h-8 w-8 text-primary absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Fetching Insider Trading Data</h3>
                <p className="text-sm text-muted-foreground text-center max-w-md">
                  We're pulling the latest 500 transactions from OpenInsider.com. 
                  This includes company insider purchases and sales with detailed transaction information.
                </p>
                <p className="text-xs text-muted-foreground mt-4">
                  This may take 30-60 seconds...
                </p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center py-6" data-testid="section-success">
                <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mb-4">
                  <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-500" />
                </div>
                <h3 className="text-xl font-semibold mb-2">You're All Set!</h3>
                <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
                  We've successfully loaded insider trading recommendations. 
                  Let's take a look at what company insiders are buying and selling.
                </p>

                <Card className="w-full" data-testid="card-next-steps">
                  <CardHeader>
                    <CardTitle>Next Steps</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-xs font-semibold text-primary">1</span>
                      </div>
                      <div>
                        <p className="font-medium">Review Recommendations</p>
                        <p className="text-sm text-muted-foreground">
                          Check out the insider trading recommendations and see which stocks insiders are buying
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-xs font-semibold text-primary">2</span>
                      </div>
                      <div>
                        <p className="font-medium">Get AI Insights</p>
                        <p className="text-sm text-muted-foreground">
                          Click on any stock to get detailed AI analysis of company fundamentals and market conditions
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-xs font-semibold text-primary">3</span>
                      </div>
                      <div>
                        <p className="font-medium">Start Building Your Portfolio</p>
                        <p className="text-sm text-muted-foreground">
                          Approve stocks you like to add them to your portfolio and create automated trading rules
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2">
          {step === 1 && (
            <>
              <Button
                variant="ghost"
                onClick={handleSkip}
                className="w-full sm:w-auto"
                data-testid="button-skip-onboarding"
              >
                Skip for now
              </Button>
              <Button
                onClick={handleStartFetching}
                className="w-full sm:w-auto"
                data-testid="button-fetch-openinsider"
              >
                Start Fetching Data
              </Button>
            </>
          )}
          {step === 3 && (
            <Button
              onClick={handleViewRecommendations}
              className="w-full sm:w-auto ml-auto"
              data-testid="button-view-recommendations"
            >
              View Recommendations
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
