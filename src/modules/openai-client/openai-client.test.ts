/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { OpenAiClient } from "./openai-client";

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
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are a French tutor." },
          { role: "user", content: "Generate a prompt." },
        ],
      });

      expect(mockCreate).toHaveBeenCalledWith({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are a French tutor." },
          { role: "user", content: "Generate a prompt." },
        ],
      });

      expect(result).toBe("Voici un sujet d'écriture...");
    });

    it("returns JSON parsed content when response_format is json_object", async () => {
      const mockCreate = vi.fn().mockResolvedValue({
        choices: [
          {
            message: {
              content: '{"score": 5, "feedback": "Good work!"}',
            },
          },
        ],
      });

      (client as any).openai = {
        chat: { completions: { create: mockCreate } },
      };

      const result = await client.chatCompletionJSON({
        model: "gpt-4o",
        messages: [{ role: "user", content: "Evaluate this." }],
      });

      expect(result).toEqual({ score: 5, feedback: "Good work!" });
    });

    it("throws a structured error on API failure", async () => {
      const mockCreate = vi.fn().mockRejectedValue(new Error("Network error"));

      (client as any).openai = {
        chat: { completions: { create: mockCreate } },
      };

      await expect(
        client.chatCompletion({
          model: "gpt-4o",
          messages: [{ role: "user", content: "test" }],
        })
      ).rejects.toThrow("AI service error");
    });
  });
});
