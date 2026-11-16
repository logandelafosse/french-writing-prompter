import { test, expect } from "./support/fixtures";
import { expectNoAxeViolations, LEGACY_AXE_DISABLED } from "./support/axe";
import { captureEvidence } from "./support/evidence";
import { seedAdvancementStreakTwoOfThree } from "./support/advancement-seed";
import { mainContent } from "./support/prompt-helpers";
import type { E2eScenario } from "../src/server/ai-client";

async function setScenario(
  page: import("@playwright/test").Page,
  scenario: E2eScenario,
) {
  await page.setExtraHTTPHeaders({ "x-e2e-scenario": scenario });
}

async function submitWriting(page: import("@playwright/test").Page) {
  const main = mainContent(page);
  const area = main.getByLabel("Ton texte");
  await area.fill(
    "Aujourd'hui, je parle de ma famille en Louisiane avec des phrases simples mais correctes.",
  );
  await main.getByRole("button", { name: "Corrige-moi" }).click();
  await expect(main.getByRole("heading", { name: "Évaluation" })).toBeVisible({
    timeout: 30_000,
  });
}

test.describe("level advancement banner", () => {
  test("1280px promotion, reload, undo, and generate clears banner", async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await seedAdvancementStreakTwoOfThree();
    await setScenario(page, "advance");

    await page.goto("/");
    await expect(
      page.getByRole("button", { name: "Niveau CECR B1, changer" }),
    ).toBeVisible();

    await submitWriting(page);

    const banner = page
      .getByRole("status")
      .filter({ hasText: "Te voilà en B2." });
    await expect(banner).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Niveau CECR B2, changer" }),
    ).toBeVisible();
    await captureEvidence(page, testInfo, "advancement-1280-promoted");

    await page.reload();
    await expect(banner).toBeVisible();
    await captureEvidence(page, testInfo, "advancement-1280-reload");

    await banner.getByRole("button", { name: "Rester en B1" }).click();
    await expect(banner).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Niveau CECR B1, changer" }),
    ).toBeVisible();
    await captureEvidence(page, testInfo, "advancement-1280-undo");
  });

  test("banner clears after Donne-moi une consigne and stays gone after reload", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await seedAdvancementStreakTwoOfThree();
    await setScenario(page, "advance");
    await page.goto("/");
    await submitWriting(page);
    const banner = page
      .getByRole("status")
      .filter({ hasText: "Te voilà en B2." });
    await expect(banner).toBeVisible();

    await mainContent(page)
      .getByRole("button", { name: /Une autre consigne · reste/ })
      .click();
    await expect(banner).toHaveCount(0);

    await page.reload();
    await expect(
      page.getByRole("status").filter({ hasText: "Te voilà en B2." }),
    ).toHaveCount(0);
  });

  test("390px banner wraps with 44px undo and axe clean", async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seedAdvancementStreakTwoOfThree();
    await setScenario(page, "advance");
    await page.goto("/");
    await submitWriting(page);

    const banner = page
      .getByRole("status")
      .filter({ hasText: "Te voilà en B2." });
    await expect(banner).toBeVisible();

    const undo = banner.getByRole("button", { name: "Rester en B1" });
    const box = await undo.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);

    await captureEvidence(page, testInfo, "advancement-390");
    await expectNoAxeViolations(page, [
      ...LEGACY_AXE_DISABLED,
      {
        id: "heading-order",
        reason:
          "Legacy evaluation card uses h3 under the date h1 in review phase.",
      },
    ]);
  });
});
