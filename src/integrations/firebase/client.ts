// Firebase Authentication client (email/password only). No Firestore/Analytics
// bundles are imported — Postgres (via finwise-api) is the only database.
//
// Auth state is purely client-side: the `_authenticated` route is `ssr: false`,
// so we initialize lazily and only touch browser persistence in the browser.
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  onAuthStateChanged,
  type Auth,
} from "firebase/auth";

function readConfig() {
  const config = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
    appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
  };
  const missing = Object.entries(config)
    .filter(([, v]) => !v)
    .map(([k]) => `VITE_FIREBASE_${k.replace(/[A-Z]/g, (m) => "_" + m).toUpperCase()}`);
  if (missing.length > 0) {
    const message = `Missing Firebase environment variable(s): ${missing.join(", ")}.`;
    console.error(`[Firebase] ${message}`);
    throw new Error(message);
  }
  return config as { apiKey: string; authDomain: string; projectId: string; appId: string };
}

let _app: FirebaseApp | undefined;
let _auth: Auth | undefined;

function getFirebaseAuth(): Auth {
  if (_auth) return _auth;
  const config = readConfig();
  _app = getApps()[0] ?? initializeApp(config);
  _auth = getAuth(_app);
  // Persist the session in the browser only (this module can be imported during
  // SSR of non-authenticated routes even though auth pages are client-only).
  if (typeof window !== "undefined") {
    setPersistence(_auth, browserLocalPersistence).catch((err) => {
      console.error("[Firebase] failed to set persistence", err);
    });
  }
  return _auth;
}

// `auth` is a lazily-initialized proxy so importing this module never touches
// Firebase (or throws on missing env) until auth is actually used — importing
// during SSR of non-auth routes is a no-op. The `has`/`getPrototypeOf` traps
// keep `instanceof` checks inside the Firebase SDK working through the proxy.
export const auth = new Proxy({} as Auth, {
  get(_target, prop, receiver) {
    return Reflect.get(getFirebaseAuth(), prop, receiver);
  },
  has(_target, prop) {
    return Reflect.has(getFirebaseAuth(), prop);
  },
  getPrototypeOf() {
    return Reflect.getPrototypeOf(getFirebaseAuth());
  },
});

// authReady resolves once Firebase has determined the initial auth state —
// either a persisted session was restored or there is none. Route guards
// `await` this before reading `auth.currentUser` so they never act on an
// auth instance that hasn't finished initializing. This is the same signal
// that makes a hard refresh land you on the dashboard; login reuses it.
export const authReady: Promise<void> =
  typeof window === "undefined"
    ? Promise.resolve()
    : new Promise<void>((resolve) => {
        const unsubscribe = onAuthStateChanged(getFirebaseAuth(), () => {
          unsubscribe();
          resolve();
        });
      });
