import { defineConfig } from "@playwright/test";

const PORT = 3100;
const DATABASE_URL = "file:./.e2e/e2e.db";

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "desktop",
      use: { viewport: { width: 1280, height: 800 } },
    },
    {
      name: "mobile",
      use: {
        browserName: "chromium",
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: [
      `DATABASE_URL=${DATABASE_URL}`,
      "AI_CLIENT=fake",
      "OPENAI_API_KEY=",
      "DLF_LEXICON_PATH=src/test/fixtures/dlf/lexicon.json",
      "npm run build &&",
      `DATABASE_URL=${DATABASE_URL}`,
      "AI_CLIENT=fake",
      "OPENAI_API_KEY=",
      "DLF_LEXICON_PATH=src/test/fixtures/dlf/lexicon.json",
      `npx next start -p ${PORT}`,
    ].join(" "),
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
  },
});
