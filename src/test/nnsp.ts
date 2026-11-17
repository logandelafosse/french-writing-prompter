/**
 * Testing Library's default normalizer collapses U+202F in the DOM text
 * but not in the query string, so exact match fails. Keep narrow no-break
 * spaces when querying copy that uses them.
 */
export const nnsp = { collapseWhitespace: false } as const;
