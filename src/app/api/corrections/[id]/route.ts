import { NextResponse } from "next/server";
import { CorrectionPatchBody, CorrectionPatchResponse } from "@/contracts/api";
import { parseRequestBody } from "@/lib/http";
import { applyCorrectionPatch } from "@/modules/correction-service/correction-service";
import {
  getCorrection,
  setCorrectionStatus,
} from "@/modules/history-store/history-store";
import { withErrors } from "@/server/with-errors";

function correctionError(code: "NOT_FOUND" | "CONFLICT") {
  const status = code === "NOT_FOUND" ? 404 : 409;
  const message =
    code === "NOT_FOUND"
      ? "Correction introuvable."
      : "Cette correction ne peut pas changer d'état.";
  return NextResponse.json({ error: { code, message } }, { status });
}

export const PATCH = withErrors(async function patchCorrection(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const parsed = await parseRequestBody(request, CorrectionPatchBody);
  if (!parsed.ok) return parsed.response;

  const current = await getCorrection(id);
  if (current === null) return correctionError("NOT_FOUND");

  const next = applyCorrectionPatch(current, parsed.value.action);
  if (!next.ok) return correctionError("CONFLICT");

  const saved = await setCorrectionStatus(id, next.status, () => new Date());
  if (saved === null) return correctionError("NOT_FOUND");
  return NextResponse.json(
    CorrectionPatchResponse.parse({ correction: saved }),
  );
});
