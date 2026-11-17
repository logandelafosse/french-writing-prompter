import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { parseJson } from "@/lib/json";

const root = path.resolve(import.meta.dirname, "../..");
const PackageScripts = z.object({
  scripts: z.record(z.string(), z.string()),
});

describe("readme", () => {
  it("documented scripts exist", () => {
    const readme = readFileSync(path.join(root, "README.md"), "utf8");
    const pkg = parseJson(
      PackageScripts,
      readFileSync(path.join(root, "package.json"), "utf8"),
    );
    if (!pkg.ok) {
      throw new Error("package.json scripts were unreadable");
    }

    expect(readme).not.toMatch(/create-next-app/);

    const named = [...readme.matchAll(/npm run ([a-z0-9:-]+)/g)].flatMap(
      (match) => (match[1] === undefined ? [] : [match[1]]),
    );
    expect(named.length).toBeGreaterThan(0);
    for (const script of named) {
      expect(
        pkg.value.scripts,
        `README documents npm run ${script}`,
      ).toHaveProperty(script);
    }
  });
});
