import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ShoppingCart,
  ShieldCheck,
  Lightbulb,
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
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
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
