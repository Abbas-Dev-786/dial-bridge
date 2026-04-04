import { Outlet, useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList,
  BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

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
  const segments = location.pathname.split("/").filter(Boolean);

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
                    <BreadcrumbItem key={seg}>
                      {i > 0 && <BreadcrumbSeparator />}
                      {isLast ? (
                        <BreadcrumbPage>{label}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink href={`/${segments.slice(0, i + 1).join("/")}`}>
                          {label}
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                  );
                })}
              </BreadcrumbList>
            </Breadcrumb>

            <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
              <ThemeToggle />
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-4 w-4" />
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />
              </Button>
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-medium">JD</AvatarFallback>
              </Avatar>
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
