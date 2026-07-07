// Protected layout. Auth is purely client-side (Firebase), so this route is
// ssr:false and beforeLoad waits for the shared authReady signal before reading
// auth.currentUser. This same guard is what redirects to /dashboard after login
// (see auth.tsx: sign-in → router.invalidate() re-runs this beforeLoad).
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { auth, authReady } from "@/integrations/firebase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    await authReady;
    const user = auth.currentUser;
    if (!user) throw redirect({ to: "/auth" });
    return {
      user: { uid: user.uid, email: user.email, displayName: user.displayName },
    };
  },
  component: () => <Outlet />,
});
