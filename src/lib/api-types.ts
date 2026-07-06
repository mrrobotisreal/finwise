// Zod schemas for every finwise-api payload. Kept in lockstep with the Go JSON
// tags. Callers pass these to the api.ts helpers so every response is validated.
import { z } from "zod";

// --- Users ------------------------------------------------------------------
export const userSchema = z.object({
  id: z.string(),
  firebase_uid: z.string(),
  email: z.string(),
  display_name: z.string().nullable(),
  created_at: z.string(),
});
export const bootstrapResponse = z.object({ user: userSchema });

// --- Accounts ---------------------------------------------------------------
export const accountTypeSchema = z.enum([
  "checking",
  "savings",
  "credit_card",
  "investment",
  "loan",
  "other",
]);
export type AccountType = z.infer<typeof accountTypeSchema>;

export const accountSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: accountTypeSchema,
  current_balance: z.number().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Account = z.infer<typeof accountSchema>;

export const accountSummarySchema = accountSchema.extend({
  tx_count: z.number(),
  net_sum: z.number(),
  latest_analysis_at: z.string().nullable(),
});
export type AccountSummary = z.infer<typeof accountSummarySchema>;

export const accountsResponse = z.object({ accounts: z.array(accountSummarySchema) });
export const accountResponse = z.object({ account: accountSchema });

// --- Categories -------------------------------------------------------------
export const categorySchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  is_income: z.boolean(),
  sort_order: z.number(),
});
export type Category = z.infer<typeof categorySchema>;
export const categoriesResponse = z.object({ categories: z.array(categorySchema) });

// --- Transactions -----------------------------------------------------------
export const transactionSchema = z.object({
  id: z.string(),
  tx_date: z.string().nullable(),
  tx_type: z.string().nullable(),
  name: z.string().nullable(),
  memo: z.string().nullable(),
  amount: z.number(),
  category_id: z.string().nullable(),
  category_slug: z.string().nullable(),
  category_source: z.string().nullable(),
});
export type Transaction = z.infer<typeof transactionSchema>;
export const transactionsResponse = z.object({ transactions: z.array(transactionSchema) });
export const deleteResponse = z.object({ deleted: z.number() });
export const okResponse = z.object({ ok: z.boolean() });

// --- Uploads ----------------------------------------------------------------
export const uploadSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  account_id: z.string(),
  filename: z.string().nullable(),
  row_count: z.number(),
  inserted_count: z.number(),
  duplicate_count: z.number(),
  status: z.enum(["processing", "succeeded", "failed"]),
  error: z.string().nullable(),
  created_at: z.string(),
});
export type Upload = z.infer<typeof uploadSchema>;
export const uploadResponse = z.object({ upload: uploadSchema });
export const createUploadResponse = z.object({
  upload: uploadSchema,
  job_ids: z.array(z.string()),
});

// --- Analysis jobs ----------------------------------------------------------
export const jobSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  account_id: z.string().nullable(),
  scope: z.enum(["account", "all"]),
  status: z.enum(["queued", "running", "succeeded", "failed"]),
  progress: z.number(),
  error: z.string().nullable(),
  model: z.string().nullable(),
  created_at: z.string(),
  started_at: z.string().nullable(),
  finished_at: z.string().nullable(),
});
export type Job = z.infer<typeof jobSchema>;
export const jobResponse = z.object({ job: jobSchema });
export const enqueueResponse = z.object({ job_ids: z.array(z.string()) });

// --- Analysis result document ----------------------------------------------
export const periodSchema = z.object({ start: z.string(), end: z.string() });

export const totalsSchema = z.object({
  income: z.number(),
  spend: z.number(),
  net: z.number(),
  external_txn_count: z.number(),
});

export const categoryStatSchema = z.object({
  slug: z.string(),
  name: z.string(),
  total: z.number(),
  count: z.number(),
  pct: z.number(),
});

export const monthlyStatSchema = z.object({
  month: z.string(),
  income: z.number(),
  spend: z.number(),
  net: z.number(),
});

export const recurringItemSchema = z.object({
  merchant: z.string(),
  kind: z.enum(["expense", "income"]),
  count: z.number(),
  cadence_days: z.number(),
  avg_amount: z.number(),
  typical_days_of_month: z.array(z.number()).nullable(),
  total: z.number(),
  first_seen: z.string(),
  last_seen: z.string(),
});

export const feeTypeSchema = z.object({
  type: z.string(),
  total: z.number(),
  count: z.number(),
});
export const feesSchema = z.object({
  total: z.number(),
  by_type: z.array(feeTypeSchema),
  waived: z.number(),
});

export const merchantStatSchema = z.object({
  merchant: z.string(),
  total: z.number(),
  count: z.number(),
});

export const largestTxnSchema = z.object({
  date: z.string(),
  name: z.string(),
  amount: z.number(),
  account_id: z.string(),
});

export const perAccountSchema = z.object({
  account_id: z.string(),
  name: z.string(),
  income: z.number(),
  spend: z.number(),
  net: z.number(),
});

export const insightSchema = z.object({
  title: z.string(),
  detail: z.string(),
  severity: z.enum(["info", "warn", "critical"]),
});

export const recommendationSchema = z.object({
  title: z.string(),
  detail: z.string(),
  estimated_monthly_savings: z.number().nullable(),
});

export const aiBlockSchema = z.object({
  summary: z.string(),
  insights: z.array(insightSchema),
  recommendations: z.array(recommendationSchema),
  model: z.string(),
});

export const analysisDocumentSchema = z.object({
  period: periodSchema,
  totals: totalsSchema,
  categories: z.array(categoryStatSchema),
  monthly: z.array(monthlyStatSchema),
  recurring: z.array(recurringItemSchema),
  fees: feesSchema,
  top_merchants: z.array(merchantStatSchema),
  largest_transactions: z.array(largestTxnSchema),
  per_account: z.array(perAccountSchema).optional(),
  ai: aiBlockSchema,
});
export type AnalysisDocument = z.infer<typeof analysisDocumentSchema>;
export type CategoryStat = z.infer<typeof categoryStatSchema>;
export type MonthlyStat = z.infer<typeof monthlyStatSchema>;
export type RecurringItem = z.infer<typeof recurringItemSchema>;
export type Fees = z.infer<typeof feesSchema>;
export type Insight = z.infer<typeof insightSchema>;
export type Recommendation = z.infer<typeof recommendationSchema>;
export type Totals = z.infer<typeof totalsSchema>;
export type PerAccount = z.infer<typeof perAccountSchema>;
export type AIBlock = z.infer<typeof aiBlockSchema>;
export type MerchantStat = z.infer<typeof merchantStatSchema>;

// The analysis endpoints wrap the document (or null for empty-state).
export const analysisResponse = z.object({ result: analysisDocumentSchema.nullable() });
