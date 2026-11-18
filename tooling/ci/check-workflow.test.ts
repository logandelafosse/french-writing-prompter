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

function jobEnvEntries(body: string): string[] {
  const lines = body.split("\n");
  const start = lines.findIndex((line) => /^ {4}env:\s*(?:#.*)?$/.test(line));
  if (start < 0) {
    return [];
  }
  const entries: string[] = [];
  for (const line of lines.slice(start + 1)) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) {
      continue;
    }
    if (!line.startsWith("      ")) {
      break;
    }
    entries.push(trimmed);
  }
  return entries;
}

function npmCiStepLines(body: string): string[] {
  const lines = body.split("\n");
  const start = lines.findIndex((line) => /^ {6}- run: npm ci\s*$/.test(line));
  if (start < 0) {
    return [];
  }
  const step = [lines[start] ?? ""];
  for (const line of lines.slice(start + 1)) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) {
      step.push(line);
      continue;
    }
    if (/^ {6}- /.test(line) || /^ {0,4}\S/.test(line)) {
      break;
    }
    step.push(line);
  }
  return step;
}

function lefthookValues(lines: string[]): string[] {
  const values: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) {
      continue;
    }
    const match = /(?:^|-\s+)LEFTHOOK:\s*(\S+)/.exec(trimmed);
    const value = match?.[1];
    if (value !== undefined) {
      values.push(value);
    }
  }
  return values;
}

type WorkflowStep = { name: string; run: string; uses: string };

function workflowSteps(source: string): WorkflowStep[] {
  const steps: WorkflowStep[] = [];
  let current: WorkflowStep | undefined;
  let field: keyof WorkflowStep | undefined;

  for (const line of source.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("#")) {
      continue;
    }
    const item = /^ {6}- (.*)$/.exec(line);
    if (item) {
      current = { name: "", run: "", uses: "" };
      steps.push(current);
      field = undefined;
      const inline = /^(name|run|uses):\s*(.*)$/.exec(item[1] ?? "");
      if (
        inline?.[1] === "name" ||
        inline?.[1] === "run" ||
        inline?.[1] === "uses"
      ) {
        field = inline[1];
        current[field] = inline[2] ?? "";
      }
      continue;
    }
    if (current === undefined) {
      continue;
    }
    if (/^ {0,4}\S/.test(line)) {
      current = undefined;
      field = undefined;
      continue;
    }
    const nested = /^ {8}(.*)$/.exec(line);
    if (nested === null) {
      continue;
    }
    const text = nested[1] ?? "";
    const key = /^(name|run|uses):\s*(.*)$/.exec(text);
    if (key?.[1] === "name" || key?.[1] === "run" || key?.[1] === "uses") {
      field = key[1];
      current[field] = key[2] ?? "";
      continue;
    }
    if (field !== undefined) {
      current[field] = `${current[field]}\n${text}`;
    }
  }
  return steps;
}

function stepInvokesVercel(step: WorkflowStep): boolean {
  if (/vercel/i.test(step.name) || /vercel/i.test(step.uses)) {
    return true;
  }
  return /(?:^|[\s;&|`(])(?:npx\s+)?vercel(?:@\S+)?\b/i.test(step.run);
}

function workflowProblems(source: string): string[] {
  const problems: string[] = [];
  if (source.includes("VERCEL_TOKEN")) {
    problems.push("VERCEL_TOKEN");
  }
  for (const step of workflowSteps(source)) {
    if (stepInvokesVercel(step)) {
      const label = step.name || step.run || step.uses;
      problems.push(label);
    }
  }
  return problems;
}

describe("check workflow", () => {
  it.each(["check", "e2e"])(
    "sets an uncommented LEFTHOOK 0 env on %s and npm ci does not override it",
    (jobName) => {
      const body = jobBody(jobName);
      const lines = body.split("\n");
      const envAt = lines.findIndex((line) =>
        /^ {4}env:\s*(?:#.*)?$/.test(line),
      );
      const stepsAt = lines.findIndex((line) => line === "    steps:");
      const npmCiAt = lines.findIndex((line) =>
        /^ {6}- run: npm ci\s*$/.test(line),
      );

      expect(body).not.toBe("");
      expect(envAt).toBeGreaterThanOrEqual(0);
      expect(stepsAt).toBeGreaterThan(envAt);
      expect(npmCiAt).toBeGreaterThan(stepsAt);
      expect(jobEnvEntries(body)).toContain('LEFTHOOK: "0"');
      for (const value of lefthookValues(npmCiStepLines(body))) {
        expect(value).toBe('"0"');
      }
    },
  );

  it("does not run the Vercel CLI or read VERCEL_TOKEN", () => {
    expect(workflowProblems(workflow)).toEqual([]);
  });

  it("publishes docs-only from the check job after detecting a push diff", () => {
    const body = jobBody("check");
    expect(body).toMatch(
      /outputs:\n {6}docs-only: \$\{\{ steps\.docs-only\.outputs\.docs-only \}\}/,
    );
    expect(body).toMatch(/id: docs-only\n {8}if: github\.event_name == 'push'/);
    expect(body).toMatch(
      /npx tsx tooling\/ci\/docs-only-cli\.ts --github-output/,
    );
  });

  it("skips e2e only when the check job reports a docs-only push", () => {
    const body = jobBody("e2e");
    expect(body).toMatch(/^ {4}needs: check$/m);
    expect(body).toMatch(
      /if: \$\{\{ needs\.check\.outputs\.docs-only != 'true' \}\}/,
    );
    expect(body).not.toMatch(/github\.event_name == 'pull_request'/);
  });

  it("does not treat a comment as the LEFTHOOK env", () => {
    const body = [
      "    env:",
      '      # LEFTHOOK: "0"',
      "    steps:",
      "      - run: npm ci",
    ].join("\n");
    expect(jobEnvEntries(body)).toEqual([]);
  });

  it("sees an npm ci step that overrides LEFTHOOK", () => {
    const body = [
      "    env:",
      '      LEFTHOOK: "0"',
      "    steps:",
      "      - run: npm ci",
      "        env:",
      '          LEFTHOOK: "1"',
    ].join("\n");
    expect(lefthookValues(npmCiStepLines(body))).toEqual(['"1"']);
  });

  it.each([
    [
      "npx vercel@latest deploy",
      "jobs:\n  check:\n    steps:\n      - run: npx vercel@latest deploy\n",
    ],
    ["vercel pull", "jobs:\n  check:\n    steps:\n      - run: vercel pull\n"],
    [
      "Vercel Deploy",
      "jobs:\n  check:\n    steps:\n      - name: Vercel Deploy\n        run: echo ship\n",
    ],
    ["VERCEL_TOKEN", "env:\n  VERCEL_TOKEN: secret\n"],
  ])("rejects %s", (_label, sample) => {
    expect(workflowProblems(sample).length).toBeGreaterThan(0);
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
