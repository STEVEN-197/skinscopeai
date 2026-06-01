import { useState } from "react";
import { Sparkles, X } from "lucide-react";
import { useRouterState } from "@tanstack/react-router";
import { JarvisChat } from "./JarvisChat";
import { cn } from "@/lib/utils";

export function FloatingJarvis() {
  const [open, setOpen] = useState(false);
  const { location } = useRouterState();

  // Hide on dedicated jarvis page
  if (location.pathname.startsWith("/dashboard/jarvis")) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open JARVIS assistant"
        className={cn(
          "fixed bottom-24 right-4 z-40 grid h-16 w-16 place-items-center rounded-full transition-transform hover:scale-110 sm:bottom-6 sm:right-6",
          open && "hidden",
        )}
      >
        {/* Pulse rings */}
        <span className="absolute inset-0 rounded-full border border-primary-glow/40 animate-[ring_2.4s_cubic-bezier(0.4,0,0.6,1)_infinite]" />
        <span className="absolute inset-0 rounded-full border border-accent/40 animate-[ring_2.4s_cubic-bezier(0.4,0,0.6,1)_infinite] [animation-delay:1.1s]" />
        {/* Orb */}
        <span className="relative grid h-14 w-14 place-items-center rounded-full bg-gradient-hero shadow-glow animate-[orb-pulse_2.6s_ease-in-out_infinite]">
          <span className="absolute inset-1 rounded-full bg-gradient-mesh opacity-50 blur-[2px]" />
          <Sparkles className="relative h-6 w-6 text-white drop-shadow" />
        </span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-end p-3 sm:p-6 animate-[fade-in_0.2s_ease-out]">
          <div
            className="absolute inset-0 bg-background/70 backdrop-blur-md"
            onClick={() => setOpen(false)}
          />
          <div className="relative flex w-full max-w-md flex-col overflow-hidden rounded-3xl border border-white/10 glass-strong shadow-2xl animate-[scale-in_0.25s_ease-out]">
            <div className="flex items-center justify-between border-b border-white/10 bg-gradient-hero px-4 py-3 text-primary-foreground">
              <div className="flex items-center gap-2.5">
                <span className="relative grid h-7 w-7 place-items-center rounded-full bg-white/15 backdrop-blur">
                  <Sparkles className="h-3.5 w-3.5" />
                </span>
                <div className="leading-tight">
                  <p className="font-display text-sm font-semibold">JARVIS</p>
                  <p className="text-[10px] uppercase tracking-wider text-white/75">
                    Health Assistant · Online
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="rounded-md p-1.5 transition-colors hover:bg-white/15"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-3">
              <JarvisChat compact />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
