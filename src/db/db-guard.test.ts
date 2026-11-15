import { describe, it, expect, vi } from "vitest";

describe("database guard under Vitest", () => {
  it("refuses to open a file: URL under Vitest", async () => {
    vi.stubEnv("DATABASE_URL", "file:./data.db");

    await expect(async () => {
      vi.resetModules();
      await import("@/db");
    }).rejects.toThrow("Refusing to open file:./data.db under Vitest");
  });
});