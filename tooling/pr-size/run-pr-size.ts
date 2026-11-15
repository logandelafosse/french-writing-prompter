import { execSync } from "node:child_process";
import { parseNumstatAddedLines, totalAddedLines } from "./parse-numstat";

export const PRODUCTION_LINE_LIMIT = 500;

export type PrSizeResult = {
  total: number;
  files: { path: string; added: number }[];
  exitCode: number;
  message: string;
};

export function mergeBaseRef(baseRef: string, cwd: string): string {
  return execSync(`git merge-base ${baseRef} HEAD`, {
    cwd,
    encoding: "utf8",
  }).trim();
}

export function gitNumstat(mergeBase: string, cwd: string): string {
  return execSync(`git diff --numstat ${mergeBase}...HEAD`, {
    cwd,
    encoding: "utf8",
  });
}

export function runPrSize(options: {
  cwd: string;
  baseRef?: string;
}): PrSizeResult {
  const baseRef = options.baseRef ?? "origin/main";
  const cwd = options.cwd;

  let mergeBase: string;
  try {
    mergeBase = mergeBaseRef(baseRef, cwd);
  } catch {
    return {
      total: 0,
      files: [],
      exitCode: 1,
      message: `Could not find merge-base with ${baseRef}. Fetch full history?`,
    };
  }

  const numstat = gitNumstat(mergeBase, cwd);
  const byFile = parseNumstatAddedLines(numstat);
  const total = totalAddedLines(byFile);
  const files = [...byFile.entries()]
    .map(([filePath, added]) => ({ path: filePath, added }))
    .sort((a, b) => b.added - a.added || a.path.localeCompare(b.path));

  const overBudget = total >= PRODUCTION_LINE_LIMIT;
  const fileSummary =
    files.length === 0
      ? "(no production files with added lines)"
      : files.map((f) => `  +${f.added}\t${f.path}`).join("\n");

  const message = [
    `${total} production lines added (limit ${PRODUCTION_LINE_LIMIT}, merge-base ${mergeBase})`,
    fileSummary,
  ].join("\n");

  return {
    total,
    files,
    exitCode: overBudget ? 1 : 0,
    message,
  };
}