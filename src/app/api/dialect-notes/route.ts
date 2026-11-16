import { NextResponse } from "next/server";
import {
  DialectNoteCreateBody,
  DialectNoteCreateResponse,
  DialectNoteListResponse,
} from "@/contracts/api";
import { parseRequestBody } from "@/lib/http";
import {
  createDialectNote,
  listDialectNotes,
} from "@/modules/dialect/dialect-notes-store";
import { withErrors } from "@/server/with-errors";

export const GET = withErrors(async function getDialectNotes() {
  const notes = await listDialectNotes();
  return NextResponse.json(DialectNoteListResponse.parse({ notes }));
});

function noteError(code: "NOT_FOUND" | "CONFLICT" | "VALIDATION") {
  const status = code === "NOT_FOUND" ? 404 : code === "CONFLICT" ? 409 : 422;
  const message =
    code === "NOT_FOUND"
      ? "Correction introuvable."
      : code === "CONFLICT"
        ? "Cette correction ne peut pas devenir une note de dialecte."
        : "La règle doit faire au moins 3 caractères.";
  return NextResponse.json({ error: { code, message } }, { status });
}

export const POST = withErrors(async function postDialectNote(
  request: Request,
) {
  const parsed = await parseRequestBody(request, DialectNoteCreateBody);
  if (!parsed.ok) return parsed.response;

  const result = await createDialectNote(parsed.value, () => new Date());
  if (!result.ok) return noteError(result.code);
  return NextResponse.json(
    DialectNoteCreateResponse.parse({
      note: result.note,
      ...(result.correction ? { correction: result.correction } : {}),
    }),
    { status: 201 },
  );
});
