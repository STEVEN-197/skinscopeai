import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-hero shadow-glow">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="h-5 w-5 text-white"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
            <circle cx="12" cy="12" r="3" fill="currentColor" />
            <path
              d="M12 3v2M12 19v2M3 12h2M19 12h2"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>
      <div className="flex flex-col leading-none">
        <span className="font-display text-lg font-semibold tracking-tight">SkinScope</span>
        <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          AI
        </span>
      </div>
    </div>
  );
}
