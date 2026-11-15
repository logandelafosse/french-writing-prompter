import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

export type DisabledAxeRule = {
  id: string;
  reason: string;
};

/** Known legacy Home/History a11y gaps until the redesign replaces these screens. */
export const LEGACY_AXE_DISABLED: DisabledAxeRule[] = [
  {
    id: "color-contrast",
    reason:
      "Legacy zinc/emerald palette predates HANDOFF tokens (fixed in redesign tickets).",
  },
  {
    id: "button-name",
    reason: "Legacy level dropdown chevron control has no accessible name yet.",
  },
];

export async function expectNoAxeViolations(
  page: Page,
  disabledRules: DisabledAxeRule[] = [],
): Promise<void> {
  const analysis = await new AxeBuilder({ page })
    .disableRules(disabledRules.map((rule) => rule.id))
    .analyze();

  const summary = analysis.violations
    .map(
      (violation) =>
        `${violation.id}: ${violation.help} (${violation.nodes.length} nodes)`,
    )
    .join("\n");

  expect(analysis.violations, summary).toEqual([]);
}
