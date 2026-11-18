import { test, expect } from "./support/fixtures";
import { expectNoAxeViolations, LEGACY_AXE_DISABLED } from "./support/axe";
import { captureEvidence } from "./support/evidence";
import { expectEvaluationWithScores } from "./support/home-helpers";
import { writingField } from "./support/writing-helpers";
import {
  PROMPT_FIXTURE_LAFAYETTE,
  mainContent,
} from "./support/prompt-helpers";

const PROMPT_SNIPPET = PROMPT_FIXTURE_LAFAYETTE;
const HAPPY_WRITING =
  "Hier, je me suis promené dans mon quartier. J'ai vu des voisins et nous avons parlé du carnaval.";

test("learner generates a prompt, writes, and sees the Evaluation and the Historique entry", async ({
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

  await writingField(page).fill(HAPPY_WRITING);
  await page.getByRole("button", { name: "Corrige-moi" }).click();
  await expectEvaluationWithScores(page);
  await captureEvidence(page, testInfo, "evaluation");

  await page.getByRole("link", { name: "Historique" }).click();
  const main = mainContent(page);
  await expect(main.getByRole("heading", { name: "Historique" })).toBeVisible();
  await expectNoAxeViolations(page);
  const list = main.getByRole("region", { name: "Séances passées" });
  const row = list.getByRole("button").filter({ hasText: /évaluée/ });
  await expect(row).toBeVisible();
  await row.click();
  await expect(list.getByText(/Raconte en style familier/)).toBeVisible();
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
  await writingField(page).fill(HAPPY_WRITING);

  await scenario("malformed");
  await page.getByRole("button", { name: "Corrige-moi" }).click();
  await expect(mainContent(page).getByRole("alert")).toContainText(
    "J'ai pas pu lire ton texte ce coup-ci.",
  );
  await expect(page.getByText("Unhandled Runtime Error")).toHaveCount(0);
  await expect(
    page.getByText(/Application error: a client-side exception has occurred/i),
  ).toHaveCount(0);

  await scenario("happy");
  await mainContent(page)
    .getByRole("button", { name: "Essayer encore" })
    .click();
  await expectEvaluationWithScores(page);
});
