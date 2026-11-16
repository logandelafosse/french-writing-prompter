"use client";

import { useEffect, useState } from "react";
import { LevelBadge, LevelSelector, type CefrLevel } from "./level-components";
import { LevelGetResponse, LevelPutResponse } from "@/contracts/api";
import { useHeaderShell } from "@/components/shell/header-shell";
import { fetchJson, messageFromFetchError } from "@/lib/http";

type LevelData = {
  level: CefrLevel | null;
  history: Array<{
    fromLevel: CefrLevel | null;
    toLevel: CefrLevel;
    source: "auto" | "manual";
    createdAt: string;
  }>;
};

const LOAD_ERROR = "An error occurred. Please try again.";

export function LevelCard() {
  const { level: shellLevel, refreshShell } = useHeaderShell();
  const [data, setData] = useState<LevelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadLevel() {
      const result = await fetchJson("/api/level", LevelGetResponse);
      if (cancelled) return;
      if (!result.ok) {
        setError(messageFromFetchError(result.error, LOAD_ERROR));
        setLoading(false);
        return;
      }
      setData(result.value);
      setLoading(false);
    }
    void loadLevel();
    return () => {
      cancelled = true;
    };
  }, []);

  async function fetchLevel() {
    setLoading(true);
    setError(null);
    const result = await fetchJson("/api/level", LevelGetResponse);
    if (!result.ok) {
      setError(messageFromFetchError(result.error, LOAD_ERROR));
      setLoading(false);
      return;
    }
    setData(result.value);
    setLoading(false);
  }

  const handleSelectLevel = async (level: CefrLevel) => {
    setError(null);
    const result = await fetchJson("/api/level", LevelPutResponse, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ level }),
    });
    if (!result.ok) {
      setError(messageFromFetchError(result.error, LOAD_ERROR));
      return;
    }
    await fetchLevel();
    await refreshShell();
  };

  const displayLevel = shellLevel ?? data?.level ?? null;

  if (loading) {
    return (
      <div className="animate-pulse rounded-xl border bg-white p-6">
        <div className="h-5 w-24 rounded bg-zinc-100" />
        <div className="mt-3 h-8 w-48 rounded bg-zinc-100" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border bg-white p-6">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-white p-6">
      <h2 className="text-sm font-medium tracking-wide text-zinc-500 uppercase">
        CEFR Level
      </h2>

      <div className="mt-3">
        {displayLevel ? (
          <div className="flex items-center gap-4">
            <LevelBadge level={displayLevel} />
            <LevelSelector
              currentLevel={displayLevel}
              onSelect={(level) => {
                void handleSelectLevel(level);
              }}
            />
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-zinc-600">
              What is your French level? You can change it at any time.
            </p>
            <LevelSelector
              currentLevel={null}
              onSelect={(level) => {
                void handleSelectLevel(level);
              }}
            />
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
