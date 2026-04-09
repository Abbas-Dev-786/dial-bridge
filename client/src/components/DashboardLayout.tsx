import { Outlet, useLocation, useNavigate, Link } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { Bell, LogOut, User, Settings, ShieldAlert, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList,
  BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/store/useAuthStore";
import { useAuditLogsQuery } from "@/hooks/api/useSettings";
import { formatDistanceToNow } from "date-fns";

const routeLabels: Record<string, string> = {
  dashboard: "Dashboard",
  analytics: "Analytics",
  agents: "Agents",
  campaigns: "Campaigns",
  calls: "Call Logs",
  "phone-numbers": "Phone Numbers",
  knowledge: "Knowledge Base",
  integrations: "Integrations",
  settings: "Settings",
  new: "Create New",
  team: "Team",
  billing: "Billing",
  api: "API Keys",
  notifications: "Notifications",
  webhooks: "Webhooks",
  playground: "Playground",
};

export function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const segments = location.pathname.split("/").filter(Boolean);
  const { user, logout } = useAuthStore();
  
  // Fetch recent audit logs for notification menu
  const { data: auditLogs } = useAuditLogsQuery({ page_size: 5 });
  const recentLogs = auditLogs?.items || [];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const getUserInitials = (name?: string) => {
    if (!name) return "JD";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar */}
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/90 px-3 sm:px-4 backdrop-blur-sm">
            <SidebarTrigger />

            <Breadcrumb className="hidden md:flex">
              <BreadcrumbList>
                {segments.map((seg, i) => {
                  const isLast = i === segments.length - 1;
                  const label = routeLabels[seg] || seg;
                  return (
                    <div key={seg} className="flex items-center">
                      <BreadcrumbItem>
                        {isLast ? (
                          <BreadcrumbPage>{label}</BreadcrumbPage>
                        ) : (
                          <BreadcrumbLink href={`/${segments.slice(0, i + 1).join("/")}`}>
                            {label}
                          </BreadcrumbLink>
                        )}
                      </BreadcrumbItem>
                      {!isLast && <BreadcrumbSeparator className="mx-2" />}
                    </div>
                  );
                })}
              </BreadcrumbList>
            </Breadcrumb>

            <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
              <ThemeToggle />
              
              {/* Notifications Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-4 w-4" />
                    {recentLogs.length > 0 && (
                      <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary animate-pulse" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[320px] p-0">
                  <DropdownMenuLabel className="p-4 font-semibold border-b">
                    Recent Activity
                  </DropdownMenuLabel>
                  <div className="max-h-[300px] overflow-y-auto">
                    {recentLogs.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground">
                        <Bell className="h-8 w-8 mx-auto mb-2 opacity-20" />
                        <p className="text-xs">No recent notifications</p>
                      </div>
                    ) : (
                      recentLogs.map((log: any) => (
                        <div key={log.id} className="p-4 border-b last:border-0 hover:bg-muted/50 transition-colors cursor-default">
                          <div className="flex items-start gap-3">
                            <div className="mt-1 h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <History className="h-3 w-3 text-primary" />
                            </div>
                            <div className="space-y-1">
                              <p className="text-[11px] font-medium leading-tight">
                                <span className="capitalize">{log.resource_type.replace('_', ' ')}</span> {log.action.replace('_', ' ')}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <DropdownMenuSeparator />
                  <Link to="/audit-logs">
                    <DropdownMenuItem className="p-3 text-center justify-center text-xs font-medium text-primary cursor-pointer">
                      View all activity
                    </DropdownMenuItem>
                  </Link>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* User Menu Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Avatar className="h-8 w-8 cursor-pointer ring-offset-background transition-all hover:ring-2 hover:ring-primary/20">
                    {user?.avatar_url && <AvatarImage src={user.avatar_url} />}
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs font-medium">
                      {getUserInitials(user?.full_name)}
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user?.full_name || "User"}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user?.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <Link to="/settings">
                    <DropdownMenuItem className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </DropdownMenuItem>
                  </Link>
                  <Link to="/settings">
                    <DropdownMenuItem className="cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </DropdownMenuItem>
                  </Link>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 overflow-auto">
            <div className="mx-auto max-w-[1280px] p-4 sm:p-6 lg:p-8">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
