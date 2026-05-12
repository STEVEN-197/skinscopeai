import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { GitCompareArrows, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const Route = createFileRoute("/dashboard/compare")({
  head: () => ({ meta: [{ title: "What Changed — SkinScope AI" }] }),
  component: ComparePage,
});

interface R {
  id: string; region: string; condition: string; severity: string; created_at: string;
  image_path: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  color_features: any;
}

const SEV: Record<string, number> = { none: 0, mild: 1, moderate: 2, severe: 3 };

function ComparePage() {
  const { user } = useAuth();
  const [a, setA] = useState<R | null>(null);
  const [b, setB] = useState<R | null>(null);
  const [aUrl, setAUrl] = useState<string | null>(null);
  const [bUrl, setBUrl] = useState<string | null>(null);
  const [region, setRegion] = useState<string>("skin");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("reports")
        .select("id,region,condition,severity,created_at,image_path,color_features")
        .eq("user_id", user.id)
        .eq("region", region)
        .order("created_at", { ascending: false })
        .limit(2);
      const arr = (data ?? []) as R[];
      const cur = arr[0] ?? null;
      const prev = arr[1] ?? null;
      setB(cur); setA(prev);
      setAUrl(prev ? (await supabase.storage.from("skin-images").createSignedUrl(prev.image_path, 600)).data?.signedUrl ?? null : null);
      setBUrl(cur ? (await supabase.storage.from("skin-images").createSignedUrl(cur.image_path, 600)).data?.signedUrl ?? null : null);
    })();
  }, [user?.id, region]);

  const diff = (k: string) => {
    if (!a || !b || !a.color_features || !b.color_features) return null;
    const av = Number(a.color_features[k] ?? 0);
    const bv = Number(b.color_features[k] ?? 0);
    return { av, bv, delta: bv - av };
  };

  const yellow = diff("yellowRatio");
  const red = diff("redRatio");
  const dark = diff("darkRatio");
  const bright = diff("brightness");

  const sevDelta = a && b ? (SEV[b.severity] ?? 0) - (SEV[a.severity] ?? 0) : 0;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-display text-3xl font-semibold tracking-tight">
            <GitCompareArrows className="h-7 w-7 text-primary" /> What Changed?
          </h1>
          <p className="mt-1 text-muted-foreground">
            Side-by-side AI comparison between your two most recent scans.
          </p>
        </div>
        <select value={region} onChange={(e) => setRegion(e.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-sm">
          <option value="skin">Skin</option>
          <option value="eye">Eye</option>
          <option value="palm">Palm</option>
        </select>
      </div>

      <Alert><AlertDescription className="text-xs">Visual delta is AI-assisted and may be affected by lighting and camera differences.</AlertDescription></Alert>

      {!a || !b ? (
        <Card><CardHeader><CardDescription>Need at least 2 {region} scans to compare. Run another analysis.</CardDescription></CardHeader></Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
            <ScanCard label="Previous" report={a} url={aUrl} />
            <ArrowRight className="hidden h-6 w-6 text-muted-foreground sm:block" />
            <ScanCard label="Current" report={b} url={bUrl} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Visual deltas</CardTitle>
              <CardDescription>From {format(new Date(a.created_at), "MMM d")} to {format(new Date(b.created_at), "MMM d")}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <DeltaRow label="Yellowing" delta={yellow?.delta} suffix="%" goodWhenNegative />
              <DeltaRow label="Redness" delta={red?.delta} suffix="%" goodWhenNegative />
              <DeltaRow label="Darkness" delta={dark?.delta} suffix="%" goodWhenNegative />
              <DeltaRow label="Brightness" delta={bright?.delta} suffix="" goodWhenNegative={false} />
              <DeltaRow label="Severity score" delta={sevDelta} suffix="" goodWhenNegative integer />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function ScanCard({ label, report, url }: { label: string; report: R; url: string | null }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label} · {format(new Date(report.created_at), "MMM d, yyyy")}</CardDescription>
        <CardTitle className="text-base">{report.condition}</CardTitle>
      </CardHeader>
      <CardContent>
        {url ? <img src={url} alt={label} className="aspect-square w-full rounded-lg object-cover" /> : <div className="aspect-square w-full rounded-lg bg-muted" />}
        <Badge className="mt-2 capitalize">{report.severity}</Badge>
      </CardContent>
    </Card>
  );
}

function DeltaRow({ label, delta, suffix, goodWhenNegative, integer }: { label: string; delta: number | undefined | null; suffix: string; goodWhenNegative: boolean; integer?: boolean }) {
  if (delta === null || delta === undefined || Number.isNaN(delta)) return null;
  const better = goodWhenNegative ? delta < 0 : delta > 0;
  const sign = delta > 0 ? "+" : "";
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm">{label}</p>
        <Badge variant={delta === 0 ? "outline" : better ? "default" : "destructive"}>
          {sign}{integer ? delta : delta.toFixed(1)}{suffix}
        </Badge>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {delta === 0 ? "No change" : better ? "Improved" : "Increased"}
      </p>
    </div>
  );
}
