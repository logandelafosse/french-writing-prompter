import { test, expect } from "./support/fixtures";
import { expectEvaluationWithScores } from "./support/home-helpers";
import { generateFirstPrompt, mainContent } from "./support/prompt-helpers";
import { captureEvidence } from "./support/evidence";
import { writingField } from "./support/writing-helpers";

async function submitWriting(
  page: import("@playwright/test").Page,
  text: string,
) {
  const main = mainContent(page);
  await writingField(main).fill(text);
  await main.getByRole("button", { name: "Corrige-moi" }).click();
  await expectEvaluationWithScores(page);
}

test.describe("DLF badge @1280", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("Maintenant to Asteur shows the DLF badge", async ({
    page,
    scenario,
  }, testInfo) => {
    await scenario("happy");
    await generateFirstPrompt(page);
    await submitWriting(page, "Maintenant je vas au bayou. Les enfant jouent.");
    const card = page.getByRole("article").filter({ hasText: "Maintenant" });
    await expect(card.getByTitle("Dictionary of Louisiana French")).toHaveText(
      "DLF",
    );
    await captureEvidence(page, testInfo, "desktop-dlf-badge");
  });

  test("unattested standard suggestion shows no DLF badge", async ({
    page,
    scenario,
  }) => {
    await scenario("standard");
    await generateFirstPrompt(page);
    await submitWriting(page, "J'arrive avec ma voiture. Les enfant jouent.");
    const card = page.getByRole("article").filter({ hasText: "ma voiture" });
    await expect(card).toContainText("mon char");
    await expect(card.getByTitle("Dictionary of Louisiana French")).toHaveCount(
      0,
    );
  });
});

test.describe("DLF badge @390", () => {
  test.use({
    viewport: { width: 390, height: 900 },
    isMobile: true,
    hasTouch: true,
  });

  test("Maintenant to Asteur shows the DLF badge", async ({
    page,
    scenario,
  }, testInfo) => {
    await scenario("happy");
    await generateFirstPrompt(page);
    await submitWriting(page, "Maintenant je vas au bayou. Les enfant jouent.");
    const card = page.getByRole("article").filter({ hasText: "Maintenant" });
    await expect(card.getByTitle("Dictionary of Louisiana French")).toHaveText(
      "DLF",
    );
    await captureEvidence(page, testInfo, "mobile-dlf-badge");
  });

  test("unattested standard suggestion shows no DLF badge", async ({
    page,
    scenario,
  }) => {
    await scenario("standard");
    await generateFirstPrompt(page);
    await submitWriting(page, "J'arrive avec ma voiture. Les enfant jouent.");
    const card = page.getByRole("article").filter({ hasText: "ma voiture" });
    await expect(card).toContainText("mon char");
    await expect(card.getByTitle("Dictionary of Louisiana French")).toHaveCount(
      0,
    );
  });
});
