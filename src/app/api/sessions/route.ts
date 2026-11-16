import { NextResponse } from "next/server";
import { getSessionViews } from "@/modules/history-store/history-store";
import { withErrors } from "@/server/with-errors";

export const GET = withErrors(async function getSessions() {
  const sessions = await getSessionViews();
  return NextResponse.json({ sessions });
});
