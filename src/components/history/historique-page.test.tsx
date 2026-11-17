import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { homeCopy } from "@/copy/fr";
import { historyCopy } from "@/copy/history";
import { HistoriquePage } from "./historique-page";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("HistoriquePage", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.unstubAllGlobals();
  });

  it("clears a load error on retry", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock
      .mockResolvedValueOnce(
        new Response("fail", { status: 500, statusText: "Server Error" }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ sessions: [], nextCursor: null, levelLine: null }),
      );
    render(<HistoriquePage />);
    expect(await screen.findByText(homeCopy.loadError)).toBeVisible();
    await user.click(screen.getByRole("button", { name: homeCopy.errorRetry }));
    await waitFor(() => {
      expect(screen.queryByText(homeCopy.loadError)).not.toBeInTheDocument();
    });
    expect(screen.getByText(historyCopy.empty)).toBeVisible();
  });
});
