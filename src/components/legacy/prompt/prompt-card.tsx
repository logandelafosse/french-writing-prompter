"use client";

import { useState, useEffect } from "react";
import type { WritingPrompt } from "@/modules/prompt-generator/prompt-generator";
import { LevelBadge } from "@/components/legacy/level/level-components";
import { EvaluationCard } from "./evaluation-card";
import type { Evaluation } from "@/modules/writing-evaluator/writing-evaluator";
import {
  EvaluatePostResponse,
  PromptPostResponse,
  QuotaGetResponse,
} from "@/contracts/api";
import { fetchJson, messageFromFetchError } from "@/lib/http";
import { DAILY_PROMPT_QUOTA } from "@/config/limits";

const LOAD_ERROR = "An error occurred. Please try again.";
const EVAL_ERROR = "An error occurred during evaluation.";

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
    const result = await fetchJson("/api/quota", QuotaGetResponse);
    if (result.ok) {
      setQuota(result.value);
      return;
    }
    setError(messageFromFetchError(result.error, LOAD_ERROR));
  }

  useEffect(() => {
    let cancelled = false;
    async function loadQuota() {
      const result = await fetchJson("/api/quota", QuotaGetResponse);
      if (cancelled) return;
      if (result.ok) {
        setQuota(result.value);
        return;
      }
      setError(messageFromFetchError(result.error, LOAD_ERROR));
    }
    void loadQuota();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setEvaluation(null);
    setWriting("");

    const result = await fetchJson("/api/prompt", PromptPostResponse, {
      method: "POST",
    });

    if (!result.ok) {
      setError(messageFromFetchError(result.error, LOAD_ERROR));
    } else {
      setPrompt(result.value.prompt);
      setSessionId(result.value.sessionId);
      await refreshQuota();
    }

    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!sessionId || !writing.trim()) return;

    setLoading(true);
    setError(null);

    const result = await fetchJson("/api/evaluate", EvaluatePostResponse, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ writing: writing.trim(), sessionId }),
    });

    if (!result.ok) {
      setError(messageFromFetchError(result.error, EVAL_ERROR));
    } else {
      setEvaluation(result.value.evaluation);
      if (result.value.advancement) {
        setAdvancement(result.value.advancement);
      }
    }

    setLoading(false);
  };

  const canGenerate = quota ? quota.remaining > 0 : true;

  return (
    <div className="space-y-4 rounded-xl border bg-white p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium tracking-wide text-zinc-500 uppercase">
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
          onClick={() => void handleGenerate()}
          disabled={loading || !canGenerate}
          className="w-full rounded-lg bg-zinc-900 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="h-4 w-4 animate-spin"
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
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-600">
          {`You've used your ${DAILY_PROMPT_QUOTA} prompts for today. Come back tomorrow!`}
        </p>
      )}

      {error && (
        <div className="space-y-2 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          <p>{error}</p>
          <div className="flex gap-2">
            <button
              onClick={() => void handleGenerate()}
              className="text-xs font-medium underline hover:no-underline"
            >
              Regenerate prompt
            </button>
            {sessionId && !evaluation && (
              <button
                onClick={() => void handleSubmit()}
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
          <div className="space-y-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <div className="flex items-center gap-2">
              <LevelBadge level={prompt.constraints.cefrLevel} />
              <span className="text-xs text-zinc-400">Louisiana French</span>
            </div>
            <p className="leading-relaxed whitespace-pre-wrap text-zinc-800">
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
              className="w-full resize-y rounded-lg border border-zinc-300 p-3 text-sm text-zinc-800 placeholder:text-zinc-400 focus:border-transparent focus:ring-2 focus:ring-zinc-900 focus:outline-none"
            />
            <button
              onClick={() => void handleSubmit()}
              disabled={loading || !writing.trim()}
              className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="h-4 w-4 animate-spin"
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
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-center">
          <p className="font-semibold text-emerald-800">
            You've advanced to level {advancement.toLevel}!
          </p>
        </div>
      )}

      {evaluation && <EvaluationCard evaluation={evaluation} />}

      {evaluation && (
        <button
          onClick={() => void handleGenerate()}
          disabled={loading || !canGenerate}
          className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Generate a new prompt
        </button>
      )}
    </div>
  );
}
