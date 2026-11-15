import { describe, it, expect, vi, afterEach } from "vitest";
import { z } from "zod";
import { fetchJson } from "./fetch-json";

const TestSchema = z.strictObject({ value: z.string() });

describe("fetchJson", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns network when fetch rejects", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new Error("offline"))),
    );

    const result = await fetchJson("/api/test", TestSchema);
    expect(result).toEqual({ ok: false, error: { kind: "network" } });
  });

  it("returns http with status and server message on 4xx/5xx", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify({ error: "Session not found." }), {
            status: 404,
          }),
        ),
      ),
    );

    const result = await fetchJson("/api/test", TestSchema);
    expect(result).toEqual({
      ok: false,
      error: {
        kind: "http",
        status: 404,
        message: "Session not found.",
      },
    });
  });

  it("returns invalid when the body fails the schema", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify({ value: 42 }), { status: 200 }),
        ),
      ),
    );

    const result = await fetchJson("/api/test", TestSchema);
    expect(result).toEqual({ ok: false, error: { kind: "invalid" } });
  });

  it("returns the parsed value on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify({ value: "ok" }), { status: 200 }),
        ),
      ),
    );

    const result = await fetchJson("/api/test", TestSchema);
    expect(result).toEqual({ ok: true, value: { value: "ok" } });
  });
});
