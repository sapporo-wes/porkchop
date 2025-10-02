import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { FiUpload, FiX, FiRefreshCw, FiEye, FiChevronDown, FiChevronRight } from "react-icons/fi";
import { useValidation } from "../hooks/useValidation";
import { usePromptCategories } from "../hooks/usePromptCategories";
import { useStatusColors } from "../hooks/useStatusColors";
import type { ValidationBatch } from "../types";

interface FileUploadProps {
  onUploadSuccess: (batch: ValidationBatch) => void;
  onUploadError: (error: string) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({
  onUploadSuccess,
  onUploadError,
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const colors = useStatusColors();

  // カスタムフック使用
  const { uploadFiles, isUploading, error: uploadError } = useValidation({
    onUploadSuccess,
    onUploadError,
  });

  const {
    promptCategories,
    selectedPrompts,
    promptContent,
    isLoading: promptsLoading,
    showPromptModal,
    isLoadingContent,
    togglePromptSelection,
    toggleCategorySelection,
    isPromptSelected,
    getCategorySelectionState,
    clearSelection,
    fetchAndShowPromptContent,
    closePromptModal,
    refetch: refetchPrompts,
    selectionStats,
  } = usePromptCategories({
    onError: onUploadError,
  });

  // ファイルドロップゾーン
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const validFiles = acceptedFiles.filter((file) => {
        if (file.size > 3 * 1024 * 1024) {
          onUploadError(`ファイル ${file.name} のサイズが3MBを超えています`);
          return false;
        }
        return true;
      });

      setSelectedFiles((prev) => [...prev, ...validFiles]);
    },
    [onUploadError]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/yaml": [".yml", ".yaml"],
      "text/plain": [
        ".txt",
        ".sh",
        ".c",
        ".h",
        ".py",
        ".js",
        ".ts",
        ".json",
        ".toml",
        ".md",
        ".cwl",
      ],
      "application/x-sh": [".sh"],
    },
    maxFiles: 30,
  });

  // ファイル操作
  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // カテゴリ展開/折りたたみ
  const toggleCategoryExpanded = (categoryName: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryName)) {
        newSet.delete(categoryName);
      } else {
        newSet.add(categoryName);
      }
      return newSet;
    });
  };

  // アップロード実行
  const handleUpload = () => {
    if (selectedFiles.length === 0) {
      onUploadError("ファイルを選択してください");
      return;
    }
    if (selectedPrompts.length === 0) {
      onUploadError("プロンプトを選択してください");
      return;
    }

    uploadFiles({
      files: selectedFiles,
      promptCategoryNames: selectedPrompts,
    });
  };

  return (
    <div className="space-y-6">
      {/* プロンプト選択セクション */}
      <div className="bg-gray-50 p-6 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              検証プロンプトを選択
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              複数のプロンプトを選択できます（選択中: {selectionStats.selectedCount}）
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {selectionStats.selectedCount > 0 && (
              <button
                onClick={clearSelection}
                className="text-sm text-red-600 hover:text-red-800 font-medium"
                disabled={isUploading}
              >
                全て解除
              </button>
            )}
            <button
              onClick={() => refetchPrompts()}
              disabled={promptsLoading || isUploading}
              className="flex items-center px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              <FiRefreshCw className={`w-4 h-4 mr-1 ${promptsLoading ? "animate-spin" : ""}`} />
              更新
            </button>
          </div>
        </div>

        {promptsLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-3">
            {promptCategories?.map((category) => {
              const isExpanded = expandedCategories.has(category.category);
              const selectionState = getCategorySelectionState(category.category);

              return (
                <div key={category.category} className="border border-gray-200 rounded-lg">
                  {/* カテゴリヘッダー */}
                  <div className="p-4 bg-white rounded-t-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => toggleCategoryExpanded(category.category)}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          {isExpanded ? (
                            <FiChevronDown className="w-5 h-5" />
                          ) : (
                            <FiChevronRight className="w-5 h-5" />
                          )}
                        </button>
                        <div>
                          <h4 className="font-medium text-gray-900">{category.category}</h4>
                          <p className="text-sm text-gray-600">
                            {category.prompts.length} プロンプト
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={selectionState === "all"}
                            ref={(input) => {
                              if (input) input.indeterminate = selectionState === "partial";
                            }}
                            onChange={() => toggleCategorySelection(category.category)}
                            disabled={isUploading}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">
                            {selectionState === "all" ? "全て選択済み" :
                             selectionState === "partial" ? "一部選択" : "全て選択"}
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* プロンプトリスト */}
                  {isExpanded && (
                    <div className="border-t border-gray-200 p-4 bg-gray-50 rounded-b-lg">
                      <div className="space-y-3">
                        {category.prompts.map((prompt) => (
                          <div
                            key={prompt.name}
                            className="flex items-center justify-between p-3 bg-white rounded border"
                          >
                            <div className="flex items-center space-x-3">
                              <label className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={isPromptSelected(category.category, prompt.name)}
                                  onChange={() =>
                                    togglePromptSelection(category.category, prompt.name)
                                  }
                                  disabled={isUploading}
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                              </label>
                              <div>
                                <h5 className="font-medium text-gray-900">{prompt.name}</h5>
                                {prompt.description && (
                                  <p className="text-sm text-gray-600">{prompt.description}</p>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() =>
                                fetchAndShowPromptContent(prompt.name, category.category)
                              }
                              disabled={isLoadingContent || isUploading}
                              className="flex items-center px-2 py-1 text-sm text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
                            >
                              <FiEye className="w-4 h-4 mr-1" />
                              内容表示
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* 選択されたプロンプト表示 */}
        {selectedPrompts.length > 0 && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              選択中のプロンプト ({selectedPrompts.length}個)
            </h4>
            <div className="flex flex-wrap gap-2">
              {selectedPrompts.map((promptName) => (
                <span
                  key={promptName}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {promptName}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ファイルアップロードエリア */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? "border-blue-400 bg-blue-50"
            : "border-gray-300 hover:border-gray-400"
        }`}
      >
        <input {...getInputProps()} />
        <div className="space-y-4">
          <FiUpload className="mx-auto h-12 w-12 text-gray-400" />
          {isDragActive ? (
            <p className="text-lg text-blue-600">
              ファイルをドロップしてください
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-lg text-gray-600">
                ファイルをドラッグ&ドロップするか、クリックして選択
              </p>
              <p className="text-sm text-gray-500">
                YAML, CWL, Shell, C, Python, JavaScript, TypeScript, JSONなど対応
                <br />
                最大30ファイル、1ファイル3MBまで
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 選択されたファイル一覧 */}
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
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${colors.getFileTypeColor(file.name)}`}
                  >
                    {file.name.split(".").pop()?.toUpperCase()}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  disabled={isUploading}
                  className="text-red-500 hover:text-red-700 p-1 disabled:opacity-50"
                >
                  <FiX className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* エラー表示 */}
      {uploadError && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">
            エラー: {uploadError.toString()}
          </div>
        </div>
      )}

      {/* アップロードボタン */}
      <div className="flex justify-end">
        <button
          onClick={handleUpload}
          disabled={
            selectedFiles.length === 0 ||
            selectedPrompts.length === 0 ||
            isUploading
          }
          className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isUploading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
              アップロード中...
            </>
          ) : (
            <>
              <FiUpload className="w-4 h-4 mr-2" />
              アップロードして検証開始
            </>
          )}
        </button>
      </div>

      {/* プロンプト内容表示モーダル */}
      {showPromptModal && promptContent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl max-h-[80vh] overflow-hidden flex flex-col w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                プロンプト内容: {promptContent.category}::{promptContent.name}
              </h3>
              <button
                onClick={closePromptModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <FiX className="h-6 w-6" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <pre className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 p-4 rounded border">
                {promptContent.content}
              </pre>
            </div>
            <div className="flex justify-end p-6 border-t border-gray-200">
              <button
                onClick={closePromptModal}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
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

export default FileUpload;