import { test, expect } from "./support/fixtures";
import { expectNoAxeViolations } from "./support/axe";
import { captureEvidence } from "./support/evidence";
import { expectEvaluationWithScores } from "./support/home-helpers";
import {
  generateFirstPrompt,
  mainContent,
  PROMPT_FIXTURE_LAFAYETTE,
  PROMPT_FIXTURE_SWAP_NO,
} from "./support/prompt-helpers";
import { reviewCopy } from "../src/copy/review";
import { writingField } from "./support/writing-helpers";

const mixedWriting = "Maintenant je vas au bayou. Les enfant jouent.";
const unlocatedWriting = "je vas au bayou. Les enfant jouent.";

async function submitWriting(
  page: import("@playwright/test").Page,
  text: string,
) {
  const main = mainContent(page);
  await writingField(main).fill(text);
  await main.getByRole("button", { name: "Corrige-moi" }).click();
  await expectEvaluationWithScores(page);
}

test.describe("review @1280", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("marks mistakes, cards sit right, summary and focus", async ({
    page,
    scenario,
  }, testInfo) => {
    await scenario("happy");
    await generateFirstPrompt(page);
    await submitWriting(page, mixedWriting);

    const sheet = page.getByRole("region", { name: "Consigne et ton texte" });
    await expect(page.getByText(PROMPT_FIXTURE_LAFAYETTE)).toBeVisible();
    await expect(sheet).toContainText("Maintenant");
    await expect(sheet).toContainText("Les enfant");
    await expect(sheet).toContainText("jouent.");
    await expect(page.getByRole("link", { name: "faute 3" })).toBeVisible();
    await expect(
      page.getByText("1 faute · 1 en français standard · 1 à vérifier"),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Évaluation" }),
    ).toBeFocused();
    await expect(
      page.getByRole("button", { name: /Scores ▸/ }),
    ).toHaveAttribute("aria-expanded", "false");

    const region = page.getByRole("region", { name: "Évaluation" });
    const sheetBox = await sheet.boundingBox();
    const regionBox = await region.boundingBox();
    expect(regionBox?.x ?? -1).toBeGreaterThan(sheetBox?.x ?? 99999);

    await captureEvidence(page, testInfo, "desktop-review");
    await expectNoAxeViolations(page);
  });

  test("marker jumps to the card and Compris collapses it", async ({
    page,
    scenario,
  }) => {
    await scenario("happy");
    await generateFirstPrompt(page);
    await submitWriting(page, mixedWriting);

    await page.getByRole("link", { name: "faute 3" }).click();
    await expect(page).toHaveURL(/#correction-3$/);
    const card = page.getByRole("article").filter({ hasText: "Les enfant" });
    await expect(card).toBeVisible();

    const patched = page.waitForResponse(
      (response) =>
        response.url().includes("/api/corrections/") &&
        response.request().method() === "PATCH",
    );
    await card.getByRole("button", { name: "Compris" }).click();
    await patched;
    await expect(card.getByRole("button", { name: "Compris" })).toHaveCount(0);
    await expect(card).toContainText("Les enfant");
    await expect(page.getByRole("link", { name: "faute 3" })).toBeVisible();
    await expect(
      page.getByRole("article").filter({ hasText: "Maintenant" }),
    ).toBeFocused();

    await page.reload();
    await expectEvaluationWithScores(page);
    const restored = page
      .getByRole("article")
      .filter({ hasText: "Les enfant" });
    await expect(restored.getByRole("button", { name: "Compris" })).toHaveCount(
      0,
    );
    await expect(page.getByRole("link", { name: "faute 3" })).toBeVisible();
  });

  test("scores open to CECR chips and a dimension popover", async ({
    page,
    scenario,
  }, testInfo) => {
    await scenario("happy");
    await generateFirstPrompt(page);
    await submitWriting(page, mixedWriting);

    const toggle = page.getByRole("button", { name: /Scores ▸/ });
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await toggle.click();
    await expect(
      page.getByRole("button", { name: /Scores ▾/ }),
    ).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByText(reviewCopy.scoresOverall("B1"))).toBeVisible();
    await expect(page.getByRole("button", { name: "Grammaire" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Vocabulaire" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Cohérence" })).toBeVisible();
    const registre = page.getByRole("button", { name: "Registre et style" });
    await expect(registre).toBeVisible();
    await expect(page.getByText("A2+").first()).toBeVisible();
    await registre.hover();
    await expect(
      page.getByText(/Adéquation du ton à la consigne/),
    ).toBeVisible();
    await expect(page.getByText("Pour monter").first()).toBeVisible();
    await captureEvidence(page, testInfo, "desktop-scores");
  });

  test("another prompt returns to writing", async ({ page, scenario }) => {
    await scenario("happy");
    await generateFirstPrompt(page);
    await submitWriting(page, mixedWriting);
    const main = mainContent(page);
    await main
      .getByRole("button", { name: /Une autre consigne · reste/ })
      .click();
    await expect(main.getByText(PROMPT_FIXTURE_SWAP_NO)).toBeVisible();
    await expect(writingField(main)).toBeEditable();
    await expect(main.getByRole("heading", { name: "Évaluation" })).toHaveCount(
      0,
    );
  });

  test("unlocatable correction is a card without a mark", async ({
    page,
    scenario,
  }) => {
    await scenario("happy");
    await generateFirstPrompt(page);
    await submitWriting(page, unlocatedWriting);
    await expect(page.getByText("Maintenant")).toBeVisible();
    await expect(page.getByRole("link", { name: /faute/ })).toHaveCount(1);
    await expect(page.getByRole("link", { name: "faute 3" })).toBeVisible();
  });

  test("Mistake cards show catalog Resource links even if the evaluator invents an id", async ({
    page,
    scenario,
  }, testInfo) => {
    await scenario("happy");
    await generateFirstPrompt(page);
    await submitWriting(page, mixedWriting);
    const mistakeCard = page
      .getByRole("article")
      .filter({ hasText: "Les enfant" });
    const grammar = mistakeCard.getByRole("link", { name: /Grammaire ·/ });
    const input = mistakeCard.getByRole("link", { name: /Input ·/ });
    await expect(grammar).toHaveCount(1);
    await expect(input).toHaveCount(1);
    await expect(grammar).toHaveAttribute("target", "_blank");
    await expect(grammar).toHaveAttribute("rel", /noopener/);
    await expect(grammar).toContainText("(nouvel onglet)");
    await expect(input).toHaveAttribute("target", "_blank");
    await expect(input).toHaveAttribute("rel", /noopener/);
    const standardCard = page
      .getByRole("article")
      .filter({ hasText: "Maintenant" });
    await expect(
      standardCard.getByRole("link", { name: /Grammaire ·/ }),
    ).toHaveCount(0);
    await expect(
      standardCard.getByRole("link", { name: /Input ·/ }),
    ).toHaveCount(0);
    await captureEvidence(page, testInfo, "review-resources-1280");
  });
});

