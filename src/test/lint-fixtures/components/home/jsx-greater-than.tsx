// Fixture body is linted via virtual path in eslint-config.test.ts (raw `>` is invalid for tsc).
export function JsxGreaterThan() {
  return <p>a {">"} b</p>;
}
