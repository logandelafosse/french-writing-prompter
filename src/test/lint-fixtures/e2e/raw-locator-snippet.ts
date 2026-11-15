import { test } from "@playwright/test";

test("probe", async ({ page }) => {
  await page.locator(".foo").click();
});
