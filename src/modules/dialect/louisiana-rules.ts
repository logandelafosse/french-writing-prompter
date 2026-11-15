import { z } from "zod";

export const DEFAULT_DIALECT = "louisiana" as const;
export const DialectSchema = z.literal(DEFAULT_DIALECT);
export type Dialect = z.infer<typeof DialectSchema>;

export type LouisianaRule = {
  id: string;
  rule_fr: string;
  rule_en: string;
  examples: string[];
  neverFlag: true;
};

/** DLF headwords (≤30); verified via `node scripts/verify-dlf-seed.mjs`. */
export const LOUISIANA_VOCABULARY_HEADWORDS = [
  "asteur",
  "berceuse",
  "catastrophe",
  "chevrette",
  "cocodrie",
  "coton",
  "écrevisse",
  "gris-gris",
  "gumbo",
  "lagniappe",
  "moqueur",
  "mouiller",
  "patate",
  "tante",
  "zire",
] as const;

export const LOUISIANA_RULES: readonly LouisianaRule[] = [
  {
    id: "third-person-plural-subject",
    rule_fr:
      "Sujet à la 3e personne du pluriel : ça, eusse, eux-autres, eux ou ils (avec -ont au verbe si voulu).",
    rule_en:
      "Third-person plural subjects: ça, eusse, eux-autres, eux, or ils; accept -ont verb endings.",
    examples: ["ils mangeont", "ça parlont", "eux-autres viennent"],
    neverFlag: true,
  },
  {
    id: "second-person-plural",
    rule_fr: "2e personne du pluriel : vous-autres ou vous ; singulier : tu.",
    rule_en: "Second-person plural: vous-autres or vous; singular: tu.",
    examples: ["vous", "vous-autres allez", "Quoi tu fais ?"],
    neverFlag: true,
  },
  {
    id: "first-person-plural",
    rule_fr:
      "1re personne du pluriel : on ou nous-autres (nous sujet est rare).",
    rule_en: "First-person plural: on or nous-autres (subject nous is rare).",
    examples: ["on va", "nous-autres partons"],
    neverFlag: true,
  },
  {
    id: "progressive",
    rule_fr: "Progressif : être après + infinitif.",
    rule_en: "Present progressive: être après + infinitive.",
    examples: ["je suis après manger"],
    neverFlag: true,
  },
  {
    id: "auxiliary-motion",
    rule_fr:
      "Passé composé : avoir avec les verbes de mouvement (venir, aller, etc.).",
    rule_en: "Passé composé: avoir with motion verbs.",
    examples: ["il a tombé", "j'ai venu"],
    neverFlag: true,
  },
  {
    id: "future",
    rule_fr:
      "Futur proche par défaut ; futur simple aussi correct pour l’inconnu ou lointain.",
    rule_en:
      "Futur proche is default; futur simple is also correct when appropriate.",
    examples: ["tu vas connaître", "tu pourras"],
    neverFlag: true,
  },
  {
    id: "subjunctive",
    rule_fr:
      "Subjonctif rare et jamais exigé ; l’indicatif est toujours acceptable.",
    rule_en:
      "Subjunctive is rare and never required; indicative is always acceptable.",
    examples: ["faut que tu viens", "faut que tu sois", "veux que t'aies"],
    neverFlag: true,
  },
  {
    id: "je-vas",
    rule_fr: "je vas pour « je vais ».",
    rule_en: '"je vas" for first-person "I go".',
    examples: ["je vas"],
    neverFlag: true,
  },
  {
    id: "third-person-plural-ont",
    rule_fr: "Terminaisons -ont à la 3e personne du pluriel au présent.",
    rule_en: "Third-person plural -ont endings in the present.",
    examples: ["ils mangeont", "ça parlont"],
    neverFlag: true,
  },
  {
    id: "questions",
    rule_fr:
      "Questions avec quoi ; est-ce que est aussi correct, surtout plus formel.",
    rule_en: "Quoi questions; est-ce que is also correct, often more formal.",
    examples: ["Quoi tu fais ?", "Quoi faire ?", "est-ce que"],
    neverFlag: true,
  },
  {
    id: "negation",
    rule_fr: "Négation sans ne (je connais pas).",
    rule_en: "Negation without ne.",
    examples: ["je connais pas"],
    neverFlag: true,
  },
  {
    id: "imperfect-conditional-plural",
    rule_fr:
      "Imparfait et conditionnel du pluriel (être, avoir) et conditionnel passé.",
    rule_en:
      "Third-person plural imperfect/conditional forms and past conditional.",
    examples: [
      "ils étiont",
      "ils onvait",
      "ils onvaiont",
      "ils auriont eu une bande qui jouait",
    ],
    neverFlag: true,
  },
];
