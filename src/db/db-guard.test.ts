import { describe, it, expect, vi } from "vitest";

async function expectDbImportRejects(envUrl: string): Promise<void> {
  vi.stubEnv("DATABASE_URL", envUrl);
  await expect(async () => {
    vi.resetModules();
    const { clearEnvCache } = await import("@/server/env");
    clearEnvCache();
    const { db } = await import("@/db");
    const { sessions } = await import("@/db/schema");
    await db.select().from(sessions);
  }).rejects.toThrow(/Refusing to open .+ under Vitest/);
  vi.unstubAllEnvs();
}

describe("database guard under Vitest", () => {
  it("refuses file URLs that point inside the repo", async () => {
    expect.assertions(3);
    await expectDbImportRejects("file:./data.db");
    await expectDbImportRejects("File:./data.db");
    await expectDbImportRejects("FILE:./data.db");
  });

  it("refuses remote database URLs", async () => {
    expect.assertions(2);
    await expectDbImportRejects("libsql://example.turso.io");
    await expectDbImportRejects("https://example.db");
  });
});
