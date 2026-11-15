import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HistoryPage } from "./history-page";
import type { SessionView } from "@/contracts/session";
import evaluationFixtureJson from "@/test/fixtures/ai/evaluation.valid.json";
import type { Evaluation } from "@/contracts/evaluation";

const evaluationFixture = evaluationFixtureJson as Evaluation;

const MALFORMED_NOTICE =
  "Les corrections de cette séance ont pas pu être relues. Ta consigne et ton texte sont gardés, et le reste de l'Historique marche comme d'habitude.";

const mockSessions: SessionView[] = [
  {
    id: 1,
    createdAt: "2026-01-10T12:00:00.000Z",
    promptText: "Valid session prompt",
    writingText: "Mon texte valide.",
    promptLevel: "B1",
    evaluation: { ok: true, value: evaluationFixture },
  },
  {
    id: 2,
    createdAt: "2026-01-09T12:00:00.000Z",
    promptText: "Residue legacy row",
    writingText: "Garde mon texte.",
    promptLevel: null,
    evaluation: { ok: false, reason: "unreadable" },
  },
  {
    id: 3,
    createdAt: "2026-01-08T12:00:00.000Z",
    promptText: "Broken JSON row",
    writingText: "Encore du texte.",
    promptLevel: "A2",
    evaluation: { ok: false, reason: "unreadable" },
  },
];

describe("HistoryPage", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith("/api/sessions")) {
          return Promise.resolve(
            new Response(JSON.stringify({ sessions: mockSessions }), {
              status: 200,
            }),
          );
        }
        if (url.endsWith("/api/level")) {
          return Promise.resolve(
            new Response(JSON.stringify({ level: null, history: [] }), {
              status: 200,
            }),
          );
        }
        return Promise.reject(new Error(`unexpected fetch ${url}`));
      }),
    );
  });

  it("renders all sessions and shows the malformed notice on unreadable rows", async () => {
    render(<HistoryPage />);

    expect(await screen.findByText(/Sessions \(3\)/)).toBeInTheDocument();

    const user = userEvent.setup();

    for (const session of mockSessions) {
      const rowButton = screen.getByRole("button", {
        name: new RegExp(session.promptText.slice(0, 20)),
      });
      await user.click(rowButton);

      const expanded = rowButton.parentElement;
      expect(expanded).not.toBeNull();
      if (expanded === null) throw new Error("row container missing");

      if (session.writingText) {
        expect(
          within(expanded).getByText(session.writingText),
        ).toBeInTheDocument();
      }

      if (session.evaluation?.ok === false) {
        expect(
          within(expanded).getByText(MALFORMED_NOTICE),
        ).toBeInTheDocument();
      }

      if (session.evaluation?.ok === true) {
        expect(
          within(expanded).getAllByText("Evaluation").length,
        ).toBeGreaterThan(0);
      }
    }
  });
});
