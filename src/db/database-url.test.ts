import os from "node:os";
import path from "node:path";
import { describe, it, expect } from "vitest";
import { databaseUrlToFilePath } from "@/db/database-url";

describe("databaseUrlToFilePath", () => {
  it("resolves file URLs to absolute paths", () => {
    expect(databaseUrlToFilePath("file:./data.db")).toBe(
      path.resolve(process.cwd(), "data.db"),
    );
    expect(databaseUrlToFilePath("file:/tmp/fwp.db")).toBe(
      path.resolve("/tmp/fwp.db"),
    );
    expect(databaseUrlToFilePath("file:///tmp/fwp.db")).toBe(
      path.resolve("/tmp/fwp.db"),
    );
    expect(databaseUrlToFilePath("file://localhost/tmp/fwp.db")).toBe(
      path.resolve("/tmp/fwp.db"),
    );
  });

  it("returns null for non-file URLs", () => {
    expect(databaseUrlToFilePath(":memory:")).toBeNull();
    expect(databaseUrlToFilePath("libsql://x.turso.io")).toBeNull();
  });

  it("treats tmpdir file paths as on-disk for backups", () => {
    const sample = path.join(os.tmpdir(), "fwp-backup-check.db");
    const fileUrl = `file:${sample}`;
    expect(databaseUrlToFilePath(fileUrl)).toBe(path.resolve(sample));
  });
});