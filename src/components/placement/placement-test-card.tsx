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
      <div className="space-y-6 rounded-xl border bg-white p-6">
        <div className="space-y-2 text-center">
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
          className="w-full rounded-lg bg-zinc-900 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
        >
          Back
        </button>
      </div>
    );
  }

  if (flow.phase === "prompt") {
    return (
      <div className="space-y-4 rounded-xl border bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium tracking-wide text-zinc-500 uppercase">
            Placement test
          </h2>
          <span className="text-xs text-zinc-400">Step {flow.step} / 3</span>
        </div>

        <div className="h-1 w-full rounded-full bg-zinc-200">
          <div
            className="h-1 rounded-full bg-zinc-900 transition-all"
            style={{ width: `${(flow.step / 3) * 100}%` }}
          />
        </div>

        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <LevelBadge
              level={flow.prompt.constraints.cefrLevel as CefrLevel}
            />
            <span className="text-xs text-zinc-400">Louisiana French</span>
          </div>
          <p className="leading-relaxed whitespace-pre-wrap text-zinc-800">
            {flow.prompt.text}
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
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
            className="w-full resize-y rounded-lg border border-zinc-300 p-3 text-sm text-zinc-800 placeholder:text-zinc-400 focus:border-transparent focus:ring-2 focus:ring-zinc-900 focus:outline-none"
          />
          <div className="flex gap-3">
            <button
              onClick={() => {
                setFlow({ phase: "idle" });
                setWriting("");
              }}
              className="flex-1 rounded-lg border border-zinc-300 px-4 py-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !writing.trim()}
              className="flex-1 rounded-lg bg-zinc-900 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Evaluating..." : "Submit"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border bg-white p-6">
      <h2 className="text-sm font-medium tracking-wide text-zinc-500 uppercase">
        Placement test
      </h2>
      <p className="text-sm text-zinc-600">
        Don't know your level? Take a 3-prompt writing test to determine it
        automatically.
      </p>
      <button
        onClick={handleStart}
        disabled={loading}
        className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Starting..." : "Start placement test"}
      </button>
    </div>
  );
}
