import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { UserProvider, useUser } from "@/contexts/UserContext";
import { UserProfile } from "@/components/user-profile";
import { NotificationBell } from "@/components/notification-bell";
import { AnnouncementBell } from "@/components/announcement-bell";
import { TrialStatusBanner } from "@/components/trial-status-banner";
import { TutorialManager } from "@/components/TutorialManager";
import { Onboarding } from "@/components/onboarding";
import { BugReportButton } from "@/components/bug-report-button";
import { HelpCircle, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import Portfolio from "@/pages/portfolio";
import Opportunities from "@/pages/opportunities";
import Following from "@/pages/following";
import InPosition from "@/pages/in-position";
import Community from "@/pages/community";
import FeatureSuggestions from "@/pages/community-feature-suggestions";
import Trading from "@/pages/trading";
import Settings from "@/pages/settings";
import AdminPage from "@/pages/admin";
import TickerDetail from "@/pages/ticker-detail";
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import Terms from "@/pages/terms";
import VerifyEmail from "@/pages/verify-email";
import NotFound from "@/pages/not-found";
import { useEffect, useState } from "react";

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/verify-email" component={VerifyEmail} />
      <Route path="/terms" component={Terms} />
      <Route path="/" component={Opportunities} />
      <Route path="/opportunities" component={Opportunities} />
      <Route path="/following" component={Following} />
      <Route path="/in-position" component={InPosition} />
      <Route path="/portfolio" component={Portfolio} />
      <Route path="/community" component={Community} />
      <Route path="/community/discussion" component={Community} />
      <Route path="/community/feature-suggestions" component={FeatureSuggestions} />
      <Route path="/ticker/:ticker" component={TickerDetail} />
      <Route path="/trading" component={Trading} />
      <Route path="/admin" component={AdminPage} />
      <Route path="/settings" component={Settings} />
      {/* Legacy redirects for backwards compatibility */}
      <Route path="/recommendations" component={Opportunities} />
      <Route path="/purchase" component={Opportunities} />
      <Route path="/dashboard" component={Following} />
      <Route path="/watchlist" component={Portfolio} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthenticatedApp() {
  const { user, isLoading, experienceState } = useUser();
  const [location, setLocation] = useLocation();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (!isLoading && !user && location !== "/login" && location !== "/signup" && location !== "/verify-email" && location !== "/terms") {
      setLocation("/login");
    }
  }, [user, isLoading, location, setLocation]);

  useEffect(() => {
    const shouldShowOnboarding = experienceState === "onboarding_pending";
    if (shouldShowOnboarding !== showOnboarding) {
      setShowOnboarding(shouldShowOnboarding);
    }
  }, [experienceState, showOnboarding]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user && location !== "/login" && location !== "/signup" && location !== "/verify-email" && location !== "/terms") {
    return null;
  }

  if (location === "/login" || location === "/signup" || location === "/verify-email" || location === "/terms") {
    return <Router />;
  }

  const style = {
    "--sidebar-width": "11rem",
    "--sidebar-width-icon": "3rem",
    "--header-height": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <TutorialManager />
      <Onboarding 
        open={showOnboarding} 
        onOpenChange={() => {}} 
        onComplete={() => {}}
      />
      <div className="flex flex-col h-screen w-full book-page">
        <header className="flex items-center justify-between px-2 py-1.5 md:px-4 md:py-2 bg-[oklch(var(--notebook-page))] shrink-0 border-b border-border/30 min-h-[var(--header-height)] z-20">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="md:hidden h-8 w-8" data-testid="button-mobile-menu" />
            <div className="flex items-center gap-1.5 md:gap-2">
              <div className="flex h-6 w-6 md:h-7 md:w-7 items-center justify-center rounded bg-primary flex-shrink-0">
                <Activity className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary-foreground" />
              </div>
              <span className="text-xs md:text-sm font-semibold">signal2</span>
            </div>
          </div>
          <div className="flex items-center gap-0.5 md:gap-2">
            <BugReportButton />
            <Button
              size="icon"
              variant="ghost"
              onClick={() => {
                window.dispatchEvent(new CustomEvent('replay-tutorial'));
              }}
              data-testid="button-help"
              className="h-8 w-8 md:h-10 md:w-10 hidden md:flex"
            >
              <HelpCircle className="h-4 w-4 md:h-5 md:w-5" />
            </Button>
            <NotificationBell />
            <AnnouncementBell />
            <UserProfile />
            <ThemeToggle />
          </div>
        </header>
        <div className="flex flex-1 min-h-0">
          <AppSidebar />
          <main className="flex-1 overflow-auto notebook-page">
            <TrialStatusBanner />
            <Router />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <UserProvider>
            <AuthenticatedApp />
          </UserProvider>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
