import type { DialectNote } from "@/contracts/dialect-note";
import { localDateKey } from "@/lib/dates";
import {
  LOUISIANA_VOCABULARY_HEADWORDS,
  type LouisianaRule,
} from "./louisiana-rules";

export const DIALECT_MARKDOWN_HEADER =
  "GÉNÉRÉ — modifier dans l'app (notes) ou dans src/modules/dialect/louisiana-rules.ts (règles de base)";

export type DialectMarkdownNote = DialectNote & {
  deletedAt: string | null;
};

const BASE_RULES_HEADING = "Règles de base";
const VOCAB_HEADING = "Vocabulaire";
const WORD_SCOPE_HEADING = "Ce mot seulement";
const PATTERN_SCOPE_HEADING = "Toute la famille";

function renderRule(rule: LouisianaRule): string {
  const examples = rule.examples.map((example) => `- ${example}`).join("\n");
  return `### ${rule.id}\n\n${rule.rule_fr}\n\n${examples}`;
}

function renderNote(note: DialectMarkdownNote): string {
  const lines = [`### note-${note.id}`, "", note.rule];
  if (note.example !== null && note.example.length > 0) {
    lines.push("", `*${note.example}*`);
  }
  if (
    note.learnerForm !== null &&
    note.learnerForm.length > 0 &&
    note.tutorSuggestion !== null &&
    note.tutorSuggestion.length > 0
  ) {
    lines.push("", `${note.learnerForm} → ${note.tutorSuggestion}`);
  }
  lines.push("", localDateKey(new Date(note.createdAt)));
  return lines.join("\n");
}

function renderNoteSection(
  heading: string,
  notes: readonly DialectMarkdownNote[],
): string {
  if (notes.length === 0) {
    return `## ${heading}`;
  }
  return `## ${heading}\n\n${notes.map(renderNote).join("\n\n")}`;
}

export function renderDialectMarkdown(
  baseRules: readonly LouisianaRule[],
  notes: readonly DialectMarkdownNote[],
): string {
  const active = notes
    .filter((note) => note.deletedAt === null)
    .slice()
    .sort((left, right) => left.id - right.id);
  const wordNotes = active.filter((note) => note.scope === "word");
  const patternNotes = active.filter((note) => note.scope === "pattern");
  const vocab = LOUISIANA_VOCABULARY_HEADWORDS.map((word) => `- ${word}`).join(
    "\n",
  );

  return [
    DIALECT_MARKDOWN_HEADER,
    "",
    `## ${BASE_RULES_HEADING}`,
    "",
    baseRules.map(renderRule).join("\n\n"),
    "",
    `### ${VOCAB_HEADING}`,
    "",
    vocab,
    "",
    renderNoteSection(WORD_SCOPE_HEADING, wordNotes),
    "",
    renderNoteSection(PATTERN_SCOPE_HEADING, patternNotes),
    "",
  ].join("\n");
}
