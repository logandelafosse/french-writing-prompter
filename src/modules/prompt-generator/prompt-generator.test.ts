import { describe, it, expect, vi } from "vitest";
import { PromptGenerator, type OpenAiClientLike } from "./prompt-generator";
import { DEFAULT_DIALECT } from "@/modules/dialect/louisiana-rules";
import { renderForGenerator } from "@/modules/dialect/render";
import {
  GeneratorModelOutput,
  type GeneratorModelOutput as GeneratorOut,
} from "@/contracts/prompt-meta";
import { WORD_TARGET_BY_LEVEL } from "@/config/limits";
import { parseJson } from "@/lib/json";
import { AiOutputError } from "@/modules/openai-client/ai-output-error";

const validModelOutput: GeneratorOut = {
  text: `${"C'est samedi matin chez ta grand-mère à Lafayette. ".repeat(6)}Raconte en style familier ce qui s'est passé quand toute la famille est arrivée.`,
  genre: "récit",
  tense: "passé composé et imparfait",
  tone: "chaleureux",
  registre: "familier",
  topic: "famille",
  topic_tags: ["famille", "domicile"],
};

function createMockClient(output: GeneratorOut | string): OpenAiClientLike {
  return {
    chatCompletionJSON: vi.fn().mockImplementation(() => {
      if (typeof output === "string") {
        const parsed = parseJson(GeneratorModelOutput, output);
        if (!parsed.ok) {
          throw new AiOutputError(
            parsed.reason === "invalid_json"
              ? "invalid_json"
              : "schema_mismatch",
            "fixture mismatch",
            parsed.cause,
          );
        }
        return Promise.resolve(parsed.value);
      }
      return Promise.resolve(output);
    }),
  };
}

describe("PromptGenerator", () => {
  it("generator output schema enforces required French fields and text length", async () => {
    const shortText = GeneratorModelOutput.safeParse({
      ...validModelOutput,
      text: "trop court",
    });
    expect(shortText.success).toBe(false);

    const missingRegistre = GeneratorModelOutput.safeParse({
      text: validModelOutput.text,
      genre: "récit",
      tense: "présent",
      tone: "neutre",
      topic: "maison",
      topic_tags: [],
    });
    expect(missingRegistre.success).toBe(false);

    const client = createMockClient("{not json");
    const generator = new PromptGenerator(client);
    await expect(
      generator.generate("B1", DEFAULT_DIALECT),
    ).rejects.toBeInstanceOf(AiOutputError);
  });

  it("generator attaches the server word target", async () => {
    const mockClient = createMockClient(validModelOutput);
    const generator = new PromptGenerator(mockClient);
    const prompt = await generator.generate("A1", DEFAULT_DIALECT);
    expect(prompt.meta?.wordTarget).toEqual(WORD_TARGET_BY_LEVEL.A1);
    const b1 = await generator.generate("B1", DEFAULT_DIALECT);
    expect(b1.meta?.wordTarget).toEqual(WORD_TARGET_BY_LEVEL.B1);
  });

  it("generator prompt never requires subjunctive, passé simple or futur simple", async () => {
    const mockClient: OpenAiClientLike = {
      chatCompletionJSON: vi.fn().mockResolvedValue(validModelOutput),
    };
    const generator = new PromptGenerator(mockClient);
    await generator.generate("B1", DEFAULT_DIALECT);
    const callArgs = vi.mocked(mockClient.chatCompletionJSON).mock.calls[0];
    const systemMessage = callArgs?.[1].messages.find(
      (m) => m.role === "system",
    );
    const content = systemMessage?.content ?? "";
    expect(content).toContain(renderForGenerator());
    expect(content).toMatch(/subjonctif/i);
    expect(content).toMatch(/passé simple/i);
    expect(content).toMatch(/futur simple/i);
    expect(content).toMatch(/Ne jamais exiger/i);
    expect(content).toMatch(/Varier le registre/i);
    expect(content).toMatch(/indiquer clairement dans le texte le registre/i);
  });

  it("generator schema requires registre formel|familier|mixt", () => {
    for (const registre of ["formel", "familier", "mixt"] as const) {
      const parsed = GeneratorModelOutput.safeParse({
        ...validModelOutput,
        registre,
      });
      expect(parsed.success).toBe(true);
    }
    const unknown = GeneratorModelOutput.safeParse({
      ...validModelOutput,
      registre: "soutenu",
    });
    expect(unknown.success).toBe(false);
  });
});
