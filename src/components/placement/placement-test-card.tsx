"use client";

import { useState } from "react";
import type { WritingPrompt } from "@/modules/prompt-generator/prompt-generator";
import type { Evaluation } from "@/modules/writing-evaluator/writing-evaluator";
import type { CefrLevel } from "@/components/level/level-components";
import { LevelBadge } from "@/components/level/level-components";
import { EvaluationCard } from "@/components/prompt/evaluation-card";

type FlowState =
  | { phase: "idle" }
  | { phase: "prompt"; prompt: WritingPrompt; step: number }
  | { phase: "complete"; finalLevel: string; evaluations: Evaluation[] };

export function PlacementTestCard() {
  const [flow, setFlow] = useState<FlowState>({ phase: "idle" });
  const [writing, setWriting] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async () => {
    setLoading(true);
    setError(null);
    setWriting("");

    try {
      const res = await fetch("/api/placement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
      } else {
        setFlow({ phase: "prompt", prompt: data.prompt, step: data.step });
      }
    } catch {
      setError("Error starting the test.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!writing.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/placement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit", writing: writing.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
      } else if (data.type === "next_prompt") {
        setFlow({
          phase: "prompt",
          prompt: data.prompt,
          step: data.step,
        });
        setWriting("");
      } else if (data.type === "complete") {
        setFlow({
          phase: "complete",
          finalLevel: data.finalLevel,
          evaluations: data.evaluations,
        });
      }
    } catch {
      setError("Error during evaluation.");
    } finally {
      setLoading(false);
    }
  };

  if (flow.phase === "complete") {
    return (
      <div className="rounded-xl border bg-white p-6 space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-lg font-semibold text-zinc-900">
            Placement test complete
          </h2>
          <p className="text-sm text-zinc-500">
            Your CEFR level has been determined
          </p>
          <div className="flex justify-center pt-2">
            <LevelBadge level={flow.finalLevel as CefrLevel} />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-medium text-zinc-600">
            Detailed results
          </h3>
          {flow.evaluations.map((evaluation, i) => (
            <div key={i} className="space-y-1">
              <p className="text-xs font-medium text-zinc-500">
                Writing {i + 1}
              </p>
              <EvaluationCard evaluation={evaluation} />
            </div>
          ))}
        </div>

        <button
          onClick={() => {
            setFlow({ phase: "idle" });
            setWriting("");
          }}
          className="w-full py-3 px-4 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 transition-colors"
        >
          Back
        </button>
      </div>
    );
  }

  if (flow.phase === "prompt") {
    return (
      <div className="rounded-xl border bg-white p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wide">
            Placement test
          </h2>
          <span className="text-xs text-zinc-400">
            Step {flow.step} / 3
          </span>
        </div>

        <div className="w-full bg-zinc-200 rounded-full h-1">
          <div
            className="bg-zinc-900 h-1 rounded-full transition-all"
            style={{ width: `${(flow.step / 3) * 100}%` }}
          />
        </div>

        <div className="border border-zinc-200 rounded-lg p-4 bg-zinc-50">
          <div className="flex items-center gap-2 mb-2">
            <LevelBadge
              level={flow.prompt.constraints.cefrLevel as CefrLevel}
            />
            <span className="text-xs text-zinc-400">Louisiana French</span>
          </div>
          <p className="text-zinc-800 leading-relaxed whitespace-pre-wrap">
            {flow.prompt.text}
          </p>
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3">
            <p>{error}</p>
          </div>
        )}

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
          <div className="flex gap-3">
            <button
              onClick={() => {
                setFlow({ phase: "idle" });
                setWriting("");
              }}
              className="flex-1 py-3 px-4 rounded-lg border border-zinc-300 text-zinc-700 text-sm font-medium hover:bg-zinc-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !writing.trim()}
              className="flex-1 py-3 px-4 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Evaluating..." : "Submit"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-white p-6 space-y-4">
      <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wide">
        Placement test
      </h2>
      <p className="text-sm text-zinc-600">
        Don't know your level? Take a 3-prompt writing test to determine it automatically.
      </p>
      <button
        onClick={handleStart}
        disabled={loading}
        className="w-full py-3 px-4 rounded-lg border border-zinc-300 text-zinc-700 text-sm font-medium hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "Starting..." : "Start placement test"}
      </button>
    </div>
  );
}
