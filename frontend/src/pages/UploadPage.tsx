import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import FileUpload from "../components/FileUpload";
import ValidationResult from "../components/ValidationResult";
import apiService from "../services/api";
import { ValidationBatch } from "../types";

export default function UploadPage() {
  const [currentBatch, setCurrentBatch] = useState<ValidationBatch | null>(
    null
  );
  const [showResults, setShowResults] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 進行中のバッチを取得（ブラウザリロード時の復旧用）
  const { data: activeBatches } = useQuery({
    queryKey: ["active-batches"],
    queryFn: apiService.getActiveBatches,
    refetchOnMount: true,
    enabled: !currentBatch, // 既に進行中のバッチがある場合は実行しない
  });

  // アプリ起動時に進行中のバッチを復旧
  useEffect(() => {
    if (activeBatches && activeBatches.length > 0 && !currentBatch) {
      // 最新の進行中バッチを復旧
      const latestActiveBatch = activeBatches[0];
      // ValidationBatch形式に変換
      const restoredBatch: ValidationBatch = {
        batch_id: latestActiveBatch.batch_id,
        status: latestActiveBatch.status,
        total_files: latestActiveBatch.total_files,
        completed_files: latestActiveBatch.completed_files,
        files: [], // 詳細はValidationResultコンポーネントで取得
        created_at: latestActiveBatch.created_at,
      };
      setCurrentBatch(restoredBatch);
      setShowResults(true);
      setIsMinimized(true); // 復旧時は最小化して表示
    }
  }, [activeBatches, currentBatch]);

  const handleUploadSuccess = (batch: ValidationBatch) => {
    setCurrentBatch(batch);
    setShowResults(true);
    setIsMinimized(false);
    setError(null);
  };

  const handleUploadError = (errorMessage: string) => {
    setError(errorMessage);
    setCurrentBatch(null);
    setShowResults(false);
    setIsMinimized(false);
  };

  const handleCloseResults = () => {
    setShowResults(false);
    setCurrentBatch(null);
    setIsMinimized(false);
  };

  const handleToggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  return (
    <>
      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <svg
              className="h-5 w-5 text-red-400 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-red-800">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-600"
            >
              <svg
                className="h-4 w-4"
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
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            ファイルアップロード
          </h2>
          <p className="text-gray-600 text-sm">
            検証したいワークフローファイルやコードファイルを選択してください。
            YAML、CWL、Shell、C、Python、JavaScript、TypeScript、JSONなどに対応しています。
          </p>
        </div>

        <FileUpload
          onUploadSuccess={handleUploadSuccess}
          onUploadError={handleUploadError}
        />
      </div>

      {/* Validation Results Modal */}
      {showResults && currentBatch && (
        <ValidationResult
          batchId={currentBatch.id}
          onClose={handleCloseResults}
          isMinimized={isMinimized}
          onToggleMinimize={handleToggleMinimize}
        />
      )}
    </>
  );
}
