import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiGet, apiPost } from "@/lib/api";
import {
  analysisResponse,
  enqueueResponse,
  jobResponse,
  type AnalysisDocument,
  type Job,
} from "@/lib/api-types";
import { accountsKey } from "./accounts";

// useAnalysis fetches the latest result document for an account or the overall
// (all-scope) rollup. Pass an account id, or the literal "overall".
export function useAnalysis(target: string) {
  const path =
    target === "overall"
      ? "/api/analysis/overall/latest"
      : `/api/accounts/${target}/analysis/latest`;
  return useQuery({
    queryKey: ["analysis", target],
    queryFn: async (): Promise<AnalysisDocument | null> =>
      (await apiGet(path, analysisResponse)).result,
    enabled: Boolean(target),
  });
}

// useAnalysisJob polls a job while it is queued/running (1.5s), stopping once it
// reaches a terminal state. Pass undefined to disable.
export function useAnalysisJob(jobId: string | undefined) {
  return useQuery({
    queryKey: ["job", jobId],
    queryFn: async (): Promise<Job> => (await apiGet(`/api/analysis/jobs/${jobId}`, jobResponse)).job,
    enabled: Boolean(jobId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "queued" || status === "running" ? 1500 : false;
    },
  });
}

export function useAnalyzeAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (accountId: string) =>
      (await apiPost(`/api/accounts/${accountId}/analyze`, enqueueResponse)).job_ids,
    onSuccess: (_ids, accountId) => {
      qc.invalidateQueries({ queryKey: ["analysis", accountId] });
      qc.invalidateQueries({ queryKey: accountsKey });
    },
  });
}

export function useAnalyzeAll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => (await apiPost("/api/analyze/all", enqueueResponse)).job_ids,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["analysis", "overall"] }),
  });
}
