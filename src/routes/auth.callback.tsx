import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({
    meta: [{ title: "Authenticating — SkinScope AI" }],
  }),
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [loading, user, navigate]);

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-subtle px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-elegant">
        <div className="mb-6 flex flex-col items-center gap-3">
          <Logo />
          {loading || user ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <h1 className="font-display text-2xl font-semibold">Finishing sign-in</h1>
              <p className="text-sm text-muted-foreground">
                We’re verifying your session and sending you to the dashboard.
              </p>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-8 w-8 text-primary" />
              <h1 className="font-display text-2xl font-semibold">Email verified</h1>
              <p className="text-sm text-muted-foreground">
                Your account is confirmed. If you’re not signed in automatically, continue to login.
              </p>
              <Button
                asChild
                className="mt-2 bg-gradient-hero text-primary-foreground hover:opacity-95"
              >
                <Link to="/login">Go to sign in</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
