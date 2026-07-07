import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

import { isDebtAccountType } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// BalanceInputs is the shared "balance + as-of date" field pair used by the
// create-account dialog and the account page's inline balance editor. For
// credit cards / loans the money field is labeled "Amount owed" and the caller
// negates the value via toSignedBalance before sending — no sign logic here.
export function BalanceInputs({
  type,
  value,
  onValueChange,
  asOf,
  onAsOfChange,
  idPrefix,
}: {
  type: string;
  value: string;
  onValueChange: (v: string) => void;
  asOf: Date | undefined;
  onAsOfChange: (d: Date | undefined) => void;
  idPrefix: string;
}) {
  const debt = isDebtAccountType(type);
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <Label htmlFor={`${idPrefix}-balance`}>{debt ? "Amount owed" : "Current balance"}</Label>
        <div className="relative mt-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            $
          </span>
          <Input
            id={`${idPrefix}-balance`}
            type="number"
            inputMode="decimal"
            step="0.01"
            min={debt ? 0 : undefined}
            placeholder="0.00"
            value={value}
            onChange={(e) => onValueChange(e.target.value)}
            className="pl-7"
          />
        </div>
        {debt && (
          <p className="mt-1 text-[11px] text-muted-foreground">
            Enter what you owe as a positive number.
          </p>
        )}
      </div>
      <div>
        <Label>As of</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="mt-1 w-full justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
              {asOf ? format(asOf, "MMM d, yyyy") : "Pick a date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={asOf}
              onSelect={onAsOfChange}
              disabled={{ after: new Date() }}
              autoFocus
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
