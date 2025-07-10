import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import FileUpload from './components/FileUpload';
import ValidationResult from './components/ValidationResult';
import LogList from './components/LogList';
import apiService from './services/api';
import { ValidationBatch, ActiveBatch } from './types';

function App() {
  const [currentBatch, setCurrentBatch] = useState<ValidationBatch | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'logs'>('upload');
  const [error, setError] = useState<string | null>(null);

  // 進行中のバッチを取得（ブラウザリロード時の復旧用）
  const { data: activeBatches } = useQuery({
    queryKey: ['active-batches'],
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
        created_at: latestActiveBatch.created_at
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Porkchop Workflow Validator
          </h1>
          <p className="text-gray-600">
            ワークフローファイルとコードファイルのセキュリティ・品質検証システム
          </p>
        </div>

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
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('upload')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'upload'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                ファイルアップロード
              </button>
              <button
                onClick={() => setActiveTab('logs')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'logs'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                検証ログ
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'upload' ? (
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
        ) : (
          <LogList onError={handleUploadError} />
        )}

        {/* Features Section */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-3">
              <div className="p-2 bg-red-100 rounded-lg mr-3">
                <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">セキュリティ検証</h3>
            </div>
            <p className="text-gray-600 text-sm">
              ハードコードされた認証情報、不適切な権限設定、インジェクション脆弱性などを検出
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-3">
              <div className="p-2 bg-yellow-100 rounded-lg mr-3">
                <svg className="h-5 w-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">品質分析</h3>
            </div>
            <p className="text-gray-600 text-sm">
              非効率な処理、可読性の問題、エラーハンドリングの不備などを分析
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-3">
              <div className="p-2 bg-blue-100 rounded-lg mr-3">
                <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">ベストプラクティス</h3>
            </div>
            <p className="text-gray-600 text-sm">
              コーディング標準、保守性、ドキュメント化の観点からコードを評価
            </p>
          </div>
        </div>
      </div>

      {/* Validation Results Modal */}
      {showResults && currentBatch && (
        <ValidationResult
          batchId={currentBatch.batch_id}
          onClose={handleCloseResults}
          isMinimized={isMinimized}
          onToggleMinimize={handleToggleMinimize}
        />
      )}
    </div>
  );
}

export default App;