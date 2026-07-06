import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { CreditCard, PiggyBank, Wallet, TrendingUp, Banknote, MoreHorizontal, Plus, Trash2, ArrowRight, Sparkles, Loader2 } from "lucide-react";
import { z } from "zod";

import { formatMoney } from "@/lib/format";
import type { AccountType } from "@/lib/api-types";
import { useAccounts, useCreateAccount, useDeleteAccount } from "@/hooks/api/accounts";
import { useAnalysis, useAnalysisJob, useAnalyzeAll } from "@/hooks/api/analysis";
import { StatCards } from "@/components/analysis/StatCards";
import { CategoryBreakdown } from "@/components/analysis/CategoryBreakdown";
import { MonthlyCashflow } from "@/components/analysis/MonthlyCashflow";
import { InsightsPanel } from "@/components/analysis/InsightsPanel";

const ACCOUNT_TYPES = [
  { value: "checking", label: "Checking", icon: Wallet },
  { value: "savings", label: "Savings", icon: PiggyBank },
  { value: "credit_card", label: "Credit Card", icon: CreditCard },
  { value: "investment", label: "Investment", icon: TrendingUp },
  { value: "loan", label: "Loan", icon: Banknote },
  { value: "other", label: "Other", icon: MoreHorizontal },
] as const;

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { user } = Route.useRouteContext();
  const { data: accounts, isLoading } = useAccounts();
  const createAccount = useCreateAccount();
  const deleteAccount = useDeleteAccount();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("checking");

  const submitCreate = () => {
    try {
      const parsed = z
        .object({
          name: z.string().trim().min(1, "Name required").max(80),
          type: z.enum(["checking", "savings", "credit_card", "investment", "loan", "other"]),
        })
        .parse({ name, type });
      createAccount.mutate(parsed, {
        onSuccess: () => {
          toast.success("Account created");
          setOpen(false);
          setName("");
          setType("checking");
        },
        onError: (e) => toast.error((e as Error).message),
      });
    } catch (e) {
      toast.error(e instanceof z.ZodError ? e.errors[0].message : (e as Error).message);
    }
  };

  const onDelete = (id: string, label: string) => {
    if (!confirm(`Delete "${label}" and all its transactions?`)) return;
    deleteAccount.mutate(id, {
      onSuccess: () => toast.success("Account deleted"),
      onError: (e) => toast.error((e as Error).message),
    });
  };

  const list = accounts ?? [];
  const totalNet = list.reduce((s, a) => s + a.net_sum, 0);
  const totalTx = list.reduce((s, a) => s + a.tx_count, 0);

  return (
    <div className="min-h-screen">
      <AppHeader email={user.email} />
      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Your accounts</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Create an account, upload its CSV, and dig into every transaction.
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> New account</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create an account</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="acct-name">Account name</Label>
                  <Input id="acct-name" placeholder="e.g. Main Checking" value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label>Type</Label>
                  <Select value={type} onValueChange={(v) => setType(v as AccountType)}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ACCOUNT_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={submitCreate} disabled={createAccount.isPending}>
                  {createAccount.isPending ? "Creating…" : "Create"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <SummaryTile label="Total accounts" value={String(list.length)} />
          <SummaryTile label="Total transactions" value={String(totalTx)} />
          <SummaryTile label="Net balance" value={formatMoney(totalNet)} accent={totalNet >= 0 ? "success" : "destructive"} />
        </div>

        <div className="mt-10">
          {isLoading ? (
            <div className="glass-card grid place-items-center rounded-2xl p-16 text-sm text-muted-foreground">Loading…</div>
          ) : list.length === 0 ? (
            <div className="glass-card grid place-items-center rounded-2xl p-16 text-center">
              <h3 className="text-lg font-semibold">No accounts yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">Create your first account to get started.</p>
              <Button className="mt-4" onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" /> New account</Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {list.map((a) => {
                const meta = ACCOUNT_TYPES.find((t) => t.value === a.type) ?? ACCOUNT_TYPES[5];
                const Icon = meta.icon;
                return (
                  <div key={a.id} className="glass-card group relative rounded-2xl p-6 transition hover:border-primary/40">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{a.name}</h3>
                          <p className="text-xs text-muted-foreground">{meta.label}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => onDelete(a.id, a.name)}
                        className="rounded-md p-1.5 text-muted-foreground opacity-0 transition hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                        aria-label="Delete account"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-6 flex items-end justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-wider text-muted-foreground">Net flow</p>
                        <p className={`num-mono text-2xl font-semibold ${a.net_sum >= 0 ? "text-success" : "text-destructive"}`}>
                          {formatMoney(a.net_sum)}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground">{a.tx_count} tx</p>
                    </div>
                    <Link
                      to="/accounts/$accountId"
                      params={{ accountId: a.id }}
                      className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                    >
                      Open <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {list.length > 0 && <OverallAnalysis />}
      </main>
    </div>
  );
}

function OverallAnalysis() {
  const qc = useQueryClient();
  const { data: overall, isLoading } = useAnalysis("overall");
  const analyzeAll = useAnalyzeAll();
  const [jobId, setJobId] = useState<string | undefined>();
  const { data: job } = useAnalysisJob(jobId);

  useEffect(() => {
    if (!job) return;
    if (job.status === "succeeded") {
      qc.invalidateQueries({ queryKey: ["analysis", "overall"] });
      setJobId(undefined);
      toast.success("Overall analysis updated");
    } else if (job.status === "failed") {
      setJobId(undefined);
      toast.error(job.error ?? "Analysis failed");
    }
  }, [job, qc]);

  const run = () => {
    analyzeAll.mutate(undefined, {
      onSuccess: (ids) => setJobId(ids[0]),
      onError: (e) => toast.error((e as Error).message),
    });
  };

  const running = Boolean(jobId) || analyzeAll.isPending;

  return (
    <section className="mt-14">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Overall analysis</h2>
        </div>
        <Button variant="secondary" size="sm" onClick={run} disabled={running}>
          {running ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing…</> : "Re-run analysis"}
        </Button>
      </div>

      {running && (
        <p className="mb-4 text-sm text-muted-foreground">
          Analyzing… {job ? `${job.status} · ${job.progress}%` : "queued"} — categorizing merchants and writing insights.
        </p>
      )}

      {isLoading ? (
        <div className="glass-card grid place-items-center rounded-2xl p-12 text-sm text-muted-foreground">Loading…</div>
      ) : !overall ? (
        <div className="glass-card grid place-items-center rounded-2xl p-12 text-center">
          <h3 className="text-lg font-semibold">No overall analysis yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload a CSV to an account, or run analysis across all accounts now.
          </p>
          <Button className="mt-4" onClick={run} disabled={running}>
            {running ? "Analyzing…" : "Run analysis"}
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          <StatCards totals={overall.totals} fees={overall.fees} />
          <div className="grid gap-6 lg:grid-cols-2">
            <CategoryBreakdown categories={overall.categories} />
            <MonthlyCashflow monthly={overall.monthly} />
          </div>
          <InsightsPanel ai={overall.ai} />
        </div>
      )}
    </section>
  );
}

function SummaryTile({ label, value, accent }: { label: string; value: string; accent?: "success" | "destructive" }) {
  return (
    <div className="glass-card rounded-2xl p-5">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`num-mono mt-2 text-2xl font-semibold ${accent === "success" ? "text-success" : accent === "destructive" ? "text-destructive" : ""}`}>{value}</p>
    </div>
  );
}
