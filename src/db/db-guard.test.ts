import { describe, it, expect, vi } from "vitest";

async function expectDbImportRejects(envUrl: string): Promise<void> {
  vi.stubEnv("DATABASE_URL", envUrl);
  await expect(async () => {
    vi.resetModules();
    await import("@/db");
  }).rejects.toThrow(/Refusing to open .+ under Vitest/);
  vi.unstubAllEnvs();
}

describe("database guard under Vitest", () => {
  it("refuses file URLs that point inside the repo", async () => {
    await expectDbImportRejects("file:./data.db");
    await expectDbImportRejects("File:./data.db");
    await expectDbImportRejects("FILE:./data.db");
  });

  it("refuses remote database URLs", async () => {
    await expectDbImportRejects("libsql://example.turso.io");
    await expectDbImportRejects("https://example.db");
  });
});
