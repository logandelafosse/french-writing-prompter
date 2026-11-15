import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { quotaMessage, QuotaText } from "./quota-text";
import type { QuotaState } from "@/modules/quota-manager/quota-db-store";

const baseQuota = (remaining: number): QuotaState => ({
  used: 3 - remaining,
  remaining,
  max: 3,
  resetsAt: "2026-11-15T06:00:00.000Z",
});

describe("quotaMessage", () => {
  it("renders remaining, singular, exhausted, first-run and compact forms", () => {
    expect(quotaMessage(baseQuota(3), false)).toBe("Reste 3 consignes sur 3");
    expect(quotaMessage(baseQuota(2), false)).toBe("Reste 2 consignes sur 3");
    expect(quotaMessage(baseQuota(1), false)).toBe("Reste 1 consigne sur 3");
    expect(quotaMessage(baseQuota(0), false)).toBe("3 consignes sur 3 prises");
    expect(quotaMessage(baseQuota(3), true)).toBe("3 consignes aujourd'hui");
    expect(quotaMessage(baseQuota(2), false, true)).toBe("Reste 2 sur 3");
    expect(quotaMessage(baseQuota(0), false, true)).toBe("3 sur 3 prises");
  });
});

describe("QuotaText", () => {
  it("prints the message in the document", () => {
    render(<QuotaText quota={baseQuota(2)} firstRun={false} />);
    expect(screen.getByText("Reste 2 consignes sur 3")).toBeInTheDocument();
  });
});
