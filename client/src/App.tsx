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
import { AnalysisStatusPopup } from "@/components/analysis-status-popup";
import { HelpCircle, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Portfolio,
  Opportunities,
  Following,
  InPosition,
  Community,
  FeatureSuggestions,
  Trading,
  Settings,
  AdminPage,
  TickerDetail,
  Login,
  Signup,
  Terms,
  VerifyEmail,
  NotFound,
} from "@/pages";
import Home from "@/pages/home";
import { LoadingFallback } from "@/components/LoadingFallback";
import { useEffect, useState, Suspense } from "react";

function Router() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Switch>
        <Route path="/login">
          <Login />
        </Route>
        <Route path="/signup">
          <Signup />
        </Route>
        <Route path="/verify-email">
          <VerifyEmail />
        </Route>
        <Route path="/terms">
          <Terms />
        </Route>
        <Route path="/">
          <Home />
        </Route>
        <Route path="/opportunities">
          <Opportunities />
        </Route>
        <Route path="/following">
          <Following />
        </Route>
        <Route path="/in-position">
          <InPosition />
        </Route>
        <Route path="/portfolio">
          <Portfolio />
        </Route>
        <Route path="/community">
          <Community />
        </Route>
        <Route path="/community/discussion">
          <Community />
        </Route>
        <Route path="/community/feature-suggestions">
          <FeatureSuggestions />
        </Route>
        <Route path="/ticker/:ticker">
          <TickerDetail />
        </Route>
        <Route path="/trading">
          <Trading />
        </Route>
        <Route path="/admin">
          <AdminPage />
        </Route>
        <Route path="/settings">
          <Settings />
        </Route>
        {/* Legacy redirects for backwards compatibility */}
        <Route path="/recommendations">
          <Opportunities />
        </Route>
        <Route path="/purchase">
          <Opportunities />
        </Route>
        <Route path="/dashboard">
          <Following />
        </Route>
        <Route path="/watchlist">
          <Portfolio />
        </Route>
        <Route>
          <NotFound />
        </Route>
      </Switch>
    </Suspense>
  );
}

function AuthenticatedApp() {
  const { user, isLoading, experienceState } = useUser();
  const [location, setLocation] = useLocation();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    // Don't redirect if user is on public pages (login, signup, home, terms, verify-email)
    const publicPages = ["/login", "/signup", "/verify-email", "/terms", "/"];
    if (!isLoading && !user && !publicPages.includes(location)) {
      setLocation("/");
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

  // Show public pages (home, login, signup, etc.) for unauthenticated users
  const publicPages = ["/", "/login", "/signup", "/verify-email", "/terms"];
  if (!user && !publicPages.includes(location)) {
    return null;
  }

  if (publicPages.includes(location)) {
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
        <div className="flex flex-1 min-h-0 md:pl-[calc(var(--sidebar-width)+0.375rem)]">
          <AppSidebar />
          <main className="flex-1 overflow-auto notebook-page pl-[0px] pr-[0px] ml-[8px] mr-[8px]">
            <TrialStatusBanner />
            <Router />
          </main>
        </div>
        <AnalysisStatusPopup />
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
