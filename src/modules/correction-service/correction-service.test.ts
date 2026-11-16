import { describe, expect, it } from "vitest";
import {
  Correction,
  type CorrectionKind,
  type CorrectionStatus,
} from "@/contracts/correction";
import {
  applyCorrectionPatch,
  statusAfterDialectNote,
} from "./correction-service";

function correction(
  kind: CorrectionKind,
  status: CorrectionStatus,
): Correction {
  return Correction.parse({
    id: "c1",
    sessionId: 1,
    ordinal: 1,
    kind,
    quote: "a tombé",
    span: { start: 0, end: 8 },
    anchor: "exact",
    suggestion: "est tombé",
    explanation: "Auxiliaire.",
    question: kind === "dialect_check" ? "Ça se dit ?" : null,
    ruleIfDialect: "On dit a tombé.",
    category: kind === "standard" ? null : "auxiliaire",
    dlf: null,
    resourceIds: [],
    status,
    dialectNoteId: null,
    isFocus: false,
  });
}

describe("correction transitions", () => {
  it("allows the documented moves per kind", () => {
    expect(
      applyCorrectionPatch(correction("mistake", "open"), "acknowledge"),
    ).toEqual({
      ok: true,
      status: "acknowledged",
    });
    expect(
      applyCorrectionPatch(correction("standard", "open"), "acknowledge"),
    ).toEqual({
      ok: true,
      status: "acknowledged",
    });
    expect(
      applyCorrectionPatch(
        correction("dialect_check", "open"),
        "reject_dialect",
      ),
    ).toEqual({ ok: true, status: "confirmed_mistake" });
    expect(statusAfterDialectNote(correction("mistake", "open"))).toEqual({
      ok: true,
      status: "overturned",
    });
    expect(
      statusAfterDialectNote(correction("mistake", "acknowledged")),
    ).toEqual({
      ok: true,
      status: "overturned",
    });
    expect(statusAfterDialectNote(correction("dialect_check", "open"))).toEqual(
      {
        ok: true,
        status: "confirmed_dialect",
      },
    );
  });

  it("rejects every other transition", () => {
    expect(
      applyCorrectionPatch(correction("mistake", "open"), "reject_dialect").ok,
    ).toBe(false);
    expect(
      applyCorrectionPatch(correction("mistake", "acknowledged"), "acknowledge")
        .ok,
    ).toBe(false);
    expect(
      applyCorrectionPatch(correction("dialect_check", "open"), "acknowledge")
        .ok,
    ).toBe(false);
    expect(
      applyCorrectionPatch(
        correction("dialect_check", "confirmed_mistake"),
        "reject_dialect",
      ).ok,
    ).toBe(false);
    expect(statusAfterDialectNote(correction("standard", "open")).ok).toBe(
      false,
    );
    expect(statusAfterDialectNote(correction("mistake", "overturned")).ok).toBe(
      false,
    );
    expect(
      statusAfterDialectNote(correction("dialect_check", "confirmed_dialect"))
        .ok,
    ).toBe(false);
    expect(
      statusAfterDialectNote(correction("dialect_check", "confirmed_mistake"))
        .ok,
    ).toBe(false);
  });
});
