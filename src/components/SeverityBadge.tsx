import { cn } from "@/lib/utils";

const styles: Record<string, string> = {
  none: "bg-success/15 text-success border-success/30",
  mild: "bg-warning/20 text-warning-foreground border-warning/40",
  moderate: "bg-orange-500/15 text-orange-700 border-orange-400/40 dark:text-orange-300",
  severe: "bg-destructive/15 text-destructive border-destructive/40",
};

const labels: Record<string, string> = {
  none: "Normal",
  mild: "Mild",
  moderate: "Moderate",
  severe: "Severe",
};

export function SeverityBadge({ severity, className }: { severity: string; className?: string }) {
  const key = (severity ?? "none").toLowerCase();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        styles[key] ?? styles.none,
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", {
        "bg-success": key === "none",
        "bg-warning": key === "mild",
        "bg-orange-500": key === "moderate",
        "bg-destructive": key === "severe",
      })} />
      {labels[key] ?? "Normal"}
    </span>
  );
}
