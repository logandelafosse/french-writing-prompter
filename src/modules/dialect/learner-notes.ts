import type { LearnerDialectNote } from "@/contracts/dialect-note";

const LEARNER_NOTES_HEADING =
  "Formes confirmées par l'apprenant — ne les signale JAMAIS";

function normalizeForm(value: string): string {
  return value
    .normalize("NFC")
    .replace(/\u2019/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function renderActiveLearnerNotes(
  notes: readonly LearnerDialectNote[],
): string {
  const active = notes.filter((note) => note.deletedAt === null);
  if (active.length === 0) return "";
  const lines = active.map((note) =>
    note.scope === "word" ? `- ${note.form}` : `- ${note.rule}`,
  );
  return `${LEARNER_NOTES_HEADING}\n${lines.join("\n")}`;
}

export function matchesActiveWordScopeNote(
  quote: string,
  suggestion: string,
  notes: readonly LearnerDialectNote[],
): boolean {
  const haystacks = [normalizeForm(quote), normalizeForm(suggestion)];
  return notes.some((note) => {
    if (note.scope !== "word" || note.deletedAt !== null) return false;
    const keys = [note.form, note.learnerForm].filter(
      (value): value is string => value !== null && value.length > 0,
    );
    return keys.some((key) => {
      const needle = normalizeForm(key);
      return needle.length > 0 && haystacks.some((hay) => hay.includes(needle));
    });
  });
}
