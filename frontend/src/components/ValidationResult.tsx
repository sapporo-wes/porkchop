import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiService from '../services/api';
import { ValidationFile, ValidationIssue } from '../types';

interface ValidationResultProps {
  batchId: string;
  onClose: () => void;
}

const ValidationResult: React.FC<ValidationResultProps> = ({ batchId, onClose }) => {
  const [autoRefresh, setAutoRefresh] = useState(true);

  const { data: batch, isLoading, error } = useQuery({
    queryKey: ['validation-status', batchId],
    queryFn: () => apiService.getValidationStatus(batchId),
    refetchInterval: autoRefresh ? 2000 : false,
    enabled: !!batchId,
  });

  useEffect(() => {
    if (batch?.status === 'completed' || batch?.status === 'failed') {
      setAutoRefresh(false);
    }
  }, [batch?.status]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'security':
        return '🔒';
      case 'quality':
        return '⚡';
      case 'best_practice':
        return '📋';
      default:
        return '❓';
    }
  };

  const renderFileResult = (file: ValidationFile) => (
    <div key={file.file_id} className="border border-gray-200 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h4 className="text-lg font-medium text-gray-900">{file.filename}</h4>
          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(file.status)}`}>
            {file.status === 'processing' ? '処理中' : 
             file.status === 'completed' ? '完了' : '失敗'}
          </span>
        </div>
        {file.score !== null && file.score !== undefined && (
          <div className={`text-2xl font-bold ${getScoreColor(file.score)}`}>
            {file.score}/100
          </div>
        )}
      </div>

      {file.status === 'processing' && (
        <div className="flex items-center space-x-2 text-gray-600">
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>分析中...</span>
        </div>
      )}

      {file.status === 'failed' && (
        <div className="text-red-600">
          <p>エラー: {(file.result as any)?.error || '不明なエラーが発生しました'}</p>
        </div>
      )}

      {file.status === 'completed' && file.result && (
        <div className="space-y-4">
          {file.result.issues && file.result.issues.length > 0 && (
            <div>
              <h5 className="text-sm font-medium text-gray-900 mb-2">
                検出された問題 ({file.result.issues.length}件)
              </h5>
              <div className="space-y-2">
                {file.result.issues.map((issue: ValidationIssue, index: number) => (
                  <div key={index} className="border-l-4 border-gray-200 pl-4 py-2">
                    <div className="flex items-start space-x-2">
                      <span className="text-lg">{getTypeIcon(issue.type)}</span>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(issue.severity)}`}>
                            {issue.severity === 'high' ? '高' : 
                             issue.severity === 'medium' ? '中' : '低'}
                          </span>
                          {issue.line && (
                            <span className="text-xs text-gray-500">行 {issue.line}</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-800">{issue.message}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {file.result.recommendations && file.result.recommendations.length > 0 && (
            <div>
              <h5 className="text-sm font-medium text-gray-900 mb-2">推奨事項</h5>
              <ul className="text-sm text-gray-700 space-y-1">
                {file.result.recommendations.map((rec: string, index: number) => (
                  <li key={index} className="flex items-start space-x-2">
                    <span className="text-blue-500 mt-1">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(!file.result.issues || file.result.issues.length === 0) && (
            <div className="text-green-600 text-sm">
              ✅ 問題は検出されませんでした
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
          <div className="flex items-center space-x-3">
            <svg className="animate-spin h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>検証状況を確認中...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
          <div className="text-red-600 text-center">
            <p>エラーが発生しました</p>
            <button
              onClick={onClose}
              className="mt-3 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              閉じる
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!batch) return null;

  const progress = batch.total_files > 0 ? (batch.completed_files / batch.total_files) * 100 : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">検証結果</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                進捗: {batch.completed_files} / {batch.total_files} ファイル
              </span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(batch.status)}`}>
                {batch.status === 'processing' ? '処理中' : 
                 batch.status === 'completed' ? '完了' : '失敗'}
              </span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        <div className="p-6 max-h-[calc(90vh-200px)] overflow-y-auto space-y-4">
          {batch.files.map(renderFileResult)}
        </div>
      </div>
    </div>
  );
};

export default ValidationResult;