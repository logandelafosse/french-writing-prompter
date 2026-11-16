import {
  FocusSnapshot,
  type FocusSnapshot as Snapshot,
} from "@/contracts/focus";
import { parseJson } from "@/lib/json";

export function parseStoredFocus(
  raw: string | null | undefined,
): Snapshot | null {
  if (raw === null || raw === undefined || raw.length === 0) {
    return null;
  }
  const parsed = parseJson(FocusSnapshot, raw);
  return parsed.ok ? parsed.value : [];
}
