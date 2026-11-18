import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/historique",
}));
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect, useRef } from "react";
import { HeaderShell, useHeaderShell } from "./header-shell";

function fetchUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") {
    return input;
  }
  if (input instanceof URL) {
    return input.href;
  }
  return input.url;
}

function jsonResponse(body: unknown, delayMs = 0): Promise<Response> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(
        new Response(JSON.stringify(body), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    }, delayMs);
  });
}

const QUOTA_FULL = {
  used: 0,
  remaining: 3,
  max: 3,
  resetsAt: "2026-11-16T06:00:00.000Z",
} as const;

function quotaOk(delayMs = 0): Promise<Response> {
  return jsonResponse(QUOTA_FULL, delayMs);
}

function levelOk(level: string, delayMs = 0): Promise<Response> {
  return jsonResponse({ level, history: [], streak: 0 }, delayMs);
}

function QuotaRefresherOnMount() {
  const { refreshQuota } = useHeaderShell();
  useEffect(() => {
    void refreshQuota();
  }, [refreshQuota]);
  return null;
}

function OptimisticLevelOnMount() {
  const { refreshShell } = useHeaderShell();
  useEffect(() => {
    void refreshShell("B2");
  }, [refreshShell]);
  return null;
}

function RefreshAfterLevelReady() {
  const { level, refreshShell } = useHeaderShell();
  const started = useRef(false);
  useEffect(() => {
    if (level === null || started.current) {
      return;
    }
    started.current = true;
    void refreshShell();
  }, [level, refreshShell]);
  return null;
}

describe("HeaderShell quota fetch", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.unstubAllGlobals();
  });

  it("ignores a stale quota response when refreshQuota runs again", async () => {
    let quotaCalls = 0;
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = fetchUrl(input);
      if (url.includes("/api/level")) {
        return jsonResponse({ level: "B1", history: [], streak: 0 });
      }
      if (url.includes("/api/quota")) {
        quotaCalls += 1;
        if (quotaCalls === 1) {
          return jsonResponse(
            {
              used: 0,
              remaining: 3,
              max: 3,
              resetsAt: "2026-11-16T06:00:00.000Z",
            },
            100,
          );
        }
        return jsonResponse({
          used: 1,
          remaining: 2,
          max: 3,
          resetsAt: "2026-11-16T06:00:00.000Z",
        });
      }
      return Promise.reject(new Error(`unexpected fetch ${url}`));
    });

    render(
      <HeaderShell>
        <QuotaRefresherOnMount />
      </HeaderShell>,
    );

    await waitFor(() => {
      expect(
        screen.getAllByText("Reste 2 consignes sur 3").length,
      ).toBeGreaterThan(0);
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 150));
    });

    expect(screen.queryAllByText("Reste 3 consignes sur 3")).toHaveLength(0);
    expect(
      screen.getAllByText("Reste 2 consignes sur 3").length,
    ).toBeGreaterThan(0);
  });

  it("does not show first-run quota copy while level or quota is still loading", async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    let resolveLevel: (() => void) | undefined;
    const levelGate = new Promise<void>((r) => {
      resolveLevel = r;
    });

    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = fetchUrl(input);
      if (url.includes("/api/level")) {
        return levelGate.then(() =>
          jsonResponse({ level: null, history: [], streak: 0 }),
        );
      }
      if (url.includes("/api/quota")) {
        return jsonResponse({
          used: 0,
          remaining: 3,
          max: 3,
          resetsAt: "2026-11-16T06:00:00.000Z",
        });
      }
      return Promise.reject(new Error(`unexpected fetch ${url}`));
    });

    render(
      <HeaderShell>
        <main />
      </HeaderShell>,
    );

    expect(
      screen.queryByText("3 consignes aujourd'hui"),
    ).not.toBeInTheDocument();

    resolveLevel?.();
    await waitFor(() => {
      expect(screen.getAllByText("3 consignes aujourd'hui").length).toBe(2);
    });
  });
});

describe("HeaderShell level fetch", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.unstubAllGlobals();
  });

  it("ignores a stale level GET when refreshShell applies an optimistic level", async () => {
    let levelGets = 0;
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = fetchUrl(input);
      if (url.includes("/api/level")) {
        levelGets += 1;
        if (levelGets === 1) {
          return levelOk("B1", 100);
        }
        return levelOk("B2");
      }
      if (url.includes("/api/quota")) {
        return quotaOk();
      }
      return Promise.reject(new Error(`unexpected fetch ${url}`));
    });

    render(
      <HeaderShell>
        <OptimisticLevelOnMount />
      </HeaderShell>,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Niveau CECR B2, changer" }),
      ).toBeInTheDocument();
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 150));
    });

    expect(
      screen.queryByRole("button", { name: "Niveau CECR B1, changer" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Niveau CECR B2, changer" }),
    ).toBeInTheDocument();
  });

  it("ignores a stale level GET after a successful chip PUT", async () => {
    let levelGets = 0;
    let releaseStaleGet: (() => void) | undefined;
    const staleGet = new Promise<void>((resolve) => {
      releaseStaleGet = resolve;
    });
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock.mockImplementation(
      (input: RequestInfo | URL, init?: RequestInit) => {
        const url = fetchUrl(input);
        if (url.includes("/api/level")) {
          if (init?.method === "PUT") {
            return jsonResponse({
              change: {
                id: 1,
                fromLevel: "B1",
                toLevel: "B2",
                source: "manual",
                createdAt: "2026-11-14T18:00:00.000Z",
              },
            });
          }
          levelGets += 1;
          if (levelGets === 1) {
            return levelOk("B1");
          }
          return staleGet.then(() => levelOk("B1"));
        }
        if (url.includes("/api/quota")) {
          return quotaOk();
        }
        return Promise.reject(new Error(`unexpected fetch ${url}`));
      },
    );

    const user = userEvent.setup();
    render(
      <HeaderShell>
        <RefreshAfterLevelReady />
      </HeaderShell>,
    );

    await user.click(
      await screen.findByRole("button", { name: "Niveau CECR B1, changer" }),
    );
    await user.click(
      await screen.findByRole("menuitemradio", { name: "B2 · Avancé" }),
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Niveau CECR B2, changer" }),
      ).toBeInTheDocument();
    });
    await act(async () => {
      releaseStaleGet?.();
      await new Promise((r) => setTimeout(r, 150));
    });

    expect(
      screen.queryByRole("button", { name: "Niveau CECR B1, changer" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Niveau CECR B2, changer" }),
    ).toBeInTheDocument();
  });
});
