import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { CefrLevel } from "@/contracts/cefr";
import { LevelPutBody } from "@/contracts/api";
import { parseJson } from "@/lib/json";

let shellLevel: CefrLevel | null = "B1";
const refreshShell = vi.fn().mockResolvedValue(undefined);

vi.mock("@/components/shell/header-shell", () => ({
  useHeaderShell: () => ({
    level: shellLevel,
    refreshShell,
  }),
}));

import { LevelCard } from "./level-card";

function levelChange(level: CefrLevel) {
  return {
    fromLevel: "B1" as CefrLevel,
    toLevel: level,
    source: "manual" as const,
    createdAt: "2026-01-01T00:00:00.000Z",
  };
}

function isLevelPut(
  input: RequestInfo | URL,
  init?: RequestInit,
): init is RequestInit & { method: "PUT"; body: string } {
  if (typeof input !== "string" || !input.includes("/api/level")) {
    return false;
  }
  return init?.method === "PUT" && typeof init.body === "string";
}

describe("LevelCard header level sync", () => {
  let persistedLevel: CefrLevel | null = "B1";

  beforeEach(() => {
    shellLevel = "B1";
    persistedLevel = "B1";
    refreshShell.mockClear();
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
        if (isLevelPut(input, init)) {
          const body = parseJson(LevelPutBody, init.body);
          if (!body.ok) {
            return Promise.resolve(new Response(null, { status: 400 }));
          }
          const next = body.value.level;
          persistedLevel = next;
          return Promise.resolve(
            new Response(
              JSON.stringify({
                change: levelChange(next),
              }),
              { status: 200 },
            ),
          );
        }
        return Promise.resolve(
          new Response(
            JSON.stringify({
              level: persistedLevel,
              history: [],
            }),
            { status: 200 },
          ),
        );
      }),
    );
  });

  it("shows the header shell level after the chip changes", async () => {
    const { rerender } = render(<LevelCard />);

    await waitFor(() => {
      expect(screen.getAllByText("B1").length).toBeGreaterThan(0);
    });

    shellLevel = "C1";
    rerender(<LevelCard />);

    await waitFor(() => {
      expect(screen.getAllByText("C1").length).toBeGreaterThan(0);
    });
  });

  it("keeps the new level visible while shell refresh is still stale", async () => {
    const user = userEvent.setup();
    refreshShell.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          setTimeout(resolve, 50);
        }),
    );

    render(
      <main>
        <LevelCard />
      </main>,
    );

    const main = within(screen.getByRole("main"));

    await waitFor(() => {
      expect(main.getAllByText("B1").length).toBeGreaterThan(0);
    });

    await user.click(main.getByRole("button", { name: /B1/ }));
    await user.click(screen.getByRole("button", { name: /^C1/ }));

    await waitFor(() => {
      expect(main.getAllByText("C1").length).toBeGreaterThan(0);
    });
  });
});
