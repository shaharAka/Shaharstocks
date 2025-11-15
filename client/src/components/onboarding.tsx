import { useState } from "react";
import { useLocation } from "wouter";
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
import { Database, TrendingUp, Bell, Star, Calendar, Sparkles } from "lucide-react";
import { useUser } from "@/contexts/UserContext";

interface OnboardingProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export function Onboarding({ open, onOpenChange, onComplete }: OnboardingProps) {
  const [step, setStep] = useState(1);
  const [, setLocation] = useLocation();
  const { completeOnboarding } = useUser();

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    }
  };

  const handleGetStarted = async () => {
    await completeOnboarding();
    onOpenChange(false);
    setLocation("/recommendations");
    onComplete();
  };

  const handleSkip = async () => {
    await completeOnboarding();
    onOpenChange(false);
    setLocation("/recommendations");
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
                signal2 surfaces high-quality trading opportunities from SEC insider trading filings, 
                scored and analyzed by AI to help you make informed investment decisions.
              </DialogDescription>

              <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
                <Card data-testid="card-feature-insider">
                  <CardHeader className="pb-3">
                    <Database className="h-8 w-8 mb-2 text-primary" />
                    <CardTitle className="text-lg">SEC Filings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>
                      Real insider transactions from SEC regulatory filings, filtered for quality
                    </CardDescription>
                  </CardContent>
                </Card>

                <Card data-testid="card-feature-ai">
                  <CardHeader className="pb-3">
                    <Sparkles className="h-8 w-8 mb-2 text-primary" />
                    <CardTitle className="text-lg">AI Scoring</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>
                      Dual-agent AI analyzes fundamentals and market conditions, scoring each opportunity
                    </CardDescription>
                  </CardContent>
                </Card>

                <Card data-testid="card-feature-briefs">
                  <CardHeader className="pb-3">
                    <TrendingUp className="h-8 w-8 mb-2 text-primary" />
                    <CardTitle className="text-lg">Daily Briefs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>
                      Get daily trading guidance with buy/hold/sell stances for stocks you follow
                    </CardDescription>
                  </CardContent>
                </Card>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Data updates automatically in the background. You'll see opportunities from the last 2 weeks, 
                  filtered for companies over $500M market cap.
                </p>
              </div>
            </>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <DialogDescription className="text-base mb-4">
                Stay informed with smart notifications and follow stocks to track them over time.
              </DialogDescription>

              <div className="space-y-4">
                <Card data-testid="card-follow-system">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Star className="h-5 w-5 text-primary" />
                      <CardTitle className="text-base">Follow Stocks</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>
                      Click the star button on any stock to follow it. Followed stocks get daily AI briefs 
                      and appear in your watchlist. They won't be auto-removed after 2 weeks.
                    </CardDescription>
                  </CardContent>
                </Card>

                <Card data-testid="card-daily-briefs">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-primary" />
                      <CardTitle className="text-base">Daily Briefs</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>
                      Every day, followed stocks get fresh AI recommendations (BUY/HOLD/SELL) with 
                      confidence scores and key highlights. Quick insights for fast decisions.
                    </CardDescription>
                  </CardContent>
                </Card>

                <Card data-testid="card-notifications">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Bell className="h-5 w-5 text-primary" />
                      <CardTitle className="text-base">Smart Notifications</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>
                      Get alerts for high-score buy/sell signals (AI score &gt;70 or &lt;30), 
                      popular stocks (&gt;10 followers), and stance changes on your positions.
                    </CardDescription>
                  </CardContent>
                </Card>
              </div>

              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground">
                  <strong>2-Week Event Horizon:</strong> Opportunities older than 2 weeks are automatically 
                  removed unless you follow them. This keeps your feed fresh and focused.
                </p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <DialogDescription className="text-base mb-4">
                You're ready to start exploring trading opportunities!
              </DialogDescription>

              <Card className="w-full" data-testid="card-next-steps">
                <CardHeader>
                  <CardTitle>Quick Start Guide</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-xs font-semibold text-primary">1</span>
                    </div>
                    <div>
                      <p className="font-medium">Browse Opportunities</p>
                      <p className="text-sm text-muted-foreground">
                        Review AI-scored opportunities from insider trading. High-value alerts appear for 
                        BUY (&gt;70 score) and SELL (&lt;30 score) recommendations.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-xs font-semibold text-primary">2</span>
                    </div>
                    <div>
                      <p className="font-medium">Follow Interesting Stocks</p>
                      <p className="text-sm text-muted-foreground">
                        Click any stock card to see detailed analysis, then follow it to receive daily briefs 
                        and simulation charts.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-xs font-semibold text-primary">3</span>
                    </div>
                    <div>
                      <p className="font-medium">Stay Informed</p>
                      <p className="text-sm text-muted-foreground">
                        Check the notification bell for high-value alerts and review daily briefs 
                        on your followed stocks.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg">
                <div className="flex items-start gap-2 mb-1">
                  <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-sm font-medium">Pro Tip</p>
                </div>
                <p className="text-xs text-muted-foreground ml-6">
                  Visit Settings to customize data sources, fetch intervals, and quality filters. 
                  You can also explore the Analysis page to run backtests and create trading rules.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2">
          <Button
            variant="ghost"
            onClick={handleSkip}
            className="w-full sm:w-auto"
            data-testid="button-skip-onboarding"
          >
            {step === 3 ? "Skip" : "Skip Tutorial"}
          </Button>
          
          {step < 3 ? (
            <Button
              onClick={handleNext}
              className="w-full sm:w-auto"
              data-testid="button-next-onboarding"
            >
              Next
            </Button>
          ) : (
            <Button
              onClick={handleGetStarted}
              className="w-full sm:w-auto"
              data-testid="button-get-started"
            >
              Get Started
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
