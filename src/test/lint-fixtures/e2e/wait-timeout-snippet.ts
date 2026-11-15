import { test } from "@playwright/test";

test("probe", async ({ page }) => {
  await page.waitForTimeout(500);
});
