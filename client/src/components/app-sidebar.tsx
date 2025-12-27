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
      <SidebarHeader className="p-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary flex-shrink-0">
            <Activity className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-sm font-semibold group-data-[collapsible=icon]:hidden truncate">
            signal2
          </span>
          <SidebarTrigger 
            className="h-6 w-6 ml-auto flex-shrink-0 group-data-[collapsible=icon]:hidden" 
            data-testid="button-sidebar-toggle" 
          />
        </div>
      </SidebarHeader>
      
      <SidebarContent className="px-2 py-1">
        <nav className="space-y-0.5">
          {menuItems.map((item) => {
            const itemPath = item.url.split('?')[0];
            const isPageActive = currentPath === itemPath || 
                                  (itemPath === "/opportunities" && (currentPath === "/" || currentPath === "/recommendations"));
            const badgeCount = getBadgeCount(item.url);
            
            const linkContent = (
              <Link
                href={item.url}
                onClick={handleNavClick}
                data-testid={item.testId}
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 rounded-sm text-sm transition-colors",
                  "hover:bg-[oklch(var(--notebook-ruled-line)/0.2)]",
                  isPageActive && "bg-[oklch(var(--notebook-ruled-line)/0.15)] border-l-2 border-primary -ml-0.5 pl-[calc(0.5rem+2px)]",
                  !isPageActive && "border-l-2 border-transparent -ml-0.5 pl-[calc(0.5rem+2px)]",
                  isCollapsed && "justify-center px-0 py-2"
                )}
              >
                <item.icon className={cn(
                  "h-4 w-4 flex-shrink-0",
                  isPageActive ? "text-primary" : "text-muted-foreground"
                )} />
                {!isCollapsed && (
                  <>
                    <span className={cn(
                      "truncate text-xs",
                      isPageActive ? "text-foreground font-medium" : "text-muted-foreground"
                    )}>
                      {item.title}
                    </span>
                    {badgeCount !== null && (
                      <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
                        {badgeCount}
                      </span>
                    )}
                  </>
                )}
              </Link>
            );

            if (isCollapsed) {
              return (
                <Tooltip key={item.title}>
                  <TooltipTrigger asChild>
                    {linkContent}
                  </TooltipTrigger>
                  <TooltipContent side="right" className="flex items-center gap-2">
                    {item.title}
                    {badgeCount !== null && (
                      <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
                        {badgeCount}
                      </span>
                    )}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return <div key={item.title}>{linkContent}</div>;
          })}
        </nav>

        {user?.isAdmin && (
          <>
            <div className="h-px bg-[oklch(var(--notebook-ruled-line)/0.2)] my-2" />
            {isCollapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href="/admin"
                    onClick={handleNavClick}
                    data-testid="link-admin"
                    className={cn(
                      "flex items-center justify-center py-2 rounded-sm transition-colors",
                      "hover:bg-[oklch(var(--notebook-ruled-line)/0.2)]",
                      location === "/admin" && "bg-[oklch(var(--notebook-ruled-line)/0.15)]"
                    )}
                  >
                    <ShieldCheck className={cn(
                      "h-4 w-4",
                      location === "/admin" ? "text-primary" : "text-muted-foreground"
                    )} />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">Admin</TooltipContent>
              </Tooltip>
            ) : (
              <Link
                href="/admin"
                onClick={handleNavClick}
                data-testid="link-admin"
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 rounded-sm text-sm transition-colors",
                  "hover:bg-[oklch(var(--notebook-ruled-line)/0.2)]",
                  location === "/admin" && "bg-[oklch(var(--notebook-ruled-line)/0.15)] border-l-2 border-primary -ml-0.5 pl-[calc(0.5rem+2px)]",
                  location !== "/admin" && "border-l-2 border-transparent -ml-0.5 pl-[calc(0.5rem+2px)]"
                )}
              >
                <ShieldCheck className={cn(
                  "h-4 w-4 flex-shrink-0",
                  location === "/admin" ? "text-primary" : "text-muted-foreground"
                )} />
                <span className={cn(
                  "truncate text-xs",
                  location === "/admin" ? "text-foreground font-medium" : "text-muted-foreground"
                )}>
                  Admin
                </span>
              </Link>
            )}
          </>
        )}
      </SidebarContent>
      
      <SidebarFooter className="p-2">
        {isCollapsed ? (
          <SidebarTrigger 
            className="h-6 w-6 mx-auto" 
            data-testid="button-sidebar-expand" 
          />
        ) : (
          <div className="text-[10px] text-muted-foreground text-center font-mono" data-testid="text-version">
            v{versionInfo?.version || "1.0.0"}
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
