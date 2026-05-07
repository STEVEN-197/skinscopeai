import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { addDays, format } from "date-fns";
import { Bell, Plus, Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ReminderCard } from "@/components/ReminderCard";

export const Route = createFileRoute("/dashboard/reminders")({
  head: () => ({ meta: [{ title: "Reminders — SkinScope AI" }] }),
  component: RemindersPage,
});

interface Reminder {
  id: string;
  label: string;
  due_date: string;
  status: string;
  created_at: string;
}

const QUICK_OPTIONS = [
  { label: "3 days", days: 3 },
  { label: "7 days", days: 7 },
  { label: "14 days", days: 14 },
  { label: "30 days", days: 30 },
];

function RemindersPage() {
  const { user } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [label, setLabel] = useState("Follow-up scan");
  const [dueDate, setDueDate] = useState(format(addDays(new Date(), 7), "yyyy-MM-dd"));
  const [saving, setSaving] = useState(false);

  const fetchReminders = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("reminders")
      .select("*")
      .eq("user_id", user.id)
      .order("due_date", { ascending: true });
    if (!error && data) setReminders(data as unknown as Reminder[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchReminders();
  }, [user]);

  const handleCreate = async () => {
    if (!user || !dueDate) return;
    setSaving(true);
    const { error } = await supabase.from("reminders").insert([
      { user_id: user.id, label: label.trim() || "Follow-up scan", due_date: dueDate },
    ]);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Reminder set!");
    setShowForm(false);
    setLabel("Follow-up scan");
    setDueDate(format(addDays(new Date(), 7), "yyyy-MM-dd"));
    fetchReminders();
  };

  const handleComplete = async (id: string) => {
    const { error } = await supabase
      .from("reminders")
      .update({ status: "completed" })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Marked as completed");
    fetchReminders();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this reminder?")) return;
    const { error } = await supabase.from("reminders").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Reminder deleted");
    fetchReminders();
  };

  const upcoming = reminders.filter((r) => r.status !== "completed");
  const completed = reminders.filter((r) => r.status === "completed");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Reminders</p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
            Scan reminders
          </h1>
          <p className="mt-1.5 text-muted-foreground">
            Schedule follow-up scans so you never miss a check-in.
          </p>
        </div>
        {!showForm && (
          <Button
            onClick={() => setShowForm(true)}
            className="bg-gradient-hero text-primary-foreground shadow-elegant hover:opacity-95"
          >
            <Plus className="mr-1.5 h-4 w-4" /> New reminder
          </Button>
        )}
      </div>

      {/* Create form */}
      {showForm && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-elegant md:p-6 space-y-4">
          <h2 className="font-display text-lg font-semibold">Set a reminder</h2>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Label</Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Re-scan skin"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Due date</Label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              min={format(new Date(), "yyyy-MM-dd")}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Quick set</Label>
            <div className="flex flex-wrap gap-2">
              {QUICK_OPTIONS.map((opt) => (
                <button
                  key={opt.days}
                  type="button"
                  onClick={() => setDueDate(format(addDays(new Date(), opt.days), "yyyy-MM-dd"))}
                  className="rounded-full border border-border bg-muted/40 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleCreate}
              disabled={saving}
              className="flex-1 bg-gradient-hero text-primary-foreground shadow-elegant hover:opacity-95"
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bell className="mr-2 h-4 w-4" />}
              Set reminder
            </Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Active reminders */}
      <div className="space-y-3">
        {loading && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground shadow-elegant">
            Loading…
          </div>
        )}
        {!loading && reminders.length === 0 && !showForm && (
          <div className="rounded-2xl border border-border bg-card px-5 py-14 text-center shadow-elegant">
            <Sparkles className="mx-auto h-8 w-8 text-primary/60" />
            <p className="mt-3 font-medium">No reminders yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Set a follow-up reminder after your next scan.
            </p>
            <Button
              onClick={() => setShowForm(true)}
              className="mt-4 bg-gradient-hero text-primary-foreground hover:opacity-95"
            >
              <Plus className="mr-1.5 h-4 w-4" /> Set first reminder
            </Button>
          </div>
        )}

        {upcoming.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-medium text-muted-foreground">Active</h2>
            {upcoming.map((r) => (
              <ReminderCard
                key={r.id}
                id={r.id}
                label={r.label}
                dueDate={r.due_date}
                status={r.status}
                onComplete={handleComplete}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        {completed.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-medium text-muted-foreground">Completed</h2>
            {completed.map((r) => (
              <ReminderCard
                key={r.id}
                id={r.id}
                label={r.label}
                dueDate={r.due_date}
                status={r.status}
                onComplete={handleComplete}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
