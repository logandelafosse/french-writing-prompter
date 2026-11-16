import type { ReactElement } from "react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { homeCopy } from "@/copy/fr";
import type { CefrLevel } from "@/contracts/cefr";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

import { HeaderShell } from "@/components/shell/header-shell";
import { HomePage } from "./home-page";

function renderHome(ui: ReactElement) {
  return render(<HeaderShell>{ui}</HeaderShell>);
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const todayFirstRun = {
  level: null,
  levelName: null,
  quota: {
    used: 0,
    remaining: 3,
    max: 3,
    resetsAt: "2026-11-16T06:00:00.000Z",
  },
  focus: [],
  activeSession: null,
  advancement: null,
};

describe("FirstRunIntro level selection", () => {
  it("enables generate after a level is chosen", async () => {
    const user = userEvent.setup();
    const { useState } = await import("react");
    const { HomePhaseA } = await import("./home-phase-a");
    function Harness() {
      const [selected, setSelected] = useState<CefrLevel | null>(null);
      return (
        <HomePhaseA
          variant="first-run"
          selectedLevel={selected}
          onLevelChange={setSelected}
          onGenerate={vi.fn()}
          generating={false}
          quotaRemaining={3}
        />
      );
    }
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: /B1Seuil/i }));
    expect(
      screen.getByRole("button", { name: homeCopy.generate }),
    ).toBeEnabled();
  });
});

describe("HomePage first-run generate", () => {
  const originalFetch = globalThis.fetch;
  const fixedNow = () => new Date("2026-11-14T12:00:00-06:00");

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.unstubAllGlobals();
  });

  it("sets the level then creates a prompt", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(globalThis.fetch);
    let putSeen = false;
    let promptCreated = false;

    fetchMock.mockImplementation((input, init) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      if (url.includes("/api/today")) {
        if (!promptCreated) {
          return Promise.resolve(jsonResponse(todayFirstRun));
        }
        return Promise.resolve(
          jsonResponse({
            level: "B1",
            levelName: "Seuil",
            quota: {
              used: 1,
              remaining: 2,
              max: 3,
              resetsAt: "2026-11-16T06:00:00.000Z",
            },
            focus: [],
            activeSession: {
              id: 9,
              prompt: "Lafayette",
              promptMeta: null,
              draft: null,
            },
            advancement: null,
          }),
        );
      }
      if (url.includes("/api/level") && init?.method === "PUT") {
        putSeen = true;
        return Promise.resolve(
          jsonResponse({
            change: {
              fromLevel: null,
              toLevel: "B1",
              source: "manual",
              createdAt: "2026-11-14T18:00:00.000Z",
            },
          }),
        );
      }
      if (url.includes("/api/prompt") && init?.method === "POST") {
        if (!putSeen) {
          return Promise.reject(
            new Error("expected PUT before POST /api/prompt"),
          );
        }
        promptCreated = true;
        return Promise.resolve(
          jsonResponse({
            session: {
              id: 9,
              promptText: "Lafayette",
              promptMeta: {
                genre: "récit",
                tense: "passé composé",
                tone: "",
                registre: "familier",
                wordTarget: { min: 250, max: 300 },
                topic: "famille",
                topicTags: [],
              },
            },
            quota: {
              used: 1,
              remaining: 2,
              max: 3,
              resetsAt: "2026-11-16T06:00:00.000Z",
            },
          }),
        );
      }
      return Promise.reject(new Error(`unexpected ${url}`));
    });

    renderHome(<HomePage now={fixedNow} />);

    await waitFor(() => {
      expect(screen.getByText(/Bienvenue\. Icitte/)).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /B1Seuil/i }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /B1Seuil/i })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
    });
    const generate = screen.getByRole("button", { name: homeCopy.generate });
    expect(generate).toBeEnabled();
    await user.click(generate);

    await waitFor(() => {
      expect(screen.getByText("Lafayette")).toBeInTheDocument();
    });
  });

  it("clears generate error when learner retries", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(globalThis.fetch);
    let promptAttempts = 0;

    fetchMock.mockImplementation((input, init) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      if (url.includes("/api/today")) {
        return Promise.resolve(jsonResponse(todayFirstRun));
      }
      if (url.includes("/api/level") && init?.method === "PUT") {
        return Promise.resolve(
          jsonResponse({
            change: {
              fromLevel: null,
              toLevel: "B1",
              source: "manual",
              createdAt: "2026-11-14T18:00:00.000Z",
            },
          }),
        );
      }
      if (url.includes("/api/prompt") && init?.method === "POST") {
        promptAttempts += 1;
        if (promptAttempts === 1) {
          return Promise.resolve(
            jsonResponse(
              {
                error: {
                  code: "AI_UNAVAILABLE",
                  message: "fail",
                },
              },
              502,
            ),
          );
        }
        return Promise.resolve(
          jsonResponse({
            session: {
              id: 9,
              promptText: "Lafayette",
              promptMeta: {
                genre: "récit",
                tense: "passé composé",
                tone: "",
                registre: "familier",
                wordTarget: { min: 250, max: 300 },
                topic: "famille",
                topicTags: [],
              },
            },
            quota: {
              used: 1,
              remaining: 2,
              max: 3,
              resetsAt: "2026-11-16T06:00:00.000Z",
            },
          }),
        );
      }
      if (url.includes("/api/quota")) {
        return Promise.resolve(
          jsonResponse({
            used: 1,
            remaining: 2,
            max: 3,
            resetsAt: "2026-11-16T06:00:00.000Z",
          }),
        );
      }
      return Promise.reject(new Error(`unexpected ${url}`));
    });

    renderHome(<HomePage now={fixedNow} />);

    await waitFor(() => {
      expect(screen.getByText(/Bienvenue\. Icitte/)).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /B1Seuil/i }));
    await user.click(screen.getByRole("button", { name: homeCopy.generate }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
    expect(screen.getByText(/Bienvenue\. Icitte/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: homeCopy.retry }));

    await waitFor(() => {
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
    expect(screen.getByText(/Bienvenue\. Icitte/)).toBeInTheDocument();
  });
});
