import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";

export function visibleHeaderQuota(page: Page, text: string | RegExp) {
  return page.getByRole("banner").getByText(text).filter({ visible: true });
}

export async function expectTwoMobileHeaderRows(page: Page) {
  const banner = page.getByRole("banner");
  await expect(async () => {
    const rowCount = await banner.evaluate((el) => el.children.length);
    expect(rowCount).toBe(2);
  }).toPass();

  const wordmark = banner.getByRole("heading", { level: 1 });
  const chip = banner.getByRole("button", { name: /Niveau CECR/ });
  const nav = banner.getByRole("link", { name: "Historique" });
  const quota = banner.getByText(/Reste \d sur 3/).filter({ visible: true });

  const boxY = async (locator: Locator) => {
    const box = await locator.boundingBox();
    return box?.y ?? 0;
  };

  const row1Y = Math.min(await boxY(wordmark), await boxY(chip));
  const row2Y = Math.min(await boxY(nav), await boxY(quota));

  expect(Math.abs((await boxY(wordmark)) - (await boxY(chip)))).toBeLessThan(
    12,
  );
  expect(Math.abs((await boxY(nav)) - (await boxY(quota)))).toBeLessThan(20);
  expect(row2Y).toBeGreaterThan(row1Y + 8);
}

export async function setLevelB1(page: Page) {
  const chip = page.getByRole("button", { name: "Niveau CECR B1, changer" });
  if ((await chip.count()) > 0) {
    await expect(chip).toBeVisible();
    return;
  }

  await page.request.put("/api/level", {
    headers: {
      "Content-Type": "application/json",
      "x-e2e-scenario": "happy",
    },
    data: { level: "B1" },
  });
  await page.reload();
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
