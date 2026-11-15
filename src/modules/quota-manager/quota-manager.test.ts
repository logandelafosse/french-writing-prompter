import { describe, it, expect } from "vitest";
import { QuotaManager } from "./quota-manager";

function makeQuotaManager(used = 0): QuotaManager {
  return new QuotaManager(used);
}

describe("QuotaManager", () => {
  describe("canGenerate", () => {
    it("returns true when no prompts used", () => {
      const qm = makeQuotaManager(0);
      expect(qm.canGenerate()).toBe(true);
    });

    it("returns true when 2 prompts used", () => {
      const qm = makeQuotaManager(2);
      expect(qm.canGenerate()).toBe(true);
    });

    it("returns false when 3 prompts used", () => {
      const qm = makeQuotaManager(3);
      expect(qm.canGenerate()).toBe(false);
    });
  });

  describe("remaining", () => {
    it("returns 3 when no prompts used", () => {
      expect(makeQuotaManager(0).remaining()).toBe(3);
    });

    it("returns 1 when 2 prompts used", () => {
      expect(makeQuotaManager(2).remaining()).toBe(1);
    });

    it("returns 0 when 3 or more used", () => {
      expect(makeQuotaManager(3).remaining()).toBe(0);
      expect(makeQuotaManager(5).remaining()).toBe(0);
    });
  });

  describe("consume", () => {
    it("increments used count", () => {
      const qm = makeQuotaManager(0);
      qm.consume();
      expect(qm.remaining()).toBe(2);
    });

    it("throws when quota is exhausted", () => {
      const qm = makeQuotaManager(3);
      expect(() => qm.consume()).toThrow("Daily quota exhausted");
    });
  });
});
