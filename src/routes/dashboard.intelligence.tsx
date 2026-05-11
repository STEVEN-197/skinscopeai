import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles, Loader2, AlertTriangle, TrendingUp, TrendingDown, Minus, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/intelligence")({
  component: IntelligencePage,
});

interface Insight {
  summary: string;
  observations: { title: string; detail: string; level: string }[];
  trends: { metric: string; direction: string; note: string }[];
  recommendations: { title: string; detail: string; category: string }[];
  generated_at?: string;
}

function trendIcon(d: string) {
  if (d === "improving") return <TrendingUp className="h-4 w-4 text-emerald-600" />;
  if (d === "worsening") return <TrendingDown className="h-4 w-4 text-destructive" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

function IntelligencePage() {
  const { user } = useAuth();
  const [insight, setInsight] = useState<Insight | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const loadLatest = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("health_insights")
      .select("*")
      .eq("user_id", user.id)
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) {
      setInsight({
        summary: (data as any).summary,
        observations: (data as any).observations ?? [],
        trends: (data as any).trends ?? [],
        recommendations: (data as any).recommendations ?? [],
        generated_at: (data as any).generated_at,
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    loadLatest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const generate = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-insights", { body: {} });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setInsight({
        summary: data.summary,
        observations: data.observations ?? [],
        trends: data.trends ?? [],
        recommendations: data.recommendations ?? [],
        generated_at: new Date().toISOString(),
      });
      toast.success("New insights generated");
    } catch (e: any) {
      toast.error(e.message || "Failed to generate insights");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
            <Sparkles className="h-7 w-7 text-primary" /> AI Health Intelligence
          </h1>
          <p className="mt-1 text-muted-foreground">
            Predictive observations correlating your scans, lab reports, and symptom diary.
          </p>
        </div>
        <Button onClick={generate} disabled={generating}>
          {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          {insight ? "Regenerate" : "Generate insights"}
        </Button>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="text-xs">
          AI-assisted observations only — not a medical diagnosis or prediction. Always consult a licensed healthcare professional.
        </AlertDescription>
      </Alert>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : !insight ? (
        <Card>
          <CardHeader>
            <CardTitle>No insights yet</CardTitle>
            <CardDescription>
              Click "Generate insights" once you have at least one scan, lab report, or diary entry.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader>
              <CardTitle>Summary</CardTitle>
              {insight.generated_at && (
                <CardDescription>
                  Generated {new Date(insight.generated_at).toLocaleString()}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <p className="leading-relaxed">{insight.summary}</p>
            </CardContent>
          </Card>

          {insight.observations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Multi-modal observations</CardTitle>
                <CardDescription>Patterns across scans, labs, and diary entries.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {insight.observations.map((o, i) => (
                  <div key={i} className="rounded-lg border p-3">
                    <div className="mb-1 flex items-center gap-2">
                      <Badge
                        variant={o.level === "concern" ? "destructive" : o.level === "watch" ? "secondary" : "outline"}
                      >
                        {o.level}
                      </Badge>
                      <span className="font-medium">{o.title}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{o.detail}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {insight.trends.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Trends</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {insight.trends.map((t, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-md border p-3">
                    <div className="mt-0.5">{trendIcon(t.direction)}</div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{t.metric}</div>
                      <div className="text-xs text-muted-foreground">{t.note}</div>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {t.direction}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {insight.recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Personalized recommendations</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                {insight.recommendations.map((r, i) => (
                  <div key={i} className="rounded-lg border bg-muted/30 p-3">
                    <div className="mb-1 flex items-center gap-2">
                      <Badge variant="outline" className="capitalize">
                        {r.category}
                      </Badge>
                    </div>
                    <div className="font-medium">{r.title}</div>
                    <p className="mt-1 text-sm text-muted-foreground">{r.detail}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
