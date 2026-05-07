import { Sun, Moon, Droplets, ShieldAlert, CalendarCheck, AlertTriangle } from "lucide-react";

interface CareRoutineProps {
  severity: string;
  condition: string;
  region: string;
  trend?: string | null;
}

function getRoutine(severity: string, condition: string, region: string) {
  const sev = severity.toLowerCase();
  const cond = condition.toLowerCase();

  const morning: string[] = [];
  const evening: string[] = [];
  const hydration: string[] = [];
  const triggerAvoidance: string[] = [];
  const followUp: string[] = [];

  // Base routine
  morning.push("Gentle, fragrance-free cleanser");
  morning.push("Broad-spectrum SPF 30+ sunscreen");
  evening.push("Remove makeup/sunscreen with micellar water");
  evening.push("Gentle cleanser");
  hydration.push("Drink at least 8 glasses of water daily");

  if (sev === "none" || sev === "normal") {
    morning.push("Lightweight moisturizer");
    evening.push("Night moisturizer");
    hydration.push("Maintain current routine — skin looks healthy");
    followUp.push("Routine check-in scan in 30 days");
  } else if (sev === "mild") {
    morning.push("Soothing moisturizer with ceramides");
    evening.push("Repair cream or calming night balm");
    hydration.push("Consider foods rich in omega-3 fatty acids");
    triggerAvoidance.push("Avoid harsh exfoliants temporarily");
    triggerAvoidance.push("Limit direct sun exposure");
    followUp.push("Re-scan in 7–14 days to track changes");
  } else if (sev === "moderate") {
    morning.push("Barrier-repair moisturizer");
    morning.push("Avoid active ingredients (retinol, AHA/BHA) until calmer");
    evening.push("Gentle repair balm or prescribed topical");
    hydration.push("Increase water intake; consider humidifier in dry environments");
    triggerAvoidance.push("Avoid known irritants and new products");
    triggerAvoidance.push("Wear protective clothing in sun");
    followUp.push("Re-scan in 3–7 days");
    followUp.push("Consider consulting a dermatologist if no improvement");
  } else {
    morning.push("Only prescribed or dermatologist-approved products");
    morning.push("Minimal product contact — let skin breathe");
    evening.push("Follow healthcare provider's prescribed routine");
    hydration.push("Stay well-hydrated; avoid alcohol and caffeine");
    triggerAvoidance.push("Avoid all potential irritants immediately");
    triggerAvoidance.push("Do not self-treat — seek professional guidance");
    followUp.push("Re-scan in 3 days to monitor");
    followUp.push("Consult a healthcare professional promptly");
  }

  // Region-specific
  if (region === "eye") {
    morning.push("Use gentle eye-safe products only around eyes");
    triggerAvoidance.push("Avoid rubbing eyes");
  }
  if (region === "palm") {
    morning.push("Apply hand cream after washing");
    triggerAvoidance.push("Use gloves when handling chemicals or harsh soaps");
  }

  // Condition-specific hints
  if (cond.includes("jaundice")) {
    followUp.push("Monitor sclera (whites of eyes) closely");
    hydration.push("Support liver health — avoid alcohol, eat balanced meals");
  }
  if (cond.includes("burn")) {
    triggerAvoidance.push("Keep the area cool; avoid further heat exposure");
    hydration.push("Apply aloe vera gel to soothe (if not blistered)");
  }

  return { morning, evening, hydration, triggerAvoidance, followUp };
}

export function CareRoutine({ severity, condition, region, trend }: CareRoutineProps) {
  const routine = getRoutine(severity, condition, region);

  const sections = [
    { icon: Sun, title: "Morning routine", items: routine.morning, color: "text-amber-500" },
    { icon: Moon, title: "Evening routine", items: routine.evening, color: "text-indigo-400" },
    { icon: Droplets, title: "Hydration & nutrition", items: routine.hydration, color: "text-sky-500" },
    { icon: ShieldAlert, title: "Trigger avoidance", items: routine.triggerAvoidance, color: "text-rose-500" },
    { icon: CalendarCheck, title: "Follow-up suggestions", items: routine.followUp, color: "text-primary" },
  ].filter((s) => s.items.length > 0);

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-elegant md:p-6">
      <div className="mb-1 flex items-center gap-2">
        <Sun className="h-4 w-4 text-primary" />
        <h2 className="font-display text-lg font-semibold">Suggested care routine</h2>
      </div>
      <p className="mb-5 text-xs text-muted-foreground">
        Personalized guidance based on your severity, region, and condition. This is supportive
        wellness guidance — not a diagnosis or prescription.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {sections.map((s) => (
          <div
            key={s.title}
            className="rounded-xl border border-border bg-muted/30 p-4"
          >
            <div className="mb-2 flex items-center gap-2">
              <s.icon className={`h-4 w-4 ${s.color}`} />
              <h3 className="text-sm font-semibold">{s.title}</h3>
            </div>
            <ul className="space-y-1.5">
              {s.items.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground/85">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/50" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {trend && (
        <p className="mt-4 text-xs text-muted-foreground">
          <strong>Trend context:</strong> {trend}
        </p>
      )}

      <div className="mt-4 flex gap-2.5 rounded-xl border border-warning/30 bg-warning/5 p-3 text-xs">
        <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
        <p className="text-muted-foreground">
          These suggestions are for general wellness support only. They do not replace
          professional medical advice. Always consult a qualified healthcare provider for
          diagnosis and treatment.
        </p>
      </div>
    </div>
  );
}
