import { test, expect } from "./support/fixtures";
import { expectNoAxeViolations } from "./support/axe";
import { captureEvidence } from "./support/evidence";
import { expectEvaluationWithScores } from "./support/home-helpers";
import { generateFirstPrompt, mainContent } from "./support/prompt-helpers";
import { seedResourceWeaknesses } from "./support/resources-seed";
import { carnetCopy } from "../src/copy/carnet";

const writing = "Mon petit cousin a tombé dans la boue. Les enfant jouent.";
const savedRule =
  "Avec « tomber », on prend l'auxiliaire « avoir » : il a tombé.";
const savedExample = "Mon petit cousin a tombé dans la boue.";

async function saveReviewNote(page: import("@playwright/test").Page) {
  await generateFirstPrompt(page);
  const main = mainContent(page);
  await main.getByLabel("Ton texte").fill(writing);
  await main.getByRole("button", { name: "Corrige-moi" }).click();
  await expectEvaluationWithScores(page);
  await page.getByRole("button", { name: "Oui, c'est à nous-autres" }).click();
  const dialog = page.getByRole("dialog", {
    name: "Ajouter une note de dialecte",
  });
  await dialog.getByRole("button", { name: "Sauver la note" }).click();
  await expect(page.getByText("Note de dialecte sauvée")).toBeVisible();
}

