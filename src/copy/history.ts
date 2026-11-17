import { countsAsMistake, type Correction } from "@/contracts/correction";
import type { SessionSummary } from "@/contracts/session";
import { formatFrenchDate } from "@/lib/dates";

export const historyCopy = {
  title: "Historique",
  listLabel: "Séances passées",
  abandonedTitle: "Brouillon laissé de côté",
  unusedTitle: "Consigne pas utilisée",
  evaluated: "évaluée",
  notEvaluated: "pas évalué",
  unusedMeta: "rien d'écrit",
  incomplete: "détails incomplets",
  legacyEval: "Évaluation d'avant les corrections",
  empty: "Pas encore de séance.",
  prompt: "CONSIGNE D'ÉCRITURE",
  text: (n: number) => `TON TEXTE · ${n} MOTS`,
  corrections: "CORRECTIONS",
  kindMistake: "Faute",
  kindStandard: "Français standard",
  kindNote: "Note de dialecte",
  noteKept: (quote: string) => `${quote}, gardé comme t'as écrit`,
  malformedNotice:
    "Les corrections de cette séance ont pas pu être relues. Ta consigne et ton texte sont gardés, et le reste de l'Historique marche comme d'habitude.",
  sessionOf: (date: string) => `Séance du ${date}`,
} as const;

export function formatFauteCount(n: number): string {
  return n <= 1 ? `${n} faute` : `${n} fautes`;
}

export function mistakeCount(
  items: readonly Pick<Correction, "kind" | "status">[],
): number {
  return items.filter((item) => countsAsMistake(item)).length;
}

// prettier-ignore
export function historyTitle(input: { focusLabels: readonly string[]; genre: string | null; date: string }): string {
  if (input.focusLabels.length > 0) return input.focusLabels.join(" · ");
  return input.genre ? `${input.genre} · ${input.date}` : historyCopy.sessionOf(input.date);
}

export function formatHistoryDate(iso: string, timeZone?: string): string {
  const lower = formatFrenchDate(new Date(iso), timeZone);
  return lower ? `${lower.charAt(0).toUpperCase()}${lower.slice(1)}` : lower;
}

export function formatHistoryDay(iso: string, timeZone?: string): string {
  return formatFrenchDate(new Date(iso), timeZone).replace(/^\S+\s/, "");
}

// prettier-ignore
export function formatLevelLine(
  history: readonly { id: number; toLevel: string; createdAt: string; revertsChangeId?: number | undefined }[],
  timeZone?: string,
): string | null {
  const reverted = new Set(history.flatMap((change) => change.revertsChangeId === undefined ? [] : [change.revertsChangeId]));
  const entries = history.filter((change) => change.revertsChangeId === undefined && !reverted.has(change.id)).slice().reverse();
  if (entries.length === 0) return null;
  return `Niveau : ${entries.map((change) => `${change.toLevel} depuis le ${formatHistoryDay(change.createdAt, timeZone)}`).join(", ")}.`;
}

export function writingExcerpt(text: string): string | null {
  const trimmed = text.trim();
  if (trimmed.length === 0) return null;
  const sentences = trimmed.match(/[^.!?]+[.!?]+|[^.!?]+$/g);
  return `${(sentences ?? [trimmed]).slice(0, 3).join("").trim()}…`;
}

// prettier-ignore
export function historyRowTitle(item: SessionSummary): string {
  if (item.displayStatus === "draft_abandoned") return historyCopy.abandonedTitle;
  if (item.displayStatus === "prompt_unused") return historyCopy.unusedTitle;
  return item.title;
}

// prettier-ignore
export function historyRowMeta(item: SessionSummary, timeZone?: string): string {
  const date = formatHistoryDate(item.createdAt, timeZone);
  if (item.displayStatus === "prompt_unused") return `${date} · ${historyCopy.unusedMeta}`;
  if (item.displayStatus === "draft_abandoned") return `${date} · ${item.wordCount} mots · ${historyCopy.notEvaluated}`;
  if (item.dataIssues.includes("evaluation_unreadable")) return `${date} · ${historyCopy.evaluated} · ${historyCopy.incomplete}`;
  if (item.dataIssues.includes("evaluation_legacy")) return [date, historyCopy.legacyEval, item.evaluatedLevel].filter(Boolean).join(" · ");
  return [date, historyCopy.evaluated, formatFauteCount(item.mistakeCount), item.evaluatedLevel ?? item.promptLevel].filter(Boolean).join(" · ");
}
