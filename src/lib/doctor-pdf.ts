import jsPDF from "jspdf";
import { format } from "date-fns";

interface ScanRow { region: string; condition: string; severity: string; confidence: number; created_at: string; observations?: string | null; }
interface MedRow { report_type?: string | null; summary?: string | null; report_date?: string | null; created_at: string; }
interface DiaryRow { entry_date: string; itch?: number; pain?: number; redness?: number; }
interface RxRow { doctor_name?: string | null; prescribed_date?: string | null; medicines?: { name?: string; dosage?: string }[]; }
interface InsightRow { summary?: string | null; observations?: { title: string; detail: string }[]; }

export function generateDoctorReport(opts: {
  userEmail: string;
  scans: ScanRow[];
  meds: MedRow[];
  diary: DiaryRow[];
  prescriptions: RxRow[];
  insight: InsightRow | null;
}) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 48;
  let y = M;

  const header = () => {
    doc.setFillColor(20, 80, 120);
    doc.rect(0, 0, W, 70, "F");
    doc.setTextColor(255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("SkinScope AI — Health Summary", M, 35);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Patient: ${opts.userEmail}`, M, 52);
    doc.text(`Generated: ${format(new Date(), "MMM d, yyyy")}`, W - M, 52, { align: "right" });
    y = 100;
    doc.setTextColor(30);
  };
  header();

  const checkPage = (need = 60) => {
    if (y > doc.internal.pageSize.getHeight() - need) {
      doc.addPage();
      header();
    }
  };

  const section = (title: string) => {
    checkPage(40);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(20, 80, 120);
    doc.text(title, M, y);
    y += 6;
    doc.setDrawColor(220);
    doc.line(M, y, W - M, y);
    y += 14;
    doc.setTextColor(30);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
  };

  const writeLines = (text: string, indent = 0) => {
    const lines = doc.splitTextToSize(text, W - M * 2 - indent) as string[];
    lines.forEach((ln) => {
      checkPage();
      doc.text(ln, M + indent, y);
      y += 13;
    });
  };

  if (opts.insight?.summary) {
    section("AI Health Summary");
    writeLines(opts.insight.summary);
    if (opts.insight.observations?.length) {
      y += 4;
      opts.insight.observations.slice(0, 6).forEach((o) => {
        doc.setFont("helvetica", "bold");
        writeLines(`• ${o.title}`);
        doc.setFont("helvetica", "normal");
        writeLines(o.detail, 12);
      });
    }
    y += 8;
  }

  if (opts.scans.length) {
    section("Visual Scan History");
    opts.scans.slice(0, 10).forEach((s) => {
      doc.setFont("helvetica", "bold");
      writeLines(`${format(new Date(s.created_at), "MMM d, yyyy")} — ${s.region.toUpperCase()} · ${s.condition} (${s.severity}, ${Math.round(s.confidence)}%)`);
      doc.setFont("helvetica", "normal");
      if (s.observations) writeLines(s.observations, 12);
      y += 4;
    });
  }

  if (opts.meds.length) {
    section("Medical / Lab Reports");
    opts.meds.slice(0, 10).forEach((m) => {
      doc.setFont("helvetica", "bold");
      writeLines(`${m.report_date ? format(new Date(m.report_date), "MMM d, yyyy") : format(new Date(m.created_at), "MMM d, yyyy")} — ${m.report_type ?? "Report"}`);
      doc.setFont("helvetica", "normal");
      if (m.summary) writeLines(m.summary, 12);
      y += 4;
    });
  }

  if (opts.prescriptions.length) {
    section("Prescriptions");
    opts.prescriptions.slice(0, 10).forEach((p) => {
      doc.setFont("helvetica", "bold");
      writeLines(`${p.prescribed_date ?? "Date unknown"} — ${p.doctor_name ?? "Doctor"}`);
      doc.setFont("helvetica", "normal");
      (p.medicines ?? []).forEach((m) => writeLines(`• ${m.name}${m.dosage ? ` — ${m.dosage}` : ""}`, 12));
      y += 4;
    });
  }

  if (opts.diary.length) {
    section("Recent Symptom Diary");
    opts.diary.slice(0, 7).forEach((d) => {
      writeLines(`${d.entry_date}: itch ${d.itch ?? 0}, pain ${d.pain ?? 0}, redness ${d.redness ?? 0}`);
    });
  }

  // Footer disclaimer on each page
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(
      "AI-assisted insights — not a medical diagnosis. Always consult a licensed healthcare professional.",
      W / 2,
      doc.internal.pageSize.getHeight() - 18,
      { align: "center" },
    );
    doc.text(`Page ${i} of ${total}`, W - M, doc.internal.pageSize.getHeight() - 18, { align: "right" });
  }

  return doc;
}
