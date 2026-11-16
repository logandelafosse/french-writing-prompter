import { NextResponse } from "next/server";
import { z } from "zod";
import {
  DialectNotePatchBody,
  DialectNotePatchResponse,
} from "@/contracts/api";
import { parseRequestBody } from "@/lib/http";
import {
  deleteDialectNote,
  updateDialectNote,
} from "@/modules/dialect/dialect-notes-store";
import { withErrors } from "@/server/with-errors";

function noteError(code: "NOT_FOUND" | "VALIDATION") {
  return NextResponse.json(
    {
      error: {
        code,
        message:
          code === "NOT_FOUND"
            ? "Note introuvable."
            : "La règle doit faire au moins 3 caractères.",
      },
    },
    { status: code === "NOT_FOUND" ? 404 : 422 },
  );
}

async function noteId(params: Promise<{ id: string }>) {
  // prettier-ignore
  const parsed = z.coerce.number().int().positive().safeParse((await params).id);
  return parsed.success ? parsed.data : null;
}

export const PATCH = withErrors(async function patchDialectNote(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const id = await noteId(context.params);
  if (id === null) return noteError("NOT_FOUND");
  const parsed = await parseRequestBody(request, DialectNotePatchBody);
  if (!parsed.ok) return parsed.response;
  const result = await updateDialectNote(id, parsed.value, () => new Date());
  if (!result.ok) return noteError(result.code);
  // prettier-ignore
  return NextResponse.json(DialectNotePatchResponse.parse({ note: result.note }));
});

export const DELETE = withErrors(async function deleteDialectNoteRoute(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const id = await noteId(context.params);
  if (id === null) return noteError("NOT_FOUND");
  const result = await deleteDialectNote(id, () => new Date());
  if (!result.ok) return noteError(result.code);
  return new NextResponse(null, { status: 204 });
});
