import { type Page } from "@playwright/test";
import { test, expect } from "./support/fixtures";
import { expectNoAxeViolations } from "./support/axe";
import { captureEvidence } from "./support/evidence";
import { setLevelB1, visibleHeaderQuota } from "./support/header-helpers";
import { mainContent } from "./support/prompt-helpers";

const WRITING =
  "Je reste dans une petite maison à Lafayette. J'aime la galerie le matin.";

const aiUnavailable = {
  status: 502,
  contentType: "application/json",
  body: JSON.stringify({
    error: { code: "AI_UNAVAILABLE", message: "fail" },
  }),
};

async function expectReducedHeader(page: Page) {
  const banner = page.getByRole("banner");
  await expect(banner.getByRole("link", { name: "Historique" })).toHaveCount(0);
  await expect(banner.getByRole("link", { name: "Carnet" })).toHaveCount(0);
  await expect(banner.getByRole("button", { name: /Niveau CECR/ })).toHaveCount(
    0,
  );
  await expect(banner.getByText(/Reste \d/)).toHaveCount(0);
  await expect(banner.getByText(/consignes/)).toHaveCount(0);
}

async function expectStartCopy(page: Page) {
  const main = mainContent(page);
  await expect(
    main.getByRole("heading", { name: "Test de placement" }),
  ).toBeVisible();
  await expect(
    main.getByText(
      "Trois consignes, une après l'autre. Écris ce que tu peux pour chacune. À la fin, je te donne ton niveau CECR et on commence pour de vrai.",
    ),
  ).toBeVisible();
  await expect(main.getByText("Étape 1")).toBeVisible();
  await expect(main.getByText("Première consigne")).toBeVisible();
  await expect(main.getByText("Deuxième consigne")).toBeVisible();
  await expect(main.getByText("Troisième consigne")).toBeVisible();
  await expect(
    main.getByText(
      "Écris comme tu parles : le français de la Louisiane, c'est ça qui compte icitte. Tes brouillons sont gardés à mesure.",
    ),
  ).toBeVisible();
}

async function expectStepChrome(page: Page, step: 1 | 2 | 3) {
  const main = mainContent(page);
  await expect(
    main.getByRole("heading", {
      name: `Test de placement · étape ${step} sur 3`,
    }),
  ).toBeVisible();
  const bar = main.getByRole("progressbar", { name: "Avancement du test" });
  await expect(bar).toHaveAttribute("aria-valuemin", "1");
  await expect(bar).toHaveAttribute("aria-valuemax", "3");
  await expect(bar).toHaveAttribute("aria-valuenow", String(step));
  await expect(bar).toHaveAttribute("aria-valuetext", `Étape ${step} sur 3`);
  await expect(main.getByText(/\d+ mots/)).toBeVisible();
  await expect(main.getByText(/\d+–\d+ mots/)).toHaveCount(0);
  await expect(
    main.getByRole("button", { name: /Une autre consigne/ }),
  ).toHaveCount(0);
}

