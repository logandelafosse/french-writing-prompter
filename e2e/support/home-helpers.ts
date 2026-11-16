import { expect, type Page } from "@playwright/test";

const FRENCH_WEEKDAY =
  /^(Lundi|Mardi|Mercredi|Jeudi|Vendredi|Samedi|Dimanche)\b/i;

export async function expectLevelPickerSixButtons(page: Page) {
  const group = page.getByRole("group", { name: /ton niveau cecr/i });
  await expect(group).toBeVisible();
  await expect(group.getByRole("button")).toHaveCount(6);
}

export async function expectFrenchHomeDateTitle(page: Page) {
  await expect(
    page.getByRole("heading", { level: 1, name: FRENCH_WEEKDAY }),
  ).toBeVisible();
}

export async function expectEvaluationWithScores(page: Page) {
  await expect(page.getByRole("heading", { name: "Évaluation" })).toBeVisible();
  await expect(
    page.getByText("Grammatical accuracy", { exact: true }).first(),
  ).toBeVisible();
  await expect(page.getByText(/\d+\/6/).first()).toBeVisible();
}
