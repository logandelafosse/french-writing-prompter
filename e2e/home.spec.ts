import { test, expect } from "./support/fixtures";
import { expectNoAxeViolations, LEGACY_AXE_DISABLED } from "./support/axe";
import { captureEvidence } from "./support/evidence";

const PROMPT_SNIPPET = "La Nouvelle-Orléans";
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

  await page.getByRole("textbox").fill(HAPPY_WRITING);
  await page.getByRole("button", { name: "Corrige-moi" }).click();
  await expect(page.getByRole("heading", { name: "Evaluation" })).toBeVisible();
  await captureEvidence(page, testInfo, "evaluation");

  await page.getByRole("link", { name: "Historique" }).click();
  await expect(page.getByRole("heading", { name: "History" })).toBeVisible();
  await expectNoAxeViolations(page, LEGACY_AXE_DISABLED);
  await expect(page.getByText(/Sessions \(1\)/)).toBeVisible();
  await page
    .getByRole("button", { name: /Écrivez un court paragraphe/ })
    .click();
  await expect(page.getByText(PROMPT_SNIPPET)).toBeVisible();
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
  await page.getByRole("textbox").fill(HAPPY_WRITING);

  await scenario("malformed");
  await page.getByRole("button", { name: "Corrige-moi" }).click();
  await expect(page.getByText("AI output was invalid.")).toBeVisible();
  await expect(page.getByText("Unhandled Runtime Error")).toHaveCount(0);
  await expect(
    page.getByText(/Application error: a client-side exception has occurred/i),
  ).toHaveCount(0);

  await scenario("happy");
  await page.getByRole("button", { name: "Réessayer" }).click();
  await expect(page.getByRole("heading", { name: "Evaluation" })).toBeVisible();
});
