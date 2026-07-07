import { Link } from "@tanstack/react-router";
import { signOut } from "firebase/auth";
import { auth } from "@/integrations/firebase/client";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function AppHeader({ email }: { email?: string | null }) {
  const handleSignOut = async () => {
    await signOut(auth);
    // Full navigation to the auth screen. This is the same path as a manual
    // hard reload — which reliably re-runs the route guards — so it works even
    // though in-app router transitions weren't re-rendering after sign-out.
    // The fresh load also discards the React Query cache, so no manual clear.
    window.location.replace("/auth");
  };
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to="/dashboard" className="flex items-center gap-2.5">
          <img src="/FinWise.webp" alt="FinWise" className="h-9 w-9 rounded-lg object-cover" />
          <div className="flex flex-col leading-tight">
            <span className="font-title text-lg font-bold tracking-wide">FinWise</span>
            <span className="font-slogan text-[11px] font-medium text-muted-foreground">
              See the Flow. Command the Future.
            </span>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          {email && <span className="hidden text-sm text-muted-foreground sm:block">{email}</span>}
          <Button variant="secondary" size="sm" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}
