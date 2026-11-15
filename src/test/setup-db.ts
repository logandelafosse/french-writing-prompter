import { db } from "@/db";
import { applyMigrations } from "@/db/migrate-run";

await applyMigrations(db);