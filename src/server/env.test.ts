import { describe, it, expect, afterEach } from "vitest";
import { clearEnvCache, getEnv, EnvError } from "./env";

describe("getEnv", () => {
  afterEach(() => {
    clearEnvCache();
  });

  it("throws EnvError mentioning OPENAI_API_KEY when the key is missing and AI_CLIENT is openai", () => {
    clearEnvCache();
    delete process.env.OPENAI_API_KEY;
    process.env.AI_CLIENT = "openai";

    expect(() => getEnv()).toThrow(EnvError);
    try {
      getEnv();
    } catch (error) {
      expect(error).toBeInstanceOf(EnvError);
      expect((error as EnvError).message).toContain("OPENAI_API_KEY");
    }
  });

  it("succeeds without OPENAI_API_KEY when AI_CLIENT is fake", () => {
    clearEnvCache();
    delete process.env.OPENAI_API_KEY;
    process.env.AI_CLIENT = "fake";

    const env = getEnv();
    expect(env.AI_CLIENT).toBe("fake");
    expect(env.DATABASE_URL).toBe(":memory:");
  });
});