test.describe("review @390", () => {
  test.use({
    viewport: { width: 390, height: 900 },
    isMobile: true,
    hasTouch: true,
  });

  test("stacks corrections under the text", async ({
    page,
    scenario,
  }, testInfo) => {
    await scenario("happy");
    await generateFirstPrompt(page);
    await submitWriting(page, mixedWriting);
    const main = mainContent(page);

    await expect(
      main.getByRole("heading", { level: 1, name: "Évaluation" }),
    ).toBeVisible();
    await expect(
      main.getByRole("heading", {
        level: 1,
        name: /^(Lundi|Mardi|Mercredi|Jeudi|Vendredi|Samedi|Dimanche)\b/i,
      }),
    ).toHaveCount(0);

    const sheet = page.getByRole("region", { name: "Consigne et ton texte" });
    const region = page.getByRole("region", { name: "Corrections" });
    const sheetBox = await sheet.boundingBox();
    const regionBox = await region.boundingBox();
    expect(regionBox?.y ?? -1).toBeGreaterThan(sheetBox?.y ?? 99999);

    await page.getByRole("button", { name: /Scores ▸/ }).click();
    await expect(page.getByRole("button", { name: "Grammaire" })).toBeVisible();
    const registre = page.getByRole("button", { name: "Registre et style" });
    await registre.tap();
    await expect(page.getByText("Pour monter")).toBeVisible();
    await captureEvidence(page, testInfo, "mobile-scores");
    await expectNoAxeViolations(page);
  });

  test("Mistake cards show catalog Resource links at 390", async ({
    page,
    scenario,
  }, testInfo) => {
    await scenario("happy");
    await generateFirstPrompt(page);
    await submitWriting(page, mixedWriting);
    const mistakeCard = page
      .getByRole("article")
      .filter({ hasText: "Les enfant" });
    const grammar = mistakeCard.getByRole("link", { name: /Grammaire ·/ });
    const input = mistakeCard.getByRole("link", { name: /Input ·/ });
    await expect(grammar).toHaveCount(1);
    await expect(input).toHaveCount(1);
    await expect(grammar).toHaveAttribute("target", "_blank");
    await expect(grammar).toHaveAttribute("rel", /noopener/);
    await expect(grammar).toContainText("(nouvel onglet)");
    const standardCard = page
      .getByRole("article")
      .filter({ hasText: "Maintenant" });
    await expect(
      standardCard.getByRole("link", { name: /Grammaire ·/ }),
    ).toHaveCount(0);
    await captureEvidence(page, testInfo, "review-resources-390");
  });
});
