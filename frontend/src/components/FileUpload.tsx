import { useMutation, useQuery } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import apiService from '../services/api';
import { ValidationBatch } from '../types';

interface FileUploadProps {
  onUploadSuccess: (batch: ValidationBatch) => void;
  onUploadError: (error: string) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onUploadSuccess, onUploadError }) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<string>('validation_prompt');
  const [showPromptContent, setShowPromptContent] = useState<boolean>(false);
  const [promptContent, setPromptContent] = useState<string>('');

  const { data: prompts, isLoading: promptsLoading, refetch: refetchPrompts } = useQuery({
    queryKey: ['prompts'],
    queryFn: apiService.getAvailablePrompts,
  });

  const uploadMutation = useMutation({
    mutationFn: ({ files, promptName }: { files: File[], promptName: string }) => 
      apiService.uploadFiles(files, promptName),
    onSuccess: (data) => {
      setSelectedFiles([]);
      onUploadSuccess(data);
    },
    onError: (error: any) => {
      onUploadError(error.response?.data?.detail || error.message || '不明なエラーが発生しました');
    },
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const validFiles = acceptedFiles.filter(file => {
      if (file.size > 10 * 1024 * 1024) {
        onUploadError(`ファイル ${file.name} のサイズが10MBを超えています`);
        return false;
      }
      return true;
    });

    setSelectedFiles(prev => [...prev, ...validFiles]);
  }, [onUploadError]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/yaml': ['.yml', '.yaml'],
      'text/plain': ['.txt', '.sh', '.c', '.h', '.py', '.js', '.ts', '.json', '.toml', '.md', '.cwl'],
      'application/x-sh': ['.sh'],
    },
    maxFiles: 10,
  });

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = () => {
    if (selectedFiles.length === 0) {
      onUploadError('ファイルを選択してください');
      return;
    }
    uploadMutation.mutate({ files: selectedFiles, promptName: selectedPrompt });
  };

  const handlePromptRefresh = () => {
    refetchPrompts();
  };

  const handleShowPromptContent = async () => {
    if (!selectedPrompt) return;
    
    try {
      const response = await apiService.getPromptContent(selectedPrompt);
      setPromptContent(response.content);
      setShowPromptContent(true);
    } catch (error) {
      onUploadError('プロンプト内容の取得に失敗しました');
    }
  };

  const getSeverityColor = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'yml':
      case 'yaml':
        return 'bg-blue-100 text-blue-800';
      case 'cwl':
        return 'bg-indigo-100 text-indigo-800';
      case 'sh':
        return 'bg-green-100 text-green-800';
      case 'c':
      case 'h':
        return 'bg-purple-100 text-purple-800';
      case 'py':
        return 'bg-yellow-100 text-yellow-800';
      case 'js':
      case 'ts':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* プロンプト選択 */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-medium text-gray-700">
            使用する検証プロンプト
          </label>
          <button
            onClick={handlePromptRefresh}
            disabled={promptsLoading}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium disabled:opacity-50"
          >
            {promptsLoading ? '読み込み中...' : '更新'}
          </button>
        </div>
        <select
          value={selectedPrompt}
          onChange={(e) => setSelectedPrompt(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          disabled={promptsLoading || uploadMutation.isPending}
        >
          {prompts?.map((prompt) => (
            <option key={prompt.name} value={prompt.name}>
              {prompt.name}
            </option>
          ))}
        </select>
        <div className="mt-3 flex items-center justify-between">
          <div className="text-xs text-gray-500">
            {selectedPrompt && prompts && (
              <span>説明: {prompts.find(p => p.name === selectedPrompt)?.description}</span>
            )}
          </div>
          <button
            onClick={handleShowPromptContent}
            disabled={!selectedPrompt || promptsLoading}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
          >
            プロンプト全文を表示する
          </button>
        </div>
      </div>

      {/* プロンプト内容表示モーダル */}
      {showPromptContent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                プロンプト内容: {selectedPrompt}
              </h3>
              <button
                onClick={() => setShowPromptContent(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <pre className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 p-4 rounded border">
                {promptContent}
              </pre>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowPromptContent(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <input {...getInputProps()} />
        <div className="space-y-2">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {isDragActive ? (
            <p className="text-lg text-blue-600">ファイルをドロップしてください</p>
          ) : (
            <div>
              <p className="text-lg text-gray-600">
                ファイルをドラッグ&ドロップするか、クリックして選択
              </p>
              <p className="text-sm text-gray-500">
                YAML, CWL, Shell, C, Python, JavaScript, TypeScript, JSONなど対応
                <br />
                最大10ファイル、1ファイル10MBまで
              </p>
            </div>
          )}
        </div>
      </div>

      {selectedFiles.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-medium text-gray-900">
            選択されたファイル ({selectedFiles.length})
          </h3>
          <div className="space-y-2">
            {selectedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(file.name)}`}>
                    {file.name.split('.').pop()?.toUpperCase()}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{file.name}</p>
                    <p className="text-xs text-gray-500">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="text-red-500 hover:text-red-700 p-1"
                  disabled={uploadMutation.isPending}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedFiles.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={handleUpload}
            disabled={uploadMutation.isPending}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {uploadMutation.isPending ? (
              <div className="flex items-center space-x-2">
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
                <span>アップロード中...</span>
              </div>
            ) : (
              'アップロードして検証開始'
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default FileUpload;