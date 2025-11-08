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
import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Dashboard from "@/pages/dashboard";
import Purchase from "@/pages/purchase";
import Management from "@/pages/management";
import History from "@/pages/history";
import Rules from "@/pages/rules";
import Simulation from "@/pages/simulation";
import Settings from "@/pages/settings";
import AdminPage from "@/pages/admin";
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import NotFound from "@/pages/not-found";
import { useEffect } from "react";

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/" component={Dashboard} />
      <Route path="/purchase" component={Purchase} />
      <Route path="/management" component={Management} />
      <Route path="/history" component={History} />
      <Route path="/rules" component={Rules} />
      <Route path="/simulation" component={Simulation} />
      <Route path="/settings" component={Settings} />
      <Route path="/admin" component={AdminPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthenticatedApp() {
  const { user, isLoading } = useUser();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user && location !== "/login" && location !== "/signup") {
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

  if (!user && location !== "/login" && location !== "/signup") {
    return null;
  }

  if (location === "/login" || location === "/signup") {
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
          <header className="flex items-center justify-between p-4 border-b bg-background shrink-0">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex items-center gap-2">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('replay-tutorial'));
                }}
                data-testid="button-help"
              >
                <HelpCircle className="h-5 w-5" />
              </Button>
              <UserProfile />
              <ThemeToggle />
            </div>
          </header>
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
