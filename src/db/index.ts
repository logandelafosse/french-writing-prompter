import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "./schema";
import { createLibsqlClient } from "./libsql-client";
import { getEnv } from "@/server/env";

type AppDatabase = LibSQLDatabase<typeof schema>;

let dbInstance: AppDatabase | undefined;

export const db: AppDatabase = new Proxy({} as AppDatabase, {
  get(_target, prop) {
    dbInstance ??= drizzle(createLibsqlClient(getEnv().DATABASE_URL), {
      schema,
    });
    const value: unknown = Reflect.get(dbInstance, prop, dbInstance);
    if (typeof value === "function") {
      // Proxy forwards Drizzle's dynamic API; bind keeps the correct `this`.
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- Drizzle proxy forwards bound instance methods
      return value.bind(dbInstance);
    }
    return value;
  },
});
