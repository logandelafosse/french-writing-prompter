import { describe, expect, it } from "vitest";
import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import type { SessionSummary } from "@/contracts/session";
import { historyCopy } from "@/copy/history";
import { HistoryRow, HistoryRowBoundary } from "./history-row";

const evaluated: SessionSummary = {
  id: 7,
  createdAt: "2026-11-14T18:00:00.000Z",
  kind: "daily",
  displayStatus: "evaluated",
  title: "récit · 14 novembre",
  focus: [],
  wordCount: 4,
  mistakeCount: 2,
  countsByKind: { mistake: 2, standard: 1, dialectNote: 1 },
  promptLevel: "B1",
  evaluatedLevel: "B1",
  dataIssues: [],
  promptText: "Raconte la boucherie.",
  excerpt: "Samedi passé, on a été chez ma grand-mère…",
  correctionsSummary: [
    { kind: "mistake", quote: "a fait", suggestion: "faisait" },
    { kind: "standard", quote: "ma voiture", suggestion: "mon char" },
    { kind: "dialect_note", quote: "a tombé" },
  ],
};

function Boom(): ReactNode {
  throw new Error("boom");
}

describe("HistoryRow", () => {
  it("one throwing row does not blank the list", () => {
    render(
      <div>
        <HistoryRowBoundary>
          <Boom />
        </HistoryRowBoundary>
        <HistoryRow item={evaluated} />
      </div>,
    );
    expect(screen.getByText(historyCopy.malformedNotice)).toBeInTheDocument();
    expect(screen.getByText("récit · 14 novembre")).toBeInTheDocument();
  });
});
