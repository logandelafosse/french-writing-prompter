import type { LearnerDialectNote } from "@/contracts/dialect-note";
import type { FrenchDialect } from "@/contracts/prompt";
import { getDlfIndex } from "@/modules/dlf/load";
import type { DlfIndex } from "@/modules/dlf/lookup";
import { listActiveNotes } from "./dialect-notes-store";
import { DEFAULT_DIALECT } from "./louisiana-rules";

export type LearnerDialectContext = {
  dialect: FrenchDialect;
  notes?: readonly LearnerDialectNote[];
  dlf: DlfIndex;
};

export async function loadLearnerDialectContext(): Promise<LearnerDialectContext> {
  return {
    dialect: DEFAULT_DIALECT,
    notes: await listActiveNotes(),
    dlf: getDlfIndex(),
  };
}
