import React from "react";
import { FiX, FiMinus, FiMaximize2 } from "react-icons/fi";
import { useBatchStatus } from "../hooks/useBatchStatus";
import { useStatusColors } from "../hooks/useStatusColors";
import { useSeverityCounts } from "../hooks/useSeverityCounts";
import type { ValidationPromptResult } from "../types";

interface ValidationResultProps {
  batchId: number;
  onClose: () => void;
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
}

const ValidationResult: React.FC<ValidationResultProps> = ({
  batchId,
  onClose,
  isMinimized = false,
  onToggleMinimize,
}) => {
  const { currentBatch, isFetching, error, progress } = useBatchStatus(batchId);
  const colors = useStatusColors();
  const severityMethods = useSeverityCounts();

  // バッチ全体のSeverity数を計算
  const totalSeverityCounts = currentBatch
    ? severityMethods.calculateBatchSeverityCounts(currentBatch)
    : { high: 0, medium: 0, low: 0 };

  // プロンプト結果のレンダリング
  const renderPromptResult = (promptResult: ValidationPromptResult) => {
    const promptSummary = severityMethods.getPromptSummary(promptResult);

    return (
      <div
        key={`${promptResult.prompt.category}::${promptResult.prompt.name}`}
        className="border border-gray-200 rounded-lg p-4 space-y-3"
      >
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <h4 className="text-lg font-medium text-gray-900">
              {promptResult.prompt.category}::{promptResult.prompt.name}
            </h4>
            {promptResult.prompt.description && (
              <p className="text-sm text-gray-600">
                {promptResult.prompt.description}
              </p>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${colors.getStatusColor(promptResult.status)}`}
            >
              {colors.getStatusText(promptResult.status)}
            </span>
            {promptSummary.isCompleted && (
              <div className="flex items-center space-x-2">
                <span
                  className={`text-xs font-bold ${colors.getSeverityTextColor("high")}`}
                >
                  H:{promptSummary.severityCounts.high}
                </span>
                <span
                  className={`text-xs font-bold ${colors.getSeverityTextColor("medium")}`}
                >
                  M:{promptSummary.severityCounts.medium}
                </span>
                <span
                  className={`text-xs font-bold ${colors.getSeverityTextColor("low")}`}
                >
                  L:{promptSummary.severityCounts.low}
                </span>
              </div>
            )}
          </div>
        </div>

        {promptSummary.isProcessing && (
          <div className="flex items-center space-x-2 text-gray-600">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-blue-600"></div>
            <span className="text-sm">分析中...</span>
          </div>
        )}

        {promptSummary.isFailed && (
          <div className="text-red-600 text-sm">
            エラー: {promptResult.error_message || "不明なエラーが発生しました"}
          </div>
        )}

        {promptSummary.isCompleted && promptResult.result && (
          <div className="space-y-4">
            {promptSummary.hasIssues ? (
              <div className="space-y-3">
                <h5 className="text-sm font-medium text-gray-900">
                  検出された問題 ({promptSummary.totalIssues}件)
                </h5>
                <div className="space-y-2">
                  {promptResult.result.map((issue, index) => (
                    <div
                      key={index}
                      className="border-l-4 border-gray-200 pl-4 py-2"
                    >
                      <div className="flex items-start space-x-2">
                        <span className="text-lg">
                          {colors.getTypeIcon(issue.type)}
                        </span>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center space-x-2">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${colors.getSeverityColor(issue.severity)}`}
                            >
                              {colors.getSeverityText(issue.severity)}
                            </span>
                            {issue.lines && issue.lines.length > 0 && (
                              <span className="text-xs text-gray-500">
                                行 {issue.lines.join(", ")}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-800">
                            {issue.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-green-600 text-sm">
                ✅ 問題は検出されませんでした
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // ローディング状態
  if (isFetching && !currentBatch) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <div className="bg-white rounded-lg shadow-lg border p-4 max-w-sm">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
            <span className="text-sm">検証状況を確認中...</span>
          </div>
        </div>
      </div>
    );
  }

  // エラー状態
  if (error) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <div className="bg-white rounded-lg shadow-lg border p-4 max-w-sm">
          <div className="text-red-600 text-center space-y-2">
            <p className="text-sm">エラーが発生しました</p>
            <button
              onClick={onClose}
              className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
            >
              閉じる
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentBatch) return null;

  // ミニマイズ表示
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <div className="bg-white rounded-lg shadow-lg border p-3 max-w-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1">
                {currentBatch.status === "processing" && (
                  <div className="animate-spin rounded-full h-3 w-3 border-2 border-blue-600 border-t-transparent"></div>
                )}
                <span className="text-xs text-gray-600">
                  {currentBatch.completed_prompts}/{currentBatch.total_prompts}
                </span>
              </div>
              <div className="w-16 bg-gray-200 rounded-full h-1">
                <div
                  className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                  style={{ width: `${progress?.percentage || 0}%` }}
                />
              </div>
            </div>
            <div className="flex items-center space-x-1 ml-2">
              {onToggleMinimize && (
                <button
                  onClick={onToggleMinimize}
                  className="text-gray-400 hover:text-gray-600"
                  title="展開"
                >
                  <FiMaximize2 className="h-3 w-3" />
                </button>
              )}
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
                title="閉じる"
              >
                <FiX className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // フル表示
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">検証結果</h3>
            <div className="flex items-center space-x-2">
              {onToggleMinimize && (
                <button
                  onClick={onToggleMinimize}
                  className="text-gray-400 hover:text-gray-600 p-1"
                  title="最小化"
                >
                  <FiMinus className="h-5 w-5" />
                </button>
              )}
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <FiX className="h-6 w-6" />
              </button>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                進捗: {currentBatch.completed_prompts} /{" "}
                {currentBatch.total_prompts} プロンプト
              </span>
              <span
                className={`px-2 py-1 rounded text-xs font-medium ${colors.getStatusColor(currentBatch.status)}`}
              >
                {colors.getStatusText(currentBatch.status)}
              </span>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress?.percentage || 0}%` }}
              />
            </div>

            {/* 全体のSeverity数表示 */}
            {currentBatch.status === "completed" && (
              <div className="flex justify-center space-x-4">
                <div className="flex items-center space-x-1">
                  <span className="text-sm text-gray-600">High:</span>
                  <span
                    className={`text-sm font-bold ${colors.getSeverityTextColor("high")}`}
                  >
                    {totalSeverityCounts.high}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-sm text-gray-600">Medium:</span>
                  <span
                    className={`text-sm font-bold ${colors.getSeverityTextColor("medium")}`}
                  >
                    {totalSeverityCounts.medium}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-sm text-gray-600">Low:</span>
                  <span
                    className={`text-sm font-bold ${colors.getSeverityTextColor("low")}`}
                  >
                    {totalSeverityCounts.low}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 max-h-[calc(90vh-200px)] overflow-y-auto space-y-4">
          {currentBatch.prompt_results.map(renderPromptResult)}
        </div>
      </div>
    </div>
  );
};

export default ValidationResult;
