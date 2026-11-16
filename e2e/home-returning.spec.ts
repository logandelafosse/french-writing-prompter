import { test, expect } from "./support/fixtures";
import { expectNoAxeViolations } from "./support/axe";
import { captureEvidence } from "./support/evidence";
import { setLevelB1, visibleHeaderQuota } from "./support/header-helpers";

const PROMPT_SNIPPET = "La Nouvelle-Orléans";
const HAPPY_WRITING =
  "Hier, je me suis promené dans mon quartier. J'ai vu des voisins et nous avons parlé du carnaval.";

test("returning learner sees generate without level picker", async ({
  page,
  scenario,
}) => {
  await scenario("happy");
  await page.goto("/");
  await setLevelB1(page);

  await expect(
    page.getByRole("button", { name: "Donne-moi une consigne" }),
  ).toBeVisible();
  await expect(page.getByText(/Ton niveau CECR/i)).toHaveCount(0);
  await expectNoAxeViolations(page);
});

test("reload after generate restores today's prompt and quota", async ({
  page,
  scenario,
}, testInfo) => {
  await scenario("happy");
  await page.goto("/");
  await page.getByRole("button", { name: /B1/i }).click();
  await page.getByRole("button", { name: "Donne-moi une consigne" }).click();
  await expect(page.getByText(PROMPT_SNIPPET)).toBeVisible();
  await captureEvidence(page, testInfo, "before-reload");

  const quotaLocator = visibleHeaderQuota(
    page,
    /Reste 2 (consignes sur 3|sur 3)/,
  );
  await expect(quotaLocator).toBeVisible();
  const quotaBefore = (await quotaLocator.textContent()) ?? "";

  await page.reload();
  await expect(page.getByText(PROMPT_SNIPPET)).toBeVisible();
  await expect(visibleHeaderQuota(page, quotaBefore)).toBeVisible();
});

test("interim phase B submit still produces an Evaluation", async ({
  page,
  scenario,
}) => {
  await scenario("happy");
  await page.goto("/");
  await page.getByRole("button", { name: /A2/i }).click();
  await page.getByRole("button", { name: "Donne-moi une consigne" }).click();
  await expect(page.getByText(PROMPT_SNIPPET)).toBeVisible();
  await page.getByRole("textbox").fill(HAPPY_WRITING);
  await page.getByRole("button", { name: "Corrige-moi" }).click();
  await expect(page.getByRole("heading", { name: "Evaluation" })).toBeVisible();
});
