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
    setLocation("/dashboard");
    // Dialog will auto-close when experienceState updates in parent
  };

  const handleSkip = async () => {
    await completeOnboarding();
    setLocation("/dashboard");
    // Dialog will auto-close when experienceState updates in parent
  };

  const totalSteps = 3;
  const progress = (step / totalSteps) * 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-2xl max-h-[90vh] overflow-y-auto [&>button]:hidden" 
        data-testid="dialog-onboarding"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
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
                signal2 helps you discover and track high-quality trading opportunities from SEC insider trading filings, 
                scored and analyzed by AI. Your personal watchlist shows all stocks you're following in one simple view.
              </DialogDescription>

              <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
                <Card data-testid="card-feature-insider">
                  <CardHeader className="pb-3">
                    <Database className="h-8 w-8 mb-2 text-primary" />
                    <CardTitle className="text-lg">SEC Filings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>
                      Real insider transactions from SEC regulatory filings, filtered for companies over $500M market cap
                    </CardDescription>
                  </CardContent>
                </Card>

                <Card data-testid="card-feature-ai">
                  <CardHeader className="pb-3">
                    <Sparkles className="h-8 w-8 mb-2 text-primary" />
                    <CardTitle className="text-lg">AI Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>
                      Dual-agent AI analyzes company fundamentals and market conditions. Each stock gets an AI stance 
                      (BUY/SELL/HOLD) and signal score (0-100). Strong signals (70+) appear in amber.
                    </CardDescription>
                  </CardContent>
                </Card>

                <Card data-testid="card-feature-briefs">
                  <CardHeader className="pb-3">
                    <Star className="h-8 w-8 mb-2 text-primary" />
                    <CardTitle className="text-lg">Your Watchlist</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>
                      Follow stocks to track them in your personal watchlist. Get daily AI briefs and detailed analysis.
                    </CardDescription>
                  </CardContent>
                </Card>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Simple workflow:</strong> Browse opportunities → Follow interesting stocks → Track them in your watchlist. 
                  Data updates automatically in the background.
                </p>
              </div>
            </>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <DialogDescription className="text-base mb-4">
                Each stock gets comprehensive AI analysis with clear assessments and daily updates.
              </DialogDescription>

              <div className="space-y-4">
                <Card data-testid="card-ai-analysis">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      <CardTitle className="text-base">Complete AI Analysis</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>
                      Every stock gets a stance (BUY/SELL/HOLD), signal score (0-100), and detailed analysis. 
                      Click any stock to see financial health assessments: Profitability, Liquidity, Debt Level, 
                      and Growth rated as Strong/Moderate/Weak based on fundamentals.
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
                      Follow stocks to get fresh AI recommendations every day with confidence scores and 
                      key highlights. Track whether you're watching (considering entry) or in position (currently holding).
                    </CardDescription>
                  </CardContent>
                </Card>

                <Card data-testid="card-watchlist">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Star className="h-5 w-5 text-primary" />
                      <CardTitle className="text-base">Your Watchlist</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>
                      Your Dashboard shows all followed stocks in one simple view - no hidden filters. 
                      See BUY, SELL, and HOLD recommendations with scores, prices, and "Analyzing..." status for new additions.
                    </CardDescription>
                  </CardContent>
                </Card>

                <Card data-testid="card-notifications">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Bell className="h-5 w-5 text-primary" />
                      <CardTitle className="text-base">Smart Alerts</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>
                      Get notifications for exceptional opportunities (90+), popular stocks (&gt;10 followers), 
                      and stance changes on positions. Followed stocks are never auto-removed.
                    </CardDescription>
                  </CardContent>
                </Card>
              </div>

              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground">
                  <strong>Note:</strong> Unfollowed opportunities older than 2 weeks are automatically removed 
                  to keep discovery fresh. Follow stocks to track them permanently.
                </p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <DialogDescription className="text-base mb-4">
                You're ready to start tracking trading opportunities!
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
                      <p className="font-medium">Discover Opportunities</p>
                      <p className="text-sm text-muted-foreground">
                        Browse AI-scored stocks from insider trading in the "Opportunities" page. 
                        Each shows an AI stance (BUY/SELL/HOLD) and signal score (0-100). 
                        Strong signals (70+) appear in amber. Click any stock for detailed analysis.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-xs font-semibold text-primary">2</span>
                    </div>
                    <div>
                      <p className="font-medium">Follow Stocks</p>
                      <p className="text-sm text-muted-foreground">
                        Click the star button to follow stocks that interest you. Followed stocks appear in 
                        your "My Watchlist" dashboard and receive daily AI briefs with fresh recommendations.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-xs font-semibold text-primary">3</span>
                    </div>
                    <div>
                      <p className="font-medium">Track in Your Watchlist</p>
                      <p className="text-sm text-muted-foreground">
                        Your dashboard shows all followed stocks in one simple view with prices, scores, and stances. 
                        Check the notification bell for important alerts about high signals and stance changes.
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
                  Visit Settings to customize fetch intervals and quality filters. 
                  Click any followed stock to see financial health assessments (Profitability, Liquidity, Debt, Growth) 
                  and detailed AI analysis with daily briefs.
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
