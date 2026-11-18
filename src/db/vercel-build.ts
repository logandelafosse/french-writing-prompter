import { z } from "zod";

const VERCEL_DATABASE_URL_MESSAGE =
  "DATABASE_URL must use libsql: or https: for the Vercel build";

function isRemoteDatabaseUrl(url: string): boolean {
  const colon = url.indexOf(":");
  if (colon <= 0) {
    return false;
  }
  const scheme = url.slice(0, colon).toLowerCase();
  return scheme === "libsql" || scheme === "https";
}

const VercelDatabaseUrl = z.string().refine(isRemoteDatabaseUrl, {
  message: VERCEL_DATABASE_URL_MESSAGE,
});

export async function runVercelBuild(options: {
  databaseUrl: string | undefined;
  migrate: (databaseUrl: string) => Promise<unknown>;
}): Promise<void> {
  const parsed = VercelDatabaseUrl.safeParse(options.databaseUrl);
  if (!parsed.success) {
    throw new Error(VERCEL_DATABASE_URL_MESSAGE);
  }
  await options.migrate(parsed.data);
}
