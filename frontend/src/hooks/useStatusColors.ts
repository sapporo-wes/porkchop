import { useMemo } from "react";
import type { Severity, Status, IssueType, ValidationBatch } from "../types";

function getBatchStatusConsolidatedStatus(batch: ValidationBatch): Status {
  switch (batch.status) {
    case "completed":
      const anyFailed: boolean = batch.prompt_results.some(
        (issue) => issue.status === "failed"
      );
      return anyFailed ? "failed" : "completed";
    case "failed":
    case "processing":
    case "waiting":
      return batch.status;
  }
}

/**
 * ステータス、重要度、ファイルタイプに対応するTailwindCSSクラスを提供するカスタムフック
 */
export const useStatusColors = () => {
  const statusColors = useMemo(
    () => ({
      /**
       * バッチ・ファイルのステータスに対応する色クラス
       */
      getIssueStatusColor: (status: Status): string => {
        switch (status) {
          case "completed":
            return "bg-green-100 text-green-800";
          case "failed":
            return "bg-red-100 text-red-800";
          case "processing":
          case "waiting":
            return "bg-yellow-100 text-yellow-800";
          default:
            return "bg-gray-100 text-gray-800";
        }
      },

      getBatchStatusColor: (batch: ValidationBatch): string => {
        const consolidatedStatus = getBatchStatusConsolidatedStatus(batch);
        switch (consolidatedStatus) {
          case "completed":
            return "bg-green-100 text-green-800";
          case "failed":
            return "bg-red-100 text-red-800";
          case "processing":
          case "waiting":
            return "bg-yellow-100 text-yellow-800";
          default:
            return "bg-gray-100 text-gray-800";
        }
      },

      /**
       * Issueのステータステキストを取得
       */
      getIssueStatusText: (status: Status): string => {
        switch (status) {
          case "completed":
            return "完了";
          case "failed":
            return "失敗";
          case "processing":
            return "処理中";
          case "waiting":
            return "待機中";
          default:
            return "不明";
        }
      },

      /**
       * Batchのステータステキストを取得
       */
      getBatchStatusText: (batch: ValidationBatch): string => {
        const consolidatedStatus = getBatchStatusConsolidatedStatus(batch);
        switch (consolidatedStatus) {
          case "completed":
            return "完了";
          case "failed":
            return "失敗";
          case "processing":
            return "処理中";
          case "waiting":
            return "待機中";
          default:
            return "不明";
        }
      },

      /**
       * 重要度（Severity）に対応する色クラス
       */
      getSeverityColor: (severity: Severity): string => {
        switch (severity) {
          case "high":
            return "bg-red-100 text-red-800";
          case "medium":
            return "bg-yellow-100 text-yellow-800";
          case "low":
            return "bg-blue-100 text-blue-800";
          default:
            return "bg-gray-100 text-gray-800";
        }
      },

      /**
       * 重要度の日本語テキスト
       */
      getSeverityText: (severity: Severity): string => {
        switch (severity) {
          case "high":
            return "高";
          case "medium":
            return "中";
          case "low":
            return "低";
          default:
            return "不明";
        }
      },

      /**
       * ファイル拡張子に対応する色クラス（ファイルタイプ識別用）
       */
      getFileTypeColor: (filename: string): string => {
        const ext = filename.split(".").pop()?.toLowerCase();
        switch (ext) {
          case "yml":
          case "yaml":
            return "bg-blue-100 text-blue-800";
          case "cwl":
            return "bg-indigo-100 text-indigo-800";
          case "sh":
            return "bg-green-100 text-green-800";
          case "c":
          case "h":
            return "bg-purple-100 text-purple-800";
          case "py":
            return "bg-yellow-100 text-yellow-800";
          case "js":
          case "ts":
            return "bg-orange-100 text-orange-800";
          case "json":
            return "bg-gray-100 text-gray-800";
          case "toml":
            return "bg-pink-100 text-pink-800";
          case "md":
            return "bg-cyan-100 text-cyan-800";
          case "txt":
            return "bg-slate-100 text-slate-800";
          default:
            return "bg-gray-100 text-gray-800";
        }
      },

      /**
       * リフレッシュ状態に対応する色クラス
       */
      getRefreshStatusColor: (
        status: "idle" | "loading" | "success"
      ): string => {
        switch (status) {
          case "success":
            return "bg-green-100 text-green-700 focus:ring-green-500";
          case "loading":
            return "bg-blue-100 text-blue-700 focus:ring-blue-500";
          case "idle":
          default:
            return "bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-500";
        }
      },

      /**
       * 問題のタイプに対応するアイコン
       */
      getTypeIcon: (type: IssueType): string => {
        switch (type) {
          case "security":
            return "🔒";
          case "quality":
            return "⚡";
          case "best_practice":
            return "📋";
          default:
            return "❓";
        }
      },

      /**
       * Severityに対応する色（テキストのみ）
       */
      getSeverityTextColor: (severity: Severity): string => {
        switch (severity) {
          case "high":
            return "text-red-600";
          case "medium":
            return "text-yellow-600";
          case "low":
            return "text-blue-600";
          default:
            return "text-gray-600";
        }
      },
    }),
    []
  );

  return statusColors;
};
