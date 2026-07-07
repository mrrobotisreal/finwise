import { useEffect, useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { toast } from "sonner";
import { Calendar as CalendarIcon, Search, TriangleAlert } from "lucide-react";

import { ApiError } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import type { Holding, TickerResult } from "@/lib/api-types";
import { useDayPrices, useStockSearch } from "@/hooks/api/stocks";
import { useCreateHolding, useUpdateHolding } from "@/hooks/api/holdings";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";

const holdingFormSchema = z.object({
  ticker: z.string().min(1, "Pick a stock first"),
  name: z.string().optional(),
  purchaseDate: z.date(),
  price: z
    .string()
    .min(1, "Price required")
    .refine(
      (v) => Number.isFinite(parseFloat(v)) && parseFloat(v) >= 0,
      "Price must be a positive number",
    ),
  quantity: z
    .string()
    .regex(/^\d{1,12}(\.\d{1,6})?$/, "Positive number, up to 6 decimal places")
    .refine((v) => parseFloat(v) > 0, "Quantity must be greater than zero"),
  notes: z.string().optional(),
});
type HoldingFormValues = z.infer<typeof holdingFormSchema>;

// useDebounced returns the value after it stops changing for `ms`.
function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

// HoldingFormDialog is both the add and the edit form: search → date → day
// OHLC → price slider bounded by that day's low/high → quantity/notes.
export function HoldingFormDialog({
  open,
  onOpenChange,
  holding,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  holding?: Holding; // present = edit mode
}) {
  const createHolding = useCreateHolding();
  const updateHolding = useUpdateHolding();
  const editing = Boolean(holding);

  const form = useForm<HoldingFormValues>({
    resolver: zodResolver(holdingFormSchema),
    defaultValues: {
      ticker: holding?.ticker ?? "",
      name: holding?.name ?? "",
      purchaseDate: holding ? new Date(`${holding.purchase_date}T00:00:00`) : undefined,
      price: holding ? String(holding.purchase_price) : "",
      quantity: holding?.quantity ?? "",
      notes: holding?.notes ?? "",
    },
  });
  const { watch, setValue, control, register, handleSubmit, reset, formState } = form;

  const ticker = watch("ticker");
  const purchaseDate = watch("purchaseDate");
  const priceStr = watch("price");
  const quantity = watch("quantity");

  // --- Step 1: search --------------------------------------------------------
  const [searchText, setSearchText] = useState("");
  const debouncedSearch = useDebounced(searchText, 300);
  const search = useStockSearch(debouncedSearch);

  const pickTicker = (r: TickerResult) => {
    setValue("ticker", r.ticker, { shouldValidate: true });
    setValue("name", r.name);
    setSearchText("");
  };

  // --- Step 3: that day's OHLC ----------------------------------------------
  const dateISO = purchaseDate ? format(purchaseDate, "yyyy-MM-dd") : "";
  const dayPrices = useDayPrices(ticker, dateISO);
  const day = dayPrices.data;
  const marketClosed = day && day.actual_date !== day.date;

  // Snap the price into the day's range when prices arrive and none is set.
  useEffect(() => {
    if (day && !priceStr) {
      setValue("price", day.close.toFixed(2), { shouldValidate: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day]);

  const price = parseFloat(priceStr);
  const outsideRange = day && Number.isFinite(price) && (price < day.low || price > day.high);

  const costBasis = useMemo(() => {
    const q = parseFloat(quantity);
    if (!Number.isFinite(q) || !Number.isFinite(price)) return null;
    return q * price;
  }, [quantity, price]);

  const submit = handleSubmit((values) => {
    const payload = {
      ticker: values.ticker,
      name: values.name || undefined,
      quantity: values.quantity,
      // Fills on closed days use the previous trading day's data.
      purchase_date: day?.actual_date ?? format(values.purchaseDate, "yyyy-MM-dd"),
      purchase_price: parseFloat(values.price),
      day_low: day?.low,
      day_high: day?.high,
      notes: values.notes || undefined,
    };
    const opts = {
      onSuccess: () => {
        toast.success(editing ? "Holding updated" : "Holding added");
        onOpenChange(false);
        reset();
      },
      onError: (e: Error) => {
        if (e instanceof ApiError && e.status === 429) {
          toast.error("Polygon rate limit — hang on a few seconds");
        } else {
          toast.error(e.message);
        }
      },
    };
    if (editing && holding) {
      updateHolding.mutate({ id: holding.id, ...payload }, opts);
    } else {
      createHolding.mutate(payload, opts);
    }
  });

  const pending = createHolding.isPending || updateHolding.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit holding" : "Add a holding"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* 1 — Stock search */}
          <div>
            <Label>Stock</Label>
            {ticker ? (
              <div className="mt-1 flex items-center justify-between rounded-lg border border-border bg-secondary/40 px-3 py-2">
                <div>
                  <span className="num-mono font-semibold">{ticker}</span>
                  {watch("name") && (
                    <span className="ml-2 text-sm text-muted-foreground">{watch("name")}</span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setValue("ticker", "");
                    setValue("name", "");
                  }}
                >
                  Change
                </Button>
              </div>
            ) : (
              <div className="mt-1">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search ticker or company name…"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    className="pl-9"
                    autoFocus
                  />
                </div>
                {debouncedSearch.trim().length >= 2 && (
                  <Command className="mt-2 rounded-lg border border-border" shouldFilter={false}>
                    <CommandList>
                      {search.isLoading ? (
                        <div className="p-3 text-sm text-muted-foreground">Searching…</div>
                      ) : (
                        <>
                          <CommandEmpty>No matches.</CommandEmpty>
                          <CommandGroup>
                            {(search.data ?? []).map((r) => (
                              <CommandItem
                                key={r.ticker}
                                value={r.ticker}
                                onSelect={() => pickTicker(r)}
                                className="cursor-pointer"
                              >
                                <span className="num-mono w-16 font-semibold">{r.ticker}</span>
                                <span className="flex-1 truncate text-sm">{r.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {r.primary_exchange}
                                </span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </>
                      )}
                    </CommandList>
                  </Command>
                )}
              </div>
            )}
            {formState.errors.ticker && (
              <p className="mt-1 text-xs text-destructive">{formState.errors.ticker.message}</p>
            )}
          </div>

          {/* 2 — Purchase date */}
          <div>
            <Label>Purchase date</Label>
            <Controller
              control={control}
              name="purchaseDate"
              render={({ field }) => (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="mt-1 w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                      {field.value ? format(field.value, "MMM d, yyyy") : "Pick the day you bought"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={(d) => field.onChange(d)}
                      disabled={{ after: new Date() }}
                      autoFocus
                    />
                  </PopoverContent>
                </Popover>
              )}
            />
            {formState.errors.purchaseDate && (
              <p className="mt-1 text-xs text-destructive">Pick a purchase date</p>
            )}
            {marketClosed && day && (
              <p className="mt-1 text-xs text-muted-foreground">
                Market was closed on {day.date}; showing {day.actual_date}.
              </p>
            )}
          </div>

          {/* 3 — That day's range + price picker */}
          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="holding-price">Price per share</Label>
              {dayPrices.isLoading && ticker && dateISO && (
                <span className="text-xs text-muted-foreground">Loading that day's range…</span>
              )}
            </div>
            {day && (
              <div className="mt-2 grid grid-cols-4 gap-2 text-center text-xs">
                <DayStat label="Open" value={day.open} />
                <DayStat label="High" value={day.high} />
                <DayStat label="Low" value={day.low} />
                <DayStat label="Close" value={day.close} />
              </div>
            )}
            <div className="mt-3 flex items-center gap-3">
              {day && (
                <Slider
                  min={day.low}
                  max={day.high}
                  step={0.01}
                  value={[
                    Number.isFinite(price)
                      ? Math.min(Math.max(price, day.low), day.high)
                      : day.close,
                  ]}
                  onValueChange={([v]) => setValue("price", v.toFixed(2), { shouldValidate: true })}
                  className="flex-1"
                />
              )}
              <div className="relative w-32 shrink-0">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  $
                </span>
                <Input
                  id="holding-price"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min={0}
                  placeholder="0.00"
                  {...register("price")}
                  className="pl-7"
                />
              </div>
            </div>
            {outsideRange && (
              <p className="mt-1 flex items-center gap-1 text-xs text-amber-500">
                <TriangleAlert className="h-3.5 w-3.5" /> Outside that day's low–high range — fills
                can happen there, just double-check.
              </p>
            )}
            {formState.errors.price && (
              <p className="mt-1 text-xs text-destructive">{formState.errors.price.message}</p>
            )}
          </div>

          {/* 4 — Quantity + notes */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="holding-quantity">Quantity</Label>
              <Input
                id="holding-quantity"
                inputMode="decimal"
                placeholder="e.g. 1.5"
                {...register("quantity")}
                className="mt-1"
              />
              {formState.errors.quantity && (
                <p className="mt-1 text-xs text-destructive">{formState.errors.quantity.message}</p>
              )}
            </div>
            <div>
              <Label>Cost basis</Label>
              <p className="num-mono mt-2.5 text-lg font-semibold">
                {costBasis != null ? formatMoney(costBasis) : "—"}
              </p>
            </div>
          </div>
          <div>
            <Label htmlFor="holding-notes">Notes (optional)</Label>
            <Textarea id="holding-notes" rows={2} {...register("notes")} className="mt-1" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? "Saving…" : editing ? "Save changes" : "Add holding"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DayStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border/60 bg-secondary/30 px-2 py-1.5">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="num-mono text-sm font-medium">{formatMoney(value)}</p>
    </div>
  );
}
