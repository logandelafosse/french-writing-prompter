import type { Route } from "@playwright/test";
import { TodayGetResponse } from "../src/contracts/today";
import { test, expect } from "./support/fixtures";
import { expectNoAxeViolations } from "./support/axe";
import { captureEvidence } from "./support/evidence";
import {
  expectNoHorizontalOverflow,
  generateFirstPrompt,
  mainContent,
} from "./support/prompt-helpers";

import { FETCH_TIMEOUT_MS } from "../src/config/limits";

const writing = "Le bayou au matin est calme.";
const hungFetchNoticeMs = FETCH_TIMEOUT_MS + 3_000;

async function holdIndefinitely(route: Route): Promise<void> {
  void route;
  await new Promise(() => undefined);
}

async function expectTouchTarget(locator: {
  boundingBox: () => Promise<{ height: number } | null>;
}) {
  const box = await locator.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
}

test.describe("offline @1280", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("offline notice while writing, retry pushes the draft", async ({
    page,
    context,
    scenario,
  }, testInfo) => {
    await scenario("happy");
    await generateFirstPrompt(page);
    const main = mainContent(page);
    const area = main.getByLabel("Ton texte");
    await area.fill(writing);
    await expect(
      main.getByText(/Brouillon sauvé à/).filter({ visible: true }),
    ).toBeVisible();

    await context.setOffline(true);
    await area.pressSequentially(" Et les cyprès.");
    const notice = main.getByRole("status");
    await expect(notice).toContainText("Pas de connexion.");
    await expect(
      main
        .getByText("Brouillon gardé sur cet appareil")
        .filter({ visible: true }),
    ).toBeVisible();
    await expect(area).toBeEditable();
    await captureEvidence(page, testInfo, "offline-notice-1280");
    await notice.getByRole("button", { name: "Réessayer" }).click();

    await context.setOffline(false);
    await expect(main.getByText("Pas de connexion.")).toHaveCount(0);
    await expect(
      main.getByText(/Brouillon sauvé à/).filter({ visible: true }),
    ).toBeVisible();

    await expect
      .poll(async () => {
        const response = await page.request.get("/api/today");
        const parsed = TodayGetResponse.safeParse(await response.json());
        if (!parsed.success) return "";
        return parsed.data.activeSession?.draft?.text ?? "";
      })
      .toContain("cyprès");
  });
});

test.describe("offline @390", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("notice wraps without horizontal scroll and retry is 44px", async ({
    page,
    context,
    scenario,
  }, testInfo) => {
    await scenario("happy");
    await generateFirstPrompt(page);
    const main = mainContent(page);
    await main.getByLabel("Ton texte").fill(writing);
    await context.setOffline(true);
    await main.getByLabel("Ton texte").pressSequentially(".");
    const retry = main.getByRole("button", { name: "Réessayer" });
    await expect(retry).toBeVisible();
    await expectTouchTarget(retry);
    await expectNoHorizontalOverflow(page);
    await expectNoAxeViolations(page);
    await captureEvidence(page, testInfo, "offline-notice-390");
  });
});

test.describe("hung fetches", () => {
  test("held today and sessions fetches show retry, not a skeleton", async ({
    page,
    scenario,
  }) => {
    test.setTimeout(60_000);
    await scenario("happy");
    await page.route("**/api/today", holdIndefinitely);
    await page.route("**/api/sessions", holdIndefinitely);
    await page.goto("/");
    const notice = page.getByRole("status");
    await expect(notice).toContainText("Pas de connexion.", {
      timeout: hungFetchNoticeMs,
    });
    await expect(
      notice.getByRole("button", { name: "Réessayer" }),
    ).toBeVisible();
    await expect(page.getByText("Chargement…")).toHaveCount(0);

    await page.goto("/history");
    const historyNotice = page.getByRole("status");
    await expect(historyNotice).toContainText("Pas de connexion.", {
      timeout: hungFetchNoticeMs,
    });
    await expect(
      historyNotice.getByRole("button", { name: "Réessayer" }),
    ).toBeVisible();
    await expect(page.getByText("Chargement…")).toHaveCount(0);
    await page.unrouteAll({ behavior: "ignoreErrors" });
  });
});
