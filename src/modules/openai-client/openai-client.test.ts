/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";
import { OpenAiClient } from "./openai-client";
import { AiOutputError } from "./ai-output-error";
import { Evaluation } from "@/contracts/evaluation";
import { AI_MODEL } from "@/config/ai";

describe("OpenAiClient", () => {
  let client: OpenAiClient;

  beforeEach(() => {
    client = new OpenAiClient();
  });

  describe("chatCompletion", () => {
    it("sends a chat completion request with correct shape", async () => {
      const mockCreate = vi.fn().mockResolvedValue({
        choices: [
          {
            message: {
              content: "Voici un sujet d'écriture...",
            },
          },
        ],
      });

      (client as any).openai = {
        chat: { completions: { create: mockCreate } },
      };

      const result = await client.chatCompletion({
        model: AI_MODEL,
        messages: [
          { role: "system", content: "You are a French tutor." },
          { role: "user", content: "Generate a prompt." },
        ],
      });

      expect(mockCreate).toHaveBeenCalledWith({
        model: AI_MODEL,
        messages: [
          { role: "system", content: "You are a French tutor." },
          { role: "user", content: "Generate a prompt." },
        ],
      });

      expect(result).toBe("Voici un sujet d'écriture...");
    });

    it("throws a structured error on API failure", async () => {
      const mockCreate = vi.fn().mockRejectedValue(new Error("Network error"));

      (client as any).openai = {
        chat: { completions: { create: mockCreate } },
      };

      await expect(
        client.chatCompletion({
          model: AI_MODEL,
          messages: [{ role: "user", content: "test" }],
        }),
      ).rejects.toThrow("AI service error");
    });
  });

  describe("chatCompletionJSON", () => {
    function mockJsonResponse(content: string) {
      const mockCreate = vi.fn().mockResolvedValue({
        choices: [{ message: { content } }],
      });
      (client as any).openai = {
        chat: { completions: { create: mockCreate } },
      };
      return mockCreate;
    }

    it("returns parsed JSON when the response matches the schema", async () => {
      const body = {
        score: 5,
        feedback: "Good work!",
      };
      mockJsonResponse(JSON.stringify(body));

      const schema = z.object({
        score: z.number(),
        feedback: z.string(),
      });

      const result = await client.chatCompletionJSON(schema, {
        model: AI_MODEL,
        messages: [{ role: "user", content: "Evaluate this." }],
      });

      expect(result).toEqual(body);
    });

    it("sends a json_schema response format", async () => {
      const mockCreate = mockJsonResponse(
        JSON.stringify({ score: 1, feedback: "x" }),
      );

      const schema = z.object({
        score: z.number(),
        feedback: z.string(),
      });

      await client.chatCompletionJSON(schema, {
        model: AI_MODEL,
        messages: [{ role: "user", content: "Evaluate this." }],
      });

      const call = mockCreate.mock.calls[0]?.[0];
      expect(call?.response_format).toMatchObject({
        type: "json_schema",
        json_schema: expect.objectContaining({
          strict: true,
          name: "response",
        }),
      });
    });

    it("throws AiOutputError invalid_json with cause for non-JSON text", async () => {
      mockJsonResponse("not json at all");

      await expect(
        client.chatCompletionJSON(Evaluation, {
          model: AI_MODEL,
          messages: [{ role: "user", content: "test" }],
        }),
      ).rejects.toSatisfy((error: unknown) => {
        expect(error).toBeInstanceOf(AiOutputError);
        const aiError = error as AiOutputError;
        expect(aiError.code).toBe("invalid_json");
        expect(aiError.cause).toBeDefined();
        return true;
      });
    });

    it("throws AiOutputError schema_mismatch with cause when overall_cefr is missing", async () => {
      mockJsonResponse('{"score": 5}');

      await expect(
        client.chatCompletionJSON(Evaluation, {
          model: AI_MODEL,
          messages: [{ role: "user", content: "test" }],
        }),
      ).rejects.toSatisfy((error: unknown) => {
        expect(error).toBeInstanceOf(AiOutputError);
        const aiError = error as AiOutputError;
        expect(aiError.code).toBe("schema_mismatch");
        expect(aiError.cause).toBeDefined();
        return true;
      });
    });
  });
});
