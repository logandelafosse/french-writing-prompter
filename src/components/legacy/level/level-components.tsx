"use client";

import { useState } from "react";
import type { CefrLevel } from "@/contracts/cefr";
import { CEFR_LEVELS } from "@/contracts/cefr";
import { CEFR_UI_LABELS } from "@/contracts/cefr";

export type { CefrLevel };

const LEVEL_COLORS: Record<CefrLevel, string> = {
  A1: "bg-emerald-100 text-emerald-800 border-emerald-300",
  A2: "bg-green-100 text-green-800 border-green-300",
  B1: "bg-blue-100 text-blue-800 border-blue-300",
  B2: "bg-indigo-100 text-indigo-800 border-indigo-300",
  C1: "bg-purple-100 text-purple-800 border-purple-300",
  C2: "bg-rose-100 text-rose-800 border-rose-300",
};

const LEVEL_LABELS = CEFR_UI_LABELS;

export function LevelBadge({ level }: { level: CefrLevel | null }) {
  if (!level) return null;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold ${LEVEL_COLORS[level]}`}
    >
      {level}
      <span className="text-xs opacity-70">— {LEVEL_LABELS[level]}</span>
    </span>
  );
}

const ALL_LEVELS: CefrLevel[] = [...CEFR_LEVELS];

export function LevelSelector({
  currentLevel,
  onSelect,
}: {
  currentLevel: CefrLevel | null;
  onSelect: (level: CefrLevel) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm font-medium transition-colors hover:bg-zinc-50"
      >
        {currentLevel ? (
          <LevelBadge level={currentLevel} />
        ) : (
          <span className="text-zinc-500">Select your level</span>
        )}
        <svg
          className="h-4 w-4 text-zinc-400"
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
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-20 mt-1 w-64 rounded-lg border bg-white py-1 shadow-lg">
            {ALL_LEVELS.map((level) => (
              <button
                key={level}
                onClick={() => {
                  onSelect(level);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-zinc-50 ${
                  level === currentLevel ? "bg-zinc-50" : ""
                }`}
              >
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${LEVEL_COLORS[level]}`}
                >
                  {level}
                </span>
                <span className="text-zinc-600">{LEVEL_LABELS[level]}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
