import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import apiClient from "../services/api";
import type { PromptCategory, PromptContent } from "../types";

type UsePromptCategoriesOptions = {
  onError?: (message: string) => void;
};

/**
 * プロンプトカテゴリ管理のカスタムフック
 * - プロンプトカテゴリ一覧取得
 * - 複数プロンプト選択管理
 * - プロンプト内容取得・モーダル表示
 */
export const usePromptCategories = (options: UsePromptCategoriesOptions = {}) => {
  // 選択されたプロンプトを"category::name"形式で管理
  const [selectedPrompts, setSelectedPrompts] = useState<string[]>([]);

  // プロンプト内容モーダル用状態
  const [promptContent, setPromptContent] = useState<PromptContent | null>(null);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [isLoadingContent, setIsLoadingContent] = useState(false);

  // プロンプトカテゴリ一覧取得
  const {
    data: promptCategories,
    isLoading,
    error,
    refetch,
  } = useQuery<PromptCategory[], Error>({
    queryKey: ["prompt-categories"],
    queryFn: apiClient.getPromptCategories,
    onError: (error: any) => {
      options.onError?.(error.message || "プロンプトの取得に失敗しました");
    },
  });

  /**
   * プロンプトの選択状態をトグル
   */
  const togglePromptSelection = useCallback((categoryName: string, promptName: string) => {
    const fullName = `${categoryName}::${promptName}`;

    setSelectedPrompts(prev => {
      if (prev.includes(fullName)) {
        return prev.filter(name => name !== fullName);
      } else {
        return [...prev, fullName];
      }
    });
  }, []);

  /**
   * カテゴリ内の全プロンプトを選択/選択解除
   */
  const toggleCategorySelection = useCallback((categoryName: string) => {
    const category = promptCategories?.find(cat => cat.category === categoryName);
    if (!category) return;

    const categoryPrompts = category.prompts.map(p => `${categoryName}::${p.name}`);
    const allSelected = categoryPrompts.every(name => selectedPrompts.includes(name));

    if (allSelected) {
      // 全て選択済み → 全て解除
      setSelectedPrompts(prev => prev.filter(name => !categoryPrompts.includes(name)));
    } else {
      // 一部または未選択 → 全て選択
      setSelectedPrompts(prev => {
        const newSelection = [...prev];
        categoryPrompts.forEach(name => {
          if (!newSelection.includes(name)) {
            newSelection.push(name);
          }
        });
        return newSelection;
      });
    }
  }, [promptCategories, selectedPrompts]);

  /**
   * プロンプトの選択状態確認
   */
  const isPromptSelected = useCallback((categoryName: string, promptName: string) => {
    return selectedPrompts.includes(`${categoryName}::${promptName}`);
  }, [selectedPrompts]);

  /**
   * カテゴリの選択状態確認
   */
  const getCategorySelectionState = useCallback((categoryName: string) => {
    const category = promptCategories?.find(cat => cat.category === categoryName);
    if (!category) return "none";

    const categoryPrompts = category.prompts.map(p => `${categoryName}::${p.name}`);
    const selectedCount = categoryPrompts.filter(name => selectedPrompts.includes(name)).length;

    if (selectedCount === 0) return "none";
    if (selectedCount === categoryPrompts.length) return "all";
    return "partial";
  }, [promptCategories, selectedPrompts]);

  /**
   * 選択された全プロンプトをクリア
   */
  const clearSelection = useCallback(() => {
    setSelectedPrompts([]);
  }, []);

  /**
   * プロンプト内容を取得してモーダル表示
   */
  const fetchAndShowPromptContent = useCallback(async (name: string, category: string) => {
    setIsLoadingContent(true);
    try {
      const content = await apiClient.getPromptContent(name, category);
      setPromptContent(content);
      setShowPromptModal(true);
    } catch (error: any) {
      options.onError?.(error.message || "プロンプト内容の取得に失敗しました");
    } finally {
      setIsLoadingContent(false);
    }
  }, [options]);

  /**
   * プロンプトモーダルを閉じる
   */
  const closePromptModal = useCallback(() => {
    setShowPromptModal(false);
    setPromptContent(null);
  }, []);

  /**
   * 選択状態の統計情報
   */
  const selectionStats = {
    selectedCount: selectedPrompts.length,
    totalCount: promptCategories?.reduce((total, cat) => total + cat.prompts.length, 0) || 0,
    isEmpty: selectedPrompts.length === 0,
    selectedCategories: promptCategories?.filter(cat =>
      getCategorySelectionState(cat.category) !== "none"
    ).length || 0,
  };

  return {
    // データ
    promptCategories,
    selectedPrompts,
    promptContent,

    // 状態
    isLoading,
    error: error?.message || null,
    showPromptModal,
    isLoadingContent,

    // 選択操作
    togglePromptSelection,
    toggleCategorySelection,
    isPromptSelected,
    getCategorySelectionState,
    clearSelection,

    // プロンプト内容操作
    fetchAndShowPromptContent,
    closePromptModal,

    // その他
    refetch,
    selectionStats,
  };
};