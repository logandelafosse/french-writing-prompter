import { NextResponse } from "next/server";
import { getAllSessions } from "@/modules/history-store/history-store";

export async function GET() {
  const sessions = await getAllSessions();
  return NextResponse.json({ sessions });
}
