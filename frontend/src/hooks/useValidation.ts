import { useMutation } from "@tanstack/react-query";
import apiClient from "../services/api";
import { ValidationBatch } from "../types";

type UseValidationOptions = {
  onUploadSuccess?: (batch: ValidationBatch) => void;
  onUploadError?: (message: string) => void;
};

export const useValidation = (options: UseValidationOptions = {}) => {
  const mutation = useMutation<
    ValidationBatch,
    Error,
    { files: File[]; promptCategoryNames: string[] }
  >({
    mutationFn: ({ files, promptCategoryNames }) =>
      apiClient.uploadFiles(files, promptCategoryNames),
    onSuccess: (batch) => options.onUploadSuccess?.(batch),
    onError: (error: any) =>
      options.onUploadError?.(error.message || "不明なエラーが発生しました"),
  });

  return {
    uploadFiles: mutation.mutate,
    uploadFilesAsync: mutation.mutateAsync,
    isUploading: mutation.isPending,
    error: mutation.error ?? null,
  };
};
