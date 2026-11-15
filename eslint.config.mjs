import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import tseslint from "typescript-eslint";
import jsxA11y from "eslint-plugin-jsx-a11y";
import vitest from "@vitest/eslint-plugin";
import testingLibrary from "eslint-plugin-testing-library";
import jestDom from "eslint-plugin-jest-dom";
import comments from "@eslint-community/eslint-plugin-eslint-comments/configs";

const LEGACY = ["src/components/legacy/**"];
const TESTS = ["src/**/*.test.{ts,tsx}"];
const LINT_FIXTURES = ["src/test/lint-fixtures/**"];

const strictTypeCheckedRules = Object.assign(
  {},
  ...tseslint.configs.strictTypeChecked.map((c) => c.rules ?? {}),
);

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  comments.recommended,
  { linterOptions: { reportUnusedDisableDirectives: "error" } },
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
        projectService: {
          allowDefaultProject: [
            "src/components/home/*",
            "src/modules/lint-probe/*",
            "src/test/lint-fixtures/misc/*",
            "src/test/lint-fixtures/components/home/*",
            "src/test/lint-fixtures/modules/*",
          ],
          maximumDefaultProjectFileMatchCount_THIS_WILL_SLOW_DOWN_LINTING: 16,
        },
      },
    },
    rules: {
      ...strictTypeCheckedRules,
      ...jsxA11y.flatConfigs.strict.rules,
      "@eslint-community/eslint-comments/require-description": "error",
      "@eslint-community/eslint-comments/no-unlimited-disable": "error",
      "@typescript-eslint/switch-exhaustiveness-check": [
        "error",
        {
          considerDefaultExhaustiveForUnions: false,
          requireDefaultForNonUnion: true,
        },
      ],
      "@typescript-eslint/no-confusing-void-expression": "off",
      "@typescript-eslint/restrict-template-expressions": [
        "error",
        { allowNumber: true },
      ],
      "react/no-unescaped-entities": ["error", { forbid: [">", "}"] }],
    },
  },
  {
    files: [
      "src/components/**",
      "src/app/**/page.tsx",
      "src/app/**/layout.tsx",
      "src/hooks/**",
    ],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/db",
                "@/db/*",
                "@/server",
                "@/server/*",
                "@/modules/*/*-store",
                "drizzle-orm",
                "drizzle-orm/*",
                "@libsql/*",
                "openai",
                "openai/*",
              ],
              message:
                "Client code reaches the server only through fetchJson() from @/lib/http and schemas from @/contracts.",
            },
            {
              group: ["@/modules/*"],
              allowTypeImports: true,
              message:
                "Import domain types from @/contracts; components must not run domain logic directly.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/modules/**"],
    ignores: [
      "src/modules/openai-client/**",
      "src/modules/**/*-store.ts",
      "src/modules/**/db-store.ts",
      "src/modules/**/*.test.ts",
    ],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "next",
                "next/*",
                "react",
                "react-dom",
                "react/*",
                "react-dom/*",
                "@/db",
                "@/db/*",
                "@/components/*",
                "@/app/*",
              ],
              message: "Domain modules are framework-free (orthogonality).",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/modules/**"],
    ignores: ["src/modules/openai-client/**"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["openai", "openai/*"],
              message:
                "Only src/modules/openai-client talks to the OpenAI SDK.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/contracts/**"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/modules", "@/modules/*"],
              message:
                "Contracts are the shared vocabulary; domain logic stays in src/modules.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/**"],
    ignores: ["src/modules/openai-client/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "openai",
              message:
                "Only src/modules/openai-client talks to the OpenAI SDK.",
            },
          ],
        },
      ],
    },
  },
  {
    files: TESTS,
    plugins: { vitest },
    rules: {
      ...vitest.configs.recommended.rules,
      "vitest/no-focused-tests": "error",
      "vitest/no-disabled-tests": "error",
      "vitest/no-conditional-expect": "error",
      "vitest/expect-expect": "error",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/unbound-method": "off",
    },
  },
  { files: ["src/**/*.test.tsx"], ...testingLibrary.configs["flat/react"] },
  { files: ["src/**/*.test.tsx"], ...jestDom.configs["flat/recommended"] },
  {
    files: LEGACY,
    rules: {
      ...Object.fromEntries(
        Object.keys(jsxA11y.flatConfigs.strict.rules).map((r) => [r, "off"]),
      ),
    },
  },
  {
    files: ["src/test/lint/**"],
    rules: {
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
    },
  },
  {
    files: ["src/modules/dialect/render.ts"],
    rules: { "@typescript-eslint/no-unnecessary-condition": "off" },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "playwright-report/**",
    "test-results/**",
    ...LINT_FIXTURES,
  ]),
]);
