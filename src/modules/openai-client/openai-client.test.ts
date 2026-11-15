import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";
import { OpenAiClient } from "./openai-client";
import { AiOutputError } from "./ai-output-error";
import { Evaluation } from "@/contracts/evaluation";
import { AI_MODEL } from "@/config/ai";

type CreateFn = ReturnType<typeof vi.fn>;

function stubOpenAiCreate(client: OpenAiClient, create: CreateFn) {
  const shell = client as unknown as {
    openai: {
      chat: { completions: { create: CreateFn } };
    } | null;
  };
  shell.openai = {
    chat: { completions: { create } },
  };
}

describe("OpenAiClient", () => {
  let client: OpenAiClient;

  beforeEach(() => {
    client = new OpenAiClient();
  });

  it("sends a chat completion request with correct shape", async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      choices: [{ message: { content: "Voici un sujet d'écriture..." } }],
    });
    stubOpenAiCreate(client, mockCreate);
    const result = await client.chatCompletion({
      model: AI_MODEL,
      messages: [{ role: "user", content: "Generate a prompt." }],
    });
    expect(result).toBe("Voici un sujet d'écriture...");
  });

  it("throws a structured error on API failure", async () => {
    const mockCreate = vi.fn().mockRejectedValue(new Error("Network error"));
    stubOpenAiCreate(client, mockCreate);
    await expect(
      client.chatCompletion({
        model: AI_MODEL,
        messages: [{ role: "user", content: "test" }],
      }),
    ).rejects.toThrow("AI service error");
  });

  it("returns parsed JSON when the response matches the schema", async () => {
    const body = { score: 5, feedback: "Good work!" };
    const mockCreate = vi.fn().mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(body) } }],
    });
    stubOpenAiCreate(client, mockCreate);
    const schema = z.object({ score: z.number(), feedback: z.string() });
    const result = await client.chatCompletionJSON(schema, {
      model: AI_MODEL,
      messages: [{ role: "user", content: "Evaluate this." }],
    });
    expect(result).toEqual(body);
  });

  it("throws AiOutputError invalid_json with cause for non-JSON text", async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      choices: [{ message: { content: "not json" } }],
    });
    stubOpenAiCreate(client, mockCreate);
    await expect(
      client.chatCompletionJSON(Evaluation, {
        model: AI_MODEL,
        messages: [{ role: "user", content: "test" }],
      }),
    ).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(AiOutputError);
      const aiError = error as AiOutputError;
      expect(aiError.code).toBe("invalid_json");
      return true;
    });
  });
});
