import { describe, it, expect, afterEach, vi } from "vitest";
import { clearEnvCache, getEnv, EnvError } from "./env";

describe("getEnv", () => {
  afterEach(() => {
    clearEnvCache();
    vi.unstubAllEnvs();
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
