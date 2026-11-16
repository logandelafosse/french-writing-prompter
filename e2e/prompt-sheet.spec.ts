import { test, expect } from "./support/fixtures";
import { expectNoAxeViolations } from "./support/axe";
import { captureEvidence } from "./support/evidence";
import {
  PROMPT_FIXTURE_LAFAYETTE,
  PROMPT_FIXTURE_SWAP_NO,
  generateFirstPrompt,
  expectMetaStacksAboveSwap,
  expectNoHorizontalOverflow,
  mainContent,
} from "./support/prompt-helpers";

test.describe("prompt sheet @1280", () => {
  test.use({ viewport: { width: 1280, height: 860 } });

  test("label, meta line and generate busy state", async ({
    page,
    scenario,
  }, testInfo) => {
    await scenario("happy");
    await generateFirstPrompt(page);
    const main = mainContent(page);
    await expect(main.getByText(/consigne d'écriture/i)).toBeVisible();
    await expect(main.getByText(/récit ·/)).toBeVisible();
    await expect(main.getByText(/250–300 mots · familier/)).toBeVisible();
    const prompt = main.getByText(PROMPT_FIXTURE_LAFAYETTE);
    await expect(prompt).toBeVisible();
    await expect(prompt).toHaveCSS("opacity", "1");
    await captureEvidence(page, testInfo, "desktop-prompt-sheet");
    await expectNoAxeViolations(page);
  });
});

test.describe("prompt sheet @390", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("meta and swap stack; prompt fits viewport", async ({
    page,
    scenario,
  }, testInfo) => {
    await scenario("happy");
    await generateFirstPrompt(page);
    const main = mainContent(page);
    await expect(main.getByText(/récit ·/)).toBeVisible();
    await expect(main.getByText(/250–300 mots · familier/)).toBeVisible();
    await expectMetaStacksAboveSwap(page);
    const prompt = main.getByText(PROMPT_FIXTURE_LAFAYETTE);
    const box = await prompt.boundingBox();
    expect(box?.width ?? 999).toBeLessThanOrEqual(390);
    await expectNoHorizontalOverflow(page);
    await captureEvidence(page, testInfo, "mobile-prompt-sheet");
    await expectNoAxeViolations(page);
  });
});

test("swap shows a different prompt while loading", async ({
  page,
  scenario,
}) => {
  await scenario("happy");
  await generateFirstPrompt(page);
  const main = mainContent(page);
  const swap = main.getByRole("button", { name: "↻ Une autre consigne" });
  await swap.click();
  await expect(
    main.getByRole("button", { name: "Je cherche une consigne…" }),
  ).toBeVisible();
  await expect(
    main.getByRole("button", { name: "Je cherche une consigne…" }),
  ).toBeDisabled();
  await expect(main.getByText(PROMPT_FIXTURE_SWAP_NO)).toBeVisible();
  await expect(main.getByText(PROMPT_FIXTURE_LAFAYETTE)).toHaveCount(0);
});

test("reduced motion shows prompt fully opaque immediately", async ({
  page,
  scenario,
}) => {
  await scenario("happy");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await generateFirstPrompt(page);
  const prompt = mainContent(page).getByText(PROMPT_FIXTURE_LAFAYETTE);
  await expect(prompt).toBeVisible();
  const opacity = await prompt.evaluate(
    (el) => window.getComputedStyle(el).opacity,
  );
  expect(opacity).toBe("1");
});
