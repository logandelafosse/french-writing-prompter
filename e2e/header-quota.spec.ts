import { test, expect } from "./support/fixtures";
import { captureEvidence } from "./support/evidence";

async function setLevelB1(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Select your level" }).click();
  await page.getByRole("button", { name: "B1 Seuil" }).click();
}

test("header shows quota copy and updates after generate without reload", async ({
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
  await expect(page.getByText("Reste 3 consignes sur 3")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Niveau CECR B1, changer" }),
  ).toBeVisible();
  await captureEvidence(page, testInfo, "header-ready");

  await page.getByRole("button", { name: "Generate a prompt" }).click();
  await expect(page.getByText("Reste 2 consignes sur 3")).toBeVisible();
  await captureEvidence(page, testInfo, "header-after-generate");
});

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
    ).toHaveCount(0);
    await expect(page.getByText("Reste 3 sur 3")).toBeVisible();
    await captureEvidence(page, testInfo, "header-mobile");
  });
});

test("first run shows intro quota and no level chip", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("3 consignes aujourd'hui")).toBeVisible();
  await expect(page.getByRole("button", { name: /Niveau CECR/ })).toHaveCount(
    0,
  );
});
