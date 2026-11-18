import { describe, expect, it } from "vitest";
import { assertIssueMatchesTicket, parseGithubIssueNumber } from "./parse";

describe("parseGithubIssueNumber", () => {
  it("reads an explicit GitHub issue line", () => {
    const text = `# T13f — Title\n\nGitHub issue: #58\n\n| Phase | Type |\n`;
    expect(parseGithubIssueNumber(text)).toBe(58);
  });

  it("rejects ticket files without an issue line", () => {
    expect(() => parseGithubIssueNumber("# T38 — Title\n")).toThrow(
      /GitHub issue/,
    );
  });
});

describe("assertIssueMatchesTicket", () => {
  it("refuses pull requests", () => {
    expect(() =>
      assertIssueMatchesTicket(
        { number: 40, title: "T03", isPullRequest: true },
        "T38",
      ),
    ).toThrow(/pull request/);
  });

  it("refuses title mismatch (ticket+2 pointing at the wrong issue)", () => {
    expect(() =>
      assertIssueMatchesTicket(
        {
          number: 40,
          title: "T03 — Prettier format-only pass",
          isPullRequest: false,
        },
        "T38",
      ),
    ).toThrow(/does not contain T38/);
  });

  it("accepts a matching issue title", () => {
    expect(() =>
      assertIssueMatchesTicket(
        {
          number: 58,
          title: "T13f: Level card vs stale GET /api/level",
          isPullRequest: false,
        },
        "T13f",
      ),
    ).not.toThrow();
  });

  it("allows sub-ticket id when title names the parent", () => {
    expect(() =>
      assertIssueMatchesTicket(
        {
          number: 23,
          title:
            "T21 — Evaluator v2: Corrections, quote location, French output",
          isPullRequest: false,
        },
        "T21a",
      ),
    ).not.toThrow();
  });
});
