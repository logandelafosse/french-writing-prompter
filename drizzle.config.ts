import { defineConfig } from "drizzle-kit";

const url = process.env.DATABASE_URL ?? "file:./data.db";
const authToken = process.env.LIBSQL_AUTH_TOKEN;

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "turso",
  dbCredentials:
    authToken !== undefined && authToken.length > 0
      ? { url, authToken }
      : { url },
});
