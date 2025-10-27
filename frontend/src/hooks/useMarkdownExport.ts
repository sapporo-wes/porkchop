import { useState, useCallback } from "react";
import {
  Severity,
  SeverityOrder,
  ValidationBatch,
  ValidationFileContent,
  ValidationPromptResult,
} from "../types";
import {
  nsToSecString,
  formatPromptName,
  formatTypeName,
  capitalizeFirstLetter,
} from "../utils";
import { useSeverityCounts } from "./useSeverityCounts";
import { apiClient } from "../services/api";

export const useMarkdownExport = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [editableContent, setEditableContent] = useState<string>("");
  const severityCounts = useSeverityCounts();

  const generateMarkdown = useCallback(
    (
      log: ValidationBatch,
      fileContent?: ValidationFileContent,
      template?: (log: ValidationBatch) => string
    ) => {
      if (template) {
        return template(log);
      }

      function filelistTemplate(
        log: ValidationBatch,
        fileContent?: ValidationFileContent
      ): string {
        console.log("Generating file list with fileContent:", fileContent);
        if (log.file_ids.length > 0) {
          // fileContentが提供されていればsha256も表示
          const sha256 = fileContent?.files.find(
            (file) => file.id === log.file_ids[0].id
          )?.sha256;
          return log.file_ids
            .map(
              (file) => `- ${file.file_name}
\t- SHA256: \`${sha256 || "N/A"}\``
            )
            .join("\n");
        } else {
          return "N/A";
        }
      }

      function validationResultsOverviewTemplate(log: ValidationBatch): string {
        return log.prompt_results
          .map((prompt_result, index) => {
            const severitySummary =
              severityCounts.calculatePromptSeverityCounts(prompt_result);
            return `| ${index + 1} | ${formatPromptName(prompt_result.prompt)} | ${prompt_result.status} |  ${prompt_result.result ? `${prompt_result.result.length} (H:${severitySummary.high} M:${severitySummary.medium} L:${severitySummary.low})` : 0} | ${nsToSecString(prompt_result.total_duration_ns)} | ${nsToSecString(prompt_result.eval_duration_ns)} | ${nsToSecString(prompt_result.load_duration_ns)} | ${nsToSecString(prompt_result.prompt_eval_duration_ns)} |`;
          })
          .join("\n");
      }

      function ValidationDetailsTemplate(
        prompt_result: ValidationPromptResult,
        index: number
      ): string {
        const header = `### ${index + 1}. ${formatPromptName(prompt_result.prompt)}`;
        const status = `**Status:** ${prompt_result.status}`;

        console.log("before", prompt_result.result);
        const result_type_sorted = prompt_result.result
          ? [...prompt_result.result].sort((a, b) => {
              const typeCompare = a.type.localeCompare(b.type);
              if (typeCompare !== 0) {
                return typeCompare;
              }
              return SeverityOrder[a.severity] - SeverityOrder[b.severity];
            })
          : [];
        console.log("after", result_type_sorted);

        let prevType: string | null = null;
        let prevSeverity: Severity | null = null;
        let count = 0;
        const issuesString = result_type_sorted
          .map((issue) => {
            if (issue.type !== prevType) {
              prevType = issue.type;
              count = 1;
            } else if (issue.severity !== prevSeverity) {
              prevSeverity = issue.severity;
              count = 1;
            } else {
              count++;
            }

            return `#### ${formatTypeName(issue.type)}-${capitalizeFirstLetter(issue.severity)}-${count}

- File: ${issue.file}
- Description: ${issue.description}

\`\`\`\n${issue.content ?? "(no content)"}\n\`\`\`\n\n`;
          })
          .join("");

        return header + "\n\n" + status + "\n\n" + issuesString;
      }

      function fileContentsTemplate(
        fileContent?: ValidationFileContent
      ): string {
        if (!fileContent || fileContent.files.length === 0) {
          return "No file contents available.";
        }

        return fileContent.files
          .map((file) => {
            return `### ${file.file_name}

**File Type:** ${file.file_type}  
**SHA256:** \`${file.sha256 || "N/A"}\`  
**Created:** ${file.created_at}

\`\`\`${file.file_type}
${file.content}
\`\`\`
`;
          })
          .join("\n\n---\n\n");
      }

      return `# Porkchop report ID${log.id}: ${log.name}

**Status:** ${log.status}  
**Created:** ${log.created_at}  
**Updated:** ${log.updated_at}  

---

## Files

${filelistTemplate(log, fileContent)}

### Validation Overview

| No. | Prompt | Status | #Issues | Total (s) | Eval (s) | Load (s) | Prompt Eval (s) | 
| --- | ------ | ------ | --------- | --------- | -------- | -------- | --------------- |
${validationResultsOverviewTemplate(log)}

## Validation Details

${log.prompt_results
  .map((pr, index) => {
    return ValidationDetailsTemplate(pr, index);
  })
  .join("\n\n")}
`;
    },
    []
  );

  const downloadMarkdown = useCallback(
    (content: string, filename: string = "report.md") => {
      const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      try {
        a.click();
      } finally {
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 0);
      }
    },
    []
  );

  const exportToMarkdown = useCallback(
    (
      log: ValidationBatch,
      fileContent?: ValidationFileContent,
      filename?: string,
      template?: (log: ValidationBatch) => string
    ) => {
      const markdown = generateMarkdown(log, fileContent, template);
      downloadMarkdown(markdown, filename);
    },
    [generateMarkdown, downloadMarkdown]
  );

  /*

    const startEditing;
    const finishEditing;
    const cancelEditing;
    */

  return {
    exportToMarkdown,
  };
};
