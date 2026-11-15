import { describe, it, expect } from "vitest";
import { assertE2eDatabaseUrl } from "./e2e-database";

describe("assertE2eDatabaseUrl", () => {
  it("throws when DATABASE_URL points outside .e2e/", () => {
    expect(() => assertE2eDatabaseUrl("file:./data.db")).toThrow(
      /Refusing to run e2e/,
    );
  });

  it("accepts a database file under .e2e/", () => {
    expect(() => assertE2eDatabaseUrl("file:./.e2e/e2e.db")).not.toThrow();
  });
});
