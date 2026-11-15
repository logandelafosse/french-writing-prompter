import { getEnv } from "@/server/env";
import { OpenAiClient } from "@/modules/openai-client/openai-client";
import { FakeAiClient } from "./fake-ai-client";

export type E2eScenario = "happy" | "malformed" | "failure";

const SCENARIO_HEADER = "x-e2e-scenario";

export function parseE2eScenario(raw: string | null): E2eScenario {
  if (raw === "malformed" || raw === "failure") {
    return raw;
  }
  return "happy";
}

export function scenarioFromRequest(request: Request): E2eScenario {
  return parseE2eScenario(request.headers.get(SCENARIO_HEADER));
}

export type AiClient = OpenAiClient | FakeAiClient;

export function getAiClient(scenario: E2eScenario = "happy"): AiClient {
  if (getEnv().AI_CLIENT === "fake") {
    return new FakeAiClient(scenario);
  }
  return new OpenAiClient();
}
