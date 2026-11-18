import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const script = path.resolve(
  import.meta.dirname,
  "../../scripts/install-hooks.mjs",
);

async function runInstall(flags: {
  lefthook?: string;
  ci?: string;
}): Promise<{ status: number | null; args: string }> {
  const dir = await mkdtemp(path.join(tmpdir(), "fwp-install-hooks-"));
  const bin = path.join(dir, "bin");
  const marker = path.join(dir, "lefthook-ran");
  await mkdir(bin);
  await writeFile(
    path.join(bin, "lefthook"),
    `#!/usr/bin/env node\nimport { writeFileSync } from "node:fs";\nwriteFileSync(${JSON.stringify(marker)}, process.argv.slice(2).join(" "));\nprocess.exit(1);\n`,
  );
  await chmod(path.join(bin, "lefthook"), 0o755);

  const env: NodeJS.ProcessEnv = { ...process.env };
  delete env.LEFTHOOK;
  delete env.CI;
  env.PATH = `${bin}${path.delimiter}${process.env.PATH ?? ""}`;
  if (flags.lefthook !== undefined) {
    env.LEFTHOOK = flags.lefthook;
  }
  if (flags.ci !== undefined) {
    env.CI = flags.ci;
  }

  const result = spawnSync(process.execPath, [script], {
    cwd: dir,
    env,
    encoding: "utf8",
  });
  const args = existsSync(marker) ? await readFile(marker, "utf8") : "";
  await rm(dir, { recursive: true, force: true });
  return { status: result.status, args };
}

describe("install hooks", () => {
  it("skips lefthook when LEFTHOOK is 0", async () => {
    const result = await runInstall({ lefthook: "0" });
    expect(result.status).toBe(0);
    expect(result.args).toBe("");
  });

  it("skips lefthook when LEFTHOOK is false", async () => {
    const result = await runInstall({ lefthook: "false" });
    expect(result.status).toBe(0);
    expect(result.args).toBe("");
  });

  it("skips lefthook when CI is true", async () => {
    const result = await runInstall({ ci: "true" });
    expect(result.status).toBe(0);
    expect(result.args).toBe("");
  });

  it("runs lefthook install when CI is 0 or false", async () => {
    const zero = await runInstall({ ci: "0" });
    const off = await runInstall({ ci: "false" });
    expect(zero.args).toBe("install");
    expect(zero.status).toBe(1);
    expect(off.args).toBe("install");
    expect(off.status).toBe(1);
  });

  it("runs lefthook install when LEFTHOOK and CI are unset", async () => {
    const result = await runInstall({});
    expect(result.args).toBe("install");
    expect(result.status).toBe(1);
  });
});
