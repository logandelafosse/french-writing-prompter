import { describe, expect, it } from "vitest";
import type { Correction } from "@/contracts/correction";
import { aggregateWeaknesses, type WeaknessSession } from "./aggregate";

function correction(
  partial: Pick<Correction, "kind" | "status"> &
    Partial<Pick<Correction, "category">>,
): WeaknessSession["corrections"][number] {
  return {
    kind: partial.kind,
    status: partial.status,
    category: partial.category ?? "genre",
  };
}

function session(
  evaluatedAt: string,
  corrections: WeaknessSession["corrections"],
  kind: WeaknessSession["kind"] = "daily",
): WeaknessSession {
  return { evaluatedAt, kind, corrections };
}

describe("aggregateWeaknesses", () => {
  it("counts confirmed_mistake dialect checks and ignores non-mistakes", () => {
    const weaknesses = aggregateWeaknesses([
      session("2026-11-16T18:00:00.000Z", [
        correction({
          kind: "dialect_check",
          status: "confirmed_mistake",
          category: "auxiliaire",
        }),
        correction({ kind: "standard", status: "open", category: null }),
        correction({
          kind: "mistake",
          status: "overturned",
          category: "accents",
        }),
        correction({
          kind: "dialect_check",
          status: "open",
          category: "conjugaison",
        }),
        correction({
          kind: "dialect_check",
          status: "confirmed_dialect",
          category: "pronoms",
        }),
        correction({ kind: "mistake", status: "open", category: "genre" }),
      ]),
    ]);
    expect(weaknesses.map((row) => row.category)).toEqual([
      "auxiliaire",
      "genre",
    ]);
    expect(weaknesses.map((row) => row.count)).toEqual([1, 1]);
  });

  it("orders actif before en_progres before tranquille, then s desc, then count desc", () => {
    const weaknesses = aggregateWeaknesses([
      session("2026-11-16T18:00:00.000Z", [
        correction({ kind: "mistake", status: "open", category: "genre" }),
      ]),
      session("2026-11-15T18:00:00.000Z", [
        correction({
          kind: "mistake",
          status: "open",
          category: "prepositions",
        }),
        correction({
          kind: "mistake",
          status: "acknowledged",
          category: "prepositions",
        }),
      ]),
      session("2026-11-14T18:00:00.000Z", [
        correction({
          kind: "mistake",
          status: "open",
          category: "prepositions",
        }),
      ]),
      session("2026-11-13T18:00:00.000Z", [
        correction({ kind: "mistake", status: "open", category: "accord" }),
      ]),
      session("2026-11-12T18:00:00.000Z", [
        correction({
          kind: "mistake",
          status: "open",
          category: "vocabulaire",
        }),
        correction({
          kind: "mistake",
          status: "open",
          category: "vocabulaire",
        }),
      ]),
      session("2026-11-01T18:00:00.000Z", [
        correction({ kind: "mistake", status: "open", category: "accents" }),
        correction({ kind: "mistake", status: "open", category: "accents" }),
      ]),
    ]);
    expect(weaknesses.map((row) => row.category)).toEqual([
      "prepositions",
      "genre",
      "vocabulaire",
      "accord",
      "accents",
    ]);
    expect(weaknesses.map((row) => row.trend)).toEqual([
      "actif",
      "actif",
      "en_progres",
      "en_progres",
      "tranquille",
    ]);
  });

  it("orders same-trend rows by s desc even when that row has the lower count", () => {
    const weaknesses = aggregateWeaknesses([
      session("2026-11-16T18:00:00.000Z", [
        correction({ kind: "mistake", status: "open", category: "genre" }),
        correction({ kind: "mistake", status: "open", category: "genre" }),
        correction({ kind: "mistake", status: "open", category: "genre" }),
      ]),
      session("2026-11-15T18:00:00.000Z", [
        correction({
          kind: "mistake",
          status: "open",
          category: "prepositions",
        }),
      ]),
      session("2026-11-14T18:00:00.000Z", [
        correction({
          kind: "mistake",
          status: "open",
          category: "prepositions",
        }),
      ]),
    ]);
    expect(weaknesses.map((row) => row.category)).toEqual([
      "prepositions",
      "genre",
    ]);
    expect(weaknesses.map((row) => row.trend)).toEqual(["actif", "actif"]);
    expect(weaknesses.map((row) => row.count)).toEqual([2, 3]);
  });

  it("includes placement sessions when the named filter is on", () => {
    const weaknesses = aggregateWeaknesses([
      session(
        "2026-11-16T18:00:00.000Z",
        [correction({ kind: "mistake", status: "open", category: "genre" })],
        "placement",
      ),
    ]);
    expect(weaknesses).toEqual([
      expect.objectContaining({
        category: "genre",
        count: 1,
        trend: "actif",
      }),
    ]);
  });
});
