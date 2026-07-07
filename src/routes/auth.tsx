import { createFileRoute, Link, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, authReady } from "@/integrations/firebase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/auth")({
  ssr: false,
  // If a session already exists (fresh page load / restored token), send the
  // user straight to the dashboard instead of showing the sign-in form.
  beforeLoad: async () => {
    await authReady;
    if (auth.currentUser) throw redirect({ to: "/dashboard" });
  },
  component: AuthPage,
});

const credentialsSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(6, "Password must be at least 6 characters").max(72),
});

function AuthPage() {
  const navigate = useNavigate();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const parsed = credentialsSchema.parse({ email, password });
      await signInWithEmailAndPassword(auth, parsed.email, parsed.password);
      toast.success("Welcome back.");
      // auth.currentUser is now set. Re-run the route guards: /auth's beforeLoad
      // sees the signed-in user and redirects to /dashboard — the exact same
      // beforeLoad mechanism that already works on a hard refresh. The explicit
      // navigate is a belt-and-suspenders fallback.
      await router.invalidate();
      await navigate({ to: "/dashboard" });
    } catch (err) {
      // Never leak whether the email exists — one generic message for every
      // Firebase auth failure. Zod validation errors show their own message.
      const msg = err instanceof z.ZodError ? err.errors[0].message : "Invalid credentials.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <div className="glass-card rounded-2xl p-8 shadow-[var(--shadow-card)]">
          <div className="mb-6 flex flex-col justify-center align-center items-center gap-2">
            <img src="/FinWise.webp" alt="FinWise" className="h-33 w-33 rounded-lg object-cover mx-auto mb-2" />
            <span className="font-title text-4xl font-bold tracking-wide text-center">FinWise</span>
          </div>
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to your workspace.</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1" />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required className="mt-1" />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Please wait…" : "Sign in"}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            FinWise is private. Accounts are provisioned manually.
          </p>
        </div>
      </div>
    </div>
  );
}
