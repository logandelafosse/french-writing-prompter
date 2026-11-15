import type { CefrLevel } from "@/contracts/cefr";
import { AI_MODEL } from "@/config/ai";
import { WORD_TARGET_BY_LEVEL } from "@/config/limits";
import {
  LEVEL_DESCRIPTIONS,
  renderForGenerator,
} from "@/modules/dialect/render";

export type { FrenchDialect } from "@/contracts/prompt";
export type { PromptConstraints } from "@/contracts/prompt";

export interface WritingPrompt {
  text: string;
  constraints: {
    cefrLevel: CefrLevel;
    dialect: import("@/contracts/prompt").FrenchDialect;
  };
}

export interface OpenAiClientLike {
  chatCompletion(params: {
    model: string;
    messages: Array<{ role: "system" | "user"; content: string }>;
  }): Promise<string>;
}

export class PromptGenerator {
  constructor(private openai: OpenAiClientLike) {}

  async generate(
    level: CefrLevel,
    dialect: import("@/contracts/prompt").FrenchDialect,
  ): Promise<WritingPrompt> {
    const dialectRules = renderForGenerator(dialect);
    const wordTarget = WORD_TARGET_BY_LEVEL[level];

    const systemPrompt = `You are a French writing tutor. Generate writing prompts for French learners at CEFR level ${level}. The learner uses Louisiana French (dialect rules below).

Each prompt must:
- Be a paragraph-long scenario in French
- Include specific writing constraints: genre, tense, word count range, and tone
- Be adapted to the learner's ability level
- Ask for ${wordTarget.min}–${wordTarget.max} words

${dialectRules}

Level description for ${level}:
${LEVEL_DESCRIPTIONS[level]}`;

    const text = await this.openai.chatCompletion({
      model: AI_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content:
            "Générez un sujet d'écriture en français adapté à mon niveau. Incluez le genre, le temps verbal, le nombre de mots, et le ton.",
        },
      ],
    });

    return {
      text: text.trim(),
      constraints: {
        cefrLevel: level,
        dialect,
      },
    };
  }
}
