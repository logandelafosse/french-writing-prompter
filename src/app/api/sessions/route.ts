import { NextResponse } from "next/server";
import { z } from "zod";
import { listSessionSummaries } from "@/modules/history-store/history-store";
import { withErrors } from "@/server/with-errors";

const SessionsQuery = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().min(1).optional(),
});

export const GET = withErrors(async function getSessions(request: Request) {
  const url = new URL(request.url);
  const parsed = SessionsQuery.safeParse({
    limit: url.searchParams.get("limit") ?? undefined,
    cursor: url.searchParams.get("cursor") ?? undefined,
  });
  const query = parsed.success ? parsed.data : { limit: 20 };
  const result = await listSessionSummaries({
    limit: query.limit,
    ...(query.cursor ? { cursor: query.cursor } : {}),
  });
  return NextResponse.json(result);
});
