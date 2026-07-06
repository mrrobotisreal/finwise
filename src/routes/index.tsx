import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, LineChart, Search, Table2, Upload } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground font-display font-bold">F</div>
          <span className="font-display text-xl font-semibold">FinWise</span>
        </div>
        <nav className="flex items-center gap-3">
          <Link to="/auth" className="inline-flex items-center gap-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90">
            Sign in <ArrowRight className="h-4 w-4" />
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-6 pt-16 pb-24">
        <section className="mx-auto max-w-3xl text-center">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-secondary/60 px-3 py-1 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Your private financial workspace
          </div>
          <h1 className="text-5xl font-bold leading-tight md:text-6xl">
            Every transaction, <span className="text-primary">under your microscope.</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            FinWise turns raw bank CSVs into a fast, spreadsheet-grade table you can search, filter, sort, and sum — then analyzes your spending, recurring charges, and fees automatically.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to="/auth" className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition hover:opacity-90">
              Sign in <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        <section className="mt-24 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Upload, title: "CSV in seconds", body: "Drop the export from any bank. FinWise parses date, name, memo, and amount automatically." },
            { icon: Table2, title: "Spreadsheet power", body: "Sort, reorder, and filter every column. Select rows to sum, count, and analyze on the fly." },
            { icon: Search, title: "Fuzzy search", body: "Find any merchant or memo even when the description is messy or misspelled." },
            { icon: LineChart, title: "Automatic analysis", body: "Categorized spending, monthly cash flow, recurring charges, fees, and AI insights — private to you." },
          ].map((f) => (
            <div key={f.title} className="glass-card rounded-xl p-6">
              <f.icon className="h-6 w-6 text-primary" />
              <h3 className="mt-4 text-base font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-border/60">
        <div className="mx-auto max-w-7xl px-6 py-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} FinWise — personal finance, made precise.
        </div>
      </footer>
    </div>
  );
}
