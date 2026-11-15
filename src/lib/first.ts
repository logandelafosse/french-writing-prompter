export function first<T>(rows: readonly T[], context: string): T {
  const row = rows[0];
  if (row === undefined) {
    throw new Error(`No row found: ${context}`);
  }
  return row;
}