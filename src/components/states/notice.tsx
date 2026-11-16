"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { homeCopy } from "@/copy/fr";
import { formatCountdown } from "@/lib/dates";

export function Notice({
  title,
  children,
  role = "status",
}: {
  title: ReactNode;
  children?: ReactNode;
  role?: "status";
}) {
  return (
    <div
      role={role}
      className="border-line-strong bg-notice rounded-base flex flex-col gap-1.5 border px-[22px] py-[18px]"
    >
      <p className="text-ink text-[18px] font-semibold">{title}</p>
      {children ? (
        <p className="text-ink-2 text-[15px]/[1.5]">{children}</p>
      ) : null}
    </div>
  );
}

export function QuotaNotice({
  resetsAt,
  hasActiveSession,
  now = () => new Date(),
}: {
  resetsAt: string;
  hasActiveSession: boolean;
  now?: () => Date;
}) {
  const nowRef = useRef(now);
  const [clock, setClock] = useState(() => now().getTime());

  useEffect(() => {
    nowRef.current = now;
    const id = setInterval(() => {
      setClock(nowRef.current().getTime());
    }, 60_000);
    return () => clearInterval(id);
  }, [now]);

  const countdown = formatCountdown(new Date(resetsAt), new Date(clock));

  return (
    <Notice title={homeCopy.quotaNoticeTitle}>
      {homeCopy.quotaNoticeCountdown(countdown)}
      {hasActiveSession ? ` ${homeCopy.quotaNoticeDraft}` : null}
    </Notice>
  );
}
