import { z } from "zod";
import { CefrLevel } from "./cefr";
import { LevelChangeDto, QuotaGetResponse } from "./api";

export const TodayActiveSession = z.object({
  id: z.number(),
  prompt: z.string(),
  meta: z.null(),
  draft: z.null(),
});

export type TodayActiveSession = z.infer<typeof TodayActiveSession>;

export const TodayGetResponse = z.strictObject({
  level: CefrLevel.nullable(),
  levelName: z.string().nullable(),
  quota: QuotaGetResponse,
  focus: z.array(z.string()),
  activeSession: TodayActiveSession.nullable(),
  advancement: LevelChangeDto.nullable(),
});

export type TodayGetDto = z.infer<typeof TodayGetResponse>;

export type ResolvedHomePhase =
  | { kind: "A0-first-run" }
  | { kind: "A-ready" }
  | {
      kind: "B-writing";
      sessionId: number;
      promptText: string;
    };

export function resolveHomePhase(bootstrap: TodayGetDto): ResolvedHomePhase {
  if (bootstrap.level === null) {
    return { kind: "A0-first-run" };
  }
  if (bootstrap.activeSession !== null) {
    return {
      kind: "B-writing",
      sessionId: bootstrap.activeSession.id,
      promptText: bootstrap.activeSession.prompt,
    };
  }
  return { kind: "A-ready" };
}
