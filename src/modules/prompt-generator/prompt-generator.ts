import type { CefrLevel } from "@/modules/cefr-tracker/cefr-tracker";

export type FrenchDialect = "louisiana";

export interface PromptConstraints {
  cefrLevel: CefrLevel;
  dialect: FrenchDialect;
}

export interface WritingPrompt {
  text: string;
  constraints: PromptConstraints;
}

interface OpenAiClientLike {
  chatCompletion(params: {
    model: string;
    messages: Array<{ role: "system" | "user"; content: string }>;
  }): Promise<string>;
}

const LOUISIANA_FRENCH_RULES = `Louisiana French (Cajun French) features to use and accept:

Grammar:
- Third-person plural: use "ça", "eusse", or "eux-autre" instead of "ils"
- Plural you: use "vous-autre" (singular "tu")
- First-person plural: use "on" or "nous-autre" instead of "nous" as subject pronoun
- Present progressive: use "être après <verb>" (e.g., "je suis après manger")
- Passé composé: use "avoir" as auxiliary for coming/going verbs
- Futur proche preferred over futur simple
- Minimal subjunctive usage

Vocabulary: Accept regional Louisiana French words as correct (e.g., chaoui, cocodrie, maringouin, berceuse, etc.)`;

const LEVEL_DESCRIPTIONS: Record<CefrLevel, string> = {
  A1: "Can write simple isolated phrases and sentences about personal details and familiar topics. Very basic vocabulary and simple present tense.",
  A2: "Can write a series of simple phrases and sentences linked with basic connectors. Can describe everyday aspects of environment. Present, passé composé, and futur proche.",
  B1: "Can write straightforward connected text on familiar topics. Can describe experiences, events, dreams, and ambitions. Present, past tenses, future, conditional.",
  B2: "Can write clear detailed text on a wide range of subjects. Can explain a viewpoint with advantages and disadvantages. All major tenses including subjunctive.",
  C1: "Can write well-structured text expressing points of view at length. Good command of idiomatic expressions and collocations. All tenses, complex structures.",
  C2: "Can write complex text in an assured, personal style. Can summarise information from different sources. Full range of linguistic devices.",
};

export class PromptGenerator {
  constructor(private openai: OpenAiClientLike) {}

  async generate(
    level: CefrLevel,
    dialect: FrenchDialect
  ): Promise<WritingPrompt> {
    const dialectRules =
      dialect === "louisiana" ? LOUISIANA_FRENCH_RULES : "";

    const systemPrompt = `You are a French writing tutor. Generate writing prompts for French learners at CEFR level ${level}. The learner uses Louisiana French (dialect rules below).

Each prompt must:
- Be a paragraph-long scenario in French
- Include specific writing constraints: genre, tense, word count range, and tone
- Be adapted to the learner's ability level

${dialectRules}

Level description for ${level}:
${LEVEL_DESCRIPTIONS[level]}`;

    const text = await this.openai.chatCompletion({
      model: "gpt-4o",
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
