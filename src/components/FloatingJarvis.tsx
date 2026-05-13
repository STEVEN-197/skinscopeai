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
          "fixed bottom-24 right-4 z-40 grid h-14 w-14 place-items-center rounded-full bg-gradient-hero text-primary-foreground shadow-glow transition-transform hover:scale-105 sm:bottom-5 sm:right-5",
          open && "hidden",
        )}
      >
        <Sparkles className="h-6 w-6" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-end p-3 sm:p-5">
          <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
            <div className="flex items-center justify-between border-b border-border bg-gradient-hero px-4 py-3 text-primary-foreground">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                <p className="font-display text-sm font-semibold">JARVIS · Health Assistant</p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close" className="rounded-md p-1 hover:bg-white/10">
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
