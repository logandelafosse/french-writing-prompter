import { test, expect } from "./support/fixtures";
import { captureEvidence } from "./support/evidence";
import { setLevelB1, visibleHeaderQuota } from "./support/header-helpers";

test.describe("mobile header", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true });

  test("two rows with compact quota and no tagline", async ({
    page,
    scenario,
  }, testInfo) => {
    await scenario("happy");
    await page.goto("/");
    await setLevelB1(page);

    await expect(
      page.getByText("atelier d'écriture · français louisianais"),
    ).toBeHidden();
    await expect(visibleHeaderQuota(page, "Reste 3 sur 3")).toBeVisible();
    await captureEvidence(page, testInfo, "header-mobile");
  });
});

test.describe("desktop header", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("single-row layout with wordmark, quota update after generate", async ({
    page,
    scenario,
  }, testInfo) => {
    await scenario("happy");
    await page.goto("/");
    await setLevelB1(page);

    await expect(
      page.getByText("atelier d'écriture · français louisianais"),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Historique" })).toBeVisible();
    await expect(
      visibleHeaderQuota(page, "Reste 3 consignes sur 3"),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Niveau CECR B1, changer" }),
    ).toBeVisible();
    await captureEvidence(page, testInfo, "header-ready");

    await page.getByRole("button", { name: "Generate a prompt" }).click();
    await expect(
      visibleHeaderQuota(page, "Reste 2 consignes sur 3"),
    ).toBeVisible();
    await captureEvidence(page, testInfo, "header-after-generate");
  });
});

test("first run shows intro quota and no level chip", async ({ page }) => {
  await page.goto("/");
  await expect(
    visibleHeaderQuota(page, "3 consignes aujourd'hui"),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /Niveau CECR/ })).toHaveCount(
    0,
  );
});
