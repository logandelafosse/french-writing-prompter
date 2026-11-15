import { NextResponse } from "next/server";
import { z, type ZodType } from "zod";

export type ParseRequestBodyResult<T> =
  { ok: true; value: T } | { ok: false; response: Response };

export async function parseRequestBody<S extends ZodType>(
  request: Request,
  schema: S,
): Promise<ParseRequestBodyResult<z.infer<S>>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Request body was not valid JSON." },
        { status: 400 },
      ),
    };
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: z.prettifyError(parsed.error) },
        { status: 400 },
      ),
    };
  }

  return { ok: true, value: parsed.data };
}
