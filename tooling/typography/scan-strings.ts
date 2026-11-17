const AFTER_OPEN_GUILLEMET = "«";
const BEFORE_PUNCT = new Set(["?", "!", ":", ";", "»"]);

export type TypographyIssue = {
  line: number;
  column: number;
  punct: string;
};

type Frame =
  | { kind: "code" }
  | { kind: "linecomment" }
  | { kind: "blockcomment" }
  | { kind: "sq" }
  | { kind: "dq" }
  | { kind: "tmpl" }
  | { kind: "expr"; depth: number };

function isRegularSpace(char: string | undefined): boolean {
  return char === " ";
}

function isFrenchWordChar(char: string | undefined): boolean {
  return char !== undefined && /[\p{L}\p{N}»}'’]/u.test(char);
}

function record(
  issues: TypographyIssue[],
  source: string,
  index: number,
  punct: string,
): void {
  const upto = source.slice(0, index);
  const line = upto.split("\n").length;
  const lastNl = upto.lastIndexOf("\n");
  const column = index - lastNl;
  issues.push({ line, column, punct });
}

function isInString(frame: Frame): boolean {
  return frame.kind === "sq" || frame.kind === "dq" || frame.kind === "tmpl";
}

export function findFrenchTypographyIssues(source: string): TypographyIssue[] {
  const issues: TypographyIssue[] = [];
  const stack: Frame[] = [{ kind: "code" }];
  let i = 0;

  const current = (): Frame => stack[stack.length - 1] ?? { kind: "code" };

  while (i < source.length) {
    const c = source[i] ?? "";
    const next = source[i + 1];
    const frame = current();

    if (frame.kind === "linecomment") {
      if (c === "\n") stack.pop();
      i += 1;
      continue;
    }
    if (frame.kind === "blockcomment") {
      if (c === "*" && next === "/") {
        stack.pop();
        i += 2;
        continue;
      }
      i += 1;
      continue;
    }

    if (frame.kind === "code" || frame.kind === "expr") {
      if (c === "/" && next === "/") {
        stack.push({ kind: "linecomment" });
        i += 2;
        continue;
      }
      if (c === "/" && next === "*") {
        stack.push({ kind: "blockcomment" });
        i += 2;
        continue;
      }
      if (c === "'") {
        stack.push({ kind: "sq" });
        i += 1;
        continue;
      }
      if (c === '"') {
        stack.push({ kind: "dq" });
        i += 1;
        continue;
      }
      if (c === "`") {
        stack.push({ kind: "tmpl" });
        i += 1;
        continue;
      }
      if (frame.kind === "expr") {
        if (c === "{") {
          frame.depth += 1;
          i += 1;
          continue;
        }
        if (c === "}") {
          frame.depth -= 1;
          if (frame.depth === 0) stack.pop();
          i += 1;
          continue;
        }
      }
      i += 1;
      continue;
    }

    if (c === "\\") {
      i += 2;
      continue;
    }

    if (frame.kind === "tmpl" && c === "$" && next === "{") {
      stack.push({ kind: "expr", depth: 1 });
      i += 2;
      continue;
    }

    if (
      (frame.kind === "sq" && c === "'") ||
      (frame.kind === "dq" && c === '"') ||
      (frame.kind === "tmpl" && c === "`")
    ) {
      stack.pop();
      i += 1;
      continue;
    }

    if (isInString(frame)) {
      if (c === AFTER_OPEN_GUILLEMET && isRegularSpace(next)) {
        record(issues, source, i, "«");
      } else if (
        isRegularSpace(c) &&
        next !== undefined &&
        BEFORE_PUNCT.has(next) &&
        isFrenchWordChar(source[i - 1])
      ) {
        record(issues, source, i, next);
      }
    }
    i += 1;
  }

  return issues;
}
