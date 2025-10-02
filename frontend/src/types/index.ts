import { z } from "zod";

// ========================================
// 基本型・Enum
// ========================================

export const StatusSchema = z.enum([
  "waiting",
  "processing",
  "completed",
  "failed",
]);
export type Status = z.infer<typeof StatusSchema>;

export const SeveritySchema = z.enum(["high", "medium", "low"]);
export type Severity = z.infer<typeof SeveritySchema>;

export const IssueTypeSchema = z.enum(["security", "quality", "best_practice"]);
export type IssueType = z.infer<typeof IssueTypeSchema>;

export const PromptCategoryKindSchema = z.enum([
  "pipeline_validity",
  "pipeline_usability",
  "pipeline_portability",
  "artifacts_reproducibility",
  "artifacts_anonymity",
  "artifacts_validity",
]);
export type PromptCategoryKind = z.infer<typeof PromptCategoryKindSchema>;

// ========================================
// ValidationIssue
// ========================================

export const ValidationIssueSchema = z.object({
  severity: SeveritySchema,
  description: z.string(),
  lines: z.array(z.number()).nullable().optional(),
  type: IssueTypeSchema,
});
export type ValidationIssue = z.infer<typeof ValidationIssueSchema>;

// ========================================
// Prompt関連
// ========================================

export const PromptInfoSchema = z.object({
  name: z.string(),
  category: PromptCategoryKindSchema,
  description: z.string().nullable().optional(),
  sha256: z.string().nullable().optional(),
  has_all: z.boolean(),
});
export type PromptInfo = z.infer<typeof PromptInfoSchema>;

export const PromptCategorySchema = z.object({
  category: PromptCategoryKindSchema,
  prompts: z.array(PromptInfoSchema),
});
export type PromptCategory = z.infer<typeof PromptCategorySchema>;

export const PromptContentSchema = z.object({
  name: z.string(),
  category: PromptCategoryKindSchema,
  content: z.string(),
  sha256: z.string(),
});
export type PromptContent = z.infer<typeof PromptContentSchema>;

export const ValidationPromptResultSchema = z.object({
  prompt: PromptInfoSchema,
  status: StatusSchema,
  error_message: z.string().nullable().optional(),
  result: z.array(ValidationIssueSchema).nullable().optional(),
  total_duration_ns: z.number().nullable().optional(),
  eval_duration_ns: z.number().nullable().optional(),
  load_duration_ns: z.number().nullable().optional(),
  prompt_eval_duration_ns: z.number().nullable().optional(),
});
export type ValidationPromptResult = z.infer<
  typeof ValidationPromptResultSchema
>;

// ========================================
// File関連
// ========================================

export const ValidationFileIdSchema = z.object({
  id: z.number(),
  file_name: z.string(),
});
export type ValidationFileId = z.infer<typeof ValidationFileIdSchema>;

export const ValidationFileSchema = z.object({
  id: z.number(),
  file_name: z.string(),
  content: z.string(),
  file_type: z.string(),
  created_at: z.string(), // ISO datestring
});
export type ValidationFile = z.infer<typeof ValidationFileSchema>;

// ========================================
// Validation Batch関連
// ========================================

export const ValidationBatchSchema = z.object({
  id: z.number(),
  status: StatusSchema,
  file_ids: z.array(ValidationFileIdSchema),
  completed_prompts: z.number(),
  prompt_results: z.array(ValidationPromptResultSchema),
  created_at: z.string(), // ISO datestring
  updated_at: z.string(), // ISO datestring
  total_files: z.number(),
  total_prompts: z.number(),
});
export type ValidationBatch = z.infer<typeof ValidationBatchSchema>;

// ========================================
// Log関連
// ========================================

export const ValidationLogPagenatedSchema = z.object({
  logs: z.array(ValidationBatchSchema),
  curr_page: z.number(),
  total_pages: z.number(),
  per_page: z.number(),
  total: z.number(),
  has_next: z.boolean(),
  has_prev: z.boolean(),
});
export type ValidationLogPagenated = z.infer<
  typeof ValidationLogPagenatedSchema
>;

export const ActiveBatchSchema = z.object({
  id: z.number(),
  status: StatusSchema,
  file_ids: z.array(ValidationFileIdSchema),
  selected_prompts: z.array(PromptInfoSchema),
  completed_prompts: z.number(),
  created_at: z.string(), // ISO datestring
});
export type ActiveBatch = z.infer<typeof ActiveBatchSchema>;

// ========================================
// API共通
// ========================================

export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    data: dataSchema.optional(),
    error: z.string().optional(),
  });

export const AppErrorSchema = z.object({
  message: z.string(),
  code: z.string().optional(),
  details: z.unknown().optional(),
});
export type AppError = z.infer<typeof AppErrorSchema>;

// ========================================
// Form関連（フロントエンド専用）
// ========================================

export const UploadFormDataSchema = z.object({
  files: z.array(z.instanceof(File)),
  prompt_category_names: z.array(z.string()), // "category::name" format
});
export type UploadFormData = z.infer<typeof UploadFormDataSchema>;

// ========================================
// APIレスポンス検証用ヘルパー関数
// ========================================

export const validateApiResponse = <T>(
  data: unknown,
  schema: z.ZodSchema<T>
): T => {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error("API Response validation failed:", result.error);
    throw new Error(`Invalid API response: ${result.error.message}`);
  }
  return result.data;
};

// ========================================
// 旧型定義（互換性のため一時的に残す）
// TODO: 移行完了後に削除
// ========================================

/**
 * @deprecated 新しいValidationIssueを使用してください
 */
export const LegacyValidationIssueSchema = z.object({
  type: z.enum(["security", "quality", "best_practice"]),
  severity: z.enum(["high", "medium", "low"]),
  message: z.string(),
  line: z.number().optional(),
});
export type LegacyValidationIssue = z.infer<typeof LegacyValidationIssueSchema>;

/**
 * @deprecated スコアと推奨事項は削除されました
 */
export const LegacyValidationResultSchema = z.object({
  score: z.number(),
  issues: z.array(LegacyValidationIssueSchema),
  recommendations: z.array(z.string()),
});
export type LegacyValidationResult = z.infer<
  typeof LegacyValidationResultSchema
>;
