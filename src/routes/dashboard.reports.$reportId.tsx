import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import jsPDF from "jspdf";
import {
  ArrowLeft,
  Download,
  Trash2,
  Eye,
  TrendingUp,
  Activity,
  ClipboardList,
  Sparkles,
  Loader2,
  Cpu,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { SeverityBadge } from "@/components/SeverityBadge";

export const Route = createFileRoute("/dashboard/reports/$reportId")({
  head: () => ({ meta: [{ title: "Report — SkinScope AI" }] }),
  component: ReportDetail,
});

interface MlPredictionsShape {
  probabilities: { healthy: number; jaundice: number; redness: number };
  topClass: "healthy" | "jaundice" | "redness";
  topConfidence: number;
  imageQuality: "good" | "fair" | "poor";
  inferenceMs: number;
  modelVersion: string;
}

interface Report {
  id: string;
  region: string;
  condition: string;
  severity: string;
  confidence: number;
  observations: string | null;
  recommendation: string | null;
  trend: string | null;
  image_path: string;
  color_features: Record<string, number> | null;
  ml_predictions: MlPredictionsShape | null;
  created_at: string;
}

function ReportDetail() {
  const { reportId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [report, setReport] = useState<Report | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .eq("id", reportId)
        .eq("user_id", user.id)
        .single();
      if (error || !data) {
        toast.error("Report not found");
        navigate({ to: "/dashboard/reports" });
        return;
      }
      setReport(data as Report);

      const { data: signed } = await supabase.storage
        .from("skin-images")
        .createSignedUrl((data as Report).image_path, 60 * 60);
      if (signed?.signedUrl) setImageUrl(signed.signedUrl);

      setLoading(false);
    })();
  }, [reportId, user, navigate]);

  const handleDelete = async () => {
    if (!report || !user) return;
    if (!confirm("Delete this report permanently?")) return;
    setDeleting(true);
    await supabase.storage.from("skin-images").remove([report.image_path]);
    const { error } = await supabase.from("reports").delete().eq("id", report.id);
    setDeleting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Report deleted");
    navigate({ to: "/dashboard/reports" });
  };

  const handleDownloadPDF = () => {
    if (!report) return;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 48;
    let y = margin;

    // Header band
    doc.setFillColor(35, 130, 165);
    doc.rect(0, 0, pageWidth, 90, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("SkinScope AI", margin, 50);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Wellness assessment report", margin, 68);

    y = 130;
    doc.setTextColor(20, 30, 50);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Date:", margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(format(new Date(report.created_at), "PPP p"), margin + 50, y);

    y += 18;
    doc.setFont("helvetica", "bold");
    doc.text("Region:", margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(capitalize(report.region), margin + 50, y);

    y += 30;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Assessment", margin, y);
    y += 8;
    doc.setDrawColor(220);
    doc.line(margin, y, pageWidth - margin, y);
    y += 18;

    doc.setFontSize(11);
    addRow(doc, "Condition", report.condition, margin, y);
    y += 22;
    addRow(doc, "Severity", capitalize(report.severity), margin, y);
    y += 22;
    addRow(doc, "Confidence", `${Math.round(Number(report.confidence))}%`, margin, y);
    y += 22;
    addRow(doc, "Trend", report.trend || "—", margin, y, pageWidth - margin * 2 - 100);
    y += 32;

    y = section(doc, "Observations", report.observations || "—", margin, y, pageWidth);
    y = section(doc, "Recommendation", report.recommendation || "—", margin, y, pageWidth);

    if (report.color_features) {
      y += 6;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("Color analysis", margin, y);
      y += 6;
      doc.line(margin, y, pageWidth - margin, y);
      y += 16;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const cf = report.color_features;
      const rows = [
        `Yellow ratio: ${cf.yellowRatio ?? 0}%`,
        `Red ratio: ${cf.redRatio ?? 0}%`,
        `Dark ratio: ${cf.darkRatio ?? 0}%`,
        `Brightness: ${cf.brightness ?? 0}/100`,
        `Avg RGB: (${cf.avgR ?? 0}, ${cf.avgG ?? 0}, ${cf.avgB ?? 0})`,
      ];
      rows.forEach((line) => {
        doc.text(line, margin, y);
        y += 14;
      });
    }

    // Footer disclaimer
    const footerY = doc.internal.pageSize.getHeight() - 60;
    doc.setDrawColor(220);
    doc.line(margin, footerY, pageWidth - margin, footerY);
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(
      "SkinScope AI is an educational wellness tool, not a medical device. Always consult a qualified healthcare professional for any concerning symptoms.",
      margin,
      footerY + 18,
      { maxWidth: pageWidth - margin * 2 },
    );

    doc.save(`SkinScope-Report-${report.id.slice(0, 8)}.pdf`);
  };

  if (loading || !report) {
    return (
      <div className="grid place-items-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const cf = report.color_features ?? null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/dashboard/reports">
            <ArrowLeft className="mr-1 h-4 w-4" /> All reports
          </Link>
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
            <Download className="mr-1.5 h-4 w-4" /> PDF
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={deleting}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="mr-1.5 h-4 w-4" /> Delete
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-gradient-card p-6 shadow-elegant md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-primary">{capitalize(report.region)} analysis</p>
            <h1 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
              {report.condition}
            </h1>
            <p className="text-sm text-muted-foreground">
              {format(new Date(report.created_at), "PPPP · p")}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <SeverityBadge severity={report.severity} className="text-sm" />
            <div className="rounded-lg bg-primary/10 px-3 py-1.5 text-center">
              <p className="text-[10px] font-medium uppercase tracking-wider text-primary">
                Confidence
              </p>
              <p className="font-display text-lg font-semibold text-primary">
                {Math.round(Number(report.confidence))}%
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        {/* Image */}
        <div className="rounded-2xl border border-border bg-card p-3 shadow-elegant">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt="Analyzed region"
              className="aspect-square w-full rounded-xl object-cover"
            />
          ) : (
            <div className="aspect-square w-full animate-pulse rounded-xl bg-muted" />
          )}
        </div>

        {/* Sections */}
        <div className="space-y-5">
          <Section icon={Eye} title="Observations" body={report.observations} />
          <Section icon={TrendingUp} title="Trend" body={report.trend} />
          <Section
            icon={ClipboardList}
            title="Recommendation"
            body={report.recommendation}
            accent
          />
        </div>
      </div>

      {cf && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-elegant md:p-6">
          <div className="mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <h2 className="font-display text-lg font-semibold">Color analysis</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric
              label="Yellow ratio"
              value={`${cf.yellowRatio ?? 0}%`}
              hint="Indicator of jaundice tone"
            />
            <Metric
              label="Red ratio"
              value={`${cf.redRatio ?? 0}%`}
              hint="Inflammation / burn signal"
            />
            <Metric
              label="Brightness"
              value={`${cf.brightness ?? 0}/100`}
              hint="Average lightness"
            />
            <Metric
              label="Avg RGB"
              value={`(${Math.round(cf.avgR ?? 0)}, ${Math.round(cf.avgG ?? 0)}, ${Math.round(cf.avgB ?? 0)})`}
              hint="Mean pixel color"
            />
          </div>
        </div>
      )}

      <div className="flex gap-3 rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm">
        <Sparkles className="h-5 w-5 shrink-0 text-warning-foreground" />
        <p className="text-muted-foreground">
          <strong className="text-foreground">Reminder.</strong> This report is for educational
          wellness purposes only and is not a medical diagnosis. Please consult a qualified
          healthcare professional about any concerning findings.
        </p>
      </div>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  body,
  accent = false,
}: {
  icon: typeof Eye;
  title: string;
  body: string | null;
  accent?: boolean;
}) {
  return (
    <div
      className={
        accent
          ? "rounded-2xl border border-primary/30 bg-primary/5 p-5 shadow-elegant"
          : "rounded-2xl border border-border bg-card p-5 shadow-elegant"
      }
    >
      <div className="mb-2 flex items-center gap-2">
        <Icon className={accent ? "h-4 w-4 text-primary" : "h-4 w-4 text-muted-foreground"} />
        <h3 className="font-display text-base font-semibold">{title}</h3>
      </div>
      <p className="text-sm leading-relaxed text-foreground/85">{body || "—"}</p>
    </div>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted/40 p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-lg font-semibold">{value}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
}

function capitalize(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
}

// PDF helpers
function addRow(doc: jsPDF, label: string, value: string, x: number, y: number, maxWidth = 360) {
  doc.setFont("helvetica", "bold");
  doc.text(`${label}:`, x, y);
  doc.setFont("helvetica", "normal");
  const lines = doc.splitTextToSize(value, maxWidth);
  doc.text(lines, x + 90, y);
}

function section(
  doc: jsPDF,
  title: string,
  body: string,
  margin: number,
  y: number,
  pageWidth: number,
) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(title, margin, y);
  y += 6;
  doc.setDrawColor(220);
  doc.line(margin, y, pageWidth - margin, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  const lines = doc.splitTextToSize(body, pageWidth - margin * 2);
  doc.text(lines, margin, y);
  return y + lines.length * 14 + 18;
}
