import axios from 'axios';
import {
  ValidationBatch,
  ValidationLog,
  ValidationLogDetail,
  PaginatedResponse,
  PromptInfo,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const apiService = {
  // ファイルアップロード・検証
  async uploadFiles(files: File[], promptName: string = 'validation_prompt'): Promise<ValidationBatch> {
    console.log(API_BASE_URL);
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });
    formData.append('prompt_name', promptName);

    const response = await api.post('/validate', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },

  // 検証状況確認
  async getValidationStatus(batchId: string): Promise<ValidationBatch> {
    const response = await api.get(`/validate/${batchId}/status`);
    return response.data;
  },

  // 検証ログ一覧取得
  async getValidationLogs(
    page: number = 1,
    limit: number = 20,
    search?: string
  ): Promise<PaginatedResponse<ValidationLog>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (search) {
      params.append('search', search);
    }

    const response = await api.get(`/logs?${params.toString()}`);
    return response.data;
  },

  // 検証ログ詳細取得
  async getValidationLogDetail(batchId: string): Promise<ValidationLogDetail> {
    const response = await api.get(`/logs/${batchId}`);
    return response.data;
  },

  // プロンプト関連
  async getAvailablePrompts(): Promise<PromptInfo[]> {
    const response = await api.get('/prompts');
    return response.data.prompts;
  },

  async getPromptContent(promptName: string): Promise<{ name: string; content: string }> {
    const response = await api.get(`/prompts/${promptName}`);
    return response.data;
  },
};

export default apiService;