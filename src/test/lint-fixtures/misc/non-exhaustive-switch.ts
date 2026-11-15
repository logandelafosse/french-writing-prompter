type Kind = "a" | "b";
export function pick(kind: Kind): number {
  switch (kind) {
    case "a":
      return 1;
    default:
      return 0;
  }
}
