import { z } from "zod";

function isRemoteDatabaseUrl(url: string): boolean {
  const colon = url.indexOf(":");
  if (colon <= 0) {
    return false;
  }
  const scheme = url.slice(0, colon).toLowerCase();
  return scheme === "libsql" || scheme === "https";
}

const EnvSchema = z
  .object({
    OPENAI_API_KEY: z.string().optional(),
    DATABASE_URL: z.string().default("file:./data.db"),
    AI_CLIENT: z.enum(["openai", "fake"]).default("openai"),
    VITEST: z.string().optional(),
    APP_TIME_ZONE: z.string().optional(),
    DLF_LEXICON_PATH: z.string().optional(),
    LIBSQL_AUTH_TOKEN: z.string().optional(),
    VERCEL: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.AI_CLIENT === "openai" &&
      (data.OPENAI_API_KEY === undefined || data.OPENAI_API_KEY.length === 0)
    ) {
      ctx.addIssue({
        code: "custom",
        message: "OPENAI_API_KEY is required when AI_CLIENT is openai",
        path: ["OPENAI_API_KEY"],
      });
    }

    if (data.VERCEL === "1") {
      if (!isRemoteDatabaseUrl(data.DATABASE_URL)) {
        ctx.addIssue({
          code: "custom",
          message: "DATABASE_URL must use libsql: or https: when VERCEL=1",
          path: ["DATABASE_URL"],
        });
      }

      if (
        data.LIBSQL_AUTH_TOKEN === undefined ||
        data.LIBSQL_AUTH_TOKEN.length === 0
      ) {
        ctx.addIssue({
          code: "custom",
          message: "LIBSQL_AUTH_TOKEN is required when VERCEL=1",
          path: ["LIBSQL_AUTH_TOKEN"],
        });
      }

      if (data.APP_TIME_ZONE === undefined || data.APP_TIME_ZONE.length === 0) {
        ctx.addIssue({
          code: "custom",
          message: "APP_TIME_ZONE is required when VERCEL=1",
          path: ["APP_TIME_ZONE"],
        });
      }
    }
  });

type AppEnv = z.infer<typeof EnvSchema>;

export class EnvError extends Error {
  readonly variableNames: string[];

  constructor(variableNames: string[], message: string) {
    super(message);
    this.name = "EnvError";
    this.variableNames = variableNames;
  }
}

let cached: AppEnv | undefined;

export function getEnv(): AppEnv {
  if (cached) return cached;

  const parsed = EnvSchema.safeParse({
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    DATABASE_URL: process.env.DATABASE_URL,
    AI_CLIENT: process.env.AI_CLIENT,
    VITEST: process.env.VITEST,
    APP_TIME_ZONE: process.env.APP_TIME_ZONE,
    DLF_LEXICON_PATH: process.env.DLF_LEXICON_PATH,
    LIBSQL_AUTH_TOKEN: process.env.LIBSQL_AUTH_TOKEN,
    VERCEL: process.env.VERCEL,
  });

  if (!parsed.success) {
    const names = [
      ...new Set(parsed.error.issues.map((issue) => String(issue.path[0]))),
    ];
    throw new EnvError(names, z.prettifyError(parsed.error));
  }

  if (parsed.data.VITEST && parsed.data.DATABASE_URL !== ":memory:") {
    throw new Error(
      `Refusing to open ${parsed.data.DATABASE_URL} under Vitest`,
    );
  }

  cached = parsed.data;
  return cached;
}

export function clearEnvCache(): void {
  cached = undefined;
}
