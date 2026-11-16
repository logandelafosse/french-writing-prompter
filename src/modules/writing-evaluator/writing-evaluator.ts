import type { WritingPrompt } from "@/modules/prompt-generator/prompt-generator";
import type { FrenchDialect } from "@/modules/prompt-generator/prompt-generator";
import {
  EvaluatorOutputSchema,
  type EvaluatorOutput,
} from "@/contracts/evaluation";
import type { z } from "zod";
import { AI_MODEL } from "@/config/ai";
import { emptyDlfIndex, type DlfIndex } from "@/modules/dlf/lookup";
import type { LearnerDialectNote } from "@/contracts/dialect-note";
import { buildEvaluatorPrompt } from "./build-evaluator-prompt";

export type { Evaluation } from "@/contracts/evaluation";

export interface OpenAiClientLike {
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
  constructor(
    private openai: OpenAiClientLike,
    private dlf: DlfIndex = emptyDlfIndex(),
  ) {}

  async evaluate(
    writing: string,
    prompt: WritingPrompt,
    dialect: FrenchDialect,
    dialectNotes: readonly LearnerDialectNote[] = [],
  ): Promise<EvaluatorOutput> {
    const built = buildEvaluatorPrompt({
      writing,
      promptText: prompt.text,
      registre: prompt.meta?.registre ?? null,
      dialect,
      dlfCards: this.dlf.cardsForText(writing),
      dialectNotes,
    });

    return this.openai.chatCompletionJSON(
      EvaluatorOutputSchema,
      {
        model: AI_MODEL,
        messages: [
          { role: "system", content: built.system },
          { role: "user", content: built.user },
        ],
      },
      "evaluation",
    );
  }
}
