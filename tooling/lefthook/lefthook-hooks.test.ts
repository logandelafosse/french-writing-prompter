import { execFileSync, execSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import {
  copyFile,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { z } from "zod";
import { parseJson } from "@/lib/json";

const root = path.resolve(import.meta.dirname, "../..");

const SYNC_FROM_WORKING_TREE = [
  "lefthook.yml",
  "package.json",
  "package-lock.json",
  "opencode.json",
  "scripts/install-hooks.mjs",
  "tooling/ci/docs-only.ts",
  "tooling/ci/docs-only-cli.ts",
] as const;

const GIT_IDENTITY = [
  "-c",
  "user.email=hooks@test",
  "-c",
  "user.name=Hooks Test",
];

const hookEnv = { ...process.env, LEFTHOOK: "1" };

function stripAnsi(text: string): string {
  return text.replace(/\u001b\[[0-9;]*m/g, "");
}

function hookOutput(stdout: string | null, stderr: string | null): string {
  return stripAnsi(`${stdout ?? ""}${stderr ?? ""}`);
}

const personalProjectsHooks = path.join(
  process.env.HOME ?? "",
  "Personal-Projects",
  ".git",
  "hooks",
);

async function listHookNames(dir: string): Promise<string[]> {
  if (!existsSync(dir)) {
    return [];
  }
  return (await readdir(dir)).toSorted();
}

async function createHookClone(): Promise<{
  dir: string;
  dispose: () => Promise<void>;
}> {
  const parent = await mkdtemp(path.join(tmpdir(), "fwp-lefthook-"));
  const dir = path.join(parent, "clone");
  execFileSync("git", ["clone", root, dir], { cwd: root, stdio: "pipe" });
  for (const file of SYNC_FROM_WORKING_TREE) {
    await copyFile(path.join(root, file), path.join(dir, file));
  }
  return {
    dir,
    dispose: async () => {
      await rm(parent, { recursive: true, force: true });
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

function gitShow(cwd: string, objectPath: string): string {
  return git(cwd, ["show", objectPath]);
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
    env: hookEnv,
  });
  return {
    ok: result.status === 0,
    output: hookOutput(result.stdout, result.stderr),
  };
}

function tryGitPush(cwd: string): { ok: boolean; output: string } {
  git(cwd, ["checkout", "-B", "main"]);
  const result = spawnSync(
    "git",
    [...GIT_IDENTITY, "push", "-u", "origin", "main"],
    { cwd, encoding: "utf8", env: hookEnv },
  );
  return {
    ok: result.status === 0,
    output: hookOutput(result.stdout, result.stderr),
  };
}

async function writeScratchFile(
  cwd: string,
  rel: string,
  contents: string,
): Promise<void> {
  const abs = path.join(cwd, rel);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, contents);
}

function runHooksInstall(cwd: string): void {
  const env: NodeJS.ProcessEnv = { ...process.env };
  delete env.CI;
  delete env.LEFTHOOK;
  const install = spawnSync("npm", ["ci"], {
    cwd,
    stdio: "pipe",
    env,
  });
  if (install.status !== 0) {
    throw new Error(install.stderr?.toString() || "npm ci failed");
  }
}

describe("lefthook git hooks", { timeout: 600_000 }, () => {
  let clone: { dir: string; dispose: () => Promise<void> } | undefined;

  beforeAll(async () => {
    clone = await createHookClone();
    runHooksInstall(clone.dir);
  }, 600_000);

  afterAll(async () => {
    await clone?.dispose();
  }, 60_000);

  async function resetClone(): Promise<void> {
    if (!clone) return;
    git(clone.dir, ["reset", "--hard", "HEAD"]);
    git(clone.dir, ["clean", "-fd"]);
    spawnSync("git", [...GIT_IDENTITY, "remote", "remove", "origin"], {
      cwd: clone.dir,
      encoding: "utf8",
    });
    for (const file of SYNC_FROM_WORKING_TREE) {
      await copyFile(path.join(root, file), path.join(clone.dir, file));
    }
  }

  it("installs hooks inside the app repo only", async () => {
    if (!clone) throw new Error("clone not ready");

    const parentHooksBefore = existsSync(personalProjectsHooks)
      ? await listHookNames(personalProjectsHooks)
      : [];

    const appRoot = execSync("git rev-parse --show-toplevel", {
      cwd: clone.dir,
      encoding: "utf8",
    }).trim();
    const resolvedHooks = path.join(appRoot, ".git", "hooks");
    const hooksPath = execSync("git rev-parse --git-path hooks", {
      cwd: clone.dir,
      encoding: "utf8",
    }).trim();
    expect(path.resolve(appRoot, hooksPath)).toBe(path.resolve(resolvedHooks));

    const preCommit = await readFile(
      path.join(resolvedHooks, "pre-commit"),
      "utf8",
    );
    const prePush = await readFile(
      path.join(resolvedHooks, "pre-push"),
      "utf8",
    );
    expect(preCommit).toMatch(/lefthook/i);
    expect(prePush).toMatch(/lefthook/i);

    const parentHooksAfter = existsSync(personalProjectsHooks)
      ? await listHookNames(personalProjectsHooks)
      : [];
    expect(parentHooksAfter).toEqual(parentHooksBefore);
  });

  it("rejects a commit with a UTC date key", async () => {
    await resetClone();
    const rel = "src/lib/hooks-utc-date.ts";
    await writeScratchFile(
      clone!.dir,
      rel,
      `export const day = new Date().toISOString().split("T")[0];\n`,
    );
    git(clone!.dir, ["add", rel]);
    const result = tryGitCommit(clone!.dir, "utc date should fail");
    expect(result.ok).toBe(false);
    expect(result.output).toMatch(/no-utc-date-key|ast-grep scan/i);
  });

  it("rejects a commit with a floating promise", async () => {
    await resetClone();
    const rel = "src/lib/hooks-floating-promise.ts";
    await writeScratchFile(
      clone!.dir,
      rel,
      `export function scratch() {\n  fetch("/api/example");\n}\n`,
    );
    git(clone!.dir, ["add", rel]);
    const result = tryGitCommit(clone!.dir, "floating promise should fail");
    expect(result.ok).toBe(false);
    expect(result.output).toMatch(
      /floating-promises|@typescript-eslint|eslint.*error/i,
    );
  });

  it("rejects a commit with a type error", async () => {
    await resetClone();
    const rel = "src/lib/hooks-type-error.ts";
    await writeScratchFile(
      clone!.dir,
      rel,
      `export const broken: number = "not-a-number";\n`,
    );
    git(clone!.dir, ["add", rel]);
    const result = tryGitCommit(clone!.dir, "type error should fail");
    expect(result.ok).toBe(false);
    expect(result.output).toMatch(/error TS\d+/i);
  });

  it("formats a mis-staged file and commits successfully", async () => {
    await resetClone();
    const rel = "src/lib/hooks-prettier-fix.ts";
    await writeScratchFile(clone!.dir, rel, `export const x=1;\n`);
    git(clone!.dir, ["add", rel]);
    const result = tryGitCommit(clone!.dir, "prettier should fix spacing");
    expect(result.ok).toBe(true);
    const committed = gitShow(clone!.dir, `HEAD:${rel}`);
    expect(committed).toBe("export const x = 1;\n");
    git(clone!.dir, ["reset", "--hard", "HEAD~1"]);
  });

  it("runs prettier but skips code hooks on docs-only commits", async () => {
    await resetClone();
    const rel = "docs/lefthook-scratch-note.md";
    await writeScratchFile(
      clone!.dir,
      rel,
      `# scratch\n\nno   extra   spaces   stay\n`,
    );
    git(clone!.dir, ["add", rel]);
    const result = tryGitCommit(clone!.dir, "docs only");
    expect(result.ok).toBe(true);
    expect(result.output).toMatch(/eslint \(skip\)|no files for inspection/i);
    expect(result.output).toMatch(
      /typecheck \(skip\)|no matching staged files/i,
    );
    expect(result.output).toMatch(/ast-grep \(skip\)|no files for inspection/i);

    const committed = gitShow(clone!.dir, `HEAD:${rel}`);
    expect(committed).not.toMatch(/no   extra   spaces/);

    git(clone!.dir, ["reset", "--hard", "HEAD~1"]);
  });

  it("skips npm run check on a docs-only pre-push", async () => {
    await resetClone();
    const bareParent = await mkdtemp(path.join(tmpdir(), "fwp-bare-"));
    const bare = path.join(bareParent, "remote.git");
    try {
      execFileSync("git", ["init", "--bare", bare], { stdio: "pipe" });
      git(clone!.dir, ["remote", "add", "origin", bare]);
      const setupPush = spawnSync(
        "git",
        [...GIT_IDENTITY, "push", "-u", "origin", "HEAD:main"],
        {
          cwd: clone!.dir,
          encoding: "utf8",
          env: { ...process.env, LEFTHOOK: "0" },
        },
      );
      expect(setupPush.status).toBe(0);

      const rel = "docs/plan/board-scratch.md";
      await writeScratchFile(clone!.dir, rel, "# board\n");
      git(clone!.dir, ["add", rel]);
      const committed = tryGitCommit(clone!.dir, "docs board");
      expect(committed.ok).toBe(true);

      await writeScratchFile(
        clone!.dir,
        "src/lib/hooks-docs-push-poison.ts",
        `export const broken: number = "not-a-number";\n`,
      );

      const push = tryGitPush(clone!.dir);
      expect(push.ok).toBe(true);
      expect(push.output).not.toMatch(/error TS\d+/i);
      expect(push.output).toMatch(/skip|docs-only/i);
    } finally {
      await rm(bareParent, { recursive: true, force: true });
    }
  });

  it("runs npm run check on pre-push and fails when check would fail", async () => {
    await resetClone();
    const bareParent = await mkdtemp(path.join(tmpdir(), "fwp-bare-"));
    const bare = path.join(bareParent, "remote.git");
    try {
      execFileSync("git", ["init", "--bare", bare], { stdio: "pipe" });
      git(clone!.dir, ["remote", "add", "origin", bare]);

      const rel = "src/lib/hooks-push-block.ts";
      await writeScratchFile(
        clone!.dir,
        rel,
        `export const day = new Date().toISOString().split("T")[0];\n`,
      );
      const push = tryGitPush(clone!.dir);
      expect(push.ok).toBe(false);
      expect(push.output).toMatch(
        /> french-writing-prompter@.*\s+check|npm run check/i,
      );
    } finally {
      await rm(bareParent, { recursive: true, force: true });
    }
  });
});

describe("opencode.json destructive escapes", () => {
  it("denies --no-verify, force push, rm -rf, and sqlite3 data.db", async () => {
    const raw = await readFile(path.join(root, "opencode.json"), "utf8");
    const OpenCodeConfig = z.object({
      $schema: z.string(),
      permission: z.object({
        bash: z.record(z.string(), z.string()),
      }),
    });
    const parsed = parseJson(OpenCodeConfig, raw);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const config = parsed.value;
    const schemaResponse = await fetch(config.$schema);
    expect(schemaResponse.ok).toBe(true);
    const schema = (await schemaResponse.json()) as object;
    const ajv = new Ajv2020({
      allErrors: true,
      strict: false,
      loadSchema: async (uri) => {
        const response = await fetch(uri);
        if (!response.ok) {
          throw new Error(`Failed to load schema ${uri}`);
        }
        return response.json() as Promise<object>;
      },
    });
    const validate = await ajv.compileAsync(schema);
    expect(validate(config)).toBe(true);

    const bash = config.permission.bash;
    expect(bash["*"]).toBe("allow");
    expect(bash["*--no-verify*"]).toBe("deny");
    expect(bash["git push --force*"]).toBe("deny");
    expect(bash["git push -f*"]).toBe("deny");
    expect(bash["rm -rf *"]).toBe("deny");
    expect(bash["sqlite3 data.db*"]).toBe("deny");
  });
});
