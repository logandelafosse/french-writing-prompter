import { test, expect } from "./support/fixtures";
import { expectNoAxeViolations, LEGACY_AXE_DISABLED } from "./support/axe";
import { captureEvidence } from "./support/evidence";
import { expectEvaluationWithScores } from "./support/home-helpers";
import { PROMPT_FIXTURE_LAFAYETTE } from "./support/prompt-helpers";

const PROMPT_SNIPPET = PROMPT_FIXTURE_LAFAYETTE;
const HAPPY_WRITING =
  "Hier, je me suis promené dans mon quartier. J'ai vu des voisins et nous avons parlé du carnaval.";

test("learner generates a prompt, writes, and sees the Evaluation and the History entry", async ({
  page,
  scenario,
}, testInfo) => {
  await scenario("happy");
  await page.goto("/");

  await page.getByRole("button", { name: /A2/i }).click();
  await page.getByRole("button", { name: "Donne-moi une consigne" }).click();
  await captureEvidence(page, testInfo, "home-level");

  await expect(page.getByText(PROMPT_SNIPPET)).toBeVisible();
  await expectNoAxeViolations(page, LEGACY_AXE_DISABLED);
  await captureEvidence(page, testInfo, "generated-prompt");

  await page.getByLabel("Ton texte").fill(HAPPY_WRITING);
  await page.getByRole("button", { name: "Corrige-moi" }).click();
  await expectEvaluationWithScores(page);
  await captureEvidence(page, testInfo, "evaluation");

  await page.getByRole("link", { name: "Historique" }).click();
  await expect(page.getByRole("heading", { name: "History" })).toBeVisible();
  await expectNoAxeViolations(page, LEGACY_AXE_DISABLED);
  await expect(page.getByText(/Sessions \(1\)/)).toBeVisible();
  await page.getByRole("button", { name: /Lafayette/ }).click();
  await expect(
    page
      .getByRole("main")
      .getByText(/Raconte en style familier/, { exact: false }),
  ).toBeVisible();
  await captureEvidence(page, testInfo, "history-session");
});

test("malformed AI output shows an error and retry recovers", async ({
  page,
  scenario,
}) => {
  await scenario("happy");
  await page.goto("/");
  await page.getByRole("button", { name: /A2/i }).click();
  await page.getByRole("button", { name: "Donne-moi une consigne" }).click();
  await expect(page.getByText(PROMPT_SNIPPET)).toBeVisible();
  await page.getByLabel("Ton texte").fill(HAPPY_WRITING);

  await scenario("malformed");
  await page.getByRole("button", { name: "Corrige-moi" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "J'ai pas pu lire ton texte ce coup-ci.",
  );
  await expect(page.getByText("Unhandled Runtime Error")).toHaveCount(0);
  await expect(
    page.getByText(/Application error: a client-side exception has occurred/i),
  ).toHaveCount(0);

  await scenario("happy");
  await page.getByRole("button", { name: "Essayer encore" }).click();
  await expectEvaluationWithScores(page);
});
