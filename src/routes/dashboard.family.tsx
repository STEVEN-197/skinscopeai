import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Users, Plus, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const Route = createFileRoute("/dashboard/family")({
  head: () => ({ meta: [{ title: "Family — SkinScope AI" }] }),
  component: FamilyPage,
});

interface Member {
  id: string;
  name: string;
  relation: string | null;
  date_of_birth: string | null;
  notes: string | null;
}

function FamilyPage() {
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [name, setName] = useState("");
  const [relation, setRelation] = useState("");
  const [dob, setDob] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("family_members").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setMembers((data ?? []) as Member[]);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.id]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("family_members").insert({
      user_id: user.id,
      name: name.trim(),
      relation: relation.trim() || null,
      date_of_birth: dob || null,
      notes: notes.trim() || null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Family member added");
    setName(""); setRelation(""); setDob(""); setNotes("");
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this family member?")) return;
    const { error } = await supabase.from("family_members").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 font-display text-3xl font-semibold tracking-tight">
          <Users className="h-7 w-7 text-primary" /> Family Health
        </h1>
        <p className="mt-1 text-muted-foreground">
          Add family members to track their health alongside yours and watch for hereditary patterns.
        </p>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="text-xs">
          Hereditary observations are AI-assisted insights based on shared visible patterns — not a genetic diagnosis.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader><CardTitle>Add family member</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={add} className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} />
            </div>
            <div>
              <Label>Relation</Label>
              <Input value={relation} onChange={(e) => setRelation(e.target.value)} placeholder="e.g. Mother, Brother" maxLength={40} />
            </div>
            <div>
              <Label>Date of birth</Label>
              <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={500} placeholder="Known conditions, allergies, or family-relevant context" />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={saving || !name.trim()} className="bg-gradient-hero text-primary-foreground">
                <Plus className="mr-2 h-4 w-4" /> Add
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        {members.length === 0 ? (
          <Card className="sm:col-span-2"><CardHeader><CardDescription>No family members yet.</CardDescription></CardHeader></Card>
        ) : members.map((m) => (
          <Card key={m.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{m.name}</CardTitle>
                  <CardDescription>{m.relation || "—"} {m.date_of_birth && `· born ${format(new Date(m.date_of_birth), "MMM yyyy")}`}</CardDescription>
                </div>
                <Button size="icon" variant="ghost" onClick={() => remove(m.id)} aria-label="Remove">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </CardHeader>
            {m.notes && <CardContent><p className="text-sm text-muted-foreground">{m.notes}</p></CardContent>}
          </Card>
        ))}
      </div>
    </div>
  );
}