test("a note saved from a review appears in the Carnet with nouvelle", async ({
  page,
  scenario,
}, testInfo) => {
  await scenario("dialect");
  await saveReviewNote(page);
  await page.goto("/carnet");
  const main = mainContent(page);
  await expect(main.getByRole("heading", { name: "Carnet" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Carnet" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(main.getByText(savedRule)).toBeVisible();
  await expect(main.getByText(savedExample)).toBeVisible();
  await expect(main.getByText("nouvelle")).toBeVisible();
  await captureEvidence(page, testInfo, "saved-note");
});

test("Ajouter une note opens the sheet without T'as écrit and saving omits the source", async ({
  page,
}, testInfo) => {
  await page.goto("/carnet");
  const main = mainContent(page);
  await main.getByRole("button", { name: "Ajouter une note" }).click();
  const dialog = page.getByRole("dialog", {
    name: "Ajouter une note de dialecte",
  });
  await expect(dialog.getByText("T'as écrit")).toHaveCount(0);
  await dialog.getByLabel("Le mot ou la tournure").fill("icitte");
  await dialog.getByLabel(/La règle/).fill("On dit icitte pour ici.");
  await dialog.getByLabel("Un exemple").fill("Viens icitte.");
  await dialog.getByRole("button", { name: "Sauver la note" }).click();
  await expect(main.getByText("On dit icitte pour ici.")).toBeVisible();
  await expect(main.getByText("Viens icitte.")).toBeVisible();
  await expect(main.getByText(/séance/)).toHaveCount(0);
  await captureEvidence(page, testInfo, "manual-note");
});

test("Modifier opens the sheet pre-filled and saving updates the row", async ({
  page,
}) => {
  await page.goto("/carnet");
  const main = mainContent(page);
  await main.getByRole("button", { name: "Ajouter une note" }).click();
  const dialog = page.getByRole("dialog", {
    name: "Ajouter une note de dialecte",
  });
  await dialog.getByLabel("Le mot ou la tournure").fill("icitte");
  await dialog.getByLabel(/La règle/).fill("On dit icitte pour ici.");
  await dialog.getByLabel("Un exemple").fill("Viens icitte.");
  await dialog.getByRole("button", { name: "Sauver la note" }).click();
  await expect(main.getByText("On dit icitte pour ici.")).toBeVisible();

  await main.getByRole("button", { name: "Modifier" }).click();
  const edit = page.getByRole("dialog", { name: "Modifier la note" });
  await expect(edit.getByLabel(/La règle/)).toHaveValue(
    "On dit icitte pour ici.",
  );
  await edit.getByLabel(/La règle/).fill("On écrit icitte, pas ici.");
  await edit.getByRole("button", { name: "Sauver la note" }).click();
  await expect(main.getByText("On écrit icitte, pas ici.")).toBeVisible();
  await expect(main.getByText("On dit icitte pour ici.")).toHaveCount(0);
});

test("Supprimer asks with focus on Garder; Escape keeps; confirm removes after reload", async ({
  page,
}, testInfo) => {
  await page.goto("/carnet");
  const main = mainContent(page);
  await main.getByRole("button", { name: "Ajouter une note" }).click();
  const sheet = page.getByRole("dialog", {
    name: "Ajouter une note de dialecte",
  });
  await sheet.getByLabel("Le mot ou la tournure").fill("icitte");
  await sheet.getByLabel(/La règle/).fill("On dit icitte pour ici.");
  await sheet.getByLabel("Un exemple").fill("Viens icitte.");
  await sheet.getByRole("button", { name: "Sauver la note" }).click();
  await expect(main.getByText("On dit icitte pour ici.")).toBeVisible();

  await main.getByRole("button", { name: "Supprimer" }).click();
  const confirm = main.getByRole("alertdialog", {
    name: "Supprimer cette note",
  });
  await expect(confirm.getByRole("button", { name: "Garder" })).toBeFocused();
  await captureEvidence(page, testInfo, "delete-confirm");
  await page.keyboard.press("Escape");
  await expect(confirm).toHaveCount(0);
  await expect(main.getByText("On dit icitte pour ici.")).toBeVisible();

  await main.getByRole("button", { name: "Supprimer" }).click();
  await main
    .getByRole("alertdialog")
    .getByRole("button", { name: "Supprimer" })
    .click();
  await expect(main.getByText("On dit icitte pour ici.")).toHaveCount(0);
  await page.reload();
  await expect(main.getByText("On dit icitte pour ici.")).toHaveCount(0);
  await expect(main.getByText(/Pas encore de notes/)).toBeVisible();
});

test("empty Carnet shows the empty-state line and has no axe violations", async ({
  page,
}, testInfo) => {
  await page.goto("/carnet");
  const main = mainContent(page);
  await expect(
    main.getByText(
      "Rien à travailler pour l'instant. Les fautes qui reviennent vont apparaître icitte.",
    ),
  ).toBeVisible();
  await expect(main.getByText(carnetCopy.notesEmpty)).toBeVisible();
  await expect(
    main.getByRole("button", { name: "Essayer encore" }),
  ).toHaveCount(0);
  await captureEvidence(page, testInfo, "empty");
  await expectNoAxeViolations(page);
});

const weaknessWriting =
  "Maintenant je vois le table. Il a ete ici. Les enfant jouent.";

async function evaluateWriting(
  page: import("@playwright/test").Page,
  text: string,
) {
  const main = mainContent(page);
  await main.getByLabel("Ton texte").fill(text);
  await main.getByRole("button", { name: "Corrige-moi" }).click();
  await expectEvaluationWithScores(page);
}

async function pushBackAccents(page: import("@playwright/test").Page) {
  const card = page.getByRole("article").filter({ hasText: "ete" });
  await card
    .getByRole("button", { name: "C'est du français louisianais" })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Ajouter une note de dialecte",
  });
  await dialog.getByRole("button", { name: "Sauver la note" }).click();
  await expect(page.getByText("Note de dialecte sauvée")).toBeVisible();
}

test("two genre Mistakes show under À travailler and a pushed-back category does not", async ({
  page,
  scenario,
}, testInfo) => {
  await scenario("weakness");
  await generateFirstPrompt(page);
  await evaluateWriting(page, weaknessWriting);
  await pushBackAccents(page);

  const main = mainContent(page);
  await main
    .getByRole("button", { name: /Une autre consigne · reste/ })
    .click();
  await expect(main.getByLabel("Ton texte", { exact: true })).toBeEditable();
  await evaluateWriting(page, weaknessWriting);

  await page.goto("/carnet");
  const carnet = mainContent(page);
  await expect(
    carnet.getByRole("heading", { name: "À travailler" }),
  ).toBeVisible();
  const row = carnet.getByRole("article").filter({ hasText: "Genre des noms" });
  await expect(row).toHaveAttribute("id", "weakness-genre");
  await expect(row.getByText("2 fois · vu aujourd'hui · actif")).toBeVisible();
  await expect(
    carnet.getByRole("heading", { name: "Accents (é / è / ê)" }),
  ).toHaveCount(0);
  await captureEvidence(page, testInfo, "weaknesses");
});

test.describe("carnet resources @390", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });

  test("actif rows show Resource links at 44px; tranquille rows show none", async ({
    page,
  }, testInfo) => {
    await seedResourceWeaknesses();
    await page.goto("/carnet");
    const carnet = mainContent(page);
    const actif = carnet
      .getByRole("article")
      .filter({ hasText: "Genre des noms" });
    const grammar = actif.getByRole("link", { name: /Grammaire ·/ });
    const input = actif.getByRole("link", { name: /Input ·/ });
    await expect(grammar).toHaveCount(1);
    await expect(input).toHaveCount(1);
    const grammarBox = await grammar.boundingBox();
    const inputBox = await input.boundingBox();
    expect(grammarBox?.height ?? 0).toBeGreaterThanOrEqual(44);
    expect(inputBox?.height ?? 0).toBeGreaterThanOrEqual(44);
    const quiet = carnet.getByRole("article").filter({ hasText: "Accents" });
    await expect(quiet.getByRole("link", { name: /Grammaire ·/ })).toHaveCount(
      0,
    );
    await captureEvidence(page, testInfo, "carnet-resources");
  });
});

test("Non, corrige-le adds the dialect-check category to À travailler", async ({
  page,
  scenario,
}) => {
  await scenario("dialect");
  await generateFirstPrompt(page);
  await evaluateWriting(
    page,
    "Mon petit cousin a tombé dans la boue. Les enfant jouent.",
  );
  await page.getByRole("button", { name: "Non, corrige-le" }).click();
  await expect(page.getByText("2 fautes")).toBeVisible();
  await page.goto("/carnet");
  const carnet = mainContent(page);
  const row = carnet
    .getByRole("article")
    .filter({ hasText: "Choix de l'auxiliaire" });
  await expect(row).toHaveAttribute("id", "weakness-auxiliaire");
  await expect(row.getByText(/1 fois · vu aujourd'hui · actif/)).toBeVisible();
});