test("placement.spec › first run start to result at 1280 and 390", async ({
  page,
  scenario,
}, testInfo) => {
  test.setTimeout(90_000);
  await scenario("happy");
  await page.goto("/");
  await page.getByRole("link", { name: /test de placement/i }).click();
  await expect(page).toHaveURL(/\/placement$/);
  await expectStartCopy(page);
  await expect(
    page.getByRole("link", { name: "Je connais mon niveau" }),
  ).toBeVisible();
  await expectReducedHeader(page);
  await captureEvidence(page, testInfo, "start");
  await expectNoAxeViolations(page);

  await page.getByRole("button", { name: "Commencer" }).click();
  await expectStepChrome(page, 1);
  const main = mainContent(page);
  const next = main.getByRole("button", { name: "Consigne suivante" });
  await expect(next).toBeDisabled();
  await captureEvidence(page, testInfo, "step-1");
  await expectNoAxeViolations(page);

  await main.getByLabel("Ton texte").fill(WRITING);
  await expect(next).toBeEnabled();
  await next.click();
  await expectStepChrome(page, 2);
  await expect(
    page.getByRole("link", { name: "Finir plus tard" }),
  ).toBeVisible();

  await main.getByLabel("Ton texte").fill(WRITING);
  await main.getByRole("button", { name: "Consigne suivante" }).click();
  await expectStepChrome(page, 3);
  const seeLevel = main.getByRole("button", { name: "Voir mon niveau" });
  await expect(seeLevel).toBeVisible();
  await expect(seeLevel).toBeDisabled();
  await main.getByLabel("Ton texte").fill(WRITING);
  await expect(seeLevel).toBeEnabled();
  await seeLevel.click();

  await expect(
    main.getByRole("heading", { name: "Test de placement · fini" }),
  ).toBeVisible();
  await expect(main.getByText("TON NIVEAU CECR · SEUIL")).toBeVisible();
  await expect(main.getByText("Étape 1", { exact: true })).toBeVisible();
  await expect(main.getByText("Étape 2", { exact: true })).toBeVisible();
  await expect(main.getByText("Étape 3", { exact: true })).toBeVisible();
  await expect(main.getByText("B1").first()).toBeVisible();
  await expectReducedHeader(page);
  await expect(page.getByRole("link", { name: "Finir plus tard" })).toHaveCount(
    0,
  );
  await captureEvidence(page, testInfo, "done");
  await expectNoAxeViolations(page);

  await main.getByRole("link", { name: "Ma première consigne" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole("button", { name: "Niveau CECR B1, changer" }),
  ).toBeVisible();
  await expect(
    visibleHeaderQuota(page, /Reste 3 (consignes sur 3|sur 3)/),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Donne-moi une consigne" }),
  ).toBeVisible();
  await expect(page.getByLabel("Ton texte")).toHaveCount(0);
});

test("placement.spec › reload resumes step and draft", async ({
  page,
  scenario,
}) => {
  test.setTimeout(60_000);
  await scenario("happy");
  await page.goto("/placement");
  await page.getByRole("button", { name: "Commencer" }).click();
  const main = mainContent(page);
  await expectStepChrome(page, 1);
  await main.getByLabel("Ton texte").fill(WRITING);
  await main.getByRole("button", { name: "Consigne suivante" }).click();
  await expectStepChrome(page, 2);
  const draft = "Sur la galerie je bois mon café.";
  await main.getByLabel("Ton texte").fill(draft);
  await expect(
    main.getByText(/Brouillon sauvé à/).filter({ visible: true }),
  ).toBeVisible();
  await page.reload();
  await expectStepChrome(page, 2);
  await expect(main.getByLabel("Ton texte")).toHaveValue(draft);
  await page.getByRole("link", { name: "Finir plus tard" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/placement");
  await expectStepChrome(page, 2);
  await expect(mainContent(page).getByLabel("Ton texte")).toHaveValue(draft);
});

test("placement.spec › redirects when a level exists", async ({
  page,
  scenario,
}) => {
  await scenario("happy");
  await page.goto("/");
  await setLevelB1(page);
  await page.goto("/placement");
  await expect(page).toHaveURL(/\/$/);
});

test("placement.spec › submit failure keeps the text and shows retry", async ({
  page,
  scenario,
}) => {
  await scenario("happy");
  await page.goto("/placement");
  await page.getByRole("button", { name: "Commencer" }).click();
  const main = mainContent(page);
  await expectStepChrome(page, 1);
  await main.getByLabel("Ton texte").fill(WRITING);
  let fail = true;
  await page.route("**/api/placement/**/submit", async (route) => {
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
  await main.getByRole("button", { name: "Consigne suivante" }).click();
  const alert = main.getByRole("alert");
  await expect(alert).toBeVisible();
  await expect(
    alert.getByRole("button", { name: "Essayer encore" }),
  ).toBeVisible();
  await expect(main.getByLabel("Ton texte")).toHaveValue(WRITING);
  await expectStepChrome(page, 1);
});
