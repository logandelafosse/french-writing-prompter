import { expect, type Locator, type Page } from "@playwright/test";
import { mainContent } from "./prompt-helpers";

/** Exact accessible name — avoids substring clash with review "Consigne et ton texte". */
export function writingField(scope: Page | Locator): Locator {
  return scope.getByRole("textbox", { name: "Ton texte", exact: true });
}

function requireBox(
  box: { y: number; height: number } | null,
  label: string,
): { y: number; height: number } {
  if (box === null) {
    throw new Error(`${label} missing`);
  }
  return box;
}

/** Draft status sits on its own line under the visible word count. */
export async function expectDraftStatusOnItsOwnLine(page: Page) {
  const main = mainContent(page);
  const count = main.getByText(/\d+ \/ \d+–\d+ mots/).filter({ visible: true });
  const status = main.getByText(/Brouillon sauvé à/).filter({ visible: true });
  await expect(status).toBeVisible();
  const countBox = requireBox(await count.boundingBox(), "word count");
  const statusBox = requireBox(await status.boundingBox(), "draft status");
  expect(statusBox.y).toBeGreaterThanOrEqual(countBox.y + countBox.height - 1);
}

/** @390 px: full-width meter track and submit footer sit below the writing sheet. */
export async function expectMobileWritingFooterBelowSheet(page: Page) {
  const main = mainContent(page);
  const area = writingField(main);
  const submit = main
    .getByRole("button", { name: "Corrige-moi" })
    .filter({ visible: true });

  await expect(area).toBeVisible();
  await expect(submit).toBeVisible();

  const layout = await area.evaluate((textarea) => {
    const sheet = textarea.closest('[class*="focus-within:border-primary"]');
    const mainEl = textarea.closest("main");
    if (!sheet || !mainEl) {
      return null;
    }
    const submitButton = [...mainEl.querySelectorAll("button")].find(
      (b) =>
        b.textContent?.includes("Corrige-moi") && b.getClientRects().length > 0,
    );
    if (!submitButton) {
      return null;
    }
    let node: Element | null = submitButton;
    let footerRoot: Element | null = null;
    while (node && node !== mainEl) {
      if (node instanceof HTMLElement && node.className.includes("px-2")) {
        footerRoot = node;
        break;
      }
      node = node.parentElement;
    }
    const track = footerRoot?.querySelector("[aria-hidden='true']");
    const sheetRect = sheet.getBoundingClientRect();
    const footerRect = footerRoot?.getBoundingClientRect();
    const trackRect = track?.getBoundingClientRect();
    const mainRect = mainEl.getBoundingClientRect();
    const footerWidth = footerRect?.width ?? 0;
    return {
      sheetBottom: sheetRect.bottom,
      footerTop: footerRect?.top ?? 0,
      trackWidth: trackRect?.width ?? 0,
      footerWidth,
      mainWidth: mainRect.width,
    };
  });

  expect(layout).not.toBeNull();
  expect(layout!.footerTop).toBeGreaterThanOrEqual(layout!.sheetBottom - 1);
  expect(layout!.trackWidth).toBeGreaterThan(layout!.footerWidth * 0.92);
  expect(layout!.footerWidth).toBeGreaterThan(layout!.mainWidth * 0.85);
}
