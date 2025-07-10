export interface ValidationIssue {
  type: 'security' | 'quality' | 'best_practice';
  severity: 'high' | 'medium' | 'low';
  message: string;
  line?: number;
}

export interface ValidationResult {
  score: number;
  issues: ValidationIssue[];
  recommendations: string[];
}

export interface ValidationFile {
  file_id: string;
  filename: string;
  status: 'processing' | 'completed' | 'failed';
  score?: number;
  result?: ValidationResult;
}

export interface ValidationBatch {
  batch_id: string;
  status: 'processing' | 'completed' | 'failed';
  total_files: number;
  completed_files: number;
  files: ValidationFile[];
  created_at?: string;
}

export interface ValidationLog {
  batch_id: string;
  total_files: number;
  completed_files: number;
  average_score?: number;
  status: 'processing' | 'completed' | 'failed';
  created_at: string;
}

export interface ValidationLogDetail {
  batch_id: string;
  status: 'processing' | 'completed' | 'failed';
  total_files: number;
  completed_files: number;
  created_at: string;
  files: Array<{
    file_id: string;
    filename: string;
    file_content: string;
    file_type: string;
    status: 'processing' | 'completed' | 'failed';
    score?: number;
    validation_result?: ValidationResult;
    created_at: string;
  }>;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  logs: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface PromptInfo {
  name: string;
  filename: string;
  description: string;
}