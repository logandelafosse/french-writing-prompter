import type { Correction } from "@/contracts/correction";

export const reviewCopy = {
  sheetLabel: "Consigne et ton texte",
  textLabel: (n: number) => `Ton texte · ${n} mots`,
  regionLabel: "Évaluation",
  regionLabelMobile: "Corrections",
  title: "Évaluation",
  mobileListLabel: "Corrections",
  none: "Aucune correction",
  kindMistake: "Faute",
  kindStandard: "Français standard",
  arrow: "→",
  avant: "avant :",
  actionAck: "Compris",
  srMark: (kind: Correction["kind"], n: number) => {
    switch (kind) {
      case "standard":
        return `français standard ${n}`;
      case "dialect_check":
        return `à vérifier ${n}`;
      case "mistake":
        return `faute ${n}`;
    }
  },
  scoresClosed: "Scores ▸",
  scoresOpen: "Scores ▾",
  scoresOverall: (level: string) => `Ensemble : ${level}`,
  pourMonter: "Pour monter",
  dimensionLabel: {
    grammatical_accuracy: "Grammaire",
    vocabulary: "Vocabulaire",
    coherence: "Cohérence",
    register_style: "Registre et style",
  },
  dimensionDefinition: {
    grammatical_accuracy:
      "Conjugaisons, accords, orthographe de structure, et comment tu construis tes phrases.",
    vocabulary:
      "Choix des mots, précision, et tournures naturelles — y compris le français louisianais quand il est juste.",
    coherence:
      "Enchaînement des idées, structure des paragraphes, et connecteurs qui guident le lecteur.",
    register_style:
      "Adéquation du ton à la consigne (lettre, récit…), naturel, et dispositifs rhétoriques sans forcer.",
  },
} as const;

export function formatEvaluationSummary(
  corrections: Pick<Correction, "kind">[],
): string {
  let mistake = 0;
  let standard = 0;
  let dialectCheck = 0;
  for (const item of corrections) {
    if (item.kind === "mistake") mistake += 1;
    else if (item.kind === "standard") standard += 1;
    else dialectCheck += 1;
  }
  const parts: string[] = [];
  if (mistake === 1) parts.push("1 faute");
  else if (mistake > 1) parts.push(`${mistake} fautes`);
  if (standard > 0) parts.push(`${standard} en français standard`);
  if (dialectCheck > 0) parts.push(`${dialectCheck} à vérifier`);
  return parts.length === 0 ? reviewCopy.none : parts.join(" · ");
}
