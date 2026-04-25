import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { FileText, Plus, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { SeverityBadge } from "@/components/SeverityBadge";

export const Route = createFileRoute("/dashboard/reports/")({
  head: () => ({ meta: [{ title: "Reports — SkinScope AI" }] }),
  component: ReportsList,
});

interface Row {
  id: string;
  region: string;
  condition: string;
  severity: string;
  confidence: number;
  created_at: string;
}

function ReportsList() {
  const { user } = useAuth();
  const [reports, setReports] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("id, region, condition, severity, confidence, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (!error && data) setReports(data as Row[]);
      setLoading(false);
    })();
  }, [user]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Reports</p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight md:text-4xl">
            Your full history
          </h1>
          <p className="mt-1.5 text-muted-foreground">All analyses, ordered by date.</p>
        </div>
        <Button
          asChild
          className="bg-gradient-hero text-primary-foreground shadow-elegant hover:opacity-95"
        >
          <Link to="/dashboard/analyze">
            <Plus className="mr-1.5 h-4 w-4" /> New analysis
          </Link>
        </Button>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-elegant">
        {loading ? (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">Loading…</div>
        ) : reports.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <p className="mt-3 font-medium">No reports yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Run your first analysis to get started.
            </p>
            <Button
              asChild
              className="mt-4 bg-gradient-hero text-primary-foreground hover:opacity-95"
            >
              <Link to="/dashboard/analyze">Start analysis</Link>
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {reports.map((r) => (
              <li key={r.id}>
                <Link
                  to="/dashboard/reports/$reportId"
                  params={{ reportId: r.id }}
                  className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-muted/40"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{r.condition}</p>
                      <p className="text-xs text-muted-foreground">
                        {capitalize(r.region)} ·{" "}
                        {format(new Date(r.created_at), "MMM d, yyyy · HH:mm")}
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
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="pt-2 text-center text-xs text-muted-foreground">
        Crafted by <span className="font-medium text-foreground/80">Steven Tm</span>
      </p>
    </div>
  );
}

function capitalize(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
}
