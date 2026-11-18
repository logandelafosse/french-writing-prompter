import type { Route } from "@playwright/test";
import { APP_TAGLINE, APP_WORDMARK } from "../src/config/app-brand";
import { test, expect } from "./support/fixtures";
import { captureEvidence } from "./support/evidence";
import {
  expectSingleDesktopHeaderRow,
  expectTwoMobileHeaderRows,
  setLevelB1,
  visibleHeaderQuota,
} from "./support/header-helpers";
import { PROMPT_FIXTURE_LAFAYETTE } from "./support/prompt-helpers";

const QUOTA_REMAINING_3 = "Reste 3 consignes sur 3";
const QUOTA_REMAINING_2 = "Reste 2 consignes sur 3";
const STALE_QUOTA_REMAINING_3 = {
  used: 0,
  remaining: 3,
  max: 3,
  resetsAt: "2099-01-01T06:00:00.000Z",
};

test.describe("mobile header", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true });

  test("two rows with compact quota and no tagline", async ({
    page,
    scenario,
  }, testInfo) => {
    await scenario("happy");
    await page.goto("/");
    await setLevelB1(page);

    await expect(page.getByText(APP_TAGLINE)).toBeHidden();
    await expect(visibleHeaderQuota(page, "Reste 3 sur 3")).toBeVisible();
    await expect(
      page.getByRole("banner").getByText(QUOTA_REMAINING_3),
    ).toBeHidden();
    await expectTwoMobileHeaderRows(page);
    await captureEvidence(page, testInfo, "header-mobile");
  });
});

test.describe("desktop header", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("single-row layout with wordmark, quota update after generate", async ({
    page,
    scenario,
  }, testInfo) => {
    await scenario("happy");
    await page.goto("/");
    await setLevelB1(page);

    const banner = page.getByRole("banner");
    await expect(
      banner.getByRole("heading", { name: new RegExp(APP_WORDMARK) }),
    ).toBeVisible();
    await expect(page.getByText(APP_TAGLINE)).toBeVisible();
    await expect(page.getByRole("link", { name: "Historique" })).toBeVisible();
    await expect(visibleHeaderQuota(page, QUOTA_REMAINING_3)).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Niveau CECR B1, changer" }),
    ).toBeVisible();
    await expectSingleDesktopHeaderRow(page);
    await captureEvidence(page, testInfo, "header-ready");

    await page.getByRole("button", { name: "Donne-moi une consigne" }).click();
    await expect(visibleHeaderQuota(page, QUOTA_REMAINING_2)).toBeVisible();
    await captureEvidence(page, testInfo, "header-after-generate");
  });

  test("stale quota GET cannot rewind remaining after generate", async ({
    page,
    scenario,
  }) => {
    await scenario("happy");
    await page.goto("/");
    await setLevelB1(page);
    await expect(visibleHeaderQuota(page, QUOTA_REMAINING_3)).toBeVisible();

    let held: Route | undefined;
    let resolveStale: (route: Route) => void = () => undefined;
    const staleReady = new Promise<Route>((resolve) => {
      resolveStale = resolve;
    });

    await page.route(
      (url) => url.pathname === "/api/quota",
      async (route) => {
        if (route.request().method() !== "GET") {
          await route.continue();
          return;
        }
        if (held === undefined) {
          held = route;
          resolveStale(route);
          return;
        }
        await route.continue();
      },
    );

    await page.getByRole("link", { name: "Historique" }).click();
    await expect(page).toHaveURL(/\/historique/);
    const staleRoute = await staleReady;

    await page
      .getByRole("banner")
      .getByRole("link", { name: new RegExp(`^${APP_WORDMARK}`) })
      .click();
    await expect(
      page.getByRole("button", { name: "Donne-moi une consigne" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Donne-moi une consigne" }).click();
    await expect(page.getByText(PROMPT_FIXTURE_LAFAYETTE)).toBeVisible();
    await expect(visibleHeaderQuota(page, QUOTA_REMAINING_2)).toBeVisible();

    await staleRoute.fulfill({ json: STALE_QUOTA_REMAINING_3 });

    await expect(visibleHeaderQuota(page, QUOTA_REMAINING_2)).toBeVisible();
    await expect(page.getByText(QUOTA_REMAINING_3)).toBeHidden();
  });
});

test("first run shows intro quota and no level chip", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(/Bienvenue\. Icitte/)).toBeVisible();
  await expect(
    visibleHeaderQuota(page, "3 consignes aujourd'hui"),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /Niveau CECR/ })).toHaveCount(
    0,
  );
});
