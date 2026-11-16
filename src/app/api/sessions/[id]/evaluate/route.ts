import { z } from "zod";
import { parseRequestBody } from "@/lib/http";
import { withErrors } from "@/server/with-errors";
import { POST as postEvaluate } from "@/app/api/evaluate/route";
import { SessionEvaluatePostBody } from "@/contracts/api";

const SessionId = z.coerce.number().int().positive();

export const POST = withErrors(async function postSessionEvaluate(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const id = SessionId.safeParse((await context.params).id);
  if (!id.success) {
    return Response.json(
      { error: "Session not found.", code: "NOT_FOUND" },
      { status: 404 },
    );
  }
  const parsed = await parseRequestBody(request, SessionEvaluatePostBody);
  if (!parsed.ok) return parsed.response;
  return postEvaluate(
    new Request("http://localhost/api/evaluate", {
      method: "POST",
      headers: request.headers,
      body: JSON.stringify({
        writing: parsed.value.text,
        sessionId: id.data,
      }),
    }),
  );
});
