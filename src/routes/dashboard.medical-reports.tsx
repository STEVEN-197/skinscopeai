import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FlaskConical, Loader2, Upload, FileText, AlertTriangle, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/medical-reports")({
  component: MedicalReportsPage,
});

interface MedicalReport {
  id: string;
  source_type: string;
  report_type: string | null;
  file_name: string | null;
  summary: string | null;
  extracted_values: any;
  abnormalities: any;
  ai_analysis: any;
  report_date: string | null;
  created_at: string;
}

function MedicalReportsPage() {
  const { user } = useAuth();
  const [reports, setReports] = useState<MedicalReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // file upload state
  const [file, setFile] = useState<File | null>(null);
  const [reportType, setReportType] = useState("blood");
  const [reportDate, setReportDate] = useState("");

  // manual entry state
  const [manualText, setManualText] = useState("");

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("medical_reports")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setReports((data as any) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const fileToBase64 = (f: File) =>
    new Promise<string>((res, rej) => {
      const r = new FileReader();
      r.onload = () => {
        const s = r.result as string;
        res(s.split(",")[1]);
      };
      r.onerror = rej;
      r.readAsDataURL(f);
    });

  const handleUpload = async () => {
    if (!user || !file) {
      toast.error("Please choose a file");
      return;
    }
    setSubmitting(true);
    try {
      const path = `${user.id}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage
        .from("medical-reports")
        .upload(path, file);
      if (upErr) throw upErr;

      const base64 = await fileToBase64(file);
      const { data, error } = await supabase.functions.invoke("analyze-medical-report", {
        body: {
          mode: "file",
          fileBase64: base64,
          mimeType: file.type,
          fileName: file.name,
          reportType,
          reportDate: reportDate || null,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const { error: insErr } = await supabase.from("medical_reports").insert({
        user_id: user.id,
        source_type: "upload",
        report_type: reportType,
        file_path: path,
        file_name: file.name,
        mime_type: file.type,
        extracted_values: data.extracted_values,
        abnormalities: data.abnormalities,
        summary: data.summary,
        ai_analysis: data.ai_analysis,
        report_date: reportDate || null,
      });
      if (insErr) throw insErr;

      toast.success("Report analyzed and saved");
      setFile(null);
      setReportDate("");
      load();
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleManual = async () => {
    if (!user || !manualText.trim()) {
      toast.error("Enter some values");
      return;
    }
    setSubmitting(true);
    try {
      // parse "key: value" lines into a map
      const manualValues: Record<string, string> = {};
      manualText.split("\n").forEach((line) => {
        const [k, ...rest] = line.split(":");
        if (k && rest.length) manualValues[k.trim()] = rest.join(":").trim();
      });

      const { data, error } = await supabase.functions.invoke("analyze-medical-report", {
        body: { mode: "manual", manualValues, reportType, reportDate: reportDate || null },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const { error: insErr } = await supabase.from("medical_reports").insert({
        user_id: user.id,
        source_type: "manual",
        report_type: reportType,
        extracted_values: data.extracted_values,
        abnormalities: data.abnormalities,
        summary: data.summary,
        ai_analysis: data.ai_analysis,
        report_date: reportDate || null,
      });
      if (insErr) throw insErr;

      toast.success("Values analyzed and saved");
      setManualText("");
      setReportDate("");
      load();
    } catch (e: any) {
      toast.error(e.message || "Analysis failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this report?")) return;
    const { error } = await supabase.from("medical_reports").delete().eq("id", id);
    if (error) toast.error(error.message);
    else load();
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <FlaskConical className="h-7 w-7 text-primary" /> Medical Reports
        </h1>
        <p className="mt-1 text-muted-foreground">
          Upload lab reports (PDF/image) or enter values manually. AI extracts parameters,
          flags abnormalities, and compares to your previous results.
        </p>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="text-xs">
          AI-assisted educational summaries only. Not a medical diagnosis. Always consult a
          licensed healthcare professional for clinical decisions.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Add a report</CardTitle>
          <CardDescription>Upload a file or type values directly.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="upload">
            <TabsList>
              <TabsTrigger value="upload">
                <Upload className="mr-2 h-4 w-4" /> Upload
              </TabsTrigger>
              <TabsTrigger value="manual">
                <FileText className="mr-2 h-4 w-4" /> Manual entry
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-4 pt-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <Label>Report type</Label>
                  <select
                    className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value)}
                  >
                    <option value="blood">Blood test</option>
                    <option value="lft">Liver function</option>
                    <option value="cbc">CBC</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <Label>Report date</Label>
                  <Input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} />
                </div>
                <div>
                  <Label>File (PDF / JPG / PNG)</Label>
                  <Input
                    type="file"
                    accept="application/pdf,image/*"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                </div>
              </div>
              <Button onClick={handleUpload} disabled={submitting || !file}>
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Analyze report
              </Button>
            </TabsContent>

            <TabsContent value="manual" className="space-y-4 pt-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Report type</Label>
                  <select
                    className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value)}
                  >
                    <option value="blood">Blood test</option>
                    <option value="lft">Liver function</option>
                    <option value="cbc">CBC</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <Label>Report date</Label>
                  <Input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} />
                </div>
              </div>
              <div>
                <Label>Values (one per line, e.g. "Bilirubin: 1.4 mg/dL")</Label>
                <Textarea
                  rows={6}
                  placeholder={"Bilirubin: 1.4 mg/dL\nALT: 55 U/L\nAST: 48 U/L\nHemoglobin: 13.2 g/dL"}
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                />
              </div>
              <Button onClick={handleManual} disabled={submitting || !manualText.trim()}>
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles />}
                Analyze values
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 text-xl font-semibold">Your medical reports</h2>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : reports.length === 0 ? (
          <p className="text-sm text-muted-foreground">No reports yet.</p>
        ) : (
          <div className="space-y-3">
            {reports.map((r) => (
              <Card key={r.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-base">
                      {r.report_type?.toUpperCase() || "REPORT"}{" "}
                      <span className="font-normal text-muted-foreground">
                        · {(r.report_date || r.created_at).slice(0, 10)}
                      </span>
                    </CardTitle>
                    <CardDescription>
                      {r.source_type === "upload" ? r.file_name : "Manual entry"}
                    </CardDescription>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {r.summary && <p>{r.summary}</p>}
                  {Array.isArray(r.abnormalities) && r.abnormalities.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {r.abnormalities.map((a: any, i: number) => (
                        <Badge key={i} variant={a.severity === "severe" ? "destructive" : "secondary"}>
                          {a.name}: {a.value}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {r.ai_analysis?.comparison_note && (
                    <p className="text-muted-foreground">
                      <span className="font-medium text-foreground">Trend:</span> {r.ai_analysis.comparison_note}
                    </p>
                  )}
                  {r.ai_analysis?.recommendation && (
                    <p className="rounded-md bg-muted p-3 text-muted-foreground">
                      💡 {r.ai_analysis.recommendation}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Sparkles() {
  return <FlaskConical className="mr-2 h-4 w-4" />;
}
