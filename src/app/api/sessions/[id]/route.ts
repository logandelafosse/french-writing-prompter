import { NextResponse } from "next/server";
import { SessionDetailGetResponse } from "@/contracts/api";
import { getSessionDetail } from "@/modules/history-store/history-store";
import { withErrors } from "@/server/with-errors";

const SESSION_ID = /^[1-9]\d*$/;

function sessionError(code: "NOT_FOUND" | "VALIDATION") {
  const status = code === "NOT_FOUND" ? 404 : 422;
  const message =
    code === "NOT_FOUND"
      ? "Séance introuvable."
      : "Identifiant de séance invalide.";
  return NextResponse.json({ error: { code, message } }, { status });
}

export const GET = withErrors(async function getSessionById(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: raw } = await context.params;
  if (!SESSION_ID.test(raw)) return sessionError("VALIDATION");
  const detail = await getSessionDetail(Number(raw));
  if (detail === null) return sessionError("NOT_FOUND");
  return NextResponse.json(SessionDetailGetResponse.parse(detail));
});
