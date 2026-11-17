import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { Correction } from "@/contracts/correction";
import { reviewCopy } from "@/copy/review";
import { CorrectionCard } from "./correction-card";

function standard(
  partial: Pick<Correction, "id" | "ordinal" | "quote" | "suggestion"> &
    Partial<Pick<Correction, "explanation" | "status" | "dlf" | "resources">>,
): Correction {
  return Correction.parse({
    sessionId: 1,
    kind: "standard",
    span: { start: 0, end: 10 },
    anchor: "exact",
    explanation:
      "« Voiture », c'est correct. Par icitte, on dit plus souvent « char ».",
    question: null,
    ruleIfDialect: null,
    category: null,
    dlf: null,
    resourceIds: [],
    status: "open",
    dialectNoteId: null,
    isFocus: false,
    ...partial,
  });
}

describe("CorrectionCard standard", () => {
  it("standard variant shows unstruck quote and only Compris", () => {
    render(
      <CorrectionCard
        correction={standard({
          id: "s1",
          ordinal: 1,
          quote: "ma voiture",
          suggestion: "mon char",
        })}
        onAcknowledge={() => undefined}
      />,
    );

    const card = screen.getByRole("article");
    expect(card).toHaveAttribute("id", "correction-1");
    expect(within(card).getByText(reviewCopy.kindStandard)).toBeVisible();
    expect(within(card).getByText("ma voiture")).toBeVisible();
    expect(
      within(card).getByText(
        "« Voiture », c'est correct. Par icitte, on dit plus souvent « char ».",
      ),
    ).toBeVisible();

    /* eslint-disable testing-library/no-node-access -- reason: unstruck quote vs <strong> suggestion is the standard/mistake distinction */
    expect(within(card).getByText("mon char").closest("strong")).not.toBeNull();
    expect(within(card).queryByText("ma voiture")?.closest("s")).toBeNull();
    /* eslint-enable testing-library/no-node-access -- reason: end of strikethrough/strong asserts */

    expect(
      within(card).getAllByRole("button", { name: reviewCopy.actionAck }),
    ).toHaveLength(1);
    expect(
      within(card).queryByRole("button", {
        name: "C'est du français louisianais",
      }),
    ).not.toBeInTheDocument();
    expect(within(card).queryByRole("link")).not.toBeInTheDocument();
    expect(within(card).queryByText("DLF")).not.toBeInTheDocument();
  });

  it("shows a DLF abbr badge on an attested standard suggestion", () => {
    render(
      <CorrectionCard
        correction={standard({
          id: "s1",
          ordinal: 1,
          quote: "Maintenant",
          suggestion: "Asteur",
          dlf: { entryId: "asteur-0a4c0152c15a", headword: "asteur" },
        })}
        onAcknowledge={() => undefined}
      />,
    );
    const badge = screen.getByTitle(reviewCopy.dlfTitle);
    expect(badge).toHaveTextContent(reviewCopy.dlf);
    expect(badge.tagName).toBe("ABBR");
  });

  it("Compris collapse keeps the mark target and muted quote", () => {
    const onAcknowledge = vi.fn();
    render(
      <CorrectionCard
        correction={standard({
          id: "s1",
          ordinal: 1,
          quote: "ma voiture",
          suggestion: "mon char",
          status: "acknowledged",
        })}
        onAcknowledge={onAcknowledge}
      />,
    );

    const card = screen.getByRole("article");
    expect(card).toHaveAttribute("id", "correction-1");
    expect(within(card).getByText("ma voiture")).toHaveClass("text-muted");
    expect(
      within(card).queryByRole("button", { name: reviewCopy.actionAck }),
    ).not.toBeInTheDocument();
    expect(within(card).queryByText("mon char")).not.toBeInTheDocument();
    expect(onAcknowledge).not.toHaveBeenCalled();
  });
});

function dialect(
  partial: Pick<Correction, "id" | "ordinal" | "quote" | "suggestion"> &
    Partial<Correction>,
): Correction {
  return Correction.parse({
    sessionId: 1,
    kind: "dialect_check",
    span: { start: 0, end: 7 },
    anchor: "exact",
    explanation: "Le français standard prend « est tombé ».",
    question: "Ça se dit comme ça chez toi, « a tombé » ?",
    ruleIfDialect: "On dit a tombé.",
    category: "auxiliaire",
    dlf: null,
    resourceIds: [],
    status: "open",
    dialectNoteId: null,
    isFocus: false,
    ...partial,
  });
}

function mistake(
  partial: Pick<Correction, "id" | "ordinal" | "quote" | "suggestion"> &
    Partial<Correction>,
): Correction {
  return Correction.parse({
    sessionId: 1,
    kind: "mistake",
    span: { start: 0, end: 10 },
    anchor: "exact",
    explanation: "Accord.",
    question: null,
    ruleIfDialect: "Si c'est louisianais, on garderait enfant.",
    category: "accord",
    dlf: null,
    resourceIds: [],
    status: "open",
    dialectNoteId: null,
    isFocus: false,
    ...partial,
  });
}

