"use client";

import { useState, useEffect } from "react";
import type { WritingPrompt } from "@/modules/prompt-generator/prompt-generator";
import { LevelBadge } from "@/components/level/level-components";
import type { CefrLevel } from "@/components/level/level-components";
import { EvaluationCard } from "./evaluation-card";
import type { Evaluation } from "@/modules/writing-evaluator/writing-evaluator";

export function PromptCard() {
  const [prompt, setPrompt] = useState<WritingPrompt | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [writing, setWriting] = useState("");
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [advancement, setAdvancement] = useState<{
    toLevel: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quota, setQuota] = useState<{
    used: number;
    remaining: number;
    max: number;
  } | null>(null);

  async function refreshQuota() {
    const res = await fetch("/api/quota");
    const data = await res.json();
    setQuota(data);
  }

  useEffect(() => {
    let cancelled = false;
    async function loadQuota() {
      const res = await fetch("/api/quota");
      const data = await res.json();
      if (!cancelled) {
        setQuota(data);
      }
    }
    loadQuota();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setEvaluation(null);
    setWriting("");

    try {
      const res = await fetch("/api/prompt", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
      } else {
        setPrompt(data.prompt);
        setSessionId(data.sessionId);
        refreshQuota();
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!sessionId || !writing.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ writing: writing.trim(), sessionId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
      } else {
        setEvaluation(data.evaluation);
        if (data.advancement) {
          setAdvancement(data.advancement);
        }
      }
    } catch {
      setError("An error occurred during evaluation.");
    } finally {
      setLoading(false);
    }
  };

  const canGenerate = quota ? quota.remaining > 0 : true;

  return (
    <div className="rounded-xl border bg-white p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wide">
          Writing Prompt
        </h2>
        {quota && (
          <span className="text-xs text-zinc-400">
            {quota.remaining} of {quota.max} prompts remaining today
          </span>
        )}
      </div>

      {!evaluation && (
        <button
          onClick={handleGenerate}
          disabled={loading || !canGenerate}
          className="w-full py-3 px-4 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="animate-spin h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Generating...
            </span>
          ) : prompt ? (
            "Generate another prompt"
          ) : (
            "Generate a prompt"
          )}
        </button>
      )}

      {!canGenerate && !prompt && (
        <p className="text-sm text-amber-600 bg-amber-50 rounded-lg p-3">
          You've used your 3 prompts for today. Come back tomorrow!
        </p>
      )}

      {error && (
        <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3 space-y-2">
          <p>{error}</p>
          <div className="flex gap-2">
            <button
              onClick={handleGenerate}
              className="text-xs font-medium underline hover:no-underline"
            >
              Regenerate prompt
            </button>
            {sessionId && !evaluation && (
              <button
                onClick={handleSubmit}
                className="text-xs font-medium underline hover:no-underline"
              >
                Retry evaluation
              </button>
            )}
          </div>
        </div>
      )}

      {prompt && !evaluation && (
        <>
          <div className="border border-zinc-200 rounded-lg p-4 space-y-3 bg-zinc-50">
            <div className="flex items-center gap-2">
              <LevelBadge
                level={prompt.constraints.cefrLevel as CefrLevel}
              />
              <span className="text-xs text-zinc-400">Louisiana French</span>
            </div>
            <p className="text-zinc-800 leading-relaxed whitespace-pre-wrap">
              {prompt.text}
            </p>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-medium text-zinc-700">
              Your text
            </label>
            <textarea
              value={writing}
              onChange={(e) => setWriting(e.target.value)}
              placeholder="Write your response here in French..."
              rows={8}
              className="w-full rounded-lg border border-zinc-300 p-3 text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent resize-y"
            />
            <button
              onClick={handleSubmit}
              disabled={loading || !writing.trim()}
              className="w-full py-3 px-4 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Evaluating...
                </span>
              ) : (
                "Submit for evaluation"
              )}
            </button>
          </div>
        </>
      )}

      {advancement && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-4 text-center">
          <p className="text-emerald-800 font-semibold">
            You've advanced to level {advancement.toLevel}!
          </p>
        </div>
      )}

      {evaluation && (
        <EvaluationCard evaluation={evaluation} />
      )}

      {evaluation && (
        <button
          onClick={handleGenerate}
          disabled={loading || !canGenerate}
          className="w-full py-3 px-4 rounded-lg border border-zinc-300 text-zinc-700 text-sm font-medium hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Generate a new prompt
        </button>
      )}
    </div>
  );
}
