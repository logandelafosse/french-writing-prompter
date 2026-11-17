#!/usr/bin/env tsx
import path from "node:path";
import {
  formatIssues,
  scanFrenchTypography,
} from "../tooling/typography/check-french-typography";

const root = path.resolve(import.meta.dirname, "../src");
const issues = scanFrenchTypography(root);
if (issues.length > 0) {
  console.error(formatIssues(issues));
  process.exit(1);
}
