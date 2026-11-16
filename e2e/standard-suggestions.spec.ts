import { test, expect } from "./support/fixtures";
import { expectNoAxeViolations } from "./support/axe";
import { captureEvidence } from "./support/evidence";
import { expectEvaluationWithScores } from "./support/home-helpers";
import { generateFirstPrompt, mainContent } from "./support/prompt-helpers";

const writing = "J'arrive avec ma voiture. Les enfant jouent.";
const explanation =
  "« Voiture », c'est correct. Par icitte, on dit plus souvent « char ».";

async function submitStandardWriting(page: import("@playwright/test").Page) {
  const main = mainContent(page);
  await main.getByLabel("Ton texte").fill(writing);
  await main.getByRole("button", { name: "Corrige-moi" }).click();
  await expectEvaluationWithScores(page);
}

async function expectStandardMarkAndCard(
  page: import("@playwright/test").Page,
) {
  await expect(
    page.getByRole("link", { name: "français standard 1" }),
  ).toBeVisible();
  await expect(page.getByText("(français standard 1)")).toBeAttached();

  const card = page.getByRole("article").filter({ hasText: "ma voiture" });
  await expect(card).toBeVisible();
  await expect(card).toContainText("Français standard");
  await expect(card).toContainText("ma voiture");
  await expect(card).toContainText("→");
  await expect(card).toContainText("mon char");
  await expect(card).toContainText(explanation);
  await expect(card.getByRole("button", { name: "Compris" })).toHaveCount(1);
  await expect(
    card.getByRole("button", { name: "C'est du français louisianais" }),
  ).toHaveCount(0);

  await expect(
    page.getByText("1 faute · 1 en français standard"),
  ).toBeVisible();
  await expect(page.getByText("2 fautes")).toHaveCount(0);
}

test.describe("standard suggestions @1280", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  // eslint-disable-next-line playwright/expect-expect -- reason: assertions live in expectStandardMarkAndCard and expectNoAxeViolations
  test("dashed mark, outlined marker, and standard card", async ({
    page,
    scenario,
  }, testInfo) => {
    await scenario("standard");
    await generateFirstPrompt(page);
    await submitStandardWriting(page);
    await expectStandardMarkAndCard(page);
    await captureEvidence(page, testInfo, "desktop-standard-open");
    await expectNoAxeViolations(page);
  });

  test("marker 1 moves focus to the standard card", async ({
    page,
    scenario,
  }) => {
    await scenario("standard");
    await generateFirstPrompt(page);
    await submitStandardWriting(page);

    await page.getByRole("link", { name: "français standard 1" }).click();
    await expect(page).toHaveURL(/#correction-1$/);
    const card = page.getByRole("article").filter({ hasText: "ma voiture" });
    await expect(card).toBeFocused();
  });

  test("Compris collapses the card and survives reload", async ({
    page,
    scenario,
  }, testInfo) => {
    await scenario("standard");
    await generateFirstPrompt(page);
    await submitStandardWriting(page);

    const card = page.getByRole("article").filter({ hasText: "ma voiture" });
    const next = page.getByRole("article").filter({ hasText: "Les enfant" });
    const patched = page.waitForResponse(
      (response) =>
        response.url().includes("/api/corrections/") &&
        response.request().method() === "PATCH",
    );
    await card.getByRole("button", { name: "Compris" }).click();
    await patched;
    await expect(card.getByRole("button", { name: "Compris" })).toHaveCount(0);
    await expect(card).toContainText("ma voiture");
    await expect(card).not.toContainText("mon char");
    await expect(next).toBeFocused();
    await expect(
      page.getByRole("link", { name: "français standard 1" }),
    ).toBeVisible();
    await captureEvidence(page, testInfo, "desktop-standard-collapsed");
    await expectNoAxeViolations(page);

    await page.reload();
    await expectEvaluationWithScores(page);
    const restored = page
      .getByRole("article")
      .filter({ hasText: "ma voiture" });
    await expect(restored.getByRole("button", { name: "Compris" })).toHaveCount(
      0,
    );
    await expect(
      page.getByRole("link", { name: "français standard 1" }),
    ).toBeVisible();
    await expect(restored).toContainText("ma voiture");
    await expect(restored).not.toContainText("mon char");
  });
});

test.describe("standard suggestions @390", () => {
  test.use({
    viewport: { width: 390, height: 900 },
    isMobile: true,
    hasTouch: true,
  });

  test("standard mark and card stack under the text", async ({
    page,
    scenario,
  }, testInfo) => {
    await scenario("standard");
    await generateFirstPrompt(page);
    await submitStandardWriting(page);
    await expectStandardMarkAndCard(page);

    const sheet = page.getByRole("region", { name: "Consigne et ton texte" });
    const region = page.getByRole("region", { name: "Corrections" });
    const sheetBox = await sheet.boundingBox();
    const regionBox = await region.boundingBox();
    expect(regionBox?.y ?? -1).toBeGreaterThan(sheetBox?.y ?? 99999);

    await captureEvidence(page, testInfo, "mobile-standard-open");
    await expectNoAxeViolations(page);
  });
});
