import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Plus,
  BookOpen,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { SymptomForm, type DiaryFormData } from "@/components/SymptomForm";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/diary")({
  head: () => ({ meta: [{ title: "Symptom Diary — SkinScope AI" }] }),
  component: DiaryPage,
});

interface DiaryEntry {
  id: string;
  entry_date: string;
  itch: number;
  pain: number;
  redness: number;
  dryness: number;
  irritation: number;
  swelling: number;
  products_used: string[];
  triggers: string[];
  notes: string;
  created_at: string;
}

const SYMPTOM_KEYS = ["itch", "pain", "redness", "dryness", "irritation", "swelling"] as const;
const SYMPTOM_COLORS: Record<string, string> = {
  itch: "bg-orange-400",
  pain: "bg-red-500",
  redness: "bg-rose-500",
  dryness: "bg-amber-500",
  irritation: "bg-pink-500",
  swelling: "bg-purple-500",
};

function DiaryPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchEntries = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("symptom_diary")
      .select("*")
      .eq("user_id", user.id)
      .order("entry_date", { ascending: false })
      .limit(50);
    if (!error && data) setEntries(data as unknown as DiaryEntry[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchEntries();
  }, [user]);

  const handleCreate = async (data: DiaryFormData) => {
    if (!user) return;
    const { error } = await supabase.from("symptom_diary").insert([{ ...data, user_id: user.id }]);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Diary entry saved!");
    setShowForm(false);
    fetchEntries();
  };

  const handleUpdate = async (data: DiaryFormData) => {
    if (!editingId) return;
    const { error } = await supabase
      .from("symptom_diary")
      .update(data)
      .eq("id", editingId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Entry updated!");
    setEditingId(null);
    fetchEntries();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this diary entry?")) return;
    const { error } = await supabase.from("symptom_diary").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Entry deleted");
    fetchEntries();
  };

  const editEntry = entries.find((e) => e.id === editingId);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Symptom diary</p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
            Track your symptoms
          </h1>
          <p className="mt-1.5 text-muted-foreground">
            Log daily symptoms, products, and triggers to spot patterns over time.
          </p>
        </div>
        {!showForm && !editingId && (
          <Button
            onClick={() => setShowForm(true)}
            className="bg-gradient-hero text-primary-foreground shadow-elegant hover:opacity-95"
          >
            <Plus className="mr-1.5 h-4 w-4" /> New entry
          </Button>
        )}
      </div>

      {/* New entry form */}
      {showForm && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-elegant md:p-6">
          <h2 className="mb-4 font-display text-lg font-semibold">New diary entry</h2>
          <SymptomForm
            onSubmit={handleCreate}
            onCancel={() => setShowForm(false)}
            submitLabel="Save entry"
          />
        </div>
      )}

      {/* Edit form */}
      {editingId && editEntry && (
        <div className="rounded-2xl border border-primary/20 bg-card p-5 shadow-elegant md:p-6">
          <h2 className="mb-4 font-display text-lg font-semibold">Edit entry</h2>
          <SymptomForm
            initial={{
              ...editEntry,
            }}
            onSubmit={handleUpdate}
            onCancel={() => setEditingId(null)}
            submitLabel="Update entry"
          />
        </div>
      )}

      {/* Timeline */}
      <div className="space-y-3">
        {loading && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground shadow-elegant">
            Loading…
          </div>
        )}
        {!loading && entries.length === 0 && !showForm && (
          <div className="rounded-2xl border border-border bg-card px-5 py-14 text-center shadow-elegant">
            <Sparkles className="mx-auto h-8 w-8 text-primary/60" />
            <p className="mt-3 font-medium">No entries yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Start logging your symptoms to build a health timeline.
            </p>
            <Button
              onClick={() => setShowForm(true)}
              className="mt-4 bg-gradient-hero text-primary-foreground hover:opacity-95"
            >
              <Plus className="mr-1.5 h-4 w-4" /> Add first entry
            </Button>
          </div>
        )}
        {!loading &&
          entries.map((entry) => {
            const expanded = expandedId === entry.id;
            const maxSev = Math.max(
              entry.itch,
              entry.pain,
              entry.redness,
              entry.dryness,
              entry.irritation,
              entry.swelling,
            );
            return (
              <div
                key={entry.id}
                className="rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-elegant"
              >
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : entry.id)}
                  className="flex w-full items-center justify-between gap-3 p-4 text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                      <BookOpen className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {format(new Date(entry.entry_date + "T00:00:00"), "EEEE, MMM d, yyyy")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Peak severity: {maxSev}/10
                        {entry.triggers.length > 0 && ` · ${entry.triggers.length} trigger${entry.triggers.length > 1 ? "s" : ""}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Mini severity bars */}
                    <div className="hidden items-end gap-0.5 sm:flex">
                      {SYMPTOM_KEYS.map((k) => (
                        <div
                          key={k}
                          className={cn("w-1.5 rounded-full", SYMPTOM_COLORS[k])}
                          style={{ height: `${Math.max(4, (entry[k] / 10) * 24)}px`, opacity: entry[k] > 0 ? 1 : 0.15 }}
                        />
                      ))}
                    </div>
                    {expanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </button>
                {expanded && (
                  <div className="border-t border-border px-4 pb-4 pt-3 space-y-4">
                    {/* Symptom bars */}
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {SYMPTOM_KEYS.map((k) => (
                        <div key={k} className="flex items-center gap-2 text-sm">
                          <span className={cn("h-2 w-2 rounded-full", SYMPTOM_COLORS[k])} />
                          <span className="capitalize text-muted-foreground">{k}</span>
                          <span className="ml-auto font-semibold tabular-nums">{entry[k]}</span>
                        </div>
                      ))}
                    </div>

                    {entry.triggers.length > 0 && (
                      <div>
                        <p className="mb-1.5 text-xs font-medium text-muted-foreground">Triggers</p>
                        <div className="flex flex-wrap gap-1.5">
                          {entry.triggers.map((t) => (
                            <span key={t} className="rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-xs">
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {entry.products_used.length > 0 && (
                      <div>
                        <p className="mb-1.5 text-xs font-medium text-muted-foreground">Products</p>
                        <div className="flex flex-wrap gap-1.5">
                          {entry.products_used.map((p) => (
                            <span key={p} className="rounded-full border border-primary/20 bg-primary/5 px-2.5 py-0.5 text-xs text-primary">
                              {p}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {entry.notes && (
                      <div>
                        <p className="mb-1 text-xs font-medium text-muted-foreground">Notes</p>
                        <p className="text-sm text-foreground/85">{entry.notes}</p>
                      </div>
                    )}

                    <div className="flex gap-2 pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingId(entry.id);
                          setShowForm(false);
                          setExpandedId(null);
                        }}
                      >
                        <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(entry.id)}
                        className="text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}
