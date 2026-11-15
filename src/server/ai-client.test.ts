import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Evaluation } from "@/contracts/evaluation";
import { clearEnvCache } from "@/server/env";
import { AiOutputError } from "@/modules/openai-client/ai-output-error";
import {
  getAiClient,
  parseE2eScenario,
  scenarioFromRequest,
} from "./ai-client";
import { FakeAiClient } from "./fake-ai-client";

describe("getAiClient", () => {
  beforeEach(() => {
    clearEnvCache();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    clearEnvCache();
  });

  it("returns the fake client when AI_CLIENT=fake", () => {
    vi.stubEnv("AI_CLIENT", "fake");
    clearEnvCache();
    expect(getAiClient("happy")).toBeInstanceOf(FakeAiClient);
  });

  it("ignores the scenario header unless AI_CLIENT=fake", () => {
    vi.stubEnv("AI_CLIENT", "openai");
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    clearEnvCache();

    const request = new Request("http://localhost/api/evaluate", {
      headers: { "x-e2e-scenario": "malformed" },
    });
    expect(scenarioFromRequest(request)).toBe("malformed");
    expect(getAiClient(scenarioFromRequest(request))).not.toBeInstanceOf(
      FakeAiClient,
    );

    vi.stubEnv("AI_CLIENT", "fake");
    clearEnvCache();
    expect(getAiClient(parseE2eScenario("malformed"))).toBeInstanceOf(
      FakeAiClient,
    );
  });

  it("malformed scenario produces output the contract rejects", async () => {
    const client = new FakeAiClient("malformed");
    await expect(
      client.chatCompletionJSON(Evaluation, {
        model: "test",
        messages: [{ role: "user", content: "x" }],
      }),
    ).rejects.toBeInstanceOf(AiOutputError);
  });
});
