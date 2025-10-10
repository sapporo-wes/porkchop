import axios from "axios";
import {
  ValidationBatch,
  ValidationBatchSchema,
  ValidationLogPaginated,
  ValidationLogPaginatedSchema,
  PromptCategory,
  PromptCategorySchema,
  PromptContent,
  PromptContentSchema,
  ActiveBatch,
  ActiveBatchSchema,
  validateApiResponse,
} from "../types";

const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

export const apiClient = {
  async uploadFiles(
    files: File[],
    promptCategoryNames: string[],
    batchName: string
  ): Promise<ValidationBatch> {
    const formData = new FormData();

    files.forEach((file) => {
      formData.append("upload_files", file);
    });

    promptCategoryNames.forEach((name) => {
      formData.append("prompt_category_names", name);
    });

    formData.append("batch_name", batchName);

    const response = await api.post("/validate", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    console.log("Upload response:", response.data);

    return validateApiResponse(response.data, ValidationBatchSchema);
  },

  // 検証ログ一覧取得（新API対応）
  async getValidationLogs(
    page: number = 1,
    per_page: number = 20,
    search?: string
  ): Promise<ValidationLogPaginated> {
    const params = new URLSearchParams({
      page: page.toString(),
      per_page: per_page.toString(),
    });

    if (search) {
      params.append("search", search);
    }

    const response = await api.get(`/logs?${params.toString()}`);
    return validateApiResponse(response.data, ValidationLogPaginatedSchema);
  },

  // 検証ログ詳細取得（IDが数値に変更）
  async getValidationLogDetail(batchId: number): Promise<ValidationBatch> {
    const response = await api.get(`/logs/batches/${batchId}`);
    return validateApiResponse(response.data, ValidationBatchSchema);
  },

  async getPromptCategories(): Promise<PromptCategory[]> {
    const response = await api.get("/prompts");
    console.log("Prompt categories response:", response.data);
    return validateApiResponse(response.data, PromptCategorySchema.array());
  },

  async getPromptContent(
    name: string,
    category: string
  ): Promise<PromptContent> {
    const params = new URLSearchParams({
      name,
      cat: category,
    });

    const response = await api.get(`/prompts/content?${params.toString()}`);
    return validateApiResponse(response.data, PromptContentSchema);
  },

  // 進行中バッチ取得（新API対応）
  async getActiveBatches(): Promise<ActiveBatch[]> {
    const response = await api.get("/logs/active");
    return validateApiResponse(response.data, ActiveBatchSchema.array());
  },
};

export default apiClient;
