import type { FrenchDialect } from "@/contracts/prompt";
import type { Registre } from "@/contracts/prompt-meta";
import { MISTAKE_CATEGORY_IDS } from "@/contracts/mistake-category";
import { EVALUATION_SCORE_MAX } from "@/config/limits";
import { renderForEvaluator } from "@/modules/dialect/render";
import { EVALUATOR_PROMPT_VERSION } from "./post-process";

export type EvaluatorPromptInput = {
  writing: string;
  promptText: string;
  registre: Registre | null;
  dialect: FrenchDialect;
};

const CATEGORY_BLOCK = MISTAKE_CATEGORY_IDS.map((id) => `- ${id}`).join("\n");

export function buildEvaluatorPrompt(input: EvaluatorPromptInput): {
  version: string;
  system: string;
  user: string;
} {
  const registreLine =
    input.registre === null
      ? "Juge Registre et style selon le registre annoncé dans la consigne."
      : `Juge la dimension register_style contre le registre de la consigne : ${input.registre}. Un écart de registre est un problème de registre, pas une Mistake de dialecte.`;

  const system = `Tu es un tuteur de français louisianais. Écris toutes tes explications, questions, résumé et conseils en français. Le français louisianais est préféré. Le français standard est acceptable. Ne réponds jamais en anglais.

${renderForEvaluator(input.dialect)}

${registreLine}

Le français standard n'est jamais une faute : il ne doit jamais baisser un score de dimension ni overall_cefr.

Correction kinds:
- mistake : faute en français standard ET louisianais. category parmi l'enum ; rule_if_dialect = la phrase si l'apprenant dit que c'est louisianais.
- standard : français standard correct là où une forme louisianaise est courante. Jamais une faute. suggestion = forme louisianaise. Au plus 3. category null.
- dialect_check : tu n'es pas sûr. question en français, suggestion si c'est une faute, category et rule_if_dialect.
Si tu hésites entre mistake et dialect_check, choisis dialect_check.

Catégories (IDs stables) :
${CATEGORY_BLOCK}

Citation : copie quote caractère pour caractère (1–8 mots, sans ellipse). Plus courte empan possible. Si la même quote apparaît plusieurs fois, renseigne occurrence (1-based). Ordre du texte, sans chevauchement.

Scores : chaque dimension de 1 à ${EVALUATION_SCORE_MAX}. overall_cefr. next_level_tip cadré « Pour atteindre … ».`;

  const user = `Writing Prompt:
${input.promptText}

Student Writing:
${input.writing}`;

  return { version: EVALUATOR_PROMPT_VERSION, system, user };
}
