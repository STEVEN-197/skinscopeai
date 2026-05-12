import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CalendarClock, Plus, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const Route = createFileRoute("/dashboard/appointments")({
  head: () => ({ meta: [{ title: "Appointments — SkinScope AI" }] }),
  component: AppointmentsPage,
});

const SPECIALISTS = ["General Physician", "Dermatologist", "Hepatologist", "Ophthalmologist", "Endocrinologist", "Cardiologist", "Other"];

interface Appt {
  id: string;
  specialist_type: string;
  doctor_name: string | null;
  clinic: string | null;
  scheduled_at: string;
  reason: string | null;
  status: string;
}

function AppointmentsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Appt[]>([]);
  const [specialist, setSpecialist] = useState(SPECIALISTS[0]);
  const [doctor, setDoctor] = useState("");
  const [clinic, setClinic] = useState("");
  const [when, setWhen] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("appointments").select("*").eq("user_id", user.id).order("scheduled_at", { ascending: true });
    setItems((data ?? []) as Appt[]);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.id]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !when) return;
    setSaving(true);
    const { error } = await supabase.from("appointments").insert({
      user_id: user.id,
      specialist_type: specialist,
      doctor_name: doctor.trim() || null,
      clinic: clinic.trim() || null,
      scheduled_at: new Date(when).toISOString(),
      reason: reason.trim() || null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Appointment booked");
    setDoctor(""); setClinic(""); setWhen(""); setReason("");
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Cancel this appointment?")) return;
    const { error } = await supabase.from("appointments").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 font-display text-3xl font-semibold tracking-tight">
          <CalendarClock className="h-7 w-7 text-primary" /> Appointments
        </h1>
        <p className="mt-1 text-muted-foreground">
          Schedule consultations and follow-ups with healthcare professionals.
        </p>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="text-xs">
          This is a personal scheduling tool — it does not communicate with clinics. Confirm appointments directly with your provider.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader><CardTitle>Book new appointment</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={add} className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Specialist</Label>
              <select value={specialist} onChange={(e) => setSpecialist(e.target.value)} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {SPECIALISTS.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <Label>Doctor (optional)</Label>
              <Input value={doctor} onChange={(e) => setDoctor(e.target.value)} maxLength={80} />
            </div>
            <div>
              <Label>Clinic / hospital (optional)</Label>
              <Input value={clinic} onChange={(e) => setClinic(e.target.value)} maxLength={120} />
            </div>
            <div>
              <Label>When</Label>
              <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} required />
            </div>
            <div className="sm:col-span-2">
              <Label>Reason</Label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} maxLength={400} placeholder="e.g. Follow-up on skin scan" />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={saving || !when} className="bg-gradient-hero text-primary-foreground">
                <Plus className="mr-2 h-4 w-4" /> Book appointment
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {items.length === 0 ? (
          <Card><CardHeader><CardDescription>No appointments yet.</CardDescription></CardHeader></Card>
        ) : items.map((a) => {
          const past = new Date(a.scheduled_at) < new Date();
          return (
            <Card key={a.id}>
              <CardContent className="flex items-start justify-between gap-3 p-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={past ? "secondary" : "default"}>{past ? "Past" : "Upcoming"}</Badge>
                    <p className="font-medium">{a.specialist_type}</p>
                  </div>
                  <p className="mt-1 text-sm">{format(new Date(a.scheduled_at), "EEE, MMM d yyyy · h:mm a")}</p>
                  {a.doctor_name && <p className="text-xs text-muted-foreground">Dr. {a.doctor_name}{a.clinic && ` · ${a.clinic}`}</p>}
                  {a.reason && <p className="mt-1 text-sm text-muted-foreground">{a.reason}</p>}
                </div>
                <Button size="icon" variant="ghost" onClick={() => remove(a.id)} aria-label="Cancel">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
