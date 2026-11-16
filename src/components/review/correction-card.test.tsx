import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { Correction } from "@/contracts/correction";
import { reviewCopy } from "@/copy/review";
import { CorrectionCard } from "./correction-card";

function standard(
  partial: Pick<Correction, "id" | "ordinal" | "quote" | "suggestion"> &
    Partial<Pick<Correction, "explanation" | "status" | "dlf">>,
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
