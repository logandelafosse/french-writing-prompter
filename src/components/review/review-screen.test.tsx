import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
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

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function stubAckFetch(handler: (url: string) => Response) {
  vi.stubGlobal(
    "fetch",
    vi.fn((input: RequestInfo | URL) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      return Promise.resolve(handler(url));
    }),
  );
}

describe("ReviewScreen", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.unstubAllGlobals();
  });

  it("Compris moves focus to the next open mistake card", async () => {
    const user = userEvent.setup();
    stubAckFetch((url) => {
      const id = url.split("/").at(-1) ?? "c1";
      return jsonResponse({
        correction: mistake({
          id,
          ordinal: id === "c2" ? 2 : 1,
          quote: id === "c2" ? "joue" : "Les enfant",
          suggestion: id === "c2" ? "jouent" : "Les enfants",
        }),
      });
    });
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
    await waitFor(() => {
      expect(
        within(first).queryByRole("button", { name: reviewCopy.actionAck }),
      ).not.toBeInTheDocument();
    });
    expect(next).toHaveFocus();
  });

  it("Compris on the last open mistake keeps focus on the collapsed card", async () => {
    const user = userEvent.setup();
    stubAckFetch(() =>
      jsonResponse({
        correction: mistake({
          id: "c1",
          ordinal: 1,
          quote: "Les enfant",
          suggestion: "Les enfants",
        }),
      }),
    );
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
    await waitFor(() => {
      expect(card).toHaveFocus();
    });
    expect(document.body).not.toHaveFocus();
  });

  it("keeps the card open and alerts when Compris PATCH fails, then clears the error on retry", async () => {
    const user = userEvent.setup();
    let attempts = 0;
    const item = mistake({
      id: "c1",
      ordinal: 1,
      quote: "Les enfant",
      suggestion: "Les enfants",
    });
    stubAckFetch(() => {
      attempts += 1;
      if (attempts === 1) {
        return jsonResponse(
          { error: { code: "CONFLICT", message: "fail" } },
          409,
        );
      }
      return jsonResponse({
        correction: { ...item, status: "acknowledged" },
      });
    });

    render(
      <ReviewScreen
        promptText="Écris."
        promptMeta={null}
        writingText="Les enfant joue."
        corrections={[item]}
        quotaRemaining={2}
        generating={false}
        onNextPrompt={() => undefined}
      />,
    );

    const card = screen.getByRole("article");
    await user.click(
      within(card).getByRole("button", { name: reviewCopy.actionAck }),
    );

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(homeCopy.loadError);
    });
    expect(
      within(card).getByRole("button", { name: reviewCopy.actionAck }),
    ).toBeVisible();

    await user.click(
      within(card).getByRole("button", { name: reviewCopy.actionAck }),
    );
    await waitFor(() => {
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
    expect(
      within(card).queryByRole("button", { name: reviewCopy.actionAck }),
    ).not.toBeInTheDocument();
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
