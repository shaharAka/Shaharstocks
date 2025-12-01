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
import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Portfolio from "@/pages/portfolio";
import Purchase from "@/pages/purchase";
import Trading from "@/pages/trading";
import Settings from "@/pages/settings";
import CommunityDiscussion from "@/pages/community-discussion";
import FeatureSuggestions from "@/pages/community-feature-suggestions";
import AdminPage from "@/pages/admin";
import TickerDetail from "@/pages/ticker-detail";
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import Terms from "@/pages/terms";
import VerifyEmail from "@/pages/verify-email";
import NotFound from "@/pages/not-found";
import FollowedDashboard from "@/pages/followed-dashboard";
import { useEffect, useState } from "react";

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/verify-email" component={VerifyEmail} />
      <Route path="/terms" component={Terms} />
      <Route path="/" component={Purchase} />
      <Route path="/recommendations" component={Purchase} />
      <Route path="/dashboard" component={FollowedDashboard} />
      <Route path="/watchlist" component={Portfolio} />
      <Route path="/trading" component={Trading} />
      <Route path="/ticker/:ticker" component={TickerDetail} />
      <Route path="/community/discussion" component={CommunityDiscussion} />
      <Route path="/community/feature-suggestions" component={FeatureSuggestions} />
      <Route path="/community" component={CommunityDiscussion} />
      <Route path="/admin" component={AdminPage} />
      {/* Legacy redirects for backwards compatibility */}
      <Route path="/purchase" component={Purchase} />
      <Route path="/portfolio" component={Portfolio} />
      <Route path="/management" component={Portfolio} />
      <Route path="/history" component={Portfolio} />
      <Route path="/rules" component={Trading} />
      <Route path="/simulation" component={Trading} />
      <Route path="/settings" component={Settings} />
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
    // Show onboarding dialog when state is pending
    if (experienceState === "onboarding_pending") {
      setShowOnboarding(true);
    }
    // Close onboarding dialog only when state changes away from pending
    else if (showOnboarding && experienceState !== "onboarding_pending") {
      setShowOnboarding(false);
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
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <TutorialManager />
      <Onboarding 
        open={showOnboarding} 
        onOpenChange={() => {}} 
        onComplete={() => {}}
      />
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1">
          <header className="flex items-center justify-between px-2 py-2 md:px-4 border-b bg-background shrink-0">
            <SidebarTrigger className="md:hidden h-10 w-10" data-testid="button-mobile-menu" />
            <div className="flex items-center gap-1 md:gap-2 ml-auto">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('replay-tutorial'));
                }}
                data-testid="button-help"
                className="h-10 w-10"
              >
                <HelpCircle className="h-5 w-5" />
              </Button>
              <NotificationBell />
              <AnnouncementBell />
              <UserProfile />
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 overflow-auto">
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
