import { describe, it, expect, vi } from "vitest";
import { PromptGenerator, type OpenAiClientLike } from "./prompt-generator";
import { DEFAULT_DIALECT } from "@/modules/dialect/louisiana-rules";
import { renderForGenerator } from "@/modules/dialect/render";

function createMockClient(responseText: string): OpenAiClientLike {
  return { chatCompletion: vi.fn().mockResolvedValue(responseText) };
}

describe("PromptGenerator", () => {
  it("generates a prompt with the correct structure", async () => {
    const mockClient = createMockClient("Écrivez une lettre.");
    const generator = new PromptGenerator(mockClient);
    const prompt = await generator.generate("A2", DEFAULT_DIALECT);
    expect(prompt.constraints.cefrLevel).toBe("A2");
    expect(prompt.constraints.dialect).toBe(DEFAULT_DIALECT);
  });

  it("embeds renderForGenerator() output in the system prompt", async () => {
    const mockClient: OpenAiClientLike = {
      chatCompletion: vi.fn().mockResolvedValue("Sample prompt text."),
    };
    const generator = new PromptGenerator(mockClient);
    await generator.generate("B1", DEFAULT_DIALECT);
    const callArgs = vi.mocked(mockClient.chatCompletion).mock.calls[0]?.[0];
    const systemMessage = callArgs?.messages.find((m) => m.role === "system");
    expect(systemMessage?.content).toContain(renderForGenerator());
  });
});
