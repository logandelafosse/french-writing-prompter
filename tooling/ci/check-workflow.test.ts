import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import playwrightConfig from "../../playwright.config";

const workflow = readFileSync(
  path.resolve(import.meta.dirname, "../../.github/workflows/check.yml"),
  "utf8",
);

function jobBody(jobName: string): string {
  const marker = `\n  ${jobName}:\n`;
  const start = workflow.indexOf(marker);
  if (start < 0) {
    return "";
  }
  const rest = workflow.slice(start + marker.length);
  const nextJob = rest.search(/\n  [A-Za-z0-9_-]+:\n/);
  return nextJob === -1 ? rest : rest.slice(0, nextJob);
}

describe("check workflow", () => {
  it.each(["check", "e2e"])(
    "sets LEFTHOOK to 0 on %s before npm ci",
    (jobName) => {
      const body = jobBody(jobName);
      const lefthookAt = body.indexOf('LEFTHOOK: "0"');
      const stepsAt = body.indexOf("\n    steps:\n");
      const npmCiAt = body.search(/^[ \t]+- run: npm ci[ \t]*$/m);

      expect(body).not.toBe("");
      expect(lefthookAt).toBeGreaterThanOrEqual(0);
      expect(stepsAt).toBeGreaterThan(lefthookAt);
      expect(npmCiAt).toBeGreaterThan(stepsAt);
    },
  );

  it("does not run vercel deploy or read VERCEL_TOKEN", () => {
    expect(workflow).not.toContain("vercel deploy");
    expect(workflow).not.toContain("VERCEL_TOKEN");
    expect(workflow).not.toMatch(/^[ \t]*(?:- )?uses:.*vercel/im);
    expect(workflow).not.toMatch(/^[ \t]*- run:.*\bvercel\b/im);
  });
});

function localWebServer(config: typeof playwrightConfig) {
  const webServer = config.webServer;
  if (webServer === undefined || Array.isArray(webServer)) {
    throw new Error("Playwright must start one local webServer");
  }
  return webServer;
}

describe("playwright local server", () => {
  it("uses 127.0.0.1:3100 and the e2e database file", () => {
    expect(playwrightConfig.use?.baseURL).toBe("http://127.0.0.1:3100");

    const webServer = localWebServer(playwrightConfig);
    expect(webServer.url).toBe("http://127.0.0.1:3100");
    expect(webServer.command).toContain("DATABASE_URL=file:./.e2e/e2e.db");
    expect(webServer.command).not.toContain("libsql:");
  });
});
