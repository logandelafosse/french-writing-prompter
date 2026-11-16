import type { CefrLevel } from "@/contracts/cefr";
import { PromptConstraints } from "@/contracts/prompt";
import type { PromptMeta } from "@/contracts/prompt-meta";
import { GeneratorModelOutput } from "@/contracts/prompt-meta";
import { AI_MODEL } from "@/config/ai";
import { WORD_TARGET_BY_LEVEL } from "@/config/limits";
import {
  LEVEL_DESCRIPTIONS,
  renderForGenerator,
} from "@/modules/dialect/render";
import type { FrenchDialect } from "@/contracts/prompt";
import type { z } from "zod";

export type { FrenchDialect } from "@/contracts/prompt";
export type { PromptConstraints } from "@/contracts/prompt";

export interface WritingPrompt {
  text: string;
  meta?: PromptMeta;
  constraints: z.infer<typeof PromptConstraints>;
}

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

export class PromptGenerator {
  constructor(private openai: OpenAiClientLike) {}

  async generate(
    level: CefrLevel,
    dialect: FrenchDialect,
  ): Promise<WritingPrompt> {
    const dialectRules = renderForGenerator(dialect);
    const wordTarget = WORD_TARGET_BY_LEVEL[level];

    const systemPrompt = `Tu es un tuteur d'écriture en français. Génère des consignes d'écriture pour des apprenants au niveau CECR ${level}. L'apprenant utilise le français de la Louisiane (règles ci-dessous).

Chaque consigne doit :
- Être un scénario d'un paragraphe en français (champ text), entre 150 et 1500 caractères
- Indiquer clairement dans le texte le registre attendu (formel, familier ou mixte)
- Renseigner genre, temps verbal, ton, registre, sujet et jusqu'à trois étiquettes de sujet — le tout en français
- S'adapter au niveau de l'apprenant
- Varier le registre (formel, familier, mixt) d'une consigne à l'autre ; ne pas toujours choisir familier
- Ne jamais exiger le subjonctif, le passé simple ni le futur simple ; le futur avec aller + infinitif est permis
- Ne pas imposer de nombre de mots dans le texte : l'objectif mot (${wordTarget.min}–${wordTarget.max}) est ajouté par le serveur

${dialectRules}

Description du niveau ${level} :
${LEVEL_DESCRIPTIONS[level]}`;

    const modelOutput = await this.openai.chatCompletionJSON(
      GeneratorModelOutput,
      {
        model: AI_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content:
              "Génère une consigne d'écriture adaptée à mon niveau. Tous les champs en français.",
          },
        ],
      },
      "generator",
    );

    const meta: PromptMeta = {
      genre: modelOutput.genre,
      tense: modelOutput.tense,
      tone: modelOutput.tone,
      registre: modelOutput.registre,
      wordTarget,
      topic: modelOutput.topic,
      topicTags: modelOutput.topic_tags,
    };

    return {
      text: modelOutput.text.trim(),
      meta,
      constraints: {
        cefrLevel: level,
        dialect,
      },
    };
  }
}
