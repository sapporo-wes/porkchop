import { useMemo } from "react";
import type { ValidationBatch, ValidationPromptResult, Severity } from "../types";

export interface SeverityCounts {
  high: number;
  medium: number;
  low: number;
}

export interface PromptSeverityMatrix {
  [promptKey: string]: SeverityCounts;
}

/**
 * Severity数集計ロジックを提供するカスタムフック
 * 新API仕様に対応：スコアは削除され、Severityカウントが主要指標
 */
export const useSeverityCounts = () => {
  const severityCountMethods = useMemo(() => ({
    /**
     * 単一プロンプト結果のSeverity数を集計
     */
    calculatePromptSeverityCounts: (promptResult: ValidationPromptResult): SeverityCounts => {
      const counts: SeverityCounts = { high: 0, medium: 0, low: 0 };

      if (promptResult.status === "completed" && promptResult.result) {
        promptResult.result.forEach(issue => {
          counts[issue.severity]++;
        });
      }

      return counts;
    },

    /**
     * バッチ全体のSeverity数を集計（全プロンプト結果の合計）
     */
    calculateBatchSeverityCounts: (batch: ValidationBatch): SeverityCounts => {
      const counts: SeverityCounts = { high: 0, medium: 0, low: 0 };

      batch.prompt_results.forEach(promptResult => {
        if (promptResult.status === "completed" && promptResult.result) {
          promptResult.result.forEach(issue => {
            counts[issue.severity]++;
          });
        }
      });

      return counts;
    },

    /**
     * プロンプト別Severityマトリックスを作成
     * ログ詳細で「どのプロンプトでそれぞれのSeverityのissueがどれだけでたか」を表示するため
     */
    createPromptSeverityMatrix: (batch: ValidationBatch): PromptSeverityMatrix => {
      const matrix: PromptSeverityMatrix = {};

      batch.prompt_results.forEach(promptResult => {
        const promptKey = `${promptResult.prompt.category}::${promptResult.prompt.name}`;
        matrix[promptKey] = severityCountMethods.calculatePromptSeverityCounts(promptResult);
      });

      return matrix;
    },

    /**
     * Severity数の合計を計算
     */
    getTotalIssueCount: (counts: SeverityCounts): number => {
      return counts.high + counts.medium + counts.low;
    },

    /**
     * 空のSeverityカウントかどうか判定
     */
    isEmpty: (counts: SeverityCounts): boolean => {
      return counts.high === 0 && counts.medium === 0 && counts.low === 0;
    },

    /**
     * 最も重要度の高いSeverityを取得
     */
    getHighestSeverity: (counts: SeverityCounts): Severity | null => {
      if (counts.high > 0) return "high";
      if (counts.medium > 0) return "medium";
      if (counts.low > 0) return "low";
      return null;
    },

    /**
     * Severity数を配列形式で取得（UI表示用）
     */
    toArray: (counts: SeverityCounts): Array<{ severity: Severity; count: number }> => {
      return [
        { severity: "high" as Severity, count: counts.high },
        { severity: "medium" as Severity, count: counts.medium },
        { severity: "low" as Severity, count: counts.low },
      ];
    },

    /**
     * Severity数を文字列形式で取得（例：H:5 M:2 L:1）
     */
    toString: (counts: SeverityCounts): string => {
      return `H:${counts.high} M:${counts.medium} L:${counts.low}`;
    },

    /**
     * 2つのSeverityカウントを加算
     */
    addCounts: (counts1: SeverityCounts, counts2: SeverityCounts): SeverityCounts => {
      return {
        high: counts1.high + counts2.high,
        medium: counts1.medium + counts2.medium,
        low: counts1.low + counts2.low,
      };
    },

    /**
     * バッチ一覧表示用のサマリー情報を生成
     */
    getBatchSummary: (batch: ValidationBatch) => {
      const severityCounts = severityCountMethods.calculateBatchSeverityCounts(batch);
      const totalIssues = severityCountMethods.getTotalIssueCount(severityCounts);
      const completedPrompts = batch.prompt_results.filter(p => p.status === "completed").length;

      return {
        severityCounts,
        totalIssues,
        completedPrompts,
        totalPrompts: batch.total_prompts,
        hasIssues: totalIssues > 0,
        highestSeverity: severityCountMethods.getHighestSeverity(severityCounts),
      };
    },

    /**
     * プロンプト別サマリー情報を生成
     */
    getPromptSummary: (promptResult: ValidationPromptResult) => {
      const severityCounts = severityCountMethods.calculatePromptSeverityCounts(promptResult);
      const totalIssues = severityCountMethods.getTotalIssueCount(severityCounts);

      return {
        severityCounts,
        totalIssues,
        hasIssues: totalIssues > 0,
        highestSeverity: severityCountMethods.getHighestSeverity(severityCounts),
        isCompleted: promptResult.status === "completed",
        isFailed: promptResult.status === "failed",
        isProcessing: promptResult.status === "processing" || promptResult.status === "waiting",
      };
    },
  }), []);

  return severityCountMethods;
};