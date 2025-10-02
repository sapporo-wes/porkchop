import type { Status } from "./types";

export const isTerminal = (s?: Status | null) =>
  s === "completed" || s === "failed";

// 1s→2s→4s… 上限60s、±10%ジッタ
export const nextInterval = (n: number) => {
  const base = Math.min(1000 * 2 ** Math.max(0, n - 1), 60000);
  const jitter = base * (Math.random() * 0.2 - 0.1);
  return Math.max(500, Math.floor(base + jitter));
};
