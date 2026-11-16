"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { homeCopy } from "@/copy/fr";

export function useOffline(): boolean {
  const [offline, setOffline] = useState(() => !navigator.onLine);

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  return offline;
}

export function OfflineNotice({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      role="status"
      lang="fr"
      className="border-line-strong bg-notice rounded-base flex flex-wrap items-center justify-between gap-x-5 gap-y-2.5 border px-[18px] py-3.5"
    >
      <p className="text-ink min-w-0 flex-1 basis-80 text-[15px]/[1.45]">
        <strong className="font-semibold">{homeCopy.offlineLead}</strong>{" "}
        {homeCopy.offlineBody}
      </p>
      <Button
        variant="secondary-strong"
        className="min-h-touch px-[18px] text-[15px]"
        onClick={onRetry}
      >
        {homeCopy.offlineRetry}
      </Button>
    </div>
  );
}
