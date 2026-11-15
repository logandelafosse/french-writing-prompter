import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";

// Usage: node scripts/sync-ticket-issues.mjs T06 [T07 ...] — rebuilds issue bodies from ticket files.
const REPO = "logandelafosse/french-writing-prompter";
const DIR = "docs/plan/tickets";
const BLOB = `https://github.com/${REPO}/blob/main/${DIR}`;
const gh = (...a) => execFileSync("gh", a, { encoding: "utf8" }).trim();
const issueOf = (id) => Number(id.slice(1)) + 2;

for (const id of process.argv.slice(2)) {
  const file = readdirSync(DIR).find((f) => f.startsWith(`${id}-`));
  const [, ...rest] = readFileSync(`${DIR}/${file}`, "utf8").split("\n");
  const current = gh("issue", "view", String(issueOf(id)), "--repo", REPO, "--json", "body", "--jq", ".body");
  const head = current.split("\n> Canonical spec:")[0].trimEnd();
  const body = `${head}\n\n> Canonical spec: [${DIR}/${file}](${BLOB}/${file})\n\n${rest.join("\n").trim()}`;
  writeFileSync(".ticket-issue-body.tmp.md", body);
  gh("issue", "edit", String(issueOf(id)), "--repo", REPO, "--body-file", ".ticket-issue-body.tmp.md");
  console.log(`synced ${id} -> #${issueOf(id)}`);
}
