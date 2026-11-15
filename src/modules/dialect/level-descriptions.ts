import type { CefrLevel } from "@/contracts/cefr";

/** Dialect-aware CEFR level blurbs for prompt generation (Q2, Q8). */
export const LEVEL_DESCRIPTIONS: Record<CefrLevel, string> = {
  A1: "Peut écrire des phrases simples et isolées sur des sujets familiers. Vocabulaire très limité ; présent surtout. Cible : 10–20 mots.",
  A2: "Peut enchaîner des phrases simples avec des connecteurs de base. Présent, passé composé, futur proche. Cible : 80–120 mots.",
  B1: "Texte clair et lié sur des sujets familiers ; expériences et opinions. Temps variés, conditionnel. Cible : 250–300 mots.",
  B2: "Large éventail de temps ; le subjonctif est rare en français louisianais et n'est jamais exigé. Texte détaillé, point de vue nuancé. Cible : 250–300 mots.",
  C1: "Registres variés, structures complexes ; pas de passé simple ni de subjonctif exigés. Cible : 250–300 mots.",
  C2: "Expression assurée et personnelle ; registres variés, structures complexes ; pas de passé simple ni de subjonctif exigés. Cible : 250–300 mots.",
};
