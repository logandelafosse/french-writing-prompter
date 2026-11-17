import { test, expect } from "./support/fixtures";
import { expectNoAxeViolations } from "./support/axe";
import { captureEvidence } from "./support/evidence";
import { expectEvaluationWithScores } from "./support/home-helpers";
import { visibleHeaderQuota } from "./support/header-helpers";
import {
  expectNoHorizontalOverflow,
  generateFirstPrompt,
  mainContent,
  PROMPT_FIXTURE_LAFAYETTE,
} from "./support/prompt-helpers";

const writing =
  "Hier, je me suis promené dans mon quartier. J'ai vu des voisins.";

const aiUnavailable = {
  status: 502,
  contentType: "application/json",
  body: JSON.stringify({
    error: { code: "AI_UNAVAILABLE", message: "fail" },
  }),
};

async function expectTouchTarget(locator: {
  boundingBox: () => Promise<{ height: number } | null>;
}) {
  const box = await locator.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
}

test.describe("errors @1280", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("evaluation 502 keeps the text and retry shows the Evaluation", async ({
    page,
    scenario,
  }, testInfo) => {
    await scenario("happy");
    await generateFirstPrompt(page);
    const main = mainContent(page);
    const area = main.getByLabel("Ton texte");
    await area.fill(writing);

    let fail = true;
    await page.route("**/api/sessions/*/evaluate", async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }
      if (fail) {
        fail = false;
        await route.fulfill(aiUnavailable);
        return;
      }
      await route.continue();
    });

    await main.getByRole("button", { name: "Corrige-moi" }).click();
    const alert = main.getByRole("alert");
    await expect(alert).toContainText("J'ai pas pu lire ton texte ce coup-ci.");
    await expect(area).toHaveValue(writing);
    await captureEvidence(page, testInfo, "evaluate-error-1280");

    await alert.getByRole("button", { name: "Essayer encore" }).click();
    await expectEvaluationWithScores(page);
  });

  test("generation 502 leaves quota unchanged and retry succeeds", async ({
    page,
    scenario,
  }, testInfo) => {
    await scenario("happy");
    await page.goto("/");
    await page.getByRole("button", { name: /B1/i }).click();
    const quota = visibleHeaderQuota(page, /3 consignes/);
    await expect(quota).toBeVisible();
    const before = await quota.innerText();

    let fail = true;
    await page.route("**/api/prompt", async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }
      if (fail) {
        fail = false;
        await route.fulfill(aiUnavailable);
        return;
      }
      await route.continue();
    });

    await mainContent(page)
      .getByRole("button", { name: "Donne-moi une consigne" })
      .click();
    const alert = mainContent(page).getByRole("alert");
    await expect(alert).toContainText(
      "J'ai pas pu trouver de consigne ce coup-ci.",
    );
    await expect(quota).toHaveText(before);
    await captureEvidence(page, testInfo, "generate-error-1280");

    await alert.getByRole("button", { name: "Essayer encore" }).click();
    await expect(
      mainContent(page).getByText(PROMPT_FIXTURE_LAFAYETTE),
    ).toBeVisible();
  });
});

test.describe("errors @390", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("alert wraps without horizontal scroll and retry is 44px", async ({
    page,
    scenario,
  }, testInfo) => {
    await scenario("happy");
    await generateFirstPrompt(page);
    const main = mainContent(page);
    await main.getByLabel("Ton texte").fill(writing);

    await page.route("**/api/sessions/*/evaluate", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill(aiUnavailable);
        return;
      }
      await route.continue();
    });

    await main.getByRole("button", { name: "Corrige-moi" }).click();
    const retry = main.getByRole("button", { name: "Essayer encore" });
    await expect(retry).toBeVisible();
    await expectTouchTarget(retry);
    await expectNoHorizontalOverflow(page);
    await expectNoAxeViolations(page);
    await captureEvidence(page, testInfo, "evaluate-error-390");
  });
});
