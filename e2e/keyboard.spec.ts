import { type Page } from "@playwright/test";
import { test, expect } from "./support/fixtures";
import { expectEvaluationWithScores } from "./support/home-helpers";
import { generateFirstPrompt, mainContent } from "./support/prompt-helpers";
import { homeCopy } from "../src/copy/fr";
import { reviewCopy } from "../src/copy/review";

const mixedWriting = "Maintenant je vas au bayou. Les enfant jouent.";
const dialectWriting =
  "Mon petit cousin a tombé dans la boue. Les enfant jouent.";
const fortyWords = Array.from({ length: 40 }, (_, index) => `mot${index}`).join(
  " ",
);

test("Escape closes the level menu and swap confirm and returns focus", async ({
  page,
  scenario,
}) => {
  await scenario("happy");
  await generateFirstPrompt(page);

  const chip = page.getByRole("button", { name: /Niveau CECR B1, changer/ });
  await chip.click();
  await expect(page.getByRole("menu")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(chip).toBeFocused();

  const swap = mainContent(page).getByRole("button", {
    name: homeCopy.swapPrompt,
    exact: true,
  });
  await page
    .getByRole("textbox", { name: "Ton texte", exact: true })
    .fill(fortyWords);
  await swap.click();
  const confirm = mainContent(page).getByRole("alertdialog", {
    name: homeCopy.swapDialogLabel,
  });
  await expect(confirm).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(confirm).toHaveCount(0);
  await expect(swap).toBeFocused();
});

test("Escape closes the Dialect Note sheet, traps Tab, and returns focus", async ({
  page,
  scenario,
}) => {
  await scenario("dialect");
  await generateFirstPrompt(page);
  await page
    .getByRole("textbox", { name: "Ton texte", exact: true })
    .fill(dialectWriting);
  await mainContent(page)
    .getByRole("button", { name: homeCopy.submit })
    .click();
  await expectEvaluationWithScores(page);

  const confirmDialect = page.getByRole("button", {
    name: reviewCopy.actionConfirm,
  });
  await confirmDialect.click();
  const sheet = page.getByRole("dialog", { name: reviewCopy.sheetTitle });
  await expect(sheet).toBeVisible();
  const close = sheet.getByRole("button", { name: reviewCopy.sheetClose });
  await close.focus();
  for (let i = 0; i < 8; i += 1) {
    await page.keyboard.press("Tab");
    await expect
      .poll(async () =>
        sheet.evaluate(
          (node) =>
            node.contains(document.activeElement) ||
            document.activeElement?.hasAttribute("data-base-ui-focus-guard") ===
              true,
        ),
      )
      .toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(sheet).toHaveCount(0);
  await expect(confirmDialect).toBeFocused();
});

test("Compris moves focus to the next open card", async ({
  page,
  scenario,
}) => {
  await scenario("happy");
  await generateFirstPrompt(page);
  await page
    .getByRole("textbox", { name: "Ton texte", exact: true })
    .fill(mixedWriting);
  await mainContent(page)
    .getByRole("button", { name: homeCopy.submit })
    .click();
  await expectEvaluationWithScores(page);

  const mistake = page.getByRole("article").filter({ hasText: "Les enfant" });
  await mistake.getByRole("button", { name: reviewCopy.actionAck }).click();
  await expect(
    mistake.getByRole("button", { name: reviewCopy.actionAck }),
  ).toHaveCount(0);
  const next = page.getByRole("article").filter({ hasText: "Maintenant" });
  await expect(next).toBeFocused();
});

test("keyboard focus shows a 2px primary outline", async ({
  page,
  scenario,
}) => {
  await scenario("happy");
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: homeCopy.generate }),
  ).toBeVisible();

  const failures = await collectFocusOutlineFailures(page);
  expect(failures).toEqual([]);
});

async function collectFocusOutlineFailures(page: Page) {
  await page.keyboard.press("Tab");
  const seen = new Set<string>();
  const failures: string[] = [];
  for (let i = 0; i < 24; i += 1) {
    const info = await page.evaluate(() => {
      const el = document.activeElement;
      if (!(el instanceof HTMLElement) || el === document.body) {
        return { id: "body", ok: true, label: "body" };
      }
      const label =
        el.getAttribute("aria-label") ??
        el.textContent?.trim().slice(0, 40) ??
        el.tagName;
      const style = getComputedStyle(el);
      const self =
        style.outlineStyle !== "none" &&
        Number.parseFloat(style.outlineWidth) >= 2;
      let ancestor = false;
      let node: HTMLElement | null = el.parentElement;
      while (node && !ancestor) {
        const parent = getComputedStyle(node);
        ancestor =
          parent.outlineStyle !== "none" &&
          Number.parseFloat(parent.outlineWidth) >= 2;
        node = node.parentElement;
      }
      return {
        id: `${el.tagName}:${label}`,
        ok: self || ancestor,
        label,
      };
    });
    if (seen.has(info.id)) break;
    seen.add(info.id);
    if (!info.ok) failures.push(info.label);
    await page.keyboard.press("Tab");
  }
  return failures;
}
