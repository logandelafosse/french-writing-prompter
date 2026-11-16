import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

export function visibleHeaderQuota(page: Page, text: string) {
  return page.getByRole("banner").getByText(text).filter({ visible: true });
}

export async function setLevelB1(page: Page) {
  await page.getByRole("button", { name: "Select your level" }).click();
  await page.getByRole("button", { name: "B1 Seuil" }).click();
  await expect(
    page.getByRole("button", { name: "Niveau CECR B1, changer" }),
  ).toBeVisible();
}

const CEFR_LEVELS_IN_MENU = 6;

async function isMenuItemHighlighted(
  page: Page,
  levelLabel: RegExp,
): Promise<boolean> {
  const item = page.getByRole("menuitemradio", { name: levelLabel });
  return item.evaluate((el) => el.getAttribute("data-highlighted") !== null);
}

export async function arrowToLevelInOpenMenu(
  page: Page,
  levelLabel: RegExp,
): Promise<void> {
  for (let attempt = 0; attempt < CEFR_LEVELS_IN_MENU; attempt += 1) {
    if (await isMenuItemHighlighted(page, levelLabel)) {
      return;
    }
    await page.keyboard.press("ArrowDown");
  }
  for (let attempt = 0; attempt < CEFR_LEVELS_IN_MENU; attempt += 1) {
    if (await isMenuItemHighlighted(page, levelLabel)) {
      return;
    }
    await page.keyboard.press("ArrowUp");
  }
  throw new Error(
    `Could not arrow to menu item matching ${String(levelLabel)}`,
  );
}
