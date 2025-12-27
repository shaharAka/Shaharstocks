import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ShieldCheck,
  Lightbulb,
  Star,
  TrendingUp,
  PieChart,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useNewStocksCount } from "@/hooks/use-new-stocks-count";
import { useUser } from "@/contexts/UserContext";
import { useWebSocket } from "@/hooks/use-websocket";

// New funnel-based menu structure
const menuItems = [
  {
    title: "Opportunities",
    url: "/opportunities",
    icon: Lightbulb,
    testId: "link-opportunities",
    description: "All insider transactions",
  },
  {
    title: "Following",
    url: "/following",
    icon: Star,
    testId: "link-following",
    description: "Stocks you're watching",
  },
  {
    title: "In Position",
    url: "/in-position",
    icon: TrendingUp,
    testId: "link-in-position",
    description: "Active trades",
  },
  {
    title: "Portfolio",
    url: "/portfolio",
    icon: PieChart,
    testId: "link-portfolio",
    description: "Holdings & P&L",
  },
  {
    title: "Community",
    url: "/community",
    icon: Users,
    testId: "link-community",
    description: "Discussion & insights",
  },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user } = useUser();
  const newStocksCount = useNewStocksCount(user?.showAllOpportunities ?? false);
  const { setOpenMobile, isMobile, state } = useSidebar();
  
  // Initialize WebSocket for real-time updates
  useWebSocket();

  // Fetch version info
  const { data: versionInfo } = useQuery<{ version: string; name: string }>({
    queryKey: ["/api/version"],
    staleTime: Infinity,
  });

  // Fetch counts for badge display
  const { data: followedCount = 0 } = useQuery<number>({
    queryKey: ["/api/followed-stocks/count"],
    enabled: !!user,
  });

  const { data: positionCount = 0 } = useQuery<number>({
    queryKey: ["/api/positions/count"],
    enabled: !!user,
  });

  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const isCollapsed = state === "collapsed";
  const currentPath = location.split('?')[0];

  // Get badge count for each menu item
  const getBadgeCount = (url: string): number | null => {
    switch (url) {
      case "/opportunities":
        return newStocksCount > 0 ? newStocksCount : null;
      case "/following":
        return followedCount > 0 ? followedCount : null;
      case "/in-position":
        return positionCount > 0 ? positionCount : null;
      default:
        return null;
    }
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary flex-shrink-0">
              <Activity className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="group-data-[collapsible=icon]:hidden min-w-0">
              <h1 className="text-base font-semibold truncate">signal2</h1>
              <p className="text-xs text-muted-foreground truncate">Trading Notebook</p>
            </div>
          </div>
          <SidebarTrigger 
            className="h-8 w-8 flex-shrink-0 group-data-[collapsible=icon]:hidden" 
            data-testid="button-sidebar-toggle" 
          />
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workflow</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item, index) => {
                const itemPath = item.url.split('?')[0];
                const isPageActive = currentPath === itemPath || 
                                      (itemPath === "/opportunities" && (currentPath === "/" || currentPath === "/recommendations"));
                const badgeCount = getBadgeCount(item.url);
                
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      className={cn(
                        "relative",
                        isPageActive && "bg-sidebar-accent"
                      )}
                      data-testid={item.testId}
                      tooltip={isCollapsed ? item.title : undefined}
                    >
                      <Link href={item.url} onClick={handleNavClick}>
                        {/* Funnel indicator - shows progression */}
                        <div className={cn(
                          "absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full transition-colors",
                          isPageActive ? "bg-primary" : "bg-transparent"
                        )} />
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                        {badgeCount !== null && (
                          <span 
                            className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground"
                            data-testid={`badge-${item.testId}`}
                          >
                            {badgeCount}
                          </span>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {user?.isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    className={location === "/admin" ? "bg-sidebar-accent" : ""}
                    data-testid="link-admin"
                    tooltip={isCollapsed ? "Backoffice" : undefined}
                  >
                    <Link href="/admin" onClick={handleNavClick}>
                      <ShieldCheck className="h-4 w-4" />
                      <span>Backoffice</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      
      <SidebarFooter className="p-2 border-t">
        {isCollapsed ? (
          <SidebarTrigger 
            className="h-8 w-8 mx-auto" 
            data-testid="button-sidebar-expand" 
          />
        ) : (
          <div className="text-xs text-muted-foreground text-center px-2">
            <div className="font-mono" data-testid="text-version">
              v{versionInfo?.version || "1.0.0"}
            </div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
