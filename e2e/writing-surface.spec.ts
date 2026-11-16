import { test, expect } from "./support/fixtures";
import { expectNoAxeViolations } from "./support/axe";
import { captureEvidence } from "./support/evidence";
import { expectEvaluationWithScores } from "./support/home-helpers";
import {
  generateFirstPrompt,
  expectNoHorizontalOverflow,
  mainContent,
  PROMPT_FIXTURE_SWAP_NO,
} from "./support/prompt-helpers";
import { setLevelA1 } from "./support/header-helpers";
import { expectMobileWritingFooterBelowSheet } from "./support/writing-helpers";

const twelveWords =
  "un deux trois quatre cinq six sept huit neuf dix onze douze";
const fifteenWords =
  "un deux trois quatre cinq six sept huit neuf dix onze douze treize quatorze quinze";

test.describe("writing surface @1280", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("meter, growth, shortcut submit and scores", async ({
    page,
    scenario,
  }, testInfo) => {
    await scenario("happy");
    await generateFirstPrompt(page);
    const main = mainContent(page);
    const area = main.getByRole("textbox", { name: "Ton texte" });
    await expect(area).toHaveAttribute("lang", "fr");
    await area.fill(twelveWords);
    await expect(
      main.getByText("12 / 250–300 mots").filter({ visible: true }),
    ).toBeVisible();
    const initialHeight = await area.evaluate((el) => el.clientHeight);
    await area.fill(
      Array.from({ length: 20 }, () => "Ligne de texte.").join("\n"),
    );
    expect(await area.evaluate((el) => el.clientHeight)).toBeGreaterThan(
      initialHeight,
    );
    await area.fill("Mot.");
    await expect(
      main.getByRole("button", { name: "Corrige-moi" }),
    ).toBeEnabled();
    await area.fill(twelveWords);
    await captureEvidence(page, testInfo, "desktop-writing-meter");
    await expectNoAxeViolations(page);
    await area.press("Control+Enter");
    await expect(
      main.getByRole("button", { name: "Je lis ton texte…" }),
    ).toBeDisabled();
    await expect(
      main.getByRole("button", { name: "Je cherche une consigne…" }),
    ).toHaveCount(0);
    await expectEvaluationWithScores(page);
    await expect(area).toHaveCount(0);
    const sheet = main.getByRole("region", { name: "Consigne et ton texte" });
    await expect(sheet).toContainText(twelveWords);
    await expect(main.getByRole("button", { name: /Scores ▸/ })).toBeVisible();
    await expect(main.getByText("Ensemble : B1")).toBeVisible();
    await captureEvidence(page, testInfo, "desktop-writing-submit");
    await main
      .getByRole("button", { name: /Une autre consigne · reste/ })
      .click();
    await expect(main.getByText(PROMPT_FIXTURE_SWAP_NO)).toBeVisible();
    const freshArea = main.getByRole("textbox", { name: "Ton texte" });
    await expect(freshArea).toBeEditable();
    await expect(freshArea).toHaveValue("");
    await expect(
      main
        .getByRole("button", { name: "Corrige-moi" })
        .filter({ visible: true }),
    ).toBeVisible();
    await expect(main.getByRole("heading", { name: "Évaluation" })).toHaveCount(
      0,
    );
  });
});

test.describe("writing surface A1 @1280", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("A1 meter band never disables submit", async ({ page, scenario }) => {
    await scenario("happy");
    await page.goto("/");
    await setLevelA1(page);
    const main = mainContent(page);
    await main.getByRole("button", { name: "Donne-moi une consigne" }).click();
    await expect(
      main.getByText(/\/ 10–20 mots/).filter({ visible: true }),
    ).toBeVisible();
    const submit = main.getByRole("button", { name: "Corrige-moi" });
    const area = main.getByRole("textbox", { name: "Ton texte" });
    await area.fill("un");
    await expect(submit).toBeEnabled();
    await area.fill(fifteenWords);
    await expect(
      main.getByText("15 / 10–20 mots").filter({ visible: true }),
    ).toBeVisible();
    await expect(submit).toBeEnabled();
    await area.fill(Array.from({ length: 25 }, () => "mot").join(" "));
    await expect(submit).toBeEnabled();
  });
});

test.describe("writing surface @390", () => {
  test.use({ viewport: { width: 390, height: 900 } });

  test("footer below sheet without kbd hint", async ({
    page,
    scenario,
  }, testInfo) => {
    await scenario("happy");
    await generateFirstPrompt(page);
    const main = mainContent(page);
    await main.getByRole("textbox", { name: "Ton texte" }).fill(twelveWords);
    await expect(
      main.getByText("12 / 250–300 mots").filter({ visible: true }),
    ).toBeVisible();
    await expectMobileWritingFooterBelowSheet(page);
    await expect(
      main.getByText("Ctrl ↵").filter({ visible: true }),
    ).toHaveCount(0);
    await expect(main.getByText("⌘ ↵").filter({ visible: true })).toHaveCount(
      0,
    );
    await expectNoHorizontalOverflow(page);
    await captureEvidence(page, testInfo, "mobile-writing-surface");
    await expectNoAxeViolations(page);
  });
});
