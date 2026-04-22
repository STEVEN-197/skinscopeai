import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — SkinScope AI" },
      { name: "description", content: "Sign in to your SkinScope AI account." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { user, loading, refreshSession } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [user, loading, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setSubmitting(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    const session = error ? null : await refreshSession();
    setSubmitting(false);

    if (error) {
      const message = error.message.toLowerCase().includes("invalid login credentials")
        ? "Couldn’t sign in. The email or password is incorrect, or the account email still needs confirmation."
        : error.message;
      setAuthError(message);
      toast.error(message);
      return;
    }

    if (!session) {
      const message = "Sign-in succeeded, but the session could not be restored. Please try again.";
      setAuthError(message);
      toast.error(message);
      return;
    }

    toast.success("Signed in — taking you to your dashboard.");
    navigate({ to: "/dashboard", replace: true });
  };

  const handleResendConfirmation = async () => {
    if (!email.trim()) {
      const message = "Enter your email first.";
      setAuthError(message);
      toast.error(message);
      return;
    }

    setAuthError(null);
    setResending(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email.trim(),
      options: {
        emailRedirectTo:
          typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined,
      },
    });
    setResending(false);

    if (error) {
      setAuthError(error.message);
      toast.error(error.message);
      return;
    }

    toast.success("Confirmation email sent.");
  };

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-subtle px-4 py-10">
      <div className="w-full max-w-md">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>
        <div className="rounded-2xl border border-border bg-card p-8 shadow-elegant">
          <div className="mb-6 flex flex-col items-center gap-3 text-center">
            <Logo />
            <h1 className="font-display text-2xl font-semibold">Welcome back</h1>
            <p className="text-sm text-muted-foreground">Sign in to continue your analysis</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (authError) setAuthError(null);
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (authError) setAuthError(null);
                }}
              />
            </div>
            {authError ? (
              <p
                role="alert"
                aria-live="polite"
                className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {authError}
              </p>
            ) : null}
            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-gradient-hero text-primary-foreground hover:opacity-95"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
            </Button>
          </form>
          <div className="mt-5 space-y-3 text-center text-sm text-muted-foreground">
            <p>
              New to SkinScope?{" "}
              <Link to="/signup" className="font-medium text-primary hover:underline">
                Create an account
              </Link>
            </p>
            <p className="text-xs">If you just signed up, confirm your email before signing in.</p>
            <button
              type="button"
              onClick={handleResendConfirmation}
              disabled={resending}
              className="font-medium text-primary transition-opacity hover:underline disabled:opacity-60"
            >
              {resending ? "Sending confirmation…" : "Resend confirmation email"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
