import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import {
  findFrenchTypographyIssues,
  type TypographyIssue,
} from "./scan-strings";

const SKIP_DIR_NAMES = new Set(["node_modules", ".next", "lint-fixtures"]);

export type FileTypographyIssue = TypographyIssue & {
  file: string;
};

function walkTsFiles(dir: string, acc: string[]): void {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIR_NAMES.has(entry)) continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walkTsFiles(full, acc);
      continue;
    }
    if (entry.endsWith(".ts") || entry.endsWith(".tsx")) {
      acc.push(full);
    }
  }
}

export function scanFrenchTypography(root: string): FileTypographyIssue[] {
  const files: string[] = [];
  walkTsFiles(root, files);
  const issues: FileTypographyIssue[] = [];
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    for (const issue of findFrenchTypographyIssues(source)) {
      issues.push({ file: relative(root, file), ...issue });
    }
  }
  return issues;
}

export function formatIssues(issues: FileTypographyIssue[]): string {
  return issues
    .map(
      (issue) =>
        `${issue.file}:${issue.line}:${issue.column} regular space next to ${issue.punct} (use U+202F)`,
    )
    .join("\n");
}
