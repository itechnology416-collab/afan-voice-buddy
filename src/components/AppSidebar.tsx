import { Home, Mic, Volume2, History, Settings, Languages, LogIn, LogOut, User as UserIcon } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const items = [
  { title: "Home", url: "/", icon: Home },
  { title: "Speech to Text", url: "/speech-to-text", icon: Mic },
  { title: "Text to Speech", url: "/text-to-speech", icon: Volume2 },
  { title: "Translate", url: "/translate", icon: Languages },
  { title: "History", url: "/history", icon: History },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const { user, signOut } = useAuth();
  const isActive = (path: string) =>
    path === "/" ? pathname === "/" : pathname.startsWith(path);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-3 py-4">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-soft shrink-0">
            <Volume2 className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="leading-tight">
              <p className="text-sm font-bold text-sidebar-foreground">Afaan Oromo</p>
              <p className="text-xs text-muted-foreground">Natural Voice</p>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-3 border-t border-sidebar-border">
        {user ? (
          <div className="space-y-2">
            {!collapsed && (
              <div className="flex items-center gap-2 px-1 text-xs text-sidebar-foreground/80">
                <UserIcon className="w-3.5 h-3.5" />
                <span className="truncate">{user.email}</span>
              </div>
            )}
            <Button variant="ghost" size="sm" onClick={signOut} className="w-full justify-start">
              <LogOut className="w-4 h-4" />
              {!collapsed && <span className="ml-2">Sign out</span>}
            </Button>
          </div>
        ) : (
          <Button asChild variant="default" size="sm" className="w-full justify-start">
            <NavLink to="/auth">
              <LogIn className="w-4 h-4" />
              {!collapsed && <span className="ml-2">Sign in</span>}
            </NavLink>
          </Button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
