import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import apiClient from "../services/api";
import type { ValidationLogPagenated, ValidationBatch } from "../types";

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

  // ログ一覧取得
  const {
    data: logsData,
    isLoading: logsLoading,
    error: logsError,
    refetch,
  } = useQuery<ValidationLogPagenated, Error>({
    queryKey: ["logs", currentPage, searchTerm, pageSize],
    queryFn: () => apiClient.getValidationLogs(currentPage, pageSize, searchTerm),
    onError: (error: any) => {
      options.onError?.(error.message || "ログの取得に失敗しました");
    },
    keepPreviousData: true, // ページ切り替え時の体験向上
  });

  // ログ詳細取得
  const {
    data: logDetail,
    isLoading: detailLoading,
    error: detailError,
  } = useQuery<ValidationBatch, Error>({
    queryKey: ["log-detail", selectedLogId],
    queryFn: () => selectedLogId ? apiClient.getValidationLogDetail(selectedLogId) : Promise.reject(),
    enabled: !!selectedLogId,
    onError: (error: any) => {
      options.onError?.(error.message || "ログ詳細の取得に失敗しました");
    },
  });

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
  const changePage = useCallback((page: number) => {
    if (logsData && page >= 1 && page <= logsData.total_pages) {
      setCurrentPage(page);
    }
  }, [logsData]);

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
  }, []);

  /**
   * 検索状態のリセット
   */
  const resetSearch = useCallback(() => {
    setSearchTerm("");
    setCurrentPage(1);
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

    // 検索・ページネーション状態
    searchTerm,
    currentPage,
    refreshStatus,

    // 詳細モーダル状態
    selectedLogId,
    showDetailModal,

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

    // 計算値・状態情報
    paginationInfo,
    searchInfo,
  };
};