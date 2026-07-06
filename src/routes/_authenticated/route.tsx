// Protected layout. Auth is purely client-side (Firebase), so this route is
// ssr:false and beforeLoad waits for the first onAuthStateChanged resolution
// before reading auth.currentUser.
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/integrations/firebase/client";

// Cached module-level promise that resolves once Firebase has determined the
// initial auth state. After the first resolution it stays resolved, so
// subsequent navigations fall through instantly and read the live currentUser.
let authReady: Promise<void> | undefined;
function ensureAuthReady(): Promise<void> {
  if (!authReady) {
    authReady = new Promise<void>((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, () => {
        unsubscribe();
        resolve();
      });
    });
  }
  return authReady;
}

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    await ensureAuthReady();
    const user = auth.currentUser;
    if (!user) throw redirect({ to: "/auth" });
    return {
      user: { uid: user.uid, email: user.email, displayName: user.displayName },
    };
  },
  component: () => <Outlet />,
});
