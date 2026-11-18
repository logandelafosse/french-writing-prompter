import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { runPrSize } from "./run-pr-size";

const HOOK_GIT_KEYS = [
  "GIT_DIR",
  "GIT_WORK_TREE",
  "GIT_INDEX_FILE",
  "GIT_PREFIX",
] as const;

function withoutHookGitEnv<T>(fn: () => T): T {
  const saved = Object.fromEntries(
    HOOK_GIT_KEYS.map((key) => [key, process.env[key]]),
  );
  for (const key of HOOK_GIT_KEYS) delete process.env[key];
  process.env.LEFTHOOK = "0";
  try {
    return fn();
  } finally {
    for (const key of HOOK_GIT_KEYS) {
      const value = saved[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

function runInRepo(repoDir: string, cmd: string): string {
  return withoutHookGitEnv(() =>
    execSync(cmd, {
      cwd: repoDir,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      env: process.env,
    }),
  );
}

function initRepo(repoDir: string): void {
  runInRepo(repoDir, "git init -b main");
  runInRepo(repoDir, 'git config user.email "test@example.com"');
  runInRepo(repoDir, 'git config user.name "Test"');
}

function commitAll(repoDir: string, message: string): void {
  runInRepo(repoDir, "git add -A");
  runInRepo(repoDir, `git commit -m ${JSON.stringify(message)}`);
}

function writeLines(filePath: string, lineCount: number): void {
  const lines = Array.from({ length: lineCount }, (_, i) => `// line ${i + 1}`);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

function scaffoldMainWithFeature(repoDir: string): void {
  initRepo(repoDir);
  const baseFile = path.join(repoDir, "src", "base.ts");
  fs.mkdirSync(path.dirname(baseFile), { recursive: true });
  fs.writeFileSync(baseFile, "export const base = 1;\n");
  commitAll(repoDir, "base");
  runInRepo(repoDir, "git checkout -b feature");
}

describe("runPrSize integration", () => {
  it("exits 0 when 499 production lines are added", () => {
    const repoDir = fs.mkdtempSync(path.join(os.tmpdir(), "pr-size-"));
    try {
      scaffoldMainWithFeature(repoDir);
      writeLines(path.join(repoDir, "src", "bulk-499.ts"), 499);
      commitAll(repoDir, "499 prod lines");
      const result = withoutHookGitEnv(() =>
        runPrSize({ cwd: repoDir, baseRef: "main" }),
      );
      expect(result.total).toBe(499);
      expect(result.exitCode).toBe(0);
    } finally {
      fs.rmSync(repoDir, { recursive: true, force: true });
    }
  });

  it("exits non-zero at 500 production lines but ignores test-only additions", () => {
    const repoDir = fs.mkdtempSync(path.join(os.tmpdir(), "pr-size-"));
    try {
      scaffoldMainWithFeature(repoDir);
      writeLines(path.join(repoDir, "src", "bulk-500.ts"), 500);
      writeLines(path.join(repoDir, "src", "tests-only.test.ts"), 1000);
      commitAll(repoDir, "500 prod + test");
      const result = withoutHookGitEnv(() =>
        runPrSize({ cwd: repoDir, baseRef: "main" }),
      );
      expect(result.total).toBe(500);
      expect(result.exitCode).toBe(1);
    } finally {
      fs.rmSync(repoDir, { recursive: true, force: true });
    }
  });

  it("sizes against refs/remotes/github/main when a stale local origin/main exists", () => {
    const repoDir = fs.mkdtempSync(path.join(os.tmpdir(), "pr-size-"));
    try {
      initRepo(repoDir);
      writeLines(path.join(repoDir, "src", "stale.ts"), 1);
      commitAll(repoDir, "stale origin/main");
      const staleSha = runInRepo(repoDir, "git rev-parse HEAD").trim();

      writeLines(path.join(repoDir, "src", "later.ts"), 800);
      commitAll(repoDir, "true github/main");
      const trueBaseSha = runInRepo(repoDir, "git rev-parse HEAD").trim();

      runInRepo(repoDir, "git checkout -b feature");
      writeLines(path.join(repoDir, "src", "feature.ts"), 7);
      commitAll(repoDir, "feature");

      runInRepo(repoDir, `git branch origin/main ${staleSha}`);
      runInRepo(
        repoDir,
        "git remote add github https://github.com/logandelafosse/french-writing-prompter.git",
      );
      runInRepo(
        repoDir,
        `git update-ref refs/remotes/github/main ${trueBaseSha}`,
      );

      const result = withoutHookGitEnv(() => runPrSize({ cwd: repoDir }));
      expect(result.total).toBe(7);
      expect(result.exitCode).toBe(0);
      expect(result.message).toContain("refs/remotes/github/main");
    } finally {
      fs.rmSync(repoDir, { recursive: true, force: true });
    }
  });

  it("sizes against refs/remotes/origin/main when the GitHub remote is named origin", () => {
    const repoDir = fs.mkdtempSync(path.join(os.tmpdir(), "pr-size-"));
    try {
      scaffoldMainWithFeature(repoDir);
      writeLines(path.join(repoDir, "src", "feature.ts"), 11);
      commitAll(repoDir, "feature");
      const mainSha = runInRepo(repoDir, "git rev-parse main").trim();

      runInRepo(
        repoDir,
        "git remote add origin https://github.com/logandelafosse/french-writing-prompter.git",
      );
      runInRepo(repoDir, `git update-ref refs/remotes/origin/main ${mainSha}`);

      const result = withoutHookGitEnv(() => runPrSize({ cwd: repoDir }));
      expect(result.total).toBe(11);
      expect(result.exitCode).toBe(0);
      expect(result.message).toContain("refs/remotes/origin/main");
    } finally {
      fs.rmSync(repoDir, { recursive: true, force: true });
    }
  });

  it("exits 1 when no GitHub remote is configured", () => {
    const repoDir = fs.mkdtempSync(path.join(os.tmpdir(), "pr-size-"));
    try {
      scaffoldMainWithFeature(repoDir);
      writeLines(path.join(repoDir, "src", "feature.ts"), 3);
      commitAll(repoDir, "feature");

      const result = withoutHookGitEnv(() => runPrSize({ cwd: repoDir }));
      expect(result.exitCode).toBe(1);
      expect(result.total).toBe(0);
      expect(result.message).toContain(
        "github.com/logandelafosse/french-writing-prompter",
      );
    } finally {
      fs.rmSync(repoDir, { recursive: true, force: true });
    }
  });
});
