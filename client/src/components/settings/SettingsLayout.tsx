import { Outlet } from "react-router-dom";
import { NavLink } from "@/components/shared/NavLink";
import { 
  Settings, 
  Users, 
  CreditCard, 
  Key, 
  Bell, 
  ScrollText 
} from "lucide-react";

const navItems = [
  { title: "General", url: "/settings", icon: Settings },
  { title: "Team", url: "/settings/team", icon: Users },
];

export function SettingsLayout() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Workspace Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your workspace preferences, team members, and enterprise configuration.
        </p>
      </div>

      <div className="flex items-center border-b overflow-x-auto no-scrollbar">
        <div className="flex gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.url}
              to={item.url}
              end={item.url === "/settings"}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground border-b-2 border-transparent transition-all hover:text-foreground hover:bg-muted/50"
              activeClassName="text-primary border-primary bg-primary/5"
            >
              <item.icon className="h-4 w-4" />
              {item.title}
            </NavLink>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <Outlet />
      </div>
    </div>
  );
}
