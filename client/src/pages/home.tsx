import { Button } from "@/components/ui/button";
import { BarChart3 } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="fixed top-0 left-0 right-0 h-16 md:h-20 border-b bg-background/80 backdrop-blur-sm z-50">
        <div className="max-w-7xl mx-auto h-full px-4 md:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2" data-testid="logo-header">
            <BarChart3 className="w-6 h-6 md:w-8 md:h-8 text-primary" />
            <span className="text-lg md:text-xl font-semibold">StockDash</span>
          </div>
          <Button variant="default" data-testid="button-get-started">
            Get Started
          </Button>
        </div>
      </header>

      <main className="flex-1 pt-16 md:pt-20">
        <section className="min-h-[600px] md:min-h-[700px] flex items-center justify-center px-4">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="space-y-4">
              <h1 className="text-5xl md:text-6xl font-bold tracking-tight" data-testid="text-hero-title">
                Stock Analysis Platform
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto" data-testid="text-hero-description">
                Professional tools for market analysis and investment insights
              </p>
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
            <p data-testid="text-copyright">&copy; 2024 StockDash. All rights reserved.</p>
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
