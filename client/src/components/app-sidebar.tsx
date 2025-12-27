import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
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
  const [searchString, setSearchString] = useState('');
  const { user } = useUser();
  const newStocksCount = useNewStocksCount(user?.showAllOpportunities ?? false);
  const { setOpenMobile, isMobile, state } = useSidebar();
  
  // Track search string changes from window.location
  useEffect(() => {
    setSearchString(window.location.search);
  }, [location]);
  
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
  const currentPath = location;
  
  // Check if we're on a stock/ticker detail page
  const isStockPage = currentPath.startsWith('/stock/') || currentPath.startsWith('/ticker/');
  
  // Get the referrer from query params to determine which section to highlight
  const urlParams = new URLSearchParams(searchString);
  const fromSection = urlParams.get('from');

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
      className="border-r-0 bg-[oklch(var(--notebook-page))] sidebar-below-header sidebar-floating ml-[3px] mr-[3px] mt-[10px] mb-[10px]"
    >
      <SidebarContent className="book-tab-rail justify-start pt-2">
        <nav className="flex flex-col">
          {menuItems.map((item) => {
            const itemPath = item.url.split('?')[0];
            
            // Determine if this tab should be active
            let isPageActive = currentPath === itemPath || 
                               (itemPath === "/opportunities" && (currentPath === "/" || currentPath === "/recommendations"));
            
            // When on a stock detail page, highlight the section we came from
            if (isStockPage && fromSection) {
              isPageActive = itemPath === `/${fromSection}`;
            } else if (isStockPage && !fromSection) {
              // Default to opportunities if no fromSection specified
              isPageActive = itemPath === "/opportunities";
            }
            
            const badgeCount = getBadgeCount(item.url);
            
            const tabContent = (
              <Link
                href={item.url}
                onClick={handleNavClick}
                data-testid={item.testId}
                data-active={isPageActive}
                className={cn(
                  "book-tab",
                  isCollapsed && "justify-center px-2 py-3"
                )}
              >
                <item.icon className="tab-icon" />
                {!isCollapsed && (
                  <>
                    <span className="flex-1">{item.title}</span>
                    {badgeCount !== null && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/20 px-1.5 text-[10px] font-medium text-primary">
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
                    className="book-tab justify-center px-2 py-3"
                  >
                    <ShieldCheck className="tab-icon" />
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
                <ShieldCheck className="tab-icon" />
                <span className="flex-1">Admin</span>
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
