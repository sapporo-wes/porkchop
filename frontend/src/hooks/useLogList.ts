import { useEffect, useState, useCallback } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import apiClient from "../services/api";
import {
  ValidationLogPaginated,
  ValidationBatch,
  PromptInfo,
  ValidationIssue,
  SeverityOrder,
} from "../types";

type RefreshStatus = "idle" | "loading" | "success";

type UseLogListOptions = {
  onError?: (message: string) => void;
  pageSize?: number;
};

/**
 * ログ一覧管理のカスタムフック
 * - ログ一覧取得（ページネーション対応）
 * - 検索機能
 * - リフレッシュ機能
 * - 詳細モーダル管理
 */
export const useLogList = (options: UseLogListOptions = {}) => {
  const { pageSize = 20 } = options;

  // 検索・ページネーション状態
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [refreshStatus, setRefreshStatus] = useState<RefreshStatus>("idle");

  // 詳細モーダル状態
  const [selectedLogId, setSelectedLogId] = useState<number | null>(null);
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);

  // High Severityフィルター状態
  const [promptFilterMap, setPromptFilterMap] = useState<Map<string, boolean>>(
    new Map()
  );
  const [isGlobalFilterActive, setIsGlobalFilterActive] =
    useState<boolean>(false);

  // 折りたたみ状態
  const [promptCollapseMap, setPromptCollapseMap] = useState<
    Map<string, boolean>
  >(new Map());

  // ログ一覧取得
  const {
    data: logsData,
    isLoading: logsLoading,
    isError: isLogsError,
    error: logsError,
    refetch,
  } = useQuery<ValidationLogPaginated, Error>({
    queryKey: ["logs", currentPage, searchTerm, pageSize] as const,
    queryFn: () =>
      apiClient.getValidationLogs(currentPage, pageSize, searchTerm),
    // keepPreviousData: true, // ページ切り替え時の体験向上
    placeholderData: keepPreviousData,
  });
  useEffect(() => {
    if (!isLogsError) return;
    const msg = logsError?.message ?? "ログ一覧の取得に失敗しました";
    options.onError?.(msg);
  }, [isLogsError, logsError, options]);

  // ログ詳細取得
  const {
    data: logDetail,
    isLoading: detailLoading,
    isError: isDetailError,
    error: detailError,
  } = useQuery<ValidationBatch, Error>({
    queryKey: ["log-detail", selectedLogId] as const,
    queryFn: () => apiClient.getValidationLogDetail(selectedLogId!),
    enabled: !!selectedLogId,
  });
  useEffect(() => {
    if (!isDetailError) return;
    const msg = detailError?.message ?? "ログ詳細の取得に失敗しました";
    options.onError?.(msg);
  }, [isDetailError, detailError, options]);

  /**
   * 検索実行
   */
  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1); // 検索時は1ページ目に戻る
  }, []);

  /**
   * 検索テキスト変更
   */
  const updateSearchTerm = useCallback((term: string) => {
    setSearchTerm(term);
  }, []);

  /**
   * ページ変更
   */
  const changePage = useCallback(
    (page: number) => {
      if (logsData && page >= 1 && page <= logsData.total_pages) {
        setCurrentPage(page);
      }
    },
    [logsData]
  );

  /**
   * 前のページへ
   */
  const goToPreviousPage = useCallback(() => {
    changePage(currentPage - 1);
  }, [currentPage, changePage]);

  /**
   * 次のページへ
   */
  const goToNextPage = useCallback(() => {
    changePage(currentPage + 1);
  }, [currentPage, changePage]);

  /**
   * リフレッシュ実行
   */
  const handleRefresh = useCallback(async () => {
    setRefreshStatus("loading");
    try {
      await refetch();
      setRefreshStatus("success");
      // 2秒後にアイドル状態に戻す
      setTimeout(() => setRefreshStatus("idle"), 2000);
    } catch (error) {
      setRefreshStatus("idle");
      options.onError?.("更新に失敗しました");
    }
  }, [refetch, options]);

  /**
   * 詳細表示
   */
  const handleViewDetail = useCallback((batchId: number) => {
    setSelectedLogId(batchId);
    setShowDetailModal(true);
  }, []);

  /**
   * 詳細モーダルを閉じる
   */
  const handleCloseDetail = useCallback(() => {
    setSelectedLogId(null);
    setShowDetailModal(false);
    // フィルター状態をリセット
    setPromptFilterMap(new Map());
    setIsGlobalFilterActive(false);
    // 折りたたみ状態をリセット
    setPromptCollapseMap(new Map());
  }, []);

  /**
   * 検索状態のリセット
   */
  const resetSearch = useCallback(() => {
    setSearchTerm("");
    setCurrentPage(1);
  }, []);

  /**
   * プロンプト識別キーを生成
   */
  const getPromptKey = useCallback((prompt: PromptInfo): string => {
    return `${prompt.category}::${prompt.name}`;
  }, []);

  /**
   * 個別プロンプトのフィルター状態を取得
   */
  const getPromptFilterState = useCallback(
    (promptKey: string): boolean => {
      return promptFilterMap.get(promptKey) || isGlobalFilterActive;
    },
    [promptFilterMap, isGlobalFilterActive]
  );

  /**
   * 個別プロンプトのフィルターを切り替え
   */
  const togglePromptFilter = useCallback((promptKey: string) => {
    setPromptFilterMap((prev) => {
      const newMap = new Map(prev);
      const currentState = newMap.get(promptKey) || false;
      newMap.set(promptKey, !currentState);
      return newMap;
    });
  }, []);

  /**
   * 一括フィルターを切り替え
   */
  const toggleGlobalFilter = useCallback(() => {
    setIsGlobalFilterActive((prev) => !prev);
    // 一括フィルターをONにする際は、個別フィルターをリセット
    if (!isGlobalFilterActive) {
      setPromptFilterMap(new Map());
    }
  }, [isGlobalFilterActive]);

  /**
   * フィルターフラグに応じてissue配列を取得
   */
  const getFilteredIssues = useCallback(
    (promptKey: string, issues: ValidationIssue[]): ValidationIssue[] => {
      const isFilterActive = getPromptFilterState(promptKey);

      const filtered = isFilterActive
        ? issues.filter((issue) => issue.severity === "high")
        : issues;

      return [...filtered].sort(
        (a, b) => SeverityOrder[a.severity] - SeverityOrder[b.severity]
      );
    },
    [getPromptFilterState]
  );

  /**
   * プロンプトが折りたたまれているかを取得
   */
  const isPromptCollapsed = useCallback(
    (promptKey: string): boolean => {
      return promptCollapseMap.get(promptKey) || false;
    },
    [promptCollapseMap]
  );

  /**
   * プロンプトの折りたたみ状態を切り替え
   */
  const togglePromptCollapse = useCallback((promptKey: string) => {
    setPromptCollapseMap((prev) => {
      const newMap = new Map(prev);
      const currentState = newMap.get(promptKey) || false;
      newMap.set(promptKey, !currentState);
      return newMap;
    });
  }, []);

  /**
   * ページネーション情報
   */
  const paginationInfo = {
    currentPage: logsData?.curr_page || currentPage,
    totalPages: logsData?.total_pages || 1,
    perPage: logsData?.per_page || pageSize,
    total: logsData?.total || 0,
    hasNext: logsData?.has_next || false,
    hasPrev: logsData?.has_prev || false,
    isFirstPage: currentPage === 1,
    isLastPage: currentPage === (logsData?.total_pages || 1),
  };

  /**
   * 検索状態の情報
   */
  const searchInfo = {
    isSearching: searchTerm.length > 0,
    hasResults: logsData && logsData.logs.length > 0,
    isEmpty: logsData && logsData.logs.length === 0,
    resultCount: logsData?.logs.length || 0,
  };

  return {
    // データ
    logsData,
    logDetail,

    // error
    logsError,
    detailError,

    // 検索・ページネーション状態
    searchTerm,
    currentPage,
    refreshStatus,

    // 詳細モーダル状態
    selectedLogId,
    showDetailModal,

    // Severityフィルター状態
    isGlobalFilterActive,

    // ローディング・エラー状態
    logsLoading,
    detailLoading,
    error: logsError?.message || detailError?.message || null,

    // 検索操作
    handleSearch,
    updateSearchTerm,
    resetSearch,

    // ページネーション操作
    changePage,
    goToPreviousPage,
    goToNextPage,

    // その他の操作
    handleRefresh,
    handleViewDetail,
    handleCloseDetail,
    refetch,

    // Severityフィルター操作
    getPromptKey,
    getPromptFilterState,
    togglePromptFilter,
    toggleGlobalFilter,
    getFilteredIssues,

    // 折りたたみ操作
    isPromptCollapsed,
    togglePromptCollapse,

    // 計算値・状態情報
    paginationInfo,
    searchInfo,
  };
};
