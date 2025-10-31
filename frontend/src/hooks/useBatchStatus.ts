import { useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "../services/api";
import { ValidationBatch } from "../types";
import { isTerminal, nextInterval } from "../utils";

type useBatchStatusOptions = {
  onComplete?: (batch: ValidationBatch) => void;
};

export function useBatchStatus(
  batchId: number | null,
  opts?: useBatchStatusOptions
) {
  const qc = useQueryClient();
  const attemptRef = useRef(0);

  type Batch = ValidationBatch | null;

  const {
    data: currentBatch,
    isFetching,
    refetch,
    error,
  } = useQuery<Batch, Error>({
    queryKey: ["validation-batch", batchId],
    enabled: batchId !== null,
    queryFn: async () => {
      if (batchId == null) return null;
      const b = await apiClient.getValidationLogDetail(batchId);

      if (isTerminal(b.status)) {
        attemptRef.current = 0;
        opts?.onComplete?.(b);
      } else {
        attemptRef.current += 1;
      }
      return b;
    },
    // 非終端中のみポーリング、終端で自動停止
    refetchInterval: (query) => {
      const data = query.state.data as Batch | undefined;
      return data && !isTerminal(data.status)
        ? nextInterval(attemptRef.current)
        : false;
    },
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 0,
  });

  const derived = useMemo(() => {
    const status = currentBatch?.status;
    const isCompleted = status === "completed";
    const isFailed = status === "failed";
    const isProcessing = status === "waiting" || status === "processing";

    const progress =
      currentBatch && currentBatch.total_prompts
        ? {
            completed: currentBatch.completed_prompts,
            total: currentBatch.total_prompts,
            percentage: Math.round(
              (currentBatch.completed_prompts / currentBatch.total_prompts) *
                100
            ),
          }
        : null;

    return { isCompleted, isFailed, isProcessing, progress };
  }, [currentBatch]);

  const reset = () => {
    if (batchId !== null) {
      qc.removeQueries({ queryKey: ["validation-batch", batchId] });
    }
    attemptRef.current = 0;
  };

  return {
    // data
    currentBatch,
    // status
    isFetching,
    isPolling:
      Boolean(batchId) && !isTerminal(currentBatch?.status) && isFetching,
    pollingIntervalHint:
      currentBatch && !isTerminal(currentBatch.status)
        ? nextInterval(Math.max(1, attemptRef.current))
        : null,
    ...derived,
    refetch,
    reset,
    error: error ?? null,
  };
}
