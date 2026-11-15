import type { WritingPrompt } from "@/modules/prompt-generator/prompt-generator";
import type { FrenchDialect } from "@/modules/prompt-generator/prompt-generator";
import type { CefrLevel } from "@/modules/cefr-tracker/cefr-tracker";

export interface DimensionScore {
  score: number;
  max: number;
  comment: string;
}

export interface EvaluationDimensions {
  grammatical_accuracy: DimensionScore;
  vocabulary: DimensionScore;
  coherence: DimensionScore;
  register_style: DimensionScore;
}

export interface EvaluationTips {
  per_dimension: {
    grammatical_accuracy: string;
    vocabulary: string;
    coherence: string;
    register_style: string;
  };
  holistic: string;
}

export interface Evaluation {
  dimensions: EvaluationDimensions;
  overall_cefr: CefrLevel;
  tips: EvaluationTips;
}

interface OpenAiClientLike {
  chatCompletionJSON<T>(params: {
    model: string;
    messages: Array<{ role: "system" | "user"; content: string }>;
  }): Promise<T>;
}

const LOUISIANA_FRENCH_RULES = `Louisiana French (Cajun French) grammar and vocabulary rules. You MUST treat the following as CORRECT (not errors):

Grammar rules:
- Third-person plural: "ça", "eusse", or "eux-autre" instead of "ils" — CORRECT
- Plural you: "vous-autre" (singular "tu") — CORRECT
- First-person plural: "on" or "nous-autre" instead of "nous" as subject pronoun — CORRECT
- Present progressive: "être après <verb>" (e.g., "je suis après manger") — CORRECT
- Passé composé: using "avoir" as auxiliary for coming/going verbs — CORRECT
- Futur proche preferred over futur simple — CORRECT
- Minimal or absent subjunctive usage — CORRECT

Accepted Louisiana French vocabulary (not errors): chaoui, cocodrie, maringouin, berceuse, and other regional Louisiana French words.

CRITICAL: Do NOT penalize or mark as errors any of the above Louisiana French features. Evaluate the writing as Louisiana French, not Standard French.`;

export class WritingEvaluator {
  constructor(private openai: OpenAiClientLike) {}

  async evaluate(
    writing: string,
    prompt: WritingPrompt,
    dialect: FrenchDialect,
  ): Promise<Evaluation> {
    const dialectRules = dialect === "louisiana" ? LOUISIANA_FRENCH_RULES : "";

    const systemPrompt = `You are a French writing evaluator specializing in CEFR-aligned assessment. You evaluate Louisiana French writing.

${dialectRules}

Evaluate the student writing across four dimensions on a scale of 1-6:
1. Grammatical Accuracy — conjugations, agreements, spelling, sentence structure
2. Vocabulary Range & Control — word choice, precision, idiomatic usage
3. Coherence & Cohesion — logical flow, paragraph structure, connectors
4. Register & Style — formality, tone, rhetorical devices, naturalness

Return a JSON object in this EXACT format:
{
  "dimensions": {
    "grammatical_accuracy": { "score": <1-6>, "max": 6, "comment": "<specific observation>" },
    "vocabulary": { "score": <1-6>, "max": 6, "comment": "<specific observation>" },
    "coherence": { "score": <1-6>, "max": 6, "comment": "<specific observation>" },
    "register_style": { "score": <1-6>, "max": 6, "comment": "<specific observation>" }
  },
  "overall_cefr": "<A1|A2|B1|B2|C1|C2>",
  "tips": {
    "per_dimension": {
      "grammatical_accuracy": "<specific tip for improvement>",
      "vocabulary": "<specific tip for improvement>",
      "coherence": "<specific tip for improvement>",
      "register_style": "<specific tip for improvement>"
    },
    "holistic": "<overall recommendation framed around reaching the next CEFR level>"
  }
}`;

    const userPrompt = `Writing Prompt:
${prompt.text}

Student Writing:
${writing}

Please evaluate this writing according to the above criteria.`;

    return this.openai.chatCompletionJSON<Evaluation>({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });
  }
}
