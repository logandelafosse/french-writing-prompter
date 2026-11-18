import { migrateDatabase } from "./migrate";
import { runVercelBuild } from "../src/db/vercel-build";

runVercelBuild({
  databaseUrl: process.env.DATABASE_URL,
  migrate: migrateDatabase,
}).catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
