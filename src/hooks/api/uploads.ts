import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiUpload } from "@/lib/api";
import { createUploadResponse } from "@/lib/api-types";
import { accountsKey } from "./accounts";

// useUploadCsv posts a CSV to the account's uploads endpoint and returns the
// upload record plus the enqueued analysis job ids to poll.
export function useUploadCsv(accountId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) =>
      apiUpload(`/api/accounts/${accountId}/uploads`, createUploadResponse, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions", accountId] });
      qc.invalidateQueries({ queryKey: accountsKey });
    },
  });
}
