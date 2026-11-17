import type { FrenchDialect } from "@/contracts/prompt";
import type { Registre } from "@/contracts/prompt-meta";
import { MISTAKE_CATEGORY_IDS } from "@/contracts/mistake-category";
import { EVALUATION_SCORE_MAX } from "@/config/limits";
import { renderForEvaluator } from "@/modules/dialect/render";
import { renderActiveLearnerNotes } from "@/modules/dialect/learner-notes";
import type { LearnerDialectNote } from "@/contracts/dialect-note";
import { formatDlfHintSection, type DlfHintCard } from "@/modules/dlf/lookup";
import { catalogForPrompt } from "@/modules/resources/catalog";
import { EVALUATOR_PROMPT_VERSION } from "./post-process";

export type EvaluatorPromptInput = {
  writing: string;
  promptText: string;
  registre: Registre | null;
  dialect: FrenchDialect;
  dlfCards?: DlfHintCard[];
  dialectNotes?: readonly LearnerDialectNote[];
};

const TEMPLATE = `Tu es un tuteur de français louisianais. Écris toutes tes explications, questions, résumé et conseils en français. Le français louisianais est préféré. Le français standard est acceptable. Ne réponds jamais en anglais.

{{dialect}}

{{notes}}

{{registre}}

Le français standard n'est jamais une faute\u202F: il ne doit jamais baisser un score de dimension ni overall_cefr.

Correction kinds:
- mistake\u202F: faute en français standard ET louisianais. category parmi l'enum\u202F; rule_if_dialect = la phrase si l'apprenant dit que c'est louisianais.
- standard\u202F: français standard correct là où une forme louisianaise est courante. Jamais une faute. suggestion = forme louisianaise. Au plus 3. category null.
- dialect_check\u202F: tu n'es pas sûr. question en français, suggestion si c'est une faute, category et rule_if_dialect.
Si tu hésites entre mistake et dialect_check, choisis dialect_check.

Catégories (IDs stables) :
{{categories}}

Citation\u202F: copie quote caractère pour caractère (1–8 mots, sans ellipse). Plus courte empan possible. Si la même quote apparaît plusieurs fois, renseigne occurrence (1-based). Ordre du texte, sans chevauchement.

{{dlf}}

Resources\u202F: Pour chaque mistake, choisis au plus un ID grammaire et un ID input dans cette liste, pour sa catégorie. N'invente jamais d'URL ni d'ID.
{{resources}}

Scores\u202F: chaque dimension de 1 à {{scoreMax}}. overall_cefr. next_level_tip cadré «\u202FPour atteindre …\u202F».`;

export function buildEvaluatorPrompt(input: EvaluatorPromptInput): {
  version: string;
  system: string;
  user: string;
} {
  const registre =
    input.registre === null
      ? "Juge Registre et style selon le registre annoncé dans la consigne."
      : `Juge la dimension register_style contre le registre de la consigne\u202F: ${input.registre}. Un écart de registre est un problème de registre, pas une Mistake de dialecte.`;
  const system = TEMPLATE.replace(
    "{{dialect}}",
    renderForEvaluator(input.dialect),
  )
    .replace("{{notes}}", renderActiveLearnerNotes(input.dialectNotes ?? []))
    .replace("{{registre}}", registre)
    .replace(
      "{{categories}}",
      MISTAKE_CATEGORY_IDS.map((id) => `- ${id}`).join("\n"),
    )
    .replace("{{scoreMax}}", String(EVALUATION_SCORE_MAX))
    .replace("{{dlf}}", formatDlfHintSection(input.dlfCards ?? []))
    .replace("{{resources}}", catalogForPrompt());
  return {
    version: EVALUATOR_PROMPT_VERSION,
    system,
    user: `Writing Prompt:\n${input.promptText}\n\nStudent Writing:\n${input.writing}`,
  };
}
