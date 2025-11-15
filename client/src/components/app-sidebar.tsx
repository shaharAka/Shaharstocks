import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ShoppingCart,
  ShieldCheck,
  Lightbulb,
  MessageSquare,
  ChevronDown,
  Star,
  Loader2,
  TrendingUp,
  TrendingDown,
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

const mainMenuItems = [
  {
    title: "Opportunities",
    url: "/recommendations",
    icon: ShoppingCart,
    testId: "link-opportunities",
  },
  {
    title: "Following",
    url: "/following",
    icon: Star,
    testId: "link-following",
  },
];

const communityMenuItems = [
  {
    title: "Discussion",
    url: "/community/discussion",
    icon: MessageSquare,
    testId: "link-discussion",
  },
  {
    title: "Feature Suggestions",
    url: "/community/feature-suggestions",
    icon: Lightbulb,
    testId: "link-feature-suggestions",
  },
];

export function AppSidebar() {
  const [location, setLocation] = useLocation();
  const newStocksCount = useNewStocksCount();
  const { user } = useUser();
  const { setOpenMobile, isMobile, state } = useSidebar();

  // Fetch version info
  const { data: versionInfo } = useQuery<{ version: string; name: string }>({
    queryKey: ["/api/version"],
    staleTime: Infinity, // Version doesn't change during runtime
  });

  // Fetch followed stocks with status (includes job status, stance, alignment)
  const { data: followedStocks = [] } = useQuery<Array<{ 
    ticker: string; 
    currentPrice: string;
    jobStatus?: 'pending' | 'processing' | 'completed' | 'failed' | null;
    latestStance?: 'BUY' | 'SELL' | 'HOLD' | null;
    stanceAlignment?: 'positive' | 'negative' | 'neutral' | null;
  }>>({
    queryKey: ["/api/followed-stocks-with-status"],
    enabled: !!user,
    refetchInterval: 10000, // Refresh every 10 seconds for job status updates
    retry: false,
    meta: { ignoreError: true },
  });

  const handleNavClick = () => {
    // Close sidebar on mobile after navigation
    if (isMobile) {
      setOpenMobile(false);
    }
  };

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
            <p className="text-xs text-muted-foreground">Opportunity Tracker</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainMenuItems.map((item) => {
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
              
              {/* Following Submenu */}
              {followedStocks.length > 0 && (
                <Collapsible 
                  defaultOpen={currentPath.startsWith("/ticker/")}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        tooltip={isCollapsed ? "Following" : undefined}
                        data-testid="link-following"
                      >
                        <Star className="h-4 w-4 fill-current" />
                        <span>Following</span>
                        <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {followedStocks.map((stock) => {
                          const tickerPath = `/ticker/${stock.ticker}`;
                          const isTickerActive = currentPath === tickerPath;
                          const isProcessing = stock.jobStatus === 'pending' || stock.jobStatus === 'processing';
                          
                          // Get stance indicator
                          // Show loader when processing
                          // Show green up arrow when alignment is positive (BUY+uptrend or SELL+downtrend)
                          // Show red down arrow when alignment is negative (BUY+downtrend or SELL+uptrend)
                          // Neutral (HOLD) shows no icon
                          let StanceIcon = null;
                          let stanceColor = "";
                          if (isProcessing) {
                            StanceIcon = Loader2;
                            stanceColor = "text-muted-foreground animate-spin";
                          } else if (stock.stanceAlignment === 'positive') {
                            StanceIcon = TrendingUp;
                            stanceColor = "text-green-600 dark:text-green-400";
                          } else if (stock.stanceAlignment === 'negative') {
                            StanceIcon = TrendingDown;
                            stanceColor = "text-red-600 dark:text-red-400";
                          }
                          // Neutral (HOLD) or null shows no icon
                          
                          return (
                            <SidebarMenuSubItem key={stock.ticker}>
                              <SidebarMenuSubButton
                                asChild
                                className={isTickerActive ? "bg-sidebar-accent" : ""}
                                data-testid={`link-ticker-${stock.ticker}`}
                              >
                                <Link href={tickerPath} onClick={handleNavClick}>
                                  <span className="font-mono font-medium flex items-center gap-1.5">
                                    {StanceIcon && <StanceIcon className={`h-3 w-3 ${stanceColor}`} />}
                                    {stock.ticker}
                                  </span>
                                  <span className="ml-auto text-xs font-mono text-muted-foreground">
                                    ${parseFloat(stock.currentPrice).toFixed(2)}
                                  </span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          );
                        })}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              )}
              
              {/* Community Submenu */}
              <Collapsible 
                defaultOpen={currentPath.startsWith("/community")}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      tooltip={isCollapsed ? "Community" : undefined}
                      data-testid="link-community"
                    >
                      <Lightbulb className="h-4 w-4" />
                      <span>Community</span>
                      <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {communityMenuItems.map((subItem) => {
                        const subItemPath = subItem.url.split('?')[0];
                        const isSubPageActive = currentPath === subItemPath;
                        
                        return (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton
                              asChild
                              className={isSubPageActive ? "bg-sidebar-accent" : ""}
                              data-testid={subItem.testId}
                            >
                              <Link href={subItem.url} onClick={handleNavClick}>
                                <subItem.icon className="h-4 w-4" />
                                <span>{subItem.title}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        );
                      })}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
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
