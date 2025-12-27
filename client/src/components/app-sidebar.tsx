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
  SidebarHeader,
  SidebarFooter,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useNewStocksCount } from "@/hooks/use-new-stocks-count";
import { useUser } from "@/contexts/UserContext";
import { useWebSocket } from "@/hooks/use-websocket";

const menuItems = [
  {
    title: "Opportunities",
    description: "Insider transactions",
    url: "/opportunities",
    icon: Lightbulb,
    testId: "link-opportunities",
  },
  {
    title: "Following",
    description: "Your watchlist",
    url: "/following",
    icon: Star,
    testId: "link-following",
  },
  {
    title: "In Position",
    description: "Active trades",
    url: "/in-position",
    icon: TrendingUp,
    testId: "link-in-position",
  },
  {
    title: "Portfolio",
    description: "Holdings & P&L",
    url: "/portfolio",
    icon: PieChart,
    testId: "link-portfolio",
  },
  {
    title: "Community",
    description: "Discussion",
    url: "/community",
    icon: Users,
    testId: "link-community",
  },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user } = useUser();
  const newStocksCount = useNewStocksCount(user?.showAllOpportunities ?? false);
  const { setOpenMobile, isMobile, state } = useSidebar();
  
  useWebSocket();

  const { data: versionInfo } = useQuery<{ version: string; name: string }>({
    queryKey: ["/api/version"],
    staleTime: Infinity,
  });

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
    <Sidebar 
      collapsible="icon" 
      className="border-r-0 bg-[oklch(var(--notebook-page))]"
    >
      <SidebarHeader className="p-4 border-b border-[oklch(var(--notebook-ruled-line)/0.2)]">
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
      
      <SidebarContent className="p-2">
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const itemPath = item.url.split('?')[0];
            const isPageActive = currentPath === itemPath || 
                                  (itemPath === "/opportunities" && (currentPath === "/" || currentPath === "/recommendations"));
            const badgeCount = getBadgeCount(item.url);
            
            return (
              <Link
                key={item.title}
                href={item.url}
                onClick={handleNavClick}
                data-testid={item.testId}
                data-active={isPageActive}
                className={cn(
                  "section-link block rounded-sm",
                  isCollapsed && "flex items-center justify-center p-2"
                )}
              >
                <div className="flex items-center gap-3">
                  <item.icon className={cn(
                    "h-4 w-4 flex-shrink-0",
                    isPageActive ? "text-primary" : "text-muted-foreground"
                  )} />
                  {!isCollapsed && (
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={cn(
                          "section-link-title",
                          isPageActive && "text-primary"
                        )}>
                          {item.title}
                        </span>
                        {badgeCount !== null && (
                          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground">
                            {badgeCount}
                          </span>
                        )}
                      </div>
                      <span className="section-link-desc">{item.description}</span>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {user?.isAdmin && (
          <>
            <div className="h-px bg-[oklch(var(--notebook-ruled-line)/0.2)] my-3" />
            <Link
              href="/admin"
              onClick={handleNavClick}
              data-testid="link-admin"
              data-active={location === "/admin"}
              className={cn(
                "section-link block rounded-sm",
                isCollapsed && "flex items-center justify-center p-2"
              )}
            >
              <div className="flex items-center gap-3">
                <ShieldCheck className={cn(
                  "h-4 w-4 flex-shrink-0",
                  location === "/admin" ? "text-primary" : "text-muted-foreground"
                )} />
                {!isCollapsed && (
                  <div className="flex-1 min-w-0">
                    <span className={cn(
                      "section-link-title",
                      location === "/admin" && "text-primary"
                    )}>
                      Admin
                    </span>
                    <span className="section-link-desc">Backoffice</span>
                  </div>
                )}
              </div>
            </Link>
          </>
        )}
      </SidebarContent>
      
      <SidebarFooter className="p-2 border-t border-[oklch(var(--notebook-ruled-line)/0.2)]">
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
