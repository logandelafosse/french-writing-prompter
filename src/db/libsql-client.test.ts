import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@libsql/client", () => ({
  createClient: vi.fn(() => ({ close() {} })),
}));

describe("createLibsqlClient", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("forwards authToken without requiring OPENAI_API_KEY", async () => {
    vi.stubEnv("VITEST", undefined);
    vi.stubEnv("AI_CLIENT", "openai");
    vi.stubEnv("OPENAI_API_KEY", undefined);
    vi.stubEnv("LIBSQL_AUTH_TOKEN", "turso-secret-do-not-log");
    // setup-db already loaded @libsql/client; reload so this file's mock applies.
    vi.resetModules();

    const { createClient } = await import("@libsql/client");
    const { clearEnvCache } = await import("@/server/env");
    const { createLibsqlClient } = await import("./libsql-client");
    const mockedCreateClient = vi.mocked(createClient);
    clearEnvCache();

    createLibsqlClient("file:/tmp/learner.db");

    expect(mockedCreateClient).toHaveBeenCalledWith({
      url: "file:/tmp/learner.db",
      authToken: "turso-secret-do-not-log",
    });

    vi.stubEnv("LIBSQL_AUTH_TOKEN", undefined);
    clearEnvCache();
    mockedCreateClient.mockClear();

    createLibsqlClient("file:/tmp/learner.db");

    expect(mockedCreateClient).toHaveBeenCalledWith({
      url: "file:/tmp/learner.db",
    });

    vi.stubEnv("LIBSQL_AUTH_TOKEN", "");
    clearEnvCache();
    mockedCreateClient.mockClear();

    createLibsqlClient("file:/tmp/learner.db");

    expect(mockedCreateClient).toHaveBeenCalledWith({
      url: "file:/tmp/learner.db",
    });
  });
});
