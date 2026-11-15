"use client";

import { useState, useEffect } from "react";
import { LevelBadge } from "@/components/level/level-components";
import type { CefrLevel } from "@/components/level/level-components";
import { EvaluationCard } from "@/components/prompt/evaluation-card";
import type { Evaluation } from "@/modules/writing-evaluator/writing-evaluator";
import type { Session } from "@/modules/history-store/history-store";
import Link from "next/link";

interface LevelChange {
  fromLevel: string | null;
  toLevel: string;
  source: string;
  createdAt: string;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function SessionRow({ session }: { session: Session }) {
  const [expanded, setExpanded] = useState(false);

  const constraints = session.promptConstraints
    ? JSON.parse(session.promptConstraints)
    : null;
  const evaluation: Evaluation | null = session.evaluationJson
    ? JSON.parse(session.evaluationJson)
    : null;

  return (
    <div className="border border-zinc-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-zinc-50 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xs text-zinc-400 shrink-0">
            {formatDate(session.createdAt)}
          </span>
          <span className="text-sm text-zinc-700 truncate">
            {session.promptText.slice(0, 60)}
            {session.promptText.length > 60 ? "..." : ""}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {session.cefrLevel && (
            <LevelBadge level={session.cefrLevel as CefrLevel} />
          )}
          <svg
            className={`w-4 h-4 text-zinc-400 transition-transform ${
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
        <div className="border-t border-zinc-200 p-4 space-y-4 bg-zinc-50/50">
          <div>
            <h4 className="text-xs font-medium text-zinc-500 uppercase mb-2">
              Prompt
            </h4>
            <p className="text-sm text-zinc-800 whitespace-pre-wrap">
              {session.promptText}
            </p>
            {constraints && (
              <div className="flex items-center gap-2 mt-2">
                <LevelBadge
                  level={constraints.cefrLevel as CefrLevel}
                />
                <span className="text-xs text-zinc-400">
                  {constraints.dialect === "louisiana"
                    ? "Louisiana French"
                    : constraints.dialect}
                </span>
              </div>
            )}
          </div>

          {session.writingText && (
            <div>
              <h4 className="text-xs font-medium text-zinc-500 uppercase mb-2">
                Your text
              </h4>
              <p className="text-sm text-zinc-800 whitespace-pre-wrap bg-white rounded-lg p-3 border border-zinc-200">
                {session.writingText}
              </p>
            </div>
          )}

          {evaluation && (
            <div>
              <h4 className="text-xs font-medium text-zinc-500 uppercase mb-2">
                Evaluation
              </h4>
              <EvaluationCard evaluation={evaluation} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function HistoryPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [levelData, setLevelData] = useState<{
    level: CefrLevel | null;
    history: LevelChange[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [sessionsRes, levelRes] = await Promise.all([
        fetch("/api/sessions"),
        fetch("/api/level"),
      ]);
      if (cancelled) return;
      const sessionsData = await sessionsRes.json();
      const levelJson = await levelRes.json();

      setSessions(sessionsData.sessions);
      setLevelData(levelJson);
      setLoading(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col flex-1 bg-zinc-50">
        <main className="w-full max-w-2xl mx-auto flex flex-col gap-6 p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-6 w-32 bg-zinc-100 rounded" />
            <div className="h-40 bg-zinc-100 rounded-xl" />
            <div className="h-40 bg-zinc-100 rounded-xl" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 bg-zinc-50">
      <main className="w-full max-w-2xl mx-auto flex flex-col gap-6 p-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            History
          </h1>
          <Link
            href="/"
            className="text-sm text-zinc-500 hover:text-zinc-700 transition-colors"
          >
            Back
          </Link>
        </div>

        {levelData && levelData.history.length > 0 && (
          <div className="rounded-xl border bg-white p-6">
            <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wide mb-3">
              Level progression
            </h2>
            <div className="space-y-2">
              {[...levelData.history].reverse().map((change, i: number) => (
                <div
                  key={i}
                  className="flex items-center gap-3 text-sm"
                >
                  <span className="text-xs text-zinc-400 w-32 shrink-0">
                    {formatDate(change.createdAt)}
                  </span>
                  {change.fromLevel ? (
                    <>
                      <LevelBadge level={change.fromLevel as CefrLevel} />
                      <span className="text-zinc-400">→</span>
                    </>
                  ) : (
                    <span className="text-xs text-zinc-400">Start</span>
                  )}
                  <LevelBadge level={change.toLevel as CefrLevel} />
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded ${
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
          <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wide">
            Sessions ({sessions.length})
          </h2>

          {sessions.length === 0 ? (
            <p className="text-sm text-zinc-400 text-center py-8">
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
