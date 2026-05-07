import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BarChart3, Flame, Package, TrendingUp, Sparkles, AlertTriangle } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/dashboard/insights")({
  head: () => ({ meta: [{ title: "Trigger Insights — SkinScope AI" }] }),
  component: InsightsPage,
});

interface DiaryEntry {
  id: string;
  entry_date: string;
  itch: number;
  pain: number;
  redness: number;
  dryness: number;
  irritation: number;
  swelling: number;
  products_used: string[];
  triggers: string[];
}

const SYMPTOM_KEYS = ["itch", "pain", "redness", "dryness", "irritation", "swelling"] as const;

function InsightsPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from("symptom_diary")
        .select("id, entry_date, itch, pain, redness, dryness, irritation, swelling, products_used, triggers")
        .eq("user_id", user.id)
        .order("entry_date", { ascending: true })
        .limit(100);
      if (!error && data) setEntries(data as unknown as DiaryEntry[]);
      setLoading(false);
    })();
  }, [user]);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl py-20 text-center text-sm text-muted-foreground">
        Loading insights…
      </div>
    );
  }

  if (entries.length < 2) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <p className="text-sm font-medium text-primary">Trigger insights</p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
            Patterns & trends
          </h1>
        </div>
        <div className="rounded-2xl border border-border bg-card px-5 py-14 text-center shadow-elegant">
          <Sparkles className="mx-auto h-8 w-8 text-primary/60" />
          <p className="mt-3 font-medium">Not enough data yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Log at least 2 diary entries to start seeing patterns and trends.
          </p>
        </div>
      </div>
    );
  }

  // Compute trigger frequency
  const triggerCounts: Record<string, number> = {};
  const productCounts: Record<string, number> = {};
  entries.forEach((e) => {
    e.triggers.forEach((t) => {
      triggerCounts[t] = (triggerCounts[t] || 0) + 1;
    });
    e.products_used.forEach((p) => {
      productCounts[p] = (productCounts[p] || 0) + 1;
    });
  });

  const topTriggers = Object.entries(triggerCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6);
  const topProducts = Object.entries(productCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6);

  // Symptom trend chart data
  const chartData = entries.slice(-14).map((e) => ({
    date: format(new Date(e.entry_date + "T00:00:00"), "MMM d"),
    itch: e.itch,
    pain: e.pain,
    redness: e.redness,
    dryness: e.dryness,
    irritation: e.irritation,
    swelling: e.swelling,
  }));

  // Average severity trend
  const avgRecent = entries.slice(-5).reduce((sum, e) => {
    return sum + SYMPTOM_KEYS.reduce((s, k) => s + e[k], 0) / SYMPTOM_KEYS.length;
  }, 0) / Math.min(5, entries.length);
  const avgOlder = entries.slice(0, -5).length > 0
    ? entries.slice(0, -5).reduce((sum, e) => {
        return sum + SYMPTOM_KEYS.reduce((s, k) => s + e[k], 0) / SYMPTOM_KEYS.length;
      }, 0) / entries.slice(0, -5).length
    : avgRecent;
  const trendDir = avgRecent < avgOlder - 0.5 ? "improving" : avgRecent > avgOlder + 0.5 ? "worsening" : "stable";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <p className="text-sm font-medium text-primary">Trigger insights</p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
          Patterns & trends
        </h1>
        <p className="mt-1.5 text-muted-foreground">
          Based on {entries.length} diary entries — spot what's helping and what's not.
        </p>
      </div>

      {/* Trend summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={BarChart3}
          label="Total entries"
          value={String(entries.length)}
        />
        <StatCard
          icon={TrendingUp}
          label="Symptom trend"
          value={trendDir.charAt(0).toUpperCase() + trendDir.slice(1)}
        />
        <StatCard
          icon={Flame}
          label="Top trigger"
          value={topTriggers.length > 0 ? topTriggers[0][0] : "None logged"}
        />
      </div>

      {/* Symptom trend chart */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-elegant md:p-6">
        <h2 className="mb-1 font-display text-lg font-semibold">Symptom levels over time</h2>
        <p className="mb-4 text-xs text-muted-foreground">Last 14 entries</p>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.012 220)" />
              <XAxis dataKey="date" fontSize={11} stroke="oklch(0.50 0.025 230)" />
              <YAxis domain={[0, 10]} fontSize={11} stroke="oklch(0.50 0.025 230)" />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "0.75rem",
                  fontSize: "0.8rem",
                }}
              />
              <Bar dataKey="itch" fill="oklch(0.70 0.15 55)" radius={[2, 2, 0, 0]} />
              <Bar dataKey="pain" fill="oklch(0.58 0.22 25)" radius={[2, 2, 0, 0]} />
              <Bar dataKey="redness" fill="oklch(0.65 0.20 15)" radius={[2, 2, 0, 0]} />
              <Bar dataKey="dryness" fill="oklch(0.78 0.15 75)" radius={[2, 2, 0, 0]} />
              <Bar dataKey="irritation" fill="oklch(0.68 0.18 350)" radius={[2, 2, 0, 0]} />
              <Bar dataKey="swelling" fill="oklch(0.60 0.18 300)" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top triggers & products */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-elegant">
          <div className="mb-3 flex items-center gap-2">
            <Flame className="h-4 w-4 text-rose-500" />
            <h2 className="font-display text-base font-semibold">Common triggers</h2>
          </div>
          {topTriggers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No triggers logged yet.</p>
          ) : (
            <div className="space-y-2">
              {topTriggers.map(([name, count]) => (
                <div key={name} className="flex items-center justify-between gap-2">
                  <span className="text-sm">{name}</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 rounded-full bg-rose-400/60" style={{ width: `${Math.min(100, (count / entries.length) * 100)}px` }} />
                    <span className="text-xs text-muted-foreground tabular-nums">{count}×</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-elegant">
          <div className="mb-3 flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            <h2 className="font-display text-base font-semibold">Frequent products</h2>
          </div>
          {topProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No products logged yet.</p>
          ) : (
            <div className="space-y-2">
              {topProducts.map(([name, count]) => (
                <div key={name} className="flex items-center justify-between gap-2">
                  <span className="text-sm">{name}</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 rounded-full bg-primary/40" style={{ width: `${Math.min(100, (count / entries.length) * 100)}px` }} />
                    <span className="text-xs text-muted-foreground tabular-nums">{count}×</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2.5 rounded-2xl border border-warning/30 bg-warning/5 p-4 text-xs">
        <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
        <p className="text-muted-foreground">
          These insights are based on your self-reported diary data and are intended for
          personal tracking only. They do not constitute medical analysis or diagnosis.
        </p>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof BarChart3; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-gradient-card p-5 shadow-elegant">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-3 font-display text-2xl font-semibold">{value}</p>
    </div>
  );
}
