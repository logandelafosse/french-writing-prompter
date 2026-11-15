import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { runPrSize } from "./run-pr-size";

function runInRepo(repoDir: string, cmd: string): string {
  return execSync(cmd, { cwd: repoDir, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
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
      const result = runPrSize({ cwd: repoDir, baseRef: "main" });
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
      const result = runPrSize({ cwd: repoDir, baseRef: "main" });
      expect(result.total).toBe(500);
      expect(result.exitCode).toBe(1);
    } finally {
      fs.rmSync(repoDir, { recursive: true, force: true });
    }
  });
});