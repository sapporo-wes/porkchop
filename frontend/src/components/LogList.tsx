import { ValidationBatch } from "../types";
import { useLogList } from "../hooks/useLogList";
import { useStatusColors } from "../hooks/useStatusColors";
import { useSeverityCounts } from "../hooks/useSeverityCounts";
import { useMarkdownExport } from "../hooks/useMarkdownExport";
import type { PromptInfo } from "../types";

interface LogListProps {
  onError: (error: string) => void;
}

const LogList: React.FC<LogListProps> = ({ onError }) => {
  const pageSize = 10;

  const {
    logsData,
    logsLoading,
    logsError,
    showDetailModal,
    logDetail,
    detailLoading,
    refreshStatus,
    handleRefresh,
    handleViewDetail,
    handleCloseDetail,
  } = useLogList({ onError, pageSize });

  const colors = useStatusColors();
  const severityMethods = useSeverityCounts();

  const { exportToMarkdown } = useMarkdownExport();

  const handleQuickExport = function (log: ValidationBatch) {
    exportToMarkdown(log, `porkchop_report_${log.id}.md`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("ja-JP");
  };

  const promptInfoToString = (promptInfo: PromptInfo) => {
    // return `${promptInfo.name} (${promptInfo.category})`;
    return `${promptInfo.category}::${promptInfo.name}`;
  };

  if (logsError) {
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
          {/* TODO: 検索機能は将来実装 */}
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
              logsData?.logs.map((log: ValidationBatch) => (
                <div
                  key={log.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  {/* <div className="flex items-center justify-between"> */}
                  <div className="flex items-center justify-start gap-4">
                    <div className="flex items-center space-x-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${colors.getStatusColor(log.status)}`}
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
                          {log.completed_prompts} / {log.total_prompts}{" "}
                          プロンプト
                        </p>
                      </div>
                    </div>

                    <div className="text-medium text-gray-900">
                      <p>{log.name}</p>
                    </div>

                    <div className="flex items-center space-x-4 ml-auto">
                      {log.status === "completed" &&
                        (() => {
                          const severityCounts =
                            severityMethods.calculateBatchSeverityCounts(log);
                          return (
                            <div className="text-right">
                              <p className="text-sm text-gray-600 mb-1">
                                Severity数
                              </p>
                              <div className="flex items-center space-x-2 text-xs font-medium">
                                <span
                                  className={colors.getSeverityColor("high")}
                                >
                                  H:{severityCounts.high}
                                </span>
                                <span
                                  className={colors.getSeverityColor("medium")}
                                >
                                  M:{severityCounts.medium}
                                </span>
                                <span
                                  className={colors.getSeverityColor("low")}
                                >
                                  L:{severityCounts.low}
                                </span>
                              </div>
                            </div>
                          );
                        })()}

                      <button
                        onClick={() => handleViewDetail(log.id)}
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

        {/* TODO: ページネーションは将来実装 */}
      </div>

      {/* 詳細モーダル */}
      {showDetailModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-6xl max-h-[90vh] overflow-hidden flex flex-col w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <h3 className="text-lg font-medium text-gray-900">
                  検証ログ詳細
                </h3>
                {logDetail && (
                  <span className="text-base font-medium text-gray-600">
                    {logDetail.name}
                  </span>
                )}
              </div>
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
                          {logDetail.id}
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
                          className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${colors.getStatusColor((logDetail as ValidationBatch).status)}`}
                        >
                          {(logDetail as ValidationBatch).status === "completed"
                            ? "完了"
                            : (logDetail as ValidationBatch).status ===
                                "processing"
                              ? "処理中"
                              : "失敗"}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">更新日時:</span>
                        <span className="ml-2">
                          {formatDate(logDetail.updated_at)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">ファイル数:</span>
                        <span className="ml-2">
                          {(logDetail as ValidationBatch).file_ids.length}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">
                      ファイル一覧
                    </h4>
                    TODO
                  </div>

                  {/* プロンプト別Severity集計 */}
                  {(logDetail as ValidationBatch).completed_prompts > 0 && (
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-3">
                        プロンプト別Severity集計
                      </h4>
                      <div className="space-y-2">
                        {(logDetail as ValidationBatch).prompt_results.map(
                          (promptResult) => {
                            const severityCounts =
                              severityMethods.calculatePromptSeverityCounts(
                                promptResult
                              );
                            return (
                              <div
                                key={promptInfoToString(promptResult.prompt)}
                                className="flex items-center justify-between bg-white px-3 py-2 rounded"
                              >
                                <div className="flex items-center space-x-3">
                                  <span className="text-sm font-medium text-gray-900">
                                    {promptInfoToString(promptResult.prompt)}
                                  </span>
                                  <span
                                    className={`px-2 py-1 rounded-full text-xs font-medium ${colors.getStatusColor(promptResult.status)}`}
                                  >
                                    {promptResult.status === "completed"
                                      ? "完了"
                                      : promptResult.status === "processing"
                                        ? "処理中"
                                        : "失敗"}
                                  </span>
                                </div>
                                {promptResult.status === "completed" && (
                                  <div className="flex items-center space-x-2 text-xs font-medium">
                                    <span
                                      className={colors.getSeverityColor(
                                        "high"
                                      )}
                                    >
                                      H:{severityCounts.high}
                                    </span>
                                    <span
                                      className={colors.getSeverityColor(
                                        "medium"
                                      )}
                                    >
                                      M:{severityCounts.medium}
                                    </span>
                                    <span
                                      className={colors.getSeverityColor("low")}
                                    >
                                      L:{severityCounts.low}
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          }
                        )}
                      </div>
                    </div>
                  )}

                  {/* Issue詳細（全プロンプト結果を統合表示） */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">
                      検出されたIssue
                    </h4>
                    {(logDetail as ValidationBatch).prompt_results.map(
                      (promptResult) => {
                        if (
                          promptResult.status !== "completed" ||
                          !promptResult.result ||
                          promptResult.result.length === 0
                        ) {
                          return null;
                        }

                        return (
                          <div
                            key={promptInfoToString(promptResult.prompt)}
                            className="border border-gray-200 rounded-lg p-4"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <h5 className="font-medium text-gray-900">
                                {promptInfoToString(promptResult.prompt)}
                              </h5>
                              <div className="flex items-center space-x-2 text-xs font-medium">
                                <span
                                  className={colors.getSeverityColor("high")}
                                >
                                  H:
                                  {
                                    promptResult.result.filter(
                                      (i) => i.severity === "high"
                                    ).length
                                  }
                                </span>
                                <span
                                  className={colors.getSeverityColor("medium")}
                                >
                                  M:
                                  {
                                    promptResult.result.filter(
                                      (i) => i.severity === "medium"
                                    ).length
                                  }
                                </span>
                                <span
                                  className={colors.getSeverityColor("low")}
                                >
                                  L:
                                  {
                                    promptResult.result.filter(
                                      (i) => i.severity === "low"
                                    ).length
                                  }
                                </span>
                              </div>
                            </div>

                            <div className="space-y-2">
                              {promptResult.result.map((issue, index) => (
                                <div
                                  key={index}
                                  className="bg-gray-50 p-3 rounded"
                                >
                                  <div className="flex items-center space-x-2 mb-1">
                                    <span
                                      className={`px-2 py-1 rounded text-xs font-medium ${colors.getSeverityColor(issue.severity)}`}
                                    >
                                      {issue.severity}
                                    </span>
                                    <span className="text-xs text-gray-600">
                                      {issue.type}
                                    </span>
                                    {issue.lines && issue.lines.length > 0 && (
                                      <span className="text-xs text-gray-500">
                                        Lines: {issue.lines.join(", ")}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-700">
                                    {issue.description}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  詳細情報を取得できませんでした
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              {logDetail !== undefined && (
                <button
                  onClick={() => handleQuickExport(logDetail)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  EXport
                </button>
              )}

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
