import { test, expect } from "./support/fixtures";
import { expectNoAxeViolations, LEGACY_AXE_DISABLED } from "./support/axe";
import { captureEvidence } from "./support/evidence";

async function setLevelB1(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Select your level" }).click();
  await page.getByRole("button", { name: "B1 Seuil" }).click();
  await expect(
    page.getByRole("button", { name: "Niveau CECR B1, changer" }),
  ).toBeVisible();
}

test("level chip menu works with keyboard and passes axe", async ({
  page,
  scenario,
}, testInfo) => {
  await scenario("happy");
  await page.goto("/");
  await setLevelB1(page);

  const chip = page.getByRole("button", { name: "Niveau CECR B1, changer" });
  await chip.click();
  await page.getByRole("menuitemradio", { name: /C1 · Autonome/ }).click();
  await expect(
    page.getByRole("button", { name: "Niveau CECR C1, changer" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Niveau CECR C1, changer" }).click();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Niveau CECR C1, changer" }),
  ).toBeFocused();
  await captureEvidence(page, testInfo, "level-menu");

  await expectNoAxeViolations(page, LEGACY_AXE_DISABLED);
});
