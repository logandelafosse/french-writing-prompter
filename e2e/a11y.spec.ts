import { test, expect } from "./support/fixtures";
import { expectNoAxeViolations } from "./support/axe";
import { expectEvaluationWithScores } from "./support/home-helpers";
import { generateFirstPrompt, mainContent } from "./support/prompt-helpers";
import { seedHistoryList, seedPastReview } from "./support/history-seed";
import { homeCopy } from "../src/copy/fr";
import { historyCopy } from "../src/copy/history";
import { placementCopy } from "../src/copy/placement";

const mixedWriting = "Maintenant je vas au bayou. Les enfant jouent.";
const placementWriting =
  "Je reste dans une petite maison à Lafayette. J'aime la galerie le matin.";

test("axe clean on Home and Carnet", async ({ page, scenario }) => {
  test.setTimeout(90_000);
  await scenario("happy");

  await page.goto("/");
  await expect(
    page.getByRole("button", { name: homeCopy.generate }),
  ).toBeVisible();
  await expectNoAxeViolations(page);

  await generateFirstPrompt(page);
  await expectNoAxeViolations(page);

  await page
    .getByRole("textbox", { name: "Ton texte", exact: true })
    .fill(mixedWriting);
  await mainContent(page)
    .getByRole("button", { name: homeCopy.submit })
    .click();
  await expectEvaluationWithScores(page);
  await expectNoAxeViolations(page);

  await page.goto("/carnet");
  await expect(page.getByRole("heading", { name: "Carnet" })).toBeVisible();
  await expectNoAxeViolations(page);
});

test("axe clean on Historique", async ({ page }) => {
  await seedHistoryList();
  await page.goto("/historique");
  await expect(
    page.getByRole("heading", { name: historyCopy.title }),
  ).toBeVisible();
  await expectNoAxeViolations(page);

  const { markedId } = await seedPastReview();
  await page.goto(`/historique/${markedId}`);
  await expect(page.getByRole("link", { name: "faute 1" })).toBeVisible();
  await expectNoAxeViolations(page);
});

test("axe clean on Placement phases", async ({ page, scenario }) => {
  test.setTimeout(90_000);
  await scenario("happy");
  await page.goto("/placement");
  await expect(
    page.getByRole("heading", { name: placementCopy.title }),
  ).toBeVisible();
  await expectNoAxeViolations(page);

  await page.getByRole("button", { name: placementCopy.start }).click();
  await expect(
    page.getByRole("heading", { name: placementCopy.stepTitle(1) }),
  ).toBeVisible();
  await expectNoAxeViolations(page);

  const main = mainContent(page);
  const field = () =>
    page.getByRole("textbox", { name: "Ton texte", exact: true });
  await field().fill(placementWriting);
  await main.getByRole("button", { name: placementCopy.next }).click();
  await expect(
    page.getByRole("heading", { name: placementCopy.stepTitle(2) }),
  ).toBeVisible();
  await expectNoAxeViolations(page);
  await field().fill(placementWriting);
  await main.getByRole("button", { name: placementCopy.next }).click();
  await expect(
    page.getByRole("heading", { name: placementCopy.stepTitle(3) }),
  ).toBeVisible();
  await field().fill(placementWriting);
  await main.getByRole("button", { name: placementCopy.seeLevel }).click();
  await expect(
    page.getByRole("heading", { name: placementCopy.doneTitle }),
  ).toBeVisible();
  await expectNoAxeViolations(page);
});
