import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import {
  holdingResponse,
  holdingsResponse,
  okResponse,
  type EnrichedHolding,
} from "@/lib/api-types";

export const holdingsKey = ["holdings"] as const;

// Holding create/update payloads. quantity is an exact decimal string.
export type HoldingInput = {
  ticker: string;
  name?: string;
  quantity: string;
  purchase_date: string;
  purchase_price: number;
  day_low?: number;
  day_high?: number;
  notes?: string;
};

export function useHoldings() {
  return useQuery({
    queryKey: holdingsKey,
    queryFn: async (): Promise<EnrichedHolding[]> =>
      (await apiGet("/api/holdings", holdingsResponse)).holdings,
  });
}

export function useCreateHolding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: HoldingInput) =>
      (await apiPost("/api/holdings", holdingResponse, input)).holding,
    onSuccess: () => qc.invalidateQueries({ queryKey: holdingsKey }),
  });
}

export function useUpdateHolding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<HoldingInput> & { id: string }) => {
      const { id, ...patch } = input;
      return (await apiPatch(`/api/holdings/${id}`, holdingResponse, patch)).holding;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: holdingsKey }),
  });
}

export function useDeleteHolding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => apiDelete(`/api/holdings/${id}`, okResponse),
    onSuccess: () => qc.invalidateQueries({ queryKey: holdingsKey }),
  });
}
