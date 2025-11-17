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
  Minus,
  ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { useWebSocket } from "@/hooks/use-websocket";

const mainMenuItems = [
  {
    title: "Opportunities",
    url: "/recommendations",
    icon: ShoppingCart,
    testId: "link-opportunities",
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
  
  // Initialize WebSocket for real-time updates (replaces aggressive polling)
  const { isConnected: wsConnected } = useWebSocket();

  // Fetch version info
  const { data: versionInfo } = useQuery<{ version: string; name: string }>({
    queryKey: ["/api/version"],
    staleTime: Infinity, // Version doesn't change during runtime
  });

  // Fetch followed stocks with status - Poll when there are active jobs
  const { data: followedStocks = [], isLoading: isLoadingFollowed, error: followedError } = useQuery<Array<{ 
    ticker: string; 
    currentPrice: string;
    jobStatus?: 'pending' | 'processing' | 'completed' | 'failed' | null;
    insiderAction?: 'BUY' | 'SELL' | null;
    aiStance?: 'BUY' | 'SELL' | 'HOLD' | null;
    aiScore?: number | null;
    stanceAlignment?: 'act' | 'hold' | null;
  }>>({
    queryKey: ["/api/followed-stocks-with-status"],
    enabled: !!user,
    // Poll every 5 seconds if there are active analysis jobs to update spinner
    refetchInterval: (query) => {
      const hasActiveJobs = query.state.data?.some((stock: any) => 
        stock.jobStatus === 'pending' || stock.jobStatus === 'processing'
      );
      return hasActiveJobs ? 5000 : false; // 5 seconds if active jobs, otherwise no polling
    },
    retry: false,
    meta: { ignoreError: true },
  });

  // Debug logging
  console.log('[Sidebar] Followed stocks data:', { 
    count: followedStocks.length, 
    isLoading: isLoadingFollowed, 
    error: followedError,
    hasUser: !!user,
    stocks: followedStocks 
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
              {followedStocks.length > 0 && (() => {
                // Group stocks by stanceAlignment
                // ACT: AI agrees with insider (strong signal)
                // HOLD: AI conflicts with insider (weak signal)
                // No alignment: Missing data (shown after ACT stocks, no special grouping)
                const actStocks = followedStocks.filter(s => s.stanceAlignment === 'act');
                const holdStocks = followedStocks.filter(s => s.stanceAlignment === 'hold');
                const noAlignmentStocks = followedStocks.filter(s => !s.stanceAlignment);
                
                // Determine if hold stocks should be grouped
                const HOLD_DISPLAY_LIMIT = 3;
                const shouldGroupHoldStocks = holdStocks.length > HOLD_DISPLAY_LIMIT;
                
                const renderStockItem = (stock: typeof followedStocks[0]) => {
                  const tickerPath = `/ticker/${stock.ticker}`;
                  const isTickerActive = currentPath === tickerPath;
                  const isProcessing = stock.jobStatus === 'pending' || stock.jobStatus === 'processing';
                  
                  // Determine buy/sell tag based on INSIDER ACTION (left of ticker)
                  // Show this whenever we have insider action data
                  // BUY uses green success color, SELL uses red destructive color
                  let insiderTag: { text: string; isBuy: boolean } | null = null;
                  if (stock.insiderAction === 'BUY') {
                    insiderTag = { text: 'B', isBuy: true };
                  } else if (stock.insiderAction === 'SELL') {
                    insiderTag = { text: 'S', isBuy: false };
                  }
                  
                  // Determine act/hold status based on STANCE ALIGNMENT (right of price)
                  // Only show this when we have complete AI analysis data
                  // "act" = AI agrees with insider action (strong signal)
                  // "hold" = AI conflicts with insider action (weak signal)
                  let actionTag: { text: string; variant: 'default' | 'secondary' } | null = null;
                  if (stock.stanceAlignment != null) {
                    if (stock.stanceAlignment === 'act') {
                      actionTag = { text: 'act', variant: 'default' };
                    } else if (stock.stanceAlignment === 'hold') {
                      actionTag = { text: 'hold', variant: 'secondary' };
                    }
                  }
                  
                  return (
                    <SidebarMenuSubItem key={stock.ticker}>
                      <SidebarMenuSubButton
                        asChild
                        className={isTickerActive ? "bg-sidebar-accent" : ""}
                        data-testid={`link-ticker-${stock.ticker}`}
                      >
                        <Link href={tickerPath} onClick={handleNavClick}>
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            {/* Insider action badge (left of ticker) */}
                            {insiderTag && !isProcessing && (
                              insiderTag.isBuy ? (
                                <Badge 
                                  className="h-4 px-1 text-[10px] font-bold flex-shrink-0 bg-success text-success-foreground hover-elevate"
                                  data-testid={`badge-insider-${stock.ticker}`}
                                >
                                  {insiderTag.text}
                                </Badge>
                              ) : (
                                <Badge 
                                  variant="destructive"
                                  className="h-4 px-1 text-[10px] font-bold flex-shrink-0"
                                  data-testid={`badge-insider-${stock.ticker}`}
                                >
                                  {insiderTag.text}
                                </Badge>
                              )
                            )}
                            {/* AI Score (next to B/S badge) */}
                            {stock.aiScore != null && !isProcessing && (
                              <span className="text-[10px] text-muted-foreground font-medium flex-shrink-0">
                                {stock.aiScore}
                              </span>
                            )}
                            <span className="font-mono font-medium">
                              {stock.ticker}
                            </span>
                            {isProcessing && (
                              <Loader2 className="h-3 w-3 text-muted-foreground animate-spin flex-shrink-0" />
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 ml-auto flex-shrink-0">
                            <span className="text-xs font-mono text-muted-foreground">
                              ${parseFloat(stock.currentPrice).toFixed(2)}
                            </span>
                            {/* Act/hold badge (right of price) */}
                            {actionTag && !isProcessing && (
                              <Badge 
                                variant={actionTag.variant} 
                                className="h-4 px-1.5 text-[10px]"
                                data-testid={`badge-action-${stock.ticker}`}
                              >
                                {actionTag.text}
                              </Badge>
                            )}
                          </div>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  );
                };
                
                return (
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
                          {/* ACT stocks first (strong signals - AI agrees with insider) */}
                          {actStocks.map(renderStockItem)}
                          
                          {/* HOLD stocks - either individual or grouped (weak signals - AI conflicts with insider) */}
                          {holdStocks.length > 0 && (
                            shouldGroupHoldStocks ? (
                              <Collapsible className="group/hold-collapsible">
                                <SidebarMenuSubItem>
                                  <CollapsibleTrigger asChild>
                                    <SidebarMenuSubButton
                                      className="text-muted-foreground hover:text-foreground cursor-pointer"
                                      data-testid="button-toggle-hold-stocks"
                                    >
                                      <Minus className="h-3 w-3" />
                                      <span className="text-xs">HOLD ({holdStocks.length})</span>
                                      <ChevronRight className="ml-auto h-3 w-3 transition-transform group-data-[state=open]/hold-collapsible:rotate-90" />
                                    </SidebarMenuSubButton>
                                  </CollapsibleTrigger>
                                </SidebarMenuSubItem>
                                <CollapsibleContent>
                                  {holdStocks.map(renderStockItem)}
                                </CollapsibleContent>
                              </Collapsible>
                            ) : (
                              holdStocks.map(renderStockItem)
                            )
                          )}
                          
                          {/* Stocks without alignment data (missing insider or AI data) */}
                          {noAlignmentStocks.map(renderStockItem)}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                );
              })()}
              
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
