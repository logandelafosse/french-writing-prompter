import { test, expect } from "./support/fixtures";
import { captureEvidence } from "./support/evidence";
import { setLevelB1 } from "./support/header-helpers";

test("legacy level card keeps badge in sync with header chip", async ({
  page,
  scenario,
}, testInfo) => {
  await scenario("happy");
  await page.goto("/");
  await setLevelB1(page);

  const main = page.getByRole("main");
  await main.getByRole("button", { name: /Seuil/ }).click();
  await page.getByRole("button", { name: /C1 Autonome/ }).click();

  await expect(
    page.getByRole("button", { name: "Niveau CECR C1, changer" }),
  ).toBeVisible();
  await expect(
    main.getByRole("button", { name: /C1.*Autonome/ }),
  ).toBeVisible();

  await captureEvidence(page, testInfo, "level-card-header-sync");
});
