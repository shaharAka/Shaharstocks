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
import { HelpCircle, Settings as SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import Portfolio from "@/pages/portfolio";
import Purchase from "@/pages/purchase";
import Trading from "@/pages/trading";
import Settings from "@/pages/settings";
import Community from "@/pages/community";
import AdminPage from "@/pages/admin";
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import Terms from "@/pages/terms";
import NotFound from "@/pages/not-found";
import { useEffect, useState } from "react";

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/terms" component={Terms} />
      <Route path="/" component={Portfolio} />
      <Route path="/recommendations" component={Purchase} />
      <Route path="/trading" component={Trading} />
      <Route path="/community" component={Community} />
      <Route path="/admin" component={AdminPage} />
      {/* Legacy redirects for backwards compatibility */}
      <Route path="/purchase" component={Purchase} />
      <Route path="/management" component={Portfolio} />
      <Route path="/history" component={Portfolio} />
      <Route path="/dashboard" component={Portfolio} />
      <Route path="/rules" component={Trading} />
      <Route path="/simulation" component={Trading} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthenticatedApp() {
  const { user, isLoading } = useUser();
  const [location, setLocation] = useLocation();
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !user && location !== "/login" && location !== "/signup" && location !== "/terms") {
      setLocation("/login");
    }
  }, [user, isLoading, location, setLocation]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user && location !== "/login" && location !== "/signup" && location !== "/terms") {
    return null;
  }

  if (location === "/login" || location === "/signup" || location === "/terms") {
    return <Router />;
  }

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between px-2 py-2 md:p-4 border-b bg-background shrink-0">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex items-center gap-1 md:gap-2">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('replay-tutorial'));
                }}
                data-testid="button-help"
                className="h-11 w-11"
              >
                <HelpCircle className="h-5 w-5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setSettingsOpen(true)}
                data-testid="button-settings"
                className="h-11 w-11"
              >
                <SettingsIcon className="h-5 w-5" />
              </Button>
              <NotificationBell />
              <UserProfile />
              <ThemeToggle />
            </div>
          </header>
          <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
            <DialogContent className="max-w-[95vw] md:max-w-4xl max-h-[90vh] overflow-auto">
              <Settings />
            </DialogContent>
          </Dialog>
          <main className="flex-1 overflow-auto">
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
