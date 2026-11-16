import type { FocusItem } from "@/contracts/focus";
import type { MistakeCategory } from "@/contracts/mistake-category";

export type CategoryTaxonomy = {
  name: string;
  inlineName: string;
  historyName: string;
  shortName: string;
  elicitHint: string;
};

const NBH = "\u2011";

function n(
  name: string,
  shortName: string,
  elicitHint: string,
): CategoryTaxonomy {
  return {
    name,
    inlineName: name.charAt(0).toLowerCase() + name.slice(1),
    historyName: name.replace(/ \([^)]*\)$/, ""),
    shortName,
    elicitHint,
  };
}

export const categoryTaxonomy: Record<MistakeCategory, CategoryTaxonomy> = {
  conjugaison: n(
    "Conjugaison",
    "conjugaison",
    "des actions racontées au présent",
  ),
  imparfait_pc: n(
    "Imparfait ou passé composé",
    "imparfait / PC",
    "un récit au passé avec décor et événements",
  ),
  infinitif_participe: n(
    `Infinitif ou participe (${NBH}er / ${NBH}é)`,
    `${NBH}er / ${NBH}é`,
    "un but ou un souvenir qui oppose un verbe et un résultat",
  ),
  auxiliaire: n(
    "Choix de l'auxiliaire",
    "auxiliaire",
    "des déplacements et des changements d'état",
  ),
  genre: n("Genre des noms", "genre", "des objets et des personnes à décrire"),
  accord: n("Accords", "accords", "plusieurs personnes qui font la même chose"),
  articles: n(
    "Articles et déterminants",
    "articles",
    "des choses dont tu précises la quantité ou l'identité",
  ),
  prepositions: n(
    "Prépositions",
    "prépositions",
    "des lieux et des destinataires",
  ),
  pronoms: n("Pronoms", "pronoms", "éviter de répéter les noms déjà cités"),
  negation: n("Négation", "négation", "ce qui n'a pas eu lieu"),
  ordre_mots: n(
    "Ordre des mots",
    "ordre des mots",
    "des questions et des phrases inversées",
  ),
  orthographe: n("Orthographe", "orthographe", "des mots proches à l'oreille"),
  accents: n(
    "Accents (é / è / ê)",
    "é / è / ê",
    "des mots où l'accent change le sens",
  ),
  vocabulaire: n(
    "Choix du mot",
    "mot",
    "un choix de mots précis pour un même objet",
  ),
  connecteurs: n(
    "Liaison des idées",
    "connecteurs",
    "enchaîner des idées opposées et des causes",
  ),
  autre: n("Autre", "autre", "un scénario du quotidien"),
};

export function toFocusItems(ids: readonly MistakeCategory[]): FocusItem[] {
  return ids.map((id) => {
    const row = categoryTaxonomy[id];
    return {
      id,
      name: row.name,
      inlineName: row.inlineName,
      historyName: row.historyName,
      shortName: row.shortName,
    };
  });
}

export function elicitFocus(ids: readonly MistakeCategory[]) {
  return ids.map((id) => ({
    id,
    label: categoryTaxonomy[id].inlineName,
    elicitHint: categoryTaxonomy[id].elicitHint,
  }));
}
