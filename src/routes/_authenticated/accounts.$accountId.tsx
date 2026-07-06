import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  ArrowLeft, ArrowUpDown, ArrowUp, ArrowDown, Upload, Trash2, Search, Filter, X, BarChart3, Calendar as CalendarIcon, Sparkles, Loader2,
} from "lucide-react";
import Fuse from "fuse.js";
import {
  ColumnDef, flexRender, getCoreRowModel, getFilteredRowModel, getSortedRowModel, SortingState, useReactTable, RowSelectionState,
} from "@tanstack/react-table";

import { formatMoney } from "@/lib/format";
import type { Transaction } from "@/lib/api-types";
import { useAccount } from "@/hooks/api/accounts";
import { useDeleteTransactions, useSetTransactionCategory, useTransactions } from "@/hooks/api/transactions";
import { useUploadCsv } from "@/hooks/api/uploads";
import { useCategories } from "@/hooks/api/categories";
import { useAnalysis, useAnalysisJob, useAnalyzeAccount } from "@/hooks/api/analysis";
import { StatCards } from "@/components/analysis/StatCards";
import { CategoryBreakdown } from "@/components/analysis/CategoryBreakdown";
import { MonthlyCashflow } from "@/components/analysis/MonthlyCashflow";
import { RecurringChargesTable } from "@/components/analysis/RecurringChargesTable";
import { FeesBreakdown } from "@/components/analysis/FeesBreakdown";
import { InsightsPanel } from "@/components/analysis/InsightsPanel";

export const Route = createFileRoute("/_authenticated/accounts/$accountId")({
  component: AccountDetail,
});

type Tx = Transaction;

