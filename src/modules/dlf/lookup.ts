import { DlfLexicon, type DlfLexiconEntry } from "@/contracts/dlf";
import {
  DLF_HINT_MAX_HITS,
  DLF_HINT_MAX_TOKENS,
  DLF_HINT_MIN_LETTERS,
} from "@/config/limits";
import { parseJson } from "@/lib/json";

export type DlfHit = {
  entryId: string;
  headword: string;
  accentMismatch: boolean;
};

export type DlfHintCard = {
  headword: string;
  pos: string;
  gloss: string;
  example: string | null;
  translation: string | null;
};

export type DlfIndex = {
  lookup: (word: string) => DlfHit | null;
  cardsForText: (text: string) => DlfHintCard[];
};

/** Chars-per-token used to enforce DLF_HINT_MAX_TOKENS on injected cards. */
const DLF_HINT_CHARS_PER_TOKEN = 4;

export function estimateHintTokens(text: string): number {
  return Math.ceil(text.length / DLF_HINT_CHARS_PER_TOKEN);
}

export function emptyDlfIndex(): DlfIndex {
  return {
    lookup: () => null,
    cardsForText: () => [],
  };
}

function normalizeExact(word: string): string {
  return word
    .normalize("NFC")
    .replaceAll("\u2019", "'")
    .replaceAll("\u2018", "'")
    .toLowerCase()
    .trim();
}

function foldAccents(word: string): string {
  return normalizeExact(word).normalize("NFD").replaceAll(/\p{M}/gu, "");
}

function stripPlural(word: string): string | null {
  if (word.length < 5) return null;
  if (word.endsWith("aux")) return `${word.slice(0, -3)}al`;
  if (word.endsWith("s") || word.endsWith("x")) return word.slice(0, -1);
  return null;
}

function letterCount(word: string): number {
  let n = 0;
  for (const ch of word) {
    if (/\p{L}/u.test(ch)) n += 1;
  }
  return n;
}

function contentWords(text: string): string[] {
  const words: string[] = [];
  for (const raw of text.split(/\s+/)) {
    const trimmed = raw.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, "");
    if (letterCount(trimmed) >= DLF_HINT_MIN_LETTERS) words.push(trimmed);
  }
  return words;
}

function firstSenseCard(entry: DlfLexiconEntry): DlfHintCard {
  const sense = entry.senses[0];
  const example = sense?.examples[0];
  return {
    headword: entry.headword,
    pos: sense?.pos ?? "",
    gloss: sense?.glosses[0] ?? "",
    example: example?.louisiana_french_text ?? null,
    translation: example?.translation ?? null,
  };
}

function formatDlfHintCard(card: DlfHintCard): string {
  const pos = card.pos.length > 0 ? ` (${card.pos})` : "";
  const example =
    card.example === null
      ? ""
      : ` Ex. « ${card.example} »${
          card.translation === null ? "" : ` (${card.translation})`
        }`;
  return `- ${card.headword}${pos}: ${card.gloss}.${example}`;
}

export function formatDlfHintSection(cards: DlfHintCard[]): string {
  if (cards.length === 0) return "";
  const body = cards.map(formatDlfHintCard).join("\n");
  return `Mots du texte attestés dans le Dictionary of Louisiana French. Traite-les comme usage louisianais attesté ; ne les « corrige » pas vers le français standard.\n${body}`;
}

export function buildDlfIndex(entries: readonly DlfLexiconEntry[]): DlfIndex {
  const byExact = new Map<string, DlfLexiconEntry>();
  const byFold = new Map<string, DlfLexiconEntry>();
  const byId = new Map<string, DlfLexiconEntry>();

  for (const entry of entries) {
    byId.set(entry.id, entry);
    const spellings = [entry.headword, ...entry.forms];
    for (const spelling of spellings) {
      const exact = normalizeExact(spelling);
      if (exact.length === 0) continue;
      if (!byExact.has(exact)) byExact.set(exact, entry);
      const folded = foldAccents(spelling);
      if (!byFold.has(folded)) byFold.set(folded, entry);
    }
  }

  function lookup(word: string): DlfHit | null {
    const exact = normalizeExact(word);
    if (exact.length === 0) return null;
    const exactHit = byExact.get(exact);
    if (exactHit) {
      return {
        entryId: exactHit.id,
        headword: exactHit.headword,
        accentMismatch: false,
      };
    }
    const stripped = stripPlural(exact);
    if (stripped !== null) {
      const pluralHit = byExact.get(stripped);
      if (pluralHit) {
        return {
          entryId: pluralHit.id,
          headword: pluralHit.headword,
          accentMismatch: false,
        };
      }
    }
    const folded = foldAccents(word);
    const foldHit =
      byFold.get(folded) ??
      (stripped === null ? undefined : byFold.get(foldAccents(stripped)));
    if (!foldHit) return null;
    return {
      entryId: foldHit.id,
      headword: foldHit.headword,
      accentMismatch: true,
    };
  }

  function cardsForText(text: string): DlfHintCard[] {
    const seen = new Set<string>();
    const cards: DlfHintCard[] = [];
    for (const word of contentWords(text)) {
      if (cards.length >= DLF_HINT_MAX_HITS) break;
      const hit = lookup(word);
      if (hit === null || seen.has(hit.entryId)) continue;
      const entry = byId.get(hit.entryId);
      if (!entry) continue;
      seen.add(hit.entryId);
      cards.push(firstSenseCard(entry));
    }
    while (
      cards.length > 0 &&
      estimateHintTokens(formatDlfHintSection(cards)) > DLF_HINT_MAX_TOKENS
    ) {
      cards.pop();
    }
    return cards;
  }

  return { lookup, cardsForText };
}

export function dlfIndexFromText(text: string): DlfIndex {
  const parsed = parseJson(DlfLexicon, text);
  if (!parsed.ok) return emptyDlfIndex();
  return buildDlfIndex(parsed.value.entries);
}

export function attributeStandard(args: {
  suggestion: string;
  dlfHeadword: string | null;
  lookup: (word: string) => DlfHit | null;
}): { entryId: string; headword: string } | null {
  const candidates = [args.suggestion];
  if (args.dlfHeadword !== null && args.dlfHeadword.length > 0) {
    candidates.push(args.dlfHeadword);
  }
  for (const word of candidates) {
    const hit = args.lookup(word);
    if (hit) return { entryId: hit.entryId, headword: hit.headword };
  }
  return null;
}
