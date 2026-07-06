import { apiPost } from "./api";
import { bootstrapResponse } from "./api-types";

// bootstrapUser upserts the backend user row after sign-in. Fire-and-forget with
// a few retries; idempotent server-side, and guarded per-uid so it runs once per
// session even though onAuthStateChanged can fire multiple times.
const bootstrapped = new Set<string>();

export async function bootstrapUser(uid: string): Promise<void> {
  if (bootstrapped.has(uid)) return;
  bootstrapped.add(uid);
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await apiPost("/api/me/bootstrap", bootstrapResponse);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }
  }
  // All attempts failed — allow a later retry.
  bootstrapped.delete(uid);
}
