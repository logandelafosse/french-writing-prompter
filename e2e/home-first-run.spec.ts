import { test, expect } from "./support/fixtures";
import { expectNoAxeViolations } from "./support/axe";
import { captureEvidence } from "./support/evidence";
import { visibleHeaderQuota } from "./support/header-helpers";
import { expectLevelPickerSixButtons } from "./support/home-helpers";
import { PROMPT_FIXTURE_LAFAYETTE } from "./support/prompt-helpers";

const PROMPT_SNIPPET = PROMPT_FIXTURE_LAFAYETTE;

test.describe("home first run @1280", () => {
  test.use({ viewport: { width: 1280, height: 860 } });

  test("welcome, level picker, generate, header chip and quota", async ({
    page,
    scenario,
  }, testInfo) => {
    await scenario("happy");
    await page.goto("/");

    await expect(
      page.getByText(/Bienvenue\. Icitte, on écrit un petit texte par jour/),
    ).toBeVisible();
    await expectLevelPickerSixButtons(page);

    const generate = page.getByRole("button", {
      name: "Donne-moi une consigne",
    });
    await expect(generate).toBeDisabled();
    await captureEvidence(page, testInfo, "a0-desktop");

    await page.getByRole("button", { name: /B1/i }).click();
    await expect(generate).toBeEnabled();
    await generate.click();
    await expect(page.getByText(PROMPT_SNIPPET)).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Niveau CECR B1, changer" }),
    ).toBeVisible();
    await expect(
      visibleHeaderQuota(page, "Reste 2 consignes sur 3"),
    ).toBeVisible();
    await captureEvidence(page, testInfo, "b1-desktop");
    await expectNoAxeViolations(page);
  });
});

test.describe("home first run @390", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("welcome, level picker, generate, header chip and quota", async ({
    page,
    scenario,
  }, testInfo) => {
    await scenario("happy");
    await page.goto("/");

    await expect(
      page.getByText(/Bienvenue\. Icitte, on écrit un petit texte par jour/),
    ).toBeVisible();
    await expectLevelPickerSixButtons(page);
    const generate = page.getByRole("button", {
      name: "Donne-moi une consigne",
    });
    await expect(generate).toBeDisabled();
    await captureEvidence(page, testInfo, "a0-mobile");

    await page.getByRole("button", { name: /B1/i }).click();
    await expect(generate).toBeEnabled();
    await generate.click();
    await expect(page.getByText(PROMPT_SNIPPET)).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Niveau CECR B1, changer" }),
    ).toBeVisible();
    await expect(visibleHeaderQuota(page, "Reste 2 sur 3")).toBeVisible();
    await captureEvidence(page, testInfo, "b1-mobile");
    await expectNoAxeViolations(page);
  });
});
