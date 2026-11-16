import { NextResponse } from "next/server";
import { listNotesForMarkdown } from "@/modules/dialect/dialect-notes-store";
import { renderDialectMarkdown } from "@/modules/dialect/export-markdown";
import { LOUISIANA_RULES } from "@/modules/dialect/louisiana-rules";
import { quotaTimeZone } from "@/modules/quota-manager/quota-store";
import { withErrors } from "@/server/with-errors";

export const GET = withErrors(async function getDialectNotesExport() {
  const notes = await listNotesForMarkdown();
  const markdown = renderDialectMarkdown(
    LOUISIANA_RULES,
    notes,
    quotaTimeZone(),
  );
  return new NextResponse(markdown, {
    status: 200,
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
});
