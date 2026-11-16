"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DraftPutResponse } from "@/contracts/api";
import { DRAFT_AUTOSAVE_MS } from "@/config/limits";
import {
  readLocalDraft,
  removeInactiveDrafts,
  writeLocalDraft,
} from "@/lib/draft-storage";
import { fetchJson } from "@/lib/http";
import { reconcileDraft } from "@/lib/reconcile-draft";

const LOCAL_MIRROR_MS = 300;

function clearTimer(timer: { current: ReturnType<typeof setTimeout> | null }) {
  if (!timer.current) return;
  clearTimeout(timer.current);
  timer.current = null;
}

export function useDraftAutosave(
  sessionId: number,
  serverDraft: { text: string; savedAt: string } | null,
) {
  const [draft, setDraft] = useState(() => {
    removeInactiveDrafts(sessionId);
    return reconcileDraft(serverDraft, readLocalDraft(sessionId));
  });
  const textRef = useRef(draft.text);
  const dirtyRef = useRef(false);
  const seqRef = useRef(0);
  const pushOnMount = useRef(draft.updateServer);
  const serverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const localTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSave = useRef<Promise<void>>(Promise.resolve());

  const push = useCallback(
    (text: string): Promise<void> => {
      const seq = seqRef.current + 1;
      seqRef.current = seq;
      if (textRef.current === text) dirtyRef.current = false;
      const task = fetchJson(
        `/api/sessions/${sessionId}/draft`,
        DraftPutResponse,
        {
          method: "PUT",
          keepalive: true,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        },
      ).then((result) => {
        if (seq !== seqRef.current || !result.ok) return;
        if (textRef.current !== text) return;
        writeLocalDraft(sessionId, { text, savedAt: result.value.savedAt });
        setDraft((prev) => ({
          ...prev,
          savedAt: result.value.savedAt,
          updateServer: false,
        }));
      });
      pendingSave.current = task;
      return task;
    },
    [sessionId],
  );

  const saveNow = useCallback((): Promise<void> => {
    clearTimer(serverTimer);
    clearTimer(localTimer);
    if (!dirtyRef.current) return pendingSave.current;
    const text = textRef.current;
    writeLocalDraft(sessionId, { text, savedAt: new Date().toISOString() });
    return push(text);
  }, [push, sessionId]);

  useEffect(() => {
    if (pushOnMount.current) {
      pushOnMount.current = false;
      void push(textRef.current);
    }
    const onHide = () => {
      void saveNow();
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") onHide();
    };
    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", onVisibility);
      onHide();
    };
  }, [saveNow, push]);

  const onTextChange = useCallback(
    (next: string) => {
      textRef.current = next;
      dirtyRef.current = true;
      setDraft((prev) => ({ ...prev, text: next }));
      clearTimer(localTimer);
      localTimer.current = setTimeout(() => {
        writeLocalDraft(sessionId, {
          text: textRef.current,
          savedAt: new Date().toISOString(),
        });
      }, LOCAL_MIRROR_MS);
      clearTimer(serverTimer);
      serverTimer.current = setTimeout(() => {
        void push(textRef.current);
      }, DRAFT_AUTOSAVE_MS);
    },
    [push, sessionId],
  );

  return { text: draft.text, savedAt: draft.savedAt, onTextChange, saveNow };
}
