import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import type { z } from "zod";
import { parseJson } from "@/lib/json";
import { getEnv } from "@/server/env";
import { AiOutputError } from "./ai-output-error";

export interface ChatCompletionParams {
  model: string;
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }>;
  response_format?: OpenAI.Chat.Completions.ChatCompletionCreateParams["response_format"];
}

export class OpenAiClient {
  private openai: OpenAI | null = null;

  private client(): OpenAI {
    if (!this.openai) {
      const { OPENAI_API_KEY } = getEnv();
      this.openai = new OpenAI({
        apiKey: OPENAI_API_KEY ?? "",
        // gpt-6.1-terra Evaluation JSON often needs ~40s; 30s timed out on prod.
        maxRetries: 1,
        timeout: 60_000,
      });
    }
    return this.openai;
  }

  async chatCompletion(params: ChatCompletionParams): Promise<string> {
    try {
      const response = await this.client().chat.completions.create({
        model: params.model,
        messages: params.messages,
        ...(params.response_format && {
          response_format: params.response_format,
        }),
      });

      const choice = response.choices[0];
      if (choice === undefined) {
        return "";
      }
      return choice.message.content ?? "";
    } catch {
      throw new Error("AI service error");
    }
  }

  async chatCompletionJSON<S extends z.ZodType>(
    schema: S,
    params: Omit<ChatCompletionParams, "response_format">,
    schemaName = "response",
  ): Promise<z.infer<S>> {
    const text = await this.chatCompletion({
      ...params,
      response_format: zodResponseFormat(schema, schemaName),
    });

    const result = parseJson(schema, text);
    if (result.ok) {
      return result.value;
    }

    if (result.reason === "invalid_json") {
      throw new AiOutputError(
        "invalid_json",
        "AI response was not valid JSON",
        result.cause,
      );
    }

    throw new AiOutputError(
      "schema_mismatch",
      "AI response did not match the expected schema",
      result.cause,
    );
  }
}
