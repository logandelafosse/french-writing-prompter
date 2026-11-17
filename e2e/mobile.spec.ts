import { type Page } from "@playwright/test";
import { test, expect } from "./support/fixtures";
import { captureEvidence } from "./support/evidence";
import { expectEvaluationWithScores } from "./support/home-helpers";
import { generateFirstPrompt, mainContent } from "./support/prompt-helpers";
import { seedHistoryList, seedPastReview } from "./support/history-seed";
import { homeCopy } from "../src/copy/fr";
import { historyCopy } from "../src/copy/history";
import { placementCopy } from "../src/copy/placement";

const mixedWriting = "Maintenant je vas au bayou. Les enfant jouent.";
const placementWriting =
  "Je reste dans une petite maison à Lafayette. J'aime la galerie le matin.";

test.describe("390 px pass", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });

  async function expectPhoneLayout(page: Page) {
    const metrics = await page.evaluate(() => {
      const root = document.documentElement;
      const tooShort: { name: string; height: number }[] = [];
      const nodes = [
        ...document.querySelectorAll("button, a"),
      ] as HTMLElement[];
      for (const el of nodes) {
        const style = getComputedStyle(el);
        if (style.display === "none" || style.visibility === "hidden") continue;
        if (el.hasAttribute("hidden")) continue;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        if (el.tagName === "A" && style.display === "inline") continue;
        if (rect.height + 0.5 < 44) {
          tooShort.push({
            name: (el.getAttribute("aria-label") ?? el.textContent ?? "")
              .trim()
              .slice(0, 60),
            height: rect.height,
          });
        }
      }
      return { scrollWidth: root.scrollWidth, tooShort };
    });
    expect(metrics.scrollWidth).toBeLessThanOrEqual(390);
    expect(metrics.tooShort).toEqual([]);
  }

  test("Home and Carnet fit at 390", async ({ page, scenario }, testInfo) => {
    test.setTimeout(90_000);
    await scenario("happy");

    await page.goto("/");
    await expect(
      page.getByRole("button", { name: homeCopy.generate }),
    ).toBeVisible();
    await captureEvidence(page, testInfo, "home-a");
    await expectPhoneLayout(page);

    await generateFirstPrompt(page);
    await captureEvidence(page, testInfo, "home-b");
    await expectPhoneLayout(page);

    await page
      .getByRole("textbox", { name: "Ton texte", exact: true })
      .fill(mixedWriting);
    await mainContent(page)
      .getByRole("button", { name: homeCopy.submit })
      .click();
    await expectEvaluationWithScores(page);
    await captureEvidence(page, testInfo, "home-c");
    await expectPhoneLayout(page);

    await page.goto("/carnet");
    await expect(page.getByRole("heading", { name: "Carnet" })).toBeVisible();
    await captureEvidence(page, testInfo, "carnet");
    await expectPhoneLayout(page);
  });

  test("Historique fits at 390", async ({ page }, testInfo) => {
    const { evaluatedId } = await seedHistoryList();
    await page.goto("/historique");
    await expect(
      page.getByRole("heading", { name: historyCopy.title }),
    ).toBeVisible();
    await page.getByRole("button", { name: /récit · 14 novembre/ }).click();
    await expect(
      page.getByRole("link", { name: historyCopy.readAll }),
    ).toBeVisible();
    expect(evaluatedId).toBeGreaterThan(0);
    await captureEvidence(page, testInfo, "historique");
    await expectPhoneLayout(page);

    const { markedId } = await seedPastReview();
    await page.goto(`/historique/${markedId}`);
    await expect(page.getByRole("link", { name: "faute 1" })).toBeVisible();
    await captureEvidence(page, testInfo, "historique-detail");
    await expectPhoneLayout(page);
  });

  test("Placement screens fit at 390", async ({ page, scenario }, testInfo) => {
    test.setTimeout(90_000);
    await scenario("happy");
    await page.goto("/placement");
    await expect(
      page.getByRole("heading", { name: placementCopy.title }),
    ).toBeVisible();
    await captureEvidence(page, testInfo, "placement-start");
    await expectPhoneLayout(page);

    await page.getByRole("button", { name: placementCopy.start }).click();
    await expect(
      page.getByRole("heading", { name: placementCopy.stepTitle(1) }),
    ).toBeVisible();
    await captureEvidence(page, testInfo, "placement-step");
    await expectPhoneLayout(page);

    const main = mainContent(page);
    const field = () =>
      page.getByRole("textbox", { name: "Ton texte", exact: true });
    await field().fill(placementWriting);
    await main.getByRole("button", { name: placementCopy.next }).click();
    await expect(
      page.getByRole("heading", { name: placementCopy.stepTitle(2) }),
    ).toBeVisible();
    await expectPhoneLayout(page);
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
    await captureEvidence(page, testInfo, "placement-result");
    await expectPhoneLayout(page);
  });
});
