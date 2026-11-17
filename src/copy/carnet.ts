import { DIALECT_NOTE_NEW_MS } from "@/config/limits";
import type { DialectNote } from "@/contracts/dialect-note";
import type { MistakeCategory } from "@/contracts/mistake-category";
import type { WeaknessTrend } from "@/contracts/weakness";
import { formatFrenchDate, localDateKey } from "@/lib/dates";

export const carnetCopy = {
  title: "Carnet",
  weakTitle: "À travailler",
  weakIntro:
    "Les fautes qui reviennent. «\u202FPratiquer ça\u202F» oriente ta prochaine consigne.",
  weakEmpty:
    "Rien à travailler pour l'instant. Les fautes qui reviennent vont apparaître icitte.",
  weakToday: "aujourd'hui",
  weakPractice: "Pratiquer ça",
  weakMetaPinned: "prochaine consigne",
  weakMetaFocus: "focus du jour",
  trendEnProgres: "en progrès",
  notesTitle: "Mon français louisianais",
  notesIntro:
    "Tes notes de dialecte. Le tuteur les suit et te reprend pas là-dessus.",
  notesAdd: "Ajouter une note",
  notesEdit: "Modifier",
  notesDelete: "Supprimer",
  notesEmpty:
    "Pas encore de notes. Quand le tuteur te demande «\u202FÇa se dit comme ça\u202F?\u202F», ta réponse vient icitte.",
  sessionToday: "séance d'aujourd'hui",
  scopeWord: "ce mot seulement",
  scopePattern: "toute la famille",
  metaNew: "nouvelle",
  deleteLabel: "Supprimer cette note",
  deleteLead: "Supprimer cette note\u202F?",
  deleteBody: "Le tuteur pourra te reprendre là-dessus.",
  deleteKeep: "Garder",
} as const;

export const mistakeCategoryLabels: Record<MistakeCategory, string> = {
  conjugaison: "Conjugaison",
  imparfait_pc: "Imparfait ou passé composé",
  infinitif_participe: "Infinitif ou participe (\u2011er / \u2011é)",
  auxiliaire: "Choix de l'auxiliaire",
  genre: "Genre des noms",
  accord: "Accords",
  articles: "Articles et déterminants",
  prepositions: "Prépositions",
  pronoms: "Pronoms",
  negation: "Négation",
  ordre_mots: "Ordre des mots",
  orthographe: "Orthographe",
  accents: "Accents (é / è / ê)",
  vocabulaire: "Choix du mot",
  connecteurs: "Liaison des idées",
  autre: "Autre",
};

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

export function formatWeaknessMeta(
  weakness: { count: number; lastSeenAt: string; trend: WeaknessTrend },
  now: () => Date,
): string {
  const seen = new Date(weakness.lastSeenAt);
  const when =
    localDateKey(seen) === localDateKey(now())
      ? carnetCopy.weakToday
      : `le ${formatFrenchDate(seen).replace(/^\S+\s/, "")}`;
  const trend =
    weakness.trend === "en_progres"
      ? carnetCopy.trendEnProgres
      : weakness.trend;
  return `${weakness.count} fois · vu ${when} · ${trend}`;
}
