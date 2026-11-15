import fs from "node:fs";
import path from "node:path";
import type { Page, TestInfo } from "@playwright/test";

const counters = new Map<string, number>();

export async function captureEvidence(
  page: Page,
  testInfo: TestInfo,
  name: string,
): Promise<void> {
  const ticket = process.env.E2E_EVIDENCE;
  if (!ticket) {
    return;
  }

  const key = `${testInfo.project.name}:${testInfo.title}`;
  const next = (counters.get(key) ?? 0) + 1;
  counters.set(key, next);

  const dir = path.join(process.cwd(), "docs/evidence", ticket);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(
    dir,
    `${testInfo.project.name}-${String(next).padStart(2, "0")}-${name}.png`,
  );
  await page.screenshot({ path: file, scale: "css" });
}
