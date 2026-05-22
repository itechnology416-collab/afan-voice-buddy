import { Home, Mic, Volume2, History, Settings, Languages, LogIn, LogOut, User as UserIcon, Shield, BookOpen } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const { user, signOut } = useAuth();
  const { t, lang, setLang } = useI18n();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    supabase.rpc("is_admin").then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  const items = [
    { title: t("nav.home"), url: "/", icon: Home },
    { title: t("nav.stt"), url: "/speech-to-text", icon: Mic },
    { title: t("nav.tts"), url: "/text-to-speech", icon: Volume2 },
    { title: t("nav.translate"), url: "/translate", icon: Languages },
    { title: "Knowledge", url: "/knowledge", icon: BookOpen },
    { title: t("nav.history"), url: "/history", icon: History },
    { title: t("nav.settings"), url: "/settings", icon: Settings },
  ];
  if (isAdmin) items.push({ title: t("nav.admin"), url: "/admin", icon: Shield });

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
          <SidebarGroupLabel>{t("nav.home")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
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
      <SidebarFooter className="p-3 border-t border-sidebar-border space-y-2">
        {!collapsed && (
          <Select value={lang} onValueChange={(v) => setLang(v as "en" | "om")}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="om">Afaan Oromoo</SelectItem>
            </SelectContent>
          </Select>
        )}
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
              {!collapsed && <span className="ml-2">{t("nav.signOut")}</span>}
            </Button>
          </div>
        ) : (
          <Button asChild variant="default" size="sm" className="w-full justify-start">
            <NavLink to="/auth">
              <LogIn className="w-4 h-4" />
              {!collapsed && <span className="ml-2">{t("nav.signIn")}</span>}
            </NavLink>
          </Button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
