import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HistoryPage } from "./history-page";
import type { SessionView } from "@/contracts/session";
import evaluationFixtureJson from "@/test/fixtures/ai/evaluation.valid.json";
import { Evaluation } from "@/contracts/evaluation";
import { parseJson } from "@/lib/json";

const evaluationParsed = parseJson(
  Evaluation,
  JSON.stringify(evaluationFixtureJson),
);
if (!evaluationParsed.ok) {
  throw new Error("fixture invalid");
}
const evaluationFixture = evaluationParsed.value;

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

function fetchUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

describe("HistoryPage", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL) => {
        const url = fetchUrl(input);
        if (url.endsWith("/api/sessions")) {
          return Promise.resolve(
            new Response(JSON.stringify({ sessions: mockSessions }), {
              status: 200,
            }),
          );
        }
        if (url.endsWith("/api/level")) {
          return Promise.resolve(
            new Response(
              JSON.stringify({ level: null, history: [], streak: 0 }),
              {
                status: 200,
              },
            ),
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
    const valid = mockSessions[0]!;
    const unreadable = mockSessions[1]!;

    await user.click(
      screen.getByRole("button", {
        name: new RegExp(valid.promptText.slice(0, 20)),
      }),
    );
    expect(screen.getByText(valid.writingText!)).toBeInTheDocument();
    expect(
      screen.getAllByRole("heading", { name: "Evaluation" }).length,
    ).toBeGreaterThan(0);

    await user.click(
      screen.getByRole("button", {
        name: new RegExp(unreadable.promptText.slice(0, 20)),
      }),
    );
    expect(screen.getByText(unreadable.writingText!)).toBeInTheDocument();
    expect(screen.getByText(MALFORMED_NOTICE)).toBeInTheDocument();
  });
});
