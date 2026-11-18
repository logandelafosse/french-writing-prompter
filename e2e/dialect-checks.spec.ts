import { test, expect } from "./support/fixtures";
import { expectNoAxeViolations } from "./support/axe";
import { captureEvidence } from "./support/evidence";
import { expectEvaluationWithScores } from "./support/home-helpers";
import { generateFirstPrompt, mainContent } from "./support/prompt-helpers";
import { reviewCopy } from "../src/copy/review";
import { writingField } from "./support/writing-helpers";

const writing = "Mon petit cousin a tombé dans la boue. Les enfant jouent.";
const repeatWriting = "Il a tombé hier.";

async function submitWriting(
  page: import("@playwright/test").Page,
  text: string,
) {
  const main = mainContent(page);
  await writingField(main).fill(text);
  await main.getByRole("button", { name: "Corrige-moi" }).click();
  await expectEvaluationWithScores(page);
}

async function openDialectSheet(page: import("@playwright/test").Page) {
  const card = page.getByRole("article").filter({ hasText: "a tombé" });
  await card.getByRole("button", { name: "Oui, c'est à nous-autres" }).click();
  return page.getByRole("dialog", { name: "Ajouter une note de dialecte" });
}

function requireBottomSheetLayout(
  viewport: { width: number; height: number } | null,
  box: { x: number; y: number; width: number; height: number } | null,
) {
  if (viewport === null || box === null) {
    throw new Error("expected a full-width bottom sheet");
  }
  return { viewport, box };
}

test.describe("dialect checks @1280", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("Non, corrige-le turns the card into FAUTE and the summary gains a faute", async ({
    page,
    scenario,
  }, testInfo) => {
    await scenario("dialect");
    await generateFirstPrompt(page);
    await submitWriting(page, writing);

    await expect(
      page.getByRole("link", { name: "à vérifier 1" }),
    ).toBeVisible();
    await expect(
      page.getByText("1 faute · 1 à vérifier", { exact: true }),
    ).toBeVisible();
    const card = page.getByRole("article").filter({ hasText: "a tombé" });
    await expect(card).toContainText(reviewCopy.kindDialect);

    const patched = page.waitForResponse(
      (response) =>
        response.url().includes("/api/corrections/") &&
        response.request().method() === "PATCH",
    );
    await card.getByRole("button", { name: "Non, corrige-le" }).click();
    await patched;
    await expect(card).toContainText("Faute");
    await expect(card.getByRole("button")).toHaveCount(0);
    await expect(page.getByText("2 fautes")).toBeVisible();
    await captureEvidence(page, testInfo, "desktop-reject-faute");
  });

  test("Oui opens the sheet, traps tab, and Escape returns focus", async ({
    page,
    scenario,
  }) => {
    await scenario("dialect");
    await generateFirstPrompt(page);
    await submitWriting(page, writing);

    const confirm = page.getByRole("button", {
      name: "Oui, c'est à nous-autres",
    });
    await confirm.click();
    const dialog = page.getByRole("dialog", {
      name: "Ajouter une note de dialecte",
    });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("a tombé", { exact: true })).toBeVisible();
    await expect(dialog.getByText("est tombé", { exact: true })).toBeVisible();

    const close = dialog.getByRole("button", { name: "Fermer" });
    await close.focus();
    for (let i = 0; i < 8; i += 1) {
      await page.keyboard.press("Tab");
      await expect
        .poll(async () =>
          dialog.evaluate(
            (node) =>
              node.contains(document.activeElement) ||
              document.activeElement?.hasAttribute(
                "data-base-ui-focus-guard",
              ) === true,
          ),
        )
        .toBe(true);
    }

    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(confirm).toBeFocused();
  });

  test("saving clears the mark, shows the saved line, and persists after reload", async ({
    page,
    scenario,
  }, testInfo) => {
    await scenario("dialect");
    await generateFirstPrompt(page);
    await submitWriting(page, writing);

    const dialog = await openDialectSheet(page);
    const posted = page.waitForResponse(
      (response) =>
        response.url().includes("/api/dialect-notes") &&
        response.request().method() === "POST",
    );
    await dialog.getByRole("button", { name: "Sauver la note" }).click();
    await posted;
    await expect(page.getByText("Note de dialecte sauvée")).toBeVisible();
    await expect(page.getByRole("link", { name: "à vérifier 1" })).toHaveCount(
      0,
    );
    await expect(page.getByText("1 faute", { exact: true })).toBeVisible();
    await expect(page.getByText("1 à vérifier", { exact: true })).toHaveCount(
      0,
    );
    await captureEvidence(page, testInfo, "desktop-saved-note");

    await page.reload();
    await expectEvaluationWithScores(page);
    await expect(page.getByText("Note de dialecte sauvée")).toBeVisible();
    await expect(page.getByRole("link", { name: "à vérifier 1" })).toHaveCount(
      0,
    );
  });

  test("pushback on a Faute opens the same sheet and saving drops the faute", async ({
    page,
    scenario,
  }) => {
    await scenario("dialect");
    await generateFirstPrompt(page);
    await submitWriting(page, writing);

    const faute = page.getByRole("article").filter({ hasText: "Les enfant" });
    await faute
      .getByRole("button", { name: "C'est du français louisianais" })
      .click();
    const dialog = page.getByRole("dialog", {
      name: "Ajouter une note de dialecte",
    });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Les enfant", { exact: true })).toBeVisible();
    const posted = page.waitForResponse(
      (response) =>
        response.url().includes("/api/dialect-notes") &&
        response.request().method() === "POST",
    );
    await dialog.getByRole("button", { name: "Sauver la note" }).click();
    await posted;
    await expect(page.getByText("Note de dialecte sauvée")).toBeVisible();
    await expect(page.getByText("1 à vérifier", { exact: true })).toBeVisible();
    await expect(page.getByText("1 faute", { exact: true })).toHaveCount(0);
  });

  test("a saved form is not flagged again on the next evaluation", async ({
    page,
    scenario,
  }) => {
    await scenario("dialect");
    await generateFirstPrompt(page);
    await submitWriting(page, writing);

    const dialog = await openDialectSheet(page);
    await dialog.getByRole("button", { name: "Sauver la note" }).click();
    await expect(page.getByText("Note de dialecte sauvée")).toBeVisible();

    const main = mainContent(page);
    await main
      .getByRole("button", { name: /Une autre consigne · reste/ })
      .click();
    await expect(writingField(main)).toBeEditable();
    await submitWriting(page, repeatWriting);
    await expect(page.getByText("a tombé")).toBeVisible();
    await expect(page.getByRole("article")).toHaveCount(0);
    await expect(page.getByText("Aucune correction")).toBeVisible();
  });
});

