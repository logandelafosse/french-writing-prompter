import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const TOKENS_PATH = path.join(import.meta.dirname, "tokens.css");
const GLOBALS_PATH = path.join(import.meta.dirname, "../app/globals.css");

function colorHex(rgb24: number): string {
  return `#${rgb24.toString(16).padStart(6, "0")}`;
}

const HANDOFF_COLOR_RGB: Record<string, number> = {
  desk: 0xe6ebe6,
  "desk-highlight": 0xf3f6f1,
  sheet: 0xfcfdfa,
  notice: 0xeef2ed,
  ink: 0x17211d,
  "ink-2": 0x3a4640,
  muted: 0x55625c,
  "disabled-text": 0x6b7770,
  line: 0xd0d8d1,
  "line-strong": 0xb9c4bc,
  "input-border": 0x8d9a92,
  rule: 0xdce3dd,
  primary: 0x1f5a4a,
  "primary-hover": 0x123c31,
  "primary-tint": 0xe3eee8,
  "meter-target": 0xbcd3c8,
  busy: 0x2f4a40,
  mistake: 0xa8321a,
  "mistake-tint": 0xf7e1da,
  standard: 0x1f4e8c,
  dialect: 0x7a5a00,
  "dialect-tint": 0xf6ecc8,
  white: 0xffffff,
};

function parseCustomProperties(css: string): Map<string, string> {
  const props = new Map<string, string>();
  const re = /(--[\w-]+)\s*:\s*([^;]+);/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(css)) !== null) {
    const name = match[1];
    const value = match[2];
    if (name && value) props.set(name, value.trim());
  }
  return props;
}

function referencedVars(value: string): string[] {
  const out: string[] = [];
  const re = /var\(\s*(--[\w-]+)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(value)) !== null) {
    const ref = match[1];
    if (ref) out.push(ref);
  }
  return out;
}

function hasSelfReference(
  name: string,
  props: Map<string, string>,
  seen = new Set<string>(),
): boolean {
  if (seen.has(name)) return true;
  seen.add(name);
  const value = props.get(name);
  if (!value) return false;
  for (const ref of referencedVars(value)) {
    if (ref === name) return true;
    if (hasSelfReference(ref, props, new Set(seen))) return true;
  }
  return false;
}

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace("#", "");
  const full =
    normalized.length === 3
      ? normalized
          .split("")
          .map((c) => c + c)
          .join("")
      : normalized;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastRatio(fg: string, bg: string): number {
  const l1 = relativeLuminance(hexToRgb(fg));
  const l2 = relativeLuminance(hexToRgb(bg));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

const CONTRAST_PAIRS: { fg: string; bg: string }[] = [
  { fg: "ink", bg: "sheet" },
  { fg: "ink-2", bg: "sheet" },
  { fg: "muted", bg: "sheet" },
  { fg: "disabled-text", bg: "sheet" },
  { fg: "primary", bg: "sheet" },
  { fg: "mistake", bg: "sheet" },
  { fg: "standard", bg: "sheet" },
  { fg: "dialect", bg: "sheet" },
  { fg: "muted", bg: "desk" },
  { fg: "primary", bg: "desk" },
  { fg: "muted", bg: "notice" },
  { fg: "ink-2", bg: "notice" },
  { fg: "primary", bg: "primary-tint" },
  { fg: "busy", bg: "primary-tint" },
  { fg: "white", bg: "primary" },
  { fg: "white", bg: "busy" },
  { fg: "white", bg: "mistake" },
  { fg: "white", bg: "dialect" },
  { fg: "standard", bg: "white" },
  { fg: "ink", bg: "mistake-tint" },
  { fg: "mistake", bg: "mistake-tint" },
  { fg: "ink", bg: "dialect-tint" },
  { fg: "dialect", bg: "dialect-tint" },
];

describe("tokens.css", () => {
  const tokensCss = readFileSync(TOKENS_PATH, "utf-8");
  const tokenProps = parseCustomProperties(tokensCss);

  it("declares every HANDOFF colour token with the exact hex", () => {
    for (const [name, rgb24] of Object.entries(HANDOFF_COLOR_RGB)) {
      const key = `--color-${name}`;
      const value = tokenProps.get(key)?.toLowerCase();
      expect(value).toBe(colorHex(rgb24));
    }
  });

  it("has no custom property that references itself", () => {
    const globalsCss = readFileSync(GLOBALS_PATH, "utf-8");
    const allProps = new Map([
      ...parseCustomProperties(tokensCss),
      ...parseCustomProperties(globalsCss),
    ]);
    for (const name of allProps.keys()) {
      const selfRef = hasSelfReference(name, allProps);
      expect(selfRef).toBe(false);
    }
  });

  it("meets WCAG 4.5:1 for every HANDOFF text pair", () => {
    for (const { fg, bg } of CONTRAST_PAIRS) {
      const fgRgb = HANDOFF_COLOR_RGB[fg];
      const bgRgb = HANDOFF_COLOR_RGB[bg];
      expect(fgRgb).toBeDefined();
      expect(bgRgb).toBeDefined();
      const ratio = contrastRatio(colorHex(fgRgb!), colorHex(bgRgb!));
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    }
  });
});
