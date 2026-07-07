import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import {
  accountResponse,
  accountsResponse,
  okResponse,
  type AccountSummary,
  type AccountType,
} from "@/lib/api-types";

export const accountsKey = ["accounts"] as const;

async function fetchAccounts(): Promise<AccountSummary[]> {
  return (await apiGet("/api/accounts", accountsResponse)).accounts;
}

export function useAccounts() {
  return useQuery({ queryKey: accountsKey, queryFn: fetchAccounts });
}

// useAccount derives a single account from the (cached) accounts list — the API
// has no single-account GET and there are only ever a handful of accounts.
export function useAccount(accountId: string) {
  return useQuery({
    queryKey: accountsKey,
    queryFn: fetchAccounts,
    select: (accounts) => accounts.find((a) => a.id === accountId),
  });
}

export function useCreateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      type: AccountType;
      // Signed balance (see toSignedBalance in lib/format.ts); as-of defaults
      // to today server-side when omitted.
      current_balance?: number;
      balance_as_of?: string;
    }) => (await apiPost("/api/accounts", accountResponse, input)).account,
    onSuccess: () => qc.invalidateQueries({ queryKey: accountsKey }),
  });
}

export function useUpdateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      name?: string;
      type?: AccountType;
      current_balance?: number;
      balance_as_of?: string;
    }) => {
      const { id, ...patch } = input;
      return (await apiPatch(`/api/accounts/${id}`, accountResponse, patch)).account;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: accountsKey }),
  });
}

export function useDeleteAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => apiDelete(`/api/accounts/${id}`, okResponse),
    onSuccess: () => qc.invalidateQueries({ queryKey: accountsKey }),
  });
}