test.describe("dialect checks @390", () => {
  test.use({
    viewport: { width: 390, height: 900 },
    isMobile: true,
    hasTouch: true,
  });

  test("Non, corrige-le turns the card into FAUTE", async ({
    page,
    scenario,
  }, testInfo) => {
    await scenario("dialect");
    await generateFirstPrompt(page);
    await submitWriting(page, writing);
    await expect(
      page.getByText("1 faute · 1 à vérifier", { exact: true }),
    ).toBeVisible();
    const card = page.getByRole("article").filter({ hasText: "a tombé" });
    await card.getByRole("button", { name: "Non, corrige-le" }).click();
    await expect(card).toContainText("Faute");
    await expect(page.getByText("2 fautes")).toBeVisible();
    await captureEvidence(page, testInfo, "mobile-reject-faute");
  });

  test("sheet is a full-width bottom sheet, reduced motion, axe clean", async ({
    page,
    scenario,
  }, testInfo) => {
    await scenario("dialect");
    await generateFirstPrompt(page);
    await submitWriting(page, writing);
    await page.emulateMedia({ reducedMotion: "reduce" });

    const confirm = page.getByRole("button", {
      name: "Oui, c'est à nous-autres",
    });
    await confirm.click();
    const dialog = page.getByRole("dialog", {
      name: "Ajouter une note de dialecte",
    });
    await expect(dialog).toBeVisible();
    await expect(dialog).not.toHaveAttribute("data-starting-style");
    await expect(async () => {
      const layout = requireBottomSheetLayout(
        page.viewportSize(),
        await dialog.boundingBox(),
      );
      expect(
        Math.abs(layout.box.width - layout.viewport.width),
      ).toBeLessThanOrEqual(2);
      expect(layout.box.x).toBeLessThanOrEqual(2);
      expect(
        Math.abs(layout.box.y + layout.box.height - layout.viewport.height),
      ).toBeLessThanOrEqual(2);
    }).toPass();
    const duration = await dialog.evaluate(
      (node) => getComputedStyle(node).transitionDuration,
    );
    expect(
      duration.split(",").every((part) => {
        const trimmed = part.trim();
        return (
          trimmed === "0s" ||
          trimmed === "0.01ms" ||
          trimmed === "1e-05s" ||
          trimmed === "0.00001s"
        );
      }),
    ).toBe(true);
    await captureEvidence(page, testInfo, "mobile-sheet-open");
    await expectNoAxeViolations(page);
  });
});
