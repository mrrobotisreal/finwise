# FinWise frontend migration notes

Migration from Supabase/Lovable auth + direct-from-client database access to
**Firebase Authentication** (email/password, sign-in only) + the new **finwise-api**
Go backend. The frontend now never talks to a database directly — every data
call goes through `src/lib/api.ts` with a Firebase ID token.

## Deleted

| Path | Why |
|---|---|
| `src/integrations/supabase/client.ts` | Supabase browser client — replaced by `integrations/firebase/client.ts`. |
| `src/integrations/supabase/client.server.ts` | Supabase admin client — the backend owns all DB access now. |
| `src/integrations/supabase/auth-attacher.ts` | Attached Supabase bearer tokens to serverFn RPCs — no longer needed. |
| `src/integrations/supabase/auth-middleware.ts` | Supabase SSR auth middleware — removed. |
| `src/integrations/supabase/types.ts` | Generated Supabase DB types — schema now lives in finwise-api. |
| `src/integrations/lovable/index.ts` | Lovable OAuth (Google) wrapper — no OAuth, no sign-up. |
| `supabase/` (config.toml + SQL migration) | Schema moved to `finwise-api/internal/migrations`. |
| `src/lib/csv-parse.ts` | Client CSV parsing — the canonical parser is now Go (`services/csvparse.go`); the client uploads the raw file. |
| deps `@supabase/supabase-js`, `@lovable.dev/cloud-auth-js` | Removed from `package.json`. |
| `.env` `SUPABASE_*` / `VITE_SUPABASE_*` | Replaced with `VITE_API_BASE_URL` + `VITE_FIREBASE_*`. |

Kept: `@lovable.dev/vite-tanstack-config` and the Lovable error-reporting libs —
they are build/observability plumbing, not auth.

## Added

| Path | Purpose |
|---|---|
| `src/integrations/firebase/client.ts` | Lazy Firebase Auth client (email/password only, browser persistence, SSR-safe proxy). |
| `src/lib/api.ts` | Single fetch wrapper: attaches the Firebase ID token, throws typed `ApiError`, validates every response with a zod schema. `apiGet/apiPost/apiPatch/apiDelete/apiUpload`. |
| `src/lib/api-types.ts` | Zod schemas + inferred types for every API payload. |
| `src/lib/format.ts` | Shared `formatMoney` / compact money formatting. |
| `src/lib/bootstrap.ts` | Fire-and-forget `POST /api/me/bootstrap` after sign-in (retried, once per session). |
| `src/hooks/useCountUp.ts` | `requestAnimationFrame` count-up hook (no new dependency). |
| `src/hooks/api/*` | TanStack Query hooks: `useAccounts`, `useAccount`, `useTransactions`, `useUploadCsv`, `useAnalysis`, `useAnalysisJob`, `useCategories`, `useSetTransactionCategory`, plus account/transaction/analyze mutations. |
| `src/components/analysis/*` | Animated recharts components: `StatCards`, `CategoryBreakdown`, `MonthlyCashflow`, `RecurringChargesTable`, `FeesBreakdown`, `InsightsPanel`. |
| dep `firebase` | Modular v11 SDK (auth only). |
| `.env.example` | Documents the five required VITE_* vars. |

## Changed

| Path | Change |
|---|---|
| `package.json` | Removed Supabase/Lovable auth deps; added `firebase`. |
| `.env` | Supabase vars → `VITE_API_BASE_URL` + `VITE_FIREBASE_*`. |
| `.gitignore` | Now ignores `.env` / `.env.*` (keeps `.env.example`). |
| `src/start.ts` | Dropped `attachSupabaseAuth` from `functionMiddleware` (auth is client-side only). |
| `src/routes/__root.tsx` | Supabase `onAuthStateChange` → Firebase `onAuthStateChanged`; invalidates router/queries and bootstraps the user on sign-in. |
| `src/routes/_authenticated/route.tsx` | `beforeLoad` waits for the first `onAuthStateChanged` (cached module-level), redirects to `/auth` when signed out, returns `{ user }` in context. |
| `src/routes/auth.tsx` | **Sign-in only.** Removed the `mode` search param, the sign-up branch, the "Create an account" toggle, and the Google button. `signInWithEmailAndPassword`; generic "Invalid credentials." error; added the "FinWise is private. Accounts are provisioned manually." footer. |
| `src/routes/index.tsx` | Removed both "Get started"/"Create your account" CTAs → a single "Sign in" CTA; updated sign-up-implying copy. |
| `src/components/AppHeader.tsx` | `signOut(auth)` (Firebase) instead of Supabase. |
| `src/routes/_authenticated/dashboard.tsx` | Rewired to `useAccounts`/`useCreateAccount`/`useDeleteAccount`; added the **Overall analysis** section (empty-state + "Run analysis", animated charts, insights). |
| `src/routes/_authenticated/accounts.$accountId.tsx` | Rewired to the API hooks; wrapped in shadcn **Tabs** ("Transactions" = existing table untouched, plus an inline category select; "Analysis" = the five analysis components). Upload now posts the file to `POST /api/accounts/:id/uploads` and polls the returned job with a progress indicator. |

## Notes for deployment

This app is TanStack Start (SSR). For Vercel, set `NITRO_PRESET=vercel` (build
env var), add the five `VITE_*` vars, and add the Vercel domain to Firebase →
Authentication → Authorized domains. See `docs-and-prompts/FINWISE_SETUP_README.md`.
