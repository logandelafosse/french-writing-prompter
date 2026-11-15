import type { CefrLevel } from "@/contracts/cefr";

/** French CEFR short names for menus and chips (implementation-map §5). */
export const CEFR_UI_LABELS: Record<CefrLevel, string> = {
  A1: "Découverte",
  A2: "Survie",
  B1: "Seuil",
  B2: "Avancé",
  C1: "Autonome",
  C2: "Maîtrise",
};
