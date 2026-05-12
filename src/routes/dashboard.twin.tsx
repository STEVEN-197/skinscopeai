import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Brain, Activity, Droplet, Moon, AlertTriangle, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/dashboard/twin")({
  head: () => ({ meta: [{ title: "Health Twin — SkinScope AI" }] }),
  component: TwinPage,
});

const SEV: Record<string, number> = { none: 0, mild: 1, moderate: 2, severe: 3 };

function TwinPage() {
  const { user } = useAuth();
  const [data, setData] = useState<{
    scans: number; labs: number; diary: number; lifestyle: number;
    avgSeverity: number; recentScans: any[]; topTriggers: { name: string; n: number }[];
    avgSleep: number | null; avgWater: number | null; avgStress: number | null;
  } | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [r, m, d, l] = await Promise.all([
        supabase.from("reports").select("region,condition,severity,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(30),
        supabase.from("medical_reports").select("id").eq("user_id", user.id),
        supabase.from("symptom_diary").select("triggers").eq("user_id", user.id).order("entry_date", { ascending: false }).limit(60),
        supabase.from("lifestyle_logs").select("sleep_hours,water_glasses,stress_level").eq("user_id", user.id).order("log_date", { ascending: false }).limit(14),
      ]);
      const scans = (r.data ?? []) as any[];
      const avgSev = scans.length ? scans.reduce((s, x) => s + (SEV[x.severity] ?? 0), 0) / scans.length : 0;
      const triggerCounts: Record<string, number> = {};
      ((d.data ?? []) as any[]).forEach((row) => (row.triggers ?? []).forEach((t: string) => { triggerCounts[t] = (triggerCounts[t] ?? 0) + 1; }));
      const topTriggers = Object.entries(triggerCounts).map(([name, n]) => ({ name, n })).sort((a, b) => b.n - a.n).slice(0, 5);
      const ll = (l.data ?? []) as any[];
      const avg = (k: string) => ll.length ? ll.reduce((s, x) => s + (Number(x[k]) || 0), 0) / ll.length : null;
      setData({
        scans: scans.length, labs: (m.data ?? []).length, diary: (d.data ?? []).length, lifestyle: ll.length,
        avgSeverity: avgSev, recentScans: scans.slice(0, 5), topTriggers,
        avgSleep: avg("sleep_hours"), avgWater: avg("water_glasses"), avgStress: avg("stress_level"),
      });
    })();
  }, [user?.id]);

  if (!data) return <div className="text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 font-display text-3xl font-semibold tracking-tight">
          <Brain className="h-7 w-7 text-primary" /> Digital Health Twin
        </h1>
        <p className="mt-1 text-muted-foreground">
          A living summary of patterns SkinScope AI has learned from your data.
        </p>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="text-xs">
          Pattern observations only — not a diagnosis. For clinical interpretation, consult a healthcare professional.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatBox icon={Sparkles} label="Visual scans" value={data.scans} />
        <StatBox icon={Activity} label="Lab reports" value={data.labs} />
        <StatBox icon={Brain} label="Diary entries" value={data.diary} />
        <StatBox icon={Heart14} label="Lifestyle logs" value={data.lifestyle} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recurring patterns</CardTitle>
          <CardDescription>Memory engine observations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <PatternRow label="Average severity across scans" value={data.avgSeverity.toFixed(2)} hint={data.avgSeverity > 1.5 ? "Trending in the moderate range" : "Mostly mild or normal"} />
          {data.topTriggers.length > 0 && (
            <div>
              <p className="mb-1 text-sm font-medium">Most reported triggers</p>
              <div className="flex flex-wrap gap-1.5">
                {data.topTriggers.map((t) => <Badge key={t.name} variant="secondary">{t.name} · {t.n}×</Badge>)}
              </div>
            </div>
          )}
          {data.lifestyle > 0 && (
            <div className="grid gap-2 sm:grid-cols-3">
              <Mini icon={Moon} label="Avg sleep" value={data.avgSleep ? `${data.avgSleep.toFixed(1)}h` : "—"} />
              <Mini icon={Droplet} label="Avg water" value={data.avgWater ? `${data.avgWater.toFixed(0)} glasses` : "—"} />
              <Mini icon={Activity} label="Avg stress" value={data.avgStress ? `${data.avgStress.toFixed(1)}/10` : "—"} />
            </div>
          )}
        </CardContent>
      </Card>

      {data.recentScans.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Recent visual history</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {data.recentScans.map((s, i) => (
              <div key={i} className="flex items-center justify-between rounded-md border p-2 text-sm">
                <span className="capitalize">{s.region} · {s.condition}</span>
                <Badge variant="outline" className="capitalize">{s.severity}</Badge>
                <span className="text-xs text-muted-foreground">{format(new Date(s.created_at), "MMM d")}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Heart14({ className }: { className?: string }) {
  return <Activity className={className} />;
}

function StatBox({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <div className="rounded-2xl border bg-gradient-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary"><Icon className="h-4 w-4" /></div>
      </div>
      <p className="mt-2 font-display text-2xl font-semibold">{value}</p>
    </div>
  );
}
function PatternRow({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <div className="flex items-center justify-between"><p className="text-sm">{label}</p><Badge>{value}</Badge></div>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
function Mini({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="h-3.5 w-3.5" /> {label}</div>
      <p className="mt-1 font-display text-lg font-semibold">{value}</p>
    </div>
  );
}
