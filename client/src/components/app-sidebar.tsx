import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Star,
  Activity,
  ShoppingCart,
  LineChart,
  ShieldCheck,
  Lightbulb,
  ChevronDown,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useNewStocksCount } from "@/hooks/use-new-stocks-count";
import { useUser } from "@/contexts/UserContext";

const quickDecisionItems = [
  {
    title: "Opportunities",
    url: "/recommendations",
    icon: ShoppingCart,
    testId: "link-opportunities",
  },
];

const advancedToolsItems = [
  {
    title: "Analysis",
    url: "/trading",
    icon: LineChart,
    testId: "link-analysis",
    subItems: [
      { title: "Simulation", url: "/trading?tab=simulation", testId: "link-analysis-simulation" },
      { title: "What-If Rules", url: "/trading?tab=rules", testId: "link-analysis-rules" },
    ],
  },
  {
    title: "Watchlist",
    url: "/watchlist",
    icon: Star,
    testId: "link-watchlist",
    subItems: [
      { title: "Tracked Stocks", url: "/watchlist?tab=overview", testId: "link-watchlist-tracked" },
      { title: "Active Alerts", url: "/watchlist?tab=management", testId: "link-watchlist-alerts" },
      { title: "History", url: "/watchlist?tab=history", testId: "link-watchlist-history" },
    ],
  },
  {
    title: "Community",
    url: "/community",
    icon: Lightbulb,
    testId: "link-community",
  },
];

export function AppSidebar() {
  const [location, setLocation] = useLocation();
  const newStocksCount = useNewStocksCount();
  const { user } = useUser();
  const { setOpenMobile, isMobile, state } = useSidebar();
  
  // State to track current tab for reactive updates (default to 'overview' if no tab param)
  const [currentTab, setCurrentTab] = useState(new URLSearchParams(window.location.search).get('tab') || 'overview');

  // Fetch version info
  const { data: versionInfo } = useQuery<{ version: string; name: string }>({
    queryKey: ["/api/version"],
    staleTime: Infinity, // Version doesn't change during runtime
  });

  const handleNavClick = () => {
    // Close sidebar on mobile after navigation
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const handleSubMenuClick = (url: string) => {
    // Use setLocation for proper navigation including query params
    setLocation(url);
    // Dispatch custom event to notify pages of URL change
    window.dispatchEvent(new Event('urlchange'));
    handleNavClick();
  };
  
  // Listen for URL changes to update sidebar active state
  useEffect(() => {
    const handleUrlChange = () => {
      const params = new URLSearchParams(window.location.search);
      setCurrentTab(params.get('tab') || 'overview');
    };
    
    window.addEventListener('urlchange', handleUrlChange);
    window.addEventListener('popstate', handleUrlChange);
    
    return () => {
      window.removeEventListener('urlchange', handleUrlChange);
      window.removeEventListener('popstate', handleUrlChange);
    };
  }, []);

  const isCollapsed = state === "collapsed";
  
  // Get current path for active state detection (without query params)
  const currentPath = location.split('?')[0];

  return (
    <Sidebar>
      <SidebarHeader className="p-6">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary">
            <Activity className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">signal2</h1>
            <p className="text-xs text-muted-foreground">Trading Dashboard</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Quick Decisions</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {quickDecisionItems.map((item) => {
                const itemPath = item.url.split('?')[0];
                const isPageActive = currentPath === itemPath || 
                                      (itemPath === "/recommendations" && currentPath === "/");
                const showBadge = item.url === "/recommendations" && newStocksCount > 0;
                
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      className={isPageActive ? "bg-sidebar-accent" : ""}
                      data-testid={item.testId}
                      tooltip={isCollapsed ? item.title : undefined}
                    >
                      <Link href={item.url} onClick={handleNavClick}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                        {showBadge && (
                          <span 
                            className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground"
                            data-testid="badge-new-opportunities"
                          >
                            {newStocksCount}
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

        <SidebarGroup>
          <SidebarGroupLabel>Advanced Tools</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {advancedToolsItems.map((item) => {
                const itemPath = item.url.split('?')[0];
                const isPageActive = currentPath === itemPath;
                
                if (item.subItems) {
                  return (
                    <Collapsible key={item.title} asChild defaultOpen={isPageActive}>
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton
                            className={isPageActive ? "bg-sidebar-accent" : ""}
                            data-testid={item.testId}
                            tooltip={isCollapsed ? item.title : undefined}
                          >
                            <item.icon className="h-4 w-4 text-muted-foreground" />
                            <span>{item.title}</span>
                            <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {item.subItems.map((subItem) => {
                              const subItemTab = new URLSearchParams(subItem.url.split('?')[1] || '').get('tab');
                              const isSubItemActive = isPageActive && currentTab === subItemTab;
                              
                              return (
                                <SidebarMenuSubItem key={subItem.title}>
                                  <SidebarMenuSubButton
                                    isActive={isSubItemActive}
                                    data-testid={subItem.testId}
                                    onClick={() => handleSubMenuClick(subItem.url)}
                                    className="cursor-pointer"
                                  >
                                    <span>{subItem.title}</span>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              );
                            })}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  );
                }
                
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      className={isPageActive ? "bg-sidebar-accent" : ""}
                      data-testid={item.testId}
                      tooltip={isCollapsed ? item.title : undefined}
                    >
                      <Link href={item.url} onClick={handleNavClick}>
                        <item.icon className="h-4 w-4 text-muted-foreground" />
                        <span>{item.title}</span>
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
      <SidebarFooter className="p-4 border-t">
        <div className="text-xs text-muted-foreground text-center">
          <div className="font-mono" data-testid="text-version">
            v{versionInfo?.version || "1.0.0"}
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
