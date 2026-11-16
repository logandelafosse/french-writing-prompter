import { NextResponse } from "next/server";
import { buildTodayResponse } from "@/server/today/today";

export async function GET() {
  const payload = await buildTodayResponse();
  return NextResponse.json(payload);
}
