import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { AI_ROUTE_MAX_DURATION } from "./ai";

function openAiClientBudgetSeconds(source: string): number {
  const match =
    /new OpenAI\(\{[\s\S]*?maxRetries:\s*(\d+),[\s\S]*?timeout:\s*(\d+)/.exec(
      source,
    );
  const maxRetriesRaw = match?.[1];
  const timeoutMsRaw = match?.[2];
  if (maxRetriesRaw === undefined || timeoutMsRaw === undefined) {
    throw new Error("OpenAiClient is missing timeout or maxRetries");
  }
  const maxRetries = Number(maxRetriesRaw);
  const timeoutMs = Number(timeoutMsRaw);
  return (timeoutMs / 1000) * (maxRetries + 1);
}

describe("AI_ROUTE_MAX_DURATION", () => {
  it("covers timeout times attempts", () => {
    const source = readFileSync(
      join(process.cwd(), "src/modules/openai-client/openai-client.ts"),
      "utf8",
    );
    const budgetSeconds = openAiClientBudgetSeconds(source);

    expect(budgetSeconds).toBe(120);
    expect(AI_ROUTE_MAX_DURATION).toBe(120);
    expect(AI_ROUTE_MAX_DURATION).toBeGreaterThanOrEqual(budgetSeconds);
  });
});
