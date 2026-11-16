"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { PlacementTestCard } from "@/components/legacy/placement/placement-test-card";
import { TodayGetResponse } from "@/contracts/today";
import { fetchJson } from "@/lib/http";

export default function PlacementPage() {
  const router = useRouter();
  const loadAlive = useRef(true);

  useEffect(() => {
    loadAlive.current = true;
    void (async () => {
      const result = await fetchJson("/api/today", TodayGetResponse);
      if (!loadAlive.current || !result.ok) return;
      if (result.value.level !== null) router.replace("/");
    })();
    return () => {
      loadAlive.current = false;
    };
  }, [router]);

  return (
    <main className="max-w-home mx-auto flex w-full flex-col gap-6 px-5 py-5 pb-20 sm:px-6">
      <PlacementTestCard />
    </main>
  );
}
