"use client";

import { useCallback, useEffect, useReducer } from "react";
import { useRouter } from "next/navigation";
import { useHeaderShell } from "@/components/shell/header-shell";
import { ErrorAlert } from "@/components/states/error-alert";
import {
  PlacementGetResponse,
  PlacementStartResponse,
  PlacementSubmitResponse,
} from "@/contracts/placement";
import { TodayGetResponse } from "@/contracts/today";
import { homeCopy } from "@/copy/fr";
import { placementCopy } from "@/copy/placement";
import { classifyFetchError, fetchJson } from "@/lib/http";
import {
  PlacementResult,
  PlacementStart,
  PlacementStep,
} from "./placement-screens";
import {
  initialPlacementState,
  placementStepFromRun,
  reducePlacement,
} from "./placement-reducer";

const later = { href: "/", label: placementCopy.finishLater };
const know = { href: "/", label: placementCopy.knowLevel };

// prettier-ignore
export function PlacementPage() {
  const router = useRouter();
  const { setPlacementLink } = useHeaderShell();
  const [state, dispatch] = useReducer(reducePlacement, initialPlacementState);

  const boot = useCallback(async () => {
    const [today, placement] = await Promise.all([
      fetchJson("/api/today", TodayGetResponse, { loadingTimeout: true }),
      fetchJson("/api/placement", PlacementGetResponse, { loadingTimeout: true }),
    ]);
    if (!today.ok) { dispatch({ type: "failed", error: classifyFetchError(today.error) }); return; }
    if (today.value.level !== null) { dispatch({ type: "redirect" }); router.replace("/"); return; }
    if (!placement.ok) {
      setPlacementLink(know); dispatch({ type: "showStart" });
      dispatch({ type: "failed", error: classifyFetchError(placement.error) }); return;
    }
    const model = placement.value.run === null ? null : placementStepFromRun(placement.value.run);
    if (model) { setPlacementLink(later); dispatch({ type: "opened", model }); }
    else { setPlacementLink(know); dispatch({ type: "showStart" }); }
  }, [router, setPlacementLink]);

  useEffect(() => { void boot(); }, [boot]);

  const start = async () => {
    dispatch({ type: "startBusy" });
    const result = await fetchJson("/api/placement/start", PlacementStartResponse, { method: "POST" });
    if (!result.ok) {
      if (result.error.kind === "http" && result.error.status === 409) { dispatch({ type: "redirect" }); router.replace("/"); return; }
      dispatch({ type: "failed", error: classifyFetchError(result.error) }); return;
    }
    const model = placementStepFromRun(result.value.run);
    if (model) { setPlacementLink(later); dispatch({ type: "opened", model }); }
    else dispatch({ type: "failed", error: "generic" });
  };

  const submit = async (text: string) => {
    if (state.phase !== "step") return;
    dispatch({ type: "submitBusy" });
    const result = await fetchJson(`/api/placement/${state.runId}/submit`, PlacementSubmitResponse, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: state.sessionId, text }),
    });
    if (!result.ok) { dispatch({ type: "submitFailed", error: classifyFetchError(result.error) }); return; }
    if (result.value.results) { setPlacementLink(null); dispatch({ type: "finished", result: result.value.results }); return; }
    const model = placementStepFromRun(result.value.run);
    if (model) { setPlacementLink(later); dispatch({ type: "opened", model }); }
    else dispatch({ type: "submitFailed", error: "generic" });
  };

  const onText = useCallback((text: string) => { dispatch({ type: "typed", text }); }, []);
  const retry = () => { if (state.phase === "boot") void boot(); else if (state.phase === "start") void start(); };
  const draft = state.phase === "step" && (state.text || state.savedAt)
    ? { text: state.text, savedAt: state.savedAt ?? new Date().toISOString() } : null;

  return (
    <main className="max-w-home mx-auto flex w-full flex-col gap-[22px] px-5 py-5 pb-20 sm:px-6">
      {state.phase === "boot" && state.error !== null ? <ErrorAlert lead={homeCopy.loadError} onRetry={retry} /> : null}
      {state.phase === "start" ? (
        <>
          <PlacementStart generating={state.status === "generating"} onStart={() => void start()} />
          {state.error !== null ? <ErrorAlert lead={homeCopy.loadError} onRetry={retry} /> : null}
        </>
      ) : null}
      {state.phase === "step" ? (
        <PlacementStep key={state.sessionId} step={state.step} sessionId={state.sessionId} prompt={state.prompt} draft={draft} submitting={state.submit === "evaluating"} error={state.error} onText={onText} onSubmit={(text) => void submit(text)} />
      ) : null}
      {state.phase === "done" ? <PlacementResult result={state.result} /> : null}
    </main>
  );
}
