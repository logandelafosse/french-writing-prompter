import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import type { CefrLevel } from "@/contracts/cefr";

let shellLevel: CefrLevel | null = "B1";

vi.mock("@/components/shell/header-shell", () => ({
  useHeaderShell: () => ({
    level: shellLevel,
    refreshShell: vi.fn().mockResolvedValue(undefined),
  }),
}));

import { LevelCard } from "./level-card";

describe("LevelCard header level sync", () => {
  beforeEach(() => {
    shellLevel = "B1";
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              level: "B1",
              history: [],
            }),
            { status: 200 },
          ),
        ),
      ),
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
});
