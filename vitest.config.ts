import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    env: {
      DATABASE_URL: ":memory:",
      AI_CLIENT: "fake",
    },
    hookTimeout: 120_000,
    restoreMocks: true,
    unstubEnvs: true,
    projects: [
      {
        extends: true,
        test: {
          name: "node",
          include: ["src/**/*.test.ts", "tooling/**/*.test.ts"],
          exclude: ["src/test/lint-fixtures/**"],
          environment: "node",
          setupFiles: ["src/test/setup-db.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "dom",
          include: ["src/**/*.test.tsx"],
          exclude: ["src/test/lint-fixtures/**"],
          environment: "jsdom",
          setupFiles: ["src/test/setup-dom.ts"],
        },
      },
    ],
  },
});
