import { countsAsMistake, type Correction } from "@/contracts/correction";

export const reviewCopy = {
  sheetLabel: "Consigne et ton texte",
  textLabel: (n: number) => `Ton texte · ${n} mots`,
  regionLabel: "Évaluation",
  regionLabelMobile: "Corrections",
  title: "Évaluation",
  mobileListLabel: "Corrections",
  none: "Aucune correction",
  kindMistake: "Faute",
  tagFocus: "focus du jour",
  carnetCta: (shortName: string) =>
    `«\u202F${shortName}\u202F» dans le Carnet →`,
  kindStandard: "Français standard",
  kindDialect: "Ça se dit comme ça\u202F?",
  arrow: "→",
  avant: "avant\u202F:",
  dlf: "DLF",
  dlfTitle: "Dictionary of Louisiana French",
  actionAck: "Compris",
  actionPushback: "C'est du français louisianais",
  actionConfirm: "Oui, c'est à nous-autres",
  actionReject: "Non, corrige-le",
  unanswered: "Pas répondu",
  savedNote: "Note de dialecte sauvée",
  savedNoteLink: "Voir le Carnet",
  sheetEyebrow: "Mon français louisianais",
  sheetTitle: "Ajouter une note de dialecte",
  sheetTitleEdit: "Modifier la note",
  sheetClose: "Fermer",
  sheetWritten: "T'as écrit",
  sheetProposed: "Le tuteur proposait",
  sheetForm: "Le mot ou la tournure",
  sheetRule: "La règle",
  sheetRuleHint: "proposée par le tuteur, c'est toi qui as le dernier mot",
  sheetExample: "Un exemple",
  sheetScope: "Ça vaut pour",
  sheetScopeWord: (lemma: string) =>
    `Ce mot seulement\u202F: «\u202F${lemma}\u202F»`,
  sheetScopePattern: (pattern: string) => `Toute la famille\u202F: ${pattern}`,
  sheetScopeWordGeneric: "Ce mot seulement",
  sheetScopePatternGeneric: "Toute la famille",
  sheetFooter:
    "Une fois sauvée, la note va dans ton Carnet et le tuteur te reprendra plus là-dessus.",
  sheetEsc: "Échap pour fermer",
  sheetCancel: "Annuler",
  sheetSave: "Sauver la note",
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
  scoresOverall: (level: string) => `Ensemble\u202F: ${level}`,
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
  resourceGrammar: (label: string) => `Grammaire · ${label}`,
  resourceInput: (label: string) => `Input · ${label}`,
  newTab: "(nouvel onglet)",
} as const;

export function formatEvaluationSummary(
  corrections: Pick<Correction, "kind" | "status">[],
): string {
  let mistake = 0;
  let standard = 0;
  let dialectCheck = 0;
  for (const item of corrections) {
    if (countsAsMistake(item)) mistake += 1;
    else if (item.kind === "standard") standard += 1;
    else if (item.kind === "dialect_check" && item.status === "open") {
      dialectCheck += 1;
    }
  }
  const parts: string[] = [];
  if (mistake === 1) parts.push("1 faute");
  else if (mistake > 1) parts.push(`${mistake} fautes`);
  if (standard > 0) parts.push(`${standard} en français standard`);
  if (dialectCheck > 0) parts.push(`${dialectCheck} à vérifier`);
  return parts.length === 0 ? reviewCopy.none : parts.join(" · ");
}
