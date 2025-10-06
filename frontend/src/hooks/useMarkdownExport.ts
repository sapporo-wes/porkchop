import { useState, useCallback } from "react";
import type { ValidationBatch } from "../types";

export const useMarkdownExport = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [editableContent, setEditableContent] = useState<string>("");

  const generateMarkdown = useCallback(
    (log: ValidationBatch, template?: (log: ValidationBatch) => string) => {
      if (template) {
        return template(log);
      }

      function filelistTemplate(log: ValidationBatch): string {
        if (log.file_ids.length === 0) {
          return "N/A";
        } else {
          return log.file_ids.map((file) => `- ${file.file_name}`).join("\n");
        }
      }

      // TODO: change the template once name property is added to ValidationBatch
      return `# Porkchop report ID: ${log.id}
          
**Status:** ${log.status}  
**Created:** ${log.created_at}  
**Updated:** ${log.updated_at}  

### Files

${filelistTemplate(log)}
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
