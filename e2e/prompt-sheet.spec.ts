import { test, expect } from "./support/fixtures";
import { expectNoAxeViolations } from "./support/axe";
import { captureEvidence } from "./support/evidence";
import { setLevelB1 } from "./support/header-helpers";

const FIRST_PROMPT = "Lafayette";
const SWAP_PROMPT = "La Nouvelle-Orléans";

async function generateFirstPrompt(page: import("@playwright/test").Page) {
  await page.goto("/");
  await setLevelB1(page);
  const generate = page.getByRole("button", { name: "Donne-moi une consigne" });
  await generate.click();
  await expect(
    page.getByRole("button", { name: "Je cherche une consigne…" }),
  ).toBeDisabled();
  await expect(page.getByText(FIRST_PROMPT)).toBeVisible();
}

test.describe("prompt sheet @1280", () => {
  test.use({ viewport: { width: 1280, height: 860 } });

  test("label, meta line and generate busy state", async ({
    page,
    scenario,
  }, testInfo) => {
    await scenario("happy");
    await generateFirstPrompt(page);
    await expect(page.getByText(/consigne d'écriture/i)).toBeVisible();
    await expect(page.getByText(/récit ·/)).toBeVisible();
    await expect(page.getByText(/250–300 mots · familier/)).toBeVisible();
    const prompt = page.getByText(FIRST_PROMPT);
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
    const swap = page.getByRole("button", { name: "↻ Une autre consigne" });
    await expect(swap).toBeVisible();
    const prompt = page.getByText(FIRST_PROMPT);
    const box = await prompt.boundingBox();
    expect(box?.width ?? 999).toBeLessThanOrEqual(390);
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
  const swap = page.getByRole("button", { name: "↻ Une autre consigne" });
  await swap.click();
  await expect(
    page.getByRole("button", { name: "Je cherche une consigne…" }),
  ).toBeDisabled();
  await expect(page.getByText(SWAP_PROMPT)).toBeVisible();
  await expect(page.getByText(FIRST_PROMPT)).toHaveCount(0);
});

test("reduced motion shows prompt fully opaque immediately", async ({
  page,
  scenario,
}) => {
  await scenario("happy");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await generateFirstPrompt(page);
  const prompt = page.getByText(FIRST_PROMPT);
  await expect(prompt).toBeVisible();
  const opacity = await prompt.evaluate(
    (el) => window.getComputedStyle(el).opacity,
  );
  expect(opacity).toBe("1");
});
