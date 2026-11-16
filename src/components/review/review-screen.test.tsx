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

function standard(
  partial: Pick<Correction, "id" | "ordinal" | "quote" | "suggestion">,
): Correction {
  return Correction.parse({
    sessionId: 1,
    kind: "standard",
    span: { start: 0, end: 10 },
    anchor: "exact",
    explanation: "Forme louisianaise.",
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

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function stubAckFetch(
  handler: (url: string, init?: RequestInit) => Response | Promise<Response>,
) {
  vi.stubGlobal(
    "fetch",
    vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      return Promise.resolve(handler(url, init));
    }),
  );
}

describe("ReviewScreen", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.unstubAllGlobals();
  });

  it("Compris on a standard card moves focus to the next open card", async () => {
    const user = userEvent.setup();
    stubAckFetch(() =>
      jsonResponse({
        correction: standard({
          id: "s1",
          ordinal: 1,
          quote: "ma voiture",
          suggestion: "mon char",
        }),
      }),
    );
    render(
      <ReviewScreen
        promptText="Écris."
        promptMeta={null}
        writingText="J'arrive avec ma voiture. Maintenant je pars."
        corrections={[
          standard({
            id: "s1",
            ordinal: 1,
            quote: "ma voiture",
            suggestion: "mon char",
          }),
          standard({
            id: "s2",
            ordinal: 2,
            quote: "Maintenant",
            suggestion: "Asteur",
          }),
        ]}
        quotaRemaining={2}
        generating={false}
        onNextPrompt={() => undefined}
      />,
    );

    const cards = screen.getAllByRole("article");
    const first = cards[0];
    const next = cards[1];
    if (first === undefined || next === undefined) {
      throw new Error("expected two standard cards");
    }

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

  it("links the first Focus Weakness to the Carnet and hides the CTA when Focus is empty", () => {
    const focus = [
      {
        id: "infinitif_participe" as const,
        name: "Infinitif ou participe (\u2011er / \u2011é)",
        inlineName: "infinitif ou participe (\u2011er / \u2011é)",
        historyName: "Infinitif ou participe",
        shortName: "\u2011er / \u2011é",
      },
    ];
    const { rerender } = render(
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
        focus={focus}
        quotaRemaining={2}
        generating={false}
        onNextPrompt={() => undefined}
      />,
    );
    expect(
      screen.getByRole("link", {
        name: reviewCopy.carnetCta("\u2011er / \u2011é"),
      }),
    ).toHaveAttribute("href", "/carnet#weakness-infinitif_participe");

    rerender(
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
    expect(
      screen.queryByRole("link", { name: /dans le Carnet/ }),
    ).not.toBeInTheDocument();
  });

  function dialect(
    partial: Pick<Correction, "id" | "ordinal" | "quote" | "suggestion"> &
      Partial<Correction>,
  ): Correction {
    return Correction.parse({
      sessionId: 1,
      kind: "dialect_check",
      span: { start: 18, end: 25 },
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

  it("Non, corrige-le turns the dialect card into a Faute and updates the summary", async () => {
    const user = userEvent.setup();
    const open = dialect({
      id: "d1",
      ordinal: 1,
      quote: "a tombé",
      suggestion: "est tombé",
    });
    stubAckFetch(() =>
      jsonResponse({
        correction: { ...open, status: "confirmed_mistake" },
      }),
    );
    render(
      <ReviewScreen
        promptText="Écris."
        promptMeta={null}
        writingText="Mon petit cousin a tombé dans la boue."
        corrections={[open]}
        quotaRemaining={2}
        generating={false}
        onNextPrompt={() => undefined}
      />,
    );

    expect(screen.getByText("1 à vérifier")).toBeVisible();
    await user.click(
      screen.getByRole("button", { name: reviewCopy.actionReject }),
    );
    await waitFor(() => {
      expect(screen.getByText(reviewCopy.kindMistake)).toBeVisible();
    });
    expect(screen.getByText("1 faute")).toBeVisible();
    expect(
      screen.queryByRole("button", { name: reviewCopy.actionReject }),
    ).not.toBeInTheDocument();
  });

  it("saving a dialect note replaces the card and clears the mark", async () => {
    const user = userEvent.setup();
    const open = dialect({
      id: "d1",
      ordinal: 1,
      quote: "a tombé",
      suggestion: "est tombé",
    });
    stubAckFetch(() =>
      jsonResponse(
        {
          note: {
            id: 1,
            rule: "On dit a tombé.",
            example: "Mon petit cousin a tombé dans la boue.",
            scope: "word",
            form: "a tombé",
            learnerForm: "a tombé",
            tutorSuggestion: "est tombé",
            sourceSessionId: 1,
            sourceCorrectionId: "d1",
            createdAt: "2026-11-16T12:00:00.000Z",
            updatedAt: "2026-11-16T12:00:00.000Z",
          },
          correction: { ...open, status: "confirmed_dialect" },
        },
        201,
      ),
    );
    render(
      <ReviewScreen
        promptText="Écris."
        promptMeta={null}
        writingText="Mon petit cousin a tombé dans la boue."
        corrections={[open]}
        quotaRemaining={2}
        generating={false}
        onNextPrompt={() => undefined}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: reviewCopy.actionConfirm }),
    );
    const dialog = await screen.findByRole("dialog", {
      name: reviewCopy.sheetTitle,
    });
    expect(within(dialog).getByText("a tombé")).toBeVisible();
    expect(within(dialog).getByText("est tombé")).toBeVisible();
    await user.click(
      within(dialog).getByRole("button", { name: reviewCopy.sheetSave }),
    );
    await waitFor(() => {
      expect(screen.getByText(reviewCopy.savedNote)).toBeVisible();
    });
    expect(screen.getByText(reviewCopy.none)).toBeVisible();
    expect(
      screen.queryByRole("link", { name: "à vérifier 1" }),
    ).not.toBeInTheDocument();
  });

  it("shows a 422 rule error inside the sheet and clears it on the next save", async () => {
    const user = userEvent.setup();
    const open = dialect({
      id: "d1",
      ordinal: 1,
      quote: "a tombé",
      suggestion: "est tombé",
    });
    let attempts = 0;
    stubAckFetch(() => {
      attempts += 1;
      if (attempts === 1) {
        return jsonResponse(
          {
            error: {
              code: "VALIDATION",
              message: "La règle doit faire au moins 3 caractères.",
            },
          },
          422,
        );
      }
      return jsonResponse(
        {
          note: {
            id: 1,
            rule: "On dit a tombé.",
            example: "Mon petit cousin a tombé dans la boue.",
            scope: "word",
            form: "a tombé",
            learnerForm: "a tombé",
            tutorSuggestion: "est tombé",
            sourceSessionId: 1,
            sourceCorrectionId: "d1",
            createdAt: "2026-11-16T12:00:00.000Z",
            updatedAt: "2026-11-16T12:00:00.000Z",
          },
          correction: { ...open, status: "confirmed_dialect" },
        },
        201,
      );
    });
    render(
      <ReviewScreen
        promptText="Écris."
        promptMeta={null}
        writingText="Mon petit cousin a tombé dans la boue."
        corrections={[open]}
        quotaRemaining={2}
        generating={false}
        onNextPrompt={() => undefined}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: reviewCopy.actionConfirm }),
    );
    const dialog = await screen.findByRole("dialog", {
      name: reviewCopy.sheetTitle,
    });
    await user.click(
      within(dialog).getByRole("button", { name: reviewCopy.sheetSave }),
    );
    const alert = await within(dialog).findByRole("alert");
    expect(alert).toHaveTextContent(
      "La règle doit faire au moins 3 caractères.",
    );
    expect(screen.getAllByRole("alert")).toEqual([alert]);

    await user.click(
      within(dialog).getByRole("button", { name: reviewCopy.sheetSave }),
    );
    await waitFor(() => {
      expect(screen.getByText(reviewCopy.savedNote)).toBeVisible();
    });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it.each(["Annuler", "Escape"] as const)(
    "%s during save ignores a late POST",
    async (closeHow) => {
      const user = userEvent.setup();
      const open = dialect({
        id: "d1",
        ordinal: 1,
        quote: "a tombé",
        suggestion: "est tombé",
      });
      const writingText = "Mon petit cousin a tombé dans la boue.";
      let finish: (value: Response) => void = () => undefined;
      stubAckFetch(
        () =>
          new Promise<Response>((resolve) => {
            finish = resolve;
          }),
      );
      render(
        <ReviewScreen
          promptText="Écris."
          promptMeta={null}
          writingText={writingText}
          corrections={[open]}
          quotaRemaining={2}
          generating={false}
          onNextPrompt={() => undefined}
        />,
      );
      await user.click(
        screen.getByRole("button", { name: reviewCopy.actionConfirm }),
      );
      const dialog = await screen.findByRole("dialog", {
        name: reviewCopy.sheetTitle,
      });
      await user.click(
        within(dialog).getByRole("button", { name: reviewCopy.sheetSave }),
      );
      if (closeHow === "Annuler") {
        await user.click(
          within(dialog).getByRole("button", { name: reviewCopy.sheetCancel }),
        );
      } else {
        await user.keyboard("{Escape}");
      }
      finish(
        jsonResponse(
          {
            note: {
              id: 1,
              rule: "On dit a tombé.",
              example: writingText,
              scope: "word",
              form: "a tombé",
              learnerForm: "a tombé",
              tutorSuggestion: "est tombé",
              sourceSessionId: 1,
              sourceCorrectionId: "d1",
              createdAt: "2026-11-16T12:00:00.000Z",
              updatedAt: "2026-11-16T12:00:00.000Z",
            },
            correction: { ...open, status: "confirmed_dialect" },
          },
          201,
        ),
      );
      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });
      expect(screen.queryByText(reviewCopy.savedNote)).not.toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: reviewCopy.actionConfirm }),
      ).toBeVisible();
    },
  );
});
