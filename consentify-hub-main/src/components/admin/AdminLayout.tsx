import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  ClipboardCheck,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogIn,
  LogOut,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { BrandButton } from "@/components/portal/BrandButton";
import { adminLogout } from "@/lib/admin-api";
import { getAdminInitials, getAdminSession } from "@/lib/admin-store";

const nav = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard, exact: true },
  { title: "Customers", url: "/admin/customers", icon: Users },
  { title: "Responses", url: "/admin/responses", icon: ClipboardList },
  { title: "Consent Reports", url: "/admin/consent-reports", icon: ClipboardCheck },
  { title: "Login History", url: "/admin/logins", icon: LogIn },
  { title: "Audit Logs", url: "/admin/audit", icon: FileText },
  { title: "Settings", url: "/admin/settings", icon: Settings },
];

export function AdminLayout({ title, children }: { title: string; children: ReactNode }) {
  const navigate = useNavigate();
  const adminEmail = getAdminSession().admin?.email;

  const handleLogout = () => {
    adminLogout();
    navigate({ to: "/admin/login" });
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-slate-50">
        <AdminSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur">
            <SidebarTrigger />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-foreground">{title}</div>
              <div className="text-[11px] text-muted-foreground">Admin Console</div>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <Link to="/" className="text-xs font-medium text-muted-foreground hover:text-foreground">
                View customer portal
              </Link>
              <div className="hidden text-xs text-muted-foreground sm:block">{adminEmail}</div>
              <div className="grid h-8 w-8 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {getAdminInitials(adminEmail)}
              </div>
              <BrandButton variant="outline" onClick={handleLogout} className="h-9 px-3 text-xs">
                <LogOut className="h-3.5 w-3.5" />
                Logout
              </BrandButton>
            </div>
          </header>
          <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AdminSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (url: string, exact?: boolean) =>
    exact ? pathname === url : pathname === url || pathname.startsWith(url + "/");

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="flex items-center gap-2 px-3 py-4">
          <img 
            src="/ohctech-logo.png" 
            alt="OHCTECH" 
            className="h-8 w-auto object-contain shrink-0" 
          />
          <div className="min-w-0 leading-tight group-data-[collapsible=icon]:hidden border-l border-slate-200 pl-2 ml-1">
            <div className="truncate text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Admin Console
            </div>
          </div>
        </div>
        <SidebarGroup>
          <SidebarGroupLabel>Operations</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {nav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url, item.exact)}>
                    <Link to={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Insights</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link to="/admin/consent-reports" className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    <span>Analytics</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

export function StatCard({
  label,
  value,
  delta,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  delta?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "default" | "positive" | "warning";
}) {
  const toneCls =
    tone === "positive"
      ? "text-emerald-600 bg-emerald-50"
      : tone === "warning"
        ? "text-amber-600 bg-amber-50"
        : "text-primary bg-primary/10";
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-medium text-muted-foreground">{label}</div>
          <div className="mt-1 text-2xl font-bold tracking-tight text-foreground">{value}</div>
          {delta && <div className="mt-1 text-xs text-emerald-600">{delta}</div>}
        </div>
        <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${toneCls}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
