import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Correction } from "@/contracts/correction";
import { homeCopy } from "@/copy/fr";
import { reviewCopy } from "@/copy/review";
import { ReviewScreen } from "./review-screen";

function mistake(
  partial: Pick<Correction, "id" | "ordinal" | "quote" | "suggestion">,
): Correction {
  return Correction.parse({
    sessionId: 1,
    kind: "mistake",
    span: null,
    anchor: "none",
    explanation: "Accord.",
    question: null,
    ruleIfDialect: null,
    category: "accord",
    dlf: null,
    resourceIds: [],
    status: "open",
    dialectNoteId: null,
    isFocus: false,
    ...partial,
  });
}

describe("ReviewScreen", () => {
  it("Compris moves focus to the next open mistake card", async () => {
    const user = userEvent.setup();
    render(
      <ReviewScreen
        promptText="Écris."
        promptMeta={null}
        writingText="Les enfant joue."
        corrections={[
          mistake({
            id: "c1",
            ordinal: 1,
            quote: "Les enfant",
            suggestion: "Les enfants",
          }),
          mistake({
            id: "c2",
            ordinal: 2,
            quote: "joue",
            suggestion: "jouent",
          }),
        ]}
        quotaRemaining={2}
        generating={false}
        onNextPrompt={() => undefined}
      />,
    );

    const cards = screen.getAllByRole("article");
    expect(cards).toHaveLength(2);
    const first = cards[0];
    const next = cards[1];
    if (first === undefined || next === undefined) {
      throw new Error("expected two mistake cards");
    }
    expect(within(first).getByText("Les enfant")).toBeInTheDocument();
    expect(within(next).getByText("joue")).toBeInTheDocument();

    await user.click(
      within(first).getByRole("button", { name: reviewCopy.actionAck }),
    );
    expect(
      within(first).queryByRole("button", { name: reviewCopy.actionAck }),
    ).not.toBeInTheDocument();
    expect(next).toHaveFocus();
  });

  it("Compris on the last open mistake keeps focus on the collapsed card", async () => {
    const user = userEvent.setup();
    render(
      <ReviewScreen
        promptText="Écris."
        promptMeta={null}
        writingText="Les enfant joue."
        corrections={[
          mistake({
            id: "c1",
            ordinal: 1,
            quote: "Les enfant",
            suggestion: "Les enfants",
          }),
        ]}
        quotaRemaining={2}
        generating={false}
        onNextPrompt={() => undefined}
      />,
    );

    const card = screen.getByRole("article");
    await user.click(
      within(card).getByRole("button", { name: reviewCopy.actionAck }),
    );
    expect(card).toHaveFocus();
    expect(document.body).not.toHaveFocus();
  });

  it("disables the next-prompt CTA at quota 0", () => {
    render(
      <ReviewScreen
        promptText="Écris."
        promptMeta={null}
        writingText="Les enfant joue."
        corrections={[
          mistake({
            id: "c1",
            ordinal: 1,
            quote: "Les enfant",
            suggestion: "Les enfants",
          }),
        ]}
        quotaRemaining={0}
        generating={false}
        onNextPrompt={() => undefined}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Une autre consigne · à minuit" }),
    ).toBeDisabled();
    expect(
      screen.queryByRole("button", {
        name: homeCopy.reviewNextPrompt(0),
      }),
    ).not.toBeInTheDocument();
  });
});
