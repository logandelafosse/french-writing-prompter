import { test, expect } from "./support/fixtures";
import { captureEvidence } from "./support/evidence";

function visibleHeaderQuota(
  page: import("@playwright/test").Page,
  text: string,
) {
  return page.getByRole("banner").getByText(text).filter({ visible: true });
}

async function setLevelB1(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Select your level" }).click();
  await page.getByRole("button", { name: "B1 Seuil" }).click();
  await expect(
    page.getByRole("button", { name: "Niveau CECR B1, changer" }),
  ).toBeVisible();
}

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

test("first run shows intro quota and no level chip", async ({ page }) => {
  await page.goto("/");
  await expect(
    visibleHeaderQuota(page, "3 consignes aujourd'hui"),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /Niveau CECR/ })).toHaveCount(
    0,
  );
});
