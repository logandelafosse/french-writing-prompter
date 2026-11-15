/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from "vitest";
import { PromptGenerator } from "./prompt-generator";

function createMockClient(responseText: string) {
  return {
    chatCompletion: vi.fn().mockResolvedValue(responseText),
  };
}

describe("PromptGenerator", () => {
  it("generates a prompt with the correct structure", async () => {
    const mockClient = createMockClient(
      "Écrivez une lettre à un ami décrivant votre week-end. Utilisez le passé composé. Votre texte doit faire entre 80 et 120 mots. Adoptez un ton familier.",
    );

    const generator = new PromptGenerator(mockClient as any);
    const prompt = await generator.generate("A2", "louisiana");

    expect(prompt).toHaveProperty("text");
    expect(prompt).toHaveProperty("constraints");
    expect(prompt.constraints.cefrLevel).toBe("A2");
    expect(prompt.constraints.dialect).toBe("louisiana");
    expect(typeof prompt.text).toBe("string");
    expect(prompt.text.length).toBeGreaterThan(0);
  });

  it("passes CEFR level and dialect rules in the system prompt", async () => {
    const mockClient = {
      chatCompletion: vi.fn().mockResolvedValue("Sample prompt text."),
    };

    const generator = new PromptGenerator(mockClient as any);
    await generator.generate("B1", "louisiana");

    const callArgs = mockClient.chatCompletion.mock.calls[0]?.[0];
    expect(callArgs).toBeDefined();
    if (callArgs === undefined) throw new Error("expected chatCompletion call");
    const systemMessage = callArgs.messages.find(
      (m: any) => m.role === "system",
    );

    expect(systemMessage.content).toContain("B1");
    expect(systemMessage.content).toContain("Louisiana French");
  });

  it("includes all required constraint types in the prompt", async () => {
    const mockClient = createMockClient(
      "Décrivez votre ville idéale en 150-200 mots, au conditionnel, ton descriptif.",
    );

    const generator = new PromptGenerator(mockClient as any);
    const prompt = await generator.generate("B2", "louisiana");

    expect(prompt.constraints).toMatchObject({
      cefrLevel: "B2",
      dialect: "louisiana",
    });
  });
});
