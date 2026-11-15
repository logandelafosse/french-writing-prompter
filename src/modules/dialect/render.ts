import {
  DEFAULT_DIALECT,
  LOUISIANA_RULES,
  LOUISIANA_VOCABULARY_HEADWORDS,
  type Dialect,
} from "./louisiana-rules";
import { LEVEL_DESCRIPTIONS } from "./level-descriptions";

export { LEVEL_DESCRIPTIONS };

export function renderForGenerator(dialect: Dialect = DEFAULT_DIALECT): string {
  if (dialect !== DEFAULT_DIALECT) {
    return "";
  }

  const grammar = LOUISIANA_RULES.map(
    (r) => `- ${r.rule_fr} (e.g. ${r.examples.join("; ")})`,
  ).join("\n");

  const vocab = LOUISIANA_VOCABULARY_HEADWORDS.join(", ");

  return `Louisiana French (Cajun French) — use and accept these forms in prompts:

Grammar:
${grammar}

Vocabulary (Louisiana headwords from the DLF; treat as correct): ${vocab}`;
}

export function renderForEvaluator(dialect: Dialect = DEFAULT_DIALECT): string {
  if (dialect !== DEFAULT_DIALECT) {
    return "";
  }

  const grammar = LOUISIANA_RULES.map(
    (r) =>
      `- ${r.rule_en} Examples: ${r.examples.join("; ")} — CORRECT (never flag)`,
  ).join("\n");

  const vocab = LOUISIANA_VOCABULARY_HEADWORDS.join(", ");

  return `Louisiana French (Cajun French) — treat the following as CORRECT (not errors):

Grammar rules:
${grammar}

Accepted Louisiana vocabulary (not errors): ${vocab}.

CRITICAL: Standard French in student writing is never wrong — suggest Louisiana forms when helpful, but do not count Standard French as a Mistake. Do NOT penalize any Louisiana French feature listed above. Evaluate as Louisiana French.`;
}
