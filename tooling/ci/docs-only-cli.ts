import { appendFileSync } from "node:fs";
import { runDocsOnlyCli } from "./docs-only";

process.exit(
  runDocsOnlyCli({
    args: process.argv.slice(2),
    env: {
      BEFORE_SHA: process.env.BEFORE_SHA,
      AFTER_SHA: process.env.AFTER_SHA,
      GITHUB_OUTPUT: process.env.GITHUB_OUTPUT,
    },
    cwd: process.cwd(),
    log: (message) => {
      console.log(message);
    },
    writeOutput: (filePath, line) => {
      appendFileSync(filePath, line);
    },
  }),
);
