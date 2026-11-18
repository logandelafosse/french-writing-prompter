import type { Page } from "@playwright/test";
import { test, expect } from "./support/fixtures";
import { captureEvidence } from "./support/evidence";
import { expectEvaluationWithScores } from "./support/home-helpers";
import { visibleHeaderQuota, setLevelB1 } from "./support/header-helpers";
import {
  expectNoHorizontalOverflow,
  mainContent,
  PROMPT_FIXTURE_LAFAYETTE,
} from "./support/prompt-helpers";
import { homeCopy } from "../src/copy/fr";
import { writingField } from "./support/writing-helpers";

async function openThirdPrompt(page: Page) {
  await page.goto("/");
  await setLevelB1(page);
  for (let index = 0; index < 3; index += 1) {
    const response = await page.request.post("/api/prompt", {
      headers: { "x-e2e-scenario": "happy" },
      data: {},
    });
    expect(response.ok()).toBeTruthy();
  }
  await page.goto("/");
  await expect(
    mainContent(page).getByText(PROMPT_FIXTURE_LAFAYETTE),
  ).toBeVisible();
}

test.describe("quota exhausted @1280", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("third prompt keeps the draft submittable", async ({
    page,
    scenario,
  }, testInfo) => {
    await scenario("happy");
    await openThirdPrompt(page);
    const main = mainContent(page);
    const notice = main.getByRole("status");
    await expect(notice).toContainText(
      "T'as pris tes trois consignes pour aujourd'hui.",
    );
    await expect(notice).toContainText(/dans \d+ h \d{2}/);
    await expect(notice).toContainText(homeCopy.quotaNoticeDraft);
    await expect(main.getByText("Consigne d'écriture · 3 sur 3")).toBeVisible();
    await expect(
      main.getByRole("button", {
        name: "↻ Une autre consigne · à minuit",
        exact: true,
      }),
    ).toBeDisabled();
    await expect(
      visibleHeaderQuota(page, /3 consignes sur 3 prises/),
    ).toBeVisible();

    const area = writingField(main);
    await area.fill("Le brouillon du soir reste là.");
    const submit = main.getByRole("button", { name: "Corrige-moi" });
    await expect(submit).toBeEnabled();
    await captureEvidence(page, testInfo, "quota-notice-1280");
    await submit.click();
    await expectEvaluationWithScores(page);
    await expect(
      main.getByRole("button", { name: "Une autre consigne · à minuit" }),
    ).toBeDisabled();
  });
});

test.describe("quota exhausted @390", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("notice and disabled swap fit the width", async ({
    page,
    scenario,
  }, testInfo) => {
    await scenario("happy");
    await openThirdPrompt(page);
    const main = mainContent(page);
    await expect(main.getByRole("status")).toContainText(
      "T'as pris tes trois consignes pour aujourd'hui.",
    );
    await expect(
      main.getByRole("button", {
        name: "↻ Une autre consigne · à minuit",
        exact: true,
      }),
    ).toBeDisabled();
    await writingField(main).fill("Un brouillon court.");
    await expectNoHorizontalOverflow(page);
    await captureEvidence(page, testInfo, "quota-notice-390");
  });
});
