import { test, expect } from "./support/fixtures";
import { expectNoAxeViolations } from "./support/axe";
import { captureEvidence } from "./support/evidence";
import { setLevelB1 } from "./support/header-helpers";
import { seedFocusWeaknesses } from "./support/focus-seed";
import {
  PROMPT_FIXTURE_LAFAYETTE,
  mainContent,
} from "./support/prompt-helpers";

const INLINE_NAMES =
  "infinitif ou participe (\u2011er / \u2011é) · imparfait ou passé composé";
const HERO_FIRST = "Infinitif ou participe (\u2011er / \u2011é)";
const HERO_SECOND = "Imparfait ou passé composé";
const REASON =
  "C'est ce qui est revenu le plus dans tes dernières évaluations. La consigne va t'y faire travailler.";

test("new learner sees no Focus line", async ({ page }, testInfo) => {
  await page.goto("/");
  const main = mainContent(page);
  await expect(main.getByText(/Bienvenue/)).toBeVisible();
  await expect(main.getByRole("region", { name: "Focus du jour" })).toHaveCount(
    0,
  );
  await expectNoAxeViolations(page);
  await captureEvidence(page, testInfo, "empty-focus");
});

test.describe("focus line @1280", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("inline names before generate stay above the prompt", async ({
    page,
  }, testInfo) => {
    await seedFocusWeaknesses();
    await page.goto("/");
    await setLevelB1(page);
    const main = mainContent(page);
    await expect(
      main.getByRole("region", { name: "Focus du jour" }),
    ).toBeVisible();
    await expect(main.getByText(INLINE_NAMES)).toBeVisible();
    await expectNoAxeViolations(page);
    await captureEvidence(page, testInfo, "inline-before-prompt");

    await main.getByRole("button", { name: "Donne-moi une consigne" }).click();
    const prompt = main.getByText(PROMPT_FIXTURE_LAFAYETTE);
    await expect(prompt).toBeVisible();
    await expect(prompt).toHaveCSS("opacity", "1");
    await expect(
      main.getByRole("region", { name: "Focus du jour" }),
    ).toBeVisible();
    await expect(main.getByText(INLINE_NAMES)).toBeVisible();
    await expectNoAxeViolations(page);
    await captureEvidence(page, testInfo, "inline-after-prompt");
  });
});

test.describe("focus line @390", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true });

  test("hero before generate becomes stacked above the prompt", async ({
    page,
  }, testInfo) => {
    await seedFocusWeaknesses();
    await page.goto("/");
    await setLevelB1(page);
    const main = mainContent(page);
    await expect(
      main.getByRole("region", { name: "Focus du jour" }),
    ).toBeVisible();
    await expect(main.getByText(HERO_FIRST)).toBeVisible();
    await expect(main.getByText(HERO_SECOND)).toBeVisible();
    await expect(main.getByText(REASON)).toBeVisible();
    await expect(
      main.getByRole("link", { name: "Changer de focus dans le Carnet" }),
    ).toBeVisible();
    await expectNoAxeViolations(page);
    await captureEvidence(page, testInfo, "hero-before-prompt");

    await main.getByRole("button", { name: "Donne-moi une consigne" }).click();
    const prompt = main.getByText(PROMPT_FIXTURE_LAFAYETTE);
    await expect(prompt).toBeVisible();
    await expect(prompt).toHaveCSS("opacity", "1");
    await expect(
      main.getByRole("region", { name: "Focus du jour" }),
    ).toBeVisible();
    await expect(main.getByText(INLINE_NAMES)).toBeVisible();
    await expect(main.getByText(REASON)).toHaveCount(0);
    await expectNoAxeViolations(page);
    await captureEvidence(page, testInfo, "stacked-after-prompt");
  });
});
