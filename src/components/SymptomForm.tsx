import { useState } from "react";
import { X, Plus, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

const SYMPTOM_FIELDS = [
  { key: "itch", label: "Itch", color: "text-orange-500" },
  { key: "pain", label: "Pain", color: "text-red-500" },
  { key: "redness", label: "Redness", color: "text-rose-500" },
  { key: "dryness", label: "Dryness", color: "text-amber-600" },
  { key: "irritation", label: "Irritation", color: "text-pink-500" },
  { key: "swelling", label: "Swelling", color: "text-purple-500" },
] as const;

const COMMON_TRIGGERS = [
  "Sun exposure",
  "Stress",
  "Diet",
  "New product",
  "Weather change",
  "Sweat",
  "Allergens",
  "Poor sleep",
];

const COMMON_PRODUCTS = [
  "Moisturizer",
  "Sunscreen",
  "Cleanser",
  "Serum",
  "Steroid cream",
  "Antihistamine",
  "Aloe vera",
  "Retinol",
];

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

export function SymptomForm({ initial, onSubmit, onCancel, submitLabel = "Save entry" }: SymptomFormProps) {
  const [form, setForm] = useState<DiaryFormData>({
    itch: initial?.itch ?? 0,
    pain: initial?.pain ?? 0,
    redness: initial?.redness ?? 0,
    dryness: initial?.dryness ?? 0,
    irritation: initial?.irritation ?? 0,
    swelling: initial?.swelling ?? 0,
    products_used: initial?.products_used ?? [],
    triggers: initial?.triggers ?? [],
    notes: initial?.notes ?? "",
    entry_date: initial?.entry_date ?? new Date().toISOString().split("T")[0],
  });
  const [saving, setSaving] = useState(false);
  const [customTrigger, setCustomTrigger] = useState("");
  const [customProduct, setCustomProduct] = useState("");

  const setField = <K extends keyof DiaryFormData>(key: K, value: DiaryFormData[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggleChip = (field: "triggers" | "products_used", value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter((v) => v !== value)
        : [...prev[field], value],
    }));
  };

  const addCustom = (field: "triggers" | "products_used", value: string, setter: (v: string) => void) => {
    const trimmed = value.trim();
    if (!trimmed || form[field].includes(trimmed)) return;
    setForm((prev) => ({ ...prev, [field]: [...prev[field], trimmed] }));
    setter("");
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await onSubmit(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Date */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Date</Label>
        <Input
          type="date"
          value={form.entry_date}
          onChange={(e) => setField("entry_date", e.target.value)}
          className="w-auto"
        />
      </div>

      {/* Symptom sliders */}
      <div className="space-y-4">
        <Label className="text-sm font-medium">Symptom severity (0–10)</Label>
        {SYMPTOM_FIELDS.map(({ key, label, color }) => (
          <div key={key} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className={cn("text-sm font-medium", color)}>{label}</span>
              <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-semibold tabular-nums">
                {form[key]}
              </span>
            </div>
            <Slider
              min={0}
              max={10}
              step={1}
              value={[form[key] as number]}
              onValueChange={([v]) => setField(key, v)}
              className="w-full"
            />
          </div>
        ))}
      </div>

      {/* Triggers chips */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Possible triggers</Label>
        <div className="flex flex-wrap gap-2">
          {COMMON_TRIGGERS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => toggleChip("triggers", t)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                form.triggers.includes(t)
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-muted/40 text-muted-foreground hover:border-primary/40",
              )}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Add custom trigger…"
            value={customTrigger}
            onChange={(e) => setCustomTrigger(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustom("triggers", customTrigger, setCustomTrigger))}
            className="flex-1 text-sm"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => addCustom("triggers", customTrigger, setCustomTrigger)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {form.triggers.filter((t) => !COMMON_TRIGGERS.includes(t)).length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {form.triggers
              .filter((t) => !COMMON_TRIGGERS.includes(t))
              .map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 rounded-full border border-primary bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                >
                  {t}
                  <button type="button" onClick={() => toggleChip("triggers", t)}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
          </div>
        )}
      </div>

      {/* Products chips */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Products used</Label>
        <div className="flex flex-wrap gap-2">
          {COMMON_PRODUCTS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => toggleChip("products_used", p)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                form.products_used.includes(p)
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-muted/40 text-muted-foreground hover:border-primary/40",
              )}
            >
              {p}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Add custom product…"
            value={customProduct}
            onChange={(e) => setCustomProduct(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustom("products_used", customProduct, setCustomProduct))}
            className="flex-1 text-sm"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => addCustom("products_used", customProduct, setCustomProduct)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {form.products_used.filter((p) => !COMMON_PRODUCTS.includes(p)).length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {form.products_used
              .filter((p) => !COMMON_PRODUCTS.includes(p))
              .map((p) => (
                <span
                  key={p}
                  className="inline-flex items-center gap-1 rounded-full border border-primary bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                >
                  {p}
                  <button type="button" onClick={() => toggleChip("products_used", p)}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Notes</Label>
        <Textarea
          placeholder="How does your skin feel today? Any observations…"
          value={form.notes}
          onChange={(e) => setField("notes", e.target.value)}
          rows={3}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          onClick={handleSubmit}
          disabled={saving}
          className="flex-1 bg-gradient-hero text-primary-foreground shadow-elegant hover:opacity-95"
        >
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {submitLabel}
        </Button>
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}
