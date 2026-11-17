import { TodayGetResponse } from "../src/contracts/today";
import { test, expect } from "./support/fixtures";
import { captureEvidence } from "./support/evidence";
import { generateFirstPrompt, mainContent } from "./support/prompt-helpers";
import { expectDraftStatusOnItsOwnLine } from "./support/writing-helpers";

const draftText = "Le bayou au matin est calme.";

test.describe("draft autosave @1280", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("reload keeps the text and the saved time", async ({
    page,
    scenario,
  }, testInfo) => {
    await scenario("happy");
    await generateFirstPrompt(page);
    const main = mainContent(page);
    await main.getByLabel("Ton texte").fill(draftText);
    const status = main
      .getByText(/Brouillon sauvé à \d+ h \d{2}/)
      .filter({ visible: true });
    await expect(status).toBeVisible();
    const stamp = await status.innerText();
    await captureEvidence(page, testInfo, "draft-saved");
    await page.reload();
    await expect(main.getByLabel("Ton texte")).toHaveValue(draftText);
    await expect(main.getByText(stamp).filter({ visible: true })).toBeVisible();
    await captureEvidence(page, testInfo, "draft-reloaded");
  });

  test("history round trip keeps the draft", async ({ page, scenario }) => {
    await scenario("happy");
    await generateFirstPrompt(page);
    await mainContent(page).getByLabel("Ton texte").fill(draftText);
    await page.getByRole("link", { name: "Historique" }).click();
    const historique = mainContent(page);
    await expect(
      historique.getByRole("heading", { name: "Historique" }),
    ).toBeVisible();
    await expect(
      historique.getByRole("region", { name: "Séances passées" }),
    ).toBeVisible();
    await page.getByRole("link", { name: /^Consigne/ }).click();
    await expect(page.getByLabel("Ton texte")).toHaveValue(draftText);
  });

  test("a newer local copy replaces the server draft", async ({
    page,
    scenario,
  }) => {
    await scenario("happy");
    await generateFirstPrompt(page);
    const main = mainContent(page);
    await main.getByLabel("Ton texte").fill("Texte déjà sur le serveur.");
    await expect(
      main.getByText(/Brouillon sauvé à/).filter({ visible: true }),
    ).toBeVisible();

    await page.evaluate(() => {
      const key = Object.keys(localStorage).find((item) =>
        item.startsWith("draft:"),
      );
      if (!key) {
        throw new Error("draft key missing");
      }
      const savedAt = new Date(Date.now() + 60_000).toISOString();
      localStorage.setItem(
        key,
        JSON.stringify({
          text: "Texte gardé sur l'appareil.",
          savedAt,
        }),
      );
    });

    await page.reload();
    await expect(main.getByLabel("Ton texte")).toHaveValue(
      "Texte gardé sur l'appareil.",
    );
    await expect
      .poll(async () => {
        const response = await page.request.get("/api/today");
        const parsed = TodayGetResponse.safeParse(await response.json());
        if (!parsed.success) return null;
        return parsed.data.activeSession?.draft?.text ?? null;
      })
      .toBe("Texte gardé sur l'appareil.");
  });
});

test.describe("draft status @390", () => {
  test.use({ viewport: { width: 390, height: 900 } });

  test("shows the saved time on its own line under the count", async ({
    page,
    scenario,
  }, testInfo) => {
    await scenario("happy");
    await generateFirstPrompt(page);
    const main = mainContent(page);
    await main.getByLabel("Ton texte").fill("un deux trois");
    const status = main
      .getByText(/Brouillon sauvé à/)
      .filter({ visible: true });
    await expect(status).toBeVisible();
    await status.scrollIntoViewIfNeeded();
    await expectDraftStatusOnItsOwnLine(page);
    await captureEvidence(page, testInfo, "draft-status-line");
  });
});
