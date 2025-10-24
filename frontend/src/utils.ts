import { PromptInfo, Status } from "./types";

export const isTerminal = (s?: Status | null) =>
  s === "completed" || s === "failed";

// 1s→2s→4s… 上限60s、±10%ジッタ
export const nextInterval = (n: number) => {
  const base = Math.min(1000 * 2 ** Math.max(0, n - 1), 60000);
  const jitter = base * (Math.random() * 0.2 - 0.1);
  return Math.max(500, Math.floor(base + jitter));
};

export function nsToSecString(ns: number | null | undefined): string {
  if (ns === null || ns === undefined) {
    return "N/A";
  } else {
    return (ns / 1e9).toFixed(3);
  }
}

export function formatPromptName(promptInfo: PromptInfo): string {
  // replace "_" with " " and capitalize each word
  const cat = promptInfo.category
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
  const name = promptInfo.name
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  return `${cat} - ${name}`;
}
