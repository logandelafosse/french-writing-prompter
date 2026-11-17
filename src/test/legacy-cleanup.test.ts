import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "../..");

describe("T35a legacy cleanup", () => {
  it("removes §2.10 leftover files and the evaluate alias", () => {
    expect(existsSync(path.join(root, "src/components/legacy"))).toBe(false);
    expect(existsSync(path.join(root, "src/app/api/evaluate"))).toBe(false);
  });
});
