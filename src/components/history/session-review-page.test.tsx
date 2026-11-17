import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SessionDetail } from "@/contracts/session";
import { SessionReviewPage } from "./session-review-page";

const session = SessionDetail.parse({
  id: 7,
  createdAt: "2026-11-15T04:00:00.000Z",
  kind: "daily",
  displayStatus: "evaluated",
  title: "récit · 14 novembre",
  focus: [],
  wordCount: 4,
  mistakeCount: 1,
  countsByKind: { mistake: 1, standard: 0, dialectNote: 0 },
  promptLevel: "B1",
  evaluatedLevel: "B1",
  dataIssues: [],
  promptText: "Raconte la boucherie.",
  excerpt: "Les enfant jouent…",
  correctionsSummary: [],
  promptMeta: null,
  writingText: "Les enfant jouent.",
  writingSavedAt: null,
  evaluation: null,
  corrections: [],
});

describe("SessionReviewPage", () => {
  it("formats createdAt with the passed timezone, matching history titles", () => {
    render(<SessionReviewPage session={session} timeZone="UTC" />);
    expect(
      screen.getByText("Dimanche 15 novembre · 1 faute · B1"),
    ).toBeVisible();
    expect(
      screen.queryByText("Samedi 14 novembre · 1 faute · B1"),
    ).not.toBeInTheDocument();
  });
});
