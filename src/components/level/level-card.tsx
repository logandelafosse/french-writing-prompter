"use client";

import { useEffect, useState } from "react";
import { LevelBadge, LevelSelector, type CefrLevel } from "./level-components";

interface LevelData {
  level: CefrLevel | null;
  history: Array<{
    fromLevel: CefrLevel | null;
    toLevel: CefrLevel;
    source: "auto" | "manual";
    createdAt: string;
  }>;
}

export function LevelCard() {
  const [data, setData] = useState<LevelData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function loadLevel() {
      const res = await fetch("/api/level");
      const json = await res.json();
      if (!cancelled) {
        setData(json);
        setLoading(false);
      }
    }
    loadLevel();
    return () => {
      cancelled = true;
    };
  }, []);

  async function fetchLevel() {
    setLoading(true);
    const res = await fetch("/api/level");
    const json = await res.json();
    setData(json);
    setLoading(false);
  }

  const handleSelectLevel = async (level: CefrLevel) => {
    await fetch("/api/level", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ level, source: "manual" }),
    });
    fetchLevel();
  };

  if (loading) {
    return (
      <div className="animate-pulse rounded-xl border bg-white p-6">
        <div className="h-5 w-24 rounded bg-zinc-100" />
        <div className="mt-3 h-8 w-48 rounded bg-zinc-100" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-white p-6">
      <h2 className="text-sm font-medium tracking-wide text-zinc-500 uppercase">
        CEFR Level
      </h2>

      <div className="mt-3">
        {data?.level ? (
          <div className="flex items-center gap-4">
            <LevelBadge level={data.level} />
            <LevelSelector
              currentLevel={data.level}
              onSelect={handleSelectLevel}
            />
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-zinc-600">
              What is your French level? You can change it at any time.
            </p>
            <LevelSelector currentLevel={null} onSelect={handleSelectLevel} />
            <p className="text-xs text-zinc-400">
              You can also{" "}
              <span className="font-medium text-zinc-600">
                take a placement test
              </span>{" "}
              to determine it automatically.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
