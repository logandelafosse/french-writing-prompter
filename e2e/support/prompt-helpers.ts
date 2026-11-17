import { expect, type Locator, type Page } from "@playwright/test";
import { setLevelB1 } from "./header-helpers";

/** Snippet from `prompt-generator.valid.json` (fake AI happy path). */
export const PROMPT_FIXTURE_LAFAYETTE = "Lafayette";

/** Snippet from `prompt-generator.swap.json` (second generate in a session). */
export const PROMPT_FIXTURE_SWAP_NO = "La Nouvelle-Orléans";

export function mainContent(page: Page) {
  return page.getByRole("main");
}

export async function generateFirstPrompt(page: Page) {
  await page.goto("/");
  await setLevelB1(page);
  const main = mainContent(page);
  const generate = main.getByRole("button", { name: "Donne-moi une consigne" });
  await generate.click();
  await expect(
    main.getByRole("button", { name: "Je cherche une consigne…" }),
  ).toBeDisabled();
  const prompt = main.getByText(PROMPT_FIXTURE_LAFAYETTE);
  await expect(prompt).toBeVisible();
  await expect(prompt).toHaveCSS("opacity", "1");
}

async function verticalBounds(locator: Locator) {
  const box = await locator.boundingBox();
  const top = box?.y ?? 0;
  return { top, bottom: top + (box?.height ?? 0) };
}

export async function expectMetaStacksAboveSwap(page: Page) {
  const main = mainContent(page);
  const meta = main.getByText(/250–300 mots · familier/);
  const swap = main.getByRole("button", { name: "↻ Une autre consigne" });
  await expect(meta).toBeVisible();
  await expect(swap).toBeVisible();
  const metaBox = await verticalBounds(meta);
  const swapBox = await verticalBounds(swap);
  expect(swapBox.top).toBeGreaterThan(metaBox.top + 4);
}

export async function expectNoHorizontalOverflow(page: Page) {
  const overflows = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  );
  expect(overflows).toBe(false);
}