describe("CorrectionCard dialect_check", () => {
  it("shows the dialect question and both answers", () => {
    render(
      <CorrectionCard
        correction={dialect({
          id: "d1",
          ordinal: 6,
          quote: "a tombé",
          suggestion: "est tombé",
          contextQuote: "mon petit cousin a tombé",
        })}
        onAcknowledge={() => undefined}
      />,
    );
    const card = screen.getByRole("article");
    expect(card).toHaveAttribute("id", "correction-6");
    expect(within(card).getByText(reviewCopy.kindDialect)).toBeVisible();
    expect(within(card).getByText("mon petit cousin a tombé")).toBeVisible();
    expect(
      within(card).getByText("Ça se dit comme ça chez toi, « a tombé » ?"),
    ).toBeVisible();
    expect(
      within(card).getByRole("button", { name: reviewCopy.actionConfirm }),
    ).toBeVisible();
    expect(
      within(card).getByRole("button", { name: reviewCopy.actionReject }),
    ).toBeVisible();
  });

  it("confirmed_mistake re-renders as a Faute with no actions", () => {
    render(
      <CorrectionCard
        correction={dialect({
          id: "d1",
          ordinal: 6,
          quote: "a tombé",
          suggestion: "est tombé",
          status: "confirmed_mistake",
        })}
        onAcknowledge={() => undefined}
      />,
    );
    const card = screen.getByRole("article");
    expect(within(card).getByText(reviewCopy.kindMistake)).toBeVisible();
    expect(within(card).getByText("a tombé")).toBeVisible();
    expect(within(card).getByText("est tombé")).toBeVisible();
    expect(
      within(card).queryByRole("button", { name: reviewCopy.actionReject }),
    ).not.toBeInTheDocument();
    expect(
      within(card).queryByRole("button", { name: reviewCopy.actionAck }),
    ).not.toBeInTheDocument();
  });

  it("confirmed_dialect is replaced by the saved-note line", () => {
    render(
      <CorrectionCard
        correction={dialect({
          id: "d1",
          ordinal: 6,
          quote: "a tombé",
          suggestion: "est tombé",
          status: "confirmed_dialect",
        })}
        onAcknowledge={() => undefined}
      />,
    );
    expect(screen.getByText(reviewCopy.savedNote)).toBeVisible();
    expect(
      screen.getByRole("link", { name: reviewCopy.savedNoteLink }),
    ).toHaveAttribute("href", "/carnet");
  });
});

describe("CorrectionCard mistake pushback", () => {
  it("tags a Focus Mistake with focus du jour", () => {
    render(
      <CorrectionCard
        correction={mistake({
          id: "m1",
          ordinal: 2,
          quote: "Les enfant",
          suggestion: "Les enfants",
          isFocus: true,
        })}
        onAcknowledge={() => undefined}
      />,
    );
    expect(screen.getByText(reviewCopy.tagFocus)).toBeVisible();
  });

  it("open mistake cards offer C'est du français louisianais", () => {
    render(
      <CorrectionCard
        correction={mistake({
          id: "m1",
          ordinal: 3,
          quote: "Les enfant",
          suggestion: "Les enfants",
        })}
        onAcknowledge={() => undefined}
      />,
    );
    expect(
      screen.getByRole("button", { name: reviewCopy.actionPushback }),
    ).toBeVisible();
  });

  it("shows catalog Resource links on a Mistake and none on standard", () => {
    const resources = [
      {
        id: "grammaire-accord",
        type: "grammaire" as const,
        label: "l'accord",
        url: "https://example.com/grammar",
      },
      {
        id: "input-innerfrench",
        type: "input" as const,
        label: "InnerFrench",
        url: "https://example.com/input",
      },
    ];
    const { rerender } = render(
      <CorrectionCard
        correction={mistake({
          id: "m1",
          ordinal: 3,
          quote: "Les enfant",
          suggestion: "Les enfants",
          resources,
        })}
        onAcknowledge={() => undefined}
      />,
    );
    const card = screen.getByRole("article");
    expect(
      within(card).getByRole("link", { name: /Grammaire · l'accord/ }),
    ).toHaveAttribute("target", "_blank");
    expect(
      within(card).getByRole("link", { name: /Input · InnerFrench/ }),
    ).toBeVisible();

    rerender(
      <CorrectionCard
        correction={standard({
          id: "s1",
          ordinal: 1,
          quote: "ma voiture",
          suggestion: "mon char",
          resources,
        })}
        onAcknowledge={() => undefined}
      />,
    );
    expect(
      screen.queryByRole("link", { name: /Grammaire ·/ }),
    ).not.toBeInTheDocument();
  });
});
