import { useEffect, useState, type ReactNode } from "react";
import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Upload,
  FileText,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/dashboard/analyze", label: "New Analysis", icon: Upload },
  { to: "/dashboard/reports", label: "Reports", icon: FileText },
];

export function DashboardLayout({ children }: { children?: ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { location } = useRouterState();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/login" });
    }
  }, [loading, user, navigate]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  if (loading || !user) {
    return (
      <div className="grid min-h-screen place-items-center bg-gradient-subtle">
        <div className="flex items-center gap-3 text-muted-foreground">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Loading…
        </div>
      </div>
    );
  }

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  const SidebarContent = () => (
    <div className="flex h-full flex-col gap-2 p-4">
      <div className="px-2 pb-4 pt-1">
        <Link to="/dashboard">
          <Logo />
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        {navItems.map((item) => {
          const active =
            item.to === "/dashboard"
              ? location.pathname === "/dashboard"
              : location.pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
              )}
            >
              <item.icon className={cn("h-4 w-4 transition-colors", active && "text-primary")} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-sidebar-border pt-3">
        <div className="mb-2 px-3 py-1">
          <p className="truncate text-xs text-sidebar-foreground/60">Signed in as</p>
          <p className="truncate text-sm font-medium text-sidebar-foreground">{user.email}</p>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-sidebar-foreground/80 hover:text-sidebar-foreground"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="flex min-h-screen w-full">
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-sidebar-border bg-sidebar md:block">
          <SidebarContent />
        </aside>

        {/* Mobile sidebar */}
        {mobileOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div
              className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <aside className="absolute left-0 top-0 h-full w-72 bg-sidebar shadow-lg">
              <SidebarContent />
            </aside>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top bar (mobile) */}
          <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/80 px-4 py-3 backdrop-blur md:hidden">
            <Logo />
            <Button variant="ghost" size="icon" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </header>

          <main className="flex-1 px-4 py-6 md:px-8 md:py-10">
            {children ?? <Outlet />}
          </main>
        </div>
      </div>
    </div>
  );
}
