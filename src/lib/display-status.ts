import type { SessionDisplayStatus, SessionStatus } from "@/contracts/session";
import { countWords } from "./count-words";

export type DisplayStatusRow = {
  status: SessionStatus;
  localDate: string | null;
  writingText: string | null;
};

function abandonedKind(writingText: string | null): SessionDisplayStatus {
  if (countWords(writingText ?? "") > 0) return "draft_abandoned";
  return "prompt_unused";
}

export function deriveDisplayStatus(
  row: DisplayStatusRow,
  today: string,
): SessionDisplayStatus {
  switch (row.status) {
    case "evaluated":
      return "evaluated";
    case "active":
      if (row.localDate === today) return "in_progress";
      return abandonedKind(row.writingText);
    case "abandoned":
      return abandonedKind(row.writingText);
  }
}
