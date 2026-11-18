import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { runVercelBuild } from "@/db/vercel-build";
import { parseJson } from "@/lib/json";

const root = path.resolve(import.meta.dirname, "../..");

function recordingMigrate(
  invoked: string[],
): (databaseUrl: string) => Promise<void> {
  return (databaseUrl) => {
    invoked.push(databaseUrl);
    return Promise.resolve();
  };
}

describe("build:vercel", () => {
  it("refuses a file DATABASE_URL", async () => {
    const invoked: string[] = [];
    const migrate = recordingMigrate(invoked);

    await expect(
      runVercelBuild({
        databaseUrl: "file:./data.db",
        migrate,
      }),
    ).rejects.toThrow(
      "DATABASE_URL must use libsql: or https: for the Vercel build",
    );

    await expect(
      runVercelBuild({
        databaseUrl: undefined,
        migrate,
      }),
    ).rejects.toThrow(
      "DATABASE_URL must use libsql: or https: for the Vercel build",
    );

    expect(invoked).toEqual([]);
  });

  it("calls migrate for a libsql URL", async () => {
    const invoked: string[] = [];
    const migrate = recordingMigrate(invoked);

    await runVercelBuild({
      databaseUrl: "libsql://consigne.turso.io",
      migrate,
    });

    expect(invoked).toEqual(["libsql://consigne.turso.io"]);
  });

  it("calls migrate for an https URL", async () => {
    const invoked: string[] = [];
    const migrate = recordingMigrate(invoked);

    await runVercelBuild({
      databaseUrl: "https://consigne.turso.io",
      migrate,
    });

    expect(invoked).toEqual(["https://consigne.turso.io"]);
  });
});

const PackageScripts = z.object({
  scripts: z.object({
    build: z.string(),
    "build:vercel": z.string(),
    predev: z.string(),
    prestart: z.string(),
    "db:migrate": z.string(),
  }),
});

const VercelConfig = z
  .object({
    buildCommand: z.literal("npm run build:vercel"),
    regions: z.tuple([z.literal("cle1")]),
  })
  .strict();

describe("vercel deploy config", () => {
  it("keeps npm run build as next build and Playwright on the file database", () => {
    const pkg = parseJson(
      PackageScripts,
      readFileSync(path.join(root, "package.json"), "utf8"),
    );
    if (!pkg.ok) {
      throw new Error("package.json scripts were unreadable");
    }

    expect(pkg.value.scripts.build).toBe("next build");
    expect(pkg.value.scripts["build:vercel"]).toBe(
      "tsx scripts/build-vercel.ts && next build",
    );
    expect(pkg.value.scripts.predev).toBe("tsx scripts/migrate.ts");
    expect(pkg.value.scripts.prestart).toBe("tsx scripts/migrate.ts");
    expect(pkg.value.scripts["db:migrate"]).toBe("tsx scripts/migrate.ts");

    const playwright = readFileSync(
      path.join(root, "playwright.config.ts"),
      "utf8",
    );
    expect(playwright).toContain('const DATABASE_URL = "file:./.e2e/e2e.db"');
    expect(playwright).toContain("AI_CLIENT=fake");
    expect(playwright).toContain("npm run build");
    expect(playwright).not.toContain("build:vercel");

    const migrate = readFileSync(path.join(root, "scripts/migrate.ts"), "utf8");
    expect(migrate).toMatch(/DATABASE_URL \?\? "file:\.\/data\.db"/);
    expect(migrate).toContain("migrateWithBackup");
    expect(migrate).not.toContain("for the Vercel build");

    const wrapper = readFileSync(
      path.join(root, "scripts/build-vercel.ts"),
      "utf8",
    );
    expect(wrapper).toContain("runVercelBuild");
    expect(wrapper).toContain("migrateDatabase");
  });

  it("points Vercel at the migrate build in cle1", () => {
    const config = parseJson(
      VercelConfig,
      readFileSync(path.join(root, "vercel.json"), "utf8"),
    );
    if (!config.ok) {
      throw new Error("vercel.json did not match the deploy contract");
    }
    expect(config.value).toEqual({
      buildCommand: "npm run build:vercel",
      regions: ["cle1"],
    });
  });

  it("points the README at the deploy plan", () => {
    const readme = readFileSync(path.join(root, "README.md"), "utf8");
    expect(readme).not.toContain("vercel.com/new");
    expect(readme).not.toContain("create-next-app");
    expect(readme).toContain("docs/plan/vercel-deployment.md");
  });
});
