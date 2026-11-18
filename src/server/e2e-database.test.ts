import { describe, it, expect } from "vitest";
import { resetE2eDatabase } from "../../e2e/support/reset-db";
import { assertE2eDatabaseUrl } from "./e2e-database";

describe("e2e database guard", () => {
  it("rejects a turso URL", () => {
    expect(() =>
      assertE2eDatabaseUrl("libsql://consigne-preview.turso.io"),
    ).toThrow(
      /E2E requires a file: DATABASE_URL, got libsql:\/\/consigne-preview\.turso\.io/,
    );
  });
});

describe("assertE2eDatabaseUrl", () => {
  it("throws when DATABASE_URL points outside .e2e/", () => {
    expect(() => assertE2eDatabaseUrl("file:./data.db")).toThrow(
      /Refusing to run e2e/,
    );
  });

  it("accepts a database file under .e2e/", () => {
    expect(() => assertE2eDatabaseUrl("file:./.e2e/e2e.db")).not.toThrow();
  });

  it("resetE2eDatabase refuses when DATABASE_URL points outside .e2e/", async () => {
    const prior = process.env.DATABASE_URL;
    process.env.DATABASE_URL = "file:./data.db";
    await expect(resetE2eDatabase()).rejects.toThrow(/Refusing to run e2e/);
    if (prior === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = prior;
    }
  });
});
