import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiDelete, apiGet, apiPatch } from "@/lib/api";
import {
  deleteResponse,
  okResponse,
  transactionsResponse,
  type Transaction,
} from "@/lib/api-types";
import { accountsKey } from "./accounts";

export type TxQuery = {
  limit?: number;
  offset?: number;
  from?: string;
  to?: string;
  search?: string;
};

export const transactionsKey = (accountId: string, q?: TxQuery) =>
  ["transactions", accountId, q ?? {}] as const;

function buildQuery(q?: TxQuery): string {
  if (!q) return "";
  const params = new URLSearchParams();
  if (q.limit != null) params.set("limit", String(q.limit));
  if (q.offset != null) params.set("offset", String(q.offset));
  if (q.from) params.set("from", q.from);
  if (q.to) params.set("to", q.to);
  if (q.search) params.set("search", q.search);
  const s = params.toString();
  return s ? `?${s}` : "";
}

export function useTransactions(accountId: string, q?: TxQuery) {
  return useQuery({
    queryKey: transactionsKey(accountId, q),
    queryFn: async (): Promise<Transaction[]> =>
      (await apiGet(`/api/accounts/${accountId}/transactions${buildQuery(q)}`, transactionsResponse))
        .transactions,
    enabled: Boolean(accountId),
  });
}

export function useDeleteTransactions(accountId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (arg: { ids?: string[]; all?: boolean }) =>
      apiDelete(`/api/accounts/${accountId}/transactions`, deleteResponse, arg),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions", accountId] });
      qc.invalidateQueries({ queryKey: accountsKey });
    },
  });
}

export function useSetTransactionCategory(accountId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (arg: { txId: string; categoryId: string }) =>
      apiPatch(`/api/transactions/${arg.txId}/category`, okResponse, { category_id: arg.categoryId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions", accountId] });
    },
  });
}
