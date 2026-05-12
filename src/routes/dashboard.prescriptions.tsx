import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Pill, Upload, Loader2, AlertTriangle, FileText } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/dashboard/prescriptions")({
  head: () => ({ meta: [{ title: "Prescriptions — SkinScope AI" }] }),
  component: PrescriptionsPage,
});

interface Medicine {
  name: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  purpose?: string;
  precautions?: string;
  side_effects?: string;
}

interface RxRow {
  id: string;
  doctor_name: string | null;
  prescribed_date: string | null;
  ai_explanation: string | null;
  raw_text: string | null;
  medicines: Medicine[];
  created_at: string;
}

function fileToDataURL(f: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = rej;
    r.readAsDataURL(f);
  });
}

function PrescriptionsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<RxRow[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("prescriptions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setRows((data ?? []) as unknown as RxRow[]);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.id]);

  const handleFile = async (f: File | null) => {
    if (!f || !user) return;
    if (!f.type.startsWith("image/")) {
      toast.error("Please upload an image of the prescription.");
      return;
    }
    setAnalyzing(true);
    try {
      const path = `${user.id}/${Date.now()}-${f.name}`;
      const { error: upErr } = await supabase.storage.from("prescriptions").upload(path, f, { contentType: f.type });
      if (upErr) throw upErr;
      const dataUrl = await fileToDataURL(f);
      const { data, error } = await supabase.functions.invoke("analyze-prescription", {
        body: { imageBase64: dataUrl },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const { error: insErr } = await supabase.from("prescriptions").insert({
        user_id: user.id,
        file_path: path,
        file_name: f.name,
        mime_type: f.type,
        raw_text: data.raw_text,
        medicines: data.medicines ?? [],
        ai_explanation: data.ai_explanation,
        doctor_name: data.doctor_name ?? null,
        prescribed_date: data.prescribed_date || null,
      });
      if (insErr) throw insErr;
      toast.success("Prescription analyzed");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setAnalyzing(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 font-display text-3xl font-semibold tracking-tight">
          <Pill className="h-7 w-7 text-primary" /> Prescriptions
        </h1>
        <p className="mt-1 text-muted-foreground">
          Upload a doctor's prescription or medicine strip. JARVIS will read it and explain each medicine.
        </p>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="text-xs">
          AI-assisted reading only. Always verify dosage and medicines with your prescribing doctor or pharmacist.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Upload prescription</CardTitle>
          <CardDescription>JPG / PNG of handwritten or printed prescription</CardDescription>
        </CardHeader>
        <CardContent>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => handleFile(e.target.files?.[0] ?? null)} />
          <Button onClick={() => fileRef.current?.click()} disabled={analyzing} className="bg-gradient-hero text-primary-foreground">
            {analyzing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing…</> : <><Upload className="mr-2 h-4 w-4" /> Upload prescription</>}
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {rows.length === 0 ? (
          <Card><CardHeader><CardTitle className="text-base">No prescriptions yet</CardTitle><CardDescription>Upload one to get started.</CardDescription></CardHeader></Card>
        ) : rows.map((r) => (
          <Card key={r.id}>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <CardTitle className="text-base">{r.doctor_name || "Prescription"}</CardTitle>
                <span className="text-xs text-muted-foreground">{format(new Date(r.created_at), "MMM d, yyyy")}</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {r.medicines?.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-semibold">Medicines</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {r.medicines.map((m, i) => (
                      <div key={i} className="rounded-lg border bg-muted/30 p-3">
                        <div className="flex items-center gap-2">
                          <Badge>{m.name}</Badge>
                          {m.dosage && <span className="text-xs text-muted-foreground">{m.dosage}</span>}
                        </div>
                        {m.frequency && <p className="mt-1 text-xs"><strong>When:</strong> {m.frequency}</p>}
                        {m.duration && <p className="text-xs"><strong>Duration:</strong> {m.duration}</p>}
                        {m.purpose && <p className="mt-1 text-xs text-muted-foreground"><strong>Purpose:</strong> {m.purpose}</p>}
                        {m.precautions && <p className="text-xs text-muted-foreground"><strong>Precautions:</strong> {m.precautions}</p>}
                        {m.side_effects && <p className="text-xs text-muted-foreground"><strong>Common side effects:</strong> {m.side_effects}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {r.ai_explanation && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                  <p className="mb-1 text-xs font-semibold text-primary">AI explanation</p>
                  <p className="text-sm">{r.ai_explanation}</p>
                </div>
              )}
              {r.raw_text && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground">Show extracted raw text</summary>
                  <pre className="mt-2 whitespace-pre-wrap rounded bg-muted p-2">{r.raw_text}</pre>
                </details>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
