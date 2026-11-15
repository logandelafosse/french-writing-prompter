import { test, expect } from "./support/fixtures";
import { expectNoAxeViolations } from "./support/axe";
import { captureEvidence } from "./support/evidence";

async function setLevelB1(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Select your level" }).click();
  await page.getByRole("button", { name: "B1 Seuil" }).click();
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
  await page.getByRole("menuitemradio", { name: /C1 · Autonome/ }).focus();
  await page.keyboard.press("Enter");
  await expect(chip).toContainText("C1");

  await chip.click();
  await page.keyboard.press("Escape");
  await expect(chip).toBeFocused();
  await captureEvidence(page, testInfo, "level-menu");

  await expectNoAxeViolations(page, []);
});
