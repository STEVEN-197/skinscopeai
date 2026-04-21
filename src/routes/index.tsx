import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ScanEye,
  TrendingUp,
  ShieldCheck,
  Sparkles,
  Activity,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SkinScope AI — AI-powered wellness skin & eye monitoring" },
      {
        name: "description",
        content:
          "Track visible signs of jaundice, burns, and irritation across skin, eyes, and palms. AI-powered, private, and educational.",
      },
      { property: "og:title", content: "SkinScope AI" },
      {
        property: "og:description",
        content: "AI-powered wellness monitoring for skin, eyes, and palms.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate({ to: "/dashboard" });
    }
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-8">
          <Logo />
          <nav className="hidden items-center gap-6 md:flex">
            <a href="#features" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Features</a>
            <a href="#how" className="text-sm text-muted-foreground transition-colors hover:text-foreground">How it works</a>
            <a href="#disclaimer" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Safety</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild className="hidden sm:inline-flex">
              <Link to="/login">Sign in</Link>
            </Button>
            <Button asChild className="bg-gradient-hero text-primary-foreground shadow-elegant hover:opacity-95">
              <Link to="/signup">Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-gradient-subtle" />
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-hero opacity-20 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 text-center md:px-8 md:py-28">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mx-auto inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary"
          >
            <Sparkles className="h-3.5 w-3.5" />
            AI-powered wellness, in your pocket
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="mx-auto mt-6 max-w-3xl font-display text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl"
          >
            Notice changes in your skin{" "}
            <span className="text-gradient">before they become concerns.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground md:text-lg"
          >
            Snap a photo of your skin, eyes, or palms. SkinScope AI analyzes color,
            tracks trends across your reports, and gives you clear, friendly insights —
            so you know when to relax and when to check in with a doctor.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mt-9 flex flex-wrap items-center justify-center gap-3"
          >
            <Button asChild size="lg" className="bg-gradient-hero text-primary-foreground shadow-glow hover:opacity-95">
              <Link to="/signup">
                Start free analysis <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/login">I already have an account</Link>
            </Button>
          </motion.div>
          <p className="mt-6 text-xs text-muted-foreground">
            Educational wellness tool · Not a medical device · Always consult a healthcare professional
          </p>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-20 md:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-semibold md:text-4xl">Built for clarity & continuity</h2>
          <p className="mt-3 text-muted-foreground">
            Three pillars that turn a single photo into meaningful insight.
          </p>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {[
            {
              icon: ScanEye,
              title: "Hybrid AI analysis",
              body: "A vision model and on-device color extraction (RGB + HSV) work together to evaluate yellowing, redness, and tone shifts.",
            },
            {
              icon: TrendingUp,
              title: "History-aware trends",
              body: "Each new scan is compared with your past reports to detect whether things are improving, stable, or worsening.",
            },
            {
              icon: ShieldCheck,
              title: "Private by design",
              body: "Your images and reports stay tied to your account with row-level security. You can delete them any time.",
            },
          ].map((f) => (
            <motion.div
              key={f.title}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
              className="rounded-2xl border border-border bg-gradient-card p-6 shadow-elegant"
            >
              <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-display text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-y border-border/60 bg-gradient-subtle py-20">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-semibold md:text-4xl">Three steps. One report.</h2>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {[
              { n: "01", icon: Activity, t: "Upload an image", d: "Choose the region — eye, skin, or palm — then snap or upload a photo." },
              { n: "02", icon: Sparkles, t: "AI + color analysis", d: "We blend a vision model with on-device pixel analysis tuned for that region." },
              { n: "03", icon: FileText, t: "Get a clear report", d: "Severity, observations, trend vs. history, and a downloadable PDF." },
            ].map((s) => (
              <div key={s.n} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="font-display text-2xl font-semibold text-muted-foreground/50">{s.n}</span>
                  <s.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold">{s.t}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-5xl px-4 py-20 md:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-hero p-10 text-center text-primary-foreground shadow-glow md:p-16">
          <div className="pointer-events-none absolute -top-20 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-white/15 blur-3xl" />
          <h2 className="relative font-display text-3xl font-semibold md:text-4xl">
            Start monitoring your wellness today
          </h2>
          <p className="relative mx-auto mt-3 max-w-xl text-primary-foreground/85">
            Create a free account, run your first analysis in under a minute, and build
            a personal record of how your appearance changes over time.
          </p>
          <Button asChild size="lg" variant="secondary" className="relative mt-7">
            <Link to="/signup">
              Create free account <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Disclaimer + footer */}
      <footer id="disclaimer" className="border-t border-border bg-card">
        <div className="mx-auto max-w-6xl px-4 py-10 md:px-8">
          <div className="grid gap-6 md:grid-cols-[1.4fr_1fr]">
            <div>
              <Logo />
              <p className="mt-3 max-w-md text-sm text-muted-foreground">
                <strong className="text-foreground">Important.</strong> SkinScope AI is an
                educational wellness tool, not a medical device, and does not provide
                medical advice, diagnosis, or treatment. Always consult a qualified
                healthcare professional for any concerning symptoms.
              </p>
            </div>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground md:items-end">
              <Link to="/login" className="transition-colors hover:text-foreground">Sign in</Link>
              <Link to="/signup" className="transition-colors hover:text-foreground">Create account</Link>
              <p className="mt-2 text-xs">© {new Date().getFullYear()} SkinScope AI</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
