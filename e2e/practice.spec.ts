import fs from "node:fs";
import path from "node:path";
import { test, expect } from "./support/fixtures";
import { expectNoAxeViolations } from "./support/axe";
import { captureEvidence } from "./support/evidence";
import { setLevelB1 } from "./support/header-helpers";
import { seedFocusWeaknesses } from "./support/focus-seed";
import { expectEvaluationWithScores } from "./support/home-helpers";
import { writingField } from "./support/writing-helpers";
import {
  PROMPT_FIXTURE_LAFAYETTE,
  generateFirstPrompt,
  mainContent,
} from "./support/prompt-helpers";

const ACCENTS = "Accents (é / è / ê)";
const PINNED_REASON =
  "Tu l'as choisi dans le Carnet. La consigne va t'y faire travailler.";
const CARNET_CTA = "« \u2011er / \u2011é » dans le Carnet →";

test("Pratiquer ça pins Accents first on Home and in the generator request", async ({
  page,
}, testInfo) => {
  await seedFocusWeaknesses(["accents"]);
  await page.goto("/carnet");
  const carnet = mainContent(page);
  const row = carnet.getByRole("article").filter({ hasText: ACCENTS });
  const practice = row.getByRole("button", { name: "Pratiquer ça" });
  await expect(practice).toHaveAttribute("aria-pressed", "false");
  await practice.click();
  await expect(practice).toHaveAttribute("aria-pressed", "true");
  await expect(row.getByText(/prochaine consigne/)).toBeVisible();
  await expectNoAxeViolations(page);
  await captureEvidence(page, testInfo, "carnet-pinned");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await setLevelB1(page);
  const home = mainContent(page);
  const region = home.getByRole("region", { name: "Focus du jour" });
  await expect(region).toBeVisible();
  await expect(region.getByText(ACCENTS)).toBeVisible();
  await expect(home.getByText(PINNED_REASON)).toBeVisible();
  await captureEvidence(page, testInfo, "home-pinned");

  await home.getByRole("button", { name: "Donne-moi une consigne" }).click();
  await expect(home.getByText(PROMPT_FIXTURE_LAFAYETTE)).toBeVisible();
  const generatorPrompt = fs.readFileSync(
    path.join(process.cwd(), ".e2e/last-generator-prompt.txt"),
    "utf8",
  );
  expect(generatorPrompt).toContain("accents");
  expect(generatorPrompt).toContain("des mots où l'accent change le sens");
});

test("review tags a Focus Mistake and the Carnet CTA jumps to the Weakness", async ({
  page,
  scenario,
}, testInfo) => {
  await seedFocusWeaknesses();
  await scenario("focus");
  await generateFirstPrompt(page);
  const main = mainContent(page);
  await writingField(main).fill(
    "Maintenant je vas au bayou. Les enfant jouent.",
  );
  await main.getByRole("button", { name: "Corrige-moi" }).click();
  await expectEvaluationWithScores(page);

  const card = page.getByRole("article").filter({ hasText: "Les enfant" });
  await expect(card.getByText("focus du jour")).toBeVisible();
  const cta = page.getByRole("link", { name: CARNET_CTA });
  await expect(cta).toHaveAttribute(
    "href",
    "/carnet#weakness-infinitif_participe",
  );
  await captureEvidence(page, testInfo, "review-focus");
  await cta.click();
  await expect(page).toHaveURL(/\/carnet#weakness-infinitif_participe$/);
  await expect(
    mainContent(page).getByRole("heading", {
      name: "Infinitif ou participe (\u2011er / \u2011é)",
    }),
  ).toBeVisible();
});
