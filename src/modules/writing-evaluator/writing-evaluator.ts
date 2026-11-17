import type { WritingPrompt } from "@/modules/prompt-generator/prompt-generator";
import type { LearnerDialectContext } from "@/modules/dialect/learner-dialect-context";
import {
  EvaluatorOutputSchema,
  type EvaluationV2,
  type EvaluatorOutput,
} from "@/contracts/evaluation";
import type { Correction } from "@/contracts/correction";
import type { MistakeCategory } from "@/contracts/mistake-category";
import type { z } from "zod";
import { AI_MODEL } from "@/config/ai";
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
  constructor(private openai: OpenAiClientLike) {}

  async evaluate(
    writing: string,
    prompt: WritingPrompt,
    context: LearnerDialectContext,
    options: EvaluateOptions = {},
  ): Promise<EvaluateResult> {
    const dialectNotes = context.notes ?? [];
    const built = buildEvaluatorPrompt({
      writing,
      promptText: prompt.text,
      registre: prompt.meta?.registre ?? null,
      dialect: context.dialect,
      dlfCards: context.dlf.cardsForText(writing),
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
      lookupDlf: (word) => context.dlf.lookup(word),
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
