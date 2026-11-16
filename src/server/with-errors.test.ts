import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ErrorEnvelope } from "@/contracts/errors";
import { AiOutputError } from "@/modules/openai-client/ai-output-error";
import { readResponseJson } from "@/test/read-response-json";
import { withErrors } from "./with-errors";

const OkBody = z.strictObject({ ok: z.literal(true) });

describe("withErrors maps AI and unknown errors to JSON envelopes", () => {
  it("maps AiOutputError to 502 AI_INVALID_OUTPUT", async () => {
    const handler = withErrors(() => {
      throw new AiOutputError(
        "schema_mismatch",
        "AI response did not match the expected schema",
        { path: "overall_cefr" },
      );
    });
    const response = await handler();
    expect(response.status).toBe(502);
    expect(response.headers.get("content-type")).toMatch(/json/);
    const body = await readResponseJson(response, ErrorEnvelope);
    expect(body.error.code).toBe("AI_INVALID_OUTPUT");
    expect(body.error.message.length).toBeGreaterThan(0);
  });

  it("maps AI service errors to 502 AI_UNAVAILABLE", async () => {
    const handler = withErrors(() => {
      throw new Error("AI service error");
    });
    const response = await handler();
    expect(response.status).toBe(502);
    const body = await readResponseJson(response, ErrorEnvelope);
    expect(body.error.code).toBe("AI_UNAVAILABLE");
  });

  it("maps timeouts to 504 AI_TIMEOUT", async () => {
    const timeout = new Error("Request timed out");
    timeout.name = "TimeoutError";
    const handler = withErrors(() => {
      throw timeout;
    });
    const response = await handler();
    expect(response.status).toBe(504);
    const body = await readResponseJson(response, ErrorEnvelope);
    expect(body.error.code).toBe("AI_TIMEOUT");
  });

  it("maps unknown errors to 500 INTERNAL JSON, never HTML", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const handler = withErrors(() => {
      throw new Error("boom");
    });
    const response = await handler();
    expect(response.status).toBe(500);
    expect(response.headers.get("content-type")).toMatch(/json/);
    const text = await response.clone().text();
    expect(text.startsWith("<")).toBe(false);
    const body = await readResponseJson(response, ErrorEnvelope);
    expect(body.error.code).toBe("INTERNAL");
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });

  it("forwards a successful Response", async () => {
    const handler = withErrors((req: Request) => {
      expect(req.method).toBe("GET");
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    const response = await handler(new Request("http://localhost/api/test"));
    expect(response.status).toBe(200);
    expect(await readResponseJson(response, OkBody)).toEqual({ ok: true });
  });
});
