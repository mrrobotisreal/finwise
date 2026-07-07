import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { format } from "date-fns";

import type { Account } from "@/lib/api-types";
import { isDebtAccountType, toSignedBalance } from "@/lib/format";
import { useUpdateAccount } from "@/hooks/api/accounts";
import { BalanceInputs } from "@/components/BalanceInputs";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// BalanceEditPopover wraps any trigger element with an inline balance + as-of
// editor for an account. Used by the account page title, the upload nudge, and
// the balance-timeline empty state.
export function BalanceEditPopover({
  account,
  children,
}: {
  account: Pick<Account, "id" | "type" | "current_balance" | "balance_as_of">;
  children: ReactNode;
}) {
  const updateAccount = useUpdateAccount();
  const [open, setOpen] = useState(false);
  const debt = isDebtAccountType(account.type);
  const initialValue =
    account.current_balance == null
      ? ""
      : String(debt ? Math.abs(account.current_balance) : account.current_balance);
  const [value, setValue] = useState(initialValue);
  const [asOf, setAsOf] = useState<Date | undefined>(
    account.balance_as_of ? new Date(`${account.balance_as_of}T00:00:00`) : new Date(),
  );

  const submit = () => {
    const parsed = parseFloat(value);
    if (!Number.isFinite(parsed)) {
      toast.error(debt ? "Enter the amount owed" : "Enter a balance");
      return;
    }
    updateAccount.mutate(
      {
        id: account.id,
        current_balance: toSignedBalance(account.type, parsed),
        balance_as_of: format(asOf ?? new Date(), "yyyy-MM-dd"),
      },
      {
        onSuccess: () => {
          toast.success("Balance saved — re-run analysis to refresh the timeline");
          setOpen(false);
        },
        onError: (e) => toast.error((e as Error).message),
      },
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-96" align="start">
        <p className="mb-3 text-sm font-medium">
          {debt ? "Set amount owed" : "Set current balance"}
        </p>
        <BalanceInputs
          type={account.type}
          value={value}
          onValueChange={setValue}
          asOf={asOf}
          onAsOfChange={setAsOf}
          idPrefix={`balance-edit-${account.id}`}
        />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={submit} disabled={updateAccount.isPending}>
            {updateAccount.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
