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

  await page.getByRole("button", { name: "Niveau CECR C1, changer" }).click();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Niveau CECR C1, changer" }),
  ).toBeFocused();
  await expect(page.getByRole("menu")).toHaveCount(0);
  await captureEvidence(page, testInfo, "level-menu");

  await expectNoAxeViolations(page, LEGACY_AXE_DISABLED);
});

test("stale GET /api/level after chip PUT does not flash the previous CECR level", async ({
  page,
  scenario,
}, testInfo) => {
  await scenario("happy");
  await page.goto("/");
  await setLevelB1(page);

  let releaseGet: (() => void) | undefined;
  const heldGet = new Promise<void>((resolve) => {
    releaseGet = resolve;
  });
  await page.route("**/api/level", async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue();
      return;
    }
    await heldGet;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ level: "B1", history: [], streak: 0 }),
    });
  });

  const getStarted = page.waitForRequest(
    (req) => req.url().includes("/api/level") && req.method() === "GET",
  );
  await page.getByRole("link", { name: "Historique" }).click();
  await getStarted;

  const chip = page.getByRole("button", { name: "Niveau CECR B1, changer" });
  await expect(chip).toBeVisible();
  await chip.click();
  await page.getByRole("menuitemradio", { name: "B2 · Avancé" }).click();
  await expect(
    page.getByRole("button", { name: "Niveau CECR B2, changer" }),
  ).toBeVisible();

  const staleGet = page.waitForResponse(
    (res) =>
      res.url().includes("/api/level") && res.request().method() === "GET",
  );
  releaseGet?.();
  await staleGet;

  await expect(
    page.getByRole("button", { name: "Niveau CECR B2, changer" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Niveau CECR B1, changer" }),
  ).toHaveCount(0);
  await captureEvidence(page, testInfo, "level-chip-no-stale-flash");
});
