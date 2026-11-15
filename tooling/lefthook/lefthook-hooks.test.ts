import { execSync, spawnSync } from "node:child_process";
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { z } from "zod";
import { parseJson } from "@/lib/json";

const root = path.resolve(import.meta.dirname, "../..");

const SYNC_FROM_WORKING_TREE = [
  "lefthook.yml",
  "package.json",
  "package-lock.json",
  "opencode.json",
] as const;

const GIT_IDENTITY = [
  "-c",
  "user.email=hooks@test",
  "-c",
  "user.name=Hooks Test",
];

async function createHookWorktree(): Promise<{
  dir: string;
  dispose: () => Promise<void>;
}> {
  const parent = await mkdtemp(path.join(tmpdir(), "fwp-lefthook-"));
  const dir = path.join(parent, "repo");
  execSync(`git worktree add "${dir}" HEAD`, { cwd: root, stdio: "pipe" });
  for (const file of SYNC_FROM_WORKING_TREE) {
    await copyFile(path.join(root, file), path.join(dir, file));
  }
  return {
    dir,
    dispose: async () => {
      try {
        execSync(`git worktree remove -f "${dir}"`, {
          cwd: root,
          stdio: "pipe",
        });
      } finally {
        await rm(parent, { recursive: true, force: true });
      }
    },
  };
}

function git(cwd: string, args: string[]): string {
  const result = spawnSync("git", [...GIT_IDENTITY, ...args], {
    cwd,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(
      result.stderr || result.stdout || `git ${args.join(" ")} failed`,
    );
  }
  return result.stdout;
}

function tryGitCommit(
  cwd: string,
  message: string,
): {
  ok: boolean;
  output: string;
} {
  const result = spawnSync("git", [...GIT_IDENTITY, "commit", "-m", message], {
    cwd,
    encoding: "utf8",
  });
  return {
    ok: result.status === 0,
    output: `${result.stdout || ""}${result.stderr || ""}`,
  };
}

async function writeScratchFile(
  cwd: string,
  rel: string,
  contents: string,
): Promise<string> {
  const abs = path.join(cwd, rel);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, contents);
  return abs;
}

function runHooksInstall(cwd: string): void {
  execSync("npm ci", {
    cwd,
    stdio: "pipe",
    env: { ...process.env },
  });
}

