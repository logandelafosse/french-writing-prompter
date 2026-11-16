import { test, expect } from "./support/fixtures";
import { expectNoAxeViolations, LEGACY_AXE_DISABLED } from "./support/axe";
import { captureEvidence } from "./support/evidence";
import { arrowToLevelInOpenMenu, setLevelB1 } from "./support/header-helpers";

test("level chip menu works with keyboard and passes axe", async ({
  page,
  scenario,
}, testInfo) => {
  await scenario("happy");
  await page.goto("/");
  await setLevelB1(page);

  const chip = page.getByRole("button", { name: "Niveau CECR B1, changer" });
  await chip.click();
  await expect(page.getByRole("menu")).toBeVisible();
  await arrowToLevelInOpenMenu(page, /C1 · Autonome/);
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "Niveau CECR C1, changer" }),
  ).toBeVisible();
  await expect(page.getByRole("main").getByText(/C1/)).toHaveCount(2);

  await page.getByRole("button", { name: "Niveau CECR C1, changer" }).click();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Niveau CECR C1, changer" }),
  ).toBeFocused();
  await expect(page.getByRole("menu")).toHaveCount(0);
  await captureEvidence(page, testInfo, "level-menu");

  await expectNoAxeViolations(page, LEGACY_AXE_DISABLED);
});
