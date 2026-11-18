import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { z } from "zod";
import { parseJson } from "@/lib/json";
import {
  assertIssueMatchesTicket,
  parseGithubIssueNumber,
} from "../tooling/sync-ticket-issues/parse";

// Usage: npx tsx scripts/sync-ticket-issues.ts T06 [T13f ...]
// Each ticket file must declare `GitHub issue: #<n>` near the top.
const REPO = "logandelafosse/french-writing-prompter";
const DIR = "docs/plan/tickets";
const BLOB = `https://github.com/${REPO}/blob/main/${DIR}`;

const IssueView = z.object({
  number: z.number().int().positive(),
  title: z.string(),
  isPullRequest: z.boolean(),
  body: z.string(),
});

const gh = (...a: string[]) =>
  execFileSync("gh", a, { encoding: "utf8" }).trim();

function viewIssue(n: number) {
  const raw = gh(
    "issue",
    "view",
    String(n),
    "--repo",
    REPO,
    "--json",
    "number,title,isPullRequest,body",
  );
  const parsed = parseJson(IssueView, raw);
  if (!parsed.ok) {
    throw new Error(`gh issue view #${n} returned unusable JSON`);
  }
  return parsed.value;
}

function syncOne(id: string) {
  const file = readdirSync(DIR).find((f) => f.startsWith(`${id}-`));
  if (!file) {
    throw new Error(`No ticket file starting with ${id}- in ${DIR}`);
  }
  const text = readFileSync(`${DIR}/${file}`, "utf8");
  const issueNumber = parseGithubIssueNumber(text);
  const meta = viewIssue(issueNumber);
  assertIssueMatchesTicket({ ...meta, number: issueNumber }, id);

  const [, ...rest] = text.split("\n");
  const head = meta.body.split("\n> Canonical spec:")[0]?.trimEnd() ?? "";
  const body = `${head}\n\n> Canonical spec: [${DIR}/${file}](${BLOB}/${file})\n\n${rest.join("\n").trim()}`;
  writeFileSync(".ticket-issue-body.tmp.md", body);
  gh(
    "issue",
    "edit",
    String(issueNumber),
    "--repo",
    REPO,
    "--body-file",
    ".ticket-issue-body.tmp.md",
  );
  console.log(`synced ${id} -> #${issueNumber}`);
}

const ids = process.argv.slice(2);
if (ids.length === 0) {
  console.error("Usage: npx tsx scripts/sync-ticket-issues.ts T06 [T13f ...]");
  process.exit(1);
}
for (const id of ids) {
  syncOne(id);
}
