import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { isDocsOnlyPaths, runDocsOnlyCli } from "./docs-only";

const root = path.resolve(import.meta.dirname, "../..");
const lefthookYaml = readFileSync(path.join(root, "lefthook.yml"), "utf8");

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

function git(cwd: string, args: string[]): string {
  return withoutHookGitEnv(() =>
    execFileSync("git", args, { cwd, encoding: "utf8" }),
  );
}

function initRepo(): string {
  const dir = mkdtempSync(path.join(tmpdir(), "fwp-docs-only-"));
  git(dir, ["init", "-b", "main"]);
  git(dir, ["config", "user.email", "docs-only@test"]);
  git(dir, ["config", "user.name", "Docs Only"]);
  return dir;
}

function commitFile(cwd: string, rel: string, contents: string): void {
  const abs = path.join(cwd, rel);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, contents);
  git(cwd, ["add", rel]);
  git(cwd, ["commit", "-m", `add ${rel}`]);
}

describe("isDocsOnlyPaths", () => {
  it.each([
    [["docs/plan/board.md"], true],
    [["docs/agents/workflow.md", "docs/plan/board.md"], true],
    [["docs"], true],
    [["docs/foo.ts"], true],
    [[], false],
    [["README.md"], false],
    [["documentation/foo.md"], false],
    [["src/docs/foo.md"], false],
    [["docs/plan/board.md", "src/app/page.tsx"], false],
    [["docs/plan/board.md", ".github/workflows/check.yml"], false],
  ] as const)("%j → %s", (paths, expected) => {
    expect(isDocsOnlyPaths(paths)).toBe(expected);
  });
});

describe("runDocsOnlyCli", () => {
  const repos: string[] = [];

  afterEach(() => {
    for (const dir of repos.splice(0)) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  function repo(): string {
    const dir = initRepo();
    repos.push(dir);
    return dir;
  }

  it("writes docs-only=true for a push that only touches docs/", () => {
    const dir = repo();
    commitFile(dir, "src/app.ts", "export const n = 1;\n");
    const before = git(dir, ["rev-parse", "HEAD"]).trim();
    commitFile(dir, "docs/plan/board.md", "# board\n");
    const after = git(dir, ["rev-parse", "HEAD"]).trim();
    const outputPath = path.join(dir, "github-output");
    let written = "";

    const code = withoutHookGitEnv(() =>
      runDocsOnlyCli({
        args: ["--github-output"],
        env: {
          BEFORE_SHA: before,
          AFTER_SHA: after,
          GITHUB_OUTPUT: outputPath,
        },
        cwd: dir,
        log: () => undefined,
        writeOutput: (_file, line) => {
          written = line;
        },
      }),
    );

    expect(code).toBe(0);
    expect(written).toBe("docs-only=true\n");
  });

  it("writes docs-only=false for a mixed push and for a missing before SHA", () => {
    const dir = repo();
    commitFile(dir, "src/app.ts", "export const n = 1;\n");
    const before = git(dir, ["rev-parse", "HEAD"]).trim();
    commitFile(dir, "docs/plan/board.md", "# board\n");
    commitFile(dir, "src/lib.ts", "export const m = 2;\n");
    const after = git(dir, ["rev-parse", "HEAD"]).trim();
    let mixed = "";
    let absent = "";

    withoutHookGitEnv(() => {
      runDocsOnlyCli({
        args: ["--github-output"],
        env: {
          BEFORE_SHA: before,
          AFTER_SHA: after,
          GITHUB_OUTPUT: "out",
        },
        cwd: dir,
        log: () => undefined,
        writeOutput: (_file, line) => {
          mixed = line;
        },
      });
      runDocsOnlyCli({
        args: ["--github-output"],
        env: {
          BEFORE_SHA: "0000000000000000000000000000000000000000",
          AFTER_SHA: after,
          GITHUB_OUTPUT: "out",
        },
        cwd: dir,
        log: () => undefined,
        writeOutput: (_file, line) => {
          absent = line;
        },
      });
    });

    expect(mixed).toBe("docs-only=false\n");
    expect(absent).toBe("docs-only=false\n");
  });

  it("exits 0 from --skip-push only when upstream..HEAD is docs-only", () => {
    const dir = repo();
    commitFile(dir, "src/app.ts", "export const n = 1;\n");
    git(dir, ["checkout", "-b", "upstream"]);
    git(dir, ["checkout", "-b", "topic"]);
    git(dir, ["branch", "--set-upstream-to=upstream"]);
    commitFile(dir, "docs/plan/board.md", "# board\n");

    const docsOnly = withoutHookGitEnv(() =>
      runDocsOnlyCli({
        args: ["--skip-push"],
        env: {},
        cwd: dir,
        log: () => undefined,
        writeOutput: () => undefined,
      }),
    );

    commitFile(dir, "src/lib.ts", "export const m = 2;\n");
    const mixed = withoutHookGitEnv(() =>
      runDocsOnlyCli({
        args: ["--skip-push"],
        env: {},
        cwd: dir,
        log: () => undefined,
        writeOutput: () => undefined,
      }),
    );

    expect(docsOnly).toBe(0);
    expect(mixed).toBe(1);
  });
});

describe("lefthook.yml pre-push", () => {
  it("skips npm run check when the docs-only script exits 0", () => {
    expect(lefthookYaml).toContain(
      "- run: npx tsx tooling/ci/docs-only-cli.ts --skip-push",
    );
    expect(lefthookYaml).toContain(
      "env -u GIT_DIR -u GIT_WORK_TREE -u GIT_INDEX_FILE -u GIT_PREFIX npm run check",
    );
  });
});
