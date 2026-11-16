import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { listNotesForMarkdown } from "../src/modules/dialect/dialect-notes-store";
import { renderDialectMarkdown } from "../src/modules/dialect/export-markdown";
import { LOUISIANA_RULES } from "../src/modules/dialect/louisiana-rules";
import { quotaTimeZone } from "../src/modules/quota-manager/quota-store";

const DEFAULT_OUTPUT_PATH = "docs/dialect/louisiana-french.md";

export async function exportDialectMarkdownToPath(
  outputPath: string,
): Promise<void> {
  const notes = await listNotesForMarkdown();
  const markdown = renderDialectMarkdown(
    LOUISIANA_RULES,
    notes,
    quotaTimeZone(),
  );
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, markdown, "utf8");
}

async function main(): Promise<void> {
  const outputPath = process.argv[2] ?? DEFAULT_OUTPUT_PATH;
  await exportDialectMarkdownToPath(outputPath);
}

const invokedFromCli =
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (invokedFromCli) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
