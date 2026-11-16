"use client";

import { useState, useEffect, useCallback } from "react";
import { LevelBadge } from "@/components/legacy/level/level-components";
import type { CefrLevel } from "@/components/legacy/level/level-components";
import type { LevelChangeDto } from "@/contracts/api";
import { EvaluationCard } from "@/components/legacy/prompt/evaluation-card";
import type { ClassifiedFetchFailure } from "@/contracts/errors";
import type { SessionView } from "@/contracts/session";
import { LevelGetResponse, SessionsGetResponse } from "@/contracts/api";
import { ErrorAlert } from "@/components/states/error-alert";
import { OfflineNotice, useOffline } from "@/components/states/offline-notice";
import { homeCopy } from "@/copy/fr";
import { classifyFetchError, fetchJson } from "@/lib/http";
import { formatFrenchDateTime } from "@/lib/dates";

const MALFORMED_NOTICE =
  "Les corrections de cette séance ont pas pu être relues. Ta consigne et ton texte sont gardés, et le reste de l'Historique marche comme d'habitude.";

function formatDate(iso: string): string {
  return formatFrenchDateTime(new Date(iso));
}

function sessionBadgeLevel(session: SessionView): CefrLevel | null {
  if (session.evaluation?.ok === true) {
    return session.evaluation.value.overall_cefr;
  }
  return session.promptLevel;
}

function SessionRow({ session }: { session: SessionView }) {
  const [expanded, setExpanded] = useState(false);
  const badgeLevel = sessionBadgeLevel(session);

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-zinc-50"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="shrink-0 text-xs text-zinc-400">
            {formatDate(session.createdAt)}
          </span>
          <span className="truncate text-sm text-zinc-700">
            {session.promptText.slice(0, 60)}
            {session.promptText.length > 60 ? "..." : ""}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {badgeLevel && <LevelBadge level={badgeLevel} />}
          <svg
            className={`h-4 w-4 text-zinc-400 transition-transform ${
              expanded ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="space-y-4 border-t border-zinc-200 bg-zinc-50/50 p-4">
          <div>
            <h4 className="mb-2 text-xs font-medium text-zinc-500 uppercase">
              Prompt
            </h4>
            <p className="text-sm whitespace-pre-wrap text-zinc-800">
              {session.promptText}
            </p>
            {session.promptLevel && (
              <div className="mt-2 flex items-center gap-2">
                <LevelBadge level={session.promptLevel} />
                <span className="text-xs text-zinc-400">Louisiana French</span>
              </div>
            )}
          </div>

          {session.writingText && (
            <div>
              <h4 className="mb-2 text-xs font-medium text-zinc-500 uppercase">
                Your text
              </h4>
              <p className="rounded-lg border border-zinc-200 bg-white p-3 text-sm whitespace-pre-wrap text-zinc-800">
                {session.writingText}
              </p>
            </div>
          )}

          {session.evaluation?.ok === true && (
            <div>
              <h4 className="mb-2 text-xs font-medium text-zinc-500 uppercase">
                Evaluation
              </h4>
              <EvaluationCard evaluation={session.evaluation.value} />
            </div>
          )}

          {session.evaluation?.ok === false && (
            <p className="text-sm text-amber-800" role="status">
              {MALFORMED_NOTICE}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function HistoryPage() {
  const [sessions, setSessions] = useState<SessionView[]>([]);
  const [levelData, setLevelData] = useState<{
    level: CefrLevel | null;
    history: LevelChangeDto[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState<ClassifiedFetchFailure | null>(null);
  const offline = useOffline();

  const load = useCallback(async () => {
    setLoading(true);
    setFailure(null);
    const [sessionsResult, levelResult] = await Promise.all([
      fetchJson("/api/sessions", SessionsGetResponse, { loadingTimeout: true }),
      fetchJson("/api/level", LevelGetResponse, { loadingTimeout: true }),
    ]);
    if (!sessionsResult.ok) {
      setFailure(classifyFetchError(sessionsResult.error));
      setLoading(false);
      return;
    }
    if (!levelResult.ok) {
      setFailure(classifyFetchError(levelResult.error));
      setLoading(false);
      return;
    }
    setSessions(sessionsResult.value.sessions);
    setLevelData(levelResult.value);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial history load
    void load();
  }, [load]);

  const showOffline = offline || failure === "offline";
  if (loading || failure !== null || showOffline) {
    return (
      <div className="flex flex-1 flex-col">
        <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-8">
          {showOffline ? <OfflineNotice onRetry={() => void load()} /> : null}
          {!showOffline && failure !== null ? (
            <ErrorAlert lead={homeCopy.loadError} onRetry={() => void load()} />
          ) : null}
          {loading && !showOffline && failure === null ? (
            <p className="text-muted text-sm" aria-live="polite">
              Chargement…
            </p>
          ) : null}
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          History
        </h1>

        {levelData && levelData.history.length > 0 && (
          <div className="rounded-xl border bg-white p-6">
            <h2 className="mb-3 text-sm font-medium tracking-wide text-zinc-500 uppercase">
              Level progression
            </h2>
            <div className="space-y-2">
              {[...levelData.history].reverse().map((change, i: number) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <span className="w-32 shrink-0 text-xs text-zinc-400">
                    {formatDate(change.createdAt)}
                  </span>
                  {change.fromLevel ? (
                    <>
                      <LevelBadge level={change.fromLevel} />
                      <span className="text-zinc-400">→</span>
                    </>
                  ) : (
                    <span className="text-xs text-zinc-400">Start</span>
                  )}
                  <LevelBadge level={change.toLevel} />
                  <span
                    className={`rounded px-1.5 py-0.5 text-xs ${
                      change.source === "auto"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-zinc-100 text-zinc-600"
                    }`}
                  >
                    {change.source === "auto" ? "auto" : "manual"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3">
          <h2 className="text-sm font-medium tracking-wide text-zinc-500 uppercase">
            Sessions ({sessions.length})
          </h2>

          {sessions.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-400">
              No sessions yet. Generate a prompt to get started.
            </p>
          ) : (
            sessions.map((session) => (
              <SessionRow key={session.id} session={session} />
            ))
          )}
        </div>
      </main>
    </div>
  );
}
