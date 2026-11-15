import { NextResponse } from "next/server";
import { getSessionViews } from "@/modules/history-store/history-store";

export async function GET() {
  const sessions = await getSessionViews();
  return NextResponse.json({ sessions });
}
