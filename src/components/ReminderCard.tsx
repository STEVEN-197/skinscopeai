import { format, isPast, isToday } from "date-fns";
import { CalendarCheck, Clock, AlertCircle, CheckCircle2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ReminderCardProps {
  id: string;
  label: string;
  dueDate: string;
  status: string;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ReminderCard({ id, label, dueDate, status, onComplete, onDelete }: ReminderCardProps) {
  const due = new Date(dueDate + "T00:00:00");
  const completed = status === "completed";
  const dueToday = !completed && isToday(due);
  const overdue = !completed && isPast(due) && !isToday(due);

  const statusConfig = completed
    ? { icon: CheckCircle2, label: "Completed", color: "text-success", bg: "bg-success/10 border-success/30" }
    : overdue
      ? { icon: AlertCircle, label: "Overdue", color: "text-destructive", bg: "bg-destructive/10 border-destructive/30" }
      : dueToday
        ? { icon: Clock, label: "Due today", color: "text-warning-foreground", bg: "bg-warning/15 border-warning/30" }
        : { icon: CalendarCheck, label: "Upcoming", color: "text-primary", bg: "bg-primary/5 border-primary/20" };

  return (
    <div className={cn("rounded-xl border p-4 transition-colors", statusConfig.bg)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <statusConfig.icon className={cn("mt-0.5 h-5 w-5 shrink-0", statusConfig.color)} />
          <div>
            <p className="font-medium">{label}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {format(due, "MMM d, yyyy")} · {statusConfig.label}
            </p>
          </div>
        </div>
        <div className="flex gap-1.5">
          {!completed && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onComplete(id)}
              className="h-8 text-xs text-success hover:bg-success/10 hover:text-success"
            >
              <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Done
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(id)}
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
