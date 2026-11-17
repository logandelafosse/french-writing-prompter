import { notFound } from "next/navigation";
import { SessionReviewPage } from "@/components/history/session-review-page";
import { loadEvaluatedSession } from "./load";

export const dynamic = "force-dynamic";

const SESSION_ID = /^[1-9]\d*$/;

export default async function HistoriqueDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: raw } = await params;
  if (!SESSION_ID.test(raw)) notFound();
  const session = await loadEvaluatedSession(Number(raw));
  if (session === null) notFound();
  return <SessionReviewPage session={session} />;
}
