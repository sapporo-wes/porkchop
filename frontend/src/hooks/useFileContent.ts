import { useQuery } from "@tanstack/react-query";
import apiClient from "../services/api";
import type { ValidationFileContent } from "../types";

/**
 * ファイル内容取得のカスタムフック
 * - enabled: false で手動fetchのみ許可
 * - refetch()を使ってイベントハンドラ内で取得
 * - キャッシュで複数箇所（エクスポート、ファイル詳細表示）でデータ共有
 */
export const useFileContent = (fileIds?: number[]) => {
  const result = useQuery<ValidationFileContent, Error>({
    queryKey: ["file-content", fileIds?.sort().join(",")] as const,
    queryFn: () => apiClient.getFilesContent(fileIds!),
    enabled: false, // 自動fetchを無効化（手動refetchのみ）
    staleTime: 5 * 60 * 1000, // 5分間キャッシュ
  });

  return result;
};
