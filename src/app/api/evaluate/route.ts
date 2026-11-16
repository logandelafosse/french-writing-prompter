import { parseRequestBody } from "@/lib/http";
import { withErrors } from "@/server/with-errors";
import { runEvaluate } from "@/server/evaluate-session";
import { EvaluatePostBody } from "@/contracts/api";

export const POST = withErrors(async function postEvaluate(request: Request) {
  const parsed = await parseRequestBody(request, EvaluatePostBody);
  if (!parsed.ok) return parsed.response;
  return runEvaluate(parsed.value.sessionId, parsed.value.writing, request);
});
