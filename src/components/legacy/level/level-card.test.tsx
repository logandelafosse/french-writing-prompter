import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { LevelCard } from "./level-card";

describe("LevelCard", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify({ level: "Z9", history: [] }), {
            status: 200,
          }),
        ),
      ),
    );
  });

  it("renders an error message when the level response fails schema validation", async () => {
    render(<LevelCard />);

    expect(await screen.findByText(/error occurred/i)).toBeInTheDocument();
  });
});
