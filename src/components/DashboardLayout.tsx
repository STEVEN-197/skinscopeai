import { useEffect, useState, type ReactNode } from "react";
import { Link, Navigate, Outlet, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Upload, FileText, LogOut, Menu, X, BookOpen, Bell, BarChart3, Activity, FlaskConical, Sparkles, Pill, Users, CalendarClock, Heart, Brain, GitCompareArrows, Share2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { FloatingJarvis } from "@/components/FloatingJarvis";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/dashboard/jarvis", label: "JARVIS Assistant", icon: Sparkles },
  { to: "/dashboard/analyze", label: "New Analysis", icon: Upload },
  { to: "/dashboard/reports", label: "Scan Reports", icon: FileText },
  { to: "/dashboard/medical-reports", label: "Medical Reports", icon: FlaskConical },
  { to: "/dashboard/prescriptions", label: "Prescriptions", icon: Pill },
  { to: "/dashboard/timeline", label: "Health Timeline", icon: Activity },
  { to: "/dashboard/twin", label: "Health Twin", icon: Brain },
  { to: "/dashboard/compare", label: "What Changed", icon: GitCompareArrows },
  { to: "/dashboard/intelligence", label: "AI Intelligence", icon: Sparkles },
  { to: "/dashboard/diary", label: "Symptom Diary", icon: BookOpen },
  { to: "/dashboard/lifestyle", label: "Lifestyle", icon: Heart },
  { to: "/dashboard/family", label: "Family", icon: Users },
  { to: "/dashboard/appointments", label: "Appointments", icon: CalendarClock },
  { to: "/dashboard/reminders", label: "Reminders", icon: Bell },
  { to: "/dashboard/insights", label: "Trend Insights", icon: BarChart3 },
  { to: "/dashboard/share", label: "Share with Doctor", icon: Share2 },
];

export function DashboardLayout({ children }: { children?: ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const { location } = useRouterState();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-gradient-subtle">
        <div className="flex items-center gap-3 text-muted-foreground">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Loading…
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const handleSignOut = async () => {
    await signOut();
  };

  const SidebarContent = () => (
    <div className="flex h-full flex-col gap-2 p-4">
      <div className="px-2 pb-4 pt-1">
        <Link to="/dashboard">
          <Logo />
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto pr-1">
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
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                active
                  ? "bg-gradient-to-r from-primary/20 via-primary/10 to-transparent text-foreground shadow-[inset_0_1px_0_0_oklch(1_0_0/0.08)]"
                  : "text-sidebar-foreground/65 hover:bg-white/5 hover:text-sidebar-foreground",
              )}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-primary to-primary-glow" />
              )}
              <item.icon
                className={cn(
                  "h-4 w-4 transition-colors",
                  active ? "text-primary-glow" : "group-hover:text-foreground/80",
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/5 pt-3">
        <div className="mb-2 rounded-lg bg-white/[0.03] px-3 py-2">
          <p className="truncate text-[10px] uppercase tracking-wider text-sidebar-foreground/50">
            Signed in
          </p>
          <p className="truncate text-sm font-medium text-sidebar-foreground">{user.email}</p>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-sidebar-foreground/80 hover:bg-white/5 hover:text-sidebar-foreground"
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
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-white/5 glass md:block">
          <SidebarContent />
        </aside>

        {/* Mobile sidebar */}
        {mobileOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div
              className="absolute inset-0 bg-background/70 backdrop-blur-md"
              onClick={() => setMobileOpen(false)}
            />
            <aside className="absolute left-0 top-0 h-full w-72 border-r border-white/10 glass-strong shadow-2xl animate-[scale-in_0.2s_ease-out]">
              <SidebarContent />
            </aside>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top bar (mobile) */}
          <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/5 glass px-4 py-3 md:hidden">
            <Logo />
            <Button variant="ghost" size="icon" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </header>

          <main className="flex-1 px-4 py-6 md:px-8 md:py-10 animate-[fade-in_0.4s_ease-out]">
            {children ?? <Outlet />}
          </main>
        </div>
      </div>
      <FloatingJarvis />
    </div>
  );
}

