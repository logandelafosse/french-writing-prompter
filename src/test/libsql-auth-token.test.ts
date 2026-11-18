import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(import.meta.dirname, "../..");

const AUTH_TOKEN_FILES = new Set([
  "src/db/libsql-client.ts",
  "src/server/env.ts",
  "drizzle.config.ts",
]);

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function productionSources(): string[] {
  const roots = [path.join(ROOT, "src"), path.join(ROOT, "scripts")];
  const files = roots.flatMap((dir) => walk(dir));
  files.push(path.join(ROOT, "drizzle.config.ts"));
  return files.filter((file) => {
    const rel = path.relative(ROOT, file).replaceAll("\\", "/");
    if (rel.endsWith(".test.ts") || rel.endsWith(".test.tsx")) return false;
    if (rel.startsWith("src/test/")) return false;
    return /\.(ts|tsx|mjs|js)$/.test(rel);
  });
}

describe("libsql auth token", () => {
  it("stays out of migrate and every other production file", () => {
    const migrate = readFileSync(path.join(ROOT, "scripts/migrate.ts"), "utf8");
    expect(migrate).not.toContain("createClient(");

    const offenders: string[] = [];
    for (const file of productionSources()) {
      const rel = path.relative(ROOT, file).replaceAll("\\", "/");
      const text = readFileSync(file, "utf8");
      if (/\bauthToken\b/.test(text) && !AUTH_TOKEN_FILES.has(rel)) {
        offenders.push(rel);
      }
    }
    expect(offenders).toEqual([]);
  });
});
