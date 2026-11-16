import { expect, type Page } from "@playwright/test";
import { mainContent } from "./prompt-helpers";

/** @390 px: full-width meter track and submit footer sit below the writing sheet. */
export async function expectMobileWritingFooterBelowSheet(page: Page) {
  const main = mainContent(page);
  const area = main.getByLabel("Ton texte");
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
