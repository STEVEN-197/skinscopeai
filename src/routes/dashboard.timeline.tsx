import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Activity, FileText, FlaskConical, BookOpen, Loader2, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/dashboard/timeline")({
  component: TimelinePage,
});

type EventKind = "scan" | "medical" | "diary";
interface TimelineEvent {
  id: string;
  kind: EventKind;
  date: string;
  title: string;
  detail: string;
  severity?: string;
  href?: string;
}

const kindMeta: Record<EventKind, { icon: any; tone: string; label: string }> = {
  scan: { icon: FileText, tone: "bg-primary/10 text-primary", label: "Visual scan" },
  medical: { icon: FlaskConical, tone: "bg-amber-500/10 text-amber-600", label: "Lab report" },
  diary: { icon: BookOpen, tone: "bg-emerald-500/10 text-emerald-600", label: "Diary" },
};

function TimelinePage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const [scans, meds, diary] = await Promise.all([
        supabase
          .from("reports")
          .select("id, region, condition, severity, confidence, trend, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("medical_reports")
          .select("id, report_type, summary, ai_analysis, report_date, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("symptom_diary")
          .select("id, entry_date, itch, pain, redness, dryness, irritation, swelling, notes, created_at")
          .eq("user_id", user.id)
          .order("entry_date", { ascending: false })
          .limit(50),
      ]);

      const merged: TimelineEvent[] = [];
      (scans.data ?? []).forEach((s: any) =>
        merged.push({
          id: `scan-${s.id}`,
          kind: "scan",
          date: s.created_at,
          title: `${s.region} scan — ${s.condition}`,
          detail: `Severity: ${s.severity} · Confidence: ${s.confidence}% · Trend: ${s.trend ?? "–"}`,
          severity: s.severity,
          href: `/dashboard/reports/${s.id}`,
        }),
      );
      (meds.data ?? []).forEach((m: any) =>
        merged.push({
          id: `med-${m.id}`,
          kind: "medical",
          date: (m.report_date as string) || m.created_at,
          title: `${(m.report_type || "Lab").toUpperCase()} report`,
          detail: m.summary || m.ai_analysis?.plain_language || "Lab report stored",
          href: `/dashboard/medical-reports`,
        }),
      );
      (diary.data ?? []).forEach((d: any) => {
        const max = Math.max(d.itch, d.pain, d.redness, d.dryness, d.irritation, d.swelling);
        merged.push({
          id: `diary-${d.id}`,
          kind: "diary",
          date: d.entry_date,
          title: "Symptom diary entry",
          detail: `Peak symptom level: ${max}/10${d.notes ? ` · ${d.notes.slice(0, 80)}` : ""}`,
          href: `/dashboard/diary`,
        });
      });

      merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setEvents(merged);
      setLoading(false);
    })();
  }, [user?.id]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <Activity className="h-7 w-7 text-primary" /> Health Timeline
        </h1>
        <p className="mt-1 text-muted-foreground">
          A unified longitudinal view of every scan, lab report, and diary entry.
        </p>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="text-xs">
          Educational AI-assisted view. Not a medical record. For clinical decisions, consult a healthcare professional.
        </AlertDescription>
      </Alert>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading timeline…
        </div>
      ) : events.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No events yet</CardTitle>
            <CardDescription>
              Add a scan, lab report, or diary entry to start building your health timeline.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="relative space-y-4 border-l-2 border-border pl-6">
          {events.map((ev) => {
            const meta = kindMeta[ev.kind];
            const Icon = meta.icon;
            const inner = (
              <Card className="transition hover:shadow-md">
                <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <Badge variant="outline" className={meta.tone}>
                        {meta.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(ev.date).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                    <CardTitle className="text-base">{ev.title}</CardTitle>
                  </div>
                  {ev.severity && (
                    <Badge
                      variant={
                        ev.severity === "severe"
                          ? "destructive"
                          : ev.severity === "moderate"
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {ev.severity}
                    </Badge>
                  )}
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">{ev.detail}</CardContent>
              </Card>
            );
            return (
              <div key={ev.id} className="relative">
                <span className={`absolute -left-[34px] top-3 grid h-7 w-7 place-items-center rounded-full ${meta.tone}`}>
                  <Icon className="h-3.5 w-3.5" />
                </span>
                {ev.href ? <Link to={ev.href}>{inner}</Link> : inner}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
