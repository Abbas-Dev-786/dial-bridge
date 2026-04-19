import { useState } from "react";
import {
  LayoutDashboard,
  BarChart3,
  Megaphone,
  PhoneCall,
  Phone,
  Puzzle,
  Settings,
  Bot,
  ScrollText,
  History as HistoryIcon,
  ChevronsUpDown,
  Check,
  Plus,
} from "lucide-react";
import { NavLink } from "@/components/shared/NavLink";
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
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/useAuthStore";

const navGroups = [
  {
    label: "Main",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
      { title: "Campaigns", url: "/campaigns", icon: Megaphone },
      { title: "Analytics", url: "/analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Setup",
    items: [
      { title: "Agents", url: "/agents", icon: Bot },
      { title: "Conversations", url: "/calls", icon: PhoneCall },
      {
        title: "Phone Numbers",
        url: "/phone-numbers",
        icon: Phone,
      },
      { title: "Integrations", url: "/integrations", icon: Puzzle },
      {
        title: "Webhook Logs",
        url: "/integrations/webhooks",
        icon: ScrollText,
      },
      { title: "Audit Logs", url: "/audit-logs", icon: HistoryIcon },
    ],
  },
  {
    label: "Settings",
    items: [{ title: "Settings", url: "/settings", icon: Settings }],
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="py-2 border-b border-sidebar-border/50">
        <WorkspaceSwitcher collapsed={collapsed} />
      </SidebarHeader>

      <SidebarContent>
        {navGroups.map((group) => (
          <SidebarGroup key={group.label}>
            {!collapsed && (
              <SidebarGroupLabel className="text-[11px] uppercase tracking-wider text-muted-foreground/70 font-medium">
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        className="rounded-md transition-colors hover:bg-accent"
                        activeClassName="bg-primary/10 text-primary font-medium"
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && (
                          <span className="flex-1 flex items-center justify-between">
                            <span>{item.title}</span>
                          </span>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="p-3">
        {/* {!collapsed && (
          <div className="rounded-lg border bg-card p-3">
            <p className="text-xs font-medium text-primary">Pro Plan</p>
            <p className="text-xs text-muted-foreground">1,250 / 5,000 calls</p>
            <div className="mt-2 h-1.5 rounded-full bg-muted">
              <div className="h-full w-1/4 rounded-full bg-primary transition-all" />
            </div>
          </div>
        )} */}
      </SidebarFooter>
    </Sidebar>
  );
}

function WorkspaceSwitcher({ collapsed }: { collapsed: boolean }) {
  const { workspaces, activeWorkspaceId, setActiveWorkspaceId } =
    useWorkspaceStore();
  const [open, setOpen] = useState(false);
  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <SidebarMenuButton
          size="lg"
          className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
        >
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Phone className="size-4" />
          </div>
          {!collapsed && (
            <div className="grid flex-1 text-left text-sm leading-tight ml-2">
              <span className="truncate font-semibold">
                {activeWorkspace?.name || "Select Workspace"}
              </span>
              <span className="truncate text-xs text-muted-foreground uppercase tracking-wider font-medium">
                {activeWorkspace?.role || "Member"}
              </span>
            </div>
          )}
          {!collapsed && (
            <ChevronsUpDown className="ml-auto size-4 opacity-50" />
          )}
        </SidebarMenuButton>
      </PopoverTrigger>
      <PopoverContent
        className="w-[240px] p-0"
        align="start"
        side="bottom"
        sideOffset={4}
      >
        <Command>
          <CommandInput placeholder="Search workspaces..." />
          <CommandList>
            <CommandEmpty>No workspaces found.</CommandEmpty>
            <CommandGroup heading="Workspaces">
              {workspaces.map((workspace) => (
                <CommandItem
                  key={workspace.id}
                  onSelect={() => {
                    setActiveWorkspaceId(workspace.id);
                    setOpen(false);
                  }}
                  className="flex items-center gap-2 px-2 py-1.5"
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-md border bg-background">
                    <Phone className="h-3 w-3" />
                  </div>
                  <span className="flex-1 truncate">{workspace.name}</span>
                  {activeWorkspaceId === workspace.id && (
                    <Check className="ml-auto h-4 w-4" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
          <CommandSeparator />
          <CommandList>
            <CommandGroup>
              <CommandItem className="gap-2 px-2 py-1.5 focus:bg-primary/5 cursor-not-allowed opacity-50">
                <Plus className="h-4 w-4" />
                <span className="font-medium">Create Workspace</span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
