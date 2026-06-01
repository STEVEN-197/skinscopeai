import { useState } from "react";
import { Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

export interface DiaryFormData {
  itch: number;
  pain: number;
  redness: number;
  dryness: number;
  irritation: number;
  swelling: number;
  products_used: string[];
  triggers: string[];
  notes: string;
  entry_date: string;
}

interface SymptomFormProps {
  initial?: Partial<DiaryFormData>;
  onSubmit: (data: DiaryFormData) => Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
}

const SEVERITY_LABELS = ["None", "Very mild", "Mild", "Noticeable", "Moderate", "Bothering", "Strong", "Quite bad", "Severe", "Very severe", "Extreme"];

/**
 * Simplified journal-style symptom entry.
 * We collapse the legacy granular sliders into ONE overall severity rating
 * (mapped onto the existing schema fields for backward compatibility).
 */
export function SymptomForm({ initial, onSubmit, onCancel, submitLabel = "Save entry" }: SymptomFormProps) {
  const initialSeverity =
    initial?.irritation ??
    Math.round(
      ((initial?.itch ?? 0) +
        (initial?.pain ?? 0) +
        (initial?.redness ?? 0) +
        (initial?.dryness ?? 0) +
        (initial?.irritation ?? 0) +
        (initial?.swelling ?? 0)) /
        6,
    );

  const [severity, setSeverity] = useState<number>(initialSeverity || 0);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [entryDate, setEntryDate] = useState(
    initial?.entry_date ?? new Date().toISOString().split("T")[0],
  );
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await onSubmit({
        // Mirror severity into all legacy fields so existing analytics still work.
        itch: severity,
        pain: severity,
        redness: severity,
        dryness: severity,
        irritation: severity,
        swelling: severity,
        products_used: initial?.products_used ?? [],
        triggers: initial?.triggers ?? [],
        notes,
        entry_date: entryDate,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-7">
      {/* Date */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Date
        </Label>
        <Input
          type="date"
          value={entryDate}
          onChange={(e) => setEntryDate(e.target.value)}
          className="w-auto bg-white/5"
        />
      </div>

      {/* Journal */}
      <div className="space-y-2">
        <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Today's journal
        </Label>
        <Textarea
          placeholder="How are you feeling today? Describe what you noticed about your skin, energy, sleep, or anything else worth remembering…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={8}
          className="resize-none bg-white/5 text-base leading-relaxed"
        />
        <p className="text-[11px] text-muted-foreground">
          Free-form. JARVIS will read these entries to spot patterns over time.
        </p>
      </div>

      {/* Optional severity */}
      <div className="space-y-3 rounded-2xl border border-white/10 glass p-4">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Overall feeling
          </Label>
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums",
              severity === 0
                ? "bg-success/15 text-success"
                : severity <= 3
                  ? "bg-primary/15 text-primary-glow"
                  : severity <= 6
                    ? "bg-warning/20 text-warning"
                    : "bg-destructive/20 text-destructive",
            )}
          >
            {severity} · {SEVERITY_LABELS[severity]}
          </span>
        </div>
        <Slider
          min={0}
          max={10}
          step={1}
          value={[severity]}
          onValueChange={([v]) => setSeverity(v)}
        />
        <div className="flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
          <span>Great</span>
          <span>Difficult</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          onClick={handleSubmit}
          disabled={saving}
          className="flex-1 bg-gradient-hero text-primary-foreground shadow-glow hover:opacity-95"
        >
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {submitLabel}
        </Button>
        {onCancel && (
          <Button variant="outline" onClick={onCancel} className="border-white/15 bg-white/5">
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}
