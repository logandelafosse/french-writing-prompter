"use client";

import { useCallback, useEffect, useState } from "react";
import { SessionsGetResponse } from "@/contracts/api";
import type { ClassifiedFetchFailure } from "@/contracts/errors";
import type { SessionSummary } from "@/contracts/session";
import { historyCopy } from "@/copy/history";
import { homeCopy } from "@/copy/fr";
import { classifyFetchError, fetchJson } from "@/lib/http";
import { PageTitle } from "@/components/ui/page-title";
import { Surface } from "@/components/ui/surface";
import { ErrorAlert } from "@/components/states/error-alert";
import { OfflineNotice, useOffline } from "@/components/states/offline-notice";
import { HistoryRow, HistoryRowBoundary } from "./history-row";

// prettier-ignore
type LoadUi = { status: "loading" } | { status: "ready"; sessions: SessionSummary[]; levelLine: string | null } | { status: "error"; failure: ClassifiedFetchFailure };

export function HistoriquePage() {
  const [loadUi, setLoadUi] = useState<LoadUi>({ status: "loading" });
  const offline = useOffline();
  const load = useCallback(async () => {
    setLoadUi({ status: "loading" });
    const result = await fetchJson(
      "/api/sessions?limit=50",
      SessionsGetResponse,
      { loadingTimeout: true },
    );
    setLoadUi(
      result.ok
        ? {
            status: "ready",
            sessions: result.value.sessions,
            levelLine: result.value.levelLine,
          }
        : { status: "error", failure: classifyFetchError(result.error) },
    );
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial history load
    void load();
  }, [load]);
  const showOffline =
    offline || (loadUi.status === "error" && loadUi.failure === "offline");
  const ready = loadUi.status === "ready" ? loadUi : null;
  return (
    <main className="max-w-list mx-auto flex w-full flex-col gap-6 px-6 py-5 pb-20">
      <div className="flex flex-col gap-1.5">
        <PageTitle>{historyCopy.title}</PageTitle>
        {ready?.levelLine ? (
          <p className="text-muted text-[15px]">{ready.levelLine}</p>
        ) : null}
      </div>
      {showOffline ? <OfflineNotice onRetry={() => void load()} /> : null}
      {loadUi.status === "error" && !showOffline ? (
        <ErrorAlert lead={homeCopy.loadError} onRetry={() => void load()} />
      ) : null}
      {loadUi.status === "loading" && !showOffline ? (
        <p className="text-muted text-sm" aria-live="polite">
          Chargement…
        </p>
      ) : null}
      {ready ? (
        <Surface
          padding="history"
          role="region"
          aria-label={historyCopy.listLabel}
          className="divide-line flex flex-col divide-y max-sm:p-[22px_18px]"
        >
          {ready.sessions.length === 0 ? (
            <p className="text-muted py-6 text-sm">{historyCopy.empty}</p>
          ) : (
            ready.sessions.map((item) => (
              <HistoryRowBoundary key={item.id}>
                <HistoryRow item={item} />
              </HistoryRowBoundary>
            ))
          )}
        </Surface>
      ) : null}
    </main>
  );
}
