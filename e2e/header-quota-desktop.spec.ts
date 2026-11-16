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
