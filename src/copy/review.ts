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
  arrow: "→",
  avant: "avant :",
  actionAck: "Compris",
  srMark: (n: number) => `faute ${n}`,
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
