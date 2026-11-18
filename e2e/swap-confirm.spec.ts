import { test, expect } from "./support/fixtures";
import { expectNoAxeViolations } from "./support/axe";
import { captureEvidence } from "./support/evidence";
import { visibleHeaderQuota, setLevelB1 } from "./support/header-helpers";
import { writingField } from "./support/writing-helpers";
import {
  expectNoHorizontalOverflow,
  generateFirstPrompt,
  mainContent,
  PROMPT_FIXTURE_LAFAYETTE,
  PROMPT_FIXTURE_SWAP_NO,
} from "./support/prompt-helpers";

const fortyWords = Array.from({ length: 40 }, (_, index) => `mot${index}`).join(
  " ",
);

test.describe("swap confirm @1280", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("asks before leaving a draft and keeps it on Escape", async ({
    page,
    scenario,
  }, testInfo) => {
    await scenario("happy");
    await generateFirstPrompt(page);
    const main = mainContent(page);
    await expect(visibleHeaderQuota(page, /Reste 2/)).toBeVisible();
    const area = writingField(main);
    await area.fill(fortyWords);
    await main
      .getByRole("button", { name: "↻ Une autre consigne", exact: true })
      .click();

    const dialog = main.getByRole("alertdialog", {
      name: "Changer de consigne",
    });
    await expect(dialog).toContainText(
      "Ton brouillon de 40 mots va rester dans l'Historique.",
    );
    await expect(
      dialog.getByRole("button", { name: "Garder celle-là" }),
    ).toBeFocused();
    await captureEvidence(page, testInfo, "swap-dialog-1280");

    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(
      main.getByRole("button", { name: "↻ Une autre consigne", exact: true }),
    ).toBeFocused();
    await expect(main.getByText(PROMPT_FIXTURE_LAFAYETTE)).toBeVisible();
    await expect(area).toHaveValue(fortyWords);

    await main
      .getByRole("button", { name: "↻ Une autre consigne", exact: true })
      .click();
    await main.getByRole("button", { name: "Changer", exact: true }).click();
    await expect(main.getByText(PROMPT_FIXTURE_SWAP_NO)).toBeVisible();
    await expect(writingField(main)).toHaveValue("");
    await expect(visibleHeaderQuota(page, /Reste 1/)).toBeVisible();
    await captureEvidence(page, testInfo, "after-swap-1280");
  });

  test("swaps an empty textarea without a dialog", async ({
    page,
    scenario,
  }) => {
    await scenario("happy");
    await generateFirstPrompt(page);
    const main = mainContent(page);
    await main
      .getByRole("button", { name: "↻ Une autre consigne", exact: true })
      .click();
    await expect(
      main.getByRole("alertdialog", { name: "Changer de consigne" }),
    ).toHaveCount(0);
    await expect(main.getByText(PROMPT_FIXTURE_SWAP_NO)).toBeVisible();
    await expect(writingField(main)).toHaveValue("");
  });
});

test.describe("swap confirm @390", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("dialog fits and stays accessible", async ({
    page,
    scenario,
  }, testInfo) => {
    await scenario("happy");
    await page.goto("/");
    await setLevelB1(page);
    await mainContent(page)
      .getByRole("button", { name: "Donne-moi une consigne" })
      .click();
    await expect(
      mainContent(page).getByText(PROMPT_FIXTURE_LAFAYETTE),
    ).toBeVisible();
    const main = mainContent(page);
    await writingField(main).fill(fortyWords);
    await main
      .getByRole("button", { name: "↻ Une autre consigne", exact: true })
      .click();
    await expect(
      main.getByRole("alertdialog", { name: "Changer de consigne" }),
    ).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await captureEvidence(page, testInfo, "swap-dialog-390");
    await expectNoAxeViolations(page);
  });
});
