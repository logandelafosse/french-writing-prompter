import fs from "node:fs";
import path from "node:path";
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

const TEMPLATE = fs.readFileSync(
  path.join(process.cwd(), "src/data/evaluator-system-prompt.txt"),
  "utf8",
);

export function buildEvaluatorPrompt(input: EvaluatorPromptInput): {
  version: string;
  system: string;
  user: string;
} {
  const registre =
    input.registre === null
      ? "Juge Registre et style selon le registre annoncé dans la consigne."
      : `Juge la dimension register_style contre le registre de la consigne : ${input.registre}. Un écart de registre est un problème de registre, pas une Mistake de dialecte.`;
  const system = TEMPLATE.replace(
    "{{dialect}}",
    renderForEvaluator(input.dialect),
  )
    .replace("{{registre}}", registre)
    .replace(
      "{{categories}}",
      MISTAKE_CATEGORY_IDS.map((id) => `- ${id}`).join("\n"),
    )
    .replace("{{scoreMax}}", String(EVALUATION_SCORE_MAX));
  return {
    version: EVALUATOR_PROMPT_VERSION,
    system,
    user: `Writing Prompt:\n${input.promptText}\n\nStudent Writing:\n${input.writing}`,
  };
}
