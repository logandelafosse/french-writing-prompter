import { z } from "zod";

const EnvSchema = z
  .object({
    OPENAI_API_KEY: z.string().optional(),
    DATABASE_URL: z.string().default("file:./data.db"),
    AI_CLIENT: z.enum(["openai", "fake"]).default("openai"),
    VITEST: z.string().optional(),
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
