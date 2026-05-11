import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { format } from "date-fns";
import { Activity, FileText, TrendingUp, Upload, ArrowRight, Sparkles, BookOpen, Bell, BarChart3, FlaskConical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { SeverityBadge } from "@/components/SeverityBadge";

export const Route = createFileRoute("/dashboard/")({
  head: () => ({ meta: [{ title: "Dashboard — SkinScope AI" }] }),
  component: DashboardOverview,
});

interface ReportRow {
  id: string;
  region: string;
  condition: string;
  severity: string;
  confidence: number;
  created_at: string;
  trend: string | null;
}

const SEV_SCORE: Record<string, number> = { none: 0, mild: 1, moderate: 2, severe: 3 };

function DashboardOverview() {
  const { user } = useAuth();
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("id, region, condition, severity, confidence, created_at, trend")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (!error && data) setReports(data as ReportRow[]);
      setLoading(false);
    })();
  }, [user]);

  const total = reports.length;
  const lastReport = reports[0];
  const avgConfidence =
    total > 0 ? Math.round(reports.reduce((s, r) => s + Number(r.confidence), 0) / total) : 0;

  const chartData = [...reports].reverse().map((r) => ({
    date: format(new Date(r.created_at), "MMM d"),
    severity: SEV_SCORE[r.severity] ?? 0,
    condition: r.condition,
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Welcome back</p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight md:text-4xl">
            Your wellness dashboard
          </h1>
          <p className="mt-1.5 text-muted-foreground">
            Track changes across your skin, eyes, and palms over time.
          </p>
        </div>
        <Button
          asChild
          size="lg"
          className="bg-gradient-hero text-primary-foreground shadow-elegant hover:opacity-95"
        >
          <Link to="/dashboard/analyze">
            <Upload className="mr-1.5 h-4 w-4" /> New analysis
          </Link>
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={FileText}
          label="Total reports"
          value={loading ? "—" : String(total)}
          hint="All-time analyses"
        />
        <StatCard
          icon={Activity}
          label="Latest severity"
          value={lastReport ? capitalize(lastReport.severity) : "—"}
          hint={
            lastReport ? format(new Date(lastReport.created_at), "MMM d, yyyy") : "No reports yet"
          }
        />
        <StatCard
          icon={TrendingUp}
          label="Avg. confidence"
          value={total ? `${avgConfidence}%` : "—"}
          hint="Across recent reports"
        />
      </div>

      {/* Quick access cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <QuickCard
          icon={BookOpen}
          title="Symptom Diary"
          description="Log daily symptoms, products & triggers"
          to="/dashboard/diary"
        />
        <QuickCard
          icon={Bell}
          title="Reminders"
          description="Schedule follow-up scan reminders"
          to="/dashboard/reminders"
        />
        <QuickCard
          icon={BarChart3}
          title="Insights"
          description="Spot patterns from your diary data"
          to="/dashboard/insights"
        />
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-elegant md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold">Severity trend</h2>
            <p className="text-sm text-muted-foreground">
              0 = Normal · 1 = Mild · 2 = Moderate · 3 = Severe
            </p>
          </div>
        </div>
        <div className="mt-5 h-64 w-full">
          {chartData.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 16, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="sevGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="oklch(0.56 0.13 200)" />
                    <stop offset="100%" stopColor="oklch(0.72 0.14 195)" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.012 220)" />
                <XAxis dataKey="date" stroke="oklch(0.50 0.025 230)" fontSize={12} />
                <YAxis
                  stroke="oklch(0.50 0.025 230)"
                  fontSize={12}
                  domain={[0, 3]}
                  ticks={[0, 1, 2, 3]}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "0.75rem",
                    fontSize: "0.85rem",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="severity"
                  stroke="url(#sevGrad)"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "oklch(0.56 0.13 200)" }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent reports */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-elegant md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold">Recent reports</h2>
            <p className="text-sm text-muted-foreground">Your latest analyses</p>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard/reports">
              View all <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
        <div className="mt-4 divide-y divide-border">
          {loading && (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
          )}
          {!loading && reports.length === 0 && (
            <div className="py-12 text-center">
              <Sparkles className="mx-auto h-8 w-8 text-primary/60" />
              <p className="mt-3 font-medium">No reports yet</p>
              <p className="text-sm text-muted-foreground">
                Run your first analysis to get started.
              </p>
              <Button
                asChild
                className="mt-4 bg-gradient-hero text-primary-foreground hover:opacity-95"
              >
                <Link to="/dashboard/analyze">Start analysis</Link>
              </Button>
            </div>
          )}
          {!loading &&
            reports.slice(0, 5).map((r) => (
              <Link
                key={r.id}
                to="/dashboard/reports/$reportId"
                params={{ reportId: r.id }}
                className="flex items-center justify-between gap-4 py-3 transition-colors hover:bg-muted/40 -mx-2 px-2 rounded-lg"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{r.condition}</p>
                  <p className="text-xs text-muted-foreground">
                    {capitalize(r.region)} · {format(new Date(r.created_at), "MMM d, yyyy · HH:mm")}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="hidden text-xs text-muted-foreground sm:inline">
                    {Math.round(Number(r.confidence))}%
                  </span>
                  <SeverityBadge severity={r.severity} />
                </div>
              </Link>
            ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-gradient-card p-5 shadow-elegant">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-3 font-display text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <TrendingUp className="h-8 w-8 text-muted-foreground/50" />
      <p className="mt-2 text-sm text-muted-foreground">Trend appears after your first analysis.</p>
    </div>
  );
}

function capitalize(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
}

function QuickCard({
  icon: Icon,
  title,
  description,
  to,
}: {
  icon: typeof Activity;
  title: string;
  description: string;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="group rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:border-primary/30 hover:shadow-elegant"
    >
      <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
        <Icon className="h-4.5 w-4.5" />
      </div>
      <h3 className="font-display text-sm font-semibold">{title}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </Link>
  );
}
