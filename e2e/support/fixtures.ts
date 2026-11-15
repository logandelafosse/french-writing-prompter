import { test as base } from "@playwright/test";
import { resetE2eDatabase } from "./reset-db";

type E2eScenario = "happy" | "malformed" | "failure";

type E2eFixtures = {
  resetDb: void;
  scenario: (name: E2eScenario) => Promise<void>;
};

export const test = base.extend<E2eFixtures>({
  resetDb: [
    async ({}, use) => {
      await resetE2eDatabase();
      await use();
    },
    { auto: true },
  ],

  scenario: async ({ page }, use) => {
    async function setScenario(name: E2eScenario): Promise<void> {
      await page.setExtraHTTPHeaders({ "x-e2e-scenario": name });
    }

    await setScenario("happy");
    await use(setScenario);
  },
});

export { expect } from "@playwright/test";
