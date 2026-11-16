import { test, expect } from "./support/fixtures";
import { expectNoAxeViolations } from "./support/axe";
import { captureEvidence } from "./support/evidence";
import { expectEvaluationWithScores } from "./support/home-helpers";
import {
  generateFirstPrompt,
  mainContent,
  PROMPT_FIXTURE_LAFAYETTE,
} from "./support/prompt-helpers";

const mixedWriting = "Maintenant je vas au bayou. Les enfant jouent.";
const unlocatedWriting = "je vas au bayou. Les enfant jouent.";

async function submitWriting(
  page: import("@playwright/test").Page,
  text: string,
) {
  const main = mainContent(page);
  await main.getByLabel("Ton texte").fill(text);
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
    const card = page.getByRole("article").filter({ hasText: "Les enfant" });
    await expect(card).toBeVisible();

    await card.getByRole("button", { name: "Compris" }).click();
    await expect(card.getByRole("button", { name: "Compris" })).toHaveCount(0);
    await expect(card).toContainText("Les enfant");
    await expect(page.getByRole("link", { name: "faute 3" })).toBeVisible();
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
});

test.describe("review @390", () => {
  test.use({ viewport: { width: 390, height: 900 } });

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

    await captureEvidence(page, testInfo, "mobile-review");
    await expectNoAxeViolations(page);
  });
});
