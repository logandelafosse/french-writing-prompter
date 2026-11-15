import { execSync } from "node:child_process";

const DATABASE_URL = "file:./.e2e/e2e.db";

export default function globalSetup(): void {
  execSync("npx tsx scripts/e2e-prepare.ts", {
    cwd: process.cwd(),
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL,
      AI_CLIENT: "fake",
      OPENAI_API_KEY: "",
    },
  });
}
