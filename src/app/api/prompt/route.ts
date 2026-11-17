import { NextResponse } from "next/server";
import { PromptPostBody } from "@/contracts/api";
import { parseRequestBody } from "@/lib/http";
import { issueDailyPrompt } from "@/modules/prompt-issuance/issuance-store";
import { getAiClient, scenarioFromRequest } from "@/server/ai-client";
import { withErrors } from "@/server/with-errors";

export const POST = withErrors(async function postPrompt(request: Request) {
  const text = await request.text();
  const parsed = await parseRequestBody(
    new Request(request.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: text.trim().length === 0 ? "{}" : text,
    }),
    PromptPostBody,
  );
  if (!parsed.ok) return parsed.response;

  const result = await issueDailyPrompt(
    { body: parsed.value },
    {
      client: getAiClient(scenarioFromRequest(request)),
      now: () => new Date(),
    },
  );
  if (result.ok) {
    return NextResponse.json({ session: result.session, quota: result.quota });
  }
  if (result.code === "QUOTA_EXHAUSTED") {
    return NextResponse.json(
      { error: result.code, resetsAt: result.resetsAt },
      { status: 429 },
    );
  }
  if (result.code === "DRAFT_WOULD_BE_ABANDONED") {
    return NextResponse.json(
      { error: result.code, wordCount: result.wordCount },
      { status: 409 },
    );
  }
  return NextResponse.json(
    { error: "No CEFR level set. Please set your level first." },
    { status: 400 },
  );
});
