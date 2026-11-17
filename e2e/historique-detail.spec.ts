import { test, expect } from "./support/fixtures";
import { expectNoAxeViolations } from "./support/axe";
import { captureEvidence } from "./support/evidence";
import { seedHistoryList, seedPastReview } from "./support/history-seed";
import {
  expectNoHorizontalOverflow,
  mainContent,
} from "./support/prompt-helpers";

const NOTICE =
  "Les corrections de cette séance ont pas pu être relues. Ta consigne et ton texte sont gardés, et le reste de l'Historique marche comme d'habitude.";
const ACTION_NAMES = [
  "Compris",
  "C'est du français louisianais",
  "Oui, c'est à nous-autres",
  "Non, corrige-le",
];

test("three kinds marked, no actions, at 1280 and 390", async ({
  page,
}, testInfo) => {
  const { markedId } = await seedPastReview();
  const mutations: string[] = [];
  page.on("request", (request) => {
    const method = request.method();
    if (method === "PATCH" || method === "POST") {
      mutations.push(`${method} ${request.url()}`);
    }
  });

  await page.goto(`/historique/${markedId}`);
  const main = mainContent(page);
  await expect(
    main.getByRole("heading", { name: "récit · 14 novembre" }),
  ).toBeVisible();
  await expect(
    main.getByText("Samedi 14 novembre · 1 faute · B1"),
  ).toBeVisible();
  await expect(main.getByText("Raconte la boucherie.")).toBeVisible();
  await expect(main.getByText("Les enfant", { exact: true })).toBeVisible();

  const faute = main.getByRole("link", { name: "faute 1" });
  const standard = main.getByRole("link", { name: "français standard 2" });
  const dialect = main.getByRole("link", { name: "à vérifier 3" });
  await expect(faute).toHaveAttribute("href", "#correction-1");
  await expect(standard).toHaveAttribute("href", "#correction-2");
  await expect(dialect).toHaveAttribute("href", "#correction-3");

  const cards = main.getByRole("region", { name: "Corrections" });
  await expect(cards.getByText("Faute")).toBeVisible();
  await expect(cards.getByText("Français standard")).toBeVisible();
  await expect(cards.getByText("Ça se dit comme ça ?")).toBeVisible();

  for (const name of ACTION_NAMES) {
    await expect(main.getByRole("button", { name })).toHaveCount(0);
  }

  const scores = main.getByRole("button", { name: /Scores ▸/ });
  await expect(main.getByRole("button")).toHaveCount(1);
  await expect(scores).toHaveAttribute("aria-expanded", "false");
  await captureEvidence(page, testInfo, "past-review");
  await scores.click();
  await expect(main.getByRole("button", { name: /Scores ▾/ })).toHaveAttribute(
    "aria-expanded",
    "true",
  );

  const sheet = main.getByRole("region", { name: "Consigne et ton texte" });
  const sheetBox = await sheet.boundingBox();
  const cardsBox = await cards.boundingBox();
  const desktop = (page.viewportSize()?.width ?? 1280) >= 1280;
  expect(
    desktop
      ? (cardsBox?.x ?? -1) > (sheetBox?.x ?? 99999)
      : (cardsBox?.y ?? -1) > (sheetBox?.y ?? 0) + (sheetBox?.height ?? 0) - 8,
  ).toBe(true);

  expect(
    mutations.filter(
      (entry) =>
        entry.includes("/api/corrections/") ||
        entry.includes("/api/dialect-notes"),
    ),
  ).toEqual([]);

  await expectNoHorizontalOverflow(page);
  await expectNoAxeViolations(page);
});

test("malformed session shows notice and plain text", async ({
  page,
}, testInfo) => {
  const { malformedId } = await seedPastReview();
  await page.goto(`/historique/${malformedId}`);
  const main = mainContent(page);
  await expect(main.getByText("Consigne cassée.")).toBeVisible();
  await expect(main.getByText("Texte gardé sans marques.")).toBeVisible();
  await expect(main.getByText(NOTICE)).toBeVisible();
  await captureEvidence(page, testInfo, "malformed");
  await expect(main.getByRole("link", { name: /faute/ })).toHaveCount(0);
  expect(await main.evaluate((el) => el.querySelectorAll("mark").length)).toBe(
    0,
  );
});

test("from Historique the read-all link opens the past review", async ({
  page,
}, testInfo) => {
  const { evaluatedId } = await seedHistoryList();
  await page.goto("/historique");
  const list = mainContent(page).getByRole("region", {
    name: "Séances passées",
  });
  await list.getByRole("button", { name: /récit · 14 novembre/ }).click();
  await expect(
    list.getByRole("link", { name: "Lire tout le texte avec ses marques" }),
  ).toBeVisible();
  await captureEvidence(page, testInfo, "historique-read-all-link");
  await list
    .getByRole("link", { name: "Lire tout le texte avec ses marques" })
    .click();
  await expect(page).toHaveURL(new RegExp(`/historique/${evaluatedId}$`));
  await expect(
    mainContent(page).getByRole("heading", { name: "récit · 14 novembre" }),
  ).toBeVisible();
  await mainContent(page).getByRole("link", { name: "← Historique" }).click();
  await expect(page).toHaveURL(/\/historique$/);
  await expect(
    mainContent(page).getByRole("heading", { name: "Historique" }),
  ).toBeVisible();
});

test("/historique/999999 and /historique/abc show the not-found page", async ({
  page,
}) => {
  const missing = await page.goto("/historique/999999");
  expect(missing?.status()).toBe(404);
  await expect(page.getByText(/This page could not be found/i)).toBeVisible();

  const invalid = await page.goto("/historique/abc");
  expect(invalid?.status()).toBe(404);
  await expect(page.getByText(/This page could not be found/i)).toBeVisible();
});
