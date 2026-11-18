import { spawnSync } from "node:child_process";

const HOOK_GIT_KEYS = [
  "GIT_DIR",
  "GIT_WORK_TREE",
  "GIT_INDEX_FILE",
  "GIT_PREFIX",
] as const;

export type DocsOnlyEnv = {
  BEFORE_SHA?: string | undefined;
  AFTER_SHA?: string | undefined;
  GITHUB_OUTPUT?: string | undefined;
};

export type DocsOnlyCliInput = {
  args: readonly string[];
  env: DocsOnlyEnv;
  cwd: string;
  log: (message: string) => void;
  writeOutput: (filePath: string, line: string) => void;
};

export function isDocsPath(filePath: string): boolean {
  const normalized = filePath
    .replaceAll("\\", "/")
    .replace(/^\.\//, "")
    .replace(/\/+$/, "");
  return normalized === "docs" || normalized.startsWith("docs/");
}

export function isDocsOnlyPaths(paths: readonly string[]): boolean {
  return paths.length > 0 && paths.every(isDocsPath);
}

export function isAbsentSha(sha: string | undefined): boolean {
  return sha === undefined || sha === "" || /^0+$/.test(sha);
}

function gitEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  for (const key of HOOK_GIT_KEYS) {
    delete env[key];
  }
  return env;
}

function gitLines(cwd: string, args: string[]): string[] | undefined {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    env: gitEnv(),
  });
  if (result.status !== 0) {
    return undefined;
  }
  return result.stdout
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function revParse(cwd: string, rev: string): string | undefined {
  const lines = gitLines(cwd, ["rev-parse", "--verify", rev]);
  return lines?.[0];
}

export function changedFilesBetween(
  fromSha: string,
  toSha: string,
  cwd: string,
): string[] {
  if (isAbsentSha(fromSha) || isAbsentSha(toSha)) {
    return [];
  }
  return (
    gitLines(cwd, [
      "diff",
      "--name-only",
      "--diff-filter=ACDMRT",
      fromSha,
      toSha,
    ]) ?? []
  );
}

export function resolveUpstreamSha(cwd: string): string | undefined {
  return (
    revParse(cwd, "@{u}") ??
    revParse(cwd, "refs/remotes/github/main") ??
    revParse(cwd, "refs/remotes/origin/main")
  );
}

export function changedFilesSinceUpstream(cwd: string): string[] {
  const upstream = resolveUpstreamSha(cwd);
  const head = revParse(cwd, "HEAD");
  if (upstream === undefined || head === undefined) {
    return [];
  }
  return changedFilesBetween(upstream, head, cwd);
}

export function runDocsOnlyCli(input: DocsOnlyCliInput): number {
  if (input.args.includes("--github-output")) {
    const files = changedFilesBetween(
      input.env.BEFORE_SHA ?? "",
      input.env.AFTER_SHA ?? "",
      input.cwd,
    );
    const line = `docs-only=${isDocsOnlyPaths(files)}\n`;
    const outputPath = input.env.GITHUB_OUTPUT;
    if (outputPath !== undefined && outputPath !== "") {
      input.writeOutput(outputPath, line);
    } else {
      input.log(line.trimEnd());
    }
    return 0;
  }

  if (input.args.includes("--skip-push")) {
    const files = changedFilesSinceUpstream(input.cwd);
    if (isDocsOnlyPaths(files)) {
      input.log("docs-only push: skipping npm run check");
      return 0;
    }
    return 1;
  }

  input.log("usage: docs-only-cli --github-output | --skip-push");
  return 2;
}
