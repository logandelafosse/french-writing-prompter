import { z } from "zod";

export const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

export const CefrLevel = z.enum(CEFR_LEVELS);
export type CefrLevel = z.infer<typeof CefrLevel>;

export const LevelSource = z.enum(["auto", "manual", "placement", "undo"]);
export type LevelSource = z.infer<typeof LevelSource>;

export const CEFR_ORDER: Record<CefrLevel, number> = Object.fromEntries(
  CEFR_LEVELS.map((level, index) => [level, index]),
) as Record<CefrLevel, number>;

export function parseCefrLevel(text: string | null): CefrLevel | null {
  if (text === null) return null;
  const parsed = CefrLevel.safeParse(text);
  return parsed.success ? parsed.data : null;
}

/** French CEFR short names for menus and chips (implementation-map §5). */
export const CEFR_UI_LABELS: Record<CefrLevel, string> = {
  A1: "Découverte",
  A2: "Survie",
  B1: "Seuil",
  B2: "Avancé",
  C1: "Autonome",
  C2: "Maîtrise",
};
