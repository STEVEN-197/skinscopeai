import { createFileRoute } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { JarvisChat } from "@/components/JarvisChat";

export const Route = createFileRoute("/dashboard/jarvis")({
  head: () => ({ meta: [{ title: "JARVIS — SkinScope AI" }] }),
  component: JarvisPage,
});

function JarvisPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <h1 className="flex items-center gap-2 font-display text-3xl font-semibold tracking-tight">
          <Sparkles className="h-7 w-7 text-primary" /> JARVIS
        </h1>
        <p className="mt-1 text-muted-foreground">
          Your AI health assistant. Ask about your scans, labs, symptoms, prescriptions, or lifestyle.
        </p>
      </div>
      <JarvisChat />
    </div>
  );
}
