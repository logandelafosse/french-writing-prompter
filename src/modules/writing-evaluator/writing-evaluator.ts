import type { WritingPrompt } from "@/modules/prompt-generator/prompt-generator";
import type { FrenchDialect } from "@/modules/prompt-generator/prompt-generator";
import {
  EvaluatorOutputSchema,
  type EvaluationV2,
  type EvaluatorOutput,
} from "@/contracts/evaluation";
import type { Correction } from "@/contracts/correction";
import type { MistakeCategory } from "@/contracts/mistake-category";
import type { z } from "zod";
import { AI_MODEL } from "@/config/ai";
import { emptyDlfIndex, type DlfIndex } from "@/modules/dlf/lookup";
import type { LearnerDialectNote } from "@/contracts/dialect-note";
import { buildEvaluatorPrompt } from "./build-evaluator-prompt";
import { postProcessEvaluation } from "./post-process";

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

export type EvaluateOptions = {
  dialectNotes?: readonly LearnerDialectNote[];
  sessionId?: number;
  now?: () => Date;
  createId?: () => string;
  focusCategories?: readonly MistakeCategory[];
};

export type EvaluateResult = {
  evaluation: EvaluationV2;
  corrections: Correction[];
  raw: EvaluatorOutput;
};

export class WritingEvaluator {
  constructor(
    private openai: OpenAiClientLike,
    private dlf: DlfIndex = emptyDlfIndex(),
  ) {}

  async evaluate(
    writing: string,
    prompt: WritingPrompt,
    dialect: FrenchDialect,
    options: EvaluateOptions = {},
  ): Promise<EvaluateResult> {
    const dialectNotes = options.dialectNotes ?? [];
    const built = buildEvaluatorPrompt({
      writing,
      promptText: prompt.text,
      registre: prompt.meta?.registre ?? null,
      dialect,
      dlfCards: this.dlf.cardsForText(writing),
      dialectNotes,
    });

    const raw = await this.openai.chatCompletionJSON(
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

    const processed = postProcessEvaluation(raw, {
      text: writing,
      sessionId: options.sessionId ?? 0,
      now: options.now ?? (() => new Date()),
      createId: options.createId ?? (() => crypto.randomUUID()),
      lookupDlf: (word) => this.dlf.lookup(word),
      dialectNotes,
      focusCategories: options.focusCategories ?? [],
    });

    return {
      evaluation: processed.evaluation,
      corrections: processed.corrections,
      raw,
    };
  }
}
