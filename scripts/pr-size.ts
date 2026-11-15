#!/usr/bin/env tsx
import { runPrSize } from "../tooling/pr-size/run-pr-size";

const result = runPrSize({ cwd: process.cwd() });
console.log(result.message);
process.exit(result.exitCode);