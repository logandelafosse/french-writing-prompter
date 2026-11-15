import type { WritingPrompt } from "@/modules/prompt-generator/prompt-generator";
import type { FrenchDialect } from "@/modules/prompt-generator/prompt-generator";
import { Evaluation } from "@/contracts/evaluation";
import type { z } from "zod";
import { AI_MODEL } from "@/config/ai";
import { renderForEvaluator } from "@/modules/dialect/render";

export type { Evaluation } from "@/contracts/evaluation";

interface OpenAiClientLike {
  chatCompletionJSON<S extends z.ZodType>(
    schema: S,
    params: {
      model: string;
      messages: Array<{ role: "system" | "user"; content: string }>;
    },
    schemaName?: string,
  ): Promise<z.infer<S>>;
}

export class WritingEvaluator {
  constructor(private openai: OpenAiClientLike) {}

  async evaluate(
    writing: string,
    prompt: WritingPrompt,
    dialect: FrenchDialect,
  ): Promise<Evaluation> {
    const dialectRules = renderForEvaluator(dialect);

    const systemPrompt = `You are a French writing evaluator specializing in CEFR-aligned assessment. You evaluate Louisiana French writing.

${dialectRules}

Evaluate the student writing across four dimensions on a scale of 1-6:
1. Grammatical Accuracy — conjugations, agreements, spelling, sentence structure
2. Vocabulary Range & Control — word choice, precision, idiomatic usage
3. Coherence & Cohesion — logical flow, paragraph structure, connectors
4. Register & Style — formality, tone, rhetorical devices, naturalness

Return structured JSON matching the provided schema.`;

    const userPrompt = `Writing Prompt:
${prompt.text}

Student Writing:
${writing}

Please evaluate this writing according to the above criteria.`;

    return this.openai.chatCompletionJSON(
      Evaluation,
      {
        model: AI_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      },
      "evaluation",
    );
  }
}
