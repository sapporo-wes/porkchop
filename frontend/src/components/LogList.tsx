import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import apiService from "../services/api";
import { ValidationLog } from "../types";

interface LogListProps {
  onError: (error: string) => void;
}

type RefreshStatus = "idle" | "loading" | "success";

const LogList: React.FC<LogListProps> = ({ onError }) => {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const [refreshStatus, setRefreshStatus] = useState<RefreshStatus>("idle");
  const pageSize = 10;

  const {
    data: logsData,
    isLoading: logsLoading,
    error: logsError,
    refetch,
  } = useQuery({
    queryKey: ["logs", currentPage, searchTerm],
    queryFn: () =>
      apiService.getValidationLogs(currentPage, pageSize, searchTerm),
  });

  const { data: logDetail, isLoading: detailLoading } = useQuery({
    queryKey: ["log-detail", selectedLogId],
    queryFn: () =>
      selectedLogId ? apiService.getValidationLogDetail(selectedLogId) : null,
    enabled: !!selectedLogId,
  });

  const handleViewDetail = (batchId: string) => {
    setSelectedLogId(batchId);
    setShowDetailModal(true);
  };

  const handleCloseDetail = () => {
    setSelectedLogId(null);
    setShowDetailModal(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
  };

  const handleRefresh = async () => {
    setRefreshStatus("loading");
    try {
      await refetch();
      setRefreshStatus("success");
      setTimeout(() => setRefreshStatus("idle"), 2000);
    } catch (error) {
      setRefreshStatus("idle");
      onError("更新に失敗しました");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "processing":
        return "bg-yellow-100 text-yellow-800";
      case "failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("ja-JP");
  };

  if (logsError) {
    onError("ログの取得に失敗しました");
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-bold text-gray-900">検証ログ一覧</h2>

            {/* 更新ボタン */}
            <button
              onClick={handleRefresh}
              disabled={
                refreshStatus === "loading" ||
                refreshStatus === "success" ||
                logsLoading
              }
              className={`flex items-center px-3 py-2 text-sm rounded-md focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                refreshStatus === "success"
                  ? "bg-green-100 text-green-700 focus:ring-green-500"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-500"
              }`}
            >
              <svg
                className={`h-4 w-4 mr-1 ${refreshStatus === "loading" ? "animate-spin" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {refreshStatus === "success" ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 13l4 4L19 7"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                )}
              </svg>
              {refreshStatus === "loading"
                ? "更新中..."
                : refreshStatus === "success"
                  ? "更新完了"
                  : "更新"}
            </button>
          </div>
          {/* 検索フォーム */}
          <form onSubmit={handleSearch} className="flex items-center space-x-2">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="検索..."
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              検索
            </button>
          </form>
        </div>

        {/* ログ一覧 */}
        {logsLoading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {logsData?.logs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                ログが見つかりませんでした
              </div>
            ) : (
              logsData?.logs.map((log: ValidationLog) => (
                <div
                  key={log.batch_id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(log.status)}`}
                      >
                        {log.status === "completed"
                          ? "完了"
                          : log.status === "processing"
                            ? "処理中"
                            : "失敗"}
                      </span>
                      <div>
                        <p className="text-sm text-gray-600">
                          {formatDate(log.created_at)}
                        </p>
                        <p className="text-sm text-gray-500">
                          {log.completed_files} / {log.total_files} ファイル
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      {log.average_score && (
                        <div className="text-right">
                          <p className="text-sm text-gray-600">平均スコア</p>
                          <p
                            className={`text-lg font-bold ${getScoreColor(log.average_score)}`}
                          >
                            {log.average_score}
                          </p>
                        </div>
                      )}

                      <button
                        onClick={() => handleViewDetail(log.batch_id)}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        詳細
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ページネーション */}
        {logsData && logsData.total > pageSize && (
          <div className="flex justify-center mt-6 space-x-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              前へ
            </button>

            <span className="px-3 py-1 text-sm text-gray-600">
              {currentPage} / {Math.ceil(logsData.total / pageSize)}
            </span>

            <button
              onClick={() => setCurrentPage((prev) => prev + 1)}
              disabled={currentPage >= Math.ceil(logsData.total / pageSize)}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              次へ
            </button>
          </div>
        )}
      </div>

      {/* 詳細モーダル */}
      {showDetailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-6xl max-h-[90vh] overflow-hidden flex flex-col w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                検証ログ詳細
              </h3>
              <button
                onClick={handleCloseDetail}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {detailLoading ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : logDetail ? (
                <div className="space-y-6">
                  {/* バッチ情報 */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">
                      バッチ情報
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">バッチID:</span>
                        <span className="ml-2 font-mono text-xs">
                          {logDetail.batch_id}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">作成日時:</span>
                        <span className="ml-2">
                          {formatDate(logDetail.created_at)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">ステータス:</span>
                        <span
                          className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(logDetail.status)}`}
                        >
                          {logDetail.status === "completed"
                            ? "完了"
                            : logDetail.status === "processing"
                              ? "処理中"
                              : "失敗"}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">ファイル数:</span>
                        <span className="ml-2">{logDetail.files.length}</span>
                      </div>
                    </div>
                  </div>

                  {/* ファイル詳細 */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">ファイル詳細</h4>
                    {logDetail.files.map((file) => (
                      <div
                        key={file.file_id}
                        className="border border-gray-200 rounded-lg p-4"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <h5 className="font-medium text-gray-900">
                              {file.filename}
                            </h5>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(file.status)}`}
                            >
                              {file.status === "completed"
                                ? "完了"
                                : file.status === "processing"
                                  ? "処理中"
                                  : "失敗"}
                            </span>
                          </div>
                          {file.score && (
                            <div className="text-right">
                              <span className="text-sm text-gray-600">
                                スコア:{" "}
                              </span>
                              <span
                                className={`text-lg font-bold ${getScoreColor(file.score)}`}
                              >
                                {file.score}
                              </span>
                            </div>
                          )}
                        </div>

                        {file.validation_result && (
                          <div className="space-y-3">
                            {/* 問題一覧 */}
                            {file.validation_result.issues &&
                              file.validation_result.issues.length > 0 && (
                                <div>
                                  <h6 className="text-sm font-medium text-gray-700 mb-2">
                                    検出された問題:
                                  </h6>
                                  <div className="space-y-2">
                                    {file.validation_result.issues.map(
                                      (issue, index) => (
                                        <div
                                          key={index}
                                          className="bg-gray-50 p-3 rounded"
                                        >
                                          <div className="flex items-center space-x-2 mb-1">
                                            <span
                                              className={`px-2 py-1 rounded text-xs font-medium ${
                                                issue.severity === "high"
                                                  ? "bg-red-100 text-red-800"
                                                  : issue.severity === "medium"
                                                    ? "bg-yellow-100 text-yellow-800"
                                                    : "bg-blue-100 text-blue-800"
                                              }`}
                                            >
                                              {issue.severity}
                                            </span>
                                            <span className="text-xs text-gray-600">
                                              {issue.type}
                                            </span>
                                            {issue.line && (
                                              <span className="text-xs text-gray-500">
                                                Line {issue.line}
                                              </span>
                                            )}
                                          </div>
                                          <p className="text-sm text-gray-700">
                                            {issue.message}
                                          </p>
                                        </div>
                                      )
                                    )}
                                  </div>
                                </div>
                              )}

                            {/* 推奨事項 */}
                            {file.validation_result.recommendations &&
                              file.validation_result.recommendations.length >
                                0 && (
                                <div>
                                  <h6 className="text-sm font-medium text-gray-700 mb-2">
                                    推奨事項:
                                  </h6>
                                  <ul className="text-sm text-gray-700 space-y-1">
                                    {file.validation_result.recommendations.map(
                                      (rec, index) => (
                                        <li
                                          key={index}
                                          className="flex items-start"
                                        >
                                          <span className="text-blue-600 mr-2">
                                            •
                                          </span>
                                          {rec}
                                        </li>
                                      )
                                    )}
                                  </ul>
                                </div>
                              )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  詳細情報を取得できませんでした
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={handleCloseDetail}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LogList;
