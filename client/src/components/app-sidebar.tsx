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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useNewStocksCount } from "@/hooks/use-new-stocks-count";
import { useUser } from "@/contexts/UserContext";
import { useWebSocket } from "@/hooks/use-websocket";

const menuItems = [
  { title: "Opportunities", url: "/opportunities", icon: Lightbulb, testId: "link-opportunities" },
  { title: "Following", url: "/following", icon: Star, testId: "link-following" },
  { title: "In Position", url: "/in-position", icon: TrendingUp, testId: "link-in-position" },
  { title: "Portfolio", url: "/portfolio", icon: PieChart, testId: "link-portfolio" },
  { title: "Community", url: "/community", icon: Users, testId: "link-community" },
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
      className="border-r-0 bg-transparent"
    >
      <SidebarHeader className="p-2 pb-0">
        <div className="flex items-center gap-1.5 px-1">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-primary flex-shrink-0">
            <Activity className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <span className="text-xs font-semibold group-data-[collapsible=icon]:hidden truncate">
            signal2
          </span>
          <SidebarTrigger 
            className="h-5 w-5 ml-auto flex-shrink-0 group-data-[collapsible=icon]:hidden" 
            data-testid="button-sidebar-toggle" 
          />
        </div>
      </SidebarHeader>
      
      <SidebarContent className="book-tab-rail mt-2">
        <nav className="flex flex-col gap-0.5 pr-0">
          {menuItems.map((item) => {
            const itemPath = item.url.split('?')[0];
            const isPageActive = currentPath === itemPath || 
                                  (itemPath === "/opportunities" && (currentPath === "/" || currentPath === "/recommendations"));
            const badgeCount = getBadgeCount(item.url);
            
            const tabContent = (
              <Link
                href={item.url}
                onClick={handleNavClick}
                data-testid={item.testId}
                data-active={isPageActive}
                className={cn(
                  "book-tab",
                  isCollapsed && "justify-center px-2"
                )}
              >
                <item.icon className="h-3.5 w-3.5 flex-shrink-0" />
                {!isCollapsed && (
                  <span className="truncate flex-1">{item.title}</span>
                )}
                {badgeCount !== null && !isCollapsed && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-medium text-primary-foreground">
                    {badgeCount}
                  </span>
                )}
              </Link>
            );

            if (isCollapsed) {
              return (
                <Tooltip key={item.title}>
                  <TooltipTrigger asChild>
                    {tabContent}
                  </TooltipTrigger>
                  <TooltipContent side="right" className="flex items-center gap-2">
                    {item.title}
                    {badgeCount !== null && (
                      <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-medium text-primary-foreground">
                        {badgeCount}
                      </span>
                    )}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return <div key={item.title}>{tabContent}</div>;
          })}
        </nav>

        {user?.isAdmin && (
          <>
            <div className="flex-1" />
            {isCollapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href="/admin"
                    onClick={handleNavClick}
                    data-testid="link-admin"
                    data-active={location === "/admin"}
                    className="book-tab justify-center px-2"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">Admin</TooltipContent>
              </Tooltip>
            ) : (
              <Link
                href="/admin"
                onClick={handleNavClick}
                data-testid="link-admin"
                data-active={location === "/admin"}
                className="book-tab"
              >
                <ShieldCheck className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate flex-1">Admin</span>
              </Link>
            )}
          </>
        )}
      </SidebarContent>
      
      <SidebarFooter className="p-1">
        {isCollapsed ? (
          <SidebarTrigger 
            className="h-5 w-5 mx-auto" 
            data-testid="button-sidebar-expand" 
          />
        ) : (
          <div className="text-[9px] text-muted-foreground text-center font-mono" data-testid="text-version">
            v{versionInfo?.version || "1.0.0"}
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
