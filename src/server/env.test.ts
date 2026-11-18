import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it, expect, afterEach, vi } from "vitest";
import {
  clearEnvCache,
  getDbClientEnv,
  getEnv,
  loadDotEnvIfPresent,
  EnvError,
} from "./env";

const TOKEN_MUST_NOT_APPEAR = "turso-secret-do-not-log";

function captureEnvError(): EnvError {
  try {
    getEnv();
  } catch (error) {
    if (error instanceof EnvError) return error;
    throw error;
  }
  throw new Error("expected getEnv to throw EnvError");
}

describe("getDbClientEnv", () => {
  afterEach(() => {
    clearEnvCache();
    vi.unstubAllEnvs();
  });

  it("allows missing OPENAI_API_KEY for local SQLite bootstrap", () => {
    clearEnvCache();
    vi.stubEnv("OPENAI_API_KEY", undefined);
    vi.stubEnv("AI_CLIENT", "openai");
    vi.stubEnv("LIBSQL_AUTH_TOKEN", "turso-secret-do-not-log");
    vi.stubEnv("APP_TIME_ZONE", "America/Chicago");

    expect(getDbClientEnv()).toMatchObject({
      LIBSQL_AUTH_TOKEN: "turso-secret-do-not-log",
      APP_TIME_ZONE: "America/Chicago",
    });
  });
});

describe("loadDotEnvIfPresent", () => {
  it("loads .env from cwd when the file exists", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dotenv-"));
    const envPath = path.join(dir, ".env");
    fs.writeFileSync(envPath, "DOTENV_PROBE=from-file\n");
    const loaded: string[] = [];

    expect(
      loadDotEnvIfPresent(dir, (filePath) => {
        loaded.push(filePath);
      }),
    ).toBe(true);
    expect(loaded).toEqual([envPath]);

    expect(
      loadDotEnvIfPresent(path.join(dir, "missing"), () => {
        loaded.push("should-not-run");
      }),
    ).toBe(false);
    expect(loaded).toEqual([envPath]);
  });
});

describe("getEnv", () => {
  afterEach(() => {
    clearEnvCache();
    vi.unstubAllEnvs();
  });

  it("file URL on Vercel throws", () => {
    vi.stubEnv("VITEST", undefined);
    vi.stubEnv("AI_CLIENT", "fake");
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("LIBSQL_AUTH_TOKEN", TOKEN_MUST_NOT_APPEAR);
    vi.stubEnv("APP_TIME_ZONE", "America/Chicago");
    vi.stubEnv("DATABASE_URL", undefined);
    clearEnvCache();

    const forgotten = captureEnvError();
    expect(forgotten.variableNames).toEqual(["DATABASE_URL"]);
    expect(forgotten.message).toMatch(/DATABASE_URL/);
    expect(forgotten.message).not.toContain(TOKEN_MUST_NOT_APPEAR);

    vi.stubEnv("DATABASE_URL", "file:./data.db");
    clearEnvCache();

    const explicit = captureEnvError();
    expect(explicit.variableNames).toEqual(["DATABASE_URL"]);
    expect(explicit.message).toMatch(/DATABASE_URL/);
    expect(explicit.message).not.toContain(TOKEN_MUST_NOT_APPEAR);
  });

  it("remote URL on Vercel requires token and timezone", () => {
    vi.stubEnv("VITEST", undefined);
    vi.stubEnv("AI_CLIENT", "fake");
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("DATABASE_URL", "libsql://consigne-preview.turso.io");
    vi.stubEnv("APP_TIME_ZONE", "America/Chicago");
    vi.stubEnv("LIBSQL_AUTH_TOKEN", undefined);
    clearEnvCache();

    const missing = captureEnvError();
    expect(missing.variableNames).toEqual(["LIBSQL_AUTH_TOKEN"]);
    expect(missing.message).toMatch(/LIBSQL_AUTH_TOKEN/);

    vi.stubEnv("LIBSQL_AUTH_TOKEN", "");
    clearEnvCache();

    const empty = captureEnvError();
    expect(empty.variableNames).toEqual(["LIBSQL_AUTH_TOKEN"]);
    expect(empty.message).toMatch(/LIBSQL_AUTH_TOKEN/);

    vi.stubEnv("LIBSQL_AUTH_TOKEN", TOKEN_MUST_NOT_APPEAR);
    vi.stubEnv("APP_TIME_ZONE", undefined);
    clearEnvCache();

    const missingZone = captureEnvError();
    expect(missingZone.variableNames).toEqual(["APP_TIME_ZONE"]);
    expect(missingZone.message).toMatch(/APP_TIME_ZONE/);
    expect(missingZone.message).not.toContain(TOKEN_MUST_NOT_APPEAR);

    vi.stubEnv("APP_TIME_ZONE", "");
    clearEnvCache();

    const emptyZone = captureEnvError();
    expect(emptyZone.variableNames).toEqual(["APP_TIME_ZONE"]);
    expect(emptyZone.message).not.toContain(TOKEN_MUST_NOT_APPEAR);

    vi.stubEnv("APP_TIME_ZONE", "America/Chicago");
    clearEnvCache();
    expect(getEnv()).toMatchObject({
      DATABASE_URL: "libsql://consigne-preview.turso.io",
      LIBSQL_AUTH_TOKEN: TOKEN_MUST_NOT_APPEAR,
      APP_TIME_ZONE: "America/Chicago",
    });

    vi.stubEnv("DATABASE_URL", "https://consigne-preview.turso.io");
    clearEnvCache();
    expect(getEnv().DATABASE_URL).toBe("https://consigne-preview.turso.io");
  });

  it("local default stays file:./data.db", () => {
    vi.stubEnv("VITEST", undefined);
    vi.stubEnv("VERCEL", undefined);
    vi.stubEnv("DATABASE_URL", undefined);
    vi.stubEnv("LIBSQL_AUTH_TOKEN", undefined);
    vi.stubEnv("APP_TIME_ZONE", undefined);
    vi.stubEnv("AI_CLIENT", "fake");
    clearEnvCache();

    const env = getEnv();
    expect(env.DATABASE_URL).toBe("file:./data.db");
    expect(env.LIBSQL_AUTH_TOKEN).toBeUndefined();
    expect(env.APP_TIME_ZONE).toBeUndefined();
  });

  it("throws EnvError mentioning OPENAI_API_KEY when the key is missing and AI_CLIENT is openai", () => {
    clearEnvCache();
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.stubEnv("AI_CLIENT", "openai");

    expect(() => getEnv()).toThrow(EnvError);
    expect(() => getEnv()).toThrow(/OPENAI_API_KEY/);
  });

  it("succeeds without OPENAI_API_KEY when AI_CLIENT is fake", () => {
    clearEnvCache();
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.stubEnv("AI_CLIENT", "fake");

    const env = getEnv();
    expect(env.AI_CLIENT).toBe("fake");
    expect(env.DATABASE_URL).toBe(":memory:");
  });
});
