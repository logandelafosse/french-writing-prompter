import { NextResponse } from "next/server";
import { buildTodayResponse } from "@/server/today/today";
import { withErrors } from "@/server/with-errors";

export const GET = withErrors(async function getToday() {
  const payload = await buildTodayResponse();
  return NextResponse.json(payload);
});
