import { test, expect } from "./support/fixtures";
import { expectNoAxeViolations } from "./support/axe";
import { captureEvidence } from "./support/evidence";
import { seedHistoryList } from "./support/history-seed";
import {
  expectNoHorizontalOverflow,
  mainContent,
} from "./support/prompt-helpers";
import { formatLevelLine } from "../src/copy/history";

const NOTICE =
  "Les corrections de cette séance ont pas pu être relues. Ta consigne et ton texte sont gardés, et le reste de l'Historique marche comme d'habitude.";

test("three statuses and malformed notice at 1280 and 390", async ({
  page,
}, testInfo) => {
  const { evaluatedId } = await seedHistoryList();
  await page.goto("/historique");
  const main = mainContent(page);
  await expect(main.getByRole("heading", { name: "Historique" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Historique" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(
    main.getByText(
      formatLevelLine(
        [
          { id: 2, toLevel: "B1", createdAt: "2026-10-28T18:00:00.000Z" },
          { id: 1, toLevel: "A2", createdAt: "2026-10-03T18:00:00.000Z" },
        ],
        "America/Chicago",
      ) ?? "",
    ),
  ).toBeVisible();
  const list = main.getByRole("region", { name: "Séances passées" });
  const evaluated = list.getByRole("button", { name: /récit · 14 novembre/ });
  await expect(evaluated).toBeVisible();
  await expect(
    list.getByText("Samedi 14 novembre · évaluée · 2 fautes · B1"),
  ).toBeVisible();
  await expect(list.getByText("Brouillon laissé de côté")).toBeVisible();
  await expect(
    list.getByText("Vendredi 13 novembre · 8 mots · pas évalué"),
  ).toBeVisible();
  await expect(list.getByText("Consigne pas utilisée")).toBeVisible();
  await expect(
    list.getByText("Jeudi 12 novembre · rien d'écrit"),
  ).toBeVisible();
  await expect(list.getByText("évaluée").first()).toBeVisible();
  await expect(list.getByText("pas évalué")).toBeVisible();
  await expect(list.getByText("rien d'écrit")).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Consigne pas utilisée/ }),
  ).toHaveCount(0);
  await expect(list.getByText(/détails incomplets/)).toBeVisible();
  expect(
    await list.evaluate(
      (el) => el.querySelectorAll("[aria-hidden='true']").length,
    ),
  ).toBeGreaterThan(0);

  await expect(evaluated).toHaveAttribute("aria-expanded", "false");
  await evaluated.click();
  await expect(evaluated).toHaveAttribute("aria-expanded", "true");
  await expect(evaluated).toHaveAttribute(
    "aria-controls",
    `history-panel-${evaluatedId}`,
  );
  await expect(list.getByText("CONSIGNE D'ÉCRITURE")).toBeVisible();
  await expect(list.getByText("TON TEXTE · 4 MOTS")).toBeVisible();
  await expect(list.getByText("CORRECTIONS")).toBeVisible();
  await expect(list.getByText("Raconte la boucherie.")).toBeVisible();
  await captureEvidence(page, testInfo, "historique-expanded");

  await list.getByRole("button", { name: /détails incomplets/ }).click();
  await expect(page.getByText(NOTICE)).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expectNoAxeViolations(page);
});

test.describe("historique surface at 390", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });

  test("Surface padding is 22px 18px and expanded indent is 0", async ({
    page,
  }) => {
    await seedHistoryList();
    await page.goto("/historique");
    const list = mainContent(page).getByRole("region", {
      name: "Séances passées",
    });
    await list.getByRole("button", { name: /récit · 14 novembre/ }).click();
    const padding = await list.evaluate((el) => {
      const style = getComputedStyle(el);
      return `${style.paddingTop} ${style.paddingRight} ${style.paddingBottom} ${style.paddingLeft}`;
    });
    expect(padding).toBe("22px 18px 22px 18px");
    const indent = await list
      .getByText("CONSIGNE D'ÉCRITURE")
      .evaluate((el) => {
        const body = el.parentElement?.parentElement;
        return body ? getComputedStyle(body).paddingLeft : "";
      });
    expect(indent).toBe("0px");
    await expectNoHorizontalOverflow(page);
  });
});

test("/history redirects to /historique", async ({ page, request }) => {
  const redirect = await request.get("/history", { maxRedirects: 0 });
  expect(redirect.status()).toBe(308);
  expect(redirect.headers().location).toMatch(/\/historique$/);
  await page.goto("/history");
  await expect(page).toHaveURL(/\/historique$/);
  await expect(page.getByRole("heading", { name: "Historique" })).toBeVisible();
});
