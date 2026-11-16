import { DIALECT_NOTE_NEW_MS } from "@/config/limits";
import type { DialectNote } from "@/contracts/dialect-note";
import { formatFrenchDate, localDateKey } from "@/lib/dates";

export const carnetCopy = {
  title: "Carnet",
  notesTitle: "Mon français louisianais",
  notesIntro:
    "Tes notes de dialecte. Le tuteur les suit et te reprend pas là-dessus.",
  notesAdd: "Ajouter une note",
  notesEdit: "Modifier",
  notesDelete: "Supprimer",
  notesEmpty:
    "Pas encore de notes. Quand le tuteur te demande « Ça se dit comme ça ? », ta réponse vient icitte.",
  sessionToday: "séance d'aujourd'hui",
  scopeWord: "ce mot seulement",
  scopePattern: "toute la famille",
  metaNew: "nouvelle",
  deleteLabel: "Supprimer cette note",
  deleteLead: "Supprimer cette note ?",
  deleteBody: "Le tuteur pourra te reprendre là-dessus.",
  deleteKeep: "Garder",
} as const;

export function dialectNoteIsNew(createdAt: string, now: () => Date): boolean {
  return now().getTime() - new Date(createdAt).getTime() < DIALECT_NOTE_NEW_MS;
}

export function formatDialectNoteMeta(
  note: Pick<DialectNote, "createdAt" | "sourceSessionId" | "scope">,
  now: () => Date,
): string {
  const current = now();
  const created = new Date(note.createdAt);
  const day = formatFrenchDate(created).replace(/^\S+\s/, "");
  const source =
    note.sourceSessionId === null
      ? null
      : localDateKey(created) === localDateKey(current)
        ? carnetCopy.sessionToday
        : `séance du ${day}`;
  const scope =
    note.scope === "pattern" ? carnetCopy.scopePattern : carnetCopy.scopeWord;
  const tag = dialectNoteIsNew(note.createdAt, () => current)
    ? carnetCopy.metaNew
    : null;
  return [day, source, scope, tag].filter(Boolean).join(" · ");
}
