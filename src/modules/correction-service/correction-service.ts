import type { Correction, CorrectionStatus } from "@/contracts/correction";

export type CorrectionPatchAction = "acknowledge" | "reject_dialect";

export function applyCorrectionPatch(
  correction: Correction,
  action: CorrectionPatchAction,
): { ok: true; status: CorrectionStatus } | { ok: false; code: "CONFLICT" } {
  if (action === "acknowledge") {
    if (
      (correction.kind === "mistake" || correction.kind === "standard") &&
      correction.status === "open"
    ) {
      return { ok: true, status: "acknowledged" };
    }
    return { ok: false, code: "CONFLICT" };
  }
  if (correction.kind === "dialect_check" && correction.status === "open") {
    return { ok: true, status: "confirmed_mistake" };
  }
  return { ok: false, code: "CONFLICT" };
}

export function statusAfterDialectNote(
  correction: Correction,
):
  | { ok: true; status: "overturned" | "confirmed_dialect" }
  | { ok: false; code: "CONFLICT" } {
  if (
    correction.kind === "mistake" &&
    (correction.status === "open" || correction.status === "acknowledged")
  ) {
    return { ok: true, status: "overturned" };
  }
  if (correction.kind === "dialect_check" && correction.status === "open") {
    return { ok: true, status: "confirmed_dialect" };
  }
  return { ok: false, code: "CONFLICT" };
}
