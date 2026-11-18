import { type Page } from "@playwright/test";
import { test, expect } from "./support/fixtures";
import { captureEvidence } from "./support/evidence";
import { expectEvaluationWithScores } from "./support/home-helpers";
import { generateFirstPrompt, mainContent } from "./support/prompt-helpers";
import { seedPastReview } from "./support/history-seed";
import { reviewCopy } from "../src/copy/review";
import { writingField } from "./support/writing-helpers";

const mixedWriting = "Maintenant je vas au bayou. Les enfant jouent.";
const dialectWriting =
  "Mon petit cousin a tombé dans la boue. Les enfant jouent.";

async function submitWriting(page: Page, text: string) {
  const main = mainContent(page);
  await writingField(main).fill(text);
  await main.getByRole("button", { name: "Corrige-moi" }).click();
  await expectEvaluationWithScores(page);
}

async function markMotion(page: Page): Promise<
  {
    kind: string | null;
    name: string;
    delayMs: number;
    fillMode: string;
    backgroundSize: string;
    underlineWidth: string;
  }[]
> {
  return page.evaluate(() =>
    [...document.querySelectorAll("mark")].map((el) => {
      const style = getComputedStyle(el);
      const underline = getComputedStyle(el, "::after");
      const raw = style.animationDelay;
      const delayMs = raw.endsWith("ms")
        ? Number.parseFloat(raw)
        : Number.parseFloat(raw) * 1000;
      return {
        kind: el.getAttribute("data-kind"),
        name: style.animationName,
        delayMs,
        fillMode: style.animationFillMode,
        backgroundSize: style.backgroundSize,
        underlineWidth: underline.width,
      };
    }),
  );
}

test("marks paint on arrival, not on reload, none with reduced motion", async ({
  page,
  scenario,
}, testInfo) => {
  await scenario("happy");
  await generateFirstPrompt(page);
  await submitWriting(page, mixedWriting);

  await captureEvidence(page, testInfo, "marks-on-arrival");
  const arriving = await markMotion(page);
  expect(arriving.length).toBeGreaterThan(1);
  expect(arriving.some((mark) => mark.kind === "standard")).toBe(true);
  expect(arriving.some((mark) => mark.kind === "mistake")).toBe(true);
  for (const mark of arriving) {
    expect(mark.name).not.toBe("none");
    expect(mark.name.length).toBeGreaterThan(0);
    expect(mark.fillMode === "both" || mark.fillMode === "backwards").toBe(
      true,
    );
  }
  const delays = arriving.map((item) => item.delayMs);
  expect(delays).toEqual([...delays].sort((a, b) => a - b));
  expect(delays.at(-1) ?? 0).toBeGreaterThan(delays[0] ?? 0);

  await page.reload();
  await expectEvaluationWithScores(page);
  const restored = await markMotion(page);
  expect(restored.length).toBeGreaterThan(1);
  for (const mark of restored) {
    expect(mark.name === "none" || mark.name === "").toBe(true);
  }
});

test("delayed marks start empty before they paint", async ({
  page,
  scenario,
}) => {
  await scenario("happy");
  await generateFirstPrompt(page);
  await page.addStyleTag({
    content:
      "*, *::before, *::after { animation-play-state: paused !important; }",
  });
  await submitWriting(page, mixedWriting);
  const paused = await markMotion(page);
  expect(paused.length).toBeGreaterThan(1);
  expect(paused.some((mark) => mark.kind === "standard")).toBe(true);
  expect(paused.some((mark) => mark.delayMs > 0)).toBe(true);
  for (const mark of paused) {
    expect(mark.fillMode === "both" || mark.fillMode === "backwards").toBe(
      true,
    );
    expect(mark.backgroundSize.startsWith("0%")).toBe(true);
    expect(Number.parseFloat(mark.underlineWidth)).toBe(0);
  }
});

test("historique marks do not paint", async ({ page }) => {
  const { markedId } = await seedPastReview();
  await page.goto(`/historique/${markedId}`);
  await expect(page.getByRole("link", { name: "faute 1" })).toBeVisible();
  const past = await markMotion(page);
  expect(past.length).toBeGreaterThan(1);
  for (const mark of past) {
    expect(mark.name === "none" || mark.name === "").toBe(true);
  }
});

test("reduced motion silences marks, prompt, and Dialect Note sheet", async ({
  page,
  scenario,
}) => {
  await scenario("dialect");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await generateFirstPrompt(page);
  const prompt = mainContent(page).getByText("Lafayette");
  await expect(prompt).toBeVisible();
  const promptName = await prompt.evaluate(
    (el) => getComputedStyle(el).animationName,
  );
  expect(promptName === "none" || promptName === "").toBe(true);

  await submitWriting(page, dialectWriting);
  const reducedMarks = await markMotion(page);
  expect(reducedMarks.length).toBeGreaterThan(0);
  for (const mark of reducedMarks) {
    expect(mark.name === "none" || mark.name === "").toBe(true);
  }

  await page.getByRole("button", { name: reviewCopy.actionConfirm }).click();
  const dialog = page.getByRole("dialog", { name: reviewCopy.sheetTitle });
  await expect(dialog).toBeVisible();
  const sheetName = await dialog.evaluate(
    (el) => getComputedStyle(el).animationName,
  );
  expect(sheetName === "none" || sheetName === "").toBe(true);
});
