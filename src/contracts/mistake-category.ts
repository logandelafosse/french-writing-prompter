import { z } from "zod";

export const MISTAKE_CATEGORY_IDS = [
  "conjugaison",
  "imparfait_pc",
  "infinitif_participe",
  "auxiliaire",
  "genre",
  "accord",
  "articles",
  "prepositions",
  "pronoms",
  "negation",
  "ordre_mots",
  "orthographe",
  "accents",
  "vocabulaire",
  "connecteurs",
  "autre",
] as const;

export const MistakeCategory = z.enum(MISTAKE_CATEGORY_IDS);
export type MistakeCategory = z.infer<typeof MistakeCategory>;
