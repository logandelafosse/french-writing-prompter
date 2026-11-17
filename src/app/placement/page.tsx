"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { TodayGetResponse } from "@/contracts/today";
import { fetchJson } from "@/lib/http";

export default function PlacementPage() {
  const router = useRouter();
  useEffect(() => {
    let alive = true;
    void fetchJson("/api/today", TodayGetResponse).then((result) => {
      if (!alive || !result.ok) return;
      if (result.value.level !== null) router.replace("/");
    });
    return () => {
      alive = false;
    };
  }, [router]);
  return (
    <main className="max-w-home mx-auto flex w-full flex-col gap-6 px-5 py-5 pb-20 sm:px-6"></main>
  );
}
