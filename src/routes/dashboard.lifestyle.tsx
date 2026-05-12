import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Heart, Save } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

export const Route = createFileRoute("/dashboard/lifestyle")({
  head: () => ({ meta: [{ title: "Lifestyle — SkinScope AI" }] }),
  component: LifestylePage,
});

interface Log {
  log_date: string;
  sleep_hours: number | null;
  water_glasses: number | null;
  stress_level: number | null;
  exercise_minutes: number | null;
  diet_quality: number | null;
}

function LifestylePage() {
  const { user } = useAuth();
  const today = format(new Date(), "yyyy-MM-dd");
  const [date, setDate] = useState(today);
  const [sleep, setSleep] = useState<number>(7);
  const [water, setWater] = useState<number>(6);
  const [stress, setStress] = useState<number>(5);
  const [exercise, setExercise] = useState<number>(20);
  const [diet, setDiet] = useState<number>(6);
  const [recent, setRecent] = useState<Log[]>([]);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("lifestyle_logs").select("*").eq("user_id", user.id).order("log_date", { ascending: false }).limit(7);
    setRecent((data ?? []) as Log[]);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.id]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("lifestyle_logs").upsert({
      user_id: user.id,
      log_date: date,
      sleep_hours: sleep,
      water_glasses: water,
      stress_level: stress,
      exercise_minutes: exercise,
      diet_quality: diet,
    }, { onConflict: "user_id,log_date" });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Lifestyle log saved");
    load();
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 font-display text-3xl font-semibold tracking-tight">
          <Heart className="h-7 w-7 text-primary" /> Lifestyle
        </h1>
        <p className="mt-1 text-muted-foreground">
          Daily inputs help correlate sleep, hydration, and stress with your scans and symptoms.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Log today</CardTitle>
          <CardDescription>Quick 30-second entry.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} max={today} />
          </div>
          <SliderRow label="Sleep (hours)" value={sleep} onChange={setSleep} min={0} max={12} step={0.5} suffix="h" />
          <SliderRow label="Water (glasses)" value={water} onChange={setWater} min={0} max={15} step={1} suffix=" glasses" />
          <SliderRow label="Stress level" value={stress} onChange={setStress} min={0} max={10} step={1} suffix="/10" />
          <SliderRow label="Exercise (minutes)" value={exercise} onChange={setExercise} min={0} max={180} step={5} suffix=" min" />
          <SliderRow label="Diet quality" value={diet} onChange={setDiet} min={0} max={10} step={1} suffix="/10" />
          <Button onClick={save} disabled={saving} className="bg-gradient-hero text-primary-foreground">
            <Save className="mr-2 h-4 w-4" /> Save
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Last 7 days</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">No logs yet.</p>
          ) : recent.map((l) => (
            <div key={l.log_date} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2 text-xs">
              <span className="font-medium">{format(new Date(l.log_date), "MMM d")}</span>
              <span>💤 {l.sleep_hours ?? "—"}h</span>
              <span>💧 {l.water_glasses ?? "—"}</span>
              <span>😰 {l.stress_level ?? "—"}/10</span>
              <span>🏃 {l.exercise_minutes ?? "—"}m</span>
              <span>🥗 {l.diet_quality ?? "—"}/10</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function SliderRow({ label, value, onChange, min, max, step, suffix }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; step: number; suffix: string }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <Label>{label}</Label>
        <span className="text-sm font-medium text-primary">{value}{suffix}</span>
      </div>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={(v) => onChange(v[0])} />
    </div>
  );
}
