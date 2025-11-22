import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Brain, Zap, Bell, TrendingUp } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="fixed top-0 left-0 right-0 h-16 md:h-20 border-b bg-background/80 backdrop-blur-sm z-50">
        <div className="max-w-7xl mx-auto h-full px-4 md:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2" data-testid="logo-header">
            <BarChart3 className="w-6 h-6 md:w-8 md:h-8 text-primary" />
            <span className="text-lg md:text-xl font-semibold">signal2</span>
          </div>
          <Button variant="default" data-testid="button-get-started">
            Get Started
          </Button>
        </div>
      </header>

      <main className="flex-1 pt-16 md:pt-20">
        <section className="min-h-[600px] md:min-h-[700px] flex items-center justify-center px-4">
          <div className="max-w-5xl mx-auto text-center space-y-12">
            <div className="space-y-6">
              <h1 className="text-5xl md:text-6xl font-bold tracking-tight" data-testid="text-hero-title">
                AI-Powered Trading Signals From Insider Activity
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto" data-testid="text-hero-description">
                Track insider trading filings from the SEC, get AI-powered buy/sell recommendations, and stay ahead of the market with intelligent alerts for high-value opportunities.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left max-w-4xl mx-auto">
              <Card data-testid="card-feature-ai">
                <CardHeader className="pb-3">
                  <Brain className="h-8 w-8 text-primary mb-2" />
                  <CardTitle className="text-base">AI Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm">
                    Dual-agent AI analyzes company fundamentals and market context to generate actionable BUY/SELL/HOLD stances with confidence scores.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card data-testid="card-feature-auto">
                <CardHeader className="pb-3">
                  <Zap className="h-8 w-8 text-primary mb-2" />
                  <CardTitle className="text-base">Auto Data Collection</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm">
                    Automatically fetches and filters insider trading transactions from SEC filings with quality filters for market cap and transaction value.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card data-testid="card-feature-watchlist">
                <CardHeader className="pb-3">
                  <TrendingUp className="h-8 w-8 text-primary mb-2" />
                  <CardTitle className="text-base">Smart Watchlist</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm">
                    Follow promising stocks to get daily AI briefs, financial health assessments, and 2-week execution notes for your trading decisions.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card data-testid="card-feature-alerts">
                <CardHeader className="pb-3">
                  <Bell className="h-8 w-8 text-primary mb-2" />
                  <CardTitle className="text-base">Real-Time Alerts</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm">
                    Get instant notifications for high-score signals, stance changes, and popular stocks with intelligent deduplication to reduce noise.
                  </CardDescription>
                </CardContent>
              </Card>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button size="lg" variant="default" data-testid="button-hero-primary">
                Start Analyzing
              </Button>
              <Button size="lg" variant="outline" data-testid="button-hero-secondary">
                Learn More
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-8 md:py-12 bg-card">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
            <p data-testid="text-copyright">&copy; 2024 signal2. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="#" className="hover-elevate active-elevate-2 px-2 py-1 rounded-md" data-testid="link-privacy">
                Privacy
              </a>
              <a href="#" className="hover-elevate active-elevate-2 px-2 py-1 rounded-md" data-testid="link-terms">
                Terms
              </a>
              <a href="#" className="hover-elevate active-elevate-2 px-2 py-1 rounded-md" data-testid="link-contact">
                Contact
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
