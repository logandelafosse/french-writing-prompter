"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import type { CefrLevel } from "@/contracts/cefr";
import {
  LevelGetResponse,
  LevelPutResponse,
  QuotaGetResponse,
} from "@/contracts/api";
import { fetchJson } from "@/lib/http";
import type { QuotaState } from "@/modules/quota-manager/quota-db-store";
import { AppHeader } from "./app-header";

type HeaderContextValue = {
  refreshQuota: () => Promise<void>;
};

export const HEADER_SHELL_REFRESH_EVENT = "fwp:header-shell-refresh";

const HeaderContext = createContext<HeaderContextValue | null>(null);

export function useHeaderShell(): HeaderContextValue {
  const ctx = useContext(HeaderContext);
  if (!ctx) {
    throw new Error("useHeaderShell must be used within HeaderShell");
  }
  return ctx;
}

export function HeaderShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [level, setLevel] = useState<CefrLevel | null>(null);
  const [quota, setQuota] = useState<QuotaState | null>(null);

  const refreshQuota = useCallback(async () => {
    const result = await fetchJson("/api/quota", QuotaGetResponse);
    if (result.ok) {
      setQuota(result.value);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadLevel() {
      const result = await fetchJson("/api/level", LevelGetResponse);
      if (cancelled) return;
      if (result.ok) {
        setLevel(result.value.level);
      }
    }
    async function loadQuota() {
      const result = await fetchJson("/api/quota", QuotaGetResponse);
      if (cancelled) return;
      if (result.ok) {
        setQuota(result.value);
      }
    }
    function refreshShell() {
      void loadLevel();
      void loadQuota();
    }
    void loadLevel();
    void loadQuota();
    window.addEventListener(HEADER_SHELL_REFRESH_EVENT, refreshShell);
    return () => {
      cancelled = true;
      window.removeEventListener(HEADER_SHELL_REFRESH_EVENT, refreshShell);
    };
  }, []);

  const onLevelChange = useCallback(async (next: CefrLevel) => {
    const result = await fetchJson("/api/level", LevelPutResponse, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ level: next }),
    });
    if (result.ok) {
      setLevel(next);
    }
  }, []);

  const current = pathname.startsWith("/history")
    ? ("historique" as const)
    : undefined;

  const contextValue = useMemo(() => ({ refreshQuota }), [refreshQuota]);

  return (
    <HeaderContext.Provider value={contextValue}>
      <AppHeader
        variant="full"
        level={level}
        quota={quota}
        current={current}
        onLevelChange={onLevelChange}
      />
      {children}
    </HeaderContext.Provider>
  );
}
