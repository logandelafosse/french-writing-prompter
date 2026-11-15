"use client";

import { LevelBadge } from "@/components/level/level-components";
import type { CefrLevel } from "@/components/level/level-components";
import type { Evaluation } from "@/modules/writing-evaluator/writing-evaluator";

export function EvaluationCard({
  evaluation,
}: {
  evaluation: Evaluation;
}) {
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
    <div className="border border-emerald-200 rounded-lg p-4 space-y-4 bg-emerald-50/50">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-emerald-800">
          Evaluation
        </h3>
        <LevelBadge level={evaluation.overall_cefr as CefrLevel} />
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
              <div className="w-full bg-zinc-200 rounded-full h-1.5">
                <div
                  className="bg-emerald-500 h-1.5 rounded-full transition-all"
                  style={{ width: `${(dim.score / dim.max) * 100}%` }}
                />
              </div>
              <p className="text-xs text-zinc-500">{dim.comment}</p>
            </div>
          );
        })}
      </div>

      <div className="border-t border-emerald-200 pt-3 space-y-2">
        <h4 className="text-xs font-medium text-zinc-600">
          Tips
        </h4>
        <div className="space-y-1.5">
          {dimensions.map(({ key, label }) => (
            <p key={key} className="text-xs text-zinc-600">
              <span className="font-medium">{label} :</span>{" "}
              {
                evaluation.tips.per_dimension[key]
              }
            </p>
          ))}
        </div>
        <div className="bg-white rounded-lg p-3 border border-emerald-200">
          <p className="text-xs text-zinc-700">
            {evaluation.tips.holistic}
          </p>
        </div>
      </div>
    </div>
  );
}
