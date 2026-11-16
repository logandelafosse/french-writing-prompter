/* eslint-disable @typescript-eslint/no-unused-vars -- fake client ignores OpenAI params; enable at EOF */
import fs from "node:fs";
import path from "node:path";
import type { z } from "zod";
import { parseJson } from "@/lib/json";
import { AiOutputError } from "@/modules/openai-client/ai-output-error";
import type { ChatCompletionParams } from "@/modules/openai-client/openai-client";
import { db } from "@/db";
import { sessions } from "@/db/schema";
import type { E2eScenario } from "./ai-client";

const FIXTURES_DIR = path.join(process.cwd(), "src/test/fixtures/ai");

function readFixtureText(name: string): string {
  return fs.readFileSync(path.join(FIXTURES_DIR, name), "utf8");
}

export class FakeAiClient {
  constructor(private readonly scenario: E2eScenario) {}

  chatCompletion(_params: ChatCompletionParams): Promise<string> {
    if (this.scenario === "failure") {
      return Promise.reject(new Error("AI service error"));
    }
    return Promise.resolve(readFixtureText("prompt.valid.txt").trim());
  }

  async chatCompletionJSON<S extends z.ZodType>(
    schema: S,
    _params: Omit<ChatCompletionParams, "response_format">,
    schemaName?: string,
  ): Promise<z.infer<S>> {
    if (this.scenario === "failure") {
      return Promise.reject(new Error("AI service error"));
    }

    const generatorFixture =
      schemaName === "generator"
        ? this.scenario === "malformed"
          ? "prompt-generator.invalid.json"
          : (await db.select({ id: sessions.id }).from(sessions)).length % 2 ===
              0
            ? "prompt-generator.valid.json"
            : "prompt-generator.swap.json"
        : null;

    const fixtureName =
      generatorFixture !== null
        ? generatorFixture
        : this.scenario === "malformed"
          ? "evaluation.invalid.json"
          : "evaluation.valid.json";
    const text = readFixtureText(fixtureName);
    const result = parseJson(schema, text);
    if (result.ok) {
      return Promise.resolve(result.value);
    }

    if (result.reason === "invalid_json") {
      return Promise.reject(
        new AiOutputError(
          "invalid_json",
          "AI response was not valid JSON",
          result.cause,
        ),
      );
    }

    return Promise.reject(
      new AiOutputError(
        "schema_mismatch",
        "AI response did not match the expected schema",
        result.cause,
      ),
    );
  }
}
/* eslint-enable @typescript-eslint/no-unused-vars -- fake client ignores OpenAI params */
