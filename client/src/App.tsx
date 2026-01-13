import { Switch, Route, useLocation } from "wouter";
import { useEffect, Suspense, useRef } from "react";
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
import { LoadingFallback } from "@/components/LoadingFallback";

// #region agent log
const logDebug = (location: string, message: string, data: any, hypothesisId: string) => {
  const logData = {location,message,data,timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId};
  console.log(`[DEBUG ${hypothesisId}]`, location, message, data);
  fetch('http://127.0.0.1:7243/ingest/9504a544-9592-4c7b-afe6-b49cb5e62f9f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logData)}).catch((e)=>console.error('Log fetch failed:',e));
};
// #endregion

function Router() {
  // #region agent log
  const renderCount = useRef(0);
  renderCount.current += 1;
  logDebug('App.tsx:Router', 'Router render', { renderCount: renderCount.current }, 'H1');
  // #endregion
  
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Switch>
        <Route path="/login">
          <Login />
        </Route>
        {/* Root path (/) shows login page directly */}
        <Route path="/">
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
  // ALL HOOKS MUST BE CALLED FIRST - before any conditional logic or early returns
  const { user, isLoading } = useUser();
  const [location, setLocation] = useLocation();
  
  // #region agent log
  const renderCount = useRef(0);
  renderCount.current += 1;
  logDebug('App.tsx:AuthenticatedApp', 'AuthenticatedApp render', { renderCount: renderCount.current }, 'H1');
  
  useEffect(() => {
    logDebug('App.tsx:AuthenticatedApp', 'Auth state changed', { user: user?.id, isLoading, location }, 'H1');
  }, [user?.id, isLoading, location]);
  // #endregion

  // Public pages that don't require authentication
  // NOTE: "/" (root) shows login page - authenticated users will be redirected
  const publicPages = ["/", "/login", "/signup", "/verify-email", "/terms"];
  const isPublicPage = publicPages.includes(location);
  const isRoot = location === "/";

  // Handle redirects based on authentication state
  useEffect(() => {
    // Only redirect when we have determined the user state (not loading)
    if (isLoading) {
      logDebug('App.tsx:AuthenticatedApp', 'Skipping redirect - still loading', { location }, 'H1');
      return;
    }

    // ROOT PATH (/): Shows login page, but if user is authenticated, redirect to dashboard
    if (isRoot && user) {
      // Authenticated user on root: redirect to dashboard
      const storedRedirect = sessionStorage.getItem("loginRedirect");
      const redirectTo = storedRedirect || "/following";
      
      if (storedRedirect) {
        sessionStorage.removeItem("loginRedirect");
      }
      
      logDebug('App.tsx:AuthenticatedApp', 'Root path - redirecting authenticated user to dashboard', { 
        redirectTo, 
        userId: user.id,
        timestamp: Date.now()
      }, 'H1');
      
      setLocation(redirectTo);
      return;
    }
    // If not authenticated on root, show login page (no redirect needed)

    // If user is logged in and on a public page, redirect to dashboard
    if (user && isPublicPage) {
      // Check if there's a stored redirect from login (set by login.tsx after successful login)
      const storedRedirect = sessionStorage.getItem("loginRedirect");
      const redirectTo = storedRedirect || "/following";
      
      // Clear the stored redirect immediately to prevent loops
      if (storedRedirect) {
        sessionStorage.removeItem("loginRedirect");
      }
      
      logDebug('App.tsx:AuthenticatedApp', 'Redirecting authenticated user from public page', { 
        location, 
        redirectTo, 
        hadStoredRedirect: !!storedRedirect, 
        userId: user.id,
        userEmail: user.email,
        timestamp: Date.now()
      }, 'H1');
      
      // Use setTimeout to ensure this happens after React has processed the state update
      setTimeout(() => {
        logDebug('App.tsx:AuthenticatedApp', 'Executing redirect', { redirectTo }, 'H1');
        setLocation(redirectTo);
      }, 0);
      return;
    }

    // If no user and on a protected route, redirect to login with return URL
    if (!user && !isPublicPage) {
      logDebug('App.tsx:AuthenticatedApp', 'Redirecting unauthenticated user to login', { 
        location,
        isLoading,
        timestamp: Date.now()
      }, 'H1');
      setLocation(`/login?redirect=${encodeURIComponent(location)}`);
      return;
    }
    
    // Log when no redirect is needed
    logDebug('App.tsx:AuthenticatedApp', 'No redirect needed', { 
      hasUser: !!user,
      isPublicPage,
      location 
    }, 'H1');
  }, [user, isLoading, location, isPublicPage, isRoot, setLocation]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // ROOT PATH: If authenticated, show redirecting message (will redirect to dashboard)
  // If not authenticated, show login page (handled by Router)
  if (isRoot && user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Redirecting to dashboard...</div>
      </div>
    );
  }

  // If user is logged in and on a public page, show redirecting message
  if (user && isPublicPage) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Redirecting...</div>
      </div>
    );
  }

  // If no user and on a protected route, show redirecting message
  if (!user && !isPublicPage) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Redirecting to login...</div>
      </div>
    );
  }

  // Show public pages for unauthenticated users
  if (!user) {
    return <Router />;
  }

  // Authenticated user - show full app with sidebar
  const style = {
    "--sidebar-width": "11rem",
    "--sidebar-width-icon": "3rem",
    "--header-height": "3rem",
  } as React.CSSProperties;

  return (
    <SidebarProvider style={style}>
      <TutorialManager />
      <Onboarding 
        open={false} 
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
  // #region agent log
  const renderCount = useRef(0);
  renderCount.current += 1;
  logDebug('App.tsx:App', 'App root render - VERSION 2 (Login at Root)', { renderCount: renderCount.current }, 'H1');
  console.log("App.tsx LOADED - VERSION 2 (Login at Root)");
  // #endregion
  
  // #region agent log
  useEffect(() => {
    logDebug('App.tsx:App', 'App mounted', {}, 'H1');
    return () => {
      logDebug('App.tsx:App', 'App unmounting', {}, 'H1');
    };
  }, []);
  // #endregion
  
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
