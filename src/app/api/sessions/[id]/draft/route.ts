import { NextResponse } from "next/server";
import { z } from "zod";
import { DRAFT_TEXT_MAX } from "@/config/limits";
import { parseRequestBody } from "@/lib/http";
import { saveActiveDraft } from "@/modules/history-store/history-store";

const DraftPutBody = z.strictObject({ text: z.string() });
const SessionId = z.coerce.number().int().positive();

const DRAFT_ERRORS = {
  NOT_FOUND: [404, "Séance introuvable."],
  NOT_ACTIVE: [409, "Cette séance n'est plus active."],
  VALIDATION: [422, "Le texte dépasse 20 000 caractères."],
} as const;

function draftError(code: keyof typeof DRAFT_ERRORS) {
  const [status, error] = DRAFT_ERRORS[code];
  return NextResponse.json({ error, code }, { status });
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: rawId } = await context.params;
  const id = SessionId.safeParse(rawId);
  if (!id.success) return draftError("NOT_FOUND");

  const parsed = await parseRequestBody(request, DraftPutBody);
  if (!parsed.ok) return parsed.response;
  if (parsed.value.text.length > DRAFT_TEXT_MAX)
    return draftError("VALIDATION");

  const text = parsed.value.text.replace(/\r\n/g, "\n");
  const saved = await saveActiveDraft(id.data, text, () => new Date());
  if (!saved.ok) return draftError(saved.code);
  return NextResponse.json({
    savedAt: saved.savedAt,
    wordCount: saved.wordCount,
  });
}
