"use client";

import { useState } from "react";

export type CefrLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

const LEVEL_COLORS: Record<CefrLevel, string> = {
  A1: "bg-emerald-100 text-emerald-800 border-emerald-300",
  A2: "bg-green-100 text-green-800 border-green-300",
  B1: "bg-blue-100 text-blue-800 border-blue-300",
  B2: "bg-indigo-100 text-indigo-800 border-indigo-300",
  C1: "bg-purple-100 text-purple-800 border-purple-300",
  C2: "bg-rose-100 text-rose-800 border-rose-300",
};

const LEVEL_LABELS: Record<CefrLevel, string> = {
  A1: "Beginner",
  A2: "Elementary",
  B1: "Intermediate",
  B2: "Upper Intermediate",
  C1: "Advanced",
  C2: "Mastery",
};

export function LevelBadge({ level }: { level: CefrLevel | null }) {
  if (!level) return null;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold border ${LEVEL_COLORS[level]}`}
    >
      {level}
      <span className="text-xs opacity-70">— {LEVEL_LABELS[level]}</span>
    </span>
  );
}

const ALL_LEVELS: CefrLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

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
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border bg-white hover:bg-zinc-50 transition-colors"
      >
        {currentLevel ? (
          <LevelBadge level={currentLevel} />
        ) : (
          <span className="text-zinc-500">Select your level</span>
        )}
        <svg
          className="w-4 h-4 text-zinc-400"
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
          <div className="absolute z-20 mt-1 w-64 bg-white rounded-lg border shadow-lg py-1">
            {ALL_LEVELS.map((level) => (
              <button
                key={level}
                onClick={() => {
                  onSelect(level);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-zinc-50 transition-colors ${
                  level === currentLevel ? "bg-zinc-50" : ""
                }`}
              >
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${LEVEL_COLORS[level]}`}
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
