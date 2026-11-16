import type { Correction } from "@/contracts/correction";

export function acknowledgeCorrection(
  correction: Correction,
): { ok: true; status: "acknowledged" } | { ok: false; code: "CONFLICT" } {
  if (
    (correction.kind === "mistake" || correction.kind === "standard") &&
    correction.status === "open"
  ) {
    return { ok: true, status: "acknowledged" };
  }
  return { ok: false, code: "CONFLICT" };
}
