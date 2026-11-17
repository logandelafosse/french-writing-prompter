import {
  MISTAKE_CATEGORY_IDS,
  type MistakeCategory,
} from "@/contracts/mistake-category";
import type { Resource } from "@/contracts/resource";

const ALL = [...MISTAKE_CATEGORY_IDS];
const TEX = "https://www.laits.utexas.edu/tex/gr";
const DIALECT = "standard" as const;

function grammar(
  category: MistakeCategory,
  title: string,
  url: string,
  source: string,
): Resource {
  return {
    id: `grammaire-${category.replaceAll("_", "-")}`,
    type: "grammaire",
    title,
    url,
    source,
    categories: [category],
    dialect: DIALECT,
  };
}

function tex(category: MistakeCategory, title: string, page: string): Resource {
  return grammar(category, title, `${TEX}/${page}`, "Tex's French Grammar");
}

export const catalogEntries: Resource[] = [
  tex("conjugaison", "la conjugaison", "v1.html"),
  tex("imparfait_pc", "imparfait ou passé composé", "tap8.html"),
  tex("infinitif_participe", "l'infinitif et le participe", "vinf1.html"),
  tex("auxiliaire", "le choix de l'auxiliaire", "tap3.html"),
  tex("genre", "le genre des noms", "no3.html"),
  tex("accord", "l'accord", "adj2.html"),
  tex("articles", "les articles", "det2.html"),
  tex("prepositions", "les prépositions", "pre1.html"),
  tex("pronoms", "les pronoms", "pro1.html"),
  tex("negation", "la négation", "neg2.html"),
  tex("ordre_mots", "l'ordre des mots", "pro9.html"),
  tex("connecteurs", "les conjonctions", "con2.html"),
  grammar(
    "orthographe",
    "l'orthographe",
    "https://www.lepointdufle.net/p/orthographe.htm",
    "Le Point du FLE",
  ),
  grammar(
    "accents",
    "les accents",
    "https://www.lepointdufle.net/p/phonetique.htm",
    "Le Point du FLE",
  ),
  grammar(
    "vocabulaire",
    "le choix du mot",
    "https://www.lepointdufle.net/p/vocabulaire.htm",
    "Le Point du FLE",
  ),
  grammar(
    "autre",
    "la grammaire française",
    `${TEX}/index.html`,
    "Tex's French Grammar",
  ),
  {
    id: "input-innerfrench",
    type: "input",
    title: "podcasts InnerFrench",
    url: "https://www.youtube.com/@innerfrench",
    source: "InnerFrench",
    categories: ALL,
    dialect: DIALECT,
  },
  {
    id: "input-rfi",
    type: "input",
    title: "le journal en français facile",
    url: "https://www.rfi.fr/fr/podcasts/journal-fran%C3%A7ais-facile/",
    source: "RFI",
    categories: ALL,
    dialect: DIALECT,
  },
];
