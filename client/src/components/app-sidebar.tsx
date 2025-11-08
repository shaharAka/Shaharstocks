import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  TrendingUp,
  History,
  Settings as SettingsIcon,
  FlaskConical,
  ShoppingCart,
  LineChart,
  Cog,
  ShieldCheck,
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
} from "@/components/ui/sidebar";
import { useNewStocksCount } from "@/hooks/use-new-stocks-count";
import { useUser } from "@/contexts/UserContext";

const menuItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
    testId: "link-dashboard",
  },
  {
    title: "Purchase",
    url: "/purchase",
    icon: ShoppingCart,
    testId: "link-purchase",
  },
  {
    title: "Management",
    url: "/management",
    icon: LineChart,
    testId: "link-management",
  },
  {
    title: "Trade History",
    url: "/history",
    icon: History,
    testId: "link-history",
  },
  {
    title: "Trading Rules",
    url: "/rules",
    icon: SettingsIcon,
    testId: "link-rules",
  },
  {
    title: "Simulation",
    url: "/simulation",
    icon: FlaskConical,
    testId: "link-simulation",
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Cog,
    testId: "link-settings",
  },
];

export function AppSidebar() {
  const [location] = useLocation();
  const newStocksCount = useNewStocksCount();
  const { user } = useUser();

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
                const isActive = location === item.url;
                const showBadge = item.url === "/purchase" && newStocksCount > 0;
                
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      className={
                        isActive ? "bg-sidebar-accent" : ""
                      }
                      data-testid={item.testId}
                    >
                      <Link href={item.url}>
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
                  >
                    <Link href="/admin">
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
