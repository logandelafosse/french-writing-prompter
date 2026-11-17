import type { MistakeCategory } from "@/contracts/mistake-category";
import { parseStoredFocus } from "@/lib/parse-stored-focus";
import type { RankedWeakness } from "./aggregate";
import { computeFocus } from "./compute-focus";
import { getPendingPractice } from "./practice-store";
import { listRankedWeaknesses } from "./weakness-store";

export type WeaknessBoard = {
  ranked: RankedWeakness[];
  pin: MistakeCategory | null;
  focusIds: MistakeCategory[];
};

export type LiveFocus = {
  focusIds: MistakeCategory[];
  pin: MistakeCategory | null;
  practiceId: number | null;
};

async function readPendingPin(): Promise<{
  pin: MistakeCategory | null;
  practiceId: number | null;
}> {
  const pending = await getPendingPractice();
  return {
    pin: pending?.category ?? null,
    practiceId: pending?.id ?? null,
  };
}

async function rankLive(pin: MistakeCategory | null): Promise<{
  ranked: RankedWeakness[];
  focusIds: MistakeCategory[];
}> {
  const ranked = await listRankedWeaknesses();
  return { ranked, focusIds: computeFocus(ranked, pin) };
}

export async function weaknessBoard(): Promise<WeaknessBoard> {
  const pending = await readPendingPin();
  const live = await rankLive(pending.pin);
  return {
    ranked: live.ranked,
    pin: pending.pin,
    focusIds: live.focusIds,
  };
}

export async function currentFocus(
  storedFocusJson?: string | null,
): Promise<LiveFocus> {
  const pending = await readPendingPin();
  if (storedFocusJson !== undefined) {
    const snapshot = parseStoredFocus(storedFocusJson);
    if (snapshot !== null) {
      return { focusIds: snapshot, ...pending };
    }
  }
  const live = await rankLive(pending.pin);
  return { focusIds: live.focusIds, ...pending };
}
