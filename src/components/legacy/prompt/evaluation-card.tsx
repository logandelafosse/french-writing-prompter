"use client";

import { LevelBadge } from "@/components/legacy/level/level-components";
import type { Evaluation } from "@/contracts/evaluation";

export function EvaluationCard({ evaluation }: { evaluation: Evaluation }) {
  const dimensions = [
    {
      key: "grammatical_accuracy" as const,
      label: "Grammatical accuracy",
    },
    {
      key: "vocabulary" as const,
      label: "Vocabulary",
    },
    {
      key: "coherence" as const,
      label: "Coherence & cohesion",
    },
    {
      key: "register_style" as const,
      label: "Register & style",
    },
  ];

  return (
    <div className="space-y-4 rounded-lg border border-emerald-200 bg-emerald-50/50 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-emerald-800">Evaluation</h3>
        <LevelBadge level={evaluation.overall_cefr} />
      </div>

      <div className="space-y-3">
        {dimensions.map(({ key, label }) => {
          const dim = evaluation.dimensions[key];
          return (
            <div key={key} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-600">
                  {label}
                </span>
                <span className="text-xs text-zinc-500">
                  {dim.score}/{dim.max}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-zinc-200">
                <div
                  className="h-1.5 rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${(dim.score / dim.max) * 100}%` }}
                />
              </div>
              <p className="text-xs text-zinc-500">{dim.comment}</p>
            </div>
          );
        })}
      </div>

      <div className="space-y-2 border-t border-emerald-200 pt-3">
        <h4 className="text-xs font-medium text-zinc-600">Tips</h4>
        <div className="space-y-1.5">
          {dimensions.map(({ key, label }) => (
            <p key={key} className="text-xs text-zinc-600">
              <span className="font-medium">{label} :</span>{" "}
              {evaluation.tips.per_dimension[key]}
            </p>
          ))}
        </div>
        <div className="rounded-lg border border-emerald-200 bg-white p-3">
          <p className="text-xs text-zinc-700">{evaluation.tips.holistic}</p>
        </div>
      </div>
    </div>
  );
}
