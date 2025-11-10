import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  TrendingUp,
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
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useNewStocksCount } from "@/hooks/use-new-stocks-count";
import { useUser } from "@/contexts/UserContext";

const menuItems = [
  {
    title: "Portfolio",
    url: "/",
    icon: LayoutDashboard,
    testId: "link-portfolio",
    subItems: [
      { title: "Overview", url: "/?tab=overview", testId: "link-portfolio-overview" },
      { title: "Management", url: "/?tab=management", testId: "link-portfolio-management" },
      { title: "History", url: "/?tab=history", testId: "link-portfolio-history" },
    ],
  },
  {
    title: "Recommendations",
    url: "/recommendations",
    icon: ShoppingCart,
    testId: "link-recommendations",
  },
  {
    title: "Trading",
    url: "/trading",
    icon: LineChart,
    testId: "link-trading",
    subItems: [
      { title: "Trading Rules", url: "/trading?tab=rules", testId: "link-trading-rules" },
      { title: "Backtesting", url: "/trading?tab=simulation", testId: "link-trading-backtesting" },
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
  const [location] = useLocation();
  const newStocksCount = useNewStocksCount();
  const { user } = useUser();
  const { setOpenMobile, isMobile, state } = useSidebar();

  const handleNavClick = () => {
    // Close sidebar on mobile after navigation
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const isCollapsed = state === "collapsed";
  
  // Get current path and query params for active state detection
  const currentPath = location;
  const currentParams = new URLSearchParams(window.location.search);
  const currentTab = currentParams.get('tab');

  return (
    <Sidebar>
      <SidebarHeader className="p-6">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary">
            <TrendingUp className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">TradePro</h1>
            <p className="text-xs text-muted-foreground">Trading Dashboard</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                // Check if current page matches this menu item
                const isPageActive = currentPath === item.url;
                const showBadge = item.url === "/recommendations" && newStocksCount > 0;
                
                // If item has sub-items, render as collapsible
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
                            <item.icon className="h-4 w-4" />
                            <span>{item.title}</span>
                            <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {item.subItems.map((subItem) => {
                              // Extract tab param from subItem URL
                              const subItemTab = new URLSearchParams(subItem.url.split('?')[1] || '').get('tab');
                              const isSubItemActive = isPageActive && currentTab === subItemTab;
                              
                              return (
                                <SidebarMenuSubItem key={subItem.title}>
                                  <SidebarMenuSubButton
                                    asChild
                                    isActive={isSubItemActive}
                                    data-testid={subItem.testId}
                                  >
                                    <Link href={subItem.url} onClick={handleNavClick}>
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
                  );
                }
                
                // Regular menu item without sub-items
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
                            data-testid="badge-new-stocks"
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
    </Sidebar>
  );
}
