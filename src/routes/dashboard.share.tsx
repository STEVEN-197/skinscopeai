import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Share2, Download, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { generateDoctorReport } from "@/lib/doctor-pdf";

export const Route = createFileRoute("/dashboard/share")({
  head: () => ({ meta: [{ title: "Share with Doctor — SkinScope AI" }] }),
  component: SharePage,
});

function SharePage() {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);

  const generate = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const [r, m, d, p, i] = await Promise.all([
        supabase.from("reports").select("region,condition,severity,confidence,created_at,observations").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
        supabase.from("medical_reports").select("report_type,summary,report_date,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
        supabase.from("symptom_diary").select("entry_date,itch,pain,redness").eq("user_id", user.id).order("entry_date", { ascending: false }).limit(14),
        supabase.from("prescriptions").select("doctor_name,prescribed_date,medicines").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
        supabase.from("health_insights").select("summary,observations").eq("user_id", user.id).order("generated_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      const doc = generateDoctorReport({
        userEmail: user.email ?? "Patient",
        scans: (r.data ?? []) as any,
        meds: (m.data ?? []) as any,
        diary: (d.data ?? []) as any,
        prescriptions: (p.data ?? []) as any,
        insight: (i.data ?? null) as any,
      });
      doc.save(`SkinScopeAI-Report-${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success("PDF ready");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 font-display text-3xl font-semibold tracking-tight">
          <Share2 className="h-7 w-7 text-primary" /> Share with Doctor
        </h1>
        <p className="mt-1 text-muted-foreground">
          Generate a doctor-friendly PDF combining your scans, lab reports, prescriptions, and symptom diary.
        </p>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="text-xs">
          The report is for discussion with your healthcare provider. It contains AI-assisted observations and is not a diagnosis.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Doctor-friendly summary</CardTitle>
          <CardDescription>Includes the latest 20 scans, 20 lab reports, recent prescriptions, AI summary, and 14 days of diary.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={generate} disabled={busy} className="bg-gradient-hero text-primary-foreground">
            {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating…</> : <><Download className="mr-2 h-4 w-4" /> Download PDF</>}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