describe("lefthook git hooks", { timeout: 600_000 }, () => {
  let worktree: { dir: string; dispose: () => Promise<void> };

  beforeAll(async () => {
    worktree = await createHookWorktree();
    runHooksInstall(worktree.dir);
  }, 600_000);

  afterAll(async () => {
    await worktree.dispose();
  }, 60_000);

  async function resetWorktree(): Promise<void> {
    git(worktree.dir, ["reset", "--hard", "HEAD"]);
    git(worktree.dir, ["clean", "-fd"]);
    for (const file of SYNC_FROM_WORKING_TREE) {
      await copyFile(path.join(root, file), path.join(worktree.dir, file));
    }
  }

  it("installs hooks inside the app repo only", async () => {
    const appRoot = execSync("git rev-parse --show-toplevel", {
      cwd: root,
      encoding: "utf8",
    }).trim();
    const hooksPath = execSync("git rev-parse --git-path hooks", {
      cwd: worktree.dir,
      encoding: "utf8",
    }).trim();
    expect(path.resolve(hooksPath)).toBe(
      path.resolve(appRoot, ".git", "hooks"),
    );

    const preCommit = await readFile(
      path.join(hooksPath, "pre-commit"),
      "utf8",
    );
    const prePush = await readFile(path.join(hooksPath, "pre-push"), "utf8");
    expect(preCommit).toMatch(/lefthook/i);
    expect(prePush).toMatch(/lefthook/i);
  });

  it("rejects a commit with a UTC date key", async () => {
    await resetWorktree();
    const rel = "src/lib/hooks-utc-date.ts";
    await writeScratchFile(
      worktree.dir,
      rel,
      `export const day = new Date().toISOString().split("T")[0];\n`,
    );
    git(worktree.dir, ["add", rel]);
    const result = tryGitCommit(worktree.dir, "utc date should fail");
    expect(result.ok).toBe(false);
    expect(result.output).toMatch(/ast-grep|no-utc-date-key|utc/i);
    await resetWorktree();
  });

  it("rejects a commit with a floating promise", async () => {
    await resetWorktree();
    const rel = "src/lib/hooks-floating-promise.ts";
    await writeScratchFile(
      worktree.dir,
      rel,
      `export function scratch() {\n  fetch("/api/example");\n}\n`,
    );
    git(worktree.dir, ["add", rel]);
    const result = tryGitCommit(worktree.dir, "floating promise should fail");
    expect(result.ok).toBe(false);
    expect(result.output).toMatch(/floating-promises|eslint/i);
    await resetWorktree();
  });

  it("rejects a commit with a type error", async () => {
    await resetWorktree();
    const rel = "src/lib/hooks-type-error.ts";
    await writeScratchFile(
      worktree.dir,
      rel,
      `export const broken: number = "not-a-number";\n`,
    );
    git(worktree.dir, ["add", rel]);
    const result = tryGitCommit(worktree.dir, "type error should fail");
    expect(result.ok).toBe(false);
    expect(result.output).toMatch(/tsc|typecheck|error TS/i);
    await resetWorktree();
  });

  it("formats a mis-staged file and commits successfully", async () => {
    await resetWorktree();
    const rel = "src/lib/hooks-prettier-fix.ts";
    const abs = await writeScratchFile(
      worktree.dir,
      rel,
      `export const x=1;\n`,
    );
    git(worktree.dir, ["add", rel]);
    const result = tryGitCommit(worktree.dir, "prettier should fix spacing");
    expect(result.ok).toBe(true);

    const committed = await readFile(abs, "utf8");
    expect(committed).toBe("export const x = 1;\n");

    git(worktree.dir, ["reset", "--hard", "HEAD~1"]);
    await resetWorktree();
  });

  it("runs prettier but skips code hooks on docs-only commits", async () => {
    await resetWorktree();
    const rel = "docs/lefthook-scratch-note.md";
    const abs = path.join(worktree.dir, rel);
    await writeFile(abs, `# scratch\n\nno   extra   spaces   stay\n`);
    git(worktree.dir, ["add", rel]);
    const result = tryGitCommit(worktree.dir, "docs only");
    expect(result.ok).toBe(true);

    expect(result.output).toMatch(/eslint \(skip\)|no files for inspection/i);
    expect(result.output).toMatch(
      /typecheck \(skip\)|no matching staged files/i,
    );
    git(worktree.dir, ["reset", "--hard", "HEAD~1"]);
    await resetWorktree();
  });

  it("runs npm run check on pre-push and fails when check would fail", async () => {
    await resetWorktree();
    const rel = "src/lib/hooks-push-block.ts";
    await writeScratchFile(
      worktree.dir,
      rel,
      `export const day = new Date().toISOString().split("T")[0];\n`,
    );
    git(worktree.dir, ["add", rel]);
    spawnSync(
      "git",
      [...GIT_IDENTITY, "commit", "--no-verify", "-m", "seed bad file"],
      { cwd: worktree.dir, encoding: "utf8" },
    );

    const pushHook = spawnSync("npx", ["lefthook", "run", "pre-push"], {
      cwd: worktree.dir,
      encoding: "utf8",
      env: { ...process.env },
    });
    expect(pushHook.status).not.toBe(0);
    expect(`${pushHook.stdout || ""}${pushHook.stderr || ""}`).toMatch(
      /check|ast-grep|eslint|error/i,
    );
    git(worktree.dir, ["reset", "--hard", "HEAD~1"]);
    await resetWorktree();
  });
});

describe("opencode.json destructive escapes", () => {
  it("denies --no-verify, force push, rm -rf, and sqlite3 data.db", async () => {
    const raw = await readFile(path.join(root, "opencode.json"), "utf8");
    const OpencodeConfig = z.object({
      $schema: z.string(),
      permission: z.object({
        bash: z.record(z.string(), z.string()),
      }),
    });
    const parsed = parseJson(OpencodeConfig, raw);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const config = parsed.value;
    expect(config.$schema).toBe("https://opencode.ai/config.json");
    const bash = config.permission.bash;
    expect(bash["*"]).toBe("allow");
    expect(bash["*--no-verify*"]).toBe("deny");
    expect(bash["git push --force*"]).toBe("deny");
    expect(bash["git push -f*"]).toBe("deny");
    expect(bash["rm -rf *"]).toBe("deny");
    expect(bash["sqlite3 data.db*"]).toBe("deny");
  });
});