function AccountDetail() {
  const { accountId } = Route.useParams();
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const accountQuery = useAccount(accountId);
  const account = accountQuery.data;
  const txQuery = useTransactions(accountId);
  const categoriesQuery = useCategories();

  const uploadCsv = useUploadCsv(accountId);
  const deleteTx = useDeleteTransactions(accountId);
  const setCategory = useSetTransactionCategory(accountId);
  const analyzeAccount = useAnalyzeAccount();

  // Shared job polling for both uploads and manual re-runs.
  const [jobId, setJobId] = useState<string | undefined>();
  const { data: job } = useAnalysisJob(jobId);
  useEffect(() => {
    if (!job) return;
    if (job.status === "succeeded") {
      qc.invalidateQueries({ queryKey: ["analysis", accountId] });
      qc.invalidateQueries({ queryKey: ["transactions", accountId] });
      setJobId(undefined);
      toast.success("Analysis complete");
    } else if (job.status === "failed") {
      setJobId(undefined);
      toast.error(job.error ?? "Analysis failed");
    }
  }, [job, qc, accountId]);
  const analyzing = Boolean(jobId) || analyzeAccount.isPending;

  // Table state
  const [sorting, setSorting] = useState<SortingState>([{ id: "tx_date", desc: true }]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [colFilters, setColFilters] = useState<{
    name: string; memo: string; type: string;
    minAmount: string; maxAmount: string;
    from: string; to: string;
    onlyDebits: boolean; onlyCredits: boolean;
  }>({ name: "", memo: "", type: "", minAmount: "", maxAmount: "", from: "", to: "", onlyDebits: false, onlyCredits: false });

  const allTx = txQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];

  const fuse = useMemo(
    () => new Fuse(allTx, { keys: ["name", "memo", "tx_type"], threshold: 0.35, ignoreLocation: true }),
    [allTx],
  );

  const filtered = useMemo(() => {
    let out = allTx;
    if (globalFilter.trim().length > 0) {
      out = fuse.search(globalFilter.trim()).map((r) => r.item);
    }
    const { name, memo, type, minAmount, maxAmount, from, to, onlyDebits, onlyCredits } = colFilters;
    return out.filter((t) => {
      if (name && !(t.name ?? "").toLowerCase().includes(name.toLowerCase())) return false;
      if (memo && !(t.memo ?? "").toLowerCase().includes(memo.toLowerCase())) return false;
      if (type && !(t.tx_type ?? "").toLowerCase().includes(type.toLowerCase())) return false;
      if (minAmount && t.amount < parseFloat(minAmount)) return false;
      if (maxAmount && t.amount > parseFloat(maxAmount)) return false;
      if (from && (t.tx_date ?? "") < from) return false;
      if (to && (t.tx_date ?? "") > to) return false;
      if (onlyDebits && t.amount >= 0) return false;
      if (onlyCredits && t.amount <= 0) return false;
      return true;
    });
  }, [allTx, globalFilter, colFilters, fuse]);

  const onSetCategory = (txId: string, categoryId: string) => {
    if (!categoryId) return;
    setCategory.mutate(
      { txId, categoryId },
      {
        onSuccess: () => toast.success("Category updated — future uploads will inherit it"),
        onError: (e) => toast.error((e as Error).message),
      },
    );
  };

  const columns = useMemo<ColumnDef<Tx>[]>(() => [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllRowsSelected() ? true : table.getIsSomeRowsSelected() ? "indeterminate" : false}
          onCheckedChange={(v) => table.toggleAllRowsSelected(!!v)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(v) => row.toggleSelected(!!v)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      size: 40,
    },
    { accessorKey: "tx_date", header: "Date", cell: ({ getValue }) => <span className="num-mono text-sm">{(getValue<string | null>() ?? "—")}</span> },
    { accessorKey: "tx_type", header: "Type", cell: ({ getValue }) => {
      const v = getValue<string | null>();
      if (!v) return "—";
      const isCredit = /credit|deposit/i.test(v);
      return <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${isCredit ? "bg-success/15 text-success" : "bg-secondary text-secondary-foreground"}`}>{v}</span>;
    }},
    { accessorKey: "name", header: "Name", cell: ({ getValue }) => <span className="text-sm">{getValue<string | null>() ?? "—"}</span> },
    { accessorKey: "memo", header: "Memo", cell: ({ getValue }) => <span className="text-xs text-muted-foreground">{getValue<string | null>() ?? "—"}</span> },
    {
      id: "category",
      accessorKey: "category_slug",
      header: "Category",
      enableSorting: false,
      cell: ({ row }) => (
        <select
          value={row.original.category_id ?? ""}
          onChange={(e) => onSetCategory(row.original.id, e.target.value)}
          className="max-w-[180px] rounded-md border border-border bg-background px-2 py-1 text-xs"
          aria-label="Set category"
        >
          <option value="">Uncategorized</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      ),
    },
    { accessorKey: "amount", header: () => <div className="text-right">Amount</div>, cell: ({ getValue }) => {
      const n = getValue<number>();
      return <div className={`num-mono text-right font-medium ${n >= 0 ? "text-success" : "text-destructive"}`}>{formatMoney(n)}</div>;
    }},
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [categories]);

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting, rowSelection },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getRowId: (r) => r.id,
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const selectedRows = table.getSelectedRowModel().rows.map((r) => r.original);
  const visibleRows = table.getRowModel().rows.map((r) => r.original);
  const statsSource = selectedRows.length > 0 ? selectedRows : visibleRows;
  const stats = useMemo(() => computeStats(statsSource), [statsSource]);

  const onFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      uploadCsv.mutate(f, {
        onSuccess: (res) => {
          toast.success(`Imported ${res.upload.inserted_count} new · ${res.upload.duplicate_count} duplicates`);
          if (res.job_ids.length > 0) setJobId(res.job_ids[0]);
        },
        onError: (err) => toast.error((err as Error).message),
      });
    }
    e.target.value = "";
  };

  const runAnalysis = () => {
    analyzeAccount.mutate(accountId, {
      onSuccess: (ids) => { if (ids.length > 0) setJobId(ids[0]); },
      onError: (e) => toast.error((e as Error).message),
    });
  };

  if (!accountQuery.isLoading && !account) {
    return (
      <div className="min-h-screen">
        <AppHeader email={user.email} />
        <div className="mx-auto max-w-3xl p-10 text-center">
          <p className="text-muted-foreground">Account not found.</p>
          <Button className="mt-4" onClick={() => navigate({ to: "/dashboard" })}>Back to dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <AppHeader email={user.email} />
      <main className="mx-auto max-w-[1400px] px-6 py-8">
        <Link to="/dashboard" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> All accounts
        </Link>

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">{account?.name ?? "Account"}</h1>
            <p className="mt-1 text-sm capitalize text-muted-foreground">{(account?.type ?? "").replace("_", " ")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={onFilePick} />
            <Button onClick={() => fileRef.current?.click()} disabled={uploadCsv.isPending}>
              <Upload className="mr-2 h-4 w-4" /> {uploadCsv.isPending ? "Importing…" : "Upload CSV"}
            </Button>
            {allTx.length > 0 && (
              <Button
                variant="secondary"
                onClick={() => {
                  if (confirm("Delete ALL transactions in this account?"))
                    deleteTx.mutate({ all: true }, {
                      onSuccess: () => toast.success("All transactions cleared"),
                      onError: (e) => toast.error((e as Error).message),
                    });
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Clear all
              </Button>
            )}
          </div>
        </div>

        {analyzing && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-4 py-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            Analyzing… {job ? `${job.status} · ${job.progress}%` : "queued"} — categorizing merchants
          </div>
        )}

        <Tabs defaultValue="transactions" className="mt-6">
          <TabsList>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="transactions">
            <StatsBar stats={stats} selected={selectedRows.length} total={allTx.length} visible={visibleRows.length} />

            {/* Toolbar */}
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Fuzzy search name, memo, type…"
                  value={globalFilter}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  className="pl-9"
                />
              </div>

              <FilterMenu colFilters={colFilters} setColFilters={setColFilters} />

              {(globalFilter || Object.values(colFilters).some((v) => (typeof v === "boolean" ? v : Boolean(v)))) && (
                <Button variant="ghost" onClick={() => { setGlobalFilter(""); setColFilters({ name: "", memo: "", type: "", minAmount: "", maxAmount: "", from: "", to: "", onlyDebits: false, onlyCredits: false }); }}>
                  <X className="mr-1 h-4 w-4" /> Clear
                </Button>
              )}

              {selectedRows.length > 0 && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    if (confirm(`Delete ${selectedRows.length} selected row${selectedRows.length === 1 ? "" : "s"}?`))
                      deleteTx.mutate({ ids: selectedRows.map((r) => r.id) }, {
                        onSuccess: (res) => { toast.success(`Deleted ${res.deleted} row${res.deleted === 1 ? "" : "s"}`); setRowSelection({}); },
                        onError: (e) => toast.error((e as Error).message),
                      });
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Delete {selectedRows.length}
                </Button>
              )}
            </div>

            {/* Table */}
            <div className="glass-card mt-4 overflow-hidden rounded-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground">
                    {table.getHeaderGroups().map((hg) => (
                      <tr key={hg.id}>
                        {hg.headers.map((h) => (
                          <th key={h.id} className="whitespace-nowrap px-4 py-3 text-left font-medium">
                            {h.isPlaceholder ? null : h.column.getCanSort() ? (
                              <button
                                onClick={h.column.getToggleSortingHandler()}
                                className="inline-flex items-center gap-1.5 hover:text-foreground"
                              >
                                {flexRender(h.column.columnDef.header, h.getContext())}
                                {{ asc: <ArrowUp className="h-3 w-3" />, desc: <ArrowDown className="h-3 w-3" /> }[h.column.getIsSorted() as string] ?? <ArrowUpDown className="h-3 w-3 opacity-50" />}
                              </button>
                            ) : (
                              flexRender(h.column.columnDef.header, h.getContext())
                            )}
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody>
                    {txQuery.isLoading ? (
                      <tr><td colSpan={columns.length} className="p-10 text-center text-muted-foreground">Loading…</td></tr>
                    ) : table.getRowModel().rows.length === 0 ? (
                      <tr>
                        <td colSpan={columns.length} className="p-16 text-center">
                          <p className="text-muted-foreground">{allTx.length === 0 ? "No transactions yet. Upload a CSV to get started." : "No rows match your filters."}</p>
                        </td>
                      </tr>
                    ) : (
                      table.getRowModel().rows.map((row) => (
                        <tr key={row.id} data-selected={row.getIsSelected()} className="border-t border-border/60 transition hover:bg-secondary/40 data-[selected=true]:bg-primary/5">
                          {row.getVisibleCells().map((cell) => (
                            <td key={cell.id} className="whitespace-nowrap px-4 py-2.5">
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between border-t border-border/60 bg-secondary/30 px-4 py-2 text-xs text-muted-foreground">
                <span>{visibleRows.length} of {allTx.length} rows{selectedRows.length > 0 ? ` · ${selectedRows.length} selected` : ""}</span>
                <span>Click column headers to sort · Use checkboxes for spreadsheet-style selection</span>
              </div>
            </div>

            {/* Frequency breakdown */}
            {statsSource.length > 0 && (
              <FrequencyBreakdown rows={statsSource} />
            )}
          </TabsContent>

          <TabsContent value="analysis">
            <AccountAnalysis accountId={accountId} analyzing={analyzing} onRun={runAnalysis} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function AccountAnalysis({ accountId, analyzing, onRun }: {
  accountId: string;
  analyzing: boolean;
  onRun: () => void;
}) {
  const { data: result, isLoading } = useAnalysis(accountId);

  return (
    <div className="mt-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Account analysis</h2>
        </div>
        <Button variant="secondary" size="sm" onClick={onRun} disabled={analyzing}>
          {analyzing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing…</> : "Re-run analysis"}
        </Button>
      </div>

      {isLoading ? (
        <div className="glass-card grid place-items-center rounded-2xl p-12 text-sm text-muted-foreground">Loading…</div>
      ) : !result ? (
        <div className="glass-card grid place-items-center rounded-2xl p-12 text-center">
          <h3 className="text-lg font-semibold">No analysis yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">Upload a CSV or run analysis to see categorized spending, cash flow, recurring charges, fees, and insights.</p>
          <Button className="mt-4" onClick={onRun} disabled={analyzing}>{analyzing ? "Analyzing…" : "Run analysis"}</Button>
        </div>
      ) : (
        <div className="space-y-6">
          <StatCards totals={result.totals} fees={result.fees} />
          <div className="grid gap-6 lg:grid-cols-2">
            <CategoryBreakdown categories={result.categories} />
            <MonthlyCashflow monthly={result.monthly} />
          </div>
          <RecurringChargesTable items={result.recurring} />
          <FeesBreakdown fees={result.fees} />
          <InsightsPanel ai={result.ai} />
        </div>
      )}
    </div>
  );
}

function FilterMenu({ colFilters, setColFilters }: {
  colFilters: { name: string; memo: string; type: string; minAmount: string; maxAmount: string; from: string; to: string; onlyDebits: boolean; onlyCredits: boolean; };
  setColFilters: React.Dispatch<React.SetStateAction<{ name: string; memo: string; type: string; minAmount: string; maxAmount: string; from: string; to: string; onlyDebits: boolean; onlyCredits: boolean }>>;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary"><Filter className="mr-2 h-4 w-4" /> Column filters</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-3">
        <DropdownMenuLabel>Filter by column</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="grid gap-3 py-2">
          <FilterField label="Name contains" value={colFilters.name} onChange={(v) => setColFilters((s) => ({ ...s, name: v }))} />
          <FilterField label="Memo contains" value={colFilters.memo} onChange={(v) => setColFilters((s) => ({ ...s, memo: v }))} />
          <FilterField label="Type contains" value={colFilters.type} onChange={(v) => setColFilters((s) => ({ ...s, type: v }))} />
          <div className="grid grid-cols-2 gap-2">
            <FilterField label="Min amount" value={colFilters.minAmount} onChange={(v) => setColFilters((s) => ({ ...s, minAmount: v }))} type="number" />
            <FilterField label="Max amount" value={colFilters.maxAmount} onChange={(v) => setColFilters((s) => ({ ...s, maxAmount: v }))} type="number" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <FilterField label="From date" value={colFilters.from} onChange={(v) => setColFilters((s) => ({ ...s, from: v }))} type="date" />
            <FilterField label="To date" value={colFilters.to} onChange={(v) => setColFilters((s) => ({ ...s, to: v }))} type="date" />
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem checked={colFilters.onlyDebits} onCheckedChange={(v) => setColFilters((s) => ({ ...s, onlyDebits: !!v, onlyCredits: v ? false : s.onlyCredits }))}>
          Only debits (money out)
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem checked={colFilters.onlyCredits} onCheckedChange={(v) => setColFilters((s) => ({ ...s, onlyCredits: !!v, onlyDebits: v ? false : s.onlyDebits }))}>
          Only credits (money in)
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function FilterField({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="block text-xs">
      <span className="text-muted-foreground">{label}</span>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 h-8" />
    </label>
  );
}

type Stats = { total: number; count: number; credits: number; debits: number; avg: number; min: number; max: number };
function computeStats(rows: Tx[]): Stats {
  if (rows.length === 0) return { total: 0, count: 0, credits: 0, debits: 0, avg: 0, min: 0, max: 0 };
  let total = 0, credits = 0, debits = 0, min = Infinity, max = -Infinity;
  for (const r of rows) {
    total += r.amount;
    if (r.amount > 0) credits += r.amount; else debits += r.amount;
    if (r.amount < min) min = r.amount;
    if (r.amount > max) max = r.amount;
  }
  return { total, count: rows.length, credits, debits, avg: total / rows.length, min, max };
}

function StatsBar({ stats, selected, total, visible }: { stats: Stats; selected: number; total: number; visible: number }) {
  const scope = selected > 0 ? `${selected} selected` : `${visible} filtered of ${total}`;
  return (
    <div className="glass-card mt-6 rounded-xl p-4">
      <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
        <BarChart3 className="h-3.5 w-3.5 text-primary" />
        Live stats · <span className="font-medium text-foreground">{scope}</span>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-6">
        <Stat label="Sum" value={formatMoney(stats.total)} accent={stats.total >= 0 ? "success" : "destructive"} />
        <Stat label="Count" value={String(stats.count)} />
        <Stat label="Money in" value={formatMoney(stats.credits)} accent="success" />
        <Stat label="Money out" value={formatMoney(stats.debits)} accent="destructive" />
        <Stat label="Average" value={formatMoney(stats.avg)} />
        <Stat label="Range" value={`${formatMoney(stats.min)} → ${formatMoney(stats.max)}`} />
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: "success" | "destructive" }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`num-mono mt-0.5 text-sm font-semibold ${accent === "success" ? "text-success" : accent === "destructive" ? "text-destructive" : ""}`}>{value}</p>
    </div>
  );
}

function FrequencyBreakdown({ rows }: { rows: Tx[] }) {
  const groups = useMemo(() => {
    const map = new Map<string, { name: string; count: number; total: number; dates: string[] }>();
    for (const r of rows) {
      const key = (r.name ?? "(no name)").trim();
      const cur = map.get(key) ?? { name: key, count: 0, total: 0, dates: [] };
      cur.count += 1;
      cur.total += r.amount;
      if (r.tx_date) cur.dates.push(r.tx_date);
      map.set(key, cur);
    }
    return Array.from(map.values())
      .filter((g) => g.count >= 1)
      .sort((a, b) => b.count - a.count || Math.abs(b.total) - Math.abs(a.total))
      .slice(0, 25);
  }, [rows]);

  return (
    <div className="glass-card mt-6 rounded-xl p-4">
      <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
        <CalendarIcon className="h-3.5 w-3.5 text-primary" />
        Merchant frequency — top 25 by occurrences in current view
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Merchant / Name</th>
              <th className="px-3 py-2 text-right font-medium">Times</th>
              <th className="px-3 py-2 text-right font-medium">Total</th>
              <th className="px-3 py-2 text-left font-medium">First → Last</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => {
              const dates = g.dates.slice().sort();
              return (
                <tr key={g.name} className="border-t border-border/60">
                  <td className="px-3 py-2">{g.name}</td>
                  <td className="num-mono px-3 py-2 text-right">{g.count}</td>
                  <td className={`num-mono px-3 py-2 text-right ${g.total >= 0 ? "text-success" : "text-destructive"}`}>{formatMoney(g.total)}</td>
                  <td className="num-mono px-3 py-2 text-xs text-muted-foreground">
                    {dates.length > 0 ? `${dates[0]} → ${dates[dates.length - 1]}` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
