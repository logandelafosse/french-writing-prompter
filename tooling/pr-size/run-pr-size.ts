import { execFileSync } from "node:child_process";
import { parseNumstatAddedLines, totalAddedLines } from "./parse-numstat";

export const PRODUCTION_LINE_LIMIT = 500;

const GITHUB_REPO_SLUG = "logandelafosse/french-writing-prompter";
const GITHUB_REMOTE_MISSING = `No git remote fetch URL matches github.com/${GITHUB_REPO_SLUG}. Add the GitHub remote and fetch main.`;

export type PrSizeResult = {
  total: number;
  files: { path: string; added: number }[];
  exitCode: number;
  message: string;
};

function isGithubRepoFetchUrl(url: string): boolean {
  const normalized = url.replace(/\.git$/, "").replace(/\/$/, "");
  return (
    normalized.endsWith(`github.com/${GITHUB_REPO_SLUG}`) ||
    normalized.endsWith(`github.com:${GITHUB_REPO_SLUG}`)
  );
}

function githubRemoteNameFromRemoteV(
  remoteVOutput: string,
): string | undefined {
  for (const line of remoteVOutput.split("\n")) {
    const match = /^(\S+)\s+(\S+)\s+\(fetch\)$/.exec(line.trim());
    if (match === null) continue;
    const name = match[1];
    const url = match[2];
    if (name === undefined || url === undefined) continue;
    if (isGithubRepoFetchUrl(url)) return name;
  }
  return undefined;
}

function resolveGithubMainRef(cwd: string): string | undefined {
  const remoteV = execFileSync("git", ["remote", "-v"], {
    cwd,
    encoding: "utf8",
  });
  const remoteName = githubRemoteNameFromRemoteV(remoteV);
  if (remoteName === undefined) return undefined;
  return `refs/remotes/${remoteName}/main`;
}

export function mergeBaseRef(baseRef: string, cwd: string): string {
  return execFileSync("git", ["merge-base", baseRef, "HEAD"], {
    cwd,
    encoding: "utf8",
  }).trim();
}

export function gitNumstat(mergeBase: string, cwd: string): string {
  return execFileSync("git", ["diff", "--numstat", `${mergeBase}...HEAD`], {
    cwd,
    encoding: "utf8",
  });
}

export function runPrSize(options: {
  cwd: string;
  baseRef?: string;
}): PrSizeResult {
  const cwd = options.cwd;
  let baseRef = options.baseRef;
  if (baseRef === undefined) {
    const resolved = resolveGithubMainRef(cwd);
    if (resolved === undefined) {
      return {
        total: 0,
        files: [],
        exitCode: 1,
        message: GITHUB_REMOTE_MISSING,
      };
    }
    baseRef = resolved;
  }

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
    `${total} production lines added (limit ${PRODUCTION_LINE_LIMIT}, merge-base ${baseRef} ${mergeBase})`,
    fileSummary,
  ].join("\n");

  return {
    total,
    files,
    exitCode: overBudget ? 1 : 0,
    message,
  };
}
