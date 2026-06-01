import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { format } from "date-fns";
import {
  Activity,
  FileText,
  TrendingUp,
  Upload,
  ArrowRight,
  Sparkles,
  BookOpen,
  Bell,
  BarChart3,
  FlaskConical,
  Pill,
  Users,
  CalendarClock,
  Brain,
  Share2,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { SeverityBadge } from "@/components/SeverityBadge";
import { cn } from "@/lib/utils";

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
  const avgSev = total
    ? reports.reduce((s, r) => s + (SEV_SCORE[r.severity] ?? 0), 0) / total
    : 0;
  // Simple health score: high when severity is low & confidence is high
  const healthScore = total
    ? Math.max(20, Math.min(99, Math.round(95 - avgSev * 18 + (avgConfidence - 70) * 0.2)))
    : 88;

  const chartData = [...reports].reverse().map((r) => ({
    date: format(new Date(r.created_at), "MMM d"),
    severity: SEV_SCORE[r.severity] ?? 0,
  }));

  const firstName = (user?.email ?? "there").split("@")[0].split(".")[0];

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Hero welcome */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 glass-strong p-6 md:p-8">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-gradient-mesh opacity-40 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-primary-glow">
              <Sparkles className="h-3 w-3" /> Welcome back
            </p>
            <h1 className="mt-3 font-display text-3xl font-semibold capitalize tracking-tight md:text-4xl">
              Hello, <span className="text-gradient">{firstName}</span>
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground md:text-base">
              Your AI health intelligence is up to date. JARVIS is monitoring your scans,
              labs and lifestyle patterns.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button
                asChild
                size="lg"
                className="bg-gradient-hero text-primary-foreground shadow-glow hover:opacity-95"
              >
                <Link to="/dashboard/analyze">
                  <Upload className="mr-1.5 h-4 w-4" /> New analysis
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/15 bg-white/5 backdrop-blur hover:bg-white/10">
                <Link to="/dashboard/jarvis">
                  <Sparkles className="mr-1.5 h-4 w-4" /> Ask JARVIS
                </Link>
              </Button>
            </div>
          </div>

          {/* Health score ring */}
          <HealthScoreRing score={healthScore} />
        </div>
      </section>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={FileText} label="Total scans" value={loading ? "—" : String(total)} hint="All-time analyses" tint="from-primary/30" />
        <StatCard
          icon={Activity}
          label="Latest severity"
          value={lastReport ? capitalize(lastReport.severity) : "—"}
          hint={lastReport ? format(new Date(lastReport.created_at), "MMM d, yyyy") : "No reports yet"}
          tint="from-accent/30"
        />
        <StatCard
          icon={TrendingUp}
          label="Avg. confidence"
          value={total ? `${avgConfidence}%` : "—"}
          hint="Model certainty"
          tint="from-primary-glow/30"
        />
        <StatCard
          icon={ShieldCheck}
          label="Health score"
          value={`${healthScore}`}
          hint="AI-composed index"
          tint="from-success/30"
        />
      </div>

      {/* Quick access cards */}
      <section>
        <div className="mb-3 flex items-end justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold">Quick access</h2>
            <p className="text-sm text-muted-foreground">Jump into your AI workspace</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickCard icon={Upload} title="Scan Analysis" description="AI visual diagnostics" to="/dashboard/analyze" />
          <QuickCard icon={FlaskConical} title="Medical Reports" description="OCR lab insights" to="/dashboard/medical-reports" />
          <QuickCard icon={Sparkles} title="JARVIS AI" description="Personal assistant" to="/dashboard/jarvis" />
          <QuickCard icon={Activity} title="Health Timeline" description="Longitudinal view" to="/dashboard/timeline" />
          <QuickCard icon={Pill} title="Prescriptions" description="Medicine intelligence" to="/dashboard/prescriptions" />
          <QuickCard icon={Users} title="Family Profiles" description="Whole-household care" to="/dashboard/family" />
          <QuickCard icon={CalendarClock} title="Appointments" description="Specialist bookings" to="/dashboard/appointments" />
          <QuickCard icon={Share2} title="Doctor Share" description="Export PDF summary" to="/dashboard/share" />
        </div>
      </section>

      {/* Trend chart */}
      <section className="rounded-3xl border border-white/10 glass p-5 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold">Severity trend</h2>
            <p className="text-sm text-muted-foreground">0 Normal · 1 Mild · 2 Moderate · 3 Severe</p>
          </div>
          <Brain className="h-5 w-5 text-primary-glow" />
        </div>
        <div className="mt-5 h-64 w-full">
          {chartData.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 16, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="sevGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.72 0.18 220)" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="oklch(0.6 0.22 260)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 6" stroke="oklch(1 0 0 / 0.06)" />
                <XAxis dataKey="date" stroke="oklch(0.72 0.025 250)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="oklch(0.72 0.025 250)" fontSize={11} domain={[0, 3]} ticks={[0, 1, 2, 3]} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.22 0.04 256 / 0.95)",
                    border: "1px solid oklch(1 0 0 / 0.1)",
                    borderRadius: "0.875rem",
                    fontSize: "0.85rem",
                    backdropFilter: "blur(10px)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="severity"
                  stroke="oklch(0.72 0.18 220)"
                  strokeWidth={2.5}
                  fill="url(#sevGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      {/* Recent reports */}
      <section className="rounded-3xl border border-white/10 glass p-5 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold">Recent scans</h2>
            <p className="text-sm text-muted-foreground">Your latest AI analyses</p>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard/reports">
              View all <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
        <div className="mt-4 space-y-1.5">
          {loading && (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
          )}
          {!loading && reports.length === 0 && (
            <div className="py-12 text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-hero shadow-glow">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <p className="mt-4 font-display font-medium">No scans yet</p>
              <p className="text-sm text-muted-foreground">Run your first analysis to get started.</p>
              <Button asChild className="mt-4 bg-gradient-hero text-primary-foreground hover:opacity-95">
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
                className="flex items-center justify-between gap-4 rounded-xl border border-transparent px-3 py-3 transition-all hover:border-white/10 hover:bg-white/5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary-glow">
                    <Activity className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{r.condition}</p>
                    <p className="text-xs text-muted-foreground">
                      {capitalize(r.region)} · {format(new Date(r.created_at), "MMM d · HH:mm")}
                    </p>
                  </div>
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
      </section>

      <p className="pt-2 text-center text-[11px] text-muted-foreground/70">
        AI-assisted insights only — not a medical diagnosis. Always consult a healthcare professional.
      </p>
    </div>
  );
}

function HealthScoreRing({ score }: { score: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const dash = (score / 100) * c;
  return (
    <div className="relative grid h-36 w-36 place-items-center justify-self-start md:justify-self-end">
      <svg width="144" height="144" viewBox="0 0 144 144" className="-rotate-90">
        <defs>
          <linearGradient id="ringGrad" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.6 0.22 260)" />
            <stop offset="50%" stopColor="oklch(0.72 0.18 220)" />
            <stop offset="100%" stopColor="oklch(0.62 0.22 295)" />
          </linearGradient>
        </defs>
        <circle cx="72" cy="72" r={r} stroke="oklch(1 0 0 / 0.08)" strokeWidth="10" fill="none" />
        <circle
          cx="72"
          cy="72"
          r={r}
          stroke="url(#ringGrad)"
          strokeWidth="10"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          style={{ transition: "stroke-dasharray 0.8s ease" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <p className="font-display text-3xl font-semibold">{score}</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Health score</p>
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
  tint,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  hint: string;
  tint?: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/10 glass p-5 hover-lift">
      <div className={cn("absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br blur-2xl opacity-60", tint ?? "from-primary/20")} />
      <div className="relative flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/5 text-primary-glow ring-1 ring-white/10">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="relative mt-3 font-display text-2xl font-semibold">{value}</p>
      <p className="relative mt-1 text-xs text-muted-foreground">{hint}</p>
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
      className="group relative overflow-hidden rounded-2xl border border-white/10 glass p-4 hover-lift"
    >
      <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary-glow/50 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-primary/30 to-accent/30 text-white ring-1 ring-white/10 transition-transform group-hover:scale-110">
        <Icon className="h-4.5 w-4.5" />
      </div>
      <h3 className="font-display text-sm font-semibold">{title}</h3>
      <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      <ArrowRight className="absolute bottom-4 right-4 h-4 w-4 text-muted-foreground/40 transition-all group-hover:translate-x-0.5 group-hover:text-primary-glow" />
    </Link>
  );
}
