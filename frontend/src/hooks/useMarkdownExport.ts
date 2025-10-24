import { useState, useCallback } from "react";
import { ValidationBatch, ValidationPromptResult } from "../types";
import { nsToSecString, formatPromptName } from "../utils";
import { useSeverityCounts } from "./useSeverityCounts";
import { apiClient } from "../services/api";

export const useMarkdownExport = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [editableContent, setEditableContent] = useState<string>("");
  const severityCounts = useSeverityCounts();

  const generateMarkdown = useCallback(
    (log: ValidationBatch, template?: (log: ValidationBatch) => string) => {
      if (template) {
        return template(log);
      }

      function filelistTemplate(log: ValidationBatch): string {
        if (log.file_ids.length === 0) {
          return "N/A";
        } else {
          return log.file_ids
            .map((file) => `- [${file.file_name}](#${file.file_name})`)
            .join("\n");
        }
      }

      function validationResultsOverviewTemplate(log: ValidationBatch): string {
        return log.prompt_results
          .map((prompt_result, index) => {
            const severitySummary =
              severityCounts.calculatePromptSeverityCounts(prompt_result);
            return `| ${index + 1} | ${prompt_result.status} | ${formatPromptName(prompt_result.prompt)} | ${prompt_result.result ? `${prompt_result.result.length} (H:${severitySummary.high} M:${severitySummary.medium} L:${severitySummary.low})` : 0} | ${nsToSecString(prompt_result.total_duration_ns)} | ${nsToSecString(prompt_result.eval_duration_ns)} | ${nsToSecString(prompt_result.load_duration_ns)} | ${nsToSecString(prompt_result.prompt_eval_duration_ns)} |`;
          })
          .join("\n");
      }

      function ValidationDetailsTemplate(
        prompt_result: ValidationPromptResult,
        index: number
      ): string {
        const header = `### ${index + 1}. ${formatPromptName(prompt_result.prompt)}`;
        const status = `**Status:** ${prompt_result.status}`;

        const grouped = prompt_result.result?.reduce(
          (acc, issue) => {
            if (!acc[issue.file]) {
              acc[issue.file] = "";
            }
            acc[issue.file] += `\t- \`${issue.content ?? "(no content)"}\`
\t\t- Severity: ${issue.severity}
\t\t- Type: ${issue.type}
\t\t- Description: ${issue.description}
`;

            return acc;
          },
          {} as Record<string, string>
        );
        const issuesString = grouped
          ? Object.entries(grouped)
              .map(([file, content]) => {
                return `- ${file}\n${content}\n`;
              })
              .join("\n\n")
          : "No issues found.";

        return header + "\n\n" + status + "\n\n" + issuesString;
      }

      function fileContentsTemplate(log: ValidationBatch): string {
        // TODO
        return "TODO";
      }

      return `# Porkchop report ID${log.id}: ${log.name}
 
**Status:** ${log.status}  
**Created:** ${log.created_at}  
**Updated:** ${log.updated_at}  

## Files

${filelistTemplate(log)}

---

### Validation Overview

| No. | Status | Prompt | #Issues | Total (s) | Eval (s) | Load (s) | Prompt Eval (s) | 
| --- | ------ | ------- | --------- | --------- | -------- | -------- | --------------- |
${validationResultsOverviewTemplate(log)}

## Validation Details

${log.prompt_results
  .map((pr, index) => {
    return ValidationDetailsTemplate(pr, index);
  })
  .join("\n\n")}


## File Contents

${fileContentsTemplate(log)}

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
      filename?: string,
      template?: (log: ValidationBatch) => string
    ) => {
      const markdown = generateMarkdown(log, template);
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
