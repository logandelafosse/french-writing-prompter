import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { AI_ROUTE_MAX_DURATION } from "@/config/ai";
import * as levelUndoRoute from "./level/undo/route";
import * as levelRoute from "./level/route";
import * as placementSubmitRoute from "./placement/[runId]/submit/route";
import * as placementRoute from "./placement/route";
import * as placementStartRoute from "./placement/start/route";
import * as promptRoute from "./prompt/route";
import * as quotaRoute from "./quota/route";
import * as evaluateRoute from "./sessions/[id]/evaluate/route";
import * as sessionDraftRoute from "./sessions/[id]/draft/route";
import * as sessionRoute from "./sessions/[id]/route";
import * as sessionsRoute from "./sessions/route";

function readMaxDuration(routeModule: object): unknown {
  return Object.fromEntries(Object.entries(routeModule)).maxDuration;
}

const AI_ROUTE_MODULES = [
  {
    path: "src/app/api/prompt/route.ts",
    module: promptRoute,
  },
  {
    path: "src/app/api/sessions/[id]/evaluate/route.ts",
    module: evaluateRoute,
  },
  {
    path: "src/app/api/placement/start/route.ts",
    module: placementStartRoute,
  },
  {
    path: "src/app/api/placement/[runId]/submit/route.ts",
    module: placementSubmitRoute,
  },
] as const;

describe("ai routes", () => {
  it("export that duration", () => {
    expect(AI_ROUTE_MAX_DURATION).toBe(120);
    const literal = new RegExp(
      `export const maxDuration = ${AI_ROUTE_MAX_DURATION}\\b`,
    );
    for (const route of AI_ROUTE_MODULES) {
      const source = readFileSync(join(process.cwd(), route.path), "utf8");
      expect(source).toMatch(literal);
      expect(readMaxDuration(route.module)).toBe(AI_ROUTE_MAX_DURATION);
    }
  });

  it("leave quota, level, sessions, and placement GET without maxDuration", () => {
    const routes = [
      quotaRoute,
      levelRoute,
      levelUndoRoute,
      sessionsRoute,
      sessionRoute,
      sessionDraftRoute,
      placementRoute,
    ];
    for (const routeModule of routes) {
      expect(readMaxDuration(routeModule)).toBeUndefined();
    }
  });
});
